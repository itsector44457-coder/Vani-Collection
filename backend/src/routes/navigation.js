const express = require('express');
const { z } = require('zod');
const NavigationMenu = require('../../models/NavigationMenu');
const NavigationSettings = require('../../models/NavigationSettings');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const { ensureCategories } = require('../lib/category-defaults');
const { mergeNavigationMenus } = require('../lib/navigation-defaults');

const DEFAULT_ANNOUNCEMENTS = [
  '✦ Free Express Shipping Above ₹1,999',
  '✦ 100% Certified Pure Mul Cotton Handcrafted in Jaipur',
  '✦ Cash On Delivery & 7-Day Free Exchanges',
];
const DEFAULT_LINKS = [
  { label: 'Stories', href: '/#stories', isActive: true },
  { label: 'Reels', href: '/reels', isActive: true },
  { label: 'Living Looks', href: '/#products', isActive: true },
];
const DEFAULT_SETTINGS = {
  key: 'storefront',
  theme: 'atelier',
  brandName: 'Vani Collection',
  brandTagline: 'Atelier · Jaipur',
  logoUrl: '',
  collectionLabel: 'Collections',
  announcements: DEFAULT_ANNOUNCEMENTS,
  links: DEFAULT_LINKS,
  colors: {
    announcementBg: '#1c1917',
    announcementText: '#dfc28c',
    announcementBorder: '#2d2520',
    headerBg: '#faf7f2',
    headerText: '#292524',
    accent: '#881337',
    mobileDrawerBg: '#faf7f2',
    mobileBottomBg: '#faf7f2',
  },
};
const color = z.string().regex(/^#[\da-f]{6}$/i, 'Enter a six-digit hex color');
const settingsInput = z.object({
  theme: z.enum(['atelier', 'midnight', 'forest', 'custom']),
  brandName: z.string().trim().min(1).max(80),
  brandTagline: z.string().trim().max(100),
  logoUrl: z.string().trim().max(500).refine((value) => !value || value.startsWith('/') || /^https?:\/\//i.test(value), 'Use an HTTP URL or root-relative logo path'),
  collectionLabel: z.string().trim().min(1).max(60),
  announcements: z.array(z.string().trim().min(1).max(180)).max(8),
  links: z.array(z.object({
    label: z.string().trim().min(1).max(60),
    href: z.string().trim().max(300).refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Use an internal storefront path'),
    isActive: z.boolean(),
  })).max(8),
  colors: z.object({
    announcementBg: color,
    announcementText: color,
    announcementBorder: color,
    headerBg: color,
    headerText: color,
    accent: color,
    mobileDrawerBg: color,
    mobileBottomBg: color,
  }),
});

async function getSettings() {
  const saved = await NavigationSettings.findOne({ key: 'storefront' }).lean();
  return { ...DEFAULT_SETTINGS, ...(saved || {}), colors: { ...DEFAULT_SETTINGS.colors, ...(saved?.colors || {}) } };
}

const menuInput = z.object({
  label: z.string().trim().min(2).max(60),
  position: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  columns: z.array(z.object({
    title: z.string().trim().min(2).max(60),
    items: z.array(z.object({
      label: z.string().trim().min(1).max(80),
      href: z.string().trim().max(300).refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Use an internal storefront path').optional(),
      categorySlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    })).max(20),
  })).max(8),
});

module.exports = ({ auth }) => {
  const router = express.Router();
  const requireCatalogRole = requireRoles('catalog_manager', 'admin', 'super_admin');

  router.get('/manage', auth, requireCatalogRole, asyncHandler(async (_req, res) => {
    const saved = await NavigationMenu.find({}).sort({ position: 1 }).lean();
    res.json({ data: mergeNavigationMenus(saved) });
  }));

  router.get('/manage/settings', auth, requireCatalogRole, asyncHandler(async (_req, res) => {
    res.json({ data: await getSettings() });
  }));

  router.put('/manage/settings', auth, requireCatalogRole, validate(settingsInput), audit('navigation.settings.update', 'NavigationSettings'), asyncHandler(async (req, res) => {
    const settings = await NavigationSettings.findOneAndUpdate(
      { key: 'storefront' },
      { ...req.body, key: 'storefront', updatedBy: req.user.id },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ data: { ...DEFAULT_SETTINGS, ...settings, colors: { ...DEFAULT_SETTINGS.colors, ...settings.colors } } });
  }));

  router.put('/manage/:key', auth, requireCatalogRole, validate(menuInput), audit('navigation.update', 'NavigationMenu'), asyncHandler(async (req, res) => {
    if (!['lookbook', 'shop-by-price'].includes(req.params.key)) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found');
    const slugs = req.body.columns.flatMap((column) => column.items.map((item) => item.categorySlug).filter(Boolean));
    if (slugs.length && await Category.countDocuments({ slug: { $in: slugs }, isActive: true }) !== new Set(slugs).size) {
      return res.status(422).json({ error: { code: 'INVALID_CATEGORY_LINK', message: 'Every linked category must exist and be active' } });
    }
    const defaults = mergeNavigationMenus([]);
    const menu = await NavigationMenu.findOneAndUpdate(
      { key: req.params.key },
      { ...req.body, key: req.params.key, position: req.body.position ?? defaults.find((entry) => entry.key === req.params.key).position },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({ data: menu });
  }));

  router.get('/', asyncHandler(async (_req, res) => {
    await ensureCategories(Category, Product);
    const [categories, savedMenus] = await Promise.all([
      Category.find({ isActive: true }).sort({ position: 1, name: 1 }).lean(),
      NavigationMenu.find({}).sort({ position: 1 }).lean(),
    ]);
    const activeSlugs = new Set(categories.map((category) => category.slug));
    const menus = mergeNavigationMenus(savedMenus).map((menu) => ({
      ...menu,
      columns: menu.columns.map((column) => ({
        ...column,
        items: column.items.filter((item) => !item.categorySlug || activeSlugs.has(item.categorySlug)),
      })).filter((column) => column.items.length > 0),
    }));
    res.json({ data: { categories, menus, settings: await getSettings() } });
  }));

  return router;
};
