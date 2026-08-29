# Handoff Report: Schema & Relationship Specification Audit

## 1. Observation
1. **Broken Schema File Stubs**:
   - `db/schema/user.js:1`: `const schema = require("../schema.js");`
   - `db/schema/student.js:1`: `const schema = require("../schema.js");`
   - `db/schema/industry.js:1`: `const schema = require("../schema.js");`
   - `db/schema/institute.js:1`: `const schema = require("../schema.js");`
   - `db/schema/ratings.js:1`: `const schema = require("../schema.js");`
   - `git status` records `deleted: db/schema.js`.
   - Node evaluation command `node -e "require('./db/schema/user.js')"` fails with verbatim error:
     `Error loading user.js: Cannot find module '../schema.js'`
2. **Missing Schema Aggregator**:
   - Directory `db/schema/` contains only 6 files (`industry.js`, `institute.js`, `questions.js`, `ratings.js`, `student.js`, `user.js`).
   - The file `db/schema/index.js` does NOT exist.
3. **Driver & Query Engine Disconnection**:
   - `db/index.js:650-657`:
     ```javascript
     import "dotenv/config";
     import { drizzle } from "drizzle-orm/neon-http";
     import { neon } from "@neondatabase/serverless";

     const sql = neon(process.env.DATABASE_URL);
     export const db = drizzle(sql);
     ```
   - Legacy schema binding (`drizzle({ client: sql, schema })`) and mock fallback (`createMockDrizzleDb()`) are commented out in `db/index.js:1-638`.
4. **Authoritative Specification & Snapshot State**:
   - Complete 21-table schema, 13 PostgreSQL enums, indexes, and cascades are preserved in:
     - `drizzle/20260824180753_omniscient_scrambler/migration.sql` (Tables: `user`, `session`, `account`, `verification`, `signup_intents`, `student_profile`, `organization_profile`, `institute`, `admin_profile`, `audit_logs`)
     - `drizzle/20260825143422_talented_xorn/migration.sql` (Tables: `rating_interactions`, `ratings`, `rating_categories`, `rating_category_scores`, `rating_responses`, `rating_reports`, `rating_appeals`, `rating_audit_logs`, `rating_aggregates`, `rating_policies`)
     - `drizzle/20260826155818_steady_rictor/migration.sql` (Table: `questions`)
     - `drizzle/20260826155818_steady_rictor/snapshot.json` (Total 21 tables, 13 enums).
   - `scripts/test-db.js:6-28` defines the exact 21 `REQUIRED_TABLES` expected by the platform.

---

## 2. Logic Chain
1. From Observation 1, because `user.js`, `student.js`, `industry.js`, `institute.js`, and `ratings.js` depend on the non-existent `../schema.js`, no schema table models can currently be imported by Drizzle Kit, Better Auth, or runtime route handlers.
2. From Observation 2, `db/schema/index.js` is missing, breaking package imports like `import { schema } from "@/db"` used in `lib/auth.js:8` and `lib/audit.js:119`.
3. From Observation 3, calling `export const db = drizzle(sql);` without `{ schema }` disables Drizzle's relational query API (`db.query.*`), which breaks route handlers relying on Drizzle relations.
4. From Observation 4, the exact column names, data types, primary keys (text vs varchar), foreign keys (`onDelete: cascade` vs `set null`), default values, and indexes for all 21 tables are fully documented in the migration snapshots and reverse-engineered in `analysis.md`.
5. Therefore, repairing the database layer requires populating concrete `pgTable` definitions in each of the 6 schema files following a strict non-circular dependency DAG, exporting `db/schema/index.js`, and attaching the schema to `db/index.js`.

---

## 3. Caveats
- No caveats regarding schema specification completeness: all 21 tables, 13 PostgreSQL enums, and foreign keys have been verified against the migration snapshots and database verification test suite.
- The actual file modification and migration push will be performed by the implementation Worker agents as per the read-only constraint.

---

## 4. Conclusion
The database architecture requires a modular repair of the Drizzle schema files:
1. Populate `db/schema/user.js` with `users`, `sessions`, `accounts`, `verifications`, `signupIntents`, `adminProfiles`, `auditLogs`, and common enums.
2. Populate `db/schema/student.js` with `studentProfiles`.
3. Populate `db/schema/industry.js` with `organizationProfiles`.
4. Populate `db/schema/institute.js` with `instituteProfiles`.
5. Retain `db/schema/questions.js` with `questionTable`.
6. Populate `db/schema/ratings.js` with the 10 rating tables and 8 rating enums.
7. Create `db/schema/index.js` aggregating all tables, enums, and compiled relations.
8. Restore `{ schema }` and dual-mode execution in `db/index.js`.

---

## 5. Verification Method
1. **Module Load Test**:
   ```bash
   node -e "['user.js', 'student.js', 'industry.js', 'institute.js', 'questions.js', 'ratings.js', 'index.js'].forEach(f => { require('./db/schema/' + f); console.log('Loaded:', f); });"
   ```
2. **Schema Verification Test**:
   ```bash
   node tests/test-m1-schema-persistence.js
   ```
3. **Database Integration Test**:
   ```bash
   node scripts/test-db.js
   ```
4. **Drizzle Kit Check**:
   ```bash
   npx drizzle-kit check
   ```
