# Forensic Investigation & Architecture Analysis: Authenticated Sessions, Role-Based Redirects, Route Protection & Session Caching

**Target**: Skill Bridge Platform (SIH 2026)  
**Investigator**: survey_profile_routes_explorer  
**Date**: 2026-08-29  
**Scope**: `middleware.js`, `app/**`, `lib/auth.js`, `lib/auth-client.js`, `lib/auth-guard.js`, `lib/signup-intent.js`, `lib/role-collision.js`, `components/**`  

---

## Executive Summary

This investigation analyzed the authentication lifecycle, Edge route protection middleware, session caching, role redirection mechanisms, and logout state invalidation in the Skill Bridge platform.

### Core Findings:
1. **The "Already logged in as student" Bug**:
   - Triggered by a tripartite clash: (a) active Better Auth session cookie (`better-auth.session_token`), (b) Edge middleware interception on `/auth` and `/login` forcing instant redirects to `/student/dashboard`, and (c) the collision detector in `app/profile/complete/page.jsx` and `lib/role-collision.js` intercepting OAuth callbacks when a pre-OAuth signup intent cookie (`sb_signup_intent`) with role `INDUSTRY`/`INSTITUTE` conflicts with an existing PostgreSQL user record with `role = 'STUDENT'`.
2. **Middleware Blind Role Defaulting**:
   - `middleware.js` reads `sb_user_role` from companion cookies. When Better Auth creates sessions, it only issues `better-auth.session_token` by default. If `sb_user_role` is missing, `middleware.js:133` defaults the user's role to `'STUDENT'`. Consequently, **legitimate Industry and Institute users get redirected to `/student/dashboard`**.
3. **Incomplete State Cleanup on Sign-Out**:
   - `Navbar.jsx` invokes `authClient.signOut()`, which invalidates the server session token but leaves platform companion cookies (`sb_user_role`, `sb_user_status`, `sb_profile_completed`, `sb_signup_intent`) with long Max-Age (up to 15 minutes for intent) lingering in the browser. Subsequent logins reuse stale intent cookies, falsely triggering role collision modals.
4. **Missing Component-Level Defense-in-Depth**:
   - Dashboard client components (`/industry/dashboard`, `/institute/dashboard`) do not verify or enforce the session role. If a non-Industry user bypasses middleware or direct-links to `/industry/dashboard`, the page silently falls back to dummy data (`industryData`) instead of rejecting access.

---

## 1. Trace of the "Already Logged in as Student" Bug

### 1.1 Step-by-Step Anatomy of the Collision Trap

```
+-----------------------------------------------------------------------------------+
| 1. User logs in as STUDENT with Google Account A (role="STUDENT" in Neon PG User) |
|    --> Cookie 'better-auth.session_token' is set in the browser                   |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| 2. User navigates to /auth or /login to log in as Industry or Institute           |
|    --> ISSUE A: middleware.js intercepts /auth / /login (lines 158-172)           |
|        Detects active session, computes getCanonicalDashboard('STUDENT')          |
|        Redirects immediately to /student/dashboard (User is blocked from /login!) |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| 3. If User reaches /auth?role=industry or clicks Industry login:                  |
|    --> POST /api/auth/signup-intent sets cookie 'sb_signup_intent'='INDUSTRY'     |
|    --> Google OAuth completes and redirects to /profile/complete                  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| 4. /profile/complete (lines 20-68):                                               |
|    --> authClient.getSession() returns user.role = 'STUDENT'                      |
|    --> fetch('/api/auth/signup-intent') returns intentRole = 'INDUSTRY'           |
|    --> role !== intentRole ('STUDENT' !== 'INDUSTRY')                             |
|    --> Calls authClient.signOut()                                                 |
|    --> Redirects to /auth?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| 5. /auth renders RoleCollisionModal:                                              |
|    "This Google account is already registered as a Student & Job Seeker.          |
|     One Google account can only map to one role."                                 |
+-----------------------------------------------------------------------------------+
```

### 1.2 Code Evidence

#### Observation A: Middleware Early Intercept on Auth Pages
**File**: `middleware.js` (lines 158–174)
```javascript
  // 1. PUBLIC AUTH ROUTES (/auth, /login, /register)
  if (pathname === '/auth' || pathname === '/login' || pathname === '/register') {
    if (user) {
      if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DEACTIVATED') {
        return NextResponse.redirect(new URL('/account-suspended', request.url));
      }

      // Incomplete profile -> redirect to /profile/setup
      if (!user.profileCompleted || user.onboardingStatus !== 'COMPLETED' || (typeof user.completionScore === 'number' && user.completionScore < 70)) {
        return NextResponse.redirect(new URL('/profile/setup', request.url));
      }

      // Onboarding complete -> redirect directly to canonical role dashboard
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }
```
*Impact*: If a student session is active, navigating to `/login` or `/auth` cannot be used to switch accounts or start an Industry login; it immediately bounces to `/student/dashboard`.

#### Observation B: Pre-OAuth Intent Cookie vs Existing Database Role Collision
**File**: `app/profile/complete/page.jsx` (lines 20–68)
```javascript
        // 1. Fetch active session from Better Auth Client SDK
        const sessionRes = await authClient.getSession();
        const user = sessionRes?.data?.user;

        // 2. Fetch signup intent role from cookie / API if present
        let intentRole = null;
        try {
          const intentRes = await fetch('/api/auth/signup-intent');
          if (intentRes.ok) {
            const intentData = await intentRes.json();
            if (intentData?.role) {
              intentRole = String(intentData.role).trim().toUpperCase();
            }
          }
        } catch {}

        let role = user?.role ? String(user.role).trim().toUpperCase() : null;

        // 3. Check for Cross-Role Collision if existing user and intent role are present
        if (role && intentRole) {
          const isExistingOrgOrInd = role === 'INDUSTRY' || role === 'ORGANIZATION';
          const isIntentOrgOrInd = intentRole === 'INDUSTRY' || intentRole === 'ORGANIZATION';
          const isMatch = (role === intentRole) || (isExistingOrgOrInd && isIntentOrgOrInd);

          if (!isMatch) {
            let roleName = role.charAt(0) + role.slice(1).toLowerCase();
            if (role === 'STUDENT') roleName = 'Student';
            else if (role === 'INDUSTRY' || role === 'ORGANIZATION') roleName = 'Industry';
            else if (role === 'INSTITUTE') roleName = 'Institute';

            setStatusMessage(`This Google account is already registered as a ${roleName}. Redirecting...`);

            // Block conflicting session and redirect to /auth with collision parameters
            try {
              await authClient.signOut();
            } catch {}

            setTimeout(() => {
              if (isMounted) {
                router.replace(`/auth?collision=true&existingRole=${role}&attemptedRole=${intentRole}`);
              }
            }, 600);
            return;
          }
        }
```

---

## 2. Middleware Route Protection & Role Resolution Analysis

### 2.1 The Companion Cookie Fallback Vulnerability
**File**: `middleware.js` (lines 118–148)
```javascript
  // 2. Check for Better Auth session cookies
  const sessionTokenCookie =
    req.cookies.get('better-auth.session_token')?.value ||
    req.cookies.get('__Secure-better-auth.session_token')?.value ||
    req.cookies.get('sb_session_token')?.value;

  if (!sessionTokenCookie) {
    return null;
  }

  // Check optional companion hint cookies if present
  const cookieRole = req.cookies.get('sb_user_role')?.value;
  const cookieStatus = req.cookies.get('sb_user_status')?.value;
  const cookieCompleted = req.cookies.get('sb_profile_completed')?.value;

  const role = (cookieRole || 'STUDENT').toUpperCase(); // <-- DEFECT: Defaults all missing roles to STUDENT!
```

### 2.2 Mechanism Failure Chain:
1. When Better Auth signs a user in via Google OAuth, it writes `better-auth.session_token` to HTTP-only cookies.
2. Better Auth **does not** automatically create a cookie named `sb_user_role`.
3. When an **Industry** or **Institute** user navigates to `/industry/dashboard` or `/institute/dashboard`:
   - `sessionTokenCookie` is present (`better-auth.session_token`).
   - `cookieRole` is `undefined`.
   - `role` evaluates to `'STUDENT'`.
   - `middleware.js:288-295` checks:
     ```javascript
     if (user.role !== 'INDUSTRY' && user.role !== 'ORGANIZATION' && user.role !== 'RECRUITER') {
       const targetDashboard = getCanonicalDashboard(user.role); // '/student/dashboard'
       return NextResponse.redirect(new URL(targetDashboard, request.url));
     }
     ```
   - **The legitimate Industry user is locked out and booted to `/student/dashboard`!**

---

## 3. Direct URL Access & Defense-in-Depth Analysis

### 3.1 Gaps in Dashboard Page Components

| Route | Middleware Guard | Component-Level Session/Role Guard | Behavior on Direct URL Access |
|---|---|---|---|
| `/student/dashboard` | Checks `user.role === 'STUDENT'` | Calls `/api/profile/setup` | Shows profile or error screen |
| `/industry/dashboard` | Checks `user.role === 'INDUSTRY'` | Calls `/api/profile/setup` but **does not guard** | Falls back to dummy data `industryData`, renders full console |
| `/institute/dashboard` | Checks `user.role === 'INSTITUTE'` | **Zero auth checks** (only fetches `/api/students`) | Renders full Institute console with student alerts |
| `/admin/dashboard` | Checks `user.role === 'ADMIN'` | Guarded via `/api/admin/*` | Displays admin layout |
| `/recruiter/candidates` | Protected by matcher | Calls `/api/opportunities` | Renders candidate funnel |

#### Evidence from `app/industry/dashboard/page.jsx` (lines 43–66):
```javascript
// Fetch session
const sessionRes = await authClient.getSession().catch(() => null);
const user = sessionRes?.data?.user;

// Fetch live profile from /api/profile/setup
const profileRes = await fetch("/api/profile/setup").catch(() => null);
if (profileRes && profileRes.ok) {
  const profileData = await profileRes.json();
  if (profileData.profile && (profileData.role === "INDUSTRY" || profileData.role === "ORGANIZATION")) {
    setProfile(...);
  }
}
// If not authenticated or not industry, execution proceeds silently with industryData!
```

#### Evidence from `app/institute/dashboard/page.jsx` (lines 13–30):
```javascript
useEffect(() => {
  async function loadInstituteData() {
    try {
      const [stdRes, alertRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/alerts")
      ]);
      const stdData = await stdRes.json();
      const alertData = await alertRes.json();
      setStudents(stdData.students || []);
      setAlerts(alertData.alerts || []);
    } catch (err) {
      console.error("Error loading institute data:", err);
    } finally {
      setLoading(false);
    }
  }
  loadInstituteData();
}, []);
```

---

## 4. Client vs Server Session Caching & Logout Cleanup

### 4.1 Server-Side Session Model (`lib/auth.js`)
- Authoritative table: PostgreSQL `user` table (`id`, `name`, `email`, `role`, `account_status`, `onboarding_status`, `profile_completed`).
- Session table: PostgreSQL `session` table (`id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`).
- Better Auth session configuration:
  - `expiresIn: 60 * 60 * 24 * 7` (7 days)
  - `updateAge: 60 * 60 * 24` (24 hours)
  - `cookieCache: { enabled: true, maxAge: 60 * 5 }` (5 minutes)

### 4.2 Logout Flow Deficiencies (`components/shared/Navbar.jsx` lines 79–95)
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
      router.push("/");
      router.refresh();
    }
  };
```

**Cookies remaining after logout**:
1. `sb_signup_intent` (Max-Age: 900s / 15m) — Set by `POST /api/auth/signup-intent`. NOT cleared by Better Auth.
2. `sb_user_role` — If set, NOT cleared.
3. `sb_user_status` — If set, NOT cleared.
4. `sb_profile_completed` — If set, NOT cleared.
5. `sb_session_token` — If set, NOT cleared.

When the user attempts to sign in again, the leftover `sb_signup_intent` is sent to the server, poisoning the next authentication handshake.

---

## 5. Architectural & Code Remediation Blueprint

### Remediation 1: Synchronize Role Companion Cookie on Login & Session Fetch
In `lib/auth.js` or via a dedicated hook / middleware response, ensure `sb_user_role` and `sb_profile_completed` are set whenever a session is verified or dispatched:
```javascript
// In app/profile/complete/page.jsx (or an auth response handler):
document.cookie = `sb_user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
document.cookie = `sb_profile_completed=${profileCompleted}; path=/; max-age=604800; SameSite=Lax`;
// Clear consumed signup intent cookie
document.cookie = `sb_signup_intent=; path=/; max-age=0; SameSite=Lax`;
```

### Remediation 2: Comprehensive Sign-Out Utility (`lib/auth-client.js` or `Navbar.jsx`)
Create a comprehensive logout handler that clears all session and companion cookies:
```javascript
export async function fullLogout() {
  try {
    // 1. Better Auth server session revocation
    await authClient.signOut();
  } catch (e) {
    console.warn('Better auth signOut error:', e);
  }

  // 2. Clear all companion and intent cookies
  if (typeof document !== 'undefined') {
    const cookiesToClear = [
      'sb_user_role',
      'sb_user_status',
      'sb_profile_completed',
      'sb_signup_intent',
      'sb_session_token',
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
    ];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    });
  }

  // 3. Clear client-side storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('sb_user_cache');
      sessionStorage.clear();
    } catch {}
  }
}
```

### Remediation 3: Fix Middleware Auth Route Logic (`middleware.js`)
Allow users on `/auth` or `/login` to switch accounts if explicit query parameters (`?switch=true` or `?role=...`) are provided, or if the intent role differs:
```javascript
  if (pathname === '/auth' || pathname === '/login' || pathname === '/register') {
    const forceSwitch = request.nextUrl.searchParams.get('switch') === 'true';
    const explicitRole = request.nextUrl.searchParams.get('role');

    if (user && !forceSwitch && !explicitRole) {
      // Direct to canonical dashboard only when not explicitly requesting auth actions
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }
```

### Remediation 4: Add Component-Level Guards on Role Dashboards
In `app/industry/dashboard/page.jsx`, `app/institute/dashboard/page.jsx`, and `app/student/dashboard/page.js`:
```javascript
// Example in Industry Dashboard:
useEffect(() => {
  async function guardRole() {
    const sessionRes = await authClient.getSession().catch(() => null);
    const u = sessionRes?.data?.user;
    if (!u) {
      router.replace('/auth?redirect=/industry/dashboard&role=INDUSTRY');
      return;
    }
    const role = (u.role || '').toUpperCase();
    if (role !== 'INDUSTRY' && role !== 'ORGANIZATION' && role !== 'ADMIN') {
      router.replace(role === 'INSTITUTE' ? '/institute/dashboard' : '/student/dashboard');
      return;
    }
  }
  guardRole();
}, [router]);
```

---

## 6. Summary Matrix

| Issue | Severity | Location | Root Cause | Impact | Recommended Fix |
|---|---|---|---|---|---|
| "Already logged in as student" bug | Critical | `middleware.js:158`, `app/profile/complete/page.jsx:43` | Session persistence blocks `/auth` + pre-OAuth intent collides with existing DB role | Users cannot switch roles or login as Industry/Institute | Clear intent on consumption; allow `/auth?role=...` navigation; full logout |
| Middleware role defaulting to STUDENT | Critical | `middleware.js:133` | Missing `sb_user_role` cookie defaults to `'STUDENT'` | Industry/Institute users bounced to `/student/dashboard` | Set companion cookies upon login/session verification; avoid blind default |
| Incomplete Logout Cookie Cleanup | High | `components/shared/Navbar.jsx:79` | `signOut()` leaves companion/intent cookies in browser | Stale intent causes false collisions on subsequent logins | Implement `fullLogout` expiring all `sb_*` cookies |
| Dashboard Direct URL Access Gaps | Medium | `app/industry/dashboard`, `app/institute/dashboard` | Missing component-level role verification | Unauthenticated or cross-role users see dummy data | Add client-side / layout role guards across all partitions |
