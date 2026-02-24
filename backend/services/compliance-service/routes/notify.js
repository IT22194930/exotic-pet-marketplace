const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");
const { audit } = require("../helpers/audit");

const router = Router();

/**
 * POST /notify/order-confirmed
 * Body: { orderId, channel, recipient, message }
 * Simulates sending a notification by persisting it to the DB.
 */
router.post("/order-confirmed", async (req, res) => {
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

module.exports = router;
