const AuditLog = require('../models/AuditLog');

// Best-effort: a logging failure should never take down the real action it
// describes, so this swallows its own errors after printing them.
async function logAction({ actor, action, entityType, entityId, description, result = 'success' }) {
  try {
    await AuditLog.create({
      actorEmpId: actor?.empId || actor?.mobile || null,
      actorRole: actor?.role || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      description,
      result,
    });
  } catch (err) {
    console.error('[audit] failed to log action:', action, err.message);
  }
}

module.exports = { logAction };
