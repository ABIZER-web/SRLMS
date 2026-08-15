const router = require('express').Router();
const LinenKit = require('../models/LinenKit');
const LinenItem = require('../models/LinenItem');
const PnrRecord = require('../models/PnrRecord');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// STEP 1: scan the kit's paper-bag QR code.
// Returns the kit and its 5 pre-linked items, provided it's still sealed
// (i.e. hasn't already been handed to another passenger).
router.get('/kit/:qrCode', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const kit = await LinenKit.findOne({ qrCode: req.params.qrCode }).populate('items');
  if (!kit) return res.status(404).json({ message: 'No kit registered for this QR code' });
  if (kit.status !== 'sealed') {
    return res.status(409).json({ message: `This kit is already ${kit.status} — it cannot be reused`, kit });
  }
  res.json({ kit });
});

// STEP 2: scan the pillow's own QR code (it ships loose, outside the bag).
router.get('/pillow/:qrCode', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const pillow = await LinenItem.findOne({ qrCode: req.params.qrCode, linenCode: 3 });
  if (!pillow) return res.status(404).json({ message: 'No pillow registered for this QR code' });
  if (pillow.status !== 'available') {
    return res.status(409).json({ message: `This pillow is already ${pillow.status} — it cannot be reused`, pillow });
  }
  res.json({ pillow });
});

// STEP 3 + LINK: kit QR + pillow QR + PNR (from ticket QR scan, or typed in
// manually by the attendant if the ticket has no QR) -> assign all 6 items.
router.post('/assign', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const { kitQrCode, pillowQrCode, pnr } = req.body;
  if (!kitQrCode || !pillowQrCode || !pnr) {
    return res.status(400).json({ message: 'kitQrCode, pillowQrCode, and pnr are all required' });
  }

  const pnrRecord = await PnrRecord.findOne({ pnr });
  if (!pnrRecord) return res.status(404).json({ message: 'No booking found for this PNR' });

  if (req.user.role === 'coach_attendant' && req.user.assignedCoachNumber !== pnrRecord.coachNumber) {
    return res.status(403).json({ message: 'This passenger is not in your assigned coach' });
  }

  if (pnrRecord.linenAssignment && pnrRecord.linenAssignment.assigned) {
    return res.status(409).json({ message: 'Linen has already been assigned to this PNR', pnrRecord });
  }

  const kit = await LinenKit.findOne({ qrCode: kitQrCode }).populate('items');
  if (!kit) return res.status(404).json({ message: 'No kit registered for this QR code' });
  if (kit.status !== 'sealed') {
    return res.status(409).json({ message: `This kit is already ${kit.status} — it cannot be reused` });
  }

  const pillow = await LinenItem.findOne({ qrCode: pillowQrCode, linenCode: 3 });
  if (!pillow) return res.status(404).json({ message: 'No pillow registered for this QR code' });
  if (pillow.status !== 'available') {
    return res.status(409).json({ message: `This pillow is already ${pillow.status} — it cannot be reused` });
  }

  const now = new Date();

  // Mark the 5 kit items + the pillow as assigned to this PNR.
  const allItemIds = [...kit.items.map((i) => i._id), pillow._id];
  await LinenItem.updateMany(
    { _id: { $in: allItemIds } },
    { $set: { status: 'assigned', assignedPnr: pnr, assignedAt: now } }
  );

  kit.status = 'assigned';
  kit.assignedPnr = pnr;
  kit.assignedAt = now;
  await kit.save();

  const itemLids = [...kit.items.map((i) => i.lid), pillow.lid];

  pnrRecord.linenAssignment = {
    assigned: true,
    kitQrCode,
    pillowLid: pillow.lid,
    itemLids,
    assignedAt: now,
    assignedByEmpId: req.user.empId,
  };
  await pnrRecord.save();

  await logAction({
    actor: req.user,
    action: 'linen.assign',
    entityType: 'PnrRecord',
    entityId: pnrRecord._id,
    description: `Linen kit ${kitQrCode} + pillow assigned to PNR ${pnr}`,
  });

  res.json({
    message: 'Linen kit linked to PNR',
    pnrRecord,
    itemLids,
  });
});

// --- UNASSIGN --------------------------------------------------------
//
// Two modes, matching the real-world flow:
//
// 1. "itemized" - the paper bag is already gone (it was torn at assign
//    time), so the attendant scans each of the 6 individual item LIDs
//    (5 ex-kit items + pillow) plus the PNR, and confirms. Any expected
//    LID that isn't scanned back is left 'assigned' (still the
//    passenger's responsibility) and reported back so the attendant can
//    decide next steps.
//
// 2. "quick" - since every item LID is already linked to the PNR, just
//    the PNR is enough to release everything at once. Available to a
//    coach attendant/admin in a hurry, AND to the passenger themself as
//    self-service if the attendant hasn't come by yet.

function actorFromReq(req) {
  return {
    role: req.user.role,
    id: req.user.empId || req.user.mobile || null,
  };
}

router.post('/unassign/quick', requireAuth, async (req, res) => {
  const { pnr } = req.body;
  if (!pnr) return res.status(400).json({ message: 'pnr is required' });

  const pnrRecord = await PnrRecord.findOne({ pnr });
  if (!pnrRecord) return res.status(404).json({ message: 'No booking found for this PNR' });

  if (req.user.role === 'passenger' && pnrRecord.mobile !== req.user.mobile) {
    return res.status(403).json({ message: 'This PNR does not belong to your account' });
  }
  if (req.user.role === 'coach_attendant' && req.user.assignedCoachNumber !== pnrRecord.coachNumber) {
    return res.status(403).json({ message: 'This passenger is not in your assigned coach' });
  }

  if (!pnrRecord.linenAssignment?.assigned) {
    return res.status(409).json({ message: 'No linen kit is currently assigned to this PNR' });
  }
  if (pnrRecord.linenAssignment.returned) {
    return res.status(409).json({ message: 'Linen has already been returned for this PNR' });
  }

  const now = new Date();
  const { itemLids, kitQrCode } = pnrRecord.linenAssignment;

  await LinenItem.updateMany(
    { lid: { $in: itemLids } },
    { $set: { status: 'returned' } }
  );
  if (kitQrCode) {
    await LinenKit.updateOne({ qrCode: kitQrCode }, { $set: { status: 'consumed' } });
  }

  const actor = actorFromReq(req);
  pnrRecord.linenAssignment.returned = true;
  pnrRecord.linenAssignment.returnedAt = now;
  pnrRecord.linenAssignment.returnedByRole = actor.role;
  pnrRecord.linenAssignment.returnedById = actor.id;
  pnrRecord.linenAssignment.returnMethod = 'quick_pnr';
  pnrRecord.linenAssignment.missingLids = [];
  await pnrRecord.save();

  await logAction({
    actor: req.user,
    action: 'linen.return',
    entityType: 'PnrRecord',
    entityId: pnrRecord._id,
    description: `Linen quick-unassigned for PNR ${pnr} by ${actor.role}`,
  });

  res.json({ message: 'Linen unassigned (quick, PNR-only)', pnrRecord });
});

router.post('/unassign/itemized', requireAuth, requireRole('coach_attendant', 'admin'), async (req, res) => {
  const { pnr, scannedLids } = req.body;
  if (!pnr || !Array.isArray(scannedLids) || scannedLids.length === 0) {
    return res.status(400).json({ message: 'pnr and a non-empty scannedLids array are required' });
  }

  const pnrRecord = await PnrRecord.findOne({ pnr });
  if (!pnrRecord) return res.status(404).json({ message: 'No booking found for this PNR' });

  if (req.user.role === 'coach_attendant' && req.user.assignedCoachNumber !== pnrRecord.coachNumber) {
    return res.status(403).json({ message: 'This passenger is not in your assigned coach' });
  }
  if (!pnrRecord.linenAssignment?.assigned) {
    return res.status(409).json({ message: 'No linen kit is currently assigned to this PNR' });
  }
  if (pnrRecord.linenAssignment.returned) {
    return res.status(409).json({ message: 'Linen has already been returned for this PNR' });
  }

  const expected = new Set(pnrRecord.linenAssignment.itemLids);
  const scanned = new Set(scannedLids.map((s) => String(s).trim()));

  const matched = [...expected].filter((lid) => scanned.has(lid));
  const missing = [...expected].filter((lid) => !scanned.has(lid));
  const unexpected = [...scanned].filter((lid) => !expected.has(lid));

  if (unexpected.length > 0) {
    return res.status(409).json({
      message: 'One or more scanned items are not part of this PNR\'s assigned kit',
      unexpected,
    });
  }

  const now = new Date();
  if (matched.length > 0) {
    await LinenItem.updateMany({ lid: { $in: matched } }, { $set: { status: 'returned' } });
  }
  // Anything not scanned back stays 'assigned' - still checked out, still
  // the passenger's responsibility until it's returned or the exit gate
  // catches it.

  const fullyReturned = missing.length === 0;
  const actor = actorFromReq(req);

  if (fullyReturned && pnrRecord.linenAssignment.kitQrCode) {
    await LinenKit.updateOne(
      { qrCode: pnrRecord.linenAssignment.kitQrCode },
      { $set: { status: 'consumed' } }
    );
  }

  pnrRecord.linenAssignment.returned = fullyReturned;
  pnrRecord.linenAssignment.returnedAt = fullyReturned ? now : pnrRecord.linenAssignment.returnedAt;
  pnrRecord.linenAssignment.returnedByRole = fullyReturned ? actor.role : pnrRecord.linenAssignment.returnedByRole;
  pnrRecord.linenAssignment.returnedById = fullyReturned ? actor.id : pnrRecord.linenAssignment.returnedById;
  pnrRecord.linenAssignment.returnMethod = fullyReturned ? 'itemized_scan' : pnrRecord.linenAssignment.returnMethod;
  pnrRecord.linenAssignment.missingLids = missing;
  await pnrRecord.save();

  await logAction({
    actor: req.user,
    action: 'linen.return',
    entityType: 'PnrRecord',
    entityId: pnrRecord._id,
    description: `Linen itemized return for PNR ${pnr}: ${matched.length}/${expected.size} returned${
      missing.length ? `, ${missing.length} still missing` : ''
    }`,
  });

  res.json({
    message: fullyReturned
      ? 'All items returned — linen unassigned.'
      : `${matched.length}/${expected.size} items returned. ${missing.length} still missing — PNR remains assigned until they're returned or flagged at the exit gate.`,
    fullyReturned,
    matched,
    missing,
    pnrRecord,
  });
});

module.exports = router;
