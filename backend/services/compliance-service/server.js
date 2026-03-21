require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Initialise Supabase
require("./config/supabase");

const complianceRoutes = require("./routes/compliance");
const notifyRoutes = require("./routes/notify");
const auditRoutes = require("./routes/audit");
const { startConsumer } = require("./kafka/consumer");
const { audit } = require("./helpers/audit");
const { sendMail } = require("./helpers/mailer");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8004;

app.get("/health", (req, res) => {
  res.json({ service: "compliance-service", status: "ok" });
});

app.use("/compliance", complianceRoutes);
app.use("/notify", notifyRoutes);
app.use("/audit", auditRoutes);

app.listen(PORT, () =>
  console.log(`compliance-service running on port ${PORT}`),
);

// ── Kafka Consumer ────────────────────────────────────────────────────────────
// Handles async audit logging and notifications for all domain events
// Start asynchronously so HTTP server is accessible even if Kafka fails
(async () => {
  try {
    await startConsumer(
      "compliance-service-group",
      ["order-events", "user-events", "listing-events"],
      async (topic, eventType, payload) => {
        switch (eventType) {
          // ── Order events ──────────────────────────────────────────────────────
          case "order.placed":
            await audit("order", payload.orderId, "ORDER_PLACED", {
              buyerId: payload.buyerId,
              listingId: payload.listingId,
              species: payload.species,
              status: payload.status,
              complianceAllowed: payload.complianceAllowed,
            });
            // Send order confirmation email only for approved orders
            // (rejection email is already sent by the sync compliance check)
            if (payload.status === "created" && payload.buyerEmail) {
              sendMail({
                to: payload.buyerEmail,
                subject: `✅ Order Confirmed — #${payload.orderId}`,
                text: `Your order #${payload.orderId} for "${payload.species}" has been placed successfully. Price: $${payload.price}`,
                html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto">
                <h2>🐾 Exotic Pet Marketplace</h2>
                <h3 style="color:#27ae60">✅ Order Confirmed!</h3>
                <p>Order ID: <strong>${payload.orderId}</strong></p>
                <p>Species: <strong>${payload.species}</strong></p>
                <p>Price: <strong>$${payload.price}</strong></p>
                <p>Your order has been placed and is pending fulfillment.</p>
              </div>
            `,
              }).catch((e) =>
                console.error(
                  "[kafka] Order confirmation email failed:",
                  e.message,
                ),
              );
            }
            break;

          case "order.cancelled":
            await audit("order", payload.orderId, "ORDER_CANCELLED", {
              buyerId: payload.buyerId,
              listingId: payload.listingId,
            });
            break;

          // ── User events ───────────────────────────────────────────────────────
          case "user.registered":
            await audit("user", payload.userId, "USER_REGISTERED", {
              email: payload.email,
              role: payload.role,
            });
            break;

          case "seller.verified":
            await audit("seller", payload.sellerId, "SELLER_VERIFIED", {
              email: payload.email,
            });
            break;

          // ── Listing events ────────────────────────────────────────────────────
          case "listing.created":
            await audit("listing", payload.listingId, "LISTING_CREATED", {
              sellerId: payload.sellerId,
              title: payload.title,
              species: payload.species,
              price: payload.price,
            });
            break;

          case "listing.deleted":
            await audit("listing", payload.listingId, "LISTING_DELETED", {
              sellerId: payload.sellerId,
            });
            break;

          default:
            console.warn(
              `[kafka] Unknown event "${eventType}" on topic "${topic}"`,
            );
        }
      },
    );
  } catch (err) {
    console.error("[kafka] compliance-service consumer error:", err.message);
  }
})();
