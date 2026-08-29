# Database Schema, Drizzle ORM, and Better Auth Deep-Dive Analysis

## Executive Summary
This report provides a forensic investigation of the Database Schema, Drizzle ORM configuration, Better Auth integration, User & Role modeling, Profile Persistence, and Migration architecture in the SIH 2026 Skill Mapping Platform (`e:\sih_2026_044`).

Key Findings:
1. **Authoritative Single Identity & Role Invariant**: The database enforces a single authoritative identity model where `user.email` is unique and `user.role` is stored permanently in the PostgreSQL `user` table via PostgreSQL enum `user_role` (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`). Cross-role duplicate accounts with the same email are strictly prohibited by schema unique constraints and Better Auth account linking.
2. **Better Auth & Drizzle Adapter Architecture**: Better Auth 1.7.1 is integrated with Drizzle ORM via `drizzleAdapter` in `lib/auth.js`. Core tables (`user`, `session`, `account`, `verification`) are mapped directly to `db/schema/user.js`. Account resolution uses the required `issuer` and `accountId` composite unique index (`account_issuer_account_idx`).
3. **Pre-OAuth Signup Intent Handshake**: Pre-OAuth role selection is executed via cryptographic intent tokens (`/api/auth/signup-intent`, `lib/signup-intent.js`) stored in httpOnly `sb_signup_intent` cookies. Better Auth consumes this intent in `databaseHooks.user.create.before` (`lib/auth.js:220-439`) to immutably stamp the user's role on account creation.
4. **Unified Profile Persistence**: Profile saving is centralized in `app/api/profile/setup/route.js`, targeting relational profile tables `students`, `industries`, and `institutes`. Ownership is strictly anchored to `session.user.id`, ignoring client-supplied IDs and role overrides.
5. **Critical Gaps Identified**:
   - **User Onboarding State Desynchronization**: `app/api/profile/setup/route.js` updates profile tables (`students`, `industries`, `institutes`) but does not execute an `UPDATE` on `user.onboardingStatus` and `user.profileCompleted` in the `user` table.
   - **Missing `signup_intents` Table in Drizzle Schema**: `lib/signup-intent.js` attempts to query `schema.signupIntents`, but this table is omitted from `db/schema/user.js` and only exists in local fallback memory.
   - **Environment Variable Loading in Scripts**: `scripts/test-db.js` and `scripts/migrate-neon-direct.js` call `dotenv.config()` without specifying `.env.local`.

---

## 1. Database Schema & Drizzle ORM Configuration

### 1.1 Drizzle Config & Connection Setup
- **Configuration File**: `e:\sih_2026_044\drizzle.config.js`
  - Dialect: `postgresql`
  - Schema Path: `./db/schema/index.js`
  - Migration Output Path: `./drizzle`
  - Environment Loading: `dotenv.config({ path: ".env.local" })`
  - Strict & Verbose: `strict: true`, `verbose: true`
- **Database Client & Schema Aggregation**: `e:\sih_2026_044\db\index.js`
  - Neon Serverless SQL Client: `neon(databaseUrl)` from `@neondatabase/serverless`
  - Drizzle Client: `drizzle({ client: sql, schema })` from `drizzle-orm/neon-http`
  - Schema Object: Exports `{ ...user, ...student, ...industry, ...institute, ...questions, ...ratings }`
- **Schema Index**: `e:\sih_2026_044\db\schema\index.js`
  - Re-exports all entities from `user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`, and `mcqQuestions.js`.

### 1.2 Table Specifications & Relationships

| Table Name | Schema File | Primary Key | Foreign Keys | Key Indexes | Purpose |
|------------|-------------|-------------|--------------|-------------|---------|
| `user` | `db/schema/user.js:33` | `id` (`text`) | None | `user_email_idx` (unique), `user_role_idx`, `user_status_idx` | Better Auth core user identity, role, account status, onboarding flags |
| `session` | `db/schema/user.js:57` | `id` (`text`) | `userId` -> `user.id` (CASCADE) | `session_token_idx` (unique), `session_user_idx`, `session_expires_idx` | Better Auth session store with 7-day TTL |
| `account` | `db/schema/user.js:79` | `id` (`text`) | `userId` -> `user.id` (CASCADE) | `account_issuer_account_idx` (unique), `account_user_idx`, `account_provider_idx` | Better Auth OAuth (Google) & credential accounts |
| `verification` | `db/schema/user.js:110` | `id` (`text`) | None | `verification_identifier_idx` | Email/token verification |
| `students` | `db/schema/student.js:5` | `id` (`uuid`, random) | `userId` -> `user.id` (CASCADE) | `students_user_id_idx` | 1:1 Student profile, skills, projects, certifications, CGPA |
| `industries` | `db/schema/industry.js:4` | `id` (`uuid`, random) | `userId` -> `user.id` (CASCADE) | `industries_user_id_idx` | 1:1 Industry/Organization profile, company info, hiring preferences, KYC docs |
| `institutes` | `db/schema/institute.js:4` | `id` (`uuid`, random) | `userId` -> `user.id` (CASCADE) | `institutes_user_id_idx` | 1:1 Institute profile, AISHE code, campus address, departments, placement cell |
| `questions` | `db/schema/questions.js:5` | `id` (`uuid`, random) | `industryId` -> `industries.id` (CASCADE), `studentId` -> `students.id` (SET NULL) | `questions_industry_id_idx`, `questions_student_id_idx` | Industry challenge questions / problem statements |
| `ratings` | `db/schema/ratings.js:7` | `id` (`uuid`, random) | `questionId` -> `questions.id`, `userId` -> `user.id`, `studentId` -> `students.id`, `industryId` -> `industries.id` | `ratings_student_id_idx`, `ratings_industry_id_idx` | Student assessment scores, rubric evaluations, recommendations |
| `mcq_questions` | `db/schema/mcqQuestions.js:9` | `id` (`uuid`, random) | None | `mcq_questions_field_idx`, `mcq_questions_subject_idx` | Standardized MCQ question bank for technical assessments |

---

## 2. Better Auth Integration & User/Role Modeling

### 2.1 User Model & Role Enumeration
The platform defines 4 PostgreSQL Enums in `db/schema/user.js`:
- `userRoleEnum`: `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']`
- `accountStatusEnum`: `['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']`
- `onboardingStatusEnum`: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`
- `orgVerificationStatusEnum`: `['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']`

In `lib/auth.js:138-181`, Better Auth `user.additionalFields` configures:
- `role`: string, required, defaultValue "STUDENT", `input: false`
- `accountStatus`: string, required, defaultValue "PENDING", `input: false`
- `onboardingStatus`: string, required, defaultValue "NOT_STARTED", `input: false`
- `profileCompleted`: boolean, required, defaultValue false, `input: false`

The `input: false` directive guarantees that client-side `signIn` / `signUp` payloads cannot manipulate or inject unauthorized roles.

### 2.2 Pre-OAuth Intent Handshake & Creation Hook
1. **Pre-OAuth Intent Capture (`app/api/auth/signup-intent/route.js`)**:
   - User chooses role on `/register` or `/login`.
   - Frontend issues `POST /api/auth/signup-intent` with `{ role }`.
   - `lib/signup-intent.js:16` generates a 256-bit cryptographic token with 15-minute TTL.
   - Sets secure httpOnly cookie `sb_signup_intent`.
2. **Better Auth Creation Hook (`lib/auth.js:213-439`)**:
   - Executes inside `databaseHooks.user.create.before(newUser, context)`.
   - Checks if `newUser.email === INITIAL_ADMIN_EMAIL` -> immediately elevates to `ADMIN`, `ACTIVE`, `COMPLETED`.
   - Otherwise, extracts `intentToken` from request query parameters (`?intent=...`, `?state=...`) or `sb_signup_intent` cookie.
   - Resolves role via `resolveValidIntent(intentToken)` and marks the token consumed with `markIntentUsed(intentToken)`.
   - Sets `role: assignedRole`, `accountStatus: assignedStatus` (`ACTIVE` for Student, `PENDING` for Industry/Institute), `onboardingStatus: "NOT_STARTED"`, `profileCompleted: false`.
3. **Protection Against Privilege Escalation on User Update (`lib/auth.js:446-466`)**:
   - `databaseHooks.user.update.before` actively deletes `id`, `role`, `accountStatus`, `onboardingStatus`, and `profileCompleted` from any incoming update request.

### 2.3 Single Google Identity & Role Collision Resolution
- **Invariant**: One Google Account = One Skill Bridge Account = One Role.
- When an existing user signs in:
  - Better Auth retrieves their existing user record by `email` from PostgreSQL.
  - If a user previously registered as `STUDENT` attempts to sign in via the `INDUSTRY` flow, Better Auth logs into their existing `STUDENT` account.
  - In `app/profile/complete/page.jsx:43-67`, the client detects `user.role !== intentRole` (treating `INDUSTRY` and `ORGANIZATION` as equivalent aliases).
  - The client triggers `authClient.signOut()` to invalidate the session and redirects to `/auth?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY`.
  - `RoleCollisionModal` displays the notification: *"This Google account is already registered as a Student. One Google account can only map to one role."*
- Duplicate users with the same email cannot exist due to `user.email` unique constraint (`user_email_idx`).

---

## 3. Profile Persistence & Data Ownership

### 3.1 Unified Profile Endpoint (`app/api/profile/setup/route.js`)
The API route `app/api/profile/setup/route.js` serves `GET`, `POST`, and `PUT` requests for all roles:
1. **Server-Owned Identity & Ownership**:
   - Calls `await auth.api.getSession({ headers: request.headers })`.
   - If no valid session, rejects with `401 Unauthorized`.
   - Resolves role strictly from `session.user.role` (ignoring any `role` in the request body).
   - Maps role to target PostgreSQL table: `STUDENT -> students`, `INDUSTRY/ORGANIZATION -> industries`, `INSTITUTE -> institutes`.
2. **Payload Sanitization**:
   - Strips protected fields (`id`, `userId`, `user_id`, `role`, `accountStatus`, `verificationStatus`, `createdAt`, `updatedAt`).
3. **Dynamic Schema Validation & UPSERT Execution**:
   - Queries `information_schema.columns` via `getTableColumns(tableName)` to guarantee only existing columns are inserted/updated.
   - Performs camelCase to snake_case field conversion (`camelToSnake()`).
   - Serializes JSON/JSONB fields (`skills`, `projects`, `address`, `departments`, etc.) using `::jsonb` parameter casting.
   - If profile row exists for `user_id` -> executes SQL `UPDATE`; otherwise -> executes SQL `INSERT`.
4. **Progress & Completion Calculation**:
   - Invokes `getStudentCompletionDetails`, `getOrgCompletionDetails`, or `getInstituteCompletionDetails` from `lib/onboarding-calc.js`.
   - Enforces 70% threshold for `COMPLETE_ONBOARDING` / `SUBMIT` action.
   - Returns structured camelCase profile state to frontend.

---

## 4. Drizzle Migrations & Neon PostgreSQL Verification

### 4.1 Migration State
- Migration directory: `drizzle/`
- Applied migrations:
  - `20260824180753_omniscient_scrambler`
  - `20260825143422_talented_xorn`
  - `20260826155818_steady_rictor`
  - `20260826171953_handy_talos`
  - `20260828075151_square_angel` (Latest migration: created `mcq_questions`, added `issuer` to `account`, renamed/structured `students`, `industries`, `institutes`, `questions`, `ratings`).
- Drizzle check status: `npm run db:check` passes with 0 errors.

### 4.2 Live Neon Database Connectivity
- Live database connection verified via `node --env-file=.env.local scripts/test-db.js`:
  - Verified presence of all 9 core tables: `user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`.
  - Verified `account.issuer` column for Better Auth OAuth resolution.
  - Verified transactional CRUD rollback.
- Live automated test suite results:
  - `tests/test-auth-onboarding-e2e.js`: **119 / 119 test cases passed (100%)**
  - `tests/test-tier5-adversarial-auth.js`: **45 / 45 adversarial tests passed (100%)**

---

## 5. Identified Bugs & Vulnerabilities

### Bug 1: Desynchronization of User Onboarding State in Database
- **Location**: `app/api/profile/setup/route.js:999-1062`
- **Issue**: When a user completes onboarding via `POST /api/profile/setup` with `action: 'COMPLETE_ONBOARDING'`, the handler updates the `students`/`industries`/`institutes` table and computes `onboardingStatus: "COMPLETED"`, `profileCompleted: true`. However, it fails to update the corresponding columns in the `user` table (`user.onboarding_status` and `user.profile_completed`).
- **Consequence**: Better Auth sessions and Edge Middleware (`middleware.js:165, 275, 304, 323`) evaluate `user.onboardingStatus` and `user.profileCompleted`. Because the `user` row remains `onboarding_status = 'NOT_STARTED'` and `profile_completed = false`, the middleware repeatedly redirects the authenticated user back to `/profile/setup`, trapping them in an onboarding redirect loop.

### Bug 2: Missing `signup_intents` Table in Drizzle Schema Definition
- **Location**: `lib/signup-intent.js:64-73, 109-120, 162-170` vs `db/schema/user.js`
- **Issue**: `lib/signup-intent.js` includes logic to persist pre-OAuth intent tokens to Drizzle via `db.insert(schema.signupIntents)`, `db.select().from(schema.signupIntents)`, and `db.update(schema.signupIntents)`. However, `signupIntents` is not declared in `db/schema/user.js` or `db/schema/index.js`.
- **Consequence**: `schema.signupIntents` resolves to `undefined`. The catch blocks fall back to in-memory `localDb` (`data/db.json`). While functional in single-process development, this prevents intent sharing across serverless lambda instances in production.

### Bug 3: Incomplete Environment Loading in Standalone Database Scripts
- **Location**: `scripts/test-db.js:1-2`, `scripts/migrate-neon-direct.js:1-2`
- **Issue**: Scripts execute `dotenv.config()` without `{ path: ".env.local" }`. Next.js stores local environment configurations in `.env.local`.
- **Consequence**: Running `npm run db:test` or `node scripts/migrate-neon-direct.js` directly from the CLI fails with `DATABASE_URL is not set` unless `.env.local` is explicitly passed via Node's `--env-file` flag.

### Bug 4: Legacy Standalone Onboarding Routes Writing to JSON DB
- **Location**: `app/api/institute/onboarding/route.js` and `app/api/organization/onboarding/route.js`
- **Issue**: These route handlers read from and write to `lib/db.js` (local `data/db.json`), while the modern unified flow in `app/profile/setup/page.jsx` and `app/api/profile/setup/route.js` writes to PostgreSQL tables (`institutes`, `industries`).
- **Consequence**: Any client or legacy caller invoking `/api/institute/onboarding` or `/api/organization/onboarding` persists data only to the local JSON file, causing data divergence from the Neon PostgreSQL database.

---

## 6. Concrete Recommendations & Fix Blueprint

### Fix 1: Synchronize `user` Table Onboarding Fields in Profile Setup API
In `app/api/profile/setup/route.js`, immediately after saving `savedDatabaseProfile`, execute an update on `user` table:
```javascript
import { user as userTable } from "@/db/schema/user.js";
import { eq } from "drizzle-orm";

// Inside saveProfile() after saving savedDatabaseProfile:
const isCompleted = isCompleteAction || completionDetails.completion >= 70;
const finalStatus = isCompleteAction
  ? "COMPLETED"
  : completionDetails.completion > 0
    ? "IN_PROGRESS"
    : "NOT_STARTED";

try {
  await db
    .update(userTable)
    .set({
      onboardingStatus: finalStatus,
      profileCompleted: isCompleted,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));
} catch (dbErr) {
  console.warn("[Profile Setup] Failed to sync user onboarding status:", dbErr?.message);
}
```

### Fix 2: Add `signupIntents` Schema Table to Drizzle
In `db/schema/user.js`, declare and export `signupIntents`:
```javascript
export const signupIntents = pgTable(
  "signup_intents",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    role: userRoleEnum("role").notNull(),
    email: text("email"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    used: boolean("used").default(false).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    signupIntentTokenIdx: uniqueIndex("signup_intent_token_idx").on(table.token),
  })
);
```
Add `export * from "./user.js"` in `db/schema/index.js` (already present) to export `signupIntents` to Drizzle Kit. Run `npm run db:generate` and `npm run db:migrate`.

### Fix 3: Standardize Environment Loading in Utility Scripts
Update `scripts/test-db.js`, `scripts/migrate-neon-direct.js`, and `scripts/seed.js`:
```javascript
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();
```

### Fix 4: Unify Legacy Onboarding Endpoints
Update `app/api/institute/onboarding/route.js` and `app/api/organization/onboarding/route.js` to either forward requests internally to `app/api/profile/setup/route.js` or query the authoritative Drizzle tables (`institutes`, `industries`) in Neon PostgreSQL.
