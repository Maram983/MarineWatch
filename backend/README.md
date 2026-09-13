# MarineWatch backend — Supabase edition

This replaces MySQL/XAMPP with Supabase. Your frontend does NOT need to
change — it's still an Express server on the same routes/port, it just
talks to Supabase instead of MySQL now.

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` — from Project Settings → API
     ("Publishable key" = the anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, under "Secret keys" /
     "service_role". Keep this private, never put it in frontend code.

2. Run `supabase/migration_esi.sql` in the Supabase SQL editor once — it adds
   the `affected_area`, `wildlife_impact`, and `esi_score` columns the
   Environmental Severity Index (ESI) calculator needs on the `reports` table.

3. Install dependencies:
   ```
   npm install
   ```

4. Run it:
   ```
   npm start
   ```

## What changed vs. the old MySQL version
- No more `mysql2`, `bcryptjs`, or `jsonwebtoken` — Supabase Auth handles
  password hashing and issues the login token directly.
- `config/db.js` → `config/supabaseClient.js`
- All `models/*.js` now query Supabase instead of MySQL.
- `middleware/authMiddleware.js` verifies a Supabase session token instead
  of a custom JWT.
- `middleware/uploadMiddleware.js` uses in-memory storage; report images
  are uploaded to the Supabase Storage bucket `report-images` (public URLs
  are returned instead of local `/uploads/...` paths).
- Same routes, same request/response shapes wherever possible, so your
  frontend `js/*.js` files should keep working as-is.

## Environmental Severity Index (ESI)
Report severity is no longer picked by the reporter — it's computed by
`utils/esiCalculator.js` from three criteria (a simple weighted-sum model):
pollution type, affected area (small/medium/large), and whether wildlife
impact was observed. `reportController.createReport` calls this instead of
trusting the client's `severity` field, and stores both the computed
`severity` level and the numeric `esi_score` (0-10). Admins can still
override the level from the report review screen via
`PUT /api/admin/reports/:id/severity`.

## If something doesn't work
Check the terminal running `npm start` for errors — most issues trace back
to a missing/wrong value in `.env`, or RLS policies blocking a query (the
backend uses the service role key, which bypasses RLS, so this should be
rare, but double-check if you added your own queries).
