# Comprehensive Code Survey & Architecture Analysis: Authentication, Session, Middleware & Better Auth Flow

**Survey Agent**: Survey Explorer 1 (Replacement Agent)  
**Date**: 2026-08-26  
**Project**: Skill Bridge Platform (`e:\sih_2026_044`)  
**Target Focus**: Better Auth Integration, Session Management, Pre-OAuth Role Handshake, Middleware Guards, and Logout Flow.

---

## 1. Executive Summary

The Skill Bridge platform implements a zero-trust, role-governed authentication and onboarding architecture built on top of **Better Auth (`v1.7.1`)**, **Drizzle ORM (`v1.0.0-rc.4`)**, and **Next.js App Router (`14.2.5`)**. 

The authentication model enforces the strict invariant:
$$\text{One Google Account} \equiv \text{One Skill Bridge Account} \equiv \text{One Immutable Role}$$

Key architectural mechanisms already in place include:
1. **Pre-OAuth Cryptographic Signup Intent (`lib/signup-intent.js`)**: Captures selected role before initiating Google OAuth, issues a 256-bit entropy token with 15-minute TTL, sets an `httpOnly` cookie (`sb_signup_intent`), and binds the validated role atomically during the `user.create.before` lifecycle hook.
2. **Server-Authoritative User Model (`lib/auth.js`)**: Core fields (`role`, `accountStatus`, `onboardingStatus`, `profileCompleted`) are configured with `input: false`, blocking client payload injection or tampering.
3. **Automated 1:1 Profile Provisioning (`lib/auth.js` `user.create.after`)**: Provisions corresponding entity records (`studentProfiles`, `organizationProfiles`, `instituteProfiles`, `adminProfiles`) upon user creation.
4. **Server API Guard (`lib/auth-guard.js`)**: Higher-order wrapper `withAuth` validating session tokens, roles, account suspension/deactivation, onboarding completeness, and tenant resource ownership (IDOR defense).
5. **Dynamic Profile Completion Calculators (`lib/onboarding-calc.js`)**: Real-time weighted scoring for Students (8 steps), Organizations (7 steps), and Institutes (6 steps).
6. **Edge Route Protection Middleware (`middleware.js`)**: URL route partitioning, session detection, account suspension diversion, and onboarding routing.

---

## 2. Better Auth Setup & Server Configuration

### 2.1 Server Core Configuration (`lib/auth.js`)

- **File Location**: `e:\sih_2026_044\lib\auth.js`
- **Adapter**: `drizzleAdapter(db, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } })` (Lines 15–23)
- **Base URL & Secret**:
  - `secret`: `process.env.BETTER_AUTH_SECRET || "development_better_auth_secret_key_32_chars_min_length_required"` (Line 24)
  - `baseURL`: `process.env.BETTER_AUTH_URL || "http://localhost:3000"` (Line 25)
- **OAuth Providers**:
  - Google Social Provider (`clientId`: `process.env.GOOGLE_CLIENT_ID`, `clientSecret`: `process.env.GOOGLE_CLIENT_SECRET`) (Lines 28–33)
- **User Additional Fields** (Lines 36–62):
  - `role`: Type string, default `"STUDENT"`, required: true, `input: false`
  - `accountStatus`: Type string, default `"PENDING"`, required: true, `input: false`
  - `onboardingStatus`: Type string, default `"NOT_STARTED"`, required: true, `input: false`
  - `profileCompleted`: Type boolean, default `false`, `input: false`
- **Session Settings** (Lines 65–72):
  - `expiresIn`: $60 \times 60 \times 24 \times 7$ (7 days / 604,800 seconds)
  - `updateAge`: $60 \times 60 \times 24$ (1 day / 86,400 seconds)
  - `cookieCache`: `{ enabled: true, maxAge: 300 }` (5 minutes)

### 2.2 Database Lifecycle Hooks (`lib/auth.js`)

1. **`user.create.before` (Lines 77–153)**:
   - **Initial Admin Auto-Provisioning**: Checks if `user.email` equals `process.env.INITIAL_ADMIN_EMAIL`. If matched, assigns `role: "ADMIN"`, `accountStatus: "ACTIVE"`, `onboardingStatus: "COMPLETED"`, `profileCompleted: true`.
   - **Intent Token Extraction**: Inspects `request.url` query params (`state` / `intent`) and the request cookie header for `sb_signup_intent`.
   - **Intent Validation & Consumption**: Calls `resolveValidIntent(intentToken)`. Verifies role against `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`. Calls `markIntentUsed(intentToken)`.
   - **Account Status Assignment**: Defaults `STUDENT` to `"ACTIVE"` and `INDUSTRY`/`INSTITUTE`/`ORGANIZATION` to `"PENDING"`.
   - Returns sanitized user object with `onboardingStatus: "NOT_STARTED"` and `profileCompleted: false`.

2. **`user.create.after` (Lines 155–303)**:
   - Evaluates assigned `user.role`.
   - Creates corresponding 1:1 profile in `student_profile`, `institute`, `organization_profile`, or `admin_profile` in Drizzle PostgreSQL DB and synchronizes to `localDb`.
   - Records audit logs: `ACCOUNT_CREATED` and `ROLE_ASSIGNED` via `logAuditEvent()`.

3. **`user.update.before` (Lines 306–317)**:
   - Deletes `role`, `accountStatus`, and `id` from update requests to enforce strict role immutability.

### 2.3 Client SDK Configuration (`lib/auth-client.js`)

- **File Location**: `e:\sih_2026_044\lib\auth-client.js`
- **SDK**: `createAuthClient` from `better-auth/react`
- **Exports**: `authClient`, `signIn`, `signUp`, `signOut`, `useSession`, `getSession` (Lines 12–18).

### 2.4 API Catch-All Route (`app/api/auth/[...all]/route.js`)

- **File Location**: `e:\sih_2026_044\app\api\auth\[...all]\route.js`
- **Handler**: `toNextJsHandler(auth)` exporting `GET` and `POST`.

---

## 3. Session Handling, Cookies & Token Resolution

### 3.1 Cookie & Token Architecture

| Cookie / Token Name | Origin | Lifetime | Purpose | Security Flags |
|---|---|---|---|---|
| `better-auth.session_token` / `__Secure-better-auth.session_token` | Better Auth Server | 7 days | Primary authenticated session token matching DB `session.token` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (prod) |
| `sb_session_token` | Skill Bridge fallback | 7 days | Fallback session token identifier | `HttpOnly`, `SameSite=Lax`, `Path=/` |
| `sb_signup_intent` | `POST /api/auth/signup-intent` | 15 min (900s) | Cryptographic signup intent token passed into OAuth callback | `HttpOnly`, `SameSite=Lax`, `Path=/` |

### 3.2 Server-Side Session Resolution Hierarchy (`lib/auth-guard.js`)

When an API route is invoked, `resolveApiSession(req)` resolves session context via a 3-tier cascade:
1. **Tier 1 (Non-Production Test Headers)**: Checks `x-user-id`, `x-user-role`, `x-account-status`, `x-onboarding-status`.
2. **Tier 2 (Better Auth Server Engine)**: Calls `auth.api.getSession({ headers: req.headers })`.
3. **Tier 3 (Direct Session Cookie & DB Lookup)**: Parses `better-auth.session_token` / `sb_session_token` from cookie header and queries `sessions` table in local JSON / PostgreSQL DB.

### 3.3 Client-Side Session State (`Navbar.jsx`, `useSession`)

- The React hook `useSession()` from `@/lib/auth-client` provides reactive session status (`isPending`, `data: { session, user }`).
- Components inspect `session?.user` properties:
  - `user.id` (UUID / text)
  - `user.email` (string)
  - `user.name` (string)
  - `user.image` (Google avatar URL)
  - `user.role` (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN`)
  - `user.accountStatus` (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`)
  - `user.onboardingStatus` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
  - `user.profileCompleted` (boolean)

---

## 4. Pre-OAuth Role Persistence & Collision Engine

### 4.1 Role Handshake Flow Diagram

```
[ User on UI (/login, /register, /auth) ]
                │
                ▼ (1) Select Role: STUDENT | INDUSTRY | INSTITUTE
    [ RoleSelector Component ]
                │
                ▼ (2) POST /api/auth/signup-intent { role: 'INDUSTRY' }
  [ API: /api/auth/signup-intent/route.js ]
                │
                ├── Validates role (blocks 'ADMIN')
                ├── Creates 32-byte crypto token in DB table `signup_intents` (15m TTL)
                └── Sets Set-Cookie: sb_signup_intent=<token>; HttpOnly; SameSite=Lax; Max-Age=900
                │
                ▼ (3) authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })
      [ Google OAuth Consent Screen ]
                │
                ▼ (4) Redirects back to Better Auth callback (/api/auth/callback/google)
  [ Better Auth: user.create.before hook ]
                │
                ├── Reads `sb_signup_intent` cookie
                ├── resolveValidIntent(token) -> extracts verified role 'INDUSTRY'
                ├── markIntentUsed(token) -> invalidates token (single-use)
                └── Assigns role='INDUSTRY', accountStatus='PENDING', profileCompleted=false
                │
                ▼ (5) Better Auth: user.create.after hook
                └── Provisions 1:1 organizationProfile, writes audit logs
                │
                ▼ (6) Client lands on /profile/complete (or /profile/setup)
                └── Dispatches user to /organization/onboarding or /organization/dashboard
```

### 4.2 Role Collision Guard (`lib/role-collision.js`)

- **File Location**: `e:\sih_2026_044\lib\role-collision.js`
- **Function**: `checkRoleCollision({ existingUserRole, intentRole })`
- **Behavior**: If an existing account registered as `STUDENT` attempts login/signup selecting `INDUSTRY`, returns:
  ```json
  {
    "hasCollision": true,
    "existingRole": "STUDENT",
    "attemptedRole": "INDUSTRY",
    "message": "This Google account is already registered as a Student. One Google account can only map to one role.",
    "redirectPath": "/student/dashboard"
  }
  ```
- **UI Modal**: `components/RoleCollisionModal.jsx` renders collision alert, displaying both existing and attempted roles, providing a direct CTA to navigate to the authorized dashboard.

---

## 5. Route Protection & Middleware Analysis

### 5.1 Current Middleware (`middleware.js`)

- **File Location**: `e:\sih_2026_044\middleware.js`
- **Current Matcher**:
  ```javascript
  matcher: [
    '/student/:path*',
    '/organization/:path*',
    '/recruiter/:path*',
    '/admin/:path*',
    '/account-suspended',
    '/login',
    '/register',
  ]
  ```
- **Security Check Logic**:
  1. **Public Auth Routes (`/login`, `/register`)**: If user is already authenticated, redirects directly to role dashboard (if onboarded) or onboarding route (if onboarding incomplete). Suspended users are redirected to `/account-suspended`.
  2. **Suspended Route (`/account-suspended`)**: Ensures unauthenticated users redirect to `/login`; active users redirect to their respective dashboard.
  3. **Unauthenticated Guard**: Unauthenticated requests to protected paths redirect to `/login?role=<targetRole>&redirect=<path>`.
  4. **Account Status Enforcement**: `SUSPENDED` / `DEACTIVATED` accounts immediately redirect to `/account-suspended`.
  5. **Role Partitioning & Onboarding**:
     - `/admin/*` -> Requires `role === 'ADMIN'`, else redirects to user's dashboard.
     - `/student/*` -> Requires `role === 'STUDENT'`. Incomplete onboarding (`onboardingStatus !== 'COMPLETED'`) forces redirect to `/student/onboarding`.
     - `/organization/*` & `/recruiter/*` -> Requires `role === 'ORGANIZATION'` (or `INDUSTRY`). Incomplete onboarding forces redirect to `/organization/onboarding`.

### 5.2 Gaps Identified in Route Protection

1. **Missing Paths in `matcher`**:
   - `/industry/:path*` (Currently present in app router as an alias redirect to `/organization/onboarding`).
   - `/institute/:path*` (Currently contains `/institute/dashboard`, `/institute/feedback`, `/institute/onboarding`, `/institute/skill-gaps`, `/institute/training`).
   - `/profile/:path*` (Contains `/profile/complete` and upcoming `/profile/setup`).
   - `/auth` (New unified auth entry page specified in R1).
2. **Institute Route Partitioning in Middleware**:
   - `middleware.js` currently implements checks for `student`, `organization`, `recruiter`, and `admin`, but lacks an explicit `institute` partitioning block.
3. **`profileCompleted` vs `onboardingStatus`**:
   - Middleware currently checks `user.onboardingStatus !== 'COMPLETED'`. The new requirements (R3 & R5) specify checking `profileCompleted === true` / `profileCompleted === false` and routing to `/profile/setup`.

---

## 6. Profile Setup & Onboarding Progress Form Analysis

### 6.1 Existing Onboarding Endpoints & Schema

| Entity | DB Table | API Route | Front-End Form Page | Dynamic Completion Formula |
|---|---|---|---|---|
| **Student** | `student_profile` (`db/schema.js:225`) | `/api/student/profile` & `/api/student/onboarding` | `app/student/onboarding/page.jsx` | `calculateStudentCompletion()` (8 categories: Headline, Academic, Skills, Projects, Certs, Experience, Preferences, Review) |
| **Industry / Org** | `organization_profile` (`db/schema.js:261`) | `/api/organization/onboarding` & `/api/organization/profile` | `app/organization/onboarding/page.jsx` & `app/industry/onboarding/page.jsx` | `calculateOrganizationCompletion()` (7 categories: Company Info, Registration, Contact/HQ, Industry, Hiring, Docs, Declaration) |
| **Institute** | `institute` (`db/schema.js:298`) | `/api/institute/onboarding` | `app/institute/onboarding/page.jsx` | `calculateInstituteCompletion()` (6 categories: Basics, Campus/Location, Departments, Placement Cell, Accreditation, Declaration) |

### 6.2 Target Role-Specific Setup Requirements (R4)

- **Student**: Basic info, education (college, degree, CGPA, graduation year), skills, resume/portfolio URLs, career preferences.
- **Industry**: Organization details, company size, website, recruiter contact info, hiring preferences.
- **Institute**: Institute details, code, type, academic departments, placement officer contact info.
- **Atomic Completion**: Submission atomically sets `profileCompleted = true` and updates `onboardingStatus = 'COMPLETED'`.

---

## 7. Logout Flow & Navbar Dynamic State

### 7.1 Logout Sequence

1. **Trigger**: User clicks "Sign Out" in Navbar desktop avatar dropdown or direct sign-out icon, or in mobile drawer (`components/shared/Navbar.jsx:79–94`).
2. **Client Action**: Invokes `signOut()` from `@/lib/auth-client`.
3. **Network Call**: Better Auth sends `POST /api/auth/sign-out`, invalidating the database session in PostgreSQL/local DB and issuing response cookies with `Max-Age=0` to clear `better-auth.session_token`.
4. **Navigation**: `router.push('/')` (or `/login`), followed by `router.refresh()`.
5. **State Invalidation**: `useSession()` hook re-renders Navbar to public unauthenticated state (`Sign In`, `Get Started` CTAs).

### 7.2 Navbar Dynamic State (`components/shared/Navbar.jsx`)

- **Authenticated State**:
  - Displays dynamic profile completion badge for students (`X% Complete`).
  - Displays user avatar (or initial letter capsule) and role badge (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN`).
  - Role-specific desktop and mobile nav links:
    - *Student*: Home, Opportunities, My Applications, Profile.
    - *Industry*: Home, Post Opportunity, My Opportunities, Applications, Candidates, Profile.
    - *Institute*: Home, Students, Skill Insights, Industry Connections, Opportunities, Profile.
    - *Admin*: Home, Users & Roles, KYC Queue, Reputation Moderation, Audit Logs.
- **Unauthenticated State**:
  - Displays public links (`#students`, `#industry`, `#institutes`).
  - Displays "Sign In" and "Get Started" CTAs.
  - Per R1, "Sign In" and "Get Started" should navigate to `/auth` with role selection rather than direct OAuth.

---

## 8. Summary of Findings & Implementation Recommendations

| Area | Current Code State | Requirement Mapping | Implementation Guidance |
|---|---|---|---|
| **Auth Entry Page** | `/login` and `/register` exist with `RoleSelector.jsx`. | R1: Unified `/auth` page with role selection cards for Student, Industry, Institute. | Create `app/auth/page.jsx` or update navigation links to point to `/auth`, embedding `RoleSelector` and single-select "Continue with Google" CTA. |
| **Pre-OAuth Role Persistence** | Handshake implemented via `POST /api/auth/signup-intent`, `sb_signup_intent` cookie, and `user.create.before` Better Auth hook. | R2: Secure role persistence across Google OAuth redirects. | Fully verified and working. Support both cookie and query state parameter fallback. |
| **Role Collision & Callback Dispatch** | `lib/role-collision.js` & `app/profile/complete/page.jsx` detect collision and dispatch users. | R3: Mismatch protection & routing based on `profileCompleted`. | Integrate `/profile/setup` routing for users with `profileCompleted === false` and direct dashboard routing for completed profiles. |
| **Profile Setup UI** | Role-specific multi-step onboarding forms exist at `/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`. | R4: Role-specific profile setup forms with progress tracking at `/profile/setup`. | Support unified `/profile/setup` router that renders or delegates to the role-specific setup component and sets `profileCompleted = true` atomically. |
| **Edge Route Protection** | `middleware.js` covers `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`. | R5: Protect `/student/*`, `/industry/*`, `/institute/*`, and `/profile/*`. | Update `matcher` and add explicit partitioning rules for `/industry/*`, `/institute/*`, `/profile/*`, and `/auth`. |
| **Logout & Navbar** | `Navbar.jsx` integrates `useSession` and `signOut`. | R5: Dynamic Navbar states and session destruction to `/`. | Ensure logout redirects to `/` and unauthenticated CTAs route to `/auth`. |

---
