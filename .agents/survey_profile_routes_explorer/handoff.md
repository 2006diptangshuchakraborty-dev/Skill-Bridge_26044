# Handoff Report — Authenticated Sessions, Role-Based Redirects & Session Caching

**Agent**: `survey_profile_routes_explorer`  
**Working Directory**: `e:\sih_2026_044\.agents\survey_profile_routes_explorer`  
**Date**: 2026-08-29  
**Status**: Complete  

---

## 1. Observation

1. **Bug Trigger 1: Middleware Interception on Public Auth Routes**  
   - *Location*: `middleware.js` lines 158–174.  
   - *Code*:
     ```javascript
     if (pathname === '/auth' || pathname === '/login' || pathname === '/register') {
       if (user) {
         if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DEACTIVATED') {
           return NextResponse.redirect(new URL('/account-suspended', request.url));
         }
         if (!user.profileCompleted || user.onboardingStatus !== 'COMPLETED' || (typeof user.completionScore === 'number' && user.completionScore < 70)) {
           return NextResponse.redirect(new URL('/profile/setup', request.url));
         }
         const targetDashboard = getCanonicalDashboard(user.role);
         return NextResponse.redirect(new URL(targetDashboard, request.url));
       }
       return NextResponse.next();
     }
     ```
   - *Observation*: When a user has an active session token cookie, any navigation to `/auth`, `/login`, or `/register` is intercepted by Edge Middleware and immediately redirected to `getCanonicalDashboard(user.role)` (`/student/dashboard`). The user is blocked from accessing the login interface to switch accounts or pick a new role.

2. **Bug Trigger 2: OAuth Role Intent Collision Trap**  
   - *Location*: `app/profile/complete/page.jsx` lines 20–68 and `lib/role-collision.js` lines 15–49.  
   - *Code*:
     ```javascript
     const sessionRes = await authClient.getSession();
     const user = sessionRes?.data?.user;
     const intentRes = await fetch('/api/auth/signup-intent');
     // ...
     if (role && intentRole) {
       const isMatch = (role === intentRole) || (isExistingOrgOrInd && isIntentOrgOrInd);
       if (!isMatch) {
         setStatusMessage(`This Google account is already registered as a ${roleName}. Redirecting...`);
         await authClient.signOut();
         router.replace(`/auth?collision=true&existingRole=${role}&attemptedRole=${intentRole}`);
         return;
       }
     }
     ```
   - *Observation*: When a user signs in through Google OAuth while a pre-OAuth signup intent (`sb_signup_intent`) cookie with a different role exists, `profile/complete` aborts the session, signs out, and redirects to `/auth` with `collision=true`, triggering the `RoleCollisionModal` ("This Google account is already registered as a Student").

3. **Defect 3: Middleware Role Resolution Blind Defaulting**  
   - *Location*: `middleware.js` lines 118–148.  
   - *Code*:
     ```javascript
     const sessionTokenCookie =
       req.cookies.get('better-auth.session_token')?.value ||
       req.cookies.get('__Secure-better-auth.session_token')?.value ||
       req.cookies.get('sb_session_token')?.value;

     if (!sessionTokenCookie) return null;

     const cookieRole = req.cookies.get('sb_user_role')?.value;
     const role = (cookieRole || 'STUDENT').toUpperCase();
     ```
   - *Observation*: Better Auth issues `better-auth.session_token` upon Google OAuth login, but does not issue `sb_user_role`. Because `cookieRole` is `undefined`, Edge Middleware defaults the authenticated user's role to `'STUDENT'`. When an Industry or Institute user visits `/industry/dashboard` or `/institute/dashboard`, lines 288–295 detect `user.role === 'STUDENT'` and redirect them to `/student/dashboard`.

4. **Defect 4: Incomplete Sign-Out Cookie Invalidation**  
   - *Location*: `components/shared/Navbar.jsx` lines 79–95.  
   - *Code*:
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
   - *Observation*: `signOut()` revokes the session on Better Auth, but does not clear `sb_signup_intent` (which has a 15-minute TTL), `sb_user_role`, `sb_user_status`, or `sb_profile_completed` cookies. Stale intent tokens persist across logouts and poison subsequent sign-ins.

5. **Defect 5: Missing Component-Level Defense-in-Depth**  
   - *Locations*: `app/industry/dashboard/page.jsx` (lines 43–66), `app/institute/dashboard/page.jsx` (lines 13–30).  
   - *Observation*: Direct URL access bypassing middleware (or via client navigation) is not rejected at the page component level. The Industry dashboard falls back to `industryData` (dummy data) and displays the employer portal to students, while the Institute dashboard fetches `/api/students` without role validation.

6. **Test Suite Verification**:  
   - *Command*: `npm test` & `npm run test:all`  
   - *Result*: 119/119 unit/boundary/combination/e2e tests passed in `tests/test-auth-onboarding-e2e.js`, and 45/45 adversarial tests passed in `tests/test-tier5-adversarial-auth.js`.

---

## 2. Logic Chain

1. **Step 1 (Tracing the "Already logged in as student" bug)**:  
   - From Observation 1, 2, and 4, when a student is logged in, their session cookie persists. If they visit `/auth` or `/login`, `middleware.js` bounces them to `/student/dashboard`. If they invoke the Industry intent flow, `POST /api/auth/signup-intent` sets `sb_signup_intent=INDUSTRY`. When Google OAuth completes, `/profile/complete` finds `user.role` (from database) is `'STUDENT'` while `intentRole` is `'INDUSTRY'`. This triggers the collision check, destroys the session, and redirects to `/auth?collision=true`, presenting the collision modal.
2. **Step 2 (Tracing Industry/Institute Lockout)**:  
   - From Observation 3, `middleware.js` resolves roles exclusively through the optional companion cookie `sb_user_role` or test headers. When a real user authenticates with Better Auth, only `better-auth.session_token` is present. Because `sb_user_role` is absent, `role` defaults to `'STUDENT'`. Edge middleware then rejects access to `/industry/*` and `/institute/*`, redirecting the valid Industry/Institute user to `/student/dashboard`.
3. **Step 3 (Tracing Logout Residual State)**:  
   - From Observation 4, `handleSignOut` in `Navbar.jsx` lacks explicit expiration of `sb_*` cookies. Specifically, `sb_signup_intent` remains active for 15 minutes. If a user logs out and attempts to log in under a different flow, the stale intent cookie causes a false collision.
4. **Step 4 (Assessing Direct URL Access Protection)**:  
   - From Observation 5, while middleware matches `/student/*`, `/industry/*`, and `/institute/*`, client components lack auth/role guards. If middleware is bypassed or client routing occurs without a hard refresh, the components render unauthenticated fallback data rather than issuing an immediate redirect to `/auth`.

---

## 3. Caveats

1. **Google OAuth Production Credential Requirement**: Live OAuth redirects with Google servers require `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. Test suites simulate the OAuth exchange deterministically.
2. **Edge Runtime Database Access Limitation**: Next.js Edge Middleware cannot directly execute heavy database queries via Drizzle ORM without adding latency to every static and dynamic asset. A signed companion cookie or JWT session claim is the standard architectural pattern for Edge role verification.
3. **Admin Registration Prohibition**: System administrators cannot register via OAuth signup intents; they are designated via `INITIAL_ADMIN_EMAIL` in `lib/auth.js` (lines 229–252).

---

## 4. Conclusion

- **Root Cause Identified**: The "Already logged in as student" issue and role-based redirect anomalies stem from:
  1. Lack of companion cookie synchronization upon Better Auth session creation (`sb_user_role` missing, leading `middleware.js` to default all users to `'STUDENT'`).
  2. Middleware prematurely redirecting authenticated users on `/auth` and `/login` without checking for explicit role-switch intents.
  3. Pre-OAuth intent cookies (`sb_signup_intent`) not being deleted upon consumption or logout.
  4. Incomplete cookie invalidation in `Navbar.jsx:handleSignOut`.
  5. Dashboard components lacking client-side role guards.
- **Actionable Remediation Strategy**:
  1. Synchronize `sb_user_role` and `sb_profile_completed` upon session verification in `/profile/complete` and auth API responses.
  2. Invalidate all `sb_*` and `better-auth.*` cookies in a centralized `fullLogout()` utility called by `Navbar.jsx`.
  3. Consume and clear `sb_signup_intent` after first use in `/profile/complete`.
  4. Allow `/auth?role=...` or `/auth?switch=true` to bypass automatic dashboard bounce in `middleware.js`.
  5. Add component-level role gating in `/industry/dashboard` and `/institute/dashboard`.

---

## 5. Verification Method

To independently verify the observations and findings:

1. **Inspect Code Files**:
   - `middleware.js` (lines 118–148, 158–174, 288–295)
   - `app/profile/complete/page.jsx` (lines 20–68)
   - `components/shared/Navbar.jsx` (lines 79–95)
   - `lib/role-collision.js` (lines 15–49)
   - `lib/signup-intent.js` (lines 16–94)
   - `app/industry/dashboard/page.jsx` (lines 43–66)
   - `app/institute/dashboard/page.jsx` (lines 13–30)

2. **Run Automated Test Commands**:
   - `npm test` (Runs E2E Master Suite Tiers 1–4, 119 test cases)
   - `npm run test:tier5` (Runs Tier 5 Adversarial Auth Hardening Suite, 45 test cases)
   - `npm run test:all` (Executes full combined automated test suites)

3. **Invalidation Conditions**:
   - If `sb_user_role` is automatically set by Better Auth or signed JWT claims are decoded in `middleware.js`, the blind default to `'STUDENT'` is resolved.
   - If `handleSignOut` deletes all `sb_*` cookies with `maxAge: 0`, stale intent persistence is eliminated.
