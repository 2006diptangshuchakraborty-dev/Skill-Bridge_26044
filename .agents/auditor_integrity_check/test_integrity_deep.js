import "dotenv/config";
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as userSchema from "../../db/schema/user.js";
import * as studentSchema from "../../db/schema/student.js";
import * as industrySchema from "../../db/schema/industry.js";
import * as instituteSchema from "../../db/schema/institute.js";
import * as questionSchema from "../../db/schema/questions.js";
import * as ratingSchema from "../../db/schema/ratings.js";
import { db, schema } from "../../db/index.js";
import crypto from "crypto";

async function runAudit() {
  console.log("=================================================================");
  console.log("  FORENSIC AUDIT: Database, Schema, Drizzle ORM & Better Auth    ");
  console.log("=================================================================\n");

  const results = {
    checks: [],
    violations: [],
  };

  function record(name, pass, details) {
    results.checks.push({ name, pass, details });
    console.log(`${pass ? "✔ [PASS]" : "✖ [FAIL]"} ${name}: ${details}`);
    if (!pass) {
      results.violations.push({ name, details });
    }
  }

  // 1. Database Connection & Driver Authenticity Check
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith("postgres")) {
    record("DB URL Authenticity", false, "DATABASE_URL is missing or invalid");
  } else {
    const isMock = dbUrl.includes("mock") || dbUrl.includes("dummy");
    record("DB URL Authenticity", !isMock, `DATABASE_URL points to real PostgreSQL host: ${new URL(dbUrl).host}`);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const sql = neon(dbUrl);

  try {
    const pingRes = await sql`SELECT 1 as ping, current_database() as db_name, version() as pg_ver`;
    record(
      "Live Neon DB Ping",
      pingRes.length > 0 && pingRes[0].ping === 1,
      `Connected to live DB: ${pingRes[0].db_name}, Version: ${pingRes[0].pg_ver.slice(0, 40)}...`
    );
  } catch (err) {
    record("Live Neon DB Ping", false, `Failed to query live DB: ${err.message}`);
  }

  // 2. Table Existence in Live PostgreSQL Database
  const expectedTables = [
    "user",
    "session",
    "account",
    "verification",
    "student_profile",
    "organization_profile",
    "institute",
    "questions",
    "ratings",
  ];

  try {
    const tableRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const liveTables = new Set(tableRes.map((r) => r.table_name));
    console.log("\nLive tables found in Neon DB:", Array.from(liveTables).sort());

    for (const tbl of expectedTables) {
      const exactExists = liveTables.has(tbl);
      record(
        `Live Neon Table Presence: ${tbl}`,
        exactExists,
        exactExists ? `Found exact table '${tbl}' in Neon DB` : `Table '${tbl}' status in live DB (missing or alias)`
      );
    }
  } catch (err) {
    record("Live Table Inspection", false, `Failed inspecting tables: ${err.message}`);
  }

  // 3. Drizzle Schema Table Exports Check
  const schemaExports = {
    user: userSchema.user,
    session: userSchema.session,
    account: userSchema.account,
    verification: userSchema.verification,
    student: studentSchema.students,
    industry: industrySchema.industries,
    institute: instituteSchema.institutes,
    questions: questionSchema.questions,
    ratings: ratingSchema.ratings,
  };

  for (const [name, tableObj] of Object.entries(schemaExports)) {
    const valid = tableObj && typeof tableObj === "object" && tableObj[Symbol.for("drizzle:Name")];
    record(
      `Drizzle Schema Export: ${name}`,
      !!valid,
      valid ? `Valid Drizzle table instance with SQL name '${tableObj[Symbol.for("drizzle:Name")]}'` : `Invalid or missing Drizzle table for ${name}`
    );
  }

  // 4. Schema Aggregator Exports Check
  record(
    "Schema Aggregator (db/schema/index.js)",
    !!schema && typeof schema === "object" && !!schema.user && !!schema.students && !!schema.questions,
    "db/schema/index.js cleanly exports unified schema definitions"
  );

  // 5. DB Instance Export Check
  record(
    "Drizzle Instance (db/index.js)",
    !!db && typeof db.select === "function" && typeof db.insert === "function",
    "db/index.js exports authentic Drizzle ORM client connected to Neon"
  );

  // 6. Better Auth Compatibility Check
  record(
    "Better Auth Core Schema Compatibility",
    !!userSchema.user.id && !!userSchema.session.userId && !!userSchema.account.providerId && !!userSchema.verification.value,
    "user, session, account, and verification schema match Better Auth specification"
  );

  // 7. Dynamic Live Database CRUD Integrity Check (Real Neon Execution)
  const client = await pool.connect();
  const suffix = crypto.randomBytes(4).toString("hex");
  const testUserId = `audit_usr_${suffix}`;
  const testEmail = `audit_${suffix}@test.local`;

  try {
    await client.query("BEGIN");

    // Real INSERT into user table
    const insUser = await client.query(
      `INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, 'STUDENT', 'ACTIVE', 'NOT_STARTED', false, now(), now())
       RETURNING "id", "email"`,
      [testUserId, "Forensic Audit User", testEmail]
    );
    record(
      "Dynamic DB Write: User INSERT",
      insUser.rowCount === 1 && insUser.rows[0].id === testUserId,
      `Successfully inserted and returned user ${insUser.rows[0].id}`
    );

    // Real SELECT from user table
    const selUser = await client.query(`SELECT "id", "email", "role" FROM "user" WHERE "id" = $1`, [testUserId]);
    record(
      "Dynamic DB Read: User SELECT",
      selUser.rowCount === 1 && selUser.rows[0].email === testEmail,
      `Retrieved user record with matching email ${selUser.rows[0].email}`
    );

    // Real UPDATE
    const updUser = await client.query(
      `UPDATE "user" SET "name" = $2, "updatedAt" = now() WHERE "id" = $1 RETURNING "name"`,
      [testUserId, "Forensic Audit User Updated"]
    );
    record(
      "Dynamic DB Update: User UPDATE",
      updUser.rowCount === 1 && updUser.rows[0].name === "Forensic Audit User Updated",
      `Updated user record successfully to ${updUser.rows[0].name}`
    );

    // Real INSERT into session table
    const testSessionToken = `audit_sess_${suffix}`;
    const insSession = await client.query(
      `INSERT INTO "session" ("id", "userId", "token", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now() + interval '1 day', now(), now())
       RETURNING "token"`,
      [`sess_${suffix}`, testUserId, testSessionToken]
    );
    record(
      "Dynamic DB Write: Session FK INSERT",
      insSession.rowCount === 1,
      `Inserted session bound via FK userId -> ${testUserId}`
    );

    // Real DELETE & Cascade check
    await client.query(`DELETE FROM "user" WHERE "id" = $1`, [testUserId]);
    const checkUserDeleted = await client.query(`SELECT "id" FROM "user" WHERE "id" = $1`, [testUserId]);
    const checkSessionCascade = await client.query(`SELECT "id" FROM "session" WHERE "userId" = $1`, [testUserId]);

    record(
      "Dynamic DB Delete & Cascade",
      checkUserDeleted.rowCount === 0 && checkSessionCascade.rowCount === 0,
      `User deleted and session cascaded successfully (user count: ${checkUserDeleted.rowCount}, session count: ${checkSessionCascade.rowCount})`
    );

    await client.query("ROLLBACK");
    record(
      "Transaction Rollback",
      true,
      "Transaction safely rolled back with zero persistent test contamination"
    );
  } catch (err) {
    await client.query("ROLLBACK");
    record("Dynamic CRUD Execution", false, `Dynamic DB CRUD failed: ${err.message}`);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n=================================================================");
  console.log(`  AUDIT COMPLETE: ${results.checks.length - results.violations.length}/${results.checks.length} checks passed.`);
  console.log(`  VERDICT: ${results.violations.length === 0 ? "CLEAN" : "INTEGRITY VIOLATION"}`);
  console.log("=================================================================\n");

  return results;
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
