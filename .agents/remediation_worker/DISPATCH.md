## 2026-08-23T15:09:36Z

You are the Auth Remediation & Build Fix Worker for the Skill Bridge platform.
Your working directory is e:/sih_2026_044/.agents/remediation_worker/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.
Forensic Audit Report is at e:/sih_2026_044/.agents/forensic_auditor/audit_report.md.
M1 Blueprint is at e:/sih_2026_044/.agents/m1_db_auth_explorer/m1_blueprint.md.

Tasks:
1. Read the forensic audit report thoroughly (`e:/sih_2026_044/.agents/forensic_auditor/audit_report.md`).
2. Restore `lib/auth.js` to full, authentic production implementation:
   - Use ESM `betterAuth` from `"better-auth"`.
   - Use `drizzleAdapter` from `"better-auth/adapters/drizzle"` connected to `db` and `schema` from `@/db`.
   - Configure Google OAuth social provider (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
   - Add server-authoritative `user.additionalFields`:
     - `role`: string, required, `input: false`, defaultValue: 'STUDENT'
     - `accountStatus`: string, required, `input: false`, defaultValue: 'PENDING'
     - `onboardingStatus`: string, required, `input: false`, defaultValue: 'NOT_STARTED'
   - Implement `databaseHooks.user.create.before`:
     - Extract intent token from `sb_signup_intent` cookie or context.
     - Check `INITIAL_ADMIN_EMAIL` -> if user email matches, grant ADMIN role and ACTIVE status.
     - Consume signup intent and assign validated role (`STUDENT` or `ORGANIZATION`).
     - Set initial `accountStatus` (`ACTIVE` for STUDENT, `PENDING` for ORGANIZATION).
   - Implement `databaseHooks.user.create.after`:
     - Automatically provision 1:1 role profile in `student_profile`, `organization_profile`, or `admin_profile`.
     - Record immutable audit logs (`ACCOUNT_CREATED` and `ROLE_ASSIGNED`).
   - Implement `databaseHooks.user.update.before`:
     - Strip `role`, `accountStatus`, and `id` from update requests to guarantee role immutability and prevent client tampering.
   - Ensure clean JavaScript syntax (NO TypeScript non-null `!` assertions).
3. Delete redundant conflicting file `app/api/auth/[...all]/route.ts` (so Next.js uses `app/api/auth/[...all]/route.js`).
4. Execute verification commands:
   - `node tests/test-auth-suite.js` (must pass 30/30 tests 100%)
   - `npm run build` (must compile with 0 errors across all routes)
   - `npm run test:matching` (must pass 13/13 tests)
5. Write your handoff report to `e:/sih_2026_044/.agents/remediation_worker/handoff.md` and send a message to the orchestrator.
