## 2026-08-26T17:13:47Z
<USER_REQUEST>
You are Explorer 1 (Complete Schema File Inspection & Single Export Specialist).
Working directory: e:\sih_2026_044\.agents\explorer_r3_schema_inspect
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 3 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md

AUDIT EVIDENCE REPORT (Round 3):
- Schema files (`db/schema/*.js` and `db/schema/index.js`) continue to export duplicate table aliases (`users`, `userTable`, `student`, `studentProfiles`, `industry`, `organizationProfiles`, `institute`, `instituteProfiles`, `question`, `rating`, etc.), registering duplicate schemas in Drizzle Kit.
- `npx drizzle-kit generate` fails with exit code 1 due to 400+ duplicate warnings.

Your Task:
1. Inspect every file in `db/schema/` (`user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`, `index.js`).
2. Catalog all exported variables across all these files.
3. Write the exact code for each of the 7 files so that:
   - `db/schema/user.js` exports ONLY `user`, `session`, `account`, `verification`.
   - `db/schema/student.js` exports ONLY `students`.
   - `db/schema/industry.js` exports ONLY `industries`.
   - `db/schema/institute.js` exports ONLY `institutes`.
   - `db/schema/questions.js` exports ONLY `questions`.
   - `db/schema/ratings.js` exports ONLY `ratings`.
   - `db/schema/index.js` re-exports ONLY these 9 tables and their compiled relations.
   - Absolutely NO aliases (`users`, `userTable`, `studentProfiles`, etc.) exist anywhere in any file.
4. Record your detailed findings and exact code in `e:\sih_2026_044\.agents\explorer_r3_schema_inspect\handoff.md` and send a message to parent.
</USER_REQUEST>
