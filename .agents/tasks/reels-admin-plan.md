# Admin Reels Management System Implementation Plan

## Backend Implementation

### 1. Create Reel Model
- [ ] 1. Create backend/models/Reel.js with mongoose schema.
      Include: title (String, required), description (String), videoUrl (String, required), thumbnailUrl (String), productId (ObjectId ref to Product), position (Number, default 0), isActive (Boolean, default true), createdBy/updatedBy (ObjectId refs to User), timestamps with optimistic concurrency.
      Files: backend/models/Reel.js
      Verify: `node --check server.js` passes validation, model exports properly.

### 2. Create Admin API Routes  
- [ ] 2. Create backend/src/routes/reels.js with admin CRUD endpoints.
      Routes: GET /api/admin/reels (list with pagination), POST /api/admin/reels (create), PATCH /api/admin/reels/:id (update), DELETE /api/admin/reels/:id (set isActive: false). Use requireRoles('catalog_manager','admin','super_admin'), asyncHandler wrapper, zod validation, and audit middleware following admin.js patterns.
      Files: backend/src/routes/reels.js
      Verify: `npm run routes` shows new reels endpoints listed.

- [ ] 3. Add zod validation schemas for reel operations.
      Schema fields: title (string, min 1), description (optional string), videoUrl (url string), thumbnailUrl (optional url string), productId (optional string), position (optional number), isActive (optional boolean).
      Files: backend/src/routes/reels.js  
      Verify: POST with invalid data returns 422 with validation errors.

- [ ] 4. Mount reels router in backend/src/app.js.
      Add mount('/api/admin/reels', require('./routes/reels')({ auth })); following existing admin route patterns.
      Files: backend/src/app.js
      Verify: `npm run test` passes, reels routes accessible at /api/admin/reels.

## Frontend Implementation  

### 5. Add API Client Functions
- [ ] 5. Add reel types and API functions to frontend/lib/api-client.ts.
      Types: Reel interface (id, title, description, videoUrl, thumbnailUrl, productId, position, isActive, createdAt, updatedAt), AdminReel extending Reel. Functions: api.reels(params, signal), api.createReel(data), api.updateReel(id, data), api.deleteReel(id).
      Files: frontend/lib/api-client.ts
      Verify: TypeScript compilation passes with `npm run build`.

### 6. Create Admin Reels Page
- [ ] 6. Create frontend/app/admin/reels/page.tsx.
      Client component following products/page.tsx pattern. Features: reels list table with title/video/product/status columns, search by title, create/edit modal forms, delete with confirmation, useApiResource with demo fallback data, error handling and loading states.
      Files: frontend/app/admin/reels/page.tsx
      Verify: Page loads at /admin/reels without errors, displays demo data.

### 7. Integration and Navigation
- [ ] 7. Verify admin navigation integration.
      Confirm Reels nav item exists in admin-shell.tsx (already present), test navigation and active states, verify page metadata and authentication protection.
      Files: frontend/app/admin/admin-shell.tsx (read-only verification)
      Verify: Navigation to /admin/reels works, nav item highlights correctly, unauthenticated access redirects to login.

## Testing and Verification

### 8. End-to-End Testing
- [ ] 8. Test complete reel management workflow.
      Test: Create new reel via admin UI, edit existing reel, toggle active status, delete reel, verify data persistence in MongoDB, test role-based access control.
      Files: All created files
      Verify: Full CRUD operations work through admin interface, data correctly stored in database, proper access control enforced.