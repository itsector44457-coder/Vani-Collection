const express = require('express');
const { z } = require('zod');
const Order = require('../../models/Order');
const User = require('../../models/User');
const ReturnRequest = require('../../models/ReturnRequest');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { queueEmail, orderEmailData, orderRecipient } = require('../services/email');

/**
 * The full ladder support can drive from the admin console. `rejected` short-circuits the rest;
 * everything else moves forward towards a refund.
 */
const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'pickup_scheduled', 'received', 'quality_check', 'refund_pending', 'completed'];

module.exports = ({ auth }) => {
  const router = express.Router();
  router.post('/', auth, validate(z.object({ orderId: z.string(), type: z.enum(['return', 'exchange']).default('return'), items: z.array(z.object({ sku: z.string(), quantity: z.number().int().min(1), reason: z.string().min(3), condition: z.string().optional(), images: z.array(z.url()).max(3).default([]) })).min(1) })), asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.body.orderId, customerId: req.user.id }); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['delivered', 'shipped'].includes(order.status)) throw new AppError(409, 'RETURN_WINDOW_CLOSED', 'Returns are allowed only for delivered or in-transit orders');
    const delivered = order.statusHistory.find((h) => h.status === 'delivered')?.at || order.updatedAt;
    if (Date.now() - new Date(delivered).getTime() > 7 * 86400000) throw new AppError(409, 'RETURN_WINDOW_CLOSED', 'Return window of 7 days has closed');
    const requested = await ReturnRequest.create({ orderId: order._id, customerId: req.user.id, type: req.body.type, items: req.body.items, refundAmount: req.body.items.reduce((sum, item) => { const line = order.items.find((i) => i.sku === item.sku); return sum + (line ? line.unitPrice * item.quantity : 0); }, 0) });
    order.status = 'return_requested'; order.statusHistory.push({ status: 'return_requested', actor: req.user.email, note: requested.returnNumber }); await order.save();
    // The shopper hears from us immediately: a submitted return that goes silent is a support ticket.
    await queueEmail({
      to: orderRecipient(order, req.user),
      template: 'return-status',
      data: { ...orderEmailData(order, { firstName: req.user.firstName || order.shippingAddress?.fullName?.split(' ')[0] || '' }), returnRequest: { id: requested.id, returnNumber: requested.returnNumber, type: requested.type, status: 'requested', items: requested.items, refundAmount: requested.refundAmount }, status: 'requested' },
      orderId: order.id,
      userId: req.user.id,
      dedupeKey: `return-status:${requested.id}:requested`,
      tags: ['returns'],
      log: req.log,
    });
    res.status(201).json({ data: requested });
  }));
  router.get('/mine', auth, asyncHandler(async (req, res) => res.json({ data: await ReturnRequest.find({ customerId: req.user.id }).sort({ createdAt: -1 }).populate('orderId', 'orderNumber status amounts.total items') })));
  router.get('/', auth, requireRoles('support', 'finance', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.orderId) filter.orderId = req.query.orderId;
    const limit = Math.min(200, Number(req.query.limit) || 200);
    // The admin console needs the order number and the customer next to each return, so populate
    // both — one round trip instead of an N+1 in the browser.
    const data = await ReturnRequest.find(filter).sort({ createdAt: -1 }).limit(limit)
      .populate('orderId', 'orderNumber status amounts.total payment.method payment.status shippingAddress items createdAt')
      .populate('customerId', 'email firstName lastName phone');
    res.json({ data, meta: { total: data.length } });
  }));
  router.patch('/:id', auth, requireRoles('support', 'finance', 'admin', 'super_admin'), validate(z.object({
    status: z.enum(RETURN_STATUSES),
    adminNote: z.string().max(2000).optional(),
    refundAmount: z.number().nonnegative().optional(),
    refundId: z.string().max(120).optional(),
    items: z.array(z.object({ sku: z.string().optional(), quantity: z.number().int().min(1).optional(), reason: z.string().optional(), condition: z.string().optional(), images: z.array(z.url()).max(6).optional() })).optional(),
  })), audit('return.status', 'ReturnRequest'), asyncHandler(async (req, res) => {
    const record = await ReturnRequest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request not found');

    const [order, customer] = await Promise.all([
      Order.findById(record.orderId),
      record.customerId ? User.findById(record.customerId) : null,
    ]);
    await queueEmail({
      to: orderRecipient(order, customer),
      template: 'return-status',
      data: {
        ...(order ? orderEmailData(order, { firstName: customer?.firstName || order.shippingAddress?.fullName?.split(' ')[0] || '' }) : {}),
        returnRequest: { id: record.id, returnNumber: record.returnNumber, type: record.type, status: record.status, items: record.items, refundAmount: record.refundAmount, refundId: record.refundId, updatedAt: record.updatedAt },
        status: record.status,
        adminNote: req.body.adminNote || record.adminNote,
      },
      orderId: order?.id,
      userId: record.customerId?.toString?.() || undefined,
      dedupeKey: `return-status:${record.id}:${record.status}`,
      tags: ['returns'],
      log: req.log,
    });

    res.json({ data: record });
  }));
  return router;
};

module.exports.RETURN_STATUSES = RETURN_STATUSES;
