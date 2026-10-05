const crypto = require('crypto');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const { Cart } = require('../../models/Engagement');
const { AppError } = require('../lib/errors');

const MAX_LINE_QUANTITY = 10;

/**
 * Resolves the cart document for a request: a signed-in customer's cart, a guest cart keyed by the
 * browser token, or both — in which case the guest lines are merged into the customer cart.
 */
async function resolveCart({ user, guestToken, create = true }) {
  if (!user && !guestToken) {
    if (!create) return null;
    const generated = crypto.randomUUID();
    return { cart: await Cart.create({ guestToken: generated }), guestToken: generated, created: true };
  }

  if (!user) {
    const existing = await Cart.findOne({ guestToken });
    if (existing) return { cart: existing, guestToken, created: false };
    if (!create) return null;
    return { cart: await Cart.create({ guestToken }), guestToken, created: true };
  }

  let cart = await Cart.findOne({ userId: user.id });
  if (!cart && create) cart = new Cart({ userId: user.id, items: [] });

  if (guestToken) {
    const guestCart = await Cart.findOne({ guestToken });
    if (guestCart) {
      if (!cart) cart = new Cart({ userId: user.id, items: [] });
      for (const guestItem of guestCart.items) {
        const existing = cart.items.find((item) => item.sku === guestItem.sku);
        if (existing) existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + guestItem.quantity);
        else cart.items.push({ productId: guestItem.productId, sku: guestItem.sku, quantity: guestItem.quantity });
      }
      await guestCart.deleteOne();
    }
  }

  if (cart && cart.isNew) await cart.save();
  return { cart, guestToken, created: false };
}

/** Re-prices a cart from the catalogue so stored prices can never drift or be tampered with. */
async function hydrateCart(cart) {
  if (!cart || cart.items.length === 0) return { lines: [], subtotal: 0, savings: 0, count: 0, hasUnavailable: false };

  const products = await Product.find({ _id: { $in: cart.items.map((item) => item.productId) } }).select('+variants.costPrice').lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const stockRows = await Inventory.find({ sku: { $in: cart.items.map((item) => item.sku) } }).lean();
  const stock = new Map(stockRows.map((row) => [row.sku, Math.max(0, row.onHand - row.reserved)]));

  const lines = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.productId));
    const variant = product?.variants.find((candidate) => candidate.sku === item.sku && candidate.active !== false);
    if (!product || !variant) continue;
    const available = stock.get(item.sku) ?? 0;
    lines.push({
      lineId: String(item._id),
      productId: String(product._id),
      slug: product.slug,
      sku: item.sku,
      quantity: item.quantity,
      title: product.name,
      image: product.images?.[0]?.url || '',
      size: variant.size,
      color: variant.color,
      price: variant.price,
      originalPrice: variant.mrp,
      available,
      inStock: available >= item.quantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const savings = lines.reduce((sum, line) => sum + Math.max(0, (line.originalPrice || line.price) - line.price) * line.quantity, 0);
  return {
    lines,
    subtotal,
    savings,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    hasUnavailable: lines.some((line) => !line.inStock || line.available === 0),
  };
}

/** Validates that a product/variant exists and is sellable, then returns the resolved document. */
async function resolveSellableVariant(sku, quantity) {
  const variantSku = String(sku).toUpperCase();
  const product = await Product.findOne({ 'variants.sku': variantSku, status: 'active' });
  if (!product) throw new AppError(404, 'SKU_NOT_FOUND', 'This product is no longer available');
  const variant = product.variants.find((candidate) => candidate.sku === variantSku && candidate.active !== false);
  if (!variant) throw new AppError(404, 'SKU_NOT_FOUND', 'This variant is no longer available');
  const inventory = await Inventory.findOne({ sku: variantSku });
  const available = inventory ? Math.max(0, inventory.onHand - inventory.reserved) : 0;
  if (available < quantity) throw new AppError(409, 'OUT_OF_STOCK', `${product.name} (${variant.size || variantSku}) has only ${available} left`);
  return { product, variant, available };
}

module.exports = { resolveCart, hydrateCart, resolveSellableVariant, MAX_LINE_QUANTITY };
