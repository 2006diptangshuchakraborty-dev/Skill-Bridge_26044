# BRIEFING — 2026-08-23T13:48:00Z

## Mission
Design the complete end-to-end technical architecture for the authentication, authorization, and profile system for Skill Bridge.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Security & Architecture Explorer
- Working directory: e:/sih_2026_044/.agents/survey_architecture_explorer/
- Original parent: c93f230f-875e-4869-9adf-0f66b5404080
- Milestone: Authentication, Authorization, and Profile System Architecture Design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement application code
- Strictly design Drizzle ORM schema for PostgreSQL / Neon
- Ensure tamper-proof role assignment (1 Google Account = 1 Role) with immutability and strict admin restriction
- Complete multi-step onboarding state machine and dynamic completion calculation
- Admin governance workflows (verification queue, capability gating)
- Next.js middleware and API route authorization helper design

## Current Parent
- Conversation ID: c93f230f-875e-4869-9adf-0f66b5404080
- Updated: 2026-08-23T13:48:00Z

## Investigation State
- **Explored paths**: `e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md`, `PROJECT.md`, `package.json`, `lib/db.js`, `scripts/seed.js`, `app/` structure.
- **Key findings**: Complete architectural proposal created covering Drizzle ORM schema, pre-OAuth cryptographic signup intent lifecycle, 1-account-1-role immutability, onboarding state machines with dynamic completion calculation, admin verification queue with capability gating, Next.js Edge middleware, and `withAuth` API route authorization guard.
- **Unexplored areas**: None. Complete scope addressed.

## Key Decisions Made
- Architected pre-OAuth intent handshake (`signup_intents` table with 15-minute TTL and single-use flag) to eliminate client role injection.
- Established strict 1:1 foreign key relationships and unique indexes for role profile tables (`student_profile`, `organization_profile`, `admin_profile`).
- Designed capability gating matrix preventing unverified organizations from publishing opportunities or harvesting student PII.
- Formulated multi-layer authorization via Next.js Edge Middleware and server-side `withAuth` route guard.

## Artifact Index
- e:/sih_2026_044/.agents/survey_architecture_explorer/DISPATCH.md — Dispatch history
- e:/sih_2026_044/.agents/survey_architecture_explorer/progress.md — Liveness and progress tracking
- e:/sih_2026_044/.agents/survey_architecture_explorer/architecture_proposal.md — Complete architecture proposal
- e:/sih_2026_044/.agents/survey_architecture_explorer/handoff.md — 5-component handoff report
