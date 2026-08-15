const router = require('express').Router();
const PnrRecord = require('../models/PnrRecord');
const LinenItem = require('../models/LinenItem');
const LinenKit = require('../models/LinenKit');
const TheftIncident = require('../models/TheftIncident');
const BlacklistRecord = require('../models/BlacklistRecord');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Railway Department consumes data created elsewhere - it never registers
// RFID, creates LIDs, or generates linen-operator QR codes. Everything
// here is monitoring, review, and reporting on top of the existing models.
const RAILWAY_ROLES = ['railway_officer', 'admin'];

// ---------------------------------------------------------------- SUMMARY
router.get('/summary', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const [
    totalPassengers,
    linenIssued,
    linenReturned,
    missingItems,
    openAlerts,
    activeBlacklist,
    totalKits,
  ] = await Promise.all([
    PnrRecord.countDocuments(),
    PnrRecord.countDocuments({ 'linenAssignment.assigned': true }),
    PnrRecord.countDocuments({ 'linenAssignment.returned': true }),
    LinenItem.countDocuments({ status: 'missing' }),
    TheftIncident.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    BlacklistRecord.countDocuments({ status: 'active' }),
    LinenKit.countDocuments(),
  ]);

  res.json({
    totalPassengers,
    linenIssued,
    linenReturned,
    linenCurrentlyAssigned: linenIssued - linenReturned,
    missingItems,
    openAlerts,
    activeBlacklist,
    totalKits,
  });
});

// Recent activity feed - doubles as "Live Operations" for this pass.
router.get('/activity', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
  res.json({ count: logs.length, logs });
});

// -------------------------------------------------------------- PASSENGERS
router.get('/passengers', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { q } = req.query;
  const filter = q
    ? {
        $or: [
          { pnr: new RegExp(q, 'i') },
          { passengerName: new RegExp(q, 'i') },
          { trainNumber: new RegExp(q, 'i') },
          { coachNumber: new RegExp(q, 'i') },
        ],
      }
    : {};

  const records = await PnrRecord.find(filter).sort({ coachNumber: 1, seatNumber: 1 }).limit(500);
  res.json({ count: records.length, records });
});

router.get('/passengers/:pnr', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const record = await PnrRecord.findOne({ pnr: req.params.pnr });
  if (!record) return res.status(404).json({ message: 'No booking found for this PNR' });

  const [incidents, blacklist] = await Promise.all([
    TheftIncident.find({ pnr: record.pnr }).sort({ detectedAt: -1 }),
    BlacklistRecord.findOne({ pnr: record.pnr, status: { $in: ['under_review', 'active'] } }),
  ]);

  res.json({ record, incidents, blacklist });
});

// ------------------------------------------------------------- LINEN VIEW
// Read-only mirror of the linen-ops inventory/kit lists, scoped to the
// railway role - they can see everything but have no register/create
// endpoints here.
router.get('/linen', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { status, linenCode, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (linenCode) filter.linenCode = Number(linenCode);
  if (q) filter.$or = [{ lid: new RegExp(q, 'i') }, { qrCode: new RegExp(q, 'i') }, { assignedPnr: new RegExp(q, 'i') }];

  const items = await LinenItem.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ count: items.length, items });
});

router.get('/linen/kits/:qrCode', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const kit = await LinenKit.findOne({ qrCode: req.params.qrCode }).populate('items');
  if (!kit) return res.status(404).json({ message: 'No kit matches that QR code' });
  res.json({ kit });
});

// -------------------------------------------------------------- INCIDENTS
router.get('/incidents', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { status } = req.query;
  const filter = status && status !== 'all' ? { status } : {};
  const incidents = await TheftIncident.find(filter).sort({ detectedAt: -1 });
  res.json({ count: incidents.length, incidents });
});

router.get('/incidents/:id', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const incident = await TheftIncident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });

  const [item, pnrRecord, blacklist] = await Promise.all([
    LinenItem.findOne({ lid: incident.lid }),
    incident.pnr ? PnrRecord.findOne({ pnr: incident.pnr }) : null,
    incident.pnr ? BlacklistRecord.findOne({ pnr: incident.pnr }) : null,
  ]);

  res.json({ incident, item, pnrRecord, blacklist });
});

router.patch('/incidents/:id/status', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { status, notes } = req.body;
  if (!['open', 'under_review', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'status must be open, under_review, or resolved' });
  }

  const incident = await TheftIncident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });

  incident.status = status;
  if (notes) incident.notes = notes;
  if (status === 'resolved') {
    incident.resolvedAt = new Date();
    incident.resolvedByEmpId = req.user.empId;
  }
  await incident.save();

  await logAction({
    actor: req.user,
    action: 'incident.status_change',
    entityType: 'TheftIncident',
    entityId: incident._id,
    description: `Incident ${incident._id} marked ${status}`,
  });

  res.json({ incident });
});

// -------------------------------------------------------------- BLACKLIST
router.get('/blacklist', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { status } = req.query;
  const filter = status && status !== 'all' ? { status } : {};
  const records = await BlacklistRecord.find(filter).sort({ createdAt: -1 });
  res.json({ count: records.length, records });
});

// Propose a blacklist record - starts life 'under_review'. Anyone with
// railway-dashboard access can propose one from an incident; it only takes
// effect once a decision is recorded below.
router.post('/blacklist', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { passengerName, pnr, incidentId, reasonCategory, notes } = req.body;
  if (!passengerName) return res.status(400).json({ message: 'passengerName is required' });

  const seq = (await BlacklistRecord.countDocuments()) + 1;
  const record = await BlacklistRecord.create({
    recordId: `BL-${String(seq).padStart(6, '0')}`,
    passengerName,
    pnr: pnr || null,
    incident: incidentId || null,
    reasonCategory: reasonCategory || undefined,
    notes: notes || '',
    createdByEmpId: req.user.empId,
  });

  await logAction({
    actor: req.user,
    action: 'blacklist.propose',
    entityType: 'BlacklistRecord',
    entityId: record._id,
    description: `Blacklist proposed for ${passengerName}${pnr ? ` (PNR ${pnr})` : ''} — ${record.recordId}`,
  });

  res.status(201).json({ record });
});

router.patch('/blacklist/:id/decision', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { decision, notes } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be approve or reject' });
  }

  const record = await BlacklistRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'Blacklist record not found' });
  if (record.status !== 'under_review') {
    return res.status(409).json({ message: `This record is already ${record.status}` });
  }

  record.status = decision === 'approve' ? 'active' : 'rejected';
  record.reviewedByEmpId = req.user.empId;
  record.reviewedAt = new Date();
  if (notes) record.notes = notes;
  await record.save();

  await logAction({
    actor: req.user,
    action: 'blacklist.decision',
    entityType: 'BlacklistRecord',
    entityId: record._id,
    description: `${record.recordId} ${decision}d by ${req.user.empId}`,
  });

  res.json({ record });
});

router.patch('/blacklist/:id/resolve', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const record = await BlacklistRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'Blacklist record not found' });
  if (record.status !== 'active') {
    return res.status(409).json({ message: 'Only an active record can be resolved' });
  }

  record.status = 'resolved';
  record.resolvedByEmpId = req.user.empId;
  record.resolvedAt = new Date();
  await record.save();

  await logAction({
    actor: req.user,
    action: 'blacklist.resolve',
    entityType: 'BlacklistRecord',
    entityId: record._id,
    description: `${record.recordId} resolved by ${req.user.empId}`,
  });

  res.json({ record });
});

// ------------------------------------------------------------------ AUDIT
router.get('/audit', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const { action, entityType } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ count: logs.length, logs });
});

// ---------------------------------------------------------------- REPORTS
function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = c.value(row);
        const str = val === null || val === undefined ? '' : String(val);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

const REPORTS = {
  'linen-inventory': async () => {
    const items = await LinenItem.find().sort({ createdAt: -1 });
    return toCsv(items, [
      { label: 'LID', value: (i) => i.lid },
      { label: 'Type', value: (i) => i.itemType },
      { label: 'QR Code', value: (i) => i.qrCode },
      { label: 'Status', value: (i) => i.status },
      { label: 'Assigned PNR', value: (i) => i.assignedPnr },
      { label: 'Region', value: (i) => i.regionCode },
    ]);
  },
  'missing-linen': async () => {
    const incidents = await TheftIncident.find().sort({ detectedAt: -1 });
    return toCsv(incidents, [
      { label: 'Incident', value: (i) => i._id },
      { label: 'LID', value: (i) => i.lid },
      { label: 'Item Type', value: (i) => i.itemType },
      { label: 'PNR', value: (i) => i.pnr },
      { label: 'Passenger', value: (i) => i.passengerName },
      { label: 'Coach', value: (i) => i.coachNumber },
      { label: 'Gate', value: (i) => i.gateId },
      { label: 'Detected At', value: (i) => i.detectedAt?.toISOString() },
      { label: 'Status', value: (i) => i.status },
    ]);
  },
  blacklist: async () => {
    const records = await BlacklistRecord.find().sort({ createdAt: -1 });
    return toCsv(records, [
      { label: 'Record ID', value: (r) => r.recordId },
      { label: 'Passenger', value: (r) => r.passengerName },
      { label: 'PNR', value: (r) => r.pnr },
      { label: 'Status', value: (r) => r.status },
      { label: 'Reason', value: (r) => r.reasonCategory },
      { label: 'Created By', value: (r) => r.createdByEmpId },
      { label: 'Created At', value: (r) => r.createdAt?.toISOString() },
      { label: 'Reviewed By', value: (r) => r.reviewedByEmpId },
    ]);
  },
  audit: async () => {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(1000);
    return toCsv(logs, [
      { label: 'Time', value: (l) => l.createdAt?.toISOString() },
      { label: 'Actor', value: (l) => l.actorEmpId },
      { label: 'Role', value: (l) => l.actorRole },
      { label: 'Action', value: (l) => l.action },
      { label: 'Entity Type', value: (l) => l.entityType },
      { label: 'Entity ID', value: (l) => l.entityId },
      { label: 'Description', value: (l) => l.description },
      { label: 'Result', value: (l) => l.result },
    ]);
  },
  passengers: async () => {
    const records = await PnrRecord.find().sort({ coachNumber: 1, seatNumber: 1 });
    return toCsv(records, [
      { label: 'PNR', value: (r) => r.pnr },
      { label: 'Passenger', value: (r) => r.passengerName },
      { label: 'Train', value: (r) => r.trainNumber },
      { label: 'Coach', value: (r) => r.coachNumber },
      { label: 'Seat', value: (r) => r.seatNumber },
      { label: 'Journey Date', value: (r) => r.journeyDate },
      { label: 'Booking Status', value: (r) => r.bookingStatus },
      { label: 'Linen Assigned', value: (r) => r.linenAssignment?.assigned },
      { label: 'Linen Returned', value: (r) => r.linenAssignment?.returned },
    ]);
  },
};

router.get('/reports/:type', requireAuth, requireRole(...RAILWAY_ROLES), async (req, res) => {
  const builder = REPORTS[req.params.type];
  if (!builder) return res.status(404).json({ message: `Unknown report type '${req.params.type}'` });

  const csv = await builder();

  await logAction({
    actor: req.user,
    action: 'report.export',
    entityType: 'Report',
    entityId: req.params.type,
    description: `Exported ${req.params.type} report`,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}.csv"`);
  res.send(csv);
});

module.exports = router;
