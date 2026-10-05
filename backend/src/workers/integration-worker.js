const IntegrationEvent = require('../../models/IntegrationEvent');
const Inventory = require('../../models/Inventory');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];

async function handleEvent(event) {
  const payload = event.payload || {};
  switch (payload.type || event.eventType) {
    case 'stock.update': {
      const rows = payload.items || [];
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('stock.update requires a non-empty items array');
      const operations = rows.map((row) => ({ updateOne: { filter: { sku: String(row.sku).toUpperCase(), warehouseId: row.warehouseId || 'PRIMARY' }, update: { $set: { onHand: Number(row.quantity || 0), lastErpSyncAt: new Date() } }, upsert: true } }));
      await Inventory.bulkWrite(operations);
      return { updated: rows.length };
    }
    case 'price.update': {
      const rows = payload.items || [];
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('price.update requires a non-empty items array');
      let modified = 0;
      for (const row of rows) {
        const result = await Product.updateOne({ 'variants.sku': String(row.sku).toUpperCase() }, { $set: { 'variants.$[v].price': Number(row.price), 'variants.$[v].mrp': Number(row.mrp ?? row.price), erpUpdatedAt: new Date() } }, { arrayFilters: [{ 'v.sku': String(row.sku).toUpperCase() }] });
        modified += result.modifiedCount;
      }
      return { modified };
    }
    case 'order.status': {
      const order = await Order.findOneAndUpdate({ orderNumber: payload.orderNumber }, { $set: { erpOrderId: payload.erpOrderId, erpSyncStatus: 'synced' }, $push: { statusHistory: { status: payload.orderStatus || 'processing', actor: 'rishabh-erp', note: payload.note } } }, { new: true });
      if (!order) throw new Error(`Order ${payload.orderNumber} not found for ERP status update`);
      return { orderNumber: order.orderNumber };
    }
    default:
      throw new Error(`Unsupported event type: ${payload.type || event.eventType}`);
  }
}

async function processPendingEvents({ limit = 20, log = console } = {}) {
  const due = await IntegrationEvent.find({ status: { $in: ['pending', 'failed'] }, $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: new Date() } }] }).sort({ createdAt: 1 }).limit(limit);
  const results = [];
  for (const event of due) {
    event.status = 'processing'; event.attempts += 1; await event.save();
    try {
      const response = await handleEvent(event);
      event.status = 'succeeded'; event.response = response; event.lastError = undefined; await event.save();
      results.push({ id: event.id, status: 'succeeded' });
    } catch (error) {
      const delay = BACKOFF_MS[Math.min(event.attempts - 1, BACKOFF_MS.length - 1)];
      event.status = event.attempts >= BACKOFF_MS.length ? 'dead_letter' : 'failed';
      event.lastError = error.message; event.nextAttemptAt = new Date(Date.now() + delay); await event.save();
      results.push({ id: event.id, status: event.status, error: error.message });
      log.warn?.({ eventId: event.id, error: error.message }, 'integration event failed');
    }
  }
  return results;
}

function startIntegrationWorker({ intervalMs = 60_000, log = console } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try { await processPendingEvents({ log }); } catch (error) { log.error?.({ error: error.message }, 'integration worker tick failed'); } finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
}

module.exports = { handleEvent, processPendingEvents, startIntegrationWorker };
