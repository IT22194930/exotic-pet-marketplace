const supabase = require("../config/supabase");

/**
 * Writes an audit log entry for any entity.
 * @param {string} entityType  e.g. "order"|"user"|"seller"|"listing"
 * @param {string} entityId    The UUID of the entity
 * @param {string} action      e.g. "USER_REGISTERED"
 * @param {object} details
 */
async function audit(entityType, entityId, action, details = {}) {
  await supabase
    .from("audit_logs")
    .insert([
      { entity_type: entityType, entity_id: entityId, action, details },
    ]);
}

module.exports = { audit };
