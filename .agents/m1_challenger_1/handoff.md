# Challenger Empirical Assessment & Handoff Report — Milestone 1

**Milestone**: Milestone 1: Database Schema Expansion, Unique Constraints & Migrations  
**Role**: Empirical Challenger (`m1_challenger_1`)  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  
**Date**: 2026-08-29  

---

## 1. Observation

Direct empirical evidence gathered from inspecting the schema definitions and executing dedicated verification suites against the live Neon PostgreSQL database:

### A. Schema Architecture & Constraints
1. **Student Schema (`db/schema/student.js:7, 31-33`)**:
   - `userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - Explicit unique index: `userIdIdx: uniqueIndex("students_user_id_idx").on(table.userId)`
   - Expanded columns present: `full_name`, `email`, `phone`, `headline`, `bio`, `institute_name`, `department`, `degree`, `year_of_study`, `graduation_year` (integer), `cgpa` (text), `skills` (jsonb), `projects` (jsonb), `certifications` (jsonb), `experience` (jsonb), `career_preferences` (jsonb), `github_url`, `linkedin_url`.

2. **Industry Schema (`db/schema/industry.js:6, 32-34`)**:
   - `userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - Explicit unique index: `userIdIdx: uniqueIndex("industries_user_id_idx").on(table.userId)`
   - Expanded statutory & contact columns present: `company_name`, `registration_number` (CIN), `tax_id_gstin` (GSTIN), `company_type`, `company_size`, `industry`, `industry_type`, `website`, `description`, `primary_contact_name`, `primary_contact_phone`, `primary_contact_designation`, `official_email`, `domain_focus` (jsonb), `address` (jsonb), `verification_docs` (jsonb).

3. **Institute Schema (`db/schema/institute.js:6, 25-27`)**:
   - `userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" })`
   - Explicit unique index: `userIdIdx: uniqueIndex("institutes_user_id_idx").on(table.userId)`
   - Expanded statutory & academic columns present: `institute_name`, `institute_code`, `institute_type`, `aishe_code`, `contact_phone`, `official_email`, `logo_url`, `website`, `departments` (jsonb), `placement_contact` (jsonb), `accreditation_details` (jsonb), `verification_docs` (jsonb).

4. **Signup Intents & User Schema (`db/schema/user.js:4-30, 33-54, 126-141`)**:
   - PostgreSQL enums: `user_role` (`STUDENT`, `INDUSTRY`, `INSTITUTE`, `ORGANIZATION`, `ADMIN`), `account_status`, `onboarding_status`, `org_verification_status`.
   - `signup_intents` table: `id`, `token` (unique), `role` (`user_role`), `email`, `expires_at`, `used`, `used_at`, `created_at`. Unique index: `signup_intent_token_idx` on `token`.

### B. Empirical Test Harness Execution
1. **Dedicated M1 Stress Test Harness (`tests/test-m1-schema-stress-empirical.js`)**:
   - Command: `node tests/test-m1-schema-stress-empirical.js`
   - **Result**: `15 passed, 0 failed (100.0% pass rate)`.
   - Verbatim outputs:
     - `✔ [PASS] 1.1: Duplicate user_id insertion into students table is strictly rejected (23505) (1449ms)`
     - `✔ [PASS] 1.2: Duplicate user_id insertion into industries table is strictly rejected (23505) (1490ms)`
     - `✔ [PASS] 1.3: Duplicate user_id insertion into institutes table is strictly rejected (23505) (1422ms)`
     - `✔ [PASS] 2.1: Students ON CONFLICT (user_id) DO UPDATE mutates existing record without row duplication (1811ms)`
     - `✔ [PASS] 2.2: Industries ON CONFLICT (user_id) DO UPDATE mutates statutory & contact fields cleanly (1711ms)`
     - `✔ [PASS] 2.3: Institutes ON CONFLICT (user_id) DO UPDATE mutates accreditation & departments cleanly (1814ms)`
     - `✔ [PASS] 3.1: Profile insert with non-existent user_id is rejected by FK constraint (23503) (835ms)`
     - `✔ [PASS] 3.2: Deleting parent user cascades and removes student, industry, institute, and session rows (2383ms)`
     - `✔ [PASS] 4.1: Complex nested JSONB structures (projects, certifications, address) persist and deserialize properly (1482ms)`
     - `✔ [PASS] 4.2: Large payload, unicode characters, symbols, and SQL escape sequences are handled safely (1423ms)`
     - `✔ [PASS] 5.1: Duplicate token in signup_intents is rejected by unique constraint (23505) (1122ms)`
     - `✔ [PASS] 5.2: Invalid enum value for user_role is rejected by PostgreSQL (22P02) (864ms)`
     - `✔ [PASS] 6.1: Multi-entity transaction rollback on mid-flight error leaves zero dirty state (2600ms)`
     - `✔ [PASS] 7.1: Parallel concurrent insertions with identical user_id enforce strict uniqueness (N=5) (3252ms)`
     - `✔ [PASS] 7.2: Parallel concurrent UPSERTs with identical user_id converge without deadlock or corruption (N=5) (1200ms)`

2. **Core Database Schema & Column Verification (`scripts/test-db.js`)**:
   - Command: `node scripts/test-db.js`
   - Output: `Schema verification passed (all 11 tables exist). Detailed column verification passed. Unique user_id indexes present on: students, industries, institutes, session, account. Live CRUD, expanded profile fields, signup_intents, and transaction rollback passed.`

3. **Signup Intent & Role Tampering Suite (`tests/m1-challenger-empirical.js`)**:
   - Command: `node tests/m1-challenger-empirical.js`
   - Output: `16 passed, 0 failed (100.0% pass rate)`.

4. **Better Auth & Drizzle Persistence Stress Suite (`tests/test-better-auth-persistence-stress.js`)**:
   - Command: `node --env-file=.env.local tests/test-better-auth-persistence-stress.js`
   - Output: `53 passed, 0 failed (100.0% pass rate)`.

5. **Tier 5 Adversarial Auth Hardening Suite (`tests/test-tier5-adversarial-auth.js`)**:
   - Command: `node tests/test-tier5-adversarial-auth.js`
   - Output: `45 passed, 0 failed (100.0% pass rate)`.

---

## 2. Logic Chain

1. **Premise 1 (Uniqueness Invariant)**: The requirement mandates that every student, industry, and institute profile must maintain a 1:1 relationship with an authenticated user (`user.id`).
2. **Observation 1**: The schema defines `unique().references(() => user.id)` and `uniqueIndex` across `students`, `industries`, and `institutes`.
3. **Empirical Proof 1**: Inserting duplicate `user_id` values under single-threaded and high-concurrency (N=5) race conditions fails deterministically with PostgreSQL error `23505 (unique_violation)`.
4. **Premise 2 (Atomic Profile Upsert)**: Profile updates must prevent race conditions and never duplicate profile rows during multi-step setup.
5. **Empirical Proof 2**: Tests 2.1, 2.2, 2.3, and 7.2 empirically proved that `ON CONFLICT ("user_id") DO UPDATE` updates target columns cleanly while preserving exactly 1 authoritative row in the database.
6. **Premise 3 (Integrity & Isolation)**: Transactions that fail mid-operation must rollback cleanly with zero persistent leakage.
7. **Empirical Proof 3**: Test 6.1 verified that multi-entity operations (inserting users, profiles) rolled back completely with zero rows remaining in the database upon error.
8. **Premise 4 (Cascade Consistency)**: Deleting a `user` must cleanly prune associated profiles and sessions without orphaned records.
9. **Empirical Proof 4**: Test 3.2 confirmed that executing `DELETE FROM "user"` removes child `students`, `industries`, `institutes`, and `session` rows via `ON DELETE CASCADE`.

---

## 3. Caveats

- **Caveat 1**: API route validation and UI onboarding flows are implemented in subsequent milestones (M2 & M3). This evaluation was strictly focused on the database schema, Drizzle models, constraints, migrations, and low-level CRUD persistence.
- **Caveat 2**: Database tests were executed against the live configured Neon PostgreSQL database (`process.env.DATABASE_URL`). Connection latency was observed between ~800ms and ~2600ms per transaction, which is expected for cloud-hosted serverless Postgres HTTP pools.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 1 satisfies all functional, architectural, and security requirements:
- Authoritative 1:1 unique constraints on `user_id` across `students`, `industries`, and `institutes` are active and enforced by PostgreSQL.
- Expanded academic and statutory fields across all profile types correctly persist complex nested JSONB structures, strings, integers, and unicode payloads.
- Atomic UPSERT operations and cascade deletion invariants function reliably without data corruption.
- Transaction rollback guarantees zero dirty state leakage.
- Pre-OAuth `signup_intents` table and enum types strictly prevent unauthorized role registration and duplicate tokens.

Milestone 1 is hardened and ready for downstream integration with Milestone 2 and Milestone 3.

---

## 5. Verification Method

To independently reproduce and verify all empirical findings, run the following commands from the workspace root:

```bash
# 1. Run the Milestone 1 dedicated empirical stress test suite
node tests/test-m1-schema-stress-empirical.js

# 2. Run the core database schema and column verification script
node scripts/test-db.js

# 3. Run the signup intent & role tampering empirical suite
node tests/m1-challenger-empirical.js

# 4. Run the Better Auth & OAuth persistence stress suite
node --env-file=.env.local tests/test-better-auth-persistence-stress.js

# 5. Run the Tier 5 adversarial auth hardening suite
node tests/test-tier5-adversarial-auth.js
```

All commands must exit with code 0 and report 0 failed tests.
