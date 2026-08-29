## 2026-08-27T02:00:00Z

Task: Remediation Execution Worker for Database, Schema, and Live Neon DB Migration.
Working directory: e:\sih_2026_044\.agents\worker_live_sync_r4
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

File Ownership:
- `db/schema/index.js`
- `db/schema/user.js`
- `db/schema/student.js`
- `db/schema/industry.js`
- `db/schema/institute.js`
- `db/schema/questions.js`
- `db/schema/ratings.js`
- `db/drizzle-schema.js` (DELETE this bypass file)
- `drizzle.config.js`
- `lib/auth.js`
- `scripts/migrate-neon-direct.js`
- `scripts/test-db.js`

Tasks:
1. Delete Bypass File & Clean Schema Files:
   - Delete `db/drizzle-schema.js`.
   - In `drizzle.config.js`: Ensure `schema: "./db/schema/index.js"`.
   - In `db/schema/index.js`: Remove lines 36-55 completely. Export ONLY canonical tables (`user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`) and compiled relations. Remove all alias exports across all schema files (`user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`).
   - In `lib/auth.js`: Ensure Better Auth schema mapping is `user: schema.user, session: schema.session, account: schema.account, verification: schema.verification`.
2. Drizzle Kit Generator Verification:
   - Run `npx drizzle-kit generate` and ensure it exits with **code 0 and 0 duplicate table/index warnings**.
3. ACTUALLY Execute DDL Migration against Live Neon DB:
   - Write and execute `scripts/migrate-neon-direct.js` using `@neondatabase/serverless` Pool connecting to `process.env.DATABASE_URL`.
   - Ensure DDL creates all 9 tables in Neon with exact column names and types:
     * `user`
     * `session`
     * `account`
     * `verification`
     * `students` (UUID PK, `user_id` text FK on delete cascade, JSONB fields)
     * `industries` (UUID PK, `user_id` text FK on delete cascade, JSONB fields)
     * `institutes` (UUID PK, `user_id` text FK on delete cascade, JSONB fields)
     * `questions` (with `id` uuid default gen_random_uuid())
     * `ratings` (with `id` uuid default gen_random_uuid(), `student_id` uuid, `industry_id` uuid, `scores` jsonb)
4. Update `scripts/test-db.js`:
   - Update `REQUIRED_TABLES = ["user", "session", "account", "verification", "students", "industries", "institutes", "questions", "ratings"]`.
   - Ensure `scripts/test-db.js` tests live Neon DB and exits with code 0.
5. Verification:
   - Run `node scripts/migrate-neon-direct.js` -> verify migration success on Neon.
   - Run `npx drizzle-kit generate` -> verify exit code 0, 0 warnings.
   - Run `node scripts/test-db.js` -> verify exit code 0.
   - Run `node .agents/victory_auditor_1/test-comprehensive-audit.js` -> verify 10 / 10 checks PASS (100.0% Pass Rate).
   - Run `node tests/test-auth-onboarding-e2e.js` -> verify 119/119 PASS.
6. Document results in `e:\sih_2026_044\.agents\worker_live_sync_r4\handoff.md` and report to parent.
