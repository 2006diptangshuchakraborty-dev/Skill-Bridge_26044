## 2026-08-25T14:21:26Z
You are a Spec Miner subagent for Milestone 1 (Migration & Integrity Constraints).
Your working directory is: `e:\sih_2026_044\.agents\m1_spec_miner`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
The project architecture is at: `e:\sih_2026_044\.agents\PROJECT.md`
Project root: `e:\sih_2026_044`

Your task:
Inspect Drizzle migration configuration (`drizzle.config.js`, existing migrations in `drizzle/`) and verify the exact SQL commands, constraints, indexes, and migration generation steps needed to produce clean, reproducible migrations for the 10 rating tables without corrupting existing user, student, organization, or admin tables.
Write your findings to `e:\sih_2026_044\.agents\m1_spec_miner\analysis.md` and `handoff.md`. Notify the orchestrator.
