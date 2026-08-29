# BRIEFING — 2026-08-23T13:51:00Z

## Mission
Investigate project root directory e:/sih_2026_044 and determine Next.js version, router, package manager, scripts, dependencies, database config/schema, auth setup, UI structure, and test framework for the Skill Bridge platform.

## 🔒 My Identity
- Archetype: explorer
- Roles: codebase-surveyor, stack-analyzer
- Working directory: e:/sih_2026_044/.agents/survey_codebase_explorer
- Original parent: c93f230f-875e-4869-9adf-0f66b5404080
- Milestone: codebase-survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Deliver findings to codebase_survey.md and handoff.md
- Use send_message to report back to parent orchestrator

## Current Parent
- Conversation ID: c93f230f-875e-4869-9adf-0f66b5404080
- Updated: 2026-08-23T13:51:00Z

## Investigation State
- **Explored paths**:
  - `package.json`, `.env`, `next.config.js`, `tailwind.config.js`, `PROJECT.md`, `TEST_INFRA.md`, `TEST_READY.md`
  - `lib/` (`db.js`, `engine.js`, `normalization.js`, `nlp-extractor.js`, `alerts.js`, `notifications.js`)
  - `components/` (`Navbar.jsx`, `RoleSwitcher.jsx`, `MatchMeter.jsx`, `EvidenceBadge.jsx`, `StatusPill.jsx`)
  - `app/` (`layout.jsx`, `page.jsx`, `admin/*`, `institute/*`, `recruiter/*`, `student/*`, `api/*`)
  - `tests/` (`test-runner.js`, `test-helper.js`, `fixtures/demo-data.fixture.js`, `e2e/*`, `adversarial-*`)
  - `scripts/` (`seed.js`, `test-matching-rules.js`)
- **Key findings**:
  - Next.js 14.2.5 with App Router in JavaScript/JSX (`.jsx`, `.js`).
  - Package manager: `npm` with `package-lock.json`. Node v24.11.0, npm 11.6.2.
  - Dependencies: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`, `dotenv`, `tsx`.
  - Missing dependency: `better-auth`.
  - Persistence: In-memory/JSON DB at `data/db.json` and `lib/db.js`. Neon PostgreSQL `DATABASE_URL` is in `.env`, but no Drizzle schema files, `drizzle.config.js`, or migration files exist yet.
  - Auth: No Better Auth handler, client, or server config exists yet. Demo switcher uses client-side localStorage.
  - Missing routes: `/student/onboarding`, `/organization/onboarding`, `/organization/*` (currently mapped as `/recruiter/*`), `/api/auth/[...all]`.
  - Tests: Standalone zero-dependency test runner in `tests/test-runner.js` passing 191/191 tests across 4 tiers.
- **Unexplored areas**: None. Full codebase scan completed.

## Key Decisions Made
- Fully cataloged all dependencies, router setup, persistence layers, auth status, UI structure, and test infrastructure.

## Artifact Index
- e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md — Original User Request
- e:/sih_2026_044/.agents/survey_codebase_explorer/DISPATCH.md — Dispatch log
- e:/sih_2026_044/.agents/survey_codebase_explorer/progress.md — Progress and heartbeat
- e:/sih_2026_044/.agents/survey_codebase_explorer/codebase_survey.md — Detailed codebase survey
- e:/sih_2026_044/.agents/survey_codebase_explorer/handoff.md — 5-component handoff report
