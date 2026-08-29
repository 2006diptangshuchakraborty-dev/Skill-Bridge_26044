# Project: SIH 2026 Skill Mapping Platform — Multi-Role Auth, Role Persistence & Profile Persistence

## Architecture
The Skill Bridge platform is built on Next.js (App Router), Better Auth, Drizzle ORM, and Neon PostgreSQL.

1. **Identity & Authentication Engine**:
   - **Better Auth Core (`lib/auth.js`, `lib/auth-client.js`)**: Single authoritative user identity per Google account. Enforces database-stored roles (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`) with client mutation protection (`input: false`, `user.update.before` field stripping).
   - **Signup Intent & Role Resolution (`lib/signup-intent.js`, `lib/role-collision.js`)**: Server-side role assignment before OAuth redirect. Safe collision handling with intent cookie cleanup.
   - **Cookie Synchronization & Session Management**: Companion cookies (`sb_user_role`, `sb_user_status`, `sb_profile_completed`, `sb_session_token`) synchronized across OAuth callbacks and auth APIs. Clean `fullLogout()` session invalidation across client and server.

2. **Database & Persistence Layer (Neon PostgreSQL + Drizzle ORM)**:
   - **PostgreSQL Tables (`db/schema/**`, `db/index.js`)**:
     - `user`, `session`, `account`, `verification`, `signup_intents` (`db/schema/user.js`)
     - `students` (`db/schema/student.js`): Comprehensive academic, personal, skills, and contact fields. Unique constraint on `user_id`.
     - `industries` (`db/schema/industry.js`): Statutory (CIN, GSTIN), contact, verification, and hiring preferences. Unique constraint on `user_id`.
     - `institutes` (`db/schema/institute.js`): AISHE code, accreditation, placement contact, and department fields. Unique constraint on `user_id`.
     - `questions`, `ratings`, `mcq_questions`.
   - **Atomic UPSERT Mechanism**: Drizzle ORM `.onConflictDoUpdate()` on `user_id` preventing duplicate profile rows and race conditions.

3. **Routing & Server-Side Security Guard**:
   - **Edge Middleware (`middleware.js`)**: Multi-role route matching (`/student/*`, `/industry/*`, `/institute/*`, `/admin/*`), authenticated role verification, onboarding completion checks, and role-switching bypass support.
   - **Dashboard Component Defense-in-Depth**: Role validation and unauthenticated redirection on client page components (`app/industry/dashboard`, `app/institute/dashboard`, `app/student/dashboard`).

4. **Profile API Engine (`app/api/profile/setup/route.js`)**:
   - Strict `session.user.id` ownership enforcement (rejecting client-provided IDs).
   - Server-side schema mapping and data sanitization for all student, industry, and institute fields.
   - Automatic synchronization of `user.profile_completed = true` and `user.onboarding_status = 'COMPLETED'` in the PostgreSQL `user` table upon completion.
   - Server-side validation with informative error responses.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Drizzle Schema Expansion & Unique Constraints | Add missing academic/statutory columns to `students`, `industries`, `institutes` and unique constraint on `user_id` | M1 | Survey / R1, R4 |
| 2 | `signup_intents` PostgreSQL Schema | Add `signup_intents` table in `db/schema/user.js` and export in `db/schema/index.js` | M1 | Survey / R1 |
| 3 | Postgres Signup Intent Engine | Update `lib/signup-intent.js` to persist and verify tokens in Neon DB via Drizzle | M1 | Survey / R1 |
| 4 | Safe Drizzle Migrations | Generate and run migration SQL on Neon PostgreSQL preserving existing production data | M1 | Survey / R4 |
| 5 | Environment & DB Smoke Verification | Standardize `.env.local` loading in DB test scripts and verify live connection | M1 | Survey / R4 |
| 6 | Companion Cookie Synchronization | Synchronize `sb_user_role`, `sb_profile_completed`, `sb_user_status` upon Better Auth session creation and `/profile/complete` | M2 | Survey / R2 |
| 7 | Edge Middleware Role & Route Fixes | Resolve roles accurately without defaulting to 'STUDENT'; allow role-switching on `/auth` | M2 | Survey / R2 |
| 8 | Intent Cookie Cleanup & Collision Fix | Consume and clear `sb_signup_intent` cookie on completion; fix "Already logged in as student" trap | M2 | Survey / R2 |
| 9 | Comprehensive Full Logout | Implement centralized `fullLogout()` clearing all `sb_*` and `better-auth.*` cookies in `Navbar.jsx` | M2 | Survey / R2 |
| 10 | Dashboard Component Role Defense | Add client/server role guards to Industry, Institute, and Student dashboard pages | M2 | Survey / Acceptance |
| 11 | Authoritative Profile Ownership | Enforce `session.user.id` ownership and strip client-provided IDs in `/api/profile/setup` | M3 | Survey / R3 |
| 12 | Atomic Profile UPSERT Logic | Implement atomic UPSERT targeting `user_id` across `students`, `industries`, `institutes` tables | M3 | Survey / R3 |
| 13 | Full Profile Field Persistence | Map and persist all newly added academic, statutory, and contact fields into PostgreSQL | M3 | Survey / R4 |
| 14 | User Onboarding State Synchronization | Update `user.profile_completed = true` and `user.onboarding_status = 'COMPLETED'` in `user` table on completion | M3 | Survey / R2, R4 |
| 15 | Server-Side Profile Field Validation | Validate required profile fields and return meaningful 400 Bad Request responses | M3 | Survey / R4 |
| 16 | E2E Automated Test Suite (Scenarios A–D) | Create `tests/test-profile-persistence-e2e.js` testing Student, Institute, Industry persistence & role switching | M4 / E2E Track | Survey / Acceptance |
| 17 | Master Auth & Adversarial Hardening Pass | Verify 100% pass across all existing test suites (119 auth, 45 tier5, 13 matching, 8 verification) | M4 | Survey / Acceptance |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema Expansion, Unique Constraints & Migrations | Features 1, 2, 3, 4, 5: `db/schema/**`, `lib/signup-intent.js`, Drizzle migrations, Neon DB sync | none | DONE |
| M2 | Multi-Role Auth, Session Management, Redirects & Logout Invalidation | Features 6, 7, 8, 9, 10: `middleware.js`, `app/profile/complete/page.jsx`, `components/shared/Navbar.jsx`, dashboard pages | M1 | DONE |
| M3 | Profile Data Ownership, Atomic UPSERTs & User State Sync | Features 11, 12, 13, 14, 15: `app/api/profile/setup/route.js`, field persistence, validation | M1 | PLANNED |
| M4 | E2E Test Suite Creation, Master Suite Pass & Adversarial Hardening | Features 16, 17: `tests/test-profile-persistence-e2e.js`, full verification of Acceptance Criteria & Scenarios A-D | M1, M2, M3 | PLANNED |

---

## Interface Contracts

### 1. Unified Profile Setup Contract (`POST /api/profile/setup`)
```typescript
interface ProfileSetupRequest {
  action?: 'SAVE_DRAFT' | 'UPDATE_SECTION' | 'COMPLETE_ONBOARDING';
  section?: string;
  // Student fields
  fullName?: string;
  phone?: string;
  headline?: string;
  bio?: string;
  instituteName?: string;
  department?: string;
  degree?: string;
  yearOfStudy?: string | number;
  graduationYear?: string | number;
  cgpa?: string | number;
  skills?: string[];
  projects?: Array<{ title: string; description: string; link?: string }>;
  certifications?: Array<{ name: string; issuer: string; year?: string }>;
  githubUrl?: string;
  linkedinUrl?: string;
  
  // Industry fields
  companyName?: string;
  registrationNumber?: string; // CIN
  taxIdGstin?: string; // GSTIN
  companyType?: string;
  companySize?: string;
  website?: string;
  description?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactDesignation?: string;
  officialEmail?: string;
  logoUrl?: string;
  
  // Institute fields
  instituteName?: string;
  instituteCode?: string;
  instituteType?: string;
  aisheCode?: string;
  website?: string;
  officialEmail?: string;
  contactPhone?: string;
  accreditationDetails?: Record<string, any>;
}

interface ProfileSetupResponse {
  success: boolean;
  role: 'STUDENT' | 'INDUSTRY' | 'INSTITUTE';
  profileCompleted: boolean;
  onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  profile: Record<string, any>;
  message: string;
}
```

### 2. Sign-Out & Cookie Invalidation Contract (`fullLogout`)
```typescript
function fullLogout(): Promise<void>
// Actions:
// 1. Invokes authClient.signOut()
// 2. Expire all cookies: 'sb_signup_intent', 'sb_user_role', 'sb_user_status', 'sb_profile_completed', 'sb_session_token', 'better-auth.session_token'
// 3. Clear localStorage role/profile cache
// 4. Redirects to '/' and hard refreshes
```

---

## Code Layout & Write Ownership
| Module / Area | File Paths | Responsible Milestone / Worker |
|---|---|---|
| Database Schema & Drizzle Models | `db/schema/user.js`, `db/schema/student.js`, `db/schema/industry.js`, `db/schema/institute.js`, `db/schema/index.js`, `lib/signup-intent.js` | Milestone 1 (Worker M1) [DONE] |
| Migrations & DB Scripts | `drizzle/**`, `scripts/test-db.js`, `scripts/migrate-neon-direct.js` | Milestone 1 (Worker M1) [DONE] |
| Auth, Sessions, Redirects & Middleware | `middleware.js`, `app/profile/complete/page.jsx`, `components/shared/Navbar.jsx`, `lib/role-collision.js`, `app/industry/dashboard/page.jsx`, `app/institute/dashboard/page.jsx` | Milestone 2 (Worker M2) [DONE] |
| Profile API & User Sync | `app/api/profile/setup/route.js`, `lib/auth.js` | Milestone 3 (Worker M3) |
| E2E Test Suite & Test Infra | `tests/test-profile-persistence-e2e.js`, `tests/test-auth-onboarding-e2e.js`, `tests/test-tier5-adversarial-auth.js` | Milestone 4 (E2E Test Writer / Worker M4) |
