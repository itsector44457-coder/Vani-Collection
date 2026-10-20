const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Inventory = require('../../models/Inventory');
const Coupon = require('../../models/Coupon');
const User = require('../../models/User');
const { queueEmail, orderEmailData, orderRecipient } = require('./email');

const DEFAULT_PENDING_PAYMENT_TTL_MS = 30 * 60 * 1000;

const decrementReserved = (quantity) => [
  {
    $set: {
      reserved: {
        $max: [0, { $subtract: [{ $ifNull: ['$reserved', 0] }, quantity] }],
      },
    },
  },
];

const decrementCouponUse = [
  {
    $set: {
      usedCount: {
        $max: [0, { $subtract: [{ $ifNull: ['$usedCount', 0] }, 1] }],
      },
    },
  },
];

async function notifyExpiredOrder(order, { log } = {}) {
  try {
    const customer = order.customerId ? await User.findById(order.customerId).lean().catch(() => null) : null;
    await queueEmail({
      to: orderRecipient(order, customer),
      template: 'order-cancelled',
      data: orderEmailData(order, {
        firstName: customer?.firstName || order.shippingAddress?.fullName?.split(' ')[0] || '',
        reason: 'Online payment was not completed before the reservation expired.',
      }),
      orderId: order.id,
      userId: customer?._id,
      dedupeKey: `order-cancelled:${order.id}:payment-expired`,
      tags: ['orders', 'payment-expired'],
      log,
    });
  } catch (error) {
    log?.warn?.({ err: error, orderId: order.id }, 'payment-expired cancellation email could not be queued');
  }
}

/**
 * Releases stock held by abandoned Razorpay checkouts.
 *
 * Order creation reserves inventory before the gateway opens. Without this sweep, closing the
 * payment tab would make those units unsellable forever. Each order is re-checked inside its own
 * transaction, so a payment captured at the same moment wins and the sweep skips that order.
 */
async function expirePendingPayments({
  now = new Date(),
  ttlMs = DEFAULT_PENDING_PAYMENT_TTL_MS,
  limit = 50,
  log = console,
  notify = true,
} = {}) {
  const cutoff = new Date(now.getTime() - Math.max(0, ttlMs));
  const candidates = await Order.find({
    status: 'pending_payment',
    'payment.method': 'razorpay',
    'payment.status': { $in: ['pending', 'failed'] },
    'payment.providerPaymentId': { $exists: false },
    createdAt: { $lte: cutoff },
  })
    .select('_id')
    .sort({ createdAt: 1 })
    .limit(Math.max(1, limit))
    .lean();

  const expired = [];
  for (const candidate of candidates) {
    const session = await mongoose.startSession();
    let expiredOrder = null;
    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({
          _id: candidate._id,
          status: 'pending_payment',
          'payment.method': 'razorpay',
          'payment.status': { $in: ['pending', 'failed'] },
          'payment.providerPaymentId': { $exists: false },
          createdAt: { $lte: cutoff },
        }).session(session);
        if (!order) return;

        for (const item of order.items) {
          await Inventory.updateOne(
            { sku: item.sku },
            decrementReserved(item.quantity),
            { session },
          );
        }
        if (order.couponCode) {
          await Coupon.updateOne(
            { code: order.couponCode },
            decrementCouponUse,
            { session },
          );
        }

        order.status = 'cancelled';
        order.payment.status = 'expired';
        order.statusHistory.push({
          status: 'cancelled',
          actor: 'system',
          note: 'Online payment was not completed before the stock reservation expired',
        });
        await order.save({ session });
        expiredOrder = order;
      });
    } catch (error) {
      log?.warn?.({ err: error, orderId: String(candidate._id) }, 'pending payment expiry failed for one order');
    } finally {
      await session.endSession();
    }

    if (expiredOrder) {
      expired.push(expiredOrder);
      if (notify) await notifyExpiredOrder(expiredOrder, { log });
    }
  }

  if (expired.length) {
    log?.info?.({ expired: expired.length, cutoff }, 'expired abandoned online-payment orders');
  }
  return { expiredCount: expired.length, orderIds: expired.map((order) => order.id) };
}

module.exports = {
  DEFAULT_PENDING_PAYMENT_TTL_MS,
  expirePendingPayments,
};
