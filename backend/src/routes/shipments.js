const express = require('express');
const Order = require('../../models/Order');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');
const { ShiprocketClient } = require('../services/shiprocket');
module.exports = ({ config, auth }) => {
  const router = express.Router(), shiprocket = new ShiprocketClient(config);
  router.post('/:orderId/create', auth, requireRoles('warehouse','admin','super_admin'), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['confirmed','processing','packed'].includes(order.status)) throw new AppError(409, 'INVALID_ORDER_STATUS', 'Order is not ready for shipment');
    const result = await shiprocket.createOrder(order); order.shipment = { provider: 'shiprocket', shipmentId: String(result.shipment_id), status: 'created' }; order.status = 'processing'; order.statusHistory.push({ status: 'processing', actor: req.user.email, note: 'Shiprocket shipment created' }); await order.save(); res.json({ data: order, provider: result });
  }));
  return router;
};
