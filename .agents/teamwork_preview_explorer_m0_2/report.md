# Codebase Survey Report: Role Profiles, Profile Gating, Onboarding Wizards & Completion Calculations

**Explorer**: Explorer 2  
**Date**: 2026-08-24  
**Working Directory**: `e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_2`  
**Target Modules**: `db/schema.js`, `lib/onboarding-calc.js`, `lib/auth-guard.js`, `middleware.js`, `app/student/onboarding`, `app/organization/onboarding`, `app/api/student/*`, `app/api/organization/*`, `components/shared/Navbar.jsx`

---

## 1. Executive Summary

This survey provides a comprehensive audit of the role profile schemas, onboarding wizards, completion scoring engines, visual completion indicators, and profile gating rules across the Skill Bridge codebase. 

### Key High-Level Findings:
1. **Drizzle ORM Profile Schemas (`db/schema.js`)**: Fully defined with strict 1:1 foreign key constraints (`userId` references `users.id` with `onDelete: cascade` and unique indexes) for `student_profile`, `organization_profile`, and `admin_profile`. **Gap**: `institute_profile` is not yet defined in `db/schema.js`, and `INSTITUTE` needs alignment in `userRoleEnum`.
2. **Profile Completion Calculators (`lib/onboarding-calc.js`)**: Well-structured dynamic multi-step scoring logic for `calculateStudentCompletion` (8 steps, 0-100%) and `calculateOrganizationCompletion` (7 steps, 0-100%), with breakdown and missing field reporting. **Gap**: `calculateProfileCompletion` and `isProfileComplete` (specified in `ORIGINAL_REQUEST.md`) and `calculateInstituteCompletion` are missing as exported interfaces.
3. **Onboarding Wizards (`app/*/onboarding/page.jsx`)**: Full-featured client wizards exist for `/student/onboarding` (8 steps) and `/organization/onboarding` (7 steps) with real-time radial SVG gauges, step draft persistence, and validation. **Gap**: `/profile/complete` router, `/industry/onboarding` route alias, and `/institute/onboarding` wizard are missing.
4. **Visual Indicators & Profile Gating**: Edge Middleware (`middleware.js`) and API Guard (`lib/auth-guard.js`) enforce onboarding redirection and role partitioning. **Gap**: Client-side application flow (`app/student/opportunities/[id]/page.jsx`) and API application submission (`app/api/applications/route.js`) do not yet verify student profile completion status prior to applying, and a reusable 70% threshold progress checklist / completion modal is needed.

---

## 2. Detailed Findings by Investigation Domain

### 2.1 Role Profile Schemas & 1:1 Foreign Key Relationships (`db/schema.js`)

#### Observed Architecture:
- **Core User Table (`users`)** (lines 63-79):
  - `id`: `text('id').primaryKey()`
  - `name`: `text('name').notNull()`
  - `email`: `text('email').notNull().unique()`
  - `emailVerified`: `boolean('emailVerified').default(false).notNull()`
  - `image`: `text('image')`
  - `role`: `userRoleEnum('role').default('STUDENT').notNull()`
  - `accountStatus`: `accountStatusEnum('account_status').default('ACTIVE').notNull()`
  - `onboardingStatus`: `onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull()`
  - `createdAt`, `updatedAt`: `timestamp` with timezone.

- **Student Profile Table (`student_profile`)** (lines 162-189):
  - Strict 1:1 constraint: `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
  - Unique Index: `student_profile_user_idx` on `table.userId`
  - Fields: `phone`, `headline`, `bio`, `instituteId`, `instituteName`, `department`, `degree`, `graduationYear`, `yearOfStudy`, `cgpa`, `skills` (jsonb default `[]`), `projects` (jsonb default `[]`), `certifications` (jsonb default `[]`), `experience` (jsonb default `[]`), `careerPreferences` (jsonb default `{}`), `profileCompletion` (integer default 0), `currentOnboardingStep` (integer default 1).

- **Organization Profile Table (`organization_profile`)** (lines 193-226):
  - Strict 1:1 constraint: `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
  - Unique Indexes: `organization_profile_user_idx` on `userId`, `organization_profile_reg_idx` on `registrationNumber`
  - Fields: `companyName`, `registrationNumber`, `taxIdGstin`, `companyType`, `industry`, `companySize`, `website`, `logoUrl`, `contactPhone`, `address` (jsonb), `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `documents` (jsonb), `verificationDocs` (jsonb), `hiringPreferences` (jsonb), `verificationStatus` (enum `PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`), `verificationNotes`, `adminNotes`, `verifiedByAdminId` (fk `users.id`), `verifiedAt`, `profileCompletion`, `currentOnboardingStep`.

- **Admin Profile Table (`admin_profile`)** (lines 230-246):
  - Strict 1:1 constraint: `userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
  - Fields: `adminLevel`, `permissions` (jsonb), `department`.

#### Identified Schema Gaps:
1. **Missing Institute Profile Schema**: `instituteProfiles` (`institute_profile`) is not defined in `db/schema.js`. Required fields:
   - `id`, `userId` (unique fk `users.id`), `instituteName`, `instituteCode` (AISHE/Registration), `instituteType`, `address` (jsonb), `website`, `logoUrl`, `contactPhone`, `officialEmail`, `departments` (jsonb), `placementContact` (jsonb), `verificationStatus`, `profileCompletion`, `currentOnboardingStep`, `createdAt`, `updatedAt`.
2. **User Role Enum Alignment**: `userRoleEnum` currently contains `['STUDENT', 'ORGANIZATION', 'ADMIN']`. To support `ORIGINAL_REQUEST.md`, it should include `INSTITUTE` and support `INDUSTRY` as an alias or canonical role alongside `ORGANIZATION`.
3. **User Table Field Name Consistency**: `ORIGINAL_REQUEST.md` specifies `profileCompleted` (boolean), whereas `db/schema.js` has `onboardingStatus` (`NOT_STARTED` | `IN_PROGRESS` | `COMPLETED`). Adding a virtual getter or `profileCompleted` boolean column ensures 100% contract compatibility.

---

### 2.2 Profile Completion Calculators (`lib/onboarding-calc.js`)

#### Observed Architecture:
- **`calculateStudentCompletion(profile)`** (lines 13-64):
  - Evaluates 8 categories:
    - Step 1 (Basic Info): `headline` + `bio` = 15% (7.5% for partial)
    - Step 2 (Academic): `instituteName` + `department` + `degree` + (`yearOfStudy` or `graduationYear`) = 15% (7.5% partial)
    - Step 3 (Skills): >= 3 skills = 20% (>= 1 skill = 10%)
    - Step 4 (Projects): >= 1 project = 15%
    - Step 5 (Certifications): >= 1 certification = 10%
    - Step 6 (Experience): >= 1 experience = 10%
    - Step 7 (Career Preferences): >= 1 preference entry = 10%
    - Step 8 (Review/Normalization): >= 95% rounded to 100%.
  - Max output clamped to 0 - 100.
- **`calculateOrganizationCompletion(profile)`** (lines 73-127):
  - Evaluates 7 categories:
    - Step 1 (Basic): `companyName` + (`website` or `logoUrl`) = 15%
    - Step 2 (Legal): `registrationNumber` + `taxIdGstin` = 20%
    - Step 3 (Contact & HQ): `contactPhone` + `address` = 15%
    - Step 4 (Industry & Size): `industry` + `companySize` = 15%
    - Step 5 (Hiring Preferences): `hiringPreferences` = 15%
    - Step 6 (Verification Docs): `verificationDocs` >= 1 doc = 15%
    - Step 7 (Review / Bonus): >= 95% rounded to 100%.
- **`getStudentCompletionDetails(profile)`** and **`getOrgCompletionDetails(profile)`** (lines 132-186):
  - Returns `{ completion, breakdown, missingFields }` providing precise itemized missing requirements for UI checklists.

#### Identified Calculator Gaps:
1. **Missing Unified Contract Methods**:
   - `calculateProfileCompletion(userOrRole, profile)`: Needs to accept a user object (with `.role`) or role string and route to the proper calculator (`calculateStudentCompletion`, `calculateOrganizationCompletion`, or `calculateInstituteCompletion`).
   - `isProfileComplete(userOrRole, profile, threshold = 70)`: Returns `boolean` whether the profile meets the required completion threshold (default 70% or 100% depending on role).
2. **Missing Institute Calculator**: `calculateInstituteCompletion(profile)` and `getInstituteCompletionDetails(profile)` need to be implemented for the `INSTITUTE` role.

---

### 2.3 Onboarding Wizard Pages & Step Flows

#### Observed Implementations:
1. **Student Onboarding Wizard (`app/student/onboarding/page.jsx`)**:
   - 8 Steps:
     1. Basic Info (Headline, Bio, Phone, Location)
     2. Academic (Institute, Department, Degree, Year of Study, CGPA)
     3. Skills (Name, Proficiency Beginner to Expert, Category)
     4. Projects (Title, Description, Tech Stack, Repo/Demo URL)
     5. Certifications (Name, Issuing Org, Issue Date, Credential URL)
     6. Experience (Title, Company, Duration, Description)
     7. Preferences (Target Roles, Preferred Locations, Employment Type)
     8. Review & Submit (Summary preview, 100% validation check, Final Submit)
   - Dynamic SVG circular progress gauge rendering live calculated score.
   - Draft persistence to `/api/student/onboarding` (`action: 'SAVE_DRAFT'`).
   - Final completion dispatch (`action: 'COMPLETE_ONBOARDING'`) updating `user.onboardingStatus = 'COMPLETED'` and redirecting to `/student/dashboard`.

2. **Organization Onboarding Wizard (`app/organization/onboarding/page.jsx`)**:
   - 7 Steps:
     1. Company Info (Name, Website, Company Size, Logo URL)
     2. Statutory Registration (CIN / LLPIN, GSTIN, Company Type)
     3. Contact & HQ Address (Primary Contact, Official Phone, Full Street/City/State/Postal)
     4. Industry & Domain Focus (Sector, Core Tech Focus)
     5. Hiring Focus (Target Roles, Hiring Type, Season)
     6. Statutory KYC Documents (COI, GSTIN Doc Uploads & External verification links)
     7. Review & Statutory Compliance Declaration (Legal accuracy checkbox & submission)
   - Draft persistence to `/api/organization/onboarding` and final transition to `PENDING` KYC queue for admin verification.

#### Identified Wizard Gaps:
1. **Missing `/profile/complete` Generic Router (`app/profile/complete/page.jsx`)**:
   - `ORIGINAL_REQUEST.md` specifies that if `profileCompleted === false` after social login, the user is redirected to `/profile/complete`.
   - Needs a client/server page that inspects session role and redirects to `/student/onboarding`, `/organization/onboarding`, or `/institute/onboarding`.
2. **Missing `/industry/onboarding` Route**: Alias redirecting to `/organization/onboarding`.
3. **Missing `/institute/onboarding` Wizard (`app/institute/onboarding/page.jsx`)**:
   - Multi-step onboarding for academic institutions (Institute details, AISHE verification, Department listing, Placement coordinator contact, accreditation docs).

---

### 2.4 Profile Gating Rules & Route Protection

#### Observed Gating Mechanisms:
1. **Edge Middleware (`middleware.js`)** (lines 17-210):
   - Matcher intercepts `/student/:path*`, `/organization/:path*`, `/recruiter/:path*`, `/admin/:path*`, `/account-suspended`, `/login`, `/register`.
   - Resolves session from headers (`x-user-id`, `x-user-role`, `x-onboarding-status`) or Better Auth cookies (`better-auth.session_token`, `sb_user_cache`).
   - If unauthenticated -> redirects to `/login?redirect=...`.
   - If `accountStatus === 'SUSPENDED' | 'DEACTIVATED'` -> redirects to `/account-suspended`.
   - If `user.role === 'STUDENT'` and `onboardingStatus !== 'COMPLETED'` and route !== `/student/onboarding` -> redirects to `/student/onboarding`.
   - If `user.role === 'ORGANIZATION'` and `onboardingStatus !== 'COMPLETED'` and route !== `/organization/onboarding` -> redirects to `/organization/onboarding`.
   - Partitions routes: blocks students from `/admin/*` and `/organization/*`.

2. **API Security Guard (`lib/auth-guard.js`)** (lines 81-248):
   - `withAuth(handler, { roles, requireActive, requireOnboarded, requireApprovedOrg, checkOwnership, auditAction })`.
   - If `requireOnboarded` and `user.onboardingStatus !== 'COMPLETED'` -> returns `403 Forbidden` (`code: 'ONBOARDING_REQUIRED'`).
   - If `requireApprovedOrg` and `orgProfile.verificationStatus !== 'APPROVED'` -> returns `403 Forbidden` (`code: 'ORG_VERIFICATION_PENDING'`).

#### Identified Gating Gaps:
1. **`app/api/applications/route.js` (POST handler)**:
   - Currently checks student ID and opportunity ID and priority skill match eligibility.
   - **Does NOT** check if the student's profile is complete (`user.onboardingStatus === 'COMPLETED'` or `student.profileCompletion >= 70`). Needs `withAuth({ roles: ['STUDENT'], requireOnboarded: true })` or explicit profile check.
2. **`app/student/opportunities/[id]/page.jsx` (Client Apply Button)**:
   - Apply button currently evaluates skill match eligibility (`matchResult.isEligible`).
   - If a student with an incomplete profile navigates directly, the UI does not show a profile completion warning modal / redirect before submitting.
3. **Root-Level Route Protection**:
   - If public routes `/opportunities` or `/applications` are requested at root level, `middleware.js` matcher must include them to redirect un-onboarded students to `/profile/complete` or `/student/onboarding`.

---

### 2.5 Visual Completion Indicators & Dashboards

#### Observed UI Components:
- `app/student/onboarding/page.jsx` has an SVG circular progress meter and step badges.
- `components/shared/Navbar.jsx` (lines 11-44) dynamically renders role-specific links based on `pathname`:
  - Student: Opportunities, My Profile & Skills, My Applications.
  - Recruiter: Dashboard, Post Opportunity, Candidates, Candidate Comparison, Post-Internship Eval.
  - Institute: Dashboard, Skill Gap Alerts, Training Programs, Employer Feedback.
  - Admin: Dashboard, Users & Roles, Skill Ontology, KYC Queue, Audit Logs.

#### Identified UI Gaps:
1. **Navbar Profile Completion Badge**:
   - `ORIGINAL_REQUEST.md` specifies Student navbar should have `[Avatar + Profile completion badge]`.
   - Current `Navbar.jsx` does not display the user avatar or the live completion percentage pill (e.g. `78% Completed`).
2. **Reusable Visual Completion Card / Progress Bar (`components/shared/ProfileCompletionCard.jsx`)**:
   - A dedicated widget displaying:
     - 70% threshold progress bar with color-coded stages.
     - Required vs Optional items checklist with direct edit links.
     - Warning banner if completion < 70% stating that opportunities and applications are locked.
3. **Profile Completion Gate Modal (`components/shared/ProfileGateModal.jsx`)**:
   - Modal triggered when an incomplete student clicks "Apply" on an opportunity, stating: *"Profile Completion Required (Currently 45% / 70% required) - Complete your profile to apply"*, with a 1-click CTA to `/student/onboarding`.

---

## 3. Comparative Gap Matrix

| Component / Requirement | Current Codebase Status | Required Alignment | Action Plan |
|---|---|---|---|
| **Student Profile Schema** | Implemented (`db/schema.js`, `student_profile`) with 1:1 FK to `user.id` | Match 1:1 spec | None needed (fully aligned) |
| **Organization Profile Schema** | Implemented (`db/schema.js`, `organization_profile`) with 1:1 FK to `user.id` | Match 1:1 spec | None needed (fully aligned) |
| **Institute Profile Schema** | Missing | `institute_profile` with 1:1 FK to `user.id` | Add `instituteProfiles` table and relations to `db/schema.js` |
| **User Role Enum** | `['STUDENT', 'ORGANIZATION', 'ADMIN']` | Support `STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN` | Update `userRoleEnum` in `db/schema.js` and role resolvers |
| **Student Completion Calc** | Implemented (`calculateStudentCompletion`, 8 steps) | 0-100% calculation | Fully aligned |
| **Org Completion Calc** | Implemented (`calculateOrganizationCompletion`, 7 steps) | 0-100% calculation | Fully aligned |
| **Institute Completion Calc** | Missing | Multi-step calculation for institutes | Implement in `lib/onboarding-calc.js` |
| **Unified Calc API** | Missing `calculateProfileCompletion`, `isProfileComplete` | `ORIGINAL_REQUEST §3` contract | Export `calculateProfileCompletion` & `isProfileComplete` in `lib/onboarding-calc.js` |
| **Student Onboarding UI** | Implemented (`/student/onboarding`, 8 steps) | Interactive wizard | Fully aligned |
| **Org Onboarding UI** | Implemented (`/organization/onboarding`, 7 steps) | Interactive wizard | Fully aligned |
| **Institute Onboarding UI** | Missing (`/institute/onboarding`) | Academic onboarding wizard | Create `app/institute/onboarding/page.jsx` & API |
| **Generic Complete Route** | Missing (`/profile/complete`) | Role-based router | Create `app/profile/complete/page.jsx` |
| **Edge Route Gating** | Implemented (`middleware.js`) | Protect role partitions & redirect incomplete users | Add `/opportunities` & `/profile/complete` to matcher |
| **Server API Gating** | Implemented (`lib/auth-guard.js`) | `withAuth` with `requireOnboarded` | Integrate into `app/api/applications/route.js` |
| **Visual 70% Progress Indicator** | Inside onboarding page only | Reusable widget with required vs optional checklist | Create `components/shared/ProfileCompletionCard.jsx` |
| **Incomplete Profile Apply Modal** | Missing | Prompt modal when apply attempted with incomplete profile | Create `components/shared/ProfileGateModal.jsx` |

---

## 4. Concrete Implementation Steps for Subsequent Milestones

1. **Step 1: Database Schema Expansion (`db/schema.js`)**:
   - Add `INSTITUTE` and `INDUSTRY` to `userRoleEnum`.
   - Define `instituteProfiles` (`institute_profile` table) with 1:1 unique FK to `users.id`, AISHE code, accreditation, departments, placement coordinator contacts, and verification docs.
   - Export `institute_profile` and `instituteProfilesRelations`.

2. **Step 2: Profile Calculator Enhancements (`lib/onboarding-calc.js`)**:
   - Add `calculateInstituteCompletion(profile)` and `getInstituteCompletionDetails(profile)`.
   - Add unified exported functions:
     ```javascript
     function calculateProfileCompletion(userOrRole, profile) { ... }
     function isProfileComplete(userOrRole, profile, threshold = 70) { ... }
     ```

3. **Step 3: Onboarding Routes & Generic Dispatcher (`app/`)**:
   - Create `app/profile/complete/page.jsx` to dynamically redirect users to their role-specific onboarding page.
   - Create `app/institute/onboarding/page.jsx` and `app/api/institute/onboarding/route.js`.
   - Create route rewrite or alias for `/industry/onboarding` -> `/organization/onboarding`.

4. **Step 4: Gating Integration on Applications & Opportunities**:
   - Update `app/api/applications/route.js` to guard with `withAuth(handler, { roles: ['STUDENT'], requireOnboarded: true })` or verify profile completion >= 70%.
   - Update `app/api/opportunities/route.js` to enforce `requireApprovedOrg: true` and `requireOnboarded: true`.

5. **Step 5: Visual Components & Client Gatekeeping**:
   - Create `components/shared/ProfileCompletionCard.jsx` (70% progress bar, required vs optional checklist, missing fields alert).
   - Create `components/shared/ProfileGateModal.jsx` (modal blocking applications if profile is incomplete, with redirect to onboarding).
   - Update `Navbar.jsx` to show profile completion badge and avatar.
