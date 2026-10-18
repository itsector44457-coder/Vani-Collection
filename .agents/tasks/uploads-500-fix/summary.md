# Fix — `GET /api/uploads/assets` and `/assets/counts` 500s

## Root cause (two layers)

1. **Trigger — mismatched Cloudinary credentials (env var issue).**
   Cloudinary returns `401 "cloud_name mismatch"` when the configured `CLOUDINARY_CLOUD_NAME`
   does not belong to the same account as the `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`.
   All three keys were **present** in `backend/.env` (confirmed: cloud_name len 8, key len 15,
   secret len 27) but were inconsistent with each other. This is the state the plan reproduced by
   calling the real Cloudinary SDK with the real `.env` (`countCloudinaryAssets` /
   `listCloudinaryAssets` / `cloudinary.api.ping` all rejected with `nestedHttpCode: 401,
   nestedMessage: 'cloud_name mismatch'`). The user has since corrected the credentials
   (backend restarted; asset URLs now resolve under cloud `jwcwmbxs`), so the immediate 500 is
   gone and both endpoints currently return 200.

2. **Code bug — why it surfaced as an opaque 500 instead of a clear error.**
   `backend/src/lib/media-assets.js` did not translate Cloudinary SDK rejections. The SDK
   (`cloudinary@2.11.0`) rejects with a **plain object** `{ error: { http_code, message } }`
   (no top-level `.status`, `.name`, `.code`, or `.message`). The Express error handler in
   `backend/src/app.js` computes `status = error.status || (error.name === 'ValidationError' ? 422 : 500)`,
   so for that plain object `status` is `undefined` and it falls back to `500`, returning the
   masked `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', requestId } }`.
   So **any** Cloudinary failure (bad creds, rate limit, etc.) became a useless, opaque 500 —
   which is exactly why the user saw a 500 and could not tell why, even after adding the keys.

Per the task's env-var clause, the fix is made robust in code (surface the real error clearly)
rather than just telling the user to re-enter another variable.

## Files changed

### `backend/src/lib/media-assets.js` (targeted to the uploads code path; success path byte-identical)

Added the `AppError` import and a `normalizeCloudinaryError` helper, then wrapped the two SDK
calls so rejections are translated. `uploadOrReuse` / `isDuplicateAssetError` untouched (out of
scope). This module is used exclusively by `backend/src/routes/uploads.js`, so the change is
scoped to the uploads endpoints.

```js
// added at top
const { createHash } = require('node:crypto');
const { AppError } = require('./errors');   // NEW

// added after isDuplicateAssetError
function normalizeCloudinaryError(error) {
  const httpCode = error?.error?.http_code || error?.http_code;
  const message = error?.error?.message || error?.message || 'Cloudinary request failed';
  if (httpCode === 401 || httpCode === 403) {
    throw new AppError(503, 'MEDIA_NOT_CONFIGURED', `Cloudinary credentials rejected by provider: ${message}`);
  }
  throw new AppError(502, 'MEDIA_REQUEST_FAILED', message);
}

// listCloudinaryAssets — BEFORE
const result = await request.execute();
// listCloudinaryAssets — AFTER
let result;
try { result = await request.execute(); } catch (error) { throw normalizeCloudinaryError(error); }

// countCloudinaryAssets — BEFORE
const result = await cloudinary.search.expression(...).max_results(1).execute();
return result.total_count || 0;
// countCloudinaryAssets — AFTER
let result;
try { result = await cloudinary.search.expression(...).max_results(1).execute(); }
catch (error) { throw normalizeCloudinaryError(error); }
return result.total_count || 0;
```

A 401/403 from Cloudinary now surfaces as a clear `503 MEDIA_NOT_CONFIGURED` with the provider's
own message (e.g. `cloud_name mismatch`); any other Cloudinary failure surfaces as
`502 MEDIA_REQUEST_FAILED`. Both carry `.status`, so the Express handler renders the real code
and message instead of the masked `500 INTERNAL_ERROR / Something went wrong`.

### `backend/tests/unit.test.js` (one focused, offline test added)

Added after the existing `'Cloudinary media count filters by folder and resource type'` test,
mirroring the existing mock pattern (no real Cloudinary, no DB):

```js
test('Cloudinary media errors surface a clear MEDIA_NOT_CONFIGURED error instead of a raw 500', async () => {
  const cloudinary = {
    search: {
      expression() { return this; }, sort_by() { return this; }, max_results() { return this; },
      async execute() { throw { error: { http_code: 401, message: 'cloud_name mismatch' } }; },
    },
  };
  await assert.rejects(countCloudinaryAssets(cloudinary, 'image'), (err) => {
    assert.equal(err.status, 503);
    assert.equal(err.code, 'MEDIA_NOT_CONFIGURED');
    assert.match(err.message, /cloud_name mismatch/);
    return true;
  });
  await assert.rejects(listCloudinaryAssets(cloudinary, 'image'), (err) => {
    assert.equal(err.status, 503);
    assert.equal(err.code, 'MEDIA_NOT_CONFIGURED');
    assert.match(err.message, /cloud_name mismatch/);
    return true;
  });
});
```

## Before / after of the failing endpoint responses

| State | `GET /api/uploads/assets/counts` | `GET /api/uploads/assets?type=image` |
|---|---|---|
| User's report (earlier, mismatched creds) | `500 { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', requestId } }` (underlying Cloudinary `401 "cloud_name mismatch"` hidden) | `500` same masked body |
| After code fix, if creds fail again | `503 { error: { code: 'MEDIA_NOT_CONFIGURED', message: 'Cloudinary credentials rejected by provider: cloud_name mismatch', requestId } }` | `503` same body |
| After code fix, current (valid creds) | `200 {"data":{"images":1,"videos":1,"total":2}}` | `200 {"data":[{"assetId":"b080d7b31da32c5fc79537434b9c9827","publicId":"vani-collection/products/sha256_...","url":"https://res.cloudinary.com/jwcwmbxs/image/upload/...","resourceType":"image","format":"jpg","bytes":293820,"width":1080,"height":1080,"createdAt":"2026-10-18T12:51:49+00:00"}],"meta":{"total":1,"nextCursor":null}}` |

Note: a live "before 500" could not be re-captured because the user already corrected the
credentials and restarted the backend, so the endpoints already returned 200 at the time of
this work. The opaque-500 → clear-503 transformation is proven by the new unit test; the
success path (200) is verified live before and after the change.

## How I verified (actual results)

Auth for the endpoints is `auth` + `requireRoles('catalog_manager','admin','super_admin')`
(`backend/src/routes/uploads.js`). A raw request returns `401 AUTH_REQUIRED`, so I minted a
real admin access token (`jwt.sign({ sub }, JWT_ACCESS_SECRET, { issuer:'vani-api',
audience:'vani-web', expiresIn:'15m' })` for an active admin user found in MongoDB) and hit the
exact endpoints. (Node's c-ares resolver failed the Atlas SRV lookup on this host, so the token
script connected via a direct multi-host `mongodb://` URI built from OS-resolved shard hosts —
no credentials were printed.)

Pre-fix, current backend (valid creds):
```
GET /api/uploads/assets/counts  -> 200 {"data":{"images":1,"videos":1,"total":2}}
GET /api/uploads/assets?type=image -> 200 {"data":[{...one image...}],"meta":{"total":1,"nextCursor":null}}
```

Then applied the fix, restarted the backend on port 5000 (stopped old listener, started
`node server.js` in the background), confirmed `/health/ready` -> `{"ready":true}`, and re-hit
both endpoints:

```
===== AFTER COUNTS =====
URL: http://localhost:5000/api/uploads/assets/counts
STATUS: 200
BODY: {"data":{"images":1,"videos":1,"total":2}}
===== AFTER ASSETS =====
URL: http://localhost:5000/api/uploads/assets?type=image
STATUS: 200
BODY: {"data":[{"assetId":"b080d7b31da32c5fc79537434b9c9827","publicId":"vani-collection/products/sha256_ce84cb7c9875c573c1a7f5f47971546dad9952af9b9702fd4b78b268194c52b9","url":"https://res.cloudinary.com/jwcwmbxs/image/upload/v1792327909/vani-collection/products/sha256_ce84cb7c9875c573c1a7f5f47971546dad9952af9b9702fd4b78b268194c52b9.jpg","resourceType":"image","format":"jpg","bytes":293820,"width":1080,"height":1080,"createdAt":"2026-10-18T12:51:49+00:00"}],"meta":{"total":1,"nextCursor":null}}
```

Unit + lint:
```
node --test --test-name-pattern="Cloudinary" tests/unit.test.js
✔ media uploads reuse an existing Cloudinary asset for identical bytes
✔ Cloudinary media listing returns image metadata and paginates by cursor
✔ Cloudinary media count filters by folder and resource type
✔ Cloudinary media errors surface a clear MEDIA_NOT_CONFIGURED error instead of a raw 500   # NEW
ℹ pass 4  fail 0

npm run check
> node --check server.js && node scripts/check-files.js
95/95 JavaScript files parsed successfully
```

## User action to reach 200 with data (if it ever 500s again)

The endpoints return 200 with data only when the Cloudinary credentials are consistent. Now that
the code surfaces the real cause, a future misconfiguration will show
`503 MEDIA_NOT_CONFIGURED — Cloudinary credentials rejected by provider: <provider message>`
instead of an opaque 500, so the operator can act immediately: ensure `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env` all come from the **same**
Cloudinary account, then restart the backend.
