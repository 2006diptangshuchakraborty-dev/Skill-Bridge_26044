## 2026-08-25T14:56:37Z
You are the Worker subagent for Milestone 3 (Workflow & Entity Event Lifecycle Integration).
Your working directory is: e:\sih_2026_044\.agents\m3_worker
The original user request is at: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md (READ THIS FIRST!)
The project architecture is at: e:\sih_2026_044\.agents\PROJECT.md
Prior survey analysis: e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md
Project root: e:\sih_2026_044

Files you own exclusively for editing:
- lib/events.js
- pp/api/applications/route.js
- lib/scoring-engine.js
- lib/assessment-engine.js
- lib/lifecycle.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your tasks:
1. Hook rating eligibility and interaction creation into platform lifecycle events:
   - **Application Review**: When application status updates to REVIEWED or SHORTLISTED, create ating_interactions record for APPLICATION_REVIEW (initiator: Industry, target: Student, allowed categories: Application Quality, Skill Relevance, Communication, Professionalism, Overall Impression).
   - **Interview Completion**: When an interview completes (INTERVIEW_COMPLETED), create ating_interactions record for INTERVIEW (2-way eligibility).
   - **Task / Assessment Completion**: When student finishes an assessment and status is EVALUATED, link the objective skill verification score (0-100) and create evaluation interaction.
   - **Internship / Job Completion**: When an internship concludes (INTERNSHIP_COMPLETED), create 2-way blind ating_interactions record (isBlind: true, 14-day deadline) for both Student and Industry.
   - **Course / Seminar / Event Completion**: When a training program or course completes (COURSE_COMPLETED), create ating_interactions record for Institute and Student.
2. Implement helper functions / lifecycle service in lib/lifecycle.js or lib/events.js for clean event triggering.
3. Verify by running:
   - 
ode tests/test-rating-system.js (Verify 46 / 46 PASS)
   - 
pm run test:e2e (Verify 54 / 54 PASS)
   - Write custom verification script for lifecycle event transitions if needed.
4. Write your handoff report to e:\sih_2026_044\.agents\m3_worker\handoff.md and notify the orchestrator.
