# Original User Request

## 2026-08-22T13:47:40Z

Build a production-ready web platform in Next.js (JavaScript) for SIH 2026 based on the problem statement: **"Industry Collaboration for Skill Mapping, Internships and Placement"**. The platform features a **Priority-Aware Skill Matching Engine** that strictly enforces 100% match on High-Priority (mandatory) skills for eligibility, while supporting partial matching and gap analysis for Low-Priority (preferred) skills across Student, Institute, Industry, and Admin portals.

Working directory: `e:\sih_2026_044`  
Integrity mode: development  

---

## Requirements

### R1. Priority-Aware Skill Matching Engine & Core Business Rules
- Mandatory skills (High Priority) require 100% match and required proficiency (`Student proficiency >= Required proficiency`). If even one mandatory skill is missing or below proficiency, `Eligibility = NOT ELIGIBLE` regardless of overall or low-priority match.
- Preferred skills (Low Priority) allow partial matching. Evaluate Low Priority only after High Priority eligibility is confirmed (`FULL MATCH`, `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`, or `NOT ELIGIBLE - MANDATORY SKILL GAP`).
- Every match result must be explainable, returning structured JSON containing exact high/low priority counts, match percentages, matched skills list, missing high-priority skills, and missing low-priority skills.
- Skill normalization layer must map aliases (e.g. `ReactJS`, `React.js` -> `React`; `Postgres` -> `PostgreSQL`) to canonical skills prior to matching.

### R2. Role-Based Dashboards & User Journeys
- **Student**: Profile management, skill evidence & confidence levels (Levels 1–5), opportunity browsing (`/student/opportunities`), match breakdown view (`/student/opportunities/[id]`), application submission, skill gap views, and recommended upskilling.
- **Industry / Recruiter**: Role creation with High vs Low priority skill classification, AI NLP skill extraction assistant for JDs, candidate listing with eligibility filters, candidate comparison matrix, and intern-to-placement evaluation.
- **Institute / Faculty**: Department analytics, skill distribution, aggregated skill gap alerts (e.g., missing preferred skills among eligible students), training program creation, and employer feedback reports.
- **Admin**: System overview, user management, skill ontology management, company verification, and audit logs.

### R3. Evidence System, NLP Assistance & Feedback Loop
- **Skill Evidence Levels**: Level 1 (Self-declared), Level 2 (Certificate), Level 3 (Assessment), Level 4 (Project), Level 5 (Industry Verified).
- **AI Skill Extraction**: Provide an interactive "Extract Skills with AI" tool on job creation that parses job descriptions and suggests High vs Low priority skills for recruiter review.
- **Employer Feedback Loop**: Post-internship evaluation feeds back into student skill confidence scores and updates evidence to Level 5.

### R4. Automated Notification & Skill-Gap Alert Engine
- Notify students when eligible with partial low-priority match, explicitly listing missing preferred skills.
- Notify institutes with aggregated notifications highlighting common low-priority skill gaps (e.g., 91 students missing Machine Learning) without exposing unauthorized personal data.

### R5. Complete Next.js (JavaScript) App & Demo Data Seeding
- Clean Next.js architecture using JavaScript (no TypeScript migration), Tailwind CSS, local/persistent API endpoints or database layer, responsive modern UI inspired by Stripe/Linear.
- Comprehensive demo seed data: 50+ students, 10+ companies, 15+ opportunities, 30+ skills, and the primary demo scenario (Data Analyst Internship with 4 High-Priority and 4 Low-Priority skills).

---

## Acceptance Criteria

### Matching Engine Integrity
- [ ] Candidates with 100% High-Priority match & <100% Low-Priority match are marked `ELIGIBLE` with status `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`.
- [ ] Candidates missing any High-Priority skill are marked `NOT ELIGIBLE` with status `NOT ELIGIBLE - MANDATORY SKILL GAP`, even if Low-Priority match is 100%.
- [ ] Proficiency levels (Beginner=1, Intermediate=2, Advanced=3, Expert=4) are strictly checked (`Student >= Required`).
- [ ] Application button is disabled for ineligible candidates with explicit missing mandatory skills displayed.

### User Interface & Workflows
- [ ] All 4 role dashboards (Student, Institute, Industry, Admin) are fully accessible and interactive.
- [ ] Opportunity details page clearly displays the "Skill Match Analysis" card with visual high/low priority match bars and missing skills list.
- [ ] Recruiter JD skill extraction tool auto-populates High and Low priority skill pools with full editing capability.
- [ ] Institute dashboard features aggregate skill gap cards with a "Create Training Program" action.

### System Verification & Codebase
- [ ] Programmatic test script / endpoint exists and passes verification for all match rules, edge cases, and normalization.
- [ ] Demo seed data initializes automatically on launch with realistic sample records.
