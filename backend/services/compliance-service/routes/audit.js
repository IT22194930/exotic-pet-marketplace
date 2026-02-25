const { Router } = require("express");
const supabase = require("../config/supabase");
const { getUserFromToken } = require("../helpers/auth");

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Require an authenticated admin; throws on failure. */
async function requireAdmin(authHeader) {
  const user = await getUserFromToken(authHeader);
  if (user.role !== "admin")
    throw Object.assign(new Error("Admin only"), { status: 403 });
  return user;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /audit/orders/:orderId
 * All log entries for a specific order, ascending by time.
 */
router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  res.json({ orderId, count: data.length, logs: data });
});

/**
 * GET /audit/logs
 * Paginated list of all audit logs with optional filters.
 * Query params:
 *   action    – filter by action name (e.g. COMPLIANCE_APPROVED)
 *   order_id  – filter by order ID
 *   from      – ISO date lower bound on created_at
 *   to        – ISO date upper bound on created_at
 *   page      – page number (default 1)
 *   limit     – results per page (default 50, max 200)
 */
router.get("/logs", async (req, res) => {
  const { action, order_id, from, to } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const from_ = (page - 1) * limit;
  const to_ = from_ + limit - 1;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from_, to_);

  if (action) query = query.eq("action", action);
  if (order_id) query = query.eq("order_id", order_id);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  res.json({
    total: count,
    page,
    limit,
    pages: Math.ceil(count / limit),
    logs: data,
  });
});

/**
 * GET /audit/logs/actions
 * Returns the distinct action types present in the audit log.
 */
router.get("/logs/actions", async (req, res) => {
  const { data, error } = await supabase.from("audit_logs").select("action");

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  const actions = [...new Set(data.map((r) => r.action))].sort();
  res.json({ count: actions.length, actions });
});

/**
 * GET /audit/stats
 * Count of each action type — useful for dashboards.
 */
router.get("/stats", async (req, res) => {
  const { data, error } = await supabase.from("audit_logs").select("action");

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  const stats = data.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});

  const total = data.length;
  res.json({ total, stats });
});

/**
 * DELETE /audit/orders/:orderId
 * Delete all audit logs for a specific order.
 * Admin only.
 */
router.delete("/orders/:orderId", async (req, res) => {
  try {
    await requireAdmin(req.headers.authorization);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const { orderId } = req.params;

  const { error, count } = await supabase
    .from("audit_logs")
    .delete({ count: "exact" })
    .eq("order_id", orderId);

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  res.json({
    message: `Deleted audit logs for order ${orderId}`,
    deleted: count,
  });
});

/**
 * DELETE /audit/logs
 * Bulk-delete logs matching filters (action and/or date range).
 * Admin only. Requires at least one filter to prevent accidental full wipe.
 * Query params: action, from, to
 */
router.delete("/logs", async (req, res) => {
  try {
    await requireAdmin(req.headers.authorization);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const { action, from, to } = req.query;

  if (!action && !from && !to) {
    return res.status(400).json({
      error:
        "At least one filter (action, from, to) is required for bulk delete",
    });
  }

  let query = supabase.from("audit_logs").delete({ count: "exact" });

  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { error, count } = await query;

  if (error)
    return res.status(500).json({ error: "DB error", details: error.message });

  res.json({ message: "Bulk delete complete", deleted: count });
});

module.exports = router;
