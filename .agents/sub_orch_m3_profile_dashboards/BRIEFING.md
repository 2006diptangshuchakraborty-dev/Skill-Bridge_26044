# BRIEFING — 2026-08-26T06:59:05Z

## Mission
Deliver Milestone M3: Dynamic Profile Setup Wizard (`/profile/setup`) for all three roles (Student, Industry, Institute) with real-time completion progress, robust client & server validation, atomic profile setup submission, and canonical role dashboard pages (`/student/dashboard`, `/industry/dashboard`, `/institute/dashboard`).

## 🔒 My Identity
- Archetype: Sub-Orchestrator / Implementer / QA
- Roles: implementer, qa, specialist
- Working directory: e:\sih_2026_044\.agents\sub_orch_m3_profile_dashboards
- Original parent: ffb78a75-6929-4164-97f2-893e8dc6fb12
- Milestone: M3 (Dynamic Profile Setup & Role Dashboards)

## 🔒 Key Constraints
- Multi-step / progress-tracked profile setup at `/profile/setup` rendering dynamic role forms (Student, Industry, Institute).
- Real-time completion percentage (0-100%) consistent with `lib/onboarding-calc.js`.
- Client-side and server-side validation for required fields.
- Atomic submission updating role profile table (`student_profile`, `organization_profile`, `institute`), `user.profileCompleted = true`, and `user.onboardingStatus = 'COMPLETED'`. Redirects to canonical role dashboard.
- Obsidian dark UI styling consistent with the design system.
- Genuine implementations only — DO NOT hardcode test results or dummy facade implementations.
- Write ownership: `app/profile/setup/page.jsx`, `app/student/dashboard/page.jsx`, `app/industry/dashboard/page.jsx`, `app/api/profile/setup/route.js`.

## Current Parent
- Conversation ID: ffb78a75-6929-4164-97f2-893e8dc6fb12
- Updated: 2026-08-26T06:59:05Z

## Task Summary
- **What to build**:
  1. `/profile/setup`: Multi-step dynamic form wizard supporting Student, Industry, Institute roles with progress tracking and role-specific steps.
  2. `/api/profile/setup`: Unified or modular server endpoint for atomic onboarding profile submission and validation.
  3. `/student/dashboard`: Full-featured obsidian dark student dashboard.
  4. `/industry/dashboard`: Full-featured obsidian dark industry/recruiter dashboard.
  5. Validate `/institute/dashboard` accessibility and consistency.
- **Success criteria**: All auth suite tests and new profile setup / dashboard tests pass; full genuine logic.
- **Interface contracts**: PROJECT.md, SCOPE.md, prisma/schema.prisma, lib/onboarding-calc.js, lib/auth.js.

## Key Decisions Made
- [TBD - during investigation]

## Artifact Index
- `DISPATCH.md` — Orchestrator instructions
- `BRIEFING.md` — Situational awareness
- `progress.md` — Heartbeat & execution progress
- `handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not run yet
- **Lint status**: Clean
- **Tests added/modified**: Pending

## Loaded Skills
- None
