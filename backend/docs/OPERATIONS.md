# Operations runbook

## 1. Environments

| Env | Purpose | Notes |
| --- | --- | --- |
| local | development | `npm run dev`, MongoDB replica set or Docker |
| staging | UAT with Razorpay test keys and ERP staging company | same code path as prod |
| production | live shop | TLS, `COOKIE_SECURE=true`, backups, monitoring |

## 2. Deploy

```bash
# server (Node 20+, pm2 example)
git pull && cd backend && npm ci --omit=dev
node scripts/check-files.js
pm2 start server.js --name vani-api --update-env
```

Platform notes: any Node host (Render/Railway/EC2/VPS) works. Requirements — MongoDB replica set
(Atlas recommended), outbound HTTPS to Razorpay/Shiprocket/Cloudinary/ERP, and the ability to keep one
long-running process alive (the integration worker).

## 3. Secrets

- Store `.env` outside the repo, `chmod 600`, owned by the deploy user.
- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` by deploying new values (all sessions re-login).
- Rotate `ERP_WEBHOOK_SECRET` and `RAZORPAY_WEBHOOK_SECRET` with the vendor at the same time.
- Razorpay/Shiprocket/Cloudinary credentials are never sent to the browser; the frontend only sees
  `RAZORPAY_KEY_ID`.

## 4. Backups

- MongoDB Atlas: continuous backups + daily snapshot, 30-day retention minimum.
- Self-hosted: `mongodump --uri "$MONGO_URI" --gzip --archive` nightly to object storage.
- Monthly restore drill: restore into a scratch database, boot the API against it, confirm
  `/health/ready` and a product page work.

## 5. Monitoring

| Signal | Where | Action |
| --- | --- | --- |
| `/health` liveness, `/health/ready` readiness | uptime monitor (1 min) | page on 2 consecutive failures |
| 5xx rate, p95 latency | logs (pino JSON) / host metrics | investigate `requestId` in logs |
| `IntegrationEvent` dead letters | `GET /integrations/events` | fix mapping, reset status to `pending` |
| Low stock | `GET /inventory?low=true`, admin dashboard | replenish or hide SKU |
| Pending reviews/returns | admin dashboard counters | work the queue daily |
| Failed payments | order `payment.status=failed` | contact customer, never mark paid manually |

## 6. Incident runbook

**Checkout failing (5xx on `POST /api/orders`)**
1. Check `/health/ready` — is MongoDB reachable?
2. Look for transaction errors (replica set lost primary) and `OUT_OF_STOCK` spikes.
3. If the payment provider is down, customers can still pay COD; online payment returns 503 by design.

**Webhook backlog**
1. `GET /api/integrations/events` — filter `status=dead_letter`.
2. Compare one ERP payload against the mapping table in `docs/RISHABH-ERP-INTEGRATION.md`.
3. Fix mapping/config, set the row back to `pending`, let the worker replay.

**Suspected account takeover**
1. `PATCH /api/admin/customers/:id` → `status: blocked`.
2. Inspect `GET /api/admin/audit-logs` for the actor's actions.
3. Rotate JWT secrets to invalidate every session if needed.

**Oversell reported**
1. `GET /api/inventory?sku=…` → compare `onHand`, `reserved`, `available`.
2. Reconcile with ERP stock, adjust with `PATCH /api/inventory/:sku` (`reason` is audited).
3. Mark affected orders `cancelled` and notify customers.

## 7. Go-live checklist

- [ ] MongoDB replica set + backups verified by an actual restore.
- [ ] `.env` complete: `MONGO_URI`, JWT secrets, `CORS_ORIGINS`, Razorpay keys + webhook secret,
      Shiprocket credentials, Shiprocket pickup location, ERP settings, Cloudinary.
- [ ] `npm run seed:admin` run, admin password changed from the seed value, 2FA-less owner identified.
- [ ] `npm run seed:catalog` (or real ERP import) run; 10 products spot-checked.
- [ ] Razorpay webhook URL configured: `https://<api-host>/api/webhooks/razorpay` (payment.captured,
      payment.failed).
- [ ] ERP webhook URL configured and one stock update tested end to end.
- [ ] One live COD order and one live ₹1 online order placed, packed, shipped and refunded in test mode.
- [ ] Shiprocket pickup address approved and one real label generated.
- [ ] GST invoices (or ERP vouchers) reviewed by the client's accountant for series + rates.
- [ ] Storefront wired to the API with real credentials; admin staff accounts created with least privilege.
