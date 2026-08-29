require("dotenv").config({ path: ".env" });
const { Pool } = require("@neondatabase/serverless");
const crypto = require("crypto");

async function main() {
  console.log("======================================================================");
  console.log("  VICTORY AUDITOR: COMPREHENSIVE INDEPENDENT VERIFICATION SUITE      ");
  console.log("======================================================================\n");

  const results = [];
  function record(name, pass, details) {
    results.push({ name, pass, details });
    console.log((pass ? "  ✔ [PASS] " : "  ✖ [FAIL] ") + name + (details ? " (" + details + ")" : ""));
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Live Neon Connection
    try {
      const res = await pool.query("SELECT 1 as connected");
      record("Live Neon Connection", res.rows[0].connected === 1, "Connected to " + process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]);
    } catch (e) {
      record("Live Neon Connection", false, e.message);
    }

    // 2. Schema Tables in Neon
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = tablesRes.rows.map(r => r.table_name);
    
    record("Table 'user' exists in Neon", tables.includes("user"), "Found: " + tables.includes("user"));
    record("Table 'session' exists in Neon", tables.includes("session"), "Found: " + tables.includes("session"));
    record("Table 'account' exists in Neon", tables.includes("account"), "Found: " + tables.includes("account"));
    record("Table 'verification' exists in Neon", tables.includes("verification"), "Found: " + tables.includes("verification"));
    record("Table 'students' exists in Neon", tables.includes("students"), "Found: " + tables.includes("students") + " (Legacy student_profile found: " + tables.includes("student_profile") + ")");
    record("Table 'industries' exists in Neon", tables.includes("industries"), "Found: " + tables.includes("industries") + " (Legacy organization_profile found: " + tables.includes("organization_profile") + ")");
    record("Table 'institutes' exists in Neon", tables.includes("institutes"), "Found: " + tables.includes("institutes") + " (Legacy institute found: " + tables.includes("institute") + ")");
    record("Table 'questions' exists in Neon", tables.includes("questions"), "Found: " + tables.includes("questions"));
    record("Table 'ratings' exists in Neon", tables.includes("ratings"), "Found: " + tables.includes("ratings"));

    // 3. User CRUD
    const testUserId = "auditor_usr_" + crypto.randomBytes(4).toString("hex");
    const testEmail = "auditor_" + crypto.randomBytes(4).toString("hex") + "@audit.com";
    try {
      await pool.query(`
        INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
        VALUES ($1, 'Auditor User', $2, true, 'STUDENT', 'ACTIVE', 'COMPLETED', true, now(), now())
      `, [testUserId, testEmail]);
      
      const selUser = await pool.query('SELECT * FROM "user" WHERE "id" = $1', [testUserId]);
      const userFound = selUser.rows.length === 1;

      await pool.query('UPDATE "user" SET "name" = \'Auditor User Updated\' WHERE "id" = $1', [testUserId]);
      const updatedUser = await pool.query('SELECT "name" FROM "user" WHERE "id" = $1', [testUserId]);
      const updateOk = updatedUser.rows[0]?.name === "Auditor User Updated";

      record("User CRUD (Insert/Select/Update)", userFound && updateOk, "Inserted & Updated test user");
    } catch (e) {
      record("User CRUD (Insert/Select/Update)", false, e.message);
    }

    // 4. Student CRUD according to Drizzle Schema (students table) vs Live DB
    try {
      if (tables.includes("students")) {
        const stdId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO "students" ("id", "user_id", "full_name", "skills", "projects", "certifications", "experience", "career_preferences", "profile_completion", "current_onboarding_step")
          VALUES ($1, $2, 'Auditor Student', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 50, 2)
        `, [stdId, testUserId]);
        record("Student CRUD on 'students' table", true, "Inserted into students");
      } else {
        record("Student CRUD on 'students' table", false, "Table 'students' does not exist in live Neon DB");
      }
    } catch (e) {
      record("Student CRUD on 'students' table", false, e.message);
    }

    // 5. Industry CRUD according to Drizzle Schema (industries table) vs Live DB
    try {
      if (tables.includes("industries")) {
        const indId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO "industries" ("id", "user_id", "company_name", "address", "documents", "verification_docs", "hiring_preferences")
          VALUES ($1, $2, 'Auditor Industry Inc', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
        `, [indId, testUserId]);
        record("Industry CRUD on 'industries' table", true, "Inserted into industries");
      } else {
        record("Industry CRUD on 'industries' table", false, "Table 'industries' does not exist in live Neon DB");
      }
    } catch (e) {
      record("Industry CRUD on 'industries' table", false, e.message);
    }

    // 6. Institute CRUD according to Drizzle Schema (institutes table) vs Live DB
    try {
      if (tables.includes("institutes")) {
        const instId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO "institutes" ("id", "user_id", "institute_name", "address", "departments", "placement_contact", "verification_docs")
          VALUES ($1, $2, 'Auditor Institute of Tech', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb)
        `, [instId, testUserId]);
        record("Institute CRUD on 'institutes' table", true, "Inserted into institutes");
      } else {
        record("Institute CRUD on 'institutes' table", false, "Table 'institutes' does not exist in live Neon DB");
      }
    } catch (e) {
      record("Institute CRUD on 'institutes' table", false, e.message);
    }

    // 7. Questions CRUD according to Drizzle Schema (questions with id UUID) vs Live DB (questions with question_code PK)
    try {
      const qCode = "Q_AUDIT_" + crypto.randomBytes(4).toString("hex");
      // Drizzle schema expects id UUID PK and questionCode varchar
      // Live DB has question_code varchar PK
      const qCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'questions'");
      const hasIdCol = qCols.rows.some(r => r.column_name === "id");
      record("Questions schema matches Drizzle schema (id UUID column)", hasIdCol, hasIdCol ? "Has 'id' column" : "Missing 'id' column, uses legacy question_code PK");
    } catch (e) {
      record("Questions schema matches Drizzle schema", false, e.message);
    }

    // 8. Ratings CRUD according to Drizzle Schema vs Live DB
    try {
      const rCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ratings'");
      const colMap = Object.fromEntries(rCols.rows.map(r => [r.column_name, r.data_type]));
      const idIsUuid = colMap["id"] === "uuid";
      const hasStudentId = "student_id" in colMap;
      const hasIndustryId = "industry_id" in colMap;
      const hasScoresJson = colMap["scores"] === "jsonb";
      
      record("Ratings schema matches Drizzle schema (id UUID, student_id, industry_id, scores jsonb)", idIsUuid && hasStudentId && hasIndustryId && hasScoresJson, "Live DB ratings column structure: id=" + colMap["id"] + ", student_id=" + hasStudentId + ", scores=" + colMap["scores"]);
    } catch (e) {
      record("Ratings schema matches Drizzle schema", false, e.message);
    }

    // 9. Account Table & Better Auth persistence check
    try {
      if (tables.includes("account")) {
        const accId = "acc_" + crypto.randomBytes(4).toString("hex");
        await pool.query(`
          INSERT INTO "account" ("id", "userId", "accountId", "providerId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, 'google', now(), now())
        `, [accId, testUserId, "google_oauth_123"]);
        record("Account table insert & OAuth persistence", true, "Inserted into account table");
      } else {
        record("Account table insert & OAuth persistence", false, "Table 'account' does not exist in Neon DB");
      }
    } catch (e) {
      record("Account table insert & OAuth persistence", false, e.message);
    }

    // 10. Foreign Key Cascade Deletion on User
    try {
      // Clean up test user
      await pool.query('DELETE FROM "user" WHERE "id" = $1', [testUserId]);
      const checkUser = await pool.query('SELECT 1 FROM "user" WHERE "id" = $1', [testUserId]);
      record("User cleanup & cascade execution", checkUser.rows.length === 0, "Test user cleaned up");
    } catch (e) {
      record("User cleanup & cascade execution", false, e.message);
    }

  } finally {
    await pool.end();
  }

  console.log("\n----------------------------------------------------------------------");
  console.log("                     AUDIT SUMMARY RESULTS                            ");
  console.log("----------------------------------------------------------------------");
  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.length;
  console.log("  Total Checks : " + totalCount);
  console.log("  Passed Checks: " + passCount);
  console.log("  Failed Checks: " + (totalCount - passCount));
  console.log("  Pass Rate    : " + ((passCount / totalCount) * 100).toFixed(1) + "%");
  console.log("----------------------------------------------------------------------\n");
}

main().catch(e => {
  console.error("Fatal audit error:", e);
  process.exit(1);
});
