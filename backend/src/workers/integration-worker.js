const IntegrationEvent = require('../../models/IntegrationEvent');
const Inventory = require('../../models/Inventory');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const email = require('../services/email');

const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];

async function handleEvent(event, { log = console } = {}) {
  const payload = event.payload || {};
  switch (payload.type || event.eventType) {
    // Outbound email shares this outbox so a slow SMTP provider can never block or fail a request.
    case 'email.send':
      return email.deliverOutboxEvent(event, { log });
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

const DUE_FILTER = { status: { $in: ['pending', 'failed'] }, $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: new Date() } }] };

async function processPendingEvents({ limit = 20, log = console } = {}) {
  // Outbound email runs on its own, faster loop (see processPendingEmails) so exclude it here —
  // otherwise both loops could pick up the same row and send the message twice.
  const due = await IntegrationEvent.find({ ...DUE_FILTER, provider: { $ne: 'email' } }).sort({ createdAt: 1 }).limit(limit);
  const results = [];
  for (const event of due) {
    event.status = 'processing'; event.attempts += 1; await event.save();
    try {
      const response = await handleEvent(event, { log });
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

/** A claim older than this is treated as abandoned (the process died mid-send) and retried. */
const STALE_CLAIM_MS = 10 * 60 * 1000;

/**
 * Drains the outbound-email outbox on a shorter cycle than the ERP events.
 *
 * Rows are claimed with an atomic `findOneAndUpdate`, so two processes (or two overlapping ticks)
 * can never deliver the same email twice — a duplicated order confirmation is worse than a late one.
 * Stale `processing` rows are reclaimed so a crashed worker cannot strand a message forever.
 */
async function processPendingEmails({ limit = 25, log = console } = {}) {
  const claimFilter = {
    provider: 'email',
    $or: [
      { ...DUE_FILTER, status: { $in: ['pending', 'failed'] } },
      { status: 'processing', updatedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } },
    ],
  };
  const results = [];
  for (let i = 0; i < limit; i += 1) {
    const event = await IntegrationEvent.findOneAndUpdate(
      claimFilter,
      { $set: { status: 'processing' }, $inc: { attempts: 1 } },
      { new: true, sort: { createdAt: 1 } }
    );
    if (!event) break;
    try {
      const response = await email.deliverOutboxEvent(event, { log });
      event.status = 'succeeded'; event.response = response; event.lastError = undefined; await event.save();
      results.push({ id: event.id, status: 'succeeded' });
    } catch (error) {
      const delay = BACKOFF_MS[Math.min(event.attempts - 1, BACKOFF_MS.length - 1)];
      event.status = event.attempts >= BACKOFF_MS.length ? 'dead_letter' : 'failed';
      event.lastError = error.message; event.nextAttemptAt = new Date(Date.now() + delay); await event.save();
      results.push({ id: event.id, status: event.status, error: error.message });
      log.warn?.({ eventId: event.id, error: error.message }, 'email delivery attempt failed');
    }
  }
  return results;
}

function startIntegrationWorker({ intervalMs = 60_000, emailIntervalMs = 15_000, log = console } = {}) {
  const loop = (worker, ms, label) => {
    let running = false;
    const tick = async () => {
      if (running) return; running = true;
      try { await worker({ log }); } catch (error) { log.error?.({ error: error.message }, `${label} tick failed`); } finally { running = false; }
    };
    const timer = setInterval(tick, ms);
    timer.unref?.();
    tick();
    return () => clearInterval(timer);
  };
  const stopEvents = loop(processPendingEvents, intervalMs, 'integration worker');
  const stopEmails = loop(processPendingEmails, emailIntervalMs, 'email worker');
  return () => { stopEvents(); stopEmails(); };
}

module.exports = { handleEvent, processPendingEvents, processPendingEmails, startIntegrationWorker };
