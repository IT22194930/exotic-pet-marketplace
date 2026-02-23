const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8001;

// ⚠️ For now hardcode secret (later we move to env var)
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-later";

// In-memory "database" (later MongoDB)
const users = []; 
// user object: { id, email, passwordHash, role, sellerVerified }

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // {id, role, email}
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/health", (req, res) => {
  res.json({ service: "identity-service", status: "ok", time: new Date().toISOString() });
});

// ✅ Register
app.post("/auth/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password, role are required" });
  }

  if (!["buyer", "seller", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be buyer/seller/admin" });
  }

  const exists = users.find(u => u.email === email);
  if (exists) return res.status(409).json({ error: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: `u_${Date.now()}`,
    email,
    passwordHash,
    role,
    sellerVerified: role === "seller" ? false : null
  };

  users.push(user);

  res.status(201).json({
    message: "Registered successfully",
    user: { id: user.id, email: user.email, role: user.role, sellerVerified: user.sellerVerified }
  });
});

// ✅ Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user);

  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, email: user.email, role: user.role, sellerVerified: user.sellerVerified }
  });
});

// ✅ Protected profile
app.get("/users/me", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    sellerVerified: user.sellerVerified
  });
});

// ✅ Admin verifies seller
app.patch("/sellers/:id/verify", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can verify sellers" });
  }

  const seller = users.find(u => u.id === req.params.id && u.role === "seller");
  if (!seller) return res.status(404).json({ error: "Seller not found" });

  seller.sellerVerified = true;

  res.json({
    message: "Seller verified",
    seller: { id: seller.id, email: seller.email, sellerVerified: seller.sellerVerified }
  });
});

app.listen(PORT, () => console.log(`identity-service running on port ${PORT}`));