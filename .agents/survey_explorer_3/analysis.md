# Frontend Architecture Survey Report (Explorer 3)
**Author:** Survey Explorer 3  
**Scope:** Frontend Navigation, Auth Page, Role Selection, Onboarding Forms & Dashboards  
**Target Project:** Skill Bridge Platform (Next.js 14 App Router, Better Auth, Tailwind CSS)  
**Date:** 2026-08-26  

---

## Executive Summary

This investigation performed a comprehensive, read-only architectural survey of the Skill Bridge frontend system. Specifically, we analyzed the Navbar header navigation, auth page / modal flows, role selection components, onboarding wizards, role dashboard routes, and client-side session management hooks.

### Key Discoveries & Gaps Identified

| Area | Current Implementation State | Required Target State (Original Request) | Gap Severity |
|---|---|---|---|
| **Navbar CTAs** | Desktop & mobile buttons route to `/login` and `/register` (`components/shared/Navbar.jsx:368, 375`). | Update "Sign In" and "Get Started" to route directly to unified `/auth` page. | **High** |
| **Auth Route (`/auth`)** | Does not exist. Only `/login` and `/register` exist in `app/(auth)/`. | Unified `/auth` page with single-select role cards and Google OAuth trigger. | **High** |
| **Role Selector** | `components/auth/RoleSelector.jsx` supports STUDENT, INDUSTRY, INSTITUTE with rich visual cards and radio group semantics. | Reusable inside `/auth` and onboarding flow. | **Ready** |
| **Profile Setup (`/profile/setup`)** | Does not exist. Onboarding is split across `/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`. | Unified multi-step/progress-tracked profile setup at `/profile/setup` for all 3 roles. | **High** |
| **Role Dashboards** | `/recruiter/dashboard`, `/institute/dashboard`, `/admin/dashboard` exist. `/student/dashboard` and `/industry/dashboard` **do not exist** (causing 404 on redirect). | Add `/student/dashboard` and ensure `/industry/dashboard` & `/recruiter/dashboard` consistency. | **Critical** |
| **Edge Middleware** | `middleware.js` lacks matcher and handling for `/industry/*`, `/institute/*`, `/profile/*`, and `/auth`. Redirects unauthenticated users to `/login` instead of `/auth`. | Extend `config.matcher`, add INSTITUTE & INDUSTRY route partitioning, and redirect to `/auth`. | **Critical** |
| **Logout Redirection** | `Navbar.jsx:91` redirects to `/login` on sign-out. | Destroy session and redirect to landing page `/`. | **Medium** |
---

## Deep Dive 1: Navbar Component & Header Actions

### 1. File Inspection: `components/shared/Navbar.jsx`
- **Client Boundary:** Marked with `"use client"` (line 1).
- **Session State Hook:** Imports and consumes `useSession()` and `signOut()` from `@/lib/auth-client.js` (lines 21, 44):
  ```javascript
  const { data: session, isPending } = useSession();
  const isLoggedIn = !!session?.user;
  const user = session?.user || null;
  ```

### 2. Role Resolution Logic (Lines 50–72)
- Inspects `user.role` with priority: `ADMIN` -> `INDUSTRY` (maps `ORGANIZATION` / `INDUSTRY`) -> `INSTITUTE` -> `STUDENT`.
- If user role is unset, uses path-based fallback (`pathname.startsWith('/admin')`, `pathname.startsWith('/recruiter')`, `pathname.startsWith('/institute')`, else `STUDENT`).

### 3. Dynamic Unauthenticated vs. Authenticated Rendering
- **Unauthenticated State (Desktop lines 366–381, Mobile lines 461–475):**
  - Desktop "Sign In" Button: `<Link href="/login" ...>Sign In</Link>`
  - Desktop "Get Started" Button: `<Link href="/register" ...>Get Started</Link>`
  - Center Navigation: Public anchors `#students`, `#industry`, `#institutes` pointing to landing sections.
  - *Observation:* Does not currently link to `/auth`.
- **Authenticated State (Desktop lines 238–363, Mobile lines 440–458):**
  - **Student Completion Badge (Lines 241–250):** If role is STUDENT, renders `<CheckCircle2 /> {studentCompletion}% Complete` linking to `/student/profile`.
  - **Role Badge (Lines 253–255):** Renders `<span className="...">{role}</span>`.
  - **User Avatar Dropdown (Lines 258–353):**
    - Renders user image (`user.image`) or initial letter.
    - Name & email display.
    - Role-specific profile links:
      - `STUDENT`: `/student/profile`
      - `INDUSTRY`: `/organization/onboarding`
      - `INSTITUTE`: `/institute/onboarding`
      - `ADMIN`: `/admin/dashboard`
    - "Home" link: `/home`
    - "Sign Out" action button calling `handleSignOut()`.
  - **Direct Sign Out Button (Lines 356–362):** Quick logout icon button next to user menu.
  - **Sign Out Handler (Lines 79–94):** Calls `signOut()` or `authClient.signOut()`, clears modals, and executes `router.push('/login')` followed by `router.refresh()`. (Target: should redirect to `/`).
  - **Role-Based Nav Links (`getAuthNavLinks` lines 122–159):**
    - `STUDENT`: Home (`/home`), Opportunities (`/student/opportunities`), My Applications (`/student/applications`), Profile (`/student/profile`).
    - `INDUSTRY`: Home (`/home`), Post Opportunity (`/recruiter/jobs/create`), My Opportunities (`/recruiter/dashboard`), Applications (`/recruiter/candidates`), Candidates (`/recruiter/candidates`), Profile (`/organization/onboarding`).
    - `INSTITUTE`: Home (`/home`), Students (`/institute/dashboard`), Skill Insights (`/institute/skill-gaps`), Industry Connections (`/institute/feedback`), Opportunities (`/institute/training`), Profile (`/institute/onboarding`).
    - `ADMIN`: Home (`/home`), Users & Roles (`/admin/users`), KYC Queue (`/admin/verifications`), Reputation Moderation (`/admin/reputation`), Audit Logs (`/admin/audit-logs`).

---

## Deep Dive 2: Auth Pages, Role Selection & Google OAuth Trigger

### 1. Existing Auth Pages & Components
- **`app/(auth)/login/page.jsx`:**
  - Client component consuming `useSearchParams` (`role`, `collision`, `existingRole`, `attemptedRole`).
  - State: `activeRole` (defaults to `STUDENT` or URL param).
  - Uses `<RoleSelector layout="compact" />` for STUDENT, INDUSTRY, INSTITUTE.
  - Contains Admin login toggle switch (`setActiveRole('ADMIN')`).
  - Google Sign-In Trigger (`handleGoogleSignIn` lines 44–73):
    1. Sends `POST /api/auth/signup-intent` with `{ role: activeRole }` (stores cryptographic token in `sb_signup_intent` cookie).
    2. Calls `authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })`.
  - Mounts `<RoleCollisionModal />` if `collision === 'true'`.
- **`app/(auth)/register/page.jsx`:**
  - State: `selectedRole` (defaults to `STUDENT`).
  - Step 1: Choose Your Platform Role (`<RoleSelector layout="grid" />`).
  - Google Sign-Up Trigger (`handleGoogleSignup` lines 45–76):
    1. Sends `POST /api/auth/signup-intent` with `{ role: selectedRole }`.
    2. Calls `authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })`.
  - Notice prohibiting self-registration of Admin accounts.
  - Mounts `<RoleCollisionModal />` on collision query parameters.
- **`components/auth/RoleSelector.jsx`:**
  - Renders 3 role cards:
    - **Student / Learner:** Badge "Candidate", icon `GraduationCap`, emerald accent (`border-emerald-500`, `bg-emerald-500/10`).
    - **Industry / Employer:** Badge "Recruiter", icon `Building2`, teal accent (`border-teal-500`, `bg-teal-500/10`).
    - **Institute / University:** Badge "Academic & TPO", icon `School`, cyan accent (`border-cyan-500`, `bg-cyan-500/10`).
  - Supports `layout="grid"` (3-column card grid) and `layout="compact"` (3-column pill tabs).
  - Implements full WAI-ARIA radio group semantics (`role="radiogroup"`, `role="radio"`, `aria-checked`).
- **`components/RoleCollisionModal.jsx`:**
  - Displays when existing user tries to log in under a different role.
  - Displays: "This Google account is already registered as a [Existing Role]".
  - Actions:
    - "Continue to [Existing Role] Dashboard" (`router.push('/[existingRole]/dashboard')`).
    - "Sign in with a Different Google Account" (clears modal or redirects to `/login`).
- **Missing Unified `/auth` Page:**
  - Neither `app/auth/page.jsx` nor `app/(auth)/auth/page.jsx` exists in the repository.
---

## Deep Dive 3: Profile Setup (`/profile/setup`) & Onboarding Architecture

### 1. Current Onboarding Pages
- **Student Onboarding (`app/student/onboarding/page.jsx` - 983 lines):**
  - 8-Step Wizard: Basic Info, Academic, Skills, Projects, Certifications, Experience, Preferences, Review & Finalize.
  - Progress Gauge: Dynamic SVG circle showing 0–100% score via `calculateStudentCompletion(formData)`.
  - Auto-Draft Saving: Calls `POST /api/student/onboarding` with `action: 'SAVE_DRAFT'` on each step progression.
  - Final Submission: Calls `POST /api/student/onboarding` with `action: 'COMPLETE_ONBOARDING'`, updates `onboardingStatus = 'COMPLETED'`, and redirects to `/student/dashboard`.
- **Organization / Industry Onboarding (`app/organization/onboarding/page.jsx` - 834 lines):**
  - 7-Step Wizard: Company Info, Legal Registration (CIN/GSTIN), Contact & HQ, Industry & Domain, Hiring Focus, KYC Docs, Review & Compliance Declaration.
  - Final Submission: Calls `POST /api/organization/onboarding` with `action: 'COMPLETE_ONBOARDING'`, sets `verificationStatus = 'PENDING'`, updates `onboardingStatus = 'COMPLETED'`, and redirects to `/organization/dashboard`.
- **Industry Route Alias (`app/industry/onboarding/page.jsx` - 26 lines):**
  - Simple client forwarder: `router.replace('/organization/onboarding')`.
- **Institute Onboarding (`app/institute/onboarding/page.jsx` - 895 lines):**
  - 6-Step Wizard: Institute Basics (AISHE), Campus Address, Academic Departments, Placement Cell / TPO Contact, Accreditation Documents (NAAC/NBA), Review & Declaration.
  - Final Submission: Calls `POST /api/institute/onboarding` with `action: 'COMPLETE_ONBOARDING'`, updates `profileCompleted = true`, and redirects to `/institute/dashboard`.

### 2. Onboarding Calculation Engine (`lib/onboarding-calc.js`)
- Exports:
  - `calculateStudentCompletion(profile)`
  - `calculateOrganizationCompletion(profile)`
  - `calculateInstituteCompletion(profile)`
  - `calculateProfileCompletion(userOrRole, profile)`
  - `isProfileComplete(userOrRole, profile, threshold = 70)`
  - Granular breakdown helpers (`getStudentCompletionDetails`, `getOrgCompletionDetails`, `getInstituteCompletionDetails`).
- 70% threshold is universally enforced for opportunity browsing, application submission, and live recruitment gating.

### 3. Dispatcher Page (`app/profile/complete/page.jsx`)
- Post-OAuth callback landing destination.
- Fetches active session from `authClient.getSession()`.
- Probes backend fallback APIs if session object is pending.
- Resolves role and completion status:
  - If `profileCompleted === false` -> Redirects to `/student/onboarding`, `/organization/onboarding`, or `/institute/onboarding`.
  - If `profileCompleted === true` -> Redirects to `/student/dashboard`, `/organization/dashboard`, `/institute/dashboard`, or `/admin/dashboard`.

### 4. Gaps vs Requirement R4:
- Requirement R4 states building dynamic multi-step/progress-tracked profile setup forms at `/profile/setup`. Currently, `app/profile/setup` does not exist.

---

## Deep Dive 4: Role Dashboard Routes & User Context

### 1. Audit of Role Dashboard Routes

| Route | File Location | Exists? | Role / Purpose |
|---|---|---|---|
| `/student/dashboard` | `app/student/dashboard/page.jsx` | ❌ **MISSING** | Target destination for students with completed profiles. Currently causes 404 when redirected from `middleware.js` or `/profile/complete`. |
| `/student/opportunities` | `app/student/opportunities/page.jsx` | ✅ Exists | Student Opportunity marketplace with Dual-Match meters and 100% High-Priority gate. |
| `/student/profile` | `app/student/profile/page.jsx` | ✅ Exists | Student verified profile, skill matrix with 5-level badges, projects, certifications, and Reputation Breakdown. |
| `/industry/dashboard` | `app/industry/dashboard/page.jsx` | ❌ **MISSING** | Intended canonical Industry dashboard. |
| `/organization/dashboard` | `app/organization/dashboard/page.jsx` | ❌ **MISSING** | Referred to in `middleware.js` (lines 103, 118, 155), but file does not exist (404). |
| `/recruiter/dashboard` | `app/recruiter/dashboard/page.jsx` | ✅ Exists | Recruiter console with published jobs, applicants funnel, mandatory vs preferred skill breakdown. |
| `/institute/dashboard` | `app/institute/dashboard/page.jsx` | ✅ Exists | Faculty & Institute Skill Analytics Console with k-anonymity skill gap alerts. |
| `/admin/dashboard` | `app/admin/dashboard/page.jsx` | ✅ Exists | Super admin governance console with KYC queue, RBAC user manager, and audit explorer. |
| `/home` | `app/home/page.jsx` | ✅ Exists | Comprehensive central portal with role tabs for demonstration/simulation. |

### 2. User Context Passing Across Dashboards
- All existing dashboards are Client Components (`"use client"`).
- On mount, they execute `fetch()` calls against Next.js API route handlers (`/api/students`, `/api/opportunities`, `/api/alerts`, `/api/admin/verifications`, etc.).
- Session user context is resolved client-side via `useSession()` from `@/lib/auth-client.js` and server-side via session token cookies (`better-auth.session_token`, `sb_session_token`) and `lib/auth-guard.js`.
---

## Deep Dive 5: Client-Side Auth State Hooks & Edge Protection

### 1. Better Auth React Client SDK (`lib/auth-client.js`)
```javascript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### 2. Pre-OAuth Role Handshake Engine (`lib/signup-intent.js` & `app/api/auth/signup-intent/route.js`)
- **Intent Creation:** `createSignupIntent({ role, email })` generates a 256-bit cryptographically secure token, stored with 15-minute TTL in both Drizzle DB (`schema.signupIntents`) and local JSON DB.
- **Secure Cookie:** `POST /api/auth/signup-intent` sets `sb_signup_intent` as `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 900`.
- **Better Auth Integration (`lib/auth.js:77-153`):** The `databaseHooks.user.create.before` hook reads `sb_signup_intent` cookie or query token, validates it via `resolveValidIntent(token)`, marks it used via `markIntentUsed(token)`, and securely sets `user.role = assignedRole` on account creation.

### 3. Role Collision Detector (`lib/role-collision.js`)
- Evaluates:
  ```javascript
  function checkRoleCollision({ existingUserRole, intentRole }) {
    if (normalizedExisting !== normalizedIntent) {
      return {
        hasCollision: true,
        existingRole: normalizedExisting,
        attemptedRole: normalizedIntent,
        message: 'This Google account is already registered as a ' + roleName + '. One Google account can only map to one role.',
        redirectPath: '/' + normalizedExisting.toLowerCase() + '/dashboard',
      };
    }
  }
  ```
- Generates query redirect `?collision=true&existingRole=...&attemptedRole=...`.

### 4. Edge Middleware Protection (`middleware.js`) - Critical Gap Analysis
- **Current Matcher Config (Lines 16–26):**
  ```javascript
  export const config = {
    matcher: [
      '/student/:path*',
      '/organization/:path*',
      '/recruiter/:path*',
      '/admin/:path*',
      '/account-suspended',
      '/login',
      '/register',
    ],
  };
  ```
- **Middleware Issues & Gaps:**
  1. `/industry/:path*`, `/institute/:path*`, `/profile/:path*`, and `/auth` are **missing from matcher**.
  2. Role partitioning (lines 150–192) only checks `ADMIN`, `STUDENT`, `ORGANIZATION`. `INSTITUTE` and `INDUSTRY` are omitted.
  3. Unauthenticated redirect (line 135) redirects to `/login` instead of `/auth`.
  4. Redirections for organization users point to `/organization/dashboard` (which is 404) rather than existing `/recruiter/dashboard` or new `/industry/dashboard`.
  5. Onboarding redirection checks `/student/onboarding` and `/organization/onboarding` instead of unified `/profile/setup`.

---

## Synthesis of Recommended Implementation Changes

1. **Create `app/auth/page.jsx`:**
   - Unify login and registration with selectable `RoleSelector` cards (`STUDENT`, `INDUSTRY`, `INSTITUTE`).
   - Single-selection state, Google OAuth trigger with pre-OAuth signup intent handshake.
   - Built-in `RoleCollisionModal` support.
2. **Create `app/profile/setup/page.jsx`:**
   - Dynamic multi-step profile setup wizard adapting dynamically to the authenticated user's role (`STUDENT`, `INDUSTRY`, `INSTITUTE`).
   - Progress bar with 70% gate threshold calculation.
   - Server-side + client-side validation saving `profileCompleted = true` atomically.
3. **Create `app/student/dashboard/page.jsx` and `app/industry/dashboard/page.jsx`:**
   - Implement dedicated student dashboard page (or alias) so redirects do not 404.
   - Standardize `/industry/dashboard` to render or alias `/recruiter/dashboard`.
4. **Update `components/shared/Navbar.jsx`:**
   - Change "Sign In" and "Get Started" buttons to route to `/auth`.
   - Update sign out handler to redirect to `/`.
   - Ensure role navigation links cleanly target role dashboards and profiles.
5. **Update `middleware.js`:**
   - Add `/industry/:path*`, `/institute/:path*`, `/profile/:path*`, `/auth` to matcher.
   - Support `INSTITUTE` and `INDUSTRY` in role partitioning.
   - Redirect unauthenticated users to `/auth`.
   - Redirect incomplete profiles (`profileCompleted === false`) to `/profile/setup`.
