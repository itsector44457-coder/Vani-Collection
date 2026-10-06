const mongoose = require('mongoose');

/**
 * One row per outbound email attempt.
 *
 * Delivery itself happens in the integration worker (`email.send` outbox event) so a slow or
 * broken SMTP provider can never fail a shopper's request. This collection is what makes that
 * asynchronous path auditable: every skip, failure and provider message id stays queryable from
 * `GET /api/admin/emails` and can be replayed with `POST /api/admin/emails/:id/resend`.
 */
const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, lowercase: true, trim: true, index: true },
    template: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'skipped'],
      default: 'queued',
      index: true,
    },
    providerMessageId: String,
    error: String,
    attempts: { type: Number, default: 0 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    /** Template input, kept so a failed email can be re-rendered and replayed by support. */
    data: mongoose.Schema.Types.Mixed,
    replyTo: String,
    tags: [String],
    sentAt: Date,
  },
  { timestamps: true }
);

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ status: 1, template: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
