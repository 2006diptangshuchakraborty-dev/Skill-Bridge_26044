# Frontend Architecture, Profile Pages, Dashboards & Reputation System Survey

**Date:** 2026-08-25  
**Investigator:** Explorer Subagent (`explorer_survey_frontend`)  
**Target:** Skill Bridge Platform (`sih_2026_044`)  
**Scope:** Frontend UI Framework, Page Routes, Component Architecture, Profile Views, Role Dashboards, Admin Interfaces, and Integration Blueprint for Verified Reputation & Trust System.

---

## 1. Executive Summary

The Skill Bridge frontend is built on **Next.js 14.2.5 (App Router)** with **React 18.3.1**, **Tailwind CSS 3.4.10**, and **Lucide React 0.428.0**. It uses a dark Obsidian/Slate visual design (`bg-slate-950 text-slate-100`) with specialized semantic token palettes for match states (`emerald-500`, `amber-500`, `rose-500`, `indigo-500`) and evidence levels (`Level 1-5`).

Authentication and session state are managed via **Better Auth** (`better-auth/react` client hook `useSession()` in `lib/auth-client.js`). The user domain strictly encompasses three core customer-facing entities—`STUDENT`, `INDUSTRY` (mapped from `ORGANIZATION`), and `INSTITUTE`—plus `ADMIN`.

Currently, the platform has basic evaluation forms (e.g. `app/recruiter/evaluate/page.jsx` upgrading skills to Level 5, `app/institute/feedback/page.jsx` displaying static employer scorecards, and `app/verify/[verificationId]/page.jsx` showing objective 0-100 assessment scorecards). However, a unified, multidimensional **Verified Reputation, Rating, Trust, and Feedback System** that clearly demarcates **Verification Signals**, **Objective Skill Scores (0-100)**, and **Experience Reputation (1.0-5.0 stars)**, with blind reviews, pending ratings countdowns, interactive context-specific category modals, and an Admin Reputation Management view is needed.

---

## 2. Directory Structure & UI Framework Inventory

### 2.1 Technology Stack
- **Framework:** Next.js 14.2.5 (App Router, JavaScript/JSX)
- **UI Styling:** Tailwind CSS 3.4.10 (`tailwind.config.js` with extended colors for `surface`, `match`, `evidence`, and `boxShadow` glows)
- **Icons:** `lucide-react` (0.428.0)
- **Client Auth:** Better Auth React Client (`lib/auth-client.js`)
- **Root Layout:** `app/layout.jsx` with global dark class `<html lang="en" className="dark">`, sticky `Navbar.jsx`, container `<main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">`, and footer.

### 2.2 Route Map & Page Inventory

| Route | Page File | Primary Entity / Purpose | Key UI Components |
|---|---|---|---|
| `/` | `app/page.jsx` | Public Landing Page | Hero, 3 Value Props (Student, Industry, Institute), Sign In/Up CTAs |
| `/home` | `app/home/page.jsx` | Authenticated Central Dashboard | Top Role Switcher (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ADMIN`), KPI Cards, Live Tables |
| `/login`, `/register` | `app/(auth)/login/page.jsx`, `app/(auth)/register/page.jsx` | Auth & Intent Capture | `RoleSelector.jsx` (Role cards: Student, Industry, Institute) |
| `/profile/complete` | `app/profile/complete/page.jsx` | Generic Onboarding Dispatcher | Role detection & redirect |
| **Student Routes** | | | |
| `/student/profile` | `app/student/profile/page.jsx` | Student Profile View | Skill portfolio, `EvidenceBadge.jsx`, Projects, Certifications |
| `/student/onboarding` | `app/student/onboarding/page.jsx` | 8-Step Student Wizard | Multi-step wizard, live completion calculator, draft saving |
| `/student/opportunities` | `app/student/opportunities/page.jsx` | Opportunity Browser | Dual high/low priority filters, eligibility tags |
| `/student/opportunities/[id]` | `app/student/opportunities/[id]/page.jsx` | Opportunity Detail & Apply | `MatchMeter.jsx`, Upskilling cards, Apply action |
| `/student/applications` | `app/student/applications/page.jsx` | Application Tracker | Submitted applications list, `StatusPill.jsx`, match breakdown |
| `/student/skills` | `app/student/skills/page.jsx` | Skill Inventory & Claims | Skill claim modal, Assessment launch CTA |
| `/student/assessments/[attemptId]` | `app/student/assessments/[attemptId]/page.jsx` | Assessment Engine UI | Timed assessment question runner, submission |
| **Industry / Recruiter Routes** | | | |
| `/organization/onboarding`, `/industry/onboarding` | `app/organization/onboarding/page.jsx` | 7-Step Employer Wizard | CIN, GSTIN, Address, Hiring preferences, KYC doc uploads |
| `/recruiter/dashboard` | `app/recruiter/dashboard/page.jsx` | Recruiter Management Console | Active postings, applicant counts, gatekeeper stats |
| `/recruiter/jobs/create` | `app/recruiter/jobs/create/page.jsx` | Opportunity Creator | High/Low priority skill tagging, JD NLP extractor |
| `/recruiter/candidates` | `app/recruiter/candidates/page.jsx` | Candidate Pool & Matching | Filter (eligible/partial/ineligible), match scorecards |
| `/recruiter/compare` | `app/recruiter/compare/page.jsx` | Side-by-side Candidate Matrix | Multi-candidate comparison table |
| `/recruiter/evaluate` | `app/recruiter/evaluate/page.jsx` | Post-Internship Evaluation | Rating (1-5), qualitative feedback, Level 5 skill elevation |
| **Institute Routes** | | | |
| `/institute/dashboard` | `app/institute/dashboard/page.jsx` | Institute Analytics Console | Macro KPIs, skill gap alerts summary, training links |
| `/institute/onboarding` | `app/institute/onboarding/page.jsx` | 5-Step Academic Profile Wizard | AISHE code, campus address, departments, TPO contact |
| `/institute/feedback` | `app/institute/feedback/page.jsx` | Industry Scorecards | Employer evaluation scorecards, verified skills |
| `/institute/skill-gaps` | `app/institute/skill-gaps/page.jsx` | Privacy-Preserving Gap Alerts | k-Anonymity alerts (k >= 5), demand metrics |
| `/institute/training` | `app/institute/training/page.jsx` | Corporate Training Launcher | 1-Click bootcamp creation, student enrollment |
| **Admin Governance Routes** | | | |
| `/admin/dashboard` | `app/admin/dashboard/page.jsx` | Admin Governance & KPIs | Macro platform KPIs, KYC queue preview, recent audit trail |
| `/admin/verifications` | `app/admin/verifications/page.jsx` | KYC Verification Queue | Status filter tabs, CIN/GSTIN checks, doc links, approval modal |
| `/admin/users` | `app/admin/users/page.jsx` | User RBAC & Status | Role filter, status modal (ACTIVE/SUSPENDED/DEACTIVATED) |
| `/admin/audit-logs` | `app/admin/audit-logs/page.jsx` | Forensic Audit Ledger | Action filters, IP tracking, expandible JSON payload |
| `/admin/companies` | `app/admin/companies/page.jsx` | Legacy Redirect | Redirects to `/admin/verifications` |
| **Public Verification** | | | |
| `/verify/[verificationId]` | `app/verify/[verificationId]/page.jsx` | Public Certificate | Dimension scores, overall score /100, cryptographic ID |

---

## 3. Existing UI Component Patterns & Design Language

### 3.1 Design System Tokens
- **Backgrounds:** `bg-slate-950` (root body), `bg-slate-900/90` with `backdrop-blur` (cards), `bg-slate-950/80` (inner widgets).
- **Borders:** `border-slate-800`, `border-slate-700/80`.
- **Accents:**
  - Student: Emerald (`emerald-500`, `emerald-400`, `emerald-950`).
  - Industry: Blue/Teal (`blue-500`, `teal-500`, `blue-950`).
  - Institute: Purple (`purple-500`, `purple-400`, `purple-950`).
  - Admin: Amber (`amber-500`, `amber-400`, `amber-950`).
- **Typography:** Sans `Inter`, Mono `JetBrains Mono` / `Fira Code`.

### 3.2 Key Shared Components (`components/shared/` & `components/auth/`)
1. **`Navbar.jsx`**:
   - Dynamic navbar with role detection (session role > path matching fallback).
   - Role-specific desktop navigation links and mobile drawer.
   - User capsule with avatar, role pill, student completion pill (`78% Complete`), and dropdown menu with profile links and Sign Out.
2. **`EvidenceBadge.jsx`**:
   - Visual pill supporting 5 verification levels:
     - Level 1: Self Declared (`bg-slate-800 text-slate-300`)
     - Level 2: Certificate (`bg-blue-950 text-blue-300`)
     - Level 3: Assessment Verified (`bg-purple-950 text-purple-300`)
     - Level 4: Project Verified (`bg-teal-950 text-teal-300`)
     - Level 5: Industry Verified (`bg-emerald-950 text-emerald-300 border-emerald-500/50`)
3. **`ProfileCompletionCard.jsx`**:
   - Displays 70% threshold progress bar with color staging (Red < 40%, Amber 40-69%, Emerald >= 70%), visual threshold line, required vs optional checklist with jump links, and gating banner.
4. **`ProfileGateModal.jsx`**:
   - Modal popup blocking application submission if profile score < 70%, displaying score deficit and CTA.
5. **`MatchMeter.jsx`**:
   - High-priority vs preferred skill match meter with color-coded breakdown.
6. **`StatusPill.jsx`**:
   - Standardized application and match status pills.
7. **`RoleSelector.jsx`**:
   - 3-card role selection component for `STUDENT`, `INDUSTRY`, `INSTITUTE`.

---

## 4. Analysis of Existing Profile & Dashboard Pages for Reputation Integration

### 4.1 Student Profile (`app/student/profile/page.jsx`)
- **Current Content:** Header banner with name, department, year, CGPA, institute; skill inventory grid with `EvidenceBadge`; projects and certifications list.
- **Deficiencies:** No reputation or review breakdown; no distinction between verification trust signals, objective skill assessment scores (0-100), and experience reputation (1-5 stars); no review cards or category ratings.
- **Integration Target:** Add a dedicated **Reputation & Trust Breakdown Card** right after the header profile card:
  - 3-Pillar Trust Matrix:
    1. **Verification Trust Signals:** Identity Verified ✓, Institute Enrollment Verified ✓, KYC Status.
    2. **Objective Skill Verification:** Overall Assessment Score (e.g. 88/100), coding test performance.
    3. **Experience Reputation:** Composite 1.0-5.0 Star score (e.g. 4.9 ★ based on 6 verified interactions), category ratings (Work Performance, Technical Execution, Communication, Punctuality, Reliability), review count, recommendation rate (e.g. 100%), and published verified review cards with pros/cons.
  - Empty state when no ratings exist: "No verified ratings yet. Ratings unlock after verified internships, application reviews, or projects."

### 4.2 Industry / Organization Profile & View
- **Current Content:** Recruiter dashboard (`app/recruiter/dashboard/page.jsx`) and onboarding (`app/organization/onboarding/page.jsx`).
- **Deficiencies:** No public or peer-facing organization reputation view showing employer ratings from student interns or institutes.
- **Integration Target:** Create a reusable **Organization Reputation Card** / section:
  - **Verification Trust Signals:** Statutory KYC Status (Approved CIN & GSTIN), Corporate Domain Verified.
  - **Objective Platform Signals:** Fast Response Rate (e.g. 96%), Applications Processed, On-time Offer Rate.
  - **Experience Reputation:** Intern/Candidate Rating (e.g. 4.8 ★), category scores (Mentorship & Learning, Work Culture, Professionalism, Clear Communication), verified intern review cards with pros/cons and recommendation score.

### 4.3 Institute Profile & View (`app/institute/dashboard/page.jsx`, `app/institute/feedback/page.jsx`)
- **Current Content:** Feedback page has static cards; dashboard has departmental readiness benchmarks.
- **Deficiencies:** Unconnected to server ratings DB, lacks 3-pillar breakdown.
- **Integration Target:** Enhance `app/institute/feedback/page.jsx` and dashboard with:
  - **Verification Trust Signals:** AISHE Validation ✓, NAAC/NBA Accreditation, Campus Verified.
  - **Objective Skill Verification:** Average student cohort assessment score (e.g. 84/100).
  - **Experience Reputation:** Employer Satisfaction Rating (e.g. 4.9 ★ across industry partners), categories (Curriculum Relevance, Graduate Work-Readiness, Placement Coordination), verified employer testimonials with pros/cons.

### 4.4 Central Authenticated Dashboard (`app/home/page.jsx`)
- **Current Content:** 4 role views (Student, Industry, Institute, Admin), KPI metrics, recommended opportunities, candidate lists, gap alerts.
- **Deficiencies:** Missing "Pending Ratings" widget with deadline timers and rating CTAs.
- **Integration Target:**
  - Add **"Pending Ratings & Actionable Reviews"** widget at the top of the Student, Industry, and Institute dashboard views.
  - Displays: Target entity name & avatar, interaction context (e.g., Application Review, Completed Internship, Assessment, Completed Course), remaining deadline with countdown / warning badge (e.g. "Expires in 3 days"), and "Submit Rating" CTA button opening the **Interactive Rating Modal**.

### 4.5 Admin Console (`app/admin/...`)
- **Current Content:** Dashboard (`app/admin/dashboard/page.jsx`), Verifications (`app/admin/verifications/page.jsx`), Users (`app/admin/users/page.jsx`), Audit Logs (`app/admin/audit-logs/page.jsx`).
- **Deficiencies:** No reputation moderation console to flag, hide, restore, audit reviews, or handle user appeals and reports.
- **Integration Target:**
  - Add **`app/admin/reputation/page.jsx`** (Admin Reputation & Moderation Console).
  - Add navigation link to `Navbar.jsx` (under Admin links) and `app/admin/dashboard/page.jsx`.
  - Provide:
    1. Filterable review table (filter by status: `PUBLISHED`, `PENDING_PUBLICATION`, `FLAGGED`, `HIDDEN`; target type: `STUDENT`, `INDUSTRY`, `INSTITUTE`; rating stars: 1-5; interaction type).
    2. Review moderation actions (Flag, Hide from public, Restore, View audit log).
    3. Reports & Appeals Queue (review flagged reviews, user reports with reasons, approve/reject appeals).
    4. Anti-Fraud Radar (flags suspicious spikes, duplicate reviewer clusters, unverified interactions).
    5. Aggregate Recalculation tool (`recalculateProfileRatings(targetType, targetId)`).

---

## 5. Component Architecture Blueprint for Reputation System

To maintain high code quality and modularity, the following frontend component structure is recommended:

```
components/
├── reputation/
│   ├── ReputationBreakdown.jsx     # Reusable 3-pillar breakdown (Badges, Objective 0-100, Stars 1-5)
│   ├── PendingRatingsWidget.jsx    # Dashboard widget with countdown timers and rating CTAs
│   ├── RatingModal.jsx             # Interactive modal with dynamic categories, pros/cons, recommendation
│   ├── ReviewCard.jsx              # Verified review card with category scores, pros/cons, verified badge
│   ├── RatingHistogram.jsx         # 1-5 star distribution bar chart
│   ├── TrustSignalBadges.jsx       # Identity, Domain, Accreditation, Opportunity verification badges
│   └── BlindReviewNotice.jsx       # Notice for pending publication in blind reviews
├── shared/
│   ├── EvidenceBadge.jsx           # Existing 5-Level badge
│   ├── ProfileCompletionCard.jsx   # Existing completion card
│   ├── Navbar.jsx                  # Extended with Reputation links
│   └── ...
```

### 5.1 Dynamic Context-Specific Rating Categories

| Interaction Context | Target Entity | Category 1 | Category 2 | Category 3 | Category 4 | Category 5 |
|---|---|---|---|---|---|---|
| `APPLICATION_REVIEW` | Student | Application Quality | Skill Relevance | Communication | Professionalism | Overall Impression |
| `INTERVIEW` | Student | Technical Competence | Communication | Problem Solving | Preparedness | Overall Impression |
| `INTERVIEW` | Industry | Interviewer Professionalism | Role Clarity | Punctuality & Respect | Company Culture | Overall Experience |
| `TASK_ASSESSMENT` | Student | Code / Output Quality | Requirement Adherence | Timeliness | Problem Solving | Overall Execution |
| `INTERNSHIP_JOB` | Student | Work Performance | Technical Execution | Teamwork & Initiative | Reliability | Delivery Quality |
| `INTERNSHIP_JOB` | Industry | Mentorship & Learning | Work Environment | Management Support | Stipend & Fairness | Overall Experience |
| `COURSE_SEMINAR` | Institute | Curriculum Quality | Faculty Effectiveness | Practical Relevance | Resource Quality | Overall Satisfaction |

---

## 6. Synthesis of Key Integration Points

1. **`components/reputation/`**:
   - `ReputationBreakdown.jsx` can be imported directly into `app/student/profile/page.jsx`, `app/home/page.jsx`, `app/institute/feedback/page.jsx`, and public profile views.
   - `PendingRatingsWidget.jsx` can be placed in `app/home/page.jsx` (under each role view) and role-specific dashboards.
   - `RatingModal.jsx` can be triggered from `PendingRatingsWidget`, application cards in `app/student/applications/page.jsx`, and candidate cards in `app/recruiter/candidates/page.jsx`.
2. **`app/admin/reputation/page.jsx`**:
   - Implements full moderation UI matching the style and ergonomics of `app/admin/verifications/page.jsx` and `app/admin/users/page.jsx`.
3. **`components/shared/Navbar.jsx`**:
   - Include quick navigation to "Reputation" / "Reviews" where appropriate for each role.
4. **`lib/dummy-data/index.js`**:
   - Extend dataset with realistic rating interactions, ratings, category scores, aggregate stats, pending rating queue, and moderation reports/appeals to power instant preview mode and fallback states.
