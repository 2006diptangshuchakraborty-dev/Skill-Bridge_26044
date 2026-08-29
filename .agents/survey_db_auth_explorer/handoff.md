# Handoff Report — Database Schema, Drizzle ORM & Better Auth Investigation

## 1. Observation
- **Database Schema & Drizzle ORM Configuration**:
  - `drizzle.config.js` (lines 14–23) configures `dialect: "postgresql"`, `schema: "./db/schema/index.js"`, `out: "./drizzle"`, with `strict: true` and `verbose: true`.
  - `db/index.js` (lines 1–35) exports `sql` (Neon client), `schema`, and `db = drizzle({ client: sql, schema })`.
  - `db/schema/user.js` defines PostgreSQL enums `user_role` (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`), `account_status`, `onboarding_status`, and `org_verification_status`.
  - 10 active PostgreSQL tables exist in schema: `user`, `session`, `account`, `verification` (`db/schema/user.js`), `students` (`db/schema/student.js`), `industries` (`db/schema/industry.js`), `institutes` (`db/schema/institute.js`), `questions` (`db/schema/questions.js`), `ratings` (`db/schema/ratings.js`), and `mcq_questions` (`db/schema/mcqQuestions.js`).
  - `user.email` is defined with `.notNull().unique()` (`db/schema/user.js:38`) and indexed with `uniqueIndex("user_email_idx")`.
  - `account` table defines composite unique index `uniqueIndex("account_issuer_account_idx").on(table.issuer, table.accountId)` (`db/schema/user.js:101-104`).

- **Better Auth Integration & Role Security**:
  - `lib/auth.js` (lines 67–86) attaches `drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } })`.
  - `lib/auth.js` (lines 138–181) defines `user.additionalFields` for `role` (default "STUDENT", `input: false`), `accountStatus` (default "PENDING", `input: false`), `onboardingStatus` (default "NOT_STARTED", `input: false`), and `profileCompleted` (default `false`, `input: false`).
  - `lib/auth.js` (lines 213–440) hooks `databaseHooks.user.create.before` to resolve pre-OAuth signup intent tokens from query parameters or cookies via `resolveValidIntent()` and stamps the user's role on account creation.
  - `lib/auth.js` (lines 446–466) hooks `databaseHooks.user.update.before` to delete `id`, `role`, `accountStatus`, `onboardingStatus`, and `profileCompleted` from update payloads.

- **Role Collision & Single Account Invariant**:
  - `lib/role-collision.js` (lines 15–49) implements `checkRoleCollision({ existingUserRole, intentRole })`. If an existing `STUDENT` user logs in during an `INDUSTRY` flow, collision is flagged (`hasCollision: true`).
  - `app/profile/complete/page.jsx` (lines 43–67) intercepts collision, invokes `authClient.signOut()`, and redirects to `/auth?collision=true&existingRole=...&attemptedRole=...` to display `RoleCollisionModal`.

- **Profile Persistence**:
  - `app/api/profile/setup/route.js` (lines 566–697, 719–1127) resolves the authenticated user using `auth.api.getSession({ headers: request.headers })`.
  - Strips client-provided IDs and roles via `PROTECTED_FIELDS` (`app/api/profile/setup/route.js:54-67, 848-856`).
  - Executes dynamic schema inspection and UPSERTs into `students`, `industries`, or `institutes`.

- **Observed Deficiencies & Gaps**:
  - `app/api/profile/setup/route.js` (lines 999–1062) saves profile data to `students`/`industries`/`institutes` tables and returns `{ onboardingStatus: "COMPLETED", profileCompleted: true }`, but **does NOT** update `user.onboardingStatus` or `user.profileCompleted` in the `user` table in PostgreSQL.
  - `lib/signup-intent.js` (lines 64–73, 109–120, 162–170) attempts to query `schema.signupIntents`, which is missing from `db/schema/user.js`.
  - `scripts/test-db.js` and `scripts/migrate-neon-direct.js` call `dotenv.config()` without `{ path: ".env.local" }`.
  - `scripts/verify-db.js` failed 18 assertions because it was written against legacy table names (`student_profile`, `organization_profile`, `institute`, `rating_interactions`) prior to the `20260828075151_square_angel` migration.

---

## 2. Logic Chain
1. **Single Identity Enforcement**:
   - `user.email` is unique at the PostgreSQL level (`user_email_idx`).
   - When an existing Google user logs in, Better Auth matches their email to their existing row in `user`.
   - Better Auth does not allow multiple user rows with the same email.
   - Therefore, a single Google email cannot possess multiple conflicting accounts in the database.

2. **Role Immutability**:
   - Because `user.role` has `input: false` in Better Auth configuration and `user.update.before` strips `role`, users cannot escalate or mutate their role through client payloads.
   - Initial role assignment is governed entirely by server-side intent verification in `user.create.before`.

3. **Root Cause of Onboarding Redirect Loop**:
   - When a user submits their profile setup via `POST /api/profile/setup` with `action: "COMPLETE_ONBOARDING"`, the endpoint inserts/updates the `students`, `industries`, or `institutes` table.
   - However, the `user` table row is left untouched (`onboarding_status = 'NOT_STARTED'`, `profile_completed = false`).
   - When the user subsequently visits `/student/dashboard` or `/industry/dashboard`, `middleware.js` (lines 165, 275, 304, 323) checks the user session:
     `if (!u.profileCompleted || u.onboardingStatus !== 'COMPLETED') redirect to /profile/setup`
   - Because the `user` table was never updated, the session retains `profileCompleted: false` and `onboardingStatus: "NOT_STARTED"`, resulting in a redirect loop.

4. **Multi-Tenant Serverless Risk**:
   - Because `signupIntents` table is missing from Drizzle schema, `lib/signup-intent.js` catches the Drizzle error and falls back to in-memory JSON (`data/db.json`).
   - In a multi-instance serverless deployment, pre-OAuth intent tokens stored in node process memory are inaccessible across instances. Adding `signup_intents` to Neon PostgreSQL resolves this.

---

## 3. Caveats
- `scripts/verify-db.js` contains obsolete table name assertions (`student_profile`, `organization_profile`, `institute`) and fails against the modern schema, whereas `scripts/test-db.js`, `tests/test-auth-onboarding-e2e.js` (119/119 passing), and `tests/test-tier5-adversarial-auth.js` (45/45 passing) test the current schema.
- This investigation was conducted in read-only analysis mode without modifying project application files.

---

## 4. Conclusion
The database schema, Drizzle ORM configuration, and Better Auth integration provide a robust, single-identity role architecture that satisfies R1 and R4 requirements. However, **one high-priority bug** (`user` table onboarding state not updating upon profile save in `/api/profile/setup`) causes onboarding redirect loops, and **one architectural gap** (missing `signup_intents` table in Drizzle schema) forces intent tokens to fall back to in-memory storage.

### Actionable Fix Recommendations for Implementers:
1. **Update `app/api/profile/setup/route.js`**: In `saveProfile()`, execute `await db.update(user).set({ onboardingStatus: finalStatus, profileCompleted: isCompleted, updatedAt: new Date() }).where(eq(user.id, user.id));`.
2. **Add `signupIntents` to `db/schema/user.js`**: Define the `signup_intents` table with columns `id`, `token`, `role`, `email`, `expiresAt`, `used`, `usedAt`, `createdAt` and export it.
3. **Standardize `.env.local` loading in scripts**: Ensure `scripts/test-db.js`, `scripts/migrate-neon-direct.js`, and `scripts/seed.js` load `.env.local`.

---

## 5. Verification Method
1. **Drizzle Migration Check**:
   ```bash
   npm run db:check
   ```
   *Expected*: Passes with 0 schema drift errors.

2. **Live Neon Database Connectivity & CRUD Verification**:
   ```bash
   node --env-file=.env.local scripts/test-db.js
   ```
   *Expected*: Schema verification passes (all 9 tables exist) and live CRUD transaction rollback succeeds.

3. **Master Auth & Onboarding Automated E2E Test Suite**:
   ```bash
   npm run test:auth
   ```
   *Expected*: All 119 test assertions across Tiers 1–4 pass (100% pass rate).

4. **Tier 5 Adversarial Auth & Concurrency Suite**:
   ```bash
   npm run test:tier5
   ```
   *Expected*: All 45 adversarial test cases pass (100% hardened).
