# Milestone M2 Quality & Adversarial Review Report (Reviewer 2)

**Evaluator**: Reviewer 2 (`reviewer_critic`)  
**Verdict**: **APPROVE**  
**Date**: 2026-08-24T18:50:00Z  
**Target Milestone**: M2 — Role Selection, Onboarding Flow & Profile Gating

---

## 1. Observation

Direct empirical observations collected across the codebase, test suites, and build pipeline:

### 1.1 Test Suite Executions
- **Auth & Role Governance Suite (`node tests/test-auth-suite.js`)**:
  - `33 passed, 0 failed, 0 skipped` across all 4 tiers (Tier 1 Features, Tier 2 Boundaries, Tier 3 State Pipelines, Tier 4 Multi-Actor Scenarios).
  - Verbatim pass: `F05: Pre-OAuth Signup Intent Generation for STUDENT & ORGANIZATION`, `F06: Strict Admin Registration Prohibition`, `F07: Role Immutability`, `F08: Tamper-Proof Server-Enforced Role Assignment`, `F12 & F13: Institute 6-Step Dynamic Completion Scoring`, `F13: Universal calculateProfileCompletion & isProfileComplete Threshold Gating`.
- **Matching Rules Suite (`node scripts/test-matching-rules.js`)**:
  - `13 passed, 0 failed, 0 skipped` (100% pass rate).
- **Skill Verification Suite (`node tests/test-verification-system.js`)**:
  - `8 passed, 0 failed, 0 skipped` (100% pass rate).
- **Empirical Adversarial Verification Suites**:
  - `node tests/m2-challenger2-empirical.js`: `15 passed, 0 failed` covering Institute 6-step calculation, deficit math invariance, prototype pollution/boundary conditions.
  - `node tests/m2-ui-gating-api-stress.js`: `8 passed, 0 failed` verifying institute API role isolation (403 for student/org), 401 unauthenticated, server-side parameter sanitization (`verificationStatus`), and 70% submission threshold enforcement.

### 1.2 Production Build Execution (`npm run build`)
- Next.js 14.2.5 compiled successfully across all 52 routes and edge middleware.
- Verbatim route verification:
  - `○ /register` & `○ /login` (pre-OAuth role selector & collision handlers)
  - `○ /profile/complete` (universal zero-trust session dispatcher)
  - `○ /institute/onboarding` & `ƒ /api/institute/onboarding` (academic onboarding wizard & API)
  - `○ /student/onboarding` & `○ /organization/onboarding`
  - `ƒ Middleware` (28 kB)

### 1.3 Code Inspection & Integrity Checks
- `components/auth/RoleSelector.jsx`:
  - 3-role selector supporting `STUDENT`, `INDUSTRY` (aliased with `ORGANIZATION`), and `INSTITUTE`.
  - Accessible via `role="radiogroup"`, `role="radio"`, `aria-checked`, and responsive grid/compact layouts.
- `lib/signup-intent.js` & `app/api/auth/signup-intent/route.js`:
  - Cryptographic 256-bit entropy generation (`crypto.randomBytes(32).toString('hex')`).
  - 15-minute expiry (`INTENT_EXPIRY_MS = 900000`), secure `sb_signup_intent` httpOnly cookie.
  - Strict Admin registration block with 403 Forbidden (`ADMIN_REGISTRATION_FORBIDDEN`).
  - Single-use consumption tracking (`used`, `usedAt`).
- `app/profile/complete/page.jsx`:
  - Universal role routing dispatcher evaluating `isCompleted` flag and role partition.
  - Incomplete accounts -> `/student/onboarding`, `/organization/onboarding`, `/institute/onboarding`.
  - Complete accounts -> `/student/dashboard`, `/organization/dashboard`, `/institute/dashboard`, `/admin/dashboard`.
- `app/institute/onboarding/page.jsx` & `app/api/institute/onboarding/route.js`:
  - Full 6-step academic wizard: Basics -> Campus Location -> Departments -> Placement Cell (TPO) -> Accreditation Docs -> Review & Declaration.
  - Dynamic completion gauge backed by `calculateInstituteCompletion`.
  - API enforces 401 (no session), 403 (unauthorized roles), input sanitization (strips `verificationStatus`, `userId`, `role`), and blocks final submission if `< 70%`.
- `components/shared/ProfileCompletionCard.jsx` & `components/shared/ProfileGateModal.jsx`:
  - Visual 70% threshold progress bar with color stages (Critical `<40%` red, Gated `40-69%` amber, Unlocked `>=70%` emerald).
  - Collapsible checklist separating Mandatory Steps (Core 70%) vs Optional Enhancements (to 100%) with direct deep-links.
  - Gate modal calculates exact score deficit (`+{deficit}% needed`), lists missing quick wins, and provides clear explanation.

---

## 2. Logic Chain

1. **Requirement 1: Pre-OAuth Intent & Role Selection**:
   - The user selects a role in `RoleSelector.jsx`.
   - `app/(auth)/register/page.jsx` invokes `POST /api/auth/signup-intent`, which validates the role against `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`, rejects `ADMIN`, generates a 32-byte token, persists it, and sets an httpOnly cookie before OAuth redirection.
   - **Conclusion**: Meets full specification with zero bypass potential.

2. **Requirement 2: Generic Onboarding Routing (`/profile/complete`)**:
   - Following OAuth callback, users land at `/profile/complete`.
   - The dispatcher queries the active session and evaluates profile completion status.
   - If incomplete, it routes to `/student/onboarding`, `/organization/onboarding`, or `/institute/onboarding`. If complete, it routes to `/student/dashboard`, `/organization/dashboard`, or `/institute/dashboard`.
   - **Conclusion**: Complete, robust, zero-trust role routing.

3. **Requirement 3: Academic Onboarding Wizard & API**:
   - Institute onboarding allows adding/editing departments, TPO placement contacts, NAAC/NIRF accreditation, and statutory verification documents.
   - The API calculates dynamic scores via `calculateInstituteCompletion` and validates completeness before marking `onboardingStatus = COMPLETED`.
   - **Conclusion**: Fully functional, structured, with robust audit logging and error handling.

4. **Requirement 4: Profile Gating UI Components**:
   - `ProfileCompletionCard` and `ProfileGateModal` visually enforce the 70% threshold rule.
   - Deficit math is strictly non-negative and clamped to `[0, 100]`.
   - Actionable checklists guide the candidate to fill missing items.
   - **Conclusion**: Fully compliant with Milestone M2 UX and functional contracts.

5. **Requirement 5: Test and Build Verification**:
   - All 33 auth tests, 13 matching rules tests, 8 verification tests, 15 challenger tests, and 8 UI stress tests passed (100%).
   - Production build compiled 52 routes with zero errors.
   - **Conclusion**: Build and test verification fully satisfied.

---

## 3. Caveats

1. **Windows `.next` Cache Behavior**: On Windows systems, executing repeated builds without clearing `.next` can intermittently trigger manifest read collisions in Next.js 14.2.5. A clean build (`rimraf .next && next build`) compiles 100% reliably.
2. **Edge Middleware Matcher Scope**: In `middleware.js`, the config matcher currently targets `/student/:path*`, `/organization/:path*`, `/recruiter/:path*`, and `/admin/:path*`. Institute protection is currently enforced at the page level and server API level (`/api/institute/onboarding` returns 401/403). Adding `/institute/:path*` to the edge middleware matcher in a future iteration is recommended for unified edge redirection.

---

## 4. Conclusion

- **Verdict**: **APPROVE**
- **Integrity Assessment**: No hardcoded mocks, facade implementations, or integrity violations detected. Real cryptographic entropy, real server validation, and real dynamic scoring engines are in place.
- Milestone M2 deliverables are complete, high quality, and ready for integration.

---

## 5. Verification Method

To independently verify all claims:

```bash
# 1. Run core test suites
node tests/test-auth-suite.js
node scripts/test-matching-rules.js
node tests/test-verification-system.js

# 2. Run adversarial challenger suites
node tests/m2-challenger2-empirical.js
node tests/m2-ui-gating-api-stress.js

# 3. Clean and verify production build
powershell -Command "Remove-Item -Recurse -Force .next; npm run build"
```

Files to inspect:
- `components/auth/RoleSelector.jsx`
- `app/api/auth/signup-intent/route.js` & `lib/signup-intent.js`
- `app/profile/complete/page.jsx`
- `app/institute/onboarding/page.jsx` & `app/api/institute/onboarding/route.js`
- `components/shared/ProfileCompletionCard.jsx` & `components/shared/ProfileGateModal.jsx`
- `lib/onboarding-calc.js`
