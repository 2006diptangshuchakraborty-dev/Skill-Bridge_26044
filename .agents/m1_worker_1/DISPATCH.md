## 2026-08-22T14:08:23Z
You are M1 Worker 1 for Milestone 1 (Core Engine, Normalization, Persistence, Seed Data & Base Next.js Setup) of the SIH 2026 platform: "Industry Collaboration for Skill Mapping, Internships and Placement".

Your working directory is `e:\sih_2026_044\.agents\m1_worker_1/`.

MANDATORY: Read `e:\sih_2026_044\ORIGINAL_REQUEST.md` and `e:\sih_2026_044\PROJECT.md`.
Read Explorer Blueprints:
- `e:\sih_2026_044\.agents\m1_explorer_1\analysis.md` (Engine & Normalization)
- `e:\sih_2026_044\.agents\m1_explorer_2\analysis.md` (Database Layer & Seed Data)
- `e:\sih_2026_044\.agents\m1_explorer_3\analysis.md` (Project Base Setup, API Routes, Verification Script)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File ownership (Exclusive):
- `package.json`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `lib/normalization.js`
- `lib/engine.js`
- `lib/db.js`
- `data/seed.json`
- `scripts/seed.js`
- `scripts/test-matching-rules.js`
- `app/layout.jsx`
- `app/page.jsx`
- `app/globals.css`
- `app/api/match/route.js`
- `app/api/test-matching/route.js`

Tasks to execute:
1. Initialize `package.json` with dependencies (Next.js, React, React-DOM, Lucide-React, Tailwind CSS, PostCSS, Autoprefixer, clsx, tailwind-merge) and ensure all code uses pure JavaScript (`.js`, `.jsx`). Run `npm install` (or verify package setup).
2. Implement `lib/normalization.js`: Canonical ontology with 35+ skills, rich alias dictionary, casing/trimming, normalization helper functions.
3. Implement `lib/engine.js`:
   - 4-level discrete proficiency scale (1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert).
   - Strict 100% High-Priority (Mandatory) match rule: `Student >= Required` for all mandatory skills.
   - Any missing or lower proficiency mandatory skill -> `isEligible: false`, status `"NOT ELIGIBLE - MANDATORY SKILL GAP"`.
   - Low-Priority (Preferred) partial matching evaluated only when High-Priority is satisfied -> `"FULL MATCH"` or `"ELIGIBLE - PARTIAL PREFERRED SKILL MATCH"`.
   - Explainable structured JSON results.
4. Implement `data/seed.json` with 52 students, 12 companies (11 verified, 1 pending KYC), 16 opportunities, 35 canonical skills, and anchor personas (`std_001` to `std_004`) on `opp_001` (Data Analyst Internship).
5. Implement `lib/db.js`: Atomic JSON DB layer (`data/db.json`) auto-initializing from `data/seed.json`, with CRUD methods and employer feedback elevation to Level 5.
6. Implement `scripts/seed.js` and run `node scripts/seed.js` to initialize the database.
7. Implement `scripts/test-matching-rules.js` and execute `node scripts/test-matching-rules.js` to verify all match rules and edge cases pass 100%.
8. Implement `app/layout.jsx`, `app/globals.css`, `app/page.jsx` (landing/welcome page with role navigation), `app/api/match/route.js`, and `app/api/test-matching/route.js`.
9. Verify Next.js build / linting / test scripts.

When done, write `e:\sih_2026_044\.agents\m1_worker_1\handoff.md` with complete verification outputs and send a message.
