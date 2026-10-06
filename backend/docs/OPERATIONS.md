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
- `SMTP_PASS` is a credential like any other. Rotate it with the provider and redeploy; queued
  messages pick the new value up on their next attempt.

### 3a. Email provider

Email is the only outbound notification channel — no WhatsApp, SMS or push is wired anywhere.

The service speaks plain SMTP through `nodemailer`, so any provider works by changing env vars
only. Nothing in the code is coupled to a vendor SDK.

| Provider | `SMTP_HOST` | `SMTP_PORT` / `SMTP_SECURE` | Auth |
| --- | --- | --- | --- |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 / `false` (STARTTLS) or 465 / `true` | SMTP username + password from IAM |
| Resend | `smtp.resend.com` | 587 / `false` | user `resend`, password = API key |
| Postmark | `smtp.postmarkapp.com` | 587 / `false` | server API token as both user and pass |
| Gmail / Workspace | `smtp.gmail.com` | 587 / `false` | App Password (never the account password) |
| Zoho | `smtp.zoho.in` | 587 / `false` | address + App Password |

Rollout:

1. Set `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
2. Set `EMAIL_FROM` to a verified sender on that domain, e.g.
   `EMAIL_FROM="Vani Collection <care@vanicollection.com>"`. An unverified From address is the
   single most common cause of silent drops.
3. Set `STOREFRONT_URL` to the canonical storefront origin — every link in every template is built
   from it, and so is the password-reset URL.
4. Keep `EMAIL_DEV_CAPTURE=true` for the first deploy, place a test order, read the fully rendered
   email out of the logs, then flip it to `false`.
5. Publish SPF, DKIM and DMARC for the sending domain before going live, or the mail lands in spam.

`DNS_SERVERS` in `backend/server.js` is a **local-development-only** workaround for ISP resolvers
that refuse the SRV lookups a `mongodb+srv://` URI needs. It is opt-in (nothing happens when the
variable is unset) and must **never** be set in production — the host resolver is already correct
there, and overriding it would route DNS through a third party.

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
| Failed / skipped email | `GET /admin/emails?status=failed`, `/admin/emails` page | fix the provider, then **Resend** from the console |
| Low stock | `GET /inventory?low=true`, admin dashboard | replenish or hide SKU |
| Pending reviews/returns | admin dashboard counters | work the queue daily |
| Failed payments | order `payment.status=failed` | contact customer, never mark paid manually |
| Loyalty points liability | `GET /admin/loyalty` → `meta.liabilityRupees` | this is money the business has promised; a sudden jump means a rate misconfiguration |
| Points expiring within 30 days | `GET /admin/loyalty` → `meta.expiringSoon` | worth a win-back email before members lose value |

## 6. Incident runbook

**Checkout failing (5xx on `POST /api/orders`)**
1. Check `/health/ready` — is MongoDB reachable?
2. Look for transaction errors (replica set lost primary) and `OUT_OF_STOCK` spikes.
3. If the payment provider is down, customers can still pay COD; online payment returns 503 by design.

**Webhook backlog**
1. `GET /api/integrations/events` — filter `status=dead_letter`.
2. Compare one ERP payload against the mapping table in `docs/RISHABH-ERP-INTEGRATION.md`.
3. Fix mapping/config, set the row back to `pending`, let the worker replay.

**Customers not receiving emails**
1. `GET /api/admin/emails?status=failed` — read `error` and `attempts`. A provider auth error says
   `SMTP_USER`/`SMTP_PASS`; a timeout says the host or port is wrong or egress 587 is blocked.
2. `GET /api/admin/emails?status=skipped` — `EMAIL_NOT_CONFIGURED` means `EMAIL_ENABLED`/`SMTP_HOST`
   are unset; `DEV_CAPTURE` means `EMAIL_DEV_CAPTURE=true` is still on.
3. Fix the config, redeploy, then replay from `/admin/emails` → **Resend** (or
   `POST /api/admin/emails/:id/resend`). Resending re-renders from the stored template input, so a
   template fix applies to the replay too.
4. Orders keep flowing the whole time — email delivery is asynchronous and cannot fail a request.

**"My points are wrong" / loyalty balances look off**
1. `GET /api/admin/loyalty/:userId` — this returns the reconciled summary. The cached balance on
   `LoyaltyAccount` is always recomputed from the ledger here, so if the two disagreed you are now
   looking at the corrected number.
2. Read the ledger rows. `order_earned` with no matching delivered order, or a missing
   `order_earned` for one that was delivered, points at the trigger rather than the arithmetic.
3. Check the earning base: points come from `amounts.subtotal − amounts.discount` only. Delivery and
   GST never earn, so a member comparing their points against the order **total** will always see a
   smaller number than they expect — that is correct, and worth explaining.
4. `/admin/loyalty` → **Reconcile balances** re-lapses anything due and rebuilds every cached balance.
   Run it before quoting a figure to a member.
5. Fix a genuine mistake with `POST /api/admin/loyalty/:userId/adjust`. A reason is mandatory, the
   entry is visible to the member and audited against your account, and it cannot take a balance below
   zero — reverse an error with an explicit compensating adjustment so the ledger still reads honestly.

**Loyalty disabled by accident**
`LOYALTY_ENABLED=false` stops earning and redeeming but keeps every read answering, so the account
screen says the programme is inactive instead of showing stale numbers as current. Points already
issued are untouched and keep their original expiry; re-enabling does not retro-award orders that were
delivered while it was off, so avoid toggling it around a sale.

**An invoice is wrong (amount, tax split, HSN or seller details)**
1. Establish *which* number is wrong before changing anything. The invoice is generated from the order
   snapshot, so it reflects what was charged at the time — a mismatch with today's product master is
   usually correct behaviour, not a bug.
2. **Tax amount** — GST is inclusive here: `taxableValue = lineTotal − taxAmount`. Compare against
   `GET /api/admin/reports/gst`, which does the same subtraction. If the two disagree, the order
   snapshot does, and that is a data problem on the order, not in the renderer.
3. **CGST/SGST versus IGST** — read "Place of Supply" and "Supply Type" off the document. If it says
   `(assumed)`, the ship-to state did not match the GSTIN state table, so the split was inferred.
   Correct the address state spelling on the order, or set `SELLER_STATE_CODE` explicitly.
4. **HSN codes showing as a dash** — the product master has no `hsnCode` for that SKU, or the product
   was archived/deleted so the lookup found nothing. Fill in the HSN on the product; codes are never
   invented to look complete.
5. **Seller block wrong or "UNREGISTERED"** — that is `SELLER_GSTIN` / `SELLER_LEGAL_NAME` /
   `SELLER_ADDRESS`. The 15-character GSTIN and 10-character PAN formats are validated at config
   parse time; malformed values prevent the process booting. A programmatically injected malformed
   GSTIN is still suppressed by the renderer and shown as `INVALID — NOT SHOWN`.
6. **Amounts print as `Rs.` and you expected `₹`** — that is deliberate and safe. See "The rupee
   glyph" in `docs/API.md`; the built-in font renders `₹` as a superscript one, so `INVOICE_FONT_PATH`
   must point at a font that exists in the runtime image.

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
- [ ] `SELLER_GSTIN` set to the real registration number (plus `SELLER_LEGAL_NAME`, `SELLER_ADDRESS`,
      `SELLER_PHONE`). Without it every invoice prints `UNREGISTERED` and tells the buyer no input tax
      credit is available — correct, but not what a registered business wants to hand out.
- [ ] One real invoice downloaded from `/admin/orders` → **Invoice** and reviewed by the client's
      accountant for series, HSN codes and rates. Check the CGST/SGST versus IGST split against a
      same-state and an out-of-state order; if the ship-to state is not one the GSTIN table knows, the
      document says "Inter-State (assumed)" and that needs a human decision.
- [ ] Decide on `INVOICE_FONT_PATH`. Unset means amounts print as `Rs. 1,23,456`; set it to a font
      carrying U+20B9 for `₹`. See "GST invoices" in `docs/API.md` — do not set it to a path that does
      not exist at runtime.
- [ ] Storefront wired to the API with real credentials; admin staff accounts created with least privilege.
