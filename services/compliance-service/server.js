const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;

app.get("/health", (req, res) => {
  res.json({ service: "compliance-service", status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`compliance-service running on port ${PORT}`);
});