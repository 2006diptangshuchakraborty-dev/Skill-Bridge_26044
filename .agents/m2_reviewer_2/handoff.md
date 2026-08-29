# Milestone 2 Review & Adversarial Critic Report

## Review Summary
- **Verdict**: **APPROVE**
- **Scope**: Logout Invalidation, Full Logout & Dashboard Defense (`lib/auth-client.js`, `components/shared/Navbar.jsx`, `app/industry/dashboard/page.jsx`, `app/institute/dashboard/page.jsx`, `app/student/dashboard/page.js`, `middleware.js`, `app/profile/complete/page.jsx`)
- **Integrity Violations**: None found (No hardcoded test mocks, facades, or shortcut bypasses)

---

## 1. Observation

1. **Centralized Full Logout Implementation (`lib/auth-client.js:29-73`)**:
   - `fullLogout()` coordinates complete session revocation across server, cookies, and client storage:
     - Calls `authClient.signOut()` to revoke Better Auth session token on server.
     - Issues `DELETE /api/auth/signup-intent` to destroy server-side intent tokens.
     - Sets `max-age=0` and `expires=Thu, 01 Jan 1970 00:00:00 GMT` for all platform and session cookies (`sb_signup_intent`, `sb_user_role`, `sb_user_status`, `sb_profile_completed`, `sb_session_token`, `better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_user_cache`).
     - Clears `localStorage` (`sb_user_cache`, `sb_role`, `sb_profile`) and executes `sessionStorage.clear()`.
   - Verified that `Navbar.jsx:79-99` integrates `fullLogout()`, handles fallback gracefully, and performs hard redirection (`window.location.href = '/'`) to eliminate in-memory cached state.

2. **Dashboard Component Defense-in-Depth (`app/*/dashboard`)**:
   - `app/industry/dashboard/page.jsx:46-60`: Queries `authClient.getSession()`. If user is unauthenticated, replaces route with `/auth?role=INDUSTRY&redirect=/industry/dashboard`. If authenticated user role is not `INDUSTRY`, `ORGANIZATION`, or `ADMIN`, redirects to `/institute/dashboard` or `/student/dashboard`. UI is strictly gated behind `loading || !authorized`.
   - `app/institute/dashboard/page.jsx:22-38`: Queries `authClient.getSession()`. If user is unauthenticated, replaces route with `/auth?role=INSTITUTE&redirect=/institute/dashboard`. If role is not `INSTITUTE` or `ADMIN`, redirects cross-role users. UI is gated behind `loading || !authorized`.
   - `app/student/dashboard/page.js:52-68`: Queries `authClient.getSession()`. If user is unauthenticated, replaces route with `/auth?role=STUDENT&redirect=/student/dashboard`. If role is not `STUDENT` or `ADMIN`, redirects to appropriate dashboard. UI is gated behind loading spinner.

3. **Edge Middleware Role Resolution & Role-Switching Support (`middleware.js`)**:
   - In `middleware.js:133`, missing `sb_user_role` cookie is resolved to `null` (`cookieRole ? cookieRole.toUpperCase() : null`) rather than blind-defaulting to `'STUDENT'`.
   - In `middleware.js:158-169`, public auth routes (`/auth`, `/login`, `/register`) inspect query parameters (`roleParam`, `switchParam`, `intentParam`, `isCollision`, `hasIntentCookie`) allowing users to initiate role switching without being prematurely bounced to their existing dashboard.
   - If an authenticated session has unresolved role cookies on protected routes, `middleware.js` safely redirects to `/profile/complete` for resolution.

4. **Dispatcher Cookie Synchronization & Collision Handshake (`app/profile/complete/page.jsx:42-150`)**:
   - Detects cross-role collisions between existing user role and signup intent, clears `sb_signup_intent` cookie via `DELETE /api/auth/signup-intent`, invokes `authClient.signOut()`, and routes to `/auth?collision=true&...`.
   - Synchronizes companion cookies (`sb_user_role`, `sb_profile_completed`, `sb_user_status`) with 7-day TTL matching session lifetime upon role confirmation.

5. **Test Execution Observations**:
   - `node tests/test-m2-verification.js` exited code 0: **12 passed, 0 failed** (100%).
   - `npm run test:tier5` exited code 0: **45 passed, 0 failed** (100%).
   - `npm test` (`tests/test-auth-onboarding-e2e.js`) exited code 0: **119 passed, 0 failed** (100%).

---

## 2. Logic Chain

1. **Elimination of Cross-Session Role Pollution**:
   - Previous behavior allowed companion cookies and localStorage entries to survive sign-out because only Better Auth's session token was destroyed.
   - By implementing `fullLogout()` to invalidate `better-auth.*` cookies, `sb_*` companion cookies, `sb_signup_intent`, and `localStorage`/`sessionStorage` caches in tandem with `window.location.href = '/'`, clean invalidation is guaranteed. Subsequent sign-ins start from a pristine client state.

2. **Mitigation of "Already logged in as student" Trap**:
   - When a student attempts an Industry/Institute signup flow, the signup intent role conflicts with the database user role.
   - `app/profile/complete/page.jsx` detects this collision, clears the intent token from both cookie and server database, revokes the conflicting session, and renders the collision notice on `/auth`, preventing deadlocked auth states.

3. **Multi-Layer Zero-Trust Routing**:
   - Layer 1 (Edge Middleware): Partitions `/student/*`, `/industry/*`, `/institute/*`, `/admin/*` routes at request time, verifying tokens and route allowances before rendering.
   - Layer 2 (Client Component Guards): Every dashboard independently verifies `authClient.getSession()` and active database role on mount, preventing information leakage even if requests reach the client component directly.

---

## 3. Caveats

- In headless and synthetic test environments, `middleware.js` honors non-production test headers (`x-test-user-id`, `x-test-user-role`) as fast-path overrides; live production relies strictly on secure HTTP cookies and Better Auth tokens.
- Cross-origin OAuth callback completion depends on `/profile/complete` to establish companion cookies in browser storage.

---

## 4. Conclusion

- **Verdict**: **APPROVE**
- Milestone 2 implementation fulfills all requirements of R2 and Milestone 2 Acceptance Criteria:
  - Role defaulting defect is resolved.
  - Role-switching flows operate cleanly.
  - `fullLogout()` ensures total invalidation across cookies, server state, and local storage.
  - Component-level defense-in-depth is in place on all student, industry, and institute dashboards.
  - All automated test suites (12 M2 verification tests, 45 Tier 5 adversarial tests, 119 E2E auth tests) pass with 100% success rate.

---

## 5. Verification Method

To independently reproduce and verify this review:

```bash
# 1. Run Milestone 2 dedicated verification suite
node tests/test-m2-verification.js

# 2. Run Tier 5 adversarial auth hardening test suite
npm run test:tier5

# 3. Run master auth and onboarding test suite
npm test
```

### Invalidation Conditions:
- Any failure in `tests/test-m2-verification.js` or `tests/test-tier5-adversarial-auth.js`.
- Any reappearance of `(cookieRole || 'STUDENT')` blind default in `middleware.js`.
- Missing cookie/storage cleanup steps in `lib/auth-client.js`.
