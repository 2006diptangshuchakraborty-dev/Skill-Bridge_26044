## 2026-08-25T14:21:26Z
You are the E2E Testing Track Writer for the Skill Bridge platform.
Your working directory is: `e:\sih_2026_044\.agents\test_writer_e2e`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
The project architecture and feature inventory is at: `e:\sih_2026_044\.agents\PROJECT.md`
Project root: `e:\sih_2026_044`

Your task:
1. Create `TEST_INFRA.md` at project root (`e:\sih_2026_044\TEST_INFRA.md`) detailing the test philosophy, methodology (Category-Partition, BVA, Pairwise, Real-World Workloads), feature checklist, and coverage thresholds.
2. Build the standalone, zero-dependency, comprehensive 4-Tier test suite in `tests/test-rating-system.js` and helper in `tests/rating-test-helper.js` (matching the style of `tests/test-auth-suite.js`):
   - Tier 1: Feature Coverage (≥5 per feature, happy paths, basic eligibility, category scores 1-5, weighted scores, trust levels).
   - Tier 2: Boundary & Corner Cases (≥5 per feature, self-rating block, unverified interaction rejection, unreviewed application rejection, duplicate compound key block, expired deadlines, score validation 1-5, empty rating lists displaying 'No verified ratings yet' instead of 0.0).
   - Tier 3: Cross-Feature & State Pipelines (2-way blind review mutual publication, deadline fallback publication, user report -> admin hide -> user appeal -> admin restore, aggregate recalculation repair).
   - Tier 4: Real-World Multi-Actor Scenarios (Student application -> Industry review -> Rating; Internship completed -> 2-way blind review; Course completion -> Institute rating).
3. Test runner must support CLI flags (`--tier=1..4`, `--verbose`, `--json`) and return exit code 0 on all pass, 1 on failure.
4. When the test runner is created and ready, create `TEST_READY.md` at project root (`e:\sih_2026_044\TEST_READY.md`) summarizing test counts across all 4 tiers and the run command.
5. Write your handoff report to `e:\sih_2026_044\.agents\test_writer_e2e\handoff.md` and notify the orchestrator.

## 2026-08-26T16:16:52Z
You are the E2E Test Writer for the Database, Schema, Drizzle ORM, and Better Auth test suite.
Working directory: e:\sih_2026_044\.agents\test_writer_e2e
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Project Specification: e:\sih_2026_044\PROJECT.md
Test Infrastructure Plan: e:\sih_2026_044\TEST_INFRA.md

File Ownership:
You have exclusive write ownership of:
- `scripts/verify-db.js` (and/or `scripts/test-e2e-db.js`)
- `TEST_READY.md` (at project root)

Your Tasks:
1. Build a comprehensive, automated E2E test verification runner in `scripts/verify-db.js` that tests the live Neon database and Drizzle ORM against all requirements:
   - Tier 1: Environment variable check & active Neon DB connection heartbeat (`SELECT 1`), schema exports check (all 9 tables present).
   - Tier 2: Schema constraints & types validation (PK format, FK column types, cascade behavior, non-null checks).
   - Tier 3: Complete CRUD lifecycle tests across all entities:
     * User CRUD (insert, select, update, delete)
     * Student profile CRUD linked to User
     * Industry profile CRUD linked to User
     * Institute profile CRUD linked to User
     * Questions CRUD linked to Industry/Student
     * Ratings CRUD linked to Question/User
     * Drizzle Relational Queries (`db.query.user.findFirst(...)`, `db.query.students.findMany(...)`, `with: { ... }`)
   - Tier 4: Real-world scenarios & cascade deletion:
     * Better Auth persistence simulation (creating user, inserting account for OAuth, creating session, validating session lookup)
     * Cascade deletion verification: Deleting user removes student, session, account records automatically
   - Tier 5: Boundary & corner cases (special characters, unicode, edge data types).
2. The test runner must output clear structured results, execution duration, assertion counts, and exit with code 0 on success (or code 1 on failure).
3. Run the test runner against the database once the schemas are ready or provide a self-contained runner.
4. When the test runner is complete and validated, create `e:\sih_2026_044\TEST_READY.md` summarizing the test suite, test commands, tiers, and coverage.
5. Write your handoff report to `e:\sih_2026_044\.agents\test_writer_e2e\handoff.md` and notify parent.
