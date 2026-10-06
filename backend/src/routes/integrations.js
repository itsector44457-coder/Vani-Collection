const express = require('express');
const crypto = require('crypto');
const { verifyHmac } = require('../lib/signature');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const Order = require('../../models/Order');
const IntegrationEvent = require('../../models/IntegrationEvent');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { RishabhErpClient } = require('../services/rishabh-erp');

module.exports = ({ config, auth }) => {
  const router = express.Router(), erp = new RishabhErpClient(config);
  router.post('/erp/sync-stock', auth, requireRoles('admin','super_admin'), asyncHandler(async (_req, res) => {
    const result = await erp.getStock(); const rows = result.items || result.data || result;
    if (!Array.isArray(rows)) throw new AppError(502, 'ERP_MAPPING_ERROR', 'ERP stock response must contain an array');
    const operations = rows.map((r) => ({ updateOne: { filter: { sku: String(r.sku || r.itemCode).toUpperCase(), warehouseId: r.warehouseId || 'PRIMARY' }, update: { $set: { onHand: Number(r.quantity ?? r.stock ?? 0), lastErpSyncAt: new Date() } }, upsert: true } }));
    const output = operations.length ? await Inventory.bulkWrite(operations) : { modifiedCount: 0 }; res.json({ data: { received: rows.length, modified: output.modifiedCount, upserted: output.upsertedCount } });
  }));
  router.post('/erp/push-order/:orderId', auth, requireRoles('admin','super_admin'), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    const result = await erp.pushOrder(order); order.erpOrderId = String(result.id || result.orderId || result.voucherNo); order.erpSyncStatus = 'synced'; await order.save(); res.json({ data: order });
  }));
  router.post('/erp/webhook', asyncHandler(async (req, res) => {
    if (!config.ERP_WEBHOOK_SECRET) throw new AppError(503, 'ERP_WEBHOOK_DISABLED', 'ERP webhook is not configured');
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    if (!verifyHmac(config.ERP_WEBHOOK_SECRET, raw, req.get('x-erp-signature'))) throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid ERP signature');
    const payload = req.rawBody ? JSON.parse(raw.toString()) : req.body;
    const key = req.get('x-event-id') || crypto.createHash('sha256').update(raw).digest('hex');
    await IntegrationEvent.updateOne({ idempotencyKey: key }, { $setOnInsert: { provider: 'rishabh_erp', direction: 'inbound', eventType: payload.type || 'unknown', idempotencyKey: key, payload, status: 'pending' } }, { upsert: true }); res.status(202).json({ accepted: true });
  }));
  router.get('/events', auth, requireRoles('admin','super_admin'), asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;
    const limit = Math.min(500, Number(req.query.limit) || 200);
    const [data, statusRows] = await Promise.all([
      IntegrationEvent.find(filter).sort({ createdAt: -1 }).limit(limit),
      IntegrationEvent.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    res.json({ data, meta: { total: data.length, counts: Object.fromEntries(statusRows.map((row) => [row._id, row.count])) } });
  }));
  // Manual replay for a dead letter or a stuck failure. Attempts are reset so the row gets the
  // full backoff ladder again instead of being dead-lettered on the very next tick.
  router.post('/events/:id/retry', auth, requireRoles('admin','super_admin'), audit('integration.retry', 'IntegrationEvent'), asyncHandler(async (req, res) => {
    const event = await IntegrationEvent.findById(req.params.id);
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Integration event not found');
    if (event.status === 'processing') throw new AppError(409, 'EVENT_IN_FLIGHT', 'This event is being processed right now');
    event.status = 'pending'; event.attempts = 0; event.nextAttemptAt = new Date(); event.lastError = undefined;
    await event.save();
    res.json({ data: event });
  }));
  return router;
};
