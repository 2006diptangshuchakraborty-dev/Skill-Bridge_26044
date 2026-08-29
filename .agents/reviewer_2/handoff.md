# Handoff Report — Reviewer 2 & Adversarial Critic

**Project**: SIH 2026 Platform: Industry Collaboration for Skill Mapping, Internships and Placement  
**Reviewer**: Reviewer 2 (reviewer, critic)  
**Date**: 2026-08-22  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Core Engines & Database Examination
- **`lib/engine.js`**: Dynamic, priority-aware skill matching engine (`evaluateMatch`, `rankCandidatesForOpportunity`). Correctly enforces strict 100% High-Priority satisfaction, 70/30 composite score weighting for eligible candidates, 35% cap for ineligible candidates, and actionable gap/recommendation breakdowns.
- **`lib/normalization.js`**: 37 canonical skills in `SKILL_ONTOLOGY`, runtime alias registry mapping aliases (e.g. `ReactJS`, `react.js`, `postgres`, `psql`), string sanitizer (`cleanSkillString`), and title casing fallback.
- **`lib/nlp-extractor.js`**: Rule-based JD parser extracting skills into high and low priority suggestion pools based on keyword proximity and priority signals (`must have`, `required`, `preferred`, `nice to have`).
- **`lib/alerts.js`**: Cohort gap aggregator (`aggregateSkillGaps`) with privacy threshold filtering (< 5 suppressed to prevent PII re-identification).
- **`lib/notifications.js`**: In-app notification query and read status updater.
- **`lib/db.js`**: JSON persistence layer interfacing with `data/db.json` and auto-cloning from `data/seed.json`.

### 1.2 Entity Counts & Seed Data Verification
Inspected `data/seed.json` and `data/db.json`:
- **Students**: Exactly **52 students** (`std_001` through `std_052`).
- **Companies**: Exactly **12 companies** (`comp_001` through `comp_012`).
- **Opportunities**: Exactly **16 opportunities** (`opp_001` through `opp_016`).
- **Skills**: Exactly **37 canonical skills** in `seed.json` and `lib/normalization.js`.
- **Primary Demo Opportunity (`opp_001` Data Analyst Intern / Internship)**:
  - 4 High Priority Skills: Python (2), SQL (2), Data Analysis (3), Statistics (2).
  - 4 Low Priority Skills: Power BI (1), Tableau (1), Excel (3), Machine Learning (1).
- **Demo Personas on `opp_001`**:
  - `std_001` (Aarav Sharma): 4/4 High (100%), 3/4 Low (75%, missing ML) -> `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`, composite score **92.5%**, Apply button ENABLED.
  - `std_002` (Priya Patel): 4/4 High (100%), 4/4 Low (100%) -> `FULL MATCH`, composite score **100.0%**, Apply button ENABLED.
  - `std_003` (Rohan Verma): 3/4 High (75%, missing mandatory SQL), 4/4 Low (100%) -> `NOT ELIGIBLE - MANDATORY SKILL GAP`, composite score **~30.0%**, Apply button DISABLED.
  - `std_004` (Ananya Sen): 1/4 High (25%, 3 below required proficiency), 2/4 Low (50%) -> `NOT ELIGIBLE - MANDATORY SKILL GAP`, composite score **~15.0%**, Apply button DISABLED.

### 1.3 Command Executions & Test Results
- **Command**: `node scripts/test-matching-rules.js`
  - **Result**: **13 / 13 PASS (100%)**, Exit Code `0`.
- **Command**: `node tests/test-runner.js`
  - **Result**: **184 PASS, 7 FAIL, 0 SKIP** (Pass rate: 96.3%), Exit Code `1`.
  - **Failed Tests in Tier 1**:
    1. `F17-03`: *Detects experience level and role category from JD* — `expected "Data Analyst", got undefined`
    2. `F22-04`: *Assigns priority levels (HIGH, MEDIUM, LOW) based on student volume* — `alert.priority` undefined
    3. `F22-05`: *Suggests actionable remediation: "Create 1-Click Workshop"* — `alert.suggestedAction` undefined (found `alert.recommendedAction`)
    4. `F15-01`: *Generates notification for eligible student with missing preferred skills* — property mismatch (`missingPreferredSkills` vs `missingSkills`)
    5. `F15-02`: *Generates FULL MATCH notification for 100% matched candidate* — property mismatch (`missingPreferredSkills` vs `missingSkills`)
    6. `F15-03`: *Does not generate eligible notification for ineligible candidate* — returned `{ type: 'MANDATORY_GAP' }` instead of `null`
    7. `F17-01`: *Extracts high priority mandatory skills from JD text* — property alias mismatch (`highPrioritySuggestions` vs `highPrioritySkills`)
- **Command**: `npm run build`
  - **Result**: **BUILD FAILED**, Exit Code `1`.
  - **Verbatim Error**:
    ```
    > sih-2026-skill-mapping-platform@1.0.0 build
    > next build
      ▲ Next.js 14.2.5
       Creating an optimized production build ...
     ✓ Compiled successfully
       Skipping linting
       Checking validity of types ...
       Collecting page data ...

    > Build error occurred
    Error: Cannot find module 'E:\sih_2026_044\.next\server\middleware-manifest.json'
    Require stack:
    - E:\sih_2026_044\node_modules\next\dist\build\index.js
    - E:\sih_2026_044\node_modules\next\dist\cli\next-build.js
    ```

---

## 2. Logic Chain

1. **Integrity Assessment**:
   - `lib/engine.js` and `lib/normalization.js` contain genuine dynamic evaluation and ontology lookup logic. There is no evidence of hardcoded cheating or facade bypasses for the core matching algorithms.
2. **Acceptance Criteria Verification**:
   - The core business rule (strict 100% High Priority gating) passes in both `test-matching-rules.js` and in Tier 2/3/4 of `test-runner.js`.
3. **Failure Analysis**:
   - `npm run build` failed during page data collection due to a Next.js build artifact resolution error (`middleware-manifest.json`). This prevents a clean production deployment.
   - 7 test failures in `tests/test-runner.js` are due to minor interface contract naming mismatches between `lib/nlp-extractor.js` / `lib/alerts.js` and the test harness expectations in `tests/e2e/tier1-features.test.js`.
4. **Attestation Mismatch**:
   - `TEST_READY.md` claimed 191/191 tests passing, but the live execution on the actual `lib/` modules yields 184/191 passing due to these 7 contract mismatches.

---

## 3. Caveats

- **Caveat 1**: The Next.js build error appears related to Next.js 14 caching / stale `.next` build files or App Router page exports on Windows.
- **Caveat 2**: All functional business logic in `lib/engine.js` is sound; the test failures in Tier 1 are interface property name discrepancies (`highPrioritySuggestions` vs `highPrioritySkills`, `recommendedAction` vs `suggestedAction`, `priority` assignment).

---

## 4. Conclusion & Actionable Findings

### **Verdict**: **REQUEST_CHANGES**

### Findings Requiring Resolution:

1. **[Critical] Next.js Production Build Failure**:
   - **Location**: `npm run build`
   - **Issue**: Build fails with `Error: Cannot find module 'E:\sih_2026_044\.next\server\middleware-manifest.json'`.
   - **Action**: Clean stale `.next` directory and ensure all page exports in `app/` are compatible with static generation / SSR during `next build`.

2. **[Major] Interface Contract Alignment in `lib/nlp-extractor.js` and `lib/alerts.js`**:
   - **Location**: `lib/nlp-extractor.js`, `lib/alerts.js`
   - **Issue**:
     - In `lib/nlp-extractor.js`: Return `{ highPrioritySkills, highPrioritySuggestions, lowPrioritySkills, lowPrioritySuggestions, extractedRole, experienceLevel }`.
     - In `lib/alerts.js`: Add `priority: count >= 20 ? 'HIGH' : (count >= 10 ? 'MEDIUM' : 'LOW')` and alias `suggestedAction: 'Create 1-Click Workshop'` alongside `recommendedAction`.
     - In `lib/alerts.js` (`generateStudentNotification`): Return `missingSkills: missingPreferred` and return `null` when candidate is ineligible (or ensure both property formats are supported).
   - **Action**: Update these return structures to satisfy both frontend consumer components and E2E test assertions.

3. **[Minor] Update `TEST_READY.md`**:
   - **Location**: `TEST_READY.md`
   - **Issue**: Update test execution count and duration to reflect live execution once all 191 tests pass.

---

## 5. Verification Method

To independently verify the fixes:
```powershell
# 1. Verify Core Matching Rules
node scripts/test-matching-rules.js

# 2. Run Full E2E Test Suite (Expect 191/191 PASS)
node tests/test-runner.js

# 3. Verify Production Next.js Build
npm run build
```
