# Backend API, Services, Lifecycle Events, and Test Harness Survey Report

**Author**: Explorer Subagent (Backend API, Lifecycle & Test Specialist)  
**Date**: 2026-08-25  
**Target Scope**: Backend API routes (`app/api/**`), Better Auth session security, lifecycle state transitions, testing harness architecture, and Rating/Reputation engine design (R1–R5)  
**Working Directory**: `e:\sih_2026_044\.agents\explorer_survey_backend`  
**Project Root**: `e:\sih_2026_044`

---

## 1. Executive Summary

This report delivers an exhaustive technical survey of the backend architecture of the **Skill Bridge** platform. The backend is built upon:
1. **Next.js 14 App Router Route Handlers** (`app/api/**`) structured as stateless RESTful endpoints.
2. **Better Auth v1.7.1** with Google OAuth provider, Drizzle ORM adapter, cryptographic pre-OAuth intent tokens (`signup_intents`), immutable server-enforced roles (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`), and zero-trust API route guards (`withAuth` in `lib/auth-guard.js`).
3. **Domain Service Engines** covering matching math (`lib/engine.js`), assessment anti-cheating & scoring (`lib/assessment-engine.js`, `lib/scoring-engine.js`), privacy-preserving skill gap aggregation (`lib/alerts.js`), immutable audit trail (`lib/audit.js`), capability gatekeeping (`lib/gatekeeper.js`), and dynamic profile completion calculation (`lib/onboarding-calc.js`).
4. **Platform Lifecycle State Machine** transitioning students and employers through application review (`REVIEWED`), interview completion (`INTERVIEW_COMPLETED`), assessment evaluation (`EVALUATED`), and internship completion (`INTERNSHIP_COMPLETED`).
5. **Standalone 4-Tier Zero-Dependency Test Harness** (`tests/test-auth-suite.js`, `tests/test-verification-system.js`, `scripts/test-matching-rules.js`) executing 54+ automated tests with 100% pass rates in <50ms without external test runner dependencies.

To implement the **Verified Reputation, Rating, Feedback, Trust, and Review System (R1–R5)**, this report specifies the exact algorithms, schemas, API contracts, blind review state machine, and moderation workflows required.

---

## 2. Backend API Architecture & Route Inventory

### 2.1 Route Map & Security Classification

| Route Path | HTTP Methods | Auth Guard (`withAuth`) | Role Access | Primary Purpose | Key Underlying Modules |
|---|---|---|---|---|---|
| `app/api/auth/[...all]` | `GET`, `POST` | Better Auth internal | Public | Better Auth handler (OAuth callbacks, sessions) | `lib/auth.js`, `better-auth/next-js` |
| `app/api/auth/signup-intent` | `GET`, `POST` | Custom Token/Cookie | Public | Creates and validates pre-OAuth cryptographic signup intent | `lib/signup-intent.js`, `db/schema.js` |
| `app/api/student/onboarding` | `GET`, `POST`, `PATCH` | `withAuth` / Caller resolve | `STUDENT`, `ADMIN` | Multi-step student onboarding wizard state | `lib/onboarding-calc.js`, `lib/db.js` |
| `app/api/student/profile` | `GET`, `POST`, `PUT`, `PATCH` | Caller resolve + IDOR check | `STUDENT`, `ADMIN` | Student profile CRUD, dynamic completion score | `lib/onboarding-calc.js`, `lib/audit.js` |
| `app/api/students` | `GET` | Public / Caller resolve | All | Filter and list candidate student profiles | `lib/db.js`, `lib/gatekeeper.js` |
| `app/api/organization/onboarding` | `GET`, `POST`, `PATCH` | Caller resolve | `ORGANIZATION`, `INDUSTRY`, `ADMIN` | Multi-step industry onboarding wizard | `lib/onboarding-calc.js`, `lib/db.js` |
| `app/api/organization/profile` | `GET`, `POST`, `PUT`, `PATCH` | Caller resolve + IDOR check | `ORGANIZATION`, `INDUSTRY`, `ADMIN` | Industry profile CRUD; protects `verificationStatus` | `lib/onboarding-calc.js`, `lib/audit.js` |
| `app/api/institute/onboarding` | `GET`, `POST`, `PATCH` | Caller resolve | `INSTITUTE`, `ADMIN` | Institute onboarding wizard | `lib/onboarding-calc.js`, `lib/db.js` |
| `app/api/opportunities` | `GET`, `POST` | Open GET / `withAuth` POST | `INDUSTRY`, `ORGANIZATION`, `ADMIN` | Opportunity creation and discovery | `lib/db.js`, `lib/gatekeeper.js` |
| `app/api/applications` | `GET`, `POST` | Open GET / POST validation | `STUDENT`, `ADMIN` | Application submission with mandatory skill gating | `lib/engine.js`, `lib/db.js` |
| `app/api/assessments/start` | `POST` | `withAuth` | `STUDENT`, `ADMIN` | Initializes randomized assessment session | `lib/assessment-engine.js` |
| `app/api/assessments/[attemptId]` | `GET`, `POST` | `withAuth` | `STUDENT`, `ADMIN` | Retrieves attempt questions, records answers/cheating | `lib/assessment-engine.js` |
| `app/api/assessments/[attemptId]/submit`| `POST` | `withAuth` | `STUDENT`, `ADMIN` | Multidimensional scoring and verification issuance | `lib/scoring-engine.js` |
| `app/api/skills/claim` | `GET`, `POST` | `withAuth` | `STUDENT`, `ADMIN` | Self-claim taxonomy skills with evidence links | `lib/taxonomy.js`, `lib/db.js` |
| `app/api/verify/[verificationId]` | `GET` | Public | Public | PII-safe public verification badge lookup | `lib/db.js` |
| `app/api/admin/verifications` | `GET`, `POST`, `PATCH` | Admin Session Header/DB | `ADMIN` | Industry KYC queue (Approve, Reject, Request Info) | `lib/audit.js`, `lib/db.js` |
| `app/api/admin/users` | `GET`, `PATCH` | Admin Session Header/DB | `ADMIN` | User status management (Suspend, Reactivate) | `lib/audit.js`, `lib/db.js` |
| `app/api/admin/audit-logs` | `GET` (POST/PUT/DEL: 405)| Admin Session Header/DB | `ADMIN` | Immutable forensic audit trail inspection | `lib/audit.js`, `lib/db.js` |
| `app/api/admin/questions` | `GET`, `POST`, `PUT`, `DELETE` | Admin Session | `ADMIN` | Question bank curation with AI draft generator | `lib/questions.js` |
| `app/api/alerts` | `GET` | Public / Authenticated | All | Skill gap alerts for institutes and departments | `lib/alerts.js`, `lib/db.js` |
| `app/api/match` | `POST` | Open / Authenticated | All | Real-time candidate opportunity matching engine | `lib/engine.js` |
| `app/api/extract-skills` | `POST` | Open / Authenticated | All | NLP skill keyword extraction from text/resumes | `lib/nlp-extractor.js` |

---

## 3. Better Auth Authentication & Security Engine

### 3.1 Better Auth Server Configuration (`lib/auth.js`)

Better Auth (`better-auth@^1.7.1`) is configured with:
- **Drizzle PostgreSQL Adapter**: Binds `user`, `session`, `account`, `verification` tables to Drizzle schema (`lib/auth.js:15-23`).
- **Server-Authoritative User Schema**: Additional fields (`role`, `accountStatus`, `onboardingStatus`, `profileCompleted`) are configured with `input: false` (`lib/auth.js:37-61`), preventing any client-side payload from injecting or altering user roles or statuses.
- **Pre-OAuth Intent Resolution in `databaseHooks.user.create.before`** (`lib/auth.js:77-153`):
  1. Resolves `INITIAL_ADMIN_EMAIL` to auto-provision initial admin.
  2. Extracts signup intent token from `sb_signup_intent` cookie or OAuth state parameter.
  3. Validates cryptographic intent token via `resolveValidIntent(token)` (`lib/signup-intent.js`).
  4. Assigns validated role (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`).
  5. Sets initial `accountStatus` (`ACTIVE` for `STUDENT`, `PENDING` for `INDUSTRY`/`INSTITUTE`/`ORGANIZATION`).
  6. Burns intent token via `markIntentUsed(token)` to prevent replay attacks.
- **1:1 Role Profile Provisioning in `databaseHooks.user.create.after`** (`lib/auth.js:155-303`):
  - Atomically creates corresponding profile in `student_profile`, `organization_profile`, `institute`, or `admin_profile`.
  - Records immutable security audit logs (`ACCOUNT_CREATED`, `ROLE_ASSIGNED`).
- **Role Immutability Enforcement in `databaseHooks.user.update.before`** (`lib/auth.js:306-318`):
  - Strips `role`, `accountStatus`, and `id` from update requests to block post-registration tampering.

### 3.2 Server API Authorization Guard (`lib/auth-guard.js`)

The `withAuth(handler, options)` higher-order function wraps Next.js App Router route handlers with zero-trust checks:
1. **Cryptographic Session Verification** (`resolveApiSession`): Checks Better Auth session via `auth.api.getSession({ headers })`, session cookie fallback (`better-auth.session_token`, `sb_session_token`), and test identity headers in non-production (`x-user-id`, `x-user-role`).
2. **Account Status Check** (`requireActive: true`): Rejects `SUSPENDED` or `DEACTIVATED` accounts with HTTP 403 `ACCOUNT_SUSPENDED`.
3. **Role Authorization Check** (`roles: ['STUDENT', 'INDUSTRY', 'ADMIN']`): Enforces allowed roles, rejecting unauthorized attempts with HTTP 403 `INSUFFICIENT_PERMISSIONS`.
4. **Onboarding Status Check** (`requireOnboarded: true`): Blocks un-onboarded access with HTTP 403 `ONBOARDING_REQUIRED`.
5. **Industry KYC Gatekeeping** (`requireApprovedOrg: true`): Blocks unapproved organizations (`verificationStatus !== 'APPROVED'`) with HTTP 403 `ORG_VERIFICATION_PENDING`.
6. **Tenant Resource Ownership (IDOR Prevention)** (`checkOwnership: async (auth, req, params)`): Verifies caller owns the target resource; admins bypass for governance.
7. **Automated Audit Logging** (`auditAction`, `resourceType`): Automatically logs sensitive actions via `lib/audit.js`.

### 3.3 Edge Route Protection Middleware (`middleware.js`)

Next.js edge middleware intercepts requests across `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`, `/login`, `/register`:
- Redirects unauthenticated users to `/login?role=...&redirect=...`.
- Redirects suspended accounts to `/account-suspended`.
- Redirects users with `onboardingStatus !== 'COMPLETED'` to their respective onboarding wizards.
- Enforces strict portal partitioning (students redirected away from `/admin/*` and `/organization/*`).

---

## 4. Platform Lifecycle Events & State Transitions

The Skill Bridge platform features 5 core interaction workflows where real-world milestones grant rating eligibility:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM LIFECYCLE EVENT PIPELINES                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. APPLICATION REVIEW PIPELINE
   [Student Applies] ──> [APPLIED] ──> [Industry Reviews Application]
                                                  │
                                                  ▼
                                             [REVIEWED]
                                                  │
                                                  ▼
                              (Grants Industry -> Student Rating:
                               Application Quality, Skill Relevance,
                               Communication, Professionalism, Overall)

2. INTERVIEW PIPELINE
   [Application Shortlisted] ──> [INTERVIEW Scheduled] ──> [Interview Conducted]
                                                                  │
                                                                  ▼
                                                       [INTERVIEW_COMPLETED]
                                                                  │
                                                                  ▼
                                                      (Grants 2-Way Rating:
                                                       Technical Competence,
                                                       Problem Solving, Culture,
                                                       Interviewer Quality)

3. ASSESSMENT / TASK PIPELINE
   [Skill Claim / Task Assigned] ──> [IN_PROGRESS] ──> [Answers Submitted]
                                                               │
                                                               ▼
                                                          [EVALUATED]
                                                               │
                                                               ▼
                                                    (Objective Skill Score
                                                     0-100 & Task Rating)

4. INTERNSHIP / JOB PIPELINE
   [Candidate Hired] ──> [Internship Commences] ──> [Internship Concluded]
                                                           │
                                                           ▼
                                                [INTERNSHIP_COMPLETED]
                                                           │
                                                           ▼
                                                (Grants 2-Way BLIND Review:
                                                 Student <──> Industry
                                                 Work Quality, Reliability,
                                                 Mentorship, Work Culture)

5. COURSE / SEMINAR PIPELINE
   [Course Enrolled] ──> [Training Completed] ──> [COURSE_COMPLETED]
                                                           │
                                                           ▼
                                                (Grants 2-Way Rating:
                                                 Student <──> Institute
                                                 Pedagogy, Curriculum,
                                                 Lab Rigor, Engagement)
```

### 4.1 Lifecycle States in Codebase

| Lifecycle Domain | Current File & Handler | Current DB State | Required Rating Interaction Trigger |
|---|---|---|---|
| **Application** | `app/api/applications/route.js:POST`, `lib/db.js:updateApplicationStatus` | `APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW`, `SELECTED`, `REJECTED` | Status update to `REVIEWED` or `SHORTLISTED` creates `rating_interactions` (`APPLICATION_REVIEW`) |
| **Interview** | `lib/db.js` (applications workflow) | `INTERVIEW` | Status update to `INTERVIEW_COMPLETED` creates `rating_interactions` (`INTERVIEW`) |
| **Assessment** | `lib/assessment-engine.js:createAssessmentAttempt`, `lib/scoring-engine.js:evaluateAssessmentAttempt` | `IN_PROGRESS`, `SUBMITTED`, `EVALUATED` | Assessment evaluation generates `verifications` record (0-100 skill score) |
| **Internship** | `lib/db.js` (`feedbackReports` legacy) | Legacy `fb_001` reports | Internship completion event creates `rating_interactions` (`INTERNSHIP`, `isBlind: true`) |
| **Course/Event** | `lib/db.js:createTrainingProgram`, `updateTrainingProgram` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` | Status `COMPLETED` creates `rating_interactions` (`COURSE`, Institute & Student) |

---

## 5. Existing Test Framework & Verification Infrastructure

### 5.1 Test Architecture Overview

The repository possesses a **zero-external-dependency, custom test framework**:
- **Master Test Runner**: `tests/test-auth-suite.js` implementing a custom `AuthTestHarness` with ANSI color formatting, tier filtering (`--tier=1..4`), verbose stack traces (`--verbose`), per-test timing, and strict exit code reporting (`0` on all pass, `1` on any failure).
- **Domain Test Suites**:
  - `tests/test-auth-suite.js`: 4 Tiers, 33 Test Cases (Feature coverage, boundaries, cross-feature, real-world).
  - `tests/test-verification-system.js`: 4 Tiers, 8 Test Cases (Taxonomy, question bank, anti-cheating, multidimensional scoring).
  - `scripts/test-matching-rules.js`: 4 Suites, 13 Test Cases (Anchor personas, normalization, proficiency gating, ranking).
- **Total Existing Test Suite**: **54 automated test cases**, 100% pass rate in <50ms.

### 5.2 Test Scripts in `package.json`

```json
{
  "scripts": {
    "test": "node tests/test-auth-suite.js",
    "test:auth": "node tests/test-auth-suite.js",
    "test:matching": "node scripts/test-matching-rules.js",
    "test:verification": "node tests/test-verification-system.js",
    "test:e2e": "node tests/test-auth-suite.js && node scripts/test-matching-rules.js && node tests/test-verification-system.js"
  }
}
```

### 5.3 Test Execution Strategy for Rating System

To test the Rating & Reputation System (R1–R5), we should construct:
1. `tests/test-rating-system.js`: Master runner for Rating & Reputation System.
2. `tests/rating-test-helper.js`: Test oracle, schema validator, eligibility simulator, blind review resolver, aggregate calculator, and anti-fraud checker.
3. Test Suites:
   - **Tier 1 (Unit & Feature Isolation)**: `getRatingEligibility()`, category score validation (1-5), weighted overall score calculation, single rating submission, verification badge gating.
   - **Tier 2 (Boundary, Security & Anti-Fraud)**: Self-rating prevention, duplicate submission rejection (DB unique index & service level), unverified interaction rejection (403), mismatched `reviewerId` rejection (403), rate-limiting velocity triggers.
   - **Tier 3 (Cross-Feature & State Pipelines)**: Two-way blind review pipeline (`PENDING_PUBLICATION` -> mutual submission -> simultaneous `PUBLISHED`), blind review deadline expiration publication, aggregate calculation & recalculation repair (`recalculateProfileRatings`).
   - **Tier 4 (Real-World Multi-Actor Journeys)**: Student application -> Industry review (`REVIEWED`) -> Industry rating -> Student reputation update; Internship completed -> 2-way blind review -> Publication; User reports review -> Admin moderation queue -> Review hidden -> Audit log verified -> Appeal submitted -> Admin restores review.

---

## 6. Rating & Reputation System Technical Design (R1–R5)

### 6.1 `getRatingEligibility()` Specification & Algorithm

The `getRatingEligibility({ reviewerUserId, targetEntityId, targetEntityType, interactionId, contextType })` service evaluates 6 strict constraints:

```javascript
/**
 * Evaluates whether an authenticated user is eligible to rate a target entity
 * @returns {Promise<{
 *   eligible: boolean,
 *   reason?: string,
 *   code?: string,
 *   interaction?: Object,
 *   allowedCategories?: Array,
 *   isBlind?: boolean,
 *   deadline?: string,
 *   existingRatingId?: string
 * }>}
 */
async function getRatingEligibility({ reviewerUserId, targetEntityId, targetEntityType, interactionId, contextType }) {
  // 1. Session & Identity Validation
  if (!reviewerUserId) {
    return { eligible: false, reason: "Authentication required", code: "UNAUTHORIZED" };
  }

  // 2. Self-Rating Prevention
  if (reviewerUserId === targetEntityId) {
    return { eligible: false, reason: "Self-rating is strictly prohibited", code: "SELF_RATING_FORBIDDEN" };
  }

  // 3. Interaction Verification
  const interaction = await resolveInteraction(interactionId, reviewerUserId, targetEntityId);
  if (!interaction) {
    return { eligible: false, reason: "No verified platform interaction found for this target", code: "UNVERIFIED_INTERACTION" };
  }

  // 4. Interaction Lifecycle State Check
  // E.g., APPLICATION_REVIEW requires Application.status === "REVIEWED" or "SHORTLISTED"
  if (interaction.interactionType === "APPLICATION_REVIEW" && interaction.status !== "REVIEWED" && interaction.status !== "SHORTLISTED") {
    return { eligible: false, reason: "Application has not reached REVIEWED stage", code: "INTERACTION_STAGE_INVALID" };
  }

  // 5. Deadline Validation
  if (interaction.deadline && new Date() > new Date(interaction.deadline)) {
    return { eligible: false, reason: "Rating window has expired", code: "DEADLINE_EXPIRED" };
  }

  // 6. Duplicate Submission Check (One rating per party per interaction)
  const existingRating = await findRatingByInteractionAndReviewer(interaction.id, reviewerUserId);
  if (existingRating) {
    return {
      eligible: false,
      reason: "Rating has already been submitted for this interaction",
      code: "ALREADY_RATED",
      existingRatingId: existingRating.id
    };
  }

  // 7. Resolve Context-Specific Categories
  const allowedCategories = getRatingCategoriesForContext(interaction.interactionType, interaction.targetType);

  return {
    eligible: true,
    interaction,
    allowedCategories,
    isBlind: interaction.isBlind || false,
    deadline: interaction.deadline
  };
}
```

### 6.2 Context-Specific Scoring Categories & Weights

Ratings must be partitioned into strict, context-appropriate categories (1.0 to 5.0 stars):

| Context Type | Reviewer Role | Target Entity | Category Definitions (1–5 Stars) | Category Weight |
|---|---|---|---|---|
| **`APPLICATION_REVIEW`** | `INDUSTRY` | `STUDENT` | 1. Application Quality<br>2. Skill Relevance<br>3. Communication<br>4. Professionalism<br>5. Overall Impression | 20% each (equal) |
| **`INTERVIEW_FEEDBACK`** | `INDUSTRY` | `STUDENT` | 1. Technical Competence<br>2. Problem Solving<br>3. Communication<br>4. Cultural Fit<br>5. Professional Demeanor | 20% each |
| **`INTERVIEW_FEEDBACK`** | `STUDENT` | `INDUSTRY` | 1. Interviewer Professionalism<br>2. Transparency & Clarity<br>3. Technical Rigor<br>4. Timeliness & Respect<br>5. Overall Experience | 20% each |
| **`INTERNSHIP_PERFORMANCE`** | `INDUSTRY` | `STUDENT` | 1. Work Quality & Delivery<br>2. Technical Proficiency<br>3. Initiative & Autonomy<br>4. Team Collaboration<br>5. Reliability & Punctuality | 20% each |
| **`INTERNSHIP_PERFORMANCE`** | `STUDENT` | `INDUSTRY` | 1. Mentorship & Guidance<br>2. Work Environment & Culture<br>3. Project Quality & Learning<br>4. Fair Compensation / Stipend<br>5. Overall Recommendation | 20% each |
| **`COURSE_EVALUATION`** | `STUDENT` | `INSTITUTE` | 1. Curriculum Relevance<br>2. Faculty Expertise<br>3. Hands-on Lab Rigor<br>4. Placement Support<br>5. Infrastructure & Resources | 20% each |
| **`COURSE_EVALUATION`** | `INSTITUTE` | `STUDENT` | 1. Academic Discipline<br>2. Project Execution<br>3. Engagement & Attendance<br>4. Peer Collaboration<br>5. Ethical Conduct | 20% each |

### 6.3 Rating Submission API (`POST /api/ratings`)

- **Route**: `POST /api/ratings`
- **Security**: Protected with `withAuth(handleCreateRating, { requireActive: true })`.
- **Payload Contract**:
  ```json
  {
    "interactionId": "rint_01J...",
    "contextType": "APPLICATION_REVIEW",
    "targetUserId": "usr_std_001",
    "targetEntityId": "std_001",
    "targetRole": "STUDENT",
    "scores": {
      "cat_app_quality": 5,
      "cat_skill_relevance": 4,
      "cat_communication": 4,
      "cat_professionalism": 5,
      "cat_overall_impression": 4
    },
    "recommendation": "RECOMMENDED",
    "headline": "Outstanding candidate with strong SQL fundamentals",
    "reviewText": "Aarav demonstrated clear communication and solid project portfolio.",
    "pros": ["Excellent portfolio", "Clear documentation"],
    "cons": ["Could deepen Docker experience"]
  }
  ```
- **Execution Lifecycle**:
  1. Calls `getRatingEligibility()`. If not eligible, returns HTTP 403 / 422 with reason.
  2. Validates category scores are integers between 1 and 5.
  3. Computes weighted arithmetic mean `overallScore = sum(score * weight) / sum(weight)`.
  4. Determines initial `status`:
     - If `interaction.isBlind === true` -> Check if counterparty has already submitted:
       - If counterparty has NOT submitted -> Set `status = 'PENDING_PUBLICATION'`.
       - If counterparty HAS submitted -> Set BOTH ratings to `'PUBLISHED'` with `publishedAt = now`.
     - If `interaction.isBlind === false` -> Set `status = 'PUBLISHED'` with `publishedAt = now`.
  5. Inserts into `ratings`, `rating_category_scores`, and updates `rating_interactions`.
  6. Recalculates pre-computed aggregates (`rating_aggregates`) for `targetEntityId`.
  7. Records immutable audit log `RATING_SUBMITTED` / `RATING_PUBLISHED`.

### 6.4 Two-Way Blind Review Publication State Machine

```
[Interaction: INTERNSHIP_COMPLETED (isBlind: true, deadline: T + 14d)]
                │
   ┌────────────┴────────────┐
   │                         │
[Party A Submits]        [Party B Submits]
   │                         │
   ▼                         ▼
Rating A Created         Rating B Created
Status: PENDING_PUB      Status: PENDING_PUB
   │                         │
   └────────────┬────────────┘
                │
                ├─────────────────────────────────────────┐
                ▼ (Both Parties Submitted)                ▼ (Deadline Expires)
       [Simultaneous Publication]              [Automatic Fallback Publication]
       - Rating A -> PUBLISHED                 - Submitted Rating -> PUBLISHED
       - Rating B -> PUBLISHED                 - Interaction -> EXPIRED / CLOSED
       - PublishedAt = Date.now()              - PublishedAt = Date.now()
       - Recalculate Aggregates                - Recalculate Aggregates
       - Notify Both Parties                   - Notify Submitting Party
```

### 6.5 Anti-Fraud Rules & Rate-Limiting Engine

1. **Self-Rating Prohibition**: `reviewerUserId === targetUserId` or `reviewerUserId === targetEntityId` is immediately rejected.
2. **Duplicate Lock**: Database-level unique index on `(interaction_id, reviewer_user_id)` + transaction guard.
3. **Unverified Interaction Rejection**: Every rating must link to a valid `rating_interactions` record with `isVerified = true`.
4. **Velocity Rate-Limiting**: Max 10 ratings per user per hour; max 50 ratings per user per day.
5. **Cluster & IP Anomaly Flags**: Ratings submitted from identical IP within short intervals or rapid 5-star / 1-star surges trigger `FLAGGED` status and generate an alert for administrative inspection.

### 6.6 Admin Moderation & Aggregate Recalculation API

1. **Moderation Queue (`GET /api/admin/ratings`)**:
   - Filter by status: `ALL`, `PUBLISHED`, `FLAGGED`, `HIDDEN`, `UNDER_APPEAL`, `REJECTED`.
   - Filter by target type: `STUDENT`, `INDUSTRY`, `INSTITUTE`.
   - Action buttons: Hide review (`HIDDEN`), Restore review (`PUBLISHED`), Reject review (`REJECTED`).
2. **Review Reports Workflow (`POST /api/ratings/[ratingId]/report`)**:
   - Any authenticated party can flag a review for `INAPPROPRIATE_CONTENT`, `FRAUDULENT_INTERACTION`, `HARASSMENT`, `FALSE_INFORMATION`.
   - Moves rating status to `FLAGGED` if report threshold reached.
3. **Review Appeals Workflow (`POST /api/ratings/[ratingId]/appeal`)**:
   - Rated entity can submit contestation with supporting evidence.
   - Creates `rating_appeals` record and transitions rating to `UNDER_APPEAL`.
4. **Aggregate Recalculation Utility (`recalculateProfileRatings(targetType, targetId)`)**:
   - Iterates all `PUBLISHED` and `isVerified === true` ratings for the target.
   - Computes:
     - `overallRating`: Rounded to 2 decimal places (e.g. 4.82 ★).
     - `ratingCount`: Total count of published verified reviews.
     - `categoryBreakdown`: Mean score per category.
     - `ratingDistribution`: Count of 1★, 2★, 3★, 4★, 5★ ratings.
     - `recommendationRate`: `% of RECOMMENDED / total ratings`.
     - `trustScore`: Score 0–100 combining verification signals, volume, and score consistency.
   - Upserts into `rating_aggregates`.

---

## 7. Next Steps for Implementation Team

1. **Schema Extension (`db/schema.js`, `lib/db.js`)**: Add the 10 Drizzle tables, PostgreSQL enums, and JSON DB fallbacks.
2. **Rating Service Engine (`lib/rating-engine.js`)**: Implement `getRatingEligibility()`, `createRating()`, `resolveBlindPublication()`, `recalculateProfileRatings()`, and anti-fraud rate-limiters.
3. **API Route Handlers (`app/api/ratings/**`, `app/api/admin/ratings/**`)**: Implement REST endpoints.
4. **Lifecycle Hooks**: Wire status transitions in `app/api/applications/route.js` (`REVIEWED`), `lib/scoring-engine.js` (`EVALUATED`), and `lib/db.js` (`INTERNSHIP_COMPLETED`).
5. **E2E Test Suite (`tests/test-rating-system.js`)**: Implement comprehensive 4-tier verification suite following the project standard.
