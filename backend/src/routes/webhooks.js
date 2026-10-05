const express = require('express');
const crypto = require('crypto');
const Order = require('../../models/Order');
const IntegrationEvent = require('../../models/IntegrationEvent');
const { verifyHmac } = require('../lib/signature');
const { AppError, asyncHandler } = require('../lib/errors');
module.exports = ({ config }) => {
  const router = express.Router();
  router.post('/razorpay', asyncHandler(async (req, res) => {
    if (!config.RAZORPAY_WEBHOOK_SECRET) throw new AppError(503, 'WEBHOOK_DISABLED', 'Razorpay webhook not configured');
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    if (!verifyHmac(config.RAZORPAY_WEBHOOK_SECRET, raw, req.get('x-razorpay-signature'))) throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature');
    const key = req.get('x-razorpay-event-id') || crypto.createHash('sha256').update(raw).digest('hex');
    if (await IntegrationEvent.exists({ idempotencyKey: key })) return res.status(200).json({ duplicate: true });
    const event = req.body, payment = event.payload?.payment?.entity;
    if (event.event === 'payment.captured' && payment) await Order.updateOne({ 'payment.providerOrderId': payment.order_id }, { $set: { 'payment.status': 'paid', 'payment.providerPaymentId': payment.id, 'payment.paidAt': new Date(), status: 'confirmed' }, $push: { statusHistory: { status: 'confirmed', actor: 'razorpay' } } });
    if (event.event === 'payment.failed' && payment) await Order.updateOne({ 'payment.providerOrderId': payment.order_id }, { $set: { 'payment.status': 'failed' } });
    await IntegrationEvent.create({ provider: 'razorpay', direction: 'inbound', eventType: event.event, idempotencyKey: key, status: 'succeeded', payload: event }); res.json({ received: true });
  }));
  return router;
};
