const mongoose = require('mongoose');

// Append-only from the normal app flow - nothing in the API updates or
// deletes a row once written. Written via utils/audit.js:logAction() from
// the routes that matter (linen assign/return, gate alerts, incident
// status changes, blacklist decisions) so the Railway dashboard has a real
// activity feed instead of a mocked one.

const auditLogSchema = new mongoose.Schema(
  {
    actorEmpId: { type: String, default: null },
    actorRole: { type: String, default: null },

    action: { type: String, required: true }, // e.g. 'linen.assign', 'incident.resolve'
    entityType: { type: String, required: true }, // e.g. 'PnrRecord', 'TheftIncident'
    entityId: { type: String, default: null },

    description: { type: String, required: true },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
