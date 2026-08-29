## 2026-08-25T14:12:05Z

<USER_REQUEST>
You are an Explorer subagent conducting the initial survey of the codebase for the Skill Bridge platform.
Your working directory is: e:\sih_2026_044\.agents\explorer_survey_backend
The original user request is at: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md (READ THIS FIRST!)
Project root: e:\sih_2026_044

Your focus: BACKEND API, SERVICES, LIFECYCLE EVENTS, AND TEST HARNESS SURVEY
Investigate:
1. Examine backend API routes (pp/api/** or pages/api/** or server actions), service modules, and controllers.
2. How Better Auth authentication is checked in API routes / server actions / middleware.
3. How lifecycle events and state transitions are handled (Applications status e.g. REVIEWED, Interview completion, Task/Assessment completion, Internship/Job completion, Course/Event completion).
4. Existing test framework, test runners, commands in package.json (e.g. 
pm test, 
pm run ...), existing unit/integration/E2E tests, mock setups, or test utilities.
5. Identify the exact requirements for getRatingEligibility(), rating submission API, blind review publication logic, anti-fraud rate-limiting, and admin moderation APIs (reports, appeals, audit logs, ecalculateProfileRatings).

Write your detailed findings to e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md and write a standard handoff report to e:\sih_2026_044\.agents\explorer_survey_backend\handoff.md. Then notify the orchestrator with send_message.
</USER_REQUEST>
