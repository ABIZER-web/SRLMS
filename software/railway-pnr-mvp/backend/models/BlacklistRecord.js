const mongoose = require('mongoose');

// A controlled administrative record, not a one-click ban button. Staff can
// only propose one (status starts 'under_review'); an authorized railway
// officer/admin has to approve it before it becomes 'active'.

const blacklistRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true, index: true }, // BL-000001

    passengerName: { type: String, required: true },
    pnr: { type: String, default: null, index: true },
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'TheftIncident', default: null },

    reasonCategory: { type: String, default: 'Linen not returned / suspected theft' },
    notes: { type: String, default: '' },

    status: {
      type: String,
      enum: ['under_review', 'active', 'rejected', 'resolved'],
      default: 'under_review',
      index: true,
    },

    createdByEmpId: { type: String, required: true },
    reviewedByEmpId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewDate: { type: Date, default: null }, // scheduled follow-up review date
    resolvedByEmpId: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlacklistRecord', blacklistRecordSchema);
