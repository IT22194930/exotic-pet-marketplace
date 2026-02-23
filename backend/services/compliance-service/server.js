const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8004;
const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.get("/health", (req, res) => {
  res.json({ service: "compliance-service", status: "ok" });
});

// Helper: call Identity to get user from token
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }
  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
  });
  return response.data; // { id, email, role, sellerVerified }
}

// Helper: write audit log
async function audit(orderId, action, details = {}) {
  await supabase
    .from("audit_logs")
    .insert([{ order_id: orderId, action, details }]);
}

/**
 * ✅ Compliance check for an order
 * Body: { orderId, species, sellerId }
 * Rules (simple v1):
 * - If species is restricted => seller must be verified
 * - Buyer must be authenticated (any role ok, but usually buyer/seller)
 */
app.post("/compliance/check", async (req, res) => {
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

    // If restricted, seller must be verified (we can fetch seller from Identity by creating a public endpoint later)
    // For now, we assume Order Service will pass sellerVerified in future,
    // BUT since we already have Identity service only /users/me, simplest is:
    // require sellerId == requester.id when seller is placing? Not good.
    // So we do a simple rule for now:
    // If restricted => block unless requester is admin
    // (Next step we add Identity endpoint: GET /users/:id/public to check sellerVerified)
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

/**
 * ✅ Send notification (simulated)
 * Body: { orderId, channel, recipient, message }
 */
app.post("/notify/order-confirmed", async (req, res) => {
  const { orderId, channel, recipient, message } = req.body;

  if (!orderId || !channel || !recipient || !message) {
    return res
      .status(400)
      .json({ error: "orderId, channel, recipient, message are required" });
  }

  try {
    const requester = await getUserFromToken(req.headers.authorization);
    await audit(orderId, "NOTIFY_REQUESTED", {
      byUserId: requester.id,
      channel,
      recipient,
    });

    const { data, error } = await supabase
      .from("notifications")
      .insert([{ order_id: orderId, channel, recipient, message }])
      .select("*")
      .single();

    if (error) {
      await audit(orderId, "NOTIFY_FAILED_DB", { error: error.message });
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });
    }

    await audit(orderId, "NOTIFY_SENT", { notificationId: data.id });

    res.json({
      message: "Notification logged (simulated)",
      notification: data,
    });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// ✅ Get audit logs for an order (security/auditing)
app.get("/audit/orders/:orderId", async (req, res) => {
  const orderId = req.params.orderId;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  res.json({ orderId, count: data.length, logs: data });
});

app.listen(PORT, () =>
  console.log(`compliance-service running on port ${PORT}`),
);
