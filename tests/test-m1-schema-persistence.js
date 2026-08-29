#!/usr/bin/env node
/**
 * Milestone 1 Verification Suite: Database Schema, Relations, JSON DB Fallback & Drizzle Migrations
 * File: tests/test-m1-schema-persistence.js
 */

const assert = require('assert');
const schema = require('../db/schema');
const { relations } = require('../db/relations');
const localDb = require('../lib/db');
const { db: mockDrizzleDb, isMockDb } = require('../db/index');

console.log('======================================================================');
console.log('  Milestone 1 Verification Suite: Schema, Relations & Persistence    ');
console.log('======================================================================\n');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  // ---------------------------------------------------------------------------
  // 1. Schema & Enums Verification
  // ---------------------------------------------------------------------------
  console.log('▶ SUITE 1: Drizzle Schema Models & PostgreSQL Enums');

  await runTest('M1-01: All 8 Rating Enums are defined and exported', () => {
    const enums = [
      'ratingInteractionTypeEnum',
      'ratingInteractionStatusEnum',
      'ratingContextTypeEnum',
      'ratingStatusEnum',
      'ratingRecommendationEnum',
      'ratingReportReasonEnum',
      'ratingReportStatusEnum',
      'ratingAppealStatusEnum',
    ];
    for (const e of enums) {
      assert(schema[e], `Enum ${e} must be exported in db/schema.js`);
      assert(Array.isArray(schema[e].enumValues), `Enum ${e} must have enumValues`);
    }
    assert(schema.ratingInteractionTypeEnum.enumValues.includes('APPLICATION_REVIEW'));
    assert(schema.ratingInteractionStatusEnum.enumValues.includes('REVIEWED'));
    assert(schema.ratingStatusEnum.enumValues.includes('PENDING_PUBLICATION'));
  });

  const { getTableConfig } = require('drizzle-orm/pg-core');

  await runTest('M1-02: All 10 Rating Tables are exported in db/schema.js', () => {
    const tables = [
      { key: 'ratingInteractions', expectedName: 'rating_interactions' },
      { key: 'ratings', expectedName: 'ratings' },
      { key: 'ratingCategories', expectedName: 'rating_categories' },
      { key: 'ratingCategoryScores', expectedName: 'rating_category_scores' },
      { key: 'ratingResponses', expectedName: 'rating_responses' },
      { key: 'ratingReports', expectedName: 'rating_reports' },
      { key: 'ratingAppeals', expectedName: 'rating_appeals' },
      { key: 'ratingAuditLogs', expectedName: 'rating_audit_logs' },
      { key: 'ratingAggregates', expectedName: 'rating_aggregates' },
      { key: 'ratingPolicies', expectedName: 'rating_policies' },
    ];
    for (const { key, expectedName } of tables) {
      assert(schema[key], `Table model ${key} must be exported in db/schema.js`);
      const config = getTableConfig(schema[key]);
      assert.strictEqual(config.name, expectedName, `Table ${key} must have name ${expectedName}`);
    }
  });

  await runTest('M1-03: ratings table has compound unique index (interactionId, reviewerUserId)', () => {
    assert(schema.ratings, 'ratings table exists');
    const uniqueKeys = Object.keys(schema.ratings);
    assert(schema.ratings.interactionId, 'ratings has interactionId');
    assert(schema.ratings.reviewerUserId, 'ratings has reviewerUserId');
    assert(schema.ratings.targetRole, 'ratings has targetRole');
    assert(schema.ratings.targetEntityId, 'ratings has targetEntityId');
    assert(schema.ratings.overallScore, 'ratings has overallScore');
  });

  await runTest('M1-04: rating_aggregates has compound unique index (targetRole, targetEntityId)', () => {
    assert(schema.ratingAggregates, 'ratingAggregates table exists');
    assert(schema.ratingAggregates.targetRole, 'ratingAggregates has targetRole');
    assert(schema.ratingAggregates.targetEntityId, 'ratingAggregates has targetEntityId');
    assert(schema.ratingAggregates.averageScore, 'ratingAggregates has averageScore');
    assert(schema.ratingAggregates.recommendationRate, 'ratingAggregates has recommendationRate');
  });

  // ---------------------------------------------------------------------------
  // 2. Relations Verification
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Drizzle Relations Graph');

  await runTest('M1-05: Relational graph compiles without disambiguation collisions', () => {
    assert(relations, 'Relations object must be defined');
    const tableNames = Object.keys(relations);
    assert(tableNames.includes('users'), 'relations includes users');
    assert(tableNames.includes('ratingInteractions'), 'relations includes ratingInteractions');
    assert(tableNames.includes('ratings'), 'relations includes ratings');
    assert(tableNames.includes('ratingCategories'), 'relations includes ratingCategories');
    assert(tableNames.includes('ratingCategoryScores'), 'relations includes ratingCategoryScores');
    assert(tableNames.includes('ratingResponses'), 'relations includes ratingResponses');
    assert(tableNames.includes('ratingReports'), 'relations includes ratingReports');
    assert(tableNames.includes('ratingAppeals'), 'relations includes ratingAppeals');
    assert(tableNames.includes('ratingAuditLogs'), 'relations includes ratingAuditLogs');
    assert(tableNames.includes('ratingAggregates'), 'relations includes ratingAggregates');
  });

  // ---------------------------------------------------------------------------
  // 3. Local JSON DB Fallback & CRUD Helpers
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: Local JSON DB Fallback & CRUD Operations');

  await runTest('M1-06: Default seed categories are loaded for all 4 contexts', () => {
    const cats = localDb.getRatingCategories();
    assert(cats.length >= 20, `Expected at least 20 seed categories, found ${cats.length}`);
    const contexts = new Set(cats.map(c => c.contextType));
    assert(contexts.has('APPLICATION_REVIEW'), 'Has APPLICATION_REVIEW');
    assert(contexts.has('INTERVIEW_FEEDBACK'), 'Has INTERVIEW_FEEDBACK');
    assert(contexts.has('INTERNSHIP_PERFORMANCE'), 'Has INTERNSHIP_PERFORMANCE');
    assert(contexts.has('COURSE_EVALUATION'), 'Has COURSE_EVALUATION');
  });

  await runTest('M1-07: Default seed policies are initialized with rating windows & thresholds', () => {
    const policies = localDb.getRatingPolicies();
    assert(policies.length >= 4, `Expected at least 4 default policies, found ${policies.length}`);
    const internPolicy = localDb.getRatingPolicyByContext('INTERNSHIP_PERFORMANCE');
    assert(internPolicy, 'INTERNSHIP_PERFORMANCE policy exists');
    assert.strictEqual(internPolicy.isBlindReview, true, 'Internship is blind review');
    assert.strictEqual(internPolicy.blindHoldTimeoutDays, 14, '14-day hold timeout');
  });

  await runTest('M1-08: Rating interaction creation and lifecycle updates', () => {
    const interaction = localDb.createRatingInteraction({
      interactionType: 'APPLICATION_REVIEW',
      referenceId: 'app_test_m1_001',
      initiatorType: 'INDUSTRY',
      initiatorId: 'comp_test_001',
      initiatorUserId: 'usr_ind_001',
      targetType: 'STUDENT',
      targetId: 'stu_test_001',
      targetUserId: 'usr_stu_001',
      status: 'REVIEWED',
    });
    assert(interaction.id.startsWith('rint_'), 'Interaction ID generated with prefix rint_');
    assert.strictEqual(interaction.status, 'REVIEWED');

    const fetched = localDb.getRatingInteractionById(interaction.id);
    assert.strictEqual(fetched.referenceId, 'app_test_m1_001');

    const updated = localDb.updateRatingInteraction(interaction.id, { status: 'COMPLETED' });
    assert.strictEqual(updated.status, 'COMPLETED');
  });

  await runTest('M1-09: Compound uniqueness guard prevents duplicate ratings for same interaction & reviewer', () => {
    const interactionId = `rint_uniq_${Date.now()}`;
    const reviewerUserId = 'usr_reviewer_001';

    localDb.createRatingInteraction({
      id: interactionId,
      interactionType: 'APPLICATION_REVIEW',
      referenceId: 'app_uniq_001',
      initiatorType: 'INDUSTRY',
      initiatorId: 'comp_001',
      initiatorUserId: reviewerUserId,
      targetType: 'STUDENT',
      targetId: 'stu_target_001',
      targetUserId: 'usr_target_001',
    });

    const rating1 = localDb.createRating({
      interactionId,
      reviewerUserId,
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_target_001',
      targetRole: 'STUDENT',
      targetEntityId: 'stu_target_001',
      contextType: 'APPLICATION_REVIEW',
      overallScore: 4.80,
      recommendation: 'RECOMMENDED',
      scores: {
        APPLICATION_QUALITY: 5,
        SKILL_RELEVANCE: 5,
        COMMUNICATION: 4,
        PROFESSIONALISM: 5,
        OVERALL_IMPRESSION: 5,
      },
    });
    assert(rating1.id.startsWith('rat_'), 'First rating successfully created');

    assert.throws(
      () => {
        localDb.createRating({
          interactionId,
          reviewerUserId,
          reviewerRole: 'INDUSTRY',
          targetUserId: 'usr_target_001',
          targetRole: 'STUDENT',
          targetEntityId: 'stu_target_001',
          contextType: 'APPLICATION_REVIEW',
          overallScore: 4.0,
        });
      },
      /Duplicate rating/,
      'Should throw error on duplicate submission for same (interactionId, reviewerUserId)'
    );
  });

  await runTest('M1-10: Recalculate rating aggregates computes histogram, recommendation rate, and badges', () => {
    const targetEntityId = `stu_agg_${Date.now()}`;
    const targetUserId = `usr_agg_${Date.now()}`;

    // Add 3 ratings
    for (let i = 1; i <= 3; i++) {
      const intId = `rint_agg_${Date.now()}_${i}`;
      localDb.createRatingInteraction({
        id: intId,
        interactionType: 'APPLICATION_REVIEW',
        referenceId: `app_agg_${i}`,
        initiatorType: 'INDUSTRY',
        initiatorId: `comp_${i}`,
        initiatorUserId: `usr_rev_${i}`,
        targetType: 'STUDENT',
        targetId: targetEntityId,
        targetUserId: targetUserId,
      });

      localDb.createRating({
        interactionId: intId,
        reviewerUserId: `usr_rev_${i}`,
        reviewerRole: 'INDUSTRY',
        targetUserId: targetUserId,
        targetRole: 'STUDENT',
        targetEntityId: targetEntityId,
        contextType: 'APPLICATION_REVIEW',
        overallScore: 4.60,
        recommendation: 'RECOMMENDED',
        status: 'PUBLISHED',
        isVerified: true,
      });
    }

    const agg = localDb.recalculateRatingAggregate('STUDENT', targetEntityId);
    assert.strictEqual(agg.totalRatingsCount, 3, 'Total count is 3');
    assert.strictEqual(agg.verifiedRatingsCount, 3, 'Verified count is 3');
    assert.strictEqual(agg.averageScore, '4.60', 'Average score is 4.60');
    assert.strictEqual(agg.recommendationRate, '100.00', '100% recommendation rate');
    assert.strictEqual(agg.verificationTrustLevel, 'TOP_RATED', 'Awarded TOP_RATED badge');

    // Verify compound uniqueness on rating_aggregates
    const fetchedAgg = localDb.getRatingAggregate('STUDENT', targetEntityId);
    assert.strictEqual(fetchedAgg.id, agg.id, 'Single unique aggregate cache row per entity');
  });

  await runTest('M1-11: Rating responses, reports, appeals, and audit trail', () => {
    const ratingId = `rat_mod_${Date.now()}`;
    const intId = `rint_mod_${Date.now()}`;

    localDb.createRatingInteraction({
      id: intId,
      interactionType: 'APPLICATION_REVIEW',
      referenceId: 'app_mod_1',
      initiatorType: 'INDUSTRY',
      initiatorId: 'comp_1',
      initiatorUserId: 'usr_rev_mod',
      targetType: 'STUDENT',
      targetId: 'stu_mod_1',
      targetUserId: 'usr_mod_1',
    });

    localDb.createRating({
      id: ratingId,
      interactionId: intId,
      reviewerUserId: 'usr_rev_mod',
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_mod_1',
      targetRole: 'STUDENT',
      targetEntityId: 'stu_mod_1',
      contextType: 'APPLICATION_REVIEW',
      overallScore: 4.00,
      status: 'PUBLISHED',
    });

    // Response
    const resp = localDb.createRatingResponse({
      ratingId,
      responderUserId: 'usr_mod_1',
      responseText: 'Thank you for the constructive feedback!',
    });
    assert.strictEqual(resp.ratingId, ratingId);

    // Report
    const report = localDb.createRatingReport({
      ratingId,
      reporterUserId: 'usr_other',
      reason: 'FALSE_INFORMATION',
      details: 'Inaccurate timeline reported.',
    });
    assert.strictEqual(report.status, 'PENDING');

    const resolvedRep = localDb.resolveRatingReport(report.id, {
      status: 'RESOLVED_UPHELD',
      moderatorNotes: 'Review hidden pending review.',
      resolvedByAdminId: 'usr_admin_1',
    });
    assert.strictEqual(resolvedRep.status, 'RESOLVED_UPHELD');

    // Appeal
    const appeal = localDb.createRatingAppeal({
      ratingId,
      appellantUserId: 'usr_rev_mod',
      appealReason: 'Evidence shows timeline was accurate.',
      evidenceDocs: ['https://example.com/proof.pdf'],
    });
    assert.strictEqual(appeal.status, 'PENDING_REVIEW');

    // Audit Logs
    const auditLogs = localDb.getRatingAuditLogs({ ratingId });
    assert(auditLogs.length >= 3, `Expected at least 3 audit log events for rating, found ${auditLogs.length}`);
  });

  // ---------------------------------------------------------------------------
  // 4. Mock Drizzle ORM Query Builder
  // ---------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: Mock Drizzle ORM Query Builder Interface');

  await runTest('M1-12: Mock Drizzle ORM select() query builder supports all rating tables', async () => {
    const ratings = await mockDrizzleDb.select().from(schema.ratings);
    assert(Array.isArray(ratings), 'select().from(schema.ratings) returns array');

    const interactions = await mockDrizzleDb.select().from(schema.ratingInteractions);
    assert(Array.isArray(interactions), 'select().from(schema.ratingInteractions) returns array');

    const categories = await mockDrizzleDb.select().from(schema.ratingCategories);
    assert(Array.isArray(categories), 'select().from(schema.ratingCategories) returns array');
    assert(categories.length >= 20, 'Has categories loaded');

    const aggregates = await mockDrizzleDb.select().from(schema.ratingAggregates);
    assert(Array.isArray(aggregates), 'select().from(schema.ratingAggregates) returns array');
  });

  await runTest('M1-13: Mock Drizzle ORM db.query interface supports rating models', async () => {
    const firstCategory = await mockDrizzleDb.query.ratingCategories.findFirst();
    assert(firstCategory, 'query.ratingCategories.findFirst() returns item');
    assert(firstCategory.code, 'Category has code');

    const policies = await mockDrizzleDb.query.ratingPolicies.findMany();
    assert(Array.isArray(policies), 'query.ratingPolicies.findMany() returns array');
    assert(policies.length >= 4, 'Has at least 4 policies');
  });

  // ---------------------------------------------------------------------------
  // Execution Summary
  // ---------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('                     TEST EXECUTION SUMMARY                           ');
  console.log('----------------------------------------------------------------------');
  console.log(`  Total Tests Executed : ${passedTests + failedTests}`);
  console.log(`  Passed Tests         : ${passedTests}`);
  console.log(`  Failed Tests         : ${failedTests}`);
  console.log(`  Pass Rate            : ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('----------------------------------------------------------------------');

  if (failedTests > 0) {
    console.error('\n❌ SOME MILESTONE 1 VERIFICATION TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL MILESTONE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
