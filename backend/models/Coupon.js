const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true }, value: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0 }, maxDiscount: Number,
  startsAt: Date, endsAt: Date, usageLimit: Number, perCustomerLimit: { type: Number, default: 1 }, usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }, applicableCategories: [String], excludedSkus: [String],
  /**
   * Set on loyalty redemptions: the customer who spent the points. `usageLimit: 1` alone would still
   * let the code be passed on, so the discount would land on someone else's order while the points
   * came out of the member's balance. Campaign codes leave this unset and stay shareable.
   */
  issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
}, { timestamps: true });
module.exports = mongoose.model('Coupon', couponSchema);
