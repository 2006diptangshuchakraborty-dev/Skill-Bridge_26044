/**
 * Skill Bridge Platform - Tier 5 Adversarial Coverage & Edge Case Stress Test Suite
 * File: tests/test-tier5-adversarial.js
 * 
 * Verifies:
 * 1. Boundary weights, extreme score values, non-numeric payloads & prototype pollution
 * 2. Blind review deadline expiry fallbacks & concurrent state progressions
 * 3. High-velocity rating attacks, rate limiter sliding windows & anti-fraud radar
 * 4. Nested, malicious, XSS, unicode, and extreme text payloads in reviews/reports/appeals
 * 5. Scale performance & mathematical invariants across 0, 1, and 1,000+ ratings
 * 6. Full lifecycle event integration & aggregate desync repair
 */

const assert = require('assert');
const crypto = require('crypto');
const ratingEngine = require('../lib/rating-engine');
const lifecycleService = require('../lib/lifecycle');
const { PLATFORM_EVENTS, emitPlatformEvent, onPlatformEvent } = require('../lib/events');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(suiteName, testId, description, testFn) {
  totalTests++;
  const t0 = process.hrtime.bigint();
  try {
    testFn();
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    passedTests++;
    console.log(`  ✔ [PASS] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
  } catch (err) {
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    failedTests++;
    console.error(`  ✖ [FAIL] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
    console.error(`     Error: ${err.message}`);
    if (process.env.VERBOSE) {
      console.error(err.stack);
    }
  }
}

function createSandboxDb() {
  return {
    isSandbox: true,
    users: [
      { id: 'usr_student_01', name: 'Aarav Sharma', role: 'STUDENT', entityId: 'std_001' },
      { id: 'usr_student_02', name: 'Priya Patel', role: 'STUDENT', entityId: 'std_002' },
      { id: 'usr_industry_01', name: 'Vikram Mehta', role: 'INDUSTRY', entityId: 'comp_001' },
      { id: 'usr_industry_02', name: 'Sara Khan', role: 'INDUSTRY', entityId: 'comp_002' },
      { id: 'usr_institute_01', name: 'Dr. Ramesh Iyer', role: 'INSTITUTE', entityId: 'inst_001' },
      { id: 'usr_admin_01', name: 'Admin Root', role: 'ADMIN', entityId: 'adm_001' },
      { id: 'usr_attacker_01', name: 'Attacker Bot', role: 'STUDENT', entityId: 'std_att_01' },
    ],
    students: [
      { id: 'std_001', userId: 'usr_student_01', name: 'Aarav Sharma' },
      { id: 'std_002', userId: 'usr_student_02', name: 'Priya Patel' },
    ],
    companies: [
      { id: 'comp_001', userId: 'usr_industry_01', name: 'Nexus Innovations' },
      { id: 'comp_002', userId: 'usr_industry_02', name: 'Vertex Systems' },
    ],
    institutes: [
      { id: 'inst_001', userId: 'usr_institute_01', name: 'National Institute of Tech' },
    ],
    opportunities: [
      { id: 'opp_001', companyId: 'comp_001', title: 'Full Stack Engineer' },
    ],
    applications: [
      { id: 'app_001', studentId: 'std_001', opportunityId: 'opp_001', status: 'REVIEWED' },
    ],
    rating_interactions: [],
    ratings: [],
    rating_category_scores: [],
    rating_aggregates: [],
    rating_reports: [],
    rating_appeals: [],
    rating_audit_logs: [],
    objective_verifications: [],
  };
}

console.log('\n======================================================================');
console.log('  Skill Bridge Tier 5 Adversarial Coverage & Stress Test Harness       ');
console.log('======================================================================\n');

// ============================================================================
// SUITE 1: BOUNDARY WEIGHTS, EXTREME SCORE VALUES & NON-NUMERIC PAYLOADS
// ============================================================================
console.log('▶ SUITE 1: Boundary Weights, Extreme Score Values & Payload Resilience');

runTest('Suite 1', 'T5.01', 'All standard rating contexts have category weights summing strictly to 1.000 (tolerance < 1e-6)', () => {
  const contexts = Object.keys(ratingEngine.RATING_CONTEXT_CATEGORIES);
  assert.ok(contexts.length >= 6, 'Must define at least 6 distinct context category sets');

  for (const ctx of contexts) {
    const categories = ratingEngine.RATING_CONTEXT_CATEGORIES[ctx];
    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
    assert.ok(
      Math.abs(totalWeight - 1.0) < 1e-6,
      `Context '${ctx}' weights sum to ${totalWeight} instead of 1.000`
    );
  }
});

runTest('Suite 1', 'T5.02', 'calculateWeightedOverallScore computes exact mathematical limits (all 1s -> 1.00, all 5s -> 5.00)', () => {
  const appCats = ratingEngine.RATING_CONTEXT_CATEGORIES.APPLICATION_REVIEW;

  const minScores = { APPLICATION_QUALITY: 1, SKILL_RELEVANCE: 1, COMMUNICATION: 1, PROFESSIONALISM: 1, OVERALL_IMPRESSION: 1 };
  assert.strictEqual(ratingEngine.calculateWeightedOverallScore(minScores, appCats), 1.0);

  const maxScores = { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 };
  assert.strictEqual(ratingEngine.calculateWeightedOverallScore(maxScores, appCats), 5.0);
});

runTest('Suite 1', 'T5.03', 'calculateWeightedOverallScore rejects non-integer, negative, out-of-bound, NaN, and Infinity scores', () => {
  const appCats = ratingEngine.RATING_CONTEXT_CATEGORIES.APPLICATION_REVIEW;
  const invalidScores = [
    { APPLICATION_QUALITY: 0, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: 6, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: -5, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: 3.5, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: NaN, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: Infinity, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: -Infinity, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: "5", SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: null, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: undefined, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: {}, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
    { APPLICATION_QUALITY: [5], SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
  ];

  for (const scores of invalidScores) {
    assert.throws(
      () => ratingEngine.calculateWeightedOverallScore(scores, appCats),
      /score must be an integer between 1 and 5|Missing score/,
      `Should have rejected invalid score payload: ${JSON.stringify(scores)}`
    );
  }
});

runTest('Suite 1', 'T5.04', 'calculateWeightedOverallScore rejects missing mandatory categories', () => {
  const appCats = ratingEngine.RATING_CONTEXT_CATEGORIES.APPLICATION_REVIEW;
  const missingOneCat = { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5 }; // missing OVERALL_IMPRESSION
  assert.throws(
    () => ratingEngine.calculateWeightedOverallScore(missingOneCat, appCats),
    /Missing score for category 'OVERALL_IMPRESSION'/
  );
});

runTest('Suite 1', 'T5.05', 'Prototype pollution and injection keys in scores object do not contaminate arithmetic', () => {
  const appCats = ratingEngine.RATING_CONTEXT_CATEGORIES.APPLICATION_REVIEW;
  const maliciousScores = {
    __proto__: { APPLICATION_QUALITY: 1 },
    constructor: { prototype: { poll: true } },
    toString: () => 5,
    APPLICATION_QUALITY: 4,
    SKILL_RELEVANCE: 4,
    COMMUNICATION: 4,
    PROFESSIONALISM: 4,
    OVERALL_IMPRESSION: 4,
    EXTRA_UNAUTHORISED_CATEGORY: 5,
  };

  const score = ratingEngine.calculateWeightedOverallScore(maliciousScores, appCats);
  assert.strictEqual(score, 4.0, 'Extra or polluted keys must not alter weighted sum');
});

// ============================================================================
// SUITE 2: TWO-WAY BLIND REVIEW DEADLINE EXPIRY & CONCURRENT SUBMISSIONS
// ============================================================================
console.log('\n▶ SUITE 2: Two-Way Blind Review Deadline Expiry & Concurrent Progression');

runTest('Suite 2', 'T5.06', 'Two-way blind review: Party A submission holds in PENDING_PUBLICATION without leaking to target aggregate', () => {
  const db = createSandboxDb();
  db.rating_interactions.push({
    id: 'rint_blind_01',
    interactionType: 'INTERNSHIP_PERFORMANCE',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'INTERNSHIP_COMPLETED',
    isBlind: true,
    deadline: new Date(Date.now() + 86400 * 1000).toISOString(),
  });

  const resA = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: 'rint_blind_01',
    scores: { WORK_ETHIC: 5, TECHNICAL_EXECUTION: 5, TEAMWORK: 5, LEARNING_AGILITY: 5, INITIATIVE: 5 },
    recommendation: 'RECOMMENDED',
  });

  assert.strictEqual(resA.success, true);
  assert.strictEqual(resA.status, 'PENDING_PUBLICATION');

  // Verify target aggregate is still UNVERIFIED and has 0 published count
  const agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', 'std_001');
  assert.strictEqual(agg.totalRatingsCount, 0, 'Pending blind rating must not show in published aggregate');
  assert.strictEqual(agg.displayScore, 'No verified ratings yet');
});

runTest('Suite 2', 'T5.07', 'Two-way blind review: Party B submission triggers simultaneous unblinding of both reviews', () => {
  const db = createSandboxDb();
  db.rating_interactions.push({
    id: 'rint_blind_02',
    interactionType: 'INTERNSHIP_PERFORMANCE',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'INTERNSHIP_COMPLETED',
    isBlind: true,
    deadline: new Date(Date.now() + 86400 * 1000).toISOString(),
  });

  // Submission 1: Industry -> Student
  ratingEngine.createRating(db, {
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: 'rint_blind_02',
    scores: { WORK_ETHIC: 5, TECHNICAL_EXECUTION: 5, TEAMWORK: 5, LEARNING_AGILITY: 5, INITIATIVE: 5 },
    recommendation: 'RECOMMENDED',
  });

  // Submission 2: Student -> Industry
  const resB = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_student_01',
    targetUserId: 'usr_industry_01',
    targetEntityId: 'comp_001',
    targetRole: 'INDUSTRY',
    interactionId: 'rint_blind_02',
    scores: { MENTORSHIP_QUALITY: 4, WORK_ENVIRONMENT: 4, LEARNING_OPPORTUNITIES: 4, PROJECT_RELEVANCE: 4, COMPENSATION_FAIRNESS: 4 },
    recommendation: 'RECOMMENDED',
  });

  assert.strictEqual(resB.success, true);
  assert.strictEqual(resB.status, 'PUBLISHED');

  // Verify both reviews in DB are now PUBLISHED
  const rA = db.ratings.find(r => r.interactionId === 'rint_blind_02' && r.reviewerUserId === 'usr_industry_01');
  const rB = db.ratings.find(r => r.interactionId === 'rint_blind_02' && r.reviewerUserId === 'usr_student_01');
  assert.strictEqual(rA.status, 'PUBLISHED');
  assert.strictEqual(rB.status, 'PUBLISHED');

  // Verify Student aggregate updated
  const aggStudent = ratingEngine.recalculateProfileRatings(db, 'STUDENT', 'std_001');
  assert.strictEqual(aggStudent.totalRatingsCount, 1);
  assert.strictEqual(aggStudent.averageScore, 5.0);

  // Verify Industry aggregate updated
  const aggIndustry = ratingEngine.recalculateProfileRatings(db, 'INDUSTRY', 'comp_001');
  assert.strictEqual(aggIndustry.totalRatingsCount, 1);
  assert.strictEqual(aggIndustry.averageScore, 4.0);
});

runTest('Suite 2', 'T5.08', 'Blind review deadline fallback: solitary submission auto-publishes upon publishExpiredBlindReviews', () => {
  const db = createSandboxDb();
  const pastDeadline = new Date(Date.now() - 1000).toISOString();
  db.rating_interactions.push({
    id: 'rint_blind_expired',
    interactionType: 'INTERNSHIP_PERFORMANCE',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'INTERNSHIP_COMPLETED',
    isBlind: true,
    deadline: pastDeadline,
  });

  // Manually place a pending rating (submitted before deadline expired)
  db.ratings.push({
    id: 'rat_solitary_01',
    interactionId: 'rint_blind_expired',
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    overallScore: 4.8,
    recommendation: 'RECOMMENDED',
    status: 'PENDING_PUBLICATION',
    isBlind: true,
    isVerified: true,
    createdAt: new Date(Date.now() - 5000).toISOString(),
  });

  const publishedCount = ratingEngine.publishExpiredBlindReviews(db, 'rint_blind_expired');
  assert.strictEqual(publishedCount, 1);

  const updatedRating = db.ratings.find(r => r.id === 'rat_solitary_01');
  assert.strictEqual(updatedRating.status, 'PUBLISHED');
  assert.ok(updatedRating.publishedAt, 'Must set publishedAt timestamp');

  // Verify Student aggregate reflects the published solitary rating
  const agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', 'std_001');
  assert.strictEqual(agg.totalRatingsCount, 1);
  assert.strictEqual(agg.averageScore, 4.8);
});

runTest('Suite 2', 'T5.09', 'Submitting after deadline expiry is strictly blocked with DEADLINE_EXPIRED', () => {
  const db = createSandboxDb();
  const pastDeadline = new Date(Date.now() - 10000).toISOString();
  db.rating_interactions.push({
    id: 'rint_expired_block',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'REVIEWED',
    deadline: pastDeadline,
  });

  const res = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: 'rint_expired_block',
    scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
    recommendation: 'RECOMMENDED',
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'DEADLINE_EXPIRED');
});

// ============================================================================
// SUITE 3: HIGH-VELOCITY RATING ATTACKS & RATE LIMITER RECOVERY
// ============================================================================
console.log('\n▶ SUITE 3: High-Velocity Rating Attacks & Rate Limiter Resilience');

runTest('Suite 3', 'T5.10', 'Velocity limiter blocks 11th rating within 1-hour window for single user (HTTP 429)', () => {
  const db = createSandboxDb();

  // Create 10 distinct interactions and submit 10 ratings
  for (let i = 1; i <= 10; i++) {
    const interId = `rint_flood_${i}`;
    db.rating_interactions.push({
      id: interId,
      interactionType: 'APPLICATION_REVIEW',
      initiatorUserId: 'usr_attacker_01',
      initiatorEntityId: 'std_att_01',
      participantUserId: 'usr_student_01',
      participantEntityId: 'std_001',
      status: 'REVIEWED',
      deadline: null,
    });

    const res = ratingEngine.createRating(db, {
      reviewerUserId: 'usr_attacker_01',
      targetUserId: 'usr_student_01',
      targetEntityId: 'std_001',
      targetRole: 'STUDENT',
      interactionId: interId,
      scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
      recommendation: 'RECOMMENDED',
    });
    assert.strictEqual(res.success, true, `Rating #${i} should succeed`);
  }

  // 11th rating attempt within same hour
  const inter11 = 'rint_flood_11';
  db.rating_interactions.push({
    id: inter11,
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_attacker_01',
    initiatorEntityId: 'std_att_01',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'REVIEWED',
    deadline: null,
  });

  const res11 = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_attacker_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: inter11,
    scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
    recommendation: 'RECOMMENDED',
  });

  assert.strictEqual(res11.success, false);
  assert.strictEqual(res11.code, 'RATE_LIMIT_EXCEEDED');
});

runTest('Suite 3', 'T5.11', 'Rate limiter is isolated per-user: Attacker lock does not affect legitimate users', () => {
  const db = createSandboxDb();

  // Populate 10 ratings by attacker
  for (let i = 1; i <= 10; i++) {
    db.ratings.push({
      id: `rat_att_${i}`,
      reviewerUserId: 'usr_attacker_01',
      targetEntityId: 'std_001',
      targetRole: 'STUDENT',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
    });
  }

  // Legitimate user rating an interaction
  db.rating_interactions.push({
    id: 'rint_legit_01',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'REVIEWED',
    deadline: null,
  });

  const resLegit = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: 'rint_legit_01',
    scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
    recommendation: 'RECOMMENDED',
  });

  assert.strictEqual(resLegit.success, true, 'Legitimate user must not be throttled by attacker limit');
});

runTest('Suite 3', 'T5.12', 'Anti-fraud radar detects velocity spike (>5 reviews/hour) and unverified interaction anomaly', () => {
  const db = createSandboxDb();
  const now = Date.now();

  // Add 6 ratings within 10 minutes to std_002
  for (let i = 0; i < 6; i++) {
    db.ratings.push({
      id: `rat_spike_${i}`,
      targetEntityId: 'std_002',
      targetRole: 'STUDENT',
      isVerified: i < 2, // 4 out of 6 unverified (>40%)
      createdAt: new Date(now - i * 60 * 1000).toISOString(),
    });
  }

  const radar = ratingEngine.detectSuspiciousRatingActivity(db, {
    targetRole: 'STUDENT',
    targetEntityId: 'std_002',
  });

  assert.strictEqual(radar.isSuspicious, true);
  assert.ok(radar.anomalies.some(a => a.includes('VELOCITY_SPIKE_DETECTED')));
  assert.ok(radar.anomalies.some(a => a.includes('HIGH_UNVERIFIED_RATIO')));
});

// ============================================================================
// SUITE 4: NESTED, MALICIOUS & EXTREME TEXT PAYLOADS
// ============================================================================
console.log('\n▶ SUITE 4: Nested, Malicious & Extreme Text Payloads in Reviews & Moderation');

runTest('Suite 4', 'T5.13', 'Handles XSS payloads, SQL injections, null bytes and Unicode emojis safely in reviews', () => {
  const db = createSandboxDb();
  db.rating_interactions.push({
    id: 'rint_xss_01',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    initiatorEntityId: 'comp_001',
    participantUserId: 'usr_student_01',
    participantEntityId: 'std_001',
    status: 'REVIEWED',
  });

  const maliciousHeadline = "<script>alert('xss')</script> SELECT * FROM users WHERE '1'='1'; \0\0";
  const maliciousReview = "<iframe src='evil.com'></iframe> 🚀🌟🎉 Exceptional performance! 𝓤𝓷𝓲𝓬𝓸𝓭𝓮 𝑇𝑒𝑠𝑡";
  const pros = ["<b onmouseover=alert(1)>Great</b>", "⚡ Super fast delivery"];
  const cons = ["DROP TABLE ratings; --", "None 🎉"];

  const res = ratingEngine.createRating(db, {
    reviewerUserId: 'usr_industry_01',
    targetUserId: 'usr_student_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    interactionId: 'rint_xss_01',
    scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
    recommendation: 'RECOMMENDED',
    headline: maliciousHeadline,
    reviewText: maliciousReview,
    pros,
    cons,
  });

  assert.strictEqual(res.success, true);
  const stored = db.ratings.find(r => r.id === res.ratingId);
  assert.strictEqual(stored.headline, maliciousHeadline);
  assert.strictEqual(stored.reviewText, maliciousReview);
  assert.deepStrictEqual(stored.pros, pros);
  assert.deepStrictEqual(stored.cons, cons);
});

runTest('Suite 4', 'T5.14', 'Moderation: Submits report and appeal with large multi-KB payloads and logs audit trails', () => {
  const db = createSandboxDb();
  const ratingId = 'rat_mod_target_01';
  db.ratings.push({
    id: ratingId,
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    reviewerUserId: 'usr_industry_01',
    overallScore: 2.0,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
  });

  const largeDetails = 'A'.repeat(50000); // 50 KB text
  const report = ratingEngine.reportRating(db, {
    ratingId,
    reporterUserId: 'usr_student_01',
    reason: 'HARASSMENT_OR_ABUSE',
    details: largeDetails,
  });

  assert.strictEqual(report.ratingId, ratingId);
  assert.strictEqual(report.status, 'PENDING');
  assert.strictEqual(report.details.length, 50000);

  // Admin hides rating
  const hidden = ratingEngine.hideRating(db, {
    ratingId,
    adminUserId: 'usr_admin_01',
    reason: 'Violates community guidelines',
  });
  assert.strictEqual(hidden.status, 'HIDDEN');

  // Author appeals with large justification
  const appeal = ratingEngine.appealRating(db, {
    ratingId,
    appealingUserId: 'usr_industry_01',
    reason: 'FALSE_REPORT',
    justification: 'B'.repeat(30000),
  });
  assert.strictEqual(appeal.status, 'PENDING');

  // Admin restores rating
  const restored = ratingEngine.restoreRating(db, {
    ratingId,
    adminUserId: 'usr_admin_01',
    resolutionNotes: 'Appeal accepted upon review',
  });
  assert.strictEqual(restored.status, 'PUBLISHED');

  const resolvedAppeal = db.rating_appeals.find(a => a.id === appeal.id);
  assert.strictEqual(resolvedAppeal.status, 'APPROVED_RESTORED');
});

// ============================================================================
// SUITE 5: SCALE PERFORMANCE & MATHEMATICAL INVARIANTS (0, 1, 1000+ RATINGS)
// ============================================================================
console.log('\n▶ SUITE 5: Scale Performance & Mathematical Invariants (0, 1, and 1,000+ Ratings)');

runTest('Suite 5', 'T5.15', 'recalculateProfileRatings on empty profile (0 ratings) returns exact zeroed aggregate & UNVERIFIED', () => {
  const db = createSandboxDb();
  const agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', 'std_empty_001');

  assert.strictEqual(agg.totalRatingsCount, 0);
  assert.strictEqual(agg.verifiedRatingsCount, 0);
  assert.strictEqual(agg.averageScore, 0);
  assert.strictEqual(agg.displayScore, 'No verified ratings yet');
  assert.strictEqual(agg.recommendationRate, 0);
  assert.strictEqual(agg.verificationTrustLevel, 'UNVERIFIED');
  assert.deepStrictEqual(agg.scoreDistribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
});

runTest('Suite 5', 'T5.16', 'Trust tier boundaries: 0 -> UNVERIFIED, 1 -> VERIFIED_TIER1, 5 -> VERIFIED_TIER2, 10 (>=4.5) -> GOLD_TRUSTED', () => {
  const db = createSandboxDb();
  const targetId = 'std_tier_test';

  // 0 ratings
  let agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  assert.strictEqual(agg.verificationTrustLevel, 'UNVERIFIED');

  // 1 rating
  db.ratings.push({ id: 'r1', targetEntityId: targetId, targetRole: 'STUDENT', overallScore: 4.0, status: 'PUBLISHED', isVerified: true });
  agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  assert.strictEqual(agg.verificationTrustLevel, 'VERIFIED_TIER1');

  // Add 4 more ratings (Total: 5, avg >= 4.0) -> VERIFIED_TIER2
  for (let i = 2; i <= 5; i++) {
    db.ratings.push({ id: `r${i}`, targetEntityId: targetId, targetRole: 'STUDENT', overallScore: 4.2, status: 'PUBLISHED', isVerified: true });
  }
  agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  assert.strictEqual(agg.totalRatingsCount, 5);
  assert.strictEqual(agg.verificationTrustLevel, 'VERIFIED_TIER2');

  // Add 5 more 5.0 ratings (Total: 10, avg >= 4.5, verified >= 8) -> GOLD_TRUSTED
  for (let i = 6; i <= 10; i++) {
    db.ratings.push({ id: `r${i}`, targetEntityId: targetId, targetRole: 'STUDENT', overallScore: 5.0, status: 'PUBLISHED', isVerified: true });
  }
  agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  assert.strictEqual(agg.totalRatingsCount, 10);
  assert.strictEqual(agg.verificationTrustLevel, 'GOLD_TRUSTED');

  // Add a 1.0 rating (Total: 11, avg drops below 4.5) -> falls back to VERIFIED_TIER2
  db.ratings.push({ id: 'r11', targetEntityId: targetId, targetRole: 'STUDENT', overallScore: 1.0, status: 'PUBLISHED', isVerified: true });
  agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  assert.strictEqual(agg.totalRatingsCount, 11);
  assert.ok(agg.averageScore < 4.5);
  assert.strictEqual(agg.verificationTrustLevel, 'VERIFIED_TIER2');
});

runTest('Suite 5', 'T5.17', 'Stress Scale: 1,000 ratings recalculation executes in <50ms with 100% mathematical invariant consistency', () => {
  const db = createSandboxDb();
  const targetId = 'std_scale_1000';
  const N = 1000;

  let expectedSum = 0;
  let expectedRecommended = 0;
  const expectedDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const contexts = ['APPLICATION_REVIEW', 'INTERVIEW_FEEDBACK', 'INTERNSHIP_PERFORMANCE', 'COURSE_EVALUATION'];

  // Seed 1,000 deterministic ratings
  for (let i = 1; i <= N; i++) {
    const star = ((i % 5) + 1); // 1, 2, 3, 4, 5 cyclic
    const score = Number(star.toFixed(2));
    const isRec = star >= 4 ? 'RECOMMENDED' : (star === 3 ? 'NEUTRAL' : 'NOT_RECOMMENDED');
    const ctx = contexts[i % contexts.length];

    expectedSum += score;
    if (isRec === 'RECOMMENDED') expectedRecommended++;
    expectedDist[star]++;

    const ratingId = `rat_scale_${i}`;
    db.ratings.push({
      id: ratingId,
      targetEntityId: targetId,
      targetRole: 'STUDENT',
      overallScore: score,
      recommendation: isRec,
      contextType: ctx,
      status: 'PUBLISHED',
      isVerified: true,
    });

    db.rating_category_scores.push({
      id: `rcs_scale_${i}`,
      ratingId,
      categoryCode: 'CORE_EXECUTION',
      score: star,
    });
  }

  const t0 = process.hrtime.bigint();
  const agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', targetId);
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;

  // Invariant 1: Total count matches N
  assert.strictEqual(agg.totalRatingsCount, N);
  assert.strictEqual(agg.verifiedRatingsCount, N);

  // Invariant 2: Score distribution sum equals N
  const distSum = Object.values(agg.scoreDistribution).reduce((a, b) => a + b, 0);
  assert.strictEqual(distSum, N, `Distribution sum ${distSum} must equal ${N}`);
  assert.deepStrictEqual(agg.scoreDistribution, expectedDist);

  // Invariant 3: Context breakdown sum equals N
  const ctxSum = Object.values(agg.contextBreakdown).reduce((a, b) => a + b, 0);
  assert.strictEqual(ctxSum, N, `Context sum ${ctxSum} must equal ${N}`);

  // Invariant 4: Average score matches exact arithmetic mean
  const expectedAvg = Number((expectedSum / N).toFixed(2));
  assert.strictEqual(agg.averageScore, expectedAvg);

  // Invariant 5: Recommendation rate matches exact percentage
  const expectedRate = Number(((expectedRecommended / N) * 100).toFixed(1));
  assert.strictEqual(agg.recommendationRate, expectedRate);

  // Invariant 6: Performance constraint (<50ms for 1000 items)
  assert.ok(durationMs < 50, `Recalculation on 1,000 ratings took ${durationMs.toFixed(2)}ms (expected < 50ms)`);
});

// ============================================================================
// SUITE 6: LIFECYCLE EVENT INTEGRATION & EVENT DISPATCHER
// ============================================================================
console.log('\n▶ SUITE 6: Platform Lifecycle Event Handlers & Event Bus Verification');

runTest('Suite 6', 'T5.18', 'Lifecycle: handleApplicationReview creates APPLICATION_REVIEW interaction and emits event', () => {
  const db = createSandboxDb();
  let eventFired = false;
  let receivedPayload = null;

  const unsubscribe = onPlatformEvent(PLATFORM_EVENTS.APPLICATION_REVIEWED, (payload) => {
    eventFired = true;
    receivedPayload = payload;
  });

  const res = lifecycleService.handleApplicationReview(db, {
    applicationId: 'app_001',
    status: 'REVIEWED',
    reviewerUserId: 'usr_industry_01',
    notes: 'Candidate has strong fundamentals',
  });

  unsubscribe();

  assert.strictEqual(res.success, true);
  assert.ok(res.interaction);
  assert.strictEqual(res.interaction.interactionType, 'APPLICATION_REVIEW');
  assert.strictEqual(res.interaction.status, 'REVIEWED');
  assert.strictEqual(eventFired, true);
  assert.strictEqual(receivedPayload.applicationId, 'app_001');
});

runTest('Suite 6', 'T5.19', 'Lifecycle: handleInterviewCompletion creates INTERVIEW_FEEDBACK interaction and updates app', () => {
  const db = createSandboxDb();
  const res = lifecycleService.handleInterviewCompletion(db, {
    applicationId: 'app_001',
    companyId: 'comp_001',
    studentId: 'std_001',
    interviewType: 'System Design Interview',
    round: 2,
    notes: 'Strong problem solving',
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.interaction);
  assert.strictEqual(res.interaction.interactionType, 'INTERVIEW_FEEDBACK');
  assert.strictEqual(res.interaction.status, 'INTERVIEW_COMPLETED');
});

runTest('Suite 6', 'T5.20', 'Lifecycle: handleAssessmentEvaluation creates evaluation interaction and links objective verification score', () => {
  const db = createSandboxDb();
  const res = lifecycleService.handleAssessmentEvaluation(db, {
    studentId: 'std_001',
    studentUserId: 'usr_student_01',
    skillId: 'skill_react',
    skillName: 'React & Next.js Core',
    overallScore: 92,
    proficiencyLevel: 'Advanced',
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.interaction);
  assert.strictEqual(res.interaction.interactionType, 'TASK_EVALUATION');
  assert.strictEqual(res.interaction.status, 'EVALUATED');
  assert.strictEqual(res.interaction.metadata.overallScore, 92);

  // Verify objective verification record exists in DB
  const verRec = db.objective_verifications.find(v => v.entityId === 'std_001');
  assert.ok(verRec, 'Objective verification record must be persisted in DB');
  assert.strictEqual(verRec.score, 92);

  // Add a rating to student and verify 3-pillar aggregate computes objectiveSkillScore = 92.0
  db.ratings.push({
    id: 'rat_pillar_01',
    targetEntityId: 'std_001',
    targetRole: 'STUDENT',
    overallScore: 4.5,
    status: 'PUBLISHED',
    isVerified: true,
  });

  const agg = ratingEngine.recalculateProfileRatings(db, 'STUDENT', 'std_001');
  assert.strictEqual(agg.objectiveSkillScore, 92.0, 'Pillar 2 Objective Skill Score must be 92.0');
  assert.strictEqual(agg.averageScore, 4.5, 'Pillar 3 Experience Reputation must be 4.5');
});

runTest('Suite 6', 'T5.21', 'Lifecycle: handleInternshipCompletion creates 2-way blind interaction with 14-day window', () => {
  const db = createSandboxDb();
  const tStart = Date.now();
  const res = lifecycleService.handleInternshipCompletion(db, {
    internshipId: 'intern_2026_01',
    companyId: 'comp_001',
    studentId: 'std_001',
    title: 'Software Engineering Internship',
    ratingWindowDays: 14,
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.interaction);
  assert.strictEqual(res.interaction.isBlind, true);
  assert.strictEqual(res.interaction.status, 'INTERNSHIP_COMPLETED');

  const deadlineMs = new Date(res.interaction.deadline).getTime();
  const expected14DaysMs = tStart + 14 * 24 * 3600 * 1000;
  assert.ok(
    Math.abs(deadlineMs - expected14DaysMs) < 5000,
    'Deadline should be approximately 14 days in future'
  );
});

runTest('Suite 6', 'T5.22', 'Pending Ratings: getPendingRatingsForUser accurately filters active vs expired vs already rated', () => {
  const db = createSandboxDb();
  const now = Date.now();

  // 1. Eligible interaction
  db.rating_interactions.push({
    id: 'rint_pending_active',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    participantUserId: 'usr_student_01',
    status: 'REVIEWED',
    deadline: new Date(now + 3600 * 1000).toISOString(),
  });

  // 2. Expired interaction
  db.rating_interactions.push({
    id: 'rint_pending_expired',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    participantUserId: 'usr_student_01',
    status: 'REVIEWED',
    deadline: new Date(now - 3600 * 1000).toISOString(),
  });

  // 3. Already rated interaction
  db.rating_interactions.push({
    id: 'rint_pending_rated',
    interactionType: 'APPLICATION_REVIEW',
    initiatorUserId: 'usr_industry_01',
    participantUserId: 'usr_student_01',
    status: 'REVIEWED',
    deadline: new Date(now + 3600 * 1000).toISOString(),
  });
  db.ratings.push({
    id: 'rat_existing_01',
    interactionId: 'rint_pending_rated',
    reviewerUserId: 'usr_industry_01',
    status: 'PUBLISHED',
  });

  // Query pending for usr_industry_01
  const pending = ratingEngine.getPendingRatingsForUser(db, 'usr_industry_01', 'INDUSTRY');
  assert.strictEqual(pending.length, 1, 'Should only return the 1 active non-expired unrated interaction');
  assert.strictEqual(pending[0].interactionId, 'rint_pending_active');
  assert.ok(pending[0].countdownMs > 0, 'Countdown MS should be positive');
});

// ============================================================================
// FINAL SUMMARY & EXIT
// ============================================================================
console.log('\n----------------------------------------------------------------------');
console.log('                 TIER 5 ADVERSARIAL TEST SUMMARY                      ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Tests Executed : ${totalTests}`);
console.log(`  Passed Tests         : ${passedTests}`);
console.log(`  Failed Tests         : ${failedTests}`);
console.log(`  Pass Rate            : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failedTests > 0) {
  console.error(`❌ TIER 5 ADVERSARIAL SUITE FAILED WITH ${failedTests} FAILURE(S)`);
  process.exit(1);
} else {
  console.log('✅ ALL TIER 5 ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY (100%)\n');
  process.exit(0);
}
