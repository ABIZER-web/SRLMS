const router = require('express').Router();
const LinenItem = require('../models/LinenItem');
const PnrRecord = require('../models/PnrRecord');
const TheftIncident = require('../models/TheftIncident');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Simulates a station exit-gate RFID + AM-thread reader detecting a tag.
// There's no physical gate yet, so this stands in for that hardware event -
// swap the caller for a real gate webhook later without changing the logic.
//
// Rule: if the item is still 'assigned' (never returned/unassigned), it left
// the station on a passenger who didn't check it back in - that's a theft
// signal, logged for the admin dashboard. Anything already 'returned'
// passing the gate is normal and is not flagged.
router.post('/scan', requireAuth, requireRole('admin'), async (req, res) => {
  const { lid, gateId } = req.body;
  if (!lid || !gateId) return res.status(400).json({ message: 'lid and gateId are required' });

  const item = await LinenItem.findOne({ lid });
  if (!item) return res.status(404).json({ message: 'No linen item registered for this LID' });

  if (item.status !== 'assigned') {
    return res.json({
      flagged: false,
      message: `Item is currently '${item.status}' — gate passage is normal, no alert raised.`,
      item,
    });
  }

  let pnrRecord = null;
  if (item.assignedPnr) {
    pnrRecord = await PnrRecord.findOne({ pnr: item.assignedPnr });
  }

  const incident = await TheftIncident.create({
    lid: item.lid,
    itemType: item.itemType,
    pnr: item.assignedPnr,
    passengerName: pnrRecord?.passengerName || null,
    coachNumber: pnrRecord?.coachNumber || null,
    gateId,
  });

  item.status = 'missing';
  await item.save();

  await logAction({
    actor: req.user,
    action: 'incident.create',
    entityType: 'TheftIncident',
    entityId: incident._id,
    description: `Gate ${gateId} flagged ${item.itemType} (${item.lid}) still checked out — PNR ${item.assignedPnr || 'unknown'}`,
  });

  res.status(201).json({
    flagged: true,
    message: `ALERT: ${item.itemType} (${item.lid}) exited via gate ${gateId} while still checked out.`,
    incident,
  });
});

// Admin dashboard feed of theft/exit-gate alerts.
router.get('/alerts', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const incidents = await TheftIncident.find(filter).sort({ detectedAt: -1 });
  res.json({ count: incidents.length, incidents });
});

router.patch('/alerts/:id/resolve', requireAuth, requireRole('admin'), async (req, res) => {
  const incident = await TheftIncident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });

  incident.status = 'resolved';
  incident.resolvedAt = new Date();
  incident.resolvedByEmpId = req.user.empId;
  await incident.save();

  res.json({ incident });
});

module.exports = router;
