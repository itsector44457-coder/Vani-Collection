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
const { queueEmail, sendRaw, orderEmailData, orderRecipient } = require('../services/email');

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

  // Contact Us Inquiry submission
  router.post('/contact', validate(z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Valid email is required'),
    phone: z.string().trim().optional(),
    message: z.string().trim().min(2, 'Message is required'),
  })), asyncHandler(async (req, res) => {
    const { name, email, phone, message } = req.body;
    const recipient = process.env.ADMIN_EMAIL || config.SUPPORT_EMAIL || 'Vanicollectionguna@gmail.com';

    // 1. Notify atelier concierge / admin
    await sendRaw({
      to: recipient,
      subject: `New Atelier Inquiry from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; padding: 24px; border: 1px solid #e7e5e4; border-radius: 12px;">
          <h2 style="color: #881337; font-size: 22px; margin-top: 0;">New Atelier Customer Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <div style="background: #fafaf9; padding: 16px; border-left: 4px solid #881337; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="font-size: 12px; color: #78716c;">Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} via Vani Collection Contact Portal.</p>
        </div>
      `,
      text: `New Atelier Inquiry from ${name}\n\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nMessage:\n${message}`,
      tags: ['contact', 'inquiry'],
      log: req.log,
    });

    // 2. Send acknowledgment to the customer
    await sendRaw({
      to: email,
      subject: 'We have received your message — Vani Collection Atelier',
      html: `
        <div style="font-family: 'Times New Roman', serif; line-height: 1.7; color: #1c1917; max-width: 600px; padding: 32px; background: #faf7f2; border: 1px solid #e8dfd5; border-radius: 14px;">
          <h1 style="color: #881337; font-size: 26px; font-weight: normal; letter-spacing: 2px; text-transform: uppercase; margin-top: 0; text-align: center;">Vani Collection</h1>
          <p style="text-align: center; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Atelier Concierge</p>
          <p>Dear ${name},</p>
          <p>Thank you for reaching out to Vani Collection. We have received your inquiry and our atelier concierge is reviewing your request.</p>
          <div style="background: #ffffff; padding: 18px; border: 1px solid #e8dfd5; border-radius: 8px; margin: 20px 0; font-family: sans-serif; font-size: 14px; color: #44403c;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #881337;">Your Message Summary:</p>
            <p style="margin: 0; white-space: pre-wrap;">"${message}"</p>
          </div>
          <p>We typically respond within one business day. Should you require immediate assistance regarding an active order or bespoke ensemble, you can also reach us directly via our WhatsApp Concierge or at <a href="mailto:${config.SUPPORT_EMAIL}" style="color: #881337;">${config.SUPPORT_EMAIL}</a>.</p>
          <p style="margin-top: 30px;">Warm regards,<br /><strong>The Vani Collection Atelier Team</strong></p>
        </div>
      `,
      text: `Dear ${name},\n\nThank you for reaching out to Vani Collection. We have received your inquiry and will respond within one business day.\n\nWarm regards,\nVani Collection Atelier`,
      tags: ['contact', 'acknowledgement'],
      log: req.log,
    });

    res.json({ success: true, message: 'Your message has been sent to our concierge.' });
  }));

  return router;
};
