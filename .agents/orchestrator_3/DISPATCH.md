## 2026-08-24T17:46:36Z
Build the complete Skill Bridge platform with:
1. Authentication (Better Auth + Google OAuth) with pre-OAuth role selection (STUDENT, INDUSTRY, INSTITUTE)
2. Three immutable user roles (STUDENT, INDUSTRY, INSTITUTE)
3. 1:1 role profiles, dynamic profile completion scoring (`lib/onboarding-calc.js`), and gated onboarding wizards
4. Role-aware navbars & authenticated dashboards (`/student/dashboard`, `/industry/dashboard`, `/institute/dashboard`, `app/home/page.jsx`) with realistic data
5. Opportunities management, application tracking & canonical skill framework
6. Server-side authorization & Next.js route security middleware
7. Preserving the existing public landing page visual identity in app/page.jsx
8. Comprehensive test suites passing (E2E & auth tests) and clean build verification (`npm run build`).
