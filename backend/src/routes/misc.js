const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const ReturnRequest = require('../../models/ReturnRequest');
const User = require('../../models/User');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { PINCODE_RE, serviceability } = require('../services/shipping');
const { FREE_SHIPPING_THRESHOLD, shippingFeeFor } = require('../services/pricing');
const { queueEmail, orderEmailData, orderRecipient } = require('../services/email');

module.exports = ({ config, auth }) => {
  const router = express.Router();

  router.get('/shipping/serviceability', asyncHandler(async (req, res) => {
    const pincode = String(req.query.pincode || '');
    if (!PINCODE_RE.test(pincode)) throw new AppError(422, 'INVALID_PINCODE', 'Enter a valid 6 digit pincode');
    const rate = serviceability(pincode);
    if (!rate.serviceable) throw new AppError(422, 'INVALID_PINCODE', 'Enter a valid 6 digit pincode');
    res.json({ data: rate });
  }));

  router.post('/shipping/rates', validate(z.object({ pincode: z.string().regex(PINCODE_RE), subtotal: z.number().nonnegative(), weightGrams: z.number().positive().optional() })), asyncHandler(async (req, res) => {
    const rate = serviceability(req.body.pincode);
    const fee = shippingFeeFor(req.body.subtotal, { fee: rate.etaDays <= 4 ? 79 : 99 });
    res.json({ data: { ...rate, fee, freeAbove: FREE_SHIPPING_THRESHOLD, total: req.body.subtotal + fee } });
  }));

  router.post('/payments/razorpay/verify', auth, validate(z.object({ orderId: z.string(), razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() })), asyncHandler(async (req, res) => {
    if (!config.RAZORPAY_KEY_SECRET) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payment is not configured');
    const order = await Order.findById(req.body.orderId); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    const expected = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(`${req.body.razorpay_order_id}|${req.body.razorpay_payment_id}`).digest('hex');
    if (expected !== req.body.razorpay_signature) { order.payment.status = 'failed'; await order.save(); throw new AppError(400, 'PAYMENT_VERIFICATION_FAILED', 'Payment signature could not be verified'); }
    order.payment.status = 'paid'; order.payment.providerPaymentId = req.body.razorpay_payment_id; order.payment.paidAt = new Date(); order.status = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', actor: 'customer', note: 'Payment captured' });
    await order.save();
    res.json({ data: order });
  }));

  router.get('/search', asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim(); if (q.length < 2) return res.json({ data: [] });
    const filter = { status: 'active' }, safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(safe, 'i') }, { fabric: new RegExp(safe, 'i') }, { category: new RegExp(safe, 'i') }, { tags: new RegExp(safe, 'i') }];
    const data = await Product.find(filter).select('name slug category images variants.mrp variants.price badges fabric').limit(10);
    res.json({ data });
  }));

  // Orders money is owed on: the payment was captured and the order then went away
  // (cancelled by the shopper, or returned after delivery). This is the finance team's work queue.
  const REFUNDABLE_STATUSES = ['cancelled', 'return_requested', 'returned'];

  router.get('/refunds/pending', auth, requireRoles('finance', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = { 'payment.status': 'paid', status: { $in: REFUNDABLE_STATUSES } };
    if (req.query.status && REFUNDABLE_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.orderNumber) filter.orderNumber = new RegExp(String(req.query.orderNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('customerId', 'email firstName lastName phone'),
      Order.countDocuments(filter),
    ]);

    // A returned order often already carries the amount support agreed with the shopper; show it so
    // finance refunds the right number instead of blindly refunding the order total.
    const returns = await ReturnRequest.find({ orderId: { $in: orders.map((order) => order._id) } }).sort({ createdAt: -1 });
    const latestReturn = new Map();
    for (const record of returns) {
      const key = String(record.orderId);
      if (!latestReturn.has(key)) latestReturn.set(key, record);
    }

    const data = orders.map((order) => {
      const record = latestReturn.get(String(order._id));
      const captured = Number(order.amounts?.total) || 0;
      const agreed = Number(record?.refundAmount) || 0;
      const customer = order.customerId && typeof order.customerId === 'object' ? order.customerId : null;
      return {
        _id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        reason: order.status === 'cancelled' ? 'Order cancelled after payment' : 'Returned after delivery',
        payment: { method: order.payment.method, status: order.payment.status, providerPaymentId: order.payment.providerPaymentId, paidAt: order.payment.paidAt },
        amounts: order.amounts,
        refundable: agreed > 0 ? Math.min(agreed, captured) : captured,
        customer: { email: customer?.email, firstName: customer?.firstName, lastName: customer?.lastName, phone: customer?.phone, name: order.shippingAddress?.fullName },
        returnRequest: record ? { id: record.id, returnNumber: record.returnNumber, status: record.status, refundAmount: record.refundAmount, refundId: record.refundId } : null,
      };
    });

    res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));

  router.post('/refunds/:orderId', auth, requireRoles('finance', 'admin', 'super_admin'), audit('refund.process', 'Order'), validate(z.object({ amount: z.number().positive().optional(), reason: z.string().min(3) })), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.payment.status !== 'paid') throw new AppError(409, 'NOT_PAID', 'Only paid orders can be refunded');
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payment is not configured');
    const amount = Math.round(Math.min(req.body.amount || order.amounts.total, order.amounts.total) * 100);
    const razorpay = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET });
    const refund = await razorpay.payments.refund(order.payment.providerPaymentId, { amount, notes: { reason: req.body.reason } });
    order.payment.status = 'refunded'; order.status = 'refunded'; order.statusHistory.push({ status: 'refunded', actor: req.user.email, note: req.body.reason });
    await order.save();

    // Razorpay reports paise; the template contract is rupees.
    const customer = order.customerId ? await User.findById(order.customerId).catch(() => null) : null;
    await queueEmail({
      to: orderRecipient(order, customer),
      template: 'refund-processed',
      data: orderEmailData(order, {
        firstName: customer?.firstName || order.shippingAddress?.fullName?.split(' ')[0] || '',
        reason: req.body.reason,
        refund: { id: refund.id, amountRupees: refund.amount / 100, status: refund.status },
      }),
      orderId: order.id,
      userId: customer?.id,
      dedupeKey: `refund-processed:${order.id}:${refund.id}`,
      tags: ['refunds'],
      log: req.log,
    });

    res.json({ data: order, refund: { id: refund.id, amount: refund.amount, status: refund.status } });
  }));
  return router;
};
