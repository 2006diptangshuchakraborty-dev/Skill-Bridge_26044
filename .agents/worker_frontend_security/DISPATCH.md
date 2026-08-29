## 2026-08-23T14:25:17Z
You are the Frontend, Governance & Security Worker for Milestones 4, 5, and 6 (M4: Multi-Step Onboarding Wizards, M5: Admin Governance & Gatekeeping, M6: Route Protection & API Security Middleware).
Your working directory is e:/sih_2026_044/.agents/worker_frontend_security/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Read the architectural blueprints before implementing:
- `e:/sih_2026_044/.agents/m4_onboarding_explorer/m4_blueprint.md`
- `e:/sih_2026_044/.agents/m5_admin_governance_explorer/m5_blueprint.md`
- `e:/sih_2026_044/.agents/m6_security_middleware_explorer/m6_blueprint.md`

Scope & Exclusively Owned Files:
1. M4 Onboarding:
   - `app/student/onboarding/page.jsx`
   - `app/organization/onboarding/page.jsx`
   - `app/api/student/onboarding/route.js`
   - `app/api/organization/onboarding/route.js`

2. M5 Admin Governance & Gatekeeping:
   - `app/admin/dashboard/page.jsx`
   - `app/admin/verifications/page.jsx`
   - `app/admin/users/page.jsx`
   - `app/admin/audit-logs/page.jsx`
   - `app/api/admin/verifications/route.js`
   - `app/api/admin/users/route.js`
   - `app/api/admin/audit-logs/route.js`
   - `lib/gatekeeper.js`

3. M6 Route Protection & Auth UI:
   - `middleware.js`
   - `lib/auth-guard.js`
   - `app/(auth)/login/page.jsx`
   - `app/(auth)/register/page.jsx`
   - `app/account-suspended/page.jsx`
   - `components/RoleCollisionModal.jsx`

Verification:
- Run `node tests/test-auth-suite.js` (must pass 30/30 tests 100%).
- Run `npm run build` to verify Next.js build succeeds with 0 errors across all routes.
- Record verification outputs in `e:/sih_2026_044/.agents/worker_frontend_security/handoff.md`.
- Send completion message to parent orchestrator.
