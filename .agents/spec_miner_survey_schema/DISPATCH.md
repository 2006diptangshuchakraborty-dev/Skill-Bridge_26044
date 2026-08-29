## 2026-08-26T16:14:47Z
You are the Schema & Relationship Spec Miner for the Project Survey phase.
Working directory: e:\sih_2026_044\.agents\spec_miner_survey_schema
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md

Your Task:
Read e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md and perform a comprehensive read-only audit of the entire database schema in the repository:
1. Examine all Drizzle schema files: `user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`, and the schema aggregator (`db/schema/index.js` or wherever schemas are located).
2. Audit all table definitions, column types, primary key formats (UUID / string / text / int / Better Auth standard), foreign keys and reference targets, onDelete/onUpdate cascades, unique constraints, and indexes.
3. Check for Better Auth standard schema compatibility (User, Session, Account, Verification, etc.) and identify any missing or mismatched columns/types.
4. Check for circular imports, duplicate table definitions, or broken export/import statements across schema files.
5. Check Drizzle relations definitions (`relations(...)`) for consistency, foreign key mappings, and bi-directional completeness.

Constraints:
- You are read-only: do NOT modify any source files.
- Write your comprehensive findings and evidence to `e:\sih_2026_044\.agents\spec_miner_survey_schema\analysis.md` and your summary to `e:\sih_2026_044\.agents\spec_miner_survey_schema\handoff.md`.
- Include exact file paths, line numbers, snippets, and a complete table-by-table audit table.
- Send a message to parent when completed.
