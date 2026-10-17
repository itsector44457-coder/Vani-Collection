#!/usr/bin/env node
require('dotenv').config();

if (process.env.DNS_SERVERS) {
  const dns = require('dns');
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

const mongoose = require('mongoose');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../src/lib/category-defaults');

async function seedCategories() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is missing');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const cat of DEFAULT_CATEGORIES) {
    const res = await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          slug: cat.slug,
          navigationGroup: cat.navigationGroup,
          position: cat.position,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Upserted category: ${res.name} (${res.slug})`);
  }

  const all = await Category.find({}).sort({ position: 1 });
  console.log(`Total categories in database: ${all.length}`);
  await mongoose.disconnect();
}

seedCategories().catch((err) => {
  console.error('Error seeding categories:', err);
  process.exit(1);
});
