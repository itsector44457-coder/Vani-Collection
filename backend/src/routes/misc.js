const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const ReturnRequest = require('../../models/ReturnRequest');
const User = require('../../models/User');
const NewsletterSubscriber = require('../../models/NewsletterSubscriber');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { PINCODE_RE, serviceability } = require('../services/shipping');
const { FREE_SHIPPING_THRESHOLD, shippingFeeFor } = require('../services/pricing');
const { queueEmail, sendRaw, orderEmailData, orderRecipient } = require('../services/email');
const { candidateFilter, rankProducts } = require('../services/catalogue-search');

module.exports = ({ config, auth, optionalAuth }) => {
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

  /**
   * Razorpay signature check, usable by guests too (guest checkout). The signature alone is not
   * enough: the supplied provider order MUST be the one minted for this internal order — otherwise
   * a cheap payment from one order could "pay" for an expensive one — and an account order can only
   * be confirmed by its owner. Nothing is mutated on a failed signature; the signed webhook remains
   * the authority for failed/pending payments, and the reply stays thin (no address/PII echo).
   */
  router.post('/payments/razorpay/verify', optionalAuth, validate(z.object({ orderId: z.string(), razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() })), asyncHandler(async (req, res) => {
    if (!config.RAZORPAY_KEY_SECRET) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payment is not configured');
    const order = await Order.findById(req.body.orderId).catch(() => null);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.customerId && String(order.customerId) !== String(req.user?.id || '')) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.payment?.method !== 'razorpay' || !order.payment.providerOrderId || order.payment.providerOrderId !== req.body.razorpay_order_id) {
      throw new AppError(400, 'PAYMENT_VERIFICATION_FAILED', 'Payment does not match this order');
    }
    if (order.status !== 'cancelled' && order.payment.status === 'paid' && order.payment.providerPaymentId === req.body.razorpay_payment_id) {
      return res.json({ data: { _id: order.id, orderNumber: order.orderNumber, status: order.status, payment: { status: order.payment.status } } });
    }
    const expected = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(`${req.body.razorpay_order_id}|${req.body.razorpay_payment_id}`).digest();
    const supplied = Buffer.from(String(req.body.razorpay_signature), 'hex');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw new AppError(400, 'PAYMENT_VERIFICATION_FAILED', 'Payment signature could not be verified');
    }
    const paidAt = new Date();
    const confirmed = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: 'pending_payment',
        'payment.providerOrderId': req.body.razorpay_order_id,
        'payment.status': { $ne: 'paid' },
      },
      {
        $set: {
          'payment.status': 'paid',
          'payment.providerPaymentId': req.body.razorpay_payment_id,
          'payment.paidAt': paidAt,
          status: 'confirmed',
        },
        $push: { statusHistory: { status: 'confirmed', actor: 'customer', note: 'Payment captured' } },
      },
      { returnDocument: 'after' },
    );
    if (confirmed) {
      return res.json({ data: { _id: confirmed.id, orderNumber: confirmed.orderNumber, status: confirmed.status, payment: { status: confirmed.payment.status } } });
    }

    const latest = await Order.findById(order._id);
    if (latest?.status === 'cancelled') {
      // Money was captured after the reservation had already been released. Record the capture so
      // it appears in the finance refund queue, but never resurrect an order whose stock is gone.
      await Order.updateOne(
        { _id: order._id, status: 'cancelled', 'payment.providerOrderId': req.body.razorpay_order_id },
        {
          $set: {
            'payment.status': 'paid',
            'payment.providerPaymentId': req.body.razorpay_payment_id,
            'payment.paidAt': paidAt,
          },
          $push: { statusHistory: { status: 'cancelled', actor: 'customer', note: 'Payment captured after cancellation; refund required' } },
        },
      );
      throw new AppError(409, 'PAYMENT_CAPTURED_AFTER_CANCELLATION', 'Payment mil gaya hai, lekin is order ki reservation pehle khatm ho chuki thi. Hamari team refund ke liye sampark karegi.');
    }
    if (latest?.payment?.status === 'paid' && latest.payment.providerPaymentId === req.body.razorpay_payment_id) {
      return res.json({ data: { _id: latest.id, orderNumber: latest.orderNumber, status: latest.status, payment: { status: latest.payment.status } } });
    }
    throw new AppError(409, 'PAYMENT_NOT_PENDING', 'This order is not waiting for an online payment.');
  }));

  /**
   * Instant search. Retrieval is deliberately broad (synonyms, every searchable field) and the
   * ranking is done in memory, with a fuzzy fallback pass over a lightweight catalogue slice so
   * small typos ("anarkli", "plazo") still find the right shelf. Inventory rides along so result
   * cards can speak about sizes honestly instead of guessing.
   */
  router.get('/search', asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    if (q.length < 2) return res.json({ data: [], meta: { total: 0, query: q } });

    const select = 'name slug category subcategory images hoverImage variants badges tags fabric craft description shortDescription featured createdAt';
    const filter = candidateFilter(q);
    const candidates = filter
      ? await Product.find({ status: 'active', ...filter }).select(select).sort({ featured: -1, createdAt: -1 }).limit(100).lean()
      : [];
    let ranked = rankProducts(candidates, q);

    if (ranked.length < limit) {
      const seen = new Set(candidates.map((product) => String(product._id)));
      const fallback = await Product.find({ status: 'active', _id: { $nin: [...seen] } }).select(select).sort({ featured: -1, createdAt: -1 }).limit(500).lean();
      ranked = [...ranked, ...rankProducts(fallback, q)];
    }

    const page = ranked.slice(0, limit).map((entry) => entry.product);
    const skus = [...new Set(page.flatMap((product) => (product.variants || []).map((variant) => variant.sku).filter(Boolean)))];
    const stock = skus.length ? await Inventory.find({ sku: { $in: skus } }).select('sku onHand reserved').lean() : [];
    const availableBySku = new Map(stock.map((row) => [row.sku, Math.max(0, row.onHand - row.reserved)]));
    const data = page.map((product) => {
      const inventory = {};
      for (const variant of product.variants || []) {
        if (availableBySku.has(variant.sku)) inventory[variant.sku] = availableBySku.get(variant.sku);
      }
      return { ...product, inventory };
    });
    res.json({ data, meta: { total: ranked.length, query: q } });
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

  const newsletterUnsubscribeToken = (subscriberId) => crypto
    .createHmac('sha256', config.JWT_REFRESH_SECRET)
    .update(`newsletter-unsubscribe:${subscriberId}`)
    .digest('hex');

  /**
   * The footer letter is stored, not simulated. Re-submitting the same address is idempotent and
   * deliberately returns the same public result whether or not that address also has an account.
   */
  router.post('/newsletter/subscribe', validate(z.object({
    email: z.string().trim().email('Enter a valid email address').max(254),
    source: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/i).optional(),
  })), asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const source = req.body.source || 'footer';
    let subscriber = await NewsletterSubscriber.findOne({ email });
    const alreadySubscribed = subscriber?.status === 'subscribed';

    if (!alreadySubscribed) {
      try {
        if (!subscriber) {
          subscriber = await NewsletterSubscriber.create({
            email,
            source,
            status: 'subscribed',
            subscribedAt: new Date(),
          });
        } else {
          subscriber.status = 'subscribed';
          subscriber.source = source;
          subscriber.subscribedAt = new Date();
          subscriber.unsubscribedAt = undefined;
          await subscriber.save();
        }
      } catch (cause) {
        if (cause?.code !== 11000) throw cause;
        subscriber = await NewsletterSubscriber.findOne({ email });
      }
      await User.updateOne({ email }, { $set: { 'preferences.newsletter': true } });
    }

    res.status(alreadySubscribed ? 200 : 201).json({
      data: { subscribed: true, alreadySubscribed },
    });
  }));

  router.post('/newsletter/unsubscribe', validate(z.object({
    subscriberId: z.string().regex(/^[0-9a-f]{24}$/i),
    token: z.string().regex(/^[0-9a-f]{64}$/i),
  })), asyncHandler(async (req, res) => {
    const subscriber = await NewsletterSubscriber.findById(req.body.subscriberId).catch(() => null);
    const expected = subscriber ? Buffer.from(newsletterUnsubscribeToken(subscriber.id), 'hex') : null;
    const supplied = Buffer.from(req.body.token, 'hex');
    if (!subscriber || !expected || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw new AppError(404, 'NEWSLETTER_SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }
    if (subscriber.status !== 'unsubscribed') {
      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();
      await User.updateOne({ email: subscriber.email }, { $set: { 'preferences.newsletter': false } });
    }
    res.json({ data: { subscribed: false } });
  }));

  router.get('/newsletter/subscribers', auth, requireRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = {};
    if (['subscribed', 'unsubscribed'].includes(req.query.status)) filter.status = req.query.status;
    const [data, total] = await Promise.all([
      NewsletterSubscriber.find(filter)
        .select('email status source subscribedAt unsubscribedAt createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NewsletterSubscriber.countDocuments(filter),
    ]);
    res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
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
