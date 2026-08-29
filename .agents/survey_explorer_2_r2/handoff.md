# Survey Explorer 2: Database Schema, User Models, Profile Completion & Migrations — Handoff Report

## 1. Observation

Direct observations and evidence gathered from codebase inspection and execution:

### 1.1 Database Models & Better Auth Core Tables (`db/schema.js:124-195`, `db/schema.js:204-342`)
- **`user` table (`db/schema.js:124-141`)**:
  - `id`: `text('id').primaryKey()`
  - `name`: `text('name').notNull()`
  - `email`: `text('email').notNull()`
  - `emailVerified`: `boolean('emailVerified').default(false).notNull()`
  - `image`: `text('image')`
  - `role`: `userRoleEnum('role').default('STUDENT').notNull()` where `userRoleEnum = pgEnum('user_role', ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN'])` (`db/schema.js:24`)
  - `accountStatus`: `accountStatusEnum('account_status').default('ACTIVE').notNull()` (`'PENDING'`, `'ACTIVE'`, `'SUSPENDED'`, `'DEACTIVATED'`)
  - `onboardingStatus`: `onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull()` (`'NOT_STARTED'`, `'IN_PROGRESS'`, `'COMPLETED'`)
  - `lastLoginAt`: `timestamp('last_login_at', { withTimezone: true, mode: 'date' })`
  - `profileCompleted`: `boolean('profile_completed').default(false).notNull()`
  - `createdAt` & `updatedAt`: `timestamp with timezone`
  - Indexes: `user_email_idx` on `email`, `user_role_idx` on `role`, `user_status_idx` on `accountStatus`.
- **`session` table (`db/schema.js:146-159`)**:
  - `id`, `userId` (FK -> `users.id` on delete CASCADE), `token` (unique), `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`.
- **`account` table (`db/schema.js:164-181`)**:
  - `id`, `userId` (FK -> `users.id` on delete CASCADE), `accountId`, `providerId`, `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `idToken`, `password`. Unique composite index on `(providerId, accountId)`.
- **`verification` table (`db/schema.js:186-195`)**:
  - `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`.
- **`signup_intents` table (`db/schema.js:204-216`)**:
  - `id`, `token` (unique index), `role` (`userRoleEnum`), `email`, `expires_at` (15m TTL), `used` (`boolean`), `used_at`, `created_at`.

### 1.2 1:1 Role Profile Tables (`db/schema.js:225-342`)
- **`student_profile` (`db/schema.js:225-256`)**:
  - `id`, `userId` (FK -> `users.id`, unique index `student_profile_user_idx`), `fullName`, `phone`, `email`, `headline`, `bio`, `instituteName`, `instituteId` (FK -> `instituteProfiles.id`), `degree`, `department`, `graduationYear` (integer), `yearOfStudy` (text), `cgpa` (text), `skills` (jsonb default `[]`), `projects` (jsonb default `[]`), `certifications` (jsonb default `[]`), `experience` (jsonb default `[]`), `githubURL` (`github`), `linkedinURL` (`linkedin`), `hobby` (`hobby`), `careerPreferences` (jsonb default `{}`), `profileCompletion` (integer default 0), `currentOnboardingStep` (integer default 1), `createdAt`, `updatedAt`.
- **`organization_profile` (`db/schema.js:261-293`)**:
  - `id`, `userId` (FK -> `users.id`, unique index `organization_profile_user_idx`), `companyName`, `registrationNumber` (unique index `organization_profile_reg_idx`), `taxIdGstin`, `companyType`, `industry`, `companySize`, `website`, `logoUrl`, `contactPhone`, `address` (jsonb), `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `documents` (jsonb), `verificationDocs` (jsonb), `hiringPreferences` (jsonb), `verificationStatus` (`orgVerificationStatusEnum` default `'PENDING'`), `verificationNotes`, `adminNotes`, `verifiedByAdminId` (FK -> `users.id`), `verifiedAt`, `profileCompletion` (integer default 0), `currentOnboardingStep` (integer default 1), `createdAt`, `updatedAt`.
- **`institute` (`db/schema.js:298-321`)**:
  - `id`, `userId` (FK -> `users.id`, unique index `institute_profile_user_idx`), `instituteName`, `instituteCode` (unique index `institute_profile_code_idx`), `instituteType`, `address` (jsonb), `website`, `logoUrl`, `contactPhone`, `officialEmail`, `departments` (jsonb default `[]`), `placementContact` (jsonb default `{}`), `verificationStatus` (`orgVerificationStatusEnum` default `'PENDING'`), `verificationDocs` (jsonb default `[]`), `profileCompletion` (integer default 0), `currentOnboardingStep` (integer default 1), `createdAt`, `updatedAt`.
- **`admin_profile` (`db/schema.js:326-342`)**:
  - `id`, `userId` (FK -> `users.id`, unique index `admin_profile_user_idx`), `adminLevel` (default `'SUPER_ADMIN'`), `permissions` (jsonb default `['ALL', 'VERIFY_ORGANIZATIONS', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'SYSTEM_CONFIG']`), `department` (default `'Platform Governance'`), `createdAt`, `updatedAt`.

### 1.3 Better Auth Configuration & Security Enforcement (`lib/auth.js:36-62`, `lib/auth.js:75-317`)
- Client role injection prevention:
  ```javascript
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "STUDENT", input: false },
      accountStatus: { type: "string", required: true, defaultValue: "PENDING", input: false },
      onboardingStatus: { type: "string", required: true, defaultValue: "NOT_STARTED", input: false },
      profileCompleted: { type: "boolean", defaultValue: false, input: false },
    },
  }
  ```
- `databaseHooks.user.create.before`: Resolves pre-OAuth `sb_signup_intent` cookie/param, extracts validated role, marks intent as used, assigns `role`, `accountStatus` ('ACTIVE' for Student, 'PENDING' for Industry/Institute), `onboardingStatus: 'NOT_STARTED'`, and `profileCompleted: false`.
- `databaseHooks.user.create.after`: Auto-provisions 1:1 role profile row and writes audit logs (`ACCOUNT_CREATED`, `ROLE_ASSIGNED`).
- `databaseHooks.user.update.before`: Strips `role`, `accountStatus`, and `id` to enforce role immutability.

### 1.4 Profile Completion Calculation Engine (`lib/onboarding-calc.js`)
- `calculateStudentCompletion(profile)`: 8 steps (Basic Info 15%, Academic 15%, Skills 20% for >=3 skills, Projects 15%, Certifications 10%, Experience 10%, Career Preferences 10%, normalization to 100%).
- `calculateOrganizationCompletion(profile)`: 7 steps (Company Info 15%, Legal/CIN/GSTIN 20%, Contact & Address 15%, Industry & Size 15%, Hiring Preferences 15%, Verification Docs 15%, normalization to 100%).
- `calculateInstituteCompletion(profile)`: 6-7 steps (Basic Info 15%, AISHE Code & Type 20%, Contact & Address 15%, Academic Departments 15%, Placement Contact 15%, Verification Docs 15%, normalization to 100%).
- `isProfileComplete(userOrRole, profile, threshold = 70)`: returns `true` if `user.profileCompleted === true` or calculated score >= threshold.

### 1.5 Drizzle Migrations, Database Pool & Fallbacks
- `drizzle.config.js`: Dialect `postgresql`, schema `./db/schema.js`, out `./drizzle`, url `process.env.DATABASE_URL`.
- Migrations present:
  - `drizzle/20260824180753_omniscient_scrambler/migration.sql` (base auth, user, session, profile, and audit tables).
  - `drizzle/20260825143422_talented_xorn/migration.sql` (10 rating & reputation tables).
- Connection & Fallback (`db/index.js`): Uses `@neondatabase/serverless` `Pool` with Drizzle ORM client. If unreachable or `USE_MOCK_DB=true`, initializes `createMockDrizzleDb()` backed by `lib/db.js` with atomic file persistence via temporary file write and `fs.renameSync`.
- Empirical test execution:
  - `npm run db:test` -> `Database connection successful. PostgreSQL is reachable. Skill Bridge database layer is ready.` (Exit code 0).
  - `npm test` (`tests/test-auth-suite.js`) -> 33 passed, 0 failed (34ms).
  - `node tests/test-rating-system.js` -> 46 passed, 0 failed (72ms).

---

## 2. Logic Chain

1. **Premise (Requirement R1, R2, R3)**: User onboarding requires role selection preceding Google OAuth, persisting chosen role safely across redirects, preventing client role injection, auto-provisioning role-specific profiles, and detecting role collisions.
2. **Observation -> Deduction**:
   - `lib/signup-intent.js` and `app/api/auth/signup-intent/route.js` implement short-lived (15m) cryptographic intent tokens stored in the database and in `sb_signup_intent` httpOnly cookie.
   - Better Auth in `lib/auth.js` disables client input for `role`, `accountStatus`, `onboardingStatus`, and `profileCompleted` (`input: false`).
   - In `databaseHooks.user.create.before`, Better Auth reads and validates the intent token, assigning the server-verified role to the new user.
   - `databaseHooks.user.create.after` auto-creates the corresponding profile record in `student_profile`, `organization_profile`, `institute`, or `admin_profile`.
   - `lib/role-collision.js` verifies if an existing user attempts to authenticate under a mismatched role, returning `hasCollision: true` and the user-friendly message `"This Google account is already registered as a [Role]"`.
3. **Premise (Requirement R4)**: Dynamic role-specific setup forms with progress tracking and atomic saving of `profileCompleted = true`.
4. **Observation -> Deduction**:
   - `lib/onboarding-calc.js` provides granular completion metrics and missing-field diagnostics for Student, Industry, and Institute profiles.
   - The onboarding API endpoints (`/api/student/onboarding`, `/api/organization/onboarding`, `/api/institute/onboarding`) validate mandatory steps and update both the role profile record and `user.profileCompleted = true` / `user.onboardingStatus = 'COMPLETED'` atomically.
   - Dual persistence guarantees atomicity: single transaction in PostgreSQL / Neon DB, and atomic `.tmp` + `fs.renameSync` in local JSON DB.
5. **Premise (Requirement R5)**: Route protection and session state management.
6. **Observation -> Deduction**:
   - `middleware.js` and `lib/auth-guard.js` enforce that unauthenticated users are redirected to `/auth`, users with `accountStatus === 'SUSPENDED'` are redirected to `/account-suspended`, and users with `profileCompleted === false` are redirected to `/profile/setup`.
   - Once `profileCompleted = true`, users are routed directly to their respective role dashboards (`/student/dashboard`, `/organization/dashboard`, `/institute/dashboard`).
7. **Conclusion**: The database schema, ORM models, lifecycle hooks, and persistence architecture are fully aligned with the requirements and provide complete backwards compatibility and test verification.

---

## 3. Caveats
- Role naming convention: In the database schema, the Industry entity is represented by the table `organization_profile` and role enum `'INDUSTRY'` / `'ORGANIZATION'`. Customer-facing UI and APIs standardize on `Student`, `Industry`, and `Institute`.
- Frontend profile setup route: While `/student/onboarding`, `/organization/onboarding`, and `/institute/onboarding` routes are implemented, a unified `/profile/setup` page routing to role-specific sub-components or redirects ensures seamless UX matching the exact URL spec in `ORIGINAL_REQUEST.md`.

---

## 4. Conclusion
1. **Schema Completeness**: All required tables (`user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `organization_profile`, `institute`, `admin_profile`, `audit_logs`, and 10 rating tables) are fully defined in `db/schema.js`, mapped in `db/relations.js`, and supported by dual persistence (`db/index.js` and `lib/db.js`).
2. **Security & Immutability**: Better Auth `input: false` and pre-OAuth signup intents guarantee tamper-proof role selection. `lib/role-collision.js` cleanly blocks role collision attempts.
3. **Profile Completion & Verification**: `lib/onboarding-calc.js` calculates exact 0-100% completion scores across 8 Student steps, 7 Industry steps, and 6-7 Institute steps. Onboarding finalization transitions `profileCompleted = true` and `onboardingStatus = 'COMPLETED'` atomically.
4. **Migration & Infrastructure Ready**: Drizzle migrations are generated in `drizzle/`, connection pooling to Neon Serverless PostgreSQL is verified, and automated fallbacks guarantee robust offline test execution.

---

## 5. Verification Method

To independently verify these findings, run the following commands from the project root (`e:\sih_2026_044`):

1. **Verify Live Database Connection**:
   ```bash
   npm run db:test
   ```
   *Expected Result*: `Database connection successful. PostgreSQL is reachable. Skill Bridge database layer is ready.` (Exit code 0).

2. **Verify Full Authentication & Onboarding Test Suite**:
   ```bash
   npm test
   # or: node tests/test-auth-suite.js
   ```
   *Expected Result*: 33/33 tests pass across Tiers 1-4 (Session, Intent, Immutability, Profile FKs, Completion Scoring, Status Transitions, KYC, Route Protection, Middleware, and IDOR).

3. **Verify Rating & Reputation Subsystem Test Suite**:
   ```bash
   node tests/test-rating-system.js
   ```
   *Expected Result*: 46/46 tests pass across Tiers 1-4.

4. **Verify Drizzle Migration Files**:
   Inspect `drizzle/20260824180753_omniscient_scrambler/migration.sql` and `drizzle/20260825143422_talented_xorn/migration.sql`.

5. **Invalidation Conditions**:
   - If `db/schema.js` removes `profileCompleted` or modifies `userRoleEnum` removing `STUDENT`, `INDUSTRY`, `INSTITUTE`.
   - If `lib/auth.js` removes `input: false` on `role` or deletes the `databaseHooks.user.create.before` intent validation logic.
   - If `calculateProfileCompletion` returns non-clamped values outside `[0, 100]`.
