require("dotenv").config({ path: ".env" });
const { Pool } = require("@neondatabase/serverless");
const crypto = require("crypto");

async function runIndependentAudit() {
  console.log("======================================================================");
  console.log("  INDEPENDENT FORENSIC LIVE NEON DB & SCHEMA AUDIT (Round 9 Final)    ");
  console.log("======================================================================\n");

  const results = [];
  function record(name, pass, details) {
    results.push({ name, pass, details });
    const statusTag = pass ? "  ✔ [PASS] " : "  ✖ [FAIL] ";
    console.log(`${statusTag}${name}${details ? ` (${details})` : ""}`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Live Neon Connection
    try {
      const connRes = await pool.query("SELECT current_database() as db, current_user as usr, version() as ver");
      const dbInfo = connRes.rows[0];
      record("Live Neon DB Connection", !!dbInfo.db, `DB: ${dbInfo.db}, User: ${dbInfo.usr}`);
    } catch (e) {
      record("Live Neon DB Connection", false, e.message);
    }

    // 2. Canonical Tables in Live DB
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));

    const CANONICAL_TABLES = [
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

    for (const table of CANONICAL_TABLES) {
      record(`Canonical Table '${table}' exists in live DB`, existingTables.has(table), existingTables.has(table) ? "Present" : "Missing");
    }

    // 3. Schema & Column Definitions Inspection
    async function getColumns(tableName) {
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      const map = {};
      res.rows.forEach(r => { map[r.column_name] = r.data_type; });
      return map;
    }

    // Table: user
    const userCols = await getColumns("user");
    const userValid = userCols["id"] === "text" &&
                      userCols["email"] === "text" &&
                      userCols["name"] === "text" &&
                      userCols["role"] === "USER-DEFINED"; // pgEnum
    record("Table 'user' column schema & types", userValid, `id=${userCols["id"]}, email=${userCols["email"]}, role=${userCols["role"]}`);

    // Table: session
    const sessionCols = await getColumns("session");
    const sessionValid = sessionCols["id"] === "text" &&
                         sessionCols["userId"] === "text" &&
                         sessionCols["token"] === "text";
    record("Table 'session' column schema & types", sessionValid, `id=${sessionCols["id"]}, userId=${sessionCols["userId"]}`);

    // Table: account
    const accountCols = await getColumns("account");
    const accountValid = accountCols["id"] === "text" &&
                          accountCols["userId"] === "text" &&
                          accountCols["providerId"] === "text" &&
                          accountCols["accountId"] === "text";
    record("Table 'account' column schema & types", accountValid, `id=${accountCols["id"]}, providerId=${accountCols["providerId"]}`);

    // Table: verification
    const verCols = await getColumns("verification");
    const verValid = verCols["id"] === "text" &&
                     verCols["identifier"] === "text" &&
                     verCols["value"] === "text";
    record("Table 'verification' column schema & types", verValid, `id=${verCols["id"]}, identifier=${verCols["identifier"]}`);

    // Table: students
    const studentCols = await getColumns("students");
    const studentValid = studentCols["id"] === "uuid" &&
                         studentCols["user_id"] === "text" &&
                         studentCols["skills"] === "jsonb";
    record("Table 'students' column schema & UUID PK", studentValid, `id=${studentCols["id"]}, user_id=${studentCols["user_id"]}, skills=${studentCols["skills"]}`);

    // Table: industries
    const indCols = await getColumns("industries");
    const indValid = indCols["id"] === "uuid" &&
                     indCols["user_id"] === "text" &&
                     indCols["company_name"] === "text";
    record("Table 'industries' column schema & UUID PK", indValid, `id=${indCols["id"]}, user_id=${indCols["user_id"]}, company_name=${indCols["company_name"]}`);

    // Table: institutes
    const instCols = await getColumns("institutes");
    const instValid = instCols["id"] === "uuid" &&
                      instCols["user_id"] === "text" &&
                      instCols["institute_name"] === "text";
    record("Table 'institutes' column schema & UUID PK", instValid, `id=${instCols["id"]}, user_id=${instCols["user_id"]}, institute_name=${instCols["institute_name"]}`);

    // Table: questions
    const qCols = await getColumns("questions");
    const qValid = qCols["id"] === "uuid" &&
                   qCols["industry_id"] === "uuid" &&
                   qCols["student_id"] === "uuid" &&
                   qCols["title"] === "text";
    record("Table 'questions' column schema & UUID PK/FKs", qValid, `id=${qCols["id"]}, industry_id=${qCols["industry_id"]}, student_id=${qCols["student_id"]}`);

    // Table: ratings
    const rCols = await getColumns("ratings");
    const rValid = rCols["id"] === "uuid" &&
                   rCols["question_id"] === "uuid" &&
                   rCols["user_id"] === "text" &&
                   rCols["student_id"] === "uuid" &&
                   rCols["industry_id"] === "uuid" &&
                   rCols["scores"] === "jsonb";
    record("Table 'ratings' column schema & UUID PK/FKs", rValid, `id=${rCols["id"]}, scores=${rCols["scores"]}`);

    // 4. Live Multi-Entity CRUD and Cascade Deletion Testing
    const suffix = crypto.randomBytes(4).toString("hex");
    const testUserId = `aud9_usr_${suffix}`;
    const testUserEmail = `aud9_${suffix}@example.com`;
    const testSessionId = `aud9_ses_${suffix}`;
    const testAccountId = `aud9_acc_${suffix}`;
    const testVerId = `aud9_ver_${suffix}`;
    const testStudentId = crypto.randomUUID();
    const testIndustryId = crypto.randomUUID();
    const testInstituteId = crypto.randomUUID();
    const testQuestionId = crypto.randomUUID();
    const testRatingId = crypto.randomUUID();

    try {
      // 4.1 Insert User
      await pool.query(`
        INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "account_status", "onboarding_status", "profile_completed", "createdAt", "updatedAt")
        VALUES ($1, 'Round 9 Audit User', $2, true, 'STUDENT', 'ACTIVE', 'COMPLETED', true, now(), now())
      `, [testUserId, testUserEmail]);

      // 4.2 Insert Session
      await pool.query(`
        INSERT INTO "session" ("id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, now() + interval '1 day', '127.0.0.1', 'AuditAgent/9.0', now(), now())
      `, [testSessionId, testUserId, `token_${suffix}`]);

      // 4.3 Insert Account
      await pool.query(`
        INSERT INTO "account" ("id", "userId", "accountId", "providerId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'google', now(), now())
      `, [testAccountId, testUserId, `g_acc_${suffix}`]);

      // 4.4 Insert Verification
      await pool.query(`
        INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
        VALUES ($1, $2, '123456', now() + interval '1 hour', now(), now())
      `, [testVerId, testUserEmail]);

      // 4.5 Insert Student
      await pool.query(`
        INSERT INTO "students" ("id", "user_id", "full_name", "email", "headline", "bio", "skills", "projects", "certifications", "experience", "career_preferences", "profile_completion", "current_onboarding_step")
        VALUES ($1, $2, 'Auditor Student 9', $3, 'Lead Auditor', 'Forensics', '[{"name":"Drizzle","proficiency":3}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"targetRole":"Engineer"}'::jsonb, 100, 8)
      `, [testStudentId, testUserId, testUserEmail]);

      // 4.6 Insert Industry
      await pool.query(`
        INSERT INTO "industries" ("id", "user_id", "company_name", "email", "industry_type", "company_size", "website", "description", "address", "documents", "verification_docs", "hiring_preferences")
        VALUES ($1, $2, 'Auditor Corp 9', 'contact@corp9.com', 'Technology', '50-100', 'https://corp9.com', 'Audit Corp', '{"city":"Bengaluru"}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"domains":["FullStack"]}'::jsonb)
      `, [testIndustryId, testUserId]);

      // 4.7 Insert Institute
      await pool.query(`
        INSERT INTO "institutes" ("id", "user_id", "institute_name", "email", "institute_type", "aishe_code", "website", "address", "departments", "placement_contact", "verification_docs")
        VALUES ($1, $2, 'Auditor Institute 9', 'tpo@inst9.edu', 'University', 'AISHE-99999', 'https://inst9.edu', '{"city":"New Delhi"}'::jsonb, '[{"name":"Computer Science"}]'::jsonb, '{"name":"TPO Head"}'::jsonb, '[]'::jsonb)
      `, [testInstituteId, testUserId]);

      // 4.8 Insert Question
      await pool.query(`
        INSERT INTO "questions" ("id", "industry_id", "student_id", "title", "description", "category", "difficulty", "status")
        VALUES ($1, $2, $3, 'System Architecture Audit Q9', 'Design resilient DB schemas', 'SYSTEM_DESIGN', 'HARD', 'OPEN')
      `, [testQuestionId, testIndustryId, testStudentId]);

      // 4.9 Insert Rating
      await pool.query(`
        INSERT INTO "ratings" ("id", "question_id", "user_id", "student_id", "industry_id", "overall_score", "scores", "recommendation", "review", "status")
        VALUES ($1, $2, $3, $4, $5, 4.85, '{"accuracy":5,"architecture":4.7}'::jsonb, 'HIRE', 'Exceptional forensic integrity', 'PUBLISHED')
      `, [testRatingId, testQuestionId, testUserId, testStudentId, testIndustryId]);

      record("Full 9-Table Entity CRUD Insert", true, "Created records in user, session, account, verification, students, industries, institutes, questions, ratings");

      // Verify Read on all records
      const qRes = await pool.query('SELECT title FROM "questions" WHERE "id" = $1', [testQuestionId]);
      const rRes = await pool.query('SELECT overall_score, scores FROM "ratings" WHERE "id" = $1', [testRatingId]);
      const readOk = qRes.rows[0]?.title === "System Architecture Audit Q9" &&
                     parseFloat(rRes.rows[0]?.overall_score) === 4.85 &&
                     rRes.rows[0]?.scores?.accuracy === 5;
      record("Live DB Data Integrity & JSONB verification", readOk, `Rating score: ${rRes.rows[0]?.overall_score}`);

      // 4.10 Test Question Deletion Cascade on Rating
      await pool.query('DELETE FROM "questions" WHERE "id" = $1', [testQuestionId]);
      const rCheck = await pool.query('SELECT 1 FROM "ratings" WHERE "id" = $1', [testRatingId]);
      record("Cascade Deletion: Question -> Rating", rCheck.rows.length === 0, "Rating automatically cascaded upon Question deletion");

      // 4.11 Test User Deletion Cascade on Session, Account, Student, Industry, Institute
      await pool.query('DELETE FROM "user" WHERE "id" = $1', [testUserId]);
      await pool.query('DELETE FROM "verification" WHERE "id" = $1', [testVerId]);

      const sCheck = await pool.query('SELECT 1 FROM "students" WHERE "id" = $1', [testStudentId]);
      const indCheck = await pool.query('SELECT 1 FROM "industries" WHERE "id" = $1', [testIndustryId]);
      const instCheck = await pool.query('SELECT 1 FROM "institutes" WHERE "id" = $1', [testInstituteId]);
      const sesCheck = await pool.query('SELECT 1 FROM "session" WHERE "id" = $1', [testSessionId]);
      const accCheck = await pool.query('SELECT 1 FROM "account" WHERE "id" = $1', [testAccountId]);

      const allCascaded = sCheck.rows.length === 0 &&
                          indCheck.rows.length === 0 &&
                          instCheck.rows.length === 0 &&
                          sesCheck.rows.length === 0 &&
                          accCheck.rows.length === 0;

      record("Cascade Deletion: User -> All Entities", allCascaded, "Students, Industries, Institutes, Session, Account cascaded on User delete");

    } catch (e) {
      record("Multi-Entity CRUD & Cascade Lifecycle", false, e.message);
      // Clean up in case of error
      try {
        await pool.query('DELETE FROM "user" WHERE "id" = $1', [testUserId]);
        await pool.query('DELETE FROM "verification" WHERE "id" = $1', [testVerId]);
      } catch (_) {}
    }

  } finally {
    await pool.end();
  }

  console.log("\n----------------------------------------------------------------------");
  console.log("             ROUND 9 AUDIT EXECUTION SUMMARY                          ");
  console.log("----------------------------------------------------------------------");
  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.length;
  console.log(`  Total Checks : ${totalCount}`);
  console.log(`  Passed Checks: ${passCount}`);
  console.log(`  Failed Checks: ${totalCount - passCount}`);
  console.log(`  Pass Rate    : ${((passCount / totalCount) * 100).toFixed(1)}%`);
  console.log("----------------------------------------------------------------------\n");

  if (totalCount - passCount > 0) {
    process.exit(1);
  }
}

runIndependentAudit().catch(e => {
  console.error("Fatal error during audit:", e);
  process.exit(1);
});
