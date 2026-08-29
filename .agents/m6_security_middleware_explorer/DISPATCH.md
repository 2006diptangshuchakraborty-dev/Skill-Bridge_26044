## 2026-08-23T14:07:53Z
You are the Route Protection & API Security Explorer for Milestone 6 (M6).
Your working directory is e:/sih_2026_044/.agents/m6_security_middleware_explorer/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Task:
1. Design the route protection middleware and API security guard architecture:
   - Next.js Edge Middleware in `middleware.js`:
     - Route prefix matching: `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`.
     - Session token extraction from cookies (Better Auth session cookie `better-auth.session_token` or standard cookie/headers).
     - Role authorization:
       - `/student/*` requires session + `role === 'STUDENT'` (if unauthenticated -> redirect to `/login?role=STUDENT&redirect=...`; if role mismatch -> redirect to own role dashboard or 403).
       - `/organization/*` and `/recruiter/*` requires session + `role === 'ORGANIZATION'` (if unauthenticated -> redirect to `/login?role=ORGANIZATION&redirect=...`; if role mismatch -> redirect to own role dashboard or 403).
       - `/admin/*` requires session + `role === 'ADMIN'` (if unauthenticated -> redirect to `/login?role=ADMIN&redirect=...`; if role mismatch -> redirect to `/login` or 403).
     - Onboarding Redirection:
       - If authenticated Student has `onboardingStatus !== 'COMPLETED'` and is visiting `/student/dashboard` or other student pages (except `/student/onboarding`), automatically redirect to `/student/onboarding`.
       - If authenticated Organization has `onboardingStatus !== 'COMPLETED'` and is visiting `/organization/dashboard` or recruiter pages (except `/organization/onboarding`), automatically redirect to `/organization/onboarding`.
     - Account Status Enforcement:
       - If `accountStatus === 'SUSPENDED'` or `accountStatus === 'DEACTIVATED'`, block access and redirect to `/account-suspended`.
   - API Authorization Guard `lib/auth-guard.js` (`withAuth` wrapper):
     - Validates session from incoming NextRequest.
     - Enforces allowed roles array (`roles: ['STUDENT']`, `roles: ['ORGANIZATION']`, `roles: ['ADMIN']`).
     - Enforces account status (`requireActive: true`).
     - Enforces tenant ownership / IDOR check (`checkOwnership: (session, req, params) => boolean`).
     - Records audit log on sensitive API actions.
   - Role Selection & Login UI at `app/(auth)/login/page.jsx` and `app/(auth)/register/page.jsx`:
     - Clean, responsive UI with role selection (Student vs Organization vs Admin login).
     - Connects with `signup-intent` before OAuth and handles role collision modal gracefully.
2. Write your implementation blueprint to `e:/sih_2026_044/.agents/m6_security_middleware_explorer/m6_blueprint.md` and write `e:/sih_2026_044/.agents/m6_security_middleware_explorer/handoff.md`.
3. Send a completion message when done.
