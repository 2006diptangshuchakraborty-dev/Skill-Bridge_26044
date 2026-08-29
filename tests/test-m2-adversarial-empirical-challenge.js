/**
 * Skill Bridge Platform - Milestone 2 Empirical Adversarial Challenger Suite
 * File: tests/test-m2-adversarial-empirical-challenge.js
 * 
 * Adversarial Verification Areas:
 * 1. Role Switching Matrix & Route Partitioning across Student, Industry, Institute, Admin
 * 2. Stale Cookie Invalidation, Spoofing Resistance & Session Disconnects
 * 3. Pre-OAuth Intent Handshake, Single-Use Enforcement & Replay Protection
 * 4. Cross-Role Collision Engine, Alias Handling & Redirect URL Builders
 * 5. Full Logout Cascade (Cookies, Storage, Intent Invalidation)
 * 6. Client Dashboard Defense-in-Depth Guards & Content Shielding
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Target modules
const roleCollision = require('../lib/role-collision');
const signupIntent = require('../lib/signup-intent');
const localDb = require('../lib/db');

console.log('\n================================================================================');
console.log('  MILESTONE 2: EMPIRICAL ADVERSARIAL CHALLENGER STRESS SUITE (HARNESS & ORACLE) ');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureLog = [];

async function challenge(id, title, fn) {
  totalTests++;
  const t0 = process.hrtime.bigint();
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      await res;
    }
    const t1 = process.hrtime.bigint();
    const ms = (Number(t1 - t0) / 1e6).toFixed(2);
    console.log(`  ✔ [PASS] ${id}: ${title} (${ms}ms)`);
    passedTests++;
  } catch (err) {
    const t1 = process.hrtime.bigint();
    const ms = (Number(t1 - t0) / 1e6).toFixed(2);
    console.error(`  ✖ [FAIL] ${id}: ${title} (${ms}ms)`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(`     Stack: ${err.stack.split('\n')[1]}`);
    failureLog.push({ id, title, error: err.message });
    failedTests++;
  }
}

// ---------------------------------------------------------------------------
// Synthetic NextRequest & NextResponse Simulation Engine for Edge Middleware
// ---------------------------------------------------------------------------
class MockNextUrl {
  constructor(urlString) {
    const parsed = new URL(urlString, 'http://localhost:3000');
    this.pathname = parsed.pathname;
    this.search = parsed.search;
    this.searchParams = parsed.searchParams;
    this.href = parsed.href;
    this.origin = parsed.origin;
  }
}

class MockNextRequest {
  constructor(url, { cookies = {}, headers = {} } = {}) {
    this.url = url.startsWith('http') ? url : `http://localhost:3000${url}`;
    this.nextUrl = new MockNextUrl(this.url);
    this._cookies = new Map(Object.entries(cookies));
    this._headers = new Map(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])
    );

    this.cookies = {
      get: (name) => {
        const val = this._cookies.get(name);
        return val !== undefined ? { name, value: val } : undefined;
      },
      has: (name) => this._cookies.has(name),
      getAll: () => Array.from(this._cookies.entries()).map(([name, value]) => ({ name, value })),
    };

    this.headers = {
      get: (name) => this._headers.get(name.toLowerCase()) || null,
      has: (name) => this._headers.has(name.toLowerCase()),
    };
  }
}

// Load middleware
let middlewareFn = null;
try {
  const mw = require('../middleware.js');
  middlewareFn = mw.middleware || mw.default || mw;
} catch (e) {
  // If ES module, use fallback loader or simulate logic
}

// ============================================================================
// SUITE 1: ADVERSARIAL ROLE SWITCHING & ROUTE PARTITION MATRIX
// ============================================================================
async function runSuite1() {
  console.log('▶ SUITE 1: Adversarial Role Switching & Route Partition Matrix');

  const testMatrix = [
    // [Role, Target Path, Expected Redirect / Action, Scenario Description]
    // 1. Student Access Tests
    { role: 'STUDENT', path: '/student/dashboard', expectRedirect: null, desc: 'Student accessing /student/dashboard is allowed' },
    { role: 'STUDENT', path: '/industry/dashboard', expectRedirect: '/student/dashboard', desc: 'Student accessing /industry/dashboard is bounced to /student/dashboard' },
    { role: 'STUDENT', path: '/organization/dashboard', expectRedirect: '/student/dashboard', desc: 'Student accessing /organization/dashboard is bounced to /student/dashboard' },
    { role: 'STUDENT', path: '/recruiter/dashboard', expectRedirect: '/student/dashboard', desc: 'Student accessing /recruiter/dashboard is bounced to /student/dashboard' },
    { role: 'STUDENT', path: '/institute/dashboard', expectRedirect: '/student/dashboard', desc: 'Student accessing /institute/dashboard is bounced to /student/dashboard' },
    { role: 'STUDENT', path: '/admin/dashboard', expectRedirect: '/student/dashboard', desc: 'Student accessing /admin/dashboard is bounced to /student/dashboard' },

    // 2. Industry Access Tests
    { role: 'INDUSTRY', path: '/industry/dashboard', expectRedirect: null, desc: 'Industry accessing /industry/dashboard is allowed' },
    { role: 'INDUSTRY', path: '/organization/dashboard', expectRedirect: null, desc: 'Industry accessing /organization/dashboard is allowed' },
    { role: 'INDUSTRY', path: '/recruiter/dashboard', expectRedirect: null, desc: 'Industry accessing /recruiter/dashboard is allowed' },
    { role: 'INDUSTRY', path: '/student/dashboard', expectRedirect: '/industry/dashboard', desc: 'Industry accessing /student/dashboard is bounced to /industry/dashboard' },
    { role: 'INDUSTRY', path: '/institute/dashboard', expectRedirect: '/industry/dashboard', desc: 'Industry accessing /institute/dashboard is bounced to /industry/dashboard' },
    { role: 'INDUSTRY', path: '/admin/dashboard', expectRedirect: '/industry/dashboard', desc: 'Industry accessing /admin/dashboard is bounced to /industry/dashboard' },

    // 3. Institute Access Tests
    { role: 'INSTITUTE', path: '/institute/dashboard', expectRedirect: null, desc: 'Institute accessing /institute/dashboard is allowed' },
    { role: 'INSTITUTE', path: '/student/dashboard', expectRedirect: '/institute/dashboard', desc: 'Institute accessing /student/dashboard is bounced to /institute/dashboard' },
    { role: 'INSTITUTE', path: '/industry/dashboard', expectRedirect: '/institute/dashboard', desc: 'Institute accessing /industry/dashboard is bounced to /institute/dashboard' },
    { role: 'INSTITUTE', path: '/organization/dashboard', expectRedirect: '/institute/dashboard', desc: 'Institute accessing /organization/dashboard is bounced to /institute/dashboard' },
    { role: 'INSTITUTE', path: '/admin/dashboard', expectRedirect: '/institute/dashboard', desc: 'Institute accessing /admin/dashboard is bounced to /institute/dashboard' },

    // 4. Admin Access Tests
    { role: 'ADMIN', path: '/admin/dashboard', expectRedirect: null, desc: 'Admin accessing /admin/dashboard is allowed' },
    { role: 'ADMIN', path: '/student/dashboard', expectRedirect: '/admin/dashboard', desc: 'Admin accessing /student/dashboard is bounced to /admin/dashboard' },
    { role: 'ADMIN', path: '/industry/dashboard', expectRedirect: '/admin/dashboard', desc: 'Admin accessing /industry/dashboard is bounced to /admin/dashboard' },
    { role: 'ADMIN', path: '/institute/dashboard', expectRedirect: '/admin/dashboard', desc: 'Admin accessing /institute/dashboard is bounced to /admin/dashboard' },
  ];

  let matrixIndex = 1;
  for (const item of testMatrix) {
    await challenge(
      `ADV-M2-01.${matrixIndex.toString().padStart(2, '0')}`,
      item.desc,
      () => {
        const req = new MockNextRequest(item.path, {
          cookies: {
            'better-auth.session_token': 'test_valid_session_token_123',
            'sb_user_role': item.role,
            'sb_profile_completed': 'true',
            'sb_user_status': 'ACTIVE',
          },
        });

        const res = middlewareFn(req);
        if (item.expectRedirect === null) {
          // Allowed access (NextResponse.next())
          assert.ok(
            !res?.headers?.get('location'),
            `Expected direct access, but received redirect to: ${res?.headers?.get('location')}`
          );
        } else {
          // Expect redirection
          assert.ok(res?.headers?.get('location'), `Expected redirect to ${item.expectRedirect}, but got no redirect`);
          const location = res.headers.get('location');
          assert.ok(
            location.includes(item.expectRedirect),
            `Expected redirect to include ${item.expectRedirect}, got ${location}`
          );
        }
      }
    );
    matrixIndex++;
  }

  // Role Switching Query Param Tests on /auth, /login, /register
  const roleSwitchTests = [
    { url: '/auth?role=industry', desc: 'Logged-in user initiating role switch via ?role=industry is NOT intercepted' },
    { url: '/auth?role=institute', desc: 'Logged-in user initiating role switch via ?role=institute is NOT intercepted' },
    { url: '/login?switch=true', desc: 'Logged-in user initiating role switch via ?switch=true is NOT intercepted' },
    { url: '/register?intent=int_12345', desc: 'Logged-in user with signup intent token is NOT intercepted' },
    { url: '/auth?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY', desc: 'User viewing collision warning on /auth is NOT intercepted' },
    { url: '/auth', withIntentCookie: true, desc: 'User with sb_signup_intent cookie visiting /auth is NOT intercepted' },
  ];

  let switchIndex = 1;
  for (const item of roleSwitchTests) {
    await challenge(
      `ADV-M2-02.${switchIndex.toString().padStart(2, '0')}`,
      item.desc,
      () => {
        const cookies = {
          'better-auth.session_token': 'test_session_active',
          'sb_user_role': 'STUDENT',
          'sb_profile_completed': 'true',
          'sb_user_status': 'ACTIVE',
        };
        if (item.withIntentCookie) {
          cookies['sb_signup_intent'] = 'tok_intent_cookie_test';
        }

        const req = new MockNextRequest(item.url, { cookies });
        const res = middlewareFn(req);

        assert.ok(
          !res?.headers?.get('location'),
          `Role-switching request on ${item.url} should proceed to auth page, but was redirected to: ${res?.headers?.get('location')}`
        );
      }
    );
    switchIndex++;
  }

  // Pure visiting /auth without switch params while authenticated MUST redirect to canonical dashboard
  await challenge(
    'ADV-M2-02.07',
    'Authenticated student visiting bare /auth without role/switch params is redirected to /student/dashboard',
    () => {
      const req = new MockNextRequest('/auth', {
        cookies: {
          'better-auth.session_token': 'test_session_active',
          'sb_user_role': 'STUDENT',
          'sb_profile_completed': 'true',
          'sb_user_status': 'ACTIVE',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect authenticated user');
      assert.ok(res.headers.get('location').includes('/student/dashboard'));
    }
  );

  await challenge(
    'ADV-M2-02.08',
    'Authenticated industry user visiting bare /login without role/switch params is redirected to /industry/dashboard',
    () => {
      const req = new MockNextRequest('/login', {
        cookies: {
          'better-auth.session_token': 'test_session_active',
          'sb_user_role': 'INDUSTRY',
          'sb_profile_completed': 'true',
          'sb_user_status': 'ACTIVE',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect authenticated user');
      assert.ok(res.headers.get('location').includes('/industry/dashboard'));
    }
  );
}

// ============================================================================
// SUITE 2: STALE COOKIE INVALIDATION, SPOOFING & UNRESOLVED SESSIONS
// ============================================================================
async function runSuite2() {
  console.log('\n▶ SUITE 2: Stale Cookie Invalidation, Spoofing Resistance & Session Boundaries');

  // Test 1: Stale role cookie present without active session token
  await challenge(
    'ADV-M2-03.01',
    'Stale sb_user_role=STUDENT cookie without session token is rejected as unauthenticated',
    () => {
      const req = new MockNextRequest('/student/dashboard', {
        cookies: {
          'sb_user_role': 'STUDENT',
          'sb_profile_completed': 'true',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect unauthenticated request');
      const location = res.headers.get('location');
      assert.ok(location.includes('/auth'), 'Must redirect to /auth');
      assert.ok(location.includes('redirect='), 'Must include redirect parameter');
      assert.ok(location.includes('role=STUDENT'), 'Must include target role parameter');
    }
  );

  // Test 2: Spoofed sb_user_role=ADMIN cookie without session token
  await challenge(
    'ADV-M2-03.02',
    'Spoofed sb_user_role=ADMIN cookie without session token is rejected and redirected to /auth?role=ADMIN',
    () => {
      const req = new MockNextRequest('/admin/dashboard', {
        cookies: {
          'sb_user_role': 'ADMIN',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect unauthenticated request');
      const location = res.headers.get('location');
      assert.ok(location.includes('/auth'), 'Must redirect to /auth');
      assert.ok(location.includes('role=ADMIN'), 'Must include role=ADMIN parameter');
    }
  );

  // Test 3: Unresolved session (session token exists, but sb_user_role is missing)
  await challenge(
    'ADV-M2-03.03',
    'Valid session token with missing sb_user_role redirects to /profile/complete (does NOT default to STUDENT)',
    () => {
      const req = new MockNextRequest('/industry/dashboard', {
        cookies: {
          'better-auth.session_token': 'valid_ba_session_token_xyz',
          // sb_user_role is omitted!
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect unresolved session');
      const location = res.headers.get('location');
      assert.ok(
        location.includes('/profile/complete'),
        `Expected redirect to /profile/complete, got: ${location}`
      );
    }
  );

  // Test 4: Unresolved session on /auth redirects to /profile/complete
  await challenge(
    'ADV-M2-03.04',
    'Valid session token with missing sb_user_role visiting /auth redirects to /profile/complete',
    () => {
      const req = new MockNextRequest('/auth', {
        cookies: {
          'better-auth.session_token': 'valid_ba_session_token_xyz',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect to /profile/complete');
      assert.ok(res.headers.get('location').includes('/profile/complete'));
    }
  );

  // Test 5: Incomplete profile redirected to /profile/setup
  await challenge(
    'ADV-M2-03.05',
    'Authenticated student with profileCompleted=false redirected to /profile/setup',
    () => {
      const req = new MockNextRequest('/student/dashboard', {
        cookies: {
          'better-auth.session_token': 'valid_session_123',
          'sb_user_role': 'STUDENT',
          'sb_profile_completed': 'false',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect incomplete profile');
      assert.ok(res.headers.get('location').includes('/profile/setup'));
    }
  );

  // Test 6: Incomplete profile accessing /profile/setup is ALLOWED
  await challenge(
    'ADV-M2-03.06',
    'Authenticated student with profileCompleted=false accessing /profile/setup is allowed without loop',
    () => {
      const req = new MockNextRequest('/profile/setup', {
        cookies: {
          'better-auth.session_token': 'valid_session_123',
          'sb_user_role': 'STUDENT',
          'sb_profile_completed': 'false',
        },
      });
      const res = middlewareFn(req);
      assert.ok(!res?.headers?.get('location'), 'Must allow access to /profile/setup');
    }
  );

  // Test 7: Suspended user redirected to /account-suspended
  await challenge(
    'ADV-M2-03.07',
    'Suspended user attempting to access /student/dashboard is redirected to /account-suspended',
    () => {
      const req = new MockNextRequest('/student/dashboard', {
        cookies: {
          'better-auth.session_token': 'valid_session_123',
          'sb_user_role': 'STUDENT',
          'sb_user_status': 'SUSPENDED',
          'sb_profile_completed': 'true',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect suspended user');
      assert.ok(res.headers.get('location').includes('/account-suspended'));
    }
  );

  // Test 8: Active user visiting /account-suspended is bounced back to dashboard
  await challenge(
    'ADV-M2-03.08',
    'Active user accessing /account-suspended is redirected back to their canonical dashboard',
    () => {
      const req = new MockNextRequest('/account-suspended', {
        cookies: {
          'better-auth.session_token': 'valid_session_123',
          'sb_user_role': 'STUDENT',
          'sb_user_status': 'ACTIVE',
          'sb_profile_completed': 'true',
        },
      });
      const res = middlewareFn(req);
      assert.ok(res?.headers?.get('location'), 'Must redirect active user away from /account-suspended');
      assert.ok(res.headers.get('location').includes('/student/dashboard'));
    }
  );
}

// ============================================================================
// SUITE 3: ROLE COLLISION ENGINE, ALIASES & URL BUILDERS
// ============================================================================
async function runSuite3() {
  console.log('\n▶ SUITE 3: Role Collision Invariant Testing & Alias Verification');

  const collisionCases = [
    { existing: 'STUDENT', intent: 'INDUSTRY', expectedCollision: true, roleName: 'Student' },
    { existing: 'STUDENT', intent: 'INSTITUTE', expectedCollision: true, roleName: 'Student' },
    { existing: 'INDUSTRY', intent: 'STUDENT', expectedCollision: true, roleName: 'Industry' },
    { existing: 'INDUSTRY', intent: 'INSTITUTE', expectedCollision: true, roleName: 'Industry' },
    { existing: 'INSTITUTE', intent: 'STUDENT', expectedCollision: true, roleName: 'Institute' },
    { existing: 'INSTITUTE', intent: 'INDUSTRY', expectedCollision: true, roleName: 'Institute' },
    // Aliases: INDUSTRY <-> ORGANIZATION
    { existing: 'INDUSTRY', intent: 'ORGANIZATION', expectedCollision: false },
    { existing: 'ORGANIZATION', intent: 'INDUSTRY', expectedCollision: false },
    { existing: 'INDUSTRY', intent: 'INDUSTRY', expectedCollision: false },
    { existing: 'STUDENT', intent: 'STUDENT', expectedCollision: false },
    { existing: 'INSTITUTE', intent: 'INSTITUTE', expectedCollision: false },
    // Null / empty / case tolerance
    { existing: 'student', intent: ' industry ', expectedCollision: true, roleName: 'Student' },
    { existing: null, intent: 'STUDENT', expectedCollision: false },
    { existing: 'STUDENT', intent: null, expectedCollision: false },
    { existing: undefined, intent: undefined, expectedCollision: false },
  ];

  let cIdx = 1;
  for (const c of collisionCases) {
    await challenge(
      `ADV-M2-04.${cIdx.toString().padStart(2, '0')}`,
      `Collision check for existing='${c.existing}' vs intent='${c.intent}' -> hasCollision: ${c.expectedCollision}`,
      () => {
        const result = roleCollision.checkRoleCollision({
          existingUserRole: c.existing,
          intentRole: c.intent,
        });

        assert.strictEqual(
          result.hasCollision,
          c.expectedCollision,
          `Expected hasCollision to be ${c.expectedCollision}, got ${result.hasCollision}`
        );

        if (c.expectedCollision) {
          assert.strictEqual(result.existingRole, String(c.existing).trim().toUpperCase());
          assert.strictEqual(result.attemptedRole, String(c.intent).trim().toUpperCase());
          assert.ok(result.message.includes(c.roleName), `Message should include role '${c.roleName}'`);
          assert.ok(result.redirectPath.includes(String(c.existing).trim().toLowerCase()));
        }
      }
    );
    cIdx++;
  }

  // Test URL Builder Helpers
  await challenge(
    'ADV-M2-04.15',
    'buildCollisionRedirectUrl generates well-formed dashboard collision URL',
    () => {
      const url = roleCollision.buildCollisionRedirectUrl('STUDENT', 'INDUSTRY');
      assert.strictEqual(
        url,
        '/student/dashboard?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY'
      );
    }
  );

  await challenge(
    'ADV-M2-04.16',
    'buildAuthCollisionUrl generates well-formed auth collision URL',
    () => {
      const url = roleCollision.buildAuthCollisionUrl('STUDENT', 'INDUSTRY');
      assert.strictEqual(
        url,
        '/auth?collision=true&existingRole=STUDENT&attemptedRole=INDUSTRY'
      );
    }
  );
}

// ============================================================================
// SUITE 4: SIGNUP INTENT LIFECYCLE, EXPIRATION & REPLAY DEFENSE
// ============================================================================
async function runSuite4() {
  console.log('\n▶ SUITE 4: Signup Intent Lifecycle, Token Entropy & Replay Defense');

  // Test 1: Generate Intent Token
  let testToken = null;
  await challenge(
    'ADV-M2-05.01',
    'createSignupIntent generates cryptographically secure 64-character token with 15-minute TTL',
    async () => {
      const intent = await signupIntent.createSignupIntent({
        role: 'INDUSTRY',
        email: 'challenger_test@example.com',
      });

      assert.ok(intent);
      assert.ok(intent.token);
      assert.strictEqual(intent.token.length, 64, 'Token must be 64-char hex string (32 bytes entropy)');
      assert.strictEqual(intent.role, 'INDUSTRY');
      assert.ok(intent.expiresAt);

      const expires = new Date(intent.expiresAt).getTime();
      const now = Date.now();
      const diffMinutes = (expires - now) / (60 * 1000);
      assert.ok(diffMinutes >= 14 && diffMinutes <= 16, `TTL should be approx 15 minutes, got ${diffMinutes.toFixed(1)}`);
      testToken = intent.token;
    }
  );

  // Test 2: Resolve Valid Intent
  await challenge(
    'ADV-M2-05.02',
    'resolveValidIntent verifies unconsumed token as isValid: true, isUsed: false, isExpired: false',
    async () => {
      const resolved = await signupIntent.resolveValidIntent(testToken);
      assert.ok(resolved, 'Token must resolve');
      assert.strictEqual(resolved.isValid, true);
      assert.strictEqual(resolved.isUsed, false);
      assert.strictEqual(resolved.isExpired, false);
      assert.strictEqual(resolved.role, 'INDUSTRY');
    }
  );

  // Test 3: Consume / Mark Intent Used
  await challenge(
    'ADV-M2-05.03',
    'markIntentUsed consumes token and marks it used in persistence store',
    async () => {
      const consumed = await signupIntent.markIntentUsed(testToken);
      assert.ok(consumed, 'markIntentUsed must return true');

      const reCheck = await signupIntent.resolveValidIntent(testToken);
      assert.ok(reCheck, 'Token record still exists');
      assert.strictEqual(reCheck.isUsed, true, 'isUsed must be true');
      assert.strictEqual(reCheck.isValid, false, 'isValid must be false');
    }
  );

  // Test 4: Replay Protection (Second consumption must not validate)
  await challenge(
    'ADV-M2-05.04',
    'Replaying consumed intent token returns isValid: false',
    async () => {
      const replayed = await signupIntent.resolveValidIntent(testToken);
      assert.strictEqual(replayed.isValid, false, 'Replayed token must be invalid');
    }
  );

  // Test 5: Strict Forbidden Role Gating in Signup Intent
  const badRoles = ['ADMIN', 'SUPERADMIN', 'ROOT', 'GUEST', 'SYSTEM', 'MODERATOR', '<script>', 'DROP TABLE'];
  for (const badRole of badRoles) {
    await challenge(
      `ADV-M2-05.05-${badRole}`,
      `createSignupIntent rejects forbidden role '${badRole}'`,
      async () => {
        await assert.rejects(
          async () => {
            await signupIntent.createSignupIntent({ role: badRole });
          },
          (err) => {
            return err.status === 400 || err.status === 403 || err.statusCode === 400 || err.statusCode === 403 || err.code === 'INVALID_ROLE' || err.code === 'ADMIN_REGISTRATION_FORBIDDEN';
          }
        );
      }
    );
  }

  // Test 6: Malformed / Injection Token Resolution Fuzzing
  const fuzzedTokens = [
    '',
    '   ',
    'short',
    '123456789012345', // 15 chars (< 16 minimum)
    'tok_random_nonexistent_token_000000000000000000000000000000000',
    "' OR 1=1--",
    '<script>alert(1)</script>',
    null,
    undefined,
    12345,
    {},
  ];

  for (const ft of fuzzedTokens) {
    await challenge(
      `ADV-M2-05.06-fuzz-${String(ft).slice(0, 10)}`,
      `resolveValidIntent safely handles fuzzed input: ${String(ft).slice(0, 15)}`,
      async () => {
        const res = await signupIntent.resolveValidIntent(ft);
        assert.strictEqual(res, null, 'Must resolve to null');
      }
    );
  }
}

// ============================================================================
// SUITE 5: FULL LOGOUT CASCADE & CLIENT DASHBOARD GUARDS
// ============================================================================
async function runSuite5() {
  console.log('\n▶ SUITE 5: Full Logout Cascade & Dashboard Component Defense-in-Depth');

  // Test 1: Inspect lib/auth-client.js fullLogout implementation
  await challenge(
    'ADV-M2-06.01',
    'lib/auth-client.js exports fullLogout clearing all platform cookies and client caches',
    () => {
      const authClientPath = path.join(__dirname, '../lib/auth-client.js');
      const content = fs.readFileSync(authClientPath, 'utf8');

      const expectedTokens = [
        'fullLogout',
        'authClient.signOut',
        '/api/auth/signup-intent',
        'sb_signup_intent',
        'sb_user_role',
        'sb_user_status',
        'sb_profile_completed',
        'sb_session_token',
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
        'localStorage.removeItem',
        'sessionStorage.clear',
      ];

      for (const token of expectedTokens) {
        assert.ok(
          content.includes(token),
          `lib/auth-client.js must include '${token}' in fullLogout routine`
        );
      }
    }
  );

  // Test 2: Inspect components/shared/Navbar.jsx integration
  await challenge(
    'ADV-M2-06.02',
    'Navbar.jsx imports fullLogout and invokes it on sign out action',
    () => {
      const navbarPath = path.join(__dirname, '../components/shared/Navbar.jsx');
      const content = fs.readFileSync(navbarPath, 'utf8');
      assert.ok(content.includes('fullLogout'), 'Navbar must reference fullLogout');
    }
  );

  // Test 3: Inspect app/api/auth/signup-intent/route.js DELETE endpoint
  await challenge(
    'ADV-M2-06.03',
    'app/api/auth/signup-intent/route.js exports DELETE handler with maxAge: 0 cookie expiration',
    () => {
      const routePath = path.join(__dirname, '../app/api/auth/signup-intent/route.js');
      const content = fs.readFileSync(routePath, 'utf8');
      assert.ok(content.includes('export async function DELETE'), 'Must export DELETE handler');
      assert.ok(content.includes('maxAge: 0'), 'Must expire cookie with maxAge: 0');
    }
  );

  // Test 4: Dashboard Component Client Defense-in-Depth Inspection
  const dashboardGuards = [
    { file: '../app/industry/dashboard/page.jsx', role: 'INDUSTRY', desc: 'Industry dashboard checks getSession and redirects non-industry' },
    { file: '../app/institute/dashboard/page.jsx', role: 'INSTITUTE', desc: 'Institute dashboard checks getSession and redirects non-institute' },
    { file: '../app/student/dashboard/page.js', role: 'STUDENT', desc: 'Student dashboard checks getSession and redirects non-student' },
  ];

  for (const dg of dashboardGuards) {
    await challenge(
      `ADV-M2-06.04-${dg.role}`,
      dg.desc,
      () => {
        const filePath = path.join(__dirname, dg.file);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.includes('authClient.getSession'), `${dg.file} must invoke authClient.getSession`);
        assert.ok(content.includes('router.replace'), `${dg.file} must redirect unauthenticated / wrong role`);
      }
    );
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function runAllChallengerSuites() {
  const tStart = Date.now();

  try {
    await runSuite1();
    await runSuite2();
    await runSuite3();
    await runSuite4();
    await runSuite5();
  } catch (err) {
    console.error('Fatal challenger execution error:', err);
  }

  const durationMs = Date.now() - tStart;

  console.log('\n================================================================================');
  console.log('               CHALLENGER STRESS SUITE EXECUTION SUMMARY                        ');
  console.log('================================================================================');
  console.log(`  Total Challenges Run : ${totalTests}`);
  console.log(`  Passed Challenges    : ${passedTests}`);
  console.log(`  Failed Challenges    : ${failedTests}`);
  console.log(`  Pass Rate            : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`  Execution Duration   : ${durationMs}ms`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    console.error('  CHALLENGER VERDICT: REQUEST_CHANGES');
    console.error('  Failed challenge details:');
    failureLog.forEach((f) => console.error(`   - [${f.id}] ${f.title}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('  CHALLENGER VERDICT: APPROVE');
    console.log('  All adversarial challenges passed with 100% compliance!\n');
    process.exit(0);
  }
}

runAllChallengerSuites();
