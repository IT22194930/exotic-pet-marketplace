const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8003;

const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";
const LISTING_URL = process.env.LISTING_URL || "http://listing-service:8002";
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || "http://compliance-service:8004";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

// --- helper: validate token via Identity Service
async function getMe(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing Bearer token");
  const r = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader }
  });
  return r.data; // {id,email,role,sellerVerified}
}

// --- helper: fetch listing via Listing Service
async function getListing(listingId) {
  const r = await axios.get(`${LISTING_URL}/listings/${listingId}`);
  return r.data; // should include species, price, status, seller_id
}

// --- helper: compliance check (optional but good)
async function checkCompliance(authHeader, payload) {
  try {
    const r = await axios.post(`${COMPLIANCE_URL}/compliance/check`, payload, {
      headers: { Authorization: authHeader }
    });
    return r.data; // {allowed, reason, restricted}
  } catch (e) {
    // If compliance-service not ready, we still allow (keeps it simple).
    return { allowed: true, reason: "Compliance skipped/unavailable" };
  }
}

/**
 * ✅ Create an order (simple)
 * POST /orders
 * Body: { listingId }
 * Header: Authorization: Bearer <token>
 */
app.post("/orders", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { listingId } = req.body;

  if (!listingId) return res.status(400).json({ error: "listingId is required" });

  try {
    // 1) Validate buyer
    const user = await getMe(authHeader);

    // 2) Fetch listing
    const listing = await getListing(listingId);

    // Basic availability check
    if (listing.status && listing.status !== "available") {
      return res.status(409).json({ error: "Listing not available", status: listing.status });
    }

    const sellerId = listing.seller_id || listing.sellerId;

    // 3) Compliance check (simple)
    const compliance = await checkCompliance(authHeader, {
      orderId: "00000000-0000-0000-0000-000000000000", // placeholder; not needed for simple
      species: listing.species,
      sellerId: sellerId
    });

    const status = compliance.allowed ? "created" : "rejected";
    const reason = compliance.allowed ? null : compliance.reason;

    // 4) Save order in Supabase
    const { data: order, error } = await supabase
      .from("orders")
      .insert([{
        buyer_id: user.id,
        listing_id: listingId,
        species: listing.species || null,
        price: Number(listing.price || 0),
        status,
        reason
      }])
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: "DB error", details: error.message });

    // 5) Mark listing as "sold" when order is accepted
    if (status === "created") {
      const { error: listingUpdateErr } = await supabase
        .from("listings")
        .update({ status: "sold" })
        .eq("id", listingId);

      if (listingUpdateErr) {
        console.error("Warning: order created but failed to mark listing as sold:", listingUpdateErr.message);
      }
    }

    return res.status(201).json({
      message: status === "created" ? "Order created" : "Order rejected",
      order,
      listing: { id: listingId, species: listing.species, price: listing.price },
      compliance
    });
  } catch (err) {
    return res.status(401).json({
      error: "Order failed",
      details: err.response?.data || err.message
    });
  }
});

// ✅ Get my orders (requires JWT) — must be BEFORE /orders/:id or Express matches "my" as :id
app.get("/orders/my", async (req, res) => {
  const authHeader = req.headers.authorization;

  try {
    const user = await getMe(authHeader);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: "DB error", details: error.message });

    res.json({ count: data.length, orders: data });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized", details: err.response?.data || err.message });
  }
});

// ✅ Get order by id
app.get("/orders/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Order not found" });
  res.json(data);
});

app.listen(PORT, () => console.log(`order-service running on port ${PORT}`));