require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const listingRoutes = require("./routes/listings");
const { startConsumer } = require("./kafka/consumer");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8002;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Share the supabase client with all routes via app.locals
app.locals.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Swagger UI 
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Listing Service API Docs",
}));

// Health 
app.get("/health", (req, res) => {
  res.json({ service: "listing-service", status: "ok" });
});

// Routes
app.use("/listings", listingRoutes);

app.listen(PORT, () => console.log(`listing-service running on port ${PORT}`));

// Kafka Consumer (optional - service continues without it)
// Consume order-events to update listing status without a synchronous HTTP call
const KAFKA_ENABLED = process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS !== 'none';

if (KAFKA_ENABLED) {
  console.log('[kafka] Starting Kafka consumer...');
  startConsumer(
    "listing-service-group",
    ["order-events"],
    async (topic, eventType, payload) => {
      if (eventType === "order.cancelled" && payload.listingId) {
        const supabase = app.locals.supabase;
        const { error } = await supabase
          .from("listings")
          .update({ status: "available" })
          .eq("id", payload.listingId);

        if (error) {
          console.error("[kafka] Failed to reset listing status:", error.message);
        } else {
          console.log(`[kafka] Listing ${payload.listingId} reset to available`);
        }
      }
    },
  ).catch((err) => {
    console.error("[kafka] Consumer failed to start (non-fatal):", err.message);
    console.warn("[kafka] Service will continue without event-driven features");
  });
} else {
  console.log('[kafka] Kafka disabled - service running without event-driven features');
}

