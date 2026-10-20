const express = require('express');
const { z } = require('zod');
const Category = require('../../models/Category');
const NavigationMenu = require('../../models/NavigationMenu');
const Product = require('../../models/Product');
const Inventory = require('../../models/Inventory');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { ensureCategories } = require('../lib/category-defaults');

const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  guideContent: z.string().trim().max(12000).optional(),
  seo: z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(320).optional(),
  }).optional(),
  faqs: z.array(z.object({
    question: z.string().trim().min(3).max(300),
    answer: z.string().trim().min(3).max(2000),
  })).max(10).optional(),
  bannerImage: z.string().trim().max(2000).refine((value) => {
    if (!value || /^\/(?!\/)/.test(value)) return true;
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  }, 'Use an http(s) image URL or a local path starting with /').optional(),
  navigationGroup: z.string().trim().min(2).max(60),
  position: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

module.exports = ({ auth }) => {
  const router = express.Router();
  const requireCatalogRole = requireRoles('catalog_manager', 'admin', 'super_admin');

  router.get('/manage', auth, requireCatalogRole, asyncHandler(async (_req, res) => {
    await ensureCategories(Category, Product);
    const data = await Category.find({}).sort({ position: 1, name: 1 }).lean();
    res.json({ data });
  }));

  router.get('/', asyncHandler(async (_req, res) => {
    await ensureCategories(Category, Product);
    const data = await Category.find({ isActive: true }).sort({ position: 1, name: 1 }).lean();
    res.json({ data });
  }));

  router.post('/manage', auth, requireCatalogRole, validate(categoryInput), audit('category.create', 'Category'), asyncHandler(async (req, res) => {
    if (await Category.exists({ slug: req.body.slug })) throw new AppError(409, 'CATEGORY_SLUG_EXISTS', 'A category with this URL slug already exists');
    const category = await Category.create(req.body);
    res.status(201).json({ data: category });
  }));

  router.patch('/manage/:id', auth, requireCatalogRole, validate(categoryInput.partial().omit({ slug: true })), audit('category.update', 'Category'), asyncHandler(async (req, res) => {
    const current = await Category.findById(req.params.id);
    if (!current) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    if (req.body.isActive === false && current.isActive && await Product.exists({ category: current.slug, status: { $ne: 'archived' } })) {
      throw new AppError(409, 'CATEGORY_IN_USE', 'Move or archive all products in this category before deactivating it');
    }
    Object.assign(current, req.body);
    await current.save();
    res.json({ data: current });
  }));

  router.delete('/manage/:id', auth, requireCatalogRole, audit('category.delete', 'Category'), asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');

    // Cascade delete all products in this category and their variant inventory
    const products = await Product.find({ category: category.slug });
    const skus = products.flatMap((p) => (p.variants || []).map((v) => v.sku)).filter(Boolean);
    if (products.length) {
      await Product.deleteMany({ category: category.slug });
      if (skus.length) {
        await Inventory.deleteMany({ sku: { $in: skus } });
      }
    }

    const menus = await NavigationMenu.find({ 'columns.items.categorySlug': category.slug });
    for (const menu of menus) {
      menu.columns.forEach((column) => {
        column.items = column.items.filter((item) => item.categorySlug !== category.slug);
      });
      await menu.save();
    }
    await category.deleteOne();
    res.json({
      message: `Category "${category.name}" and ${products.length} associated products deleted`,
      deletedProductsCount: products.length,
    });
  }));

  router.get('/:slug', asyncHandler(async (req, res) => {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    res.json({ data: category });
  }));

  return router;
};
