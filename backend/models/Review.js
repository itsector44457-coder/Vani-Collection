const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({ label: { type: String, default: 'home' }, fullName: String, phone: String, line1: String, line2: String, landmark: String, city: String, state: String, pincode: String, country: { type: String, default: 'IN' }, isDefault: Boolean }, { _id: true });

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  customerName: { type: String, required: true }, rating: { type: Number, required: true, min: 1, max: 5 },
  title: String, body: { type: String, required: true, minlength: 10 }, images: [String],
  verifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  helpfulCount: { type: Number, default: 0 }, adminReply: String,
}, { timestamps: true });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $exists: true } } });
module.exports = mongoose.model('Review', reviewSchema);
