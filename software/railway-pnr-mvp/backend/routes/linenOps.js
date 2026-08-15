const router = require('express').Router();
const LinenItem = require('../models/LinenItem');
const LinenKit = require('../models/LinenKit');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateLid, parseLid, REGION_NAMES, LINEN_TYPES, KIT_LINEN_CODES } = require('../utils/lidGenerator');
const { itemPayload, kitPayload, toDataUrl } = require('../utils/qrCode');

const OPS_ROLES = ['linen_operator', 'admin'];

// Reference data for the registration forms (regions, linen types, which
// codes belong in the standard 5-item kit) - single source of truth so the
// frontend doesn't hardcode a second copy of the hardware's LID scheme.
router.get('/meta', requireAuth, requireRole(...OPS_ROLES), (req, res) => {
  res.json({ regions: REGION_NAMES, linenTypes: LINEN_TYPES, kitLinenCodes: KIT_LINEN_CODES });
});

router.get('/summary', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const [totalItems, byStatus, totalKits, sealedKits, assignedKits] = await Promise.all([
    LinenItem.countDocuments(),
    LinenItem.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    LinenKit.countDocuments(),
    LinenKit.countDocuments({ status: 'sealed' }),
    LinenKit.countDocuments({ status: 'assigned' }),
  ]);

  const statusCounts = {};
  for (const row of byStatus) statusCounts[row._id] = row.count;

  res.json({ totalItems, statusCounts, totalKits, sealedKits, assignedKits });
});

// --- REGISTER A SINGLE ITEM (bedsheet/blanket/pillow cover/towel/pillow) ---
// Simulates: scan RFID -> authenticate -> generate LID -> generate QR.
// In place of a physical scanner, the operator picks region + linen type
// and we generate the tag data exactly like the ESP8266 firmware would.
router.post('/items', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { regionCode, linenCode } = req.body;
  const region = Number(regionCode);
  const linen = Number(linenCode);

  if (!REGION_NAMES[region]) return res.status(400).json({ message: 'Invalid regionCode' });
  if (!LINEN_TYPES[linen]) return res.status(400).json({ message: 'Invalid linenCode' });

  const lid = generateLid(region, linen);
  const qrCode = `LINEN-${lid}`;

  const item = new LinenItem({
    lid,
    regionCode: region,
    linenCode: linen,
    itemType: LINEN_TYPES[linen],
    qrCode,
    status: 'available',
    registeredByEmpId: req.user.empId || null,
  });
  item.qrPayload = itemPayload(item);
  await item.save();

  res.status(201).json({ item });
});

// --- ASSEMBLE A KIT from 5 already-registered, still-available items ---
// One of each required linen code (bedsheet x2, blanket, pillow cover,
// towel). Generates the group Kit QR on top of the items' own QR codes.
router.post('/kits', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { itemIds } = req.body;
  if (!Array.isArray(itemIds) || itemIds.length !== 5) {
    return res.status(400).json({ message: 'itemIds must contain exactly 5 registered item IDs' });
  }

  const items = await LinenItem.find({ _id: { $in: itemIds } });
  if (items.length !== 5) {
    return res.status(404).json({ message: 'One or more item IDs were not found' });
  }
  const notAvailable = items.filter((i) => i.status !== 'available');
  if (notAvailable.length > 0) {
    return res.status(409).json({
      message: 'One or more items are not available for kitting',
      items: notAvailable.map((i) => ({ lid: i.lid, status: i.status })),
    });
  }

  const codesPresent = items.map((i) => i.linenCode).sort();
  const codesExpected = [...KIT_LINEN_CODES].sort();
  const matches = codesPresent.length === codesExpected.length && codesPresent.every((c, i) => c === codesExpected[i]);
  if (!matches) {
    return res.status(400).json({
      message: 'Items must be exactly one of each: Bed Sheet 1, Bed Sheet 2, Blanket, Pillow Cover, Face Towel',
      received: codesPresent.map((c) => LINEN_TYPES[c]),
    });
  }

  const seq = (await LinenKit.countDocuments()) + 1;
  const year = new Date().getFullYear();
  const qrCode = `KIT-${year}-${String(seq).padStart(6, '0')}`;

  const kit = new LinenKit({
    qrCode,
    items: items.map((i) => i._id),
    status: 'sealed',
    registeredByEmpId: req.user.empId || null,
  });
  kit.qrPayload = kitPayload(kit, items.map((i) => i.lid));
  await kit.save();

  await LinenItem.updateMany({ _id: { $in: itemIds } }, { $set: { status: 'in_kit', kit: kit._id } });

  const populated = await LinenKit.findById(kit._id).populate('items');
  res.status(201).json({ kit: populated });
});

// --- UNIVERSAL SCAN / FIND --- matches a LID, an item QR (LINEN-...), or
// a kit QR (KIT-...) and returns whatever it resolves to.
router.get('/scan/:code', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { code } = req.params;

  const kit = await LinenKit.findOne({ qrCode: code }).populate('items');
  if (kit) return res.json({ resultType: 'kit', kit });

  const item = await LinenItem.findOne({ $or: [{ qrCode: code }, { lid: code }] }).populate('kit');
  if (item) return res.json({ resultType: 'item', item });

  res.status(404).json({ message: 'No linen item or kit matches that code' });
});

// --- QR IMAGE --- returns a PNG data URL for any item or kit code.
router.get('/qr/:code', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { code } = req.params;

  const kit = await LinenKit.findOne({ qrCode: code });
  if (kit) {
    const dataUrl = await toDataUrl(kit.qrPayload || kit.qrCode);
    return res.json({ code, dataUrl });
  }

  const item = await LinenItem.findOne({ qrCode: code });
  if (item) {
    const dataUrl = await toDataUrl(item.qrPayload || item.qrCode);
    return res.json({ code, dataUrl });
  }

  res.status(404).json({ message: 'No linen item or kit matches that code' });
});

router.get('/items', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { status, linenCode } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (linenCode) filter.linenCode = Number(linenCode);

  const items = await LinenItem.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ count: items.length, items });
});

router.get('/kits', requireAuth, requireRole(...OPS_ROLES), async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const kits = await LinenKit.find(filter).populate('items').sort({ createdAt: -1 }).limit(200);
  res.json({ count: kits.length, kits });
});

module.exports = router;
