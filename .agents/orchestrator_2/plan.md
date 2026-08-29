# Project Execution Plan — Skill Bridge Platform

## 1. Objectives & Deliverables
1. **Public Landing Page Preserved**: Preserve visual identity in `app/page.jsx` with public navbar and section links for Student, Industry, Institute + Sign In/Up.
2. **Better Auth & 3 User Roles**:
   - Roles: `STUDENT`, `INDUSTRY`, `INSTITUTE` (with immutability and pre-OAuth role selection via RoleSelector).
   - Better Auth Google OAuth integration, session management, and server authorization.
3. **Database Schema & Profiles**:
   - Drizzle ORM schemas in `db/schema.js`: `user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `industry_profile`, `institute_profile`, `audit_logs`, `opportunities`, `applications`, `skills`.
   - 1:1 foreign key constraints to `user.id`.
   - Profile completion calculation utilities (`calculateProfileCompletion`, `isProfileComplete`).
4. **Profile Gating & Onboarding**:
   - Gated routes for incomplete profiles (`/profile/complete` or role-specific onboarding wizards).
   - Visual progress bar (e.g. 70% complete indicator with required vs optional checklist).
   - Enforce gating: Students with incomplete profiles cannot access opportunities/applications or apply.
5. **Role-Aware Navbars & Authenticated Dashboards**:
   - Dynamic navbar per role (Student, Industry, Institute).
   - Role-specific authenticated home dashboard (`app/home/page.jsx` and sub-dashboards) with realistic dummy data (`lib/dummy-data/`).
6. **Opportunities, Applications & Canonical Skills**:
   - Student opportunities exploration (`/opportunities`), filters, match percentages, details, apply flow.
   - Applications tracking (`/applications`) with status progression.
   - Industry opportunity creation & applicant review.
   - Canonical skill framework & verification schema foundation.
7. **Security, Middleware & Server Authorization**:
   - Next.js Edge route middleware & server action / API guards.
8. **Verification**:
   - All test suites passing (`node tests/test-auth-suite.js` or `npm test`).
   - Clean Next.js build (`npm run build`).

## 2. Milestone Structure
- **M0: Survey & Gap Analysis** (3 Explorers in parallel):
  - Explorer 1: Auth, Better Auth, pre-OAuth role selection, roles & DB schema.
  - Explorer 2: Profiles, Onboarding wizards, Profile gating, Role-aware Navbars & Dashboards.
  - Explorer 3: Opportunities, Applications, Canonical Skill System, Route Middleware & API Security, Build readiness.
- **M1: Core Schema & Auth Integration**:
  - Drizzle schemas, Better Auth server/client config, pre-OAuth role selection & intents.
- **M2: Profiles, Onboarding Wizards & Profile Gating**:
  - 1:1 profiles, completion scoring, onboarding wizards, profile completion bar, gating logic.
- **M3: Role-Aware Navbars & Authenticated Dashboards**:
  - Public landing page preservation, dynamic authenticated navbar, role dashboards with realistic dummy data.
- **M4: Opportunities, Applications & Skill System**:
  - Student opportunities & applications pages, Industry post opportunity & applicant review, canonical skills framework.
- **M5: Security Middleware & Route Protection**:
  - Edge middleware, API guard (`withAuth`), IDOR checks, role partitioning.
- **M6: Full Test Suite & Build Verification**:
  - Run all E2E test suites, fix any edge case discrepancies, execute `npm run build`.
