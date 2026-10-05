#!/usr/bin/env node
/**
 * Seeds the catalogue from the storefront demo data so the real backend and the demo frontend
 * share the same products. Safe to re-run: everything is upserted by slug/SKU.
 *
 *   node scripts/seed-catalog.js --dry-run     # parse and print, no database writes
 *   node scripts/seed-catalog.js              # upsert products + inventory
 */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

const CATALOG_FILE = process.env.FRONTEND_CATALOG || path.join(__dirname, '../../frontend/data/products.ts');
const SIZE_SURCHARGE = { XS: 0, S: 0, M: 0, L: 0, XL: 100, XXL: 200, '3XL': 300 };
const SIZE_STOCK = { XS: 4, S: 8, M: 12, L: 10, XL: 6, XXL: 4, '3XL': 2 };
const CATEGORY_SLUGS = { 'mul-cotton': 'mul-cotton', festive: 'festive', 'coord-sets': 'coord-sets', anarkalis: 'anarkalis', kurta: 'kurta-sets', saree: 'sarees' };

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function field(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return match ? match[1].replace(/\\"/g, '"') : undefined;
}

function numberField(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*(\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : undefined;
}

function parseStorefrontCatalog(source) {
  const start = source.indexOf('export const PRODUCTS');
  if (start === -1) throw new Error(`Could not find PRODUCTS export in ${CATALOG_FILE}`);
  // Skip the type annotation (`Product[]`) and start at the array literal after the `=`.
  const listStart = source.indexOf('[', source.indexOf('=', start));
  let depth = 0;
  let end = -1;
  for (let i = listStart; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    else if (source[i] === ']') { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Could not find the end of the PRODUCTS array');
  const body = source.slice(listStart + 1, end);
  const blocks = body.split(/\n\s*\{\s*\n/).slice(1);
  const products = [];
  for (const raw of blocks) {
    const block = raw.split(/\n\s*\},\s*\n/)[0];
    const title = field(block, 'title');
    const price = numberField(block, 'price');
    if (!title || !price) continue;
    const sizesMatch = block.match(/sizes:\s*\[([^\]]*)\]/);
    const sizes = sizesMatch ? sizesMatch[1].split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean) : ['S', 'M', 'L', 'XL'];
    const images = [field(block, 'image'), field(block, 'hoverImage')].filter(Boolean).map((url, position) => ({ url, alt: title, position }));
    const video = field(block, 'videoUrl');
    const mrp = numberField(block, 'originalPrice') || Math.round(price * 1.4);
    const category = CATEGORY_SLUGS[field(block, 'category')] || slugify(field(block, 'category') || 'apparel');
    products.push({
      name: title,
      slug: slugify(title),
      description: field(block, 'description') || title,
      shortDescription: field(block, 'fabric'),
      category,
      fabric: field(block, 'fabric'),
      craft: 'Handblock',
      hsnCode: category === 'sarees' || category === 'mul-cotton' ? '6211' : '6204',
      gstRate: price > 2500 ? 12 : 5,
      badges: field(block, 'badge') ? [field(block, 'badge')] : [],
      tags: [category, 'handcrafted', 'made-in-india'],
      images,
      videos: video ? [{ url: video, kind: 'loom' }] : [],
      status: 'active',
      featured: category === 'anarkalis' || category === 'festive',
      seo: { title: `${title} | Vani Collection`, description: (field(block, 'description') || title).slice(0, 155) },
      variants: sizes.map((size) => ({
        sku: `VC-${slugify(title).split('-').slice(0, 3).join('').toUpperCase().slice(0, 8)}-${size}`,
        size, color: 'As shown', mrp: mrp + (SIZE_SURCHARGE[size] || 0), price: price + (SIZE_SURCHARGE[size] || 0),
        weightGrams: category === 'sarees' ? 900 : 700,
      })),
      _stock: sizes.map((size) => ({ sku: `VC-${slugify(title).split('-').slice(0, 3).join('').toUpperCase().slice(0, 8)}-${size}`, onHand: SIZE_STOCK[size] || 5 })),
    });
  }
  return products;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const source = fs.readFileSync(CATALOG_FILE, 'utf8');
  const catalogue = parseStorefrontCatalog(source);
  if (catalogue.length === 0) throw new Error('Parsed zero products — check the storefront catalogue format');
  if (dryRun) {
    console.log(JSON.stringify({ source: CATALOG_FILE, products: catalogue.length, skus: catalogue.reduce((n, p) => n + p.variants.length, 0), sample: catalogue[0] }, null, 2));
    return;
  }
  const mongoose = require('mongoose');
  const Product = require('../models/Product');
  const Inventory = require('../models/Inventory');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  let upserted = 0;
  for (const product of catalogue) {
    const { _stock, ...doc } = product;
    await Product.updateOne({ slug: doc.slug }, { $set: doc, $setOnInsert: { createdBy: undefined } }, { upsert: true, runValidators: true });
    upserted += 1;
    for (const row of _stock) await Inventory.updateOne({ sku: row.sku, warehouseId: 'PRIMARY' }, { $set: { onHand: row.onHand }, $setOnInsert: { reorderLevel: 3 } }, { upsert: true });
  }
  console.log(`Seeded ${upserted} products with ${catalogue.reduce((n, p) => n + p.variants.length, 0)} SKUs`);
  await mongoose.connection.close();
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = { parseStorefrontCatalog, slugify, CATALOG_FILE };
