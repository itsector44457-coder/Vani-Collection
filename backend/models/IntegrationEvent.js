const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  provider: { type: String, enum: ['rishabh_erp', 'razorpay', 'shiprocket'], required: true, index: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true }, eventType: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true }, entityType: String, entityId: String,
  status: { type: String, enum: ['pending', 'processing', 'succeeded', 'failed', 'dead_letter'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 }, nextAttemptAt: Date, payload: mongoose.Schema.Types.Mixed, response: mongoose.Schema.Types.Mixed, lastError: String,
}, { timestamps: true });
schema.index({ status: 1, nextAttemptAt: 1 });
module.exports = mongoose.model('IntegrationEvent', schema);
