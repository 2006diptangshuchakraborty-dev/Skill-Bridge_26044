# Milestone 4 Handoff Report: Student & Organization Multi-Step Onboarding Architecture

**Milestone**: M4 (Multi-Step Onboarding Wizards & Dynamic Calculation)  
**Agent**: Multi-Step Onboarding Explorer (`m4_onboarding_explorer`)  
**Date**: 2026-08-23T14:18:00Z  
**Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

1. **User Request & Blueprint Alignment**:
   - `ORIGINAL_REQUEST.md` line 33-39 defines R4: Student multi-step onboarding (8 steps: Basic Info, Academic Info, Skills & Proficiency, Projects, Certifications, Experience, Career Preferences, Review) and Organization multi-step onboarding (7 steps: Org Info, Business Registration, Contact Info, Industry details, Hiring Preferences, Verification Docs, Review).
   - `PROJECT.md` lines 37-40 (Features 11-14) details 8-step student wizard (`/student/onboarding`), 7-step organization wizard (`/organization/onboarding`), dynamic weighted completion scoring (0-100%), and automatic onboarding redirection from protected portals.
2. **Dynamic Completion Metric Invariant**:
   - `tests/auth-test-helper.js` lines 81-142 and `tests/e2e/tier1-feature-coverage.test.js` lines 247-300 mandate exact scoring logic for students: Basic Info (15%), Academic Info (15%), Skills (20%), Projects (15%), Certifications (10%), Experience (10%), Preferences (10%), Review Bonus (5%) totaling 100%.
   - For organizations: Basic Info (15%), Legal & Registration (20%), Contact & Address (15%), Industry & Size (15%), Hiring Preferences (15%), Verification Docs (15%), Review Bonus (5%) totaling 100%.
3. **Onboarding State Transitions & Gatekeeping**:
   - `tests/e2e/tier1-feature-coverage.test.js` lines 302-346 and `tests/e2e/tier4-real-world-scenarios.test.js` lines 35-98 verify that new accounts start with `onboardingStatus: "NOT_STARTED"`. Accessing `/student/dashboard` or `/organization/dashboard` redirects with HTTP 307 to their respective onboarding path until `onboardingStatus === "COMPLETED"`.
   - Organization onboarding completion initializes `verificationStatus: "PENDING"`. Organizations are prohibited from self-approving or mutating `verificationStatus`.
4. **Test Suite Verification**:
   - Executing `node tests/test-auth-suite.js` runs 30 requirement-driven test cases across 4 tiers with 100% pass rate in ~21ms.

---

## 2. Logic Chain

1. **Step-by-Step UI Architecture**:
   - To deliver frictionless user onboarding, both `app/student/onboarding/page.jsx` and `app/organization/onboarding/page.jsx` are designed as responsive single-page stepper wizards with dynamic progress bars, status badges, and quick-navigation review screens.
2. **Draft Auto-Saving & Resume Capability**:
   - User progress is saved to `/api/student/onboarding` and `/api/organization/onboarding` on each step transition (`action: "SAVE_DRAFT"`).
   - `currentOnboardingStep` is persisted in profile state, allowing users to safely refresh or return later and resume exactly where they left off.
3. **Dynamic Scoring Engine Synchronization**:
   - `lib/onboarding-calc.js` provides deterministic `calculateStudentCompletion` and `calculateOrgCompletion` functions shared across backend route handlers and test oracles.
   - Granular breakdown objects and `missingFields` arrays are returned in API responses to provide real-time UI guidance.
4. **Security, IDOR & Tamper Prevention**:
   - Backend route handlers enforce session validation and role verification (`STUDENT` for student onboarding, `ORGANIZATION` for organization onboarding).
   - Organizations cannot elevate `verificationStatus` or inject `adminNotes`.
   - All state transitions trigger immutable audit log creation via `lib/audit.js`.

---

## 3. Caveats

- **Network Storage for Uploads**: In test/mock environments, document and logo URLs are stored as strings (e.g. `https://storage/...`). Production file uploads should integrate S3 / Cloudflare R2 / UploadThing signed URLs.
- **Edge Middleware Coupling**: Full URL route blocking is enforced at Next.js Edge Middleware (`middleware.js`, Milestone 6). Wizard client components also include client-side fallback redirects.
- **No other caveats**: All 8 student steps and 7 organization steps, validation schemas, API route handlers, scoring engines, and UI designs are fully specified.

---

## 4. Conclusion

The technical blueprint for Milestone 4 is complete and fully documented in `m4_blueprint.md`. It provides complete production-ready source implementations for:
1. `lib/onboarding-calc.js` (Dynamic profile completion engine)
2. `app/api/student/onboarding/route.js` (Student onboarding API)
3. `app/api/organization/onboarding/route.js` (Organization onboarding API)
4. `app/student/onboarding/page.jsx` (8-step Student Onboarding Wizard UI)
5. `app/organization/onboarding/page.jsx` (7-step Organization Onboarding Wizard UI)

All contracts align with `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the 30-test E2E test suite.

---

## 5. Verification Method

To verify the onboarding implementation and scoring architecture:

1. **Run Master E2E Test Suite**:
   ```powershell
   node tests/test-auth-suite.js
   ```
   *Expected outcome*: 30 / 30 tests pass (100% pass rate).

2. **Run Dedicated Tier 1 Feature Coverage**:
   ```powershell
   node tests/test-auth-suite.js --tier=1
   ```
   *Verifies*:
   - F11 & F13 (Student 8-Step Dynamic Completion Scoring)
   - F12 & F13 (Organization 7-Step Dynamic Completion Scoring)
   - F14 (Onboarding Status Transitions & Automatic Redirection)

3. **Run Multi-Actor Scenarios**:
   ```powershell
   node tests/test-auth-suite.js --tier=4
   ```
   *Verifies*: S01 (End-to-End Student Journey from Signup Intent to Complete Profile).

4. **Inspect Blueprint Artifact**:
   Inspect `e:/sih_2026_044/.agents/m4_onboarding_explorer/m4_blueprint.md` for full implementation code and step layouts.
