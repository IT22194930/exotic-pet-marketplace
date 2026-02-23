const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

app.get("/health", (req, res) => {
  res.json({ service: "listing-service", status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`listing-service running on port ${PORT}`);
});