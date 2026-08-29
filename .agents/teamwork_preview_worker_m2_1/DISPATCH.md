## 2026-08-29T05:57:26Z
You are a teamwork_preview_worker implementing Milestone 2: Multi-Role Auth, Session Management, Redirects & Logout Invalidation for the project defined in e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md and e:\sih_2026_044\.agents\PROJECT.md.

Working directory: e:\sih_2026_044\.agents\teamwork_preview_worker_m2_1
Workspace directory: e:\sih_2026_044

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership for Milestone 2:
- `middleware.js`:
  1. Fix the role resolution logic so it does not blind-default to 'STUDENT' when `sb_user_role` is missing.
  2. Allow role-switching requests on `/auth`, `/login`, `/register` (when query param `role=...` or `switch=true` or intent token is present) without prematurely redirecting to `/student/dashboard`.
  3. Enforce strict server-side/middleware protection on `/student/*`, `/industry/*`, `/institute/*`, and `/admin/*`. Ensure direct URL access (e.g. Student accessing `/industry/dashboard`) is rejected and redirected to the user's canonical dashboard.
- `app/profile/complete/page.jsx` & `lib/role-collision.js`:
  1. Consume and delete the `sb_signup_intent` cookie upon completion or collision handling.
  2. Synchronize `sb_user_role` and `sb_profile_completed` companion cookies when setting up the session.
- `components/shared/Navbar.jsx` (and client auth utilities):
  1. Implement a complete logout utility that clears Better Auth session AND deletes all companion cookies (`sb_signup_intent`, `sb_user_role`, `sb_user_status`, `sb_profile_completed`, `sb_session_token`, `better-auth.session_token` with `maxAge: 0`, `path: '/'`).
  2. Clear client-side caches so logging out and logging in as a different role is 100% clean with zero stale state.
- `app/industry/dashboard/page.jsx`, `app/institute/dashboard/page.jsx`, `app/student/dashboard/page.js`:
  1. Add client-level role checks / defense-in-depth so unauthenticated or cross-role visits do not render dummy fallback data.

Tasks:
1. Read `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md`, `e:\sih_2026_044\.agents\PROJECT.md`, and survey analysis in `e:\sih_2026_044\.agents\survey_profile_routes_explorer\analysis.md`.
2. Implement the fixes across `middleware.js`, `app/profile/complete/page.jsx`, `lib/role-collision.js`, `components/shared/Navbar.jsx`, and dashboard pages.
3. Run test suites:
   - `npm test`
   - `npm run test:tier5`
4. Document all changes and verification outputs in `e:\sih_2026_044\.agents\teamwork_preview_worker_m2_1\handoff.md`.
5. Send a completion message when done.
