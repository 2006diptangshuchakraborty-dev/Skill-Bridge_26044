## 2026-08-26T07:05:44Z
Scope & Mission (Milestone M3):
1. Unified Profile Setup Wizard (`app/profile/setup/page.jsx`):
   - Build dynamic multi-step / progress-tracked profile setup page at `/profile/setup` that dynamically renders the appropriate setup form based on the authenticated user's role:
     - **Student**: Basic info, education (college, degree, CGPA, graduation year), skills (>=3), resume/portfolio URLs, career preferences.
     - **Industry**: Organization details, company size, website, recruiter contact info, hiring preferences.
     - **Institute**: Institute details, code, type, academic departments, placement officer contact info.
   - Multi-step progress bar showing real-time completion percentage (0-100%) consistent with `lib/onboarding-calc.js`.
   - Client-side and server-side validation for all required fields.
   - Atomic submission: Updates role profile table (`student_profile`, `organization_profile`, or `institute`), sets `user.profileCompleted = true` and `user.onboardingStatus = 'COMPLETED'` atomically, and redirects to the canonical role dashboard.
2. Canonical Role Dashboard Pages:
   - Build `app/student/dashboard/page.jsx`: Full-featured obsidian dark student dashboard displaying profile status, quick actions, skill score overview, and opportunity link.
   - Build `app/industry/dashboard/page.jsx`: Full-featured industry dashboard (or alias to recruiter dashboard console) displaying job postings, applicant funnel, and candidate search.
   - Ensure `/institute/dashboard/page.jsx` is fully accessible and consistent.
3. Exclusive Write Ownership:
   - `app/profile/setup/page.jsx`
   - `app/student/dashboard/page.jsx`
   - `app/industry/dashboard/page.jsx`
   - `app/api/profile/setup/route.js` (if creating a unified setup API endpoint)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

4. Test & Verification:
   - Run test suites (`npm test`, `node tests/test-auth-onboarding-e2e.js`) to verify profile setup and dashboards.
   - Deliver `handoff.md` in your working directory and send a completion message with summary.
