## 2026-08-26T17:40:30Z
You are the Remediation Execution Worker for Round 4.
Working directory: e:\sih_2026_044\.agents\worker_r4_execution
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 4 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

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
- `scripts/migrate-live-neon.js`
- `scripts/test-db.js`

Your Tasks:
1. Delete Bypass File & Clean Schema Files:
   - Delete `db/drizzle-schema.js`.
   - In `drizzle.config.js`: Ensure `schema: "./db/schema/index.js"`.
   - In `db/schema/index.js`: Remove lines 36-55 completely. Export ONLY canonical tables (`user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`) and compiled relations. Remove all alias exports across all schema files.
   - In `lib/auth.js`: Ensure Better Auth schema mapping is `user: schema.user, session: schema.session, account: schema.account, verification: schema.verification`.
2. Drizzle Kit Generator Verification:
   - Run `npx drizzle-kit generate` and ensure it exits with **code 0 and 0 warnings**.
3. ACTUALLY Execute DDL Migration against Live Neon DB:
   - Write and execute `scripts/migrate-live-neon.js` using `@neondatabase/serverless` Pool connecting to `process.env.DATABASE_URL`.
   - Ensure DDL creates all 9 tables in Neon:
     * `user`
     * `session`
     * `account`
     * `verification`
     * `students`
     * `industries`
     * `institutes`
     * `questions` (with `id` uuid default gen_random_uuid())
     * `ratings` (with `id` uuid default gen_random_uuid(), `student_id` uuid, `industry_id` uuid, `scores` jsonb)
4. Update `scripts/test-db.js`:
   - Update `REQUIRED_TABLES = ["user", "session", "account", "verification", "students", "industries", "institutes", "questions", "ratings"]`.
   - Ensure `scripts/test-db.js` tests live Neon DB and exits with code 0.
5. Verification:
   - Run `node scripts/migrate-live-neon.js` -> verify migration success.
   - Run `npx drizzle-kit generate` -> verify exit code 0, 0 warnings.
   - Run `node scripts/test-db.js` -> verify exit code 0.
   - Run `node .agents/victory_auditor_1/test-comprehensive-audit.js` -> verify 10 / 10 checks PASS (100.0% Pass Rate).
   - Run `node tests/test-auth-onboarding-e2e.js` -> verify 119/119 PASS.
6. Document results in `e:\sih_2026_044\.agents\worker_r4_execution\handoff.md` and report to parent.
