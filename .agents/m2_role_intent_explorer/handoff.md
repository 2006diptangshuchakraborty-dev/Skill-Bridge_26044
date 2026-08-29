# Milestone 2 (M2) Handoff Report: Role Security & Intent Architecture

## 1. Observation
1. **Authoritative Specification & Core Principle**:
   - `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md` (lines 18-23):
     > "R2. Secure Role Model & Tamper-Proof Role Assignment"
     > "Define server-owned role model (STUDENT, ORGANIZATION, ADMIN). Users must never be able to mutate their role via client requests, local storage, query parameters, or generic user update endpoints."
     > "Implement short-lived server-side signup intents (signup_intents table) with cryptographic tokens to link pre-OAuth role selection (Student vs Organization) securely to account creation."
     > "Strict Admin Signup Rule: Prohibit public Admin registration completely. Provision Admin accounts strictly via server seed, environment configuration (INITIAL_ADMIN_EMAIL), or existing admin invitation."
     > "Enforce Role Immutability & One-Account Rule: Returning Google accounts must always resolve to their existing role. Attempting to sign up with a different role must be rejected with a user-friendly modal ('Account already registered as [ROLE]')."
2. **Project Architecture Contract**:
   - `e:/sih_2026_044/PROJECT.md` (lines 66-70):
     > "Signup Intent (app/api/auth/signup-intent/route.js) <-> Client Auth UI: Request: POST /api/auth/signup-intent with { role: 'STUDENT' | 'ORGANIZATION' }; Response: { success: true, intentToken: string, expiresAt: string }; Rejection: Role ADMIN -> 403 Forbidden with { error: 'Admin registration prohibited' }."
   - `e:/sih_2026_044/PROJECT.md` (lines 73-75):
     > "Tables: user (id, name, email, emailVerified, image, role [STUDENT|ORGANIZATION|ADMIN], accountStatus [ACTIVE|PENDING|SUSPENDED|DEACTIVATED], onboardingStatus [NOT_STARTED|IN_PROGRESS|COMPLETED], createdAt, updatedAt); signup_intents (id, token, role, email, expiresAt, usedAt, createdAt)"
3. **Environment & Dependency Framework**:
   - Next.js 14.2.5 App Router with Node.js `crypto` module built-in (`crypto.randomBytes(32).toString('hex')`).
   - Drizzle ORM with Neon PostgreSQL serverless driver (`@neondatabase/serverless` & `drizzle-orm`) and in-memory mock fallback support.

---

## 2. Logic Chain
1. **Pre-OAuth Role Ambiguity Resolution**:
   - In standard Google OAuth flows, Google returns user identity (`email`, `name`, `picture`) but has zero concept of application roles (`STUDENT` vs `ORGANIZATION`).
   - To link a user's selection on `/register` to the eventual Google OAuth account creation without trusting client parameters on callback, the server must issue a cryptographically signed/random intent token before the OAuth dance begins.
2. **Cryptographic Intent Ledger (`signup_intents`)**:
   - Generating a 32-byte (256-bit entropy) hex token guarantees zero predictability / brute-force resistance.
   - Setting a 15-minute expiration (`expiresAt = Date.now() + 900000`) prevents stale token reuse.
   - Setting `usedAt` on first account creation prevents replay attacks.
   - Setting the token in an `httpOnly`, `sameSite: 'lax'`, `secure` cookie (`sb_signup_intent`) ensures that the callback request from Google carries the token automatically to the Better Auth backend.
3. **Public Admin Prohibition & Strict Provisioning**:
   - The signup intent endpoint must validate `role` against `['STUDENT', 'ORGANIZATION']`.
   - If an attacker requests `role === 'ADMIN'`, the endpoint returns `403 Forbidden` (`{ error: 'Admin registration is prohibited' }`).
   - In `databaseHooks.user.create.before`, any incoming user is compared against `process.env.INITIAL_ADMIN_EMAIL`. Only if the email matches is the `ADMIN` role granted automatically with `accountStatus: 'ACTIVE'` and `onboardingStatus: 'COMPLETED'`.
4. **Lifecycle Hooks & Account Status Initialization**:
   - For `STUDENT`: `role = 'STUDENT'`, `accountStatus = 'ACTIVE'`, `onboardingStatus = 'NOT_STARTED'`.
   - For `ORGANIZATION`: `role = 'ORGANIZATION'`, `accountStatus = 'PENDING'` (KYC verification required before posting), `onboardingStatus = 'NOT_STARTED'`.
   - After creation, `databaseHooks.user.create.after` triggers audit logs for `ACCOUNT_CREATED` and `ROLE_ASSIGNED`.
5. **Tamper-Proofing Client Updates**:
   - To prevent privilege escalation post-signup, `databaseHooks.user.update.before` unconditionally deletes `role`, `accountStatus`, and `id` from the update payload.
6. **Role Immutability & Collision Detection**:
   - When a returning user logs in with Google, Better Auth finds the existing user record in the database.
   - If the user had set a new signup intent with a mismatched role, the server detects that `existingUser.role !== intent.role`.
   - The user's role is never changed. The intent cookie is cleared, and the application triggers a role collision signal so the UI informs the user that their account is already registered under their original role.

---

## 3. Caveats
1. **Mock / Development Mode Fallback**:
   - When running in local unit test environments without a live Neon PostgreSQL database, `lib/signup-intent.js` and `lib/auth.js` include synchronous/in-memory fallback handling via `lib/db.js` to ensure 100% CI test suite pass rate.
2. **Third-Party Cookies on Cross-Domain OAuth**:
   - The `sb_signup_intent` cookie must use `sameSite: 'lax'` so that when Google redirects back from `accounts.google.com` to the callback URL, the browser transmits the cookie.

---

## 4. Conclusion
The M2 Role Security & Intent Architecture design is complete, rigorous, and fully specified in `e:/sih_2026_044/.agents/m2_role_intent_explorer/m2_blueprint.md`.

It provides:
1. Complete Drizzle ORM schema for `signup_intents` and `user`.
2. Clean helper module `lib/signup-intent.js` for 32-byte crypto token generation, expiry validation, and consumption.
3. Secure Next.js App Router endpoint `app/api/auth/signup-intent/route.js` with 403 Admin rejection and httpOnly cookie issuance.
4. Better Auth configuration in `lib/auth.js` with `databaseHooks.user.create.before`, `create.after`, and `update.before`.
5. Role immutability and collision detection helper `lib/role-collision.js`.

---

## 5. Verification Method
1. **Inspect Blueprint File**:
   - View `e:/sih_2026_044/.agents/m2_role_intent_explorer/m2_blueprint.md` to verify all schema, route, and hook specifications.
2. **Test Intent Creation & Rejection**:
   - Run unit/integration tests against `lib/signup-intent.js` and `app/api/auth/signup-intent/route.js`:
     - Assert `createSignupIntent({ role: 'STUDENT' })` returns 64-char hex token with 15m expiry.
     - Assert `createSignupIntent({ role: 'ADMIN' })` throws 403 Forbidden.
     - Assert `createSignupIntent({ role: 'INVALID' })` throws 400 Bad Request.
3. **Test Role Immutability & Tamper-Proofing**:
   - Assert `databaseHooks.user.update.before({ role: 'ADMIN', name: 'New Name' })` strips `role` and retains `name`.
   - Assert returning user OAuth maintains existing DB role and triggers collision when intent role differs.
4. **Project Test Suite Execution**:
   - Run `node tests/test-runner.js` and `node tests/adversarial-challenger1.js`.
