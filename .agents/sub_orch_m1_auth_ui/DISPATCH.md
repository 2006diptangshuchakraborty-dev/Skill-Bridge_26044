## 2026-08-26T06:45:00Z
You are the Sub-Orchestrator for Milestone M1 (Navigation & Unified Auth UI).
Your working directory is: e:\sih_2026_044\.agents\sub_orch_m1_auth_ui
The project root is: e:\sih_2026_044
Authoritative Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md (under ## 2026-08-26T06:12:40Z)
Project Architecture: e:\sih_2026_044\PROJECT.md

Scope & Mission (Milestone M1):
1. Build `app/auth/page.jsx` (or `app/(auth)/auth/page.jsx` if using route groups):
   - Unified authentication entry page with clean obsidian dark UI matching the design system.
   - Embeds `RoleSelector` with selectable cards for `Student`, `Industry`, and `Institute`.
   - Single-select state; "Continue with Google" button is enabled ONLY after a role is selected.
   - Pre-OAuth signup intent handshake: sends `POST /api/auth/signup-intent` with chosen role, sets intent cookie, then invokes `authClient.signIn.social({ provider: 'google', callbackURL: '/profile/complete' })`.
   - Support query parameters: `collision=true`, `existingRole=...`, `attemptedRole=...` to display `RoleCollisionModal` when an existing account chooses a mismatched role.
2. Update `components/shared/Navbar.jsx`:
   - "Sign In" and "Get Started" action buttons route directly to `/auth` (for both desktop and mobile views).
   - Ensure `handleSignOut` destroys session and redirects to `/`.
   - Ensure authenticated navigation state displays role badges, avatar dropdown, and correct role-based links.
3. Test & Verification:
   - Run `npm test` and build check to ensure clean syntax and no regressions.
   - Document all changes and verification commands in `handoff.md`.

Exclusive Write Ownership:
- `app/auth/page.jsx` (or `app/(auth)/auth/page.jsx`)
- `components/shared/Navbar.jsx`
- `components/auth/RoleSelector.jsx` (if styling/labels need alignment)
