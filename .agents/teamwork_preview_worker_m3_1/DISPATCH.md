## 2026-08-25T00:20:00Z
You are Worker M3 for the Skill Bridge platform.
Your working directory is: e:\sih_2026_044\.agents\teamwork_preview_worker_m3_1\
Project root: e:\sih_2026_044

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You own write access to:
- `app/page.jsx`
- `components/shared/Navbar.jsx`
- `lib/dummy-data/index.js` (and any helper dummy data modules in `lib/dummy-data/`)
- `app/home/page.jsx`

## 2026-08-29T06:12:05Z
You are a teamwork_preview_worker implementing Milestone 3: Profile Data Ownership, Atomic UPSERTs & User State Sync for the project defined in e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md and e:\sih_2026_044\.agents\PROJECT.md.

Working directory: e:\sih_2026_044\.agents\teamwork_preview_worker_m3_1
Workspace directory: e:\sih_2026_044

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership for Milestone 3:
- `app/api/profile/setup/route.js`:
  1. Authoritative ownership: Strict resolution of user identity via `auth.api.getSession({ headers: request.headers })` and bind ownership to `session.user.id`. Strip any client-provided IDs and roles (`id`, `userId`, `user_id`, `role`, `accountStatus`, `verificationStatus`).
  2. Implement atomic UPSERT using Drizzle ORM `.insert(schema[table]).values(data).onConflictDoUpdate({ target: schema[table].userId, set: data })` (or equivalent fallback matching PostgreSQL unique constraint on `user_id`).
  3. Map and persist all newly added academic, statutory, and contact fields into PostgreSQL (`phone`, `cgpa`, `department`, `degree`, `yearOfStudy`, `graduationYear`, `githubUrl`, `linkedinUrl`, `registrationNumber`, `taxIdGstin`, `companyType`, `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `contactPhone`, `officialEmail`, `logoUrl`, `domainFocus`, `instituteCode`, `accreditationDetails`).
  4. When `action === "COMPLETE_ONBOARDING"` or profile setup is completed, update the PostgreSQL `user` table:
     `await db.update(schema.user).set({ onboardingStatus: "COMPLETED", profileCompleted: true, updatedAt: new Date() }).where(eq(schema.user.id, session.user.id));`
     and update the response companion cookies (`sb_profile_completed=true`, `sb_user_status=ACTIVE`).
  5. Server-side validation: Validate required profile fields and return meaningful 400 Bad Request responses with field-level error messages when invalid.
  6. Verify `GET /api/profile/setup` returns the complete profile data including all academic/statutory/contact fields.

Tasks:
1. Read `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md`, `e:\sih_2026_044\.agents\PROJECT.md`, and survey analysis in `e:\sih_2026_044\.agents\survey_profile_api_tests_spec_miner\analysis.md`.
2. Implement the fixes in `app/api/profile/setup/route.js` (and any related profile endpoints).
3. Test against live Neon PostgreSQL:
   - Verify Student, Industry, and Institute profiles save, load, and retain data.
   - Verify `user` table is updated on completion.
4. Run all automated test suites:
   - `npm test`
   - `npm run test:tier5`
   - `node scripts/test-db.js`
5. Document all changes and verification outputs in `e:\sih_2026_044\.agents\teamwork_preview_worker_m3_1\handoff.md`.
6. Send a completion message when done.
