# HANDOFF REPORT: Next.js Setup, API Endpoints & Verification Script Specification

**From**: M1 Explorer 3 (`m1_explorer_3`)  
**To**: Orchestrator (`orchestrator_1`) / M1 Implementers  
**Task**: Investigate and specify exact implementation requirements for Next.js package config, API routes (`/api/match`, `/api/test-matching`), and matching rules test verification script (`scripts/test-matching-rules.js`).  
**Date**: 2026-08-22  
**Report Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

1. **Authoritative Requirements** (`e:\sih_2026_044\ORIGINAL_REQUEST.md`):
   - Line 5: *"Build a production-ready web platform in Next.js (JavaScript) for SIH 2026 based on the problem statement: 'Industry Collaboration for Skill Mapping, Internships and Placement'. The platform features a Priority-Aware Skill Matching Engine that strictly enforces 100% match on High-Priority (mandatory) skills for eligibility, while supporting partial matching and gap analysis for Low-Priority (preferred) skills across Student, Institute, Industry, and Admin portals."*
   - Line 15: *"Mandatory skills (High Priority) require 100% match and required proficiency (`Student proficiency >= Required proficiency`). If even one mandatory skill is missing or below proficiency, `Eligibility = NOT ELIGIBLE` regardless of overall or low-priority match."*
   - Line 16: *"Preferred skills (Low Priority) allow partial matching. Evaluate Low Priority only after High Priority eligibility is confirmed (`FULL MATCH`, `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`, or `NOT ELIGIBLE - MANDATORY SKILL GAP`)."*
   - Line 17: *"Every match result must be explainable, returning structured JSON containing exact high/low priority counts, match percentages, matched skills list, missing high-priority skills, and missing low-priority skills."*
   - Line 18: *"Skill normalization layer must map aliases (e.g. `ReactJS`, `React.js` -> `React`; `Postgres` -> `PostgreSQL`) to canonical skills prior to matching."*
   - Line 36: *"Clean Next.js architecture using JavaScript (no TypeScript migration), Tailwind CSS, local/persistent API endpoints or database layer, responsive modern UI inspired by Stripe/Linear."*
   - Line 37: *"Comprehensive demo seed data: 50+ students, 10+ companies, 15+ opportunities, 30+ skills, and the primary demo scenario (Data Analyst Internship with 4 High-Priority and 4 Low-Priority skills)."*
   - Line 56: *"Programmatic test script / endpoint exists and passes verification for all match rules, edge cases, and normalization."*

2. **Project Architecture Layout** (`e:\sih_2026_044\PROJECT.md`):
   - Lines 4-11: App Router in pure JavaScript (`.js`, `.jsx`), Tailwind CSS, `lucide-react`, JSON persistence layer (`lib/db.js`, `data/db.json`), `lib/engine.js`, `lib/normalization.js`.
   - Lines 65-95: Interface Contract for `lib/engine.js` (`evaluateMatch(student, opportunity)` returning structured explainable JSON).
   - Lines 148-149: Backend API routes `app/api/match/route.js` and `app/api/test-matching/route.js`.
   - Line 181: Verification script `scripts/test-matching-rules.js`.

---

## 2. Logic Chain

1. **Framework & Language Constraints**:
   - As mandated by ORIGINAL_REQUEST line 36 and PROJECT.md line 4, the application must use pure JavaScript (`.js`, `.jsx`) without TypeScript.
   - `package.json` specifies modern Next.js 14+ (`next@14.2.5`, `react@^18.3.1`, `react-dom@^18.3.1`), `lucide-react@^0.428.0` for icons, `clsx` and `tailwind-merge` for class names, and `tailwindcss@^3.4.10` with `postcss` and `autoprefixer`.
   - `next.config.js` is structured as a pure CommonJS module with `reactStrictMode: true` and `swcMinify: true`.
   - `tailwind.config.js` defines an obsidian/slate dark theme (`surface-950: #090d16`), semantic match status colors (`match-full: #10b981`, `match-partial: #f59e0b`, `match-ineligible: #ef4444`, `match-high: #6366f1`, `match-low: #8b5cf6`), and 5 evidence level badge colors.

2. **Evaluation API Endpoint (`app/api/match/route.js`)**:
   - Must support two invocation modalities:
     1. Database ID lookup: `{ "studentId": "...", "opportunityId": "..." }` retrieving entities via `lib/db.js`.
     2. Direct object payloads: `{ "student": { ... }, "opportunity": { ... } }` enabling interactive client-side simulators and unit tests.
   - Calls `evaluateMatch(student, opportunity)` from `lib/engine.js` and returns HTTP 200 with structured JSON, HTTP 400 for invalid inputs, and HTTP 404 if requested database IDs do not exist.

3. **Verification API Endpoint (`app/api/test-matching/route.js`)**:
   - `GET` endpoint executing 12 programmatic assertions across 3 suites:
     - Anchor Personas Suite: `std_001` (Aarav, 100% High, 75% Low -> `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`), `std_002` (Priya, 100% High, 100% Low -> `FULL MATCH`), `std_003` (Rohan, missing SQL -> `NOT ELIGIBLE - MANDATORY SKILL GAP`), `std_004` (Ananya, Python 1 < 2 -> `NOT ELIGIBLE - MANDATORY SKILL GAP`).
     - Skill Normalization Suite: Framework aliases (`ReactJS` -> `React`), database aliases (`Postgres` -> `PostgreSQL`), whitespace/casing (`"   pYtHoN 3   "` -> `Python`).
     - Boundary & Edge Cases: Empty student skills (0% match), 0 high-priority skills (100% match), 0 low-priority skills (FULL MATCH if High satisfied), higher proficiency satisfaction (Expert 4 >= Int 2), and sub-proficiency gap emission.
   - Returns a structured summary payload with total/passed/failed counts, pass rate %, duration in milliseconds, and test details.

4. **Standalone Verification Script (`scripts/test-matching-rules.js`)**:
   - A standalone Node.js CLI tool with ANSI color formatting (`[PASS]` in bold green, `[FAIL]` in bold red) executing the complete assertion matrix against `lib/engine.js` and `lib/normalization.js`.
   - Exits with `process.exit(0)` on 100% test pass, or `process.exit(1)` with failure logs if any assertion fails, enabling seamless CI and manual verification.

---

## 3. Caveats

1. **No TypeScript**: All files must strictly maintain `.js` and `.jsx` extensions. No `.ts` or `.tsx` files are permitted.
2. **Deterministic Seed Dependency**: The API route `/api/match` with ID lookups depends on `lib/db.js` initialization. If the DB is not initialized, `/api/match` must handle errors gracefully.
3. **Pure CommonJS Compatibility**: `scripts/test-matching-rules.js` uses standard Node.js `require()` for standalone CLI execution without requiring a bundler.

---

## 4. Conclusion

The technical specifications and complete implementation blueprints for the Next.js environment configuration, the `/api/match` and `/api/test-matching` API routes, and the `scripts/test-matching-rules.js` verification script are fully defined and documented in `e:\sih_2026_044\.agents\m1_explorer_3\analysis.md`. The implementation phase for Milestone 1 can proceed immediately with complete clarity.

---

## 5. Verification Method

1. **Inspect Detailed Blueprints**:
   - View `e:\sih_2026_044\.agents\m1_explorer_3\analysis.md`.
2. **Execute Test Script** (Post-Implementation):
   ```bash
   node scripts/test-matching-rules.js
   ```
   - Must output 12 passing assertions with green checkmarks and exit with status code `0`.
3. **Verify Test Endpoint**:
   - Query `GET http://localhost:3000/api/test-matching`.
   - Must return HTTP 200 with `"summary": { "passed": 12, "failed": 0, "passRate": 100 }`.
4. **Verify Evaluation Endpoint**:
   - Send `POST http://localhost:3000/api/match` with `{ "studentId": "std_001", "opportunityId": "opp_001" }`.
   - Must return HTTP 200 with `"isEligible": true` and `"status": "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH"`.
