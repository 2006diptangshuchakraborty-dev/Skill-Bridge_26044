## 2026-08-29T05:39:25Z
You are a teamwork_preview_spec_miner investigating the codebase for the project described in e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md.

Working directory: e:\sih_2026_044\.agents\survey_profile_api_tests_spec_miner
Workspace directory: e:\sih_2026_044

Objective:
Investigate Profile Data Ownership, Saving & Persistence APIs, and map all existing automated test suites in the codebase.

Tasks:
1. Read e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md for requirements (especially R3: Profile Data Ownership and Saving, R4: Profile Persistence, and all Testing Scenarios).
2. Inspect all profile-related API routes (`app/api/profile/**`, `app/api/student/**`, `app/api/institute/**`, `app/api/industry/**`, etc.) and frontend profile pages/forms (`app/student/profile/**`, `app/institute/**`, `app/industry/**`, etc.).
3. Check how profile ownership is currently enforced: is `session.user.id` used or client-provided ID? Check UPSERT logic for Industry and Institute profiles, and verify Student profile handling.
4. Check validation and error handling on profile saving.
5. Survey all existing test suites in the repository (`tests/**`, `scripts/**`, `package.json` test scripts, jest/vitest/playwright or custom runners) and document how to execute them, what they cover, and what new tests are needed for the acceptance criteria.
6. Provide a detailed specification and gap analysis.

Output:
Write your findings to `e:\sih_2026_044\.agents\survey_profile_api_tests_spec_miner\analysis.md` and `handoff.md`.
Send a completion message when done with a summary of findings.
