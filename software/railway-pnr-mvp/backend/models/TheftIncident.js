const mongoose = require('mongoose');

// Created whenever a simulated (later: real) exit-gate RFID/AM reader
// detects an item whose LinenItem.status is still 'assigned' - i.e. it
// left the station without being returned/unassigned first.

const theftIncidentSchema = new mongoose.Schema(
  {
    lid: { type: String, required: true, index: true },
    itemType: { type: String, required: true },
    pnr: { type: String, default: null, index: true },
    passengerName: { type: String, default: null },
    coachNumber: { type: String, default: null },

    gateId: { type: String, required: true },
    detectedAt: { type: Date, default: Date.now },

    status: { type: String, enum: ['open', 'under_review', 'resolved'], default: 'open', index: true },
    resolvedAt: { type: Date, default: null },
    resolvedByEmpId: { type: String, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TheftIncident', theftIncidentSchema);
