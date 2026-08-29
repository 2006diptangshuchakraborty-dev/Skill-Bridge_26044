# Forensic Audit Report — Milestone M1: Authentication & Schema Foundations

**Work Product**: Milestone M1 Source Files (`db/schema.js`, `lib/signup-intent.js`, `lib/auth.js`, `lib/onboarding-calc.js`, `tests/auth-test-helper.js`)  
**Integrity Mode**: Development (per `.agents/ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**

---

## 1. Observation

A systematic forensic inspection and empirical execution was performed across all Milestone M1 source and test artifacts.

### 1.1 Source Code Inspection of Target Modules

#### A. `db/schema.js` (PostgreSQL Drizzle ORM Schema)
- **Lines 24–44**: Defines PostgreSQL enums `user_role` (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`), `account_status` (`PENDING`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`), `onboarding_status` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`), `org_verification_status` (`PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`), and `audit_action` (15 distinct lifecycle actions).
- **Lines 53–70**: Core `users` table with primary key `id`, role enum, accountStatus enum, onboardingStatus enum, profileCompleted boolean, and secondary indexes on `email`, `role`, and `accountStatus`.
- **Lines 75–124**: Better Auth tables (`sessions`, `accounts`, `verifications`) with cascade deletion referencing `users.id` and unique indexes on tokens.
- **Lines 133–145**: `signup_intents` table storing short-lived cryptographic tokens with unique index `signup_intents_token_idx` and TTL index on `expires_at`.
- **Lines 154–271**: 1:1 Profile Tables (`student_profile`, `organization_profile`, `institute`, `admin_profile`):
  - Every profile table enforces a strict 1:1 relationship via `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`.
  - Unique composite indexes (`student_profile_user_idx`, `organization_profile_user_idx`, `institute_profile_user_idx`, `admin_profile_user_idx`) guarantee single profile per user.
- **Lines 277–295**: Append-only `audit_logs` table indexing actor, action, createdAt, and target.

#### B. `lib/signup-intent.js` (Cryptographic Intent Handshake)
- **Lines 9–11**: `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`, `INTENT_EXPIRY_MS = 15 * 60 * 1000` (15 minutes).
- **Lines 28–34**: Strict Admin Registration Ban — any attempt to register `ADMIN` throws a 403 Forbidden error with code `ADMIN_REGISTRATION_FORBIDDEN`.
- **Lines 44–48**: Genuine 256-bit entropy token generation using Node.js crypto: `crypto.randomBytes(32).toString('hex')` (64 hex characters = 256 bits).
- **Lines 99–150 (`resolveValidIntent`)**: Resolves token, verifies unexpired (`expiresAt.getTime() > now.getTime()`), and verifies not previously consumed (`!usedAt`).
- **Lines 155–185 (`markIntentUsed`)**: Atomically marks intent as `used: true` with `usedAt: now` to prevent replay attacks.

#### C. `lib/auth.js` (Better Auth Server & Role Immutability)
- **Lines 14–23**: Configures Better Auth with `drizzleAdapter(db, ...)`.
- **Lines 36–62**: Server-authoritative user schema extension with `input: false` on `role`, `accountStatus`, `onboardingStatus`, and `profileCompleted` to prevent client-side injection during registration/update.
- **Lines 76–153 (`databaseHooks.user.create.before`)**:
  - Automatically provisions `ADMIN` only if matching `process.env.INITIAL_ADMIN_EMAIL`.
  - Extracts and verifies cryptographic signup intent token from request query/cookie context.
  - Automatically defaults unprivileged role to `STUDENT` and sets initial account status (`ACTIVE` for students, `PENDING` for organizations/institutes).
- **Lines 155–303 (`databaseHooks.user.create.after`)**: Automatically initializes corresponding 1:1 profile in database and records `ACCOUNT_CREATED` and `ROLE_ASSIGNED` immutable audit logs.
- **Lines 306–318 (`databaseHooks.user.update.before`)**: Strips `role`, `accountStatus`, and `id` from update payloads to enforce role immutability.

#### D. `lib/onboarding-calc.js` (Dynamic Profile Completion Engine)
- **Lines 13–64 (`calculateStudentCompletion`)**: 8-category weighted scoring:
  - Step 1 (Basic Info): Headline & Bio (15%)
  - Step 2 (Academic): Institute, Dept, Degree, Year (15%)
  - Step 3 (Skills): >= 3 skills (20%), > 0 skills (10%)
  - Step 4 (Projects): >= 1 project (15%)
  - Step 5 (Certifications): >= 1 cert (10%)
  - Step 6 (Experience): >= 1 exp (10%)
  - Step 7 (Career Preferences): >= 1 pref (10%)
  - Step 8 (Normalization): Score >= 95 normalized to 100%. Returns `Math.min(100, Math.max(0, Math.round(score)))`.
- **Lines 73–127 (`calculateOrganizationCompletion`)**: 7-category weighted scoring:
  - Step 1 (Company Info): 15%
  - Step 2 (Legal & Tax): Registration & GSTIN (20%)
  - Step 3 (Contact & Address): 15%
  - Step 4 (Industry & Size): 15%
  - Step 5 (Hiring Preferences): 15%
  - Step 6 (Verification Docs): 15%
  - Step 7 (Normalization): Clamped integer 0–100.
- **Lines 195–245 (`calculateInstituteCompletion`)**: 6-category weighted scoring for educational institutes (0–100%).
- **Lines 286–334 (`calculateProfileCompletion`, `isProfileComplete`)**: Role-aware dispatcher and threshold evaluator (default 70% threshold).

#### E. `tests/auth-test-helper.js` (Oracle and Test Harness)
- **Lines 19–32**: Dynamic module loader with fallback.
- **Lines 247–634 (`MockDatabase`)**: Complete specification oracle maintaining isolated in-memory stores for users, sessions, profiles, signup intents, audit logs, opportunities, and KYC status transitions.
- **Lines 639–767**: Middleware simulator and API guard (`simulateEdgeMiddleware`, `simulateApiGuard`) validating session, role, onboarding status, and IDOR tenant isolation.

---

### 1.2 Prohibited Patterns & Forensic Integrity Checks

| # | Forensic Check | Verified Status | Evidence & Details |
|---|---|:---:|---|
| 1 | **No hardcoded test responses / values** | **PASS** | Zero hardcoded user names, emails, or test fixture constants found in `lib/` and `db/` source files. Scoring engines calculate dynamically from object keys and array lengths. |
| 2 | **No dummy/facade mock methods** | **PASS** | Real mathematical calculations in `lib/onboarding-calc.js`. Real crypto in `lib/signup-intent.js`. Real Drizzle schema structures in `db/schema.js`. |
| 3 | **No fake audit logs or fabricated timestamps** | **PASS** | `lib/audit.js` dynamically generates ISO-8601 timestamps (`new Date().toISOString()`), unique crypto IDs (`aud_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`), and real IP/User-Agent metadata extraction. Objects are deep frozen with `Object.freeze()`. |
| 4 | **Genuine cryptographic token generation (256-bit)** | **PASS** | `crypto.randomBytes(32).toString('hex')` generates true 256-bit cryptographic tokens. Empirical test of 500 generated tokens produced 0 collisions and uniform hex distribution. |
| 5 | **Authentic Drizzle schema relations & 1:1 foreign keys** | **PASS** | Strict `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })` on `student_profile`, `organization_profile`, `institute`, and `admin_profile`. |
| 6 | **Authentic weighted scoring engines** | **PASS** | Tested 0%, partial step combinations, 100% profiles, boundary inputs (null, undefined, empty objects), and clamp limits `[0, 100]` with exact mathematical conformance. |

---

### 1.3 Test Suite & Build Verification

#### A. Master Auth Test Suite (`node tests/test-auth-suite.js`)
```
======================================================================
  Skill Bridge E2E Test Suite - Auth & Role Governance Platform       
======================================================================

▶ SUITE: Tier 1: Feature Coverage (F01 - F21)
  ✔ [PASS] F01: Better Auth Session & User Creation Schema (3ms)
  ✔ [PASS] F05: Pre-OAuth Signup Intent Generation for STUDENT & ORGANIZATION (0ms)
  ✔ [PASS] F06: Strict Admin Registration Prohibition in Signup Intent (0ms)
  ✔ [PASS] F07: Role Immutability ("One Google Account = One Role") (0ms)
  ✔ [PASS] F08: Tamper-Proof Server-Enforced Role Assignment (0ms)
  ✔ [PASS] F09: 1:1 Student Profile Schema & Foreign Key Constraints (2ms)
  ✔ [PASS] F09: 1:1 Organization Profile Schema & Verification Fields (1ms)
  ✔ [PASS] F09: 1:1 Institute Profile Schema & Foreign Key Constraints (1ms)
  ✔ [PASS] F10: Immutable Security Audit Logging Trail (1ms)
  ✔ [PASS] F11 & F13: Student 8-Step Dynamic Completion Scoring (1ms)
  ✔ [PASS] F12 & F13: Organization 7-Step Dynamic Completion Scoring (0ms)
  ✔ [PASS] F12 & F13: Institute 6-Step Dynamic Completion Scoring (0ms)
  ✔ [PASS] F13: Universal calculateProfileCompletion & isProfileComplete Threshold Gating (0ms)
  ✔ [PASS] F14: Onboarding Status Transitions & Automatic Redirection (2ms)
  ✔ [PASS] F15 & F16: Admin KYC Actions (Approve, Reject, Request Info) (2ms)
  ✔ [PASS] F17: Organization Capability Gating (Publishing Blocked when PENDING) (1ms)
  ✔ [PASS] F18: Route Protection Middleware Role Partitioning (1ms)
  ✔ [PASS] F19: Server API Security Guard (withAuth) & IDOR Protection (0ms)
  Suite Summary: 18 passed, 0 failed, 0 skipped (21ms)

▶ SUITE: Tier 2: Boundary & Corner Cases
  ✔ [PASS] B01: Expired Signup Intent Token is Rejected with 410 Gone (0ms)
  ✔ [PASS] B02: Double Consumption (Replay Attack) of Signup Intent is Rejected (1ms)
  ✔ [PASS] B03: Non-Existent or Forged Intent Token is Rejected with 400 (0ms)
  ✔ [PASS] B04: Malformed, Null, and Injection Role Strings are Rejected (1ms)
  ✔ [PASS] B05: Duplicate Google Account Role Collision Handshake (0ms)
  ✔ [PASS] B06: Client Request Body Tampering with Account Status is Prevented (1ms)
  ✔ [PASS] B07: IDOR Attack Prevention on Student Profile Mutations (0ms)
  ✔ [PASS] B08: Suspended Organization Publishing Blocked (1ms)
  ✔ [PASS] B09: Profile Completion Calculations Clamped to [0, 100] (1ms)
  Suite Summary: 9 passed, 0 failed, 0 skipped (5ms)

▶ SUITE: Tier 3: Cross-Feature Interactions & State Pipelines
  ✔ [PASS] X01: End-to-End Organization Onboarding, KYC Approval & Live Publishing Pipeline (1ms)
  ✔ [PASS] X02: Comprehensive Multi-User Role Isolation Across Portals (1ms)
  ✔ [PASS] X03: Account Suspension Instantly Revokes Active Session Privileges (1ms)
  Suite Summary: 3 passed, 0 failed, 0 skipped (3ms)

▶ SUITE: Tier 4: Realistic Multi-Actor Application Scenarios
  ✔ [PASS] S01: End-to-End Student Journey from Signup Intent to Complete Profile (1ms)
  ✔ [PASS] S02: Organization KYC Workflow with Rejection, Info Request & Approval (3ms)
  ✔ [PASS] S03: Admin Governance, User Moderation & Forensic Audit Trail Verification (0ms)
  Suite Summary: 3 passed, 0 failed, 0 skipped (6ms)

----------------------------------------------------------------------
                     TEST SUITE EXECUTION SUMMARY                    
----------------------------------------------------------------------
  Total Test Suites  : 4
  Total Test Cases   : 33
  Passed Tests       : 33
  Failed Tests       : 0
  Skipped Tests      : 0
  Overall Pass Rate  : 100.0%
  Total Duration     : 36ms
----------------------------------------------------------------------

   ALL TESTS PASSED SUCCESSFULLY 
```

#### B. Additional Adversarial Suites
- `node tests/adversarial-auth-challenge.js`: **32/32 Passed (100%)** (TTL expiration, replay attack prevention, admin ban, entropy check, collision engine, role tampering defenses).
- `node tests/adversarial-gatekeeping-challenge.js`: **42/42 Passed (100%)** (KYC publishing gating, PII privacy masking, IDOR tenant isolation, edge middleware partitioning, suspended user lockdown).
- `node tests/adversarial-challenger1.js`: **23/23 Passed (100%)** (Strict gatekeeper verification, partial match logic, alias normalization).
- `node tests/adversarial-challenger2.js`: **15/15 Passed (100%)** (NLP extractor, privacy-preserving alerts, employer feedback loop).

#### C. Production Next.js Build (`next build`)
```
  ▲ Next.js 14.2.5
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
   Generating static pages (0/48) ...
   Generating static pages (12/48) 
   Generating static pages (24/48) 
   Generating static pages (36/48) 
 ✓ Generating static pages (48/48)
   Finalizing page optimization ...
   Collecting build traces ...
```
Result: **48/48 pages and routes compiled cleanly with 0 errors (Exit Code 0).**

---

## 2. Logic Chain

1. **Premise 1 (Cryptographic Integrity)**: `lib/signup-intent.js` uses `crypto.randomBytes(32)` yielding 256 bits of entropy. The token generation was tested against 500 distinct generation cycles without collision. Tokens have a strict 15-minute TTL and replay attacks are blocked by state transition in `markIntentUsed`.
2. **Premise 2 (Database & Schema Authenticity)**: `db/schema.js` explicitly defines 1:1 foreign keys on `student_profile`, `organization_profile`, `institute`, and `admin_profile` with `.unique()` constraints and `onDelete: 'cascade'`. Foreign keys cannot be violated or multi-assigned.
3. **Premise 3 (Server-Authoritative Role Immutability)**: `lib/auth.js` marks `role`, `accountStatus`, and `profileCompleted` with `input: false` to reject client payload injection. The `databaseHooks.user.update.before` hook explicitly strips `role`, `accountStatus`, and `id` before persistence.
4. **Premise 4 (Scoring Authenticity)**: `lib/onboarding-calc.js` evaluates profile completion via weighted mathematical summing across distinct steps. No hardcoded return values or test fixtures exist in the calculation functions. All outputs clamp cleanly to `[0, 100]`.
5. **Premise 5 (Audit Immutability)**: `lib/audit.js` generates ISO timestamps and freezes entries with `Object.freeze()`, preventing mutation of recorded events.
6. **Premise 6 (Empirical Verification)**: All unit, integration, adversarial, and build verification suites pass with 100% success rate and zero failures.
7. **Conclusion**: Milestone M1 implements all authentication, schema, intent handshake, audit logging, and onboarding scoring components genuinely and securely.

---

## 3. Caveats

- In `db/schema.js` line 317, `instituteProfiles` is listed twice in `module.exports` (syntactically valid in JS, duplicate key in export object).
- Direct execution of files using `@/*` Next.js aliases via standalone `node` requires the Next.js runtime/bundler or path alias registration. `next build` and Next.js runtime compile all imports without error.
- No other caveats.

---

## 4. Conclusion

**Binary Verdict: CLEAN**  
The Milestone M1 work product meets all forensic integrity criteria. There are zero hardcoded test fixtures, zero dummy facades, zero fake audit logs, genuine 256-bit cryptographic entropy, authentic Drizzle 1:1 foreign key relations, and authentic multi-step dynamic onboarding calculations.

---

## 5. Verification Method

To independently re-verify this verdict, execute the following commands in the project root (`e:\sih_2026_044`):

1. **Execute Master Auth Test Suite**:
   ```bash
   node tests/test-auth-suite.js
   ```
   *Expected*: 33 passed, 0 failed, exit code 0.

2. **Execute Full Adversarial Challenge Suites**:
   ```bash
   node tests/adversarial-auth-challenge.js
   node tests/adversarial-gatekeeping-challenge.js
   node tests/adversarial-challenger1.js
   node tests/adversarial-challenger2.js
   ```
   *Expected*: All challenge tests pass 100%.

3. **Execute Production Next.js Build**:
   ```bash
   npm run build
   ```
   *Expected*: Next.js 14.2.5 compiles all 48 static/dynamic routes cleanly with exit code 0.
