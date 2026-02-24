const { Router } = require("express");
const supabase = require("../config/supabase");

const router = Router();

/**
 * GET /audit/orders/:orderId
 * Returns all audit log entries for a given order (ascending by time).
 */
router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: "DB error", details: error.message });
  }

  res.json({ orderId, count: data.length, logs: data });
});

module.exports = router;
