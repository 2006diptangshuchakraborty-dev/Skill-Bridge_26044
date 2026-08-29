# Master Execution Plan: Skill Bridge Platform

## Objective
Deliver the complete, fully functioning, secure Skill Bridge platform matching all specifications in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `TEST_INFRA.md`.

## Milestones & Work Breakdown

### Milestone M0: Survey & Gap Analysis (Status: DONE)
- 3-Explorer survey executed, mapping codebase, schemas, tests, and build.

### Milestone M1: Database Schema, Better Auth Hooks & Role Alignment (Status: IN_PROGRESS)
- **Target Files**: `db/schema.js`, `lib/auth.js`, `lib/signup-intent.js`, `lib/onboarding-calc.js`, `tests/auth-test-helper.js`
- **Scope**:
  1. Add `INSTITUTE` and `INDUSTRY` to `userRoleEnum` in `db/schema.js`.
  2. Add `profileCompleted` boolean column to `users` table.
  3. Define `instituteProfiles` (`institute_profile` table) with 1:1 foreign key to `users.id`.
  4. Export `industryProfiles` alias for `organizationProfiles`.
  5. Update `lib/signup-intent.js` with `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
  6. Update `lib/auth.js` hooks to auto-provision `instituteProfiles` when role is `INSTITUTE` and add `profileCompleted` field.
  7. Implement `calculateInstituteCompletion`, `calculateProfileCompletion`, and `isProfileComplete` in `lib/onboarding-calc.js`.
  8. Verify `tests/test-auth-suite.js` passes 100%.

### Milestone M2: Pre-OAuth Role Selection, Onboarding Flow & Profile Gating (Status: PLANNED)
- **Target Files**: `components/auth/RoleSelector.jsx`, `app/(auth)/login/page.jsx`, `app/(auth)/register/page.jsx`, `app/profile/complete/page.jsx`, `app/institute/onboarding/page.jsx`, `app/api/institute/onboarding/route.js`, `components/shared/ProfileCompletionCard.jsx`, `components/shared/ProfileGateModal.jsx`
- **Scope**:
  1. Create `components/auth/RoleSelector.jsx` with 3 role cards (`STUDENT`, `INDUSTRY`, `INSTITUTE`).
  2. Update `app/(auth)/login/page.jsx` and `app/(auth)/register/page.jsx` using `RoleSelector`.
  3. Create `app/profile/complete/page.jsx` generic onboarding dispatcher.
  4. Create `app/institute/onboarding/page.jsx` multi-step academic onboarding wizard + `app/api/institute/onboarding/route.js`.
  5. Create `components/shared/ProfileCompletionCard.jsx` (70% progress bar, checklist).
  6. Create `components/shared/ProfileGateModal.jsx` (gating modal blocking incomplete profiles).

### Milestone M3: Public Landing Page, Role-Aware Navbars & Authenticated Home (Status: PLANNED)
- **Target Files**: `app/page.jsx`, `components/shared/Navbar.jsx`, `app/home/page.jsx`, `lib/dummy-data/index.js`
- **Scope**:
  1. Update `app/page.jsx` preserving dark theme visual identity, adding Student, Industry, Institute value propositions and smooth-scroll section links.
  2. Update `components/shared/Navbar.jsx` with public navbar mode (Logo, Links, Sign In/Up CTA) and dynamic authenticated role-specific navigation + avatar + student profile completion badge.
  3. Create `app/home/page.jsx` dynamic role dispatcher and modular dataset in `lib/dummy-data/`.

### Milestone M4: Opportunities, Applications, Route Security, Full Tests & Build Verification (Status: PLANNED)
- **Target Files**: `app/api/applications/route.js`, `app/opportunities/page.jsx`, `app/applications/page.jsx`, `middleware.js`, test suites
- **Scope**:
  1. Guard application submission with profile completion checks (>= 70%).
  2. Support root-level `/opportunities` and `/applications` routes/aliases.
  3. Run and pass all test suites (`node tests/test-auth-suite.js`, `node tests/test-runner.js`, `node tests/test-verification-system.js`, `node tests/adversarial-auth-challenge.js`).
  4. Clean `npm run build` verification with 0 errors.

## Orchestration Strategy & Quality Gates
- Every milestone runs:
  - 1-3 Explorers (analysis & recommendation)
  - 1 Worker (implementation & test run)
  - 2 Reviewers (independent verification)
  - 2 Challengers (adversarial / test checks)
  - 1 Forensic Auditor (integrity & anti-cheat veto check)
- Gate Result must be PASS before milestone is marked DONE.
