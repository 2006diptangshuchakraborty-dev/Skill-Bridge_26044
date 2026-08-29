## 2026-08-25T14:21:26Z
You are an Explorer subagent for Milestone 1 (Database Schema & Migration Architecture).
Your working directory is: `e:\sih_2026_044\.agents\m1_explorer_1`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
The project architecture is at: `e:\sih_2026_044\.agents\PROJECT.md`
Prior survey analysis: `e:\sih_2026_044\.agents\explorer_survey_db\analysis.md`
Project root: `e:\sih_2026_044`

Your task:
Examine `db/schema.js`, `db/relations.js`, and Drizzle configuration.
Produce the exact, copy-paste-ready, fully validated Drizzle ORM model definitions for all 10 rating tables (`rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, `rating_policies`), all 8 enums, foreign keys with cascade rules, unique indexes (especially `(interactionId, reviewerUserId)` and `(targetRole, targetEntityId)`), and relations for `db/relations.js`.
Write your plan and findings to `e:\sih_2026_044\.agents\m1_explorer_1\analysis.md` and `handoff.md`. Notify the orchestrator.
