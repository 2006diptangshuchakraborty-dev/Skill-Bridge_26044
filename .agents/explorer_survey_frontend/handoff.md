# Frontend Survey & Reputation UI Integration Handoff Report

**Agent:** Explorer Subagent (`explorer_survey_frontend`)  
**Date:** 2026-08-25  
**Handoff Type:** Hard (Survey Task Complete)  
**Parent Task ID / Conversation ID:** `3ef501ba-0cd5-48b9-8848-b0e8a2b33c32`

---

## 1. Observation

1. **Framework & Dependencies (`package.json:25-47`)**:
   - Next.js: `14.2.5` (App Router)
   - React: `^18.3.1` / `react-dom: ^18.3.1`
   - Styling: Tailwind CSS `^3.4.10`, `postcss: ^8.4.41`, `autoprefixer: ^10.4.20`, `clsx: ^2.1.1`, `tailwind-merge: ^2.5.2`
   - Icons: `lucide-react: ^0.428.0`
   - Auth: `better-auth: ^1.7.1`
   - ORM: `drizzle-orm: ^1.0.0-rc.4`
2. **Design Tokens & Theme (`tailwind.config.js:9-64`, `app/globals.css:1-16`)**:
   - Dark theme root (`--background: #090d16; --foreground: #f8fafc;`)
   - Custom palette extensions: `surface` (50–950), `match` (full: `#10b981`, partial: `#f59e0b`, ineligible: `#ef4444`, high: `#6366f1`, low: `#8b5cf6`), `evidence` (levels 1–5: `#94a3b8`, `#38bdf8`, `#818cf8`, `#a855f7`, `#eab308`), glow shadows (`glow-emerald`, `glow-amber`, `glow-rose`, `glow-indigo`).
3. **Existing Navigation (`components/shared/Navbar.jsx:84-121`)**:
   - `getAuthNavLinks()` partitions navigation links by role:
     - `INDUSTRY`: Home (`/home`), Post Opportunity (`/recruiter/jobs/create`), My Opportunities (`/recruiter/dashboard`), Applications (`/recruiter/candidates`), Candidates (`/recruiter/candidates`), Profile (`/organization/onboarding`).
     - `INSTITUTE`: Home (`/home`), Students (`/institute/dashboard`), Skill Insights (`/institute/skill-gaps`), Industry Connections (`/institute/feedback`), Opportunities (`/institute/training`), Profile (`/institute/onboarding`).
     - `ADMIN`: Home (`/home`), Users & Roles (`/admin/users`), KYC Queue (`/admin/verifications`), Audit Logs (`/admin/audit-logs`).
     - `STUDENT`: Home (`/home`), Opportunities (`/student/opportunities`), My Applications (`/student/applications`), Profile (`/student/profile`).
4. **Existing Profile & Evaluation UIs**:
   - Student Profile (`app/student/profile/page.jsx:47-160`): Displays name, department, year, CGPA, institute, skill inventory with `EvidenceBadge`, projects, certifications, but **no** reputation/rating scorecards or breakdown.
   - Recruiter Evaluation (`app/recruiter/evaluate/page.jsx:10-150`): Has single dropdown `technicalRating` (1 to 5) and `feedback` textarea that mutates `evidenceLevel` to 5 for a selected skill.
   - Institute Feedback (`app/institute/feedback/page.jsx:8-71`): Static display of employer feedback scorecards ("5 / 5 — Exceptional") with verified date.
   - Public Verification (`app/verify/[verificationId]/page.jsx:100-140`): Shows `data.overallScore` / 100 with dimension breakdown bars and verification confidence.
5. **Existing Admin UIs (`app/admin/dashboard/page.jsx`, `app/admin/verifications/page.jsx`, `app/admin/users/page.jsx`, `app/admin/audit-logs/page.jsx`)**:
   - Admin features status tabs, search inputs, modal dialogs for approvals/rejections with administrative notes, and JSON metadata explorers. No dedicated `/admin/reputation` view currently exists.

---

## 2. Logic Chain

1. **Observation 1 & 2** establish that the project uses Next.js 14 App Router with Tailwind CSS and Lucide React icons. Any new reputation components should be modular Client Components (`"use client"`) using Tailwind classes matching the existing slate/emerald/blue/purple/amber palettes.
2. **Observation 3 & 4** show that profile pages across Student, Industry, and Institute currently lack a unified 3-pillar trust matrix (Verification Signals, Objective Skill Scores 0-100, and Experience Reputation 1.0-5.0 stars).
3. **Observation 4** reveals that rating actions are currently fragmented into ad-hoc evaluation forms (such as `app/recruiter/evaluate/page.jsx`), lacking structured category metrics (e.g. Work Performance, Communication, Reliability), blind review hold logic, and pros/cons input.
4. **Observation 4 & 5** demonstrate that dashboards (`app/home/page.jsx`, `app/student/applications/page.jsx`, `app/recruiter/candidates/page.jsx`) lack a "Pending Ratings" widget with countdown timers.
5. **Observation 5** establishes that the admin suite has established UX patterns in `/admin/verifications`, `/admin/users`, and `/admin/audit-logs`, providing a direct template for creating `/admin/reputation` with review filtering, flagging, hiding/restoring, report/appeal moderation, anti-fraud flags, and audit log tracking.

---

## 3. Caveats

- **Network / Live Database vs Dummy Fallbacks:** The platform supports both live Neon PostgreSQL via Drizzle ORM and local JSON DB fallbacks (`data/db.json` / `lib/dummy-data/`). Frontend components must gracefully handle both live API endpoints and fallback dummy data when session or network constraints apply.
- **Role Terminology:** Must strictly use `STUDENT`, `INDUSTRY` (mapped from `ORGANIZATION` in DB), `INSTITUTE`, and `ADMIN`. No customer-facing strings should use generic "Company".

---

## 4. Conclusion

The frontend codebase is well-structured and ready for the implementation of the Reputation & Trust System. The integration requires:
1. A modular component library under `components/reputation/` (`ReputationBreakdown.jsx`, `PendingRatingsWidget.jsx`, `RatingModal.jsx`, `ReviewCard.jsx`, `RatingHistogram.jsx`, `TrustSignalBadges.jsx`).
2. Integrating `ReputationBreakdown.jsx` into `app/student/profile/page.jsx`, `app/institute/feedback/page.jsx`, and organization profile views.
3. Integrating `PendingRatingsWidget.jsx` into `app/home/page.jsx` across all role views.
4. Creating a dedicated Admin Reputation Management view at `app/admin/reputation/page.jsx` and adding its navigation link to `Navbar.jsx` and `app/admin/dashboard/page.jsx`.
5. Updating `lib/dummy-data/index.js` with rich realistic ratings and reputation interactions data.

---

## 5. Verification Method

To verify these findings and check the current build health:
1. **Inspect Survey Reports:**
   - Detailed analysis: `e:\sih_2026_044\.agents\explorer_survey_frontend\analysis.md`
   - Handoff report: `e:\sih_2026_044\.agents\explorer_survey_frontend\handoff.md`
2. **Build and Test Verification Command:**
   ```powershell
   npm run build
   ```
   (Ensures all JSX imports, Tailwind classes, and page routes compile cleanly without syntax errors).
3. **Invalidation Conditions:**
   - Any modification to Next.js route structures or role schema names (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN`) would require updating navigation links in `components/shared/Navbar.jsx`.
