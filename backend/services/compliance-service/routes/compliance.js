const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");
const { audit } = require("../helpers/audit");
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
    await audit("order", orderId, "COMPLIANCE_CHECK_REQUESTED", {
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
      await audit("order", orderId, "COMPLIANCE_CHECK_FAILED_DB", {
        error: rErr.message,
      });
      return res.status(500).json({ error: "DB error", details: rErr.message });
    }

    const restricted = !!restrictedRow;
    const emailTo = buyerEmail || requester.email;

    // If restricted => block unless requester is admin
    if (restricted && requester.role !== "admin") {
      await audit("order", orderId, "COMPLIANCE_REJECTED", {
        reason: "RESTRICTED_SPECIES_REQUIRES_ADMIN_REVIEW",
      });

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

    await audit("order", orderId, "COMPLIANCE_APPROVED", { restricted });

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

module.exports = router;
