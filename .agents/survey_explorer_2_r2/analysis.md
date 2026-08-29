# Database Schema, User Models, Profile Completion & Migrations — Technical Analysis

## 1. Executive Summary
This survey provides a comprehensive architectural analysis of the database schema, Drizzle ORM models, user and profile tables, migration configuration, and persistence layers for the Skill Bridge platform. The codebase incorporates a production-ready dual-persistence architecture featuring Neon Serverless PostgreSQL with Drizzle ORM and a high-fidelity local JSON database fallback. Role governance strictly models `Student`, `Industry` (mapped from `organization`), `Institute`, and `Admin` personas, ensuring tamper-proof role assignment, cryptographic pre-OAuth intent handshakes, 1:1 foreign key profile isolation, dynamic multi-step profile completion scoring (0-100), and atomic transition of `profileCompleted = true`.

---

## 2. Drizzle ORM Schema & Better Auth Architecture

### 2.1 Table Mapping Overview
The schema is defined in `db/schema.js` and exported alongside Drizzle relation graphs in `db/relations.js`:

| Table Name (PostgreSQL) | Drizzle Export | Entity / Domain Purpose | 1:1 Relation Target |
|---|---|---|---|
| `user` | `users` | Core user identity, role, account status, onboarding status, profile completion | 1:1 with Role Profiles |
| `session` | `sessions` | Better Auth session store with tokens and expiry | N:1 with `user` |
| `account` | `accounts` | OAuth account links (Google OAuth provider tokens & IDs) | N:1 with `user` |
| `verification` | `verifications` | Verification tokens for email/auth actions | Independent |
| `signup_intents` | `signupIntents` | Pre-OAuth cryptographic role handshake records | Temporary (15m expiry) |
| `student_profile` | `studentProfiles` | 1:1 Student profile (academics, skills, projects, prefs) | 1:1 `user.id`, N:1 `institute.id` |
| `organization_profile` | `organizationProfiles` | 1:1 Industry/Org profile (legal, contacts, KYC, hiring) | 1:1 `user.id`, N:1 `user.id` (verifier) |
| `institute` | `instituteProfiles` | 1:1 Institute profile (AISHE code, departments, placement) | 1:1 `user.id` |
| `admin_profile` | `adminProfiles` | 1:1 Platform Governance profile (admin level, permissions) | 1:1 `user.id` |
| `audit_logs` | `auditLogs` | Append-only security audit log | N:1 `user.id` |
| `rating_*` (10 tables) | 10 Drizzle models | Verified Reputation, Rating, Review & Trust Subsystem | N:1 `user.id`, `rating_interactions` |

### 2.2 PostgreSQL Enumerations
Defined in `db/schema.js`:
- `userRoleEnum`: `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']`
- `accountStatusEnum`: `['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']`
- `onboardingStatusEnum`: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`
- `orgVerificationStatusEnum`: `['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']`
- `auditActionEnum`: Includes `LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ROLE_REJECTED_MISMATCH`, `ORGANIZATION_SUBMITTED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `ORGANIZATION_INFO_REQUESTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`, `OPPORTUNITY_GATED_ATTEMPT`, `CAPABILITY_VIOLATION_BLOCKED`, `ROLE_COLLISION_BLOCKED`.
- 8 Rating Enums: `ratingInteractionTypeEnum`, `ratingInteractionStatusEnum`, `ratingContextTypeEnum`, `ratingStatusEnum`, `ratingRecommendationEnum`, `ratingReportReasonEnum`, `ratingReportStatusEnum`, `ratingAppealStatusEnum`.

---

## 3. User Models, Role Handshake & Better Auth Hooks

### 3.1 Core User Schema (`db/schema.js:124-141`)
```javascript
const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  image: text('image'),
  role: userRoleEnum('role').default('STUDENT').notNull(),
  accountStatus: accountStatusEnum('account_status').default('ACTIVE').notNull(),
  onboardingStatus: onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  profileCompleted: boolean('profile_completed').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
```

### 3.2 Better Auth Configuration & Tamper Resistance (`lib/auth.js:36-62`)
- Better Auth is configured with `drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } })`.
- `user.additionalFields` configures `role`, `accountStatus`, `onboardingStatus`, and `profileCompleted` with `input: false`. This enforces that client-side registration or update payloads cannot inject or mutate role or security state.

### 3.3 Pre-OAuth Role Handshake Flow (`lib/signup-intent.js`, `lib/auth.js:75-153`)
1. **Role Selection**: Before Google Sign-In, user selects `Student`, `Industry`, or `Institute` at `/auth`.
2. **Intent Generation**: Client issues `POST /api/auth/signup-intent` with `{ role }`.
   - Admin registration is strictly blocked (`ADMIN_REGISTRATION_FORBIDDEN`, HTTP 403).
   - Generates a 256-bit cryptographic token with a 15-minute TTL.
   - Sets secure `httpOnly` cookie `sb_signup_intent`.
3. **Better Auth Hook (`databaseHooks.user.create.before`)**:
   - Resolves intent token from cookie or URL params via `resolveValidIntent(intentToken)`.
   - Assigns validated role to `user.role`.
   - Sets initial `accountStatus`: `'ACTIVE'` for Student; `'PENDING'` for Industry/Institute (awaiting KYC/admin review).
   - Sets `onboardingStatus = 'NOT_STARTED'` and `profileCompleted = false`.
   - Marks intent as consumed via `markIntentUsed(token)` to prevent replay attacks.
4. **Better Auth Hook (`databaseHooks.user.create.after`)**:
   - Automatically provisions the 1:1 role profile row (`studentProfiles`, `organizationProfiles`, `instituteProfiles`, or `adminProfiles`).
   - Synchronously writes immutable audit log events: `ACCOUNT_CREATED` and `ROLE_ASSIGNED`.
5. **Role Immutability Hook (`databaseHooks.user.update.before`)**:
   - Strips `role`, `accountStatus`, and `id` from user update operations, guaranteeing role immutability.

---

## 4. Role-Specific Profile Schemas

### 4.1 Student Profile (`student_profile` / `studentProfiles`)
- **Primary Key**: `id` (`text`)
- **Foreign Key**: `userId` (`text`, NOT NULL, UNIQUE, references `user.id` on delete CASCADE)
- **Academic Relations**: `instituteName` (`text`), `instituteId` (`text`, references `institute.id` on delete SET NULL)
- **Academic Fields**: `degree`, `department`, `graduationYear` (`integer`), `yearOfStudy` (`text`), `cgpa` (`text`)
- **Portfolio & Experience**: `skills` (`jsonb` default `[]`), `projects` (`jsonb` default `[]`), `certifications` (`jsonb` default `[]`), `experience` (`jsonb` default `[]`), `githubURL` (`github`), `linkedinURL` (`linkedin`), `hobby` (`text`)
- **Career Preferences**: `careerPreferences` (`jsonb` default `{}`)
- **Onboarding Progress**: `profileCompletion` (`integer` default 0), `currentOnboardingStep` (`integer` default 1)

### 4.2 Industry Profile (`organization_profile` / `organizationProfiles`)
- **Primary Key**: `id` (`text`)
- **Foreign Key**: `userId` (`text`, NOT NULL, UNIQUE, references `user.id` on delete CASCADE)
- **Company Details**: `companyName` (`text`, NOT NULL), `companyType` (`text`), `industry` (`text`), `companySize` (`text`), `website` (`text`), `logoUrl` (`logo_url`)
- **Legal Identifiers**: `registrationNumber` (`registration_number`, UNIQUE CIN/LLPIN), `taxIdGstin` (`tax_id_gstin`)
- **Contact & Headquarters**: `contactPhone` (`contact_phone`), `address` (`jsonb` default `{}`), `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`
- **Verification & KYC**: `verificationStatus` (`org_verification_status` default `'PENDING'`), `verificationDocs` (`jsonb` default `[]`), `documents` (`jsonb` default `[]`), `verificationNotes` (`text`), `adminNotes` (`text`), `verifiedByAdminId` (references `user.id`), `verifiedAt` (`timestamp`)
- **Hiring Focus**: `hiringPreferences` (`jsonb` default `{}`)
- **Onboarding Progress**: `profileCompletion` (`integer` default 0), `currentOnboardingStep` (`integer` default 1)

### 4.3 Institute Profile (`institute` / `instituteProfiles`)
- **Primary Key**: `id` (`text`)
- **Foreign Key**: `userId` (`text`, NOT NULL, UNIQUE, references `user.id` on delete CASCADE)
- **Institute Details**: `instituteName` (`institute_name`, NOT NULL), `instituteCode` (`institute_code`, UNIQUE AISHE/UGC code), `instituteType` (`institute_type`), `website`, `logoUrl`, `contactPhone`, `officialEmail`, `address` (`jsonb`)
- **Academic Programs**: `departments` (`jsonb` array: name, code, headOfDept, studentCount)
- **Placement & Industry Cell**: `placementContact` (`jsonb`: tpoName, designation, email, phone)
- **Accreditation & Verification**: `verificationStatus` (`org_verification_status` default `'PENDING'`), `verificationDocs` (`jsonb` default `[]`)
- **Onboarding Progress**: `profileCompletion` (`integer` default 0), `currentOnboardingStep` (`integer` default 1)

---

## 5. Dynamic Profile Completion Scoring & Atomic Submission

### 5.1 Dynamic Completion Algorithms (`lib/onboarding-calc.js`)
Granular weighting rubrics calculate completion percentages from 0 to 100:

| Role | Calculation Function | Categories & Weights | Completion Threshold |
|---|---|---|---|
| **Student** | `calculateStudentCompletion()` | 1. Basic Info (15%)<br>2. Academic Info (15%)<br>3. Skills (20% for >=3 skills)<br>4. Projects (15% for >=1 project)<br>5. Certifications (10%)<br>6. Experience (10%)<br>7. Career Preferences (10%) | `>= 80%` (or `>= 70%` via `isProfileComplete`) |
| **Industry** | `calculateOrganizationCompletion()` | 1. Company Info (15%)<br>2. Legal/CIN/GSTIN (20%)<br>3. Contact & Address (15%)<br>4. Industry & Size (15%)<br>5. Hiring Preferences (15%)<br>6. Verification Docs (15%) | `>= 80%` (or `>= 70%` via `isProfileComplete`) |
| **Institute** | `calculateInstituteCompletion()` | 1. Basic Info (15%)<br>2. AISHE Code & Type (20%)<br>3. Contact & Campus Address (15%)<br>4. Academic Departments (15%)<br>5. Placement Contact (15%)<br>6. Accreditation Docs (15%) | `>= 70%` |

### 5.2 Atomic Profile Submission Flow
When a user completes profile onboarding (`action === 'COMPLETE_ONBOARDING'` or `SUBMIT`):
1. **Validation**: Evaluates `missingFields` and validates mandatory step completion.
2. **Dual-Update Atomicity**:
   - Profile table (`student_profile`, `organization_profile`, or `institute`): updates fields, calculates final `profileCompletion`, sets `updatedAt`.
   - `user` table: sets `onboardingStatus = 'COMPLETED'` and `profileCompleted = true`.
   - In PostgreSQL: executed within a transaction block.
   - In Mock JSON DB (`lib/db.js`): executed synchronously using atomic file replacement (`tmp` file write + `fs.renameSync`).
3. **Audit Trail**: Logs `PROFILE_UPDATED` or `ORGANIZATION_SUBMITTED` with actor, timestamp, and metadata.

### 5.3 Route Protection & Access Gating
- `middleware.js`:
  - Unauthenticated requests to `/student/*`, `/organization/*`, `/industry/*`, `/institute/*`, `/admin/*` are redirected to `/auth` with return URL.
  - Suspended accounts (`accountStatus === 'SUSPENDED'`) are redirected to `/account-suspended`.
  - Incomplete profiles (`onboardingStatus !== 'COMPLETED'` or `profileCompleted === false`) are redirected to `/profile/setup` (or `/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`).
- `lib/auth-guard.js` (`withAuth`): Server-side API guard enforcing cryptographic session, role authorization, active account status, onboarding completion (`requireOnboarded`), organization KYC approval (`requireApprovedOrg`), IDOR tenant ownership, and audit trail logging.

---

## 6. Migration Setup, Connection Pool & Fallback Handling

### 6.1 Drizzle Kit Configuration (`drizzle.config.js`)
```javascript
require('dotenv').config({ path: '.env' });
const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
```

### 6.2 Migration History
1. `drizzle/20260824180753_omniscient_scrambler`: Base schema initialization (user, session, account, verification, signup_intents, student_profile, organization_profile, institute, admin_profile, audit_logs, 5 enums, 14 indexes, 9 foreign key constraints).
2. `drizzle/20260825143422_talented_xorn`: Reputation and trust subsystem (10 tables, 8 enums, compound unique indexes on `(interactionId, reviewerUserId)` and `(targetRole, targetEntityId)`).

### 6.3 Connection Layer & Fallback Mechanism (`db/index.js`)
- Primary Driver: `@neondatabase/serverless` `Pool` with Drizzle ORM client.
- Dynamic Fallback:
  - If `DATABASE_URL` is missing, placeholder, or unreachable, or if `USE_MOCK_DB=true`, initializes `createMockDrizzleDb()`.
  - `createMockDrizzleDb()` provides full query-builder compatibility (`select`, `insert`, `update`, `delete`, `query.*.findFirst`, `query.*.findMany`) mapped to `lib/db.js`.
- Empirical Verification: `npm run db:test` successfully executes `select 1` against live Neon PostgreSQL instance.

---

## 7. Security, Role Mismatch & IDOR Protection Matrix

| Threat / Vulnerability | Vector | Mitigation Mechanism | Implementation Location |
|---|---|---|---|
| **Role Injection during Sign-up** | Client sends arbitrary role in request payload | Better Auth `role` defined with `input: false`; assigned exclusively via cryptographic signup intent token | `lib/auth.js:38-43`, `lib/signup-intent.js` |
| **Admin Privilege Escalation** | User requests role `ADMIN` during signup | Explicit prohibition in intent generator (`ADMIN_REGISTRATION_FORBIDDEN`, HTTP 403) | `lib/signup-intent.js:28-34`, `app/api/auth/signup-intent/route.js:42-47` |
| **Role Collision / Multi-Role Hijack** | Existing Student attempts Google login choosing Industry | `checkRoleCollision()` blocks conflicting intent, informs user "This Google account is already registered as a Student", and redirects to existing dashboard | `lib/role-collision.js:15-35` |
| **Role Mutation via Profile Update** | User attempts `PATCH /api/user` with `role: 'ADMIN'` | `databaseHooks.user.update.before` unconditionally deletes `role`, `accountStatus`, and `id` from update payload | `lib/auth.js:306-317` |
| **IDOR Profile Tampering** | Student A modifies Student B's profile via `PUT /api/student/profile` | API handlers and `withAuth` verify `session.user.id === targetUserId` (unless caller is `ADMIN`) | `app/api/student/profile/route.js:118-121`, `lib/auth-guard.js:188-200` |
| **Unverified Organization Exploitation** | Unapproved organization attempts opportunity publishing | `requireApprovedOrg` in `withAuth` blocks actions when `verificationStatus !== 'APPROVED'` | `lib/auth-guard.js:162-185` |
| **Unauthenticated Dashboard Access** | User manipulates URL directly to `/student/dashboard` | `middleware.js` checks session token at edge and redirects unauthenticated requests to `/auth` | `middleware.js:127-139` |
| **Incomplete Onboarding Bypass** | User with `profileCompleted = false` navigates to dashboard | `middleware.js` and `withAuth(..., { requireOnboarded: true })` redirect user to `/profile/setup` | `middleware.js:89-96`, `lib/auth-guard.js:147-159` |

---

## 8. Conclusion & Implementation Readiness
The database and persistence layer are fully prepared, structurally sound, and backwards-compatible for the Authentication and Onboarding requirements (`ORIGINAL_REQUEST.md` ## 2026-08-26T06:12:40Z). The schemas, enums, intent handshakes, Better Auth lifecycle hooks, completion calculators, and migration configurations are completely aligned with all acceptance criteria.
