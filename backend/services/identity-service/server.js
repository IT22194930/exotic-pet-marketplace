require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { publish } = require("./kafka/producer");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8001;
const JWT_SECRET =
  process.env.JWT_SECRET || "CN4vbU9nRdi1ubOq5a1IYcw5WBvi7FfTz8iqC8ojWGA";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "2h" },
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/health", (req, res) => {
  res.json({ service: "identity-service", status: "ok" });
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Register (Supabase)
app.post("/auth/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "email, password, role are required" });
  }
  if (!["buyer", "seller", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be buyer/seller/admin" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email,
        password_hash: passwordHash,
        role,
        seller_verified: role === "seller" ? false : false,
      },
    ])
    .select("id,email,role,seller_verified")
    .single();

  if (error) {
    if (error.message?.toLowerCase().includes("duplicate")) {
      return res.status(409).json({ error: "User already exists" });
    }
    return res
      .status(500)
      .json({ error: "Database error", details: error.message });
  }

  // Publish event (non-blocking – failure must not break registration)
  publish("user-events", "user.registered", {
    userId: data.id,
    email: data.email,
    role: data.role,
  }).catch((e) =>
    console.error("[kafka] user.registered publish failed:", e.message),
  );

  res.status(201).json({
    message: "Registered successfully",
    user: {
      id: data.id,
      email: data.email,
      role: data.role,
      sellerVerified: data.seller_verified,
    },
  });
});

// ✅ Login (Supabase)
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("id,email,role,seller_verified,password_hash")
    .eq("email", email)
    .single();

  if (error || !user)
    return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user);

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      sellerVerified: user.seller_verified,
    },
  });
});

// ✅ Protected profile
app.get("/users/me", authMiddleware, async (req, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("id,email,role,seller_verified")
    .eq("id", req.user.id)
    .single();

  if (error || !user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    sellerVerified: user.seller_verified,
  });
});

// ✅ Admin verifies seller
app.patch("/sellers/:id/verify", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can verify sellers" });
  }

  const { data: updated, error } = await supabase
    .from("users")
    .update({ seller_verified: true })
    .eq("id", req.params.id)
    .select("id,email,role,seller_verified")
    .single();

  if (error || !updated)
    return res.status(404).json({ error: "Seller not found" });

  publish("user-events", "seller.verified", {
    sellerId: updated.id,
    email: updated.email,
  }).catch((e) =>
    console.error("[kafka] seller.verified publish failed:", e.message),
  );

  res.json({
    message: "Seller verified",
    seller: {
      id: updated.id,
      email: updated.email,
      sellerVerified: updated.seller_verified,
    },
  });
});

// ✅ Admin: list all users
app.get("/users", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,role,seller_verified,created_at")
    .order("created_at", { ascending: false });

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });
  res.json({ count: data.length, users: data });
});

// ✅ Admin: update user role
app.patch("/users/:id/role", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const { role } = req.body;
  if (!["buyer", "seller", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be buyer/seller/admin" });
  }

  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", req.params.id)
    .select("id,email,role,seller_verified")
    .single();

  if (error || !data) return res.status(404).json({ error: "User not found" });
  res.json({ message: "Role updated", user: data });
});

app.listen(PORT, () => console.log(`identity-service running on port ${PORT}`));
