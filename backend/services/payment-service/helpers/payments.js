"use strict";

/**
 * Upsert a payment row keyed by order_id.
 * The payments table is expected to have a unique constraint on order_id.
 */
async function upsertPayment(supabase, row) {
  const payload = {
    order_id: row.orderId,
    buyer_id: row.buyerId,
    amount: row.amount,
    currency: row.currency || "LKR",
    method: row.method,
    status: row.status,
    payment_ref: row.paymentRef || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("payments")
    .upsert([payload], { onConflict: "order_id" })
    .select("*")
    .single();

  if (error) throw Object.assign(new Error(error.message), { supabase: true });
  return data;
}

/**
 * Create (or keep) a "pending" payment row when an order is created.
 * Idempotent due to upsert on order_id.
 */
async function ensurePendingPaymentForOrderPlaced(supabase, payload) {
  const orderId = payload?.orderId;
  const buyerId = payload?.buyerId;
  const amount = Number(payload?.price || 0);

  if (!orderId || !buyerId) {
    throw new Error("Missing orderId or buyerId in order.placed payload");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid price in order.placed payload");
  }

  return upsertPayment(supabase, {
    orderId,
    buyerId,
    amount,
    currency: "LKR",
    status: "pending",
    // method intentionally omitted here; it will be set when the buyer selects 'online' or 'cod'
  });
}

module.exports = { upsertPayment, ensurePendingPaymentForOrderPlaced };
