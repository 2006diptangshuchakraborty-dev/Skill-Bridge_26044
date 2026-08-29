## 2026-08-27T02:27:45Z
You are the Final Implementation Worker for Round 8.
Working directory: e:\sih_2026_044\.agents\worker_r8_final
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.

You MUST execute the following tool actions:

STEP 1: Overwrite `e:\sih_2026_044\db\schema\index.js` using `write_to_file` (Overwrite: true) with EXACTLY:
```javascript
export * from "./user.js";
export * from "./student.js";
export * from "./industry.js";
export * from "./institute.js";
export * from "./questions.js";
export * from "./ratings.js";
```

STEP 2: Overwrite `e:\sih_2026_044\scripts\test-db.js` using `write_to_file` (Overwrite: true) with EXACTLY:
```javascript
import dotenv from "dotenv";
dotenv.config();
import { Pool } from "@neondatabase/serverless";

const REQUIRED_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "students",
  "industries",
  "institutes",
  "questions",
  "ratings"
];

async function testDatabase() {
  console.log("[db:test] Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("[db:test] Connection check passed.");

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(res.rows.map(r => r.table_name));

    const missingTables = REQUIRED_TABLES.filter(t => !existingTables.has(t));
    if (missingTables.length > 0) {
      throw new Error(`Missing expected tables: ${missingTables.join(", ")}`);
    }

    console.log("[db:test] Schema verification passed (all 9 tables exist).");

    await client.query("BEGIN");
    const testUserId = `test-user-${Date.now()}`;
    await client.query(
      `INSERT INTO "user" ("id", "name", "email") VALUES ($1, $2, $3)`,
      [testUserId, "Test User", `${testUserId}@example.com`]
    );

    const userRes = await client.query(
      `SELECT * FROM "user" WHERE "id" = $1`,
      [testUserId]
    );
    if (userRes.rows.length !== 1) {
      throw new Error("CRUD read failed");
    }

    await client.query("ROLLBACK");
    console.log("[db:test] Live CRUD and transaction rollback passed.");
    console.log("[db:test] Skill Bridge database layer is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase().catch(err => {
  console.error("[db:test] Database verification failed:", err.message);
  process.exit(1);
});
```

STEP 3: Execute via `run_command` in sequence and verify:
1. `npx drizzle-kit generate` (Cwd: `e:\sih_2026_044`) -> MUST EXIT WITH CODE 0 and 0 warnings
2. `node scripts/test-db.js` (Cwd: `e:\sih_2026_044`) -> MUST EXIT WITH CODE 0
3. `node .agents/victory_auditor_1/test-comprehensive-audit.js` (Cwd: `e:\sih_2026_044`) -> MUST PASS 18/18 checks (100%)
4. `node tests/test-auth-onboarding-e2e.js` (Cwd: `e:\sih_2026_044`) -> MUST PASS 119/119 tests

STEP 4: Write your handoff report to `e:\sih_2026_044\.agents\worker_r8_final\handoff.md` with full outputs and send a completion message to parent.
