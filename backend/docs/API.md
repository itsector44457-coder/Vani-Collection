# API reference

Base URL: `https://<api-host>/api` · JSON in / JSON out · auth via httpOnly `accessToken` cookie or
`Authorization: Bearer <token>`.

Error envelope:

```json
{ "error": { "code": "OUT_OF_STOCK", "message": "VC-AN-01-M has insufficient stock", "requestId": "…" } }
```

Common codes: `AUTH_REQUIRED` 401, `FORBIDDEN` 403, `ROUTE_NOT_FOUND` 404, `VALIDATION_ERROR` 422,
`OUT_OF_STOCK` 409, `RATE_LIMITED` 429, `PAYMENT_NOT_CONFIGURED` / `ERP_NOT_CONFIGURED` 503.

## Health

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | liveness + DB state |
| GET | `/health/ready` | 503 until MongoDB is connected |

## Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | email, password (≥8), firstName, lastName?, phone? | sets auth cookies, 409 on duplicate |
| POST | `/auth/login` | email, password | rate limited (20 / 15 min) |
| POST | `/auth/refresh` | — (cookie) | rotates refresh token, 401 on reuse |
| POST | `/auth/logout` | — | revokes refresh token |
| GET | `/auth/me` | — | current user |

## Catalogue (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products?page&limit&category&q` | paginated active products (`costPrice` hidden) |
| GET | `/products/:slug` | product + per-SKU available stock |
| GET | `/search?q=` | lightweight typeahead (≥2 chars) |
| GET | `/content/:key` | published CMS block/page |
| GET | `/content?kind=` | list published content |
| GET | `/reviews/product/:productId` | published reviews |
| GET | `/reviews/summary/:productId` | average, count, distribution |
| GET | `/shipping/serviceability?pincode=` | serviceable, COD, ETA, fee, free-shipping threshold |
| POST | `/shipping/rates` | pincode + subtotal → fee and total |
| POST | `/coupons/validate` | code + subtotal → discount or 422 reason |

## Reels (public)

The `/reels` feed on the storefront. Every published reel carries a `product` object including its
sellable `variants`, so a shopper can add to bag straight from the feed with no second request.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/reels?limit&productId&tag` | published reels, ordered by `position` then newest first |
| GET | `/reels/:id` | one published reel |
| POST | `/reels/:id/engage` | `{ action, identity? }` → `{ liked, likes, views, shares, cartAdds }` |

`action` is one of `like`, `unlike`, `view`, `share`, `cart_add`. `identity` is a stable per-browser
id for guests (a signed-in session is keyed on the user automatically). Likes are idempotent per
identity, so refreshing cannot inflate a count, and a repeat `view` from the same identity within
24h is not counted again. Anonymous callers must send `identity` or get 422 `IDENTITY_REQUIRED`.

## Customer (authenticated)

| Method | Path | Notes |
| --- | --- | --- |
| GET/PATCH | `/customers/profile` | name/phone |
| GET/POST | `/customers/addresses` | `isDefault` handling |
| PATCH/DELETE | `/customers/addresses/:id` | |
| GET/PUT | `/customers/wishlist` | `PUT` body `{ productId, sku? }` |
| DELETE | `/customers/wishlist/:productId` | |
| GET | `/customers/exports/orders` | CSV of own orders |
| POST | `/orders` | items `[{ productId, sku, quantity }]`, shippingAddress, paymentMethod `razorpay|cod`, couponCode? |
| GET | `/orders/mine` | own orders |
| GET | `/orders/:id` | own order (staff can read any) |
| POST | `/payments/razorpay/verify` | orderId + razorpay_order_id/payment_id/signature |
| POST | `/returns` | orderId, type, items[{ sku, quantity, reason }] |
| GET | `/returns/mine` | own return requests |
| POST | `/reviews` | productId, rating, body (moderated before publishing) |

Order response for online payments includes:

```json
{ "data": { "…order" }, "payment": { "id": "order_XXX", "amount": 249900, "currency": "INR", "keyId": "rzp_live_…" } }
```

## Staff

| Method | Path | Roles |
| --- | --- | --- |
| GET | `/orders?page&limit&status` | support, warehouse, finance, admin, super_admin |
| PATCH | `/orders/:id/status` | warehouse, support, admin, super_admin |
| GET | `/inventory?sku&low=true` | warehouse, catalog_manager, admin, super_admin |
| PATCH | `/inventory/:sku` | adjustment/onHand/reorderLevel + `reason` (audited) |
| POST | `/products`, PATCH `/products/:id`, DELETE `/products/:id` | catalog_manager, admin, super_admin |
| GET | `/reviews?status=`, PATCH `/reviews/:id` | support, admin, super_admin |
| GET/POST/PATCH/DELETE | `/coupons` | finance, admin, super_admin |
| GET | `/returns`, PATCH `/returns/:id` | support, finance, admin, super_admin |
| POST | `/uploads/images` (multipart `files`) | catalog_manager, admin, super_admin |
| GET | `/uploads/signature?type=video\|image&folder=reels\|products\|content` | signed Cloudinary direct upload — catalog_manager, admin, super_admin |
| GET | `/reels/admin?status&q&limit` | all reels incl. drafts, with published/draft counts |
| POST | `/reels`, PATCH `/reels/:id` | catalog_manager, admin, super_admin |
| PATCH | `/reels/reorder` | `{ order: [id…] }` rewrites feed positions |
| DELETE | `/reels/:id?purge=false` | admin, super_admin — also destroys the Cloudinary assets |
| POST | `/shipments/:orderId/create` | warehouse, admin, super_admin |
| POST | `/refunds/:orderId` | finance, admin, super_admin |
| GET | `/admin/dashboard` | any staff role |
| GET | `/admin/catalogue?q&status&category&page&limit` | products with per-SKU availability, low-stock count, units sold, revenue |
| GET | `/admin/customers`, GET `/admin/customers/:id` | support, admin, super_admin |
| PATCH | `/admin/customers/:id` (status, roles) | admin, super_admin |
| GET/POST | `/admin/staff` | admin, super_admin |
| GET | `/admin/audit-logs?action&limit` | admin, super_admin |
| GET | `/admin/reports/sales?days=` | finance, admin, super_admin |
| GET | `/admin/reports/gst?month=YYYY-MM` | finance, admin, super_admin |

## Media uploads (Cloudinary)

Reel videos are far too large to proxy through this API, so they stream **browser → Cloudinary**
using a signature minted by a staff-authenticated request:

1. `GET /uploads/signature?type=video&folder=reels` → `{ cloudName, apiKey, signature, timestamp, folder, resourceType, uploadUrl, maxBytes }`
2. `POST {uploadUrl}` as `multipart/form-data` with `file`, `api_key`, `timestamp`, `signature`, `folder`
3. Save the returned `secure_url` as `videoUrl` and `public_id` as `videoPublicId` on the reel

The signature covers exactly `folder` + `timestamp`, so those two form fields must match what was
signed. `folder` comes from an allowlist (`vani-collection/reels`, `…/products`, `…/content`) — the
query value selects one of those keys and can never inject a path. Video uploads are capped at
300 MB, images at 8 MB. Storing `videoPublicId` is what lets `DELETE /reels/:id` destroy the asset.

Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`; without them the
endpoint answers 503 `MEDIA_NOT_CONFIGURED`.

## Integrations

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/integrations/erp/sync-stock` | pull stock from Rishabh ERP and upsert inventory (admin) |
| POST | `/integrations/erp/push-order/:orderId` | send an order to the ERP (admin) |
| POST | `/integrations/erp/webhook` | HMAC `x-erp-signature`, `x-event-id` for idempotency |
| GET | `/integrations/events` | outbox ledger: pending/failed/succeeded/dead_letter (admin) |
| POST | `/webhooks/razorpay` | signature verified, marks orders paid/failed |

### ERP webhook payloads

```json
{ "type": "stock.update",  "items": [{ "sku": "VC-AN-01-M", "quantity": 12, "warehouseId": "PRIMARY" }] }
{ "type": "price.update",  "items": [{ "sku": "VC-AN-01-M", "price": 3499, "mrp": 4999 }] }
{ "type": "order.status",  "orderNumber": "VC1712345678901", "orderStatus": "shipped", "erpOrderId": "INV-2041", "note": "Dispatched" }
```
