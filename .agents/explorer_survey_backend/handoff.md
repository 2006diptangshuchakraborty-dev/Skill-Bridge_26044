# Hard Handoff Report — Backend API, Services, Lifecycle Events & Test Harness Survey

**Author**: Explorer Subagent (Backend API, Lifecycle & Test Specialist)  
**Date**: 2026-08-25  
**Type**: Hard Handoff (Investigation Complete)  
**Working Directory**: `e:\sih_2026_044\.agents\explorer_survey_backend`  
**Target File**: `e:\sih_2026_044\.agents\explorer_survey_backend\handoff.md`  
**Full Analysis Report**: `e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md`

---

## 1. Observation

1. **Backend Route Layout & Handlers**:
   - `app/api/**` contains 23 route handler files across authentication (`app/api/auth/[...all]/route.js`, `signup-intent/route.js`), profiles (`student/profile/route.js`, `organization/profile/route.js`), assessments (`assessments/start/route.js`, `assessments/[attemptId]/submit/route.js`), admin governance (`admin/verifications/route.js`, `admin/users/route.js`, `admin/audit-logs/route.js`, `admin/questions/route.js`), and matching (`applications/route.js`, `match/route.js`, `skills/claim/route.js`, `verify/[verificationId]/route.js`).
2. **Better Auth Security & Session Resolution**:
   - `lib/auth.js:37-61`: Configures `role`, `accountStatus`, `onboardingStatus`, `profileCompleted` with `input: false` prohibiting client tampering.
   - `lib/auth.js:77-153`: `databaseHooks.user.create.before` resolves cryptographic pre-OAuth intent tokens from `sb_signup_intent` cookie or query param.
   - `lib/auth-guard.js:84-250`: `withAuth` HOF enforces zero-trust session authentication, account status checks (blocking `SUSPENDED` / `DEACTIVATED`), allowed roles (`roles: ['STUDENT', 'INDUSTRY', 'ADMIN']`), KYC gatekeeping, tenant IDOR verification, and immutable audit logging.
3. **Platform Lifecycle Handlers**:
   - Applications: `app/api/applications/route.js:57` creates applications with initial status `APPLIED`. `lib/db.js:444-456` (`updateApplicationStatus`) updates status (`REVIEWED`, `SHORTLISTED`, etc.).
   - Assessments: `lib/assessment-engine.js:56-80` creates attempts in `IN_PROGRESS`. `lib/scoring-engine.js:143-200` evaluates attempts to `EVALUATED` and creates `verifications` (0-100 skill score).
   - Internships: `lib/db.js:583-637` (`submitFeedbackReport`) manages employer evaluations and skill evidence elevation.
4. **Test Harness & Test Suites**:
   - `tests/test-auth-suite.js`: Executes 33 tests across 4 tiers with 100% pass rate in 31ms (`node tests/test-auth-suite.js` -> exit code 0).
   - `tests/test-verification-system.js`: Executes 8 skill verification tests in <10ms (`node tests/test-verification-system.js` -> exit code 0).
   - `scripts/test-matching-rules.js`: Executes 13 matching rules tests in <10ms (`node scripts/test-matching-rules.js` -> exit code 0).
   - Total existing coverage: **54 passing tests** with zero external test runner dependencies.

---

## 2. Logic Chain

1. **Step 1 (Authentication Integration)**:
   - Observation: Better Auth sessions are resolved via `resolveApiSession` (`lib/auth-guard.js:20-79`) and protected via `withAuth`.
   - Invariant: Every rating submission must be performed by an authenticated user whose identity and role (`STUDENT`, `INDUSTRY`, `INSTITUTE`) are server-verified. Self-rating (`reviewerUserId === targetUserId` or `reviewerUserId === targetEntityId`) must be rejected.
2. **Step 2 (Verified Interaction Pre-requisite)**:
   - Observation: Applications transition to `REVIEWED`, interviews to `INTERVIEW_COMPLETED`, and internships to `INTERNSHIP_COMPLETED`.
   - Invariant: `getRatingEligibility()` must verify that a valid `rating_interactions` record exists for the given `interactionId` and that the interaction state is complete. Ratings for unverified views or unreviewed applications must return `eligible: false`.
3. **Step 3 (Context-Specific Category Scoring)**:
   - Observation: Application review ratings must evaluate application quality and communication, whereas internship ratings evaluate work quality and delivery.
   - Invariant: Rating categories must be strictly partitioned by `contextType` with 1–5 star integer scoring and weighted mean calculation.
4. **Step 4 (Two-Way Blind Review Engine)**:
   - Observation: Dual-party interactions (like internships) require mutual honest feedback without bias from reading the other party's review first.
   - Invariant: When `isBlind: true`, the first rating submitted must be held in `PENDING_PUBLICATION`. Once the counterparty submits (or the 14-day deadline expires), both ratings publish simultaneously (`PUBLISHED`).
5. **Step 5 (Anti-Fraud & Compound Uniqueness)**:
   - Observation: Fraudulent users may attempt duplicate submissions or automated spam.
   - Invariant: Database-level unique index on `(interactionId, reviewerUserId)` prevents duplicate submissions. Rate-limiting guards restrict submission velocity to 10 ratings/hour.
6. **Step 6 (Admin Moderation & Aggregates)**:
   - Observation: Inappropriate reviews must be flaggable and contestable.
   - Invariant: Admin moderation API allows hiding/restoring reviews with full audit logging (`RATING_HIDDEN`, `RATING_RESTORED`). `recalculateProfileRatings` updates pre-computed averages, counts, distributions, and trust scores.

---

## 3. Caveats

1. **Database Adapter Mode**: Neon Serverless PostgreSQL is the primary database in production; however, for local dev and headless tests, `lib/db.js` JSON fallback is active. All rating services must support both Drizzle ORM queries and local JSON DB fallbacks.
2. **Entity Terminology**: Existing database code uses `organization_profile` and `companies` as table/collection names for historical compatibility, but all customer-facing domain objects, enums, APIs, and UI labels must strictly enforce `Industry` (or `Student` and `Institute`).

---

## 4. Conclusion

The platform architecture is clean, highly modular, and ready for the implementation of Requirements R1 through R5:
1. **Schema Extension**: 10 tables and custom enums in `db/schema.js` and `lib/db.js`.
2. **Rating Service**: `lib/rating-engine.js` implementing `getRatingEligibility()`, `createRating()`, `resolveBlindPublication()`, `recalculateProfileRatings()`, and anti-fraud checks.
3. **API Endpoints**: `app/api/ratings/**` and `app/api/admin/ratings/**` wrapped with `withAuth`.
4. **Lifecycle Hooks**: Integrated into `app/api/applications/route.js` and `lib/db.js`.
5. **Test Harness**: `tests/test-rating-system.js` providing 4 tiers of automated opaque-box testing.

---

## 5. Verification Method

To independently verify the backend survey findings:
1. **Run Full E2E Test Suite**:
   ```powershell
   node tests/test-auth-suite.js
   node tests/test-verification-system.js
   node scripts/test-matching-rules.js
   ```
   Confirm all 54 tests pass with exit code 0.
2. **Inspect Survey Artifacts**:
   - Read `e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md`
   - Read `e:\sih_2026_044\.agents\explorer_survey_backend\handoff.md`
3. **Invalidation Conditions**:
   - Any test failure in existing test suites.
   - Inability to resolve Better Auth sessions or signup intents.
   - Non-conformity to the 1-5 star category model or two-way blind review state machine.
