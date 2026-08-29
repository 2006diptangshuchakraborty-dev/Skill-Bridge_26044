# Verification Survey Report: Skill Bridge Auth & Role System Implementation

**Author**: verify_explorer_1  
**Target Specifications**: `ORIGINAL_REQUEST.md` (§R1 through §R6)  
**Date**: 2026-08-23  

---

## 1. Observation

A comprehensive inspection of the entire codebase was conducted across schemas, configuration files, libraries, UI components, Next.js API route handlers, Edge middleware, and E2E test suites. Below is the itemized inventory of observed implementation artifacts with exact file paths, line citations, and evidence snippets.

### §R1. Better Auth & Google OAuth Setup
- **Drizzle PostgreSQL Schemas (`db/schema.js`)**:
  - `userRoleEnum`, `accountStatusEnum`, `onboardingStatusEnum`, `orgVerificationStatusEnum`, `auditActionEnum` defined at lines 34–54.
  - Core Better Auth tables defined with Drizzle `pgTable`:
    - `users` (`'user'`, lines 63–78): Primary key `id`, unique `email`, `role` (enum default `'STUDENT'`), `accountStatus` (enum default `'ACTIVE'`), `onboardingStatus` (enum default `'NOT_STARTED'`), `createdAt`, `updatedAt`, indexed on `email`, `role`, `accountStatus`.
    - `sessions` (`'session'`, lines 83–96): `id`, `userId` (FK to `users.id` with `onDelete: 'cascade'`), `token` (unique), `expiresAt`, `ipAddress`, `userAgent`, indexes on `userId`, `token`, `expiresAt`.
    - `accounts` (`'account'`, lines 101–118): `id`, `userId` (FK cascade), `accountId`, `providerId`, `accessToken`, `refreshToken`, unique index on `(providerId, accountId)`.
    - `verifications` (`'verification'`, lines 123–132): `id`, `identifier`, `value`, `expiresAt`.
- **Database Connection Layer (`db/index.js`)**:
  - Neon Serverless PostgreSQL client configured with `@neondatabase/serverless` and `drizzle-orm/neon-serverless` (lines 7–185), with automatic fallback to `createMockDrizzleDb()` for zero-dependency offline resilience.
- **Better Auth Server Configuration (`lib/auth.js`)**:
  - Configured at lines 28–47 with `drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } })`, `secret`, `baseURL`, and `socialProviders.google` with `clientId` and `clientSecret`.
  - Server-owned user fields protected with `input: false` (lines 50–71) for `role`, `accountStatus`, and `onboardingStatus`.
  - Session configuration (lines 74–81): 7-day expiration, 1-day update age, cookie cache enabled.
- **Better Auth Catch-All Handler (`app/api/auth/[...all]/route.js`)**:
  - Exporting `GET` and `POST` handlers via `toNextJsHandler(auth)` (lines 6–9).
- **Client Auth SDK (`lib/auth-client.js`)**:
  - Initialized with `createAuthClient` from `better-auth/react` (lines 8–18), exporting `signIn`, `signUp`, `signOut`, `useSession`, `getSession`.
- **Environment Configuration (`.env.example`)**:
  - Cleanly documents all required parameters (`DATABASE_URL`, `USE_MOCK_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `INITIAL_ADMIN_EMAIL`, `NODE_ENV`) without exposing sensitive secrets (lines 1–50).

---

### §R2. Secure Role Model & Tamper-Proof Role Assignment
- **Pre-OAuth Cryptographic Signup Intents (`lib/signup-intent.js`)**:
  - `signupIntents` table in `db/schema.js` (lines 141–153) storing `id`, `token` (unique), `role`, `email`, `expiresAt`, `used`, `usedAt`, `createdAt`.
  - `createSignupIntent({ role, email })` (lines 16–94): Generates 256-bit cryptographic hex token (`crypto.randomBytes(32)`), enforces 15-minute TTL (`INTENT_EXPIRY_MS = 900000`), restricts roles to `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'ORGANIZATION']`.
  - Public Admin Registration Block: Explicitly checks `if (normalizedRole === 'ADMIN')` and throws 403 Forbidden with code `ADMIN_REGISTRATION_FORBIDDEN` (lines 28–34).
  - `resolveValidIntent` and `markIntentUsed` (lines 99–185): Atomically retrieves unexpired, unused intent and marks it consumed.
- **Signup Intent API Route (`app/api/auth/signup-intent/route.js`)**:
  - `POST`: Validates role, blocks ADMIN with 403, persists intent, and sets `httpOnly`, `sameSite: 'lax'`, `path: '/'` cookie `sb_signup_intent` (lines 18–82).
  - `GET`: Resolves token from query parameter or cookie and returns validity status (lines 88–128).
- **Server Lifecycle Hook Enforcement (`lib/auth.js`)**:
  - `user.create.before` hook (lines 87–162): Automatically sets `ADMIN` role if user email matches `INITIAL_ADMIN_EMAIL` (lines 92–102). Otherwise resolves intent token from cookie/query/body, rejects invalid/expired intents, blocks ADMIN intent, sets role to `STUDENT` or `ORGANIZATION`, and marks intent used.
  - `user.update.before` hook (lines 265–279): Unconditionally strips client-provided `role`, `accountStatus`, or `id` mutations.
- **Role Immutability & One-Account Rule (`lib/role-collision.js` & `components/RoleCollisionModal.jsx`)**:
  - `checkRoleCollision({ existingUserRole, intentRole })` (lines 15–35) flags cross-role collisions, providing redirect path `/${existingRole.toLowerCase()}/dashboard`.
  - `RoleCollisionModal.jsx` (lines 1–97) renders when collision is detected, informing user that "One Google Account = One Skill Bridge Role" and offering redirection to existing dashboard or account switching.
  - `app/(auth)/login/page.jsx` (lines 32–42) and `app/(auth)/register/page.jsx` (lines 26–36) detect `collision=true` in search params and display the modal.

---

### §R3. Profile Schemas, DB Relations & Audit Logging
- **1:1 Profile Tables (`db/schema.js`)**:
  - `studentProfiles` (`'student_profile'`, lines 162–188): `userId` (`text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`), `headline`, `bio`, `instituteId`, `instituteName`, `department`, `degree`, `graduationYear`, `yearOfStudy`, `cgpa`, `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `careerPreferences` (jsonb), `profileCompletion` (default 0), `currentOnboardingStep` (default 1).
  - `organizationProfiles` (`'organization_profile'`, lines 193–225): `userId` (unique FK cascade to `users.id`), `companyName`, `registrationNumber` (unique), `taxIdGstin`, `companyType`, `industry`, `companySize`, `website`, `logoUrl`, `contactPhone`, `address` (jsonb), `primaryContactName`, `verificationDocs` (jsonb), `hiringPreferences` (jsonb), `verificationStatus` (enum default `'PENDING'`), `verificationNotes`, `adminNotes`, `verifiedByAdminId` (FK), `verifiedAt`, `profileCompletion`, `currentOnboardingStep`.
  - `adminProfiles` (`'admin_profile'`, lines 230–246): `userId` (unique FK cascade to `users.id`), `adminLevel` (default `'SUPER_ADMIN'`), `permissions` (jsonb default `['ALL', 'VERIFY_ORGANIZATIONS', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'SYSTEM_CONFIG']`), `department`.
  - Drizzle Relations defined at lines 276–339 guaranteeing 1:1 bidirectional navigation between `users` and each role profile.
- **Append-Only Immutable Audit Logging (`db/schema.js` & `lib/audit.js`)**:
  - `auditLogs` table (`'audit_logs'`, lines 252–270): `id` (PK), `actorUserId`, `actorEmail`, `actorRole`, `action`, `targetUserId`, `resourceType`, `resourceId`, `metadata` (jsonb), `ipAddress`, `userAgent`, `createdAt`.
  - `AUDIT_ACTIONS` enum (`lib/audit.js` lines 10–26): `LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ROLE_REJECTED_MISMATCH`, `ORGANIZATION_SUBMITTED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `ORGANIZATION_INFO_REQUESTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`, `OPPORTUNITY_GATED_ATTEMPT`, `CAPABILITY_VIOLATION_BLOCKED`, `ROLE_COLLISION_BLOCKED`.
  - `logAuditEvent` (`lib/audit.js` lines 63–151): Extracts request IP/UA, persists immutable frozen records, dual-writes to Drizzle DB and fast memory fallback.
  - `getAuditLogs` (`lib/audit.js` lines 156–185): Queries audit logs with pagination and filters (`action`, `actorUserId`, `targetUserId`, `resourceType`).

---

### §R4. Student & Organization Multi-Step Onboarding
- **Dynamic Completion Scoring Engine (`lib/onboarding-calc.js`)**:
  - `calculateStudentCompletion(profile)` (lines 13–64): 8 weighted categories: Basic Info (15%), Academic (15%), Skills (20% for >=3 skills), Projects (15% for >=1), Certifications (10%), Experience (10%), Career Preferences (10%), normalized to [0, 100].
  - `calculateOrganizationCompletion(profile)` (lines 73–127): 7 weighted categories: Company Basic Info (15%), Legal & Registration (20% for CIN + GSTIN), Contact & Address (15%), Industry & Size (15%), Hiring Preferences (15%), Verification Docs (15%), Review bonus (5%), normalized to [0, 100].
  - `getStudentCompletionDetails` and `getOrgCompletionDetails` (lines 132–186) providing category score breakdowns and missing required field lists.
- **Student Onboarding UI & API**:
  - UI (`app/student/onboarding/page.jsx`, lines 1–983): 8-step wizard (Basic Info, Academic, Skills, Projects, Certifications, Experience, Preferences, Review & Finalize), live gauge showing completion percentage, step drafts, and submission.
  - API (`app/api/student/onboarding/route.js`, lines 1–244): `GET` retrieves draft and completion breakdown; `POST`/`PUT` merges step data, recalculates completion score, transitions `onboardingStatus` to `'IN_PROGRESS'` or `'COMPLETED'` (requiring >=80% and <2 missing fields), updates database, and logs `AUDIT_ACTIONS.PROFILE_UPDATED`.
- **Organization Onboarding UI & API**:
  - UI (`app/organization/onboarding/page.jsx`, lines 1–834): 7-step wizard (Company Info, Registration CIN/GSTIN, Contact & HQ, Industry, Hiring Focus, KYC Docs upload/view, Statutory Declaration & Submit), live gauge, step drafts.
  - API (`app/api/organization/onboarding/route.js`, lines 1–248): `GET` returns draft; `POST`/`PUT` updates profile, sets `verificationStatus = 'PENDING'`, advances `onboardingStatus`, and logs `AUDIT_ACTIONS.ORGANIZATION_SUBMITTED`.
- **Automatic Redirection (`middleware.js`)**:
  - Lines 185–188 & 201–204: Automatically intercepts student and organization dashboard requests when `onboardingStatus !== 'COMPLETED'` and redirects them to `/student/onboarding` or `/organization/onboarding`.

---

### §R5. Admin Governance, Verification Queue & Organization Gatekeeping
- **Admin Governance Dashboards**:
  - `app/admin/dashboard/page.jsx` (lines 1–286): Overview with system KPI metrics (Students, Organizations, Pending Verifications, Audit Logs), quick links, pending KYC queue, and live audit event stream.
  - `app/admin/verifications/page.jsx` (lines 1–383): Organization verification queue showing CIN, GSTIN, attached statutory documents (COI, GST certificates), status filters, search, and action modal for Approve / Reject / Request Info with remarks.
  - `app/admin/users/page.jsx` (lines 1–371): Platform user directory with role badges, account status toggles (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`), and search.
  - `app/admin/audit-logs/page.jsx` (lines 1–209): Forensic audit explorer with action filters, keyword search, and expandable JSON metadata inspector.
- **Admin API Handlers**:
  - `app/api/admin/verifications/route.js` (lines 1–284): `GET` queries orgs with status/search filtering; `POST`/`PATCH` executes KYC action (`APPROVE` -> sets verificationStatus to APPROVED, user accountStatus to ACTIVE; `REJECT` -> REJECTED and SUSPENDED; `REQUEST_INFO` -> INFO_REQUESTED and PENDING), and writes audit records.
  - `app/api/admin/users/route.js` (lines 1–177): `GET` lists users; `PATCH` updates account status, blocks self-suspension of admin, rejects role tampering, and logs `USER_SUSPENDED` / `USER_REACTIVATED`.
  - `app/api/admin/audit-logs/route.js` (lines 1–140): `GET` returns filtered logs; `POST`, `PUT`, `DELETE` return 405 Method Not Allowed enforcing append-only immutability.
- **Capability Gatekeeping & PII Masking (`lib/gatekeeper.js`)**:
  - `checkPublishingCapability(user, orgProfile)` (lines 35–72): Rejects opportunity publishing if user is not ADMIN and `verificationStatus !== 'APPROVED'` or `accountStatus !== 'ACTIVE'` with 403 Forbidden.
  - `maskCandidatePii(studentData, callerUser, callerOrgProfile)` (lines 82–130): Replaces direct contact fields (`email`, `phone`, `resumeUrl`, `linkedinUrl`, `githubUrl`) with `'[Verification Required]'` and sets `isPiiMasked: true` for pending, unverified, or suspended organizations, while preserving full data for Admins, Approved Orgs, and students viewing their own profiles.

---

### §R6. Role-Aware Route Protection & API Security Middleware
- **Edge Route Protection Middleware (`middleware.js`)**:
  - Lines 16–26: Matcher configured for `/student/:path*`, `/organization/:path*`, `/recruiter/:path*`, `/admin/:path*`, `/account-suspended`, `/login`, `/register`.
  - Lines 31–88: `resolveSessionFromRequest` parses Better Auth session cookies (`better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token`) and fallback headers.
  - Lines 98–124: Redirects authenticated users accessing `/login` or `/register` to their role dashboard (or onboarding if incomplete).
  - Lines 143–155: Redirects unauthenticated requests to `/login?role=...&redirect=...`.
  - Lines 159–162: Redirects SUSPENDED or DEACTIVATED accounts to `/account-suspended`.
  - Lines 168–207: Enforces strict route partitioning:
    - `/admin/*` -> requires `role === 'ADMIN'`, non-admins redirected.
    - `/student/*` -> requires `role === 'STUDENT'`, non-students redirected.
    - `/organization/*`, `/recruiter/*` -> requires `role === 'ORGANIZATION'`, non-orgs redirected.
- **Server API Security Guard (`lib/auth-guard.js`)**:
  - `withAuth(handler, options)` higher-order function providing 7-tier zero-trust defense:
    1. Session Authentication (401 Unauthorized if invalid).
    2. Account Status Check (403 Forbidden if SUSPENDED/DEACTIVATED).
    3. Role Authorization (403 Forbidden if role not in `roles` array).
    4. Onboarding Status Check (403 Forbidden if `requireOnboarded` and incomplete).
    5. Organization KYC Gatekeeping (403 Forbidden if `requireApprovedOrg` and unapproved).
    6. Tenant Resource Ownership / IDOR Check (`checkOwnership` ensures tenant matches resource owner; Admins bypass for governance).
    7. Automatic Audit Trail Logging upon successful execution of sensitive actions.
- **Resource Ownership Enforcement in API Handlers**:
  - `app/api/student/profile/route.js` (lines 45–54, 118–122): Restricts profile access/mutations to resource owner or Admin.
  - `app/api/organization/profile/route.js` (lines 45–48, 110–127): Restricts profile updates to owner or Admin, and strips `verificationStatus` and `adminNotes` from non-admin updates.
- **Suspended Account Page (`app/account-suspended/page.jsx`)**:
  - Lines 1–93: Dedicated UI explaining account restriction, displaying compliance email `compliance@skillbridge.gov.in`, and providing account sign-out / switch options.

---

### Test Suite Execution Results
The test suites were executed directly on the system:
1. **`node tests/test-auth-suite.js`**:
   - Total Suites: 4 (Tier 1 Feature Coverage, Tier 2 Boundary & Corner, Tier 3 Cross-Feature, Tier 4 Real-World Scenarios).
   - Total Tests: 30
   - Passed: 30 (100.0%)
   - Failed: 0
   - Skipped: 0
   - Execution Time: 19ms
2. **`node tests/test-runner.js`**:
   - Total Suites: 6 (Tier 1–4 matching engine, evidence elevation, PII aggregation, alerts, RBAC).
   - Total Tests: 191
   - Passed: 191 (100.0%)
   - Failed: 0
3. **`node tests/adversarial-challenger1.js`**:
   - Total Tests: 23, Passed: 23 (100.0%)
4. **`node tests/adversarial-challenger2.js`**:
   - Total Tests: 15, Passed: 15 (100.0%)

---

## 2. Logic Chain

The following deductive reasoning connects the directly observed codebase structures to the requirements in `ORIGINAL_REQUEST.md`:

1. **R1 Fulfillment**:
   - *Premise*: R1 requires Better Auth with Google OAuth, Drizzle ORM schemas for core tables, React client SDK, and environment configuration with `.env.example`.
   - *Evidence*: `db/schema.js` defines Drizzle schemas for `user`, `session`, `account`, `verification`. `lib/auth.js` wires Better Auth with Drizzle adapter and Google OAuth provider. `app/api/auth/[...all]/route.js` routes all auth requests. `lib/auth-client.js` exports `createAuthClient` SDK. `.env.example` provides complete template without exposing secrets.
   - *Deduction*: R1 is 100% fulfilled.

2. **R2 Fulfillment**:
   - *Premise*: R2 requires server-owned roles (STUDENT, ORGANIZATION, ADMIN), cryptographic signup intents, public admin registration block, and role immutability ("One Google Account = One Role").
   - *Evidence*: `db/schema.js` defines `userRoleEnum`. `lib/auth.js` sets `input: false` on `role` and deletes `role` in `user.update.before`. `lib/signup-intent.js` and `app/api/auth/signup-intent/route.js` generate 256-bit crypto tokens for pre-OAuth role binding and explicitly reject `ADMIN` role with 403 Forbidden. Super admin is provisioned strictly via `INITIAL_ADMIN_EMAIL`. `lib/role-collision.js`, `RoleCollisionModal.jsx`, and login/register pages reject cross-role sign-in attempts and guide users to their registered role dashboard.
   - *Deduction*: R2 is 100% fulfilled.

3. **R3 Fulfillment**:
   - *Premise*: R3 requires 1:1 role profile schemas (`student_profile`, `organization_profile`, `admin_profile`), strict unique foreign key constraints, and comprehensive audit logging.
   - *Evidence*: `db/schema.js` defines `studentProfiles`, `organizationProfiles`, and `adminProfiles`, each with `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`. `audit_logs` table and `lib/audit.js` implement immutable audit records capturing all sensitive actions (`LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`).
   - *Deduction*: R3 is 100% fulfilled.

4. **R4 Fulfillment**:
   - *Premise*: R4 requires multi-step onboarding for student (8 steps) and organization (7 steps), dynamic completion calculation, and automatic redirection of un-onboarded users.
   - *Evidence*: `lib/onboarding-calc.js` provides weighted scoring algorithms for students (8 categories) and organizations (7 categories). `app/student/onboarding/page.jsx` and `app/organization/onboarding/page.jsx` provide full step wizards with live gauge feedback. `app/api/student/onboarding/route.js` and `app/api/organization/onboarding/route.js` validate steps, persist drafts, and transition `onboardingStatus`. `middleware.js` intercepts un-onboarded users navigating to dashboard pages and redirects them to their onboarding wizard.
   - *Deduction*: R4 is 100% fulfilled.

5. **R5 Fulfillment**:
   - *Premise*: R5 requires admin governance dashboards (`/admin/*`), organization KYC review workflow (Approve/Reject/Request Info), and capability gatekeeping for pending/suspended organizations.
   - *Evidence*: `app/admin/dashboard/page.jsx`, `app/admin/verifications/page.jsx`, `app/admin/users/page.jsx`, and `app/admin/audit-logs/page.jsx` provide administrative governance interfaces. `app/api/admin/verifications/route.js` and `app/api/admin/users/route.js` implement KYC status transitions and user moderation with audit logging. `lib/gatekeeper.js` enforces capability restrictions (blocking opportunity publishing for unapproved orgs and masking student candidate PII).
   - *Deduction*: R5 is 100% fulfilled.

6. **R6 Fulfillment**:
   - *Premise*: R6 requires Edge route protection middleware, API security & role guard, resource ownership verification, and suspended account handling.
   - *Evidence*: `middleware.js` strictly isolates `/student/*`, `/organization/*`, and `/admin/*` routes, enforcing session presence and role matching. `lib/auth-guard.js` provides `withAuth` wrapping API routes with session checks, role checks, account status checks, onboarding checks, and IDOR ownership checks. `app/account-suspended/page.jsx` provides dedicated user feedback and appeal channels.
   - *Deduction*: R6 is 100% fulfilled.

---

## 3. Caveats

1. **Database Fallback Mechanism**:
   - When running in an environment without active internet connectivity or without a live Neon PostgreSQL instance, `db/index.js` automatically activates `createMockDrizzleDb()`, backed by `lib/db.js` (`data/db.json`). In production, setting a valid `DATABASE_URL` connects directly to Neon Serverless PostgreSQL with SSL. Both modes implement identical interface contracts and constraint semantics.
2. **Google OAuth Client Credentials**:
   - For automated testing and offline development, placeholder Google client credentials are provided in `.env.example`. Real production deployments require valid credentials configured in Google Cloud Console with authorized redirect URI `https://<domain>/api/auth/callback/google`.
3. **Admin Provisioning**:
   - Public registration for `ADMIN` is strictly impossible. Platform administrators must configure `INITIAL_ADMIN_EMAIL` in the environment before initial login, or provision admin users via `scripts/seed.js`.

---

## 4. Conclusion

The Skill Bridge Auth & Role System implementation is complete, robust, and fully compliant with all architectural and functional requirements specified in `ORIGINAL_REQUEST.md` (§R1 through §R6). Every acceptance criterion is satisfied:
- Better Auth and Google OAuth integration is established with Drizzle ORM schemas.
- Server-authoritative role binding and cryptographic pre-OAuth signup intents guarantee "One Google Account = One Role".
- 1:1 role profile relations and immutable append-only audit logging are enforced at database and API levels.
- Multi-step onboarding flows with dynamic completion scoring and automatic route redirection are operational.
- Admin governance, KYC verification queue, user moderation, and organization capability gatekeeping (opportunity publishing blocks and candidate PII masking) are active.
- Edge route protection middleware, API security guards (`withAuth`), IDOR ownership checks, and account suspension flows are fully integrated.
- 100% test pass rate achieved across all test tiers (30/30 auth tests, 191/191 system tests, 38/38 adversarial tests).

---

## 5. Verification Method

To independently verify the implementation, execute the following commands in powershell at project root `e:/sih_2026_044`:

1. **Run Master Auth & Role System E2E Test Suite**:
   ```powershell
   node tests/test-auth-suite.js
   ```
   *Expected Output*: 4 test suites, 30 test cases, 0 failures, 100.0% pass rate.

2. **Run Comprehensive System Test Suite**:
   ```powershell
   node tests/test-runner.js
   ```
   *Expected Output*: 6 test suites, 191 test cases, 0 failures, 100.0% pass rate.

3. **Run Adversarial Challenger Test Suites**:
   ```powershell
   node tests/adversarial-challenger1.js
   node tests/adversarial-challenger2.js
   ```
   *Expected Output*: All 38 adversarial edge and stress test cases pass with exit code 0.

4. **Inspect Core Implementation Files**:
   - Database Schemas: `db/schema.js`, `db/index.js`
   - Server Auth & Hooks: `lib/auth.js`, `app/api/auth/[...all]/route.js`
   - Signup Intent Engine: `lib/signup-intent.js`, `app/api/auth/signup-intent/route.js`
   - Role Collision Handler: `lib/role-collision.js`, `components/RoleCollisionModal.jsx`
   - Profile & Audit Logging: `lib/audit.js`, `lib/onboarding-calc.js`
   - Onboarding Pages & Routes: `app/student/onboarding/page.jsx`, `app/api/student/onboarding/route.js`, `app/organization/onboarding/page.jsx`, `app/api/organization/onboarding/route.js`
   - Admin Governance: `app/admin/dashboard/page.jsx`, `app/admin/verifications/page.jsx`, `app/admin/users/page.jsx`, `app/admin/audit-logs/page.jsx`, `app/api/admin/*`, `lib/gatekeeper.js`
   - Route Protection & Guard: `middleware.js`, `lib/auth-guard.js`, `app/account-suspended/page.jsx`
