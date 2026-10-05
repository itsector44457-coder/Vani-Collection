const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { parseStorefrontCatalog, slugify, CATALOG_FILE } = require('../scripts/seed-catalog');

test('storefront catalogue parsing is stable and produces sellable variants', (t) => {
  if (!fs.existsSync(CATALOG_FILE)) return t.skip(`storefront catalogue missing at ${CATALOG_FILE}`);
  const products = parseStorefrontCatalog(fs.readFileSync(CATALOG_FILE, 'utf8'));
  assert.ok(products.length >= 4, 'expected at least four demo products');
  const skus = new Set();
  for (const product of products) {
    assert.match(product.slug, /^[a-z0-9-]+$/);
    assert.ok(product.name.length > 3);
    assert.ok(product.variants.length > 0);
    assert.ok(['mul-cotton', 'festive', 'coord-sets', 'anarkalis', 'kurta-sets', 'sarees', 'apparel'].includes(product.category));
    for (const variant of product.variants) {
      assert.ok(variant.price > 0 && variant.mrp >= variant.price, `${variant.sku} must not sell above MRP`);
      assert.ok(!skus.has(variant.sku), `duplicate SKU ${variant.sku}`);
      skus.add(variant.sku);
    }
    assert.ok(product.images.every((image) => image.url.startsWith('https://')));
  }
  const totals = products.reduce((sum, p) => sum + p._stock.length, 0);
  assert.equal(totals, skus.size, 'every SKU needs an inventory row');
});

test('slugify produces url-safe handles', () => {
  assert.equal(slugify('Gulab Bagh  Handblock – Anarkali Set!'), 'gulab-bagh-handblock-anarkali-set');
});
