## 2026-08-26T17:15:01Z
You are the Remediation Implementation Worker for Round 3.
Working directory: e:\sih_2026_044\.agents\worker_r3_execution
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 3 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Comprehensive Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js
Explorer 1 Code Blueprint: e:\sih_2026_044\.agents\explorer_r3_schema_inspect\handoff.md
Explorer 3 DDL Blueprint: e:\sih_2026_044\.agents\explorer_r3_neon_ddl\handoff.md

Tasks:
1. Complete Schema Deduplication:
   - In `db/schema/user.js`: Export ONLY `user`, `session`, `account`, `verification`. Remove ALL alias variables (`users`, `userTable`, etc.).
   - In `db/schema/student.js`: Export ONLY `students`. Remove ALL alias variables.
   - In `db/schema/industry.js`: Export ONLY `industries`. Remove ALL alias variables.
   - In `db/schema/institute.js`: Export ONLY `institutes`. Remove ALL alias variables.
   - In `db/schema/questions.js`: Export ONLY `questions`. Remove ALL alias variables.
   - In `db/schema/ratings.js`: Export ONLY `ratings`. Remove ALL alias variables.
   - In `db/schema/index.js`: Re-export ONLY `user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings` and the relations.
   - In `lib/auth.js`: Update schema map to `user: schema.user, session: schema.session, account: schema.account, verification: schema.verification`.
2. Drizzle Kit Generator:
   - Ensure `drizzle.config.js` points to `schema: "./db/schema/index.js"`.
   - Run `npx drizzle-kit generate` and ensure it exits with code 0 and ZERO warnings.
3. Live Neon Direct DDL Migration:
   - Create and run `scripts/migrate-neon-direct.js` using `@neondatabase/serverless` Pool to create and migrate all 9 tables in the live Neon DB (`process.env.DATABASE_URL`).
4. Update `scripts/test-db.js`:
   - Update `scripts/test-db.js` with `REQUIRED_TABLES = ["user", "session", "account", "verification", "students", "industries", "institutes", "questions", "ratings"]` and verify live CRUD and rollback.
5. Verification Execution:
   - Run `npx drizzle-kit generate` -> Exit code 0, 0 warnings.
   - Run `node scripts/migrate-neon-direct.js` -> 9 tables migrated in Neon.
   - Run `node scripts/test-db.js` -> Exit code 0 (PASS).
   - Run `node .agents/victory_auditor_1/test-comprehensive-audit.js` -> 10 / 10 checks PASS (100.0% Pass Rate).
   - Run `node tests/test-auth-onboarding-e2e.js` -> 119 / 119 tests PASS (100.0%).
6. Record detailed handoff in `e:\sih_2026_044\.agents\worker_r3_execution\handoff.md` and report to parent.
