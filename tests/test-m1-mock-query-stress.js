#!/usr/bin/env node
/**
 * Milestone 1 Challenger 2 Stress Test Suite:
 * Empirical Verification & Stress Testing of Mock Query Builder (createMockDrizzleDb)
 * File: tests/test-m1-mock-query-stress.js
 */

const assert = require('assert');
const schema = require('../db/schema');
const localDb = require('../lib/db');
const { db, isMockDb } = require('../db/index');

console.log('======================================================================');
console.log('  Milestone 1 Challenger 2: Mock Query Builder & Routing Stress Suite  ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failures.push({ name, error: err.message, stack: err.stack });
    failedTests++;
  }
}

async function runAllTests() {
  // Ensure DB is seeded and clean
  localDb.resetDb();

  const allRatingTables = [
    { key: 'ratingInteractions', model: schema.ratingInteractions, name: 'rating_interactions', dbKey: 'ratingInteractions' },
    { key: 'ratings', model: schema.ratings, name: 'ratings', dbKey: 'ratings' },
    { key: 'ratingCategories', model: schema.ratingCategories, name: 'rating_categories', dbKey: 'ratingCategories' },
    { key: 'ratingCategoryScores', model: schema.ratingCategoryScores, name: 'rating_category_scores', dbKey: 'ratingCategoryScores' },
    { key: 'ratingResponses', model: schema.ratingResponses, name: 'rating_responses', dbKey: 'ratingResponses' },
    { key: 'ratingReports', model: schema.ratingReports, name: 'rating_reports', dbKey: 'ratingReports' },
    { key: 'ratingAppeals', model: schema.ratingAppeals, name: 'rating_appeals', dbKey: 'ratingAppeals' },
    { key: 'ratingAuditLogs', model: schema.ratingAuditLogs, name: 'rating_audit_logs', dbKey: 'ratingAuditLogs' },
    { key: 'ratingAggregates', model: schema.ratingAggregates, name: 'rating_aggregates', dbKey: 'ratingAggregates' },
    { key: 'ratingPolicies', model: schema.ratingPolicies, name: 'rating_policies', dbKey: 'ratingPolicies' },
  ];

  // ---------------------------------------------------------------------------
  // Suite 1: select().from(...) across all 10 rating tables
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 1: select().from(...) across all 10 rating tables');

  for (const t of allRatingTables) {
    await test(`S1.1 [${t.key}] Direct await db.select().from(schema.${t.key})`, async () => {
      const res = await db.select().from(t.model);
      assert(Array.isArray(res), `Expected array result for ${t.key}`);
    });

    await test(`S1.2 [${t.key}] db.select().from(schema.${t.key}).execute()`, async () => {
      const res = await db.select().from(t.model).execute();
      assert(Array.isArray(res), `Expected array result from execute() for ${t.key}`);
    });

    await test(`S1.3 [${t.key}] db.select().from(schema.${t.key}).where(...)`, async () => {
      const res = await db.select().from(t.model).where({ id: 'dummy_id' });
      assert(Array.isArray(res), `Expected array result from where() for ${t.key}`);
    });

    await test(`S1.4 [${t.key}] db.select().from(schema.${t.key}).limit(5)`, async () => {
      const res = await db.select().from(t.model).limit(5);
      assert(Array.isArray(res), `Expected array result from limit() for ${t.key}`);
    });

    await test(`S1.5 [${t.key}] db.select().from(schema.${t.key}).where(...).limit(5)`, async () => {
      const res = await db.select().from(t.model).where({ id: 'dummy_id' }).limit(5);
      assert(Array.isArray(res), `Expected array result from where().limit() for ${t.key}`);
    });

    await test(`S1.6 [${t.key}] db.select().from('${t.name}') with raw table name string`, async () => {
      const res = await db.select().from(t.name);
      assert(Array.isArray(res), `Expected array result from raw string table name '${t.name}'`);
    });
  }

  // ---------------------------------------------------------------------------
  // Suite 2: Advanced Chaining & orderBy() Stress Check
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Advanced Chaining & orderBy() Stress Analysis');

  for (const t of allRatingTables) {
    await test(`S2.1 [${t.key}] db.select().from(schema.${t.key}).orderBy(...) existence check`, async () => {
      const query = db.select().from(t.model);
      if (typeof query.orderBy !== 'function') {
        throw new Error(`db.select().from(${t.key}).orderBy is undefined (Missing orderBy builder method)`);
      }
      const res = await query.orderBy('createdAt');
      assert(Array.isArray(res), `Expected array result from orderBy() for ${t.key}`);
    });

    await test(`S2.2 [${t.key}] db.select().from(schema.${t.key}).where(...).orderBy(...) chaining check`, async () => {
      const whereQuery = db.select().from(t.model).where({ id: 'test' });
      if (typeof whereQuery.orderBy !== 'function') {
        throw new Error(`db.select().from(${t.key}).where(...).orderBy is undefined (Missing orderBy on where builder)`);
      }
      const res = await whereQuery.orderBy('createdAt');
      assert(Array.isArray(res), `Expected array result from where().orderBy() for ${t.key}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Suite 3: insert(...).values(...) on Rating Tables
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: insert(...).values(...) on Rating Tables');

  await test('S3.1 Insert single rating interaction into db', async () => {
    const testInteraction = {
      id: `rint_stress_${Date.now()}`,
      interactionType: 'APPLICATION_REVIEW',
      referenceId: 'app_stress_001',
      initiatorType: 'INDUSTRY',
      initiatorId: 'comp_stress_001',
      initiatorUserId: 'usr_stress_ind_001',
      targetType: 'STUDENT',
      targetId: 'stu_stress_001',
      targetUserId: 'usr_stress_stu_001',
      status: 'REVIEWED',
      isBlind: false,
    };

    const inserted = await db.insert(schema.ratingInteractions).values(testInteraction);
    assert(Array.isArray(inserted), 'Insert must return array');
    assert.strictEqual(inserted[0].id, testInteraction.id, 'Inserted ID must match');

    // Verify persistence in local JSON DB
    const dbData = localDb.getDb();
    const found = (dbData.ratingInteractions || []).find(r => r.id === testInteraction.id);
    assert(found, 'Interaction must be saved into localDb.ratingInteractions');
  });

  await test('S3.2 Insert rating into db with returning()', async () => {
    const testRating = {
      id: `rat_stress_${Date.now()}`,
      interactionId: 'rint_stress_001',
      reviewerUserId: 'usr_stress_ind_001',
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_stress_stu_001',
      targetRole: 'STUDENT',
      targetEntityId: 'stu_stress_001',
      contextType: 'APPLICATION_REVIEW',
      overallScore: '4.80',
      recommendation: 'RECOMMENDED',
      status: 'PUBLISHED',
      isVerified: true,
      isBlind: false,
    };

    const res = await db.insert(schema.ratings).values(testRating).returning();
    assert(Array.isArray(res), 'Insert returning() must return array');
    assert.strictEqual(res[0].id, testRating.id, 'Inserted rating ID must match');

    const dbData = localDb.getDb();
    const found = (dbData.ratings || []).find(r => r.id === testRating.id);
    assert(found, 'Rating must be saved in localDb.ratings');
  });

  await test('S3.3 Insert batch records into ratingCategoryScores', async () => {
    const batchScores = [
      { id: `rcs_s1_${Date.now()}`, ratingId: 'rat_s1', categoryId: 'rcat_1', categoryCode: 'C1', score: 5 },
      { id: `rcs_s2_${Date.now()}`, ratingId: 'rat_s1', categoryId: 'rcat_2', categoryCode: 'C2', score: 4 },
    ];

    const res = await db.insert(schema.ratingCategoryScores).values(batchScores);
    assert(Array.isArray(res), 'Batch insert must return array');
    assert.strictEqual(res.length, 2, 'Batch insert returned 2 records');

    const dbData = localDb.getDb();
    const found1 = (dbData.ratingCategoryScores || []).find(r => r.id === batchScores[0].id);
    const found2 = (dbData.ratingCategoryScores || []).find(r => r.id === batchScores[1].id);
    assert(found1 && found2, 'Both batch scores must be in localDb.ratingCategoryScores');
  });

  await test('S3.4 Insert rating report, appeal, audit log, aggregate, and policy', async () => {
    const report = { id: `rrep_s_${Date.now()}`, ratingId: 'rat_s1', reporterUserId: 'u1', reason: 'SPAM' };
    const appeal = { id: `rapp_s_${Date.now()}`, ratingId: 'rat_s1', appellantUserId: 'u2', appealReason: 'Error' };
    const audit = { id: `raud_s_${Date.now()}`, action: 'TEST_AUDIT', ratingId: 'rat_s1' };
    const agg = { id: `ragg_s_${Date.now()}`, targetRole: 'STUDENT', targetEntityId: 'stu_s1', averageScore: '4.50' };
    const pol = { id: `rpol_s_${Date.now()}`, contextType: 'SEMINAR_FEEDBACK', ratingWindowDays: 45 };

    await db.insert(schema.ratingReports).values(report);
    await db.insert(schema.ratingAppeals).values(appeal);
    await db.insert(schema.ratingAuditLogs).values(audit);
    await db.insert(schema.ratingAggregates).values(agg);
    await db.insert(schema.ratingPolicies).values(pol);

    const dbData = localDb.getDb();
    assert((dbData.ratingReports || []).some(r => r.id === report.id), 'Rating report inserted');
    assert((dbData.ratingAppeals || []).some(r => r.id === appeal.id), 'Rating appeal inserted');
    assert((dbData.ratingAuditLogs || []).some(r => r.id === audit.id), 'Rating audit log inserted');
    assert((dbData.ratingAggregates || []).some(r => r.id === agg.id), 'Rating aggregate inserted');
    assert((dbData.ratingPolicies || []).some(r => r.id === pol.id), 'Rating policy inserted');
  });

  // ---------------------------------------------------------------------------
  // Suite 4: update(...).set(...) on Rating Tables
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: update(...).set(...) on Rating Tables');

  await test('S4.1 db.update(schema.ratings).set(...).where(...) execution', async () => {
    const updateData = { status: 'HIDDEN' };
    const res = await db.update(schema.ratings).set(updateData).where({ id: 'rat_stress_001' });
    assert(Array.isArray(res), 'Update must return array');
    assert.strictEqual(res[0].status, 'HIDDEN', 'Update returned data with updated field');
  });

  await test('S4.2 db.update(schema.ratingInteractions).set(...).where(...).returning()', async () => {
    const updateData = { status: 'COMPLETED' };
    const res = await db.update(schema.ratingInteractions).set(updateData).where({ id: 'rint_stress_001' }).returning();
    assert(Array.isArray(res), 'Update returning() must return array');
    assert.strictEqual(res[0].status, 'COMPLETED', 'Update returned data with updated status');
  });

  await test('S4.3 db.update(schema.ratingAggregates).set(...).where(...).execute()', async () => {
    const updateData = { averageScore: '4.95' };
    const res = await db.update(schema.ratingAggregates).set(updateData).where({ targetRole: 'STUDENT' }).execute();
    assert(Array.isArray(res), 'Update execute() must return array');
    assert.strictEqual(res[0].averageScore, '4.95', 'Update execute returned data with averageScore');
  });

  // ---------------------------------------------------------------------------
  // Suite 5: db.query.* Interface on Rating Models
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 5: db.query.* Interface on Rating Models');

  await test('S5.1 db.query.ratingInteractions.findFirst()', async () => {
    assert(db.query.ratingInteractions, 'db.query.ratingInteractions must exist');
    assert(typeof db.query.ratingInteractions.findFirst === 'function', 'findFirst must be function');
    const first = await db.query.ratingInteractions.findFirst();
    // Can be null if empty or object if present
    if (first) {
      assert(first.id, 'findFirst result has id');
    }
  });

  await test('S5.2 db.query.ratings.findMany()', async () => {
    assert(db.query.ratings, 'db.query.ratings must exist');
    assert(typeof db.query.ratings.findMany === 'function', 'findMany must be function');
    const all = await db.query.ratings.findMany();
    assert(Array.isArray(all), 'findMany must return array');
  });

  await test('S5.3 db.query.ratingCategories.findFirst() & findMany()', async () => {
    assert(db.query.ratingCategories, 'db.query.ratingCategories must exist');
    const first = await db.query.ratingCategories.findFirst();
    assert(first, 'Rating categories must have seed item');
    assert(first.code, 'Category must have code');
    const all = await db.query.ratingCategories.findMany();
    assert(Array.isArray(all) && all.length >= 20, 'findMany returns at least 20 categories');
  });

  await test('S5.4 db.query.ratingPolicies.findFirst() & findMany()', async () => {
    assert(db.query.ratingPolicies, 'db.query.ratingPolicies must exist');
    const first = await db.query.ratingPolicies.findFirst();
    assert(first, 'Rating policies must have seed policy');
    assert(first.contextType, 'Policy has contextType');
    const all = await db.query.ratingPolicies.findMany();
    assert(Array.isArray(all) && all.length >= 4, 'findMany returns at least 4 policies');
  });

  await test('S5.5 db.query.ratingAggregates.findFirst() & findMany()', async () => {
    assert(db.query.ratingAggregates, 'db.query.ratingAggregates must exist');
    const all = await db.query.ratingAggregates.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  await test('S5.6 db.query.ratingResponses.findFirst() & findMany()', async () => {
    assert(db.query.ratingResponses, 'db.query.ratingResponses must exist');
    const all = await db.query.ratingResponses.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  await test('S5.7 db.query.ratingReports.findMany()', async () => {
    assert(db.query.ratingReports, 'db.query.ratingReports must exist');
    const all = await db.query.ratingReports.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  await test('S5.8 db.query.ratingAppeals.findMany()', async () => {
    assert(db.query.ratingAppeals, 'db.query.ratingAppeals must exist');
    const all = await db.query.ratingAppeals.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  await test('S5.9 db.query.ratingAuditLogs.findMany()', async () => {
    assert(db.query.ratingAuditLogs, 'db.query.ratingAuditLogs must exist');
    const all = await db.query.ratingAuditLogs.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  await test('S5.10 db.query.ratingCategoryScores.findMany()', async () => {
    assert(db.query.ratingCategoryScores, 'db.query.ratingCategoryScores must exist');
    const all = await db.query.ratingCategoryScores.findMany();
    assert(Array.isArray(all), 'findMany returns array');
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('                 CHALLENGER 2 STRESS TEST RESULTS                     ');
  console.log('======================================================================');
  console.log(`  Total Tests  : ${totalTests}`);
  console.log(`  Passed Tests : ${passedTests}`);
  console.log(`  Failed Tests : ${failedTests}`);
  console.log(`  Pass Rate    : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');

  if (failures.length > 0) {
    console.error('FAILURES SUMMARY:');
    failures.forEach((f, idx) => {
      console.error(`  [${idx + 1}] ${f.name}`);
      console.error(`      -> ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('ALL STRESS TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Unexpected crash in stress suite:', err);
  process.exit(1);
});
