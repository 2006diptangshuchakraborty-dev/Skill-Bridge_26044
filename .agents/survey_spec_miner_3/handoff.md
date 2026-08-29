# Handoff Report — Survey Spec Miner 3

**Date:** 2026-08-22  
**Author:** Survey Spec Miner 3  
**Working Directory:** `e:\sih_2026_044\.agents\survey_spec_miner_3/`  
**Target Handoff Artifact:** `e:\sih_2026_044\.agents\survey_spec_miner_3\spec_report.md`  

---

## 1. Observation

Direct observations from source requirements and workspace analysis:

1. **Authoritative Specification Source (`e:\sih_2026_044\ORIGINAL_REQUEST.md`)**:
   - Lines 5: "The platform features a **Priority-Aware Skill Matching Engine** that strictly enforces 100% match on High-Priority (mandatory) skills for eligibility, while supporting partial matching and gap analysis for Low-Priority (preferred) skills across Student, Institute, Industry, and Admin portals."
   - Lines 14–18 (R1): Strict rule that `Student proficiency >= Required proficiency` on all High-Priority skills; if even one is missing or below proficiency, `Eligibility = NOT ELIGIBLE` with status `NOT ELIGIBLE - MANDATORY SKILL GAP` regardless of overall or low-priority match. Preferred skills allow partial match evaluated after High-Priority eligibility. Explainable structured JSON required. Skill normalization layer required (e.g. `ReactJS` -> `React`).
   - Lines 20–24 (R2): Role-Based Dashboards for 4 distinct actors:
     - **Student**: Profile, evidence levels 1–5, `/student/opportunities`, `/student/opportunities/[id]` match breakdown, apply submission, skill gap views, upskilling.
     - **Industry / Recruiter**: Role creation with High vs Low priority classification, AI NLP skill extraction assistant for JDs, candidate listing with eligibility filters, candidate comparison matrix, intern-to-placement evaluation.
     - **Institute / Faculty**: Department analytics, skill distribution, aggregated skill gap alerts (e.g., missing preferred skills among eligible students), training program creation, employer feedback reports.
     - **Admin**: System overview, user management, skill ontology management, company verification, audit logs.
   - Lines 26–29 (R3): Evidence System (Levels 1–5), AI Skill Extraction on JD, Employer Feedback Loop updating student confidence scores and upgrading evidence to Level 5.
   - Lines 31–33 (R4): Automated Notification & Skill-Gap Alert Engine: Student notifications on partial match eligibility with missing preferred skills; Institute aggregated alerts on common low-priority skill gaps (e.g., 91 students missing Machine Learning) without exposing unauthorized PII.
   - Lines 35–37 (R5): Next.js (JavaScript) App, Tailwind CSS, responsive UI (Stripe/Linear aesthetics), seed data (50+ students, 10+ companies, 15+ opportunities, 30+ skills, primary Data Analyst Internship scenario with 4 High and 4 Low skills).
   - Lines 41–57 (Acceptance Criteria): Strictly verified matching rules, UI & workflows across all 4 roles, programmatic verification test suite.

2. **Generated Specification Artifact (`e:\sih_2026_044\.agents\survey_spec_miner_3\spec_report.md`)**:
   - Contains 31 Discovered Features (F01 to F31) covering R1 to R5 in exhaustive detail.
   - Contains 18 Edge Cases and Boundary Behaviors (E01 to E18) with exact specified inputs and observable outputs.
   - Formal mathematical formulation of Priority-Aware Matching Engine, 4-tier discrete proficiency scale (1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert), composite score calculation, and eligibility state machine.
   - Full 30+ canonical skill ontology with alias sets and normalization algorithm.
   - Complete JSON Schema and sample payloads for explainable match results.
   - Automated Notification & Privacy-Preserving Alert Engine algorithms with $k$-anonymity enforcement ($k=5$) and zero-PII leakage guarantees.
   - AI NLP Job Description Skill Extractor heuristics, sectional weights, linguistic cue markers, and JSON contracts.
   - 5-Tier Skill Evidence Hierarchy and Employer Feedback Loop workflow.
   - Complete Data Model Entity-Relationship schemas and seed specification for the primary Data Analyst benchmark scenario.
   - Programmatic Verification Suite and Test Matrix with 20+ unit, edge case, and E2E journey test scenarios (`TC-MATCH-01..10`, `TC-NOTIF-01..02`, `TC-ALERT-01..03`, `TC-NLP-01..04`, `E2E-STU-01..02`, `E2E-REC-01..03`, `E2E-INS-01`, `E2E-ADM-01`).

---

## 2. Logic Chain

1. **From Problem Statement to Core Matching Rule**:
   - Observation: Requirement R1 and Acceptance Criteria stipulate that any missing or sub-proficient High-Priority skill must render candidate `NOT ELIGIBLE - MANDATORY SKILL GAP`, while Low-Priority skills must never cause ineligibility.
   - Logic: The matching engine must decouple High and Low priority calculations into a two-stage evaluation pipeline. Stage 1 computes $R_{high}$ and sets boolean $E_{high} = (R_{high} == 1.0)$. Stage 2 computes $R_{low}$ only to determine whether the status is `FULL MATCH` ($R_{low} == 1.0$) or `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH` ($R_{low} < 1.0$). If $E_{high} == \text{false}$, status is immediately locked to `NOT ELIGIBLE - MANDATORY SKILL GAP`.

2. **From R4 to Privacy-Preserving Aggregation Engine**:
   - Observation: Requirement R4 demands institute alerts for macro skill gaps (e.g. 91 students missing Machine Learning) without exposing unauthorized personal data.
   - Logic: To prevent de-anonymization of individual students when cohort sizes are small, a $k$-anonymity threshold ($k \ge 5$) must be strictly enforced. The aggregation algorithm groups eligible students by `departmentId` and `canonicalSkillId`, counting instances of missing preferred skills. If the count $\ge 5$, an alert is emitted containing only aggregate numbers, department names, and target skill IDs with zero PII fields (no names, IDs, emails, roll numbers).

3. **From R3 to AI NLP JD Extractor**:
   - Observation: Recruiters need an interactive tool to parse unstructured job descriptions into High and Low priority skill sets with proficiency levels.
   - Logic: Natural job postings place mandatory requirements in specific sections (e.g., "Requirements", "Must Have") with modal verbs ("must", "required", "essential"), whereas preferred skills use qualifying language ("nice to have", "plus", "familiarity with"). The extractor pipeline combines n-gram token matching against the canonical skill ontology with contextual linguistic weighting to propose priority classifications and confidence scores, which the recruiter can review and edit in the UI before publishing.

4. **From R5 to Verification Suite**:
   - Observation: Acceptance criteria require a programmatic verification script/endpoint validating all match rules, edge cases, and normalization.
   - Logic: We defined a comprehensive test matrix spanning mathematical rule checks, edge cases (zero skills, proficiency boundaries, alias normalizations), alert triggers, NLP extraction tests, and complete 4-role E2E journeys.

---

## 3. Caveats

1. **LLM vs Rule-Based NLP Runtime**: The specification details both a deterministic rule-based heuristic extractor and an LLM-powered prompt extractor contract. In production Next.js implementation, the rule-based extractor provides instant offline execution while supporting optional external API enrichment.
2. **Next.js JavaScript Constraint**: In accordance with R5, all models and schemas are specified for pure JavaScript (no TypeScript compilation step required), while using standard JSON Schema definitions for formal contract verification.
3. **Seeding Idempotency**: Demo seeding must ensure idempotent execution so repeated development server reloads do not duplicate the 50+ students, 10+ companies, or 15+ opportunities.

---

## 4. Conclusion

The specification mining and feature inventory for the SIH 2026 "Industry Collaboration for Skill Mapping, Internships and Placement" platform is complete, exhaustive, and rigorously documented in `spec_report.md`. All requirements from R1 to R5, along with all edge cases, mathematical formulas, ontology dictionaries, privacy algorithms, NLP heuristics, and test matrices are ready for the architecture and implementation phases.

---

## 5. Verification Method

To independently verify the completeness and integrity of this specification:

1. **Inspect Spec Report**:
   - Read `e:\sih_2026_044\.agents\survey_spec_miner_3\spec_report.md`
   - Verify that all 5 requirements (R1, R2, R3, R4, R5) have corresponding feature entries in the Features Discovered table.
   - Verify that all edge cases (E01 to E18) cover zero skills, sub-proficiencies, alias collisions, and privacy bounds.
2. **Verify JSON Schemas & Ontology**:
   - Validate the Explainable Match Result JSON schema in Section 3.3 against standard JSON Schema draft-07 validators.
   - Inspect the 30+ canonical skill ontology in Section 3.2 for alias completeness.
3. **Verify Alert Engine & Privacy Formulas**:
   - Review Section 4.2 to confirm $k$-anonymity ($k=5$) logic and zero-PII guarantees.
4. **Verify Test Matrix Coverage**:
   - Review Section 9 to ensure test cases `TC-MATCH-01` through `TC-MATCH-10`, `TC-NOTIF-01..02`, `TC-ALERT-01..03`, `TC-NLP-01..04`, and `E2E-*` cover all functional requirements and acceptance criteria.
