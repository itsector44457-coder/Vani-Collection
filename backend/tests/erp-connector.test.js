const assert = require('node:assert/strict');
const test = require('node:test');
const { app: mockErp, receivedOrders } = require('../scripts/mock-erp-server');
const { RishabhErpClient } = require('../src/services/rishabh-erp');
const { AppError } = require('../src/lib/errors');

const baseConfig = {
  ERP_ENABLED: true,
  ERP_BASE_URL: '',
  ERP_AUTH_HEADER: 'Authorization',
  ERP_AUTH_TOKEN: 'test-token',
  ERP_PRODUCTS_PATH: '/api/items',
  ERP_STOCK_PATH: '/api/stock',
  ERP_ORDERS_PATH: '/api/sales-order',
  ERP_TIMEOUT_MS: 2000,
};

let server;
let baseUrl;

test.before(async () => {
  server = mockErp.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('connector refuses to call a disabled or unconfigured ERP', async () => {
  const client = new RishabhErpClient({ ...baseConfig, ERP_ENABLED: false, ERP_BASE_URL: baseUrl });
  await assert.rejects(() => client.getStock(), (error) => error instanceof AppError && error.code === 'ERP_NOT_CONFIGURED');
  const missingUrl = new RishabhErpClient({ ...baseConfig, ERP_BASE_URL: '' });
  await assert.rejects(() => missingUrl.getProducts(), (error) => error.code === 'ERP_NOT_CONFIGURED');
});

test('stock pull returns the vendor payload shape used by the sync route', async () => {
  const client = new RishabhErpClient({ ...baseConfig, ERP_BASE_URL: baseUrl });
  const payload = await client.getStock();
  assert.ok(Array.isArray(payload.items));
  assert.equal(payload.items[0].sku, 'VC-GULABBAG-M');
  assert.equal(typeof payload.items[0].quantity, 'number');
});

test('order push maps our order to an ERP sales voucher and is idempotent', async () => {
  const client = new RishabhErpClient({ ...baseConfig, ERP_BASE_URL: baseUrl });
  const order = {
    orderNumber: 'VC-TEST-1',
    createdAt: new Date('2026-10-05T09:12:00.000Z'),
    shippingAddress: { fullName: 'Test Buyer', phone: '9876543210', email: 'buyer@example.com', line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' },
    items: [{ sku: 'VC-GULABBAG-M', quantity: 1, unitPrice: 2499, gstRate: 5 }],
    amounts: { subtotal: 2499, discount: 0, shipping: 0, tax: 119, total: 2499, currency: 'INR' },
    payment: { method: 'razorpay' },
  };
  const voucher = await client.pushOrder(order);
  assert.ok(voucher.id.startsWith('INV-'));
  assert.equal(voucher.externalOrderNo, 'VC-TEST-1');
  assert.equal(voucher.total, 2499);
  const again = await client.pushOrder(order);
  assert.equal(again.id, voucher.id, 'replaying the same order must not create a second voucher');
  assert.equal(receivedOrders.size, 1);
});

test('ERP failures surface as 502s instead of crashing the request', async () => {
  const client = new RishabhErpClient({ ...baseConfig, ERP_BASE_URL: baseUrl, ERP_STOCK_PATH: '/api/not-a-real-endpoint' });
  await assert.rejects(() => client.getStock(), (error) => error.code === 'ERP_REQUEST_FAILED' && error.status === 502);
});
