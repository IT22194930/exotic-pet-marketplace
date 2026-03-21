const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const orderRoutes = require("./routes/orders");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8003;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Share the supabase client with all routes via app.locals
app.locals.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Order Service API Docs",
}));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "check 1" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/orders", orderRoutes);

app.listen(PORT, () => console.log(`order-service running on port ${PORT}`));