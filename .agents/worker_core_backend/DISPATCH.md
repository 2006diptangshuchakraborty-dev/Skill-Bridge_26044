## 2026-08-23T14:07:06Z
You are the Core Backend Implementation Worker for Milestones 1, 2, and 3 (M1: Better Auth & Drizzle ORM, M2: Tamper-Proof Roles & Signup Intents, M3: Profile Schemas & Audit Logging).
Your working directory is e:/sih_2026_044/.agents/worker_core_backend/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
Project blueprint is at e:/sih_2026_044/PROJECT.md.

Read the architectural blueprints before implementing:
- `e:/sih_2026_044/.agents/m1_db_auth_explorer/m1_blueprint.md`
- `e:/sih_2026_044/.agents/m2_role_intent_explorer/m2_blueprint.md`
- `e:/sih_2026_044/.agents/m3_profile_audit_explorer/m3_blueprint.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Files:
1. `package.json`: Install `better-auth` (`npm install better-auth`).
2. `drizzle.config.js`: Configure Drizzle Kit pointing to `./db/schema.js` and Neon PostgreSQL.
3. `db/schema.js`: Complete Drizzle PostgreSQL schemas for:
   - Better Auth tables (`user`, `session`, `account`, `verification`) with custom user fields: `role` (enum: STUDENT, ORGANIZATION, ADMIN), `accountStatus` (enum: ACTIVE, PENDING, SUSPENDED, DEACTIVATED), `onboardingStatus` (enum: NOT_STARTED, IN_PROGRESS, COMPLETED).
   - `signup_intents` (id, token, role, email, expiresAt, usedAt, createdAt).
   - `student_profile` (id, userId unique fk cascade, headline, bio, instituteName, department, degree, yearOfStudy, cgpa, skills jsonb, projects jsonb, certifications jsonb, experience jsonb, careerPreferences jsonb, profileCompletion integer, createdAt, updatedAt).
   - `organization_profile` (id, userId unique fk cascade, companyName, registrationNumber, taxIdGstin, industry, companySize, website, logoUrl, contactPhone, address, hiringPreferences jsonb, verificationStatus enum: PENDING, APPROVED, REJECTED, INFO_REQUESTED, verificationDocs jsonb, adminNotes, profileCompletion integer, createdAt, updatedAt).
   - `admin_profile` (id, userId unique fk cascade, permissions jsonb, department, createdAt, updatedAt).
   - `audit_logs` (id, actorUserId, action enum: LOGIN, LOGOUT, ACCOUNT_CREATED, ROLE_ASSIGNED, ORGANIZATION_APPROVED, ORGANIZATION_REJECTED, ORGANIZATION_INFO_REQUESTED, USER_SUSPENDED, USER_REACTIVATED, PROFILE_UPDATED, targetUserId, resourceType, resourceId, metadata jsonb, ipAddress, userAgent, createdAt).
4. `db/index.js`: Dual-mode database connection supporting Neon Serverless (`@neondatabase/serverless` + `drizzle-orm/neon-serverless`) with automatic graceful in-memory/JSON fallback for mock/offline testing environments.
5. `lib/auth.js`: Better Auth server configuration with Google OAuth provider, Drizzle adapter, database hooks (`user.create.before` for intent validation and role assignment, `user.create.after` for audit logging, `user.update.before` stripping role/status changes), `INITIAL_ADMIN_EMAIL` check, and public admin signup ban.
6. `lib/auth-client.js`: React client auth with `createAuthClient` from `better-auth/react`.
7. `lib/signup-intent.js`: Cryptographic token generator and validator.
8. `lib/role-collision.js`: Returning user role collision detector and resolver.
9. `lib/audit.js`: Immutable audit logging utility function.
10. `lib/onboarding-calc.js`: Dynamic weighted profile completion percentage calculators for student (8 categories) and organization (7 categories).
11. `app/api/auth/[...all]/route.js`: Next.js App Router route handler for Better Auth.
12. `app/api/auth/signup-intent/route.js`: Server endpoint validating role intent (`STUDENT` | `ORGANIZATION`), rejecting `ADMIN` with 403 Forbidden, setting secure cookie and returning token.
13. `app/api/student/profile/route.js`: Student profile GET and PUT/POST route handler with validation and audit logging.
14. `app/api/organization/profile/route.js`: Organization profile GET and PUT/POST route handler with validation and audit logging.
15. `.env.example`: Complete environment template.

## 2026-08-23T14:21:36Z
**Context**: Checking on M1-M3 implementation progress
**Content**: Please share an update on the current implementation status of Drizzle schemas, Better Auth, intent flows, and profile APIs.
**Action**: Reply with your current progress update and remaining steps.
