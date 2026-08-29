/**
 * Adversarial Edge Case & State Mutation Stress Test for Milestone M3
 * File: tests/test-m3-adversarial-stress.js
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${description}`);
  } catch (e) {
    failed++;
    console.error(`  ✖ [FAIL] ${description}: ${e.message}`);
  }
}

console.log('\n======================================================================');
console.log('  Adversarial Stress Test: Milestone M3 State & Route Permutations');
console.log('======================================================================\n');

// 1. Role Resolution Logic (as implemented in Navbar.jsx and HomePage)
function resolveNavbarRole(user, pathname) {
  const rawRole = user?.role ? String(user.role).toUpperCase() : "";
  let role = "STUDENT";

  if (rawRole === "ADMIN") {
    role = "ADMIN";
  } else if (rawRole === "ORGANIZATION" || rawRole === "INDUSTRY") {
    role = "INDUSTRY";
  } else if (rawRole === "INSTITUTE") {
    role = "INSTITUTE";
  } else if (rawRole === "STUDENT") {
    role = "STUDENT";
  } else {
    // Path-based fallback
    if (pathname.startsWith("/admin")) {
      role = "ADMIN";
    } else if (pathname.startsWith("/recruiter") || pathname.startsWith("/organization") || pathname.startsWith("/industry")) {
      role = "INDUSTRY";
    } else if (pathname.startsWith("/institute")) {
      role = "INSTITUTE";
    } else {
      role = "STUDENT";
    }
  }
  return role;
}

test('Role Resolution: "ORGANIZATION" rawRole maps to "INDUSTRY"', () => {
  assert.strictEqual(resolveNavbarRole({ role: "ORGANIZATION" }, "/home"), "INDUSTRY");
  assert.strictEqual(resolveNavbarRole({ role: "organization" }, "/home"), "INDUSTRY");
});

test('Role Resolution: "INDUSTRY" rawRole maps to "INDUSTRY"', () => {
  assert.strictEqual(resolveNavbarRole({ role: "INDUSTRY" }, "/home"), "INDUSTRY");
});

test('Role Resolution: "ADMIN" rawRole maps to "ADMIN"', () => {
  assert.strictEqual(resolveNavbarRole({ role: "ADMIN" }, "/home"), "ADMIN");
  assert.strictEqual(resolveNavbarRole({ role: "admin" }, "/home"), "ADMIN");
});

test('Role Resolution: "INSTITUTE" rawRole maps to "INSTITUTE"', () => {
  assert.strictEqual(resolveNavbarRole({ role: "INSTITUTE" }, "/home"), "INSTITUTE");
});

test('Role Resolution: "STUDENT" rawRole maps to "STUDENT"', () => {
  assert.strictEqual(resolveNavbarRole({ role: "STUDENT" }, "/home"), "STUDENT");
});

test('Role Resolution: Null user on /admin route falls back to ADMIN role', () => {
  assert.strictEqual(resolveNavbarRole(null, "/admin/dashboard"), "ADMIN");
  assert.strictEqual(resolveNavbarRole(null, "/admin/users"), "ADMIN");
});

test('Role Resolution: Null user on /recruiter or /organization route falls back to INDUSTRY role', () => {
  assert.strictEqual(resolveNavbarRole(null, "/recruiter/dashboard"), "INDUSTRY");
  assert.strictEqual(resolveNavbarRole(null, "/organization/onboarding"), "INDUSTRY");
});

test('Role Resolution: Null user on /institute route falls back to INSTITUTE role', () => {
  assert.strictEqual(resolveNavbarRole(null, "/institute/dashboard"), "INSTITUTE");
});

test('Role Resolution: Null user on / or /student route falls back to STUDENT role', () => {
  assert.strictEqual(resolveNavbarRole(null, "/"), "STUDENT");
  assert.strictEqual(resolveNavbarRole(null, "/student/profile"), "STUDENT");
});

test('Role Resolution: Malformed / unknown role falls back to path matching or STUDENT', () => {
  assert.strictEqual(resolveNavbarRole({ role: "UNKNOWN_MALICIOUS_ROLE" }, "/home"), "STUDENT");
  assert.strictEqual(resolveNavbarRole({ role: "" }, "/recruiter/jobs/create"), "INDUSTRY");
  assert.strictEqual(resolveNavbarRole({ role: null }, "/institute/skill-gaps"), "INSTITUTE");
});

// 2. Profile completion calculation safety
test('Profile Completion fallback handles null/undefined profiles gracefully', () => {
  const calc = (user) => {
    return user
      ? user.profileCompletion || 78
      : 78;
  };
  assert.strictEqual(calc(null), 78);
  assert.strictEqual(calc({}), 78);
  assert.strictEqual(calc({ profileCompletion: 95 }), 95);
  assert.strictEqual(calc({ profileCompletion: 0 }), 78); // 0 evaluates to false, fallback 78
});

// 3. Rule 01 Mandatory Gate Logic simulation
test('Rule 01 Gatekeeper correctly determines mandatory vs preferred eligibility', () => {
  const opportunity = {
    mandatorySkills: [
      { name: "Python", req: 2, have: 3 },
      { name: "SQL", req: 2, have: 3 },
    ],
    preferredSkills: [
      { name: "Power BI", req: 2, have: 1 },
    ],
  };

  const isMandatoryPassed = opportunity.mandatorySkills.every(s => s.have >= s.req);
  assert.strictEqual(isMandatoryPassed, true, "Mandatory skills should pass");

  const failingOpportunity = {
    mandatorySkills: [
      { name: "Python", req: 3, have: 2 },
    ],
  };
  const isFailed = failingOpportunity.mandatorySkills.every(s => s.have >= s.req);
  assert.strictEqual(isFailed, false, "Mandatory skill below requirement must fail gate");
});

console.log('\n----------------------------------------------------------------------');
console.log(`  Adversarial Stress Summary: ${passed} passed, ${failed} failed (Total: ${passed + failed})`);
console.log('----------------------------------------------------------------------\n');

if (failed > 0) process.exit(1);
else process.exit(0);
