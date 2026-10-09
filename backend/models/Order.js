const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, sku: { type: String, required: true },
  name: String, image: String, size: String, color: String, quantity: { type: Number, required: true, min: 1 },
  unitPrice: Number, mrp: Number, gstRate: Number, taxAmount: Number, lineTotal: Number,
}, { _id: false });
const addressSchema = new mongoose.Schema({ fullName: String, phone: String, email: String, line1: String, line2: String, landmark: String, city: String, state: String, pincode: String, country: { type: String, default: 'IN' } }, { _id: false });
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, guestEmail: String,
  items: { type: [orderItemSchema], required: true }, shippingAddress: { type: addressSchema, required: true }, billingAddress: addressSchema,
  amounts: { subtotal: Number, discount: { type: Number, default: 0 }, shipping: { type: Number, default: 0 }, tax: Number, total: Number, currency: { type: String, default: 'INR' } },
  couponCode: String,
  status: { type: String, enum: ['pending_payment', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded'], default: 'pending_payment', index: true },
  payment: { method: { type: String, enum: ['razorpay', 'cod'] }, status: { type: String, enum: ['pending', 'authorized', 'paid', 'failed', 'refunded'], default: 'pending' }, providerOrderId: String, providerPaymentId: String, paidAt: Date },
  shipment: { provider: String, shipmentId: String, awb: String, courier: String, trackingUrl: String, status: String, labelUrl: String, estimatedDelivery: Date },
  erpOrderId: String, erpSyncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  notes: String, source: { type: String, default: 'website' }, statusHistory: [{ status: String, at: { type: Date, default: Date.now }, actor: String, note: String }],
}, { timestamps: true, optimisticConcurrency: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.productId': 1, status: 1 });
orderSchema.pre('save', function () { if (!this.orderNumber) this.orderNumber = `VC${Date.now()}${Math.floor(Math.random() * 900 + 100)}`; });
module.exports = mongoose.model('Order', orderSchema);
