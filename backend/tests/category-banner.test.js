const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const Category = require('../models/Category');
const categoryRoutes = require('../src/routes/categories');

function app() {
  const app = express();
  app.use(express.json());
  app.use('/categories', categoryRoutes({ auth: (req, _res, next) => {
    req.user = { roles: ['catalog_manager'] };
    next();
  } }));
  app.use((error, _req, res, _next) => res.status(error.status || error.statusCode || 500).json({ message: error.message }));
  return app;
}

test('category banner is persisted on updates and can be cleared', async () => {
  const original = Category.findById;
  const category = { isActive: true, async save() {} };
  Category.findById = async () => category;
  try {
    for (const bannerImage of ['https://example.com/banner.jpg', '/banner.jpg', '']) {
      const response = await request(app()).patch('/categories/manage/123').send({ bannerImage });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(category.bannerImage, bannerImage);
    }
  } finally {
    Category.findById = original;
  }
});

test('category banner rejects unsafe URLs and oversized values', async () => {
  for (const bannerImage of ['javascript:alert(1)', '//example.com/image.jpg', 'data:image/png;base64,abc', 'x'.repeat(2001)]) {
    const response = await request(app()).patch('/categories/manage/123').send({ bannerImage });
    assert.equal(response.status, 422);
  }
});
