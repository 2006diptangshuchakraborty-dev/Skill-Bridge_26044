## 2026-08-23T13:51:00Z
Task received:
You are the Role Security & Intent Explorer for Milestone 2 (M2).
Your working directory is e:/sih_2026_044/.agents/m2_role_intent_explorer/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Task:
1. Investigate and design the tamper-proof role assignment system:
   - `signup_intents` table in `db/schema.js` (id, token [32-byte crypto hex], role [STUDENT|ORGANIZATION], email, expiresAt, usedAt, createdAt).
   - Server endpoint `app/api/auth/signup-intent/route.js`:
     - Accepts POST `{ role: 'STUDENT' | 'ORGANIZATION' }`
     - Validates role strictly against allowed list (`STUDENT`, `ORGANIZATION`).
     - Rejects `ADMIN` role with 403 Forbidden ("Admin registration is prohibited").
     - Generates cryptographically secure token (using `crypto.randomBytes(32).toString('hex')`) with 15-minute expiration.
     - Stores intent in DB.
     - Sets secure httpOnly cookie or returns token for OAuth redirect state parameter.
   - Better Auth Lifecycle Hooks / Interceptors (`lib/auth.js`):
     - `databaseHooks.user.create.before`: Resolves intent token, assigns validated role to `user.role`, sets initial `accountStatus` (`ACTIVE` for STUDENT, `PENDING` for ORGANIZATION), marks intent as used.
     - Strict Admin Provisioning: Only allow ADMIN role if email equals `INITIAL_ADMIN_EMAIL` or if provisioned by existing admin.
     - Role Immutability: Returning users logging in via Google OAuth must retain their existing DB role. If a returning user tries to sign up with a different role intent, detect the collision, retain the original role, and return a collision response/modal trigger.
     - Tamper-proofing: Any client request attempting to update `user.role` via generic update APIs must be stripped/ignored.
2. Write your implementation blueprint to `e:/sih_2026_044/.agents/m2_role_intent_explorer/m2_blueprint.md` and write `e:/sih_2026_044/.agents/m2_role_intent_explorer/handoff.md`.
3. Send a completion message when done.
