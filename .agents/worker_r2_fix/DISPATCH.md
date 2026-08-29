## 2026-08-26T17:03:15Z

You are the Remediation Implementation Worker for Round 2.
Working directory: e:\sih_2026_044\.agents\worker_r2_fix
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 2 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Comprehensive Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
- `db/schema/user.js`
- `db/schema/student.js`
- `db/schema/industry.js`
- `db/schema/institute.js`
- `db/schema/questions.js`
- `db/schema/ratings.js`
- `db/schema/index.js`
- `db/index.js`
- `drizzle.config.js`
- `scripts/test-db.js`
- `scripts/sync-neon-db.js` (if helpful for executing DDL migrations directly)
- `lib/auth.js`

Your Tasks:
1. Eliminate Duplicate Table Alias Exports:
   - In `db/schema/index.js`, export ONLY each table once (`user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`).
   - Do NOT export alias variables (like `users = user`) alongside `user` in `index.js`.
   - In `lib/auth.js`, update Better Auth schema mapping to use `user: schema.user, session: schema.session, account: schema.account, verification: schema.verification` (or whichever name is cleanly exported).
2. Fix Drizzle Kit Generator:
   - Ensure `drizzle.config.js` points to `schema: "./db/schema/index.js"`.
   - Run `npx drizzle-kit generate` and ensure it exits with **code 0 and ZERO duplicate table warnings**.
3. Create/Migrate All 9 Tables in Live Neon PostgreSQL Database:
   - Run a migration script or DDL runner directly against `process.env.DATABASE_URL` ensuring all 9 tables exist in Neon with exact column names and types:
     * `user`
     * `session`
     * `account`
     * `verification`
     * `students`
     * `industries`
     * `institutes`
     * `questions` (with `id` uuid PK)
     * `ratings` (with `id` uuid PK, `student_id` uuid FK, `industry_id` uuid FK, `scores` jsonb)
4. Update `scripts/test-db.js`:
   - Update `REQUIRED_TABLES` to `["user", "session", "account", "verification", "students", "industries", "institutes", "questions", "ratings"]`.
   - Ensure `scripts/test-db.js` runs live connection, schema check, insert, select, update, relationship, delete, rollback and exits with code 0.
5. Verification Execution:
   - Run `npx drizzle-kit generate` -> MUST EXIT CODE 0 with 0 warnings.
   - Run `node scripts/test-db.js` -> MUST PASS with exit code 0.
   - Run `node .agents/victory_auditor_1/test-comprehensive-audit.js` -> MUST PASS 10 / 10 checks (100% Pass Rate).
   - Run `node tests/test-auth-onboarding-e2e.js` -> MUST PASS 119/119 tests (100% Pass Rate).
6. Document results in `e:\sih_2026_044\.agents\worker_r2_fix\handoff.md` and report to parent.
