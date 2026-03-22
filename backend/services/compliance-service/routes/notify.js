const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");

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
    // AuthZ/authN check (throws on invalid token)
    await getUserFromToken(req.headers.authorization);


    const { data, error } = await supabase
      .from("notifications")
      .insert([{ order_id: orderId, channel, recipient, message }])
      .select("*")
      .single();

    if (error) {

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

      } catch (mailErr) {

        // Non-fatal: notification already saved to DB
        console.error("SMTP error:", mailErr.message);
      }
    }



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

/**
 * POST /notify/payment-success
 * Body: { orderId, recipient, amount?, paymentId?, method?, message? }
 * Persists the notification to DB and sends a real email.
 */
router.post("/payment-success", async (req, res) => {
  const { orderId, recipient, amount, method, message } = req.body || {};

  if (!orderId || !recipient) {
    return res.status(400).json({ error: "orderId and recipient are required" });
  }

  const msg =
    message ||
    `Your payment for order #${orderId} was successful.` +
      (amount != null ? ` Amount: $ ${Number(amount).toLocaleString()}.` : "") +
      (method ? ` Method: ${method}.` : "");

  try {
    // AuthZ/authN check (throws on invalid token)
    await getUserFromToken(req.headers.authorization);

    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          order_id: orderId,
          channel: "email",
          recipient,
          message: msg,
        },
      ])
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: "DB error", details: error.message });
    }

    let emailMessageId = null;
    try {
      emailMessageId = await sendMail({
        to: recipient,
        subject: `✅ Payment Successful — Order #${orderId}`,
        text: msg,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#2d6a4f">🐾 Exotic Pet Marketplace</h2>
            <h3 style="color:#27ae60">✅ Payment Successful</h3>
            <p>Order ID: <strong>${orderId}</strong></p>
            ${amount != null ? `<p>Amount: <strong>$ ${Number(amount).toLocaleString()}</strong></p>` : ""}
            ${method ? `<p>Method: <strong>${method}</strong></p>` : ""}
            <p>${msg}</p>
            <hr/>
            <small style="color:#888">This is an automated notification.</small>
          </div>
        `,
      });
    } catch (mailErr) {
      // Non-fatal: notification already saved to DB
      console.error("SMTP error:", mailErr.message);
    }

    return res.json({
      message: "Payment success notification sent",
      emailSent: !!emailMessageId,
      notification: data,
    });
  } catch (err) {
    return res.status(401).json({
      error: "Unauthorized",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
