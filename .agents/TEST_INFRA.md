# E2E Test Infra: SIH 2026 Skill Mapping Platform

## Test Philosophy
- Opaque-box, requirement-driven testing covering multi-role auth, role persistence, and profile persistence.
- Direct database validation on Neon PostgreSQL ensuring zero data loss across page refreshes and session restarts.
- Strict isolation and zero cross-account or cross-role state leakage.

## Feature Inventory & Test Coverage Matrix
| # | Feature | Requirement | Tier 1 (Smoke) | Tier 2 (Boundary/Error) | Tier 3 (Cross-Role) | Tier 4 (E2E Scenario) |
|---|---------|-------------|:--------------:|:-----------------------:|:-------------------:|:---------------------:|
| 1 | Student Profile Persistence | R3, R4 | 5 | 5 | ✓ | Scenario A |
| 2 | Institute Profile Persistence | R3, R4 | 5 | 5 | ✓ | Scenario B |
| 3 | Industry Profile Persistence | R3, R4 | 5 | 5 | ✓ | Scenario C |
| 4 | Multi-Role Session Switching | R2 | 5 | 5 | ✓ | Scenario D |
| 5 | Route & Middleware Protection | R2, Accept | 5 | 5 | ✓ | Scenario D |
| 6 | Profile Ownership / IDOR | R3 | 5 | 5 | ✓ | Scenario A-C |
| 7 | Stale Logout Cookie Cleanup | R2 | 5 | 5 | ✓ | Scenario D |

## Test Architecture
- Test Suite Runner: Node.js test script `tests/test-profile-persistence-e2e.js` using native HTTP assertions and direct Neon PostgreSQL verification.
- Pass/Fail Semantics: 100% assertions must pass with exit code 0.
- Master Test Suite: `npm test` (119 tests), `npm run test:tier5` (45 tests), `npm run test:matching` (13 tests), `npm run test:verification` (8 tests), `tests/test-profile-persistence-e2e.js` (Scenarios A-D).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| 1 | Test A: Student Lifecycle | Login -> Edit Profile (CGPA, Degree, Skills, Bio) -> Save -> Refresh -> Data Retained -> Logout -> Login -> Data Retained | 100% Data Preserved in Postgres |
| 2 | Test B: Institute Lifecycle | Login -> Edit Profile (AISHE, Accreditation, Departments) -> Save -> Refresh -> Data Retained -> Logout -> Login -> Data Retained | 100% Data Preserved in Postgres |
| 3 | Test C: Industry Lifecycle | Login -> Edit Profile (CIN, GSTIN, Company Type) -> Save -> Refresh -> Data Retained -> Logout -> Login -> Data Retained | 100% Data Preserved in Postgres |
| 4 | Test D: Account & Role Switching | Student Login -> Logout (verify clean cookie wipe) -> Industry Login -> Dashboard Access -> Logout -> Institute Login | Zero role collision, correct dashboards loaded |
