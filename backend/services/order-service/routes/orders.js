const express = require("express");
const axios = require("axios");
const { publish } = require("../kafka/producer");

const router = express.Router();

const IDENTITY_URL = process.env.IDENTITY_URL || "https://identity-service.blackmeadow-879b6e0b.southeastasia.azurecontainerapps.io";
const LISTING_URL = process.env.LISTING_URL || "https://listing-service.greenwave-f5d2c555.uaenorth.azurecontainerapps.io";
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || "https://compliance-service.thankfulmushroom-98fe10df.southeastasia.azurecontainerapps.io";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Rejects after ms milliseconds with a descriptive error
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Object.assign(new Error(`${label} timed out after ${ms}ms`), {
              isTimeout: true,
            }),
          ),
        ms,
      ),
    ),
  ]);
}

async function getMe(authHeader) {
  if (!authHeader?.startsWith("Bearer "))
    throw new Error("Missing Bearer token");
  const r = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
    timeout: 30000,
  });
  return r.data;
}

async function getListing(listingId) {
  const r = await axios.get(`${LISTING_URL}/listings/${listingId}`, {
    timeout: 30000,
  });
  return r.data;
}

async function checkCompliance(authHeader, payload) {
  const r = await axios.post(`${COMPLIANCE_URL}/compliance/check`, payload, {
    headers: { Authorization: authHeader },
    timeout: 30000,
  });
  return r.data;
}

// ── Route handlers ────────────────────────────────────────────────────────────

// POST /orders — create a new order
router.post("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { listingId } = req.body;
  const supabase = req.app.locals.supabase;

  if (!listingId)
    return res.status(400).json({ error: "listingId is required" });

  try {
    const [user, listing] = await Promise.all([
      withTimeout(getMe(authHeader), 30000, "getMe"),
      withTimeout(getListing(listingId), 30000, "getListing"),
    ]);

    if (listing.status && listing.status !== "available") {
      return res
        .status(409)
        .json({ error: "Listing not available", status: listing.status });
    }

    const sellerId = listing.seller_id || listing.sellerId;
    const compliance = await withTimeout(
      checkCompliance(authHeader, {
        orderId: "00000000-0000-0000-0000-000000000000",
        species: listing.species,
        sellerId,
      }),
      30000,
      "checkCompliance",
    );

    const status = compliance.allowed ? "created" : "rejected";
    const reason = compliance.allowed ? null : compliance.reason;

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          buyer_id: user.id,
          listing_id: listingId,
          title: listing.title || null,
          species: listing.species || null,
          price: Number(listing.price || 0),
          status,
          reason,
        },
      ])
      .select("*")
      .single();

    if (error)
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });

    // Publish order.placed event – compliance-service will handle notification
    // email and audit logging asynchronously via Kafka
    publish("order-events", "order.placed", {
      orderId: order.id,
      buyerId: user.id,
      buyerEmail: user.email,
      listingId,
      title: listing.title,
      species: listing.species,
      price: listing.price,
      status,
      complianceAllowed: compliance.allowed,
      complianceReason: compliance.reason || null,
    }).catch((e) =>
      console.error("[kafka] order.placed publish failed:", e.message),
    );

    return res.status(201).json({
      message: status === "created" ? "Order created" : "Order rejected",
      order,
      listing: {
        id: listingId,
        title: listing.title,
        species: listing.species,
        price: listing.price,
      },
      compliance,
    });
  } catch (err) {
    if (err.isTimeout) {
      return res
        .status(504)
        .json({ error: "Gateway timeout", details: err.message });
    }
    const status = err.response?.status;
    if (status === 404) {
      return res
        .status(404)
        .json({
          error: "Listing not found",
          details: err.response?.data || err.message,
        });
    }
    if (
      status === 401 ||
      status === 403 ||
      err.message === "Missing Bearer token"
    ) {
      return res
        .status(401)
        .json({
          error: "Unauthorized",
          details: err.response?.data || err.message,
        });
    }
    return res.status(status || 500).json({
      error: "Order failed",
      details: err.response?.data || err.message,
    });
  }
});

// GET /orders/my — buyer's own orders
// NOTE: must be before /:id or Express matches "my" as the id param
router.get("/my", async (req, res) => {
  const authHeader = req.headers.authorization;
  const supabase = req.app.locals.supabase;

  try {
    const user = await getMe(authHeader);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error)
      return res
        .status(500)
        .json({ error: "DB error", details: error.message });
    res.json({ count: data.length, orders: data });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// PATCH /orders/:id/cancel — buyer cancels their own order
router.patch("/:id/cancel", async (req, res) => {
  const authHeader = req.headers.authorization;
  const supabase = req.app.locals.supabase;

  try {
    const user = await getMe(authHeader);

    // 1) Fetch the order
    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (findErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 2) Make sure this order belongs to the buyer
    if (order.buyer_id !== user.id) {
      return res
        .status(403)
        .json({ error: "You can only cancel your own orders" });
    }

    // 3) Only allow cancellation of "created" orders
    if (order.status !== "created") {
      return res.status(409).json({
        error: `Cannot cancel an order with status "${order.status}"`,
      });
    }

    // 4) Mark the order as cancelled
    const { data: cancelled, error: updateErr } = await supabase
      .from("orders")
      .update({ status: "cancelled", reason: "Cancelled by buyer" })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (updateErr) {
      return res
        .status(500)
        .json({ error: "DB error", details: updateErr.message });
    }

    // 5) Publish order.cancelled event – listing-service will reset status via Kafka
    publish("order-events", "order.cancelled", {
      orderId: order.id,
      listingId: order.listing_id,
      buyerId: user.id,
    }).catch((e) =>
      console.error("[kafka] order.cancelled publish failed:", e.message),
    );

    return res.json({ message: "Order cancelled", order: cancelled });
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

// GET /orders/:id — single order by id (authenticated, owner or admin only)
router.get("/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  const supabase = req.app.locals.supabase;

  try {
    const user = await withTimeout(getMe(authHeader), 5000, "getMe");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Order not found" });

    const isOwner = data.buyer_id === user.id || data.seller_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(data);
  } catch (err) {
    if (err.isTimeout) {
      return res
        .status(504)
        .json({ error: "Gateway timeout", details: err.message });
    }
    const status = err.response?.status;
    if (
      status === 401 ||
      status === 403 ||
      err.message === "Missing Bearer token"
    ) {
      return res
        .status(401)
        .json({
          error: "Unauthorized",
          details: err.response?.data || err.message,
        });
    }
    return res
      .status(status || 500)
      .json({
        error: "Request failed",
        details: err.response?.data || err.message,
      });
  }
});

module.exports = router;
