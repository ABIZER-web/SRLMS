const router = require('express').Router();
const PnrRecord = require('../models/PnrRecord');
const { requireAuth, requireRole } = require('../middleware/auth');

// ADMIN: list every PNR record (optionally filter by train/coach/date)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { trainNumber, coachNumber, journeyDate } = req.query;
  const filter = {};
  if (trainNumber) filter.trainNumber = trainNumber;
  if (coachNumber) filter.coachNumber = coachNumber;
  if (journeyDate) filter.journeyDate = journeyDate;

  const records = await PnrRecord.find(filter).sort({ coachNumber: 1, seatNumber: 1 });
  res.json({ count: records.length, records });
});

// COACH ATTENDANT: the core lookup - every PNR on their assigned coach.
// Admins can also hit this and pass any coachNumber for testing.
router.get('/coach/:coachNumber', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const { coachNumber } = req.params;

  if (req.user.role === 'coach_attendant' && req.user.assignedCoachNumber !== coachNumber) {
    return res.status(403).json({ message: 'You are not assigned to this coach' });
  }

  const records = await PnrRecord.find({ coachNumber }).sort({ seatNumber: 1 });
  res.json({ coachNumber, count: records.length, records });
});

// Single PNR lookup - what scanning a ticket QR would resolve to.
// Any authenticated staff member can look up any PNR; a passenger can only
// look up their own.
router.get('/:pnr', requireAuth, async (req, res) => {
  const record = await PnrRecord.findOne({ pnr: req.params.pnr });
  if (!record) return res.status(404).json({ message: 'No booking found for this PNR' });

  if (req.user.role === 'passenger' && record.mobile !== req.user.mobile) {
    return res.status(403).json({ message: 'This PNR does not belong to your account' });
  }

  res.json({ record });
});

// COACH ATTENDANT: mark a passenger as boarded (demo of the on-board handover step)
router.patch('/:id/board', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const record = await PnrRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'PNR record not found' });

  if (req.user.role === 'coach_attendant' && req.user.assignedCoachNumber !== record.coachNumber) {
    return res.status(403).json({ message: 'You are not assigned to this coach' });
  }

  record.boardingStatus = 'boarded';
  await record.save();
  res.json({ record });
});

module.exports = router;
