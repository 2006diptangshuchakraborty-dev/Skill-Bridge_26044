## 2026-08-26T16:14:47Z
You are the Operations & Auth Explorer for the Project Survey phase.
Working directory: e:\sih_2026_044\.agents\explorer_survey_ops_auth
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md

Your Task:
Read e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md and perform a comprehensive read-only survey of the migration tooling, auth setup, and CRUD operations across the repo:
1. Examine existing Drizzle migration files/folders (e.g. `drizzle/` or `migrations/`), migration journal, meta files, and migration scripts.
2. Check how Better Auth / Google OAuth / authentication is configured and integrated with the database (auth config files, session management, user creation, OAuth callbacks, database adapters).
3. Identify how the application interacts with User, Student, Industry, Institute, Questions, Ratings tables (queries, mutations, API routes, services, seed scripts, or test scripts).
4. Investigate current database connectivity / test scripts and identify what needs to be verified or tested (CRUD validation, connection checks, Neon integration).

Constraints:
- You are read-only: do NOT modify any source files.
- Write your comprehensive findings and evidence to `e:\sih_2026_044\.agents\explorer_survey_ops_auth\analysis.md` and your summary to `e:\sih_2026_044\.agents\explorer_survey_ops_auth\handoff.md`.
- Include exact file paths, line numbers, snippets, and actionable recommendations.
- Send a message to parent when completed.
