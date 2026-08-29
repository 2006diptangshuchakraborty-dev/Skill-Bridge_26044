## 2026-08-24T17:49:20Z
You are Explorer M1 for the Skill Bridge platform.
Your working directory is: e:\sih_2026_044\.agents\teamwork_preview_explorer_m1_1\
Project root: e:\sih_2026_044

Read the following authoritative specifications first:
- e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
- e:\sih_2026_044\PROJECT.md
- e:\sih_2026_044\TEST_INFRA.md
- e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_1\report.md
- e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_2\report.md

Your task for Milestone M1:
Analyze the exact changes needed across:
1. `db/schema.js`:
   - Add `INSTITUTE` and `INDUSTRY` to `userRoleEnum` (alongside `STUDENT`, `ORGANIZATION`, `ADMIN`).
   - Add `profileCompleted` boolean column to `users` table (`boolean('profile_completed').default(false).notNull()`).
   - Define `instituteProfiles` (`institute_profile` table) with strict 1:1 foreign key `userId` references `users.id` ({ onDelete: 'cascade' }), unique index on `userId`, fields: `id`, `userId`, `instituteName`, `instituteCode`, `instituteType`, `address` (jsonb), `website`, `logoUrl`, `contactPhone`, `officialEmail`, `departments` (jsonb), `placementContact` (jsonb), `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`), `verificationDocs` (jsonb), `profileCompletion`, `currentOnboardingStep`, `createdAt`, `updatedAt`.
   - Export `institute_profile` and relation `instituteProfilesRelations`.
   - Export alias `industryProfiles = organizationProfiles` and `industry_profile = organization_profile`.
2. `lib/signup-intent.js`:
   - Update `ALLOWED_SIGNUP_ROLES = ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
   - Ensure role immutability and admin registration ban are preserved.
3. `lib/auth.js`:
   - Add `profileCompleted: { type: "boolean", defaultValue: false, input: false }` to `user.additionalFields`.
   - In `databaseHooks.user.create.after`, add auto-provisioning for `INSTITUTE` role creating 1:1 `institute_profile` record and audit logging.
4. `lib/onboarding-calc.js`:
   - Implement `calculateInstituteCompletion(profile)` and `getInstituteCompletionDetails(profile)`.
   - Implement and export `calculateProfileCompletion(userOrRole, profile)` and `isProfileComplete(userOrRole, profile, threshold = 70)`.
5. `tests/auth-test-helper.js` and test suites:
   - Ensure `tests/test-auth-suite.js` continues to pass 100% and test coverage extends to the new roles and profiles.

Produce a clear, detailed, concrete implementation blueprint in your working directory `e:\sih_2026_044\.agents\teamwork_preview_explorer_m1_1\report.md` and write a self-contained `handoff.md`.
Send a completion message when done.
