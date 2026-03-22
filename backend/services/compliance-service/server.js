require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// Initialise Supabase
require("./config/supabase");

const complianceRoutes = require("./routes/compliance");
const notifyRoutes = require("./routes/notify");
const { startConsumer } = require("./kafka/consumer");
const { sendMail } = require("./helpers/mailer");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8004;

app.get("/health", (req, res) => {
  res.json({ service: "compliance-service", status: "ok" });
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/compliance", complianceRoutes);
app.use("/notify", notifyRoutes);

app.listen(PORT, () =>
  console.log(`compliance-service running on port ${PORT}`),
);

//  Kafka Consumer
// Handles async audit logging and notifications for all domain events
// Start asynchronously so HTTP server is accessible even if Kafka fails
(async () => {
  try {
    await startConsumer(
      "compliance-service-group",
      ["order-events", "user-events", "listing-events"],
      async (topic, eventType, payload) => {
        switch (eventType) {
          //  Order events
          case "order.placed":
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
            break;

          //  User events
          case "user.registered":
            break;

          case "seller.verified":
            break;

          //  Listing events
          case "listing.created":
            break;

          case "listing.deleted":
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
