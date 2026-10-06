const mongoose = require('mongoose');

/**
 * One loyalty account per customer.
 *
 * `points` is the spendable balance and `lifetimePoints` only ever grows — it is what the tier is
 * derived from, so redeeming or letting points expire never demotes a member. Keeping the two
 * separate is the whole reason the tier ladder stays trustworthy.
 *
 * The balance is cached here for cheap reads but is always recomputable from the unexpired
 * `remaining` on LoyaltyTransaction batches, which is what `expireDuePoints` does.
 */
const loyaltyAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    points: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver', index: true },
    lifetimePoints: { type: Number, default: 0, min: 0 },
    /** When the account last earned, so "expiring soon" and win-back queries have something to sort on. */
    lastEarnedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
