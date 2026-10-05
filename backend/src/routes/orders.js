const express = require('express');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { z } = require('zod');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { shippingFeeFor, checkCouponValidity, computeDiscount } = require('../services/pricing');

const address = z.object({ fullName: z.string().min(2), phone: z.string().regex(/^[6-9]\d{9}$/), email: z.email(), line1: z.string().min(5), line2: z.string().optional(), landmark: z.string().optional(), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/), country: z.string().default('IN') });
const orderInput = z.object({ items: z.array(z.object({ productId: z.string(), sku: z.string(), quantity: z.number().int().min(1).max(10) })).min(1), shippingAddress: address, billingAddress: address.optional(), couponCode: z.string().optional(), paymentMethod: z.enum(['razorpay', 'cod']) });

module.exports = ({ config, auth }) => {
  const router = express.Router();
  router.post('/', auth, validate(orderInput), asyncHandler(async (req, res) => {
    if (req.body.paymentMethod === 'razorpay' && (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET)) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payment is not configured');
    const session = await mongoose.startSession(); let order;
    try {
      await session.withTransaction(async () => {
        const products = await Product.find({ _id: { $in: req.body.items.map((i) => i.productId) }, status: 'active' }).session(session);
        const map = new Map(products.map((p) => [p.id, p]));
        const items = []; let subtotal = 0; let tax = 0;
        for (const requested of req.body.items) {
          const product = map.get(requested.productId), selected = product?.variants.find((v) => v.sku === requested.sku && v.active);
          if (!product || !selected) throw new AppError(422, 'INVALID_ITEM', `Product/SKU ${requested.sku} is unavailable`);
          const reserved = await Inventory.findOneAndUpdate({ sku: selected.sku, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, requested.quantity] } }, { $inc: { reserved: requested.quantity } }, { new: true, session });
          if (!reserved) throw new AppError(409, 'OUT_OF_STOCK', `${selected.sku} has insufficient stock`);
          const lineTotal = selected.price * requested.quantity, includedTax = Math.round((lineTotal * (product.gstRate || 0) / (100 + (product.gstRate || 0))) * 100) / 100;
          subtotal += lineTotal; tax += includedTax;
          items.push({ productId: product._id, sku: selected.sku, name: product.name, image: product.images[0]?.url, size: selected.size, color: selected.color, quantity: requested.quantity, unitPrice: selected.price, mrp: selected.mrp, gstRate: product.gstRate, taxAmount: includedTax, lineTotal });
        }
        let discount = 0; const code = req.body.couponCode?.toUpperCase();
        if (code) {
          const coupon = await Coupon.findOne({ code, active: true }).session(session);
          const validity = checkCouponValidity(coupon, subtotal);
          if (!validity.valid) throw new AppError(422, 'INVALID_COUPON', validity.reason);
          discount = computeDiscount(coupon, subtotal);
          coupon.usedCount += 1; await coupon.save({ session });
        }
        const shipping = shippingFeeFor(subtotal - discount);
        [order] = await Order.create([{ customerId: req.user.id, items, shippingAddress: req.body.shippingAddress, billingAddress: req.body.billingAddress || req.body.shippingAddress, couponCode: code, amounts: { subtotal, discount, shipping, tax, total: subtotal - discount + shipping }, payment: { method: req.body.paymentMethod, status: 'pending' }, status: req.body.paymentMethod === 'cod' ? 'confirmed' : 'pending_payment', statusHistory: [{ status: req.body.paymentMethod === 'cod' ? 'confirmed' : 'pending_payment', actor: req.user.email }] }], { session });
      });
    } finally { await session.endSession(); }
    let paymentOrder = null;
    if (req.body.paymentMethod === 'razorpay') {
      const razorpay = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET });
      paymentOrder = await razorpay.orders.create({ amount: Math.round(order.amounts.total * 100), currency: 'INR', receipt: order.orderNumber, notes: { internalOrderId: order.id } });
      order.payment.providerOrderId = paymentOrder.id; await order.save();
    }
    res.status(201).json({ data: order, payment: paymentOrder && { id: paymentOrder.id, amount: paymentOrder.amount, currency: paymentOrder.currency, keyId: config.RAZORPAY_KEY_ID } });
  }));
  router.get('/mine', auth, asyncHandler(async (req, res) => res.json({ data: await Order.find({ customerId: req.user.id }).sort({ createdAt: -1 }) })));
  router.get('/:id', auth, asyncHandler(async (req, res) => {
    const filter = req.user.roles.some((r) => ['support','admin','super_admin'].includes(r)) ? { _id: req.params.id } : { _id: req.params.id, customerId: req.user.id };
    const order = await Order.findOne(filter); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found'); res.json({ data: order });
  }));
  // Customer-initiated cancellation: only before dispatch, and the reserved stock goes back.
  router.post('/:id/cancel', auth, validate(z.object({ reason: z.string().max(300).optional() })), asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user.id });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['pending_payment', 'confirmed'].includes(order.status)) throw new AppError(409, 'CANNOT_CANCEL', 'This order can no longer be cancelled — contact support for a return');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of order.items) await Inventory.updateOne({ sku: item.sku }, { $inc: { reserved: -item.quantity } }, { session });
        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled', actor: req.user.email, note: req.body.reason || 'Cancelled by customer' });
        await order.save({ session });
      });
    } finally {
      await session.endSession();
    }
    res.json({ data: order });
  }));

  router.get('/', auth, requireRoles('support', 'warehouse', 'finance', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 25), filter = req.query.status ? { status: req.query.status } : {};
    const [data,total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).populate('customerId','email firstName lastName'), Order.countDocuments(filter)]); res.json({ data, meta: { page, limit, total } });
  }));
  router.patch('/:id/status', auth, requireRoles('warehouse', 'support', 'admin', 'super_admin'), validate(z.object({ status: z.enum(['confirmed','processing','packed','shipped','delivered','cancelled']), note: z.string().optional() })), audit('order.status', 'Order'), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    order.status = req.body.status; order.statusHistory.push({ status: req.body.status, actor: req.user.email, note: req.body.note }); await order.save(); res.json({ data: order });
  }));
  return router;
};
