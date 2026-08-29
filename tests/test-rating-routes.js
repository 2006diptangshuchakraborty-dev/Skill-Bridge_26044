/**
 * Skill Bridge Platform - Rating API Route Handlers Integration Test
 * File: tests/test-rating-routes.js
 */

const assert = require('assert');
const { NextRequest } = require('next/server');
const { getDb, saveDb } = require('../lib/db');
const { ROLES, INTERACTION_TYPES, INTERACTION_STATUS, RECOMMENDATION_TYPES } = require('../lib/rating-engine');

async function runRouteTests() {
  console.log('\n=== Testing Milestone 2 Rating API Route Handlers ===\n');

  // Dynamically import ESM route handlers
  const ratingsMod = await import('../app/api/ratings/route.js');
  const getRatings = ratingsMod.GET || ratingsMod.default?.GET;
  const postRating = ratingsMod.POST || ratingsMod.default?.POST;

  const detailMod = await import('../app/api/ratings/[id]/route.js');
  const getRatingDetail = detailMod.GET || detailMod.default?.GET;

  const eligMod = await import('../app/api/ratings/eligibility/route.js');
  const getEligibility = eligMod.GET || eligMod.default?.GET;
  const postEligibility = eligMod.POST || eligMod.default?.POST;

  const pendingMod = await import('../app/api/ratings/pending/route.js');
  const getPendingRatings = pendingMod.GET || pendingMod.default?.GET;

  const dbData = getDb();
  dbData.users = dbData.users || [];
  dbData.ratingInteractions = dbData.ratingInteractions || [];
  dbData.ratings = (dbData.ratings || []).filter(r => r.interactionId !== 'rint_route_test_01');
  dbData.ratingCategoryScores = dbData.ratingCategoryScores || [];
  dbData.ratingAggregates = (dbData.ratingAggregates || []).filter(a => a.targetEntityId !== 'stu_route_stu_01');

  // Seed test users
  const testIndustryUser = {
    id: 'usr_route_ind_01',
    name: 'TechCorp Recruiter',
    role: 'INDUSTRY',
    accountStatus: 'ACTIVE',
    onboardingStatus: 'COMPLETED',
  };
  const testStudentUser = {
    id: 'usr_route_stu_01',
    name: 'Aarav Candidate',
    role: 'STUDENT',
    accountStatus: 'ACTIVE',
    onboardingStatus: 'COMPLETED',
  };
  if (!dbData.users.some(u => u.id === testIndustryUser.id)) dbData.users.push(testIndustryUser);
  if (!dbData.users.some(u => u.id === testStudentUser.id)) dbData.users.push(testStudentUser);

  // Seed test interaction
  const testInteraction = {
    id: 'rint_route_test_01',
    interactionType: 'APPLICATION_REVIEW',
    referenceId: 'app_route_01',
    status: 'REVIEWED',
    initiatorType: 'INDUSTRY',
    initiatorUserId: testIndustryUser.id,
    initiatorId: 'comp_route_01',
    targetType: 'STUDENT',
    targetUserId: testStudentUser.id,
    targetId: 'stu_route_stu_01',
    isBlind: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existingIntIdx = dbData.ratingInteractions.findIndex(i => i.id === testInteraction.id);
  if (existingIntIdx >= 0) dbData.ratingInteractions[existingIntIdx] = testInteraction;
  else dbData.ratingInteractions.push(testInteraction);
  saveDb(dbData);

  // 1. Test GET /api/ratings/eligibility
  console.log('1. Testing GET /api/ratings/eligibility...');
  const eligUrl = `http://localhost:3000/api/ratings/eligibility?reviewerUserId=${testIndustryUser.id}&targetEntityId=stu_route_stu_01&targetEntityType=STUDENT&interactionId=${testInteraction.id}`;
  const eligReq = new NextRequest(eligUrl);
  const eligRes = await getEligibility(eligReq);
  const eligJson = await eligRes.json();
  assert.strictEqual(eligRes.status, 200);
  assert.strictEqual(eligJson.success, true);
  assert.strictEqual(eligJson.eligible, true);
  assert.strictEqual(eligJson.allowedCategories.length, 5);
  console.log('   ✔ Eligible Industry reviewer verified successfully');

  // 2. Test Self-Rating Rejection on POST /api/ratings/eligibility
  console.log('2. Testing POST /api/ratings/eligibility self-rating rejection...');
  const selfEligReq = new NextRequest('http://localhost:3000/api/ratings/eligibility', {
    method: 'POST',
    body: JSON.stringify({
      reviewerUserId: testStudentUser.id,
      targetEntityId: testStudentUser.id,
      targetEntityType: 'STUDENT',
      interactionId: testInteraction.id,
    }),
  });
  const selfEligRes = await postEligibility(selfEligReq);
  const selfEligJson = await selfEligRes.json();
  assert.strictEqual(selfEligJson.eligible, false);
  assert.strictEqual(selfEligJson.code, 'SELF_RATING_FORBIDDEN');
  console.log('   ✔ Self-rating correctly rejected with SELF_RATING_FORBIDDEN');

  // 3. Test POST /api/ratings (Create Rating)
  console.log('3. Testing POST /api/ratings with withAuth test headers...');
  const createReq = new NextRequest('http://localhost:3000/api/ratings', {
    method: 'POST',
    headers: {
      'x-user-id': testIndustryUser.id,
      'x-user-role': 'INDUSTRY',
      'x-account-status': 'ACTIVE',
      'x-onboarding-status': 'COMPLETED',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      interactionId: testInteraction.id,
      contextType: 'APPLICATION_REVIEW',
      targetUserId: testStudentUser.id,
      targetEntityId: 'stu_route_stu_01',
      targetRole: 'STUDENT',
      scores: {
        APPLICATION_QUALITY: 5,
        SKILL_RELEVANCE: 4,
        COMMUNICATION: 5,
        PROFESSIONALISM: 5,
        OVERALL_IMPRESSION: 4,
      },
      recommendation: 'RECOMMENDED',
      headline: 'Exceptional applicant profile',
      reviewText: 'Clear documentation, relevant project portfolio.',
      pros: ['Strong SQL skills', 'Clean README'],
      cons: ['None'],
    }),
  });

  const createRes = await postRating(createReq);
  const createJson = await createRes.json();
  console.log('createRes status:', createRes.status, 'createJson:', createJson);
  assert.strictEqual(createRes.status, 201);
  assert.strictEqual(createJson.success, true);
  assert(createJson.ratingId.startsWith('rat_'));
  assert.strictEqual(createJson.status, 'PUBLISHED');
  assert.strictEqual(createJson.overallScore, 4.6);
  console.log(`   ✔ Rating ${createJson.ratingId} created with status ${createJson.status}, overallScore ${createJson.overallScore}`);

  // 4. Test Duplicate Submission Rejection on POST /api/ratings
  console.log('4. Testing Duplicate submission rejection (409 Conflict / ALREADY_RATED)...');
  const dupReq = new NextRequest('http://localhost:3000/api/ratings', {
    method: 'POST',
    headers: {
      'x-user-id': testIndustryUser.id,
      'x-user-role': 'INDUSTRY',
      'x-account-status': 'ACTIVE',
      'x-onboarding-status': 'COMPLETED',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      interactionId: testInteraction.id,
      contextType: 'APPLICATION_REVIEW',
      targetUserId: testStudentUser.id,
      targetEntityId: 'stu_route_stu_01',
      targetRole: 'STUDENT',
      scores: {
        APPLICATION_QUALITY: 5,
        SKILL_RELEVANCE: 4,
        COMMUNICATION: 5,
        PROFESSIONALISM: 5,
        OVERALL_IMPRESSION: 4,
      },
      recommendation: 'RECOMMENDED',
    }),
  });
  const dupRes = await postRating(dupReq);
  const dupJson = await dupRes.json();
  assert.strictEqual(dupRes.status, 409);
  assert.strictEqual(dupJson.success, false);
  assert.strictEqual(dupJson.code, 'ALREADY_RATED');
  console.log('   ✔ Duplicate submission blocked with HTTP 409 ALREADY_RATED');

  // 5. Test GET /api/ratings (List & Filter)
  console.log('5. Testing GET /api/ratings for target entity...');
  const listUrl = `http://localhost:3000/api/ratings?targetEntityId=stu_route_stu_01&targetRole=STUDENT`;
  const listReq = new NextRequest(listUrl);
  const listRes = await getRatings(listReq);
  const listJson = await listRes.json();
  assert.strictEqual(listRes.status, 200);
  assert.strictEqual(listJson.success, true);
  assert(listJson.ratings.length >= 1);
  assert.strictEqual(listJson.aggregate.targetEntityId, 'stu_route_stu_01');
  assert.strictEqual(listJson.aggregate.totalRatingsCount, 1);
  assert.strictEqual(listJson.aggregate.averageScore, 4.6);
  console.log(`   ✔ Filtered ratings count: ${listJson.count}, Aggregate score: ${listJson.aggregate.averageScore} ★`);

  // 6. Test GET /api/ratings/[id] (Detail)
  console.log('6. Testing GET /api/ratings/[id]...');
  const detailReq = new NextRequest(`http://localhost:3000/api/ratings/${createJson.ratingId}`);
  const detailRes = await getRatingDetail(detailReq, { params: { id: createJson.ratingId } });
  const detailJson = await detailRes.json();
  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailJson.success, true);
  assert.strictEqual(detailJson.rating.id, createJson.ratingId);
  assert.strictEqual(detailJson.rating.categoryScores.length, 5);
  console.log('   ✔ Single rating detail fetched with category scores');

  // 7. Test GET /api/ratings/pending
  console.log('7. Testing GET /api/ratings/pending for user...');
  const pendingReq = new NextRequest('http://localhost:3000/api/ratings/pending', {
    headers: {
      'x-user-id': testIndustryUser.id,
      'x-user-role': 'INDUSTRY',
      'x-account-status': 'ACTIVE',
      'x-onboarding-status': 'COMPLETED',
    },
  });
  const pendingRes = await getPendingRatings(pendingReq);
  const pendingJson = await pendingRes.json();
  assert.strictEqual(pendingRes.status, 200);
  assert.strictEqual(pendingJson.success, true);
  console.log(`   ✔ Pending ratings returned: ${pendingJson.count} items`);

  console.log('\n======================================================');
  console.log('  ALL MILESTONE 2 API ROUTE TESTS PASSED 100%!        ');
  console.log('======================================================\n');
}

runRouteTests().catch(err => {
  console.error('Route test error:', err);
  process.exit(1);
});
