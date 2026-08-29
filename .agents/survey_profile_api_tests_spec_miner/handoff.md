# Handoff Report: Profile Data Ownership, Persistence & Automated Test Suite Survey

**Author**: Specification Miner (`survey_profile_api_tests_spec_miner`)  
**Working Directory**: `e:\sih_2026_044\.agents\survey_profile_api_tests_spec_miner`  
**Date**: 2026-08-29  
**Recipient**: Lead Orchestrator & Team Agents

---

## 1. Observation

1. **Requirements in `ORIGINAL_REQUEST.md`**:
   - **R1**: Single authoritative user identity, database-stored role in `user` table, no duplicate user accounts per email.
   - **R2**: Role-based routing with authenticated sessions, fix cross-role "Already logged in as student" conflicts, clear stale client cache on logout.
   - **R3**: Server-side profile ownership using `session.user.id` (not client-provided ID), fix Industry/Institute profile saving (using UPSERT), preserve Student profile functionality.
   - **R4**: Profile persistence on refresh and logout/login via Neon PostgreSQL, Drizzle schema migrations without data loss, server-side validation with meaningful errors.
   - **Acceptance Criteria & Test Scenarios A–D**: Test A (Student), Test B (Institute), Test C (Industry) complete successfully (Login -> Edit -> Save -> Refresh -> Data remains -> Logout -> Login -> Data remains), Test D (Role switching isolation).
2. **Database Schema & Constraints in Neon PostgreSQL**:
   - Database tables verified via `scripts/test-db.js` and `tests/probe-db.js`:
     `account`, `industries`, `institutes`, `mcq_questions`, `questions`, `ratings`, `session`, `students`, `user`, `verification`.
   - `students` table has columns: `id` (uuid), `user_id` (text FK to `user.id` CASCADE), `full_name`, `email`, `role`, `headline`, `bio`, `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `career_preferences` (jsonb), `profile_completion` (integer), `current_onboarding_step` (integer), `created_at`, `updated_at`.
   - `industries` table has columns: `id` (uuid), `user_id` (text FK to `user.id` CASCADE), `role`, `company_name`, `email`, `industry_type`, `company_size`, `website`, `description`, `address` (jsonb), `documents` (jsonb), `verification_docs` (jsonb), `hiring_preferences` (jsonb), `verification_status`, `created_at`, `updated_at`.
   - `institutes` table has columns: `id` (uuid), `user_id` (text FK to `user.id` CASCADE), `role`, `institute_name`, `email`, `institute_type`, `aishe_code`, `website`, `address` (jsonb), `departments` (jsonb), `placement_contact` (jsonb), `verification_docs` (jsonb), `verification_status`, `created_at`, `updated_at`.
   - **Crucial Schema Absence**: `user_id` in `students`, `industries`, and `institutes` does NOT have a `UNIQUE` constraint or unique index in PostgreSQL.
3. **API Implementation (`app/api/profile/setup/route.js`)**:
   - Lines 575–593: Validates Better Auth session via `auth.api.getSession({ headers: request.headers })`.
   - Lines 54–67 & 848–856: Explicitly deletes `PROTECTED_FIELDS` (`id`, `userId`, `user_id`, `role`, `accountStatus`, `verificationStatus`) from incoming payload.
   - Lines 303–331: Compares incoming fields against `information_schema.columns` via `getTableColumns(tableName)`:
     ```js
     const columnName = camelToSnake(key);
     if (!availableColumns.has(columnName)) continue;
     ```
     Because columns like `cgpa`, `department`, `degree`, `institute_name`, `phone`, `registration_number` (CIN), `tax_id_gstin` (GSTIN), `logo_url`, `contact_phone`, and `accreditation_details` do not exist in the PostgreSQL tables, they are **silently omitted** from SQL writes.
   - Lines 1001–1044: Performs `UPDATE` if row found by `user_id`, or `INSERT` if not found. Does not execute an atomic Drizzle `.insert().onConflictDoUpdate()`.
   - Lines 1055–1106: Does not update `user.profile_completed` or `user.onboarding_status` in the `user` table in PostgreSQL.
4. **Dual Backend Discrepancy**:
   - `app/student/profile/page.jsx`, `app/profile/setup/page.jsx`, `app/student/dashboard/page.js`, and `app/industry/dashboard/page.jsx` consume `/api/profile/setup` (PostgreSQL).
   - `app/api/student/profile/route.js`, `app/api/organization/profile/route.js`, `app/api/student/onboarding/route.js`, `app/api/institute/onboarding/route.js`, and `app/api/organization/onboarding/route.js` read and write to `lib/db.js` (`data/db.json` in-memory mock DB).
5. **Existing Automated Test Suites**:
   - `tests/test-auth-onboarding-e2e.js` (`npm test`): 119 tests across Tiers 1–4, 100% passing.
   - `tests/test-tier5-adversarial-auth.js` (`npm run test:tier5`): 45 tests across 8 vulnerability domains, 100% passing.
   - `scripts/test-matching-rules.js` (`npm run test:matching`): 13 tests, 100% passing.
   - `tests/test-verification-system.js` (`npm run test:verification`): 8 tests, 100% passing.
   - `scripts/test-db.js` (`node --env-file=.env.local scripts/test-db.js`): 4 smoke assertions, 100% passing.
   - Total existing automated tests: 185 passing.

---

## 2. Logic Chain

1. **From Observation 3 & Observation 2**:
   - The frontend profile form (`/profile/setup` and `/student/profile`) submits fields including `cgpa`, `department`, `degree`, `instituteName`, `phone`, `registrationNumber` (CIN), `taxIdGstin` (GSTIN), `contactPhone`, `officialEmail`, `logoUrl`, and `accreditationDetails`.
   - When `/api/profile/setup` receives this data, it checks `information_schema.columns` for the target table (`students`, `industries`, or `institutes`).
   - Because those columns were never declared in `db/schema/student.js`, `db/schema/industry.js`, and `db/schema/institute.js` (and therefore do not exist in Neon PostgreSQL), the API silently skips them (`continue`).
   - Consequently, only base fields (`headline`, `bio`, `skills`, `company_name`, `institute_name`) are stored in PostgreSQL.
   - When the user refreshes the page or re-logs in, `GET /api/profile/setup` queries PostgreSQL, returns only the stored columns, and the frontend resets missing academic/statutory fields to empty.
2. **From Observation 2 & Observation 3**:
   - Because `user_id` lacks a `UNIQUE` constraint on `students`, `industries`, and `institutes`, Drizzle ORM's native `.onConflictDoUpdate()` cannot target `user_id`.
   - Adding `.unique()` to `userId` in the Drizzle schemas and running a migration establishes a unique constraint in PostgreSQL, enabling atomic UPSERTs that eliminate race conditions.
3. **From Observation 3 & Observation 4**:
   - Upon profile completion submission, `/api/profile/setup` must synchronize the `user` table in PostgreSQL by setting `profile_completed = true` and `onboarding_status = 'COMPLETED'`.
   - This ensures that Better Auth sessions and `middleware.js` edge checks immediately recognize the user as onboarded.
4. **From Observation 5 & Requirement Verification**:
   - While the platform has 185 passing unit/contract/adversarial tests, there is currently no dedicated automated end-to-end integration test that performs the exact Test Scenarios A, B, C, D (real HTTP/API edit -> Neon PostgreSQL persist -> DB query check -> reload simulation -> logout/login -> verify retention).
   - Creating `tests/test-profile-persistence-e2e.js` directly satisfies the acceptance criteria.

---

## 3. Caveats

- **Existing Data Safety**: Any migration to add missing columns (`phone`, `cgpa`, `department`, `degree`, `registration_number`, `tax_id_gstin`, etc.) and unique constraints on `user_id` should use nullable columns or defaults so that existing records in Neon PostgreSQL are preserved without data loss.
- **Environment Loading in Scripts**: Node.js scripts running outside Next.js (e.g. CLI test scripts) must load `.env.local` explicitly (via `require('dotenv').config({ path: '.env.local' })` or `node --env-file=.env.local`) to access `DATABASE_URL`.

---

## 4. Conclusion

1. **Ownership**: Server-side profile ownership is enforced via `session.user.id` in `/api/profile/setup`.
2. **Persistence Root Cause**: Profile data loss on refresh is caused by missing column definitions in `db/schema/student.js`, `db/schema/industry.js`, and `db/schema/institute.js`, which leads `/api/profile/setup` to silently drop academic and statutory fields.
3. **UPSERT & Synchronization**: Adding a unique constraint on `user_id` in profile tables will allow true atomic Drizzle UPSERTs, and updating the `user` table upon completion will fix session/middleware state.
4. **Testing**: 185 tests are passing. A new automated test suite (`tests/test-profile-persistence-e2e.js`) is required to formally test Scenarios A, B, C, and D against Neon PostgreSQL.

---

## 5. Verification Method

To verify these findings:

1. **Verify Database Columns & Constraints**:
   ```powershell
   node --env-file=.env.local tests/probe-db.js
   ```
   Inspect the printed tables to confirm existing vs missing columns and constraint definitions.

2. **Verify Database Connectivity & Smoke Test**:
   ```powershell
   node --env-file=.env.local scripts/test-db.js
   ```

3. **Verify Existing Test Suites**:
   ```powershell
   # Run master auth E2E suite (119 tests)
   npm test

   # Run Tier 5 adversarial hardening suite (45 tests)
   npm run test:tier5

   # Run Matching Engine suite (13 tests)
   npm run test:matching

   # Run Skill Verification suite (8 tests)
   npm run test:verification
   ```

4. **Verify Analysis Report**:
   Inspect `e:\sih_2026_044\.agents\survey_profile_api_tests_spec_miner\analysis.md`.
