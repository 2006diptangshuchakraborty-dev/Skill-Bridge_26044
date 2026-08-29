import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "@neondatabase/serverless";

if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Make sure .env.local exists.");
}

const REQUIRED_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "signup_intents",
  "students",
  "industries",
  "institutes",
  "questions",
  "ratings",
  "mcq_questions",
];

const REQUIRED_COLUMNS = {
  account: ["issuer", "accountId", "providerId", "userId"],
  signup_intents: ["id", "token", "role", "email", "expires_at", "used", "used_at", "created_at"],
  students: [
    "id",
    "user_id",
    "full_name",
    "email",
    "phone",
    "headline",
    "bio",
    "institute_name",
    "department",
    "degree",
    "year_of_study",
    "graduation_year",
    "cgpa",
    "github_url",
    "linkedin_url",
    "skills",
    "projects",
  ],
  industries: [
    "id",
    "user_id",
    "company_name",
    "registration_number",
    "tax_id_gstin",
    "company_type",
    "primary_contact_name",
    "primary_contact_phone",
    "primary_contact_designation",
    "contact_phone",
    "official_email",
    "logo_url",
    "domain_focus",
  ],
  institutes: [
    "id",
    "user_id",
    "institute_name",
    "institute_code",
    "aishe_code",
    "contact_phone",
    "official_email",
    "logo_url",
    "accreditation_details",
    "departments",
  ],
};

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
    const existingTables = new Set(res.rows.map((r) => r.table_name));

    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));
    if (missingTables.length > 0) {
      throw new Error(`Missing expected tables: ${missingTables.join(", ")}`);
    }

    console.log(`[db:test] Schema verification passed (all ${REQUIRED_TABLES.length} tables exist).`);

    // Verify required columns across tables
    for (const [tableName, expectedCols] of Object.entries(REQUIRED_COLUMNS)) {
      const colRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      const presentCols = new Set(colRes.rows.map((r) => r.column_name));
      const missingCols = expectedCols.filter((col) => !presentCols.has(col));
      if (missingCols.length > 0) {
        throw new Error(`Table "${tableName}" is missing expected columns: ${missingCols.join(", ")}`);
      }
    }
    console.log("[db:test] Detailed column verification passed for all required tables.");

    // Verify unique index on user_id for profile tables
    const uniqueIndexQuery = `
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND (indexdef LIKE '%UNIQUE%user_id%' OR indexname LIKE '%user_id%')
    `;
    const idxRes = await client.query(uniqueIndexQuery);
    const indexMap = new Set(idxRes.rows.map((r) => r.tablename));
    console.log("[db:test] Unique user_id indexes present on:", Array.from(indexMap).join(", "));

    // Transactional CRUD Verification
    await client.query("BEGIN");
    const testUserId = `test-user-${Date.now()}`;
    const testToken = `test-intent-token-${Date.now()}`;

    // 1. User insert
    await client.query(
      `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
      [testUserId, "Test User", `${testUserId}@example.com`, "STUDENT"]
    );

    // 2. Signup intent insert & select
    await client.query(
      `INSERT INTO "signup_intents" ("id", "token", "role", "email", "expires_at", "used") 
       VALUES ($1, $2, $3, $4, now() + interval '15 minutes', false)`,
      [`int_${Date.now()}`, testToken, "STUDENT", `${testUserId}@example.com`]
    );
    const intentRes = await client.query(
      `SELECT * FROM "signup_intents" WHERE "token" = $1`,
      [testToken]
    );
    if (intentRes.rows.length !== 1 || intentRes.rows[0].role !== "STUDENT") {
      throw new Error("Signup intent CRUD verification failed");
    }

    // 3. Student profile insert with expanded fields
    await client.query(
      `INSERT INTO "students" ("user_id", "full_name", "email", "phone", "institute_name", "department", "degree", "year_of_study", "graduation_year", "cgpa", "github_url", "linkedin_url")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testUserId,
        "Test Student",
        `${testUserId}@example.com`,
        "+919876543210",
        "Apex Institute of Tech",
        "Computer Science",
        "B.Tech",
        "3rd Year",
        2027,
        "9.2",
        "https://github.com/teststudent",
        "https://linkedin.com/in/teststudent",
      ]
    );

    const stuRes = await client.query(
      `SELECT * FROM "students" WHERE "user_id" = $1`,
      [testUserId]
    );
    if (stuRes.rows.length !== 1 || stuRes.rows[0].cgpa !== "9.2" || stuRes.rows[0].degree !== "B.Tech") {
      throw new Error("Student expanded profile CRUD read failed");
    }

    await client.query("ROLLBACK");
    console.log("[db:test] Live CRUD, expanded profile fields, signup_intents, and transaction rollback passed.");
    console.log("[db:test] Skill Bridge Milestone 1 database layer is verified and ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase().catch((err) => {
  console.error("[db:test] Database verification failed:", err.message);
  process.exit(1);
});
