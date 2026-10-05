const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, items: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, sku: String, addedAt: { type: Date, default: Date.now } }] }, { timestamps: true });
const cartSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, guestToken: { type: String, index: true }, items: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, sku: String, quantity: { type: Number, min: 1, default: 1 }, addedAt: { type: Date, default: Date.now } }], expiresAt: Date }, { timestamps: true });
cartSchema.index({ userId: 1, guestToken: 1 }, { unique: true, partialFilterExpression: { userId: { $exists: true } } });
module.exports = { Wishlist: mongoose.model('Wishlist', wishlistSchema), Cart: mongoose.model('Cart', cartSchema) };
