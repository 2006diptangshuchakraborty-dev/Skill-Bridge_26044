/**
 * Skill Bridge Platform - Milestone 2 Verification Suite
 * Tests Multi-Role Auth, Session Management, Redirects & Logout Invalidation
 * Target: tests/test-m2-verification.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n======================================================================');
console.log('  MILESTONE 2: MULTI-ROLE AUTH, SESSION & LOGOUT VERIFICATION SUITE   ');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// 1. Audit middleware.js implementation
// ----------------------------------------------------------------------------
console.log('▶ CATEGORY 1: middleware.js Static & Logical Inspection');

const middlewareContent = fs.readFileSync(path.join(__dirname, '../middleware.js'), 'utf8');

runTest('M2-01: middleware.js does not blind-default missing sb_user_role to STUDENT', () => {
  assert.ok(
    !middlewareContent.includes("(cookieRole || 'STUDENT')"),
    'Must NOT contain (cookieRole || \'STUDENT\') blind default'
  );
  assert.ok(
    middlewareContent.includes('cookieRole ? cookieRole.toUpperCase() : null'),
    'Must resolve missing cookieRole to null'
  );
});

runTest('M2-02: middleware.js allows role-switching requests on public auth routes', () => {
  assert.ok(middlewareContent.includes('roleParam'), 'Must check roleParam');
  assert.ok(middlewareContent.includes('switchParam'), 'Must check switchParam');
  assert.ok(middlewareContent.includes('isCollision'), 'Must check isCollision');
  assert.ok(middlewareContent.includes('hasIntentCookie'), 'Must check hasIntentCookie');
});

runTest('M2-03: middleware.js redirects un-resolved session to /profile/complete', () => {
  assert.ok(
    middlewareContent.includes("NextResponse.redirect(new URL('/profile/complete', request.url))"),
    'Must redirect unresolved session to /profile/complete'
  );
});

// ----------------------------------------------------------------------------
// 2. Audit lib/role-collision.js and app/api/auth/signup-intent/route.js
// ----------------------------------------------------------------------------
console.log('\n▶ CATEGORY 2: Signup Intent & Role Collision Handlers');

const roleCollision = require('../lib/role-collision.js');

runTest('M2-04: lib/role-collision.js exports clearSignupIntentCookie and collision helpers', () => {
  assert.strictEqual(typeof roleCollision.checkRoleCollision, 'function');
  assert.strictEqual(typeof roleCollision.buildCollisionRedirectUrl, 'function');
  assert.strictEqual(typeof roleCollision.buildAuthCollisionUrl, 'function');
  assert.strictEqual(typeof roleCollision.clearSignupIntentCookie, 'function');
});

const signupIntentRouteContent = fs.readFileSync(
  path.join(__dirname, '../app/api/auth/signup-intent/route.js'),
  'utf8'
);

runTest('M2-05: app/api/auth/signup-intent/route.js implements DELETE handler for intent cleanup', () => {
  assert.ok(signupIntentRouteContent.includes('export async function DELETE'), 'Must export DELETE handler');
  assert.ok(signupIntentRouteContent.includes('maxAge: 0'), 'Must set maxAge: 0');
});

// ----------------------------------------------------------------------------
// 3. Audit app/profile/complete/page.jsx
// ----------------------------------------------------------------------------
console.log('\n▶ CATEGORY 3: Dispatcher Cookie Synchronization & Intent Deletion');

const completePageContent = fs.readFileSync(
  path.join(__dirname, '../app/profile/complete/page.jsx'),
  'utf8'
);

runTest('M2-06: complete/page.jsx clears sb_signup_intent on collision', () => {
  assert.ok(
    completePageContent.includes("document.cookie = 'sb_signup_intent=; path=/; max-age=0"),
    'Must delete sb_signup_intent cookie on collision'
  );
});

runTest('M2-07: complete/page.jsx synchronizes companion cookies on role resolution', () => {
  assert.ok(completePageContent.includes('sb_user_role='), 'Must set sb_user_role cookie');
  assert.ok(completePageContent.includes('sb_profile_completed='), 'Must set sb_profile_completed cookie');
  assert.ok(completePageContent.includes('sb_user_status='), 'Must set sb_user_status cookie');
});

// ----------------------------------------------------------------------------
// 4. Audit lib/auth-client.js and components/shared/Navbar.jsx
// ----------------------------------------------------------------------------
console.log('\n▶ CATEGORY 4: Full Logout & Session Invalidation');

const authClientContent = fs.readFileSync(
  path.join(__dirname, '../lib/auth-client.js'),
  'utf8'
);

runTest('M2-08: lib/auth-client.js exports fullLogout with comprehensive cookie invalidation', () => {
  assert.ok(authClientContent.includes('export async function fullLogout'), 'Must export fullLogout');
  assert.ok(authClientContent.includes('sb_signup_intent'), 'Must clear sb_signup_intent');
  assert.ok(authClientContent.includes('sb_user_role'), 'Must clear sb_user_role');
  assert.ok(authClientContent.includes('sb_user_status'), 'Must clear sb_user_status');
  assert.ok(authClientContent.includes('sb_profile_completed'), 'Must clear sb_profile_completed');
  assert.ok(authClientContent.includes('sb_session_token'), 'Must clear sb_session_token');
  assert.ok(authClientContent.includes('better-auth.session_token'), 'Must clear better-auth.session_token');
  assert.ok(authClientContent.includes('localStorage.removeItem'), 'Must clear localStorage');
  assert.ok(authClientContent.includes('sessionStorage.clear'), 'Must clear sessionStorage');
});

const navbarContent = fs.readFileSync(
  path.join(__dirname, '../components/shared/Navbar.jsx'),
  'utf8'
);

runTest('M2-09: Navbar.jsx handleSignOut invokes fullLogout', () => {
  assert.ok(navbarContent.includes('fullLogout'), 'Navbar must import and invoke fullLogout');
});

// ----------------------------------------------------------------------------
// 5. Audit Dashboard Page Role Guards (Defense-in-Depth)
// ----------------------------------------------------------------------------
console.log('\n▶ CATEGORY 5: Dashboard Defense-in-Depth Guards');

const industryDashboardContent = fs.readFileSync(
  path.join(__dirname, '../app/industry/dashboard/page.jsx'),
  'utf8'
);

runTest('M2-10: Industry dashboard enforces client session & role check', () => {
  assert.ok(industryDashboardContent.includes('authClient.getSession()'), 'Must check getSession');
  assert.ok(industryDashboardContent.includes('router.replace("/auth?role=INDUSTRY'), 'Must redirect unauthenticated user');
  assert.ok(industryDashboardContent.includes('loading || !authorized'), 'Must gate render until authorized');
});

const instituteDashboardContent = fs.readFileSync(
  path.join(__dirname, '../app/institute/dashboard/page.jsx'),
  'utf8'
);

runTest('M2-11: Institute dashboard enforces client session & role check', () => {
  assert.ok(instituteDashboardContent.includes('authClient.getSession()'), 'Must check getSession');
  assert.ok(instituteDashboardContent.includes('router.replace("/auth?role=INSTITUTE'), 'Must redirect unauthenticated user');
  assert.ok(instituteDashboardContent.includes('loading || !authorized'), 'Must gate render until authorized');
});

const studentDashboardContent = fs.readFileSync(
  path.join(__dirname, '../app/student/dashboard/page.js'),
  'utf8'
);

runTest('M2-12: Student dashboard enforces client session & role check', () => {
  assert.ok(studentDashboardContent.includes('authClient.getSession()'), 'Must check getSession');
  assert.ok(studentDashboardContent.includes('router.replace("/auth?role=STUDENT'), 'Must redirect unauthenticated user');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('                 M2 VERIFICATION SUITE SUMMARY                        ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Tests Run    : ${passed + failed}`);
console.log(`  Passed Tests       : ${passed}`);
console.log(`  Failed Tests       : ${failed}`);
console.log(`  Pass Rate          : ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('  ALL M2 VERIFICATION TESTS PASSED SUCCESSFULLY! \n');
}
