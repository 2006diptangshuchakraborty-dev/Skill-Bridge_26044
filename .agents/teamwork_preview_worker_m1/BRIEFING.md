# BRIEFING — 2026-08-24T17:13:15Z

## Mission
Implement Database Schema, Better Auth Hooks, Role Alignment & Profile Calculators for Milestone 1.

## 🔒 My Identity
- Archetype: Worker 1
- Roles: implementer, qa, specialist
- Working directory: e:\sih_2026_044\.agents\teamwork_preview_worker_m1\
- Original parent: 0f150813-7c17-4b8d-9f00-807f8ab02d3f
- Milestone: Milestone 1

## 🔒 Key Constraints
- Update db/schema.js (userRoleEnum, profileCompleted on users, instituteProfiles table, relations, alias exports).
- Update lib/signup-intent.js (ALLOWED_SIGNUP_ROLES).
- Update lib/auth.js (additionalFields profileCompleted, auto-provision instituteProfiles in user.create.after hook).
- Update lib/onboarding-calc.js (calculateInstituteCompletion, getInstituteCompletionDetails, calculateProfileCompletion, isProfileComplete).
- Run test suites & build verification (100% pass, 0 errors).
- Do not cheat, no dummy implementations. Genuine logic.

## Current Parent
- Conversation ID: 0f150813-7c17-4b8d-9f00-807f8ab02d3f
- Updated: not yet

## Task Summary
- **What to build**: Schema updates for INSTITUTE role & instituteProfiles table, user profileCompleted column, Better Auth hooks for INSTITUTE auto-provisioning, signup intent roles alignment, unified profile completion calculator.
- **Success criteria**: Schema, auth, signup-intent, and onboarding-calc correctly updated and tested; all tests pass; build succeeds.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: db/schema.js, lib/auth.js, lib/signup-intent.js, lib/onboarding-calc.js

## Key Decisions Made
- [TBD]

## Change Tracker
- **Files modified**: none yet
- **Build status**: pending
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: pending
- **Tests added/modified**: pending

## Loaded Skills
- None

## Artifact Index
- e:\sih_2026_044\.agents\teamwork_preview_worker_m1\DISPATCH.md — Assignment instructions
- e:\sih_2026_044\.agents\teamwork_preview_worker_m1\progress.md — Liveness & task progress
- e:\sih_2026_044\.agents\teamwork_preview_worker_m1\handoff.md — Final handoff report
