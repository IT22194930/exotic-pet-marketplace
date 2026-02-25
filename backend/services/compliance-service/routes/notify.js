const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");
const { audit } = require("../helpers/audit");
const { sendMail } = require("../helpers/mailer");

const router = Router();

/**
 * POST /notify/order-confirmed
 * Body: { orderId, channel, recipient, message }
 * Persists the notification to DB and sends a real email when channel=email.
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

    // Send real email when channel is email
    let emailMessageId = null;
    if (channel === "email") {
      try {
        emailMessageId = await sendMail({
          to: recipient,
          subject: `Order Confirmed — #${orderId}`,
          text: message,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#2d6a4f">🐾 Exotic Pet Marketplace</h2>
              <h3>Order Confirmed</h3>
              <p>Order ID: <strong>${orderId}</strong></p>
              <p>${message}</p>
              <hr/>
              <small style="color:#888">This is an automated notification.</small>
            </div>
          `,
        });
        await audit(orderId, "NOTIFY_EMAIL_SENT", {
          recipient,
          emailMessageId,
        });
      } catch (mailErr) {
        await audit(orderId, "NOTIFY_EMAIL_FAILED", { error: mailErr.message });
        // Non-fatal: notification already saved to DB
        console.error("SMTP error:", mailErr.message);
      }
    }

    await audit(orderId, "NOTIFY_SENT", { notificationId: data.id, channel });

    res.json({
      message: "Notification sent",
      channel,
      emailSent: channel === "email" ? !!emailMessageId : null,
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
