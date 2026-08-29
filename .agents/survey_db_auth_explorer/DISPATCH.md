## 2026-08-29T05:39:25Z
You are a teamwork_preview_explorer investigating the codebase for the project described in e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md.

Working directory: e:\sih_2026_044\.agents\survey_db_auth_explorer
Workspace directory: e:\sih_2026_044

Objective:
Investigate the Database Schema, Drizzle ORM configuration, Better Auth integration, User & Role modeling, and Database Migrations for the Next.js SIH 2026 Skill Mapping Platform.

Tasks:
1. Read e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md for requirements (especially R1: Database User/Role Model and R4: Profile Persistence and Database Migrations).
2. Inspect `db/schema/**`, `db/index.js`, `drizzle.config.js`, `lib/auth.js`, `lib/auth-client.js`, `lib/db.js`, and any auth/user schema files.
3. Investigate how the `user` table is defined, how the `role` field (student, institute, industry, etc.) is modeled in Drizzle ORM and Better Auth, and whether there are any duplicate user issues or schema mismatches.
4. Check Drizzle migration status, scripts (`package.json`, `drizzle/**`, `scripts/**`), and Neon PostgreSQL connectivity/configuration.
5. Provide a detailed analysis of what is currently implemented, where the bugs/gaps exist regarding database role storage and migrations, and concrete recommendations for fixes.

Output:
Write your comprehensive findings to `e:\sih_2026_044\.agents\survey_db_auth_explorer\analysis.md` and `handoff.md`.
Send a completion message when done with a summary of findings.
