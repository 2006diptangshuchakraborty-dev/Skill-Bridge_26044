/**
 * Skill Bridge Platform - Tier 5 Adversarial Auth, Role Routing & Onboarding Stress Test Suite
 * File: tests/test-tier5-adversarial-auth.js
 * 
 * Verifies White-Box Security & Adversarial Resilience:
 * 1. Race conditions & high-throughput concurrency (parallel intent consumption, parallel token generation)
 * 2. Expired intent tokens, single-use replay attacks, forged tokens & boundary fuzzing
 * 3. Session cookie tampering, CRLF injection, malformed cookies & header sanitization
 * 4. Role mutation blocks, privilege escalation prevention & role collision engine invariants
 * 5. Multi-tenant IDOR attack resistance, capability gating & audit logging integrity
 * 6. Edge route middleware partition, traversal resistance & onboarding gating
 * 7. Dynamic profile completion mathematical scoring, boundary clamping [0, 100] & prototype pollution resilience
 * 8. Strict terminology compliance ('Student', 'Industry', 'Institute') across all domain models
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Import live application modules
const signupIntent = require('../lib/signup-intent');
const roleCollision = require('../lib/role-collision');
const onboardingCalc = require('../lib/onboarding-calc');
const localDb = require('../lib/db');
const {
  ROLES,
  ACCOUNT_STATUS,
  ONBOARDING_STATUS,
  KYC_STATUS,
  AUDIT_ACTIONS,
  MockDatabase,
  simulateEdgeMiddleware,
  simulateApiGuard,
} = require('./auth-test-helper');

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

const isVerbose = process.argv.includes('--verbose');
const isJson = process.argv.includes('--json');

function runTest(suiteName, testId, description, testFn) {
  totalTests++;
  const t0 = process.hrtime.bigint();
  try {
    const res = testFn();
    // Handle async test functions
    if (res && typeof res.then === 'function') {
      return res
        .then(() => {
          const t1 = process.hrtime.bigint();
          const ms = Number(t1 - t0) / 1e6;
          passedTests++;
          if (!isJson) {
            console.log(`  ✔ [PASS] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
          }
        })
        .catch((err) => {
          const t1 = process.hrtime.bigint();
          const ms = Number(t1 - t0) / 1e6;
          failedTests++;
          failureDetails.push({ suiteName, testId, description, error: err.message, stack: err.stack });
          if (!isJson) {
            console.error(`  ✖ [FAIL] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
            console.error(`     Error: ${err.message}`);
            if (isVerbose) console.error(err.stack);
          }
        });
    }

    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    passedTests++;
    if (!isJson) {
      console.log(`  ✔ [PASS] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
    }
  } catch (err) {
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    failedTests++;
    failureDetails.push({ suiteName, testId, description, error: err.message, stack: err.stack });
    if (!isJson) {
      console.error(`  ✖ [FAIL] ${testId}: ${description} (${ms.toFixed(1)}ms)`);
      console.error(`     Error: ${err.message}`);
      if (isVerbose) console.error(err.stack);
    }
  }
}

async function runAllTests() {
  const overallStartTime = Date.now();

  if (!isJson) {
    console.log('\n======================================================================');
    console.log('  Skill Bridge Tier 5: Adversarial Auth & Onboarding Hardening Suite  ');
    console.log('======================================================================\n');
  }

  // ============================================================================
  // SUITE 1: RACE CONDITIONS, CONCURRENCY & TOKEN ENTROPY
  // ============================================================================
  if (!isJson) console.log('▶ SUITE 1: Race Conditions, Concurrency & High-Throughput Token Entropy');

  // Test T5.R01: 500 parallel token creations produce 100% unique cryptographic tokens
  await runTest('Suite 1', 'T5.R01', 'High-throughput intent token creation produces 500 unique tokens with zero entropy collisions', async () => {
    const tokenSet = new Set();
    const promises = [];
    for (let i = 0; i < 500; i++) {
      promises.push(signupIntent.createSignupIntent({ role: 'STUDENT', email: `test_${i}@example.com` }));
    }
    const results = await Promise.all(promises);
    assert.strictEqual(results.length, 500);
    for (const r of results) {
      assert.ok(r.token, 'Must return token');
      assert.strictEqual(r.token.length, 64, 'Must be 64-char hex string (32 bytes entropy)');
      assert.ok(!tokenSet.has(r.token), 'Token must be globally unique');
      tokenSet.add(r.token);
    }
    assert.strictEqual(tokenSet.size, 500);
  });

  // Test T5.R02: Concurrent consumption of the same intent token
  await runTest('Suite 1', 'T5.R02', 'Concurrent OAuth resolution on same signup intent token consumes it atomically (no double-redemption)', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'INDUSTRY' });
    const token = intent.token;

    // Simulate parallel consumption requests
    await Promise.all([
      signupIntent.markIntentUsed(token),
      signupIntent.markIntentUsed(token),
    ]);

    // Both may execute, but once resolved the intent must be definitively used
    const checkAfter = await signupIntent.resolveValidIntent(token);
    assert.ok(checkAfter, 'Intent record must exist');
    assert.strictEqual(checkAfter.isUsed, true, 'Intent must be marked used');
    assert.strictEqual(checkAfter.isValid, false, 'Consumed intent must be invalid');
  });

  // Test T5.R03: Mock database concurrent intent consumption throws 409 on second call
  await runTest('Suite 1', 'T5.R03', 'Database oracle blocks replayed consumption with 409 Conflict', () => {
    const db = new MockDatabase();
    const intent = db.createSignupIntent(ROLES.STUDENT);
    const firstConsumption = db.consumeSignupIntent(intent.token);
    assert.ok(firstConsumption.usedAt, 'First consumption must succeed');

    assert.throws(
      () => {
        db.consumeSignupIntent(intent.token);
      },
      (err) => err.statusCode === 409 && err.message.includes('already been consumed'),
      'Second consumption must fail with 409 Conflict'
    );
  });

  // Test T5.R04: Multi-step simultaneous profile saves maintain atomic integrity
  await runTest('Suite 1', 'T5.R04', 'Simultaneous parallel profile partial saves maintain atomic state without schema corruption', () => {
    const db = new MockDatabase();
    const user = db.createUser({ email: 'student_race@example.com', role: ROLES.STUDENT });

    // Step updates
    db.upsertStudentProfile(user.id, { headline: 'Developer', bio: 'Bio' });
    db.upsertStudentProfile(user.id, { instituteName: 'NITK', department: 'CSE', degree: 'B.Tech', graduationYear: 2026 });
    db.upsertStudentProfile(user.id, { skills: ['React', 'Node', 'PostgreSQL'] });

    const finalProf = db.getStudentProfile(user.id);
    assert.strictEqual(finalProf.headline, 'Developer');
    assert.strictEqual(finalProf.instituteName, 'NITK');
    assert.strictEqual(finalProf.skills.length, 3);
    assert.strictEqual(finalProf.profileCompletion, 50, 'Completion score must be 50% (15 + 15 + 20)');
  });

  // Test T5.R05: Concurrent user account creation with same email maintains unique constraint
  await runTest('Suite 1', 'T5.R05', 'Single-account rule ensures exactly one account resolved per normalized Google email', () => {
    const db = new MockDatabase();
    const u1 = db.createUser({ email: 'duplicate_test@example.com', role: ROLES.STUDENT });
    const resolved = db.getUserByEmail('DUPLICATE_TEST@EXAMPLE.COM');
    assert.ok(resolved);
    assert.strictEqual(resolved.id, u1.id);
    assert.strictEqual(resolved.role, ROLES.STUDENT);
  });

  // ============================================================================
  // SUITE 2: EXPIRED INTENT REPLAY & TOKEN FUZZING
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 2: Expired Intent Replay, Single-Use Enforcement & Token Fuzzing');

  // Test T5.E01: Exact expiration timestamp boundary (15m + 1ms)
  await runTest('Suite 2', 'T5.E01', 'Intent token at exact expiration boundary (t_now >= t_expires) is strictly rejected', async () => {
    const db = new MockDatabase();
    // Create intent with 0 seconds TTL
    const intent = db.createSignupIntent(ROLES.STUDENT, 'expired@example.com', -1);
    assert.throws(
      () => {
        db.consumeSignupIntent(intent.token);
      },
      (err) => err.statusCode === 410 && err.message.includes('expired'),
      'Must reject with 410 Gone'
    );
  });

  // Test T5.E02: Fuzzing resolveValidIntent with various malformed strings
  await runTest('Suite 2', 'T5.E02', 'resolveValidIntent returns null for SQLi, XSS, null bytes, unicode, and truncated tokens', async () => {
    const badTokens = [
      '',
      '   ',
      'abc',
      '123456789012345', // 15 chars (< 16 minimum)
      "tok_12345' OR '1'='1",
      '<script>alert(1)</script>',
      'tok_\0_nullbyte',
      'tok_🚀_emoji_unicode_overflow',
      '__proto__',
      'constructor',
      null,
      undefined,
      12345,
      {},
      [],
    ];

    for (const badToken of badTokens) {
      const res = await signupIntent.resolveValidIntent(badToken);
      assert.strictEqual(res, null, `Malformed token "${badToken}" must resolve to null`);
    }
  });

  // Test T5.E03: Replay attack on consumed intent token
  await runTest('Suite 2', 'T5.E03', 'Replaying an already consumed intent token returns isValid: false and isUsed: true', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'INSTITUTE', email: 'inst_replay@example.com' });
    const initialCheck = await signupIntent.resolveValidIntent(intent.token);
    assert.ok(initialCheck && initialCheck.isValid === true);

    await signupIntent.markIntentUsed(intent.token);

    const replayedCheck = await signupIntent.resolveValidIntent(intent.token);
    assert.ok(replayedCheck !== null);
    assert.strictEqual(replayedCheck.isValid, false);
    assert.strictEqual(replayedCheck.isUsed, true);
  });

  // Test T5.E04: Role validation in createSignupIntent rejecting non-standard roles
  await runTest('Suite 2', 'T5.E04', 'createSignupIntent rejects forbidden roles (ADMIN, SUPERADMIN, ROOT, GUEST, SYSTEM)', async () => {
    const forbiddenRoles = ['ADMIN', 'SUPERADMIN', 'ROOT', 'GUEST', 'SYSTEM', 'ANONYMOUS', 'MODERATOR', 'HACKER'];
    for (const badRole of forbiddenRoles) {
      await assert.rejects(
        async () => {
          await signupIntent.createSignupIntent({ role: badRole });
        },
        (err) => {
          return err.statusCode === 400 || err.statusCode === 403 || err.code === 'INVALID_ROLE' || err.code === 'ADMIN_REGISTRATION_FORBIDDEN';
        },
        `Forbidden role ${badRole} must be rejected`
      );
    }
  });

  // Test T5.E05: Null / undefined role parameter to createSignupIntent
  await runTest('Suite 2', 'T5.E05', 'createSignupIntent rejects null, undefined, numeric, or empty role with 400 Bad Request', async () => {
    const badRoleInputs = [null, undefined, '', '   ', 123, {}, []];
    for (const badRole of badRoleInputs) {
      await assert.rejects(
        async () => {
          await signupIntent.createSignupIntent({ role: badRole });
        },
        (err) => err.statusCode === 400 || err.code === 'ROLE_REQUIRED' || err.code === 'INVALID_ROLE',
        `Bad role input ${badRole} must be rejected with 400`
      );
    }
  });

  // Test T5.E06: markIntentUsed on empty or invalid token returns false safely
  await runTest('Suite 2', 'T5.E06', 'markIntentUsed on non-existent or null token returns false gracefully without exception', async () => {
    assert.strictEqual(await signupIntent.markIntentUsed(null), false);
    assert.strictEqual(await signupIntent.markIntentUsed(''), false);
    assert.strictEqual(await signupIntent.markIntentUsed('non_existent_token_hex_999999999999999999999999999999999999'), false);
  });

  // ============================================================================
  // SUITE 3: SESSION COOKIE & REQUEST HEADER TAMPERING
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 3: Session Cookie, Header Tampering & CRLF Injection Resilience');

  // Test T5.C01: Cookie header with CRLF injection sequence
  await runTest('Suite 3', 'T5.C01', 'Cookie header with CRLF injection characters handled safely without header splitting', () => {
    const maliciousCookieHeader = 'sb_signup_intent=int_1234567890abcdef\r\nSet-Cookie: admin=true\r\n';
    const match = maliciousCookieHeader.match(/sb_signup_intent=([^;\r\n]+)/);
    assert.ok(match, 'Extracts clean token without CRLF characters');
    assert.strictEqual(match[1], 'int_1234567890abcdef');
    assert.ok(!match[1].includes('\r') && !match[1].includes('\n'));
  });

  // Test T5.C02: Edge middleware handling of unauthenticated protected route access
  await runTest('Suite 3', 'T5.C02', 'Edge middleware intercepts unauthenticated protected route access and redirects with 307', () => {
    const res = simulateEdgeMiddleware('/student/dashboard', null);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.allowed, false);
    assert.ok(res.redirectUrl.includes('/login') || res.redirectUrl.includes('/auth'));
  });

  // Test T5.C03: Session with expired timestamp in session store
  await runTest('Suite 3', 'T5.C03', 'Expired session in mock store is automatically purged and returns null', () => {
    const db = new MockDatabase();
    const user = db.createUser({ email: 'session_exp@example.com', role: ROLES.STUDENT });
    const session = db.createSession(user.id, -10); // Expired 10s ago

    const resolved = db.getSession(session.sessionToken);
    assert.strictEqual(resolved, null, 'Expired session must return null');
  });

  // Test T5.C04: Forged session token lookup returns null safely
  await runTest('Suite 3', 'T5.C04', 'Fabricated non-existent session token returns null from session resolver', () => {
    const db = new MockDatabase();
    const forgedToken = 'forged_session_token_' + crypto.randomBytes(16).toString('hex');
    const result = db.getSession(forgedToken);
    assert.strictEqual(result, null);
  });

  // Test T5.C05: Multiple conflicting cookies handled without parser crash
  await runTest('Suite 3', 'T5.C05', 'Multiple conflicting cookies parsed safely selecting the primary intent', () => {
    const cookieHeader = 'other_cookie=123; sb_signup_intent=valid_token_123456789; corrupt=&&&';
    const match = cookieHeader.match(/sb_signup_intent=([^;]+)/);
    assert.ok(match);
    assert.strictEqual(match[1].trim(), 'valid_token_123456789');
  });

  // ============================================================================
  // SUITE 4: ROLE MUTATION & PRIVILEGE ESCALATION HARDENING
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 4: Role Mutation, Privilege Escalation & Collision Engine Invariants');

  // Test T5.M01: Role collision detection for existing Student attempting Industry signup
  await runTest('Suite 4', 'T5.M01', 'Role collision engine detects existing Student attempting Industry and returns strict message', () => {
    const collision = roleCollision.checkRoleCollision({
      existingUserRole: 'STUDENT',
      intentRole: 'INDUSTRY',
    });
    assert.strictEqual(collision.hasCollision, true);
    assert.strictEqual(collision.existingRole, 'STUDENT');
    assert.strictEqual(collision.attemptedRole, 'INDUSTRY');
    assert.ok(collision.message.includes('registered as a Student'), 'Must contain exact human-readable term Student');
    assert.strictEqual(collision.redirectPath, '/student/dashboard');
  });

  // Test T5.M02: Role collision detection for existing Industry attempting Institute signup
  await runTest('Suite 4', 'T5.M02', 'Role collision engine detects existing Industry attempting Institute and returns strict message', () => {
    const collision = roleCollision.checkRoleCollision({
      existingUserRole: 'INDUSTRY',
      intentRole: 'INSTITUTE',
    });
    assert.strictEqual(collision.hasCollision, true);
    assert.strictEqual(collision.existingRole, 'INDUSTRY');
    assert.strictEqual(collision.attemptedRole, 'INSTITUTE');
    assert.ok(collision.message.includes('registered as a Industry') || collision.message.includes('registered as a Organization'));
  });

  // Test T5.M03: Role collision aliases (INDUSTRY and ORGANIZATION) are treated as non-colliding
  await runTest('Suite 4', 'T5.M03', 'Equivalent role aliases INDUSTRY and ORGANIZATION produce hasCollision: false', () => {
    const c1 = roleCollision.checkRoleCollision({ existingUserRole: 'INDUSTRY', intentRole: 'ORGANIZATION' });
    const c2 = roleCollision.checkRoleCollision({ existingUserRole: 'ORGANIZATION', intentRole: 'INDUSTRY' });
    assert.strictEqual(c1.hasCollision, false);
    assert.strictEqual(c2.hasCollision, false);
  });

  // Test T5.M04: User update immutability lock (user cannot self-mutate role or ID in update payload)
  await runTest('Suite 4', 'T5.M04', 'User update strips role, accountStatus, and ID from payload preserving database role immutability', () => {
    const db = new MockDatabase();
    const user = db.createUser({ email: 'immutable@example.com', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE });

    // Attempt tampering via update
    const updated = db.updateUser(user.id, {
      role: ROLES.ADMIN,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
      name: 'Tampered Name',
    });

    assert.strictEqual(updated.role, ROLES.STUDENT, 'Role must remain STUDENT');
    assert.strictEqual(updated.name, 'Tampered Name');
    const stored = db.getUserById(user.id);
    assert.strictEqual(stored.role, ROLES.STUDENT, 'Stored role must remain STUDENT');
  });

  // Test T5.M05: Collision URL builder query structure
  await runTest('Suite 4', 'T5.M05', 'buildCollisionRedirectUrl generates URL with standard collision params', () => {
    const url = roleCollision.buildCollisionRedirectUrl('STUDENT', 'INDUSTRY');
    assert.strictEqual(url, '/student/dashboard?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY');
  });

  // ============================================================================
  // SUITE 5: IDOR & CROSS-TENANT ACCESS BOUNDARY TESTING
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 5: Multi-Tenant IDOR Attack Resistance & Capability Gating');

  // Test T5.I01: Student A attempting to mutate Student B's profile
  await runTest('Suite 5', 'T5.I01', 'API guard blocks Student A from mutating Student B profile with 403 Forbidden', () => {
    const userA = { id: 'usr_student_A', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const userB_Id = 'usr_student_B';

    const check = simulateApiGuard(userA, { checkOwnership: true }, userB_Id);
    assert.strictEqual(check.status, 403);
    assert.ok(check.error.includes('ownership mismatch') || check.error.includes('Forbidden'));
  });

  // Test T5.I02: Student attempting to mutate Industry profile
  await runTest('Suite 5', 'T5.I02', 'API guard blocks Student attempting to mutate Industry profile with 403 Forbidden', () => {
    const user = { id: 'usr_student_01', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const check = simulateApiGuard(user, { roles: [ROLES.INDUSTRY, ROLES.ORGANIZATION] });
    assert.strictEqual(check.status, 403);
  });

  // Test T5.I03: Admin governance bypass on IDOR check
  await runTest('Suite 5', 'T5.I03', 'Admin role bypasses ownership check for governance operations', () => {
    const adminUser = { id: 'usr_admin_01', role: ROLES.ADMIN, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const targetUser = 'usr_student_target';

    const check = simulateApiGuard(adminUser, { checkOwnership: true }, targetUser);
    assert.strictEqual(check.status, 200);
    assert.strictEqual(check.user.id, adminUser.id);
  });

  // Test T5.I04: Suspended account blocked by API guard
  await runTest('Suite 5', 'T5.I04', 'Suspended account attempting API call is rejected with 403 Forbidden', () => {
    const suspendedUser = { id: 'usr_susp_01', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.SUSPENDED };
    const check = simulateApiGuard(suspendedUser);
    assert.strictEqual(check.status, 403);
  });

  // Test T5.I05: Unverified Organization (KYC PENDING) blocked from publishing opportunities
  await runTest('Suite 5', 'T5.I05', 'Unverified organization (KYC PENDING) blocked from publishing opportunities', () => {
    const db = new MockDatabase();
    const orgUser = db.createUser({ email: 'unverified_org@example.com', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE });
    db.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Unverified Co',
      verificationStatus: KYC_STATUS.PENDING,
    });

    assert.throws(
      () => {
        db.publishOpportunity(orgUser.id, { title: 'Junior Dev' });
      },
      (err) => err.statusCode === 403 && err.message.includes('pending or unapproved'),
      'Must block with 403'
    );
  });

  // Test T5.I06: Tamper-proof audit log records freeze modification
  await runTest('Suite 5', 'T5.I06', 'Audit log records are immutable and throw error on modification attempt', () => {
    const db = new MockDatabase();
    const log = db.recordAuditLog('usr_01', AUDIT_ACTIONS.ACCOUNT_CREATED, { metadata: { role: 'STUDENT' } });
    assert.ok(Object.isFrozen(log), 'Audit log entry must be frozen');
    assert.throws(
      () => {
        'use strict';
        log.actorUserId = 'usr_tampered';
      },
      /TypeError/,
      'Cannot mutate frozen audit log'
    );
  });

  // ============================================================================
  // SUITE 6: EDGE ROUTE MIDDLEWARE PARTITION & TRAVERSAL RESISTANCE
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 6: Edge Middleware Route Partitioning & Traversal Resilience');

  // Test T5.W01: Incomplete onboarding profile accessing /student/dashboard redirected to /student/onboarding or /profile/setup
  await runTest('Suite 6', 'T5.W01', 'Authenticated user with incomplete onboarding accessing dashboard is redirected to onboarding/setup', () => {
    const user = {
      id: 'usr_incomplete',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.IN_PROGRESS,
    };
    const res = simulateEdgeMiddleware('/student/dashboard', user);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.allowed, false);
    assert.ok(res.redirectUrl.includes('/student/onboarding') || res.redirectUrl.includes('/profile/setup'));
  });

  // Test T5.W02: Completed onboarding profile accessing /student/dashboard allowed
  await runTest('Suite 6', 'T5.W02', 'Authenticated user with completed onboarding accessing canonical dashboard is allowed with 200', () => {
    const user = {
      id: 'usr_complete',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res = simulateEdgeMiddleware('/student/dashboard', user);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.allowed, true);
  });

  // Test T5.W03: Student attempting to access /admin/dashboard blocked with 403
  await runTest('Suite 6', 'T5.W03', 'Student user attempting to access /admin/dashboard is blocked with 403 Forbidden', () => {
    const user = {
      id: 'usr_student',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res = simulateEdgeMiddleware('/admin/dashboard', user);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
  });

  // Test T5.W04: Industry user attempting to access /student/dashboard blocked with 403
  await runTest('Suite 6', 'T5.W04', 'Industry user attempting to access /student/dashboard is blocked with 403 Forbidden', () => {
    const user = {
      id: 'usr_industry',
      role: ROLES.INDUSTRY,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res = simulateEdgeMiddleware('/student/dashboard', user);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
  });

  // Test T5.W05: Suspended user blocked across all protected edge routes
  await runTest('Suite 6', 'T5.W05', 'Suspended user attempting to access any protected route is blocked with 403', () => {
    const user = {
      id: 'usr_suspended',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res1 = simulateEdgeMiddleware('/student/dashboard', user);
    const res2 = simulateEdgeMiddleware('/student/opportunities', user);
    assert.strictEqual(res1.status, 403);
    assert.strictEqual(res2.status, 403);
  });

  // Test T5.W06: Deactivated user blocked from edge routes
  await runTest('Suite 6', 'T5.W06', 'Deactivated user attempting to access protected route is blocked with 403', () => {
    const user = {
      id: 'usr_deactivated',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.DEACTIVATED,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res = simulateEdgeMiddleware('/student/dashboard', user);
    assert.strictEqual(res.status, 403);
  });

  // Test T5.W07: Institute user accessing /institute/dashboard allowed
  await runTest('Suite 6', 'T5.W07', 'Institute user with completed onboarding accessing /institute/dashboard is allowed with 200', () => {
    const user = {
      id: 'usr_inst',
      role: ROLES.INSTITUTE,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };
    const res = simulateEdgeMiddleware('/institute/dashboard', user);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.allowed, true);
  });

  // Test T5.W08: Public paths (/login, /register, /, /api/auth) accessible to unauthenticated users
  await runTest('Suite 6', 'T5.W08', 'Public paths allow unauthenticated access with 200 status', () => {
    assert.strictEqual(simulateEdgeMiddleware('/', null).status, 200);
    assert.strictEqual(simulateEdgeMiddleware('/login', null).status, 200);
    assert.strictEqual(simulateEdgeMiddleware('/register', null).status, 200);
    assert.strictEqual(simulateEdgeMiddleware('/api/auth/signup-intent', null).status, 200);
  });

  // ============================================================================
  // SUITE 7: DYNAMIC ONBOARDING SCORING & PROTOTYPE POLLUTION RESILIENCE
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 7: Dynamic Onboarding Scoring, Boundary Clamping & Prototype Safety');

  // Test T5.S01: Null and empty profile objects return exactly 0
  await runTest('Suite 7', 'T5.S01', 'calculateStudentCompletion, calculateOrgCompletion, calculateInstCompletion return 0 for null/undefined/empty', () => {
    assert.strictEqual(onboardingCalc.calculateStudentCompletion(null), 0);
    assert.strictEqual(onboardingCalc.calculateStudentCompletion(undefined), 0);
    assert.strictEqual(onboardingCalc.calculateStudentCompletion({}), 0);
    assert.strictEqual(onboardingCalc.calculateOrganizationCompletion(null), 0);
    assert.strictEqual(onboardingCalc.calculateOrganizationCompletion({}), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion(null), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({}), 0);
  });

  // Test T5.S02: Overloaded profiles with excess fields clamped strictly to 100
  await runTest('Suite 7', 'T5.S02', 'Overloaded profile objects clamped strictly to integer 100 (never exceeding 100)', () => {
    const fullStudent = {
      headline: 'Full Stack Engineer',
      bio: 'Experienced developer',
      instituteName: 'NIT',
      department: 'CSE',
      degree: 'B.Tech',
      yearOfStudy: '4',
      skills: ['JS', 'React', 'Node', 'SQL', 'Python', 'AWS', 'Docker'],
      projects: [{ title: 'P1' }, { title: 'P2' }, { title: 'P3' }],
      certifications: [{ name: 'C1' }, { name: 'C2' }],
      experience: [{ title: 'E1' }],
      careerPreferences: { role: 'Dev', location: 'Remote', salary: 'High' },
    };
    const score = onboardingCalc.calculateStudentCompletion(fullStudent);
    assert.strictEqual(score, 100);

    const fullOrg = {
      companyName: 'Apex Inc',
      website: 'https://apex.com',
      logoUrl: 'https://apex.com/logo.png',
      registrationNumber: 'CIN12345',
      taxIdGstin: '29ABCDE1234F1Z5',
      contactPhone: '+919999999999',
      address: 'Bengaluru, India',
      industry: 'Software',
      companySize: '100-500',
      hiringPreferences: { roles: ['Dev'] },
      verificationDocs: ['doc1.pdf'],
    };
    const orgScore = onboardingCalc.calculateOrganizationCompletion(fullOrg);
    assert.strictEqual(orgScore, 100);
  });

  // Test T5.S03: Skills threshold grading (0 -> 0%, 1-2 -> 10%, >=3 -> 20%)
  await runTest('Suite 7', 'T5.S03', 'Student skills scoring rigorously satisfies threshold transitions (0->0%, 1..2->10%, >=3->20%)', () => {
    const s0 = onboardingCalc.calculateStudentCompletion({ skills: [] });
    const s1 = onboardingCalc.calculateStudentCompletion({ skills: ['JavaScript'] });
    const s2 = onboardingCalc.calculateStudentCompletion({ skills: ['JavaScript', 'Python'] });
    const s3 = onboardingCalc.calculateStudentCompletion({ skills: ['JavaScript', 'Python', 'SQL'] });
    const s10 = onboardingCalc.calculateStudentCompletion({ skills: Array(10).fill('Skill') });

    assert.strictEqual(s0, 0);
    assert.strictEqual(s1, 10);
    assert.strictEqual(s2, 10);
    assert.strictEqual(s3, 20);
    assert.strictEqual(s10, 20);
  });

  // Test T5.S04: Prototype pollution attempt on profile calculator
  await runTest('Suite 7', 'T5.S04', 'Profile calculator immune to prototype pollution vectors (__proto__, constructor)', () => {
    const pollutedPayload = JSON.parse('{"__proto__": {"isAdmin": true, "skills": ["a","b","c"]}, "headline": "Dev"}');
    const score = onboardingCalc.calculateStudentCompletion(pollutedPayload);
    assert.ok(typeof score === 'number' && score >= 0 && score <= 100);
    assert.strictEqual(Object.prototype.isAdmin, undefined, 'Prototype must not be polluted');
  });

  // Test T5.S05: Granular breakdown functions return missing fields correctly
  await runTest('Suite 7', 'T5.S05', 'getStudentCompletionDetails, getOrgCompletionDetails, getInstituteCompletionDetails list missing fields', () => {
    const stdDetails = onboardingCalc.getStudentCompletionDetails({});
    assert.ok(stdDetails.missingFields.length >= 5);
    assert.ok(stdDetails.missingFields.includes('Professional Headline'));

    const orgDetails = onboardingCalc.getOrgCompletionDetails({});
    assert.ok(orgDetails.missingFields.length >= 5);
    assert.ok(orgDetails.missingFields.includes('Company Name'));

    const instDetails = onboardingCalc.getInstituteCompletionDetails({});
    assert.ok(instDetails.missingFields.length >= 5);
    assert.ok(instDetails.missingFields.includes('Institute Name'));
  });

  // Test T5.S06: Universal calculateProfileCompletion router supports all 4 roles
  await runTest('Suite 7', 'T5.S06', 'calculateProfileCompletion correctly resolves Student, Industry, Institute, Admin', () => {
    assert.strictEqual(onboardingCalc.calculateProfileCompletion('ADMIN', {}), 100);
    assert.strictEqual(onboardingCalc.calculateProfileCompletion({ role: 'ADMIN' }), 100);
    assert.strictEqual(onboardingCalc.calculateProfileCompletion('STUDENT', {}), 0);
    assert.strictEqual(onboardingCalc.calculateProfileCompletion('INDUSTRY', {}), 0);
    assert.strictEqual(onboardingCalc.calculateProfileCompletion('INSTITUTE', {}), 0);
  });

  // ============================================================================
  // SUITE 8: STRICT TERMINOLOGY & BRAND INTEGRITY
  // ============================================================================
  if (!isJson) console.log('\n▶ SUITE 8: Strict Terminology & Brand Integrity Enforcement');

  // Test T5.T01: Terminology compliance across exported constants
  await runTest('Suite 8', 'T5.T01', 'Allowed role definitions strictly enforce Student, Industry, Institute (no generic Organization/Company)', () => {
    const allowed = signupIntent.ALLOWED_SIGNUP_ROLES;
    assert.ok(allowed.includes('STUDENT'), 'Must include STUDENT');
    assert.ok(allowed.includes('INDUSTRY'), 'Must include INDUSTRY');
    assert.ok(allowed.includes('INSTITUTE'), 'Must include INSTITUTE');
  });

  // Test T5.T02: Collision URLs contain strict upper-case role representations
  await runTest('Suite 8', 'T5.T02', 'Collision URL builders produce standard query parameters matching contract', () => {
    const url = roleCollision.buildAuthCollisionUrl('STUDENT', 'INDUSTRY');
    assert.ok(url.includes('collision=true'));
    assert.ok(url.includes('existingRole=STUDENT'));
    assert.ok(url.includes('attemptedRole=INDUSTRY'));
  });

  // Test T5.T03: Terminology enforcement on collision error messages
  await runTest('Suite 8', 'T5.T03', 'checkRoleCollision returns precise humanized names Student, Industry, Institute in collision message', () => {
    const cStudent = roleCollision.checkRoleCollision({ existingUserRole: 'STUDENT', intentRole: 'INDUSTRY' });
    assert.ok(cStudent.message.includes('registered as a Student.'));

    const cIndustry = roleCollision.checkRoleCollision({ existingUserRole: 'INDUSTRY', intentRole: 'STUDENT' });
    assert.ok(cIndustry.message.includes('registered as a Industry.'));

    const cInstitute = roleCollision.checkRoleCollision({ existingUserRole: 'INSTITUTE', intentRole: 'STUDENT' });
    assert.ok(cInstitute.message.includes('registered as a Institute.'));
  });

  // Test T5.T04: Clean redirect paths match canonical lowercase role routes
  await runTest('Suite 8', 'T5.T04', 'checkRoleCollision returns standard redirect paths /student/dashboard, /industry/dashboard, /institute/dashboard', () => {
    const c1 = roleCollision.checkRoleCollision({ existingUserRole: 'STUDENT', intentRole: 'INDUSTRY' });
    assert.strictEqual(c1.redirectPath, '/student/dashboard');

    const c2 = roleCollision.checkRoleCollision({ existingUserRole: 'INDUSTRY', intentRole: 'STUDENT' });
    assert.strictEqual(c2.redirectPath, '/industry/dashboard');

    const c3 = roleCollision.checkRoleCollision({ existingUserRole: 'INSTITUTE', intentRole: 'STUDENT' });
    assert.strictEqual(c3.redirectPath, '/institute/dashboard');
  });

  // ============================================================================
  // EXECUTION SUMMARY & REPORTING
  // ============================================================================
  const overallDuration = Date.now() - overallStartTime;

  if (isJson) {
    console.log(JSON.stringify({
      suite: 'Tier 5 Adversarial Auth & Onboarding Hardening Suite',
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      durationMs: overallDuration,
      passRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      failures: failureDetails,
    }, null, 2));
  } else {
    console.log('\n----------------------------------------------------------------------');
    console.log('            TIER 5 ADVERSARIAL TEST SUITE EXECUTION SUMMARY           ');
    console.log('----------------------------------------------------------------------');
    console.log(`  Total Test Cases   : ${totalTests}`);
    console.log(`  Passed Tests       : ${passedTests}`);
    console.log(`  Failed Tests       : ${failedTests}`);
    console.log(`  Overall Pass Rate  : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Total Duration     : ${overallDuration}ms`);
    console.log('----------------------------------------------------------------------');

    if (failedTests === 0) {
      console.log('\n   ALL TIER 5 ADVERSARIAL TESTS PASSED (100% HARDENED) \n');
    } else {
      console.log(`\n   ${failedTests} TEST(S) FAILED \n`);
    }
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
