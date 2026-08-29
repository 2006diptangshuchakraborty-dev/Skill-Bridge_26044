# Phase 0 Codebase Survey: Authentication, Better Auth, Role Selection & Database Schema

**Explorer**: Explorer 1  
**Timestamp**: 2026-08-24T17:05:00Z  
**Target Scope**: Better Auth, Google OAuth, Role Selection Flow, Role Immutability, Core Database Schema, 1:1 Profiles, and Route Authorization.

---

## Executive Summary

The Skill Bridge platform already possesses a high-quality, production-grade foundation for authentication, Better Auth integration, cryptographic signup intents, Drizzle ORM schemas, edge middleware, and security guards. 
- The project passes **100% of all E2E test suites** (30/30 tests across Tiers 1–4, 13/13 matching engine tests, 8/8 verification tests).
- `npm run build` compiles with **0 errors across all 48 static and dynamic routes**.
- However, there is a role naming divergence between the newly clarified requirements (`STUDENT`, `INDUSTRY`, `INSTITUTE`) and the legacy schema (`STUDENT`, `ORGANIZATION`, `ADMIN`).
- Furthermore, `institute_profile` schema, `profileCompleted` boolean on `user`, a standalone reusable `RoleSelector` component, and `app/home/page.jsx` dynamic role routing require alignment to fully satisfy `ORIGINAL_REQUEST.md`.

---

## 1. Better Auth & Google OAuth Configuration

### Implemented Files:
- `lib/auth.js` (Better Auth Server Engine)
- `lib/auth-client.js` (React Client SDK)
- `app/api/auth/[...all]/route.js` (Catch-All Route Handler)

### Direct Observations & File Details:
1. **Server Configuration (`lib/auth.js`)**:
   - Uses `betterAuth` from `better-auth` (version `^1.7.1` in `package.json:20`).
   - Uses `drizzleAdapter(db, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } })` (`lib/auth.js:15-23`).
   - Secret & URL: reads `process.env.BETTER_AUTH_SECRET` and `process.env.BETTER_AUTH_URL` with safe dev defaults (`lib/auth.js:24-25`).
   - Social Provider: Google OAuth provider configured (`lib/auth.js:28-33`):
     ```javascript
     socialProviders: {
       google: {
         clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
         clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
       },
     }
     ```
   - Additional User Fields (`lib/auth.js:36-57`):
     - `role`: string, `input: false` (strictly protects role from client-side payload injection).
     - `accountStatus`: string, `input: false`, default `PENDING`.
     - `onboardingStatus`: string, `input: false`, default `NOT_STARTED`.
   - Lifecycle Hooks (`lib/auth.js:70-283`):
     - `user.create.before`: Checks `INITIAL_ADMIN_EMAIL` -> assigns `ADMIN`. Extracts intent token from `sb_signup_intent` cookie or `state`/`intent` param, validates token against `signup_intents` table, assigns validated role, and marks intent used (`lib/auth.js:73-145`).
     - `user.create.after`: Auto-provisions 1:1 role profile records (`student_profile`, `organization_profile`, `admin_profile`) and records immutable audit logs `ACCOUNT_CREATED` and `ROLE_ASSIGNED` (`lib/auth.js:147-267`).
     - `user.update.before`: Sanitizes updates by deleting `role`, `accountStatus`, and `id` to enforce role immutability (`lib/auth.js:270-281`).

2. **Client Auth SDK (`lib/auth-client.js`)**:
   - Initialized via `createAuthClient` from `better-auth/react` (`lib/auth-client.js:6-10`).
   - Exports `signIn`, `signUp`, `signOut`, `useSession`, `getSession` (`lib/auth-client.js:12-18`).

3. **Route Handler (`app/api/auth/[...all]/route.js`)**:
   - Next.js App Router catch-all route handler exporting `GET` and `POST` using `toNextJsHandler(auth)` (`app/api/auth/[...all]/route.js:7-9`).

---

## 2. Role Definitions & Immutability Alignment

### Requirements in `ORIGINAL_REQUEST.md` (§2 & §3):
- **Three immutable user roles**: `STUDENT`, `INDUSTRY`, `INSTITUTE`.
- **Single Account = Exactly ONE Role**: Immutable once set upon account creation. No role switching from user UI.
- **Server-Side Authorization**: Client role state is never trusted.

### Current Codebase Alignment & Divergence:
| Requirement Specification | Existing Implementation in Codebase | Status / Gap |
|---|---|---|
| Role 1: `STUDENT` | `STUDENT` in `db/schema.js`, `lib/auth.js`, `lib/signup-intent.js`, `middleware.js` | **Fully Aligned** |
| Role 2: `INDUSTRY` | `ORGANIZATION` in `db/schema.js`, `lib/auth.js`, `lib/signup-intent.js`, and `/recruiter/*` routes | **Needs Aliasing / Canonical Mapping**: `INDUSTRY` is the required role name; code currently uses `ORGANIZATION` in schema and `recruiter` in UI routes. |
| Role 3: `INSTITUTE` | `ADMIN` / `/institute` portal; missing as first-class signup role and missing from `db/schema.js` `userRoleEnum` | **Missing First-Class Role**: `INSTITUTE` must be added to `userRoleEnum`, `signup_intents`, and 1:1 `institute_profile` schema. |
| Role Immutability | Enforced in `lib/auth.js` (`input: false` & update hook stripping `role`), `lib/role-collision.js`, `components/RoleCollisionModal.jsx`, `lib/auth-guard.js` | **Fully Aligned & Tested** |
| Pre-OAuth Role Selection | `app/api/auth/signup-intent/route.js`, `lib/signup-intent.js`, `app/(auth)/register/page.jsx` | **Working for STUDENT/ORGANIZATION; Needs INSTITUTE & RoleSelector component** |

---

## 3. Pre-OAuth Role Selection & Intent Handshake

### Implemented Mechanics:
1. **Cryptographic Token Creation (`lib/signup-intent.js:16-94`)**:
   - Generates 32-byte (256-bit) entropy token (`crypto.randomBytes(32).toString('hex')`).
   - Sets 15-minute expiration (`INTENT_EXPIRY_MS = 15 * 60 * 1000`).
   - Enforces strict public admin registration prohibition (`lib/signup-intent.js:27-34`).
   - Persists intent record in `signup_intents` table in PostgreSQL & local DB fallback.
2. **Intent API Endpoints (`app/api/auth/signup-intent/route.js`)**:
   - `POST /api/auth/signup-intent`: Accepts `{ role, email }`, creates intent, sets `httpOnly`, `sameSite: lax`, `path: '/'` cookie `sb_signup_intent` (maxAge: 900s), and returns `{ success: true, intentToken, role, expiresAt }`.
   - `GET /api/auth/signup-intent`: Validates token from query `?token=` or cookie.
3. **Role Collision Detection (`lib/role-collision.js` & `components/RoleCollisionModal.jsx`)**:
   - When a returning user signs in via Google OAuth with an intent that differs from their stored database role, `checkRoleCollision` identifies the mismatch and redirects to their existing dashboard with `collision=true`.
   - `RoleCollisionModal` displays a clear, branded alert explaining that accounts are locked to their initial role.

### Gaps & Needed Fixes:
- `ALLOWED_SIGNUP_ROLES` in `lib/signup-intent.js:9` only has `['STUDENT', 'ORGANIZATION']`. Needs `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
- `app/(auth)/register/page.jsx` only shows cards for Student and Organization.
- A reusable `RoleSelector` component (`components/shared/RoleSelector.jsx` or `components/auth/RoleSelector.jsx`) should be extracted and utilized across landing page, register page, and login modals.

---

## 4. Core Database Schema & 1:1 Profiles

### Schema Definitions (`db/schema.js`):
1. **User Table (`users` / `user`)** (`db/schema.js:63-78`):
   - `id`: text primary key
   - `name`: text notNull
   - `email`: text notNull unique
   - `emailVerified`: boolean default false
   - `image`: text
   - `role`: `userRoleEnum` default `'STUDENT'`
   - `accountStatus`: `accountStatusEnum` (`PENDING`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`) default `'ACTIVE'`
   - `onboardingStatus`: `onboardingStatusEnum` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) default `'NOT_STARTED'`
   - `createdAt`, `updatedAt`: timestamp with time zone
   - *Missing*: `profileCompleted: boolean` (notNull, default false).
2. **Session Table (`sessions` / `session`)** (`db/schema.js:83-96`):
   - Standard Better Auth session table with `userId` FK cascade, unique `token`, `expiresAt`, `ipAddress`, `userAgent`.
3. **Account Table (`accounts` / `account`)** (`db/schema.js:101-118`):
   - Standard Better Auth OAuth table with `userId` FK cascade, `providerId`, `accountId`, access/refresh tokens, scope, idToken.
4. **Verification Table (`verifications` / `verification`)** (`db/schema.js:123-132`):
   - Standard Better Auth token table (`id`, `identifier`, `value`, `expiresAt`).
5. **Signup Intents Table (`signupIntents` / `signup_intents`)** (`db/schema.js:141-153`):
   - `id`, `token` (unique index), `role`, `email`, `expires_at`, `used`, `used_at`, `created_at`.
6. **1:1 Role Profile Tables**:
   - `studentProfiles` (`student_profile`) (`db/schema.js:162-188`): Unique FK `userId` -> `users.id` cascade. Fields: `phone`, `headline`, `bio`, `instituteId`, `instituteName`, `department`, `degree`, `graduationYear`, `yearOfStudy`, `cgpa`, `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `careerPreferences` (jsonb), `profileCompletion`, `currentOnboardingStep`.
   - `organizationProfiles` (`organization_profile`) (`db/schema.js:193-225`): Unique FK `userId` -> `users.id` cascade. Fields: `companyName`, `registrationNumber` (unique), `taxIdGstin`, `companyType`, `industry`, `companySize`, `website`, `logoUrl`, `contactPhone`, `address` (jsonb), `primaryContactName`, `verificationDocs` (jsonb), `hiringPreferences` (jsonb), `verificationStatus`, `profileCompletion`.
   - `adminProfiles` (`admin_profile`) (`db/schema.js:230-246`): Unique FK `userId` -> `users.id` cascade. Fields: `adminLevel`, `permissions` (jsonb), `department`.
   - *Missing*: `instituteProfiles` (`institute_profile`): Required for college/faculty governance.

---

## 5. Profile Completion & Gating Logic

### Dynamic Completion Calculators (`lib/onboarding-calc.js`):
- `calculateStudentCompletion(profile)`: Dynamic 8-category weighted scoring (Basic Info 15%, Academic 15%, Skills 20%, Projects 15%, Certifications 10%, Experience 10%, Career Preferences 10%, Review 5% bump). Clamped [0, 100].
- `calculateOrganizationCompletion(profile)`: Dynamic 7-category weighted scoring (Basic Info 15%, Legal/Reg 20%, Contact 15%, Industry/Size 15%, Hiring Prefs 15%, Docs 15%, Review 5% bump). Clamped [0, 100].
- Helper methods: `getStudentCompletionDetails` and `getOrgCompletionDetails` returning progress breakdown and missing fields checklist.

### Profile Gating & Route Protection (`middleware.js` & `lib/auth-guard.js`):
- `middleware.js:184-189`: Checks `user.onboardingStatus !== 'COMPLETED'` on student routes; redirects uncompleted users to `/student/onboarding`.
- `middleware.js:200-205`: Checks `user.onboardingStatus !== 'COMPLETED'` on organization routes; redirects uncompleted users to `/organization/onboarding`.
- `lib/auth-guard.js:143-157`: `withAuth` wrapper option `requireOnboarded: true` returns 403 `ONBOARDING_REQUIRED` if profile is incomplete.
- `lib/auth-guard.js:158-182`: `requireApprovedOrg: true` blocks unapproved/pending organizations from publishing opportunities or harvesting candidate PII.

---

## 6. Itemized Inventory & Recommendations

### Summary Matrix:
| Component | Existing State | Missing / Needs Fix | Recommended Action |
|---|---|---|---|
| **Better Auth Server** | Configured in `lib/auth.js` with Drizzle adapter, Google provider, custom user fields & lifecycle hooks | Add `profileCompleted` boolean field to `user.additionalFields` | Update `lib/auth.js` to include `profileCompleted: { type: "boolean", defaultValue: false, input: false }` |
| **User Roles** | Enum has `['STUDENT', 'ORGANIZATION', 'ADMIN']` | Enum should formally support `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ADMIN']` with alias support for `ORGANIZATION` | Update `db/schema.js` enum, map `INDUSTRY` $\leftrightarrow$ `ORGANIZATION` and add `INSTITUTE` |
| **Pre-OAuth Intent Engine** | `lib/signup-intent.js` and `/api/auth/signup-intent` generating 256-bit cryptographic tokens | Allowed roles array lacks `INSTITUTE` and `INDUSTRY` | Update `ALLOWED_SIGNUP_ROLES` in `lib/signup-intent.js` to `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']` |
| **Role Selection UI** | `login/page.jsx` & `register/page.jsx` with tabs/cards | No dedicated `RoleSelector` component; missing `INSTITUTE` card | Create `components/auth/RoleSelector.jsx` supporting all 3 roles (`STUDENT`, `INDUSTRY`, `INSTITUTE`) |
| **Database Schema** | `db/schema.js` has `user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `organization_profile`, `admin_profile`, `audit_logs` | Missing `institute_profile` schema and `user.profileCompleted` column | Add `instituteProfiles` (`institute_profile`) table with 1:1 `userId` constraint to `db/schema.js` |
| **Profile Calculation Functions** | `calculateStudentCompletion` & `calculateOrganizationCompletion` in `lib/onboarding-calc.js` | Needs canonical alias functions `calculateProfileCompletion` & `isProfileComplete` as specified in §3 | Export `calculateProfileCompletion(role, profile)` and `isProfileComplete(profile, threshold = 80)` from `lib/onboarding-calc.js` |
| **Authenticated Home** | Missing `app/home/page.jsx` | Dynamic role dashboard router needed | Implement `app/home/page.jsx` to dynamically render role dashboards for `STUDENT`, `INDUSTRY`, `INSTITUTE` with `lib/dummy-data/` |
| **Role-Aware Dynamic Navbar** | `components/shared/Navbar.jsx` exists with partial role links | Needs dynamic auth session avatar + profile completion badge + exact role links from §5 | Update `Navbar.jsx` to render role-aware links and profile completion badges according to §5 specification |

---

## 7. Concrete Next Step Plan for Implementer
1. **Schema Migration (`db/schema.js`)**:
   - Add `INSTITUTE` and `INDUSTRY` to `userRoleEnum`.
   - Add `profileCompleted` column to `users` table.
   - Define `instituteProfiles` table (`db/schema.js`) with 1:1 foreign key to `users.id`.
   - Export alias `industryProfiles = organizationProfiles`.
2. **Intent & Auth Server Update (`lib/signup-intent.js`, `lib/auth.js`)**:
   - Update `ALLOWED_SIGNUP_ROLES` to include `STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`.
   - Update `databaseHooks.user.create.after` to auto-provision `instituteProfiles` when role is `INSTITUTE`.
3. **Role Selector & Auth Pages (`components/auth/RoleSelector.jsx`, `app/(auth)/...`)**:
   - Build unified `RoleSelector` component with 3 distinct role cards (`Student`, `Industry`, `Institute`).
   - Integrate `RoleSelector` into `app/(auth)/register/page.jsx` and `app/(auth)/login/page.jsx`.
4. **Calculators & Profile Gating (`lib/onboarding-calc.js`)**:
   - Export `calculateProfileCompletion` and `isProfileComplete`.
   - Add institute profile completion calculation logic.
5. **Authenticated Home & Dynamic Navbar (`app/home/page.jsx`, `components/shared/Navbar.jsx`)**:
   - Implement `app/home/page.jsx` role dispatcher.
   - Update `components/shared/Navbar.jsx` with role-aware nav items, user avatar, and student profile completion progress badge.
