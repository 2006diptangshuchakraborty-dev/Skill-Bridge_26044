# 5-Component Handoff Report: Role Profiles, Profile Gating & Onboarding Survey

**Agent**: Explorer 2 (`teamwork_preview_explorer_m0_2`)  
**Date**: 2026-08-24  
**Working Directory**: `e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_2`  
**Milestone**: Phase 0 Codebase Survey  

---

## 1. Observation

1. **Profile Schemas in `db/schema.js`**:
   - `users` table (`db/schema.js:63-78`) has `id`, `name`, `email` (unique), `emailVerified`, `image`, `role` (`userRoleEnum`: `'STUDENT' | 'ORGANIZATION' | 'ADMIN'`), `accountStatus`, `onboardingStatus` (`'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'`).
   - `studentProfiles` (`student_profile` table, `db/schema.js:162-189`) defines strict 1:1 foreign key constraint:
     ```javascript
     userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })
     ```
     with unique index `student_profile_user_idx` and fields: `headline`, `bio`, `instituteName`, `department`, `degree`, `yearOfStudy`, `cgpa`, `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `careerPreferences` (jsonb), `profileCompletion`, `currentOnboardingStep`.
   - `organizationProfiles` (`organization_profile` table, `db/schema.js:193-226`) defines strict 1:1 foreign key constraint:
     ```javascript
     userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })
     ```
     with unique indexes `organization_profile_user_idx` and `organization_profile_reg_idx` (`registrationNumber`), statutory KYC doc fields, and `verificationStatus` (`PENDING` | `APPROVED` | `REJECTED` | `INFO_REQUESTED`).
   - `institute_profile` table is **absent** from `db/schema.js`. `userRoleEnum` does not include `'INSTITUTE'`.

2. **Profile Completion Calculators in `lib/onboarding-calc.js`**:
   - `calculateStudentCompletion(profile)` (`lib/onboarding-calc.js:13-64`): dynamic 8-step scoring (Basic Info: 15%, Academic: 15%, Skills: 20%, Projects: 15%, Certifications: 10%, Experience: 10%, Career Preferences: 10%, Normalization: >=95% -> 100%).
   - `calculateOrganizationCompletion(profile)` (`lib/onboarding-calc.js:73-127`): dynamic 7-step scoring (Company Info: 15%, Registration: 20%, Contact & HQ: 15%, Industry & Size: 15%, Hiring Preferences: 15%, Verification Docs: 15%, Normalization: >=95% -> 100%).
   - `getStudentCompletionDetails(profile)` and `getOrgCompletionDetails(profile)` (`lib/onboarding-calc.js:132-186`): compute `{ completion, breakdown, missingFields }`.
   - Contract functions `calculateProfileCompletion` and `isProfileComplete` specified in `ORIGINAL_REQUEST.md §3` are **not yet exported**.

3. **Onboarding Wizards in `app/*/onboarding/page.jsx`**:
   - `app/student/onboarding/page.jsx` (983 lines): full 8-step interactive wizard with live SVG circular completion gauge (`completionScore%`), step draft persistence (`handleSaveDraft`), and final completion submission (`handleFinalSubmit`) calling `/api/student/onboarding`.
   - `app/organization/onboarding/page.jsx` (834 lines): full 7-step interactive wizard with live KYC score gauge, document attachment, statutory compliance declaration, and final submission calling `/api/organization/onboarding`.
   - `/profile/complete` (`app/profile/complete/page.jsx`), `/industry/onboarding`, and `/institute/onboarding` (`app/institute/onboarding/page.jsx`) are **currently missing**.

4. **Profile Gating Rules in Middleware & API**:
   - `middleware.js:178-207`: redirects un-onboarded students (`onboardingStatus !== 'COMPLETED'`) to `/student/onboarding` and un-onboarded organizations to `/organization/onboarding`.
   - `lib/auth-guard.js:144-156`: `withAuth` wrapper supports `requireOnboarded: true`, rejecting un-onboarded callers with `403 ONBOARDING_REQUIRED`.
   - `app/api/applications/route.js:17-70`: POST handler verifies priority skill match (`evaluateMatch`), but **does not enforce** `withAuth` or check student profile completion status before creating application.
   - `app/student/opportunities/[id]/page.jsx:62-91`: Apply button does not prompt a completion modal or check `profileCompletion >= 70%` prior to submitting.

---

## 2. Logic Chain

1. **Premise 1 (Schema & 1:1 Constraints)**: Based on Observation 1, `student_profile` and `organization_profile` in `db/schema.js` properly enforce 1:1 foreign key constraints with unique indices to `users.id` with cascade deletion. However, `ORIGINAL_REQUEST.md` requires 3 user roles (`STUDENT`, `INDUSTRY`, `INSTITUTE`) and 3 profiles (`StudentProfile`, `IndustryProfile`, `InstituteProfile`). Therefore, `institute_profile` schema and enum updates (`INSTITUTE`, `INDUSTRY`) are required.
2. **Premise 2 (Completion Engine Compatibility)**: Based on Observation 2, `lib/onboarding-calc.js` contains the mathematical logic for student and organization completion scores. To satisfy test suites and interface contracts in `ORIGINAL_REQUEST §3`, dispatcher functions `calculateProfileCompletion(user, profile)` and `isProfileComplete(user, profile, threshold)` must wrap the role calculators.
3. **Premise 3 (Onboarding Route Coverage)**: Based on Observation 3, Student and Organization onboarding wizards are mature and functional, but missing the generic entrypoint `/profile/complete` (which routes new OAuth users to their role wizard) and the academic `/institute/onboarding` wizard.
4. **Premise 4 (Gating Enforcement)**: Based on Observation 4, while Edge Middleware protects top-level URL routes, individual action entry points (specifically applying to opportunities in `app/student/opportunities/[id]/page.jsx` and `/api/applications`) must check student profile completion (>= 70% / `COMPLETED`) to prevent bypassed applications.

---

## 3. Caveats

- **Role Naming Alignment**: In the current codebase, `ORGANIZATION` is used interchangeably with `INDUSTRY`, and `recruiter` routes exist alongside `organization` routes. Both can be supported via route rewrites / aliases without breaking existing tests.
- **In-Memory vs Database Fallbacks**: `lib/db.js` provides an in-memory JSON data layer for testing environments when Neon PostgreSQL credentials are not active. Any schema field additions in `db/schema.js` should also be mirrored in `lib/db.js` and `data/seed.json`.

---

## 4. Conclusion

The core foundations for Role Profiles (Student, Organization), dynamic multi-step Onboarding Wizards, and Edge Middleware route protection are already solidly built and functional. 

To achieve 100% specification compliance with `ORIGINAL_REQUEST.md`:
1. Add `institute_profile` schema and update `userRoleEnum` to support `STUDENT`, `INDUSTRY`/`ORGANIZATION`, `INSTITUTE`, `ADMIN`.
2. Export `calculateProfileCompletion` and `isProfileComplete` in `lib/onboarding-calc.js`, and add institute calculation logic.
3. Create `app/profile/complete/page.jsx` as a dynamic onboarding router.
4. Create `components/shared/ProfileCompletionCard.jsx` (70% progress bar + required vs optional checklist) and `ProfileGateModal.jsx`.
5. Integrate profile completion verification into `app/api/applications/route.js` and `app/student/opportunities/[id]/page.jsx`.

---

## 5. Verification Method

To independently verify all findings:
1. **Schema Check**: Inspect `db/schema.js` lines 162-226 using `view_file` to confirm 1:1 foreign key constraints on `studentProfiles` and `organizationProfiles`.
2. **Calculator Check**: Inspect `lib/onboarding-calc.js` using `view_file` to verify function signatures and scoring rules.
3. **Middleware & Gating Check**: Inspect `middleware.js` lines 178-207 and `lib/auth-guard.js` lines 144-156.
4. **Test Suite Execution**:
   Run the test runner:
   ```powershell
   node tests/test-auth-suite.js
   ```
   Or run the standalone Tier 1 test suite:
   ```powershell
   node tests/e2e/tier1-feature-coverage.test.js
   ```
5. **Build Verification**:
   ```powershell
   npm run build
   ```
