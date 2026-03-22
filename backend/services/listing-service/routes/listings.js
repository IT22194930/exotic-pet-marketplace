const express = require("express");
const axios = require("axios");
const multer = require("multer");
const { publish } = require("../kafka/producer");

const router = express.Router();

const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || "http://compliance-service:8004";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "listing-images";

// Multer in-memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helpers
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
  });

  return response.data; // {id, email, role, sellerVerified}
}

/**
 * Checks whether a species is on the restricted list.
 * Forwards the seller's auth token so compliance-service can authenticate.
 * Returns { restricted: boolean } or throws on network/validation error.
 */
async function checkSpeciesCompliance(species, authHeader) {
  const response = await axios.get(`${COMPLIANCE_URL}/compliance/restricted-species`, {
    headers: { Authorization: authHeader }, // compliance-service requires a valid JWT
    timeout: 10000,
  });

  const restrictedList = response.data;

  // Validate response format
  if (!Array.isArray(restrictedList)) {
    throw new Error("Invalid response from compliance service: expected array");
  }

  const isRestricted = restrictedList.some((row) => {
    // Defensive check: ensure row and row.species exist
    if (!row || typeof row.species !== "string") {
      return false;
    }
    return row.species.toLowerCase() === species.toLowerCase();
  });

  return { restricted: isRestricted };
}

// Routes

// ✅ Create listing (seller only) WITHOUT image
router.post("/", async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can create listings" });
    }
    if (!user.sellerVerified) {
      return res.status(403).json({
        error:
          "Your seller account must be verified by an admin before you can create listings",
      });
    }

    const { title, species, type, price, description } = req.body;
    if (!title || !species || !type || price == null) {
      return res
        .status(400)
        .json({ error: "title, species, type, price are required" });
    }

    // ── Compliance check: block restricted species at listing creation ────────
    try {
      const compliance = await checkSpeciesCompliance(species, req.headers.authorization);
      if (compliance.restricted) {
        return res.status(403).json({
          error: "Restricted species",
          details: `"${species}" is on the restricted species list and cannot be listed. Contact an admin if you have the required permits.`,
        });
      }
    } catch (complianceErr) {
      // If compliance-service is unreachable, fail safe — block the listing
      console.error("[compliance] species check failed:", complianceErr.message);
      return res.status(503).json({
        error: "Compliance service unavailable",
        details: "Could not verify species compliance. Please try again later.",
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from("listings")
      .insert([
        {
          seller_id: user.id,
          title,
          species,
          type,
          price: Number(price),
          status: "available",
          description: description || null,
        },
      ])
      .select("*")
      .single();

    if (error)
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });

    // Publish event (non-blocking)
    publish("listing-events", "listing.created", {
      listingId: data.id,
      sellerId: data.seller_id,
      title: data.title,
      species: data.species,
      price: data.price,
    }).catch((e) =>
      console.error("[kafka] listing.created publish failed:", e.message),
    );

    res.status(201).json({ message: "Listing created", listing: data });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message || err.code || String(err),
      });
  }
});

// ✅ Upload image for listing (seller only)
router.post("/:id/image", upload.single("image"), async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can upload images" });
    }

    const listingId = req.params.id;

    // Check listing belongs to seller
    const { data: listing, error: findErr } = await supabase
      .from("listings")
      .select("id,seller_id")
      .eq("id", listingId)
      .single();

    if (findErr || !listing)
      return res.status(404).json({ error: "Listing not found" });
    if (listing.seller_id !== user.id)
      return res.status(403).json({ error: "Not your listing" });

    if (!req.file)
      return res
        .status(400)
        .json({ error: "No image uploaded. Use form-data key 'image'." });

    // Build a unique path inside the bucket
    const safeName = (req.file.originalname || "image").replace(/\s+/g, "_");
    const filePath = `${listingId}/${Date.now()}_${safeName}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadErr)
      return res
        .status(500)
        .json({ error: "Storage upload failed", details: uploadErr.message });

    // Public URL (works because bucket is public)
    const { data: pub } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);
    const imageUrl = pub.publicUrl;

    // Save URL in DB
    const { data: updated, error: updErr } = await supabase
      .from("listings")
      .update({ image_url: imageUrl })
      .eq("id", listingId)
      .select("*")
      .single();

    if (updErr)
      return res
        .status(500)
        .json({ error: "DB update failed", details: updErr.message });

    res.json({ message: "Image uploaded", imageUrl, listing: updated });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message || err.code || String(err),
      });
  }
});

// ✅ Get seller's own listings (seller only)
router.get("/my", async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can access their listings" });
    }

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error)
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });

    res.json({ count: data.length, listings: data });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message || err.code || String(err),
      });
  }
});

// ✅ Update listing (seller only)
router.put("/:id", async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can update listings" });
    }

    const listingId = req.params.id;

    // Check listing exists and belongs to this seller
    const { data: existing, error: findErr } = await supabase
      .from("listings")
      .select("id, seller_id, image_url")
      .eq("id", listingId)
      .single();

    if (findErr || !existing)
      return res.status(404).json({ error: "Listing not found" });
    if (existing.seller_id !== user.id)
      return res.status(403).json({ error: "Not your listing" });

    // Extract only permitted fields
    const { title, species, type, price, status, description, removeImage } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (species !== undefined) updates.species = species;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) {
      if (!["exotic", "livestock"].includes(type)) {
        return res
          .status(400)
          .json({ error: "type must be 'exotic' or 'livestock'" });
      }
      updates.type = type;
    }
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice)) {
        return res.status(400).json({ error: "price must be a number" });
      }
      updates.price = numPrice;
    }
    if (status !== undefined) {
      if (!["available", "unavailable", "sold", "pending"].includes(status)) {
        return res
          .status(400)
          .json({ error: "status must be 'available', 'unavailable', 'sold', or 'pending'" });
      }
      updates.status = status;
    }
    if (removeImage === true) {
      updates.image_url = null;
      // Delete stored files for this listing from Storage
      if (existing.image_url) {
        const { data: files, error: listErr } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .list(listingId);
        if (!listErr && files && files.length > 0) {
          const paths = files.map((f) => `${listingId}/${f.name}`);
          await supabase.storage.from(SUPABASE_BUCKET).remove(paths);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided to update" });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", listingId)
      .select("*")
      .single();

    if (updateErr)
      return res
        .status(500)
        .json({ error: "DB error", details: updateErr.message });

    res.json({ message: "Listing updated", listing: updated });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message || err.code || String(err),
      });
  }
});

// ✅ Delete listing (seller only)
router.delete("/:id", async (req, res) => {
  const supabase = req.app.locals.supabase;
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can delete listings" });
    }

    const listingId = req.params.id;

    // Check listing exists and belongs to this seller
    const { data: existing, error: findErr } = await supabase
      .from("listings")
      .select("id, seller_id")
      .eq("id", listingId)
      .single();

    if (findErr || !existing)
      return res.status(404).json({ error: "Listing not found" });
    if (existing.seller_id !== user.id)
      return res.status(403).json({ error: "Not your listing" });

    // Remove all images under <listingId>/ in storage
    const { data: files, error: listErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list(listingId);

    if (!listErr && files && files.length > 0) {
      const paths = files.map((f) => `${listingId}/${f.name}`);
      await supabase.storage.from(SUPABASE_BUCKET).remove(paths);
    }

    // Delete the listing row
    const { error: deleteErr } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (deleteErr)
      return res
        .status(500)
        .json({ error: "DB error", details: deleteErr.message });

    // Publish event (non-blocking)
    publish("listing-events", "listing.deleted", {
      listingId,
      sellerId: user.id,
    }).catch((e) =>
      console.error("[kafka] listing.deleted publish failed:", e.message),
    );

    res.json({ message: "Listing deleted" });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message || err.code || String(err),
      });
  }
});

// ✅ Get listing by id
router.get("/:id", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data)
    return res.status(404).json({ error: "Listing not found" });
  res.json(data);
});

// ✅ List all listings
router.get("/", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });
  res.json({ count: data.length, listings: data });
});

module.exports = router;
