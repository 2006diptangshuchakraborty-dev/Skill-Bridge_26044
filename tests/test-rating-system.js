#!/usr/bin/env node
/**
 * Skill Bridge Platform - Verified Reputation, Rating, Feedback, Trust & Review System
 * Master 4-Tier Standalone E2E Test Suite Runner
 * File: tests/test-rating-system.js
 * 
 * Usage:
 *   node tests/test-rating-system.js
 *   node tests/test-rating-system.js --tier=1
 *   node tests/test-rating-system.js --tier=2
 *   node tests/test-rating-system.js --tier=3
 *   node tests/test-rating-system.js --tier=4
 *   node tests/test-rating-system.js --verbose
 *   node tests/test-rating-system.js --json
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  ROLES,
  INTERACTION_TYPES,
  INTERACTION_STATUS,
  RATING_STATUS,
  RECOMMENDATION_TYPES,
  TRUST_LEVELS,
  REPORT_STATUS,
  APPEAL_STATUS,
  RATING_CONTEXT_CATEGORIES,
  getCategoriesForContext,
  createRatingSandbox,
  getRatingEligibility,
  calculateWeightedOverallScore,
  createRating,
  publishExpiredBlindReviews,
  recalculateProfileRatings,
  reportRating,
  hideRating,
  appealRating,
  restoreRating,
  detectSuspiciousRatingActivity,
} = require('./rating-test-helper');

// Color formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgBlue: '\x1b[44m\x1b[37m',
};

class RatingTestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = 0;
    this.verbose = process.argv.includes('--verbose');
    this.jsonMode = process.argv.includes('--json');
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      fn,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;

    try {
      if (typeof fn === 'function') {
        fn(this);
      }
    } catch (e) {
      console.error(`Error configuring describe block "${suiteName}":`, e);
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be defined inside a describe block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: false,
    });
  }

  skip(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be defined inside a describe block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: true,
    });
  }

  async run(filterTier = null) {
    this.startTime = Date.now();

    const activeSuites = this.suites.filter(s => {
      if (s.tests.length === 0) return false;
      if (!filterTier) return true;
      return s.name.toLowerCase().includes(`tier ${filterTier}`) || s.name.toLowerCase().includes(`tier${filterTier}`);
    });

    if (!this.jsonMode) {
      console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}  Skill Bridge Verified Reputation & Trust Platform - E2E Suite      ${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);
    }

    if (activeSuites.length === 0) {
      if (!this.jsonMode) {
        console.log(`${colors.yellow}No test suites matched filter: tier ${filterTier}${colors.reset}\n`);
      }
      return { totalPassed: 0, totalFailed: 0, totalSkipped: 0, totalTests: 0, duration: 0, suites: [] };
    }

    const jsonReport = {
      timestamp: new Date().toISOString(),
      filterTier: filterTier || 'all',
      suites: [],
    };

    for (const suite of activeSuites) {
      const suiteStart = Date.now();
      if (!this.jsonMode) {
        console.log(`${colors.bright}${colors.blue}▶ SUITE: ${suite.name}${colors.reset}`);
      }

      const suiteJson = {
        name: suite.name,
        passed: 0,
        failed: 0,
        skipped: 0,
        tests: [],
      };

      for (const t of suite.tests) {
        if (t.skip) {
          suite.skipped++;
          this.totalSkipped++;
          suiteJson.skipped++;
          suiteJson.tests.push({ name: t.name, status: 'SKIPPED' });
          if (!this.jsonMode) {
            console.log(`  ${colors.yellow}○ [SKIP]${colors.reset} ${t.name}`);
          }
          continue;
        }

        const tStart = Date.now();
        try {
          if (typeof t.fn === 'function') {
            const res = t.fn();
            if (res && typeof res.then === 'function') {
              await res;
            }
          }
          const tDuration = Date.now() - tStart;
          suite.passed++;
          this.totalPassed++;
          suiteJson.passed++;
          suiteJson.tests.push({ name: t.name, status: 'PASSED', durationMs: tDuration });
          if (!this.jsonMode) {
            console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${t.name} ${colors.dim}(${tDuration}ms)${colors.reset}`);
          }
        } catch (err) {
          const tDuration = Date.now() - tStart;
          suite.failed++;
          this.totalFailed++;
          suiteJson.failed++;
          suiteJson.tests.push({ name: t.name, status: 'FAILED', durationMs: tDuration, error: err.message });
          if (!this.jsonMode) {
            console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${t.name} ${colors.dim}(${tDuration}ms)${colors.reset}`);
            console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
            if (this.verbose && err.stack) {
              console.log(`     ${colors.dim}${err.stack}${colors.reset}`);
            }
          }
        }
      }

      suite.duration = Date.now() - suiteStart;
      suiteJson.durationMs = suite.duration;
      jsonReport.suites.push(suiteJson);

      if (!this.jsonMode) {
        console.log(`  ${colors.dim}Summary: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped (${suite.duration}ms)${colors.reset}\n`);
      }
    }

    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.totalPassed + this.totalFailed + this.totalSkipped;
    const passRate = totalTests > 0 ? ((this.totalPassed / (this.totalPassed + this.totalFailed)) * 100).toFixed(1) : 0;

    jsonReport.summary = {
      totalSuites: activeSuites.length,
      totalTests,
      passed: this.totalPassed,
      failed: this.totalFailed,
      skipped: this.totalSkipped,
      passRatePercent: Number(passRate),
      durationMs: totalDuration,
      status: this.totalFailed === 0 ? 'SUCCESS' : 'FAILURE',
    };

    if (this.jsonMode) {
      console.log(JSON.stringify(jsonReport, null, 2));
    } else {
      console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
      console.log(`${colors.bright}                     TEST SUITE EXECUTION SUMMARY                    ${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
      console.log(`  Total Test Suites  : ${activeSuites.length}`);
      console.log(`  Total Test Cases   : ${totalTests}`);
      console.log(`  Passed Tests       : ${colors.green}${this.totalPassed}${colors.reset}`);
      console.log(`  Failed Tests       : ${this.totalFailed > 0 ? colors.red : colors.dim}${this.totalFailed}${colors.reset}`);
      console.log(`  Skipped Tests      : ${this.totalSkipped > 0 ? colors.yellow : colors.dim}${this.totalSkipped}${colors.reset}`);
      console.log(`  Overall Pass Rate  : ${this.totalFailed === 0 ? colors.bright + colors.green : colors.red}${passRate}%${colors.reset}`);
      console.log(`  Total Duration     : ${totalDuration}ms`);
      console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

      if (this.totalFailed === 0) {
        console.log(`  ${colors.bgGreen} ALL REPUTATION & TRUST SYSTEM TESTS PASSED SUCCESSFULLY ${colors.reset}\n`);
      } else {
        console.log(`  ${colors.bgRed} TEST SUITE FAILED WITH ${this.totalFailed} FAILURES ${colors.reset}\n`);
      }
    }

    return {
      totalPassed: this.totalPassed,
      totalFailed: this.totalFailed,
      totalSkipped: this.totalSkipped,
      totalTests,
      duration: totalDuration,
      suites: activeSuites,
    };
  }
}

// Instantiate Runner
const harness = new RatingTestHarness();

// ============================================================================
// REGISTER TIER 1: FEATURE COVERAGE (UNIT & ISOLATED FEATURE CONTRACTS)
// ============================================================================
harness.describe('Tier 1: Feature Coverage & Interface Contracts', (h) => {
  // Context Category Weights Validation
  h.test('T1.01: Application Review category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    assert.strictEqual(cats.length, 5, 'Application review must have exactly 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Category weights sum (${totalWeight}) must equal 1.00`);
    const expectedCodes = ['APPLICATION_QUALITY', 'SKILL_RELEVANCE', 'COMMUNICATION', 'PROFESSIONALISM', 'OVERALL_IMPRESSION'];
    expectedCodes.forEach(code => {
      assert(cats.some(c => c.code === code), `Category '${code}' must be present`);
    });
  });

  h.test('T1.02: Interview Feedback category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.INTERVIEW_FEEDBACK, ROLES.STUDENT);
    assert.strictEqual(cats.length, 5, 'Interview feedback must have 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Interview weights must equal 1.00`);
  });

  h.test('T1.03: Task Evaluation category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.TASK_EVALUATION, ROLES.STUDENT);
    assert.strictEqual(cats.length, 5, 'Task evaluation must have 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Task weights must equal 1.00`);
  });

  h.test('T1.04: Internship Performance (Student) category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.INTERNSHIP_PERFORMANCE, ROLES.STUDENT);
    assert.strictEqual(cats.length, 5, 'Internship student review must have 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Internship student weights must equal 1.00`);
  });

  h.test('T1.05: Internship Performance (Industry) category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.INTERNSHIP_PERFORMANCE, ROLES.INDUSTRY);
    assert.strictEqual(cats.length, 5, 'Internship industry review must have 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Internship industry weights must equal 1.00`);
  });

  h.test('T1.06: Course Evaluation category seed weights sum strictly to 1.00', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.COURSE_EVALUATION, ROLES.INSTITUTE);
    assert.strictEqual(cats.length, 5, 'Course evaluation must have 5 categories');
    const totalWeight = cats.reduce((acc, c) => acc + c.weight, 0);
    assert(Math.abs(totalWeight - 1.0) < 0.001, `Course evaluation weights must equal 1.00`);
  });

  // Eligibility Engine Happy Paths
  h.test('T1.07: getRatingEligibility() confirms Industry eligible to rate Student on REVIEWED application', () => {
    const db = createRatingSandbox();
    const indUser = db.addUser({ id: 'usr_ind_1', role: ROLES.INDUSTRY });
    const stdUser = db.addUser({ id: 'usr_std_1', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.APPLICATION_REVIEW,
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: indUser.id,
      participantUserId: stdUser.id,
      participantEntityId: 'std_profile_1',
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: indUser.id,
      targetEntityId: 'std_profile_1',
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, true, 'Industry must be eligible on REVIEWED application');
    assert.strictEqual(res.isBlind, false, 'Application review is not blind');
    assert(Array.isArray(res.allowedCategories) && res.allowedCategories.length === 5);
  });

  h.test('T1.08: getRatingEligibility() confirms eligible on INTERVIEW_COMPLETED stage', () => {
    const db = createRatingSandbox();
    const indUser = db.addUser({ id: 'usr_ind_2', role: ROLES.INDUSTRY });
    const stdUser = db.addUser({ id: 'usr_std_2', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERVIEW_FEEDBACK,
      status: INTERACTION_STATUS.INTERVIEW_COMPLETED,
      initiatorUserId: indUser.id,
      participantUserId: stdUser.id,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: indUser.id,
      targetEntityId: stdUser.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, true, 'Must be eligible after interview completion');
  });

  h.test('T1.09: getRatingEligibility() flags isBlind: true on INTERNSHIP_COMPLETED interaction', () => {
    const db = createRatingSandbox();
    const indUser = db.addUser({ id: 'usr_ind_3', role: ROLES.INDUSTRY });
    const stdUser = db.addUser({ id: 'usr_std_3', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      status: INTERACTION_STATUS.INTERNSHIP_COMPLETED,
      initiatorUserId: indUser.id,
      participantUserId: stdUser.id,
      isBlind: true,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: stdUser.id,
      targetEntityId: indUser.id,
      targetEntityType: ROLES.INDUSTRY,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, true);
    assert.strictEqual(res.isBlind, true, 'Internship performance ratings must enforce blind review mode');
  });

  h.test('T1.10: getRatingEligibility() confirms Student eligible to rate Institute on COURSE_COMPLETED', () => {
    const db = createRatingSandbox();
    const instUser = db.addUser({ id: 'usr_inst_1', role: ROLES.INSTITUTE });
    const stdUser = db.addUser({ id: 'usr_std_4', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.COURSE_EVALUATION,
      status: INTERACTION_STATUS.COURSE_COMPLETED,
      initiatorUserId: instUser.id,
      participantUserId: stdUser.id,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: stdUser.id,
      targetEntityId: instUser.id,
      targetEntityType: ROLES.INSTITUTE,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, true);
  });

  // Scoring Arithmetic & Weighted Calculations
  h.test('T1.11: Computes exact weighted arithmetic mean for uniform maximum scores (all 5s = 5.00)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    const scores = {
      APPLICATION_QUALITY: 5,
      SKILL_RELEVANCE: 5,
      COMMUNICATION: 5,
      PROFESSIONALISM: 5,
      OVERALL_IMPRESSION: 5,
    };
    const overall = calculateWeightedOverallScore(scores, cats);
    assert.strictEqual(overall, 5.0, 'Uniform score 5 must yield overallScore 5.00');
  });

  h.test('T1.12: Computes exact weighted score with non-uniform integer scores matching weights', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    // Weights: 0.25, 0.25, 0.20, 0.15, 0.15
    // Scores: 4*0.25 + 5*0.25 + 3*0.20 + 4*0.15 + 5*0.15 = 1.0 + 1.25 + 0.60 + 0.60 + 0.75 = 4.20
    const scores = {
      APPLICATION_QUALITY: 4,
      SKILL_RELEVANCE: 5,
      COMMUNICATION: 3,
      PROFESSIONALISM: 4,
      OVERALL_IMPRESSION: 5,
    };
    const overall = calculateWeightedOverallScore(scores, cats);
    assert.strictEqual(overall, 4.2, `Expected 4.20, got ${overall}`);
  });

  h.test('T1.13: Computes exact minimum weighted score (all 1s = 1.00)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    const scores = {
      APPLICATION_QUALITY: 1,
      SKILL_RELEVANCE: 1,
      COMMUNICATION: 1,
      PROFESSIONALISM: 1,
      OVERALL_IMPRESSION: 1,
    };
    const overall = calculateWeightedOverallScore(scores, cats);
    assert.strictEqual(overall, 1.0, 'Uniform score 1 must yield overallScore 1.00');
  });

  // Rating Submission API Contract
  h.test('T1.14: createRating() persists rating record and returns PUBLISHED status for direct reviews', () => {
    const db = createRatingSandbox();
    const indUser = db.addUser({ id: 'usr_ind_submit', role: ROLES.INDUSTRY });
    const stdUser = db.addUser({ id: 'usr_std_submit', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.APPLICATION_REVIEW,
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: indUser.id,
      participantUserId: stdUser.id,
      isBlind: false,
    });

    const result = createRating(db, {
      reviewerUserId: indUser.id,
      targetUserId: stdUser.id,
      targetEntityId: stdUser.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: {
        APPLICATION_QUALITY: 5,
        SKILL_RELEVANCE: 4,
        COMMUNICATION: 5,
        PROFESSIONALISM: 4,
        OVERALL_IMPRESSION: 5,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      headline: 'Outstanding candidate submission',
      reviewText: 'Great code structure and clear responses.',
      pros: ['Fast response', 'Clean code'],
      cons: ['None'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, RATING_STATUS.PUBLISHED);
    assert(result.ratingId.startsWith('rat_'));
    assert(result.overallScore >= 4.0 && result.overallScore <= 5.0);
    assert(result.publishedAt !== null);

    // Verify record in DB
    const saved = db.ratings.find(r => r.id === result.ratingId);
    assert(saved, 'Rating must exist in database');
    assert.strictEqual(saved.recommendation, 'RECOMMENDED');
  });

  // Trust Levels & 3-Pillar Demarcation
  h.test('T1.15: recalculateProfileRatings() resolves UNVERIFIED trust level when 0 ratings exist', () => {
    const db = createRatingSandbox();
    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, 'std_empty');
    assert.strictEqual(aggregate.totalRatingsCount, 0);
    assert.strictEqual(aggregate.verificationTrustLevel, TRUST_LEVELS.UNVERIFIED);
    assert.strictEqual(aggregate.displayScore, 'No verified ratings yet');
  });

  h.test('T1.16: recalculateProfileRatings() resolves VERIFIED_TIER1 upon first verified review', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_v1', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_v1', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
    });

    createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 4, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(aggregate.totalRatingsCount, 1);
    assert.strictEqual(aggregate.verificationTrustLevel, TRUST_LEVELS.VERIFIED_TIER1);
    assert.strictEqual(aggregate.recommendationRate, 100.0);
  });

  h.test('T1.17: recalculateProfileRatings() resolves VERIFIED_TIER2 with >= 5 verified ratings', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_v2', role: ROLES.STUDENT });

    for (let i = 1; i <= 5; i++) {
      const ind = db.addUser({ id: `usr_ind_batch_${i}`, role: ROLES.INDUSTRY });
      const inter = db.addInteraction({
        status: INTERACTION_STATUS.REVIEWED,
        initiatorUserId: ind.id,
        participantUserId: std.id,
      });
      createRating(db, {
        reviewerUserId: ind.id,
        targetUserId: std.id,
        targetRole: ROLES.STUDENT,
        interactionId: inter.id,
        scores: { APPLICATION_QUALITY: 4, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
        recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      });
    }

    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(aggregate.totalRatingsCount, 5);
    assert.strictEqual(aggregate.verificationTrustLevel, TRUST_LEVELS.VERIFIED_TIER2);
  });

  h.test('T1.18: recalculateProfileRatings() resolves GOLD_TRUSTED with >= 10 reviews & average >= 4.5', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_gold', role: ROLES.STUDENT });

    for (let i = 1; i <= 10; i++) {
      const ind = db.addUser({ id: `usr_ind_gold_${i}`, role: ROLES.INDUSTRY });
      const inter = db.addInteraction({
        status: INTERACTION_STATUS.REVIEWED,
        initiatorUserId: ind.id,
        participantUserId: std.id,
      });
      createRating(db, {
        reviewerUserId: ind.id,
        targetUserId: std.id,
        targetRole: ROLES.STUDENT,
        interactionId: inter.id,
        scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      });
    }

    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(aggregate.totalRatingsCount, 10);
    assert.strictEqual(aggregate.averageScore, 5.0);
    assert.strictEqual(aggregate.verificationTrustLevel, TRUST_LEVELS.GOLD_TRUSTED);
  });

  h.test('T1.19: Separates Objective Skill Score (0-100) from Experience Reputation (1-5 stars)', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_3pillar', role: ROLES.STUDENT });
    db.addObjectiveSkillScore(std.id, 'JavaScript', 88);
    db.addObjectiveSkillScore(std.id, 'React', 92);

    const ind = db.addUser({ id: 'usr_ind_3pillar', role: ROLES.INDUSTRY });
    const inter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
    });
    createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 4, SKILL_RELEVANCE: 5, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(aggregate.objectiveSkillScore, 90.0, 'Skill assessment score average must be 90.0 on 0-100 scale');
    assert(aggregate.averageScore >= 4.0 && aggregate.averageScore <= 5.0, 'Experience rating must be on 1-5 scale');
  });

  h.test('T1.20: Recommendation rate computes exact percentage of RECOMMENDED vs NEUTRAL/NOT_RECOMMENDED', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_recom', role: ROLES.STUDENT });

    const recs = [RECOMMENDATION_TYPES.RECOMMENDED, RECOMMENDATION_TYPES.RECOMMENDED, RECOMMENDATION_TYPES.NEUTRAL, RECOMMENDATION_TYPES.NOT_RECOMMENDED];
    recs.forEach((rec, idx) => {
      const ind = db.addUser({ id: `usr_ind_rec_${idx}`, role: ROLES.INDUSTRY });
      const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: std.id });
      createRating(db, {
        reviewerUserId: ind.id,
        targetUserId: std.id,
        targetRole: ROLES.STUDENT,
        interactionId: inter.id,
        scores: { APPLICATION_QUALITY: 3, SKILL_RELEVANCE: 3, COMMUNICATION: 3, PROFESSIONALISM: 3, OVERALL_IMPRESSION: 3 },
        recommendation: rec,
      });
    });

    const aggregate = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    // 2 RECOMMENDED out of 4 total = 50.0%
    assert.strictEqual(aggregate.recommendationRate, 50.0);
  });
});

// ============================================================================
// REGISTER TIER 2: BOUNDARY & CORNER CASES (ADVERSARIAL & EXTREME VALUES)
// ============================================================================
harness.describe('Tier 2: Boundary & Corner Cases', (h) => {
  // Anti-Fraud & Boundary Rejections
  h.test('T2.01: Blocks Self-Rating when reviewer matches target entity (SELF_RATING_FORBIDDEN)', () => {
    const db = createRatingSandbox();
    const user = db.addUser({ id: 'usr_self_rater', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      initiatorUserId: user.id,
      participantUserId: user.id,
      status: INTERACTION_STATUS.REVIEWED,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: user.id,
      targetEntityId: user.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'SELF_RATING_FORBIDDEN');
  });

  h.test('T2.02: Rejects rating attempt when no interaction exists (UNVERIFIED_INTERACTION)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_ghost', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_ghost', role: ROLES.STUDENT });

    const res = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: 'non_existent_interaction',
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'UNVERIFIED_INTERACTION');
  });

  h.test('T2.03: Rejects application rating if status is PENDING instead of REVIEWED (INTERACTION_STAGE_INVALID)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_stage', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_stage', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.APPLICATION_REVIEW,
      status: INTERACTION_STATUS.PENDING, // Still unreviewed!
      initiatorUserId: ind.id,
      participantUserId: std.id,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'INTERACTION_STAGE_INVALID');
  });

  h.test('T2.04: Blocks unauthenticated rating creation attempts (UNAUTHORIZED)', () => {
    const db = createRatingSandbox();
    const res = getRatingEligibility(db, {
      reviewerUserId: null, // Unauthenticated
      targetEntityId: 'std_target',
      targetEntityType: ROLES.STUDENT,
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'UNAUTHORIZED');
  });

  h.test('T2.05: Blocks third-party non-participant from submitting rating (UNAUTHORIZED)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_real', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_real', role: ROLES.STUDENT });
    const stranger = db.addUser({ id: 'usr_stranger', role: ROLES.STUDENT });

    const inter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: stranger.id, // Stranger!
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'UNAUTHORIZED');
  });

  h.test('T2.06: Blocks duplicate submissions on compound key (interactionId, reviewerUserId) (ALREADY_RATED)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_dup', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_dup', role: ROLES.STUDENT });
    const inter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
    });

    // First submission succeeds
    const firstRes = createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(firstRes.success, true);

    // Second submission must fail
    const secondRes = createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 4, SKILL_RELEVANCE: 4, COMMUNICATION: 4, PROFESSIONALISM: 4, OVERALL_IMPRESSION: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(secondRes.success, false);
    assert.strictEqual(secondRes.code, 'ALREADY_RATED');
  });

  h.test('T2.07: Blocks submissions after rating deadline expires (DEADLINE_EXPIRED)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_exp', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_exp', role: ROLES.STUDENT });
    const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago

    const inter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      deadline: pastDeadline,
    });

    const res = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'DEADLINE_EXPIRED');
  });

  h.test('T2.08: Boundary check: allows submission 1s before deadline and rejects 1s after', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_edge', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_edge', role: ROLES.STUDENT });

    // Valid: 10 seconds in future
    const interValid = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      deadline: new Date(Date.now() + 10000).toISOString(),
    });
    const resValid = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: interValid.id,
    });
    assert.strictEqual(resValid.eligible, true);

    // Invalid: 1 second in past
    const interExpired = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      deadline: new Date(Date.now() - 1000).toISOString(),
    });
    const resExpired = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: std.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: interExpired.id,
    });
    assert.strictEqual(resExpired.eligible, false);
    assert.strictEqual(resExpired.code, 'DEADLINE_EXPIRED');
  });

  // Score Validation & Boundaries
  h.test('T2.09: Rejects score below lower bound (score = 0 or -1) (INVALID_SCORE)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    assert.throws(() => {
      calculateWeightedOverallScore(
        { APPLICATION_QUALITY: 0, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        cats
      );
    }, /score must be an integer between 1 and 5/);

    assert.throws(() => {
      calculateWeightedOverallScore(
        { APPLICATION_QUALITY: -1, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        cats
      );
    }, /score must be an integer between 1 and 5/);
  });

  h.test('T2.10: Rejects score above upper bound (score = 6) (INVALID_SCORE)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    assert.throws(() => {
      calculateWeightedOverallScore(
        { APPLICATION_QUALITY: 6, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        cats
      );
    }, /score must be an integer between 1 and 5/);
  });

  h.test('T2.11: Rejects non-integer fractional score (e.g. score = 3.5) (INVALID_SCORE)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    assert.throws(() => {
      calculateWeightedOverallScore(
        { APPLICATION_QUALITY: 3.5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        cats
      );
    }, /score must be an integer between 1 and 5/);
  });

  h.test('T2.12: Rejects non-numeric, null, string, or NaN scores (INVALID_SCORE)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    ['5', null, NaN, undefined, true].forEach(badVal => {
      assert.throws(() => {
        calculateWeightedOverallScore(
          { APPLICATION_QUALITY: badVal, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
          cats
        );
      });
    });
  });

  h.test('T2.13: Rejects submission missing mandatory category score (INVALID_SCORE)', () => {
    const cats = getCategoriesForContext(INTERACTION_TYPES.APPLICATION_REVIEW, ROLES.STUDENT);
    assert.throws(() => {
      calculateWeightedOverallScore(
        { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5 }, // Missing PROFESSIONALISM & OVERALL_IMPRESSION
        cats
      );
    }, /Missing score for category/);
  });

  h.test('T2.14: Rejects invalid recommendation value (INVALID_RECOMMENDATION)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_rec_bad', role: ROLES.INDUSTRY });
    const std = db.addUser({ id: 'usr_std_rec_bad', role: ROLES.STUDENT });
    const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: std.id });

    const res = createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
      recommendation: 'EXCELLENT', // Invalid!
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'INVALID_RECOMMENDATION');
  });

  h.test('T2.15: Strict Terminology: Rejects generic target role terminology (COMPANY or ORG)', () => {
    const db = createRatingSandbox();
    const ind = db.addUser({ id: 'usr_ind_term', role: ROLES.INDUSTRY });
    const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: 'org_1' });

    const res = getRatingEligibility(db, {
      reviewerUserId: ind.id,
      targetEntityId: 'org_1',
      targetEntityType: 'COMPANY', // Forbidden legacy terminology!
      interactionId: inter.id,
    });

    assert.strictEqual(res.eligible, false);
    assert(res.reason.includes('Must be STUDENT, INDUSTRY, or INSTITUTE'));
  });

  h.test('T2.16: Empty State: Profile with zero ratings displays "No verified ratings yet" instead of 0.0', () => {
    const db = createRatingSandbox();
    const emptyAgg = recalculateProfileRatings(db, ROLES.STUDENT, 'std_unrated');
    assert.strictEqual(emptyAgg.totalRatingsCount, 0);
    assert.strictEqual(emptyAgg.displayScore, 'No verified ratings yet', 'Empty display must not be 0.0 or 0.0 ★');
    assert.strictEqual(emptyAgg.averageScore, 0);
    assert.deepStrictEqual(emptyAgg.scoreDistribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});

// ============================================================================
// REGISTER TIER 3: CROSS-FEATURE & STATE PIPELINES
// ============================================================================
harness.describe('Tier 3: Cross-Feature Interactions & State Pipelines', (h) => {
  // Pipeline 1: Two-Way Blind Review Mutual Publication
  h.test('T3.01: Blind Review: First submission is held in PENDING_PUBLICATION and target aggregate remains unaffected', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_blind1', role: ROLES.STUDENT });
    const ind = db.addUser({ id: 'usr_ind_blind1', role: ROLES.INDUSTRY });

    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      status: INTERACTION_STATUS.INTERNSHIP_COMPLETED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      isBlind: true,
    });

    // Student submits rating for Industry first
    const stdResult = createRating(db, {
      reviewerUserId: std.id,
      targetUserId: ind.id,
      targetRole: ROLES.INDUSTRY,
      interactionId: inter.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: { MENTORSHIP_QUALITY: 5, WORK_ENVIRONMENT: 5, LEARNING_OPPORTUNITIES: 5, PROJECT_RELEVANCE: 4, COMPENSATION_FAIRNESS: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    assert.strictEqual(stdResult.success, true);
    assert.strictEqual(stdResult.status, RATING_STATUS.PENDING_PUBLICATION, 'First blind review must be held in PENDING_PUBLICATION');
    assert.strictEqual(stdResult.publishedAt, null);

    // Industry aggregate should still have 0 published ratings
    const indAgg = recalculateProfileRatings(db, ROLES.INDUSTRY, ind.id);
    assert.strictEqual(indAgg.totalRatingsCount, 0, 'Target profile must not reflect unreleased blind review');
  });

  h.test('T3.02: Blind Review: Second submission triggers simultaneous publication of both reviews', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_blind2', role: ROLES.STUDENT });
    const ind = db.addUser({ id: 'usr_ind_blind2', role: ROLES.INDUSTRY });

    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      status: INTERACTION_STATUS.INTERNSHIP_COMPLETED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      isBlind: true,
    });

    // 1. Student submits rating for Industry
    createRating(db, {
      reviewerUserId: std.id,
      targetUserId: ind.id,
      targetRole: ROLES.INDUSTRY,
      interactionId: inter.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: { MENTORSHIP_QUALITY: 5, WORK_ENVIRONMENT: 5, LEARNING_OPPORTUNITIES: 5, PROJECT_RELEVANCE: 5, COMPENSATION_FAIRNESS: 5 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    // 2. Industry submits rating for Student
    const indResult = createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: { WORK_ETHIC: 4, TECHNICAL_EXECUTION: 5, TEAMWORK: 4, LEARNING_AGILITY: 5, INITIATIVE: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    assert.strictEqual(indResult.success, true);
    assert.strictEqual(indResult.status, RATING_STATUS.PUBLISHED, 'Mutual submission must immediately publish the second review');

    // Verify first rating was also published
    const firstRating = db.ratings.find(r => r.reviewerUserId === std.id && r.interactionId === inter.id);
    assert.strictEqual(firstRating.status, RATING_STATUS.PUBLISHED, 'First review must automatically transition to PUBLISHED');
    assert(firstRating.publishedAt !== null);

    // Verify both profile aggregates are updated
    const stdAgg = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    const indAgg = recalculateProfileRatings(db, ROLES.INDUSTRY, ind.id);
    assert.strictEqual(stdAgg.totalRatingsCount, 1);
    assert.strictEqual(indAgg.totalRatingsCount, 1);
  });

  // Pipeline 2: Deadline Fallback Auto-Publication
  h.test('T3.03: Deadline Fallback: Solitary blind review auto-publishes upon deadline expiration', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_fallback', role: ROLES.STUDENT });
    const ind = db.addUser({ id: 'usr_ind_fallback', role: ROLES.INDUSTRY });

    const inter = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      status: INTERACTION_STATUS.INTERNSHIP_COMPLETED,
      initiatorUserId: ind.id,
      participantUserId: std.id,
      isBlind: true,
      deadline: new Date(Date.now() + 60000).toISOString(), // Active deadline
    });

    // Student submits, Industry fails to submit before deadline
    const stdRes = createRating(db, {
      reviewerUserId: std.id,
      targetUserId: ind.id,
      targetRole: ROLES.INDUSTRY,
      interactionId: inter.id,
      scores: { MENTORSHIP_QUALITY: 4, WORK_ENVIRONMENT: 4, LEARNING_OPPORTUNITIES: 4, PROJECT_RELEVANCE: 4, COMPENSATION_FAIRNESS: 4 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(stdRes.status, RATING_STATUS.PENDING_PUBLICATION);

    // Simulate deadline expiration
    inter.deadline = new Date(Date.now() - 1000).toISOString();

    // Fallback release trigger
    const publishedCount = publishExpiredBlindReviews(db, inter.id);
    assert.strictEqual(publishedCount, 1, 'Expired blind review must be released');

    const indAgg = recalculateProfileRatings(db, ROLES.INDUSTRY, ind.id);
    assert.strictEqual(indAgg.totalRatingsCount, 1, 'Target industry profile must now reflect released review');
  });

  // Pipeline 3: User Report -> Admin Hide -> User Appeal -> Admin Restore
  h.test('T3.04: Moderation Pipeline: Report -> Admin Hide -> Aggregate Drop -> Appeal -> Restore -> Aggregate Recovery', () => {
    const db = createRatingSandbox();
    const admin = db.addUser({ id: 'usr_admin', role: ROLES.ADMIN });
    const std = db.addUser({ id: 'usr_std_target', role: ROLES.STUDENT });
    const ind = db.addUser({ id: 'usr_ind_reviewer', role: ROLES.INDUSTRY });

    const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: std.id });
    const createRes = createRating(db, {
      reviewerUserId: ind.id,
      targetUserId: std.id,
      targetRole: ROLES.STUDENT,
      interactionId: inter.id,
      scores: { APPLICATION_QUALITY: 1, SKILL_RELEVANCE: 1, COMMUNICATION: 1, PROFESSIONALISM: 1, OVERALL_IMPRESSION: 1 },
      recommendation: RECOMMENDATION_TYPES.NOT_RECOMMENDED,
      reviewText: 'Abusive spam text',
    });

    // 1. Initial State Check
    let agg = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(agg.totalRatingsCount, 1);
    assert.strictEqual(agg.averageScore, 1.0);

    // 2. Student reports the rating
    const report = reportRating(db, {
      ratingId: createRes.ratingId,
      reporterUserId: std.id,
      reason: 'ABUSIVE_LANGUAGE',
      details: 'Review violates community standards',
    });
    assert.strictEqual(report.status, REPORT_STATUS.PENDING);

    // 3. Admin investigates and hides rating
    hideRating(db, {
      ratingId: createRes.ratingId,
      adminUserId: admin.id,
      reason: 'Violated content guidelines',
    });

    agg = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(agg.totalRatingsCount, 0, 'Hidden review must be excluded from aggregate calculation');
    assert.strictEqual(agg.displayScore, 'No verified ratings yet');

    // 4. Reviewer appeals the hidden rating
    const appeal = appealRating(db, {
      ratingId: createRes.ratingId,
      appealingUserId: ind.id,
      reason: 'MISTAKEN_IDENTITY',
      justification: 'Constructive criticism was intended',
    });
    assert.strictEqual(appeal.status, APPEAL_STATUS.PENDING);

    // 5. Admin restores the rating upon review
    restoreRating(db, {
      ratingId: createRes.ratingId,
      adminUserId: admin.id,
      resolutionNotes: 'Appeal granted after clarification',
    });

    agg = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(agg.totalRatingsCount, 1, 'Restored rating must be re-included in aggregate');
    assert.strictEqual(agg.averageScore, 1.0);
  });

  // Pipeline 4: Aggregate Repair & Anti-Fraud Radar
  h.test('T3.05: recalculateProfileRatings() repairs corrupted aggregate cache from raw records', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_repair', role: ROLES.STUDENT });

    // Inject corrupted aggregate cache
    db.rating_aggregates.push({
      targetRole: ROLES.STUDENT,
      targetEntityId: std.id,
      totalRatingsCount: 999, // Corrupt count!
      averageScore: 1.0,      // Corrupt score!
    });

    // Add 2 real verified reviews
    for (let i = 1; i <= 2; i++) {
      const ind = db.addUser({ id: `usr_ind_rep_${i}`, role: ROLES.INDUSTRY });
      const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: std.id });
      createRating(db, {
        reviewerUserId: ind.id,
        targetUserId: std.id,
        targetRole: ROLES.STUDENT,
        interactionId: inter.id,
        scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      });
    }

    const repaired = recalculateProfileRatings(db, ROLES.STUDENT, std.id);
    assert.strictEqual(repaired.totalRatingsCount, 2, 'Recalculation must repair total count');
    assert.strictEqual(repaired.averageScore, 5.0, 'Recalculation must repair average score');
  });

  h.test('T3.06: Anti-Fraud Activity Radar flags anomalous burst of rapid review submissions', () => {
    const db = createRatingSandbox();
    const std = db.addUser({ id: 'usr_std_fraud', role: ROLES.STUDENT });

    // Simulate 6 ratings created within 5 minutes
    const now = Date.now();
    for (let i = 1; i <= 6; i++) {
      const ind = db.addUser({ id: `usr_ind_burst_${i}`, role: ROLES.INDUSTRY });
      const inter = db.addInteraction({ status: INTERACTION_STATUS.REVIEWED, initiatorUserId: ind.id, participantUserId: std.id });
      createRating(db, {
        reviewerUserId: ind.id,
        targetUserId: std.id,
        targetRole: ROLES.STUDENT,
        interactionId: inter.id,
        scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
        recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      });
    }

    const radar = detectSuspiciousRatingActivity(db, { targetRole: ROLES.STUDENT, targetEntityId: std.id });
    assert.strictEqual(radar.isSuspicious, true, 'Radar must detect high-velocity spike');
    assert(radar.anomalies.some(a => a.includes('VELOCITY_SPIKE_DETECTED')));
  });
});

// ============================================================================
// REGISTER TIER 4: REAL-WORLD MULTI-ACTOR APPLICATION SCENARIOS
// ============================================================================
harness.describe('Tier 4: Real-World Multi-Actor Scenarios', (h) => {
  h.test('T4.01: Scenario 1: Candidate Application -> Industry Candidate Screening -> Application Rating', () => {
    const db = createRatingSandbox();
    const recruiter = db.addUser({ id: 'usr_recruiter_techcorp', name: 'TechCorp Recruiter', role: ROLES.INDUSTRY });
    const student = db.addUser({ id: 'usr_alice_dev', name: 'Alice Student', role: ROLES.STUDENT });

    // 1. Initial State: Profile has zero verified ratings
    let initialAgg = recalculateProfileRatings(db, ROLES.STUDENT, student.id);
    assert.strictEqual(initialAgg.displayScore, 'No verified ratings yet');

    // 2. Student applies for software engineer opportunity
    // 3. Recruiter reviews Alice's resume and portfolio -> marks application as REVIEWED
    const applicationInteraction = db.addInteraction({
      interactionType: INTERACTION_TYPES.APPLICATION_REVIEW,
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: recruiter.id,
      participantUserId: student.id,
      participantEntityId: student.id,
      metadata: { opportunityTitle: 'Full Stack Engineer Intern', applicationNumber: 'APP-9921' },
    });

    // 4. Recruiter opens Rating Modal and submits verified candidate application evaluation
    const ratingResult = createRating(db, {
      reviewerUserId: recruiter.id,
      targetUserId: student.id,
      targetRole: ROLES.STUDENT,
      interactionId: applicationInteraction.id,
      contextType: INTERACTION_TYPES.APPLICATION_REVIEW,
      scores: {
        APPLICATION_QUALITY: 5,
        SKILL_RELEVANCE: 4,
        COMMUNICATION: 5,
        PROFESSIONALISM: 4,
        OVERALL_IMPRESSION: 5,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      headline: 'Exceptional project portfolio & clear GitHub documentation',
      reviewText: 'Alice provided well-structured repositories and crisp documentation.',
      pros: ['Fast response time', 'Well architected projects'],
      cons: ['Could add more unit tests'],
    });

    assert.strictEqual(ratingResult.success, true);
    assert.strictEqual(ratingResult.status, RATING_STATUS.PUBLISHED);

    // 5. Verify Alice's updated reputation scorecard
    const updatedAgg = recalculateProfileRatings(db, ROLES.STUDENT, student.id);
    assert.strictEqual(updatedAgg.totalRatingsCount, 1);
    assert.strictEqual(updatedAgg.verifiedRatingsCount, 1);
    assert.strictEqual(updatedAgg.verificationTrustLevel, TRUST_LEVELS.VERIFIED_TIER1);
    assert.strictEqual(updatedAgg.recommendationRate, 100.0);
    assert.strictEqual(updatedAgg.categoryBreakdown.APPLICATION_QUALITY.average, 5.0);
    assert.strictEqual(updatedAgg.displayScore, `${updatedAgg.averageScore.toFixed(1)} ★`);
  });

  h.test('T4.02: Scenario 2: Internship Completed -> Two-Way Blind Review Cycle -> Simultaneous Release', () => {
    const db = createRatingSandbox();
    const employer = db.addUser({ id: 'usr_fintech_lead', name: 'FinTech Corp Lead', role: ROLES.INDUSTRY });
    const intern = db.addUser({ id: 'usr_bob_intern', name: 'Bob Intern', role: ROLES.STUDENT });

    // 1. 3-Month Internship is completed
    const internshipInteraction = db.addInteraction({
      interactionType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      status: INTERACTION_STATUS.INTERNSHIP_COMPLETED,
      initiatorUserId: employer.id,
      participantUserId: intern.id,
      isBlind: true,
      deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    });

    // 2. Intern submits review of FinTech Corp first
    const internRating = createRating(db, {
      reviewerUserId: intern.id,
      targetUserId: employer.id,
      targetRole: ROLES.INDUSTRY,
      interactionId: internshipInteraction.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: {
        MENTORSHIP_QUALITY: 5,
        WORK_ENVIRONMENT: 4,
        LEARNING_OPPORTUNITIES: 5,
        PROJECT_RELEVANCE: 5,
        COMPENSATION_FAIRNESS: 4,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      headline: 'Great mentorship & real production exposure',
    });

    assert.strictEqual(internRating.status, RATING_STATUS.PENDING_PUBLICATION);
    let employerAgg = recalculateProfileRatings(db, ROLES.INDUSTRY, employer.id);
    assert.strictEqual(employerAgg.totalRatingsCount, 0, 'Employer score cannot change before reciprocal review');

    // 3. Employer submits review of Intern
    const employerRating = createRating(db, {
      reviewerUserId: employer.id,
      targetUserId: intern.id,
      targetRole: ROLES.STUDENT,
      interactionId: internshipInteraction.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: {
        WORK_ETHIC: 5,
        TECHNICAL_EXECUTION: 4,
        TEAMWORK: 5,
        LEARNING_AGILITY: 5,
        INITIATIVE: 4,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
      headline: 'Dedicated contributor with fast learning speed',
    });

    assert.strictEqual(employerRating.status, RATING_STATUS.PUBLISHED);

    // 4. Both profiles are now populated
    employerAgg = recalculateProfileRatings(db, ROLES.INDUSTRY, employer.id);
    const internAgg = recalculateProfileRatings(db, ROLES.STUDENT, intern.id);

    assert.strictEqual(employerAgg.totalRatingsCount, 1);
    assert.strictEqual(internAgg.totalRatingsCount, 1);
    assert.strictEqual(employerAgg.verificationTrustLevel, TRUST_LEVELS.VERIFIED_TIER1);
    assert.strictEqual(internAgg.verificationTrustLevel, TRUST_LEVELS.VERIFIED_TIER1);
  });

  h.test('T4.03: Scenario 3: Course & Workshop Completion -> Institute Academic Rating', () => {
    const db = createRatingSandbox();
    const institute = db.addUser({ id: 'usr_apex_institute', name: 'Apex Institute of Technology', role: ROLES.INSTITUTE });
    const student1 = db.addUser({ id: 'usr_std_charlie', name: 'Charlie', role: ROLES.STUDENT });
    const student2 = db.addUser({ id: 'usr_std_david', name: 'David', role: ROLES.STUDENT });

    // Students complete Data Science Bootcamp
    const inter1 = db.addInteraction({
      interactionType: INTERACTION_TYPES.COURSE_EVALUATION,
      status: INTERACTION_STATUS.COURSE_COMPLETED,
      initiatorUserId: institute.id,
      participantUserId: student1.id,
    });
    const inter2 = db.addInteraction({
      interactionType: INTERACTION_TYPES.COURSE_EVALUATION,
      status: INTERACTION_STATUS.COURSE_COMPLETED,
      initiatorUserId: institute.id,
      participantUserId: student2.id,
    });

    // Student 1 submits evaluation
    createRating(db, {
      reviewerUserId: student1.id,
      targetUserId: institute.id,
      targetRole: ROLES.INSTITUTE,
      interactionId: inter1.id,
      scores: {
        CURRICULUM_DEPTH: 5,
        INSTRUCTOR_QUALITY: 5,
        PRACTICAL_APPLICATION: 4,
        RESOURCE_AVAILABILITY: 5,
        CAREER_IMPACT: 4,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    // Student 2 submits evaluation
    createRating(db, {
      reviewerUserId: student2.id,
      targetUserId: institute.id,
      targetRole: ROLES.INSTITUTE,
      interactionId: inter2.id,
      scores: {
        CURRICULUM_DEPTH: 4,
        INSTRUCTOR_QUALITY: 4,
        PRACTICAL_APPLICATION: 4,
        RESOURCE_AVAILABILITY: 4,
        CAREER_IMPACT: 4,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    const instAgg = recalculateProfileRatings(db, ROLES.INSTITUTE, institute.id);
    assert.strictEqual(instAgg.totalRatingsCount, 2);
    assert.strictEqual(instAgg.recommendationRate, 100.0);
    assert.strictEqual(instAgg.categoryBreakdown.CURRICULUM_DEPTH.average, 4.5);
    assert.strictEqual(instAgg.categoryBreakdown.INSTRUCTOR_QUALITY.average, 4.5);
  });

  h.test('T4.04: Scenario 4: Anti-Fraud Activity Detection & Admin Governance Isolation', () => {
    const db = createRatingSandbox();
    const admin = db.addUser({ id: 'usr_admin_gov', name: 'Platform Admin', role: ROLES.ADMIN });
    const targetStudent = db.addUser({ id: 'usr_std_victim', name: 'Victim Student', role: ROLES.STUDENT });

    // Legitimate review
    const legitReviewer = db.addUser({ id: 'usr_legit_reviewer', role: ROLES.INDUSTRY });
    const legitInter = db.addInteraction({
      status: INTERACTION_STATUS.REVIEWED,
      initiatorUserId: legitReviewer.id,
      participantUserId: targetStudent.id,
    });
    createRating(db, {
      reviewerUserId: legitReviewer.id,
      targetUserId: targetStudent.id,
      targetRole: ROLES.STUDENT,
      interactionId: legitInter.id,
      scores: { APPLICATION_QUALITY: 5, SKILL_RELEVANCE: 5, COMMUNICATION: 5, PROFESSIONALISM: 5, OVERALL_IMPRESSION: 5 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });

    // Malicious cluster submits 5 rapid 1-star reviews
    const maliciousRatings = [];
    for (let i = 1; i <= 5; i++) {
      const badActor = db.addUser({ id: `usr_bad_actor_${i}`, role: ROLES.INDUSTRY });
      const badInter = db.addInteraction({
        status: INTERACTION_STATUS.REVIEWED,
        initiatorUserId: badActor.id,
        participantUserId: targetStudent.id,
      });
      const badRes = createRating(db, {
        reviewerUserId: badActor.id,
        targetUserId: targetStudent.id,
        targetRole: ROLES.STUDENT,
        interactionId: badInter.id,
        scores: { APPLICATION_QUALITY: 1, SKILL_RELEVANCE: 1, COMMUNICATION: 1, PROFESSIONALISM: 1, OVERALL_IMPRESSION: 1 },
        recommendation: RECOMMENDATION_TYPES.NOT_RECOMMENDED,
        reviewText: 'Fake spam attack',
      });
      maliciousRatings.push(badRes.ratingId);
    }

    // Radar detects anomaly
    const radar = detectSuspiciousRatingActivity(db, { targetRole: ROLES.STUDENT, targetEntityId: targetStudent.id });
    assert.strictEqual(radar.isSuspicious, true);

    // Admin hides malicious reviews
    for (const rId of maliciousRatings) {
      hideRating(db, { ratingId: rId, adminUserId: admin.id, reason: 'Detected coordinated fake review burst' });
    }

    // Target reputation restored to legitimate single 5-star review
    const cleanedAgg = recalculateProfileRatings(db, ROLES.STUDENT, targetStudent.id);
    assert.strictEqual(cleanedAgg.totalRatingsCount, 1);
    assert.strictEqual(cleanedAgg.averageScore, 5.0);
    assert.strictEqual(cleanedAgg.recommendationRate, 100.0);
  });
});

// Parse CLI flags
let filterTier = null;
for (const arg of process.argv) {
  if (arg.startsWith('--tier=')) {
    filterTier = arg.split('=')[1];
  }
}

// Execute Runner
harness.run(filterTier).then(result => {
  if (result.totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
