## 2026-08-29T05:44:19Z
You are a teamwork_preview_worker implementing Milestone 1: Database Schema Expansion, Unique Constraints, Signup Intents & Migrations for the project defined in e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md and e:\sih_2026_044\.agents\PROJECT.md.

Working directory: e:\sih_2026_044\.agents\teamwork_preview_worker_m1_1
Workspace directory: e:\sih_2026_044

Scope & Write Ownership for Milestone 1:
- `db/schema/user.js`: Add `signup_intents` table (`id`, `token`, `role`, `email`, `expiresAt`, `used`, `usedAt`, `createdAt`).
- `db/schema/student.js`: Add missing columns (`phone`, `instituteName`, `department`, `degree`, `yearOfStudy`, `graduationYear`, `cgpa`, `githubUrl`, `linkedinUrl`) and add `.unique()` constraint on `userId`.
- `db/schema/industry.js`: Add missing columns (`registrationNumber`, `taxIdGstin`, `companyType`, `primaryContactName`, `primaryContactPhone`, `primaryContactDesignation`, `contactPhone`, `officialEmail`, `logoUrl`, `domainFocus`) and add `.unique()` constraint on `userId`.
- `db/schema/institute.js`: Add missing columns (`contactPhone`, `officialEmail`, `logoUrl`, `accreditationDetails`, `instituteCode`) and add `.unique()` constraint on `userId`.
- `db/schema/index.js`: Ensure clean export of all schema definitions including `signupIntents`.
- `lib/signup-intent.js`: Ensure robust integration with Drizzle `signupIntents` table with fallback to in-memory store.
- `scripts/test-db.js` & migration scripts: Ensure `.env.local` is loaded properly via `dotenv.config({ path: '.env.local' })` and run schema checks.
