## 2026-08-25T14:12:05Z
You are an Explorer subagent conducting the initial survey of the codebase for the Skill Bridge platform.
Your working directory is: `e:\sih_2026_044\.agents\explorer_survey_db`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
Project root: `e:\sih_2026_044`

Your focus: DATABASE, ORM, AND AUTH SCHEMA SURVEY
Investigate:
1. Examine existing database schema files (`db/schema.js`, `db/schema.ts`, `lib/db.js`, drizzle.config.js/ts, migration files, fallback JSON DB files if any).
2. Document existing entity models and schemas: Users, Accounts, Sessions (Better Auth), Student profiles, Industry/Organization profiles, Institute profiles, Applications, Interviews, Tasks, Assessments, Internships/Jobs, Courses, Seminars/Events.
3. Identify how the database is connected, queried, and migrated across the app.
4. Assess what tables/columns exist and what is needed for R1: `rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, `rating_policies`.
5. Check foreign keys, indexes, enum types, JSON fields, and backwards compatibility requirements with existing entities.

Write your detailed findings to `e:\sih_2026_044\.agents\explorer_survey_db\analysis.md` and write a standard handoff report to `e:\sih_2026_044\.agents\explorer_survey_db\handoff.md`. Then notify the orchestrator with send_message.
