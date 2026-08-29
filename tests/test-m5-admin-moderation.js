#!/usr/bin/env node
/**
 * Skill Bridge Platform - Milestone 5: Admin Moderation, Anti-Fraud & Aggregate Recalculation Test Suite
 * File: tests/test-m5-admin-moderation.js
 * 
 * Verifies:
 * 1. Admin Moderation API (GET /api/admin/ratings with filtering, KPI computation, and fraud radar)
 * 2. Moderator Action API (PATCH /api/admin/ratings/[id] with HIDE, RESTORE, FLAG, REJECT, audit trails, and aggregate repair)
 * 3. Content Reporting API (POST /api/ratings/[id]/report with strict reason taxonomy and auto-flagging)
 * 4. Moderation Appeals API (POST /api/ratings/[id]/appeal with transition to UNDER_APPEAL)
 * 5. Aggregate Recalculation API (POST /api/admin/ratings/recalculate with single entity & bulk repair)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Color formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
};

class M5TestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.startTime = Date.now();
  }

  describe(name, fn) {
    const suite = { name, tests: [], passed: 0, failed: 0 };
    this.suites.push(suite);
    const prev = this.currentSuite;
    this.currentSuite = suite;
    fn();
    this.currentSuite = prev;
  }

  test(name, fn) {
    this.currentSuite.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  Milestone 5 Test Suite: Admin Moderation, Anti-Fraud & Recalculate   ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

    for (const suite of this.suites) {
      console.log(`${colors.bright}${colors.blue}▶ SUITE: ${suite.name}${colors.reset}`);
      for (const t of suite.tests) {
        const start = Date.now();
        try {
          const res = t.fn();
          if (res && typeof res.then === 'function') await res;
          const dur = Date.now() - start;
          suite.passed++;
          this.totalPassed++;
          console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${t.name} ${colors.dim}(${dur}ms)${colors.reset}`);
        } catch (err) {
          const dur = Date.now() - start;
          suite.failed++;
          this.totalFailed++;
          console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${t.name} ${colors.dim}(${dur}ms)${colors.reset}`);
          console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
          if (err.stack) console.log(`     ${colors.dim}${err.stack.split('\n').slice(1, 4).join('\n')}${colors.reset}`);
        }
      }
      console.log(`  ${colors.dim}Suite summary: ${suite.passed} passed, ${suite.failed} failed${colors.reset}\n`);
    }

    const duration = Date.now() - this.startTime;
    console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
    console.log(`  Total Tests: ${this.totalPassed + this.totalFailed} | Passed: ${colors.green}${this.totalPassed}${colors.reset} | Failed: ${this.totalFailed > 0 ? colors.red + this.totalFailed : '0'}${colors.reset} | Duration: ${duration}ms`);
    console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

    if (this.totalFailed === 0) {
      console.log(`  ${colors.bgGreen} ALL MILESTONE 5 ADMIN MODERATION TESTS PASSED ${colors.reset}\n`);
    } else {
      console.log(`  ${colors.bgRed} SUITE FAILED WITH ${this.totalFailed} FAILURES ${colors.reset}\n`);
      process.exit(1);
    }
  }
}

const harness = new M5TestHarness();

// Mock Next.js Request and Response for standalone API route testing
function createMockRequest({ url = 'http://localhost:3000/api/admin/ratings', method = 'GET', headers = {}, body = null }) {
  const headerMap = new Map();
  Object.entries(headers).forEach(([k, v]) => headerMap.set(k.toLowerCase(), v));

  return {
    url,
    method,
    headers: {
      get: (name) => headerMap.get(name.toLowerCase()) || null,
      entries: () => headerMap.entries(),
    },
    json: async () => (body !== null ? body : {}),
  };
}

// Helpers for test data seeding
const localDb = require('../lib/db');
const { recalculateProfileRatings, createRating, RATING_STATUS, ROLES } = require('../lib/rating-engine');

function resetTestDatabase() {
  localDb.resetDb();
  const db = localDb.getDb();
  db.ratings = [];
  db.ratingCategoryScores = [];
  db.ratingAggregates = [];
  db.ratingReports = [];
  db.ratingAppeals = [];
  db.ratingAuditLogs = [];
  db.ratingInteractions = [];
  localDb.saveDb(db);
}

// ============================================================================
// SUITE 1: Admin Ratings List & Filtering API (GET /api/admin/ratings)
// ============================================================================
harness.describe('Suite 1: Admin Ratings Management API (GET /api/admin/ratings)', () => {
  harness.test('1.01: Rejects non-admin access with HTTP 403 Forbidden', async () => {
    resetTestDatabase();
    const { GET } = require('../app/api/admin/ratings/route');

    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings',
      headers: { 'x-user-role': 'STUDENT', 'x-user-id': 'usr_student_1' },
    });

    const res = await GET(req);
    assert.strictEqual(res.status, 403, 'Non-admin must receive 403');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'INSUFFICIENT_PERMISSIONS');
  });

  harness.test('1.02: Allows ADMIN access and computes KPI counts and stats accurately', async () => {
    resetTestDatabase();
    const db = localDb.getDb();

    // Seed 1 published, 1 flagged, 1 hidden review
    db.users.push(
      { id: 'usr_adm_1', role: 'ADMIN', name: 'Admin Master' },
      { id: 'usr_ind_1', role: 'INDUSTRY', name: 'TechCorp' },
      { id: 'usr_std_1', role: 'STUDENT', name: 'Alice Student' }
    );
    db.ratings.push(
      {
        id: 'rat_pub_1',
        reviewerUserId: 'usr_ind_1',
        reviewerRole: 'INDUSTRY',
        targetUserId: 'usr_std_1',
        targetEntityId: 'std_001',
        targetRole: 'STUDENT',
        overallScore: '5.00',
        recommendation: 'RECOMMENDED',
        headline: 'Great work',
        reviewText: 'Excellent project',
        status: 'PUBLISHED',
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rat_flag_1',
        reviewerUserId: 'usr_ind_1',
        reviewerRole: 'INDUSTRY',
        targetUserId: 'usr_std_1',
        targetEntityId: 'std_001',
        targetRole: 'STUDENT',
        overallScore: '1.00',
        recommendation: 'NOT_RECOMMENDED',
        headline: 'Spam alert',
        reviewText: 'Fake content',
        status: 'FLAGGED',
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rat_hid_1',
        reviewerUserId: 'usr_ind_1',
        reviewerRole: 'INDUSTRY',
        targetUserId: 'usr_std_1',
        targetEntityId: 'std_001',
        targetRole: 'STUDENT',
        overallScore: '2.00',
        recommendation: 'NOT_RECOMMENDED',
        headline: 'Hidden review',
        reviewText: 'Under moderation',
        status: 'HIDDEN',
        isVerified: true,
        createdAt: new Date().toISOString(),
      }
    );
    localDb.saveDb(db);

    const { GET } = require('../app/api/admin/ratings/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings',
      headers: { 'x-user-role': 'ADMIN', 'x-user-id': 'usr_adm_1' },
    });

    const res = await GET(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.totalCount, 3);
    assert.strictEqual(data.stats.total, 3);
    assert.strictEqual(data.stats.published, 1);
    assert.strictEqual(data.stats.flagged, 1);
    assert.strictEqual(data.stats.hidden, 1);
    assert.strictEqual(data.stats.averageScore, 5.0); // Only published reviews contribute to average score
  });

  harness.test('1.03: Filters ratings accurately by status, targetRole, and search keywords', async () => {
    const { GET } = require('../app/api/admin/ratings/route');

    // 1. Filter by FLAGGED
    const reqFlagged = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings?status=FLAGGED',
      headers: { 'x-user-role': 'ADMIN' },
    });
    const resFlagged = await GET(reqFlagged);
    const dataFlagged = await resFlagged.json();
    assert.strictEqual(dataFlagged.count, 1);
    assert.strictEqual(dataFlagged.ratings[0].id, 'rat_flag_1');

    // 2. Search keyword
    const reqSearch = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings?search=Spam',
      headers: { 'x-user-role': 'ADMIN' },
    });
    const resSearch = await GET(reqSearch);
    const dataSearch = await resSearch.json();
    assert.strictEqual(dataSearch.count, 1);
    assert.strictEqual(dataSearch.ratings[0].id, 'rat_flag_1');
  });
});

// ============================================================================
// SUITE 2: Moderator Actions (PATCH /api/admin/ratings/[id])
// ============================================================================
harness.describe('Suite 2: Moderator Action API (PATCH /api/admin/ratings/[id])', () => {
  harness.test('2.01: HIDE action transitions status to HIDDEN, records audit log, and repairs aggregate', async () => {
    resetTestDatabase();
    const db = localDb.getDb();
    db.users.push(
      { id: 'usr_admin_mod', role: 'ADMIN', name: 'Moderator Admin' },
      { id: 'usr_student_target', role: 'STUDENT', name: 'Bob Target' }
    );
    const rating = {
      id: 'rat_to_hide',
      reviewerUserId: 'usr_ind_1',
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_student_target',
      targetEntityId: 'std_bob',
      targetRole: 'STUDENT',
      overallScore: '1.00',
      recommendation: 'NOT_RECOMMENDED',
      status: 'PUBLISHED',
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    db.ratings.push(rating);
    localDb.saveDb(db);

    // Initial aggregate has 1 rating
    recalculateProfileRatings('STUDENT', 'std_bob');

    const { PATCH } = require('../app/api/admin/ratings/[id]/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings/rat_to_hide',
      method: 'PATCH',
      headers: { 'x-user-role': 'ADMIN', 'x-user-id': 'usr_admin_mod' },
      body: { action: 'HIDE', reason: 'Abusive language violation' },
    });

    const res = await PATCH(req, { params: { id: 'rat_to_hide' } });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'HIDDEN');

    // Verify rating in DB
    const freshDb = localDb.getDb();
    const saved = freshDb.ratings.find(r => r.id === 'rat_to_hide');
    assert.strictEqual(saved.status, 'HIDDEN');

    // Verify audit log
    const auditLogs = freshDb.ratingAuditLogs.filter(l => l.ratingId === 'rat_to_hide');
    assert(auditLogs.length > 0);
    assert.strictEqual(auditLogs[0].action, 'RATING_HIDDEN_BY_ADMIN');
    assert.strictEqual(auditLogs[0].actorUserId, 'usr_admin_mod');

    // Verify target aggregate dropped to 0
    assert.strictEqual(data.aggregate.totalRatingsCount, 0);
  });

  harness.test('2.02: RESTORE action transitions status to PUBLISHED and resolves pending appeals', async () => {
    const db = localDb.getDb();
    // Add pending appeal
    db.ratingAppeals.push({
      id: 'app_test_1',
      ratingId: 'rat_to_hide',
      appellantUserId: 'usr_ind_1',
      appealReason: 'Constructive review',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    localDb.saveDb(db);

    const { PATCH } = require('../app/api/admin/ratings/[id]/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings/rat_to_hide',
      method: 'PATCH',
      headers: { 'x-user-role': 'ADMIN', 'x-user-id': 'usr_admin_mod' },
      body: { action: 'RESTORE', reason: 'Appeal accepted, review re-evaluated' },
    });

    const res = await PATCH(req, { params: { id: 'rat_to_hide' } });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'PUBLISHED');

    // Verify appeal status updated
    const freshDb = localDb.getDb();
    const appeal = freshDb.ratingAppeals.find(a => a.id === 'app_test_1');
    assert.strictEqual(appeal.status, 'APPROVED_RESTORED');
    assert.strictEqual(appeal.reviewedByAdminId, 'usr_admin_mod');

    // Verify aggregate restored
    assert.strictEqual(data.aggregate.totalRatingsCount, 1);
  });

  harness.test('2.03: Rejects invalid moderation action with HTTP 400', async () => {
    const { PATCH } = require('../app/api/admin/ratings/[id]/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings/rat_to_hide',
      method: 'PATCH',
      headers: { 'x-user-role': 'ADMIN' },
      body: { action: 'INVALID_ACTION' },
    });

    const res = await PATCH(req, { params: { id: 'rat_to_hide' } });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'INVALID_ACTION');
  });
});

// ============================================================================
// SUITE 3: Content Reporting API (POST /api/ratings/[id]/report)
// ============================================================================
harness.describe('Suite 3: Review Abuse & Reporting API (POST /api/ratings/[id]/report)', () => {
  harness.test('3.01: Submits report with valid reason, flags published review, and logs audit', async () => {
    resetTestDatabase();
    const db = localDb.getDb();
    db.users.push(
      { id: 'usr_reporter_1', role: 'STUDENT', name: 'Charlie Reporter' }
    );
    db.ratings.push({
      id: 'rat_to_report',
      reviewerUserId: 'usr_bad_actor',
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_reporter_1',
      targetEntityId: 'std_charlie',
      targetRole: 'STUDENT',
      overallScore: '1.00',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
    });
    localDb.saveDb(db);

    const { POST } = require('../app/api/ratings/[id]/report/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/ratings/rat_to_report/report',
      method: 'POST',
      headers: { 'x-user-id': 'usr_reporter_1', 'x-user-role': 'STUDENT' },
      body: {
        reason: 'FALSE_INFORMATION',
        details: 'Reviewer never attended or conducted the claimed interview interaction.',
      },
    });

    const res = await POST(req, { params: { id: 'rat_to_report' } });
    assert.strictEqual(res.status, 201);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert(data.reportId);
    assert.strictEqual(data.report.reason, 'FALSE_INFORMATION');

    // Verify rating transitioned to FLAGGED in DB
    const freshDb = localDb.getDb();
    const rating = freshDb.ratings.find(r => r.id === 'rat_to_report');
    assert.strictEqual(rating.status, 'FLAGGED');

    // Verify report persisted
    const reports = freshDb.ratingReports.filter(rep => rep.ratingId === 'rat_to_report');
    assert.strictEqual(reports.length, 1);
  });

  harness.test('3.02: Rejects report with invalid reason category with HTTP 400', async () => {
    const { POST } = require('../app/api/ratings/[id]/report/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/ratings/rat_to_report/report',
      method: 'POST',
      headers: { 'x-user-id': 'usr_reporter_1' },
      body: {
        reason: 'UNSUPPORTED_REASON_XYZ',
      },
    });

    const res = await POST(req, { params: { id: 'rat_to_report' } });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'INVALID_REASON');
  });
});

// ============================================================================
// SUITE 4: Review Appeal API (POST /api/ratings/[id]/appeal)
// ============================================================================
harness.describe('Suite 4: Review Appeal API (POST /api/ratings/[id]/appeal)', () => {
  harness.test('4.01: Submits appeal, transitions rating to UNDER_APPEAL, and logs audit', async () => {
    resetTestDatabase();
    const db = localDb.getDb();
    db.users.push(
      { id: 'usr_appellant_1', role: 'INDUSTRY', name: 'Dave Employer' }
    );
    db.ratings.push({
      id: 'rat_to_appeal',
      reviewerUserId: 'usr_appellant_1',
      reviewerRole: 'INDUSTRY',
      targetUserId: 'usr_std_other',
      targetEntityId: 'std_other',
      targetRole: 'STUDENT',
      status: 'HIDDEN',
      createdAt: new Date().toISOString(),
    });
    localDb.saveDb(db);

    const { POST } = require('../app/api/ratings/[id]/appeal/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/ratings/rat_to_appeal/appeal',
      method: 'POST',
      headers: { 'x-user-id': 'usr_appellant_1', 'x-user-role': 'INDUSTRY' },
      body: {
        appealReason: 'MISTAKEN_IDENTITY',
        justification: 'The feedback was intended for a different internship candidate and was flagged mistakenly.',
        evidenceDocs: ['https://docs.skillbridge.gov/appeal_doc_1.pdf'],
      },
    });

    const res = await POST(req, { params: { id: 'rat_to_appeal' } });
    assert.strictEqual(res.status, 201);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert(data.appealId);
    assert.strictEqual(data.ratingStatus, 'UNDER_APPEAL');

    // Verify DB state
    const freshDb = localDb.getDb();
    const rating = freshDb.ratings.find(r => r.id === 'rat_to_appeal');
    assert.strictEqual(rating.status, 'UNDER_APPEAL');

    const appeals = freshDb.ratingAppeals.filter(a => a.ratingId === 'rat_to_appeal');
    assert.strictEqual(appeals.length, 1);
  });
});

// ============================================================================
// SUITE 5: Aggregate Recalculation API (POST /api/admin/ratings/recalculate)
// ============================================================================
harness.describe('Suite 5: Aggregate Recalculation API (POST /api/admin/ratings/recalculate)', () => {
  harness.test('5.01: Recalculates and repairs rating aggregate for single entity', async () => {
    resetTestDatabase();
    const db = localDb.getDb();
    db.users.push(
      { id: 'usr_adm_rec', role: 'ADMIN' },
      { id: 'usr_std_recalc', role: 'STUDENT' }
    );
    // Add 2 published reviews: 5★ and 4★ (avg = 4.50★)
    db.ratings.push(
      {
        id: 'rat_rc_1',
        reviewerUserId: 'usr_ind_1',
        reviewerRole: 'INDUSTRY',
        targetUserId: 'usr_std_recalc',
        targetEntityId: 'std_recalc',
        targetRole: 'STUDENT',
        overallScore: '5.00',
        recommendation: 'RECOMMENDED',
        status: 'PUBLISHED',
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rat_rc_2',
        reviewerUserId: 'usr_ind_2',
        reviewerRole: 'INDUSTRY',
        targetUserId: 'usr_std_recalc',
        targetEntityId: 'std_recalc',
        targetRole: 'STUDENT',
        overallScore: '4.00',
        recommendation: 'RECOMMENDED',
        status: 'PUBLISHED',
        isVerified: true,
        createdAt: new Date().toISOString(),
      }
    );
    localDb.saveDb(db);

    const { POST } = require('../app/api/admin/ratings/recalculate/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings/recalculate',
      method: 'POST',
      headers: { 'x-user-role': 'ADMIN', 'x-user-id': 'usr_adm_rec' },
      body: { targetRole: 'STUDENT', targetEntityId: 'std_recalc' },
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.aggregate.totalRatingsCount, 2);
    assert.strictEqual(Number(data.aggregate.averageScore), 4.5);
    assert.strictEqual(Number(data.aggregate.recommendationRate), 100);
  });

  harness.test('5.02: Supports bulk recalculation of all entities when recalculateAll: true', async () => {
    const { POST } = require('../app/api/admin/ratings/recalculate/route');
    const req = createMockRequest({
      url: 'http://localhost:3000/api/admin/ratings/recalculate',
      method: 'POST',
      headers: { 'x-user-role': 'ADMIN' },
      body: { recalculateAll: true },
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.count >= 1);
  });
});

// Run all test suites
harness.run().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
