# Vani Collection — Commerce Backend

Production backend for the Vani Collection storefront: catalogue, inventory, checkout, orders,
payments, shipping, returns, reviews, coupons, CMS, reporting and the admin panel APIs, plus the
integration layer that connects the shop to the client's **Rishabh (Ujjain) ERP**.

The storefront in `/frontend` is still the demo presentation layer. Everything in this folder is
real: real database models, real authentication, real stock reservation, real payment/webhook
verification, real role-based admin APIs and a real ERP sync pipeline.

---

## 1. Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 20+ (CommonJS), Express 5 |
| Database | MongoDB (Mongoose 9) — replica set required, orders use transactions |
| Auth | JWT access (15 min, httpOnly cookie or `Authorization: Bearer`) + rotating refresh tokens |
| Validation | Zod schemas on every write endpoint |
| Security | helmet, CORS allow-list, rate limiting, hashed refresh tokens, audit log |
| Payments | Razorpay (order create + signature verify + refunds + webhooks) |
| Shipping | Shiprocket (auth, adhoc order create, AWB/tracking webhooks) |
| ERP | Rishabh ERP REST adapter + HMAC-signed inbound webhooks + outbox worker |
| Media | Cloudinary (signed server-side uploads) |
| Logging | pino + pino-http with request ids |

## 2. Quick start

```bash
cd backend
cp .env.example .env          # fill secrets
npm install
npm run seed:admin            # creates the super admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:catalog          # imports the demo catalogue as real products + SKUs + stock
npm run dev                   # http://localhost:5000
```

Health checks: `GET /health` (liveness) and `GET /health/ready` (503 until MongoDB is connected).

### MongoDB

MongoDB **must** run as a replica set because order placement, stock reservation and ERP events use
transactions. Local example:

```bash
mongod --replSet rs0 --dbpath ./data/db
mongosh --eval "rs.initiate()"
# MONGO_URI=mongodb://127.0.0.1:27017/vani_collection?replicaSet=rs0
```

MongoDB Atlas works out of the box (it is always a replica set). Docker users: `docker compose up`.
If an ISP resolver refuses Atlas SRV lookups during local development, add
`DNS_SERVERS=8.8.8.8,1.1.1.1` to `.env` and retry. This local-only setting is honored by the API
server and admin seed script; do not set it in production.

## 3. Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Production server |
| `npm run dev` | Server with `--watch` |
| `npm run check` | Syntax-check every backend JS file |
| `npm test` | Unit tests always run; database/API integration tests run when MongoDB is reachable (otherwise they skip) |
| `npm run seed:admin` | Create/repair the super admin account |
| `npm run seed:catalog` | Upsert products, variants and stock (`--dry-run` prints without writing) |
| `npm run mock:erp` | Local stand-in for the Rishabh ERP API to test the connector |
| `npm run routes` | Print every registered API route (69 today) |

## 4. Roles

| Role | Can do |
| --- | --- |
| `customer` | Own profile, addresses, wishlist, orders, returns, reviews |
| `support` | Read orders/customers/returns, reply to reviews |
| `warehouse` | Inventory adjustments, order packing/shipping status, Shiprocket shipments |
| `catalog_manager` | Products, media uploads, CMS content |
| `finance` | Coupons, refunds, sales + GST reports |
| `admin` | Everything except granting `super_admin` |
| `super_admin` | Full control, ERP sync triggers, staff management |

## 5. Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, data model, order lifecycle, outbox worker.
- [`docs/API.md`](docs/API.md) — every endpoint with payloads and role requirements.
- [`docs/RISHABH-ERP-INTEGRATION.md`](docs/RISHABH-ERP-INTEGRATION.md) — what the Ujjain vendor must
  provide, field mapping, webhook contract and sync strategy.
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — deploy, backup, monitoring, incident runbook, go-live checklist.

## 6. Deployment notes

- Run behind TLS (Nginx/Caddy/Render/Railway). Set `COOKIE_SECURE=true` in production so auth cookies
  are `Secure`; the API expects to sit behind a proxy (`trust proxy` is enabled).
- Add the storefront origin(s) to `CORS_ORIGINS`; cookies are sent with credentials.
- Production disables Mongoose `autoIndex`; after deploying the admin catalogue product-sales index,
  create it during a controlled maintenance window with
  `db.orders.createIndex({ "items.productId": 1, status: 1 })`.
- Set the frontend build-time `NEXT_PUBLIC_API_URL` to the HTTPS API origin. Admin login uses staff
  email/password and httpOnly session cookies; it does not require an API key.
- Use `COOKIE_SAMESITE=none` with `COOKIE_SECURE=true` only when the storefront and API are cross-site.
  For same-site deployments, including separate subdomains, `COOKIE_SAMESITE=lax` is sufficient.
- Keep `JWT_*_SECRET` values ≥ 32 characters and rotate them by deploying a new value (all sessions
  then require re-login).
- The integration worker starts with the server and drains `IntegrationEvent` rows every 60 seconds
  with exponential backoff; run more than one API instance and the worker still uses atomic
  claim/update, so events are not processed twice.
