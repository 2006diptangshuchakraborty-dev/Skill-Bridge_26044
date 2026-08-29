require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const crypto = require('crypto');

async function runAudit() {
  console.log('======================================================================');
  console.log('  INDEPENDENT FORENSIC LIVE NEON DB AND SCHEMA AUDIT (Round 8)        ');
  console.log('======================================================================');

  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL not set in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const results = [];

  function record(name, pass, details) {
    results.push({ name, pass, details });
    const status = pass ? '[PASS]' : '[FAIL]';
    console.log('  ' + status + ' ' + name + ': ' + details);
  }

  try {
    const client = await pool.connect();
    const dbNameRes = await client.query('SELECT current_database(), current_user, version()');
    record('Live Neon Connection', true, 'Database: ' + dbNameRes.rows[0].current_database + ', User: ' + dbNameRes.rows[0].current_user);

    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));
    console.log('  [INFO] Tables in live DB:', Array.from(existingTables).join(', '));

    const expectedCanonicalTables = [
      'user',
      'session',
      'account',
      'verification',
      'students',
      'industries',
      'institutes',
      'questions',
      'ratings'
    ];

    for (const tbl of expectedCanonicalTables) {
      const exists = existingTables.has(tbl);
      record('Canonical Table ' + tbl + ' exists', exists, exists ? 'Present in DB' : 'MISSING from DB');
    }

    const colsRes = await client.query("SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;");

    const tableCols = {};
    for (const col of colsRes.rows) {
      if (!tableCols[col.table_name]) tableCols[col.table_name] = [];
      tableCols[col.table_name].push(col);
    }

    const userCols = tableCols['user'] || [];
    const userColNames = new Set(userCols.map(c => c.column_name));
    const userRequired = ['id', 'name', 'email', 'emailVerified', 'role', 'account_status', 'onboarding_status', 'profile_completed'];
    const userColsMatch = userRequired.every(c => userColNames.has(c));
    record('User table column structure', userColsMatch, 'Columns: ' + Array.from(userColNames).join(', '));

    const studentCols = tableCols['students'] || [];
    const studentColNames = new Set(studentCols.map(c => c.column_name));
    const studentRequired = ['id', 'user_id', 'full_name', 'email', 'skills', 'profile_completion'];
    const studentColsMatch = studentRequired.every(c => studentColNames.has(c));
    const studentIdCol = studentCols.find(c => c.column_name === 'id');
    const studentIdIsUuid = studentIdCol && (studentIdCol.data_type === 'uuid');
    record('Students table column structure and UUID PK', studentColsMatch && studentIdIsUuid, 'Columns present: ' + studentColsMatch + ', id data_type: ' + (studentIdCol ? studentIdCol.data_type : 'none'));

    const indCols = tableCols['industries'] || [];
    const indColNames = new Set(indCols.map(c => c.column_name));
    const indRequired = ['id', 'user_id', 'company_name', 'industry_type', 'verification_status'];
    const indColsMatch = indRequired.every(c => indColNames.has(c));
    const indIdCol = indCols.find(c => c.column_name === 'id');
    const indIdIsUuid = indIdCol && (indIdCol.data_type === 'uuid');
    record('Industries table column structure and UUID PK', indColsMatch && indIdIsUuid, 'Columns present: ' + indColsMatch + ', id data_type: ' + (indIdCol ? indIdCol.data_type : 'none'));

    const instCols = tableCols['institutes'] || [];
    const instColNames = new Set(instCols.map(c => c.column_name));
    const instRequired = ['id', 'user_id', 'institute_name', 'aishe_code', 'verification_status'];
    const instColsMatch = instRequired.every(c => instColNames.has(c));
    const instIdCol = instCols.find(c => c.column_name === 'id');
    const instIdIsUuid = instIdCol && (instIdCol.data_type === 'uuid');
    record('Institutes table column structure and UUID PK', instColsMatch && instIdIsUuid, 'Columns present: ' + instColsMatch + ', id data_type: ' + (instIdCol ? instIdCol.data_type : 'none'));

    const qCols = tableCols['questions'] || [];
    const qColNames = new Set(qCols.map(c => c.column_name));
    const qIdCol = qCols.find(c => c.column_name === 'id');
    const qIdIsUuid = qIdCol && (qIdCol.data_type === 'uuid');
    const qHasIndustryId = qColNames.has('industry_id');
    const qHasStudentId = qColNames.has('student_id');
    record('Questions table UUID PK and FKs', qIdIsUuid && qHasIndustryId && qHasStudentId, 'id data_type: ' + (qIdCol ? qIdCol.data_type : 'none') + ', industry_id: ' + qHasIndustryId + ', student_id: ' + qHasStudentId);

    const rCols = tableCols['ratings'] || [];
    const rColNames = new Set(rCols.map(c => c.column_name));
    const rIdCol = rCols.find(c => c.column_name === 'id');
    const rIdIsUuid = rIdCol && (rIdCol.data_type === 'uuid');
    const rHasStudentId = rColNames.has('student_id');
    const rHasIndustryId = rColNames.has('industry_id');
    const rHasScores = rColNames.has('scores');
    record('Ratings table UUID PK and FKs and jsonb scores', rIdIsUuid && rHasStudentId && rHasIndustryId && rHasScores, 'id data_type: ' + (rIdCol ? rIdCol.data_type : 'none') + ', student_id: ' + rHasStudentId + ', industry_id: ' + rHasIndustryId + ', scores: ' + rHasScores);

    const suffix = crypto.randomBytes(4).toString('hex');
    const testUserId = 'audit8_u_' + suffix;
    const testUserEmail = 'audit8_' + suffix + '@example.com';

    await client.query('INSERT INTO "user" (id, name, email, "emailVerified", role, account_status, onboarding_status, profile_completed, "createdAt", "updatedAt") VALUES ($1, $2, $3, false, $4, $5, $6, false, now(), now());', [testUserId, 'Audit User ' + suffix, testUserEmail, 'STUDENT', 'ACTIVE', 'IN_PROGRESS']);

    const studentInsertRes = await client.query('INSERT INTO "students" (user_id, full_name, email, headline, bio, skills, profile_completion, current_onboarding_step) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING id;', [testUserId, 'Audit Student ' + suffix, testUserEmail, 'Student Headline', 'Student Bio', JSON.stringify([{name: 'JavaScript', level: 'ADVANCED'}]), 50, 2]);
    const studentUuid = studentInsertRes.rows[0] ? studentInsertRes.rows[0].id : null;

    const industryUserId = 'audit8_ind_u_' + suffix;
    await client.query('INSERT INTO "user" (id, name, email, "emailVerified", role, account_status, onboarding_status, profile_completed, "createdAt", "updatedAt") VALUES ($1, $2, $3, false, $4, $5, $6, true, now(), now());', [industryUserId, 'Industry User ' + suffix, 'industry_' + suffix + '@example.com', 'INDUSTRY', 'ACTIVE', 'COMPLETED']);

    const indInsertRes = await client.query('INSERT INTO "industries" (user_id, company_name, email, industry_type, verification_status) VALUES ($1, $2, $3, $4, $5) RETURNING id;', [industryUserId, 'Audit Corp', 'industry_' + suffix + '@example.com', 'Technology', 'APPROVED']);
    const industryUuid = indInsertRes.rows[0] ? indInsertRes.rows[0].id : null;

    const instUserId = 'audit8_inst_u_' + suffix;
    await client.query('INSERT INTO "user" (id, name, email, "emailVerified", role, account_status, onboarding_status, profile_completed, "createdAt", "updatedAt") VALUES ($1, $2, $3, false, $4, $5, $6, true, now(), now());', [instUserId, 'Institute User ' + suffix, 'inst_' + suffix + '@example.com', 'INSTITUTE', 'ACTIVE', 'COMPLETED']);

    const instInsertRes = await client.query('INSERT INTO "institutes" (user_id, institute_name, email, aishe_code, verification_status) VALUES ($1, $2, $3, $4, $5) RETURNING id;', [instUserId, 'Audit University', 'inst_' + suffix + '@example.com', 'AISHE-12345', 'APPROVED']);
    const instituteUuid = instInsertRes.rows[0] ? instInsertRes.rows[0].id : null;

    const qInsertRes = await client.query('INSERT INTO "questions" (industry_id, student_id, title, description, category, difficulty, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;', [industryUuid, studentUuid, 'Explain Database Normalization', 'Describe 1NF to 3NF', 'Databases', 'MEDIUM', 'OPEN']);
    const questionUuid = qInsertRes.rows[0] ? qInsertRes.rows[0].id : null;

    const ratingInsertRes = await client.query('INSERT INTO "ratings" (question_id, user_id, student_id, industry_id, overall_score, scores, review, status) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING id;', [questionUuid, industryUserId, studentUuid, industryUuid, 4.50, JSON.stringify({technical: 4.5, communication: 4.5}), 'Great explanation', 'PUBLISHED']);
    const ratingUuid = ratingInsertRes.rows[0] ? ratingInsertRes.rows[0].id : null;

    const sessionToken = 'sess_tok_' + suffix;
    await client.query('INSERT INTO "session" (id, "userId", token, "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt") VALUES ($1, $2, $3, now() + interval \'1 day\', $4, $5, now(), now());', ['sess_' + suffix, testUserId, sessionToken, '127.0.0.1', 'NodeAuditAgent']);

    const accountId = 'acc_' + suffix;
    await client.query('INSERT INTO "account" (id, "userId", "accountId", "providerId", "accessToken", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, now(), now());', [accountId, testUserId, 'google_id_' + suffix, 'google', 'mock_token']);

    const verifId = 'verif_' + suffix;
    await client.query('INSERT INTO "verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, now() + interval \'15 minutes\', now(), now());', [verifId, testUserEmail, '123456']);

    record('Multi-Entity CRUD Insertion', Boolean(studentUuid && industryUuid && instituteUuid && questionUuid && ratingUuid), 'Created student: ' + studentUuid + ', industry: ' + industryUuid + ', institute: ' + instituteUuid + ', question: ' + questionUuid + ', rating: ' + ratingUuid);

    await client.query('DELETE FROM "user" WHERE id = $1;', [industryUserId]);
    const checkInd = await client.query('SELECT id FROM "industries" WHERE id = $1;', [industryUuid]);
    const checkQ = await client.query('SELECT id FROM "questions" WHERE id = $1;', [questionUuid]);
    const checkR = await client.query('SELECT id FROM "ratings" WHERE id = $1;', [ratingUuid]);

    const cascadeSuccess = (checkInd.rowCount === 0) && (checkQ.rowCount === 0) && (checkR.rowCount === 0);
    record('Foreign Key Cascade Deletion', cascadeSuccess, 'Industry deleted: ' + (checkInd.rowCount === 0) + ', Question cascaded: ' + (checkQ.rowCount === 0) + ', Rating cascaded: ' + (checkR.rowCount === 0));

    await client.query('DELETE FROM "user" WHERE id = $1;', [testUserId]);
    await client.query('DELETE FROM "user" WHERE id = $1;', [instUserId]);
    await client.query('DELETE FROM "verification" WHERE id = $1;', [verifId]);

    const checkStudent = await client.query('SELECT id FROM "students" WHERE id = $1;', [studentUuid]);
    const checkSession = await client.query('SELECT id FROM "session" WHERE token = $1;', [sessionToken]);
    const checkAccount = await client.query('SELECT id FROM "account" WHERE id = $1;', [accountId]);

    const cleanupSuccess = (checkStudent.rowCount === 0) && (checkSession.rowCount === 0) && (checkAccount.rowCount === 0);
    record('User Cascade and Cleanup', cleanupSuccess, 'Student cascaded: ' + (checkStudent.rowCount === 0) + ', Session cascaded: ' + (checkSession.rowCount === 0) + ', Account cascaded: ' + (checkAccount.rowCount === 0));

 client.release();
 } catch (err) {
 record('Database Audit Execution', false, 'Error: ' + err.message);
 } finally {
 await pool.end();
 }

 console.log('----------------------------------------------------------------------');
 console.log(' AUDIT SUMMARY RESULTS ');
 console.log('----------------------------------------------------------------------');
 const total = results.length;
 const passed = results.filter(r => r.pass).length;
 const failed = results.filter(r => !r.pass).length;
 console.log(' Total Checks : ' + total);
 console.log(' Passed Checks: ' + passed);
 console.log(' Failed Checks: ' + failed);
 console.log(' Pass Rate : ' + ((passed / total) * 100).toFixed(1) + '%');
 console.log('----------------------------------------------------------------------');
}

runAudit();