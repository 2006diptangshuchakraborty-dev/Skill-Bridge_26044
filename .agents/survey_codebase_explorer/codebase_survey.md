# Skill Bridge Platform — Codebase & Stack Survey Report

**Date**: 2026-08-23  
**Explorer Agent**: `survey_codebase_explorer`  
**Target Repository**: `e:/sih_2026_044`  
**Reference Request**: `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

A comprehensive investigation of `e:/sih_2026_044` was conducted to analyze the current framework version, routing architecture, package management, dependencies, database setup, authentication state, UI structure, and test framework.

### Core Findings Matrix

| Parameter | Current State | Required by `ORIGINAL_REQUEST.md` | Action Needed |
| :--- | :--- | :--- | :--- |
| **Next.js Version** | `14.2.5` | Next.js 14+ | Already compliant |
| **Router Type** | **App Router** (`app/` dir, `layout.jsx`, `page.jsx`) | App Router | Already compliant |
| **Language** | Pure JavaScript/JSX (`.js`, `.jsx`), no `tsconfig.json` | JS / TS supported | Support JS/TS files cleanly |
| **Package Manager** | `npm` (Lockfile: `package-lock.json`, npm 11.6.2, Node v24.11.0) | `npm` / `pnpm` / `yarn` / `bun` | Use `npm` |
| **Auth System** | Mock persona switcher via localStorage in `RoleSwitcher.jsx` | Better Auth with Google OAuth, server-owned role model, signup intents | Install `better-auth`, create route handler & client |
| **Database ORM** | JSON DB (`lib/db.js` + `data/db.json`), `drizzle-orm` in deps | Drizzle ORM schemas on Neon PostgreSQL | Configure Drizzle, define schemas, connect Neon |
| **Database URL** | Neon PostgreSQL connection string in `.env` | Neon PostgreSQL | Ready for Drizzle configuration |
| **Route Protection** | None (client-side only demo switcher) | Server-side role & session middleware (`middleware.js`) | Implement `middleware.js` |
| **Portals & Onboarding**| Student, Recruiter, Institute, Admin exist; Onboarding missing | Student & Org Onboarding, Admin Governance, Role immutability | Create `/student/onboarding`, `/organization/onboarding`, update portals |
| **Test Suite** | Standalone custom runner (`tests/test-runner.js`), 191 tests passing | E2E & auth verification suite | Compatible, can add auth test coverage |

---

## 2. Framework & Routing Architecture

### 2.1 Next.js Version & Configuration
- **Next.js Version**: `14.2.5` (defined in `package.json` line 21).
- **React Version**: `react` and `react-dom` `^18.3.1` (lines 22-23).
- **Configuration File**: `next.config.js`
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    poweredByHeader: false,
    eslint: {
      ignoreDuringBuilds: true,
    },
  };
  module.exports = nextConfig;
  ```
- **Language / TypeScript**: Pure JavaScript/JSX (`.js`, `.jsx`). There is no `tsconfig.json` or `jsconfig.json` at the root. `tsx` (`^4.23.12`) is available in `devDependencies`.
- **Router Model**: **App Router** using the `app/` directory.

### 2.2 Directory Structure
```
e:/sih_2026_044/
├── app/
│   ├── layout.jsx                     # Root App Router layout with RoleSwitcher & Navbar
│   ├── page.jsx                       # Platform landing page & feature overview
│   ├── globals.css                    # Tailwind CSS base imports and custom animations
│   ├── admin/                         # Admin portal routes
│   │   ├── audit/page.jsx             # System audit log viewer
│   │   ├── companies/page.jsx         # Employer KYC verification queue
│   │   ├── dashboard/page.jsx         # Admin system metrics & health overview
│   │   ├── ontology/page.jsx          # Canonical skill ontology and alias management
│   │   └── users/page.jsx             # RBAC user management & status controls
│   ├── api/                           # Next.js App Router Route Handlers
│   │   ├── alerts/route.js            # Skill gap alert queries and creation
│   │   ├── applications/route.js      # Student application submission & review
│   │   ├── extract-skills/route.js    # AI NLP job description skill extractor
│   │   ├── match/route.js             # Priority-aware skill matching evaluation
│   │   ├── opportunities/route.js     # Opportunity CRUD operations
│   │   ├── students/route.js          # Student profile & skill management
│   │   └── test-matching/route.js     # Engine verification test endpoint
│   ├── institute/                     # Institute / Faculty portal routes
│   │   ├── dashboard/page.jsx         # Department analytics and placement metrics
│   │   ├── feedback/page.jsx          # Aggregated employer scorecard feedback
│   │   ├── skill-gaps/page.jsx        # Privacy-preserving skill gap aggregations
│   │   └── training/page.jsx          # 1-click faculty training workshop creator
│   ├── recruiter/                     # Recruiter / Industry portal routes
│   │   ├── candidates/page.jsx        # Candidate eligibility browser & filters
│   │   ├── compare/page.jsx           # Side-by-side 4-candidate comparison matrix
│   │   ├── dashboard/page.jsx         # Recruiter overview and metrics
│   │   ├── evaluate/page.jsx          # Post-internship evaluation rubric
│   │   └── jobs/create/page.jsx       # Job creator with High/Low skill tagging & NLP
│   └── student/                       # Student portal routes
│       ├── applications/page.jsx      # Student application tracker
│       ├── opportunities/page.jsx     # Opportunity browser with match status badges
│       ├── opportunities/[id]/page.jsx# Detailed opportunity breakdown & match meter
│       └── profile/page.jsx           # Student profile & skill inventory editor
├── components/
│   └── shared/
│       ├── EvidenceBadge.jsx          # 5-tier evidence badge visualizer
│       ├── MatchMeter.jsx             # High vs Low dual match progress meter
│       ├── Navbar.jsx                 # Dynamic portal navigation bar
│       ├── RoleSwitcher.jsx           # Client-side demo role & persona switcher
│       └── StatusPill.jsx             # Status badge component
├── data/
│   ├── db.json                        # Active JSON database snapshot
│   └── seed.json                      # Golden seed dataset (52 students, 12 companies, 16 opps)
├── lib/
│   ├── alerts.js                      # Privacy-preserving skill gap aggregation engine
│   ├── db.js                          # In-memory and persistent JSON database interface
│   ├── engine.js                      # Priority-aware skill matching engine
│   ├── nlp-extractor.js               # Rule-based NLP job description parser
│   ├── normalization.js               # Canonical skill ontology & alias normalizer
│   └── notifications.js               # In-app notification engine
├── scripts/
│   ├── seed.js                        # Database seeder and dataset verification tool
│   └── test-matching-rules.js         # Direct CLI matching rules test runner
├── tests/
│   ├── adversarial-challenger1.js     # Challenger suite 1: Injection & edge stress
│   ├── adversarial-challenger2.js     # Challenger suite 2: Scale & concurrency
│   ├── test-helper.js                 # Dynamic module resolver & specification oracle
│   ├── test-runner.js                 # Standalone ANSI test runner (191 tests)
│   ├── fixtures/
│   │   └── demo-data.fixture.js       # Complete fixture dataset
│   └── e2e/
│       ├── tier1-features.test.js     # Tier 1: F01 - F31 Feature isolation tests
│       ├── tier2-boundaries.test.js   # Tier 2: Boundary and edge tests
│       ├── tier3-combinations.test.js # Tier 3: Cross-module integration tests
│       └── tier4-scenarios.test.js    # Tier 4: Real-world scenario tests (opp_001)
├── package.json
├── package-lock.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 3. Package Management, Scripts & Dependencies

### 3.1 Package Manager & Available Scripts
- **Package Manager**: `npm` (Lockfile: `package-lock.json` format v3).
- **Scripts in `package.json`**:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "node scripts/seed.js",
    "test:matching": "node scripts/test-matching-rules.js",
    "test:e2e": "node scripts/run-e2e-tests.js"
  }
  ```
  *Note*: `scripts/run-e2e-tests.js` in `test:e2e` is not present; the real test runner is `tests/test-runner.js`. Updating `package.json` to `"test:e2e": "node tests/test-runner.js"` will align the script.

### 3.2 Dependency Inventory & Status

| Package | Category | Version in `package.json` | Status in Project | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `next` | Core Framework | `14.2.5` | Installed | App Router runtime |
| `react` | UI Library | `^18.3.1` | Installed | React 18.3 |
| `react-dom` | UI Library | `^18.3.1` | Installed | React DOM 18.3 |
| `drizzle-orm` | ORM | `^1.0.0-rc.4` | Installed | Drizzle ORM |
| `drizzle-kit` | Dev Tool | `^1.0.0-rc.4` | Installed (dev) | Drizzle schema migrator & CLI |
| `@neondatabase/serverless`| Database Driver | `^1.1.0` | Installed | Neon Postgres serverless driver |
| `lucide-react` | Icons | `^0.428.0` | Installed | UI Icons |
| `tailwindcss` | CSS Framework | `^3.4.10` | Installed (dev) | Tailwind CSS 3 |
| `postcss` | CSS Processor | `^8.4.41` | Installed (dev) | PostCSS |
| `autoprefixer` | CSS Processor | `^10.4.20` | Installed (dev) | Autoprefixer |
| `clsx` | Utility | `^2.1.1` | Installed | Classname helper |
| `tailwind-merge` | Utility | `^2.5.2` | Installed | Tailwind class merger |
| `dotenv` | Config | `^17.4.2` | Installed | Environment variable loader |
| `tsx` | TypeScript Exec | `^4.23.12` | Installed (dev) | TS / ESM runner |
| **`better-auth`** | Authentication | **MISSING** | **NOT INSTALLED** | **Needs installation (`npm install better-auth`)** |

---

## 4. Database Setup & Persistence Architecture

### 4.1 Current Persistence Mechanism
- The application currently operates using a synchronous/atomic JSON file persistence layer in `lib/db.js`, backed by `data/db.json` and initialized from `data/seed.json`.
- The dataset contains 52 students, 12 companies, 16 opportunities, 37 canonical skills, applications, alerts, training programs, and feedback reports.
- `lib/db.js` exposes full CRUD operations for:
  - Users (`getUsers`, `getUserById`, `getUserByEmail`, `createUser`, `updateUser`)
  - Students (`getStudents`, `getStudentById`, `updateStudent`, `addStudentSkill`, `updateStudentSkill`, `removeStudentSkill`)
  - Companies (`getCompanies`, `getCompanyById`, `createCompany`, `updateCompany`, `verifyCompany`)
  - Opportunities (`getOpportunities`, `getOpportunityById`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`)
  - Applications (`getApplications`, `getApplicationById`, `createApplication`, `updateApplicationStatus`)
  - Skills Ontology (`getSkills`, `getSkillById`, `addSkill`, `updateSkill`, `addSkillAlias`)
  - Alerts & Training (`getAlerts`, `createAlert`, `getTrainingPrograms`, `createTrainingProgram`, `updateTrainingProgram`)
  - Feedback & Elevation (`getFeedbackReports`, `submitFeedbackReport`)
  - System Audit Logs (`getAuditLogs`, `logAuditEvent`, `getSystemStats`)

### 4.2 Neon PostgreSQL Connection
- Neon PostgreSQL connection string is pre-configured in `.env`:
  ```ini
  DATABASE_URL=postgresql://neondb_owner:npg_4QTjbBp2rOtl@ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```
- Packages `@neondatabase/serverless` and `drizzle-orm` are installed and ready to connect.

### 4.3 Drizzle ORM Schema Status
- **Current State**: No Drizzle schema files, `drizzle.config.js`, or migration files exist in the project yet.
- **Required Schemas for Better Auth & SIH Role Model (per `ORIGINAL_REQUEST.md`)**:
  1. **Better Auth Core Tables**:
     - `user`: `id` (PK), `name`, `email` (unique), `emailVerified`, `image`, `role` (`STUDENT`, `ORGANIZATION`, `ADMIN`), `accountStatus` (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`), `onboardingStatus` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`), `createdAt`, `updatedAt`.
     - `session`: `id` (PK), `userId` (FK -> user.id), `token` (unique), `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`.
     - `account`: `id` (PK), `userId` (FK -> user.id), `accountId`, `providerId` (`google`), `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `idToken`, `createdAt`, `updatedAt`.
     - `verification`: `id` (PK), `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`.
  2. **Security & Intent Tables**:
     - `signup_intents`: `id` (PK), `token` (unique crypto token), `role` (`STUDENT` or `ORGANIZATION`), `expiresAt`, `used` (boolean), `createdAt`.
  3. **Role Profile Tables**:
     - `student_profile`: `id` (PK), `userId` (unique FK -> user.id), `instituteId`, `instituteName`, `department`, `degree`, `graduationYear`, `cgpa`, `bio`, `profileCompletion` (integer 0-100), `skills` (JSON / array), `projects` (JSON), `certifications` (JSON), `experience` (JSON), `careerPreferences` (JSON), `createdAt`, `updatedAt`.
     - `organization_profile`: `id` (PK), `userId` (unique FK -> user.id), `companyName`, `registrationId`, `industry`, `website`, `logoUrl`, `contactEmail`, `contactPhone`, `address`, `hiringPreferences` (JSON), `verificationDocuments` (JSON), `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`), `adminNotes`, `verifiedAt`, `verifiedBy`, `createdAt`, `updatedAt`.
     - `admin_profile`: `id` (PK), `userId` (unique FK -> user.id), `permissions` (JSON), `department`, `createdAt`, `updatedAt`.
  4. **Audit Logging Table**:
     - `audit_logs`: `id` (PK), `actorUserId`, `actorRole`, `action` (`LOGIN`, `LOGOUT`, `ACCOUNT_CREATED`, `ROLE_ASSIGNED`, `ORGANIZATION_APPROVED`, `ORGANIZATION_REJECTED`, `USER_SUSPENDED`, `USER_REACTIVATED`, `PROFILE_UPDATED`, etc.), `targetUserId`, `resourceType`, `resourceId`, `metadata` (JSON), `ipAddress`, `createdAt`.

---

## 5. Authentication, Middleware & Security

### 5.1 Current Authentication State
- Currently, authentication is completely mocked via client-side state in `components/shared/RoleSwitcher.jsx`.
- Changing roles simply performs `router.push('/student/opportunities')`, `router.push('/recruiter/dashboard')`, `router.push('/institute/dashboard')`, or `router.push('/admin/dashboard')`.
- Demo personas (`std_001` Aarav Sharma, `std_002` Priya Patel, `std_003` Rohan Verma, `std_004` Ananya Sen) are switched via `localStorage.setItem('sih_active_student_id', personaId)`.

### 5.2 Required Better Auth Architecture (per `ORIGINAL_REQUEST.md`)
- **Server Instance (`lib/auth.js` or `lib/auth.ts`)**:
  - Initialized with `betterAuth({ ... })`.
  - Database adapter: Drizzle adapter connected to Neon PostgreSQL.
  - Social Provider: Google OAuth (`clientId: GOOGLE_CLIENT_ID`, `clientSecret: GOOGLE_CLIENT_SECRET`).
  - Secret: `BETTER_AUTH_SECRET`.
  - Base URL: `BETTER_AUTH_URL` (e.g., `http://localhost:3000`).
  - Hooks / Plugins:
    - Pre-account creation hook resolving role from cryptographic signup intent or enforcing existing user role immutability.
    - Blocking public registration for `ADMIN` role.
    - Automatic seeding/provisioning of initial admin when email matches `INITIAL_ADMIN_EMAIL`.
- **Client Auth (`lib/auth-client.js` or `lib/auth-client.ts`)**:
  - `createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' })`.
  - Exports `signIn`, `signUp`, `signOut`, `useSession`, `getSession`.
- **API Route Handler**:
  - `app/api/auth/[...all]/route.js` routing `toNextJsHandler(auth.handler)`.
- **Middleware & Route Protection (`middleware.js`)**:
  - Inspects Better Auth session token from cookies / headers.
  - Resolves user role and `onboardingStatus`.
  - Rules:
    - `/student/*`: Requires authenticated session with `role === 'STUDENT'`. Un-onboarded students redirect to `/student/onboarding`.
    - `/organization/*`: Requires authenticated session with `role === 'ORGANIZATION'`. Un-onboarded organizations redirect to `/organization/onboarding`.
    - `/admin/*`: Requires authenticated session with `role === 'ADMIN'`. Non-admins return 403 or redirect.
    - Attempting cross-role navigation or role spoofing returns 403 Forbidden.

---

## 6. Portals, Onboarding & User Flows

### 6.1 Existing Portal Routes
1. **Student**: `/student/opportunities`, `/student/opportunities/[id]`, `/student/profile`, `/student/applications`.
2. **Recruiter / Organization**: `/recruiter/dashboard`, `/recruiter/jobs/create`, `/recruiter/candidates`, `/recruiter/compare`, `/recruiter/evaluate`. *(Needs route alias/support for `/organization/*`)*.
3. **Institute / Faculty**: `/institute/dashboard`, `/institute/skill-gaps`, `/institute/training`, `/institute/feedback`.
4. **Admin Console**: `/admin/dashboard`, `/admin/users`, `/admin/ontology`, `/admin/companies`, `/admin/audit`.

### 6.2 Missing Onboarding Flows to Implement
1. **/student/onboarding**:
   - Multi-step wizard:
     1. Basic Info (Name, Phone, Bio, Social Links)
     2. Academic Info (Institute, Department, Degree, Grad Year, CGPA)
     3. Skills Inventory (Canonical skill picker with proficiency level 1-4 & evidence attachment)
     4. Projects (Title, Description, Skills Used, Repo URL)
     5. Certifications (Name, Issuing Org, Date, Credential URL)
     6. Experience (Role, Company, Duration, Responsibilities)
     7. Career Preferences (Target Roles, Preferred Locations, Availability)
     8. Review & Submit -> Sets `onboardingStatus = COMPLETED` and redirects to `/student/opportunities`.
2. **/organization/onboarding**:
   - Multi-step wizard:
     1. Organization Info (Company Name, Registration ID, CIN/LLPIN, Founded Year)
     2. Business Details (Industry, Company Size, Website, Headquarter Address)
     3. Primary Contact (Contact Person, Official Email, Phone, Designation)
     4. Hiring Preferences (Target Departments, Hiring Season, Locations)
     5. Verification Documents (GSTIN / Certificate of Incorporation upload/URL)
     6. Review & Submit -> Sets `onboardingStatus = COMPLETED`, `verificationStatus = PENDING`, and redirects to `/organization/dashboard` with pending notice.

---

## 7. Testing Framework & Execution Status

### 7.1 Existing Test Suite
- **Location**: `tests/test-runner.js`
- **Framework**: Custom standalone lightweight test runner (zero external testing framework dependencies).
- **Execution Command**: `node tests/test-runner.js`
- **Verification Results**:
  - **Tier 1 (Feature Coverage F01-F31)**: 155 tests passed (100%)
  - **Tier 2 (Boundary & Corner Cases)**: 21 tests passed (100%)
  - **Tier 3 (Cross-Feature Combinations)**: 8 tests passed (100%)
  - **Tier 4 (Real-World Scenarios)**: 7 tests passed (100%)
  - **Total**: **191 / 191 PASS (100.0%) in ~296ms, Exit Code 0**.
- **Next.js Production Build**: `next build` compiles 28 static/dynamic routes successfully with zero syntax or bundling errors.

---

## 8. Actionable Recommendations for Implementation

1. **Install Missing Package**:
   - Run `npm install better-auth` to install Better Auth core and React bindings.
2. **Configure Drizzle & Neon DB Schemas**:
   - Create `drizzle.config.js` pointing to `lib/db/schema.js` and Neon PostgreSQL URL.
   - Define Drizzle schemas in `lib/db/schema.js` for Better Auth tables (`user`, `session`, `account`, `verification`), security tables (`signup_intents`), role profiles (`student_profile`, `organization_profile`, `admin_profile`), and governance (`audit_logs`).
   - Create database connection initialization in `lib/db/index.js` using `@neondatabase/serverless` and `drizzle-orm/neon-serverless`.
3. **Configure Better Auth Server & Client**:
   - Implement `lib/auth.js` with Better Auth instance, Google OAuth, Drizzle adapter, signup intent verification, role immutability enforcement, and initial admin provisioning.
   - Implement `lib/auth-client.js` with `createAuthClient`.
   - Implement Next.js App Router route handler at `app/api/auth/[...all]/route.js`.
4. **Implement Server-Side Middleware**:
   - Create `middleware.js` in project root enforcing session validation, role gating (`STUDENT`, `ORGANIZATION`, `ADMIN`), onboarding redirection, and status checks.
5. **Build Onboarding Pages & Organization Portal**:
   - Implement `/student/onboarding` multi-step flow.
   - Implement `/organization/onboarding` multi-step flow.
   - Add `/organization/*` routes or proxy matching existing recruiter routes with strict role checking.
   - Add Auth UI modals/pages for Role Selection (Student vs Organization) -> Google OAuth redirect.
6. **Environment Configuration**:
   - Update `.env` and create clean `.env.example` with placeholders for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `INITIAL_ADMIN_EMAIL`.
