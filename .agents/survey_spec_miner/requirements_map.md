# Skill Bridge: Comprehensive Requirements Map & Technical Specification

**Document Version**: 1.0.0  
**Author**: Specification & Requirements Miner  
**Target Platform**: Skill Bridge (SIH 2026 Platform)  
**Authoritative Reference**: `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md`  
**Integrity Mode**: Development / Production Ready  
**Core Invariant**: *"One Google Account = One Skill Bridge Account = One Application Role"* across `STUDENT`, `ORGANIZATION`, and `ADMIN`.

---

## 1. Executive Summary & System Overview

Skill Bridge is an industry collaboration platform designed for the Smart India Hackathon (SIH 2026) to bridge students, industry recruiters/organizations, educational institutions, and platform administrators. This specification defines the complete, enterprise-grade, secure role-based authentication and governance infrastructure powered by:
- **Better Auth** (`better-auth` v1.x+) with Next.js App Router route handlers (`/api/auth/[...all]`).
- **Google OAuth 2.0** as the primary identity provider.
- **Neon Serverless PostgreSQL** via `@neondatabase/serverless`.
- **Drizzle ORM** (`drizzle-orm` and `drizzle-kit`) for schema definitions, migrations, and relational queries.
- **Tamper-Proof Role Assignment Engine** using short-lived cryptographic signup intents (`signup_intents`).
- **Role-Aware Middleware & Proxy Authorization** enforcing server-side gatekeeping, profile completion redirects, and strict resource isolation.

---

## 2. Core Principles & Platform Invariants

| Principle ID | Principle Name | Authoritative Invariant | Enforcement Mechanism |
|---|---|---|---|
| **INV-01** | One Google Account = One Role | A single Google OAuth identity (email / subject ID) can bind to exactly one role (`STUDENT`, `ORGANIZATION`, or `ADMIN`) for its entire lifecycle. | Server-side lookup during OAuth callback; database unique constraints on `user.email` and `account.providerAccountId`. |
| **INV-02** | Role Immutability | Once assigned at initial registration, a user's role is strictly immutable. Clients cannot mutate their role via request payloads, query strings, headers, or generic update routes. | Server-owned role column on `user` table; excluded from all client-facing mutation schemas; verified against session JWT / DB session on every request. |
| **INV-03** | No Public Admin Registration | Public users can never self-register or request an `ADMIN` role through public signup flows or OAuth intent injection. | Role intent endpoint rejects `ADMIN` requests; Admin accounts can only be provisioned via database seed, `INITIAL_ADMIN_EMAIL` env check, or existing admin invite. |
| **INV-04** | Role Profile 1:1 Strict Mapping | Every user record of role $R$ must have exactly one corresponding profile record in table $R\_profile$ (e.g. `user.id` $\leftrightarrow$ `student_profile.user_id`), and zero records in other role profile tables. | Database Foreign Key with `UNIQUE` constraint (`user_id REFERENCES user(id) ON DELETE CASCADE UNIQUE`). |
| **INV-05** | Gatekeeping for Unverified Organizations | Newly registered organizations start in `PENDING` status. Pending or Suspended organizations can draft listings but are strictly forbidden from publishing listings, searching students, or viewing student PII. | Server-side status checks in API route handlers and database queries (`accountStatus === 'ACTIVE' && verificationStatus === 'APPROVED'`). |
| **INV-06** | Complete Onboarding En route Guard | Any user whose `onboardingStatus !== 'COMPLETED'` must be intercepted and redirected to their role-specific onboarding wizard (`/student/onboarding` or `/organization/onboarding`) before accessing dashboard or operational routes. | Next.js Edge / Server Middleware inspecting session claims & database profile state. |
| **INV-07** | Tamper-Proof Intent Binding | Pre-OAuth role selection (e.g. clicking "Sign in as Student" vs "Sign in as Organization") must be cryptographically bound to the OAuth transaction state. | `signup_intents` table storing short-lived UUID tokens / state hashes validated upon OAuth callback. |
| **INV-08** | Immutable Audit Trail | Every state-modifying administrative action, authentication lifecycle event, and status transition must produce an immutable audit log. | Append-only `audit_logs` table with actor ID, target ID, action enum, resource type/ID, timestamp, and metadata payload. |

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| **F-01** | Core Auth | Better Auth Next.js Route Handler | Catch-all route handler `/api/auth/[...all]` handling OAuth handshakes, session cookies, CSRF protection, and user hydration. | HTTP Requests (GET/POST) to `/api/auth/*` | Auth session cookie, JSON response with session/user metadata | Returns 400/401/500 structured JSON error on invalid credentials/signatures | `ORIGINAL_REQUEST §R1` |
| **F-02** | Core Auth | Google OAuth Provider Integration | Social provider integration redirecting users to Google OAuth consent screen and processing callbacks. | OAuth code, state query params from Google | User account record in DB, authenticated session cookie | Redirects to `/auth/error?error=OAuthCallback` on state mismatch or user denial | `ORIGINAL_REQUEST §R1` |
| **F-03** | Core Auth | Client Auth React Integration | React hook / client auth instance (`lib/auth-client.ts` or `.js`) exposing `useSession`, `signIn.social`, `signOut`. | Client invocation (`authClient.signIn.social({ provider: 'google' })`) | Session object, user object, active status | Returns error object with code & message on network/auth failure | `ORIGINAL_REQUEST §R1` |
| **F-04** | Core Auth | Environment Secret Management | Secure environment configuration parsing `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`. | Process environment variables | Configured server/auth runtime | Fails fast on startup with descriptive error if critical secrets are missing | `ORIGINAL_REQUEST §R1` |
| **F-05** | Role Model | Server-Owned Role Model | Explicit role assignment (`STUDENT`, `ORGANIZATION`, `ADMIN`) stored on the database `user` record, never modifiable by client payload. | User creation event / verified intent | Role enum assigned to user record | Rejects any client attempt to supply or mutate `role` parameter | `ORIGINAL_REQUEST §R2` |
| **F-06** | Role Model | Pre-OAuth Signup Intent Tokenization | API `/api/auth/intent` creates short-lived record in `signup_intents` linking selected role to state token before redirecting to Google. | `{ role: 'STUDENT' \| 'ORGANIZATION' }` | `{ intentToken: string, state: string, expiresAt: Date }` | Rejects invalid role (e.g. `role: 'ADMIN'`) with 400 Bad Request | `ORIGINAL_REQUEST §R2` |
| **F-07** | Role Model | Strict Admin Provisioning Guard | Admin accounts can only be provisioned via database seed, `INITIAL_ADMIN_EMAIL` match during verified OAuth, or super-admin invitation. | OAuth callback with admin email | Admin user created with `role = 'ADMIN'`, `admin_profile` created | Public signup attempts requesting `ADMIN` role return 403 Forbidden | `ORIGINAL_REQUEST §R2` |
| **F-08** | Role Model | Existing User Role Collision Modal | Returning Google account trying to sign up under a different role is detected, rejected, and given a clear modal ("Account already registered as [ROLE]") with redirect to dashboard. | Google OAuth profile with existing email, mismatched requested intent role | Redirect to `/auth/role-conflict?existingRole=[ROLE]` + modal | Prevents role mutation, preserves original role and data | `ORIGINAL_REQUEST §R2` |
| **F-09** | Schema & DB | Better Auth Core Schemas | Drizzle ORM definitions for `user`, `session`, `account`, `verification` connected to Neon PostgreSQL. | Drizzle schema definitions | PostgreSQL tables with primary keys, indexes, and FK constraints | Throws Drizzle/Postgres constraint errors on duplicate or invalid keys | `ORIGINAL_REQUEST §R1` |
| **F-10** | Schema & DB | Role Profile Schemas | 1:1 relational profile tables: `student_profile`, `organization_profile`, `admin_profile` linked by `user_id`. | User ID, profile payload | Persisted role profile row | Fails on unique violation if multiple profiles created for same user | `ORIGINAL_REQUEST §R3` |
| **F-11** | Schema & DB | Audit Logging Engine | Append-only table `audit_logs` storing actor, action, target, resource, metadata, timestamp. | Audit event payload | Persisted audit record | Returns error if actor or required fields are missing; non-blocking to critical path | `ORIGINAL_REQUEST §R3` |
| **F-12** | Onboarding | Student Multi-Step Onboarding Wizard | 8-step onboarding flow at `/student/onboarding`: Basic Info, Academic Info, Skills, Projects, Certs, Experience, Career Preferences, Review. | Step form payloads | Updated `student_profile` + skill/project relational records | Form validation error per step; blocks submission until required fields valid | `ORIGINAL_REQUEST §R4` |
| **F-13** | Onboarding | Organization Multi-Step Onboarding Wizard | 7-step onboarding flow at `/organization/onboarding`: Org Info, Business Reg, Contact Info, Industry, Hiring Preferences, Verification Docs, Review. | Step form payloads | Updated `organization_profile`, status set to `PENDING` | Step validation error on missing registration or contact details | `ORIGINAL_REQUEST §R4` |
| **F-14** | Onboarding | Dynamic Profile Completion Calculator | Real-time calculation of profile completion percentage (0-100%) based on populated mandatory and optional fields. | Student / Organization profile fields | `profileCompletion: number` (0 to 100) | Defaults to 0% if profile is blank; updates on each draft save | `ORIGINAL_REQUEST §R4` |
| **F-15** | Onboarding | Onboarding Route Interceptor | Middleware checks `user.onboardingStatus` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`); redirects uncompleted users to onboarding wizard. | Request URL, session user data | Next URL / HTTP 307 Redirect | Unauthenticated requests redirected to `/login`; un-onboarded redirected to `/onboarding` | `ORIGINAL_REQUEST §R4` |
| **F-16** | Admin Governance | Admin Verification & Review Queue | Dashboard at `/admin/companies` listing all `PENDING` organizations with verification documents, tax/reg IDs, and contact info. | Admin review action (`approve`, `reject`, `request_info`, `notes`) | Updated `organization_profile.verificationStatus`, updated `user.accountStatus` | 403 if non-admin attempts action; audit log recorded | `ORIGINAL_REQUEST §R5` |
| **F-17** | Admin Governance | Platform User Lifecycle Management | Admin console at `/admin/users` to view all platform users, filter by role/status, toggle statuses (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`). | Admin toggle command (`userId`, `newStatus`, `reason`) | Updated `user.accountStatus`, user session revoked if suspended | 403 Forbidden for non-admins; cannot suspend self | `ORIGINAL_REQUEST §R5` |
| **F-18** | Admin Governance | Admin Audit Trail Explorer | Audit viewer at `/admin/audit` with search, filtering by actor, action type, resource, date range. | Query params (actor, action, dates) | Paginated audit log records with structured metadata viewer | 403 Forbidden for non-admins | `ORIGINAL_REQUEST §R5` |
| **F-19** | Gatekeeping | Unverified Organization Opportunity Gate | Pending or suspended organizations can save draft opportunities, but cannot publish live opportunities. | Opportunity creation/publish payload | Draft opportunity saved / Publish rejected with 403 | Returns `403 Forbidden: Organization verification pending or account suspended` | `ORIGINAL_REQUEST §R5` |
| **F-20** | Gatekeeping | Candidate Privacy & PII Shielding | Pending/Suspended organizations cannot access student candidate directory, search profiles, view resumes, or contact students. | Candidate directory query from pending org | 403 Forbidden / Redacted candidate list | API rejects student lookup requests with 403 for unverified orgs | `ORIGINAL_REQUEST §R5` |
| **F-21** | Route Security | Role-Based Route Middleware | Next.js Server Middleware inspecting session cookie, JWT claims, and URL prefixes (`/student/*`, `/organization/*`, `/admin/*`). | Request path, session cookie | Forward request OR 307 Redirect / 403 Forbidden | Redirects unauthenticated to `/login`, wrong-role to their authorized dashboard | `ORIGINAL_REQUEST §R6` |
| **F-22** | Route Security | Resource Ownership & IDOR Protection | Server-side validation verifying that mutating API calls (`PUT /api/opportunities/[id]`, `DELETE /api/profile/[id]`) belong to the authenticated user's organization/student ID. | Request session user ID, target entity ID | Database update / delete operation | Returns `403 Forbidden: Not authorized to modify this resource` on ownership mismatch | `ORIGINAL_REQUEST §R6` |

---

## 4. Edge Cases & Boundary Conditions

| # | Feature | Input / Condition | Observed & Required Behavior |
|---|---------|-------------------|-----------------------------|
| **EC-01** | Signup Intent Token | Expired signup intent token (&gt; 15 minutes since role selection before OAuth completion). | Server rejects intent, redirects user to role selection screen with notice: "Signup session expired. Please select your role and try again." |
| **EC-02** | Signup Intent Token | Replayed signup intent token (used once, then reused in a second OAuth callback). | Server verifies `usedAt` flag in `signup_intents`. Replay attempt is rejected with 400 Bad Request; security audit event logged. |
| **EC-03** | Role Collision | Existing `STUDENT` user logs in via "Sign in as Organization" button with same Google account. | System detects existing user record with `role = 'STUDENT'`. Aborts role mutation, logs audit entry, renders modal: *"This Google account is already registered as a Student. Redirecting to Student Portal..."*, and redirects to `/student/opportunities`. |
| **EC-04** | Role Collision | Existing `ORGANIZATION` user logs in via "Sign in as Student" button with same Google account. | System detects existing user record with `role = 'ORGANIZATION'`. Preserves organization role, renders modal: *"This Google account is already registered as an Organization. Redirecting to Recruiter Portal..."*, and redirects to `/recruiter/dashboard`. |
| **EC-05** | Admin Public Signup | Malicious user calls `/api/auth/intent` with `{ role: 'ADMIN' }` or injects `role=ADMIN` in OAuth callback. | Endpoint schema validation rejects `ADMIN` with 400 Bad Request. OAuth callback fallback defaults to unprivileged state or rejects registration. |
| **EC-06** | Role Parameter Tampering | Authenticated Student sends `PATCH /api/user` with body `{ role: "ADMIN", accountStatus: "ACTIVE" }`. | API uses strict Drizzle update schema that explicitly strips `role` and `accountStatus`. Role remains `STUDENT`. |
| **EC-07** | Uncompleted Onboarding Direct Access | User with `onboardingStatus = 'IN_PROGRESS'` navigates directly to `/student/opportunities` or `/student/profile`. | Middleware detects `onboardingStatus !== 'COMPLETED'` and redirects with HTTP 307 to `/student/onboarding`. |
| **EC-08** | Suspended User Active Session | Admin changes user status from `ACTIVE` to `SUSPENDED` while user has an active session cookie. | Subsequent API call or page navigation checks `user.accountStatus` in DB/session. User is immediately invalidated, session revoked, and redirected to `/auth/suspended` with 403. |
| **EC-09** | Pending Organization Publish Attempt | Organization with `verificationStatus = 'PENDING'` sends `POST /api/opportunities` with `{ status: 'PUBLISHED' }`. | Server-side validation forces `status = 'DRAFT'` or rejects with `403 Forbidden: "Organization must be verified before publishing opportunities"`. |
| **EC-10** | IDOR on Organization Job Editing | Recruiter A (Org 1) attempts `PUT /api/opportunities/opp_999` where `opp_999` belongs to Org 2. | Server queries opportunity with `WHERE id = 'opp_999' AND organizationId = session.user.orgId`. Zero rows updated; returns `403 Forbidden` or `404 Not Found`. |
| **EC-11** | Concurrent First-Time Signup | Two concurrent OAuth callback requests for a brand new Google email. | Database `UNIQUE` constraint on `user.email` ensures only one transaction creates the user; second transaction gracefully catches collision and logs in. |
| **EC-12** | Database Disconnection / Neon Sleep | Neon database cold start or transient connection failure during session lookup. | Drizzle connection pool with exponential backoff retry; if failed, returns structured 503 Service Unavailable without leaking stack trace. |
| **EC-13** | Student Missing Mandatory Skills in Onboarding | Student submits step 3 of onboarding without entering any skills or leaving proficiency blank. | Client and server validation reject step with `400 Bad Request: "At least one skill with a valid proficiency level (1-4) is required"`. |
| **EC-14** | Organization Document Upload Failure | Org onboarding step 6 submits without valid business registration ID or invalid file URL format. | Server validation rejects submission; `onboardingStatus` remains `IN_PROGRESS`. |
| **EC-15** | Admin Self-Suspension Attempt | Logged-in Admin attempts `POST /api/admin/users/toggle-status` targeting their own `userId`. | Server checks `targetUserId === session.user.id`; rejects with `400 Bad Request: "Admins cannot suspend or deactivate their own account"`. |

---

## 5. Granular Requirements Breakdown (R1 to R6)

### R1. Better Auth & Google OAuth Setup

#### R1.1 Package & Adapter Configuration
- **Package Requirements**:
  - `better-auth`: Core authentication engine.
  - `@better-auth/cli` or Drizzle adapter integration.
  - `@neondatabase/serverless` & `drizzle-orm`: PostgreSQL connection and schema management.
- **Route Handler**:
  - Catch-all Next.js route at `/app/api/auth/[...all]/route.ts` (or `.js`).
  - Exports `GET` and `POST` handlers delegating directly to `auth.handler(request)`.
- **Client Auth**:
  - `lib/auth-client.ts` (or `lib/auth-client.js`) initializing `createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' })`.
  - Exposes React hooks and client methods for components (`signIn`, `signOut`, `useSession`, `getSession`).

#### R1.2 Environment Variables Configuration
| Variable Name | Required / Optional | Description | Security Classification |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Required | 32+ character high-entropy secret for signing session cookies and tokens | Secret (Server only) |
| `BETTER_AUTH_URL` | Required | Base application URL (e.g. `http://localhost:3000` or production domain) | Public / Config |
| `GOOGLE_CLIENT_ID` | Required | OAuth 2.0 Client ID from Google Cloud Console | Public / Config |
| `GOOGLE_CLIENT_SECRET` | Required | OAuth 2.0 Client Secret from Google Cloud Console | Secret (Server only) |
| `DATABASE_URL` | Required | Neon PostgreSQL connection string (`postgresql://user:pass@host/db?sslmode=require`) | Secret (Server only) |
| `INITIAL_ADMIN_EMAIL` | Required | Pre-configured admin email address for initial bootstrap | Config (Server only) |
| `.env.example` | Required | Sanitized reference file documenting all variable names with placeholders | Public Repository File |

---

### R2. Secure Role Model & Tamper-Proof Role Assignment

#### R2.1 Role Model Architecture
The platform defines three mutually exclusive roles:
1. `STUDENT`: Enrolled learners, job seekers, and applicants.
2. `ORGANIZATION`: Corporate recruiters, hiring managers, and company representatives.
3. `ADMIN`: Platform operators, verification officers, and system administrators.

```
+-----------------------------------------------------------------------------------+
|                              Google OAuth Flow                                    |
+-----------------------------------------------------------------------------------+
                                       |
                   User clicks "Join as Student" / "Join as Org"
                                       |
                   +---------------------------------------+
                   | Generate Short-Lived Signup Intent    |
                   | (Token, Role, Expires in 15 mins)     |
                   +---------------------------------------+
                                       |
                        Redirect to Google OAuth Consent
                                       |
                         Google Callback with Code & State
                                       |
                   +---------------------------------------+
                   |  Lookup User by Google Email in DB    |
                   +---------------------------------------+
                                  /         \
                            Exists?          New User?
                           /                   \
                         YES                    NO
                         /                        \
      +--------------------------------+   +------------------------------------+
      | Check Existing Role in DB      |   | Validate Signup Intent Role Token  |
      | Is requested == existing?      |   | (Reject ADMIN requests)            |
      |   YES -> Login & Dashboard     |   +------------------------------------+
      |   NO  -> Block Mutation, Show  |                  |
      |          Role Collision Modal  |   +------------------------------------+
      |          & Redirect to Existing|   | Create User with server-assigned   |
      |          Dashboard             |   | role + Create Role Profile + Audit |
      +--------------------------------+   +------------------------------------+
                                                          |
                                           +------------------------------------+
                                           | Redirect to /<role>/onboarding     |
                                           +------------------------------------+
```

#### R2.2 Intent State Machine (`signup_intents`)
- When a user chooses a role on the landing/login page:
  1. Frontend calls `POST /api/auth/intent` with `{ role: 'STUDENT' | 'ORGANIZATION' }`.
  2. Server generates a cryptographically secure random token (e.g. `crypto.randomUUID()`), records `token`, `role`, `expiresAt = now + 15min`, `usedAt = null` in the database or encrypted cookie state.
  3. Returns state token to client; client initiates Better Auth Google sign-in passing this state.
  4. On OAuth callback hook:
     - If user exists in `user` table: Existing role is preserved. If intent role differs from DB role, intent is discarded, and user is notified of their active role.
     - If user is new: Server fetches intent record by token, validates `role IN ('STUDENT', 'ORGANIZATION')` and `expiresAt > now` and `usedAt IS NULL`.
     - Assigns role to new user, sets `usedAt = now()`, and creates initial profile row.
     - If no valid intent exists and email matches `INITIAL_ADMIN_EMAIL`, assigns `ADMIN`. Otherwise, falls back to role selection screen.

#### R2.3 Immutability Invariant & Defense-in-Depth
- **No Role Update API**: There is zero API endpoint allowing regular users to change `user.role`.
- **Admin Role Elevation Protection**: Even platform admins cannot switch a Student to an Organization directly because the relational data models are fundamentally distinct. Admin role management is restricted to user account status toggling (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`).

---

### R3. Profile Schemas, DB Relations & Audit Logging

#### R3.1 Entity Relationship Diagram (Conceptual)
```
       +-------------------------------------------------------------+
       |                         users                               |
       +-------------------------------------------------------------+
       | id (PK, text/uuid)                                          |
       | email (text, unique)                                        |
       | name (text)                                                 |
       | image (text)                                                |
       | emailVerified (boolean)                                     |
       | role (text: 'STUDENT' | 'ORGANIZATION' | 'ADMIN')           |
       | accountStatus ('ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACT')|
       | onboardingStatus ('NOT_STARTED'|'IN_PROGRESS'|'COMPLETED')  |
       | createdAt (timestamp)                                       |
       | updatedAt (timestamp)                                       |
       +-------------------------------------------------------------+
          | (1:1)               | (1:1)                  | (1:1)
          |                     |                        |
          v                     v                        v
+--------------------+ +-------------------------+ +---------------------+
|  student_profiles  | |  organization_profiles  | |   admin_profiles    |
+--------------------+ +-------------------------+ +---------------------+
| id (PK)            | | id (PK)                 | | id (PK)             |
| userId (FK, unique)| | userId (FK, unique)     | | userId (FK, unique) |
| instituteName      | | companyName             | | permissions (json)  |
| department         | | website                 | | department          |
| graduationYear     | | registrationNumber      | | createdAt           |
| cgpa               | | industryType            | +---------------------+
| bio                | | companySize             |
| phone              | | contactEmail            |
| skills (json)      | | contactPhone            |
| projects (json)    | | address                 |
| certs (json)       | | verificationStatus      |
| experience (json)  | | verificationDocuments   |
| careerPrefs (json) | | profileCompletion (int) |
| profileCompletion  | | createdAt               |
| createdAt          | +-------------------------+
+--------------------+
```

#### R3.2 Complete Schema Definitions (Drizzle ORM Specifications)

1. **`user` Table** (Better Auth core + platform extension columns):
   - `id`: `text("id").primaryKey()`
   - `name`: `text("name").notNull()`
   - `email`: `text("email").notNull().unique()`
   - `emailVerified`: `boolean("email_verified").notNull().default(false)`
   - `image`: `text("image")`
   - `role`: `text("role").notNull().default("STUDENT")` (Enum check: `'STUDENT'`, `'ORGANIZATION'`, `'ADMIN'`)
   - `accountStatus`: `text("account_status").notNull().default("ACTIVE")` (Enum check: `'ACTIVE'`, `'PENDING'`, `'SUSPENDED'`, `'DEACTIVATED'`)
   - `onboardingStatus`: `text("onboarding_status").notNull().default("NOT_STARTED")` (Enum check: `'NOT_STARTED'`, `'IN_PROGRESS'`, `'COMPLETED'`)
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

2. **`session` Table** (Better Auth core):
   - `id`: `text("id").primaryKey()`
   - `userId`: `text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })`
   - `token`: `text("token").notNull().unique()`
   - `expiresAt`: `timestamp("expires_at").notNull()`
   - `ipAddress`: `text("ip_address")`
   - `userAgent`: `text("user_agent")`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

3. **`account` Table** (Better Auth core):
   - `id`: `text("id").primaryKey()`
   - `userId`: `text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })`
   - `accountId`: `text("account_id").notNull()`
   - `providerId`: `text("provider_id").notNull()` (e.g. `'google'`)
   - `accessToken`: `text("access_token")`
   - `refreshToken`: `text("refresh_token")`
   - `accessTokenExpiresAt`: `timestamp("access_token_expires_at")`
   - `refreshTokenExpiresAt`: `timestamp("refresh_token_expires_at")`
   - `scope`: `text("scope")`
   - `idToken`: `text("id_token")`
   - `password`: `text("password")`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

4. **`verification` Table** (Better Auth core):
   - `id`: `text("id").primaryKey()`
   - `identifier`: `text("identifier").notNull()`
   - `value`: `text("value").notNull()`
   - `expiresAt`: `timestamp("expires_at").notNull()`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

5. **`signup_intents` Table**:
   - `id`: `text("id").primaryKey()`
   - `token`: `text("token").notNull().unique()`
   - `role`: `text("role").notNull()` (Constraint: `STUDENT` or `ORGANIZATION`)
   - `email`: `text("email")`
   - `expiresAt`: `timestamp("expires_at").notNull()`
   - `usedAt`: `timestamp("used_at")`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`

6. **`student_profiles` Table**:
   - `id`: `text("id").primaryKey()`
   - `userId`: `text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - `institute`: `text("institute")`
   - `department`: `text("department")`
   - `degree`: `text("degree")`
   - `graduationYear`: `integer("graduation_year")`
   - `cgpa`: `text("cgpa")`
   - `bio`: `text("bio")`
   - `phone`: `text("phone")`
   - `skills`: `jsonb("skills").default([])` // Array of `{ name: string, proficiency: 1|2|3|4, evidenceLevel: 1|2|3|4|5 }`
   - `projects`: `jsonb("projects").default([])` // Array of `{ title, description, repoUrl, liveUrl, techStack }`
   - `certifications`: `jsonb("certifications").default([])` // Array of `{ name, issuer, issueDate, credentialUrl }`
   - `experience`: `jsonb("experience").default([])` // Array of `{ title, company, duration, description }`
   - `careerPreferences`: `jsonb("career_preferences").default({})` // `{ roles: [], locations: [], expectedStipend }`
   - `profileCompletion`: `integer("profile_completion").default(0)`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

7. **`organization_profiles` Table**:
   - `id`: `text("id").primaryKey()`
   - `userId`: `text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - `name`: `text("name").notNull()`
   - `logo`: `text("logo")`
   - `website`: `text("website")`
   - `registrationId`: `text("registration_id")` // CIN / GSTIN / LLPIN
   - `industry`: `text("industry")`
   - `companySize`: `text("company_size")` // e.g. "1-10", "11-50", "51-200", "201-500", "500+"
   - `contactEmail`: `text("contact_email")`
   - `contactPhone`: `text("contact_phone")`
   - `address`: `text("address")`
   - `hiringPreferences`: `jsonb("hiring_preferences").default({})` // `{ domains: [], locations: [], hiringVolume }`
   - `verificationDocuments`: `jsonb("verification_documents").default([])` // Array of `{ docType, fileUrl, uploadedAt }`
   - `verificationStatus`: `text("verification_status").notNull().default("PENDING")` (Enum: `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'INFO_REQUESTED'`)
   - `verificationNotes`: `text("verification_notes")`
   - `verifiedAt`: `timestamp("verified_at")`
   - `verifiedBy`: `text("verified_by").references(() => user.id)`
   - `profileCompletion`: `integer("profile_completion").default(0)`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

8. **`admin_profiles` Table**:
   - `id`: `text("id").primaryKey()`
   - `userId`: `text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - `department`: `text("department")`
   - `permissions`: `jsonb("permissions").default(["ALL"])`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
   - `updatedAt`: `timestamp("updated_at").defaultNow().notNull()`

9. **`audit_logs` Table**:
   - `id`: `text("id").primaryKey()`
   - `actorUserId`: `text("actor_user_id").references(() => user.id)`
   - `action`: `text("action").notNull()` // Enum check
   - `targetUserId`: `text("target_user_id").references(() => user.id)`
   - `resourceType`: `text("resource_type").notNull()` // e.g. 'USER', 'ORGANIZATION', 'OPPORTUNITY', 'PROFILE', 'AUTH'
   - `resourceId`: `text("resource_id")`
   - `metadata`: `jsonb("metadata").default({})`
   - `ipAddress`: `text("ip_address")`
   - `userAgent`: `text("user_agent")`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`

#### R3.3 Audit Action Dictionary
| Action Constant | Description | Trigger Event |
|---|---|---|
| `LOGIN` | User successfully authenticated session | Better Auth sign-in hook |
| `LOGOUT` | User terminated active session | `authClient.signOut()` invocation |
| `ACCOUNT_CREATED` | New user record persisted in database | Initial OAuth callback resolution |
| `ROLE_ASSIGNED` | Role set for new account from intent | First-time user creation |
| `ORGANIZATION_APPROVED` | Admin approves pending organization KYC | Admin clicks "Approve" on `/admin/companies` |
| `ORGANIZATION_REJECTED` | Admin rejects pending organization | Admin clicks "Reject" with reason |
| `ORGANIZATION_INFO_REQUESTED` | Admin requests additional KYC documents | Admin sends info request with notes |
| `USER_SUSPENDED` | Admin disables account access | Admin toggles status to `SUSPENDED` |
| `USER_REACTIVATED` | Admin re-enables suspended account | Admin toggles status to `ACTIVE` |
| `PROFILE_UPDATED` | User saves onboarding or profile edits | `PUT /api/student/profile` or `/api/organization/profile` |
| `OPPORTUNITY_CREATED` | Recruiter drafts new job opportunity | `POST /api/opportunities` |
| `OPPORTUNITY_PUBLISHED` | Verified recruiter publishes opportunity | `PATCH /api/opportunities/[id]/publish` |

---

### R4. Student & Organization Multi-Step Onboarding

#### R4.1 Student Onboarding Flow (`/student/onboarding`)

| Step # | Step Name | Form Fields & Data Captured | Validation Constraints | Impact on Profile Completion |
|---|---|---|---|---|
| **Step 1** | Basic Info | Full Name, Phone Number, Location (City/State), Short Bio | Full Name $\ge 2$ chars, Valid phone format, Bio $\ge 10$ chars | +15% |
| **Step 2** | Academic Info | Institute Name, Department / Major, Degree, Graduation Year, CGPA / Percentage | Institute not empty, Grad Year valid (e.g. 2024-2029), CGPA valid range (0.00-10.00) | +15% |
| **Step 3** | Skills & Proficiency | Dynamic skill builder: Skill Name (normalized via ontology), Proficiency Level (Beginner=1, Intermediate=2, Advanced=3, Expert=4), Evidence Level (1 to 5) | Minimum 1 skill required; proficiency between 1 and 4 | +20% |
| **Step 4** | Projects | Project Title, Description, Technologies Used, Repo URL, Live Demo URL | At least 1 project recommended; URLs must be valid format if provided | +15% |
| **Step 5** | Certifications | Certificate Name, Issuing Org / Platform, Issue Date, Credential URL | Optional step; validated if entered | +10% |
| **Step 6** | Experience | Past Internships / Roles: Title, Organization, Duration, Key Responsibilities | Optional step; validated if entered | +10% |
| **Step 7** | Career Preferences | Target Job Roles, Preferred Work Locations (Remote, Hybrid, Onsite), Expected Stipend | Minimum 1 target role selected | +10% |
| **Step 8** | Review & Submit | Comprehensive preview card; summary of all steps; confirmation checkbox | All mandatory steps (1, 2, 3, 7) must be complete | Completes to 100%, sets `onboardingStatus = 'COMPLETED'` |

#### R4.2 Organization Onboarding Flow (`/organization/onboarding`)

| Step # | Step Name | Form Fields & Data Captured | Validation Constraints | Impact on Profile Completion |
|---|---|---|---|---|
| **Step 1** | Organization Info | Company Legal Name, Trade Name, Company Logo URL, Official Website | Legal Name $\ge 3$ chars, Website valid URL | +15% |
| **Step 2** | Business Registration | Registration Type (CIN / GSTIN / LLPIN / Udyam), Registration Number, Incorporation Date | Reg Number valid format (e.g. 21-digit CIN or 15-digit GSTIN) | +20% |
| **Step 3** | Contact Info | Primary Contact Person Name, Official Work Email (domain verified), Phone, HQ Address | Work Email domain check, Phone valid | +15% |
| **Step 4** | Industry Details | Industry Sector (IT, Core Engineering, Fintech, Healthcare, etc.), Company Size Band | Sector and Size selection required | +15% |
| **Step 5** | Hiring Preferences | Target Student Domains, Hiring Volume, Preferred Modes (Internship / Full-time) | At least 1 domain selected | +15% |
| **Step 6** | Verification Documents | Uploads: Certificate of Incorporation / GST Certificate / Company PAN | Minimum 1 official document URL/reference required | +20% |
| **Step 7** | Review & Submit | Complete organization summary; terms & conditions agreement | All mandatory fields valid | Sets `onboardingStatus = 'COMPLETED'`, `verificationStatus = 'PENDING'`, `accountStatus = 'PENDING'` |

#### R4.3 Status Transitions & Interceptor Logic
- **`onboardingStatus` Values**:
  1. `NOT_STARTED`: Default for new accounts. First login triggers automatic redirection to step 1.
  2. `IN_PROGRESS`: Saved draft at step $\ge 1$. Redirects to current uncompleted step on next visit.
  3. `COMPLETED`: Full submission. Unlocks standard portal access (subject to organization verification status).

---

### R5. Admin Governance, Verification Queue & Organization Gatekeeping

#### R5.1 Admin Dashboard Capabilities (`/admin/*`)
1. **System Overview (`/admin/dashboard`)**:
   - Total registered students, total organizations (active vs pending vs suspended), active opportunities, system health status.
2. **KYC & Verification Queue (`/admin/companies`)**:
   - Filter by `PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`.
   - Document inspection modal (view CIN, GSTIN, uploaded certificates).
   - Verification Actions:
     - `Approve`: Sets `verificationStatus = 'APPROVED'`, `accountStatus = 'ACTIVE'`, logs audit record `ORGANIZATION_APPROVED`.
     - `Reject`: Requires rejection reason notes; sets `verificationStatus = 'REJECTED'`, `accountStatus = 'DEACTIVATED'`, logs audit record `ORGANIZATION_REJECTED`.
     - `Request Info`: Sends custom inquiry note to recruiter; sets `verificationStatus = 'INFO_REQUESTED'`.
3. **User & Role Management (`/admin/users`)**:
   - Tabular directory of all platform users.
   - Filter by Role (`STUDENT`, `ORGANIZATION`, `ADMIN`) and Status (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`).
   - Quick Status Toggle: Suspend / Reactivate with confirmation modal and mandatory audit log entry.
4. **Audit Trail Viewer (`/admin/audit`)**:
   - Immutable timeline of platform events.
   - Full search by actor, action type, target user, date range.
   - JSON viewer for event `metadata`.

#### R5.2 Organization Gatekeeping Matrix

| Feature / Action | `PENDING` Org | `APPROVED` (`ACTIVE`) Org | `INFO_REQUESTED` Org | `SUSPENDED` / `REJECTED` Org |
|---|---|---|---|---|
| View Recruiter Dashboard | Allowed (with pending warning banner) | Full Access | Allowed (with info request banner) | Blocked (403 / redirect to notice) |
| Draft New Opportunity | Allowed | Full Access | Allowed | Blocked |
| Publish Opportunity | **BLOCKED** (403: Verification Required) | Full Access | **BLOCKED** | Blocked |
| Search Candidate Directory | **BLOCKED** (Privacy Shielded) | Full Access | **BLOCKED** | Blocked |
| View Candidate PII / Resumes | **BLOCKED** | Full Access | **BLOCKED** | Blocked |
| Contact Students | **BLOCKED** | Full Access | **BLOCKED** | Blocked |
| View Analytics | Basic Draft Stats Only | Full Access | Basic Draft Stats Only | Blocked |

---

### R6. Role-Aware Route Protection & API Security Middleware

#### R6.1 Route Guard Rules
Every incoming HTTP request through Next.js App Router is evaluated through the following hierarchy:

```
[Incoming Request]
        |
        v
[Is Public Route? (/ , /login, /api/auth/*, /api/test-matching, /_next/*, /favicon.ico)]
   |--> YES: Allow through
   |--> NO : Check Session Token in Cookie/Header
              |
              +--> [No Session?]
              |       |--> API Route: Return 401 Unauthorized `{ error: "UNAUTHORIZED" }`
              |       |--> Page Route: 307 Redirect to `/login?callbackUrl=...`
              |
              +--> [Valid Session Exists]
                      |
                      +--> [Check User Account Status]
                      |       |--> `SUSPENDED` / `DEACTIVATED`: Revoke session, redirect to `/auth/suspended` or return 403
                      |
                      +--> [Check Route Prefix vs User Role]
                              |
                              +--> `/student/*` & `role !== 'STUDENT'` -> 403 Forbidden / Redirect to own dashboard
                              +--> `/recruiter/*` or `/organization/*` & `role !== 'ORGANIZATION'` -> 403 Forbidden / Redirect to own dashboard
                              +--> `/admin/*` & `role !== 'ADMIN'` -> 403 Forbidden / Redirect to own dashboard
                              |
                              +--> [Check Onboarding Status]
                                      |--> If `onboardingStatus !== 'COMPLETED'` and path is NOT `/student/onboarding` or `/organization/onboarding`:
                                      |       Redirect to `/<role>/onboarding`
                                      |--> Otherwise: Allow request to proceed
```

#### R6.2 API Security & Authorization Matrix

| Endpoint | Allowed Roles | Allowed Account Status | Ownership / Authorization Check |
|---|---|---|---|
| `GET /api/student/profile` | `STUDENT`, `ADMIN` | `ACTIVE`, `PENDING` | Student can only fetch their own profile; Admin can fetch any. |
| `PUT /api/student/profile` | `STUDENT` | `ACTIVE`, `PENDING` | Session `userId` must strictly match target profile `userId`. Role and account status fields ignored. |
| `POST /api/applications` | `STUDENT` | `ACTIVE` | Student submits application; engine checks 100% High Priority eligibility. |
| `GET /api/opportunities` | `STUDENT`, `ORGANIZATION`, `ADMIN` | Any | Students see only `PUBLISHED` jobs; Orgs see their own jobs; Admins see all. |
| `POST /api/opportunities` | `ORGANIZATION` | `ACTIVE` (for publish), `PENDING` (for draft only) | Assigned `organizationId = session.user.id`. `status` forced to `DRAFT` if org is `PENDING`. |
| `PUT /api/opportunities/[id]` | `ORGANIZATION`, `ADMIN` | `ACTIVE` | Organization ID on opportunity must match `session.user.id`. |
| `GET /api/recruiter/candidates`| `ORGANIZATION`, `ADMIN` | `ACTIVE` (`APPROVED` verification only) | Blocked (403) for `PENDING` or `SUSPENDED` organizations. |
| `POST /api/admin/users/toggle-status`| `ADMIN` | `ACTIVE` | Caller must have `role === 'ADMIN'`. Target cannot be caller. |
| `POST /api/admin/companies/verify` | `ADMIN` | `ACTIVE` | Caller must have `role === 'ADMIN'`. |
| `GET /api/admin/audit` | `ADMIN` | `ACTIVE` | Caller must have `role === 'ADMIN'`. |

---

## 6. Security Threat Model & Attack Vectors

| Threat Vector ID | Threat Name | Attack Scenario | Impact | Mitigation Strategy |
|---|---|---|---|---|
| **ATK-01** | Role Injection via Request Body | Attacker sends `POST /api/student/profile` with `{ "role": "ADMIN" }` or `PATCH /api/auth/user` with `{ "role": "ORGANIZATION" }`. | Privilege escalation to Admin or Recruiter. | Server-owned role model; Drizzle ORM mutations use strict typed schemas omitting `role`. Role column updated only via internal seed/provisioning. |
| **ATK-02** | OAuth State Tampering / Replay | Attacker intercepts OAuth redirect URL and swaps `state` parameter or reuses a previously generated intent token. | Account hijacking or forced role assignment. | Cryptographically generated intent tokens stored with 15-minute expiry and one-time-use (`usedAt`) flag; OAuth state parameter cryptographically verified against session cookie. |
| **ATK-03** | Public Admin Account Creation | Attacker crafts a direct request to signup intent endpoint with `{ "role": "ADMIN" }` before initiating Google sign-in. | Unauthorized creation of full admin account. | Strict validation on intent endpoint: `role` must be in `['STUDENT', 'ORGANIZATION']`. Any `ADMIN` request triggers immediate 400 Bad Request and security alert. Admin accounts created exclusively via DB seed or `INITIAL_ADMIN_EMAIL` match. |
| **ATK-04** | Role Switching via Google Login | Attacker registered as `STUDENT` returns to login page, clicks "Recruiter Login", and signs in with the same Google email hoping to become a recruiter. | Inconsistent data state, role confusion, privilege leak. | OAuth callback queries existing user by email. Finds existing `STUDENT` role; ignores requested recruiter intent; redirects to role-conflict notice with safe routing back to Student dashboard. |
| **ATK-05** | IDOR on Opportunities / Profiles | Recruiter A guesses `opp_id` of Recruiter B and sends `PUT /api/opportunities/opp_456` with malicious updates. | Unauthorized tampering with other companies' job postings. | Every data mutation query incorporates `WHERE id = :id AND organizationId = :sessionUserId`. Database rejects unauthorized mutations with 403/404. |
| **ATK-06** | Candidate Data Harvesting by Fake Org | Malicious actor registers a fake organization to immediately scrape student candidate resumes and contact details. | Mass student PII leakage. | Strict Gatekeeping: Newly registered organizations are `PENDING`. Candidate directory and private student endpoints strictly enforce `verificationStatus === 'APPROVED'`. |
| **ATK-07** | Session Persistence after Suspension | Suspended user continues making API requests using an unexpired JWT/session cookie issued prior to suspension. | Suspended bad actors continue operating on platform. | Session middleware / API helpers query database user status on sensitive requests or validate short-lived cache; revoke session tokens upon status transition to `SUSPENDED`. |
| **ATK-08** | Client-Side Role Switcher Spoofing | User modifies local storage key `sih_active_student_id` or client state to simulate Admin/Recruiter mode. | False client perception of elevated privileges. | Zero trust in client state: All authorization decisions made server-side via session cookies and PostgreSQL database records. UI components conditionally render only based on verified server session. |

---

## 7. Acceptance Criteria Verification Matrix

| AC # | Acceptance Criterion | Authoritative Source | Verification Test Method | Expected Pass Condition |
|---|---|---|---|---|
| **AC-01** | Google OAuth sign-in succeeds via Better Auth route handler (`/api/auth/[...all]`). | `ORIGINAL_REQUEST §Acceptance` | Automated API test / synthetic OAuth mock test against `/api/auth/[...all]`. | HTTP 200/302, valid session cookie returned, user record populated. |
| **AC-02** | `authClient` correctly provides session state, user details, and logout functionality. | `ORIGINAL_REQUEST §Acceptance` | React component test & client auth test suite. | `useSession()` returns populated user object; `signOut()` invalidates session. |
| **AC-03** | Environment variables are cleanly structured, and `.env.example` is complete without exposing real secrets. | `ORIGINAL_REQUEST §Acceptance` | Static file inspection of `.env.example` and runtime configuration validator. | All required keys present in `.env.example`; no production secrets committed. |
| **AC-04** | A user selecting "Student" before Google login receives `STUDENT` role on account creation. | `ORIGINAL_REQUEST §Acceptance` | Execute signup intent flow with `role: 'STUDENT'`, complete mock OAuth. | `user.role === 'STUDENT'`, `student_profile` created. |
| **AC-05** | A user selecting "Organization" before Google login receives `ORGANIZATION` role on account creation. | `ORIGINAL_REQUEST §Acceptance` | Execute signup intent flow with `role: 'ORGANIZATION'`, complete mock OAuth. | `user.role === 'ORGANIZATION'`, `organization_profile` created. |
| **AC-06** | Attempting to sign up with an existing Google account under a different role fails with a clear message and redirects to the existing role dashboard. | `ORIGINAL_REQUEST §Acceptance` | Sign up as `STUDENT`, then invoke OAuth login with `role: 'ORGANIZATION'` intent. | Role remains `STUDENT`, modal displays collision message, redirected to `/student/opportunities`. |
| **AC-07** | Public registration for `ADMIN` role is impossible. Admin access is granted only to provisioned admin accounts. | `ORIGINAL_REQUEST §Acceptance` | Send `POST /api/auth/intent` with `{ role: 'ADMIN' }`. | Request rejected with HTTP 400 Bad Request. |
| **AC-08** | Submitting role in API request bodies or query params cannot alter a user's role. | `ORIGINAL_REQUEST §Acceptance` | Send `PATCH /api/user` with `{ role: 'ADMIN' }` from authenticated student session. | Response ignores `role` or returns error; database role unchanged. |
| **AC-09** | New Student users are redirected to `/student/onboarding` until profile completion. | `ORIGINAL_REQUEST §Acceptance` | Log in as new student with `onboardingStatus = 'NOT_STARTED'`, navigate to `/student/opportunities`. | HTTP 307 Redirect to `/student/onboarding`. |
| **AC-10** | New Organization users are redirected to `/organization/onboarding` until completion. | `ORIGINAL_REQUEST §Acceptance` | Log in as new organization with `onboardingStatus = 'NOT_STARTED'`, navigate to `/recruiter/dashboard`. | HTTP 307 Redirect to `/organization/onboarding`. |
| **AC-11** | Complete student profile data persists in `student_profile` and related tables. | `ORIGINAL_REQUEST §Acceptance` | Submit full 8-step student onboarding form. | Database record in `student_profiles` has complete academic, skills, projects, and 100% completion. |
| **AC-12** | Complete organization profile data persists in `organization_profile`. | `ORIGINAL_REQUEST §Acceptance` | Submit full 7-step organization onboarding form. | Database record in `organization_profiles` has legal name, registration ID, docs, and `PENDING` status. |
| **AC-13** | New Organization accounts receive `PENDING` verification status upon completing onboarding. | `ORIGINAL_REQUEST §Acceptance` | Check `organization_profiles.verification_status` after onboarding submission. | Status equals `PENDING`. |
| **AC-14** | Pending organizations cannot publish opportunities or view private student candidate data. | `ORIGINAL_REQUEST §Acceptance` | Attempt `POST /api/opportunities` with `status: 'PUBLISHED'` and `GET /api/recruiter/candidates` from pending org session. | HTTP 403 Forbidden returned for both operations. |
| **AC-15** | Admin dashboard at `/admin/dashboard` allows admins to approve/reject pending organizations and manage user account statuses. | `ORIGINAL_REQUEST §Acceptance` | Send admin approve/reject actions and status toggle actions from admin session. | Organization status changes to `APPROVED`/`REJECTED`; user status changes to `SUSPENDED`/`ACTIVE`. |
| **AC-16** | Approving an organization sets `accountStatus = ACTIVE` and enables posting capabilities. | `ORIGINAL_REQUEST §Acceptance` | Admin approves org; Org then calls `POST /api/opportunities` with `status: 'PUBLISHED'`. | Opportunity published successfully with HTTP 201 Created. |
| **AC-17** | Administrative actions generate immutable records in `audit_logs`. | `ORIGINAL_REQUEST §Acceptance` | Query `audit_logs` table following admin approve/reject/suspend actions. | New rows exist with corresponding `actorUserId`, `action`, `resourceId`, and timestamps. |
| **AC-18** | Direct navigation to `/student/*` by an Organization or Admin returns 403 / redirect. | `ORIGINAL_REQUEST §Acceptance` | Make request to `/student/opportunities` using Organization session cookie. | Intercepted with 403 Forbidden or redirected to `/recruiter/dashboard`. |
| **AC-19** | Direct navigation to `/organization/*` by a Student returns 403 / redirect. | `ORIGINAL_REQUEST §Acceptance` | Make request to `/recruiter/dashboard` using Student session cookie. | Intercepted with 403 Forbidden or redirected to `/student/opportunities`. |
| **AC-20** | Direct navigation to `/admin/*` by a non-Admin returns 403 / redirect. | `ORIGINAL_REQUEST §Acceptance` | Make request to `/admin/dashboard` using Student or Organization session cookie. | Intercepted with 403 Forbidden. |
| **AC-21** | API endpoints enforce resource ownership (Organization A cannot modify Organization B's data). | `ORIGINAL_REQUEST §Acceptance` | Org A attempts `PUT /api/opportunities/[orgB_oppId]`. | Returns HTTP 403 Forbidden / 404 Not Found; Org B's data untouched. |

---

## 8. Summary & Next Phase Recommendations

This specification covers all 6 requirement areas (R1–R6), all 21 Acceptance Criteria, 22 discovered features, 15 edge cases, 8 security attack vectors, complete Drizzle ORM schema specifications, multi-step onboarding workflows, admin governance controls, gatekeeping matrices, and middleware route security architectures.

Implementation teams can immediately consume these specifications to:
1. Define the Drizzle ORM PostgreSQL schema files (`db/schema.ts` / `lib/db/schema.js`).
2. Implement Better Auth server and client integrations (`lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`).
3. Build the pre-OAuth signup intent token generator and role verification hooks.
4. Construct the Next.js Server Middleware (`middleware.ts`) enforcing role prefixes and onboarding redirects.
5. Develop the Student (`/student/onboarding`) and Organization (`/organization/onboarding`) multi-step wizards.
6. Implement the Admin Governance console (`/admin/*`) and KYC verification workflow with audit logging.
