const express = require('express');
const { z } = require('zod');
const Order = require('../../models/Order');
const ReturnRequest = require('../../models/ReturnRequest');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

module.exports = ({ auth }) => {
  const router = express.Router();
  router.post('/', auth, validate(z.object({ orderId: z.string(), type: z.enum(['return','exchange']).default('return'), items: z.array(z.object({ sku: z.string(), quantity: z.number().int().min(1), reason: z.string().min(3), condition: z.string().optional(), images: z.array(z.url()).max(3).default([]) })).min(1) })), asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.body.orderId, customerId: req.user.id }); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['delivered','shipped'].includes(order.status)) throw new AppError(409, 'RETURN_WINDOW_CLOSED', 'Returns are allowed only for delivered or in-transit orders');
    const delivered = order.statusHistory.find((h) => h.status === 'delivered')?.at || order.updatedAt;
    if (Date.now() - new Date(delivered).getTime() > 7 * 86400000) throw new AppError(409, 'RETURN_WINDOW_CLOSED', 'Return window of 7 days has closed');
    const requested = await ReturnRequest.create({ orderId: order._id, customerId: req.user.id, type: req.body.type, items: req.body.items, refundAmount: req.body.items.reduce((sum, item) => { const line = order.items.find((i) => i.sku === item.sku); return sum + (line ? line.unitPrice * item.quantity : 0); }, 0) });
    order.status = 'return_requested'; order.statusHistory.push({ status: 'return_requested', actor: req.user.email, note: requested.returnNumber }); await order.save();
    res.status(201).json({ data: requested });
  }));
  router.get('/mine', auth, asyncHandler(async (req, res) => res.json({ data: await ReturnRequest.find({ customerId: req.user.id }).sort({ createdAt: -1 }) })));
  router.get('/', auth, requireRoles('support','finance','admin','super_admin'), asyncHandler(async (_req, res) => res.json({ data: await ReturnRequest.find().sort({ createdAt: -1 }).limit(200) })));
  router.patch('/:id', auth, requireRoles('support','finance','admin','super_admin'), validate(z.object({ status: z.enum(['requested','approved','rejected','pickup_scheduled','received','quality_check','refund_pending','completed']), adminNote: z.string().max(2000).optional() })), audit('return.status','ReturnRequest'), asyncHandler(async (req, res) => {
    const record = await ReturnRequest.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!record) throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request not found'); res.json({ data: record });
  }));
  return router;
};
