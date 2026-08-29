## 2026-08-26T16:16:52Z
You are the Implementation Worker for the Database, Schema, Drizzle ORM, and Driver repairs.
Working directory: e:\sih_2026_044\.agents\worker_db_impl
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Project Specification: e:\sih_2026_044\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write ownership of:
- `db/schema/user.js`
- `db/schema/student.js`
- `db/schema/industry.js`
- `db/schema/institute.js`
- `db/schema/questions.js`
- `db/schema/ratings.js`
- `db/schema/index.js`
- `db/index.js`
- `drizzle.config.js`
- `package.json`
- `drizzle/` directory migrations

Your Tasks:
1. Schema & Relationships Repair:
   - Standardize `db/schema/user.js`: Better Auth tables (`user`, `session`, `account`, `verification`). Primary key `text("id").primaryKey()`, correct column types for Better Auth Drizzle PG adapter (createdAt/updatedAt timezone timestamps, token, expiresAt, ipAddress, userAgent, etc.).
   - Standardize `db/schema/student.js`, `industry.js`, `institute.js`: UUID primary keys `uuid("id").defaultRandom().primaryKey()`, foreign key `userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })`, necessary profile fields, unique constraints, and indexes.
   - Standardize `db/schema/questions.js` and `db/schema/ratings.js`: UUID primary keys, correct foreign key types referencing student/industry/institute/question with cascade deletion where appropriate.
   - Standardize `db/schema/index.js`: Cleanly re-export all tables, relations, and enums with no circular dependencies or conflicting imports.
   - Establish complete bi-directional `relations(...)` definitions across all models (user to profiles, profiles to user, questions to industry/student, ratings to questions/user/profiles).
2. Database Driver & Environment Configuration:
   - Ensure `db/index.js` uses `@neondatabase/serverless` with `neon(process.env.DATABASE_URL)` (or Pool where needed), imports `dotenv/config`, and exports `db = drizzle(sql, { schema })`.
   - Update `drizzle.config.js` to ESM format (`import { defineConfig } from "drizzle-kit"; import "dotenv/config"; export default defineConfig({ dialect: "postgresql", schema: "./db/schema/index.js", out: "./drizzle", dbCredentials: { url: process.env.DATABASE_URL } });`).
   - Ensure `package.json` scripts include convenient commands if helpful (e.g., `db:push`, `db:generate`).
3. Migration & Database State Execution:
   - Execute `npx drizzle-kit push` (or `npx drizzle-kit generate` and push) to safely apply and sync all 9 tables in the live Neon PostgreSQL database.
   - Ensure zero errors during push/generate.
4. Validation:
   - Run a test script to confirm Neon DB connection succeeds, tables exist, and Drizzle query builder works.
   - Document all changes and verification outputs in `e:\sih_2026_044\.agents\worker_db_impl\handoff.md`.
   - Send a message to parent when completed.
