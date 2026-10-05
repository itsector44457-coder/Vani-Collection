# Rishabh ERP (Ujjain) integration

The client's shop runs on ERP software from **Rishabh Group India, Ujjain** (apparel/retail billing and
inventory). That vendor's public website lists billing, barcode and fashion-enterprise modules but no
public API documentation, so the connector is implemented as a **configuration-driven adapter** with a
confirmed field contract on our side. Only the vendor's exact paths/auth need to be filled in.

Everything lives in `src/services/rishabh-erp.js` and `src/routes/integrations.js`.

## 1. What we need from the vendor (no secrets in chat)

| # | Question | Why |
| --- | --- | --- |
| 1 | Is there a REST/SOAP API, or only a local SQL database (.bak/MDF) / CSV export? | decides pull vs. file-drop connector |
| 2 | API base URL, environment (test/prod) and documentation/sample responses | fill `ERP_BASE_URL`, `ERP_*_PATH` |
| 3 | Auth type: API key, bearer token, Basic, or IP allow-list | fill `ERP_AUTH_HEADER` / `ERP_AUTH_TOKEN` |
| 4 | Does it support **outbound webhooks** for stock/price/order status? | push sync instead of polling |
| 5 | Item master fields: item code, barcode, size, colour, MRP, sale rate, HSN, GST %, unit, stock | field mapping |
| 6 | Sales voucher (invoice) creation payload + idempotency support | order push |
| 7 | Which location/warehouse codes exist (e.g. Ujjain store, godown) | multi-warehouse stock |
| 8 | Rate limits, maintenance windows, IP whitelisting for our server | reliability |
| 9 | Is a staging/test company available for UAT? | go-live safety |
| 10 | Who signs off on invoice numbering/GST series for online orders? | compliance |

Send us: **API documentation PDF/link + one sample response per endpoint** (product master, stock,
sales order). Never share credentials in chat — put them in the server `.env`.

## 2. Configuration

```env
ERP_ENABLED=true
ERP_BASE_URL=https://erp.example.com            # vendor base URL
ERP_AUTH_HEADER=Authorization                  # or x-api-key
ERP_AUTH_TOKEN=<token>                         # server .env only
ERP_PRODUCTS_PATH=/api/items
ERP_STOCK_PATH=/api/stock
ERP_ORDERS_PATH=/api/sales-order
ERP_TIMEOUT_MS=15000
ERP_WEBHOOK_SECRET=<random-32-chars>           # vendor signs with HMAC-SHA256
```

While `ERP_ENABLED=false`, every ERP endpoint answers `503 ERP_NOT_CONFIGURED` — the shop keeps
selling and orders queue as `erpSyncStatus: pending`.

## 3. Mapping (our model → ERP)

### Inbound: item master / price (`POST /integrations/erp/webhook`)

| ERP field | Our field |
| --- | --- |
| `itemCode` / `sku` | `Product.variants[].sku` |
| `barcode` | `Product.variants[].barcode` |
| `size`, `colour` | `Product.variants[].size`, `.color` |
| `mrp` | `Product.variants[].mrp` |
| `saleRate` / `rate` | `Product.variants[].price` |
| `hsn`, `gstRate` | `Product.hsnCode`, `Product.gstRate` |

### Inbound: stock

| ERP field | Our field |
| --- | --- |
| `sku` | `Inventory.sku` |
| `warehouseId` / `godown` | `Inventory.warehouseId` |
| `quantity` / `stock` / `closingQty` | `Inventory.onHand` (reserved stock is preserved) |

### Outbound: order → sales voucher

`POST /integrations/erp/push-order/:orderId` sends (idempotency header `Idempotency-Key: <orderNumber>`):

```json
{
  "externalOrderNo": "VC1712345678901",
  "orderDate": "2026-10-05T09:12:00.000Z",
  "customer": { "name": "…", "mobile": "…", "email": "…" },
  "shippingAddress": { "line1": "…", "city": "Ujjain", "state": "Madhya Pradesh", "pincode": "456010" },
  "items": [{ "sku": "VC-AN-01-M", "quantity": 1, "rate": 2499, "gstRate": 5 }],
  "totals": { "subtotal": 2499, "discount": 0, "shipping": 0, "tax": 119, "total": 2499, "currency": "INR" },
  "paymentMode": "razorpay"
}
```

If the vendor's field names differ, change **only** `RishabhErpClient.pushOrder()` — the mapping is
isolated there on purpose.

## 4. Sync strategy

| Direction | Trigger | Mechanism |
| --- | --- | --- |
| Stock ← ERP | every 15 min (cron) and/or vendor webhook | `POST /integrations/erp/sync-stock`, `stock.update` events |
| Price ← ERP | vendor webhook | `price.update` events |
| Order → ERP | after payment_confirmed / COD confirm | `erpSyncStatus=pending`, worker/manual push |
| Order status ← ERP | vendor webhook | `order.status` events (packed/shipped/cancelled) |

Reliability rules:

- Every inbound event needs an `x-event-id`; duplicates are ignored (unique `idempotencyKey`).
- Signature is HMAC-SHA256 over the **raw** body with `ERP_WEBHOOK_SECRET`; invalid signatures → 401.
- Failed events retry with backoff (30s → 2m → 10m → 1h → 6h) then `dead_letter`; inspect with
  `GET /integrations/events` and replay by resetting the row's `status` to `pending`.
- ERP downtime never blocks checkout: orders are stored with `erpSyncStatus: pending`.
- Always reconcile counts daily: ERP stock vs `Inventory.onHand`, and orders vs ERP vouchers.

## 5. Test the connector without the vendor

A stand-in ERP that implements the expected contract ships with the backend, so the whole pipeline can
be exercised before Rishabh provides credentials:

```bash
npm run mock:erp                       # http://127.0.0.1:5055  (items, stock, sales-order)
ERP_ENABLED=true ERP_BASE_URL=http://127.0.0.1:5055 npm run dev
curl -X POST localhost:5000/api/integrations/erp/sync-stock -H "authorization: Bearer <admin token>"
```

`tests/erp-connector.test.js` asserts the pull/push mapping, the `Idempotency-Key` behaviour and the
`502 ERP_REQUEST_FAILED` path using this stand-in, so a vendor payload change fails CI instead of
production.

## 6. Go-live checklist for the connector

1. Vendor provides API docs + sample payloads and a staging company.
2. Fill ERP env vars on the server; set `ERP_ENABLED=true`.
3. Run `POST /integrations/erp/sync-stock`; compare 10 SKUs by hand against the ERP.
4. Place one ₹1 test order (COD) and confirm the sales voucher appears in the ERP with the same total/GST.
5. Configure the vendor webhook URL: `https://<api-host>/api/integrations/erp/webhook` with the shared secret.
6. Confirm order status changes flow back and reach the customer notification path.
7. Agree a daily reconciliation report owner (who checks dead letters and stock mismatch).
