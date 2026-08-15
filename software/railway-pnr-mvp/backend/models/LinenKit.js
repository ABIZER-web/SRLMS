const mongoose = require('mongoose');

// Models the sealed paper bag from the mechanized laundry: one QR code
// printed on the outside, pre-linked at packing time to 5 RFID-tagged
// items inside (2 bed sheets, 1 blanket, 1 pillow cover, 1 towel).
// The pillow itself ships loose and is NOT part of a kit - see LinenItem.

const linenKitSchema = new mongoose.Schema(
  {
    qrCode: { type: String, required: true, unique: true, index: true },
    qrPayload: { type: String, default: null },
    registeredByEmpId: { type: String, default: null },

    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LinenItem' }],

    status: {
      type: String,
      // sealed    -> fresh from laundry, bag intact, nothing assigned
      // assigned  -> linked to a PNR, bag has been torn open by attendant
      // consumed  -> journey finished / kit retired
      enum: ['sealed', 'assigned', 'consumed'],
      default: 'sealed',
      index: true,
    },

    assignedPnr: { type: String, default: null, index: true },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LinenKit', linenKitSchema);
