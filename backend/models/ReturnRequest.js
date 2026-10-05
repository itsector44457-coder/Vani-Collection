const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  returnNumber: { type: String, unique: true }, orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  items: [{ sku: String, quantity: Number, reason: String, condition: String, images: [String] }],
  type: { type: String, enum: ['return', 'exchange'], default: 'return' },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'pickup_scheduled', 'received', 'quality_check', 'refund_pending', 'completed'], default: 'requested' },
  refundAmount: Number, refundId: String, adminNote: String,
}, { timestamps: true });
schema.pre('save', function () { if (!this.returnNumber) this.returnNumber = `RET${Date.now()}`; });
module.exports = mongoose.model('ReturnRequest', schema);
