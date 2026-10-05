const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../lib/errors');
const { resolveCart, hydrateCart, resolveSellableVariant, MAX_LINE_QUANTITY } = require('../services/cart');

/** Reads the guest cart token the storefront stores in localStorage and sends as a header. */
const guestTokenFrom = (req) => {
  const token = req.get('x-cart-token') || req.cookies?.cartToken;
  return typeof token === 'string' && token.length >= 8 && token.length <= 64 ? token : undefined;
};

module.exports = ({ auth, optionalAuth }) => {
  const router = express.Router();

  const respond = async (res, cart, guestToken, extra = {}) => {
    const hydrated = await hydrateCart(cart);
    res.json({ data: { ...hydrated, lineLimit: MAX_LINE_QUANTITY, ...extra }, meta: { guestToken, persisted: Boolean(cart?.userId) } });
  };

  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const guestToken = guestTokenFrom(req);
      const { cart, guestToken: token, created } = await resolveCart({ user: req.user, guestToken });
      await respond(res, cart, token, { created });
    })
  );

  router.post(
    '/items',
    optionalAuth,
    validate(z.object({ sku: z.string().min(2), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY).default(1) })),
    asyncHandler(async (req, res) => {
      const guestToken = guestTokenFrom(req);
      const { cart, guestToken: token } = await resolveCart({ user: req.user, guestToken });
      const { product } = await resolveSellableVariant(req.body.sku, req.body.quantity);
      const existing = cart.items.find((item) => item.sku === req.body.sku.toUpperCase());
      const nextQuantity = (existing?.quantity || 0) + req.body.quantity;
      if (nextQuantity > MAX_LINE_QUANTITY) throw new AppError(422, 'LINE_LIMIT_REACHED', `You can order up to ${MAX_LINE_QUANTITY} pieces per size`);
      await resolveSellableVariant(req.body.sku, nextQuantity);
      if (existing) existing.quantity = nextQuantity;
      else cart.items.push({ productId: product._id, sku: req.body.sku.toUpperCase(), quantity: req.body.quantity });
      cart.expiresAt = new Date(Date.now() + 60 * 86400000);
      await cart.save();
      await respond(res, cart, token);
    })
  );

  router.patch(
    '/items/:lineId',
    optionalAuth,
    validate(z.object({ quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY) })),
    asyncHandler(async (req, res) => {
      const guestToken = guestTokenFrom(req);
      const { cart, guestToken: token } = await resolveCart({ user: req.user, guestToken, create: false });
      const line = cart?.items.id(req.params.lineId);
      if (!cart || !line) throw new AppError(404, 'CART_LINE_NOT_FOUND', 'This item is no longer in your bag');
      if (req.body.quantity === 0) {
        line.deleteOne();
      } else {
        await resolveSellableVariant(line.sku, req.body.quantity);
        line.quantity = req.body.quantity;
      }
      await cart.save();
      await respond(res, cart, token);
    })
  );

  router.delete(
    '/items/:lineId',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const guestToken = guestTokenFrom(req);
      const { cart, guestToken: token } = await resolveCart({ user: req.user, guestToken, create: false });
      const line = cart?.items.id(req.params.lineId);
      if (!cart || !line) throw new AppError(404, 'CART_LINE_NOT_FOUND', 'This item is no longer in your bag');
      line.deleteOne();
      await cart.save();
      await respond(res, cart, token);
    })
  );

  router.delete(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const guestToken = guestTokenFrom(req);
      const { cart, guestToken: token } = await resolveCart({ user: req.user, guestToken, create: false });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
      await respond(res, cart, token);
    })
  );

  return router;
};
