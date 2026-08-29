# Handoff Report — Explorer 1 (Authentication, Better Auth, Roles & Core Schema)

## 1. Observation
1. **Existing Auth Architecture**:
   - `lib/auth.js:14-23` initializes `betterAuth` using `drizzleAdapter(db, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } })`.
   - `lib/auth.js:36-57` configures custom user fields: `role` (`input: false`, default `'STUDENT'`), `accountStatus` (`input: false`, default `'PENDING'`), `onboardingStatus` (`input: false`, default `'NOT_STARTED'`).
   - `lib/auth.js:70-283` registers database lifecycle hooks: `user.create.before` validates cryptographic signup intents from cookie `sb_signup_intent`, assigns verified role, and consumes intent; `user.create.after` auto-provisions 1:1 profiles; `user.update.before` strips `role`, `accountStatus`, and `id` to enforce role immutability.
   - `lib/auth-client.js:8-18` exports `createAuthClient` with `signIn`, `signUp`, `signOut`, `useSession`, `getSession`.
   - `app/api/auth/[...all]/route.js:7-9` exports `GET` and `POST` using `toNextJsHandler(auth)`.
2. **Role Definitions & Pre-OAuth Flow**:
   - `db/schema.js:34` defines: `const userRoleEnum = pgEnum('user_role', ['STUDENT', 'ORGANIZATION', 'ADMIN']);`.
   - `lib/signup-intent.js:9` defines: `const ALLOWED_SIGNUP_ROLES = ['STUDENT', 'ORGANIZATION'];`.
   - `app/api/auth/signup-intent/route.js:41-47` rejects `ADMIN` registration with `403 Forbidden` (`ADMIN_REGISTRATION_FORBIDDEN`).
   - `app/(auth)/register/page.jsx:95-125` renders role cards only for `STUDENT` and `ORGANIZATION` (missing `INSTITUTE` card).
   - `ORIGINAL_REQUEST.md:17-25` explicitly specifies three immutable user roles: `STUDENT`, `INDUSTRY`, `INSTITUTE`, with pre-OAuth `RoleSelector` component and 1:1 foreign key constraints to `StudentProfile`, `IndustryProfile`, and `InstituteProfile`.
3. **Database Schema & Profile Tables**:
   - `db/schema.js:63-78` defines `users` (`user`) table. Missing explicit `profileCompleted: boolean` column (uses `onboardingStatus` enum instead).
   - `db/schema.js:162-246` defines `studentProfiles` (`student_profile`), `organizationProfiles` (`organization_profile`), and `adminProfiles` (`admin_profile`).
   - `institute_profile` (`instituteProfiles`) table is missing from `db/schema.js`.
4. **Calculations & Route Protection**:
   - `lib/onboarding-calc.js:13-127` implements `calculateStudentCompletion` (8 categories) and `calculateOrganizationCompletion` (7 categories).
   - `middleware.js:16-26` intercepts `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`, `/login`, `/register`, and `/account-suspended`.
   - `lib/auth-guard.js:81-246` provides `withAuth` wrapper with session validation, role authorization, onboarding status check, KYC check, and IDOR tenant ownership verification.
5. **Test & Build Status**:
   - `node tests/test-auth-suite.js` passed **30/30 tests (100%)** across Tiers 1–4.
   - `node scripts/test-matching-rules.js` passed **13/13 tests (100%)**.
   - `node tests/test-verification-system.js` passed **8/8 tests (100%)**.
   - `npm run build` completed successfully, generating **48 static and dynamic routes** with 0 compile errors.

## 2. Logic Chain
1. *From Observation 1 & 5*: The Better Auth engine, catch-all route handler, client SDK, Drizzle adapter, and mock fallback are fully operational and verified by comprehensive test suites and clean Next.js build.
2. *From Observation 2 & 3*: The project currently uses `STUDENT`, `ORGANIZATION`, and `ADMIN` in its database enum and intent engine. However, the authoritative specification in `ORIGINAL_REQUEST.md` requires three immutable roles: `STUDENT`, `INDUSTRY`, `INSTITUTE`. Therefore, `db/schema.js`, `lib/signup-intent.js`, `lib/auth.js`, and `app/(auth)/` must be expanded to include `INDUSTRY` and `INSTITUTE` (while preserving backward compatibility with `ORGANIZATION`).
3. *From Observation 3*: `ORIGINAL_REQUEST.md` requires `InstituteProfile` and `user.profileCompleted`. In `db/schema.js`, `instituteProfiles` is missing and `profileCompleted` is currently tracked via `onboardingStatus`. Adding `institute_profile` and `user.profileCompleted` will complete the required schema contracts.
4. *From Observation 2 & 4*: The pre-OAuth role selection in `register/page.jsx` works via `POST /api/auth/signup-intent` setting `sb_signup_intent` cookie, but lacks a dedicated reusable `RoleSelector` component and an `INSTITUTE` selection card. Creating `RoleSelector.jsx` with all 3 roles satisfies §2.

## 3. Caveats
- No live PostgreSQL server was connected during local testing (`DATABASE_URL` was using high-fidelity mock fallback in `db/index.js` and `lib/db.js`). Both Drizzle ORM schema definitions and mock database clients must stay in exact sync.
- Existing tests in `tests/test-auth-suite.js` use `STUDENT`, `ORGANIZATION`, `ADMIN`. When adding `INDUSTRY` and `INSTITUTE`, aliases must be preserved so existing tests continue passing without regression.

## 4. Conclusion
The core authentication, signup intent mechanism, role immutability enforcement, and database architecture are solidly built and fully functional. To bring the codebase into 100% compliance with `ORIGINAL_REQUEST.md`:
1. Expand role definitions in `db/schema.js`, `lib/signup-intent.js`, and `lib/auth.js` to support `STUDENT`, `INDUSTRY`, and `INSTITUTE` (with alias `ORGANIZATION` $\leftrightarrow$ `INDUSTRY`).
2. Add `instituteProfiles` (`institute_profile`) table and `user.profileCompleted` column in `db/schema.js`.
3. Create a unified, reusable `RoleSelector` component with 3 roles (`Student`, `Industry`, `Institute`) and integrate it into pre-OAuth registration.
4. Export canonical calculation functions `calculateProfileCompletion` and `isProfileComplete` in `lib/onboarding-calc.js`.
5. Implement `app/home/page.jsx` for authenticated dynamic role-based dashboard redirection.

## 5. Verification Method
1. **Run Master Test Suite**:
   ```bash
   npm test
   # or node tests/test-auth-suite.js
   ```
2. **Run Domain Rule Verification Suites**:
   ```bash
   npm run test:matching
   npm run test:verification
   ```
3. **Verify Build**:
   ```bash
   npm run build
   ```
4. **File Inspections**:
   - Inspect `db/schema.js` for `userRoleEnum`, `instituteProfiles`, and `user.profileCompleted`.
   - Inspect `lib/signup-intent.js` for `ALLOWED_SIGNUP_ROLES` containing `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
   - Inspect `app/api/auth/[...all]/route.js` and `lib/auth.js` for Better Auth handler and lifecycle hooks.
