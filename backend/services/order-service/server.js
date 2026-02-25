const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

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

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Order Service API Docs",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMe(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing Bearer token");
  const r = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader }
  });
  return r.data;
}

async function getListing(listingId) {
  const r = await axios.get(`${LISTING_URL}/listings/${listingId}`);
  return r.data;
}

async function checkCompliance(authHeader, payload) {
  try {
    const r = await axios.post(`${COMPLIANCE_URL}/compliance/check`, payload, {
      headers: { Authorization: authHeader }
    });
    return r.data;
  } catch (e) {
    return { allowed: true, reason: "Compliance skipped/unavailable" };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

app.post("/orders", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { listingId } = req.body;

  if (!listingId) return res.status(400).json({ error: "listingId is required" });

  try {
    const user = await getMe(authHeader);
    const listing = await getListing(listingId);

    if (listing.status && listing.status !== "available") {
      return res.status(409).json({ error: "Listing not available", status: listing.status });
    }

    const sellerId = listing.seller_id || listing.sellerId;
    const compliance = await checkCompliance(authHeader, {
      orderId: "00000000-0000-0000-0000-000000000000",
      species: listing.species,
      sellerId,
    });

    const status = compliance.allowed ? "created" : "rejected";
    const reason = compliance.allowed ? null : compliance.reason;

    const { data: order, error } = await supabase
      .from("orders")
      .insert([{
        buyer_id: user.id,
        listing_id: listingId,
        species: listing.species || null,
        price: Number(listing.price || 0),
        status,
        reason,
      }])
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: "DB error", details: error.message });

    return res.status(201).json({
      message: status === "created" ? "Order created" : "Order rejected",
      order,
      listing: { id: listingId, species: listing.species, price: listing.price },
      compliance,
    });
  } catch (err) {
    return res.status(401).json({
      error: "Order failed",
      details: err.response?.data || err.message,
    });
  }
});

// NOTE: /orders/my must be defined BEFORE /orders/:id
// otherwise Express matches "my" as the :id parameter
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