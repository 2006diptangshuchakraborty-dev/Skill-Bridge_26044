## 2026-08-24T17:13:15Z
You are Worker 1 for Milestone 1 of the Skill Bridge Platform.
Your working directory is: e:\sih_2026_044\.agents\teamwork_preview_worker_m1\
The authoritative requirements are at: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Also read:
- e:\sih_2026_044\PROJECT.md
- e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_1\report.md
- e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_2\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
Implement Database Schema, Better Auth Hooks, Role Alignment & Profile Calculators:
1. `db/schema.js`:
   - Update `userRoleEnum` to include `STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`.
   - Add `profileCompleted: boolean('profile_completed').default(false).notNull()` to `users` table.
   - Define `instituteProfiles` table (`institute_profile`) with 1:1 foreign key constraint (`userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`), unique index `institute_profile_user_idx`, and fields: `instituteName`, `instituteCode`, `instituteType`, `address` (jsonb), `website`, `logoUrl`, `contactPhone`, `officialEmail`, `departments` (jsonb), `placementContact` (jsonb), `verificationStatus` (enum `PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`), `verificationDocs` (jsonb), `profileCompletion` (integer default 0), `currentOnboardingStep` (integer default 1), `createdAt`, `updatedAt`.
   - Define relations `instituteProfilesRelations` and export `instituteProfiles` and `industryProfiles = organizationProfiles`.
2. `lib/signup-intent.js`:
   - Update `ALLOWED_SIGNUP_ROLES` to `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION']`.
3. `lib/auth.js`:
   - Add `profileCompleted: { type: "boolean", defaultValue: false, input: false }` to `user.additionalFields`.
   - Update `databaseHooks.user.create.after` to auto-provision an `instituteProfiles` record when `user.role === 'INSTITUTE'`.
4. `lib/onboarding-calc.js`:
   - Implement `calculateInstituteCompletion(profile)` and `getInstituteCompletionDetails(profile)`.
   - Implement and export `calculateProfileCompletion(userOrRole, profile)` and `isProfileComplete(userOrRole, profile, threshold = 70)` supporting all roles (`STUDENT`, `INDUSTRY`/`ORGANIZATION`, `INSTITUTE`).
5. Run test suites (`node tests/test-auth-suite.js` or `npm test`) and build verification (`npm run build`) to ensure 100% tests pass and 0 errors.

Write your changes and verification logs in `e:\sih_2026_044\.agents\teamwork_preview_worker_m1\handoff.md`. Then send a message with your summary.
