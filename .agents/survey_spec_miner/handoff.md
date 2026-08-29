# Handoff Report — Specification & Requirements Mining

**Agent**: `survey_spec_miner`  
**Date**: 2026-08-23T13:50:00Z  
**Type**: Hard Handoff (Task Complete)  
**Primary Deliverable**: `e:/sih_2026_044/.agents/survey_spec_miner/requirements_map.md`  
**Target Milestone**: Survey & Specification Phase  

---

## 1. Observation

- **Authoritative Source**: `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md` (Lines 1-85)
  - Core Mandate (Lines 5-6): *"Build a complete, secure, role-based authentication system for Skill Bridge (SIH 2026 platform) using Better Auth, Google OAuth, PostgreSQL/Neon, and Drizzle ORM. Enforce the core principle: 'One Google Account = One Skill Bridge Account = One Application Role' across STUDENT, ORGANIZATION, and ADMIN roles."*
  - Requirement R1 (Lines 12-16): Better Auth & Google OAuth setup, Next.js catch-all route handler (`/api/auth/[...all]`), Drizzle ORM schemas for `user`, `session`, `account`, `verification`, connected to Neon PostgreSQL, client auth in `lib/auth-client.ts`, and environment variable configuration with `.env.example`.
  - Requirement R2 (Lines 18-23): Server-owned role model (`STUDENT`, `ORGANIZATION`, `ADMIN`), tamper-proof role assignment, `signup_intents` table with cryptographic tokens, strict prohibition of public admin registration, and role immutability with conflict resolution modals for returning accounts.
  - Requirement R3 (Lines 24-32): Role-specific profile tables (`student_profile`, `organization_profile`, `admin_profile`), `audit_logs` table, 1:1 database unique constraints, and audit logging of all sensitive actions (`LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`).
  - Requirement R4 (Lines 33-39): Multi-step onboarding flows (`/student/onboarding` with 8 steps, `/organization/onboarding` with 7 steps), tracking `onboardingStatus` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`), auto-redirection, and dynamic profile completion calculation.
  - Requirement R5 (Lines 40-44): Admin governance at `/admin/*`, organization verification workflow (`PENDING` $\rightarrow$ `APPROVED`/`REJECTED`/`INFO_REQUESTED`), and organization gatekeeping (pending/suspended organizations can draft listings but cannot publish, view candidate data, or contact students).
  - Requirement R6 (Lines 45-52): Server-side session and role authorization middleware, strict route guards (`/student/*`, `/organization/*`, `/admin/*`), and API endpoint security checks (session, role, account status, and resource ownership).
  - Acceptance Criteria (Lines 53-85): 21 discrete acceptance criteria covering core auth, role security, onboarding, governance, and route protection.

- **Current Repository State**:
  - `package.json` contains `@neondatabase/serverless` (v1.1.0), `drizzle-orm` (v1.0.0-rc.4), `drizzle-kit` (v1.0.0-rc.4), `next` (v14.2.5), `lucide-react` (v0.428.0), `tailwindcss` (v3.4.10).
  - `.env` contains `DATABASE_URL` (Neon PostgreSQL endpoint) and empty `BETTERAUTH_SEC`.
  - Existing portals exist at `/app/student`, `/app/recruiter`, `/app/institute`, `/app/admin` with mock JSON db layer in `lib/db.js`.
  - Current role switching in `components/shared/RoleSwitcher.jsx` utilizes client-side `localStorage` (`sih_active_student_id`), which must be superseded by server-authenticated Better Auth sessions for the new role system.

---

## 2. Logic Chain

1. **Analysis of Core Invariant**:
   - `ORIGINAL_REQUEST.md` mandates *"One Google Account = One Skill Bridge Account = One Application Role"*.
   - If a Google account registers as `STUDENT`, its database `user.role` becomes `STUDENT`.
   - Any subsequent login attempt with that Google account requesting an `ORGANIZATION` role must NOT overwrite `user.role` or create a duplicate account. It must resolve to the existing `STUDENT` user, alert the user via a role-conflict modal, and route them to their student portal.

2. **Pre-OAuth Intent Token Architecture**:
   - Google OAuth is initiated before a user record is created in the database.
   - To securely convey the intended role chosen on the frontend without relying on client-side state after OAuth redirects, a short-lived `signup_intents` table storing `{ token, role, expiresAt, usedAt }` is required.
   - The token is passed as the OAuth `state` parameter and validated inside the OAuth callback lifecycle.

3. **Data Isolation & Relational Integrity**:
   - To guarantee 1:1 user-to-profile mapping without orphan or duplicate profiles, `student_profiles.userId`, `organization_profiles.userId`, and `admin_profiles.userId` must enforce a database-level `UNIQUE` constraint with `ON DELETE CASCADE`.
   - Audit logging must be decoupled via a dedicated append-only `audit_logs` table storing actor, action, target, resource, and timestamp.

4. **Multi-Step Onboarding & Gatekeeping Logic**:
   - New users have `onboardingStatus = 'NOT_STARTED'`.
   - Middleware intercepts any attempt to access `/student/opportunities` or `/recruiter/dashboard` and redirects to `/student/onboarding` or `/organization/onboarding`.
   - Once an organization completes onboarding, its `verificationStatus` becomes `PENDING` and `accountStatus` becomes `PENDING`.
   - Gatekeeping rules strictly forbid pending organizations from publishing opportunities (`POST /api/opportunities` forces `DRAFT` or returns 403) and completely blocks candidate queries (`GET /api/recruiter/candidates` returns 403).

5. **Route Protection & Threat Surface**:
   - Client-side checks (e.g. `localStorage`) are insecure and susceptible to local state tampering.
   - All authorization must occur server-side in Next.js Server Middleware (`middleware.ts`) and API route handlers inspecting Better Auth session cookies and PostgreSQL database records.

---

## 3. Caveats

- **Existing Mock Portals**: The existing codebase contains pre-built mock interfaces (e.g. `/app/recruiter/dashboard`, `/app/student/opportunities`) designed for the prototype matching engine. These routes will need their client-side role switcher decoupled and connected to Better Auth session state during the implementation phase.
- **Neon Cold Starts**: In serverless PostgreSQL environments, initial connection latency may occur during cold starts. Connection pooling via `@neondatabase/serverless` is specified to mitigate this.
- **Admin Seeding**: Because public admin registration is prohibited, initial deployment must run a seed script (`scripts/seed.js` or `INITIAL_ADMIN_EMAIL` check) to establish the first admin account.

---

## 4. Conclusion

The specification and requirements mining is complete and documented in full detail at `e:/sih_2026_044/.agents/survey_spec_miner/requirements_map.md`.

Key assets delivered:
1. **Requirements Map** covering R1 to R6 with granular functional specifications.
2. **Features Discovered Table** (22 distinct features mapped across Core Auth, Role Security, Schema/DB, Onboarding, Governance, Gatekeeping, and Route Security).
3. **Edge Cases Table** (15 boundary scenarios with exact expected behaviors).
4. **Security Threat Model & Attack Vectors** (8 attack vectors analyzed with concrete mitigations).
5. **Drizzle ORM Schema Specifications** for all 9 core and extension tables.
6. **Acceptance Criteria Verification Matrix** mapping all 21 criteria to concrete test methods.

The orchestrator and downstream worker agents (Schema Builders, Auth Implementers, Onboarding UI Workers, Route Middleware Engineers, and Test Writers) have an authoritative, complete blueprint to proceed with implementation.

---

## 5. Verification Method

To independently verify this specification against project requirements:

1. **Inspect Requirements Map**:
   - View `e:/sih_2026_044/.agents/survey_spec_miner/requirements_map.md`.
2. **Cross-Check with Authoritative Request**:
   - Compare §3, §4, §5, §6, and §7 of `requirements_map.md` directly against `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md` to confirm 100% requirement coverage.
3. **Validate Database Schema Completeness**:
   - Check that all 9 tables (`user`, `session`, `account`, `verification`, `signup_intents`, `student_profiles`, `organization_profiles`, `admin_profiles`, `audit_logs`) have complete column, type, foreign key, and unique constraint definitions.
4. **Validate Security Controls**:
   - Check that every attack vector (role tampering, OAuth state manipulation, public admin registration, unverified org candidate harvesting, IDOR) has an explicit architectural defense defined in the specification.
