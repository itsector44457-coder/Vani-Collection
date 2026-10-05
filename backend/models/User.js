const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  fullName: String, phone: String, line1: String, line2: String,
  landmark: String, city: String, state: String, pincode: String, country: { type: String, default: 'IN' },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, sparse: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  firstName: { type: String, trim: true }, lastName: { type: String, trim: true },
  roles: [{ type: String, enum: ['customer', 'support', 'warehouse', 'catalog_manager', 'finance', 'admin', 'super_admin'], default: 'customer' }],
  status: { type: String, enum: ['active', 'blocked', 'invited'], default: 'active', index: true },
  addresses: [addressSchema],
  refreshTokenHashes: [{ hash: String, expiresAt: Date, userAgent: String, createdAt: { type: Date, default: Date.now } }],
  lastLoginAt: Date,
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  erpCustomerId: { type: String, sparse: true, index: true },
}, { timestamps: true });

userSchema.methods.verifyPassword = function (password) { return bcrypt.compare(password, this.passwordHash); };
userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 12);
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash; delete obj.refreshTokenHashes;
  return obj;
};
module.exports = mongoose.model('User', userSchema);
