require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8000;

const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";
const LISTING_URL = process.env.LISTING_URL || "http://listing-service:8002";
const ORDER_URL = process.env.ORDER_URL || "http://order-service:8003";
const COMPLIANCE_URL = process.env.COMPLIANCE_URL || "http://compliance-service:8004";
const PAYMENT_URL = process.env.PAYMENT_URL || "http://payment-service:8005";

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));

// Rate limiter: 200 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again in a minute." },
});
app.use("/api", limiter);
app.use("/auth", limiter);
app.use("/users", limiter);
app.use("/sellers", limiter);
app.use("/listings", limiter);
app.use("/orders", limiter);
app.use("/compliance", limiter);
app.use("/notify", limiter);
app.use("/audit", limiter);
app.use("/payments", limiter);

// ── Aggregated health check ───────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const services = [
    { name: "identity-service", url: IDENTITY_URL },
    { name: "listing-service", url: LISTING_URL },
    { name: "order-service", url: ORDER_URL },
    { name: "compliance-service", url: COMPLIANCE_URL },
    { name: "payment-service", url: PAYMENT_URL },
  ];

  const results = await Promise.allSettled(
    services.map(async ({ name, url }) => {
      const start = Date.now();
      const r = await axios.get(`${url}/health`, { timeout: 3000 });
      return { name, status: "ok", latencyMs: Date.now() - start, ...r.data };
    }),
  );

  const statuses = results.map((r, i) => ({
    service: services[i].name,
    status: r.status === "fulfilled" ? "ok" : "down",
    ...(r.status === "fulfilled"
      ? r.value
      : { error: r.reason?.message || "unreachable" }),
  }));

  const allOk = statuses.every((s) => s.status === "ok");
  res.status(allOk ? 200 : 503).json({
    gateway: "api-gateway",
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: statuses,
  });
});

// ── Route table ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Exotic Pet Marketplace — API Gateway",
    version: "1.0.0",
    port: PORT,
    routes: [
      { prefix: "/auth  (or /api/auth)", upstream: IDENTITY_URL },
      { prefix: "/users  (or /api/users)", upstream: IDENTITY_URL },
      { prefix: "/sellers  (or /api/sellers)", upstream: IDENTITY_URL },
      { prefix: "/listings  (or /api/listings)", upstream: LISTING_URL },
      { prefix: "/orders  (or /api/orders)", upstream: ORDER_URL },
      { prefix: "/compliance  (or /api/compliance)", upstream: COMPLIANCE_URL },
      { prefix: "/notify  (or /api/notify)", upstream: COMPLIANCE_URL },
      { prefix: "/audit  (or /api/audit)", upstream: COMPLIANCE_URL },
      { prefix: "/payments  (or /api/payments)", upstream: PAYMENT_URL },
    ],
  });
});

// ── Proxy factory ─────────────────────────────────────────────────────────────
// http-proxy-middleware receives req.url before Express strips the mount prefix,
// so we must rewrite the FULL mount path to the upstream prefix.
function makeProxy(target, mountPath, upstreamPrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${mountPath}`]: upstreamPrefix },
    on: {
      error: (err, req, res) => {
        console.error(`[gateway] Proxy error → ${target}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({
            error: "Bad Gateway",
            upstream: target,
            details: err.message,
          });
        }
      },
    },
  });
}

// ── Route → service mapping ──────────────────────────────────────────────────
// Both /api/<path> and /<path> are accepted so clients can use either form.

// Identity Service
app.use("/api/auth", makeProxy(IDENTITY_URL, "/api/auth", "/auth"));
app.use("/api/users", makeProxy(IDENTITY_URL, "/api/users", "/users"));
app.use("/api/sellers", makeProxy(IDENTITY_URL, "/api/sellers", "/sellers"));
app.use("/auth", makeProxy(IDENTITY_URL, "/auth", "/auth"));
app.use("/users", makeProxy(IDENTITY_URL, "/users", "/users"));
app.use("/sellers", makeProxy(IDENTITY_URL, "/sellers", "/sellers"));

// Listing Service
app.use("/api/listings", makeProxy(LISTING_URL, "/api/listings", "/listings"));
app.use("/listings", makeProxy(LISTING_URL, "/listings", "/listings"));

// Order Service
app.use("/api/orders", makeProxy(ORDER_URL, "/api/orders", "/orders"));
app.use("/orders", makeProxy(ORDER_URL, "/orders", "/orders"));

// Compliance Service
app.use(
  "/api/compliance",
  makeProxy(COMPLIANCE_URL, "/api/compliance", "/compliance"),
);
app.use("/api/notify", makeProxy(COMPLIANCE_URL, "/api/notify", "/notify"));

app.use("/compliance", makeProxy(COMPLIANCE_URL, "/compliance", "/compliance"));
app.use("/notify", makeProxy(COMPLIANCE_URL, "/notify", "/notify"));
app.use("/audit", makeProxy(COMPLIANCE_URL, "/audit", "/audit"));

// Payment Service
app.use(
  "/api/payments",
  makeProxy(PAYMENT_URL, "/api/payments", "/payments"),
);
app.use("/payments", makeProxy(PAYMENT_URL, "/payments", "/payments"));

// ── 404 fallthrough ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    hint: "Use /auth, /listings, /orders, /compliance, /notify — or prefix with /api (e.g. /api/auth/login)",
    method: req.method,
    path: req.path,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`api-gateway running on port ${PORT}`);
  console.log(`  Identity   → ${IDENTITY_URL}`);
  console.log(`  Listing    → ${LISTING_URL}`);
  console.log(`  Order      → ${ORDER_URL}`);
  console.log(`  Compliance → ${COMPLIANCE_URL}`);
  console.log(`  Payment    → ${PAYMENT_URL}`);
});
