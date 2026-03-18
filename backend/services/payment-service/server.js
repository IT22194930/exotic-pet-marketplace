require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const paymentRoutes = require("./routes/payments");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8005;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Share the supabase client with all routes via app.locals
app.locals.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ service: "payment-service", status: "ok" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/payments", paymentRoutes);

app.listen(PORT, () => console.log(`payment-service running on port ${PORT}`));
