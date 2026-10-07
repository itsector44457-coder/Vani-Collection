const express = require('express');
const Order = require('../../models/Order');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');
const { ShiprocketClient } = require('../services/shiprocket');
const { queueEmail, orderEmailData, orderRecipient } = require('../services/email');

/**
 * Shiprocket answers `/orders/create/adhoc` with an inconsistent shape: some tenants get the AWB
 * and tracking URL immediately, others only after `/courier/assign/shipment`. Read every spelling
 * we have seen so the customer email can carry a tracking link whenever one exists.
 */
const trackingFrom = (result = {}) => {
  const awb = result.awb_code || result.awb || result.AWB || '';
  const courier = result.courier_name || result.courier_company_name || result.courier || '';
  const trackingUrl = result.tracking_url || result.track_url || (awb ? `https://shiprocket.co/tracking/${awb}` : '');
  return { awb: awb ? String(awb) : undefined, courier: courier ? String(courier) : undefined, trackingUrl: trackingUrl || undefined };
};

module.exports = ({ config, auth }) => {
  const router = express.Router(), shiprocket = new ShiprocketClient(config);
  router.post('/:orderId/create', auth, requireRoles('warehouse', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['confirmed', 'processing', 'packed'].includes(order.status)) throw new AppError(409, 'INVALID_ORDER_STATUS', 'Order is not ready for shipment');
    const result = await shiprocket.createOrder(order);
    const tracking = trackingFrom(result);
    order.shipment = { provider: 'shiprocket', shipmentId: String(result.shipment_id), status: 'created', ...tracking };
    order.status = 'processing';
    order.statusHistory.push({ status: 'processing', actor: req.user.email, note: tracking.awb ? `Shiprocket shipment created · AWB ${tracking.awb}` : 'Shiprocket shipment created' });
    await order.save();

    // Tell the shopper the moment a parcel exists. When Shiprocket already handed back an AWB we
    // send the `shipped` variant with the tracking link; otherwise the honest `processing` variant
    // goes out now and the shipped email follows from PATCH /api/orders/:id/status.
    await queueEmail({
      to: orderRecipient(order, null),
      template: 'order-status',
      data: orderEmailData(order, {
        firstName: order.shippingAddress?.fullName?.split(' ')[0] || '',
        status: tracking.awb || tracking.trackingUrl ? 'shipped' : 'processing',
        note: tracking.awb ? `Your parcel is with ${tracking.courier || 'our courier partner'}.` : 'A shipment has been booked with our courier partner.',
      }),
      orderId: order.id,
      userId: order.customerId?.toString?.() || undefined,
      dedupeKey: `order-status:${order.id}:${tracking.awb || tracking.trackingUrl ? 'shipped' : 'processing'}:${order.shipment.shipmentId || ''}`,
      tags: ['orders', 'shipment'],
      log: req.log,
    });

    res.json({ data: order, provider: result });
  }));
  return router;
};
