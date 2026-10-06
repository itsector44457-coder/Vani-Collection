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

### Content blocks the storefront reads

`GET /content?kind=` returns published blocks ordered by `position`. The homepage maps each kind onto
a section, and falls back to its bundled copy per kind — so a partially populated CMS renders a mix
of live and bundled content rather than all-or-nothing. Fields an editor leaves blank inherit from
the bundled block at the same position.

| `kind` | Homepage section | Fields used |
| --- | --- | --- |
| `banner` | hero slides, in `position` order | `title`, `subtitle`, `body`, `ctaLabel`, `ctaHref`, `media[0].url`, `blocks.tag`, `blocks.position` |
| `testimonial` | customer reviews | `title`, `body`, `blocks.{name,city,rating,verified,date,product}` |
| `lookbook` | shoppable lookbook (**first published block only**) | `title`, `subtitle`, `media[0].url`, `blocks.pins[]` |
| `faq` | FAQ accordion **and** `FAQPage` JSON-LD | `title` = question, `body` = answer |
| `section` | category story tiles | `title`, `subtitle`, `media[0].url`, `blocks.{count,filterKey}` |
| `page`, `policy` | standalone copy | not consumed by the homepage |

Two rules the storefront enforces, both to avoid publishing something untrue:

- A block missing the fields its section cannot render without (a banner with no title or no image, a
  testimonial with no name or no text, a FAQ with a question but no answer) is dropped, not
  half-rendered.
- `faq` blocks drive the visible accordion and the `FAQPage` markup from the *same* array. Nothing is
  ever marked up that the reader cannot see.

`blocks` is `Schema.Types.Mixed` — the backend does not validate its contents, so the admin editor
validates it as JSON before saving.

Suggested key convention: `<area>.<kind>.<sequence>`, e.g. `home.banner.1`, `home.faq.shipping`.
Keys are the stable id, so `PUT /content/:key` upserts and a key should never be renamed in place.


## Customer (authenticated)

| Method | Path | Notes |
| --- | --- | --- |
| GET/PATCH | `/customers/profile` | name/phone |
| GET/POST | `/customers/addresses` | `isDefault` handling |
| PATCH/DELETE | `/customers/addresses/:id` | |
| GET/PUT | `/customers/wishlist` | `PUT` body `{ productId, sku? }` **or** `{ items: [{ productId, sku? }] }` to merge a guest list in one call |
| DELETE | `/customers/wishlist/:productId` | removes every row for that product, whatever its `sku` |
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

### Wishlist shape and idempotence

`GET /customers/wishlist` populates `items.productId` so the account screen gets names, images and
prices in the same round trip. Because populate replaces the ObjectId with the whole document, each
row is serialised with the id as a **string** and the document moved to `product`:

```json
{ "data": [{ "productId": "6650f1a2…", "sku": "VC-SR-02-DW", "addedAt": "…", "product": { "name": "…", "slug": "…" } }], "meta": { "total": 1 } }
```

The storefront compares against string ids (`wishlist.includes(product.id)`), so returning the
populated object in `productId` made a signed-in shopper's saved wishlist never match — and the
object was then written into `localStorage` as `"[object Object]"`.

Writes are de-duplicated **by `productId`**, not by whole subdocument:

- Saving the same product twice is a no-op, and so is saving it with a different `sku`.
- `PUT { items: [...] }` merges a guest list in one request, de-duplicating within the request and
  against what is already saved. `meta.added` / `meta.alreadySaved` report what happened.
- Each insert is a guarded `$push` (`items.productId: { $ne: id }`) inside a `bulkWrite`, evaluated
  against the committed document, so the concurrent requests a sign-in merge fires cannot duplicate
  rows. `$addToSet` is deliberately not used: it compares every field of the subdocument including
  the `addedAt` default Mongoose applies while casting, so it appended a new row on *every* call.
- `productId` must be a 24-hex ObjectId; anything else is a `422 VALIDATION_ERROR` rather than a cast
  failure. Guest/demo ids (`vani-1`) are filtered out client-side and never sent.
- `DELETE /customers/wishlist/:productId` pulls every row for that product whatever its `sku`, so
  removing a product saved in two sizes clears it completely.

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
| GET | `/admin/emails?status&template&to&page&limit` | support, admin, super_admin — outbound email log with status/template counts |
| GET | `/admin/emails/:id` | support, admin, super_admin — one entry including the stored template input |
| POST | `/admin/emails/:id/resend` | support, admin, super_admin — re-renders and re-enqueues a failed/skipped email (audited) |
| GET | `/refunds/pending?status&page&limit` | finance, admin, super_admin — paid orders that were cancelled or returned |
| GET | `/admin/loyalty?tier&q&page&limit&refresh=true` | any staff role — members, tier breakdown, ledger totals, points liability. `refresh=true` first lapses anything due and reconciles each cached balance against the ledger |
| GET | `/admin/loyalty/:userId` | support, finance, admin, super_admin — one member's summary plus their last 100 ledger rows |
| POST | `/admin/loyalty/:userId/adjust` | finance, admin, super_admin — `{ delta, note }`; `note` is mandatory and the change is audited |

## Loyalty

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/loyalty/me` | balance, rupee value, tier and progress, points expiring within 30 days, redemption limits, own referral code and referral count, lifetime totals. Lapses anything due first, so the number shown is the number spendable |
| GET | `/loyalty/transactions?limit=` | the member's ledger, newest first |
| POST | `/loyalty/redeem` | `{ points, orderValue?, requestId? }` → a single-use discount code. Idempotent on `requestId` (or the `Idempotency-Key` header) |
| POST | `/loyalty/referral` | `{ code }` — claims a referral, paying the bonus to both sides |
| GET | `/loyalty/referral` | the member's own shareable code, created lazily |

### How points behave

- **Earning.** 1 point per `LOYALTY_RUPEES_PER_POINT` (default ₹100) of *net goods value* —
  `amounts.subtotal − amounts.discount`. Delivery charges and GST are excluded: awarding points on tax
  would rebate money that goes straight to the exchequer, and on shipping it would reward the
  courier's cost. Points are awarded on the **transition** into `delivered`, and only when the money
  has arrived (COD counts as collected at the door; an online order must be `paid`).
- **Idempotence.** Every movement carries a `requestId` on a unique index. Awarding is keyed
  `order-earned:<orderId>`, so a duplicated webhook, a retried status update or a re-run backfill
  cannot award twice. A repeated redemption returns the coupon already issued instead of spending
  again.
- **Expiry.** Points lapse `LOYALTY_EXPIRY_MONTHS` (default 12) after they are earned. Each earn is a
  *batch* with its own `remaining` and `expiresAt`; expiry is applied lazily before any read or spend
  and writes an `expired` ledger row per batch.
- **Redemption is FIFO.** The oldest batches are consumed first, so points that are about to lapse are
  spent before ones that are not.
- **Discounts are whole rupees**, capped at `LOYALTY_MAX_REDEMPTION_PERCENT` (default 50%) of the order
  value. Exceeding the cap **clamps rather than fails**: the response reports `capped: true` with the
  points actually used, and the rest stays in the balance. The resulting coupon is `type: fixed`,
  `usageLimit: 1`, `minOrderValue` equal to its own value, and `issuedTo` the member — so it cannot be
  passed on or used anonymously, and can never zero out a basket.
- **Tiers** (Silver / Gold / Platinum) are thresholds on `lifetimePoints`, which only ever grows.
  Redeeming or letting points expire never demotes a member. Thresholds are
  `LOYALTY_TIER_GOLD_POINTS` / `LOYALTY_TIER_PLATINUM_POINTS`.
- **Referrals** pay `LOYALTY_REFERRAL_BONUS_POINTS` (default 200) to *both* sides. One code per
  account (`referredBy` is set at most once), self-referral is rejected, and each award is keyed on the
  pair so a replay cannot mint points. A bad code at sign-up is reported in the response `meta` but
  never fails registration — the account is still created and the code can be claimed later.
- **A loyalty failure never fails a request.** `awardLoyaltyForOrder` catches and logs; a warehouse
  operator marking an order delivered is never blocked by the rewards programme.
- Set `LOYALTY_ENABLED=false` to stop earning and redeeming. Reads still answer, so the account screen
  can say the programme is inactive rather than showing stale numbers as current.


## Transactional email

Email is the **only** notification channel. There is no WhatsApp, SMS or push integration anywhere in
this codebase, by design.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | queues `welcome` |
| POST | `/auth/forgot-password` | queues `password-reset`; 202 with an identical body whether or not the address exists |
| POST | `/auth/reset-password` | queues `password-changed` |
| POST | `/orders` | queues `order-confirmation` to the account email or the order's guest email |
| PATCH | `/orders/:id/status` | queues `order-status` (confirmed / processing / packed / shipped / delivered / cancelled) |
| POST | `/orders/:id/cancel` | queues `order-cancelled` |
| POST | `/shipments/:orderId/create` | queues `order-status` — the shipped variant when Shiprocket returned an AWB |
| POST/PATCH | `/returns`, `/returns/:id` | queues `return-status` for every step of the ladder |
| POST | `/refunds/:orderId` | queues `refund-processed` |

Delivery is asynchronous: a trigger renders the message, writes an `EmailLog` row and an
`IntegrationEvent` (`provider: "email"`, `eventType: "email.send"`), then returns. The mail worker
drains that outbox every 15 s with the same backoff ladder as the ERP events
(30 s → 2 m → 10 m → 1 h → 6 h) and dead-letters what it cannot deliver.

Consequences worth remembering:

- **An email failure can never fail an HTTP request.** If SMTP is down the shopper still gets a 201.
- With `EMAIL_ENABLED=false` (or no `SMTP_HOST`) every trigger logs the intent and stores a
  `skipped` EmailLog, so the API runs with zero email configuration.
- `EMAIL_DEV_CAPTURE=true` renders the message and writes it to the log instead of sending it.
- Triggers are idempotent: the outbox key is `email.send:<template>:<to>:<dedupeKey>`, so a
  double-submitted checkout cannot send two confirmations.

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
