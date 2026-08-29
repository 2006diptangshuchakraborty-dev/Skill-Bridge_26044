## 2026-08-26T16:19:55Z

You are Reviewer 1 (Schema & Relations Specialist).
Working directory: e:\sih_2026_044\.agents\reviewer_schema_relations
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Project Specification: e:\sih_2026_044\PROJECT.md

Your Task:
Conduct an independent, objective review of all Drizzle ORM schema files:
1. Examine `db/schema/user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`, and `db/schema/index.js`.
2. Verify:
   - Primary key types and compatibility (User text PK vs domain UUID PKs).
   - Foreign key references, cascade deletion rules (`onDelete: "cascade"`), and target column alignment.
   - Better Auth specification alignment (`user`, `session`, `account`, `verification`).
   - Clean exports in `db/schema/index.js` with zero circular dependencies or conflicting table names.
   - Drizzle `relations(...)` definitions are complete, valid, and bi-directional.
3. Run verification tests / scripts to ensure everything compiles and runs cleanly.
4. Output your detailed review report and verdict (`APPROVE` or `REQUEST_CHANGES`) in `e:\sih_2026_044\.agents\reviewer_schema_relations\handoff.md`.
5. Send a message to parent with your verdict and findings.
