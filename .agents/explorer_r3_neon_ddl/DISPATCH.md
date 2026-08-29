## 2026-08-26T17:13:47Z
You are Explorer 3 (Direct Neon DB DDL Migration & Audit Script Specialist).
Working directory: e:\sih_2026_044\.agents\explorer_r3_neon_ddl
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 3 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Comprehensive Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

AUDIT EVIDENCE REPORT (Round 3):
- Live Neon DB is missing `account`, `students`, `industries`, `institutes`, and has legacy questions/ratings columns.
- `node .agents/victory_auditor_1/test-comprehensive-audit.js` fails with 10 failed / 8 passed.
- `node scripts/test-db.js` fails with exit code 1.

Your Task:
1. Examine `.agents/victory_auditor_1/test-comprehensive-audit.js` line by line to understand every assertion and column requirement.
2. Write a complete, standalone Node.js migration script (`scripts/migrate-neon-direct.js`) using `@neondatabase/serverless` Pool that executes direct SQL DDL to create/update all 9 tables in the live Neon DB:
   - `user`
   - `session`
   - `account`
   - `verification`
   - `students`
   - `industries`
   - `institutes`
   - `questions` (with UUID `id` primary key)
   - `ratings` (with UUID `id`, `student_id` uuid, `industry_id` uuid, `scores` jsonb)
3. Write the exact code for `scripts/test-db.js` that tests these 9 tables with live connection and rollback CRUD.
4. Record your blueprint and code in `e:\sih_2026_044\.agents\explorer_r3_neon_ddl\handoff.md` and send a message to parent.
