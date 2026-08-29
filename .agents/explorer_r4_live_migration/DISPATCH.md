## 2026-08-26T17:38:00Z
You are Explorer 3 (Live Neon DB DDL Migration & 18-Check Audit Specialist).
Working directory: e:\sih_2026_044\.agents\explorer_r4_live_migration
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 4 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Comprehensive Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

AUDIT EVIDENCE REPORT (Round 4):
- Live Neon DB is missing `account`, `students`, `industries`, `institutes`, and legacy `questions`/`ratings` schemas persist.
- `.agents/victory_auditor_1/test-comprehensive-audit.js` fails 10/18 checks.
- `scripts/test-db.js` fails with exit code 1.

Your Task:
1. Examine `.agents/victory_auditor_1/test-comprehensive-audit.js` (all 18 checks) and `scripts/test-db.js`.
2. Write a comprehensive standalone Node.js migration execution script (`scripts/migrate-neon-live.js`) that connects to `process.env.DATABASE_URL` via `@neondatabase/serverless` Pool and runs DDL to:
   - Create table `account`
   - Create table `students`
   - Create table `industries`
   - Create table `institutes`
   - Alter/create `questions` to ensure `id` UUID PK, `industry_id`, `student_id`
   - Alter/create `ratings` to ensure `id` UUID PK, `student_id`, `industry_id`, `scores` JSONB
3. Write the exact code for `scripts/test-db.js` to test the 9 canonical tables on live Neon DB and exit with code 0.
4. Record your findings and code in `e:\sih_2026_044\.agents\explorer_r4_live_migration\handoff.md` and send a message to parent.
