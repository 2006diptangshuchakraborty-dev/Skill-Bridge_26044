## 2026-08-23T14:41:58Z
You are the replacement Frontend, Governance & Security Worker for Milestones 4, 5, and 6 (M4: Multi-Step Onboarding Wizards, M5: Admin Governance & Gatekeeping, M6: Route Protection & API Security Middleware).
Your working directory is e:/sih_2026_044/.agents/worker_frontend_security_2/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Read the architectural blueprints before implementing:
- `e:/sih_2026_044/.agents/m4_onboarding_explorer/m4_blueprint.md`
- `e:/sih_2026_044/.agents/m5_admin_governance_explorer/m5_blueprint.md`
- `e:/sih_2026_044/.agents/m6_security_middleware_explorer/m6_blueprint.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Files:
1. M4 Onboarding:
   - `app/student/onboarding/page.jsx`: Full interactive 8-step student onboarding wizard (Basic, Academic, Skills & Proficiency, Projects, Certifications, Experience, Career Preferences, Review & Submit).
   - `app/organization/onboarding/page.jsx`: Full interactive 7-step organization onboarding wizard (Org Info, Registration CIN/GSTIN, Contact Details, Industry Focus, Hiring Preferences, Verification Docs, Review & Submit).
   - `app/api/student/onboarding/route.js`: POST/PUT endpoint to save step drafts or submit complete onboarding, recalculates profile completion via `lib/onboarding-calc.js`, updates `onboardingStatus` to `COMPLETED`, logs audit event.
   - `app/api/organization/onboarding/route.js`: POST/PUT endpoint to save step drafts or submit complete onboarding, sets `onboardingStatus: 'COMPLETED'` and `verificationStatus: 'PENDING'`, recalculates completion, logs audit event.

2. M5 Admin Governance & Gatekeeping:
   - `app/admin/dashboard/page.jsx`: Admin dashboard with platform metrics and quick links.
   - `app/admin/verifications/page.jsx`: Organization KYC verification queue with Approve, Reject, and Request Info actions, document viewer, and admin notes.
   - `app/admin/users/page.jsx`: User management console with status toggles (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`) and role filters.
   - `app/admin/audit-logs/page.jsx`: Forensic audit trail explorer with filtering by actor, target, action, date range.
   - `app/api/admin/verifications/route.js`: GET pending orgs, POST/PATCH verification decisions (`APPROVED`, `REJECTED`, `INFO_REQUESTED`), logs audit event.
   - `app/api/admin/users/route.js`: GET user list, PATCH account status with audit logging.
   - `app/api/admin/audit-logs/route.js`: GET query endpoint for audit logs.
   - `lib/gatekeeper.js`: Capability gating helper checking org verification status (blocks unapproved orgs from publishing live opportunities or accessing candidate PII like email/phone/resume).

3. M6 Route Protection & Auth UI:
   - `middleware.js`: Next.js Edge Middleware guarding `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`, redirecting unauthenticated users to `/login`, redirecting role mismatches, redirecting incomplete onboarding to `/student/onboarding` or `/organization/onboarding`, and redirecting suspended users to `/account-suspended`.
   - `lib/auth-guard.js`: Server-side API guard `withAuth(handler, { roles, requireActive, requireApprovedOrg, checkOwnership })` protecting API routes.
   - `app/(auth)/login/page.jsx`: Auth login page supporting Student, Organization, and Admin logins with Google OAuth.
   - `app/(auth)/register/page.jsx`: Role-selection registration page calling `/api/auth/signup-intent` before OAuth.
   - `app/account-suspended/page.jsx`: Informative suspended account screen.
   - `components/RoleCollisionModal.jsx`: Modal alerting users attempting to switch roles with an existing account.

Verification:
- Run `node tests/test-auth-suite.js` (must pass 30/30 tests 100%).
- Run `npm run build` to verify Next.js build succeeds with 0 errors across all routes.
- Record verification outputs in `e:/sih_2026_044/.agents/worker_frontend_security_2/handoff.md`.
- Send completion message to parent orchestrator.
