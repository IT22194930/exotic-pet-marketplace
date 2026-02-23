const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;
const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:4001";

app.get("/health", (req, res) => {
  res.json({ service: "order-service", status: "ok" });
});

// ✅ Helper: validate JWT by calling Identity Service
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader }
  });

  return response.data; // {id, email, role, sellerVerified}
}

// ✅ New endpoint: validates user through Identity service
app.get("/orders/whoami", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    res.json({ message: "Token is valid", user });
  } catch (err) {
    res.status(401).json({
      error: "Token invalid or Identity service unreachable",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`order-service running on port ${PORT}`);
});