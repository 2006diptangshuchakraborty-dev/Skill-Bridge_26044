# BRIEFING — 2026-08-29T06:18:00Z

## Mission
Implement Milestone 3: Profile Data Ownership, Atomic UPSERTs & User State Sync for Student, Industry, and Institute profiles in `app/api/profile/setup/route.js`.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: e:\sih_2026_044\.agents\teamwork_preview_worker_m3_1\
- Original parent: 04855b81-6811-411c-9b5d-d36dd975e6d0
- Milestone: M3 (Profile Data Ownership, Atomic UPSERTs & User State Sync)

## 🔒 Key Constraints
- Authoritative ownership: Strict resolution of user identity via `auth.api.getSession({ headers: request.headers })` and bind ownership to `session.user.id`.
- Strip any client-provided IDs and roles (`id`, `userId`, `user_id`, `role`, `accountStatus`, `verificationStatus`).
- Implement atomic UPSERT using Drizzle ORM `.insert(schema[table]).values(data).onConflictDoUpdate({ target: schema[table].userId, set: data })`.
- Map and persist all newly added academic, statutory, and contact fields into PostgreSQL (`phone`, `cgpa`, `department`, `degree`, `yearOfStudy`, `graduationYear`, `githubUrl`, `linkedinUrl`, `registrationNumber`, `taxIdGstin`, `companyType`, `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `contactPhone`, `officialEmail`, `logoUrl`, `domainFocus`, `instituteCode`, `accreditationDetails`).
- Update the PostgreSQL `user` table when onboarding is completed (`onboardingStatus: "COMPLETED", profileCompleted: true, updatedAt: new Date()`) and set companion cookies (`sb_profile_completed=true`, `sb_user_status=ACTIVE`).
- Validate required profile fields and return meaningful 400 Bad Request responses with field-level error messages when invalid.
- High fidelity, genuine implementations, no hardcoding verification strings or dummy facades.

## Current Parent
- Conversation ID: 04855b81-6811-411c-9b5d-d36dd975e6d0
- Updated: 2026-08-29T06:18:00Z

## Task Summary
- **What to build**:
  1. Profile setup route (`app/api/profile/setup/route.js`) with Drizzle ORM atomic UPSERT using `.onConflictDoUpdate({ target: table.userId, set: ... })`. (COMPLETED)
  2. Full field mapping and persistence for Student, Industry, and Institute tables in Neon PostgreSQL. (COMPLETED)
  3. User table synchronization (`user.profileCompleted = true`, `user.onboardingStatus = 'COMPLETED'`) on complete action or >= 70% threshold. (COMPLETED)
  4. Response companion cookies setting (`sb_profile_completed=true`, `sb_user_status=ACTIVE`, `sb_user_role=ROLE`). (COMPLETED)
  5. Structured server-side validation with meaningful 400 Bad Request error messages. (COMPLETED)
  6. E2E Persistence test suite (`tests/test-profile-persistence-e2e.js`) testing Scenarios A, B, C, D live on Neon PostgreSQL. (COMPLETED)
- **Success criteria**: 100% test pass across all suites, zero data loss on profile save/refresh, atomic race-condition-free UPSERTs, clean Next.js build. (ALL MET)
- **Interface contracts**: `PROJECT.md` § Interface Contracts (ProfileSetupRequest, ProfileSetupResponse).

## Change Tracker
- **Files modified**:
  - `app/api/profile/setup/route.js` — Authoritative profile ownership, Drizzle ORM atomic UPSERT, full academic/statutory/contact field mapping, user table sync, companion cookies, and server-side validation.
  - `app/student/dashboard/page.jsx` — Co-located JSX component matching dashboard interface.
  - `tests/test-profile-persistence-e2e.js` — Automated test suite verifying Scenarios A, B, C, D against live Neon PostgreSQL.
  - `package.json` — Added `test:persistence` script.
- **Build status**: PASS (Next.js 14.2.5 built 64 static/dynamic routes cleanly with 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**:
  - `npm test` (`tests/test-auth-onboarding-e2e.js`): 119/119 PASS (100%)
  - `npm run test:tier5` (`tests/test-tier5-adversarial-auth.js`): 45/45 PASS (100%)
  - `npm run test:persistence` (`tests/test-profile-persistence-e2e.js`): 9/9 PASS (100%)
  - `npm run db:test` (`scripts/test-db.js`): 4/4 PASS (100%)
  - `npm run test:matching` (`scripts/test-matching-rules.js`): 13/13 PASS (100%)
  - `npm run test:verification` (`tests/test-verification-system.js`): 8/8 PASS (100%)
  - `npm run build`: 64/64 routes compiled cleanly (Exit Code 0)
- **Lint status**: Clean
- **Tests added/modified**: `tests/test-profile-persistence-e2e.js` (9 comprehensive test cases covering Scenarios A-D)

## Loaded Skills
- None specified
