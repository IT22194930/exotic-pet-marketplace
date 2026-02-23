const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;
const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";

// In-memory listings (later MongoDB)
const listings = [];
// listing shape: { id, species, type, price, sellerId, status, createdAt }

app.get("/health", (req, res) => {
  res.json({ service: "listing-service", status: "ok" });
});

// Helper: validate token by calling Identity service
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader }
  });

  return response.data;
}

// ✅ Create listing (SELLER ONLY)
app.post("/listings", async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    if (user.role !== "seller") {
      return res.status(403).json({ error: "Only sellers can create listings" });
    }

    const { species, type, price } = req.body;
    if (!species || !type || price == null) {
      return res.status(400).json({ error: "species, type, price are required" });
    }

    const listing = {
      id: `l_${Date.now()}`,
      species,
      type, // "exotic" | "livestock"
      price: Number(price),
      sellerId: user.id,
      status: "available",
      createdAt: new Date().toISOString()
    };

    listings.push(listing);

    res.status(201).json({ message: "Listing created", listing });
  } catch (err) {
    res.status(401).json({
      error: "Token invalid or Identity service unreachable",
      details: err.response?.data || err.message
    });
  }
});

// ✅ Get listing by id
app.get("/listings/:id", (req, res) => {
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  res.json(listing);
});

// ✅ List all (simple)
app.get("/listings", (req, res) => {
  res.json({ count: listings.length, listings });
});

app.listen(PORT, () => console.log(`listing-service running on port ${PORT}`));