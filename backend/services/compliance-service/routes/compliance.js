const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");
const { audit } = require("../helpers/audit");

const router = Router();

/**
 * POST /compliance/check
 * Body: { orderId, species, sellerId }
 *
 * Rules (v1):
 *  - If species is restricted => requires admin role
 *  - Buyer must be authenticated
 */
router.post("/check", async (req, res) => {
  const { orderId, species, sellerId } = req.body;

  if (!orderId || !species || !sellerId) {
    return res
      .status(400)
      .json({ error: "orderId, species, sellerId are required" });
  }

  try {
    const requester = await getUserFromToken(req.headers.authorization);
    await audit(orderId, "COMPLIANCE_CHECK_REQUESTED", {
      byUserId: requester.id,
      species,
      sellerId,
    });

    // Is species restricted?
    const { data: restrictedRow, error: rErr } = await supabase
      .from("restricted_species")
      .select("species")
      .eq("species", species)
      .maybeSingle();

    if (rErr) {
      await audit(orderId, "COMPLIANCE_CHECK_FAILED_DB", {
        error: rErr.message,
      });
      return res.status(500).json({ error: "DB error", details: rErr.message });
    }

    const restricted = !!restrictedRow;

    // If restricted => block unless requester is admin
    if (restricted && requester.role !== "admin") {
      await audit(orderId, "COMPLIANCE_REJECTED", {
        reason: "RESTRICTED_SPECIES_REQUIRES_ADMIN_REVIEW",
      });
      return res.json({
        allowed: false,
        restricted: true,
        reason: "Restricted species: requires admin review / verified seller",
      });
    }

    await audit(orderId, "COMPLIANCE_APPROVED", { restricted });

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

module.exports = router;
