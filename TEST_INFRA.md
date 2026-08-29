# E2E Test Infra: Database, Schema, Drizzle ORM & Better Auth

## Test Philosophy
- Opaque-box, requirement-driven. Derives from ORIGINAL_REQUEST.md.
- Multi-tier validation: Connection -> Schema Definition -> Migration/Table Sync -> Full CRUD Lifecycle -> Relational Queries -> Cascade Deletions -> Better Auth Persistence -> Adversarial Integrity.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | Better Auth Core Schema | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Profile Schemas (Student, Industry, Institute) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Questions & Ratings Schemas | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Schema Aggregator & Relations | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | DB Driver & Environment | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Drizzle Kit Config & ESM | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Schema Push & DB State | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 8 | CRUD & Relations Verification | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 9 | Better Auth Persistence | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner Location**: `scripts/verify-db.js` / `scripts/test-e2e-db.js`
- **Execution Command**: `node scripts/verify-db.js`
- **Pass/Fail Semantics**: Process exits with code 0 on 100% test pass, exit code 1 with structured diagnostic errors on failure.

## Test Tiers
1. **Tier 1: Connection & Schema Loading (Unit / Smoke)**
   - Verify environment variable loading (`DATABASE_URL`).
   - Verify active Neon database connection with a heartbeat ping `SELECT 1`.
   - Verify all table schemas export valid Drizzle PG tables.
   - Verify schema aggregator contains all 9 tables (`users`, `sessions`, `accounts`, `verifications`, `students`, `industries`, `institutes`, `questions`, `ratings`).
2. **Tier 2: Boundary, Type & Constraint Validation**
   - Check foreign key constraint matching (User ID text vs profile userId text; UUID PKs for domain tables).
   - Check NULL vs NOT NULL constraints.
   - Check unique constraints (e.g. user email, student roll/email if applicable).
   - Check enum or type validations on status/ratings fields.
3. **Tier 3: Full CRUD & Relational Lifecycle**
   - User CRUD: Create user, find by ID/email, update name/image, verify.
   - Profile CRUD: Create student, industry, institute profiles linked to user.
   - Domain CRUD: Create questions and ratings linked to profiles.
   - Relational Queries: Query user with student profile (`db.query.users.findFirst({ with: { student: true } })`), question with author and ratings.
4. **Tier 4: Real-World Scenarios & Cascade Integrity**
   - Cascade Deletion: Deleting a `user` automatically cascades and removes child `students`, `industries`, `institutes`, `sessions`, `accounts`.
   - Better Auth flow simulation: Insert account linked to user (simulating Google OAuth callback), insert session, verify token lookup.
   - Rating aggregation scenario: Insert multiple ratings for a question, compute averages.
5. **Tier 5: Adversarial & Edge Case Coverage**
   - Concurrency / parallel insertions.
   - Special characters & unicode in text fields.
   - Inactive or expired session queries.
