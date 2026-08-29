# Specification Mining & Gap Analysis Report: Profile Data Ownership, Persistence & Test Suite Architecture

**Date**: 2026-08-29  
**Investigator**: Specification Miner (`survey_profile_api_tests_spec_miner`)  
**Workspace**: `e:\sih_2026_044`  
**Reference Document**: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (Requirements R1–R4, Acceptance Criteria & Test Scenarios A–D)

---

## Executive Summary

An exhaustive investigation of the Skill Bridge codebase was conducted to evaluate Profile Data Ownership, Profile Persistence, Database Models, API routes, Frontend Forms, and Automated Test Suites across all 3 primary user roles (**Student**, **Industry**, **Institute**) and **Admin**.

### Key Findings
1. **Profile Data Ownership Enforced in Unified Route**: The unified profile endpoint (`/api/profile/setup`) strictly resolves the user identity via Better Auth's `auth.api.getSession({ headers })` and uses `session.user.id` and `session.user.role`. Client-supplied `id`, `user_id`, `role`, `accountStatus`, and `verificationStatus` are discarded.
2. **Persistence Flaw (Schema Incompleteness & Silent Field Dropping)**: In `app/api/profile/setup/route.js`, the server inspects PostgreSQL `information_schema.columns` before writing and silently drops any field not in the Neon database table. The current Neon PostgreSQL tables (`students`, `industries`, `institutes`) lack critical columns sent by the frontend forms:
   - `students`: lacks `phone`, `institute_name`, `department`, `degree`, `year_of_study`, `graduation_year`, `cgpa`, `github_url`, `linkedin_url`.
   - `industries`: lacks `registration_number` (CIN), `tax_id_gstin` (GSTIN), `company_type`, `primary_contact_name`, `primary_contact_phone`, `primary_contact_designation`, `contact_phone`, `official_email`, `logo_url`, `domain_focus`.
   - `institutes`: lacks `contact_phone`, `official_email`, `logo_url`, `accreditation_details` (and `aishe_code` vs `institute_code` naming mismatch).
   **Consequence**: When users save their profiles, these fields are silently dropped and lost upon page refresh or logout/login.
3. **Dual Backend Discrepancy**: While `/api/profile/setup` connects directly to Neon PostgreSQL via Drizzle ORM, several legacy endpoints (`/api/student/profile`, `/api/organization/profile`, `/api/student/onboarding`, `/api/institute/onboarding`, `/api/organization/onboarding`) write to an in-memory/local JSON database (`lib/db.js` / `data/db.json`) and accept fallback client headers.
4. **Missing Unique Constraint on `user_id`**: The `students`, `industries`, and `institutes` tables have index definitions on `user_id` but lack `.unique()` constraints in Drizzle/Postgres, preventing atomic PostgreSQL `ON CONFLICT ("user_id") DO UPDATE` (UPSERT).
5. **User Table Synchronization Gap**: When a profile is completed via `/api/profile/setup`, the `user` table's `profile_completed` and `onboarding_status` columns in PostgreSQL are never updated, causing session caching and middleware checks to potentially treat the user as incomplete.
6. **Automated Test Infrastructure**: The project has 4 robust test suites totaling 185 automated tests passing at 100% (119 E2E Auth tests, 45 Tier 5 Adversarial tests, 13 Matching tests, 8 Verification tests), plus database smoke tests. Specific new end-to-end persistence test suites are needed for Test Scenarios A, B, C, D to verify Neon PostgreSQL round-trip retention.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Profile API | `GET /api/profile/setup` | Loads authenticated user's profile from Neon PostgreSQL, computes dynamic completion score, and returns camelCase data | Request cookie / session headers | JSON `{ success: true, user, role, profile, profileCompletion, breakdown, missingFields, currentStep }` | 401 Unauthorized if no session; 400 if unsupported role; 500 on DB error | `app/api/profile/setup/route.js` |
| 2 | Profile API | `POST / PUT /api/profile/setup` | Upserts profile for authenticated user in Neon PostgreSQL, validates fields, and computes completion | Request cookie, body `{ step, profileData, stepData, action }` | JSON `{ success: true, message, role, profileCompleted, onboardingStatus, profile, redirectUrl }` | 401 Unauthorized if no session; 400 for invalid JSON / invalid CGPA / incomplete submit (<70%); 500 on DB error | `app/api/profile/setup/route.js` |
| 3 | Legacy Profile API | `GET /api/student/profile` | Legacy student profile retrieval from local in-memory DB | Query param `?userId=xxx` or header `x-user-id` | JSON `{ success: true, profile, isNew }` | 401 if no user resolved; 403 if IDOR mismatch (non-admin accessing other profile) | `app/api/student/profile/route.js` |
| 4 | Legacy Profile API | `POST/PUT/PATCH /api/student/profile` | Legacy student profile save into local JSON DB | JSON body with profile fields + `userId` | JSON `{ success: true, message, profile, profileCompletion }` | 401 if unauthorized; 403 if IDOR mismatch or non-student; 500 on error | `app/api/student/profile/route.js` |
| 5 | Legacy Profile API | `GET /api/organization/profile` | Legacy organization profile retrieval from local in-memory DB | Query param `?userId=xxx` or header `x-user-id` | JSON `{ success: true, profile, isNew }` | 401 if no user; 403 if IDOR mismatch | `app/api/organization/profile/route.js` |
| 6 | Legacy Profile API | `POST/PUT/PATCH /api/organization/profile` | Legacy organization profile save into local JSON DB | JSON body with org fields + `userId` | JSON `{ success: true, message, profile, profileCompletion }` | 401 if unauthorized; 403 if IDOR or non-org; 500 on error | `app/api/organization/profile/route.js` |
| 7 | Onboarding API | `GET / POST / PUT /api/student/onboarding` | Multi-step student onboarding draft & submit using local DB | Step data payload + header session | JSON `{ success: true, profile, onboardingStatus, profileCompletion }` | 401 if unauthorized; 403 if non-student; 400 if incomplete on submit | `app/api/student/onboarding/route.js` |
| 8 | Onboarding API | `GET / POST / PUT /api/institute/onboarding` | Multi-step institute onboarding draft & submit using local DB | Step data payload + header session | JSON `{ success: true, profile, onboardingStatus, verificationStatus }` | 401 if unauthorized; 403 if non-institute; 400 if incomplete on submit | `app/api/institute/onboarding/route.js` |
| 9 | Onboarding API | `GET / POST / PUT /api/organization/onboarding` | Multi-step organization onboarding draft & submit using local DB | Step data payload + header session | JSON `{ success: true, profile, onboardingStatus, verificationStatus }` | 401 if unauthorized; 403 if non-org; 400 if incomplete on submit | `app/api/organization/onboarding/route.js` |
| 10 | Security Guard | `withAuth` Route Guard | Higher-order function providing zero-trust API protection, role verification, IDOR check, status checks, and audit logging | Next.js Request, Handler options `{ roles, requireActive, requireOnboarded, checkOwnership }` | Response from handler or 401/403 error response | Returns 401 `UNAUTHORIZED`, 403 `ACCOUNT_SUSPENDED`, 403 `INSUFFICIENT_PERMISSIONS`, 403 `IDOR_MISMATCH` | `lib/auth-guard.js` |
| 11 | Edge Routing | Route Protection Middleware | Intercepts edge requests, validates Better Auth session cookies, partitions routes, enforces completion gating, blocks suspended accounts | Edge Request to `/student/*`, `/industry/*`, `/institute/*`, `/profile/*`, etc. | `NextResponse.next()` or `NextResponse.redirect()` | 307 Redirect to `/auth` if unauthenticated; redirect to `/profile/setup` if incomplete (<70%); redirect to canonical dashboard on login | `middleware.js` |
| 12 | Frontend UI | Unified Setup Wizard (`/profile/setup`) | Dynamic multi-step wizard supporting Student (8 steps), Industry (7 steps), and Institute (6 steps) with real-time completion gauge | Browser user input, cookies | Renders step forms, calls `GET` & `POST /api/profile/setup` | Displays inline error banners on validation or network failure | `app/profile/setup/page.jsx` |
| 13 | Frontend UI | Student Profile View/Edit (`/student/profile`) | View and inline edit full Student profile (headline, bio, academic, skills, projects, certs, experience) | Browser user input, cookies | Renders tabs/cards, calls `GET` & `PUT /api/profile/setup` | Displays error alert on failure, toast on success | `app/student/profile/page.jsx` |
| 14 | Frontend UI | Profile Dispatcher (`/profile/complete`) | Role resolution and direct canonical routing after OAuth callback; detects role collisions | Browser cookies / Better Auth session | Redirects to role dashboard or `/profile/setup` | Redirects to `/auth?collision=true` on cross-role conflict | `app/profile/complete/page.jsx` |
| 15 | Database Service | User Service (`services/userService.js`) | Server-only Drizzle queries to select student, industry, and institute records from Neon DB | `userId` | Array or single entity record from PostgreSQL | Throws Error if `userId` is missing | `services/userService.js` |
| 16 | Completion Engine | Dynamic Completion Calculator (`lib/onboarding-calc.js`) | Calculates deterministic 0-100% completion scores and missing field breakdowns per role | Profile object | `{ completion: number, breakdown: object, missingFields: string[] }` | Returns 0 for null/undefined/empty input; clamps at [0, 100] | `lib/onboarding-calc.js` |
| 17 | Matching Engine | Priority-Aware Matching Engine (`lib/engine.js`) | Evaluates candidate eligibility (100% High-Priority match mandatory) and ranks candidates | Candidate profile, Opportunity requirements | Structured match JSON with status, scores, matched & missing skills | Returns 0% / `NOT ELIGIBLE` on missing mandatory skills | `lib/engine.js` |
| 18 | Verification System | Skill Verification & MCQ Assessment | Assessment attempt management, timer, anti-cheating risk score, and score calculation | Assessment start/submit requests, attempt ID | Verified credential record with Level 3 verification | Returns 400 on expired attempt or integrity risk violations | `lib/assessment-engine.js` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Profile Setup Auth | Request without session cookies | Returns 401 `{ success: false, error: "Unauthorized: Please sign in." }` |
| 2 | Profile Setup IDOR | Request body containing spoofed `userId: "usr_attacker"` or `user_id` | Server strips `userId`/`user_id` and binds exclusively to `session.user.id` |
| 3 | Role Tampering | Request body containing `role: "ADMIN"` or `role: "INDUSTRY"` when session is `STUDENT` | Server strips `role` from body and uses normalized `session.user.role` |
| 4 | CGPA Validation | `cgpa: 10.5` or `cgpa: -1.0` or `cgpa: "invalid"` | Returns 400 `{ success: false, error: "Invalid CGPA. CGPA must be between 0 and 10." }` |
| 5 | CGPA Valid Boundary | `cgpa: 0.0` or `cgpa: 10.0` or `cgpa: "8.85"` | Successfully parsed as numeric and accepted |
| 6 | Incomplete Submission | `action: "COMPLETE_ONBOARDING"` when `profileCompletion < 70%` and > 3 missing fields | Returns 400 with `{ error: "Incomplete profile...", missingFields: [...] }` |
| 7 | Unmapped Schema Columns | Student form sends `phone`, `cgpa`, `department`, `degree`, `instituteName` | Server compares keys with `information_schema.columns`; fields not in Postgres are silently omitted and dropped |
| 8 | Multiple Saves (No Unique Index) | Repeated rapid POST requests to insert profile for newly registered user | If no row exists initially, concurrent requests can insert duplicate rows because `user_id` has no unique constraint |
| 9 | Inactive/Suspended Account | Suspended user (`accountStatus: "SUSPENDED"`) attempting profile update or dashboard access | Middleware redirects to `/account-suspended`; `withAuth` returns 403 `ACCOUNT_SUSPENDED` |
| 10 | Unverified Industry Profile | Industry user with `verificationStatus: "PENDING"` attempting to publish opportunities | `withAuth` with `requireApprovedOrg: true` blocks request with 403 `ORG_VERIFICATION_PENDING` |
| 11 | Role Switching / Collision | Google account already registered as STUDENT attempts login via INDUSTRY intent | `/profile/complete` and collision engine intercept mismatch, sign out session, and redirect to `/auth?collision=true` |
| 12 | Prototype Pollution in Payload | Body with `__proto__.isAdmin = true` or `constructor.prototype` | Sanitized safely without mutating Object prototype or escalating role |

---

## Detailed Gap Analysis

### 1. Database Schema & Migration Gaps (R4)

| Table | Current Columns in Postgres (`db/schema/*.js`) | Required Columns for Full Profile Persistence | Missing / Problematic Columns | Impact |
|---|---|---|---|---|
| `students` | `id` (uuid PK), `user_id` (text FK), `full_name`, `email`, `role`, `headline`, `bio`, `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `career_preferences` (jsonb), `profile_completion` (int), `current_onboarding_step` (int), `created_at`, `updated_at` | `phone`, `institute_name`, `department`, `degree`, `year_of_study`, `graduation_year`, `cgpa`, `github_url`, `linkedin_url` | • `phone` (text)<br>• `institute_name` (text)<br>• `department` (text)<br>• `degree` (text)<br>• `year_of_study` (text)<br>• `graduation_year` (integer)<br>• `cgpa` (text / numeric)<br>• `github_url` (text)<br>• `linkedin_url` (text)<br>• **Unique constraint on `user_id`** | Student academic details, CGPA, college, phone, and social links are lost on page refresh after save |
| `industries` | `id` (uuid PK), `user_id` (text FK), `role`, `company_name`, `email`, `industry_type`, `company_size`, `website`, `description`, `address` (jsonb), `documents` (jsonb), `verification_docs` (jsonb), `hiring_preferences` (jsonb), `verification_status`, `created_at`, `updated_at` | `registration_number` (CIN), `tax_id_gstin` (GSTIN), `company_type`, `primary_contact_name`, `primary_contact_phone`, `primary_contact_designation`, `contact_phone`, `official_email`, `logo_url`, `domain_focus` (jsonb) | • `registration_number` (text)<br>• `tax_id_gstin` (text)<br>• `company_type` (text)<br>• `primary_contact_name` (text)<br>• `primary_contact_phone` (text)<br>• `primary_contact_designation` (text)<br>• `contact_phone` (text)<br>• `official_email` (text)<br>• `logo_url` (text)<br>• `domain_focus` (jsonb)<br>• `industry` (text alias/column)<br>• **Unique constraint on `user_id`** | CIN, GSTIN, Recruiter phone, official email, logo, and domain focus are lost on page refresh |
| `institutes` | `id` (uuid PK), `user_id` (text FK), `role`, `institute_name`, `email`, `institute_type`, `aishe_code`, `website`, `address` (jsonb), `departments` (jsonb), `placement_contact` (jsonb), `verification_docs` (jsonb), `verification_status`, `created_at`, `updated_at` | `contact_phone`, `official_email`, `logo_url`, `accreditation_details` (jsonb), `institute_code` alias | • `contact_phone` (text)<br>• `official_email` (text)<br>• `logo_url` (text)<br>• `accreditation_details` (jsonb)<br>• `institute_code` (text / alias to `aishe_code`)<br>• **Unique constraint on `user_id`** | Campus phone, logo, NIRF/NAAC accreditation details, and institute code are lost on refresh |
| `user` | `id`, `name`, `email`, `emailVerified`, `image`, `role`, `account_status`, `onboarding_status`, `profile_completed`, `last_login_at`, `createdAt`, `updatedAt` | All columns present | • Column synchronization logic in profile save handler | When profile is saved/completed, `/api/profile/setup` does not update `user.profile_completed` or `user.onboarding_status` in Postgres |

---

### 2. API Route & Backend Implementation Gaps (R3 & R4)

1. **UPSERT Atomicity & Drizzle Integration**:
   - Currently, `app/api/profile/setup/route.js` runs a two-step `SELECT` then `UPDATE` or `INSERT` via raw SQL.
   - Once a `UNIQUE` constraint is added on `user_id` in `students`, `industries`, and `institutes`, Drizzle ORM's native `.insert().values().onConflictDoUpdate({ target: table.userId, set: ... })` should be used for atomic, race-condition-free saving.
2. **User Record Synchronization**:
   - When `profileCompleted` is calculated as true or action is `COMPLETE_ONBOARDING`, `/api/profile/setup` must update the `user` table:
     ```js
     await db.update(user).set({
       profileCompleted: true,
       onboardingStatus: 'COMPLETED',
       updatedAt: new Date(),
     }).where(eq(user.id, userId));
     ```
3. **Consolidation of Legacy Local DB Routes**:
   - Routes like `/api/student/profile`, `/api/organization/profile`, `/api/student/onboarding`, `/api/institute/onboarding`, and `/api/organization/onboarding` currently read/write from `data/db.json` via `lib/db.js`.
   - All profile reads and writes should route through Neon PostgreSQL to guarantee unified data consistency.
4. **Server-Side Validation**:
   - Add structured validation for:
     - Student: CGPA ($0.0 \le \text{cgpa} \le 10.0$), Year of Study ($1 \le \text{year} \le 5$), minimum skills count $\ge 3$ on submission.
     - Industry: Company name, CIN format, GSTIN (15-character statutory format), recruiter phone.
     - Institute: Institute name, AISHE/Institute Code, campus phone, at least 1 department on submission.

---

### 3. Automated Test Suite Mapping & Execution Guide

#### Current Test Suites in Repository

| Suite Identifier | Script Path | Execution Command | Number of Tests | Pass Rate | Scope / Coverage |
|---|---|---|---|---|---|
| **Suite 1: Master Auth & Onboarding E2E** | `tests/test-auth-onboarding-e2e.js` | `npm test`<br>or `node tests/test-auth-onboarding-e2e.js` | 119 | **100% (119/119)** | Tiers 1–4: Feature contracts, boundary cases (CGPA, intent TTL, token fuzzing, GSTIN, AISHE), state combinations (collisions, gating), complete user journeys. |
| **Suite 2: Tier 5 Adversarial & Stress** | `tests/test-tier5-adversarial-auth.js` | `npm run test:tier5`<br>or `node tests/test-tier5-adversarial-auth.js` | 45 | **100% (45/45)** | 500 token entropy race conditions, concurrent redemption, CRLF injection, role mutation stripping, prototype pollution, IDOR attack resilience, route traversal. |
| **Suite 3: Priority Matching Engine** | `scripts/test-matching-rules.js` | `npm run test:matching` | 13 | **100% (13/13)** | 100% High-priority mandatory rules, partial Low-priority preferred matching, normalization aliases, proficiency thresholds. |
| **Suite 4: Skill Verification System** | `tests/test-verification-system.js` | `npm run test:verification` | 8 | **100% (8/8)** | Taxonomy, MCQ question bank lifecycle, assessment session integrity, anti-cheating score, multidimensional scoring. |
| **Suite 5: Database Connection & Smoke** | `scripts/test-db.js` | `node --env-file=.env.local scripts/test-db.js` | 4 | **100% (4/4)** | Neon Postgres connectivity, 9 table presence, Better Auth `account.issuer` presence, transactional CRUD rollback. |
| **Suite 6: Master E2E Runner** | All above | `npm run test:e2e` | 185 | **100%** | Full regression execution across auth, adversarial, matching, and verification. |

#### New Automated Test Suites Required for Acceptance Criteria

To formally verify the acceptance criteria in `ORIGINAL_REQUEST.md`, the following new automated test suites must be created:

1. **`tests/test-profile-persistence-e2e.js` (Test Scenarios A, B, C, D)**:
   - **Test A (Student)**:
     1. Authenticate as Student.
     2. Send full student profile (headline, bio, instituteName, department, degree, yearOfStudy, cgpa: "9.2", skills, projects, certs, experience, phone, githubURL, linkedinURL).
     3. Save via `/api/profile/setup`.
     4. Query database directly (`SELECT * FROM students WHERE user_id = ...`) to confirm all columns persisted in Neon PostgreSQL.
     5. Simulate page refresh / new `GET /api/profile/setup` request to confirm exact data returned.
     6. Simulate logout -> login -> `GET /api/profile/setup` -> verify complete data retained.
   - **Test B (Institute)**:
     1. Authenticate as Institute.
     2. Send institute profile (instituteName, instituteCode, instituteType, contactPhone, officialEmail, website, logoUrl, address, departments, placementContact, accreditationDetails).
     3. Save via `/api/profile/setup`.
     4. Query database directly (`SELECT * FROM institutes WHERE user_id = ...`) to confirm all columns persisted in Neon PostgreSQL.
     5. Simulate page refresh / logout + login -> verify data retained.
   - **Test C (Industry)**:
     1. Authenticate as Industry.
     2. Send industry profile (companyName, registrationNumber, taxIdGstin, companyType, companySize, industry, website, logoUrl, contactPhone, officialEmail, primaryContactName, address, domainFocus, hiringPreferences).
     3. Save via `/api/profile/setup`.
     4. Query database directly (`SELECT * FROM industries WHERE user_id = ...`) to confirm all columns persisted in Neon PostgreSQL.
     5. Simulate page refresh / logout + login -> verify data retained.
   - **Test D (Account Switching & Isolation)**:
     1. Log in as Student A -> save profile.
     2. Log in as Industry B -> save profile.
     3. Log in as Institute C -> save profile.
     4. Verify Student A's data does not overwrite or leak into Industry B or Institute C.
     5. Verify each role is directed to its respective dashboard (`/student/dashboard`, `/industry/dashboard`, `/institute/dashboard`).
2. **`tests/test-profile-validation-upsert.js`**:
   - Verify server-side validation error handling (CGPA out of range returns 400, missing mandatory fields on submit returns 400 with missing fields list).
   - Verify UPSERT concurrency (rapid simultaneous requests on the same user ID update the single row cleanly without throwing unique constraint errors or creating duplicate rows).

---

## Actionable Recommendations for Implementation

1. **Schema Migration**:
   - Update `db/schema/student.js` to add missing columns (`phone`, `instituteName`, `department`, `degree`, `yearOfStudy`, `graduationYear`, `cgpa`, `githubUrl`, `linkedinUrl`) and add `.unique()` to `userId`.
   - Update `db/schema/industry.js` to add missing columns (`registrationNumber`, `taxIdGstin`, `companyType`, `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `contactPhone`, `officialEmail`, `logoUrl`, `domainFocus`, `industry`) and add `.unique()` to `userId`.
   - Update `db/schema/institute.js` to add missing columns (`contactPhone`, `officialEmail`, `logoUrl`, `accreditationDetails`, `instituteCode`) and add `.unique()` to `userId`.
   - Run `npx drizzle-kit push` (or direct Drizzle migration) to sync Neon PostgreSQL schema safely without dropping existing tables.
2. **API Endpoint Hardening**:
   - In `app/api/profile/setup/route.js`:
     - Update `insertProfile` and `updateProfile` to map camelCase to the new database columns.
     - Implement atomic Drizzle UPSERT logic.
     - Add explicit update of `user.profileCompleted` and `user.onboardingStatus` upon successful submission.
     - Add server-side field validation for all 3 roles.
3. **Consolidation**:
   - Update any remaining dashboard or form components to consistently consume `/api/profile/setup` for profile reads and updates.
4. **Test Suite Addition**:
   - Add `tests/test-profile-persistence-e2e.js` covering Tests A, B, C, D and wire it into `package.json` under `npm run test:persistence` and `npm run test:all`.
