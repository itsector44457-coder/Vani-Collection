const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Review = require('../../models/Review');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');

module.exports = ({ auth }) => {
  const router = express.Router();
  router.get('/product/:productId', asyncHandler(async (req, res) => {
    const data = await Review.find({ productId: req.params.productId, status: 'published' }).sort({ createdAt: -1 }).limit(100);
    res.json({ data });
  }));
  router.post('/', auth, validate(z.object({ productId: z.string(), orderId: z.string().optional(), rating: z.number().int().min(1).max(5), title: z.string().max(120).optional(), body: z.string().min(10).max(4000), images: z.array(z.url()).max(4).default([]) })), asyncHandler(async (req, res) => {
    const product = mongoose.Types.ObjectId.isValid(req.body.productId)
      ? await Product.findOne({ _id: req.body.productId, status: 'active' })
      : null;
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    const existing = await Review.exists({ productId: product._id, userId: req.user.id });
    if (existing) throw new AppError(409, 'REVIEW_ALREADY_EXISTS', 'You have already reviewed this product. You can edit it from My Reviews.');

    let verifiedPurchase = false;
    if (req.body.orderId) {
      const order = mongoose.Types.ObjectId.isValid(req.body.orderId)
        ? await Order.findOne({ _id: req.body.orderId, customerId: req.user.id })
        : null;
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      if (!order.items.some((item) => String(item.productId) === String(product._id))) {
        throw new AppError(422, 'REVIEW_PRODUCT_NOT_IN_ORDER', 'This product is not part of the selected order');
      }
      const delivered = ['delivered', 'return_requested', 'returned', 'refunded'].includes(order.status)
        || order.statusHistory?.some((entry) => entry.status === 'delivered');
      if (!delivered) throw new AppError(409, 'REVIEW_ORDER_NOT_DELIVERED', 'Delivered purchases can be reviewed from your account');
      verifiedPurchase = true;
    } else {
      verifiedPurchase = Boolean(await Order.exists({
        customerId: req.user.id,
        'items.productId': product._id,
        $or: [
          { status: { $in: ['delivered', 'return_requested', 'returned', 'refunded'] } },
          { 'statusHistory.status': 'delivered' },
        ],
      }));
    }

    const review = await Review.create({
      ...req.body,
      userId: req.user.id,
      customerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Verified Buyer',
      verifiedPurchase,
    });
    res.status(201).json({ data: review, meta: { moderation: 'pending', message: 'Review submitted for moderation' } });
  }));
  /**
   * The shopper's own reviews, every moderation state included — "my review vanished" is what the
   * account screen used to say while a review simply waited in the pending queue. Editing sends a
   * review back to pending so a published review cannot be quietly rewritten after moderation.
   */
  const reviewInput = z.object({ rating: z.number().int().min(1).max(5), title: z.string().max(120).optional(), body: z.string().min(10).max(4000), images: z.array(z.url()).max(4).default([]) });
  const serializeMine = (rows) => rows.map((row) => {
    const product = row.productId && typeof row.productId === 'object' ? row.productId : null;
    return {
      ...row,
      productId: product ? String(product._id) : String(row.productId || ''),
      product: product ? { _id: String(product._id), name: product.name, slug: product.slug, images: product.images || [] } : undefined,
    };
  });
  router.get('/mine', auth, asyncHandler(async (req, res) => {
    const rows = await Review.find({ userId: req.user.id }).populate('productId', 'name slug images').sort({ createdAt: -1 }).lean();
    res.json({ data: serializeMine(rows) });
  }));
  router.patch('/mine/:id', auth, validate(reviewInput), asyncHandler(async (req, res) => {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
    if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    Object.assign(review, req.body, { status: 'pending', adminReply: undefined });
    await review.save();
    res.json({ data: review, meta: { moderation: 'pending', message: 'Review updated and submitted for moderation' } });
  }));
  router.delete('/mine/:id', auth, asyncHandler(async (req, res) => {
    const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).catch(() => null);
    if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    res.status(204).end();
  }));

  // Moderation queue. The product ref is populated so support can see what is being reviewed
  // without a second lookup; `productTitle` is projected alongside for convenience.
  router.get('/', auth, requireRoles('support','admin','super_admin'), asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.rating) filter.rating = Number(req.query.rating);
    if (req.query.productId) filter.productId = req.query.productId;
    const limit = Math.min(500, Number(req.query.limit) || 200);
    const rows = await Review.find(filter).populate('productId', 'name slug').sort({ createdAt: -1 }).limit(limit).lean();
    const data = rows.map((row) => ({ ...row, productTitle: row.productId?.name || undefined }));
    const counts = await Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ data, meta: { total: data.length, counts: Object.fromEntries(counts.map((row) => [row._id, row.count])) } });
  }));
  router.patch('/:id', auth, requireRoles('support','admin','super_admin'), validate(z.object({ status: z.enum(['pending','published','rejected']).optional(), adminReply: z.string().max(2000).optional() })), asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' }); if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found'); res.json({ data: review });
  }));
  router.get('/summary/:productId', asyncHandler(async (req, res) => {
    const [summary] = await Review.aggregate([{ $match: { productId: new (require('mongoose').Types.ObjectId)(req.params.productId), status: 'published' } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 }, ratings: { $push: '$rating' } } }]);
    res.json({ data: summary ? { average: Math.round(summary.average * 10) / 10, count: summary.count, distribution: summary.ratings.reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {}) } : { average: 0, count: 0, distribution: {} } });
  }));
  return router;
};
