const express = require('express');
const { z } = require('zod');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Inventory = require('../../models/Inventory');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { ensureCategories } = require('../lib/category-defaults');

const productImage = z.object({ url: z.url(), alt: z.string().optional(), position: z.number().optional() });
const variant = z.object({ sku: z.string().min(2), barcode: z.string().optional(), size: z.string().optional(), color: z.string().optional(), images: z.array(productImage).optional(), mrp: z.number().nonnegative(), price: z.number().nonnegative(), costPrice: z.number().nonnegative().optional(), weightGrams: z.number().positive().optional(), active: z.boolean().optional() });
const productInput = z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().optional(), shortDescription: z.string().optional(), sizeGuide: z.string().max(5000).optional(), category: z.string().min(1), subcategory: z.string().optional(), brand: z.string().optional(), fabric: z.string().optional(), craft: z.string().optional(), hsnCode: z.string().optional(), gstRate: z.number().min(0).max(28).optional(), images: z.array(productImage).default([]), hoverImage: z.union([z.url(), z.literal('')]).optional(), videos: z.array(z.object({ url: z.url(), kind: z.string().optional() })).default([]), variants: z.array(variant).min(1), tags: z.array(z.string()).default([]), badges: z.array(z.string()).default([]), status: z.enum(['draft', 'active', 'archived']).optional(), featured: z.boolean().optional(), seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(), erpProductId: z.string().optional() });

module.exports = ({ auth }) => {
  const router = express.Router();
  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const filter = { status: 'active' };
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    const search = String(req.query.q || req.query.search || '').trim();
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { shortDescription: regex },
        { category: regex },
        { subcategory: regex },
        { fabric: regex },
        { craft: regex },
        { tags: regex },
        { 'variants.sku': regex },
        { 'variants.color': regex },
      ];
    }
    const [data, total] = await Promise.all([
      Product.find(filter).select('-variants.costPrice').sort({ featured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));
  router.get('/:slug', asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, status: 'active' }).select('-variants.costPrice');
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const stock = await Inventory.find({ sku: { $in: product.variants.map((v) => v.sku) } });
    res.json({ data: { ...product.toObject(), inventory: Object.fromEntries(stock.map((s) => [s.sku, s.onHand - s.reserved])) } });
  }));
  router.post('/', auth, requireRoles('catalog_manager', 'admin', 'super_admin'), validate(productInput), audit('product.create', 'Product'), asyncHandler(async (req, res) => {
    await ensureCategories(Category, Product);
    if (!await Category.exists({ slug: req.body.category, isActive: true })) throw new AppError(422, 'INVALID_CATEGORY', 'Choose an active product category');
    const product = await Product.create({ ...req.body, createdBy: req.user.id, updatedBy: req.user.id });
    await Inventory.insertMany(product.variants.map((v) => ({ sku: v.sku, warehouseId: 'PRIMARY' })), { ordered: false }).catch((e) => { if (e.code !== 11000) throw e; });
    res.status(201).json({ data: product });
  }));
  router.patch('/:id', auth, requireRoles('catalog_manager', 'admin', 'super_admin'), validate(productInput.partial()), audit('product.update', 'Product'), asyncHandler(async (req, res) => {
    if (req.body.category && !await Category.exists({ slug: req.body.category, isActive: true })) throw new AppError(422, 'INVALID_CATEGORY', 'Choose an active product category');
    const product = await Product.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.id }, { returnDocument: 'after', runValidators: true });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    res.json({ data: product });
  }));
  router.delete('/:id', auth, requireRoles('catalog_manager', 'admin', 'super_admin'), audit('product.delete', 'Product'), asyncHandler(async (req, res) => {
    const isPermanent = req.query.permanent === 'true' || req.query.hard === 'true';
    if (isPermanent) {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      if (product.variants?.length) {
        await Inventory.deleteMany({ sku: { $in: product.variants.map((v) => v.sku) } });
      }
      return res.json({ data: product, deleted: true, message: 'Product permanently deleted' });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'archived', updatedBy: req.user.id }, { returnDocument: 'after' });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    res.json({ data: product, archived: true, message: 'Product archived' });
  }));
  const bulkDeleteInput = z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one product ID must be provided'),
    permanent: z.boolean().optional().default(false),
  });
  router.post('/bulk-delete', auth, requireRoles('catalog_manager', 'admin', 'super_admin'), validate(bulkDeleteInput), audit('product.bulk_delete', 'Product'), asyncHandler(async (req, res) => {
    const { ids, permanent } = req.body;
    if (permanent) {
      const products = await Product.find({ _id: { $in: ids } });
      const skus = products.flatMap((p) => (p.variants || []).map((v) => v.sku)).filter(Boolean);
      await Product.deleteMany({ _id: { $in: ids } });
      if (skus.length) {
        await Inventory.deleteMany({ sku: { $in: skus } });
      }
      return res.json({
        deletedCount: products.length,
        permanent: true,
        message: `${products.length} products permanently deleted`,
      });
    }
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'archived', updatedBy: req.user.id } }
    );
    res.json({
      archivedCount: result.modifiedCount,
      permanent: false,
      message: `${result.modifiedCount} products archived`,
    });
  }));
  return router;
};
