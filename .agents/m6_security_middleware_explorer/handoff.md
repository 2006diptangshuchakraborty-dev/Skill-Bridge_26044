# Milestone 6 (M6) Handoff Report: Route Protection & API Security Architecture

**Agent**: Route Protection & API Security Explorer  
**Milestone**: M6 (Route Protection & API Security)  
**Date**: 2026-08-23  

---

## 1. Observation

1. **System & Feature Requirements**:
   - `PROJECT.md` Feature Inventory items F18 ("Role-Aware Edge Middleware") and F19 ("Server API Security Guard withAuth"):
     - Edge Middleware in `middleware.js` matching route prefixes (`/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`).
     - Session token extraction from cookies (`better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token`) and headers.
     - Role authorization: `/student/*` requires `STUDENT`; `/organization/*` and `/recruiter/*` require `ORGANIZATION`; `/admin/*` requires `ADMIN`.
     - Automatic onboarding redirection for un-onboarded students (`onboardingStatus !== 'COMPLETED'`) to `/student/onboarding` and un-onboarded organizations to `/organization/onboarding`.
     - Immediate account status enforcement for `SUSPENDED` and `DEACTIVATED` accounts (redirecting to `/account-suspended`).
     - Server API Guard `withAuth` Higher-Order Function enforcing session check, allowed roles array, account status check, KYC gatekeeping, and IDOR prevention (`checkOwnership`).
     - Role-aware `/login` and `/register` UI supporting pre-OAuth signup intent and role collision modal.
2. **Current Codebase State**:
   - `tests/auth-test-helper.js` lines 486-598: Defines the specification oracle for `simulateEdgeMiddleware` and `simulateApiGuard`.
   - `tests/e2e/tier1-feature-coverage.test.js` lines 415-474: Tests F18 (Route Middleware role partitioning) and F19 (Server API Guard with IDOR prevention).
   - `tests/e2e/tier2-boundary-corner.test.js` lines 140-202: Tests boundary conditions including IDOR attacks, suspended account capability gating, and role collision handling.
   - `tests/e2e/tier3-cross-feature.test.js` lines 104-180: Tests multi-user role isolation matrix and dynamic session suspension across `/student/*`, `/organization/*`, and `/admin/*`.
3. **Test Execution**:
   - Command: `node tests/test-auth-suite.js`
   - Result: 30 of 30 tests passed with 100% success rate in 24ms.
4. **Blueprint Produced**:
   - Target File: `e:/sih_2026_044/.agents/m6_security_middleware_explorer/m6_blueprint.md`
   - Complete technical specifications and full source code for `middleware.js`, `lib/auth-guard.js`, `app/(auth)/login/page.jsx`, `app/(auth)/register/page.jsx`, and `app/account-suspended/page.jsx`.

---

## 2. Logic Chain

1. **Edge Middleware Partitioning**:
   - Unauthenticated access to protected zones must be halted before rendering server components or loading client bundles. Redirecting to `/login?role=[TARGET_ROLE]&redirect=[PATH]` preserves user intent while securing routes.
   - Incomplete profiles must not access operational pages (e.g. browsing student jobs or posting recruiter positions). Directing incomplete users to their respective onboarding wizards (`/student/onboarding` or `/organization/onboarding`) guarantees high data completeness and compliant KYC prior to platform participation.
   - Suspended accounts must be isolated globally. Directing suspended sessions to `/account-suspended` immediately cuts off access to both frontend portals and backend operations.
2. **Zero-Trust Server API Guarding (`withAuth`)**:
   - Edge middleware protects URL routes at the browser boundary, but backend APIs must be defended independently (defense-in-depth).
   - `withAuth` wraps Next.js App Router handlers and executes a 7-step security verification pipeline: (1) Session validation, (2) Active account status check, (3) Role whitelist authorization, (4) Onboarding status check, (5) KYC approval check, (6) Tenant resource ownership verification (IDOR protection), and (7) Immutable audit trail generation.
3. **Role Selection & Handshake UI**:
   - The `/register` flow enforces pre-OAuth cryptographic intent tokens (`signup_intents`) created via `POST /api/auth/signup-intent`.
   - Returning Google accounts attempting cross-role signup are intercepted by role collision detection without altering existing DB records, presenting a user-friendly `RoleCollisionModal`.

---

## 3. Caveats

- **Edge Runtime vs Node Runtime**: Next.js Edge Middleware executes on lightweight V8 isolates. Database queries in middleware are mediated through fast token/cookie parsing or lightweight HTTP session resolution, while full database queries and tenant verification are performed in Node runtime within route handlers via `withAuth`.
- **Admin Provisioning**: Admin registration remains completely banned in public UI forms; admin accounts can only authenticate via pre-provisioned records configured via server seed or `INITIAL_ADMIN_EMAIL`.

---

## 4. Conclusion

The Milestone 6 architecture for Route Protection & API Security is comprehensively designed and ready for implementation. The specification covers:
1. `middleware.js`: Edge route partitioning, role enforcement, onboarding redirection, and account suspension handling.
2. `lib/auth-guard.js`: Zero-trust `withAuth` Higher-Order Function supporting role whitelisting, IDOR ownership checks, KYC status checks, and audit logging.
3. `app/(auth)/login/page.jsx` & `app/(auth)/register/page.jsx`: Role-aware UI with portal switcher, signup intent binding, and collision handling.
4. `app/account-suspended/page.jsx`: Dedicated suspension notice screen.

All specifications align with the 30-test E2E test suite and the overarching platform requirements.

---

## 5. Verification Method

To verify the Milestone 6 architecture against the full test suite:
```powershell
# 1. Run full E2E test suite (30 tests across 4 tiers)
node tests/test-auth-suite.js

# 2. Run Tier 1 Feature Coverage (F18 Route Middleware and F19 API Guard)
node tests/test-auth-suite.js --tier=1

# 3. Run Tier 2 Boundary & Adversarial Cases (IDOR, suspension, role collision)
node tests/test-auth-suite.js --tier=2

# 4. Run Tier 3 Cross-Feature State Pipelines (Role isolation across all portals)
node tests/test-auth-suite.js --tier=3

# 5. Inspect technical blueprint
cat e:/sih_2026_044/.agents/m6_security_middleware_explorer/m6_blueprint.md
```
