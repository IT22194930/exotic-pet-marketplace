require("dotenv").config();
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8002;
const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "listing-images";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Multer in-memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.get("/health", (req, res) => {
  res.json({ service: "listing-service", status: "ok" });
});

// Helper: validate token by calling Identity service
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
  });

  return response.data; // {id, email, role, sellerVerified}
}

// ✅ Create listing (seller only) WITHOUT image
app.post("/listings", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res
        .status(403)
        .json({ error: "Only sellers can create listings" });
    }

    const { title, species, type, price } = req.body;
    if (!title || !species || !type || price == null) {
      return res
        .status(400)
        .json({ error: "title, species, type, price are required" });
    }

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
        },
      ])
      .select("*")
      .single();

    if (error)
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });

    res.status(201).json({ message: "Listing created", listing: data });
  } catch (err) {
    res
      .status(401)
      .json({
        error: "Unauthorized",
        details: err.response?.data || err.message,
      });
  }
});

// ✅ Upload image for listing (seller only)
app.post("/listings/:id/image", upload.single("image"), async (req, res) => {
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
        details: err.response?.data || err.message,
      });
  }
});

// ✅ Get seller's own listings (seller only)
app.get("/listings/my", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can access their listings" });
    }

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error)
      return res.status(500).json({ error: "DB error", details: error.message });

    res.json({ count: data.length, listings: data });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// ✅ Update listing (seller only)
app.put("/listings/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can update listings" });
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

    // Extract only permitted fields
    const { title, species, type, price } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (species !== undefined) updates.species = species;
    if (type !== undefined) {
      if (!["exotic", "livestock"].includes(type)) {
        return res.status(400).json({ error: "type must be 'exotic' or 'livestock'" });
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided to update" });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", listingId)
      .select("*")
      .single();

    if (updateErr)
      return res.status(500).json({ error: "DB error", details: updateErr.message });

    res.json({ message: "Listing updated", listing: updated });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// ✅ Delete listing (seller only)
app.delete("/listings/:id", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can delete listings" });
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

    // Optionally remove all images under <listingId>/ in storage
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
      return res.status(500).json({ error: "DB error", details: deleteErr.message });

    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// ✅ Get listing
app.get("/listings/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data)
    return res.status(404).json({ error: "Listing not found" });
  res.json(data);
});

// ✅ List all
app.get("/listings", async (req, res) => {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });
  res.json({ count: data.length, listings: data });
});

app.listen(PORT, () => console.log(`listing-service running on port ${PORT}`));
