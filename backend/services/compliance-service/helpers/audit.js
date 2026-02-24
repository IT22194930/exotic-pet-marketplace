const supabase = require("../config/supabase");

/**
 * Writes an audit log entry for an order action.
 * @param {string} orderId
 * @param {string} action
 * @param {object} details
 */
async function audit(orderId, action, details = {}) {
  await supabase
    .from("audit_logs")
    .insert([{ order_id: orderId, action, details }]);
}

module.exports = { audit };
