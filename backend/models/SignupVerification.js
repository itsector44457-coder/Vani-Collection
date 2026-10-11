const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  phone: String,
  passwordHash: { type: String, required: true, select: false },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
  lastSentAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  referralCode: String,
}, { timestamps: true });

module.exports = mongoose.model('SignupVerification', schema);
