## 2026-08-26T07:30:38Z
You are the Sub-Orchestrator for Milestone M4 (Edge Route Protection & Middleware).
Your working directory is: e:\sih_2026_044\.agents\sub_orch_m4_middleware
The project root is: e:\sih_2026_044
Authoritative Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md (under ## 2026-08-26T06:12:40Z)
Project Architecture: e:\sih_2026_044\PROJECT.md
Testing Infrastructure: e:\sih_2026_044\TEST_INFRA.md

Scope & Mission (Milestone M4):
1. Edge Route Protection in `middleware.js`:
   - Update `config.matcher` to include:
     `'/student/:path*'`, `'/organization/:path*'`, `'/industry/:path*'`, `'/recruiter/:path*'`, `'/institute/:path*'`, `'/profile/:path*'`, `'/admin/:path*'`, `'/account-suspended'`, `'/auth'`, `'/login'`, `'/register'`
   - Unauthenticated access: Any unauthenticated request to protected routes (`/student/*`, `/industry/*`, `/organization/*`, `/recruiter/*`, `/institute/*`, `/profile/*`, `/admin/*`) MUST be redirected to `/auth?redirect=<pathname>`.
   - Incomplete profile protection: If an authenticated user has `profileCompleted === false` (or score < 70) and attempts to access protected role dashboards (`/student/*`, `/industry/*`, `/institute/*`), redirect to `/profile/setup` (allow `/profile/setup` and `/api/*`).
   - Authenticated user visiting auth pages: If an authenticated user with `profileCompleted === true` accesses `/auth`, `/login`, or `/register`, redirect them directly to their canonical role dashboard (`/student/dashboard`, `/industry/dashboard`, `/institute/dashboard`, `/admin/dashboard`).
   - Account status suspension: If `accountStatus === 'SUSPENDED'`, redirect to `/account-suspended`.
   - Role partitioning: Strict isolation between roles (Student cannot access `/industry/*`, `/institute/*`, `/admin/*`; Industry cannot access `/student/*`, etc.). Mismatched role access redirects to the user's bound role dashboard.
   - Session resolution: Support both Better Auth session cookies (`better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token`) and non-production testing headers (`x-test-user-id`, `x-test-user-role`, `x-test-profile-completed`, `x-test-account-status`).
2. Exclusive Write Ownership:
   - `middleware.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

3. Test & Verification:
   - Run tests: `npm test`, `node tests/test-auth-onboarding-e2e.js`, `node tests/test-auth-suite.js`.
   - Verify that all middleware assertions (Tier 1 F09, Tier 2 B37–B40, Tier 3 X03, X05, Tier 4 E2E 5) pass cleanly with 100% pass rate.
   - Deliver `handoff.md` in your working directory and send a completion message with summary.
