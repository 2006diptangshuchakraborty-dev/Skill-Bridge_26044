/**
 * Skill Bridge Platform - Milestone M1 Auth UI & Navigation Empirical Verification Suite
 * File: tests/test-m1-auth-ui.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n======================================================================');
console.log('  Milestone M1: Unified Auth UI & Navigation Empirical Test Suite     ');
console.log('======================================================================\n');

// 1. UNIFIED AUTH PAGE (app/auth/page.jsx)
console.log('▶ SUITE 1: Unified Auth Page Architecture & Contract Validation');

try {
  const authPagePath = path.resolve('app/auth/page.jsx');
  assert(fs.existsSync(authPagePath), 'app/auth/page.jsx does not exist');
  const authContent = fs.readFileSync(authPagePath, 'utf8');

  runTest('M1-01: app/auth/page.jsx exists and uses client directive', () => {
    assert(authContent.includes('"use client"') || authContent.includes("'use client'"), 'Missing use client directive');
  });

  runTest('M1-02: app/auth/page.jsx wraps content in Suspense for safe searchParams hydration', () => {
    assert(authContent.includes('<Suspense'), 'Missing Suspense wrapper');
    assert(authContent.includes('useSearchParams'), 'Missing useSearchParams import');
  });

  runTest('M1-03: Embeds RoleSelector with single-select state and disables button when no role selected', () => {
    assert(authContent.includes('<RoleSelector'), 'Missing RoleSelector component');
    assert(authContent.includes('selectedRole={selectedRole}'), 'Missing selectedRole state binding');
    assert(authContent.includes('disabled={!selectedRole || loading}'), 'Button should be disabled when no role is selected');
  });

  runTest('M1-04: Pre-OAuth handshake triggers POST /api/auth/signup-intent with chosen role', () => {
    assert(authContent.includes('/api/auth/signup-intent'), 'Missing /api/auth/signup-intent endpoint');
    assert(authContent.includes("method: 'POST'"), 'Should use POST method');
    assert(authContent.includes('targetRole'), 'Should resolve target role');
  });

  runTest('M1-05: Invokes Better Auth social sign-in with Google and /profile/complete callback', () => {
    assert(authContent.includes('authClient.signIn.social'), 'Missing authClient.signIn.social call');
    assert(authContent.includes("provider: 'google'"), 'Should use Google provider');
    assert(authContent.includes("callbackURL: '/profile/complete'"), 'Should callback to /profile/complete');
  });

  runTest('M1-06: Handles role collision query parameters and displays RoleCollisionModal', () => {
    assert(authContent.includes("searchParams.get('collision')"), 'Missing collision query param parser');
    assert(authContent.includes("searchParams.get('existingRole')"), 'Missing existingRole query param parser');
    assert(authContent.includes("searchParams.get('attemptedRole')"), 'Missing attemptedRole query param parser');
    assert(authContent.includes('<RoleCollisionModal'), 'Missing RoleCollisionModal rendering');
  });

  runTest('M1-07: Design system fidelity (obsidian dark, glassmorphism, responsive container)', () => {
    assert(authContent.includes('bg-slate-900'), 'Missing slate-900 card styling');
    assert(authContent.includes('backdrop-blur'), 'Missing backdrop-blur styling');
    assert(authContent.includes('rounded-3xl'), 'Missing rounded-3xl borders');
  });
} catch (err) {
  console.error('Error in Suite 1:', err);
}

// 2. ROLE SELECTOR COMPONENT (components/auth/RoleSelector.jsx)
console.log('\n▶ SUITE 2: RoleSelector Component Fidelity & Unselected State');

try {
  const roleSelectorPath = path.resolve('components/auth/RoleSelector.jsx');
  assert(fs.existsSync(roleSelectorPath), 'components/auth/RoleSelector.jsx does not exist');
  const roleSelectorContent = fs.readFileSync(roleSelectorPath, 'utf8');

  runTest('M1-08: RoleSelector defines ROLES for STUDENT, INDUSTRY, and INSTITUTE', () => {
    assert(roleSelectorContent.includes("id: 'STUDENT'"), 'Missing STUDENT role definition');
    assert(roleSelectorContent.includes("id: 'INDUSTRY'"), 'Missing INDUSTRY role definition');
    assert(roleSelectorContent.includes("id: 'INSTITUTE'"), 'Missing INSTITUTE role definition');
  });

  runTest('M1-09: RoleSelector supports unselected state (null) without auto-activating STUDENT', () => {
    assert(roleSelectorContent.includes('selectedRole = null'), 'Default selectedRole should be null');
    assert(roleSelectorContent.includes('if (!normalizedSelected) return false;'), 'Should return false when normalizedSelected is null');
  });

  runTest('M1-10: RoleSelector supports both grid and compact layouts', () => {
    assert(roleSelectorContent.includes("layout === 'compact'"), 'Missing compact layout branch');
    assert(roleSelectorContent.includes('role="radiogroup"'), 'Missing accessibility radiogroup role');
  });
} catch (err) {
  console.error('Error in Suite 2:', err);
}

// 3. NAVBAR SESSION & ROUTING (components/shared/Navbar.jsx)
console.log('\n▶ SUITE 3: Navbar Routing, Session State & Sign-Out Handshake');

try {
  const navbarPath = path.resolve('components/shared/Navbar.jsx');
  assert(fs.existsSync(navbarPath), 'components/shared/Navbar.jsx does not exist');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');

  runTest('M1-11: Desktop and mobile Sign In and Get Started links route directly to /auth', () => {
    assert(navbarContent.includes('href="/auth"'), 'Missing href="/auth" in Navbar');
    // Verify no live unauthenticated CTA still routes to /login or /register
    const desktopCtaSection = navbarContent.substring(navbarContent.indexOf('/* Logged-Out CTAs'), navbarContent.indexOf('/* Mobile Menu Button'));
    assert(desktopCtaSection.includes('href="/auth"'), 'Desktop CTA must point to /auth');
    assert(!desktopCtaSection.includes('href="/login"'), 'Desktop CTA should not route to /login');
    assert(!desktopCtaSection.includes('href="/register"'), 'Desktop CTA should not route to /register');
  });

  runTest('M1-12: handleSignOut destroys session and redirects to / (Home)', () => {
    assert(navbarContent.includes('handleSignOut'), 'Missing handleSignOut function');
    assert(navbarContent.includes('router.push("/")'), 'handleSignOut must redirect to /');
    assert(navbarContent.includes('router.refresh()'), 'handleSignOut should refresh router state');
  });

  runTest('M1-13: Authenticated navigation displays role badge and canonical dashboard routes', () => {
    assert(navbarContent.includes('/student/dashboard'), 'Missing /student/dashboard link');
    assert(navbarContent.includes('/industry/dashboard'), 'Missing /industry/dashboard link');
    assert(navbarContent.includes('/institute/dashboard'), 'Missing /institute/dashboard link');
    assert(navbarContent.includes('{role}'), 'Missing role badge display');
  });

  runTest('M1-14: User avatar dropdown contains role-specific profile and dashboard links', () => {
    assert(navbarContent.includes('/student/profile'), 'Missing student profile link in dropdown');
    assert(navbarContent.includes('/organization/onboarding'), 'Missing industry profile link in dropdown');
    assert(navbarContent.includes('/institute/onboarding'), 'Missing institute profile link in dropdown');
    assert(navbarContent.includes('setUserDropdownOpen'), 'Missing dropdown state toggle');
  });
} catch (err) {
  console.error('Error in Suite 3:', err);
}

// SUMMARY
console.log('\n----------------------------------------------------------------------');
console.log('                     M1 TEST EXECUTION SUMMARY                        ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Test Cases   : ${totalTests}`);
console.log(`  Passed Tests       : ${passedTests}`);
console.log(`  Failed Tests       : ${failedTests}`);
console.log(`  Overall Pass Rate  : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------');

if (failedTests > 0) {
  console.error('\n   SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n   ALL M1 TESTS PASSED SUCCESSFULLY \n');
  process.exit(0);
}
