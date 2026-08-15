const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'coach_attendant', 'passenger', 'linen_operator', 'railway_officer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true, index: true },

    // Staff (admin / coach_attendant) log in with empId. Passengers log in with mobile.
    empId: { type: String, unique: true, sparse: true, index: true },
    mobile: { type: String, unique: true, sparse: true, index: true },

    passwordHash: { type: String, required: true },

    // coach_attendant scope - which coach they see PNRs for
    assignedCoachNumber: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
