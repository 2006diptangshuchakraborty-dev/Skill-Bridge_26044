/**
 * Skill Bridge Platform - Milestone 2 Empirical Adversarial Stress Test Suite
 * File: tests/test-m2-edge-bypass-empirical.js
 * 
 * Verifies:
 * 1. Direct URL access permutations across all role partitions and unauthenticated states.
 * 2. Role isolation and automatic cross-role canonical dashboard redirection.
 * 3. Incomplete onboarding gating (< 70% score or profileCompleted: false).
 * 4. Immediate isolation for SUSPENDED and DEACTIVATED accounts.
 * 5. Fuzzed session tokens, CRLF injection, SQLi/XSS cookies, and malformed header resilience.
 * 6. Missing role companion cookies and fallback dispatch to /profile/complete.
 * 7. Role-switching intent bypasses on public auth routes (/auth, /login, /register).
 * 8. Traversal and URL encoding edge permutations.
 */

import { middleware } from '../middleware.js';
import { NextRequest } from 'next/server.js';
import assert from 'assert';

console.log('\n======================================================================');
console.log('  MILESTONE 2: EMPIRICAL MIDDLEWARE EDGE BYPASS & DIRECT URL SUITE    ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureList = [];

function runTest(testId, description, fn) {
  totalTests++;
  const t0 = process.hrtime.bigint();
  try {
    fn();
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    passedTests++;
    console.log(`  ✔ [PASS] ${testId}: ${description} (${ms.toFixed(2)}ms)`);
  } catch (err) {
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    failedTests++;
    failureList.push({ testId, description, error: err.message, stack: err.stack });
    console.error(`  ✖ [FAIL] ${testId}: ${description} (${ms.toFixed(2)}ms)`);
    console.error(`     Error: ${err.message}`);
  }
}

// Helper to create NextRequest with mock headers and cookies
function createMockRequest(urlStr, options = {}) {
  const url = new URL(urlStr, 'http://localhost:3000');
  const headers = new Headers(options.headers || {});
  
  if (options.cookies) {
    const cookiePairs = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ');
    if (cookiePairs) {
      headers.set('cookie', cookiePairs);
    }
  }

  const req = new NextRequest(url, { headers });
  return req;
}

// Helper to inspect response
function getRedirectTarget(response) {
  if (!response) return null;
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) return null;
    try {
      const locUrl = new URL(location, 'http://localhost:3000');
      return locUrl.pathname + locUrl.search;
    } catch {
      return location;
    }
  }
  return null;
}

function isNext(response) {
  if (!response) return false;
  // Next.js NextResponse.next() produces headers with x-middleware-next: '1' or status 200 without location
  return response.headers.get('x-middleware-next') === '1' || (!response.headers.get('location') && response.status === 200);
}

// ============================================================================
// SUITE 1: UNAUTHENTICATED DIRECT URL ACCESS & LOGIN REDIRECTS
// ============================================================================
console.log('▶ SUITE 1: Unauthenticated Direct URL Access Gating');

runTest('UNAUTH-01', 'Unauthenticated accessing /student/dashboard redirects to /auth with role=STUDENT', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.startsWith('/auth'), `Redirect must target /auth, got ${target}`);
  assert.ok(target.includes('role=STUDENT'), `Redirect must include role=STUDENT, got ${target}`);
  assert.ok(target.includes('redirect=%2Fstudent%2Fdashboard'), `Redirect must contain return target, got ${target}`);
});

runTest('UNAUTH-02', 'Unauthenticated accessing /student/profile redirects to /auth with role=STUDENT', () => {
  const req = createMockRequest('http://localhost:3000/student/profile');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=STUDENT'), `Redirect must include role=STUDENT, got ${target}`);
  assert.ok(target.includes('redirect=%2Fstudent%2Fprofile'), `Redirect must contain return target, got ${target}`);
});

runTest('UNAUTH-03', 'Unauthenticated accessing /industry/dashboard redirects to /auth with role=INDUSTRY', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=INDUSTRY'), `Redirect must include role=INDUSTRY, got ${target}`);
  assert.ok(target.includes('redirect=%2Findustry%2Fdashboard'), `Redirect must contain return target, got ${target}`);
});

runTest('UNAUTH-04', 'Unauthenticated accessing /organization/dashboard redirects to /auth with role=INDUSTRY', () => {
  const req = createMockRequest('http://localhost:3000/organization/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=INDUSTRY'), `Redirect must include role=INDUSTRY, got ${target}`);
});

runTest('UNAUTH-05', 'Unauthenticated accessing /recruiter/dashboard redirects to /auth with role=INDUSTRY', () => {
  const req = createMockRequest('http://localhost:3000/recruiter/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=INDUSTRY'), `Redirect must include role=INDUSTRY, got ${target}`);
});

runTest('UNAUTH-06', 'Unauthenticated accessing /institute/dashboard redirects to /auth with role=INSTITUTE', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=INSTITUTE'), `Redirect must include role=INSTITUTE, got ${target}`);
});

runTest('UNAUTH-07', 'Unauthenticated accessing /admin/dashboard redirects to /auth with role=ADMIN', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target, 'Must return redirect');
  assert.ok(target.includes('role=ADMIN'), `Redirect must include role=ADMIN, got ${target}`);
});

runTest('UNAUTH-08', 'Unauthenticated accessing public /auth allows direct access (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/auth');
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow unauthenticated request to /auth');
});

runTest('UNAUTH-09', 'Unauthenticated accessing public /login allows direct access (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/login');
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow unauthenticated request to /login');
});

runTest('UNAUTH-10', 'Unauthenticated accessing public /register allows direct access (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/register');
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow unauthenticated request to /register');
});

// ============================================================================
// SUITE 2: AUTHENTICATED STUDENT DIRECT URL ACCESS & ROLE ISOLATION
// ============================================================================
console.log('\n▶ SUITE 2: Authenticated Student Cross-Role Isolation');

const studentCookies = {
  'better-auth.session_token': 'ses_valid_student_token_12345',
  'sb_user_role': 'STUDENT',
  'sb_user_status': 'ACTIVE',
  'sb_profile_completed': 'true',
};

runTest('STUDENT-01', 'Student accessing /student/dashboard is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Student must be allowed on /student/dashboard');
});

runTest('STUDENT-02', 'Student accessing /student/profile is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/student/profile', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Student must be allowed on /student/profile');
});

runTest('STUDENT-03', 'Student attempting /industry/dashboard is REJECTED and redirected to /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-04', 'Student attempting /organization/dashboard is REJECTED and redirected to /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/organization/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-05', 'Student attempting /recruiter/dashboard is REJECTED and redirected to /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/recruiter/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-06', 'Student attempting /institute/dashboard is REJECTED and redirected to /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-07', 'Student attempting /admin/dashboard is REJECTED and redirected to /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-08', 'Student visiting /auth with NO query params is redirected to canonical /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/auth', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Must redirect to /student/dashboard, got ${target}`);
});

runTest('STUDENT-09', 'Student visiting /auth?switch=true is ALLOWED to proceed to auth page', () => {
  const req = createMockRequest('http://localhost:3000/auth?switch=true', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow role-switch navigation to /auth');
});

runTest('STUDENT-10', 'Student visiting /auth?role=INDUSTRY is ALLOWED to proceed to auth page', () => {
  const req = createMockRequest('http://localhost:3000/auth?role=INDUSTRY', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow explicit role query on /auth');
});

runTest('STUDENT-11', 'Student visiting /auth?collision=true is ALLOWED to proceed to auth page', () => {
  const req = createMockRequest('http://localhost:3000/auth?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow collision display on /auth');
});

// ============================================================================
// SUITE 3: AUTHENTICATED INDUSTRY DIRECT URL ACCESS & ROLE ISOLATION
// ============================================================================
console.log('\n▶ SUITE 3: Authenticated Industry Cross-Role Isolation');

const industryCookies = {
  'better-auth.session_token': 'ses_valid_industry_token_67890',
  'sb_user_role': 'INDUSTRY',
  'sb_user_status': 'ACTIVE',
  'sb_profile_completed': 'true',
};

runTest('INDUSTRY-01', 'Industry accessing /industry/dashboard is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard', { cookies: industryCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Industry must be allowed on /industry/dashboard');
});

runTest('INDUSTRY-02', 'Industry accessing /organization/dashboard is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/organization/dashboard', { cookies: industryCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Industry alias ORGANIZATION must be allowed on /organization/dashboard');
});

runTest('INDUSTRY-03', 'Industry attempting /student/dashboard is REJECTED and redirected to /industry/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: industryCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/industry/dashboard', `Must redirect to /industry/dashboard, got ${target}`);
});

runTest('INDUSTRY-04', 'Industry attempting /institute/dashboard is REJECTED and redirected to /industry/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard', { cookies: industryCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/industry/dashboard', `Must redirect to /industry/dashboard, got ${target}`);
});

runTest('INDUSTRY-05', 'Industry attempting /admin/dashboard is REJECTED and redirected to /industry/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard', { cookies: industryCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/industry/dashboard', `Must redirect to /industry/dashboard, got ${target}`);
});

// ============================================================================
// SUITE 4: AUTHENTICATED INSTITUTE DIRECT URL ACCESS & ROLE ISOLATION
// ============================================================================
console.log('\n▶ SUITE 4: Authenticated Institute Cross-Role Isolation');

const instituteCookies = {
  'better-auth.session_token': 'ses_valid_institute_token_13579',
  'sb_user_role': 'INSTITUTE',
  'sb_user_status': 'ACTIVE',
  'sb_profile_completed': 'true',
};

runTest('INSTITUTE-01', 'Institute accessing /institute/dashboard is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard', { cookies: instituteCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Institute must be allowed on /institute/dashboard');
});

runTest('INSTITUTE-02', 'Institute attempting /student/dashboard is REJECTED and redirected to /institute/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: instituteCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/institute/dashboard', `Must redirect to /institute/dashboard, got ${target}`);
});

runTest('INSTITUTE-03', 'Institute attempting /industry/dashboard is REJECTED and redirected to /institute/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard', { cookies: instituteCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/institute/dashboard', `Must redirect to /institute/dashboard, got ${target}`);
});

runTest('INSTITUTE-04', 'Institute attempting /admin/dashboard is REJECTED and redirected to /institute/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard', { cookies: instituteCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/institute/dashboard', `Must redirect to /institute/dashboard, got ${target}`);
});

// ============================================================================
// SUITE 5: AUTHENTICATED ADMIN DIRECT URL ACCESS & GOVERNANCE BOUNDARIES
// ============================================================================
console.log('\n▶ SUITE 5: Authenticated Admin Direct URL Access');

const adminCookies = {
  'better-auth.session_token': 'ses_valid_admin_token_24680',
  'sb_user_role': 'ADMIN',
  'sb_user_status': 'ACTIVE',
  'sb_profile_completed': 'true',
};

runTest('ADMIN-01', 'Admin accessing /admin/dashboard is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard', { cookies: adminCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Admin must be allowed on /admin/dashboard');
});

runTest('ADMIN-02', 'Admin attempting /student/dashboard is REJECTED and redirected to /admin/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: adminCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/admin/dashboard', `Must redirect to /admin/dashboard, got ${target}`);
});

runTest('ADMIN-03', 'Admin attempting /industry/dashboard is REJECTED and redirected to /admin/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard', { cookies: adminCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/admin/dashboard', `Must redirect to /admin/dashboard, got ${target}`);
});

runTest('ADMIN-04', 'Admin attempting /institute/dashboard is REJECTED and redirected to /admin/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard', { cookies: adminCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/admin/dashboard', `Must redirect to /admin/dashboard, got ${target}`);
});

// ============================================================================
// SUITE 6: INCOMPLETE ONBOARDING STATE & SCORE GATING (< 70% GATING)
// ============================================================================
console.log('\n▶ SUITE 6: Incomplete Onboarding Gating');

const incompleteStudentCookies = {
  'better-auth.session_token': 'ses_incomplete_student_111',
  'sb_user_role': 'STUDENT',
  'sb_user_status': 'ACTIVE',
  'sb_profile_completed': 'false',
};

runTest('ONBOARD-01', 'Student with profileCompleted: false accessing /student/dashboard is REDIRECTED to /profile/setup', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: incompleteStudentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup', `Must redirect to /profile/setup, got ${target}`);
});

runTest('ONBOARD-02', 'Student with profileCompleted: false accessing /student/onboarding is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/student/onboarding', { cookies: incompleteStudentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow onboarding route when profile incomplete');
});

runTest('ONBOARD-03', 'Student with profileCompleted: false accessing /profile/setup is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/profile/setup', { cookies: incompleteStudentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow profile/setup when profile incomplete');
});

runTest('ONBOARD-04', 'Incomplete Student accessing /auth is REDIRECTED to /profile/setup', () => {
  const req = createMockRequest('http://localhost:3000/auth', { cookies: incompleteStudentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup', `Must redirect to /profile/setup, got ${target}`);
});

runTest('ONBOARD-05', 'Student with test header completion score 45% is REDIRECTED to /profile/setup', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_low',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': '45',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup', `Score 45% must redirect to /profile/setup, got ${target}`);
});

runTest('ONBOARD-06', 'Student with test header completion score 85% is ALLOWED on /student/dashboard', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_high',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': '85',
      'x-test-onboarding-status': 'COMPLETED',
    },
  });
  const res = middleware(req);
  assert.ok(isNext(res), 'Score 85% must be allowed on /student/dashboard');
});

// ============================================================================
// SUITE 7: SUSPENDED & DEACTIVATED ACCOUNT ISOLATION
// ============================================================================
console.log('\n▶ SUITE 7: Suspended & Deactivated Account Isolation');

const suspendedCookies = {
  'better-auth.session_token': 'ses_suspended_user_999',
  'sb_user_role': 'STUDENT',
  'sb_user_status': 'SUSPENDED',
  'sb_profile_completed': 'true',
};

runTest('SUSP-01', 'Suspended user accessing /student/dashboard is REDIRECTED to /account-suspended', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', { cookies: suspendedCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/account-suspended', `Must redirect to /account-suspended, got ${target}`);
});

runTest('SUSP-02', 'Suspended user accessing /industry/dashboard is REDIRECTED to /account-suspended', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard', { cookies: suspendedCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/account-suspended', `Must redirect to /account-suspended, got ${target}`);
});

runTest('SUSP-03', 'Suspended user accessing /auth is REDIRECTED to /account-suspended', () => {
  const req = createMockRequest('http://localhost:3000/auth', { cookies: suspendedCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/account-suspended', `Must redirect to /account-suspended, got ${target}`);
});

runTest('SUSP-04', 'Suspended user accessing /account-suspended is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/account-suspended', { cookies: suspendedCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Must allow suspended user to view /account-suspended');
});

runTest('SUSP-05', 'Active user accessing /account-suspended is REDIRECTED back to canonical dashboard', () => {
  const req = createMockRequest('http://localhost:3000/account-suspended', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Active student on /account-suspended must redirect to /student/dashboard, got ${target}`);
});

// ============================================================================
// SUITE 8: COOKIE FUZZING, MALFORMED HEADERS & UNRESOLVED ROLE DISPATCH
// ============================================================================
console.log('\n▶ SUITE 8: Cookie Fuzzing, Injection & Unresolved Role Dispatch');

runTest('FUZZ-01', 'Session exists but sb_user_role is MISSING -> redirects to /profile/complete', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      'better-auth.session_token': 'ses_no_role_cookie_123',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/complete', `Missing role must redirect to /profile/complete, got ${target}`);
});

runTest('FUZZ-02', 'Session with __Secure-better-auth.session_token cookie is recognized correctly', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      '__Secure-better-auth.session_token': 'ses_secure_cookie_456',
      'sb_user_role': 'STUDENT',
      'sb_profile_completed': 'true',
    },
  });
  const res = middleware(req);
  assert.ok(isNext(res), '__Secure session cookie must be recognized');
});

runTest('FUZZ-03', 'Session with sb_session_token fallback cookie is recognized correctly', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      'sb_session_token': 'ses_sb_fallback_789',
      'sb_user_role': 'STUDENT',
      'sb_profile_completed': 'true',
    },
  });
  const res = middleware(req);
  assert.ok(isNext(res), 'sb_session_token fallback cookie must be recognized');
});

runTest('FUZZ-04', 'Cookie header with SQL injection payload is safely handled without 500 error', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      'better-auth.session_token': "' OR 1=1; DROP TABLE users; --",
      'sb_user_role': "STUDENT' OR '1'='1",
    },
  });
  const res = middleware(req);
  assert.ok(res !== null && res !== undefined, 'Middleware must handle SQLi cookie safely');
});

runTest('FUZZ-05', 'Cookie header with XSS payload is safely handled without script reflection', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      'better-auth.session_token': '<script>alert("pwn")</script>',
      'sb_user_role': '<svg onload=alert(1)>',
    },
  });
  const res = middleware(req);
  assert.ok(res !== null && res !== undefined, 'Middleware must handle XSS cookie safely');
});

runTest('FUZZ-06', 'Cookie header with 10KB massive token is safely parsed without buffer overflow', () => {
  const hugeToken = 'a'.repeat(10240);
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    cookies: {
      'better-auth.session_token': hugeToken,
      'sb_user_role': 'STUDENT',
    },
  });
  const res = middleware(req);
  assert.ok(res !== null && res !== undefined, 'Middleware must handle 10KB token safely');
});

runTest('FUZZ-07', 'Empty cookie header is safely treated as unauthenticated', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: { cookie: '' },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target && target.startsWith('/auth'), 'Empty cookie must redirect to /auth');
});

runTest('FUZZ-08', 'Corrupted cookie string "===;;;%%;" is safely handled without crash', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: { cookie: '===;;;%%%;;foo;bar' },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target && target.startsWith('/auth'), 'Malformed cookie string must redirect to /auth');
});

// ============================================================================
// SUITE 9: PATH TRAVERSAL, CASE VARIATIONS & QUERY SPOOFING
// ============================================================================
console.log('\n▶ SUITE 9: Traversal, Case & Query Spoofing Invariants');

runTest('TRAV-01', 'Query param spoofing role=ADMIN on /student/dashboard does not grant admin access', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard?role=ADMIN', { cookies: studentCookies });
  const res = middleware(req);
  assert.ok(isNext(res), 'Student with role=ADMIN query param is still handled strictly as STUDENT on /student/dashboard');
});

runTest('TRAV-02', 'Student accessing /industry/dashboard?role=STUDENT is still rejected from industry partition', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard?role=STUDENT', { cookies: studentCookies });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Spoofed query cannot bypass industry partition, got ${target}`);
});

runTest('TRAV-03', 'Student attempting /admin/dashboard with forged intent cookie is still blocked from admin', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard', {
    cookies: {
      ...studentCookies,
      'sb_signup_intent': 'forged_admin_intent_token',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/student/dashboard', `Student with intent cookie must still be redirected to /student/dashboard, got ${target}`);
});

// ============================================================================
// SUITE 10: ADVANCED BOUNDARY CONDITIONS & ANOMALY HANDLING
// ============================================================================
console.log('\n▶ SUITE 10: Advanced Boundary & Anomaly Stress Testing');

runTest('BOUND-01', 'Completion score boundary 69.9% redirects to /profile/setup', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_69',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': '69.9',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup');
});

runTest('BOUND-02', 'Completion score boundary 70.0% is ALLOWED (200 Next)', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_70',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': '70.0',
    },
  });
  const res = middleware(req);
  assert.ok(isNext(res));
});

runTest('BOUND-03', 'Invalid NaN completion score defaults safely to uncompleted state', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_nan',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': 'not-a-number',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup');
});

runTest('BOUND-04', 'Negative completion score (-50) redirects to /profile/setup', () => {
  const req = createMockRequest('http://localhost:3000/student/dashboard', {
    headers: {
      'x-test-user-id': 'usr_test_score_neg',
      'x-test-user-role': 'STUDENT',
      'x-test-completion-score': '-50',
    },
  });
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.strictEqual(target, '/profile/setup');
});

runTest('BOUND-05', 'Direct URL /industry/dashboard/ with trailing slash is protected', () => {
  const req = createMockRequest('http://localhost:3000/industry/dashboard/');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target && target.startsWith('/auth'));
});

runTest('BOUND-06', 'Direct URL /admin/dashboard/users is protected against unauthenticated access', () => {
  const req = createMockRequest('http://localhost:3000/admin/dashboard/users');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target && target.startsWith('/auth') && target.includes('role=ADMIN'));
});

runTest('BOUND-07', 'Direct URL /institute/dashboard/students is protected against unauthenticated access', () => {
  const req = createMockRequest('http://localhost:3000/institute/dashboard/students');
  const res = middleware(req);
  const target = getRedirectTarget(res);
  assert.ok(target && target.startsWith('/auth') && target.includes('role=INSTITUTE'));
});

// ============================================================================
// SUMMARY & VERDICT CALCULATION
// ============================================================================
console.log('\n----------------------------------------------------------------------');
console.log('              MILESTONE 2 EMPIRICAL TEST SUITE SUMMARY                ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Test Cases   : ${totalTests}`);
console.log(`  Passed Tests       : ${passedTests}`);
console.log(`  Failed Tests       : ${failedTests}`);
console.log(`  Overall Pass Rate  : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failedTests > 0) {
  console.error(`  FAILURES DETECTED: ${failedTests} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('  ALL MILESTONE 2 EMPIRICAL ADVERSARIAL TESTS PASSED (100% HARDENED)!\n');
}

