# Handoff Report: Database, ORM & Auth Schema Survey

**Agent**: explorer_survey_db  
**Date**: 2026-08-25  
**Milestone**: Initial Survey / M0  
**Handoff Type**: Hard (Complete)  
**Deliverable File**: `e:\sih_2026_044\.agents\explorer_survey_db\analysis.md`

---

## 1. Observation

1. **Drizzle ORM Schema (`db/schema.js:1-319`)**:
   - Defines 5 PostgreSQL enums (`userRoleEnum`, `accountStatusEnum`, `onboardingStatusEnum`, `orgVerificationStatusEnum`, `auditActionEnum`).
   - Defines 10 tables: `users` (`user`), `sessions` (`session`), `accounts` (`account`), `verifications` (`verification`), `signupIntents` (`signup_intents`), `studentProfiles` (`student_profile`), `organizationProfiles` (`organization_profile`), `instituteProfiles` (`institute`), `adminProfiles` (`admin_profile`), `auditLogs` (`audit_logs`).
   - `users.role` contains `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']` (`db/schema.js:24`).
   - `studentProfiles` links 1:1 to `users.id` and nullable FK to `institute.id` (`db/schema.js:154-185`).
   - `organizationProfiles` links 1:1 to `users.id` (`db/schema.js:190-222`).
   - `instituteProfiles` links 1:1 to `users.id` with table name `'institute'` (`db/schema.js:227-250`).
   - `adminProfiles` links 1:1 to `users.id` (`db/schema.js:255-271`).
   - `auditLogs` tracks actor, action, target, metadata (`db/schema.js:277-295`).

2. **Drizzle Connection & Mock Fallback Layer (`db/index.js:1-194`)**:
   - Imports `@neondatabase/serverless` Pool and `drizzle-orm/neon-serverless` (`db/index.js:7-8`).
   - Fallback function `createMockDrizzleDb()` provides Drizzle query builder methods (`select()`, `insert()`, `update()`, `delete()`, `query.*`) backed by synchronous atomic JSON DB `localDb` (`lib/db.js`).

3. **Drizzle Relational Definitions (`db/relations.js:1-28`)**:
   - Defines relational joins between `users`, `sessions`, `accounts`, `studentProfiles`, `organizationProfiles`, `instituteProfiles`, `adminProfiles`, and `auditLogs`.

4. **Drizzle Kit Config & Migrations (`drizzle.config.js:1-14` & `drizzle/20260824180753_omniscient_scrambler/`)**:
   - `drizzle.config.js` sets schema `./db/schema.js`, out `./drizzle`, dialect `postgresql`.
   - `drizzle/20260824180753_omniscient_scrambler/migration.sql` contains the initial baseline schema migration.

5. **Local JSON Database Layer (`lib/db.js:1-728`)**:
   - Reads and atomically writes `data/db.json` with golden fallback from `data/seed.json`.
   - Stores `users`, `students`, `companies`, `opportunities`, `skills`, `applications`, `institutes`, `departments`, `alerts`, `trainingPrograms`, `feedbackReports`, and `auditLogs`.
   - Contains domain helper functions for applications, opportunities, student skills, company verification, alerts, and feedback reports.

6. **Better Auth Configuration (`lib/auth.js:1-321`)**:
   - Uses `betterAuth` with `drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } })`.
   - Has `user.create.before` hook resolving `signup_intents` cookie token for cryptographic role binding.
   - Has `user.create.after` hook automatically provisioning 1:1 profiles (`student_profile`, `organization_profile`, `institute_profile`, `admin_profile`) and logging audit events.

7. **Domain & Assessment Engines (`lib/scoring-engine.js:1-242`, `lib/assessment-engine.js:1-199`)**:
   - `scoring-engine.js` generates objective 0-100 assessment scores, 4-tier proficiency levels (`Beginner`, `Intermediate`, `Advanced`, `Expert`), and verified skill badges (`SB-SKILL-XXXX`).
   - `assessment-engine.js` manages randomized attempt sessions, timers, and anti-cheating telemetry (tab switches, focus loss, integrity scores).

8. **Original User Request Specification (`.agents/ORIGINAL_REQUEST.md:13-22`)**:
   - Specifically requires adding models for: `rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, and `rating_policies`.
   - Requires generating Drizzle migrations, local JSON DB fallbacks, and maintaining backwards compatibility.

---

## 2. Logic Chain

1. **Dual-Persistence Requirement**:
   - Because the platform executes in dual modes (Neon PostgreSQL for production; `lib/db.js` + `createMockDrizzleDb` for local dev/testing), any schema addition in `db/schema.js` must be symmetrically supported in `lib/db.js` and `db/index.js`.
2. **Preventing Duplicate Submissions & Collisions**:
   - The user request requires that duplicate ratings for the same `(interactionId, reviewerUserId)` are blocked at DB level.
   - Therefore, `ratings` must have a compound unique constraint / index on `(interactionId, reviewerUserId)`.
   - `rating_aggregates` must have a unique constraint on `(targetRole, targetEntityId)`.
   - `rating_category_scores` must have a unique constraint on `(ratingId, categoryId)`.
3. **Verified Reputation vs Objective Skill Scores Separation**:
   - Observations show `lib/scoring-engine.js` produces objective assessment scores (0-100) and `verifications` table records.
   - The rating system produces experience reputation scores (1.00-5.00 stars) across weighted categories.
   - The `rating_aggregates` table must store both `averageScore` (1.0-5.0) and `objectiveSkillScore` (0-100), plus `verificationTrustLevel`, cleanly demarcating verification signals from experience reputation.
4. **Entity Terminology & Backward Compatibility**:
   - Customer-facing models must use `STUDENT`, `INDUSTRY`, `INSTITUTE`.
   - In DB, `organization_profile` is the existing table name. Aliasing `organizationProfiles` as `industryProfiles` in Drizzle and helper layers prevents regression while complying with strict terminology.

---

## 3. Caveats

1. **Live PostgreSQL Connection**:
   - During local testing without an active `DATABASE_URL`, tests execute via `createMockDrizzleDb()` and `lib/db.js`. Migration generation (`drizzle-kit generate`) works offline, but applying migrations (`drizzle-kit migrate` / `push`) requires a live PostgreSQL instance.
2. **Existing `feedbackReports` Table**:
   - `lib/db.js` currently has a legacy `feedbackReports` structure used for basic recruiter endorsements. This can remain for backwards compatibility while transitioning all primary rating flows to the new `ratings` / `rating_interactions` schema.
3. **No other caveats**: All existing entity relationships, auth flows, and schema structures have been fully cataloged.

---

## 4. Conclusion

1. The existing schema and auth architecture are robust and well-structured with Better Auth and Drizzle ORM.
2. To satisfy R1, 10 new tables (`rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, `rating_policies`) and 8 PostgreSQL enums are clearly mapped and documented in `e:\sih_2026_044\.agents\explorer_survey_db\analysis.md`.
3. Symmetrical support in `db/schema.js`, `db/relations.js`, `db/index.js`, `lib/db.js`, and `drizzle.config.js` is fully planned for the implementation workers.

---

## 5. Verification Method

1. **Verify Detailed Schema Analysis File**:
   - Inspect `e:\sih_2026_044\.agents\explorer_survey_db\analysis.md` to confirm all 10 table definitions, column types, foreign keys, indexes, enums, and category configurations are specified.
2. **Verify Database Seeder & Test Suite Baseline**:
   - Run `node scripts/seed.js` to ensure the local JSON DB seeds cleanly.
   - Run `npm test` (`node tests/test-auth-suite.js`) to verify that the existing auth and DB layers pass without regression.
3. **Verification Invalidation Conditions**:
   - Invalidation occurs if table definitions omit compound unique constraints on `(interactionId, reviewerUserId)` or if `industry` / `organization` aliasing breaks existing tests.
