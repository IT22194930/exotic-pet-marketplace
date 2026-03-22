const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { publish } = require("../kafka/producer");

const router = express.Router();

const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";
const LISTING_URL = process.env.LISTING_URL || "http://listing-service:8002";
const COMPLIANCE_URL =
  process.env.COMPLIANCE_URL || "http://compliance-service:8004";

async function initPendingPayment({ supabase, orderId, buyerId, amount }) {
  const { data: existing, error: findErr } = await supabase
    .from("payments")
    .select("id,orderId,status")
    .eq("orderId", orderId)
    .eq("buyerId", buyerId)
    .order("id", { ascending: false })
    .limit(1);

  if (!findErr && Array.isArray(existing) && existing.length > 0) return;

  const { error: insErr } = await supabase.from("payments").insert([
    {
      orderId,
      buyerId,
      amount,
      status: "pending",
    },
  ]);

  if (insErr) throw insErr;
}

// Helpers

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

function httpError(statusCode, payload) {
  const err = new Error(payload?.error || "Request failed");
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

async function fetchOrderOrThrow(supabase, orderId) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) throw httpError(404, { error: "Order not found" });
  return order;
}

function assertBuyerOwnsOrderOrThrow(order, buyerId) {
  if (order.buyer_id !== buyerId) {
    throw httpError(403, { error: "You can only complete your own orders" });
  }
}

function assertOrderStatusOrThrow(order, expectedStatus, actionVerb) {
  if (order.status !== expectedStatus) {
    throw httpError(409, {
      error: `Cannot ${actionVerb} an order with status "${order.status}"`,
    });
  }
}

async function updateOrderStatusWithCandidatesOrThrow(
  supabase,
  orderId,
  candidates,
) {
  let lastErr;

  for (const nextStatus of candidates) {
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId)
      .select("*")
      .single();

    if (!updateErr) return updated;

    lastErr = updateErr;
    const msg = String(updateErr.message || "");
    // If the failure is due to the status CHECK constraint, try the next candidate.
    if (/orders_status_check/i.test(msg)) continue;
    // Otherwise, fail fast.
    throw httpError(500, { error: "DB error", details: msg });
  }

  throw httpError(500, {
    error: "DB error",
    details: String(
      lastErr?.message || lastErr || "Failed to update order status",
    ),
    attemptedStatuses: candidates,
  });
}

function sendHttpError(res, err, fallbackStatusCode, fallbackPayload) {
  if (err?.payload && err?.statusCode) {
    return res.status(err.statusCode).json(err.payload);
  }
  return res.status(fallbackStatusCode).json(fallbackPayload);
}

//  Route handlers

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
    const orderId = crypto.randomUUID();

    const compliance = await withTimeout(
      checkCompliance(authHeader, {
        orderId,
        species: listing.species,
        sellerId,
      }),
      30000,
      "checkCompliance",
    );

    const status = compliance.allowed ? "created" : "rejected";
    const reason = compliance.allowed ? null : compliance.reason;

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .insert([
        {
          id: orderId,
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

    // Create payment row automatically (pending) when order is created.
    if (status === "created") {
      try {
        await initPendingPayment({
          supabase,
          orderId: updatedOrder.id,
          buyerId: user.id,
          amount: Number(updatedOrder.price || 0),
        });
      } catch (payErr) {
        // Best effort rollback to keep system consistent.
        await supabase.from("orders").delete().eq("id", updatedOrder.id);
        return res.status(500).json({
          error: "Failed to initialize payment",
          details: payErr.message,
        });
      }
    }

    // Publish order.placed event – compliance-service will handle notification email and audit logging asynchronously via Kafka
    publish("order-events", "order.placed", {
      orderId: updatedOrder.id,
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
      order: updatedOrder,
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
      return res.status(404).json({
        error: "Listing not found",
        details: err.response?.data || err.message,
      });
    }
    if (
      status === 401 ||
      status === 403 ||
      err.message === "Missing Bearer token"
    ) {
      return res.status(401).json({
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

// PATCH /orders/:id/complete — buyer marks their own order as complete (after payment)
router.patch("/:id/complete", async (req, res) => {
  const authHeader = req.headers.authorization;
  const supabase = req.app.locals.supabase;

  try {
    const user = await getMe(authHeader);

    const order = await fetchOrderOrThrow(supabase, req.params.id);
    assertBuyerOwnsOrderOrThrow(order, user.id);
    assertOrderStatusOrThrow(order, "created", "complete");

    // Different environments may use different allowed values in the DB CHECK constraint.
    // Try the most likely candidates in order.
    const candidates = ["completed", "complete", "paid", "delivered"];

    const updated = await updateOrderStatusWithCandidatesOrThrow(
      supabase,
      req.params.id,
      candidates,
    );

    return res.json({ message: "Order marked complete", order: updated });
  } catch (err) {
    return sendHttpError(res, err, 401, {
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
      return res.status(401).json({
        error: "Unauthorized",
        details: err.response?.data || err.message,
      });
    }
    return res.status(status || 500).json({
      error: "Request failed",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
