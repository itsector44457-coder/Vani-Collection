# Architecture

```
                    ┌──────────────────────────── storefront (demo) ───────────────────────────┐
                    │  Next.js 16 app  ·  will call this API when the client goes live         │
                    └───────────────────────────────────┬──────────────────────────────────────┘
                                                        │  HTTPS + httpOnly cookies
┌───────────────────────────────────────────────────────▼──────────────────────────────────────┐
│  Express 5 API (backend/)                                                                    │
│                                                                                              │
│  middleware:  helmet · cors · compression · json(+rawBody) · cookieParser · pino-http ·       │
│               rate limit · zod validation · JWT auth · RBAC · audit log                       │
│                                                                                              │
│  routes:      auth · products · inventory · orders · coupons · returns · reviews · content ·  │
│               customers · admin · uploads · shipments · integrations · webhooks · misc        │
│                                                                                              │
│  services:    tokens · pricing · shipping · rishabh-erp · shiprocket                          │
│  worker:      integration-worker (outbox drain, exponential backoff, dead letters)            │
└──────────────┬───────────────────────┬──────────────────────────────┬────────────────────────┘
               │                       │                              │
        ┌──────▼──────┐        ┌───────▼────────┐             ┌───────▼────────┐
        │  MongoDB    │        │  Razorpay      │             │  Rishabh ERP   │
        │ replica set │        │  Shiprocket    │             │  (Ujjain)      │
        └─────────────┘        └────────────────┘             └────────────────┘
```

## Layers

- `models/` — Mongoose schemas: `User`, `Product` (+ embedded variants), `Inventory`, `Order`,
  `Coupon`, `ReturnRequest`, `Review`, `Content`, `AuditLog`, `IntegrationEvent`, `Wishlist`/`Cart`.
- `src/config.js` — environment parsing with Zod; the process refuses to boot on bad config.
- `src/routes/` — thin HTTP controllers: validate → authorise → delegate to model/service → respond.
- `src/services/` — pure or provider-specific logic (`pricing`, `shipping`, `tokens`, ERP, Shiprocket).
- `src/worker/` — background processing of integration events.
- `src/middleware/` — cross-cutting concerns (auth, RBAC, validation, audit).

## Data model highlights

- **Product variants** carry `sku`, `barcode`, `size`, `color`, `mrp`, `price`, `costPrice`,
  `weightGrams`, `active`. `costPrice` is `select: false` so it never leaks to the storefront.
- **Inventory** is a separate collection keyed by `(sku, warehouseId)` with `onHand`, `reserved`,
  `reorderLevel`, `location`, `lastErpSyncAt`. Only `available = onHand − reserved` is sellable.
- **Order** stores an immutable snapshot of items (name, image, size, price, tax) so later product
  edits never rewrite history, plus `statusHistory` for a full audit trail.
- **IntegrationEvent** is the outbox/idempotency ledger for every ERP/payment interaction.

## Order lifecycle

```
pending_payment → confirmed → processing → packed → shipped → delivered
       ↓                                       ↓
   cancelled                              return_requested → returned → refunded
```

1. `POST /api/orders` validates the cart server-side (client prices are ignored).
2. Inside a transaction each line reserves stock with an atomic conditional update
   (`onHand − reserved ≥ quantity`); a failure rolls back the whole order — no oversell.
3. Totals are recomputed server-side: line totals, coupon discount (capped), GST inclusive tax and
   free shipping above ₹1999.
4. Razorpay orders are created after commit and stored as `payment.providerOrderId`; `payment.status`
   becomes `paid` only through `/api/payments/razorpay/verify` or a signed webhook.
5. COD orders are confirmed immediately.
6. Staff move status through `/api/orders/:id/status` (RBAC + audit log). Shipping creates a
   Shiprocket shipment; its webhook updates AWB/tracking.
7. Returns are allowed only on delivered/in-transit orders within 7 days, then flow through
   `requested → approved → pickup_scheduled → received → quality_check → refund_pending → completed`.

## Stock, reservations and ERP reality

- Website orders reserve stock immediately; ERP sync reconciles absolute `onHand`.
- When the ERP is the master of stock, run `POST /api/integrations/erp/sync-stock` (or let Rishabh
  push `stock.update` webhooks). Reserved quantity is never overwritten by ERP sync.
- `stock.update` events are idempotent by `idempotencyKey` (header `x-event-id`).

## Concurrency and failure handling

- Optimistic concurrency (`versionKey`) on products, inventory and orders.
- Conditional inventory updates instead of read-then-write, so concurrent checkouts cannot oversell.
- Coupon `usedCount` increments in the same transaction as the order.
- Outbox worker retries failed ERP events with backoff 30s → 2m → 10m → 1h → 6h, then marks them
  `dead_letter` for manual replay. Failures never block a customer checkout.

## Security posture

- Passwords: bcrypt (cost 12). Never logged; pino redacts `authorization`, `cookie`, `body.password`.
- Refresh tokens: JWT with unique nonce, SHA-256 hash stored on the user, rotated on every refresh
  and revoked on logout; reuse of a rotated token invalidates the session.
- Rate limiting: 600 requests / 15 min per IP for `/api`, 20 / 15 min for `/api/auth`.
- Webhooks: HMAC-SHA256 with timing-safe comparison; Razorpay and ERP signatures are rejected unless
  they match exactly, and duplicate event ids are ignored.
- RBAC: every admin route declares the roles allowed; role escalation to `super_admin` requires an
  existing `super_admin`.
- Audit log: privileged writes (`product.*`, `order.status`, `inventory.adjust`, `coupon.*`,
  `return.status`, `customer.update`, `staff.create`, `content.*`) record actor, entity, IP and time.
