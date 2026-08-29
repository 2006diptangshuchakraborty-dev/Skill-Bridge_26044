# Orchestration Plan — Skill Bridge

## Phase 0: Survey & Requirements Mapping
- Spawn 3 Explorers:
  - Explorer 1 (`survey_explorer_1`): Survey existing Next.js app structure, `app/page.jsx`, UI components, styling, package.json dependencies, and public assets.
  - Explorer 2 (`survey_explorer_2`): Survey database schema (Prisma/DB), ORM models, auth setup, environment variables configuration, and data structures.
  - Explorer 3 (`survey_explorer_3`): Survey existing routes, API endpoints, mock data, opportunities/applications components, and test setups.
- Consolidate findings into `PROJECT.md` with Feature Inventory, System Architecture, Code Layout, Interface Contracts, and Milestone Decomposition.

## Phase 1: Dual Track Initiation
- **E2E Testing Track**: Spawn Sub-orchestrator / Test Writer for E2E Test Suite (Tiers 1-4: Feature coverage, Boundary/Corner cases, Cross-feature pairwise combinations, Real-world application scenarios, test runners `npm test` and `node tests/test-auth-suite.js`).
- **Implementation Track**: Spawn Sub-orchestrators for milestones.

## Phase 2: Implementation Milestones
- Milestone 1: Authentication & 3 Immutable Roles (STUDENT, INDUSTRY, INSTITUTE) with Better Auth + Google OAuth + RoleSelector.
- Milestone 2: Database Schema & Profile Completion Logic (User, StudentProfile, IndustryProfile, InstituteProfile, calculation helpers).
- Milestone 3: Profile Gating & Onboarding Flow (Redirection, completion progress bar, access gating for incomplete student profiles).
- Milestone 4: Public Landing Page Preservation & Dynamic Navbars (preserve visual identity of `app/page.jsx`, role-based authenticated navbar).
- Milestone 5: Role-Specific Authenticated Dashboards & Realistic Dummy Data (`app/home/page.jsx`, student/industry/institute dashboards).
- Milestone 6: Opportunities, Applications & Skill System Foundation (Search/filter, application statuses, opportunity creation, canonical skills framework).
- Milestone 7: Route Protection, Security Middleware & Server Actions (Role enforcement, session validation, unauthorized access rejection).

## Phase 3: Final Integration & E2E Test Verification
- Phase 1: Pass 100% of E2E Test Suite (Tiers 1-4).
- Phase 2: Adversarial Coverage Hardening (Tier 5 Challenger -> Worker -> Reviewer).
- Full clean build check (`npm run build`).

## Phase 4: Final Reporting
- Prepare final handoff report and notify Sentinel.
