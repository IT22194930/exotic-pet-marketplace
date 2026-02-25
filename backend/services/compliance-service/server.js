require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Initialise Supabase (validates env vars at startup)
require("./config/supabase");

const complianceRoutes = require("./routes/compliance");
const notifyRoutes = require("./routes/notify");
const auditRoutes = require("./routes/audit");

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
