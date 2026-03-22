const express = require("express");
const axios = require("axios");
const { sendMail } = require("../helpers/mailer");

const router = express.Router();

const ORDER_URL = process.env.ORDER_URL || "http://order-service:8003";
const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";

async function getMe(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing Bearer token");
  const r = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
    timeout: 15000,
  });
  return r.data;
}

async function writePaymentStatus(supabase, { orderId, buyerId, amount, status }) {
  if (!supabase) throw new Error("Supabase client not initialized");
  if (!orderId) throw new Error("Missing orderId");
  if (!buyerId) throw new Error("Missing buyerId");

  const payload = {
    orderId,
    buyerId,
    amount: Number(amount || 0),
    status,
  };

  // We can have multiple rows per orderId because the PK is (id, orderId).
  // Always update the latest row (highest id) to keep status deterministic.
  const latest = await supabase
    .from("payments")
    .select("id")
    .eq("orderId", orderId)
    .eq("buyerId", buyerId)
    .order("id", { ascending: false })
    .limit(1);

  if (latest.error) throw latest.error;

  const latestRow = Array.isArray(latest.data) ? latest.data[0] : null;
  if (latestRow?.id != null) {
    const upd = await supabase
      .from("payments")
      .update({ amount: payload.amount, status: payload.status })
      .eq("id", latestRow.id)
      .eq("orderId", orderId)
      .select("id,orderId,buyerId,amount,status");

    if (upd.error) throw upd.error;
    if (Array.isArray(upd.data) && upd.data.length > 0) return upd.data[0];
  }

  // If there wasn't an existing row, insert a new one.
  const ins = await supabase
    .from("payments")
    .insert([payload])
    .select("id,orderId,buyerId,amount,status")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

function normalizeCardNumber(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function isValidCardHolderName(name) {
  const trimmed = String(name || "").trim();
  if (trimmed.length < 3) return false;
  return /^[A-Za-z ]+$/.test(trimmed);
}

function isValidExpiry(mmYY) {
  const s = String(mmYY || "").trim();
  const m = s.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;

  const month = Number(m[1]);
  const year2 = Number(m[2]);
  if (month < 1 || month > 12) return false;

  // Interpret YY as 20YY (reasonable for card payments)
  const year = 2000 + year2;

  // Expiry is end of the month
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
  return expiryDate.getTime() > Date.now();
}

function isValidCvv(cvv) {
  const s = String(cvv || "").trim();
  return /^\d{3,4}$/.test(s);
}

async function markOrderComplete({ orderId, authHeader }) {
  const r = await axios.patch(
    `${ORDER_URL}/orders/${encodeURIComponent(orderId)}/complete`,
    {},
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      timeout: 15000,
    },
  );
  return r.data;
}

// POST /payments/process
// Body: { orderId, method: 'online'|'cod', cardHolderName?, cardNumber?, expiryDate?, cvv? }
router.post("/process", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const authHeader = req.headers.authorization;
  const {
    orderId,
    method,
    cardHolderName,
    cardNumber,
    expiryDate,
    cvv,
  } = req.body || {};

  if (!orderId) return res.status(400).json({ success: false, error: "orderId is required" });
  if (method !== "online" && method !== "cod") {
    return res.status(400).json({ success: false, error: "method must be 'online' or 'cod'" });
  }

  // Fetch order from Order Service (authoritative total)
  let order;
  try {
    const r = await axios.get(`${ORDER_URL}/orders/${orderId}`, {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      timeout: 15000,
    });
    order = r.data;
  } catch (err) {
    const status = err.response?.status;
    const details = err.response?.data || err.message;
    if (status === 401 || status === 403) {
      return res.status(401).json({ success: false, error: "Unauthorized", details });
    }
    if (status === 404) {
      return res.status(404).json({ success: false, error: "Order not found", details });
    }
    return res.status(status || 502).json({ success: false, error: "Failed to reach Order Service", details });
  }

  const amount = Number(order.price || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid order amount" });
  }

  if (order.status && order.status !== "created") {
    return res.status(409).json({
      success: false,
      error: `Cannot pay an order with status "${order.status}"`,
    });
  }

  // Persist payment status (starts as pending)
  try {
    await writePaymentStatus(supabase, {
      orderId,
      buyerId: order.buyer_id,
      amount,
      status: "pending",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Failed to write payment status",
      details: e.message,
      supabase: e?.code
        ? { code: e.code, hint: e.hint || null, details: e.details || null }
        : null,
    });
  }

  if (method === "cod") {
    // Treat COD as completed at checkout (per requested UX: order becomes complete and actions disappear).
    try {
      await writePaymentStatus(supabase, {
        orderId,
        buyerId: order.buyer_id,
        amount,
        status: "completed",
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: "Failed to update COD payment", details: e.message });
    }

    try {
      await markOrderComplete({ orderId, authHeader });
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data || err.message;

      // Payment is already recorded as completed; don't roll it back.
      // Return success so the frontend can move on, but include the order-update error.
      return res.json({
        success: true,
        method: "cod",
        amount,
        //currency: "LKR", 
        currency: "$",
        status: "completed",
        orderUpdate: {
          success: false,
          httpStatus: status || 502,
          error: "Order update failed",
          details,
        },
      });
    }

    // return res.json({ success: true, method: "cod", amount, currency: "LKR", status: "completed" });
    return res.json({ success: true, method: "cod", amount, currency: "$", status: "completed" });
  }

  // Online payment validation (server-side backstop)
  const normalizedNumber = normalizeCardNumber(cardNumber);
  if (!isValidCardHolderName(cardHolderName)) {
    return res.status(400).json({ success: false, error: "Invalid card holder name" });
  }
  if (!/^\d{16}$/.test(normalizedNumber)) {
    return res.status(400).json({ success: false, error: "Invalid card number" });
  }
  if (!isValidExpiry(expiryDate)) {
    return res.status(400).json({ success: false, error: "Invalid expiry date" });
  }
  if (!isValidCvv(cvv)) {
    return res.status(400).json({ success: false, error: "Invalid CVV" });
  }

  // Simulate processing delay (kept short)
  await new Promise((r) => setTimeout(r, 700));

  const paymentId = `pay_${Date.now()}`;

  try {
    await writePaymentStatus(supabase, {
      orderId,
      buyerId: order.buyer_id,
      amount,
      status: "completed",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Payment record update failed",
      details: e.message,
      supabase: e?.code
        ? { code: e.code, hint: e.hint || null, details: e.details || null }
        : null,
    });
  }

  // Mark the order as complete (required for the UX).
  // If this fails, keep payment status as completed (the real fix is adjusting the
  // orders status CHECK constraint in Supabase).
  try {
    await markOrderComplete({ orderId, authHeader });
  } catch (err) {
    const status = err.response?.status;
    const details = err.response?.data || err.message;

    return res.json({
      success: true,
      method: "online",
      amount,
      //currency: "LKR", 
      currency: "$",
      status: "completed",
      paymentId,
      orderUpdate: {
        success: false,
        httpStatus: status || 502,
        error: "Order update failed",
        details,
      },
    });
  }

  // Send payment success email (best-effort)
  try {
    const me = await getMe(authHeader);
    if (me?.email) {
      await sendMail({
        to: me.email,
        subject: `✅ Payment Successful — Order #${orderId}`,
        // text: `Your payment for order #${orderId} was successful. Amount: LKR ${amount.toLocaleString()}. Payment Ref: ${paymentId}`,
        text: `Your payment for order #${orderId} was successful. Amount: $ ${amount.toLocaleString()}. Payment Ref: ${paymentId}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto">
            <h2>🐾 Exotic Pet Marketplace</h2>
            <h3 style="color:#27ae60">✅ Payment Successful</h3>
            <p>Order ID: <strong>${orderId}</strong></p>
            <p>Amount: <strong>$ ${amount.toLocaleString()}</strong></p>
            <p>Payment Reference: <strong>${paymentId}</strong></p>
            <p>Thank you for your purchase.</p>
          </div>
        `,
      });
    }
  } catch (e) {
    console.error("[email] payment success email failed:", e.message);
  }

  return res.json({
    success: true,
    method: "online",
    amount,
    //currency: "LKR", 
    currency: "$",
    status: "completed",
    paymentId,
  });
});

// POST /payments/status/bulk
// Body: { orderIds: string[] }
router.post("/status/bulk", async (req, res) => {
  const supabase = req.app.locals.supabase;
  const authHeader = req.headers.authorization;
  const { orderIds } = req.body || {};

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: "orderIds must be a non-empty array" });
  }

  let me;
  try {
    me = await getMe(authHeader);
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized", details: e.response?.data || e.message });
  }

  const cleanIds = orderIds.filter(Boolean);
  const { data, error } = await supabase
    .from("payments")
    .select("id,orderId,status")
    .eq("buyerId", me.id)
    .in("orderId", cleanIds)
    .order("id", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "DB error", details: String(error.message || error) });
  }

  // Because multiple payment rows can exist per orderId, keep the latest one only.
  const byOrderId = {};
  for (const row of data || []) {
    if (row?.orderId == null) continue;
    if (byOrderId[row.orderId] != null) continue;
    byOrderId[row.orderId] = row.status;
  }

  return res.json({ statuses: byOrderId });
});

module.exports = router;
