# Original User Request

## Initial Request — 2026-08-29T05:38:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description; user selected full team]

Fix Multi-Role Authentication, Role Persistence & Profile Data Saving in the existing SIH 2026 Skill Mapping Platform built with Next.js, Better Auth, Drizzle ORM, and Neon PostgreSQL.

Working directory: e:\sih_2026_044
Integrity mode: development

## Verification Resources
The project has existing automated test suites. The team must locate and run these tests to verify that the fixes do not break existing functionality and satisfy the acceptance criteria.

## Requirements

### R1. Audit and Fix Database User/Role Model
Audit the current Better Auth and Drizzle configuration. The application must have one authoritative user identity. The `role` (student, institute, industry) must be stored in the database (User table), not just in localStorage or React state. Do NOT create duplicate users with the same email for different roles.

### R2. Handle Authenticated Sessions and Role-Based Redirects Correctly
Fix the bug where an existing student session causes "Already logged in as student" when attempting to use Industry/Institute login flows. Route protection and redirects must use the current authenticated user's database role. Clear stale client-side session/role caching upon logout. 

### R3. Profile Data Ownership and Saving
When saving any profile (Student, Institute, Industry), the server must use `session.user.id` as the authoritative source of ownership, not a client-provided ID. Fix Industry and Institute profile saving (using UPSERT logic where appropriate). Do not break existing Student profile functionality.

### R4. Profile Persistence and Database Migrations
Profile data must correctly load after page refresh or logout/login. If schema changes are required, generate Drizzle migrations appropriately without losing existing production data. Add server-side validation for profile fields and return meaningful errors.

## Acceptance Criteria

### Authentication & Redirection
- [ ] Direct URL access (e.g. Student accessing `/industry/dashboard`) is rejected by server-side/middleware protection.
- [ ] After login, users are reliably redirected to the correct dashboard based on their database role.
- [ ] No stale student sessions persist after logging out and logging in as a different role.

### Profile Persistence
- [ ] Student, Institute, and Industry users can edit their profiles, save, and the data persists in Neon PostgreSQL.
- [ ] Refreshing the browser or logging out and back in retains the profile data for all roles.
- [ ] Saving a profile as one role does not accidentally link or overwrite data for a different user.

### Testing Scenarios
- [ ] Test A (Student), Test B (Institute), Test C (Industry) complete successfully (Login -> Edit -> Save -> Refresh -> Data remains -> Logout -> Login -> Data remains).
- [ ] Test D (Switching accounts) correctly loads the respective dashboards without mixing state.
