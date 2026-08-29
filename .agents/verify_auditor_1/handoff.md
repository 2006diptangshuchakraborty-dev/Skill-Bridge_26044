# Forensic Audit Report — Skill Bridge Auth & Role System

**Work Product**: Skill Bridge Auth & Role System (`lib/*`, `app/*`, `db/*`, `middleware.js`, `tests/*`)  
**Auditor**: verify_auditor_1 (Forensic Integrity Auditor)  
**Profile**: General Project (Development Mode with Strict Integrity Mandate)  
**Verdict**: **INTEGRITY VIOLATION** (REJECTED)

---

## 1. Observation

### Observation 1.1: Next.js Production Build Failure (`next build`)
- **Command executed**: `npm run build` (`next build`)
- **Exit code**: `1`
- **Verbatim Error Output**:
```
> sih-2026-skill-mapping-platform@1.0.0 build
> next build

  ▲ Next.js 14.2.5
  - Environments: .env

   Creating an optimized production build ...
Failed to compile.

./lib/auth.js
Error: 
  x Expected ',', got '!'
    ,-[E:\sih_2026_044\lib\auth.js:11:1]
 11 |   emailAndPassword: { enabled: true },
 12 |   socialProviders: {
 13 |     apple: {
 14 |       clientId: process.env.APPLE_CLIENT_ID!,
    :                                            ^
 15 |       clientSecret: process.env.APPLE_CLIENT_SECRET!,
 16 |     },
 17 |   },
    `----

Caused by:
    Syntax Error

Import trace for requested module:
./lib/auth.js
./app/api/auth/[...all]/route.ts

> Build failed because of webpack errors
```

### Observation 1.2: `lib/auth.js` Implementation Regression & Spec Contradiction
- **File**: `e:/sih_2026_044/lib/auth.js`, lines 1–19
- **Direct quote**:
```javascript
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const database = new Pool({
  connectionString: "postgresql://postgres:password@localhost:5432/database",
});

export const auth = betterAuth({
  database: database,
  baseURL: "http://localhost:3000/",
  emailAndPassword: { enabled: true },
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
  },
});
```
- **Contradiction with ORIGINAL_REQUEST.md (R1)**:
  - R1 specifies Google OAuth provider and Drizzle ORM schemas connected to Neon PostgreSQL.
  - `lib/auth.js` currently instantiates a raw `pg` Pool pointing to hardcoded `postgresql://postgres:password@localhost:5432/database`, configures `apple` instead of `google`, uses TypeScript non-null assertion syntax (`!`) in JavaScript, and lacks the server-side role assignment hooks and `signup_intents` resolution hooks.
- **Route File Collision**: `app/api/auth/[...all]/` contains both `route.js` and conflicting `route.ts`.

### Observation 1.3: Unauthenticated Fallback Bypass in Admin API Route Handlers
- **Files**:
  - `e:/sih_2026_044/app/api/admin/audit-logs/route.js` (lines 33–36)
  - `e:/sih_2026_044/app/api/admin/users/route.js` (lines 36–39)
  - `e:/sih_2026_044/app/api/admin/verifications/route.js` (lines 37–41)
- **Direct quote from `app/api/admin/audit-logs/route.js:25-39`**:
```javascript
  const dbInstance = localDb.getDb();
  if (userIdHeader) {
    const user = (dbInstance.users || []).find(u => u.id === userIdHeader);
    if (user && user.role === 'ADMIN') {
      return { user };
    }
  }

  const defaultAdmin = (dbInstance.users || []).find(u => u.role === 'ADMIN');
  if (defaultAdmin) {
    return { user: defaultAdmin };
  }

  return null;
```
- **Security Implication**: If an unauthenticated caller or an attacker makes an HTTP request to `/api/admin/audit-logs`, `/api/admin/users`, or `/api/admin/verifications` without providing headers, `getAdminSession` defaults to the first `ADMIN` in the database (`defaultAdmin`) and grants full admin privileges, bypassing authentication.

### Observation 1.4: Dynamic Test Suite Execution Results
- **Command**: `node tests/test-auth-suite.js` -> 30/30 PASSED (26ms)
  - Tier 1 (Features F01-F21): 15/15 passed
  - Tier 2 (Boundaries B01-B09): 9/9 passed
  - Tier 3 (Pipelines X01-X03): 3/3 passed
  - Tier 4 (Scenarios S01-S03): 3/3 passed
- **Command**: `node tests/adversarial-challenger1.js` -> 23/23 PASSED
- **Command**: `node tests/adversarial-challenger2.js` -> 15/15 PASSED
- **Command**: `npm run test:matching` -> 13/13 PASSED
- **Command**: `node tests/test-runner.js` -> 191/191 PASSED (268ms)

---

## 2. Logic Chain

1. **Step 1 (Mandatory Build Check)**: The Forensic Verification Procedure (Phase 2, Check 4) explicitly dictates: *"Build the project from source and run its test suite. The build must succeed and tests must execute — a project that doesn't build or whose tests don't run is automatically flagged."*
2. **Step 2 (Build Failure Confirmation)**: Direct execution of `npm run build` fails with Webpack compilation syntax error in `lib/auth.js:14` (`Expected ',', got '!'`). This violates the mandatory build requirement.
3. **Step 3 (Specification Violation in `lib/auth.js`)**: ORIGINAL_REQUEST.md R1 requires Google OAuth and Drizzle ORM Neon DB integration. The active `lib/auth.js` contains unconfigured boilerplate with `apple` provider and hardcoded localhost pg credentials.
4. **Step 4 (Authentication Bypass Vulnerability)**: The `getAdminSession` function in all three `/api/admin/*` route handlers defaults to `defaultAdmin` when unauthenticated, creating a critical authorization bypass vulnerability.
5. **Step 5 (Verdict Synthesis)**: By rule, if ANY forensic check fails (Check 4 build failure, security bypass in admin routes, and specification divergence in `lib/auth.js`), the mandatory verdict is **INTEGRITY VIOLATION**.

---

## 3. Caveats

- The core supporting modules (`lib/signup-intent.js`, `lib/auth-guard.js`, `lib/role-collision.js`, `lib/gatekeeper.js`, `lib/audit.js`, `lib/onboarding-calc.js`, `db/schema.js`, `middleware.js`) are genuinely implemented with real cryptographic signing, dynamic percentage scoring, and robust logic without hardcoded fake return values.
- All test suites (`tests/test-auth-suite.js`, `tests/test-runner.js`, adversarial tests) execute real logic without facade returns.
- However, the production build failure and the admin route fallback vulnerability require immediate remediation by the engineering workers before signoff.

---

## 4. Conclusion

**Verdict: INTEGRITY VIOLATION**

The work product is **REJECTED** due to:
1. **Critical Build Failure**: `npm run build` fails with a syntax error in `lib/auth.js:14` (`APPLE_CLIENT_ID!`).
2. **Specification & Boilerplate Divergence**: `lib/auth.js` does not contain the required Better Auth Drizzle Neon configuration and Google OAuth provider.
3. **Admin Route Security Bypass**: `/api/admin/audit-logs`, `/api/admin/users`, and `/api/admin/verifications` contain a fallback to `defaultAdmin` that allows unauthenticated callers to execute administrative actions.
4. **File Collision**: Duplicate `route.ts` and `route.js` in `app/api/auth/[...all]/`.

### Required Remediations for Engineering Team:
1. Restore/implement the complete `lib/auth.js` with Better Auth Drizzle adapter (`drizzleAdapter(db, { provider: 'pg', schema })`), Google OAuth provider, server lifecycle hooks (`user.create.before` for intent validation and initial admin provisioning, `user.create.after` for 1:1 profile creation and audit logging, `user.update.before` for role stripping), and remove the invalid `!` TypeScript syntax.
2. Remove duplicate `app/api/auth/[...all]/route.ts`.
3. In `app/api/admin/audit-logs/route.js`, `app/api/admin/users/route.js`, and `app/api/admin/verifications/route.js`, eliminate the `defaultAdmin` fallback in `getAdminSession` so that requests without valid Admin session credentials strictly return HTTP 403 Forbidden.
4. Re-run `npm run build` and `npm test` to verify zero errors.

---

## 5. Verification Method

To independently verify these findings:
1. Run `npm run build` in the workspace root `e:/sih_2026_044` -> observe syntax error at `lib/auth.js:14`.
2. Inspect `lib/auth.js` -> observe 19-line boilerplate with `apple` provider and `process.env.APPLE_CLIENT_ID!`.
3. Inspect lines 33-36 in `app/api/admin/audit-logs/route.js`, lines 36-39 in `app/api/admin/users/route.js`, and lines 37-41 in `app/api/admin/verifications/route.js` -> observe `if (defaultAdmin) return { user: defaultAdmin };`.
4. Invalidation condition: `lib/auth.js` is correctly implemented with Drizzle adapter + Google OAuth, `app/api/admin/*` fallback is removed, and `npm run build` exits with code 0.
