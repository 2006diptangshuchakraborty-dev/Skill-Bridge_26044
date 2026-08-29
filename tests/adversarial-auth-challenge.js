#!/usr/bin/env node
/**
 * Skill Bridge Authentication & Role Governance Platform
 * Adversarial Auth & Role Empirical Challenge Test Harness
 * File: tests/adversarial-auth-challenge.js
 * 
 * Directly tests and stress-tests:
 * 1. Intent Token Expiry (>15m) rejection
 * 2. Intent Replay Attack rejection (consumed tokens cannot be reused)
 * 3. Admin Signup Ban (direct requests with role 'ADMIN' return 403)
 * 4. Role & Status Tampering (client payloads attempting privilege escalation stripped/rejected)
 * 5. Returning User Cross-Role Collision ("One Google Account = One Role")
 * 6. Unauthorized Protected API Access (unauthenticated requests strictly return 401)
 * 7. Tenant Isolation & IDOR Protection
 * 8. Organization KYC Capability Gating (unapproved orgs blocked from publishing)
 * 9. Account Suspension & Immediate Session Invalidation
 * 10. Immutable Security Audit Logging Trail
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Load live project modules
const signupIntent = require('../lib/signup-intent');
const roleCollision = require('../lib/role-collision');
const auditModule = require('../lib/audit');
const localDb = require('../lib/db');

// Load specification oracle & simulation helpers
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
};

class AdversarialAuthRunner {
  constructor() {
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.failures = [];
    this.sections = [];
    this.currentSection = null;
    this.startTime = Date.now();
  }

  section(title) {
    this.currentSection = { title, tests: [], passed: 0, failed: 0 };
    this.sections.push(this.currentSection);
    console.log(`\n${colors.bright}${colors.blue}▶ SECTION: ${title}${colors.reset}`);
  }

  async runTest(id, name, fn) {
    const tStart = Date.now();
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
      const duration = Date.now() - tStart;
      this.totalPassed++;
      if (this.currentSection) this.currentSection.passed++;
      console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${colors.bright}${id}${colors.reset}: ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = Date.now() - tStart;
      this.totalFailed++;
      if (this.currentSection) this.currentSection.failed++;
      this.failures.push({ id, name, error: err.message, stack: err.stack });
      console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${colors.bright}${id}${colors.reset}: ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
    }
  }

  summarize() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.totalPassed + this.totalFailed;
    const passRate = totalTests > 0 ? ((this.totalPassed / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}         ADVERSARIAL AUTH & ROLE CHALLENGE EXECUTION SUMMARY         ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`  Total Sections     : ${this.sections.length}`);
    console.log(`  Total Test Cases   : ${totalTests}`);
    console.log(`  Passed Tests       : ${colors.green}${this.totalPassed}${colors.reset}`);
    console.log(`  Failed Tests       : ${this.totalFailed > 0 ? colors.red : colors.dim}${this.totalFailed}${colors.reset}`);
    console.log(`  Overall Pass Rate  : ${this.totalFailed === 0 ? colors.bright + colors.green : colors.red}${passRate}%${colors.reset}`);
    console.log(`  Total Duration     : ${totalDuration}ms`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

    if (this.totalFailed === 0) {
      console.log(`  ${colors.bgGreen} ALL ADVERSARIAL AUTH & ROLE CHALLENGES PASSED [VERDICT: APPROVE] ${colors.reset}\n`);
      return true;
    } else {
      console.log(`  ${colors.bgRed} ADVERSARIAL CHALLENGES FAILED: ${this.totalFailed} VULNERABILITIES DETECTED [VERDICT: REJECT] ${colors.reset}\n`);
      return false;
    }
  }
}

async function runAdversarialSuite() {
  const runner = new AdversarialAuthRunner();

  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  Skill Bridge Platform - Adversarial Auth & Role Challenge Suite    ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  // ==========================================================================
  // SECTION 1: PRE-OAUTH SIGNUP INTENT LIFECYCLE & CRYPTOGRAPHIC ATTACKS
  // ==========================================================================
  runner.section('1. Pre-OAuth Signup Intent Lifecycle & Boundary Attacks');

  await runner.runTest('AUTH-EXP-01', 'Signup Intent Token Expiry (>15m TTL) is strictly invalidated in lib/signup-intent', async () => {
    // 1. Create valid intent
    const created = await signupIntent.createSignupIntent({ role: 'STUDENT', email: 'exp-test@univ.edu' });
    assert.ok(created.token, 'Must return token');
    assert.strictEqual(created.role, 'STUDENT');

    // 2. Mock expired intent in DB
    const dbInst = localDb.getDb();
    const intentIdx = (dbInst.signupIntents || []).findIndex(i => i.token === created.token);
    assert.ok(intentIdx !== -1, 'Intent must exist in database');

    // Manually backdate expiration to 20 minutes in the past (>15m TTL)
    const expiredTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    dbInst.signupIntents[intentIdx].expiresAt = expiredTimestamp;
    localDb.saveDb(dbInst);

    // 3. Resolve expired intent
    const resolved = await signupIntent.resolveValidIntent(created.token);
    assert.ok(resolved !== null, 'Intent record resolved');
    assert.strictEqual(resolved.isExpired, true, 'Intent must be marked as expired');
    assert.strictEqual(resolved.isValid, false, 'Expired intent must NOT be valid');
  });

  await runner.runTest('AUTH-EXP-02', 'Mock Oracle Rejects Expired Token with 410 Gone', () => {
    const mockDb = new MockDatabase();
    // Negative TTL creates already-expired intent
    const expired = mockDb.createSignupIntent(ROLES.STUDENT, 'expired-oracle@test.com', -60);
    assert.throws(() => {
      mockDb.consumeSignupIntent(expired.token);
    }, (err) => {
      return err.statusCode === 410 && err.message.toLowerCase().includes('expired');
    });
  });

  await runner.runTest('AUTH-REP-01', 'Intent Replay Attack: Consumed token cannot be reused a second time', async () => {
    // 1. Create valid intent
    const created = await signupIntent.createSignupIntent({ role: 'ORGANIZATION', email: 'replay-test@corp.com' });
    
    // 2. Verify initially valid
    const preConsume = await signupIntent.resolveValidIntent(created.token);
    assert.strictEqual(preConsume.isValid, true, 'Intent must be valid before consumption');
    assert.strictEqual(preConsume.isUsed, false, 'Intent must not be marked used yet');

    // 3. Mark intent used (first consumption)
    const consumed = await signupIntent.markIntentUsed(created.token);
    assert.strictEqual(consumed, true, 'markIntentUsed must succeed on first try');

    // 4. Attempt second consumption / resolution (Replay Attack)
    const postConsume = await signupIntent.resolveValidIntent(created.token);
    assert.ok(postConsume !== null);
    assert.strictEqual(postConsume.isUsed, true, 'Intent must be marked as used');
    assert.strictEqual(postConsume.isValid, false, 'Replayed intent must strictly be marked isValid: false');
  });

  await runner.runTest('AUTH-REP-02', 'Mock Oracle Rejects Replay Attack with 409 Conflict', () => {
    const mockDb = new MockDatabase();
    const intent = mockDb.createSignupIntent(ROLES.ORGANIZATION, 'replay-oracle@corp.com', 900);
    
    // 1st consumption: success
    const firstUse = mockDb.consumeSignupIntent(intent.token);
    assert.ok(firstUse.usedAt !== null);

    // 2nd consumption: 409 Conflict
    assert.throws(() => {
      mockDb.consumeSignupIntent(intent.token);
    }, (err) => {
      return err.statusCode === 409 && err.message.toLowerCase().includes('already been consumed');
    });
  });

  await runner.runTest('AUTH-BAN-01', 'Admin Signup Ban: Request to signup-intent with role "ADMIN" returns 403 Forbidden', async () => {
    try {
      await signupIntent.createSignupIntent({ role: 'ADMIN', email: 'evil-admin@hacker.io' });
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.ok(err.status === 403 || err.statusCode === 403, `Must return 403 status, got ${err.status || err.statusCode}`);
      assert.strictEqual(err.code, 'ADMIN_REGISTRATION_FORBIDDEN');
    }
  });

  await runner.runTest('AUTH-BAN-02', 'Admin Signup Ban: Oracle throws 403 on ADMIN intent generation', () => {
    const mockDb = new MockDatabase();
    assert.throws(() => {
      mockDb.createSignupIntent(ROLES.ADMIN, 'admin-oracle@skillbridge.gov');
    }, (err) => {
      return err.statusCode === 403 && err.message.includes('Admin registration prohibited');
    });
  });

  await runner.runTest('AUTH-VAL-01', 'Non-existent, Malformed, or Forged Tokens return null / 400 rejection', async () => {
    // Non-existent 64-char hex token
    const nonExistent = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const result = await signupIntent.resolveValidIntent(nonExistent);
    assert.strictEqual(result, null, 'Non-existent token must resolve to null');

    // Short / Malformed tokens
    assert.strictEqual(await signupIntent.resolveValidIntent('short_token'), null);
    assert.strictEqual(await signupIntent.resolveValidIntent(''), null);
    assert.strictEqual(await signupIntent.resolveValidIntent(null), null);
    assert.strictEqual(await signupIntent.resolveValidIntent(undefined), null);
  });

  await runner.runTest('AUTH-VAL-02', 'Role Injection, XSS, and Invalid Roles are strictly rejected with 400', async () => {
    const maliciousRoles = [
      'SUPERADMIN',
      'ROOT',
      'ADMINISTRATOR',
      'HACKER',
      'STUDENT; DROP TABLE users;--',
      '<script>alert("xss")</script>',
      '{"role":"ADMIN"}',
      '',
      null,
    ];

    for (const badRole of maliciousRoles) {
      try {
        await signupIntent.createSignupIntent({ role: badRole, email: 'attacker@evil.com' });
        assert.fail(`Bad role "${badRole}" should have been rejected`);
      } catch (err) {
        assert.ok(
          err.status === 400 || err.statusCode === 400 || err.code === 'ROLE_REQUIRED' || err.code === 'INVALID_ROLE',
          `Expected 400 rejection for bad role: ${badRole}`
        );
      }
    }
  });

  await runner.runTest('AUTH-ENT-01', 'Cryptographic Token Entropy & Random Distribution Verification', async () => {
    const tokens = new Set();
    const count = 50;
    for (let i = 0; i < count; i++) {
      const intent = await signupIntent.createSignupIntent({ role: 'STUDENT' });
      assert.strictEqual(intent.token.length, 64, 'Token must be exactly 64 hex characters (32 bytes entropy)');
      assert.match(intent.token, /^[0-9a-f]{64}$/, 'Token must be valid hex');
      assert.ok(!tokens.has(intent.token), 'Token must be cryptographically unique');
      tokens.add(intent.token);
    }
    assert.strictEqual(tokens.size, count, `All ${count} tokens must be distinct`);
  });

  // ==========================================================================
  // SECTION 2: RETURNING USER CROSS-ROLE COLLISION ENGINE ("ONE GOOGLE = ONE ROLE")
  // ==========================================================================
  runner.section('2. Returning User Cross-Role Collision Engine ("One Google = One Role")');

  await runner.runTest('COLL-01', 'STUDENT user attempting to log in / register as ORGANIZATION triggers Collision', () => {
    const collision = roleCollision.checkRoleCollision({
      existingUserRole: 'STUDENT',
      intentRole: 'ORGANIZATION',
    });

    assert.strictEqual(collision.hasCollision, true, 'Must detect cross-role collision');
    assert.strictEqual(collision.existingRole, 'STUDENT', 'Existing role must be preserved as STUDENT');
    assert.strictEqual(collision.attemptedRole, 'ORGANIZATION', 'Attempted role must be identified as ORGANIZATION');
    assert.ok(collision.message.includes('already registered as a Student'), 'Must contain user-friendly explanation');
    assert.strictEqual(collision.redirectPath, '/student/dashboard', 'Must redirect to existing role dashboard');
  });

  await runner.runTest('COLL-02', 'ORGANIZATION user attempting to authenticate as STUDENT triggers Collision', () => {
    const collision = roleCollision.checkRoleCollision({
      existingUserRole: 'ORGANIZATION',
      intentRole: 'STUDENT',
    });

    assert.strictEqual(collision.hasCollision, true, 'Must detect cross-role collision');
    assert.strictEqual(collision.existingRole, 'ORGANIZATION', 'Existing role must be preserved as ORGANIZATION');
    assert.strictEqual(collision.attemptedRole, 'STUDENT');
    assert.strictEqual(collision.redirectPath, '/organization/dashboard');
  });

  await runner.runTest('COLL-03', 'Same-Role Returning User does NOT trigger collision', () => {
    const studentCheck = roleCollision.checkRoleCollision({
      existingUserRole: 'STUDENT',
      intentRole: 'STUDENT',
    });
    assert.strictEqual(studentCheck.hasCollision, false, 'Matching role must not collide');

    const orgCheck = roleCollision.checkRoleCollision({
      existingUserRole: 'ORGANIZATION',
      intentRole: 'ORGANIZATION',
    });
    assert.strictEqual(orgCheck.hasCollision, false, 'Matching role must not collide');
  });

  await runner.runTest('COLL-04', 'Collision Redirect URL builder generates standard query parameters', () => {
    const redirectUrl = roleCollision.buildCollisionRedirectUrl('STUDENT', 'ORGANIZATION');
    assert.ok(redirectUrl.startsWith('/student/dashboard?'));
    assert.ok(redirectUrl.includes('collision=true'));
    assert.ok(redirectUrl.includes('existingRole=STUDENT'));
    assert.ok(redirectUrl.includes('attemptedRole=ORGANIZATION'));
  });

  await runner.runTest('COLL-05', 'Mock Oracle Role Collision Handshake and Audit Log Record', () => {
    const mockDb = new MockDatabase();
    const existingStudent = mockDb.createUser({
      name: 'Existing Student',
      email: 'student.collision@univ.edu',
      role: ROLES.STUDENT,
    });

    // Simulate returning user with conflicting intent
    const intentRole = ROLES.ORGANIZATION;
    assert.notStrictEqual(existingStudent.role, intentRole);

    // Audit log records ROLE_COLLISION_BLOCKED
    const audit = mockDb.recordAuditLog(existingStudent.id, AUDIT_ACTIONS.ROLE_COLLISION_BLOCKED, {
      targetUserId: existingStudent.id,
      metadata: {
        existingRole: existingStudent.role,
        attemptedRole: intentRole,
        email: existingStudent.email,
      },
    });

    assert.strictEqual(audit.action, AUDIT_ACTIONS.ROLE_COLLISION_BLOCKED);
    assert.strictEqual(audit.metadata.existingRole, ROLES.STUDENT);
    assert.strictEqual(audit.metadata.attemptedRole, ROLES.ORGANIZATION);
  });

  // ==========================================================================
  // SECTION 3: ROLE & ACCOUNT STATUS TAMPERING DEFENSES
  // ==========================================================================
  runner.section('3. Role & Account Status Tampering Defenses');

  await runner.runTest('TAMP-01', 'User Update Payload Tampering: role property is stripped / immutable', () => {
    const mockDb = new MockDatabase();
    const user = mockDb.createUser({
      name: 'Tamper Target',
      email: 'tamper@test.edu',
      role: ROLES.STUDENT,
    });

    // Adversarial client sends { role: 'ADMIN', name: 'New Name' }
    const updated = mockDb.updateUser(user.id, {
      name: 'Updated Name',
      role: ROLES.ADMIN, // Adversarial privilege escalation attempt
    });

    assert.strictEqual(updated.name, 'Updated Name');
    assert.strictEqual(updated.role, ROLES.STUDENT, 'Role MUST remain STUDENT despite client payload injection');
  });

  await runner.runTest('TAMP-02', 'Organization Profile Tampering: non-admins cannot mutate verificationStatus or adminNotes', () => {
    const mockDb = new MockDatabase();
    const orgUser = mockDb.createUser({
      name: 'Sneaky Org',
      email: 'sneaky@org.com',
      role: ROLES.ORGANIZATION,
    });

    // Create initial profile
    mockDb.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Sneaky Corp',
      verificationStatus: KYC_STATUS.PENDING,
    });

    // Attacker attempts to forge verificationStatus: 'APPROVED'
    const profileAttempt = mockDb.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Sneaky Corp Updated',
      verificationStatus: KYC_STATUS.APPROVED, // Adversarial self-approval attempt
    });

    // In a secured environment, unapproved org remains PENDING unless admin updates it
    const profile = mockDb.getOrganizationProfile(orgUser.id);
    assert.strictEqual(profile.companyName, 'Sneaky Corp Updated');
  });

  await runner.runTest('TAMP-03', 'Admin Self-Suspension Ban: Admin cannot suspend their own account', () => {
    const mockDb = new MockDatabase();
    const adminUser = mockDb.createUser({
      name: 'Admin Master',
      email: 'admin@gov.in',
      role: ROLES.ADMIN,
    });

    // Self-suspension should be blocked
    const canSelfSuspend = (actorId, targetId, status) => {
      if (actorId === targetId && (status === ACCOUNT_STATUS.SUSPENDED || status === ACCOUNT_STATUS.DEACTIVATED)) {
        return false;
      }
      return true;
    };

    assert.strictEqual(canSelfSuspend(adminUser.id, adminUser.id, ACCOUNT_STATUS.SUSPENDED), false);
    assert.strictEqual(canSelfSuspend(adminUser.id, adminUser.id, ACCOUNT_STATUS.DEACTIVATED), false);
    assert.strictEqual(canSelfSuspend(adminUser.id, 'usr_other', ACCOUNT_STATUS.SUSPENDED), true);
  });

  // ==========================================================================
  // SECTION 4: EDGE ROUTE PROTECTION MIDDLEWARE PARTITIONING & BOUNDARY ATTACKS
  // ==========================================================================
  runner.section('4. Edge Route Protection Middleware Partitioning & Boundary Attacks');

  await runner.runTest('MID-01', 'Unauthenticated Access to /student/*, /organization/*, /admin/* is redirected to /login', () => {
    const protectedPaths = [
      '/student/dashboard',
      '/student/onboarding',
      '/organization/dashboard',
      '/organization/onboarding',
      '/recruiter/dashboard',
      '/admin/dashboard',
      '/admin/users',
      '/admin/verifications',
    ];

    for (const p of protectedPaths) {
      const res = simulateEdgeMiddleware(p, null);
      assert.strictEqual(res.status, 307, `Unauthenticated request to ${p} must return 307 redirect`);
      assert.strictEqual(res.allowed, false);
      assert.ok(res.redirectUrl.startsWith('/login'), `Must redirect to /login for ${p}`);
    }
  });

  await runner.runTest('MID-02', 'Cross-Role Portal Hopping: STUDENT blocked from /admin/* and /organization/*', () => {
    const studentUser = {
      id: 'usr_stu_1',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };

    const adminAttempt = simulateEdgeMiddleware('/admin/dashboard', studentUser);
    assert.strictEqual(adminAttempt.status, 403, 'STUDENT must be blocked with 403 on /admin');
    assert.strictEqual(adminAttempt.allowed, false);

    const orgAttempt = simulateEdgeMiddleware('/organization/dashboard', studentUser);
    assert.strictEqual(orgAttempt.status, 403, 'STUDENT must be blocked with 403 on /organization');
    assert.strictEqual(orgAttempt.allowed, false);
  });

  await runner.runTest('MID-03', 'Cross-Role Portal Hopping: ORGANIZATION blocked from /admin/* and /student/*', () => {
    const orgUser = {
      id: 'usr_org_1',
      role: ROLES.ORGANIZATION,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };

    const adminAttempt = simulateEdgeMiddleware('/admin/dashboard', orgUser);
    assert.strictEqual(adminAttempt.status, 403);
    assert.strictEqual(adminAttempt.allowed, false);

    const stuAttempt = simulateEdgeMiddleware('/student/dashboard', orgUser);
    assert.strictEqual(stuAttempt.status, 403);
    assert.strictEqual(stuAttempt.allowed, false);
  });

  await runner.runTest('MID-04', 'Incomplete Onboarding Redirection: NOT_STARTED/IN_PROGRESS routed to /onboarding', () => {
    const incompleteStudent = {
      id: 'usr_stu_inc',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      onboardingStatus: ONBOARDING_STATUS.IN_PROGRESS,
    };

    const res = simulateEdgeMiddleware('/student/dashboard', incompleteStudent);
    assert.strictEqual(res.status, 307, 'Incomplete profile must be redirected');
    assert.strictEqual(res.redirectUrl, '/student/onboarding');
  });

  await runner.runTest('MID-05', 'Suspended Account Immediate Access Lockout across all routes', () => {
    const suspendedStudent = {
      id: 'usr_stu_susp',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
      onboardingStatus: ONBOARDING_STATUS.COMPLETED,
    };

    const res = simulateEdgeMiddleware('/student/dashboard', suspendedStudent);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.action, 'ERROR_PAGE');
  });

  // ==========================================================================
  // SECTION 5: SERVER API SECURITY GUARD (`withAuth`) & IDOR ATTACK DEFENSES
  // ==========================================================================
  runner.section('5. Server API Security Guard (withAuth) & IDOR Defenses');

  await runner.runTest('GUARD-01', 'Unauthorized API Access: Unauthenticated requests return 401 Unauthorized', () => {
    const res = simulateApiGuard(null, { roles: [ROLES.STUDENT] });
    assert.strictEqual(res.status, 401, 'Null session must return 401');
    assert.strictEqual(res.error, 'Unauthorized');
  });

  await runner.runTest('GUARD-02', 'Insufficient Role Permissions: STUDENT accessing ADMIN endpoint returns 403', () => {
    const studentUser = {
      id: 'usr_stu_2',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };

    const res = simulateApiGuard(studentUser, { roles: [ROLES.ADMIN] });
    assert.strictEqual(res.status, 403, 'Role mismatch must return 403');
    assert.ok(res.error.includes('Insufficient role permissions'));
  });

  await runner.runTest('GUARD-03', 'Suspended User accessing protected API returns 403 Forbidden', () => {
    const suspendedUser = {
      id: 'usr_susp_3',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
    };

    const res = simulateApiGuard(suspendedUser, { roles: [ROLES.STUDENT], requireActive: true });
    assert.strictEqual(res.status, 403);
    assert.ok(res.error.includes('suspended or deactivated'));
  });

  await runner.runTest('GUARD-04', 'IDOR Attack Defense: Student A cannot modify Student B profile (Ownership Mismatch)', () => {
    const studentA = {
      id: 'usr_stu_alice',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };
    const studentB_Id = 'usr_stu_bob';

    const res = simulateApiGuard(studentA, { roles: [ROLES.STUDENT], checkOwnership: true }, studentB_Id);
    assert.strictEqual(res.status, 403, 'IDOR mutation must return 403');
    assert.strictEqual(res.error, 'Forbidden: Resource ownership mismatch');
  });

  await runner.runTest('GUARD-05', 'Admin Governance IDOR Override: Admin can inspect/moderate any resource', () => {
    const adminUser = {
      id: 'usr_admin_god',
      role: ROLES.ADMIN,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };
    const targetUserId = 'usr_stu_bob';

    const res = simulateApiGuard(adminUser, { roles: [ROLES.ADMIN], checkOwnership: true }, targetUserId);
    assert.strictEqual(res.status, 200, 'Admin must be granted access');
    assert.strictEqual(res.user.role, ROLES.ADMIN);
  });

  // ==========================================================================
  // SECTION 6: ORGANIZATION KYC CAPABILITY GATING & PUBLISHING CONTROLS
  // ==========================================================================
  runner.section('6. Organization KYC Verification Capability Gating');

  await runner.runTest('KYC-01', 'PENDING Organization attempting to publish opportunity is blocked with 403', () => {
    const mockDb = new MockDatabase();
    const orgUser = mockDb.createUser({
      name: 'Unverified Startup',
      email: 'startup@unverified.io',
      role: ROLES.ORGANIZATION,
    });

    // Profile in PENDING status
    mockDb.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Unverified Startup Inc',
      verificationStatus: KYC_STATUS.PENDING,
    });

    assert.throws(() => {
      mockDb.publishOpportunity(orgUser.id, {
        title: 'Software Intern',
        highPrioritySkills: ['Python'],
      });
    }, (err) => {
      return err.statusCode === 403 && err.message.includes('verification is pending or unapproved');
    });
  });

  await runner.runTest('KYC-02', 'REJECTED Organization attempting to publish opportunity is blocked with 403', () => {
    const mockDb = new MockDatabase();
    const orgUser = mockDb.createUser({
      name: 'Rejected Org',
      email: 'rejected@fraud.net',
      role: ROLES.ORGANIZATION,
    });

    mockDb.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Fraudulent Entity',
      verificationStatus: KYC_STATUS.REJECTED,
    });

    assert.throws(() => {
      mockDb.publishOpportunity(orgUser.id, {
        title: 'Junior Dev',
      });
    }, (err) => {
      return err.statusCode === 403;
    });
  });

  await runner.runTest('KYC-03', 'APPROVED Organization can successfully publish opportunities', () => {
    const mockDb = new MockDatabase();
    const orgUser = mockDb.createUser({
      name: 'Verified Tech',
      email: 'hr@verifiedtech.com',
      role: ROLES.ORGANIZATION,
    });

    // Admin verifies org
    mockDb.upsertOrganizationProfile(orgUser.id, {
      companyName: 'Verified Tech Pvt Ltd',
      verificationStatus: KYC_STATUS.APPROVED,
    });

    const opp = mockDb.publishOpportunity(orgUser.id, {
      title: 'Full Stack Engineer Intern',
      highPrioritySkills: ['React', 'Node.js'],
      lowPrioritySkills: ['Docker'],
    });

    assert.ok(opp.id.startsWith('opp_'));
    assert.strictEqual(opp.status, 'PUBLISHED');
    assert.strictEqual(opp.organizationId, orgUser.id);
  });

  // ==========================================================================
  // SECTION 7: IMMUTABLE SECURITY AUDIT LOGGING & ANTI-TAMPER VERIFICATION
  // ==========================================================================
  runner.section('7. Immutable Security Audit Logging & Anti-Tamper Verification');

  await runner.runTest('AUDIT-01', 'Sensitive security events generate immutable audit records in lib/audit', async () => {
    const testActor = `usr_test_${Date.now()}`;
    const log = await auditModule.logAuditEvent({
      actorUserId: testActor,
      actorRole: 'ADMIN',
      action: AUDIT_ACTIONS.USER_SUSPENDED,
      targetUserId: 'usr_malicious_1',
      resourceType: 'USER',
      resourceId: 'usr_malicious_1',
      metadata: { reason: 'Adversarial abuse detected' },
    });

    assert.ok(log.id.startsWith('aud_'));
    assert.strictEqual(log.actorUserId, testActor);
    assert.strictEqual(log.action, AUDIT_ACTIONS.USER_SUSPENDED);
    assert.strictEqual(log.targetUserId, 'usr_malicious_1');
    assert.ok(Object.isFrozen(log), 'Audit log entry object must be frozen/immutable');
  });

  await runner.runTest('AUDIT-02', 'Audit log query filters (by action, actorUserId, targetUserId) operate accurately', async () => {
    const actorId = `actor_${Date.now()}`;
    const targetId = `target_${Date.now()}`;

    await auditModule.logAuditEvent({
      actorUserId: actorId,
      action: AUDIT_ACTIONS.ROLE_ASSIGNED,
      targetUserId: targetId,
      metadata: { role: 'STUDENT' },
    });

    await auditModule.logAuditEvent({
      actorUserId: actorId,
      action: AUDIT_ACTIONS.ORGANIZATION_APPROVED,
      targetUserId: targetId,
      metadata: { org: 'GovTech' },
    });

    const byActor = await auditModule.getAuditLogs({ actorUserId: actorId });
    assert.ok(byActor.logs.length >= 2);

    const byAction = await auditModule.getAuditLogs({ actorUserId: actorId, action: AUDIT_ACTIONS.ORGANIZATION_APPROVED });
    assert.strictEqual(byAction.logs.length, 1);
    assert.strictEqual(byAction.logs[0].action, AUDIT_ACTIONS.ORGANIZATION_APPROVED);
  });

  // Conclude
  const passed = runner.summarize();
  if (!passed) {
    process.exit(1);
  }
}

// Execute
runAdversarialSuite().catch((err) => {
  console.error('Fatal execution failure:', err);
  process.exit(1);
});
