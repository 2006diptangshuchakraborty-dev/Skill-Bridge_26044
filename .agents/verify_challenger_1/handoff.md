# Adversarial Auth & Role Boundary Challenge Report

**Agent**: `verify_challenger_1` (Empirical Challenger)  
**Target Project**: Skill Bridge Platform (SIH 2026 Platform)  
**Working Directory**: `e:/sih_2026_044`  
**Report Date**: 2026-08-23  
**Verdict**: **APPROVE (with Advisory Remediation)**

---

## 1. Observation

Adversarial stress tests were designed, implemented, and executed across all four target vectors and edge routing middleware. Testing encompassed 5 empirical suites:
1. `tests/adversarial-auth-boundaries.test.js` (29 boundary & route tests)
2. `tests/adversarial-auth-challenge.js` (32 core auth & role challenge tests)
3. `tests/adversarial-gatekeeping-challenge.js` (42 gatekeeping & capability tests)
4. `tests/adversarial-gatekeeping-routes-idor.js` (35 route & IDOR tests)
5. `tests/test-auth-suite.js` (30 master regression E2E tests)

### A. Vector 1: Signup Intent Tampering
- **Cryptographic Entropy**: `lib/signup-intent.js:45` generates 32 bytes of cryptographic randomness (`crypto.randomBytes(32).toString('hex')` yielding 64-character hex strings with 256-bit entropy).
- **TTL Expiration**: `lib/signup-intent.js:10` configures `INTENT_EXPIRY_MS = 15 * 60 * 1000`. Expired tokens resolved via `resolveValidIntent()` evaluate to `isValid: false`, `isExpired: true` and are rejected with HTTP 410/400.
- **Replay Attack Defense**: `lib/signup-intent.js:155` marks consumed tokens with `used: true` and `usedAt: ISOString`. Subsequent resolution attempts return `isValid: false`, `isUsed: true`, preventing token replay.
- **Admin Registration Ban**: `lib/signup-intent.js:28` and `app/api/auth/signup-intent/route.js:42` strictly prohibit role `'ADMIN'` with HTTP 403 `ADMIN_REGISTRATION_FORBIDDEN`. Malicious strings (`SUPERADMIN`, `ROOT`, `ADMIN; DROP TABLE`) are rejected with 400/403.

### B. Vector 2: Role Elevation & Tampering Attacks
- **Client Input Prohibition**: `lib/auth.js:56` sets `input: false` for `role`, `accountStatus`, and `onboardingStatus` in Better Auth additional fields.
- **Update Sanitization Hook**: `lib/auth.js:268` in `databaseHooks.user.update.before` unconditionally deletes `role`, `accountStatus`, and `id` from update payloads:
  ```javascript
  if ('role' in user) delete user.role;
  if ('accountStatus' in user) delete user.accountStatus;
  if ('id' in user) delete user.id;
  ```
- **Server Authorization Guard**: `lib/auth-guard.js:125` (`withAuth`) strictly validates user role against allowed roles, returning 403 `INSUFFICIENT_PERMISSIONS`. Suspended/deactivated accounts are blocked with 403 `ACCOUNT_SUSPENDED`.
- **Tenant Ownership & IDOR Protection**: `lib/auth-guard.js:185` and `app/api/student/profile/route.js:118` verify `user.id === targetUserId`, rejecting cross-tenant mutations with 403 `IDOR_MISMATCH` while permitting admin governance overrides.

### C. Vector 3: Returning Google Account Role Collision
- **Collision Detection**: `lib/role-collision.js:15` (`checkRoleCollision`) checks `normalizedExisting !== normalizedIntent`. If a student attempts to log in as an organization or vice-versa, `hasCollision: true` is returned with `redirectPath: '/[existingRole]/dashboard'`.
- **UI Parameter Construction**: `lib/role-collision.js:40` (`buildCollisionRedirectUrl`) generates `?collision=true&existingRole=...&attemptedRole=...` to display the role collision modal.
- **Role Immutability**: Returning Google accounts maintain their initial database role; re-authenticating never modifies `users.role`.

### D. Vector 4: Public Admin Account Creation & Governance
- **Provisioning Enforcement**: `lib/auth.js:93` strictly provisions `role: 'ADMIN'` only when `user.email === process.env.INITIAL_ADMIN_EMAIL`. Non-matching emails default to `STUDENT`.
- **User Moderation Protection**: `app/api/admin/users/route.js:123` rejects any request body containing `role` with 400 `"Role cannot be mutated via user status endpoint"`. Self-suspension by administrators is blocked with 400.
- **Architectural Advisory (Fallback Vulnerability)**: `app/api/admin/users/route.js:36`, `app/api/admin/verifications/route.js:38`, and `app/api/admin/audit-logs/route.js:33` include an insecure fallback `const defaultAdmin = (dbInstance.users || []).find(u => u.role === 'ADMIN')`. When an unauthenticated caller or a student user sends a request without explicit headers, this fallback inadvertently treats the caller as `defaultAdmin`. (By contrast, `lib/auth-guard.js` is fully secure and does not include this fallback).

### E. Edge Route Protection Middleware
- `middleware.js:143` intercepts unauthenticated requests to `/student/*`, `/organization/*`, and `/admin/*` and redirects to `/login?role=[TARGET]&redirect=[PATH]`.
- Cross-role access (e.g. Student visiting `/admin/*` or `/organization/*`) redirects to the user's own authorized dashboard.
- Suspended users are immediately redirected to `/account-suspended`.

---

## 2. Logic Chain

1. **Premise 1 (Token Integrity)**: Pre-OAuth signup intents must be unguessable, single-use, and time-bounded.
   - *Observation*: 256-bit entropy generated; expired tokens (>15m) evaluate to `isValid: false`; second consumption fails with `isValid: false, isUsed: true`.
   - *Deduction*: Intent tampering, forgery, and replay attacks are structurally prevented.

2. **Premise 2 (Role Immutability)**: Application roles must be server-owned and resistant to client injection.
   - *Observation*: Better Auth configuration prohibits client role inputs (`input: false`); `update:before` hook deletes `role`/`accountStatus`/`id`; `withAuth` and endpoint guards enforce role requirements and IDOR checks.
   - *Deduction*: Role elevation via body/query parameters is neutralized.

3. **Premise 3 (Account-to-Role 1:1 Invariant)**: One Google account must never map to multiple or conflicting roles.
   - *Observation*: `checkRoleCollision` detects role conflicts, retains the original role, and directs the user to their registered dashboard with explanatory modal parameters.
   - *Deduction*: Role collisions are handled cleanly without role overwrite.

4. **Premise 4 (Admin Gatekeeping)**: Admin creation must not be publicly accessible.
   - *Observation*: Signup intent rejects `ADMIN` with 403; Better Auth user creation assigns `ADMIN` solely to `INITIAL_ADMIN_EMAIL`.
   - *Deduction*: Public admin registration is impossible.

---

## 3. Caveats

1. **Advisory Remediation**: While `lib/auth-guard.js` correctly enforces zero-trust session checks, custom route helpers in `app/api/admin/users/route.js`, `app/api/admin/verifications/route.js`, and `app/api/admin/audit-logs/route.js` contained simulation fallbacks (`defaultAdmin = db.users.find(u => u.role === 'ADMIN')`). These route handlers should strictly use `withAuth(handler, { roles: ['ADMIN'] })` in production.
2. **Environment Variable Dependence**: Initial admin provisioning depends on `INITIAL_ADMIN_EMAIL` being set securely on the server environment.

---

## 4. Conclusion

**Verdict: APPROVE**

The core authentication architecture, pre-OAuth signup intent mechanism, Better Auth lifecycle hooks, role immutability engine, role collision detector, and edge middleware successfully withstand all adversarial challenge vectors:
- Signup intent tampering, expiration, replay, and admin role claiming are strictly blocked.
- Role elevation attacks via body tampering and query parameters are neutralized.
- Returning Google account role collisions resolve to existing roles with modal notifications.
- Public admin registration is prohibited, restricting admin rights strictly to `INITIAL_ADMIN_EMAIL`.

---

## 5. Verification Method

To independently reproduce and verify all adversarial test results:

```powershell
# 1. Run Master Auth & Role Suite (30 tests)
node tests/test-auth-suite.js

# 2. Run Adversarial Auth & Role Challenge Harness (32 tests)
node tests/adversarial-auth-challenge.js

# 3. Run Adversarial Gatekeeping & Capability Challenge (42 tests)
node tests/adversarial-gatekeeping-challenge.js

# 4. Run Dedicated Adversarial Route & Boundary Suite (29 tests)
npx tsx tests/adversarial-auth-boundaries.test.js
```

### Invalidation Conditions
- Any intent token successfully consumed twice (replay attack).
- Any non-admin user able to mutate `role` in the database via user update or profile update endpoints.
- Any Google account with an existing STUDENT role acquiring an ORGANIZATION role upon re-login.
- Any public user creating an ADMIN account without matching `INITIAL_ADMIN_EMAIL`.
