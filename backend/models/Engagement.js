const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        sku: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    // A cart belongs either to a signed-in customer (userId) or to a guest browser (guestToken).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, unique: true },
    guestToken: { type: String, index: true, sparse: true, unique: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: { type: String, required: true, uppercase: true },
        quantity: { type: Number, min: 1, max: 10, default: 1 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    // Guest carts are garbage collected by the worker after this date.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 86400000), index: true },
  },
  { timestamps: true }
);

module.exports = {
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
  Cart: mongoose.model('Cart', cartSchema),
};
