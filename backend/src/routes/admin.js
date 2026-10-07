const express = require('express');
const { z } = require('zod');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const Review = require('../../models/Review');
const AuditLog = require('../../models/AuditLog');
const ReturnRequest = require('../../models/ReturnRequest');
const EmailLog = require('../../models/EmailLog');
const LoyaltyAccount = require('../../models/LoyaltyAccount');
const LoyaltyTransaction = require('../../models/LoyaltyTransaction');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { resendEmail } = require('../services/email');
const { getLoyaltyConfig, tierFor, adjustPoints, applyExpiry, getSummary } = require('../services/loyalty');
const { renderPackingSlipPdf, loadHsnBySku } = require('../services/invoice');

module.exports = ({ auth, config }) => {
  const router = express.Router();
  router.use(auth, requireRoles('support','warehouse','catalog_manager','finance','admin','super_admin'));

  router.get('/dashboard', asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 86400000);
    const [revenue, orders, pending, lowStock, reviewsPending, returns, series] = await Promise.all([
      Order.aggregate([{ $match: { 'payment.status': 'paid', createdAt: { $gte: since } } }, { $group: { _id: null, total: { $sum: '$amounts.total' }, count: { $sum: 1 } } }]),
      Order.countDocuments({ createdAt: { $gte: since } }),
      Order.countDocuments({ status: { $in: ['pending_payment','confirmed','processing','packed'] } }),
      Inventory.countDocuments({ $expr: { $lte: [{ $subtract: ['$onHand','$reserved'] }, '$reorderLevel'] } }),
      Review.countDocuments({ status: 'pending' }),
      ReturnRequest.countDocuments({ status: { $in: ['requested','approved','pickup_scheduled'] } }),
      Order.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: '$amounts.total' } } }, { $sort: { _id: 1 } }]),
    ]);
    const [products, customers, newCustomers, byCategory] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      User.countDocuments({ roles: 'customer' }),
      User.countDocuments({ roles: 'customer', createdAt: { $gte: since } }),
      Order.aggregate([{ $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled'] } } }, { $unwind: '$items' }, { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } }, { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }, { $group: { _id: { $ifNull: ['$product.category', 'other'] }, revenue: { $sum: '$items.lineTotal' }, units: { $sum: '$items.quantity' } } }, { $sort: { revenue: -1 } }, { $limit: 6 }]),
    ]);
    const grossRevenue = revenue[0]?.total || 0, paidOrders = revenue[0]?.count || 0;
    res.json({ data: { revenue30d: grossRevenue, paidOrders30d: paidOrders, aov30d: paidOrders ? Math.round(grossRevenue / paidOrders) : 0, orders30d: orders, openOrders: pending, lowStockSkus: lowStock, pendingReviews: reviewsPending, openReturns: returns, activeProducts: products, customers: { total: customers, new30d: newCustomers }, salesByCategory: byCategory, daily: series } });
  }));

  router.get('/customers', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = req.query.q ? { $or: [{ email: new RegExp(req.query.q, 'i') }, { phone: new RegExp(req.query.q, 'i') }] } : {};
    const [data, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
    res.json({ data: data.map((u) => u.toSafeJSON()), meta: { page, limit, total } });
  }));
  router.get('/customers/:id', requireRoles('admin','super_admin','support'), asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id); if (!user) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    const orders = await Order.find({ customerId: user.id }).sort({ createdAt: -1 });
    const spend = orders.filter((o) => o.payment.status === 'paid').reduce((s, o) => s + o.amounts.total, 0);
    res.json({ data: { customer: user.toSafeJSON(), orders, lifetimeValue: spend } });
  }));
  router.patch('/customers/:id', requireRoles('admin','super_admin'), validate(z.object({ status: z.enum(['active','blocked']).optional(), roles: z.array(z.enum(['customer','support','warehouse','catalog_manager','finance','admin','super_admin'])).optional() })), audit('customer.update','User'), asyncHandler(async (req, res) => {
    if (req.body.roles && req.user.roles.includes('admin') && !req.user.roles.includes('super_admin') && req.body.roles.includes('super_admin')) throw new AppError(403, 'ROLE_ESCALATION', 'Only a super admin can grant super admin');
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!user) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found'); res.json({ data: user.toSafeJSON() });
  }));

  router.get('/catalogue', requireRoles('catalog_manager','warehouse','support','finance','admin','super_admin'), asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 50);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.name = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [products, total, stockRows, salesRows] = await Promise.all([
      Product.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
      Inventory.aggregate([{ $group: { _id: '$sku', available: { $sum: { $subtract: ['$onHand', '$reserved'] } }, onHand: { $sum: '$onHand' }, reorderLevel: { $max: '$reorderLevel' } } }]),
      Order.aggregate([{ $unwind: '$items' }, { $match: { status: { $nin: ['cancelled', 'returned'] } } }, { $group: { _id: '$items.productId', units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } }]),
    ]);
    const stock = new Map(stockRows.map((row) => [row._id, row]));
    const sales = new Map(salesRows.map((row) => [String(row._id), row]));
    const data = products.map((product) => {
      const variants = product.variants.map((variant) => {
        const row = stock.get(variant.sku) || { available: 0, onHand: 0, reorderLevel: 0 };
        return { sku: variant.sku, size: variant.size, color: variant.color, price: variant.price, mrp: variant.mrp, available: row.available, onHand: row.onHand, reorderLevel: row.reorderLevel, low: row.available <= row.reorderLevel };
      });
      const sale = sales.get(String(product._id)) || { units: 0, revenue: 0 };
      return { ...product, variants, stockAvailable: variants.reduce((sum, v) => sum + v.available, 0), lowStockSkus: variants.filter((v) => v.low).length, unitsSold: sale.units, revenue: sale.revenue };
    });
    res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));

  router.get('/staff', requireRoles('admin','super_admin'), asyncHandler(async (_req, res) => res.json({ data: (await User.find({ roles: { $ne: 'customer' } })).map((u) => u.toSafeJSON()) })));
  router.post('/staff', requireRoles('admin','super_admin'), validate(z.object({ email: z.email(), firstName: z.string().min(1), lastName: z.string().optional(), password: z.string().min(8), roles: z.array(z.enum(['support','warehouse','catalog_manager','finance','admin'])).min(1) })), audit('staff.create','User'), asyncHandler(async (req, res) => {
    if (await User.exists({ email: req.body.email })) throw new AppError(409, 'EMAIL_EXISTS', 'User already exists');
    const user = await User.create({ email: req.body.email, firstName: req.body.firstName, lastName: req.body.lastName, roles: req.body.roles, passwordHash: await User.hashPassword(req.body.password) });
    res.status(201).json({ data: user.toSafeJSON() });
  }));

  /**
   * Warehouse packing slip as a PDF.
   *
   * Carries no prices on purpose — it travels inside the parcel and is handled by couriers and
   * warehouse staff, so what the customer paid is neither needed nor appropriate there.
   */
  router.get('/orders/:id/packing-slip.pdf', requireRoles('warehouse', 'support', 'catalog_manager', 'finance', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('customerId', 'email');
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    const customer = order.customerId ? await User.findById(order.customerId).catch(() => null) : null;
    const pdf = await renderPackingSlipPdf(order, {
      seller: config.seller,
      hsnBySku: await loadHsnBySku(order, { log: req.log }),
      customerEmail: customer?.email || order.guestEmail,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="packing-slip-${order.orderNumber || order.id}.pdf"`);
    res.end(pdf);
  }));

  router.get('/audit-logs', requireRoles('admin','super_admin'), asyncHandler(async (req, res) => {
    const filter = req.query.action ? { action: req.query.action } : {};
    res.json({ data: await AuditLog.find(filter).sort({ createdAt: -1 }).limit(Math.min(500, Number(req.query.limit) || 100)) });
  }));

  // ---------------------------------------------------------------- email outbox
  // Delivery is asynchronous, so this is the only place anyone can see whether a shopper actually
  // got their order confirmation — and the only way to replay one that did not go out.
  router.get('/emails', requireRoles('support','admin','super_admin'), asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.template) filter.template = req.query.template;
    if (req.query.to) filter.to = new RegExp(String(req.query.to).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (req.query.orderId) filter.orderId = req.query.orderId;
    const [data, total, statusRows, templateRows] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-data'),
      EmailLog.countDocuments(filter),
      EmailLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EmailLog.aggregate([{ $group: { _id: '$template', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);
    res.json({
      data,
      meta: {
        page, limit, total, pages: Math.ceil(total / limit),
        counts: {
          byStatus: Object.fromEntries(statusRows.map((row) => [row._id, row.count])),
          byTemplate: Object.fromEntries(templateRows.map((row) => [row._id, row.count])),
        },
      },
    });
  }));

  router.get('/emails/:id', requireRoles('support','admin','super_admin'), asyncHandler(async (req, res) => {
    const entry = await EmailLog.findById(req.params.id);
    if (!entry) throw new AppError(404, 'EMAIL_NOT_FOUND', 'Email log entry not found');
    res.json({ data: entry });
  }));

  router.post('/emails/:id/resend', requireRoles('support','admin','super_admin'), audit('email.resend','EmailLog'), asyncHandler(async (req, res) => {
    const result = await resendEmail(req.params.id, { log: req.log });
    res.json({ data: result });
  }));

  // ------------------------------------------------------------------ loyalty
  /**
   * The membership list plus the programme's headline numbers.
   *
   * Balances are shown as stored; `refresh=true` re-lapses anything due and reconciles each balance
   * against the ledger first, which is what support should run before quoting a number to a member.
   */
  router.get('/loyalty', asyncHandler(async (req, res) => {
    const config = getLoyaltyConfig();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = {};
    if (req.query.tier && ['silver', 'gold', 'platinum'].includes(req.query.tier)) filter.tier = req.query.tier;
    if (req.query.q) filter.userId = { $in: (await User.find({ $or: [{ email: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { firstName: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] }).limit(200)).map((u) => u._id) };

    if (req.query.refresh === 'true') {
      const due = await LoyaltyAccount.find(filter).select('userId').limit(500).lean();
      for (const account of due) await applyExpiry(account.userId, {}).catch(() => {});
    }

    const [accounts, total, tierRows, ledgerRows] = await Promise.all([
      LoyaltyAccount.find(filter).sort({ lifetimePoints: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'email firstName lastName phone'),
      LoyaltyAccount.countDocuments(filter),
      LoyaltyAccount.aggregate([{ $group: { _id: '$tier', members: { $sum: 1 }, points: { $sum: '$points' }, lifetime: { $sum: '$lifetimePoints' } } }]),
      LoyaltyTransaction.aggregate([{ $group: { _id: '$reason', points: { $sum: { $abs: '$delta' } }, count: { $sum: 1 } } }]),
    ]);

    const soon = new Date(Date.now() + 30 * 86400000);
    const [expiring] = await LoyaltyTransaction.aggregate([
      { $match: { delta: { $gt: 0 }, remaining: { $gt: 0 }, expiresAt: { $ne: null, $lte: soon } } },
      { $group: { _id: null, points: { $sum: '$remaining' }, members: { $addToSet: '$userId' } } },
    ]);

    const data = accounts.map((account) => {
      const member = account.userId && typeof account.userId === 'object' ? account.userId : null;
      return {
        _id: account.id,
        userId: String(account.userId),
        email: member?.email,
        name: member ? [member.firstName, member.lastName].filter(Boolean).join(' ') : undefined,
        phone: member?.phone,
        points: account.points,
        lifetimePoints: account.lifetimePoints,
        tier: account.tier,
        tierLabel: tierFor(account.lifetimePoints).label,
        nextTier: tierFor(account.lifetimePoints).next,
        valueRupees: Math.floor(account.points * config.pointValueRupees),
        lastEarnedAt: account.lastEarnedAt,
        memberSince: account.createdAt,
      };
    });

    res.json({
      data,
      meta: {
        page, limit, total, pages: Math.ceil(total / limit),
        config: {
          enabled: config.enabled,
          rupeesPerPoint: config.rupeesPerPoint,
          pointValueRupees: config.pointValueRupees,
          minRedemptionPoints: config.minRedemptionPoints,
          maxRedemptionPercent: config.maxRedemptionPercent,
          expiryMonths: config.expiryMonths,
          referralBonusPoints: config.referralBonusPoints,
          tiers: config.tiers,
        },
        totals: Object.fromEntries(ledgerRows.map((row) => [row._id, { points: row.points, count: row.count }])),
        byTier: Object.fromEntries(tierRows.map((row) => [row._id, { members: row.members, points: row.points, lifetime: row.lifetime }])),
        expiringSoon: expiring ? { points: expiring.points, members: expiring.members.length } : { points: 0, members: 0 },
        liabilityRupees: Math.floor((tierRows.reduce((sum, row) => sum + row.points, 0)) * config.pointValueRupees),
      },
    });
  }));

  // One member's full position — the screen support opens when someone asks "where are my points?".
  router.get('/loyalty/:userId', requireRoles('support', 'finance', 'admin', 'super_admin'), asyncHandler(async (req, res) => {
    const summary = await getSummary(req.params.userId);
    const transactions = await LoyaltyTransaction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ data: { summary, transactions } });
  }));

  /**
   * Manual correction. Requires a reason, is audited against the staff account, and can never take a
   * balance below zero — a mistake is fixed by an explicit compensating adjustment, not by forcing a
   * negative balance into existence.
   */
  router.post('/loyalty/:userId/adjust', requireRoles('finance', 'admin', 'super_admin'), validate(z.object({ delta: z.number().int().refine((value) => value !== 0, 'Adjustment cannot be zero'), note: z.string().min(3).max(500) })), audit('loyalty.adjust', 'LoyaltyTransaction'), asyncHandler(async (req, res) => {
    const transaction = await adjustPoints({ userId: req.params.userId, delta: req.body.delta, note: req.body.note, actorEmail: req.user.email });
    const account = await LoyaltyAccount.findOne({ userId: req.params.userId });
    res.json({ data: { transaction, balance: account?.points ?? 0 } });
  }));

  router.get('/reports/sales', requireRoles('finance','admin','super_admin'), asyncHandler(async (req, res) => {
    const days = Math.min(365, Number(req.query.days) || 30), from = new Date(Date.now() - days * 86400000);
    const [byDay, byStatus, byPayment, byCategory] = await Promise.all([
      Order.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, gross: { $sum: '$amounts.total' }, discounts: { $sum: '$amounts.discount' }, tax: { $sum: '$amounts.tax' } } }, { $sort: { _id: 1 } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: '$payment.method', count: { $sum: 1 }, collected: { $sum: '$amounts.total' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: from } } }, { $unwind: '$items' }, { $group: { _id: '$items.name', units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } }, { $sort: { revenue: -1 } }, { $limit: 20 }]),
    ]);
    res.json({ data: { from, to: new Date(), byDay, byStatus, byPayment, topProducts: byCategory } });
  }));
  router.get('/reports/gst', requireRoles('finance','admin','super_admin'), asyncHandler(async (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7), from = new Date(`${month}-01T00:00:00.000Z`), to = new Date(from.getTime() + 31 * 86400000);
    const orders = await Order.find({ createdAt: { $gte: from, $lt: to }, 'payment.status': 'paid' }).lean();
    const gstByRate = orders.flatMap((o) => o.items).reduce((acc, item) => { const rate = item.gstRate || 0; acc[rate] = acc[rate] || { taxableValue: 0, tax: 0, rate }; acc[rate].taxableValue += (item.lineTotal - item.taxAmount); acc[rate].tax += item.taxAmount; return acc; }, {});
    res.json({ data: { month, invoices: orders.length, gstByRate: Object.values(gstByRate), totalTax: Object.values(gstByRate).reduce((s, g) => s + g.tax, 0) } });
  }));
  return router;
};
