## 2026-08-23T13:50:51Z
You are the Profile Schemas & Audit Logging Explorer for Milestone 3 (M3).
Your working directory is e:/sih_2026_044/.agents/m3_profile_audit_explorer/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Task:
1. Design the 1:1 profile schemas and immutable audit logging system:
   - `student_profile` table in `db/schema.js`:
     - `id` (uuid/text pk), `userId` (text, unique, references user.id on delete cascade), `headline`, `bio`, `instituteName`, `department`, `degree`, `yearOfStudy`, `cgpa`, `skills` (jsonb array of { name, level, category }), `projects` (jsonb array), `certifications` (jsonb array), `experience` (jsonb array), `careerPreferences` (jsonb), `profileCompletion` (integer 0-100), `createdAt`, `updatedAt`.
   - `organization_profile` table in `db/schema.js`:
     - `id` (uuid/text pk), `userId` (text, unique, references user.id on delete cascade), `companyName`, `registrationNumber` (CIN/LLPIN), `taxIdGstin`, `industry`, `companySize`, `website`, `logoUrl`, `contactPhone`, `address`, `hiringPreferences` (jsonb), `verificationStatus` (enum: PENDING, APPROVED, REJECTED, INFO_REQUESTED), `verificationDocs` (jsonb), `adminNotes`, `profileCompletion` (integer 0-100), `createdAt`, `updatedAt`.
   - `admin_profile` table in `db/schema.js`:
     - `id` (uuid/text pk), `userId` (text, unique, references user.id on delete cascade), `permissions` (jsonb array), `department`, `createdAt`, `updatedAt`.
   - `audit_logs` table in `db/schema.js`:
     - `id`, `actorUserId`, `action` (enum: LOGIN, LOGOUT, ACCOUNT_CREATED, ROLE_ASSIGNED, ORGANIZATION_APPROVED, ORGANIZATION_REJECTED, ORGANIZATION_INFO_REQUESTED, USER_SUSPENDED, USER_REACTIVATED, PROFILE_UPDATED), `targetUserId`, `resourceType`, `resourceId`, `metadata` (jsonb), `ipAddress`, `userAgent`, `createdAt`.
   - Audit logger helper `lib/audit.js`:
     - `logAuditEvent({ actorUserId, action, targetUserId, resourceType, resourceId, metadata, req })` - inserts into `audit_logs` table reliably.
   - Profile CRUD API endpoints (`app/api/student/profile/route.js`, `app/api/organization/profile/route.js`).
2. Write your implementation blueprint to `e:/sih_2026_044/.agents/m3_profile_audit_explorer/m3_blueprint.md` and write `e:/sih_2026_044/.agents/m3_profile_audit_explorer/handoff.md`.
3. Send a completion message when done.
