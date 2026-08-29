# Milestone 3 Handoff Report: Profile Schemas, 1:1 Relations & Audit Logging

## 1. Observation
1. **Project Blueprints and Specifications**:
   - `e:/sih_2026_044/PROJECT.md` line 35-36 defines Feature 9 ("Role Profile Schemas (1:1 Relations): `student_profile`, `organization_profile`, `admin_profile` with strict 1:1 unique foreign keys to `user.id`") and Feature 10 ("Immutable Audit Logging: `audit_logs` table and logging helper `lib/audit.js` for sensitive security events").
   - `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md` line 24-32 (§R3) requires:
     - `student_profile` (user_id unique, institute, department, academic details, bio, profile_completion, skills, projects, certifications, experience, careerPreferences)
     - `organization_profile` (user_id unique, name, logo, website, registration_id, verification_status, verificationDocs, adminNotes)
     - `admin_profile` (user_id unique, permissions, department)
     - `audit_logs` (actor_user_id, action, target_user_id, resource_type, resource_id, metadata, ip_address, user_agent, created_at)
     - Logging audit entries for all sensitive actions: `LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `ORGANIZATION_INFO_REQUESTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`.
2. **Database & ORM Dependencies**:
   - `package.json` line 19 confirms `"drizzle-orm": "^1.0.0-rc.4"` and line 16 confirms `"@neondatabase/serverless": "^1.1.0"`.
   - Dynamic probing via `node -e "const drizzle = require('drizzle-orm/pg-core');"` confirmed available exports: `pgTable`, `text`, `integer`, `timestamp`, `boolean`, `jsonb`, `numeric`, `relations`.
3. **Existing Persistence Layer**:
   - `lib/db.js` line 641-663 includes initial JSON-based audit log functions (`logAuditEvent`, `getAuditLogs`), providing an immediate, fully functional fallback mechanism for offline and test execution.

---

## 2. Logic Chain
1. **1:1 Relational Integrity**:
   - By specifying `.unique()` on `userId` and `.references(() => users.id, { onDelete: 'cascade' })` in `student_profile`, `organization_profile`, and `admin_profile`, the database engine strictly enforces that exactly one role profile exists per user account, satisfying the core platform mandate ("One Google Account = One Skill Bridge Account = One Application Role").
2. **Tamper-Proof Verification Status**:
   - In `app/api/organization/profile/route.js`, if caller `role !== 'ADMIN'`, incoming `verificationStatus` and `adminNotes` fields are stripped before database persistence. Only administrative KYC review workflows (M5) can elevate an organization from `PENDING` to `APPROVED`.
3. **Audit Trail Completeness**:
   - `lib/audit.js` captures `x-forwarded-for`, `x-real-ip`, and `user-agent` from incoming request headers, attaching rich metadata and an immutable ISO timestamp.
   - Dual-persistence architecture writes to both Drizzle ORM PostgreSQL (`audit_logs`) and the local database snapshot (`lib/db.js`), guaranteeing zero data loss during testing and live operation.
4. **Dynamic Completion Calculation**:
   - `lib/onboarding-calc.js` provides deterministic weighted scoring (0-100%) for students (Basic 15%, Academic 20%, Skills 25%, Projects 15%, Certs 10%, Exp 10%, Preferences 5%) and organizations (Info 20%, Reg/Tax 25%, Industry/Size 15%, Contact/Address 15%, Hiring 15%, Docs 10%), automatically transitioning user `onboardingStatus` to `COMPLETED` when profile readiness threshold is reached.

---

## 3. Caveats
- Production deployment requires valid `DATABASE_URL` pointing to Neon PostgreSQL for Drizzle ORM migrations. When `DATABASE_URL` is omitted, the system seamlessly uses the `lib/db.js` persistent JSON storage layer.
- Submissions of file attachments (e.g. KYC verification docs) store structured JSON metadata (`docType`, `fileUrl`, `fileName`, `uploadedAt`); actual binary file hosting can be backed by S3/Vercel Blob/Cloudinary or data URIs.

---

## 4. Conclusion
The implementation blueprint for Milestone 3 is complete, validated, and ready for code execution. It contains:
1. Complete PostgreSQL Drizzle ORM table definitions in `db/schema.js` (`studentProfiles`, `organizationProfiles`, `adminProfiles`, `auditLogs`, and relational mappings).
2. Complete `lib/audit.js` implementation supporting all 10 security audit actions with IP/User-Agent extraction.
3. Complete `lib/onboarding-calc.js` module providing dynamic completion scoring.
4. Complete route handlers `app/api/student/profile/route.js` and `app/api/organization/profile/route.js` with role verification, IDOR prevention, verification status tampering prevention, and automatic audit log recording.

---

## 5. Verification Method
1. **Inspect Blueprint**:
   - View `e:/sih_2026_044/.agents/m3_profile_audit_explorer/m3_blueprint.md`.
2. **Execute Audit Engine Test**:
   - Run the audit module validation script:
     ```powershell
     node -e "const { logAuditEvent, AUDIT_ACTIONS, getAuditLogs } = require('./lib/audit'); logAuditEvent({ actorUserId: 'usr_test_1', action: AUDIT_ACTIONS.PROFILE_UPDATED, targetUserId: 'usr_test_1', resourceType: 'STUDENT_PROFILE' }).then(console.log);"
     ```
3. **Execute E2E Suite**:
   - Run the test suite:
     ```powershell
     node tests/test-runner.js
     ```
   - Invalidation conditions: Any foreign key allowing duplicate profiles per user, non-admin modification of `verificationStatus`, or profile update omitting an audit log record.
