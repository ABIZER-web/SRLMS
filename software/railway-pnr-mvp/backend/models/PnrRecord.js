const mongoose = require('mongoose');

// A PNR record models what IRCTC would already have generated at booking time.
// This app never creates real PNRs - it only stores/demonstrates the data an
// IRCTC ticket QR code would decode to, so a coach attendant can look up
// passenger + coach + seat details by PNR.

const pnrRecordSchema = new mongoose.Schema(
  {
    pnr: { type: String, required: true, unique: true, index: true }, // 10-digit
    zone: { type: String }, // derived from PNR's first digit, display only

    passengerName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['M', 'F', 'O'], required: true },
    mobile: { type: String, required: true },

    trainNumber: { type: String, required: true, index: true },
    trainName: { type: String, required: true },
    sourceStation: { type: String, required: true },
    destinationStation: { type: String, required: true },
    journeyDate: { type: String, required: true }, // yyyy-mm-dd

    coachNumber: { type: String, required: true, index: true },
    coachClass: { type: String, required: true }, // e.g. 3A, 2A, SL
    seatNumber: { type: Number, required: true },
    berthType: { type: String, enum: ['LB', 'MB', 'UB', 'SL', 'SU'], required: true },

    bookingStatus: {
      type: String,
      enum: ['Confirmed', 'RAC', 'Waitlisted'],
      default: 'Confirmed',
    },

    fare: { type: Number, required: true },
    bookingTimestamp: { type: Date, default: Date.now },

    // Coach-attendant-facing verification state - useful for the demo flow
    // (attendant marks a passenger as boarded / linen handed over).
    boardingStatus: {
      type: String,
      enum: ['not_boarded', 'boarded'],
      default: 'not_boarded',
    },

    // Linen kit assignment summary. The authoritative records live on
    // LinenKit / LinenItem (via assignedPnr); this is a denormalized
    // summary so the attendant/admin lists don't need extra lookups.
    linenAssignment: {
      assigned: { type: Boolean, default: false },
      kitQrCode: { type: String, default: null },
      pillowLid: { type: String, default: null },
      itemLids: { type: [String], default: [] },
      assignedAt: { type: Date, default: null },
      assignedByEmpId: { type: String, default: null },

      // Return / unassign tracking. Liability logic (e.g. "attendant is
      // responsible if the sweep happens after the passenger already left")
      // needs a "passenger deboarded" event this app doesn't model yet -
      // these fields just capture who/when/how, so that rule can be added
      // later without a schema change.
      returned: { type: Boolean, default: false },
      returnedAt: { type: Date, default: null },
      returnedByRole: { type: String, enum: ['coach_attendant', 'admin', 'passenger', null], default: null },
      returnedById: { type: String, default: null }, // empId or mobile
      returnMethod: { type: String, enum: ['itemized_scan', 'quick_pnr', null], default: null },
      missingLids: { type: [String], default: [] }, // items not scanned back during an itemized return
    },
  },
  { timestamps: true }
);

pnrRecordSchema.index({ trainNumber: 1, coachNumber: 1, journeyDate: 1 });

module.exports = mongoose.model('PnrRecord', pnrRecordSchema);
