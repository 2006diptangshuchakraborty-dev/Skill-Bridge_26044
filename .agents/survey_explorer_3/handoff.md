# 5-Component Handoff Report: Survey Explorer 3 (Frontend Navigation, Auth Page, Role Selection, Onboarding Forms & Dashboards)

**Date:** 2026-08-26  
**Agent:** Survey Explorer 3  
**Working Directory:** `e:\sih_2026_044\.agents\survey_explorer_3`  
**Parent Agent:** orchestrator (`ffb78a75-6929-4164-97f2-893e8dc6fb12`)  
**Task Scope:** Comprehensive read-only survey of frontend components, pages, routing, navigation, and role dashboards.

---

## 1. Observation

Direct code observations with exact file paths and line numbers:

1. **Navbar Component (`components/shared/Navbar.jsx`):**
   - **Session State & Imports (`lines 21, 44–47`):** Imports `authClient, useSession, signOut` from `@/lib/auth-client`. Consumes `const { data: session, isPending } = useSession();`.
   - **Unauthenticated CTA Buttons (`lines 366–381, 461–475`):**
     - Line 368: `<Link href="/login" ...>Sign In</Link>`
     - Line 375: `<Link href="/register" ...>Get Started</Link>`
     - Does not currently route to a unified `/auth` page.
   - **Authenticated Dynamic State (`lines 238–363`):**
     - Student profile completion badge (lines 241–250): `<CheckCircle2 /> {studentCompletion}% Complete` linking to `/student/profile`.
     - Role Pill (line 254): Displays uppercase role (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN`).
     - User Dropdown Menu (lines 258–353): Shows avatar, name, email, role-specific profile links (`/student/profile`, `/organization/onboarding`, `/institute/onboarding`, `/admin/dashboard`), Home (`/home`), and Sign Out.
     - Center Navigation links per role (`lines 122–159`):
       - `STUDENT`: `/home`, `/student/opportunities`, `/student/applications`, `/student/profile`.
       - `INDUSTRY`: `/home`, `/recruiter/jobs/create`, `/recruiter/dashboard`, `/recruiter/candidates`, `/organization/onboarding`.
       - `INSTITUTE`: `/home`, `/institute/dashboard`, `/institute/skill-gaps`, `/institute/feedback`, `/institute/training`, `/institute/onboarding`.
       - `ADMIN`: `/home`, `/admin/users`, `/admin/verifications`, `/admin/reputation`, `/admin/audit-logs`.
   - **Sign Out Handler (`lines 79–94`):**
     - Line 91: Executes `router.push("/login")` and `router.refresh()`. (Original request specifies redirect to `/`).

2. **Auth Pages & Role Selection UI (`app/(auth)/login/page.jsx`, `app/(auth)/register/page.jsx`, `components/auth/RoleSelector.jsx`):**
   - **Missing Unified `/auth` Route:** `app/auth/page.jsx` and `app/(auth)/auth/page.jsx` do not exist.
   - **Login Page (`app/(auth)/login/page.jsx:44–73`):**
     - Single-selection state `activeRole`, defaulting to `STUDENT` or URL param.
     - Uses `<RoleSelector layout="compact" />` with compact pill tabs and Admin login toggle.
     - `handleGoogleSignIn`: Calls `fetch('/api/auth/signup-intent', { method: 'POST', body: JSON.stringify({ role: activeRole }) })` followed by `authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })`.
     - Mounts `<RoleCollisionModal />` when `collision === 'true'` in query params.
   - **Register Page (`app/(auth)/register/page.jsx:45–76`):**
     - State `selectedRole`, single select via `<RoleSelector layout="grid" />`.
     - Prohibits admin self-registration with dedicated callout banner.
     - `handleGoogleSignup`: Sends intent handshake to `/api/auth/signup-intent` then invokes `authClient.signIn.social`.
   - **RoleSelector Component (`components/auth/RoleSelector.jsx`):**
     - Exports `ROLES` defining `STUDENT`, `INDUSTRY` (aliased to `ORGANIZATION`), and `INSTITUTE`.
     - Features icons (`GraduationCap`, `Building2`, `School`), badges (`Candidate`, `Recruiter`, `Academic & TPO`), active borders, rings, and ARIA radio group attributes (`role="radiogroup"`, `role="radio"`, `aria-checked`).
   - **Role Collision Modal (`components/RoleCollisionModal.jsx`):**
     - Warns user: `"This Google account is already registered as a [Existing Role]"`.
     - Provides action buttons to continue to `/[existingRole]/dashboard` or sign in with another account.

3. **Profile Setup & Onboarding Flow (`app/profile/setup`, `app/student/onboarding/page.jsx`, `app/organization/onboarding/page.jsx`, `app/institute/onboarding/page.jsx`):**
   - **Missing `/profile/setup` Route:** `app/profile/setup/page.jsx` does not exist.
   - **Current Onboarding Route Division:**
     - Student: `app/student/onboarding/page.jsx` (8-step wizard with dynamic progress gauge, draft saving to `/api/student/onboarding`, and final submission redirecting to `/student/dashboard`).
     - Organization / Industry: `app/organization/onboarding/page.jsx` (7-step wizard saving to `/api/organization/onboarding` and redirecting to `/organization/dashboard`). `app/industry/onboarding/page.jsx` is a redirect alias to `/organization/onboarding`.
     - Institute: `app/institute/onboarding/page.jsx` (6-step wizard saving to `/api/institute/onboarding` and redirecting to `/institute/dashboard`).
   - **Validation Rules (`lib/onboarding-calc.js`):**
     - Student: 8 categories, 70% threshold. Mandatory: headline, bio, institute, department, degree, year, >=3 skills, >=1 project, career preferences.
     - Organization: 7 categories. Mandatory: company name, CIN, GSTIN, phone, HQ address, industry, company size, hiring preferences, KYC docs.
     - Institute: 6 categories. Mandatory: institute name, AISHE code, type, phone, address, departments, TPO contact, accreditation docs.
   - **OAuth Dispatcher (`app/profile/complete/page.jsx`):**
     - Checks `authClient.getSession()`.
     - If `profileCompleted === false`, redirects to `/student/onboarding`, `/organization/onboarding`, or `/institute/onboarding`.
     - If `profileCompleted === true`, redirects to `/student/dashboard`, `/organization/dashboard`, `/institute/dashboard`, or `/admin/dashboard`.

4. **Role Dashboards:**
   - `app/student/dashboard/page.jsx`: **MISSING / DOES NOT EXIST** (Redirects in middleware and profile completion trigger 404).
   - `app/industry/dashboard/page.jsx`: **MISSING / DOES NOT EXIST**.
   - `app/organization/dashboard/page.jsx`: **MISSING / DOES NOT EXIST** (Referred to in `middleware.js:103, 118, 155`).
   - `app/recruiter/dashboard/page.jsx`: Exists and functional (job funnel, mandatory skill gatekeeper, candidate views).
   - `app/institute/dashboard/page.jsx`: Exists and functional (student counts, skill gap alerts, training program CTA).
   - `app/admin/dashboard/page.jsx`: Exists and functional (KYC queue, user RBAC, forensic audit logs).

5. **Client Auth Hooks & Edge Middleware (`middleware.js`):**
   - `middleware.js:16–26`: `matcher` only covers `/student/:path*`, `/organization/:path*`, `/recruiter/:path*`, `/admin/:path*`, `/account-suspended`, `/login`, `/register`.
   - **Missing from matcher:** `/industry/:path*`, `/institute/:path*`, `/profile/:path*`, `/auth`.
   - `middleware.js:127–139`: Unauthenticated access redirects to `/login?role=...&redirect=...` rather than `/auth`.
   - `middleware.js:150–192`: Role route partitioning ignores `INSTITUTE` and `INDUSTRY`. Incomplete onboarding checks only look for `/student/onboarding` and `/organization/onboarding`.
---

## 2. Logic Chain

1. **Navbar -> Auth Navigation:**
   - Observations 1.2 and 2.1 show that Navbar currently points to `/login` and `/register`, while `/auth` does not exist.
   - Requirement R1 mandates that both "Sign In" and "Get Started" navigate to `/auth`, where users first select their role before triggering Google OAuth.
   - Therefore, a unified `/auth` page must be introduced and Navbar buttons updated to link to `/auth`.

2. **Role Selection & OAuth Persistence:**
   - Observations 2.2, 2.3, and 5.2 demonstrate that the pre-OAuth handshake engine (`lib/signup-intent.js` + `POST /api/auth/signup-intent`) and `components/auth/RoleSelector.jsx` are already robustly designed.
   - The selected role is placed in the `sb_signup_intent` cookie and consumed in `lib/auth.js` `databaseHooks.user.create.before`.
   - Therefore, integrating `<RoleSelector />` into `/auth` will preserve the selected role safely across the Google OAuth redirect without breaking DB schemas.

3. **Role Mismatch & Resolution:**
   - Observation 2.4 and `lib/role-collision.js` show that collision detection is supported via `checkRoleCollision()` and `RoleCollisionModal.jsx`.
   - When a returning user signs in with a mismatched role, `RoleCollisionModal` intercepts the flow and routes them to their true registered dashboard.

4. **Profile Setup & Onboarding:**
   - Observation 3 shows that multi-step onboarding forms currently reside at `/student/onboarding`, `/organization/onboarding`, and `/institute/onboarding`, while `/profile/setup` is missing.
   - Requirement R4 requires `/profile/setup` to serve as the unified onboarding entry point, dynamically rendering the appropriate role-specific wizard with progress tracking and 70% threshold gating.
   - Therefore, `/profile/setup/page.jsx` must be created (or wrapper dispatcher implemented) to render the Student, Industry, or Institute setup forms and atomically set `profileCompleted = true` on final submission.

5. **Dashboard Route Integrity:**
   - Observation 4 reveals a critical routing mismatch: `middleware.js` and `app/profile/complete/page.jsx` redirect authenticated students and organization users to `/student/dashboard` and `/organization/dashboard`, but neither file exists on disk (leading to 404 errors).
   - Therefore, `/student/dashboard/page.jsx` and `/industry/dashboard/page.jsx` (aliasing/standardizing `/recruiter/dashboard`) must be added to ensure clean post-login redirection.

6. **Edge Route Protection:**
   - Observation 5 shows that `middleware.js` currently omits `/industry/*`, `/institute/*`, `/profile/*`, and `/auth` from its matcher and role guards.
   - Unauthenticated redirects go to `/login` instead of `/auth`.
   - Therefore, `middleware.js` matcher and role partitioning logic must be updated to include all roles and enforce `/auth` redirection.

---

## 3. Caveats

- **Mock DB vs. Neon PostgreSQL DB:** In development environments without live database credentials, local JSON fallback DB (`data/local_db.json`) is used. Ensure all role and profile creations support both Drizzle ORM and local JSON DB.
- **Admin Accounts:** As observed, Admin accounts cannot self-register through `/auth` or pre-OAuth intent (strictly blocked by `lib/signup-intent.js:28–34`). Admins must be provisioned via `INITIAL_ADMIN_EMAIL` in `.env` or direct DB insertion.
- **Organization vs. Industry Terminology:** In customer-facing routes and UI, `Industry` must be the visible term, while backend schema supports both `INDUSTRY` and `ORGANIZATION` aliases.

---

## 4. Conclusion

The existing Skill Bridge frontend possesses mature UI components (`RoleSelector`, `ProfileCompletionCard`, `ProfileGateModal`, `PendingRatingsWidget`) and deep multi-step onboarding forms. However, the application currently suffers from:
1. Absence of the unified `/auth` page (leading to fragmented `/login` and `/register` flows).
2. Absence of the unified `/profile/setup` route.
3. 404 route errors due to missing `/student/dashboard` and `/industry/dashboard` files.
4. Gaps in `middleware.js` edge protection (missing `/institute/*`, `/industry/*`, `/profile/*`, and redirecting to `/login` instead of `/auth`).
5. Navbar sign-out redirecting to `/login` instead of `/`.

Addressing these five concrete items will complete a production-ready, seamless authentication and onboarding experience.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Navbar link targets:**
   ```bash
   node -e "const f = require('fs').readFileSync('components/shared/Navbar.jsx', 'utf8'); console.log('Login Link:', f.includes('href=\"/login\"')); console.log('Register Link:', f.includes('href=\"/register\"'));"
   ```
2. **Verify missing `/auth` and `/profile/setup` routes:**
   ```bash
   node -e "const fs = require('fs'); console.log('/auth exists:', fs.existsSync('app/auth/page.jsx')); console.log('/profile/setup exists:', fs.existsSync('app/profile/setup/page.jsx'));"
   ```
3. **Verify missing `/student/dashboard` and `/industry/dashboard` routes:**
   ```bash
   node -e "const fs = require('fs'); console.log('/student/dashboard exists:', fs.existsSync('app/student/dashboard/page.jsx')); console.log('/industry/dashboard exists:', fs.existsSync('app/industry/dashboard/page.jsx'));"
   ```
4. **Verify middleware configuration:**
   Inspect `middleware.js` lines 16–26 (`config.matcher`) to confirm omission of `/industry/*`, `/institute/*`, `/profile/*`, and `/auth`.
