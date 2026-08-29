# DB Driver, Configuration & Environment Survey Report

- **Explorer**: DB Driver & Config Explorer (`explorer_survey_db_config`)
- **Working Directory**: `e:\sih_2026_044\.agents\explorer_survey_db_config`
- **Timestamp**: 2026-08-26T16:23:00Z
- **Target Repository**: `e:\sih_2026_044`

---

## 1. Executive Summary

A comprehensive read-only audit was conducted on the database driver, configuration, environment setup, module system (ESM vs CommonJS), Drizzle ORM schemas, and live Neon PostgreSQL database instance.

### Core Findings
1. **Drizzle CLI & Migration Engine is Completely Broken**:
   - Running `npx drizzle-kit generate` or `npx drizzle-kit push` fails immediately with `Error: Cannot find module '../schema.js'`.
   - Five schema files (`db/schema/user.js`, `db/schema/student.js`, `db/schema/industry.js`, `db/schema/institute.js`, `db/schema/ratings.js`) attempt to `require("../schema.js")`, but `db/schema.js` was deleted from disk. Only `db/schema/questions.js` contains actual `pgTable` definitions.
2. **`db/index.js` Runtime Connection Layer is Defective**:
   - `db/index.js` initializes Drizzle with `export const db = drizzle(sql);` **without** passing `{ schema }`. Consequently, Drizzle relational queries (`db.query.*`) fail.
   - `db/index.js` does **not** export `schema`. However, `lib/auth.js` line 8 imports `import { db, schema } from "@/db";` and accesses `schema.users`, `schema.sessions`, `schema.accounts`, `schema.verifications`, causing immediate runtime `TypeError: Cannot read properties of undefined (reading 'users')`.
   - `db/index.js` executes `neon(process.env.DATABASE_URL)` eagerly at module load time without null-checking or sanitization.
3. **Live Neon Database is Missing 8 Required Tables**:
   - Verification against the live Neon database (`ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech`) revealed only 13 tables present.
   - 8 required tables are missing: `account`, `admin_profile`, `audit_logs`, `rating_categories`, `rating_category_scores`, `rating_appeals`, `rating_audit_logs`, and `rating_aggregates`.
   - Running `node scripts/test-db.js` fails with: `Missing expected tables: account, admin_profile, audit_logs, rating_categories, rating_category_scores, rating_appeals, rating_audit_logs, rating_aggregates`.
4. **Module System (CommonJS vs ESM) Inconsistency**:
   - `package.json` does not set `"type": "module"` (defaults to CommonJS).
   - Application code in `app/` and `lib/auth.js` uses ESM (`import`/`export`).
   - Core libraries (`lib/db.js`, `lib/audit.js`, `lib/auth-guard.js`, `lib/assessment-engine.js`), config (`drizzle.config.js`), and scripts (`scripts/*.js`, `tests/*.js`) use CommonJS (`require`/`module.exports`).
   - `lib/audit.js` line 119 attempts `const { db, schema, isMockDb } = require('../db/index');`, but `db/index.js` was converted to ESM with only `export const db`, creating cross-module resolution failures in Node.js scripts.

---

## 2. Deep Dive: `package.json` Audit

- **File**: `e:\sih_2026_044\package.json`
- **Module Type**: Unspecified (Node defaults to CommonJS).

### Dependency Matrix
| Package | Version | Type | Role in Platform |
|---|---|---|---|
| `@neondatabase/serverless` | `^1.1.0` | Dependency | Neon Serverless driver (HTTP query `neon()`, WebSocket `Pool`/`Client`) |
| `better-auth` | `^1.7.1` | Dependency | Authentication core; uses `@better-auth/drizzle-adapter` |
| `drizzle-orm` | `^1.0.0-rc.4` | Dependency | PostgreSQL ORM core and query builder |
| `pg` | `^8.23.0` | Dependency | PostgreSQL client used by Drizzle Kit for CLI migrations |
| `dotenv` | `^17.4.2` | Dependency | Runtime `.env` loader for Node scripts |
| `next` | `14.2.5` | Dependency | Next.js full-stack framework (App Router) |
| `react` / `react-dom` | `^18.3.1` | Dependency | UI library |
| `drizzle-kit` | `^1.0.0-rc.4` | DevDependency | CLI tool for schema generation, push, migrations, studio |
| `tsx` | `^4.23.12` | DevDependency | TypeScript / ESM runtime execution tool |
| `@types/pg` | `^8.23.1` | DevDependency | TypeScript definitions for pg |

### Scripts Evaluation
| Script Name | Command | Operational Status | Root Cause / Issue |
|---|---|---|---|
| `seed` / `db:seed` | `node scripts/seed.js` | Operational (JSON DB) | Populates `data/db.json` from `data/seed.json` |
| `db:generate` | `drizzle-kit generate` | **BROKEN (Code 1)** | `Cannot find module '../schema.js'` in `db/schema/*.js` |
| `db:push` | `drizzle-kit push` | **BROKEN (Code 1)** | `Cannot find module '../schema.js'` in `db/schema/*.js` |
| `db:migrate` | `drizzle-kit migrate` | **BROKEN (Code 1)** | Schema path resolution failure |
| `db:studio` | `drizzle-kit studio` | **BROKEN (Code 1)** | Schema loading failure |
| `db:test` | `node scripts/test-db.js` | **BROKEN (Code 1)** | 8 tables missing from Neon DB |
| `test` / `test:auth` | `node tests/test-auth-onboarding-e2e.js` | Functional on JSON DB | Tests auth against in-memory/JSON store |

---

## 3. Deep Dive: `drizzle.config.js` Audit

- **File**: `e:\sih_2026_044\drizzle.config.js`

### Content & Configuration
```javascript
require("dotenv").config({ path: ".env" });

const { defineConfig } = require("drizzle-kit");

const databaseUrl = process.env.DATABASE_URL || "";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Add it to .env before running Drizzle commands.");
}

module.exports = defineConfig({
  schema: [
    "./db/schema/user.js",
    "./db/schema/student.js",
    "./db/schema/industry.js",
    "./db/schema/institute.js",
    "./db/schema/questions.js",
    "./db/schema/ratings.js"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
```

### Analysis & Vulnerabilities
1. **Dangling Schema File References**:
   - `drizzle.config.js` explicitly lists 6 files in `schema: [...]`.
   - When Drizzle Kit executes, it requires each file.
   - `user.js`, `student.js`, `industry.js`, `institute.js`, `ratings.js` execute `require("../schema.js")` at line 1.
   - Since `../schema.js` does not exist on disk, Drizzle Kit immediately halts.
2. **Dialect and Driver Selection**:
   - `dialect: "postgresql"` is the standard Drizzle Kit dialect for PostgreSQL/Neon.
   - `dbCredentials.url` correctly takes `databaseUrl`.
   - `strict: true` and `verbose: true` are appropriate for development integrity.
3. **Recommended Schema Configuration**:
   - Once all tables are properly declared in their respective schema files or barrel-exported via `db/schema/index.js`, `schema` can be configured as:
     `schema: "./db/schema/index.js"` or `schema: ["./db/schema/*.js"]`.

---

## 4. Deep Dive: `db/index.js` Database Connection Layer

- **File**: `e:\sih_2026_044\db\index.js`

### Current File Structure
Lines 1–638 contain the previous dual-mode Neon/Mock DB implementation entirely commented out (`// ...`).
Active lines (650–657):
```javascript
import "dotenv/config";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql);
```

### Architectural & Functional Deficiencies
1. **No Relational Schema Binding**:
   - `drizzle(sql)` is invoked without the second options argument `{ schema }`.
   - In Drizzle ORM v1.0.0-rc.4, relational queries (`db.query.users.findMany()`, `db.query.studentProfiles.findFirst()`, etc.) require the schema map during initialization. Without it, `db.query` is completely empty.
2. **Missing `schema` Named Export**:
   - `lib/auth.js` line 8 explicitly requires: `import { db, schema } from "@/db";`.
   - It then initializes Better Auth via:
     ```javascript
     database: drizzleAdapter(db, {
       provider: "pg",
       schema: {
         user: schema.users,
         session: schema.sessions,
         account: schema.accounts,
         verification: schema.verifications,
       },
     })
     ```
   - Because `db/index.js` does not export `schema`, `schema` resolves to `undefined`, causing `TypeError: Cannot read properties of undefined (reading 'users')`.
3. **Driver Mode: `neon-http` vs `neon-serverless` Pool vs Node `pg`**:
   - `neon(connectionString)` creates an HTTP stateless query function. This is optimal for serverless HTTP request-response handlers and Edge runtimes because it uses HTTP/HTTPS fetch without maintaining stateful TCP connections.
   - For Better Auth + Drizzle, `drizzle(sql, { schema })` with `neon-http` works seamlessly as long as schema is bound.
   - For transactional batch operations with multi-step transactions, `Pool` from `@neondatabase/serverless` with `drizzle-orm/neon-serverless` is an alternative. However, `neon-http` is standard for Next.js App Router API routes on Neon.
4. **Eager & Unsafe Initialization**:
   - `const sql = neon(process.env.DATABASE_URL)` executes immediately upon file import.
   - If `process.env.DATABASE_URL` is undefined (e.g. during static build phase or certain test environments), `neon(undefined)` throws an uncaught error: `Error: No database connection string was provided to neon()`.
   - A defensive check with graceful error messaging or fallback is necessary.
5. **CommonJS Interoperability**:
   - `lib/audit.js` line 119 has: `const { db, schema, isMockDb } = require('../db/index');`.
   - Because `db/index.js` uses ESM `export const db`, standard Node CommonJS `require()` in utility scripts or test helpers receives an ESM module namespace object `{ db: ... }` without `schema` or `isMockDb`.
   - The connection module should export both `db` and `schema` in a format cleanly consumable by both ESM (`import`) and CommonJS (`require`).

---

## 5. Environment Variable Loading & `DATABASE_URL` Validation

- **Files Checked**: `.env`, `.env.example`, `lib/auth.js`, `drizzle.config.js`, `scripts/test-db.js`.

### `.env` Verification Matrix
| Key | Status in `.env` | Expected Format | Validation / Notes |
|---|---|---|---|
| `DATABASE_URL` | Present | `postgresql://neondb_owner:***@ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Valid Neon pooler connection URL with SSL parameters. Verified active and reachable. |
| `BETTER_AUTH_SECRET` | Present | 64-character hex cryptographic string | Valid (meets >32 chars requirement). |
| `BETTER_AUTH_URL` | Present | `"http://localhost:3000"` | Valid base URL. |
| `BETTER_AUTH_API_KEY` | Present | `ba_10cvb70zswl6iadfog4iok41m8whnrww` | Better Auth API key. |
| `GOOGLE_CLIENT_ID` | Present | `871977176062-...apps.googleusercontent.com` | Google OAuth Client ID. |
| `GOOGLE_CLIENT_SECRET` | Present | `GOCSPX-...` | Google OAuth Client Secret. |
| `INITIAL_ADMIN_EMAIL` | Missing from `.env` | Defined in `.env.example` as `admin@skillbridge.gov.in` | Should be added to `.env` for auto-bootstrapping admin accounts on Google login. |
| `USE_MOCK_DB` | Missing from `.env` | Optional (`true` / `false`) | Defaults to `false` (real Neon DB). |

### `DATABASE_URL` Parsing & SSL Configuration
1. **SSL Parameter**: `?sslmode=require&channel_binding=require` is present in the connection string.
   - Neon serverless HTTP client (`neon()`) sends SQL over HTTPS (port 443) directly to the Neon proxy, so TLS is strictly enforced by default.
   - For `Pool` or `pg` connections, SSL is negotiated via TLS.
2. **Environment Loading Contexts**:
   - **Next.js runtime**: Next.js automatically loads `.env` into `process.env`.
   - **CLI / Drizzle Kit / Node Scripts**: Require `dotenv.config()` / `import "dotenv/config"` to populate `process.env`.
   - **`db/index.js`**: Includes `import "dotenv/config";`.

---

## 6. ESM vs CommonJS Consistency Audit

| Layer / File | Module System Used | Consumed By | Compatibility Status | Required Fix |
|---|---|---|---|---|
| `package.json` | CommonJS (default) | Node.js, CLI scripts | ✅ Valid for Node CLI | Keep or use jiti/tsx for TS/ESM |
| `drizzle.config.js` | CommonJS (`require`, `module.exports`) | `drizzle-kit` CLI | ✅ Compatible with Drizzle Kit | Fix schema file paths |
| `db/schema/questions.js` | CommonJS (`require`, `module.exports`) | `drizzle.config.js`, `db/index.js` | ✅ Valid table syntax | Maintain export format |
| `db/schema/user.js` | Broken CommonJS (`require("../schema.js")`) | `drizzle.config.js`, `db/index.js` | ❌ Fails (missing file) | Define `pgTable` directly & export |
| `db/schema/student.js` | Broken CommonJS (`require("../schema.js")`) | `drizzle.config.js`, `db/index.js` | ❌ Fails (missing file) | Define `pgTable` directly & export |
| `db/schema/industry.js` | Broken CommonJS (`require("../schema.js")`) | `drizzle.config.js`, `db/index.js` | ❌ Fails (missing file) | Define `pgTable` directly & export |
| `db/schema/institute.js` | Broken CommonJS (`require("../schema.js")`) | `drizzle.config.js`, `db/index.js` | ❌ Fails (missing file) | Define `pgTable` directly & export |
| `db/schema/ratings.js` | Broken CommonJS (`require("../schema.js")`) | `drizzle.config.js`, `db/index.js` | ❌ Fails (missing file) | Define `pgTable` directly & export |
| `db/index.js` | ESM (`import`, `export`) | `lib/auth.js` (ESM), `lib/audit.js` (CJS) | ❌ Incomplete exports, missing schema | Export `{ db, schema, sql, ... }` cleanly |
| `lib/auth.js` | ESM (`import`, `export`) | `app/api/auth/[...all]/route.js` | ⚠️ Crashes on missing `schema` | Will resolve when `db` exports `schema` |
| `lib/db.js` | CommonJS (`require`, `module.exports`) | Local services, test runners | ✅ Self-contained | Retain as fallback store |
| `scripts/test-db.js` | CommonJS (`require`) | npm script `npm run db:test` | ⚠️ Fails on missing Neon tables | Will pass after schema push |

---

## 7. Live Neon Database State vs Required Schema State

An empirical query was executed against `ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb` via `@neondatabase/serverless` Pool:

### Audit Table Comparison (21 Total Expected Tables)
| # | Table Name | Live Status in Neon | Category |
|---|---|---|---|
| 1 | `user` | **PRESENT** (1) | Better Auth / Core |
| 2 | `session` | **PRESENT** (2) | Better Auth / Core |
| 3 | `account` | **MISSING** ❌ | Better Auth / OAuth |
| 4 | `verification` | **PRESENT** (3) | Better Auth / Core |
| 5 | `signup_intents` | **PRESENT** (4) | Onboarding & Role Gating |
| 6 | `student_profile` | **PRESENT** (5) | Role 1:1 Profile |
| 7 | `organization_profile` | **PRESENT** (6) | Role 1:1 Profile |
| 8 | `institute` | **PRESENT** (7) | Role 1:1 Profile |
| 9 | `admin_profile` | **MISSING** ❌ | Role 1:1 Profile |
| 10 | `audit_logs` | **MISSING** ❌ | Security & Compliance |
| 11 | `questions` | **PRESENT** (8) | Question Bank & Assessment |
| 12 | `rating_interactions` | **PRESENT** (9) | Rating & Reputation Engine |
| 13 | `ratings` | **PRESENT** (10) | Rating & Reputation Engine |
| 14 | `rating_categories` | **MISSING** ❌ | Rating & Reputation Engine |
| 15 | `rating_category_scores` | **MISSING** ❌ | Rating & Reputation Engine |
| 16 | `rating_responses` | **PRESENT** (11) | Rating & Reputation Engine |
| 17 | `rating_reports` | **PRESENT** (12) | Rating & Reputation Engine |
| 18 | `rating_appeals` | **MISSING** ❌ | Rating & Reputation Engine |
| 19 | `rating_audit_logs` | **MISSING** ❌ | Rating & Reputation Engine |
| 20 | `rating_aggregates` | **MISSING** ❌ | Rating & Reputation Engine |
| 21 | `rating_policies` | **PRESENT** (13) | Rating & Reputation Engine |

---

## 8. Concrete Action Plan & Implementation Blueprint

To repair and achieve 100% database, driver, Drizzle, Better Auth, and migration integrity:

### Step 1: Repair Drizzle Schema Files in `db/schema/`
- **`db/schema/user.js`**: Define `users`, `sessions`, `accounts`, `verifications`, `signupIntents` tables and enums (`userRoleEnum`, `accountStatusEnum`, `onboardingStatusEnum`, `auditActionEnum`, `orgVerificationStatusEnum`).
- **`db/schema/student.js`**: Define `studentProfiles` (`student_profile`) with 1:1 foreign key referencing `users.id` (`onDelete: 'cascade'`).
- **`db/schema/industry.js`**: Define `organizationProfiles` (`organization_profile`) with 1:1 foreign key referencing `users.id` (`onDelete: 'cascade'`).
- **`db/schema/institute.js`**: Define `instituteProfiles` (`institute`) with 1:1 foreign key referencing `users.id` (`onDelete: 'cascade'`).
- **`db/schema/questions.js`**: Keep the verified `questionTable` (`questions`).
- **`db/schema/ratings.js`**: Define `ratings`, `ratingInteractions`, `ratingCategories`, `ratingCategoryScores`, `ratingResponses`, `ratingReports`, `ratingAppeals`, `ratingAuditLogs`, `ratingAggregates`, `ratingPolicies`, `adminProfiles`, `auditLogs`, and rating enums.
- **`db/schema/index.js`**: Create a unified aggregator exporting all tables, relations, and enums so both Drizzle ORM runtime and Drizzle Kit CLI have a clean, unambiguous single entry point.

### Step 2: Configure `drizzle.config.js`
- Point `schema: "./db/schema/index.js"` (or the array of concrete schema files in `db/schema/*.js`).
- Verify `npx drizzle-kit check` and `npx drizzle-kit generate` execute with zero errors.

### Step 3: Refactor `db/index.js`
- Import all schema tables and relations from `./schema/index.js`.
- Initialize Drizzle with schema:
  ```javascript
  import "dotenv/config";
  import { drizzle } from "drizzle-orm/neon-http";
  import { neon } from "@neondatabase/serverless";
  import * as schema from "./schema/index.js";

  const connectionString = process.env.DATABASE_URL || "";
  const sql = connectionString ? neon(connectionString) : null;
  export const db = sql ? drizzle(sql, { schema }) : null;
  export { schema };
  ```
- Also export CommonJS-compatible properties if required by Node scripts.

### Step 4: Synchronize Live Neon Database
- Run `npx drizzle-kit push` to create the 8 missing tables in Neon (`account`, `admin_profile`, `audit_logs`, `rating_categories`, `rating_category_scores`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`).
- Verify using `node scripts/test-db.js` that all 21 tables exist, connection passes, insert/select/update/delete/relations pass, and rollback succeeds.

### Step 5: Verify Better Auth Integration
- Verify `lib/auth.js` initializes `drizzleAdapter(db, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } })` without errors.
