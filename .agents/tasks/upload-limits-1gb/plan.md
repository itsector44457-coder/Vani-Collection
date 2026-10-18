# Implementation Plan — 1 GB per-file upload cap, no count limits

## Goal

Remove every existing image/video upload size cap (8 MB image, 50 MB video) and every
file-count cap (6 images, 1 video), and replace with a single rule: **per-file max =
1073741824 bytes (1 GB)** for both images and videos, with **no count limit**. File-type
restrictions (image/* and video/* only) stay. User-facing limit text is updated to match.

The user-visible error that triggered this (`GET /api/uploads/assets/counts` 500) was a
Cloudinary-credentials problem and is already resolved ("sab chalne laga"). This plan only
addresses the upload size/count limits requested afterwards.

---

## Findings (grounded in code read)

### Upload points enumerated

| # | Point | File (path:line) | Current value | New value |
|---|-------|------------------|---------------|-----------|
| B1 | Backend image multer config | `backend/src/routes/uploads.js:12` | `limits: { fileSize: 8 * 1024 * 1024, files: 6 }` | `limits: { fileSize: 1073741824 }` (drop `files`) |
| B2 | Backend video multer config | `backend/src/routes/uploads.js:13` | `limits: { fileSize: 50 * 1024 * 1024, files: 1 }` | `limits: { fileSize: 1073741824 }` (drop `files`) |
| B3 | Backend images route field/count | `backend/src/routes/uploads.js` (`POST /api/uploads/images`) | `imageUpload.array('files', 6)` | `imageUpload.array('files')` (no maxCount) |
| B4 | Backend videos route field/count | `backend/src/routes/uploads.js` (`POST /api/uploads/videos`) | `videoUpload.single('file')`; handler reads `req.file` | `videoUpload.array('file')`; handler reads `req.files`, maps upload |
| F1 | Frontend client count caps | `frontend/lib/api-client.ts:184-185` | `video && files.length !== 1` → throw; `image && files.length > 6` → throw | remove both throws |
| F2 | Frontend client send field | `frontend/lib/api-client.ts:189-192` | image: append each under `files`; video: append `files[0]` under `file` | both: append every file under `files` (image) / `file` (video) |
| F3 | Frontend client size check | `frontend/components/admin/MediaUploadField.tsx:21-24` | `maxSize = isImage ? 8*1024*1024 : 50*1024*1024` | `maxSize = 1073741824` (both) |
| F4 | Frontend size error text | `frontend/components/admin/MediaUploadField.tsx:23` | `… no larger than ${isImage ? "8 MB" : "50 MB"}` | `Each file must be no larger than 1 GB.` |
| F5 | Frontend hint label | `frontend/components/admin/MediaUploadField.tsx:61` | `isImage ? "Up to 6 files, 8 MB each" : "One video, up to 50 MB"` | `Max 1 GB per file` |
| F6 | Frontend multi-select input | `frontend/components/admin/MediaUploadField.tsx:51` | `multiple={multiple ?? isImage}` (video defaults false) | `multiple={multiple ?? true}` (video defaults true; explicit `false` still honored via `??`) |

### Decisions (one chosen where multiple viable)

1. **Video endpoint becomes multi-file (`single` → `array`).** Requirement #3 says remove
   file-count caps "so users can upload as many as they want." Leaving video on
   `videoUpload.single('file')` keeps a structural count cap of 1, which violates that
   requirement. Converting to `videoUpload.array('file')` and reading `req.files` makes
   video consistent with images (unlimited count, 1 GB each). Rationale recorded; this is
   the faithful interpretation. The response shape stays `{ data: [...] }` (array of
   results), so `frontend/lib/api-client.ts`'s `payload.data?.map(item => item.url)` keeps
   working for both endpoints.

2. **Keep a client-side 1 GB check in the frontend.** Requirement #1 says enforce 1 GB "at
   every upload point." A client `file.size > 1073741824` check gives fast feedback before a
   large upload is sent, and the backend multer cap is the authoritative enforcement. Both
   use the same byte value.

3. **Use the literal `1073741824`** (with a `// 1 GB` comment) in both backend and
   frontend, per "use the byte value 1073741824 consistently." Multer takes a number, so no
   human string is used anywhere.

4. **Keep type restrictions.** `accept="image/*"`/`"video/*"` on the input and the
   `mimetype.startsWith('image/'|'video/')` checks in `uploads.js` stay unchanged.
   "Unlimited" means no size/count restriction, not "accept any file type."

### Concurrent-edit conflict (media-assets.js)

`backend/src/lib/media-assets.js` is being edited by another workflow. **Do NOT plan or
make any change to it.** I read it: it contains **no upload size limit** —
`uploadOrReuse` streams `file.buffer` to Cloudinary via `upload_stream` with no
`max_file_size`/size cap. The 1 GB cap is therefore enforced entirely at the **multer
middleware layer** (backend) and the **client-side check** (frontend), not in
`media-assets.js`. Nothing in that file needs to change to satisfy this task.

### Out-of-scope findings (NOT modified — flagging for transparency)

- `backend/src/routes/returns.js` and `backend/src/routes/reviews.js` cap the number of
  image **URLs** a customer may attach to a return/review (`images: z.array(z.url()).max(3)`
  / `.max(4)` / `.max(6)`). These are **URL fields, not file uploads** — no `multer`, no
  `file.size`, no MB limit. The 1 GB requirement does not apply (URLs have no byte size).
  They are left untouched. If the user also wants those URL-count caps removed, that is a
  separate request.
- `frontend/.next/required-server-files.js` contains `proxyClientMaxBodySize: 10485760`
  (10 MB). This is a **Next.js build artifact**, not source, and the frontend does **not**
  proxy uploads through a Next route handler — `uploadAdminMedia` `fetch`es the backend
  (port 5000) directly. Searched `frontend/app/api/**` for `export const config`,
  `bodyParser`, `sizeLimit`, `bodySize`: **no matches**. So no Next route handler body-size
  limit silently caps uploads. Nothing to change.
- `backend/src/app.js` sets `express.json({ limit: '1mb' })`. This parses
  `application/json` only and does **not** affect `multipart/form-data` uploads (multer
  handles those). No change.

### Caveat (noted, not a deviation)

Multer uses `memoryStorage`, so each file is buffered fully in RAM before upload to
Cloudinary. A 1 GB file therefore consumes ~1 GB RAM per file, and unlimited count means
several such buffers can exist in one request. This is an inherent property of the
existing storage choice, raised by the user's explicit "unlimited + 1 GB" request. The
plan implements the cap as requested; switching to `diskStorage` would be a separate
optimization not asked for here.

### Build/test commands (from package.json)

- Backend: `cd backend && npm run check` (`node --check server.js` + `scripts/check-files.js`)
  and `cd backend && npm test` (`node --test --test-concurrency=1 "tests/*.test.js"`).
  DB-backed tests skip when MongoDB is unavailable; the route-surface and HTTP-layer tests
  in `backend/tests/unit.test.js` run unconditionally and assert `POST /api/uploads/images`,
  `POST /api/uploads/videos` exist and unauthenticated uploads return 401 — these stay valid.
- Frontend: `cd frontend && npm run lint` (`eslint . --max-warnings=0`) and
  `cd frontend && npm run build` (`next build`). This is a Next 16 / React 19 project; the
  frontend `AGENTS.md` says to consult `node_modules/next/dist/docs/` before writing code.
  Our edits touch only a plain TS api-client function and a React component — no Next route
  handler, server action, or config — so breaking-change risk is low, but heed the rule.

---

## Implementation Plan

- [ ] 1. Update multer configs and route handlers in `backend/src/routes/uploads.js`.
      Set both `imageUpload` and `videoUpload` to `multer({ storage: multer.memoryStorage(), limits: { fileSize: 1073741824 } })` (drop `files` from both). Change the images route to `handleUpload(imageUpload.array('files'))` (remove the `6` maxCount). Change the videos route from `videoUpload.single('file')` to `videoUpload.array('file')` and rewrite its handler to read `req.files`: throw `NO_FILES` when `!req.files?.length`, throw `INVALID_MEDIA_TYPE` when any `req.files.some((f) => !f.mimetype.startsWith('video/'))`, then `const uploaded = await Promise.all(req.files.map((file) => uploadOrReuse(cloudinary, file, 'video'))); res.status(201).json({ data: uploaded });`. Keep the `LIMIT_FILE_SIZE → 413` handling and the image mimetype check unchanged. The 1 GB cap and type restrictions are now enforced at the middleware layer; `media-assets.js` is NOT touched.
      Files: `backend/src/routes/uploads.js`
      Verify: `cd backend && npm run check && npm test` — `check` passes; tests pass (route-surface test still sees `POST /api/uploads/images` + `POST /api/uploads/videos`; unauthenticated-upload 401 assertions still hold). No DB required for those assertions.

- [ ] 2. Remove count caps and fix the send field in `frontend/lib/api-client.ts` `uploadAdminMedia`.
      Delete the two `INVALID_FILE_COUNT` throws (`type === "video" && files.length !== 1` and `type === "image" && files.length > 6`). In `send()`, append every file under the correct field: `const field = type === "image" ? "files" : "file"; files.forEach((file) => form.append(field, file));` — field names must match the backend from item 1 (`files` for images, `file` for videos). Leave the `urls.length !== files.length` response check as-is (it still holds for 1..N files).
      Files: `frontend/lib/api-client.ts`
      Verify: `cd frontend && npm run lint && npm run build` — lint clean (`--max-warnings=0`), build succeeds. Depends on item 1's field-name contract (`file` for videos) being in place so the two sides agree.

- [ ] 3. Apply the 1 GB client cap, update labels, and enable multi-select for video in `frontend/components/admin/MediaUploadField.tsx`.
      Replace `const maxSize = isImage ? 8 * 1024 * 1024 : 50 * 1024 * 1024;` with `const maxSize = 1073741824; // 1 GB` (same for both). Change the size error to `Each file must be no larger than 1 GB.` Change the hint span to `Max 1 GB per file`. Change `multiple={multiple ?? isImage}` to `multiple={multiple ?? true}` so video defaults to multi-select (callers passing `multiple={false}`, e.g. the reels thumbnail, are still honored via `??`). Keep `accept={isImage ? "image/*" : "video/*"}` and the `file.type.startsWith(`${type}/`)` mimetype check unchanged (type restriction stays).
      Files: `frontend/components/admin/MediaUploadField.tsx`
      Verify: `cd frontend && npm run lint && npm run build` — lint clean, build succeeds.

- [ ] 4. Final cross-cut verification (backend + frontend together).
      Run the full backend test suite and the frontend lint+build in sequence to confirm the whole change set is green and the codebase is in a buildable state end to end.
      Verify: `cd backend && npm test && cd ..\frontend && npm run lint && npm run build` — all pass. Then a quick manual smoke in the admin console: an image picker and a video picker both show the hint "Max 1 GB per file", a >1 GB selection is rejected client-side, and a previously-rejected ~50 MB video now uploads successfully against a running backend on port 5000.
