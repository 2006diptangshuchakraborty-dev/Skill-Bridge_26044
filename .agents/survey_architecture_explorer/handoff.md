# 5-Component Handoff Report: Security & Architecture Explorer

---

## 1. Observation

1. **Authoritative Requirements in `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md`**:
   - Lines 5: *"Build a complete, secure, role-based authentication system for Skill Bridge (SIH 2026 platform) using Better Auth, Google OAuth, PostgreSQL/Neon, and Drizzle ORM. Enforce the core principle: 'One Google Account = One Skill Bridge Account = One Application Role' across STUDENT, ORGANIZATION, and ADMIN roles."*
   - Lines 18–23: Requirements R2 explicitly mandates server-owned role models (`STUDENT`, `ORGANIZATION`, `ADMIN`), short-lived server-side signup intents (`signup_intents` table) with cryptographic tokens, strict prohibition of public admin registration, and role immutability.
   - Lines 24–32: Requirements R3 defines role profile schemas (`student_profile`, `organization_profile`, `admin_profile`, `audit_logs`), 1:1 unique constraints, and audit actions (`LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ORGANIZATION_APPROVED`, etc.).
   - Lines 33–39: Requirements R4 defines multi-step onboarding workflows with tracking (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) and dynamic profile completion calculation.
   - Lines 40–44: Requirements R5 defines Admin governance, verification queue for organizations (`PENDING`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`), and capability gating.
   - Lines 45–52: Requirements R6 defines Next.js middleware and API route authorization (`withAuth`, session, role, account status, ownership checks).

2. **Existing Project Stack in `package.json`**:
   - Lines 15–25: `"@neondatabase/serverless": "^1.1.0"`, `"drizzle-orm": "^1.0.0-rc.4"`, `"drizzle-kit": "^1.0.0-rc.4"`, `"next": "14.2.5"`, `"react": "^18.3.1"`.
   - `.env` contains `DATABASE_URL=postgresql://...` pointing to a Neon serverless PostgreSQL database.

3. **Current Data & Persistence Architecture in `PROJECT.md` & `lib/db.js`**:
   - Currently, the application utilizes an in-memory/disc JSON persistence layer in `lib/db.js` (`data/db.json` and `data/seed.json`) with mock personas (`std_001` through `std_004`, `opp_001`).
   - The platform has portal directories in `app/student/`, `app/recruiter/`, `app/institute/`, `app/admin/`, and matching engine APIs in `app/api/`.

---

## 2. Logic Chain

1. **From Observation 1 & 2 (Neon PostgreSQL + Drizzle ORM + Better Auth)**:
   - A relational PostgreSQL schema using Drizzle ORM must be established representing Better Auth core tables (`user`, `session`, `account`, `verification`) alongside domain profile tables (`student_profile`, `organization_profile`, `admin_profile`, `signup_intents`, `audit_logs`).
   - Strict `1:1` relationship integrity is enforced by placing unique indexes on `userId` in `student_profile`, `organization_profile`, and `admin_profile` with cascading foreign keys to `user.id`.

2. **From Observation 1 (Role Security & Google OAuth Attack Vectors)**:
   - In standard OAuth flows, an attacker could attempt to pass a desired role via client-side request body or modify OAuth callback query parameters.
   - To eliminate client manipulation, a pre-OAuth intent handshake is architected:
     - The user selects a role on the UI, triggering a POST to `/api/auth/signup-intent` (`role` strictly in `['STUDENT', 'ORGANIZATION']`).
     - A 32-byte cryptographic token is stored in `signup_intents` with a 15-minute TTL.
     - The OAuth flow consumes this token via server state and Better Auth `databaseHooks.user.create.before`.
     - Admin public registration is rejected at the API level (403), with admin accounts provisioned strictly through server configuration (`INITIAL_ADMIN_EMAIL`) or existing Super Admin invitation.
     - Returning Google logins automatically resolve to their permanent DB `user.role`. Attempting to register under a different role triggers a rejection modal and redirects to their existing dashboard.

3. **From Observation 1 (Multi-Step Onboarding & State Transitions)**:
   - Both Students and Organizations undergo an onboarding wizard tracking `onboardingStatus` (`NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED`).
   - Student onboarding has 8 steps (Basic, Academic, Skills, Projects, Certifications, Experience, Career Preferences, Review) with a weighted scoring formula yielding a 0–100% completion score.
   - Organization onboarding has 7 steps (Org Info, Registration CIN/GSTIN, Primary Contact, Industry Domain, Hiring Preferences, Verification Docs, Review) with a weighted formula.

4. **From Observation 1 (Admin Governance & Gatekeeping)**:
   - Organizations start in `verificationStatus = 'PENDING'`.
   - Gating rules enforce that `PENDING`, `INFO_REQUESTED`, `REJECTED`, or `SUSPENDED` organizations may create draft opportunities, but cannot publish opportunities to students, view private candidate contact details/PII, or send interview invites.
   - Admin approval transitions `verificationStatus = 'APPROVED'` and `accountStatus = 'ACTIVE'`, unlocking full recruiter capabilities and recording an immutable audit log.

5. **From Observation 1 & 3 (Route & API Protection)**:
   - A dual-layer defense is architected:
     - Layer 1 (Edge Middleware in `middleware.ts`): Intercepts route partitions (`/student/*`, `/recruiter/*`, `/admin/*`), checks session token, verifies role alignment, blocks suspended accounts, and redirects un-onboarded users to `/student/onboarding` or `/organization/onboarding`.
     - Layer 2 (API Authorization Guard `withAuth` in `lib/auth-guard.ts`): Validates session on every API request, enforces role whitelist, verifies account status, checks resource ownership to prevent IDOR (Insecure Direct Object Reference), and logs audit events.

---

## 3. Caveats

1. **Existing JSON DB Compatibility**: The existing repository contains a functioning JSON-based persistence engine (`lib/db.js`) supporting matching algorithms and mock datasets. The Drizzle ORM architecture proposal is designed to layer cleanly alongside or supersede this storage without breaking existing test runners or seed scripts.
2. **Google OAuth Secrets**: Testing real Google OAuth logins requires valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables. In local/development environments without live Google credentials, mock OAuth provider hooks or Better Auth credential emulation can be used for end-to-end testing.
3. **Institute/Faculty Portal Role Mapping**: While the core requirement highlights `STUDENT`, `ORGANIZATION`, and `ADMIN`, the platform also has an Institute portal (`/institute/...`). In this architecture, Institute users can be governed under `ADMIN` (with scoped permissions) or an extended `INSTITUTE` role following the exact same intent-driven pattern.

---

## 4. Conclusion

The complete end-to-end technical architecture for the authentication, authorization, role governance, and profile system has been designed and documented in detail in `architecture_proposal.md`. 

Key architectural deliverables produced:
1. **Drizzle ORM Schema**: Ready-to-implement TypeScript/JavaScript schema for Neon PostgreSQL with strict 1:1 profile relations, enums, indexes, and audit logging.
2. **Cryptographic Signup Intent & Role Immutability Engine**: Complete lifecycle preventing client role tampering, public admin registration, and multi-role account pollution.
3. **Multi-Step Onboarding & Dynamic Completion Models**: Mathematical scoring equations and step state machines for Student and Organization accounts.
4. **Admin Governance & Capability Gating Matrix**: Complete permissions matrix blocking unapproved organizations from candidate PII and live opportunity publishing.
5. **Next.js Middleware & API Route Guard Architecture (`withAuth`)**: Full implementation specifications for edge filtering, role partitioning, account status enforcement, and IDOR protection.

---

## 5. Verification Method

To independently verify the architecture proposal and its design specifications:

1. **Inspect Architecture Proposal Document**:
   - View `e:/sih_2026_044/.agents/survey_architecture_explorer/architecture_proposal.md`.
   - Verify that all tables (`user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `organization_profile`, `admin_profile`, `audit_logs`) have complete field definitions, enums, unique indexes, and foreign key cascades.
   - Verify that the signup intent lifecycle, Google OAuth hooks, and role immutability mechanisms are fully detailed.
   - Verify that the onboarding weighting formulas, admin capability gating matrix, Next.js Edge middleware, and `withAuth` helper are fully written out.

2. **Validate Codebase Compatibility**:
   - Check `package.json` to confirm `"drizzle-orm"`, `"@neondatabase/serverless"`, and `"drizzle-kit"` are present and compatible with the proposed schema.
   - Run existing test suites to ensure zero regressions in existing matching engines:
     ```powershell
     node scripts/test-matching-rules.js
     ```

3. **Invalidation Conditions**:
   - If client-side requests are permitted to define or alter user roles without server intent validation.
   - If a Google account can be linked to more than one active role simultaneously.
   - If unapproved organizations can access private student PII or publish live postings.
