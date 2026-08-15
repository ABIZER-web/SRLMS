const mongoose = require('mongoose');

// One document per physical RFID-tagged linen item. lid follows the exact
// SRLMS hardware LID scheme: [region][linenType][8-digit unique].

const linenItemSchema = new mongoose.Schema(
  {
    lid: { type: String, required: true, unique: true, index: true }, // 10-digit

    regionCode: { type: Number, required: true },
    linenCode: { type: Number, required: true },
    itemType: { type: String, required: true }, // e.g. 'Bed Sheet 1', 'Pillow', ...

    // RFID physical tag UID (hex, colon-separated) - null until hardware
    // has actually written/read this tag. Demo/software-only items leave
    // this unset.
    rfidUid: { type: String },

    // Pillow items are scanned standalone via their own QR code.
    // Kit-bag items (bedsheets/blanket/pillow cover/towel) now also get
    // their own individual QR at registration time - the kit QR is a
    // separate, additional code that just groups them.
    qrCode: { type: String, unique: true, sparse: true, index: true },
    qrPayload: { type: String, default: null }, // JSON string encoded into the QR image

    registeredByEmpId: { type: String, default: null },

    kit: { type: mongoose.Schema.Types.ObjectId, ref: 'LinenKit', default: null },

    status: {
      type: String,
      enum: ['available', 'in_kit', 'assigned', 'in_use', 'returned', 'in_laundry', 'missing', 'retired'],
      default: 'available',
      index: true,
    },

    assignedPnr: { type: String, default: null, index: true },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LinenItem', linenItemSchema);
