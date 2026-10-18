# Implementation Plan — Fix `GET /api/uploads/assets` and `/assets/counts` 500s

## Diagnosis (captured, not guessed)

The backend is running on port 5000 (PID 14576, started 2026-10-18 18:08; `.env` last written 17:55 — **before** the server started, so the running process already loaded the current `.env`; this is NOT a stale-env/restart problem).

Both endpoints (`GET /api/uploads/assets/counts`, `GET /api/uploads/assets?type=image`) are auth-protected (`auth` + `requireRoles('catalog_manager','admin','super_admin')` in `backend/src/routes/uploads.js`). A raw `Invoke-WebRequest` without a token returns `401 AUTH_REQUIRED` (confirmed), so the 500 happens **after** auth passes, inside the Cloudinary call.

The Express error handler (`backend/src/app.js`) masks all 500s as `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', requestId } }`, so the endpoint body does not reveal the cause. I reproduced the exact code path (`countCloudinaryAssets` / `listCloudinaryAssets` / `cloudinary.api.ping`) with a throwaway diagnostic that configured Cloudinary from the real `.env` and called the same SDK methods. Result (same for count, list, and ping):

```
COUNT PATH THREW: { ctor: 'Object', isError: false,
  nestedHttpCode: 401, nestedMessage: 'cloud_name mismatch' }
LIST PATH THREW:  { ctor: 'Object', isError: false,
  nestedHttpCode: 401, nestedMessage: 'cloud_name mismatch' }
PING THREW:       { ctor: 'Object', isError: false,
  nestedHttpCode: 401, nestedMessage: 'cloud_name mismatch' }
```

All three Cloudinary env keys are present in `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — confirmed set).

## Root cause (two layers)

1. **Trigger — mismatched Cloudinary credentials.** Cloudinary returns `401 "cloud_name mismatch"` on every call, including `api.ping()`. That message is Cloudinary's own server-side error meaning the configured `CLOUDINARY_CLOUD_NAME` does not belong to the same account as the `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`. The keys are **present, not missing** — they are inconsistent with each other (e.g. cloud_name copied from one account and key/secret from another, or a typo in cloud_name). This matches the user's report ("added the media library keys but it still 500s").

2. **Code bug — why it surfaces as an opaque 500 instead of a clear error.** `backend/src/lib/media-assets.js` does not translate Cloudinary SDK rejections. The Cloudinary SDK (`cloudinary@2.11.0`, `node_modules/cloudinary/lib/api_client/execute_request.js`) rejects with a **plain object** `{ request_options, query_params, error: { message, http_code } }` — `isError: false`, with no top-level `.status`, `.name`, `.code`, or `.message` (they are nested under `.error`). The Express error handler computes `status = error.status || (error.name === 'ValidationError' ? 422 : 500)`, so for that plain object `status` is `undefined` and it falls back to `500`, returning the masked `"Something went wrong"`. So **any** Cloudinary failure (bad creds, rate limit, etc.) becomes a useless 500.

Per the task's env-var clause, the fix is made robust in code (surface the real error clearly) and the user is told the **specific** action — not "add another var."

## Files to change

- `backend/src/lib/media-assets.js` — the only module both failing endpoints call; it is used exclusively by `backend/src/routes/uploads.js` (verified), so fixing here is targeted to the uploads endpoints.
- `backend/tests/unit.test.js` — add one focused, offline test mirroring the existing Cloudinary mock pattern.

No changes to `uploads.js`, `app.js`, `.env`, or the error handler. `uploadOrReuse` / `isDuplicateAssetError` are left untouched (out of scope; they have a separate latent `error.http_code` vs `error.error.http_code` mismatch but are not part of this bug).

## Plan items

- [ ] 1. Add Cloudinary error normalization to `media-assets.js`.
      Add `const { AppError } = require('./errors');` after the existing `node:crypto` require (top of file). Add a helper (place it right after `isDuplicateAssetError`):
      ```js
      // The Cloudinary SDK rejects with a plain object shaped { error: { http_code, message } }
      // (not an Error), so the Express handler falls back to a 500 and returns a generic message.
      // Translate it into a clear AppError so a misconfigured media library surfaces the real cause.
      function normalizeCloudinaryError(error) {
        const httpCode = error?.error?.http_code || error?.http_code;
        const message = error?.error?.message || error?.message || 'Cloudinary request failed';
        if (httpCode === 401 || httpCode === 403) {
          throw new AppError(503, 'MEDIA_NOT_CONFIGURED', `Cloudinary credentials rejected by provider: ${message}`);
        }
        throw new AppError(502, 'MEDIA_REQUEST_FAILED', message);
      }
      ```
      Wrap the two SDK calls so errors are normalized (success paths unchanged):
      - In `listCloudinaryAssets`: change `const result = await request.execute();` to `let result; try { result = await request.execute(); } catch (error) { throw normalizeCloudinaryError(error); }` (the `return { ... }` mapping stays as-is).
      - In `countCloudinaryAssets`: wrap the `await cloudinary.search...execute()` so the catch throws `normalizeCloudinaryError(error)`, keeping `return result.total_count || 0;`.
      Files: `backend/src/lib/media-assets.js`
      Verify: `cd backend; node --test --test-name-pattern="Cloudinary" tests/unit.test.js` → existing 3 Cloudinary tests still pass (success paths untouched). Then `npm run check` → no syntax errors.

- [ ] 2. Add a focused unit test for the error-translation path.
      In `backend/tests/unit.test.js`, after the existing `'Cloudinary media count filters by folder and resource type'` test, add (mirrors the existing mock pattern; fully offline — no real Cloudinary, no DB):
      ```js
      test('Cloudinary media errors surface a clear MEDIA_NOT_CONFIGURED error instead of a raw 500', async () => {
        const cloudinary = {
          search: {
            expression() { return this; },
            sort_by() { return this; },
            max_results() { return this; },
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
      Files: `backend/tests/unit.test.js`
      Verify: `cd backend; node --test --test-name-pattern="Cloudinary" tests/unit.test.js` → 4 Cloudinary tests pass (3 existing + 1 new). Run `npm test` only if a local MongoDB on `127.0.0.1:27017` is available (the suite's DB-backed tests need it; the Cloudinary tests do not).

- [ ] 3. Restart the backend and verify the endpoint-level behavior end-to-end.
      The code change needs a restart to take effect. Stop the existing server on port 5000 and start `node server.js` in the background (never block on a foreground dev server):
      ```powershell
      $c = Get-NetTCPConnection -LocalPort 5000 -State Listen -EA SilentlyContinue | Select-Object -First 1
      if ($c) { Stop-Process -Id $c.OwningProcess -Force }
      # start in background from backend/
      ```
      Then obtain an admin token and hit both endpoints (capture non-2xx bodies):
      - Mint a token (temp, delete after): a small `node` script that `require('dotenv').config()`, connects with `MONGO_URI`, loads `User` (find one with `status:'active'` and `roles` including `admin`/`super_admin`/`catalog_manager`), and signs `jwt.sign({ sub: String(user._id) }, config.JWT_ACCESS_SECRET, { issuer:'vani-api', audience:'vani-web', expiresIn:'15m' })`. Print the token. (The auth middleware accepts `Authorization: Bearer <token>`.)
      - `Invoke-WebRequest http://localhost:5000/api/uploads/assets/counts  -Headers @{Authorization="Bearer <token>"}` (wrap in try/catch to read the body on non-2xx).
      - `Invoke-WebRequest "http://localhost:5000/api/uploads/assets?type=image" -Headers @{Authorization="Bearer <token>"}` (same).
      Files: none (verification only)
      Verify:
      - **Before the fix** the masked response is `500 { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', requestId } }`.
      - **After the fix** (creds still mismatched) both return `503 { error: { code: 'MEDIA_NOT_CONFIGURED', message: 'Cloudinary credentials rejected by provider: cloud_name mismatch', requestId } }` — the real cause is now visible to the operator, not a generic 500.

- [ ] 4. User action to reach `200` (the code fix cannot manufacture valid credentials).
      The endpoints return `200` with data only once the Cloudinary credentials are consistent. Required: ensure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env` all come from the **same** Cloudinary account (Dashboard shows the cloud_name; Settings → API Keys shows the key/secret). Then restart the backend.
      Verify: after the corrected `.env` + restart, `GET /api/uploads/assets/counts` → `200 { data: { images, videos, total } }` and `GET /api/uploads/assets?type=image` → `200 { data: [...], meta: { total, nextCursor } }`.

## Summary of the before/after (failing endpoint responses)

| | `/assets/counts` and `/assets?type=image` |
|---|---|
| Before fix | `500` `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', requestId } }` (underlying Cloudinary `401 "cloud_name mismatch"` hidden) |
| After code fix (creds still mismatched) | `503` `{ error: { code: 'MEDIA_NOT_CONFIGURED', message: 'Cloudinary credentials rejected by provider: cloud_name mismatch', requestId } }` |
| After user corrects creds + restart | `200` counts `{ data: { images, videos, total } }`; assets `{ data: [...], meta: { total, nextCursor } }` |
