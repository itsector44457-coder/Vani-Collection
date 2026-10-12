const DEFAULT_CATEGORIES = [
  { name: 'Mul Cotton', slug: 'mul-cotton', navigationGroup: 'By Fabric', position: 0 },
  { name: 'Festive Edit', slug: 'festive', navigationGroup: 'By Occasion', position: 1 },
  { name: 'Co-ord Sets', slug: 'coord-sets', navigationGroup: 'By Style', position: 2 },
  { name: 'Anarkalis', slug: 'anarkalis', navigationGroup: 'By Style', position: 3 },
  { name: 'Kurta Sets', slug: 'kurta-sets', navigationGroup: 'By Style', position: 4 },
  { name: 'Sarees', slug: 'sarees', navigationGroup: 'By Style', position: 5 },
  { name: 'Dupattas', slug: 'dupattas', navigationGroup: 'By Style', position: 6 },
];

const CategorySetup = require('../../models/CategorySetup');
const slugLabel = (slug) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

async function ensureCategories(Category, Product) {
  if (await CategorySetup.exists({ _id: 'initial-seed' })) return;
  const existingSlugs = new Set(await Category.distinct('slug'));
  const productCategories = await Product.distinct('category');
  const known = new Map(DEFAULT_CATEGORIES.map((category) => [category.slug, category]));
  for (const value of productCategories) {
    const slug = String(value || '').toLowerCase().trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || known.has(slug)) continue;
    known.set(slug, { name: slugLabel(slug), slug, navigationGroup: 'Collections', position: known.size });
  }
  const missing = [...known.values()].filter((category) => !existingSlugs.has(category.slug));
  if (missing.length) {
    try {
      await Category.bulkWrite(missing.map((category) => ({
        updateOne: { filter: { slug: category.slug }, update: { $setOnInsert: category }, upsert: true },
      })));
    } catch (error) {
      if (error.code !== 11000) throw error;
      const resolvedSlugs = new Set(await Category.distinct('slug'));
      if (missing.some((category) => !resolvedSlugs.has(category.slug))) throw error;
    }
  }
  await CategorySetup.updateOne(
    { _id: 'initial-seed' },
    { $setOnInsert: { initializedAt: new Date() } },
    { upsert: true },
  );
}

module.exports = { DEFAULT_CATEGORIES, ensureCategories };
