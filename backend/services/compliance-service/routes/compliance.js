const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");

const { sendMail } = require("../helpers/mailer");

const router = Router();

/**
 * POST /compliance/check
 * Body: { orderId, species, sellerId, buyerEmail (optional) }
 *
 * Rules (v1):
 *  - If species is restricted => requires admin role
 *  - Buyer must be authenticated
 * Sends a real email to buyerEmail (if provided) with the compliance result.
 */
router.post("/check", async (req, res) => {
  const { orderId, species, sellerId, buyerEmail } = req.body;

  if (!orderId || !species || !sellerId) {
    return res
      .status(400)
      .json({ error: "orderId, species, sellerId are required" });
  }

  try {
    const requester = await getUserFromToken(req.headers.authorization);

    // Is species restricted?
    const { data: restrictedRow, error: rErr } = await supabase
      .from("restricted_species")
      .select("species")
      .eq("species", species)
      .maybeSingle();

    if (rErr) {
      return res.status(500).json({ error: "DB error", details: rErr.message });
    }

    const restricted = !!restrictedRow;
    const emailTo = buyerEmail || requester.email;

    // If restricted => block unless requester is admin
    if (restricted && requester.role !== "admin") {
      // Send rejection email
      if (emailTo) {
        sendMail({
          to: emailTo,
          subject: `⚠️ Compliance Rejected — Order #${orderId}`,
          text: `Your order #${orderId} for species "${species}" has been rejected.\n\nReason: Restricted species requires admin review or a verified seller.`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#c0392b">🐾 Exotic Pet Marketplace</h2>
              <h3>⚠️ Compliance Check Rejected</h3>
              <p>Order ID: <strong>${orderId}</strong></p>
              <p>Species: <strong>${species}</strong></p>
              <p style="color:#c0392b"><strong>Reason:</strong> Restricted species — requires admin review or a verified seller.</p>
              <hr/>
              <small style="color:#888">If you believe this is an error, please contact support.</small>
            </div>
          `,
        }).catch((e) =>
          console.error("Compliance rejection email failed:", e.message),
        );
      }

      return res.json({
        allowed: false,
        restricted: true,
        reason: "Restricted species: requires admin review / verified seller",
      });
    }

    // Send approval email
    if (emailTo) {
      sendMail({
        to: emailTo,
        subject: `✅ Compliance Approved — Order #${orderId}`,
        text: `Your order #${orderId} for species "${species}" has passed the compliance check.`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#2d6a4f">🐾 Exotic Pet Marketplace</h2>
            <h3>✅ Compliance Check Approved</h3>
            <p>Order ID: <strong>${orderId}</strong></p>
            <p>Species: <strong>${species}</strong></p>
            <p style="color:#2d6a4f">${restricted ? "Approved by admin for restricted species." : "Species is not restricted."}</p>
            <hr/>
            <small style="color:#888">Thank you for using Exotic Pet Marketplace.</small>
          </div>
        `,
      }).catch((e) =>
        console.error("Compliance approval email failed:", e.message),
      );
    }

    return res.json({
      allowed: true,
      restricted,
      reason: restricted ? "Approved by admin" : "Not restricted",
    });
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

//  Restricted Species CRUD (admin only)

/**
 * GET /compliance/restricted-species
 * Returns all restricted species entries.
 * Accessible to any authenticated user (sellers need this for listing validation).
 */
router.get("/restricted-species", async (req, res) => {
  try {
    await getUserFromToken(req.headers.authorization);

    const { data, error } = await supabase
      .from("restricted_species")
      .select("*")
      .order("species", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * POST /compliance/restricted-species
 * Body: { species }
 * Adds a new restricted species entry.
 */
router.post("/restricted-species", async (req, res) => {
  try {
    const requester = await getUserFromToken(req.headers.authorization);
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { species } = req.body;
    if (!species || typeof species !== "string" || !species.trim()) {
      return res.status(400).json({ error: "species is required" });
    }

    const { data, error } = await supabase
      .from("restricted_species")
      .insert({ species: species.trim() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json(data);
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * PUT /compliance/restricted-species/:id
 * Body: { species }
 */
router.put("/restricted-species/:id", async (req, res) => {
  try {
    const requester = await getUserFromToken(req.headers.authorization);
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { species } = req.body;

    if (!species || typeof species !== "string" || !species.trim()) {
      return res.status(400).json({ error: "species is required" });
    }

    const { data, error } = await supabase
      .from("restricted_species")
      .update({ species: species.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });

    return res.json(data);
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * DELETE /compliance/restricted-species/:id
 * Removes a restricted species entry.
 */
router.delete("/restricted-species/:id", async (req, res) => {
  try {
    const requester = await getUserFromToken(req.headers.authorization);
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from("restricted_species")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { error } = await supabase
      .from("restricted_species")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
