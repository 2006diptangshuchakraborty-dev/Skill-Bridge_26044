# Project: Skill-Bridge Database, Drizzle ORM, Better Auth & Neon Integration

## Architecture
- **Database Engine**: Neon Serverless PostgreSQL (`@neondatabase/serverless`).
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Authentication**: Better Auth (`better-auth`) with Drizzle adapter and PostgreSQL schema.
- **Module System**: ESM / CommonJS dual compatibility.
- **Schema Organization**:
  - `db/schema/user.js`: `user`, `session`, `account`, `verification`.
  - `db/schema/student.js`: `students` table linked to `user.id`.
  - `db/schema/industry.js`: `industries` table linked to `user.id`.
  - `db/schema/institute.js`: `institutes` table linked to `user.id`.
  - `db/schema/questions.js`: `questions` table linked to industries/students.
  - `db/schema/ratings.js`: `ratings` table linked to questions/students/industries/institutes.
  - `db/schema/index.js`: Clean schema aggregator re-exporting all canonical schema modules.
  - `db/index.js`: Neon database client and Drizzle instance initialization with full schema.
  - `drizzle.config.js`: Drizzle Kit configuration (dialect: postgresql, schema: ./db/schema/index.js, out: ./drizzle).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Better Auth Core Schema | Define user, session, account, verification tables matching Better Auth Drizzle PG adapter specs with text PKs and timezone timestamps | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 2 | Profile Schemas (Students, Industries, Institutes) | Define students, industries, institutes profile tables with UUID PKs, FK to user.id (onDelete cascade), unique constraints, and indexes | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | Domain Schemas (Questions & Ratings) | Define questions and ratings tables with compatible FK references, cascade rules, and check/type constraints | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | Schema Aggregator & Relations | Clean single-export `db/schema/index.js` exporting all 9 tables with zero alias duplicate collisions | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 5 | DB Driver & Environment Setup | Configure `db/index.js` using `@neondatabase/serverless`, `dotenv/config`, and exported `db` instance | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 6 | Drizzle Kit Config & Migration Generation | Standardize `drizzle.config.js` with single entry point `./db/schema/index.js`; `npx drizzle-kit generate` passes with exit code 0 | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 7 | Live Neon DB State & Migrations | Pushed and verified all 9 tables in live Neon DB (`user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`) | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 8 | CRUD & Relations Verification | Verify create, read, update, delete, and relational queries across all entities directly on live Neon DB | M4 | ORIGINAL_REQUEST §R3 | DONE |
| 9 | Better Auth Persistence Verification | Verify Better Auth database adapter operations (user creation, session, account linking, verification tokens) | M4 | ORIGINAL_REQUEST §R3 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Schema & Relations Repair | Standardize `user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`, and single-export `db/schema/index.js` with zero alias exports | None | DONE |
| M2 | DB Driver & Config Standardization | Configure `db/index.js`, `drizzle.config.js`, ESM exports, and environment variable loading | M1 | DONE |
| M3 | Migration Generation & Database Sync | Run `drizzle-kit` push / direct Neon DDL sync to ensure all 9 tables exist in Neon DB | M2 | DONE |
| M4 | E2E Testing & Verification Hardening | Execute 100% pass on comprehensive audit suite (18/18 checks), `scripts/test-db.js`, and auth test suite on live Neon DB | M3 | DONE |
