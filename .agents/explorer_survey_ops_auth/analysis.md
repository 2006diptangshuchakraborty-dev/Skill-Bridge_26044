# Operations, Auth & Database Integration Survey Analysis

**Agent**: Operations & Auth Explorer (`explorer_survey_ops_auth`)  
**Timestamp**: 2026-08-26T16:35:00Z  
**Target Repository**: `E:\sih_2026_044`  
**Reference Document**: `.agents/ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This investigation performed a comprehensive, read-only survey of the migration tooling, authentication architecture, Better Auth/Google OAuth database integration, entity CRUD workflows, and Neon PostgreSQL database connectivity across the platform.

### Core Discoveries:
1. **Drizzle Migration & Schema State**:
   - Three migration snapshots exist in `drizzle/`:
     - `20260824180753_omniscient_scrambler` (Core auth, user, profiles, audit)
     - `20260825143422_talented_xorn` (Ratings & reputation engine)
     - `20260826155818_steady_rictor` (Questions bank table + student profile constraints)
   - **Critical Schema Defect**: `db/schema.js` was deleted, while individual files in `db/schema/` (`user.js`, `student.js`, `industry.js`, `institute.js`, `ratings.js`) attempt `require("../schema.js")`. Only `db/schema/questions.js` defines its own table independently.
   - **Drizzle Relations Defect**: `db/schema/index.js` attempts `import { relations } from "drizzle-orm"`, which fails because `drizzle-orm` v1.0.0-rc.4 uses `defineRelations` / `createRelationsHelper`.
   - **Database Connection Export Defect**: `db/index.js` contains 640 lines of commented-out legacy code and exports only `{ db }` via ESM without passing `schema`, causing Better Auth's `drizzleAdapter` (`lib/auth.js`) to fail when accessing `schema.users`.

2. **Better Auth & OAuth Setup**:
   - `lib/auth.js` integrates `better-auth` with `drizzleAdapter(db, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } })`.
   - Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and `BETTER_AUTH_SECRET` are defined in `.env`.
   - Pre-OAuth role selection uses a cryptographic token stored in `signup_intents` and cookie `sb_signup_intent`.
   - Lifecycle hooks enforce role immutability and auto-provision profiles on account creation.

3. **Live Database vs Schema Discrepancy (Empirical Neon Test)**:
   - Direct connection to Neon PostgreSQL (`ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech`) passes.
   - **8 required tables are missing in Neon**: `account`, `admin_profile`, `audit_logs`, `rating_categories`, `rating_category_scores`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`.
   - **13 tables exist in Neon**: `institute`, `organization_profile`, `questions`, `rating_interactions`, `rating_policies`, `rating_reports`, `rating_responses`, `ratings`, `session`, `signup_intents`, `student_profile`, `user`, `verification`.

---

## 2. Drizzle Migration Tooling & Migration History

### 2.1. Migration Directory Layout (`drizzle/`)
The repository contains 3 migration sets generated under Drizzle Kit v1.0.0-rc.4:

| Migration Folder | Timestamp / Name | Created Tables & Enums | Alterations |
| :--- | :--- | :--- | :--- |
| `drizzle/20260824180753_omniscient_scrambler` | `20260824180753` | **Enums**: `account_status`, `audit_action`, `onboarding_status`, `org_verification_status`, `user_role`<br>**Tables**: `account`, `admin_profile`, `audit_logs`, `institute`, `organization_profile`, `session`, `signup_intents`, `student_profile`, `user`, `verification` | Initial base schema with foreign key cascades on `user.id`. |
| `drizzle/20260825143422_talented_xorn` | `20260825143422` | **Enums**: `rating_appeal_status`, `rating_context_type`, `rating_interaction_status`, `rating_interaction_type`, `rating_recommendation`, `rating_report_reason`, `rating_report_status`, `rating_status`<br>**Tables**: `rating_aggregates`, `rating_appeals`, `rating_audit_logs`, `rating_categories`, `rating_category_scores`, `rating_interactions`, `rating_policies`, `rating_reports`, `rating_responses`, `ratings` | Foreign key references to `user.id`, `ratings.id`, `rating_interactions.id`. |
| `drizzle/20260826155818_steady_rictor` | `20260826155818` | **Tables**: `questions` (24 columns, primary key `question_code`) | Altered `student_profile` columns (`skills`, `projects`, `certifications`, `experience`) to `NOT NULL`. |

### 2.2. Drizzle Configuration Analysis (`drizzle.config.js`)
File: `e:\sih_2026_044\drizzle.config.js` (lines 11–22):
```javascript
module.exports = defineConfig({
  schema: [
    "./db/schema/user.js",
    "./db/schema/student.js",
    "./db/schema/industry.js",
    "./db/schema/institute.js",
    "./db/schema/questions.js",
    "./db/schema/ratings.js"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
```

### 2.3. Critical Schema File Breakages
1. **Missing `db/schema.js`**:
   - In `db/schema/user.js`: Line 1 has `const schema = require("../schema.js");`
   - In `db/schema/student.js`: Line 1 has `const schema = require("../schema.js");`
   - In `db/schema/industry.js`: Line 1 has `const schema = require("../schema.js");`
   - In `db/schema/institute.js`: Line 1 has `const schema = require("../schema.js");`
   - In `db/schema/ratings.js`: Line 1 has `const schema = require("../schema.js");`
   - **Impact**: All these individual files throw `MODULE_NOT_FOUND` when executed or read by Drizzle Kit.

2. **Broken Schema Aggregator (`db/schema/index.js`)**:
   - Line 1: `import { relations } from "drizzle-orm";` — In `drizzle-orm` v1.0.0-rc.4, `relations` is not exported as a top-level named export.
   - Lines 2–31: ESM imports from `./user.js`, `./student.js`, etc., which are broken CommonJS stubs.
   - Lines 139–179: Defines relational fields with invalid table references (`questions.industryId`, `ratings.questionId`, `ratings.studentId`) that do not exist in the underlying PostgreSQL table definitions.

3. **`db/index.js` Connection File**:
   - Lines 1–638 are commented out.
   - Lines 650–657 contain:
     ```javascript
     import "dotenv/config";
     import { drizzle } from "drizzle-orm/neon-http";
     import { neon } from "@neondatabase/serverless";

     const sql = neon(process.env.DATABASE_URL);
     export const db = drizzle(sql);
     ```
   - **Defect**: Does not pass `schema` into `drizzle(sql, { schema })`, does not export `schema`, `pool`, or helper methods.

---

## 3. Better Auth & Google OAuth Architecture

### 3.1. Auth Server Configuration (`lib/auth.js`)
File: `e:\sih_2026_044\lib\auth.js`

1. **Adapter Integration**:
   ```javascript
   export const auth = betterAuth({
     database: drizzleAdapter(db, {
       provider: "pg",
       schema: {
         user: schema.users,
         session: schema.sessions,
         account: schema.accounts,
         verification: schema.verifications,
       },
     }),
     secret: process.env.BETTER_AUTH_SECRET,
     baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
     ...
   });
   ```

2. **OAuth Provider**:
   - Google Social Provider configured via `googleClientId` and `googleClientSecret`.
   - **Vulnerability / Startup Crash**: Lines 16–18 throw a top-level error if `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is unset, crashing server startup during offline/mock test execution.

3. **Extended User Schema Fields**:
   - `role` (enum / string, default `STUDENT`, `input: false`)
   - `accountStatus` (string, default `PENDING`, `input: false`)
   - `onboardingStatus` (string, default `NOT_STARTED`, `input: false`)
   - `profileCompleted` (boolean, default `false`, `input: false`)
   - Marking `input: false` ensures client registration payloads cannot inject roles or elevate privilege.

### 3.2. Pre-OAuth Role Handshake Flow
Pre-OAuth role registration prevents role escalation and preserves intended role across Google OAuth redirects:
1. **Intent Generation** (`POST /api/auth/signup-intent`):
   - Client sends `{ role: "STUDENT" | "ORGANIZATION" | "INSTITUTE" }`.
   - `createSignupIntent` in `lib/signup-intent.js` generates a 32-byte cryptographic token (TTL: 15 minutes).
   - Admin registration is strictly blocked (`ADMIN_REGISTRATION_FORBIDDEN`, 403).
   - Sets secure httpOnly cookie `sb_signup_intent=<token>`.
2. **OAuth Authorization**:
   - Client initiates Google OAuth via Better Auth (`signIn.social({ provider: "google" })`).
3. **Database Creation Hook** (`databaseHooks.user.create.before`):
   - Extracts intent token from `state` param, query param, or `sb_signup_intent` cookie.
   - If `INITIAL_ADMIN_EMAIL` matches, sets `role: "ADMIN"`, `accountStatus: "ACTIVE"`, `onboardingStatus: "COMPLETED"`.
   - Otherwise, sets validated `assignedRole` and marks intent as consumed (`markIntentUsed`).
4. **Post-Creation Profile Auto-Provisioning** (`databaseHooks.user.create.after`):
   - Based on assigned role, inserts initial 1:1 profile record into `student_profile`, `organization_profile`, `institute`, or `admin_profile`.
   - Generates immutable audit log entries for `ACCOUNT_CREATED` and `ROLE_ASSIGNED`.

### 3.3. Role Immutability on Update
`databaseHooks.user.update.before` strips `role`, `accountStatus`, and `id` from any incoming update payload:
```javascript
update: {
  before: async (user, context) => {
    const sanitized = { ...user };
    delete sanitized.role;
    delete sanitized.accountStatus;
    delete sanitized.id;
    return { data: sanitized };
  },
}
```

### 3.4. Session Resolution & Edge Protection
1. **Edge Middleware** (`middleware.js`):
   - Intercepts `/student/*`, `/industry/*`, `/organization/*`, `/recruiter/*`, `/institute/*`, `/profile/*`, `/admin/*`.
   - Checks session cookie `better-auth.session_token` (or test headers in development).
   - Redirects incomplete profiles (`profileCompletion < 70%`) to `/profile/setup`.
   - Immediately terminates access for `accountStatus === "SUSPENDED"` or `"DEACTIVATED"`, redirecting to `/account-suspended`.
2. **API Route Guard** (`lib/auth-guard.js`):
   - `withAuth(handler, { roles, requireActive, requireOnboarded, requireApprovedOrg })` wraps Next.js route handlers.
   - Resolves session via `auth.api.getSession({ headers })` or fallback session lookup.

---

## 4. Entity CRUD Operations & Interaction Patterns

The repository utilizes a dual-layer approach: Drizzle ORM queries for PostgreSQL operations and `lib/db.js` for in-memory JSON fallback operations (`data/db.json`).

### 4.1. User Operations
- **Tables**: `user` (Drizzle model `users`), `session` (`sessions`), `account` (`accounts`), `verification` (`verifications`).
- **Primary Key**: Text (UUID or prefix string e.g. `usr_...`).
- **API Routes**:
  - `GET /api/admin/users`: Admin user list with role/status filters.
  - `PATCH /api/admin/users`: Admin status change (ACTIVE/SUSPENDED/DEACTIVATED).
  - Better Auth catch-all: `GET/POST /api/auth/[...all]`.

### 4.2. Student Profile Operations
- **Table**: `student_profile` (Drizzle model `studentProfiles`).
- **Foreign Key**: `user_id` -> `user.id` (`ON DELETE CASCADE`, unique 1:1).
- **Attributes**: `fullName`, `phone`, `email`, `headline`, `bio`, `institute_id`, `institute_name`, `department`, `degree`, `graduation_year`, `year_of_study`, `cgpa`, `skills` (JSONB), `projects` (JSONB), `certifications` (JSONB), `experience` (JSONB), `career_preferences` (JSONB), `profile_completion` (integer), `current_onboarding_step` (integer).
- **API Routes**:
  - `GET /api/student/onboarding`: Retrieves draft onboarding state and completion calculation.
  - `POST/PUT /api/student/onboarding`: Saves onboarding steps (1–5) and validates completion.
  - `GET/POST /api/student/profile`: Full profile query and updates.
  - `POST /api/skills/claim`: Skill claiming with endorsement tracking.

### 4.3. Industry / Organization Profile Operations
- **Table**: `organization_profile` (Drizzle model `organizationProfiles`).
- **Foreign Key**: `user_id` -> `user.id` (`ON DELETE CASCADE`, unique 1:1).
- **Attributes**: `company_name`, `registration_number` (unique), `tax_id_gstin`, `company_type`, `industry`, `company_size`, `website`, `logo_url`, `contact_phone`, `address` (JSONB), `primary_contact_name`, `documents` (JSONB), `verification_docs` (JSONB), `verification_status` (`org_verification_status` ENUM), `verified_by_admin_id`.
- **API Routes**:
  - `GET /api/organization/onboarding` & `POST/PUT /api/organization/onboarding`.
  - `GET/PUT /api/organization/profile`.
  - `GET/POST /api/opportunities`: Job/internship creation and gating.

### 4.4. Institute Profile Operations
- **Table**: `institute` (Drizzle model `instituteProfiles`).
- **Foreign Key**: `user_id` -> `user.id` (`ON DELETE CASCADE`, unique 1:1).
- **Attributes**: `institute_name`, `institute_code` (unique), `institute_type`, `address` (JSONB), `departments` (JSONB), `placement_contact` (JSONB), `verification_status`, `verification_docs` (JSONB), `profile_completion`.
- **API Routes**:
  - `GET /api/institute/onboarding` & `POST/PUT /api/institute/onboarding`.
  - `GET /api/students`: Institute talent pool viewer.

### 4.5. Questions Table Operations
- **Table**: `questions` (Drizzle model `questionTable` in `db/schema/questions.js`).
- **Primary Key**: `question_code` (varchar 255).
- **Attributes**: `field`, `exam`, `subject`, `chapter`, `topic`, `subtopic`, `exam_date`, `exam_shift`, `question_type`, `difficulty`, `marks`, `negative_marks`, `question_statement`, `option_a` through `option_f`, `correct_answer`, `solution_text`, `language`, `estimated_time_sec`, `tags`, `status`.
- **API Routes**:
  - `GET /api/admin/questions`: Fetch question catalog.
  - `POST /api/admin/questions`: Save question or generate AI draft.
  - `POST /api/assessments/start`, `GET /api/assessments/[attemptId]`, `POST /api/assessments/[attemptId]/submit`.

### 4.6. Ratings & Reputation System Operations
- **Tables**: `rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, `rating_policies`.
- **Compound Constraints**:
  - `ratings`: Compound unique index `(interaction_id, reviewer_user_id)`.
  - `rating_aggregates`: Compound unique index `(target_role, target_entity_id)`.
  - `rating_category_scores`: Compound unique index `(rating_id, category_id)`.
- **API Routes**:
  - `GET /api/ratings`: List published ratings with aggregated scores.
  - `POST /api/ratings`: Create verified rating with category breakdowns.
  - `GET/POST /api/ratings/[id]/appeal`: Submit rating dispute appeal.
  - `GET/POST /api/ratings/[id]/report`: Flag abusive reviews.
  - `POST /api/admin/ratings/recalculate`: Trigger rating aggregate recomputation.

---

## 5. Database Connectivity & Neon Integration Analysis

### 5.1. Database Connection Architecture
- Connection Driver: `@neondatabase/serverless` Pool & `neon-http` query client.
- `DATABASE_URL` string configured with pooler endpoint:
  `postgresql://neondb_owner:***@ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- Drizzle ORM client: `drizzle-orm/neon-http`.

### 5.2. Empirical Verification Test Execution
Executing `node scripts/test-db.js` against the live Neon endpoint produced:
```text
[db:test] Connection check passed.
[db:test] Database verification failed: Missing expected tables: 
  account, admin_profile, audit_logs, rating_categories, 
  rating_category_scores, rating_appeals, rating_audit_logs, rating_aggregates
```

### 5.3. Public Schema Table Inventory in Neon
Querying `information_schema.tables WHERE table_schema = 'public'` on Neon yielded:

```
Present Tables (13):
├── institute
├── organization_profile
├── questions
├── rating_interactions
├── rating_policies
├── rating_reports
├── rating_responses
├── ratings
├── session
├── signup_intents
├── student_profile
├── user
└── verification

Missing Tables (8):
├── account
├── admin_profile
├── audit_logs
├── rating_categories
├── rating_category_scores
├── rating_appeals
├── rating_audit_logs
└── rating_aggregates
```

### 5.4. Seed Script State (`scripts/seed.js`)
- `scripts/seed.js` currently reads `data/seed.json` and writes to `data/db.json` for JSON mock fallback.
- It contains no logic to populate the live PostgreSQL database in Neon with seed data or default rating categories.

---

## 6. Discrepancies, Architectural Gaps & Actionable Recommendations

| Area | Current Issue / Defect | Exact Location | Recommended Action |
| :--- | :--- | :--- | :--- |
| **Drizzle Schema Structure** | Missing `db/schema.js`; `user.js`, `student.js`, etc. fail with `require("../schema.js")`. | `db/schema/*.js` | Consolidate and reconstruct concrete table models into `db/schema/user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js` without circular dependencies, or export a valid canonical schema. |
| **Drizzle Relations** | `import { relations } from "drizzle-orm"` fails in `drizzle-orm` v1.0.0-rc.4; invalid field references (`industryId`, `questionId`). | `db/schema/index.js` (lines 1, 69–179) | Fix `drizzle-orm` relations syntax or export relation definitions compatible with Drizzle v1. Correct all foreign key and relation property mappings. |
| **Drizzle Config** | `schema` path array in `drizzle.config.js` points to broken files. | `drizzle.config.js` (line 14) | Point `schema` to valid schema files/barrel once repaired. |
| **DB Client Export** | `db/index.js` contains 640 lines of dead comments, exports only `db` via ESM without passing `schema`. | `db/index.js` | Clean up `db/index.js`, initialize Drizzle with `schema`: `export const db = drizzle(sql, { schema });`, and export `schema`, `pool`, and database helper functions. |
| **Better Auth Integration** | Better Auth cannot access `schema.users` / `schema.sessions` / `schema.accounts` / `schema.verifications` because `@/db` does not export `schema`. | `lib/auth.js` (lines 8, 24–28) | Ensure `schema` is cleanly exported from `@/db` and imported by `lib/auth.js`. |
| **Missing Neon Tables** | 8 tables (`account`, `admin_profile`, `audit_logs`, `rating_categories`, etc.) missing in Neon DB. | Neon PostgreSQL DB | Once schema is repaired, execute `drizzle-kit push` or generate/apply migrations to sync all 21 tables to Neon. |
| **Seed & Verification Script** | `scripts/test-db.js` only tests `user` and `student_profile` via raw SQL; `scripts/seed.js` only seeds `db.json`. | `scripts/test-db.js`, `scripts/seed.js` | Expand `test-db.js` to verify full CRUD on User, Student, Industry, Institute, Questions, and Ratings tables using Drizzle ORM client. Add database seed capabilities for default categories. |
