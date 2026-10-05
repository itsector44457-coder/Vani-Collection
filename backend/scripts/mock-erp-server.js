#!/usr/bin/env node
/**
 * Local stand-in for the Rishabh (Ujjain) ERP API, used to test the connector before the vendor
 * provides credentials. It implements the contract documented in docs/RISHABH-ERP-INTEGRATION.md:
 *
 *   GET  /api/items         → item master
 *   GET  /api/stock         → closing stock per SKU
 *   POST /api/sales-order   → sales voucher (honours Idempotency-Key)
 *
 *   PORT=5055 node scripts/mock-erp-server.js
 */
const express = require('express');

const app = express();
const port = Number(process.env.MOCK_ERP_PORT || 5055);
const receivedOrders = new Map();

app.use(express.json());

app.get('/api/items', (_req, res) => {
  res.json({
    items: [
      { itemCode: 'VC-GULABBAG-M', barcode: '8900000000012', size: 'M', colour: 'Rose', mrp: 3499, saleRate: 2499, hsn: '6211', gstRate: 5 },
      { itemCode: 'VC-CHANDNI-L', barcode: '8900000000029', size: 'L', colour: 'Ivory', mrp: 5499, saleRate: 4299, hsn: '6211', gstRate: 5 },
    ],
  });
});

app.get('/api/stock', (_req, res) => {
  res.json({
    items: [
      { sku: 'VC-GULABBAG-M', quantity: 12 },
      { sku: 'VC-GULABBAG-L', quantity: 7 },
      { sku: 'VC-CHANDNI-L', quantity: 3 },
    ],
  });
});

app.post('/api/sales-order', (req, res) => {
  const key = req.get('idempotency-key') || req.body.externalOrderNo;
  if (receivedOrders.has(key)) return res.json({ ...receivedOrders.get(key), duplicate: true });
  if (!req.body.items?.length) return res.status(422).json({ error: 'items are required' });
  const voucher = { id: `INV-${1000 + receivedOrders.size + 1}`, voucherNo: `UJ/26-27/${receivedOrders.size + 1}`, externalOrderNo: req.body.externalOrderNo, total: req.body.totals?.total ?? 0, acceptedAt: new Date().toISOString() };
  receivedOrders.set(key, voucher);
  res.status(201).json(voucher);
});

if (require.main === module) {
  app.listen(port, '0.0.0.0', () => console.log(`Mock Rishabh ERP listening on http://127.0.0.1:${port}`));
}

module.exports = { app, receivedOrders };
