const mongoose = require('mongoose');

/**
 * Every loyalty movement, both directions.
 *
 * This is the ledger the cached `LoyaltyAccount.points` balance is derived from, so it has to be
 * self-sufficient:
 *
 * - Positive rows are **batches**. `remaining` tracks how much of that batch is unspent and
 *   `expiresAt` when the rest lapses, which is what makes 12-month expiry work — redemption consumes
 *   the oldest batches first (FIFO), so points that are about to expire get used before ones that are
 *   not. Without `remaining` the balance could only expire all-or-nothing per transaction.
 * - Negative rows (`redeemed`, `expired`, `admin_adjustment`) carry no batch state.
 * - `requestId` is a unique sparse index and is what makes earning and redemption idempotent: a
 *   retried webhook, a double-clicked Redeem or a re-run backfill cannot award twice.
 * - `balanceAfter` is a snapshot for display and audit; it is informational, never authoritative.
 */
const loyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Positive for earning, negative for spending or expiry. Never zero. */
    delta: { type: Number, required: true },
    reason: {
      type: String,
      required: true,
      index: true,
      enum: ['order_earned', 'referral_made', 'referral_received', 'redeemed', 'expired', 'admin_adjustment'],
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
    /** Set on `redeemed`: the single-use coupon code the points became. */
    couponCode: { type: String, uppercase: true, trim: true },
    /** Set on referral rows so "who did I refer" is answerable without a second collection. */
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    /** Unspent points left in this batch. Only meaningful on positive rows. */
    remaining: { type: Number, min: 0 },
    /** When this batch lapses. Only meaningful on positive rows. */
    expiresAt: { type: Date, index: true },
    balanceAfter: Number,
    /** Idempotency key — see the note above. */
    requestId: { type: String, unique: true, sparse: true, index: true },
    /** Free text for admin adjustments; shown verbatim in the shopper's history. */
    note: String,
  },
  { timestamps: true }
);

// The FIFO redemption query: oldest unexpired batches with something left, for one customer.
loyaltyTransactionSchema.index({ userId: 1, expiresAt: 1, remaining: 1 });
loyaltyTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
