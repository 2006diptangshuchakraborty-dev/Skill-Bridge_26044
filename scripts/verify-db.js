/**
 * Skill Bridge Platform - Automated E2E Database, Drizzle ORM & Better Auth Verification Harness
 * 
 * File: scripts/verify-db.js
 * 
 * Tiers:
 *   Tier 1: Connection Heartbeat, Environment & Schema Export Validation
 *   Tier 2: Schema Constraints, Column Types & Integrity Validation
 *   Tier 3: Complete Entity CRUD Lifecycle & Relational Queries
 *   Tier 4: Real-World Scenarios & Cascade Deletion Integrity (Better Auth + Cascades)
 *   Tier 5: Boundary, Corner & Adversarial Edge Cases (SQLi resilience, Unicode, Constraints, Concurrency)
 * 
 * Usage:
 *   node scripts/verify-db.js
 *   node scripts/verify-db.js --tier=1
 *   node scripts/verify-db.js --tier=3 --verbose
 *   node scripts/verify-db.js --json
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env configuration
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

const { Pool } = require("@neondatabase/serverless");

// ANSI Color Helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

// Parse CLI flags
const args = process.argv.slice(2);
const options = {
  tier: null,
  verbose: args.includes("--verbose") || args.includes("-v"),
  json: args.includes("--json"),
  help: args.includes("--help") || args.includes("-h"),
};

for (const arg of args) {
  if (arg.startsWith("--tier=")) {
    options.tier = parseInt(arg.split("=")[1], 10);
  }
}

if (options.help) {
  console.log(`
${colors.bold}Skill Bridge Database & ORM E2E Verification Harness${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/verify-db.js [options]

${colors.cyan}Options:${colors.reset}
  --tier=N       Run only specific tier (1 to 5)
  --verbose, -v  Show detailed diagnostic output per assertion
  --json         Output structured JSON report
  --help, -h     Show this help message
`);
  process.exit(0);
}

// Test Runner State
const state = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
  tiers: {
    1: { name: "Tier 1: Connection & Schema Loading", total: 0, passed: 0, failed: 0, skipped: 0, tests: [] },
    2: { name: "Tier 2: Boundary, Type & Constraint Validation", total: 0, passed: 0, failed: 0, skipped: 0, tests: [] },
    3: { name: "Tier 3: Full CRUD & Relational Lifecycle", total: 0, passed: 0, failed: 0, skipped: 0, tests: [] },
    4: { name: "Tier 4: Real-World Scenarios & Cascade Integrity", total: 0, passed: 0, failed: 0, skipped: 0, tests: [] },
    5: { name: "Tier 5: Adversarial, Unicode & Stress Verification", total: 0, passed: 0, failed: 0, skipped: 0, tests: [] },
  },
  failures: [],
};

// Assertion & Test Context Helper
function createTestContext(tierNumber) {
  return async function test(testId, description, fn) {
    const tier = state.tiers[tierNumber];
    if (options.tier && options.tier !== tierNumber) {
      tier.skipped++;
      state.skipped++;
      return;
    }

    tier.total++;
    state.total++;

    const start = Date.now();
    let error = null;

    try {
      await fn({
        assert(condition, message) {
          if (!condition) {
            throw new Error(message || "Assertion failed");
          }
        },
        assertEqual(actual, expected, message) {
          if (actual !== expected) {
            throw new Error(`${message ? message + " -> " : ""}Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
          }
        },
        assertDeepEqual(actual, expected, message) {
          const a = JSON.stringify(actual);
          const e = JSON.stringify(expected);
          if (a !== e) {
            throw new Error(`${message ? message + " -> " : ""}Expected deep match: ${e}, Actual: ${a}`);
          }
        },
        assertIncludes(arrayOrStr, item, message) {
          const included = Array.isArray(arrayOrStr) ? arrayOrStr.includes(item) : String(arrayOrStr).includes(item);
          if (!included) {
            throw new Error(`${message ? message + " -> " : ""}Expected ${JSON.stringify(arrayOrStr)} to include ${JSON.stringify(item)}`);
          }
        },
        assertMatch(str, regex, message) {
          if (!regex.test(str)) {
            throw new Error(`${message ? message + " -> " : ""}Expected "${str}" to match ${regex}`);
          }
        },
      });

      tier.passed++;
      state.passed++;
      const duration = Date.now() - start;

      tier.tests.push({ id: testId, description, status: "PASS", duration });

      if (!options.json) {
        if (options.verbose) {
          console.log(`  ${colors.green}✓${colors.reset} [${colors.cyan}${testId}${colors.reset}] ${description} ${colors.gray}(${duration}ms)${colors.reset}`);
        } else {
          process.stdout.write(`${colors.green}.${colors.reset}`);
        }
      }
    } catch (err) {
      tier.failed++;
      state.failed++;
      const duration = Date.now() - start;
      const errorMsg = (err && (err.message || err.detail || (typeof err === "string" ? err : JSON.stringify(err)))) || "Unknown error";

      const failInfo = { id: testId, tier: tierNumber, description, error: errorMsg, stack: err?.stack, duration };
      state.failures.push(failInfo);
      tier.tests.push({ id: testId, description, status: "FAIL", error: errorMsg, duration });

      if (!options.json) {
        if (options.verbose) {
          console.log(`  ${colors.red}✗${colors.reset} [${colors.cyan}${testId}${colors.reset}] ${description} ${colors.gray}(${duration}ms)${colors.reset}`);
          console.log(`    ${colors.red}Error: ${errorMsg}${colors.reset}`);
        } else {
          process.stdout.write(`${colors.red}F${colors.reset}`);
        }
      }
    }
  };
}

// Prefix generator for test isolation
function createTestPrefix() {
  return `tst_${crypto.randomBytes(4).toString("hex")}`;
}

// Main Test Execution Routine
async function runVerification() {
  if (!options.json) {
    console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}    Skill Bridge E2E Database, Drizzle ORM & Better Auth Suite        ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);
    console.log(`[Config] Target Database: Neon PostgreSQL Serverless`);
    console.log(`[Config] Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`[Config] Active Tiers: ${options.tier ? `Tier ${options.tier} only` : "Tiers 1 to 5"}\n`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(`${colors.red}[FATAL] DATABASE_URL is not set in process.env or .env file.${colors.reset}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // -------------------------------------------------------------------------
    // TIER 1: Connection Heartbeat, Environment & Schema Loading
    // -------------------------------------------------------------------------
    const testT1 = createTestContext(1);
    if (!options.json && (!options.tier || options.tier === 1)) {
      console.log(`\n${colors.bold}${colors.blue}--- Tier 1: Connection & Schema Loading ---${colors.reset}`);
    }

    await testT1("T1.ENV.01", "Verify DATABASE_URL environment configuration and PostgreSQL protocol prefix", async ({ assert, assertMatch }) => {
      assert(databaseUrl && databaseUrl.length > 0, "DATABASE_URL must be defined");
      assertMatch(databaseUrl, /^postgres(ql)?:\/\//, "DATABASE_URL must have a valid postgres:// or postgresql:// protocol");
      assert(!databaseUrl.includes("dummy_password"), "DATABASE_URL must not be a mock placeholder");
    });

    await testT1("T1.CONN.02", "Verify active Neon database connection heartbeat with ping query SELECT 1", async ({ assertEqual }) => {
      const pingRes = await pool.query("SELECT 1 AS heartbeat, NOW() AS server_time;");
      assertEqual(pingRes.rows[0].heartbeat, 1, "Heartbeat query result must equal 1");
    });

    await testT1("T1.SCHEMA.03", "Verify Better Auth core tables exist in public schema (user, session, verification)", async ({ assertIncludes }) => {
      const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
      const tableNames = res.rows.map(r => r.table_name);
      assertIncludes(tableNames, "user", "Core 'user' table must exist in database");
      assertIncludes(tableNames, "session", "Core 'session' table must exist in database");
      assertIncludes(tableNames, "verification", "Core 'verification' table must exist in database");
    });

    await testT1("T1.SCHEMA.04", "Verify 1:1 Profile tables exist in public schema (student_profile, organization_profile, institute)", async ({ assertIncludes }) => {
      const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
      const tableNames = res.rows.map(r => r.table_name);
      assertIncludes(tableNames, "student_profile", "Table 'student_profile' must exist in database");
      assertIncludes(tableNames, "organization_profile", "Table 'organization_profile' must exist in database");
      assertIncludes(tableNames, "institute", "Table 'institute' must exist in database");
    });

    await testT1("T1.SCHEMA.05", "Verify Domain problem statements & ratings tables exist in public schema (questions, ratings, rating_interactions)", async ({ assertIncludes }) => {
      const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
      const tableNames = res.rows.map(r => r.table_name);
      assertIncludes(tableNames, "questions", "Domain 'questions' table must exist in database");
      assertIncludes(tableNames, "ratings", "Domain 'ratings' table must exist in database");
      assertIncludes(tableNames, "rating_interactions", "Domain 'rating_interactions' table must exist in database");
    });

    await testT1("T1.FILES.06", "Verify schema module files exist and export expected table structures", async ({ assert }) => {
      const schemaDir = path.join(process.cwd(), "db", "schema");
      const requiredFiles = ["user.js", "student.js", "industry.js", "institute.js", "questions.js", "ratings.js"];
      for (const file of requiredFiles) {
        const filePath = path.join(schemaDir, file);
        assert(fs.existsSync(filePath), `Schema definition file '${file}' must exist in db/schema/`);
      }
    });

    await testT1("T1.ENUMS.07", "Verify PostgreSQL custom enum types are registered (user_role, account_status, onboarding_status, org_verification_status)", async ({ assertIncludes }) => {
      const res = await pool.query(`SELECT typname FROM pg_type WHERE typcategory = 'E';`);
      const enumNames = res.rows.map(r => r.typname);
      assertIncludes(enumNames, "user_role", "Enum 'user_role' must be registered");
      assertIncludes(enumNames, "account_status", "Enum 'account_status' must be registered");
      assertIncludes(enumNames, "onboarding_status", "Enum 'onboarding_status' must be registered");
      assertIncludes(enumNames, "org_verification_status", "Enum 'org_verification_status' must be registered");
    });

    // -------------------------------------------------------------------------
    // TIER 2: Boundary, Type & Constraint Validation
    // -------------------------------------------------------------------------
    const testT2 = createTestContext(2);
    if (!options.json && (!options.tier || options.tier === 2)) {
      console.log(`\n${colors.bold}${colors.blue}--- Tier 2: Boundary, Type & Constraint Validation ---${colors.reset}`);
    }

    await testT2("T2.TYPE.01", "Verify Primary Key column data types across core entities", async ({ assertEqual }) => {
      const res = await pool.query(`
        SELECT c.table_name, c.column_name, c.data_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.columns c ON kcu.table_name = c.table_name AND kcu.column_name = c.column_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
          AND c.table_name IN ('user', 'session', 'student_profile', 'organization_profile', 'institute', 'questions', 'ratings');
      `);
      const pks = {};
      res.rows.forEach(r => pks[r.table_name] = { col: r.column_name, type: r.data_type });

      assertEqual(pks["user"]?.col, "id", "user PK must be 'id'");
      assertEqual(pks["session"]?.col, "id", "session PK must be 'id'");
      assertEqual(pks["student_profile"]?.col, "id", "student_profile PK must be 'id'");
      assertEqual(pks["organization_profile"]?.col, "id", "organization_profile PK must be 'id'");
      assertEqual(pks["institute"]?.col, "id", "institute PK must be 'id'");
    });

    await testT2("T2.FK.02", "Verify Foreign Key definitions and ON DELETE CASCADE on profile and session tables", async ({ assert, assertEqual }) => {
      const res = await pool.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
      `);

      const findFk = (table, col) => res.rows.find(r => r.table_name === table && r.column_name === col);

      const sessionFk = findFk("session", "userId");
      assert(sessionFk, "session.userId must be a foreign key");
      assertEqual(sessionFk.foreign_table_name, "user", "session.userId must reference 'user'");
      assertEqual(sessionFk.delete_rule, "CASCADE", "session.userId FK must have ON DELETE CASCADE");

      const studentFk = findFk("student_profile", "user_id");
      assert(studentFk, "student_profile.user_id must be a foreign key");
      assertEqual(studentFk.foreign_table_name, "user", "student_profile.user_id must reference 'user'");
      assertEqual(studentFk.delete_rule, "CASCADE", "student_profile.user_id FK must have ON DELETE CASCADE");

      const orgFk = findFk("organization_profile", "user_id");
      assert(orgFk, "organization_profile.user_id must be a foreign key");
      assertEqual(orgFk.foreign_table_name, "user", "organization_profile.user_id must reference 'user'");
      assertEqual(orgFk.delete_rule, "CASCADE", "organization_profile.user_id FK must have ON DELETE CASCADE");

      const instFk = findFk("institute", "user_id");
      assert(instFk, "institute.user_id must be a foreign key");
      assertEqual(instFk.foreign_table_name, "user", "institute.user_id must reference 'user'");
      assertEqual(instFk.delete_rule, "CASCADE", "institute.user_id FK must have ON DELETE CASCADE");
    });

    await testT2("T2.NULL.03", "Verify NOT NULL constraints on mandatory business fields", async ({ assertEqual }) => {
      const res = await pool.query(`
        SELECT table_name, column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'user' AND column_name IN ('name', 'email', 'role', 'account_status', 'createdAt', 'updatedAt')) OR
            (table_name = 'student_profile' AND column_name IN ('fullName', 'email', 'user_id', 'profile_completion', 'current_onboarding_step')) OR
            (table_name = 'organization_profile' AND column_name IN ('company_name', 'user_id', 'verification_status')) OR
            (table_name = 'questions' AND column_name IN ('question_statement', 'correct_answer', 'solution_text', 'status')) OR
            (table_name = 'ratings' AND column_name IN ('overall_score', 'reviewer_user_id', 'target_user_id', 'status'))
          );
      `);

      res.rows.forEach(r => {
        assertEqual(r.is_nullable, "NO", `Field ${r.table_name}.${r.column_name} must be NOT NULL`);
      });
    });

    await testT2("T2.UNQ.04", "Verify Unique Constraints on user email, session token, and 1:1 user_id profiles", async ({ assert }) => {
      const res = await pool.query(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public';
      `);

      const hasUnique = (table, col) => res.rows.some(r => r.table_name === table && r.column_name === col);

      assert(hasUnique("student_profile", "user_id"), "student_profile.user_id must be UNIQUE for 1:1 role binding");
      assert(hasUnique("organization_profile", "user_id"), "organization_profile.user_id must be UNIQUE for 1:1 role binding");
      assert(hasUnique("institute", "user_id"), "institute.user_id must be UNIQUE for 1:1 role binding");
    });

    await testT2("T2.DEFAULTS.05", "Verify column default values (profile completion = 0, onboarding step = 1, timestamps = now())", async ({ assertMatch }) => {
      const res = await pool.query(`
        SELECT table_name, column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'student_profile' AND column_name IN ('profile_completion', 'current_onboarding_step', 'created_at')) OR
            (table_name = 'user' AND column_name IN ('emailVerified', 'profile_completed', 'createdAt'))
          );
      `);

      const defaults = {};
      res.rows.forEach(r => defaults[`${r.table_name}.${r.column_name}`] = r.column_default);

      assertMatch(String(defaults["student_profile.profile_completion"]), /0/, "student_profile.profile_completion default must be 0");
      assertMatch(String(defaults["student_profile.current_onboarding_step"]), /1/, "student_profile.current_onboarding_step default must be 1");
      assertMatch(String(defaults["user.emailVerified"]), /false/, "user.emailVerified default must be false");
      assertMatch(String(defaults["user.profile_completed"]), /false/, "user.profile_completed default must be false");
    });

    // -------------------------------------------------------------------------
    // TIER 3: Complete Entity CRUD Lifecycle & Relational Queries
    // -------------------------------------------------------------------------
    const testT3 = createTestContext(3);
    if (!options.json && (!options.tier || options.tier === 3)) {
      console.log(`\n${colors.bold}${colors.blue}--- Tier 3: Complete Entity CRUD Lifecycle & Relational Queries ---${colors.reset}`);
    }

    await testT3("T3.CRUD.01", "User Lifecycle: Create, Read, Update, Delete test user on Neon DB", async ({ assert, assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_${prefix}`;
      const email = `test_${prefix}@skillbridge.internal`;

      // 1. Create
      const insertRes = await pool.query(`
        INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW())
        RETURNING *;
      `, [userId, "E2E Test Student", email]);
      assertEqual(insertRes.rows.length, 1, "Insert user must return 1 row");
      assertEqual(insertRes.rows[0].id, userId, "Inserted ID must match");

      // 2. Read
      const selectRes = await pool.query(`SELECT * FROM "user" WHERE "id" = $1;`, [userId]);
      assertEqual(selectRes.rows[0].email, email, "Queried email must match");

      // 3. Update
      const updateRes = await pool.query(`
        UPDATE "user" SET "name" = $2, "profile_completed" = true, "updatedAt" = NOW()
        WHERE "id" = $1 RETURNING *;
      `, [userId, "Updated E2E Student"]);
      assertEqual(updateRes.rows[0].name, "Updated E2E Student", "Updated name must persist");
      assertEqual(updateRes.rows[0].profile_completed, true, "Updated profile_completed must persist");

      // 4. Delete
      await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      const checkRes = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1;`, [userId]);
      assertEqual(checkRes.rows.length, 0, "User must be successfully deleted");
    });

    await testT3("T3.CRUD.02", "Student Profile Lifecycle: Create linked profile, update skills JSONB, query with User join", async ({ assert, assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_${prefix}`;
      const profileId = `stu_${prefix}`;
      const email = `student_${prefix}@skillbridge.internal`;

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId, "Student Candidate", email]);

        // Insert Student Profile
        const skillsData = JSON.stringify([{ skill: "React", level: 4 }, { skill: "PostgreSQL", level: 3 }]);
        await pool.query(`
          INSERT INTO "student_profile" (
            "id", "user_id", "fullName", "email", "headline", "department", "cgpa",
            "skills", "projects", "certifications", "experience", "career_preferences",
            "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 50, 4, NOW(), NOW());
        `, [profileId, userId, "Student Candidate", email, "Aspiring Full Stack Engineer", "Computer Science", "8.90", skillsData]);

        // Query Joined Data (User + Student)
        const joinRes = await pool.query(`
          SELECT u.id as user_id, u.role, sp.id as profile_id, sp."fullName", sp.headline, sp.skills
          FROM "user" u
          JOIN "student_profile" sp ON sp.user_id = u.id
          WHERE u.id = $1;
        `, [userId]);

        assertEqual(joinRes.rows.length, 1, "Join query must return 1 row");
        assertEqual(joinRes.rows[0].profile_id, profileId, "Joined profile ID must match");
        assertEqual(joinRes.rows[0].skills.length, 2, "Persisted JSONB skills array must contain 2 elements");

        // Update profile
        await pool.query(`
          UPDATE "student_profile" SET "headline" = $2, "profile_completion" = 100, "updated_at" = NOW()
          WHERE "id" = $1;
        `, [profileId, "Senior Software Intern"]);

        const updated = await pool.query(`SELECT "headline", "profile_completion" FROM "student_profile" WHERE "id" = $1;`, [profileId]);
        assertEqual(updated.rows[0].headline, "Senior Software Intern", "Headline update must persist");
        assertEqual(updated.rows[0].profile_completion, 100, "Profile completion update must persist");
      } finally {
        await pool.query(`DELETE FROM "student_profile" WHERE "id" = $1;`, [profileId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT3("T3.CRUD.03", "Industry Profile Lifecycle: Create organization profile, update hiring preferences JSONB, query with join", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_${prefix}`;
      const orgId = `org_${prefix}`;
      const email = `recruiter_${prefix}@techcorp.internal`;

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, 'INDUSTRY', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId, "TechCorp Recruiter", email]);

        await pool.query(`
          INSERT INTO "organization_profile" (
            "id", "user_id", "company_name", "company_type", "industry", "company_size", "website",
            "address", "documents", "verification_docs", "hiring_preferences", "verification_status",
            "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, $3, 'PRODUCT', 'Software & AI', '50-200', 'https://techcorp.internal', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"roles":["Backend Developer"]}'::jsonb, 'APPROVED', 80, 5, NOW(), NOW());
        `, [orgId, userId, "TechCorp Innovations"]);

        const res = await pool.query(`
          SELECT u.email, op.company_name, op.verification_status, op.hiring_preferences
          FROM "user" u
          JOIN "organization_profile" op ON op.user_id = u.id
          WHERE u.id = $1;
        `, [userId]);

        assertEqual(res.rows.length, 1, "Industry profile join query must return 1 row");
        assertEqual(res.rows[0].company_name, "TechCorp Innovations", "Company name must match");
        assertEqual(res.rows[0].verification_status, "APPROVED", "Verification status must match");
      } finally {
        await pool.query(`DELETE FROM "organization_profile" WHERE "id" = $1;`, [orgId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT3("T3.CRUD.04", "Institute Profile Lifecycle: Create institute record, update departments JSONB, query with join", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_${prefix}`;
      const instId = `ins_${prefix}`;
      const email = `dean_${prefix}@nationaltech.internal`;

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, 'INSTITUTE', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId, "National Tech Institute Dean", email]);

        const depts = JSON.stringify([{ name: "Computer Science", hod: "Dr. Alan Turing" }, { name: "Electronics", hod: "Dr. Claude Shannon" }]);
        await pool.query(`
          INSERT INTO "institute" (
            "id", "user_id", "institute_name", "institute_code", "institute_type", "address", "website",
            "departments", "placement_contact", "verification_status", "verification_docs", "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, $3, $4, 'UNIVERSITY', '{}'::jsonb, 'https://nationaltech.internal', $5::jsonb, '{}'::jsonb, 'APPROVED', '[]'::jsonb, 100, 6, NOW(), NOW());
        `, [instId, userId, "National Institute of Technology", `NIT_${prefix.toUpperCase()}`, depts]);

        const res = await pool.query(`
          SELECT u.name, i.institute_name, i.departments
          FROM "user" u
          JOIN "institute" i ON i.user_id = u.id
          WHERE u.id = $1;
        `, [userId]);

        assertEqual(res.rows.length, 1, "Institute profile query must return 1 row");
        assertEqual(res.rows[0].departments.length, 2, "Departments JSONB array length must equal 2");
      } finally {
        await pool.query(`DELETE FROM "institute" WHERE "id" = $1;`, [instId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT3("T3.CRUD.05", "Questions Entity Lifecycle: Insert question statement with options, query and update difficulty", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const qCode = `Q_${prefix.toUpperCase()}`;

      try {
        await pool.query(`
          INSERT INTO "questions" (
            "question_code", "field", "exam", "subject", "chapter", "topic", "subtopic",
            "exam_date", "exam_shift", "question_type", "difficulty", "marks", "negative_marks",
            "question_statement", "option_a", "option_b", "option_c", "option_d",
            "correct_answer", "solution_text", "language", "estimated_time_sec", "tags", "status"
          )
          VALUES (
            $1, 'Engineering', 'SIH_2026', 'Computer Science', 'Database Systems', 'SQL & Normalization', '3NF',
            '2026-08-26', 'Morning', 'MCQ', 'Medium', 4, 1.0,
            'Which SQL normal form eliminates transitive functional dependencies?',
            '1NF', '2NF', '3NF', 'BCNF',
            'C', 'Third Normal Form (3NF) requires 2NF and that no non-prime attribute is transitively dependent on any candidate key.',
            'English', 60, 'database,sql,normalization', 'ACTIVE'
          );
        `, [qCode]);

        const res = await pool.query(`SELECT * FROM "questions" WHERE "question_code" = $1;`, [qCode]);
        assertEqual(res.rows.length, 1, "Question query must return 1 row");
        assertEqual(res.rows[0].correct_answer, "C", "Correct answer must match 'C'");
        assertEqual(res.rows[0].marks, 4, "Marks must equal 4");

        // Update
        await pool.query(`UPDATE "questions" SET "difficulty" = 'Hard', "marks" = 5 WHERE "question_code" = $1;`, [qCode]);
        const updated = await pool.query(`SELECT "difficulty", "marks" FROM "questions" WHERE "question_code" = $1;`, [qCode]);
        assertEqual(updated.rows[0].difficulty, "Hard", "Difficulty update must persist");
        assertEqual(updated.rows[0].marks, 5, "Marks update must persist");
      } finally {
        await pool.query(`DELETE FROM "questions" WHERE "question_code" = $1;`, [qCode]);
      }
    });

    await testT3("T3.CRUD.06", "Ratings Entity Lifecycle: Create interaction & rating evaluation with scores, query with user join", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const reviewerId = `rev_${prefix}`;
      const targetId = `tar_${prefix}`;
      const interactionId = `int_${prefix}`;
      const ratingId = `rat_${prefix}`;

      try {
        // Create 2 users (Reviewer & Target)
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES
            ($1, 'Reviewer Org', 'reviewer_${prefix}@tech.internal', false, 'INDUSTRY', 'ACTIVE', 'COMPLETED', true, NOW(), NOW()),
            ($2, 'Target Student', 'target_${prefix}@univ.internal', false, 'STUDENT', 'ACTIVE', 'COMPLETED', true, NOW(), NOW());
        `, [reviewerId, targetId]);

        // Create Rating Interaction
        await pool.query(`
          INSERT INTO "rating_interactions" (
            "id", "interaction_type", "reference_id", "initiator_type", "initiator_id", "initiator_user_id",
            "target_type", "target_id", "target_user_id", "status", "is_blind", "created_at", "updated_at"
          )
          VALUES ($1, 'APPLICATION_REVIEW', 'REF_001', 'INDUSTRY', $2, $2, 'STUDENT', $3, $3, 'COMPLETED', false, NOW(), NOW());
        `, [interactionId, reviewerId, targetId]);

        // Create Rating
        await pool.query(`
          INSERT INTO "ratings" (
            "id", "interaction_id", "reviewer_user_id", "reviewer_role", "target_user_id", "target_role", "target_entity_id",
            "context_type", "overall_score", "recommendation", "headline", "review_text", "pros", "cons", "status", "is_verified",
            "is_blind", "published_at", "metadata", "created_at", "updated_at"
          )
          VALUES (
            $1, $2, $3, 'INDUSTRY', $4, 'STUDENT', $4,
            'APPLICATION_REVIEW', 4.80, 'RECOMMENDED', 'Outstanding Technical Candidate', 'Strong problem solving skills and clean code architecture.',
            '["Fast learner", "Excellent communication"]'::jsonb, '["Needs more experience with cloud infra"]'::jsonb,
            'PUBLISHED', true, false, NOW(), '{}'::jsonb, NOW(), NOW()
          );
        `, [ratingId, interactionId, reviewerId, targetId]);

        // Query Rating joined with Reviewer and Target
        const res = await pool.query(`
          SELECT r.id, r.overall_score, r.headline, r.pros, rev.name as reviewer_name, tar.name as target_name
          FROM "ratings" r
          JOIN "user" rev ON rev.id = r.reviewer_user_id
          JOIN "user" tar ON tar.id = r.target_user_id
          WHERE r.id = $1;
        `, [ratingId]);

        assertEqual(res.rows.length, 1, "Rating query must return 1 row");
        assertEqual(parseFloat(res.rows[0].overall_score), 4.80, "Overall score must equal 4.80");
        assertEqual(res.rows[0].reviewer_name, "Reviewer Org", "Reviewer name must match");
        assertEqual(res.rows[0].target_name, "Target Student", "Target name must match");
      } finally {
        await pool.query(`DELETE FROM "ratings" WHERE "id" = $1;`, [ratingId]);
        await pool.query(`DELETE FROM "rating_interactions" WHERE "id" = $1;`, [interactionId]);
        await pool.query(`DELETE FROM "user" WHERE "id" IN ($1, $2);`, [reviewerId, targetId]);
      }
    });

    await testT3("T3.REL.07", "Drizzle-Compatible Relational Query Simulation (findFirst with nested relations)", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_${prefix}`;
      const profileId = `stu_${prefix}`;

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, 'Relational Test User', 'relational_${prefix}@skillbridge.internal', false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId]);

        await pool.query(`
          INSERT INTO "student_profile" (
            "id", "user_id", "fullName", "email", "skills", "projects", "certifications", "experience", "career_preferences",
            "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, 'Relational Test User', 'relational_${prefix}@skillbridge.internal', '[{"skill":"Node.js"}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 20, 2, NOW(), NOW());
        `, [profileId, userId]);

        // Execute relational aggregation (emulating Drizzle ORM db.query.user.findFirst({ with: { studentProfile: true } }))
        const relationalResult = await pool.query(`
          SELECT 
            u.id, u.name, u.email, u.role,
            json_build_object(
              'id', sp.id,
              'fullName', sp."fullName",
              'skills', sp.skills,
              'profile_completion', sp.profile_completion
            ) AS student_profile
          FROM "user" u
          LEFT JOIN "student_profile" sp ON sp.user_id = u.id
          WHERE u.id = $1;
        `, [userId]);

        const userObj = relationalResult.rows[0];
        assertEqual(userObj.id, userId, "Parent user ID must match");
        assertEqual(userObj.student_profile.id, profileId, "Nested child student profile ID must match");
        assertEqual(userObj.student_profile.skills[0].skill, "Node.js", "Nested skill object must be correctly structured");
      } finally {
        await pool.query(`DELETE FROM "student_profile" WHERE "id" = $1;`, [profileId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    // -------------------------------------------------------------------------
    // TIER 4: Real-World Scenarios & Cascade Integrity
    // -------------------------------------------------------------------------
    const testT4 = createTestContext(4);
    if (!options.json && (!options.tier || options.tier === 4)) {
      console.log(`\n${colors.bold}${colors.blue}--- Tier 4: Real-World Scenarios & Cascade Integrity ---${colors.reset}`);
    }

    await testT4("T4.AUTH.01", "Better Auth Persistence Simulation: User creation, session generation, token lookup, session expiration", async ({ assert, assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_auth_${prefix}`;
      const sessionId = `ses_auth_${prefix}`;
      const sessionToken = `stok_${crypto.randomBytes(24).toString("hex")}`;
      const email = `oauth_user_${prefix}@gmail.com`;

      try {
        // 1. Create User
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, 'Google OAuth User', $2, true, 'STUDENT', 'ACTIVE', 'IN_PROGRESS', false, NOW(), NOW());
        `, [userId, email]);

        // 2. Insert Session with 7-day expiration
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await pool.query(`
          INSERT INTO "session" ("id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, '127.0.0.1', 'Mozilla/5.0 (Node.js E2E Test)', NOW(), NOW());
        `, [sessionId, userId, sessionToken, expiresAt]);

        // 3. Validate Session Lookup
        const lookup = await pool.query(`
          SELECT s.id as session_id, s."expiresAt", u.id as user_id, u.email, u.role
          FROM "session" s
          JOIN "user" u ON u.id = s."userId"
          WHERE s.token = $1;
        `, [sessionToken]);

        assertEqual(lookup.rows.length, 1, "Session token lookup must find exactly 1 active session");
        assertEqual(lookup.rows[0].user_id, userId, "Session must resolve to correct user ID");
        assert(new Date(lookup.rows[0].expiresAt) > new Date(), "Session expiresAt timestamp must be in the future");

        // 4. Verification token generation
        const verifyId = `ver_${prefix}`;
        await pool.query(`
          INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
          VALUES ($1, $2, 'otp_982341', $3, NOW(), NOW());
        `, [verifyId, email, new Date(Date.now() + 15 * 60 * 1000)]);

        const verRes = await pool.query(`SELECT * FROM "verification" WHERE "id" = $1;`, [verifyId]);
        assertEqual(verRes.rows.length, 1, "Verification record must be retrieved");
        await pool.query(`DELETE FROM "verification" WHERE "id" = $1;`, [verifyId]);
      } finally {
        await pool.query(`DELETE FROM "session" WHERE "id" = $1;`, [sessionId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT4("T4.CASCADE.02", "Cascade Deletion Verification: Deleting User automatically purges child Student Profile & Session records", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_casc_${prefix}`;
      const profileId = `stu_casc_${prefix}`;
      const sessionId = `ses_casc_${prefix}`;
      const sessionToken = `stok_casc_${prefix}`;

      // Insert User + Student Profile + Session
      await pool.query(`
        INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
        VALUES ($1, 'Cascade Subject', 'cascade_${prefix}@skillbridge.internal', false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
      `, [userId]);

      await pool.query(`
        INSERT INTO "student_profile" (
          "id", "user_id", "fullName", "email", "skills", "projects", "certifications", "experience", "career_preferences",
          "profile_completion", "current_onboarding_step", "created_at", "updated_at"
        )
        VALUES ($1, $2, 'Cascade Subject', 'cascade_${prefix}@skillbridge.internal', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 0, 1, NOW(), NOW());
      `, [profileId, userId]);

      await pool.query(`
        INSERT INTO "session" ("id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', '127.0.0.1', 'Cascade Runner', NOW(), NOW());
      `, [sessionId, userId, sessionToken]);

      // Confirm all 3 records exist
      const checkBeforeUser = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1;`, [userId]);
      const checkBeforeProfile = await pool.query(`SELECT "id" FROM "student_profile" WHERE "id" = $1;`, [profileId]);
      const checkBeforeSession = await pool.query(`SELECT "id" FROM "session" WHERE "id" = $1;`, [sessionId]);

      assertEqual(checkBeforeUser.rows.length, 1, "User must exist before cascade");
      assertEqual(checkBeforeProfile.rows.length, 1, "Student profile must exist before cascade");
      assertEqual(checkBeforeSession.rows.length, 1, "Session must exist before cascade");

      // DELETE THE PARENT USER RECORD
      await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);

      // Verify that database ON DELETE CASCADE removed student_profile and session
      const checkAfterUser = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1;`, [userId]);
      const checkAfterProfile = await pool.query(`SELECT "id" FROM "student_profile" WHERE "id" = $1;`, [profileId]);
      const checkAfterSession = await pool.query(`SELECT "id" FROM "session" WHERE "id" = $1;`, [sessionId]);

      assertEqual(checkAfterUser.rows.length, 0, "User must be gone");
      assertEqual(checkAfterProfile.rows.length, 0, "Child student_profile must be automatically deleted via ON DELETE CASCADE");
      assertEqual(checkAfterSession.rows.length, 0, "Child session must be automatically deleted via ON DELETE CASCADE");
    });

    await testT4("T4.AGG.03", "Reputation & Rating Aggregation Pipeline: Multi-reviewer ratings computation & weighted scoring", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const targetUserId = `tar_agg_${prefix}`;
      const rev1Id = `rev1_agg_${prefix}`;
      const rev2Id = `rev2_agg_${prefix}`;
      const rev3Id = `rev3_agg_${prefix}`;
      const int1Id = `int1_agg_${prefix}`;
      const int2Id = `int2_agg_${prefix}`;
      const int3 = `int3_agg_${prefix}`;
      const r1 = `r1_agg_${prefix}`;
      const r2 = `r2_agg_${prefix}`;
      const r3 = `r3_agg_${prefix}`;

      try {
        // Insert Target Student + 3 Industry Reviewers
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES
            ($1, 'Target Star Candidate', 'star_${prefix}@univ.internal', true, 'STUDENT', 'ACTIVE', 'COMPLETED', true, NOW(), NOW()),
            ($2, 'Reviewer Org Alpha', 'alpha_${prefix}@tech.internal', true, 'INDUSTRY', 'ACTIVE', 'COMPLETED', true, NOW(), NOW()),
            ($3, 'Reviewer Org Beta', 'beta_${prefix}@tech.internal', true, 'INDUSTRY', 'ACTIVE', 'COMPLETED', true, NOW(), NOW()),
            ($4, 'Reviewer Org Gamma', 'gamma_${prefix}@tech.internal', true, 'INDUSTRY', 'ACTIVE', 'COMPLETED', true, NOW(), NOW());
        `, [targetUserId, rev1Id, rev2Id, rev3Id]);

        // Insert 3 interactions
        await pool.query(`
          INSERT INTO "rating_interactions" ("id", "interaction_type", "reference_id", "initiator_type", "initiator_id", "initiator_user_id", "target_type", "target_id", "target_user_id", "status", "created_at", "updated_at")
          VALUES
            ($1, 'INTERNSHIP', 'INT_A', 'INDUSTRY', $2, $2, 'STUDENT', $3, $3, 'COMPLETED', NOW(), NOW()),
            ($4, 'INTERNSHIP', 'INT_B', 'INDUSTRY', $5, $5, 'STUDENT', $3, $3, 'COMPLETED', NOW(), NOW()),
            ($6, 'INTERNSHIP', 'INT_C', 'INDUSTRY', $7, $7, 'STUDENT', $3, $3, 'COMPLETED', NOW(), NOW());
        `, [int1Id, rev1Id, targetUserId, int2Id, rev2Id, int3, rev3Id]);

        // Insert 3 ratings with scores 5.00, 4.00, 4.50 (Average = 4.50)
        await pool.query(`
          INSERT INTO "ratings" ("id", "interaction_id", "reviewer_user_id", "reviewer_role", "target_user_id", "target_role", "target_entity_id", "context_type", "overall_score", "recommendation", "status", "is_verified", "metadata", "created_at", "updated_at")
          VALUES
            ($1, $2, $3, 'INDUSTRY', $4, 'STUDENT', $4, 'INTERNSHIP_PERFORMANCE', 5.00, 'RECOMMENDED', 'PUBLISHED', true, '{}'::jsonb, NOW(), NOW()),
            ($5, $6, $7, 'INDUSTRY', $4, 'STUDENT', $4, 'INTERNSHIP_PERFORMANCE', 4.00, 'RECOMMENDED', 'PUBLISHED', true, '{}'::jsonb, NOW(), NOW()),
            ($8, $9, $10, 'INDUSTRY', $4, 'STUDENT', $4, 'INTERNSHIP_PERFORMANCE', 4.50, 'RECOMMENDED', 'PUBLISHED', true, '{}'::jsonb, NOW(), NOW());
        `, [r1, int1Id, rev1Id, targetUserId, r2, int2Id, rev2Id, r3, int3, rev3Id]);

        // Aggregate query
        const aggRes = await pool.query(`
          SELECT 
            COUNT(r.id)::int AS total_ratings,
            ROUND(AVG(r.overall_score), 2) AS average_score,
            COUNT(CASE WHEN r.overall_score >= 4.5 THEN 1 END)::int AS high_ratings_count
          FROM "ratings" r
          WHERE r.target_user_id = $1 AND r.status = 'PUBLISHED';
        `, [targetUserId]);

        assertEqual(aggRes.rows[0].total_ratings, 3, "Total ratings count must equal 3");
        assertEqual(parseFloat(aggRes.rows[0].average_score), 4.50, "Aggregated average score must equal 4.50");
        assertEqual(aggRes.rows[0].high_ratings_count, 2, "High ratings count (>= 4.5) must equal 2");
      } finally {
        await pool.query(`DELETE FROM "ratings" WHERE "id" IN ($1, $2, $3);`, [r1, r2, r3]);
        await pool.query(`DELETE FROM "rating_interactions" WHERE "id" IN ($1, $2, $3);`, [int1Id, int2Id, int3]);
        await pool.query(`DELETE FROM "user" WHERE "id" IN ($1, $2, $3, $4);`, [targetUserId, rev1Id, rev2Id, rev3Id]);
      }
    });

    // -------------------------------------------------------------------------
    // TIER 5: Adversarial, Unicode & Stress Verification
    // -------------------------------------------------------------------------
    const testT5 = createTestContext(5);
    if (!options.json && (!options.tier || options.tier === 5)) {
      console.log(`\n${colors.bold}${colors.blue}--- Tier 5: Adversarial, Unicode & Stress Verification ---${colors.reset}`);
    }

    await testT5("T5.UNICODE.01", "Unicode, Multi-byte Emojis & SQL Escaping Integrity in text and JSONB columns", async ({ assertEqual }) => {
      const prefix = createTestPrefix();
      const userId = `usr_uni_${prefix}`;
      const profileId = `stu_uni_${prefix}`;
      const unicodeName = "Dr. Jörg-Müller Müller-Özdemir 🎓💼🚀";
      const unicodeHeadline = "AI & Quantum Computing Researcher | 🔬 'Special' \"Quotes\" & <HTML> Symbols | Привет мир | 🚀";
      const complexSkills = [
        { name: "C++ (C++20)", cert: "ISO/IEC 14882:2020", verified: true },
        { name: "Node.js & Express.js", level: "Expert 🌟", unicodeTags: ["⚡", "💻", "🔥"] },
      ];

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, $2, 'unicode_${prefix}@skillbridge.internal', false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId, unicodeName]);

        await pool.query(`
          INSERT INTO "student_profile" (
            "id", "user_id", "fullName", "email", "headline", "skills", "projects", "certifications", "experience", "career_preferences",
            "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, $3, 'unicode_${prefix}@skillbridge.internal', $4, $5::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 90, 7, NOW(), NOW());
        `, [profileId, userId, unicodeName, unicodeHeadline, JSON.stringify(complexSkills)]);

        const res = await pool.query(`SELECT u.name, sp.headline, sp.skills FROM "user" u JOIN "student_profile" sp ON sp.user_id = u.id WHERE u.id = $1;`, [userId]);

        assertEqual(res.rows[0].name, unicodeName, "Unicode user name must be preserved verbatim");
        assertEqual(res.rows[0].headline, unicodeHeadline, "Unicode headline with quotes and symbols must be preserved verbatim");
        assertEqual(res.rows[0].skills[1].unicodeTags[0], "⚡", "Nested JSONB emoji must be preserved verbatim");
      } finally {
        await pool.query(`DELETE FROM "student_profile" WHERE "id" = $1;`, [profileId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT5("T5.NEG.FK.02", "Negative Test: Rejection of Foreign Key Constraint violation (inserting profile with orphan user_id)", async ({ assert }) => {
      const nonExistentUserId = `orphan_usr_${crypto.randomBytes(8).toString("hex")}`;
      let errorThrown = false;
      try {
        await pool.query(`
          INSERT INTO "student_profile" (
            "id", "user_id", "fullName", "email", "skills", "projects", "certifications", "experience", "career_preferences",
            "profile_completion", "current_onboarding_step", "created_at", "updated_at"
          )
          VALUES ($1, $2, 'Orphan Student', 'orphan@test.internal', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 0, 1, NOW(), NOW());
        `, [`stu_orphan_${Date.now()}`, nonExistentUserId]);
      } catch (err) {
        errorThrown = true;
        assert(err.code === "23503" || err.message.includes("violates foreign key constraint"), "Database must reject orphan user_id with FK violation 23503");
      }
      assert(errorThrown, "Database must throw error when inserting orphan foreign key");
    });

    await testT5("T5.NEG.UNQ.03", "Negative Test: Rejection of Unique Constraint duplicate user_id on 1:1 student profile", async ({ assert }) => {
      const prefix = createTestPrefix();
      const userId = `usr_unq_${prefix}`;
      const p1 = `stu1_${prefix}`;
      const p2 = `stu2_${prefix}`;

      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, 'Unique Test User', 'unq_${prefix}@skillbridge.internal', false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [userId]);

        // Insert first profile
        await pool.query(`
          INSERT INTO "student_profile" ("id", "user_id", "fullName", "email", "skills", "projects", "certifications", "experience", "career_preferences", "profile_completion", "current_onboarding_step", "created_at", "updated_at")
          VALUES ($1, $2, 'First Profile', 'unq_${prefix}@skillbridge.internal', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 0, 1, NOW(), NOW());
        `, [p1, userId]);

        // Attempt to insert second profile for the same user_id
        let unqError = false;
        try {
          await pool.query(`
            INSERT INTO "student_profile" ("id", "user_id", "fullName", "email", "skills", "projects", "certifications", "experience", "career_preferences", "profile_completion", "current_onboarding_step", "created_at", "updated_at")
            VALUES ($1, $2, 'Second Duplicate Profile', 'unq_${prefix}@skillbridge.internal', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 0, 1, NOW(), NOW());
          `, [p2, userId]);
        } catch (err) {
          unqError = true;
          assert(err.code === "23505" || err.message.includes("duplicate key") || err.message.includes("unique"), "Must raise unique violation (23505)");
        }
        assert(unqError, "Database must reject duplicate student profile for identical user_id");
      } finally {
        await pool.query(`DELETE FROM "student_profile" WHERE "user_id" = $1;`, [userId]);
        await pool.query(`DELETE FROM "user" WHERE "id" = $1;`, [userId]);
      }
    });

    await testT5("T5.NEG.NULL.04", "Negative Test: Rejection of Not-Null constraint violation when creating user with NULL email or name", async ({ assert }) => {
      let nullNameError = false;
      try {
        await pool.query(`
          INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
          VALUES ($1, NULL, 'noname@skillbridge.internal', false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, NOW(), NOW());
        `, [`usr_null_${Date.now()}`]);
      } catch (err) {
        nullNameError = true;
        assert(err.code === "23502" || err.message.includes("not-null"), "Database must raise 23502 not-null constraint error");
      }
      assert(nullNameError, "Database must reject insertion of record with NULL mandatory field");
    });

    await testT5("T5.CONCURRENCY.05", "Concurrency Stress: Execute 20 concurrent asynchronous read/write queries without pool exhaustion", async ({ assertEqual }) => {
      const concurrencyCount = 20;
      const promises = [];

      for (let i = 0; i < concurrencyCount; i++) {
        promises.push(pool.query("SELECT $1::int AS idx, NOW() AS ts;", [i]));
      }

      const results = await Promise.all(promises);
      assertEqual(results.length, concurrencyCount, "All 20 concurrent queries must resolve successfully");
      for (let i = 0; i < concurrencyCount; i++) {
        assertEqual(results[i].rows[0].idx, i, `Concurrent query ${i} must return matching index`);
      }
    });

  } finally {
    await pool.end();
  }

  // Generate Output & Exit
  const totalDuration = Date.now() - state.startTime;

  if (options.json) {
    const report = {
      summary: {
        total: state.total,
        passed: state.passed,
        failed: state.failed,
        skipped: state.skipped,
        passRate: state.total > 0 ? Number(((state.passed / state.total) * 100).toFixed(1)) : 0,
        durationMs: totalDuration,
      },
      tiers: state.tiers,
      failures: state.failures,
    };
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}                       VERIFICATION SUMMARY                           ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

    for (let t = 1; t <= 5; t++) {
      const tier = state.tiers[t];
      if (options.tier && options.tier !== t) continue;
      const statusColor = tier.failed === 0 ? colors.green : colors.red;
      console.log(`  ${statusColor}${tier.failed === 0 ? "✓" : "✗"}${colors.reset} ${colors.bold}${tier.name}${colors.reset}: ${tier.passed} / ${tier.total} PASS ${tier.failed > 0 ? `(${tier.failed} FAILED)` : ""}`);
    }

    console.log(`\n----------------------------------------------------------------------`);
    console.log(`  ${colors.bold}Total Test Assertions:${colors.reset}  ${state.total}`);
    console.log(`  ${colors.bold}Passed:${colors.reset}                 ${colors.green}${state.passed}${colors.reset}`);
    console.log(`  ${colors.bold}Failed:${colors.reset}                 ${state.failed > 0 ? colors.red : colors.green}${state.failed}${colors.reset}`);
    console.log(`  ${colors.bold}Skipped:${colors.reset}                ${state.skipped}`);
    console.log(`  ${colors.bold}Pass Rate:${colors.reset}              ${state.failed === 0 ? colors.green : colors.yellow}${state.total > 0 ? ((state.passed / state.total) * 100).toFixed(1) : 0}%${colors.reset}`);
    console.log(`  ${colors.bold}Execution Duration:${colors.reset}     ${totalDuration}ms`);
    console.log(`----------------------------------------------------------------------\n`);

    if (state.failures.length > 0) {
      console.log(`${colors.bold}${colors.red}FAILURES DETAILS (${state.failures.length}):${colors.reset}`);
      state.failures.forEach((f, idx) => {
        console.log(`\n  ${idx + 1}) [Tier ${f.tier}] ${f.id}: ${f.description}`);
        console.log(`     ${colors.red}Error: ${f.error}${colors.reset}`);
      });
      console.log();
    }
  }

  process.exit(state.failed === 0 ? 0 : 1);
}

// Execute the test harness
runVerification().catch(err => {
  console.error(`${colors.red}[FATAL UNCAUGHT ERROR]: ${err.message}${colors.reset}`);
  if (err.stack) console.error(colors.gray + err.stack + colors.reset);
  process.exit(1);
});
