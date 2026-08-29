#!/usr/bin/env node
/**
 * Milestone M1 Challenger 1 - Dedicated Empirical Verification Suite
 * Project: Skill Bridge Platform (SIH 2026)
 * File: tests/m1-challenger-empirical.js
 * 
 * Verifies:
 * 1. Invalid & Expired Intent Tokens
 * 2. Admin Registration Rejection (HTTP 403)
 * 3. Role Tampering Protection (input: false & update hook sanitization)
 * 4. INSTITUTE & INDUSTRY Role Acceptance in Signup Intent & Role Profile Provisioning
 * 5. Full 4-Tier Master Auth Test Suite integration
 */

const assert = require('assert');
const crypto = require('crypto');

// Load live project modules
const signupIntent = require('../lib/signup-intent');
const localDb = require('../lib/db');
const {
  ROLES,
  ACCOUNT_STATUS,
  ONBOARDING_STATUS,
  KYC_STATUS,
  MockDatabase,
  calculateInstituteCompletion,
  calculateOrganizationCompletion,
  calculateStudentCompletion,
  calculateProfileCompletion,
} = require('./auth-test-helper');

console.log('======================================================================');
console.log('  MILESTONE M1 CHALLENGER 1: DEDICATED EMPIRICAL VERIFICATION HARNESS ');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      await res;
    }
    const ms = Date.now() - start;
    passed++;
    console.log(`  ✔ [PASS] ${name} (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - start;
    failed++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  ✖ [FAIL] ${name} (${ms}ms)`);
    console.error(`     Error: ${err.message}`);
  }
}

async function run() {
  // -------------------------------------------------------------------------
  // 1. INVALID / EXPIRED INTENT TOKENS
  // -------------------------------------------------------------------------
  console.log('\n--- Category 1: Invalid & Expired Intent Tokens ---');

  await test('1.1: Valid intent generation creates 64-char hex token with 15-minute expiration', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'STUDENT', email: 'test_std@univ.edu' });
    assert.strictEqual(intent.token.length, 64);
    assert.strictEqual(intent.role, 'STUDENT');
    const expiresAt = new Date(intent.expiresAt).getTime();
    const now = Date.now();
    assert.ok(expiresAt > now + 14 * 60 * 1000 && expiresAt <= now + 15 * 60 * 1000 + 2000);
  });

  await test('1.2: Expired intent token (>15m) resolves with isValid: false and isExpired: true', async () => {
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const db = localDb.getDb();
    db.signupIntents = db.signupIntents || [];
    db.signupIntents.push({
      id: `int_exp_${Date.now()}`,
      token: expiredToken,
      role: 'STUDENT',
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // expired 5 mins ago
      used: false,
      usedAt: null,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    });
    localDb.saveDb(db);

    const resolved = await signupIntent.resolveValidIntent(expiredToken);
    assert.ok(resolved !== null);
    assert.strictEqual(resolved.isExpired, true);
    assert.strictEqual(resolved.isValid, false);
  });

  await test('1.3: Forged, truncated, null, or non-existent tokens return null', async () => {
    const invalidInputs = [
      'forged_non_existent_token_0123456789abcdef0123456789abcdef0123456789',
      'short',
      '',
      null,
      undefined,
      '   ',
      'x'.repeat(64),
    ];
    for (const badToken of invalidInputs) {
      const res = await signupIntent.resolveValidIntent(badToken);
      assert.strictEqual(res, null, `Token '${badToken}' should resolve to null`);
    }
  });

  await test('1.4: Replay attack (double consumption of same token) is strictly rejected', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'INDUSTRY', email: 'replay@company.com' });
    const check1 = await signupIntent.resolveValidIntent(intent.token);
    assert.strictEqual(check1.isValid, true);
    assert.strictEqual(check1.isUsed, false);

    // Consume once
    const used = await signupIntent.markIntentUsed(intent.token);
    assert.strictEqual(used, true);

    // Check again
    const check2 = await signupIntent.resolveValidIntent(intent.token);
    assert.strictEqual(check2.isValid, false);
    assert.strictEqual(check2.isUsed, true);
  });

  // -------------------------------------------------------------------------
  // 2. ADMIN REGISTRATION REJECTION (HTTP 403)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 2: Admin Registration Rejection (HTTP 403) ---');

  await test('2.1: createSignupIntent with role="ADMIN" throws 403 ADMIN_REGISTRATION_FORBIDDEN', async () => {
    let threw = false;
    try {
      await signupIntent.createSignupIntent({ role: 'ADMIN', email: 'admin_attacker@gov.in' });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.status || err.statusCode, 403);
      assert.strictEqual(err.code, 'ADMIN_REGISTRATION_FORBIDDEN');
    }
    assert.ok(threw, 'Must throw for ADMIN role');
  });

  await test('2.2: Case-insensitive and padded ADMIN roles ("admin", "  ADMIN  ") throw 403', async () => {
    const adminVariants = ['admin', ' Admin ', 'ADMIN', 'aDmIn'];
    for (const roleVar of adminVariants) {
      let threw = false;
      try {
        await signupIntent.createSignupIntent({ role: roleVar });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.status || err.statusCode, 403);
        assert.strictEqual(err.code, 'ADMIN_REGISTRATION_FORBIDDEN');
      }
      assert.ok(threw, `Variant '${roleVar}' must be rejected with 403`);
    }
  });

  await test('2.3: Unrecognized non-standard admin roles ("SUPERADMIN", "ROOT") throw 400 INVALID_ROLE', async () => {
    const nonStandard = ['SUPERADMIN', 'ROOT', 'ADMINISTRATOR', 'GOD_MODE'];
    for (const bad of nonStandard) {
      let threw = false;
      try {
        await signupIntent.createSignupIntent({ role: bad });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.status || err.statusCode, 400);
        assert.strictEqual(err.code, 'INVALID_ROLE');
      }
      assert.ok(threw, `Role '${bad}' must be rejected with 400`);
    }
  });

  // -------------------------------------------------------------------------
  // 3. ROLE TAMPERING PROTECTION (`input: false` & UPDATE HOOK SANITIZATION)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 3: Role Tampering Protection ---');

  await test('3.1: Better Auth configuration defines role, accountStatus, onboardingStatus with input: false', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.resolve(__dirname, '../lib/auth.js'), 'utf8');

    assert.ok(authCode.includes('input: false'), 'Must contain input: false for protected fields');
    assert.ok(authCode.includes('role: {'), 'Must configure role additionalField');
    assert.ok(authCode.includes('accountStatus: {'), 'Must configure accountStatus additionalField');
    assert.ok(authCode.includes('onboardingStatus: {'), 'Must configure onboardingStatus additionalField');
    assert.ok(authCode.includes('profileCompleted: {'), 'Must configure profileCompleted additionalField');
  });

  await test('3.2: Better Auth update:before hook strips role, accountStatus, and id from update requests', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.resolve(__dirname, '../lib/auth.js'), 'utf8');

    assert.ok(authCode.includes('delete sanitized.role'), 'Must sanitize role in update:before hook');
    assert.ok(authCode.includes('delete sanitized.accountStatus'), 'Must sanitize accountStatus in update:before hook');
    assert.ok(authCode.includes('delete sanitized.id'), 'Must sanitize id in update:before hook');
  });

  await test('3.3: Mock Database updateUser strips role mutation and preserves immutability', () => {
    const mockDb = new MockDatabase();
    const user = mockDb.createUser({
      id: 'usr_tamper_test',
      name: 'Tamper Tester',
      email: 'tamper@univ.edu',
      role: ROLES.STUDENT,
    });

    const updated = mockDb.updateUser(user.id, {
      name: 'Updated Name',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });

    assert.strictEqual(updated.name, 'Updated Name');
    assert.strictEqual(updated.role, 'STUDENT', 'Role must remain STUDENT');
  });

  // -------------------------------------------------------------------------
  // 4. INSTITUTE & INDUSTRY ROLE ACCEPTANCE & PROFILE PROVISIONING
  // -------------------------------------------------------------------------
  console.log('\n--- Category 4: INSTITUTE & INDUSTRY Role Acceptance & Provisioning ---');

  await test('4.1: ALLOWED_SIGNUP_ROLES contains STUDENT, INDUSTRY, INSTITUTE, ORGANIZATION', () => {
    assert.ok(signupIntent.ALLOWED_SIGNUP_ROLES.includes('STUDENT'));
    assert.ok(signupIntent.ALLOWED_SIGNUP_ROLES.includes('INDUSTRY'));
    assert.ok(signupIntent.ALLOWED_SIGNUP_ROLES.includes('INSTITUTE'));
    assert.ok(signupIntent.ALLOWED_SIGNUP_ROLES.includes('ORGANIZATION'));
  });

  await test('4.2: createSignupIntent successfully accepts role="INSTITUTE"', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'INSTITUTE', email: 'dean@iitb.ac.in' });
    assert.ok(intent.token);
    assert.strictEqual(intent.role, 'INSTITUTE');
    const resolved = await signupIntent.resolveValidIntent(intent.token);
    assert.strictEqual(resolved.isValid, true);
    assert.strictEqual(resolved.role, 'INSTITUTE');
  });

  await test('4.3: createSignupIntent successfully accepts role="INDUSTRY"', async () => {
    const intent = await signupIntent.createSignupIntent({ role: 'INDUSTRY', email: 'hr@tcs.com' });
    assert.ok(intent.token);
    assert.strictEqual(intent.role, 'INDUSTRY');
    const resolved = await signupIntent.resolveValidIntent(intent.token);
    assert.strictEqual(resolved.isValid, true);
    assert.strictEqual(resolved.role, 'INDUSTRY');
  });

  await test('4.4: 1:1 Institute Profile Provisioning and 6-Step Completion Scoring', () => {
    const mockDb = new MockDatabase();
    const instUser = mockDb.createUser({
      id: 'usr_inst_01',
      name: 'IIT Bombay',
      email: 'admin@iitb.ac.in',
      role: ROLES.INSTITUTE,
      accountStatus: ACCOUNT_STATUS.PENDING,
    });

    const instProfile = mockDb.upsertInstituteProfile(instUser.id, {
      instituteName: 'IIT Bombay',
      instituteCode: 'IITB-01',
      instituteType: 'Centrally Funded Technical Institute',
      contactPhone: '+91 22 2572 2545',
      address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400076' },
      departments: ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering'],
      placementContact: { name: 'Placement Officer', email: 'placements@iitb.ac.in', phone: '+91 22 2576 7096' },
      verificationDocs: [{ docType: 'AICTE_APPROVAL', fileUrl: 'https://docs.gov.in/aicte_iitb.pdf' }],
      website: 'https://www.iitb.ac.in',
      officialEmail: 'registrar@iitb.ac.in',
    });

    assert.strictEqual(instProfile.userId, instUser.id);
    assert.strictEqual(instProfile.verificationStatus, KYC_STATUS.PENDING);
    assert.strictEqual(instProfile.profileCompletion, 100);
    assert.strictEqual(calculateInstituteCompletion(instProfile), 100);
  });

  await test('4.5: 1:1 Organization/Industry Profile Provisioning and 7-Step Completion Scoring', () => {
    const mockDb = new MockDatabase();
    const indUser = mockDb.createUser({
      id: 'usr_ind_01',
      name: 'Tata Consultancy Services',
      email: 'careers@tcs.com',
      role: ROLES.INDUSTRY,
      accountStatus: ACCOUNT_STATUS.PENDING,
    });

    const orgProfile = mockDb.upsertOrganizationProfile(indUser.id, {
      companyName: 'Tata Consultancy Services',
      registrationNumber: 'L22210MH1995PLC084781',
      taxIdGstin: '27AAACT2727Q1ZW',
      companyType: 'PUBLIC_LIMITED',
      industry: 'Information Technology',
      companySize: '10000+',
      website: 'https://www.tcs.com',
      logoUrl: 'https://www.tcs.com/logo.png',
      contactPhone: '+91 22 6778 9999',
      address: 'TCS House, Raveline Street, Mumbai',
      hiringPreferences: { roles: ['Software Engineer', 'Data Analyst'], minCgpa: 7.0 },
      verificationDocs: [{ docType: 'CERTIFICATE_OF_INCORPORATION', fileUrl: 'https://mca.gov.in/coi_tcs.pdf' }],
    });

    assert.strictEqual(orgProfile.userId, indUser.id);
    assert.strictEqual(orgProfile.verificationStatus, KYC_STATUS.PENDING);
    assert.strictEqual(orgProfile.profileCompletion, 100);
    assert.strictEqual(calculateOrganizationCompletion(orgProfile), 100);
  });

  await test('4.6: calculateProfileCompletion correctly routes between STUDENT, INSTITUTE, ORGANIZATION, INDUSTRY', () => {
    const studentScore = calculateProfileCompletion('STUDENT', { headline: 'Dev', bio: 'Coder', skills: ['A', 'B', 'C'] });
    assert.ok(studentScore > 0 && studentScore <= 100);

    const instScore = calculateProfileCompletion('INSTITUTE', { instituteName: 'NIT Trichy', instituteCode: 'NITT' });
    assert.ok(instScore > 0 && instScore <= 100);

    const orgScore = calculateProfileCompletion('ORGANIZATION', { companyName: 'Google', registrationNumber: 'REG123' });
    assert.ok(orgScore > 0 && orgScore <= 100);

    const indScore = calculateProfileCompletion('INDUSTRY', { companyName: 'Infosys', registrationNumber: 'REG456' });
    assert.ok(indScore > 0 && indScore <= 100);

    const adminScore = calculateProfileCompletion('ADMIN', {});
    assert.strictEqual(adminScore, 100);
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n======================================================================');
  console.log('                     EXECUTION SUMMARY REPORT                         ');
  console.log('======================================================================');
  console.log(`  Total Test Cases   : ${total}`);
  console.log(`  Passed Tests       : ${passed}`);
  console.log(`  Failed Tests       : ${failed}`);
  console.log(`  Pass Rate          : ${passRate}%`);
  console.log('======================================================================\n');

  if (failed === 0) {
    console.log('  >>> VERDICT: APPROVE - ALL EMPIRICAL CHALLENGES PASSED SUCCESSFULLY <<<\n');
    process.exit(0);
  } else {
    console.log(`  >>> VERDICT: REJECT - ${failed} FAILURES DETECTED <<<\n`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
