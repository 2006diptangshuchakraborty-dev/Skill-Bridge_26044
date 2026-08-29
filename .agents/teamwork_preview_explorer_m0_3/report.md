# Phase 0 Codebase Survey: Landing Page, Navbars, Dashboards, Opportunities, Skills, Security, and Test Infrastructure

**Surveyor**: Explorer 3  
**Working Directory**: `e:\sih_2026_044\.agents\teamwork_preview_explorer_m0_3\`  
**Date**: 2026-08-24  
**Workspace Root**: `e:\sih_2026_044`  
**Integrity Mode**: Development / Read-Only Investigation  

---

## Executive Summary

A comprehensive architectural and code-level investigation of the **Skill Bridge Platform** was conducted across seven target functional areas. The platform demonstrates an exceptionally strong algorithmic foundation for Priority-Aware Skill Matching (`100% High Priority Gatekeeper Rule`), multi-evidence skill verification (Levels 1–5), Edge route partitioning, cryptographic signup intents, tamper-proof role assignment, and robust test infrastructure (30/30 auth tests, 191/191 engine tests, 8/8 verification tests, 32/32 adversarial tests passing; Next.js 14.2.5 production build cleanly compiling across 48 routes).

Key architectural gaps have been identified where the current implementation uses legacy/prototype structures (e.g. `/recruiter/*` instead of unified `/organization/*`, JSON-backed database in `lib/db.js` alongside Drizzle ORM in `db/schema.js`, lack of `app/home/page.jsx` and `lib/dummy-data/`, and a public navbar missing smooth-scroll section links + Sign In/Up CTA).

---

## Section-by-Section Investigation Findings

### 1. Public Landing Page (`app/page.jsx`)
* **Visual Identity & Design System**:
  * **Theme**: Strict dark mode palette anchored on `bg-slate-950` with slate borders (`border-slate-800`).
  * **Accents & Gradients**: Emerald-to-teal-to-cyan gradient text (`bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent`) and glowing radial blurs (`bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`).
  * **Typography**: Extrabold heading hierarchy (`text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight`), accompanied by uppercase monospace category tags (`text-xs font-mono bg-emerald-500/20 text-emerald-300`).
  * **Animations & Interactivity**: Smooth CSS transitions on card hover (`group-hover:scale-110`, `group-hover:text-emerald-400`, `transition-all duration-500` on match meters).
  * **Responsiveness**: Fully responsive via Tailwind grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) and flex layouts (`flex-col md:flex-row`).
* **Content Structure**:
  * **Hero Header**: Displays platform title and continuous connection lifecycle: `Industry Requirements ➔ Skill Mapping ➔ Student Profile ➔ Gap Analysis ➔ Verified Experience ➔ Institute Analytics`.
  * **Core Innovation Spotlight Card**: Explains the *Priority-Aware Skill Matching Engine* with Section 01 (Mandatory 100% High-Priority Gate) and Section 02 (Preferred Low-Priority with partial matching & alerts).
  * **Role Navigation Cards**: 3 active cards routing to `/student/opportunities`, `/recruiter/dashboard`, and `/institute/dashboard` (with `/admin/dashboard` commented out).
* **Identified Gaps Against Specification (`ORIGINAL_REQUEST.md §1`)**:
  * **Public Navbar Integration**: Public navbar currently defaults to student links (`Opportunities`, `My Profile & Skills`, `My Applications`) instead of public navigation (`Student`, `Industry`, `Institute` smooth scroll section links + `Sign In / Sign Up` CTA button).
  * **Value Proposition Sections**: The landing page currently only has the Spotlight card and role navigation cards; it lacks dedicated detailed sections explaining value propositions for Student, Industry, and Institute with realistic dummy data.

---

### 2. Dynamic Authenticated Navbar (`components/shared/Navbar.jsx`)
* **Current Implementation**:
  * Employs path-based matching (`pathname.startsWith(...)`) to switch link sets:
    * `/recruiter/*` -> Dashboard, Post Opportunity, Candidates, Candidate Comparison, Post-Internship Eval.
    * `/institute/*` -> Dashboard, Skill Gap Alerts, Training Programs, Employer Feedback.
    * `/admin/*` -> Dashboard, Users & Roles, Skill Ontology, KYC Queue, Audit Logs.
    * Default (Student) -> Opportunities, My Profile & Skills, My Applications.
* **Identified Gaps Against Specification (`ORIGINAL_REQUEST.md §5`)**:
  * **Student Navbar**: Requires `Home`, `Opportunities`, `My Applications`, `Profile`, `[Avatar + Profile completion badge]`. Current navbar lacks `Home`, profile completion badge, and avatar.
  * **Industry Navbar**: Requires `Home`, `Post Opportunity`, `My Opportunities`, `Applications`, `Candidates`, `Profile`, `[Avatar]`. Current navbar uses recruiter subpaths and lacks `Home`, `My Opportunities`, `Applications`, `Profile`, and `[Avatar]`.
  * **Institute Navbar**: Requires `Home`, `Students`, `Skill Insights`, `Industry Connections`, `Opportunities`, `Profile`, `[Avatar]`. Current navbar lacks `Home`, `Students`, `Skill Insights`, `Industry Connections`, and `[Avatar]`.
  * **Auth State Awareness**: `Navbar.jsx` currently does not consume client session state (`useSession()` from `lib/auth-client.js`) or user cookies to render user avatars, sign-out actions, or profile completion percentages.

---

### 3. Authenticated Home / Dashboards & Realistic Dummy Data
* **Authenticated Home (`app/home/page.jsx`)**:
  * **Current State**: `app/home/page.jsx` does **not exist** in the repository.
  * **Requirement**: Provide a central `/home` entry point that inspects the authenticated session role (`STUDENT`, `ORGANIZATION`/`INDUSTRY`, `INSTITUTE`, `ADMIN`) and renders or redirects to the appropriate role-specific dashboard with realistic dummy data.
* **Role Dashboards**:
  * **Student Portal** (`app/student/`): Contains `student/opportunities/page.jsx`, `student/opportunities/[id]/page.jsx`, `student/applications/page.jsx`, `student/profile/page.jsx`, `student/skills/page.jsx`, `student/onboarding/page.jsx`, `student/assessments/[attemptId]/page.jsx`.
  * **Recruiter / Organization Portal** (`app/recruiter/` vs `app/organization/`):
    * `app/recruiter/dashboard/page.jsx`: Recruiter console displaying published roles, talent pool metrics, and 100% gatekeeper status.
    * `app/recruiter/jobs/create/page.jsx`: Role creator with AI JD extraction.
    * `app/recruiter/candidates/page.jsx` & `compare/page.jsx`: Candidate filtering & multi-candidate comparison matrix.
    * `app/recruiter/evaluate/page.jsx`: Post-internship evaluation elevating skills to Level 5.
    * `app/organization/onboarding/page.jsx`: 7-step organization onboarding wizard.
  * **Institute Portal** (`app/institute/`):
    * `app/institute/dashboard/page.jsx`: Department metrics, skill gap alerts, training programs, employer feedback.
    * `app/institute/skill-gaps/page.jsx`: Privacy-preserving aggregated gap alerts (k-anonymity >= 5).
    * `app/institute/training/page.jsx`: 1-click workshop creator and enrollment tracker.
    * `app/institute/feedback/page.jsx`: Employer feedback and verified experience endorsement summary.
  * **Admin Console** (`app/admin/`):
    * `app/admin/dashboard/page.jsx`: KPI summary & system metrics.
    * `app/admin/users/page.jsx`: User management & status toggles (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`).
    * `app/admin/verifications/page.jsx`: KYC approval/rejection queue.
    * `app/admin/audit-logs/page.jsx`: Immutable forensic audit trail.
* **Dummy Data Layer**:
  * **Current State**: Data resides in `data/seed.json` and `data/db.json`, managed by `lib/db.js`.
  * **Gap**: `lib/dummy-data/` folder specified in `ORIGINAL_REQUEST.md §5` does not exist yet as an isolated module for role dashboards.

---

### 4. Opportunities & Applications Workflow
* **Opportunities Browser (`app/student/opportunities/page.jsx`)**:
  * Search bar (role title, company, location).
  * 4-way filter: `All Opportunities`, `Eligible Only`, `Partial Preferred Match`, `Mandatory Skill Gap`.
  * Dual match display: Mandatory match % (100% required) and Preferred match %, with chip tags displaying missing mandatory vs missing preferred skills.
* **Opportunity Detail & Apply (`app/student/opportunities/[id]/page.jsx`)**:
  * Uses `MatchMeter` component for visual breakdown of High Priority (Mandatory) and Low Priority (Preferred) requirements.
  * Action gating: If candidate is missing mandatory skills, the Apply button is disabled with error message `Missing High-Priority mandatory skills`. If eligible, triggers `POST /api/applications`.
  * Actionable upskilling recommendations generated per gap.
* **Applications Tracker (`app/student/applications/page.jsx`)**:
  * Lists student submitted applications with `StatusPill`, company name, application date, and match percentages.
  * Backend model supports application statuses; UI needs full parity with standard 6-state lifecycle (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW`, `SELECTED`, `REJECTED`).
* **Industry Opportunity Creation (`app/recruiter/jobs/create/page.jsx`)**:
  * Integrates AI JD extraction (`POST /api/extract-skills` via `lib/nlp-extractor.js`).
  * Visual separation into Section 01 High Priority (Mandatory) and Section 02 Low Priority (Preferred).
  * Proficiency level selection (1–4) per skill.
* **Industry Candidate Review & Comparison**:
  * `/recruiter/candidates`: Candidate directory with match filters (`All Eligible`, `Full Match`, `Partial Preferred`, `Mandatory Gap`).
  * `/recruiter/compare`: Side-by-side comparison matrix for 1–4 candidates.

---

### 5. Canonical Skill Framework & Verification Schema
* **Ontology & Normalization Engine (`lib/normalization.js` & `lib/taxonomy.js`)**:
  * Pre-populated ontology registry covering 35+ canonical skills across 8 categories (Programming, Web Dev, Database, Data Science, AI/ML, Cloud/DevOps, Design, Business).
  * String normalizer handles aliases, casing, punctuation, and special tokens (e.g. `c++`, `next.js`, `postgres` -> `PostgreSQL`, `plsql` -> `SQL`).
* **5-Level Multi-Evidence Verification Hierarchy (`components/shared/EvidenceBadge.jsx`)**:
  * Level 1: Self Declared (`bg-slate-800`)
  * Level 2: Course Certificate (`bg-blue-950`)
  * Level 3: Assessment Verified (`bg-purple-950`)
  * Level 4: Project / Portfolio Verified (`bg-teal-950`)
  * Level 5: Industry Verified (`bg-emerald-950` with shield icon)
* **Assessment & Multidimensional Scoring Engine (`lib/assessment-engine.js`, `lib/scoring-engine.js`)**:
  * Timed assessment attempts with anti-cheating tracking (tab switch, focus loss, copy-paste, fullscreen exit) and Integrity Risk Score (0–100).
  * 5 Scoring Dimensions: Conceptual Knowledge (30%), Problem Solving (20%), Practical Coding (30%), Advanced Knowledge (10%), Real-world Scenario (10%).
  * Minimum Competency Rules enforce verified proficiency thresholds (`Expert`, `Advanced`, `Intermediate`, `Beginner`).
  * Generates tamper-resistant public verification records (`SB-SKILL-XXXXX`) accessible at `/verify/[verificationId]`.
* **Database Schema Alignment (`db/schema.js`)**:
  * Defines core Drizzle tables: `user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `organization_profile`, `admin_profile`, `audit_logs`.
  * Skills in `student_profile` are currently serialized in a `jsonb('skills')` column. Normalized relational tables for `Skill`, `SkillAssessment`, `SkillVerification` can be added to Drizzle schema to complement the in-memory engine.

---

### 6. Middleware & API Route Security
* **Edge Middleware (`middleware.js`)**:
  * Protects `/student/*`, `/organization/*`, `/recruiter/*`, `/admin/*`, `/account-suspended`, `/login`, `/register`.
  * Resolves Better Auth session cookies (`better-auth.session_token`, `__Secure-better-auth.session_token`, `sb_session_token`) and test headers (`x-user-id`, `x-user-role`, `x-account-status`, `x-onboarding-status`).
  * Enforces account suspension lockout: redirects `SUSPENDED` / `DEACTIVATED` accounts immediately to `/account-suspended`.
  * Redirects un-onboarded users (`NOT_STARTED`, `IN_PROGRESS`) to their respective onboarding wizards (`/student/onboarding`, `/organization/onboarding`).
* **Server API Security Guard (`lib/auth-guard.js`)**:
  * `withAuth` higher-order wrapper provides:
    1. Cryptographic session resolution.
    2. Account status validation (`requireActive`).
    3. Role authorization (`roles: ['STUDENT', 'ORGANIZATION', 'ADMIN']`).
    4. Onboarding completion enforcement (`requireOnboarded`).
    5. Organization KYC gatekeeping (`requireApprovedOrg`: blocks pending orgs from publishing or accessing candidate PII).
    6. Tenant ownership & IDOR prevention (`checkOwnership`) with Super Admin governance override.
    7. Automatic audit logging via `lib/audit.js`.
* **Immutability & Role Handshake (`lib/auth.js`, `lib/signup-intent.js`, `components/RoleCollisionModal.jsx`)**:
  * Server-side signup intents enforce short TTL (10m) and strictly reject public `ADMIN` role creation with `403 Forbidden`.
  * Better Auth update hook strips `role`, `accountStatus`, and `id` from update requests.
  * Role collision engine prevents duplicate Google accounts from switching roles, prompting users with `RoleCollisionModal`.

---

### 7. Test Infrastructure & Verification Status
* **Test Suite Inventory & Results**:
  1. **Master E2E Auth Suite (`tests/test-auth-suite.js`)**:
     * **Result**: **30/30 PASSED (100%)** in 32ms.
     * Tier 1 (Feature Coverage): 15 tests (F01–F21).
     * Tier 2 (Boundary & Corner Cases): 9 tests (B01–B09).
     * Tier 3 (Cross-Feature Interactions): 3 tests (X01–X03).
     * Tier 4 (Real-World Application Scenarios): 3 tests (S01–S03).
  2. **Core Matching Engine & Feature Suite (`tests/test-runner.js`)**:
     * **Result**: **191/191 PASSED (100%)** in 506ms across 6 suites (F01–F31, B01–B21, Combinations, Demo Scenarios).
  3. **Skill Verification & Assessment Suite (`tests/test-verification-system.js`)**:
     * **Result**: **8/8 PASSED (100%)** across Taxonomy, Questions, Assessment Session, Multidimensional Scoring.
  4. **Adversarial Auth Challenge Suite (`tests/adversarial-auth-challenge.js`)**:
     * **Result**: **32/32 PASSED (100%)** in 712ms across 7 security sections (Intent expiry, replay attacks, admin registration bans, role collision, tampering, middleware route hopping, IDOR, KYC capability gating).
* **Build Verification (`npm run build`)**:
  * **Result**: **Clean Compilation (Exit Code 0)**.
  * Next.js 14.2.5 compiled successfully and generated static/dynamic bundles for all 48 routes with 0 type or lint errors.

---

## Architectural Comparison & Alignment Matrix

| Area | Current State | Required State (`ORIGINAL_REQUEST.md`) | Status / Delta |
|---|---|---|---|
| **Public Landing Page** | Spotlight card + Role navigation cards | Landing page with value props for Student, Industry, Institute + section scroll links | Needs value prop sections |
| **Public Navbar** | Defaults to Student navigation items | Left: Logo; Center: Student, Industry, Institute links; Right: Sign In / Sign Up CTA | Needs update in `Navbar.jsx` |
| **Authenticated Navbars** | Basic role path matching in `Navbar.jsx` | Role-specific links + Avatar + Profile completion badge + Better Auth session | Needs dynamic session integration |
| **Authenticated Home** | Not implemented (`/home` 404) | `app/home/page.jsx` role dispatcher with realistic dummy data | Needs `app/home/page.jsx` |
| **Opportunities & Apply** | Priority matching with 100% gatekeeper rule | `/opportunities` with search, filter, dual match %, apply modal/action | Fully functioning in `/student/opportunities` |
| **Applications Tracking** | Basic application list | 6-status lifecycle (`APPLIED` through `REJECTED`) | UI enhancement for 6-status badges |
| **Skill Ontology & Verification** | Normalized ontology + 5 evidence levels + multidimensional scoring | Canonical skill framework + assessment engine + verification records | Implemented in `lib/` and tested |
| **Middleware & API Security** | `middleware.js` + `withAuth` in `lib/auth-guard.js` | Session + Role + Profile completion + KYC gating + IDOR protection | Implemented, hardened, and verified |
| **Test Suites & Build** | 4 comprehensive test suites (261 total tests passing) | `npm test` passing + `npm run build` clean | 100% Passing & Clean Build |
