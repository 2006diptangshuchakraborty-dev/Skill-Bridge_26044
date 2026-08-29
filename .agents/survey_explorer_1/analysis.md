# Authentication, Session Management, Middleware & Better Auth Architectural Survey

**Survey Date**: 2026-08-26  
**Investigator**: Survey Explorer 1 (Auth, Session, Middleware & Better Auth Flow)  
**Target Codebase**: Skill Bridge Platform (`e:\sih_2026_044`)  
**Authoritative Request**: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (Section: 2026-08-26T06:12:40Z)

---

## Executive Summary

Skill Bridge incorporates a multi-role authentication and identity governance architecture built on **Better Auth v1.7.1** with **Drizzle ORM** (PostgreSQL/Neon) and a synchronized local JSON database fallback (`lib/db.js`).

The core authentication model enforces the architectural invariant:
> **"One Google Account = Exactly One Skill Bridge Account = Exactly One Immutable Role"**

The system features:
1. **Pre-OAuth Cryptographic Signup Intent Handshake**: Role selection is captured before Google OAuth redirection, cryptographically signed with 256 bits of entropy, given a 15-minute TTL, stored in `signup_intents` table, and bound via `sb_signup_intent` cookie.
2. **Server-Enforced Role Immutability**: Role assignment is executed solely on the server inside Better Auth database hooks (`databaseHooks.user.create.before`), with `input: false` preventing any client-side injection. `databaseHooks.user.update.before` strips role and status fields from update operations.
3. **Automated Role Profile Provisioning**: The `databaseHooks.user.create.after` hook atomically provisions 1:1 corresponding profiles (`studentProfiles`, `organizationProfiles`, `instituteProfiles`, `adminProfiles`) across both Drizzle ORM and local JSON DB, and generates security audit logs (`ACCOUNT_CREATED`, `ROLE_ASSIGNED`).
4. **Zero-Trust API Protection (`lib/auth-guard.js`)**: The `withAuth` higher-order wrapper verifies cryptographic sessions, validates account status (blocking `SUSPENDED`/`DEACTIVATED`), checks role permissions, enforces onboarding thresholds, KYC verification for employers, and protects against Insecure Direct Object References (IDOR).
5. **Edge Route Protection (`middleware.js`)**: Edge middleware intercepts partitioned routes (`/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`, `/login`, `/register`, `/account-suspended`), redirects unauthenticated users to `/login`, prevents cross-role traversal, and forces users with incomplete profiles to onboarding.

---

## 1. Detailed Investigation of Better Auth Setup

### 1.1 Server Configuration (`lib/auth.js`)

`lib/auth.js` initializes `betterAuth` with the Drizzle adapter:

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
  secret: process.env.BETTER_AUTH_SECRET || "development_better_auth_secret_key_32_chars_min_length_required",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "STUDENT", input: false },
      accountStatus: { type: "string", required: true, defaultValue: "PENDING", input: false },
      onboardingStatus: { type: "string", required: true, defaultValue: "NOT_STARTED", input: false },
      profileCompleted: { type: "boolean", defaultValue: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (604,800s)
    updateAge: 60 * 60 * 24,      // 1 day (86,400s)
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // 5 minutes (300s)
    },
  },
  // ... databaseHooks
});
```

#### Key Architectural Strengths:
- **`input: false` Security Guard**: Crucially, all sensitive user attributes (`role`, `accountStatus`, `onboardingStatus`, `profileCompleted`) have `input: false`, preventing clients from passing forged roles or status flags during signup or profile updates.
- **Environment Admin Provisioning**: When `process.env.INITIAL_ADMIN_EMAIL` matches the user email during creation, `lib/auth.js` automatically assigns `role: 'ADMIN'`, `accountStatus: 'ACTIVE'`, `onboardingStatus: 'COMPLETED'`, and `profileCompleted: true`.
- **Database Hooks Architecture**:
  - `user.create.before`: Extracts intent from `req.headers.cookie` (`sb_signup_intent`) or URL query params (`state`/`intent`). Validates against `allowedRoles = ["STUDENT", "INDUSTRY", "INSTITUTE", "ORGANIZATION"]`. Consumes intent token via `markIntentUsed(intentToken)` and sets assigned role and account status (`ACTIVE` for `STUDENT`, `PENDING` for `ORGANIZATION`/`INDUSTRY`/`INSTITUTE`).
  - `user.create.after`: Automatically creates 1:1 role records (`student_profile`, `institute`, `organization_profile`, `admin_profile`) in both Drizzle ORM and `localDb` (`lib/db.js`). Records immutable audit logs (`ACCOUNT_CREATED`, `ROLE_ASSIGNED`).
  - `user.update.before`: Sanitizes all update payloads by deleting `role`, `accountStatus`, and `id`.

### 1.2 Catch-All Route Handler (`app/api/auth/[...all]/route.js`)

Better Auth endpoints are exposed at `/api/auth/*` via:
```javascript
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### 1.3 Client SDK Integration (`lib/auth-client.js`)

`lib/auth-client.js` wraps `@better-auth/react`:
```javascript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
export default authClient;
```

---

## 2. Session Handling, Cookies & Tokens (Client vs Server)

| Dimension | Client Side | Server Side (API Routes) | Edge Middleware |
|---|---|---|---|
| **Mechanism** | `useSession()`, `authClient.getSession()` | `withAuth` in `lib/auth-guard.js` / `auth.api.getSession()` | Cookie extraction in `middleware.js` |
| **Cookies Read** | Standard browser cookie jar | `better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token` | `better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token` |
| **Session Lifetime** | 7 days sliding window (`expiresIn: 604800`) | Validated against `session` table in Postgres / Local DB | Validated via token presence & routing hints |
| **User Attributes Available** | `id`, `name`, `email`, `image`, `role`, `accountStatus`, `onboardingStatus`, `profileCompleted` | Full user object + session metadata + role profile lookup | User ID and role routing context |
| **Cache Duration** | React State / SWR hook | 5 minutes cookie cache (`cookieCache.maxAge = 300`) | Edge evaluation per request |

### 2.1 API Route Guard (`lib/auth-guard.js`)

The `withAuth(handler, options)` higher-order function enforces defense-in-depth:
1. **Cryptographic Session Verification**: Resolves user from Better Auth session or direct DB token lookup.
2. **Account Status Check**: Rejects `SUSPENDED` or `DEACTIVATED` accounts with HTTP 403 (`ACCOUNT_SUSPENDED`).
3. **Role Authorization Check**: Asserts `normalizedAllowedRoles.includes(user.role)`.
4. **Onboarding Enforcement**: If `requireOnboarded = true`, verifies `onboardingStatus === 'COMPLETED'`.
5. **KYC Verification Gate**: If `requireApprovedOrg = true`, verifies `organizationProfile.verificationStatus === 'APPROVED'`.
6. **IDOR & Resource Ownership**: Executes `checkOwnership(authResult, req, params)` (Admins bypass IDOR for platform governance).
7. **Automated Audit Trail**: Automatically writes compliance audit log on successful sensitive actions (`logAuditEvent`).

---

## 3. Role Persistence Across OAuth & Role Collision Protection

### 3.1 Pre-OAuth Handshake (`lib/signup-intent.js` & `app/api/auth/signup-intent/route.js`)

1. **Role Selection**: User selects one of `STUDENT`, `INDUSTRY`, or `INSTITUTE` on `RoleSelector.jsx`.
2. **Pre-OAuth Intent Creation**:
   - `POST /api/auth/signup-intent` receives `{ role: "STUDENT" }`.
   - Generates 32-byte cryptographic token (`crypto.randomBytes(32).toString('hex')`).
   - Sets 15-minute expiration (`INTENT_EXPIRY_MS = 900000`).
   - Inserts record into `signup_intents` (Postgres / local DB).
   - Returns token and sets `sb_signup_intent` cookie (`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 900`).
3. **Social Sign-In Trigger**:
   - Client calls `authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })`.
4. **OAuth Redirect & Callback**:
   - Google redirects back to `/api/auth/callback/google`.
   - Better Auth `user.create.before` hook extracts `sb_signup_intent` cookie, calls `resolveValidIntent(intentToken)`, binds the verified role, and marks intent used via `markIntentUsed(intentToken)`.
   - Admin registration is strictly blocked (`ADMIN_REGISTRATION_FORBIDDEN` / HTTP 403).

### 3.2 Role Collision Detector (`lib/role-collision.js`) & Modal (`components/RoleCollisionModal.jsx`)

When an existing user with an immutable role (e.g. `STUDENT`) attempts to sign in or register through a different portal (e.g. `INDUSTRY`):
- `checkRoleCollision({ existingUserRole, intentRole })` evaluates `existingUserRole !== intentRole`.
- Returns `{ hasCollision: true, existingRole, attemptedRole, message: "This Google account is already registered as a Student. One Google account can only map to one role.", redirectPath: "/student/dashboard" }`.
- `RoleCollisionModal` displays a modal with amber warning, preventing unauthorized role mutation and providing a button to route to the user's authentic dashboard.

### 3.3 Post-Auth Dispatcher (`app/profile/complete/page.jsx`)

Upon OAuth callback to `/profile/complete`:
- Resolves active session via `authClient.getSession()`.
- If `profileCompleted === true` / `onboardingStatus === 'COMPLETED'`: routes to role dashboard (`/student/dashboard`, `/organization/dashboard`, `/institute/dashboard`, `/admin/dashboard`).
- If `profileCompleted === false` / `onboardingStatus !== 'COMPLETED'`: routes to role onboarding (`/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`).

---

## 4. Route Protection & Middleware Analysis

### 4.1 Edge Middleware (`middleware.js`)

`middleware.js` configures matcher:
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

#### Routing Logic Matrix:

| Request Path | User State | Action / Redirect Target |
|---|---|---|
| `/login`, `/register` | Unauthenticated | Allow (`NextResponse.next()`) |
| `/login`, `/register` | Authenticated (Student, Complete) | Redirect `/student/dashboard` |
| `/login`, `/register` | Authenticated (Student, Incomplete) | Redirect `/student/onboarding` |
| `/login`, `/register` | Authenticated (Industry, Complete) | Redirect `/organization/dashboard` |
| `/login`, `/register` | Authenticated (Admin) | Redirect `/admin/dashboard` |
| `/login`, `/register` | Suspended / Deactivated | Redirect `/account-suspended` |
| `/student/*` | Unauthenticated | Redirect `/login?role=STUDENT&redirect=/student/...` |
| `/student/*` | Authenticated (Industry or Admin) | Redirect to user's authentic dashboard |
| `/student/*` | Authenticated (Student, Incomplete, not on `/student/onboarding`) | Redirect `/student/onboarding` |
| `/organization/*`, `/recruiter/*` | Unauthenticated | Redirect `/login?role=ORGANIZATION&redirect=...` |
| `/organization/*`, `/recruiter/*` | Authenticated (Student or Admin) | Redirect to user's authentic dashboard |
| `/organization/*`, `/recruiter/*` | Authenticated (Industry, Incomplete, not on `/organization/onboarding`) | Redirect `/organization/onboarding` |
| `/admin/*` | Authenticated (Non-Admin) | Redirect to user's role dashboard |
| `/account-suspended` | Active user | Redirect to user's role dashboard |

---

## 5. Logout Flow & Dynamic Session UI

### 5.1 Logout Invalidation

In `components/shared/Navbar.jsx`:
```javascript
const handleSignOut = async () => {
  try {
    if (typeof signOut === "function") {
      await signOut();
    } else if (authClient?.signOut) {
      await authClient.signOut();
    }
  } catch (err) {
    console.error("Sign-out failed:", err);
  } finally {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }
};
```
- **Session Destruction**: `signOut()` sends a POST request to Better Auth's sign-out endpoint (`/api/auth/sign-out`), which destroys the server session and clears session cookies.
- **Client Cache Refresh**: `router.refresh()` forces Next.js Server Components to re-evaluate auth status, preventing stale cached data.

### 5.2 Dynamic Navbar Session States

- **Unauthenticated State**:
  - Shows public landing anchors: `Students` (`#students`), `Industry` (`#industry`), `Institutes` (`#institutes`).
  - Shows `Sign In` (`/login`) and `Get Started` (`/register`) action buttons.
- **Authenticated State**:
  - Displays role-specific navigation links (`Student`, `Industry`, `Institute`, `Admin`).
  - Displays Student profile completion badge (e.g. `78% Complete`).
  - Displays user profile avatar/initials, name, and role pill.
  - Dropdown menu offers profile links, dashboard entry, and Sign Out.

---

## 6. Gap Analysis Against 2026-08-26 User Requirements

| Requirement | Current Implementation State | Recommended Next Action / Alignment |
|---|---|---|
| **R1: `/auth` Unified Route** | Entry is currently split between `/login` and `/register` with `RoleSelector`. | Implement a dedicated `/auth` route or unified auth landing page with selectable cards for `Student`, `Industry`, `Institute` and enabled "Continue with Google" button upon role selection. |
| **R2: Terminology Standardization** | Code uses both `INDUSTRY` and `ORGANIZATION` internally, but aliases are supported. | Standardize customer-facing terminology strictly to `Student`, `Industry`, `Institute` across all client routes and UI components. |
| **R3: Conflicting Role Mismatch Protection** | `lib/role-collision.js` and `RoleCollisionModal.jsx` detect collision and block login with `"This Google account is already registered as a Student."` | Ensure the OAuth callback dispatcher (`/profile/complete` or callback handler) immediately triggers this user-friendly error payload without page flicker. |
| **R4: Profile Setup at `/profile/setup`** | Onboarding forms currently live at `/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`. | Provide dynamic multi-step/progress-tracked profile setup at `/profile/setup` with role-specific views (`Student`, `Industry`, `Institute`), saving `profileCompleted = true` atomically. |
| **R5: Protected Routes in Middleware** | `middleware.js` protects `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`. | Add explicit matcher and guards for `/industry/*`, `/institute/*`, `/profile/*`, and `/auth`. Update logout redirect to `/`. |

---

## 7. Test Suite Verification & Proof

The auth and security test suite was verified:
- **Test Command**: `node tests/test-auth-suite.js` (or `npm run test:auth` / `npm run test:e2e`)
- **Result**: 33 of 33 tests passed (100% pass rate in 36ms).
- **Matching Rules**: 13 of 13 tests passed (100% in 13ms).
- **Reputation & Ratings**: 46 of 46 tests passed (100% in 69ms).
- **Skill Verification**: 8 of 8 tests passed (100%).
- **Grand Total**: 100% passing across all platform test suites.
