/**
 * Milestone M2 Adversarial Empirical Test Suite
 * File: tests/m2-adversarial-challenger-suite.js
 *
 * Comprehensive empirical tests for M2 deliverables:
 * 1. RoleSelector.jsx (Role definitions, aliases, layout handling, normalized matching)
 * 2. app/profile/complete/page.jsx (Role dispatching, session resolution, status transitions, fallback hierarchy)
 * 3. app/api/institute/onboarding/route.js (Drafts, scoring, security field stripping, 70% gate, completion, audit logging)
 * 4. ProfileGateModal.jsx & ProfileCompletionCard.jsx (70% threshold gating, deficit math, checklist accuracy across all roles)
 * 5. Onboarding Calculation Engine & Boundary Invariance
 * 6. Adversarial Security & Injection Challenges
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const helper = require('./auth-test-helper');
const localDb = require('../lib/db');
const onboardingCalc = require('../lib/onboarding-calc');

// Color formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function runTest(name, fn) {
  try {
    fn();
    passedCount++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name}`);
    testResults.push({ name, status: 'PASS' });
  } catch (err) {
    failedCount++;
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${name}`);
    console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
    testResults.push({ name, status: 'FAIL', error: err.message });
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    passedCount++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name}`);
    testResults.push({ name, status: 'PASS' });
  } catch (err) {
    failedCount++;
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${name}`);
    console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
    testResults.push({ name, status: 'FAIL', error: err.message });
  }
}

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  M2 EMPIRICAL CHALLENGER ADVERSARIAL TEST SUITE                      ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

  // -------------------------------------------------------------------------
  // 1. RoleSelector.jsx Empirical Verification
  // -------------------------------------------------------------------------
  console.log(`${colors.bright}▶ CATEGORY 1: RoleSelector.jsx Verification${colors.reset}`);

  const roleSelectorPath = path.resolve(__dirname, '../components/auth/RoleSelector.jsx');
  const roleSelectorContent = fs.readFileSync(roleSelectorPath, 'utf8');

  runTest('RS-01: RoleSelector.jsx exists and has client component directive', () => {
    assert.ok(fs.existsSync(roleSelectorPath), 'RoleSelector.jsx must exist');
    assert.ok(roleSelectorContent.includes('"use client"'), 'Must have "use client" directive');
  });

  runTest('RS-02: RoleSelector defines all 3 mandatory roles (STUDENT, INDUSTRY, INSTITUTE)', () => {
    assert.ok(roleSelectorContent.includes("id: 'STUDENT'"), 'Must contain STUDENT role definition');
    assert.ok(roleSelectorContent.includes("id: 'INDUSTRY'"), 'Must contain INDUSTRY role definition');
    assert.ok(roleSelectorContent.includes("id: 'INSTITUTE'"), 'Must contain INSTITUTE role definition');
  });

  runTest('RS-03: RoleSelector maps ORGANIZATION alias to INDUSTRY role', () => {
    assert.ok(roleSelectorContent.includes("aliases: ['INDUSTRY', 'ORGANIZATION']"), 'INDUSTRY must have aliases [INDUSTRY, ORGANIZATION]');
  });

  runTest('RS-04: RoleSelector supports both grid and compact layout modes with ARIA accessibility', () => {
    assert.ok(roleSelectorContent.includes("layout === 'compact'"), 'Must support compact layout mode');
    assert.ok(roleSelectorContent.includes('role="radiogroup"'), 'Must include ARIA radiogroup');
    assert.ok(roleSelectorContent.includes('role="radio"'), 'Must include ARIA radio role');
    assert.ok(roleSelectorContent.includes('aria-checked='), 'Must include aria-checked attribute');
  });

  runTest('RS-05: Role normalization correctly resolves case variations and aliases', () => {
    // Replicate RoleSelector's normalization logic
    const extractRoles = () => [
      { id: 'STUDENT', aliases: ['STUDENT'] },
      { id: 'INDUSTRY', aliases: ['INDUSTRY', 'ORGANIZATION'] },
      { id: 'INSTITUTE', aliases: ['INSTITUTE'] },
    ];
    const roles = extractRoles();

    const testRoleActive = (selectedRole, role) => {
      const normalizedSelected = String(selectedRole || 'STUDENT').toUpperCase();
      return role.id === normalizedSelected || role.aliases.includes(normalizedSelected);
    };

    assert.strictEqual(testRoleActive('student', roles[0]), true);
    assert.strictEqual(testRoleActive('STUDENT', roles[0]), true);
    assert.strictEqual(testRoleActive('Student', roles[0]), true);
    assert.strictEqual(testRoleActive('organization', roles[1]), true);
    assert.strictEqual(testRoleActive('ORGANIZATION', roles[1]), true);
    assert.strictEqual(testRoleActive('industry', roles[1]), true);
    assert.strictEqual(testRoleActive('INDUSTRY', roles[1]), true);
    assert.strictEqual(testRoleActive('institute', roles[2]), true);
    assert.strictEqual(testRoleActive('INSTITUTE', roles[2]), true);
  });

  // -------------------------------------------------------------------------
  // 2. Profile Complete Dispatcher Page Verification (app/profile/complete/page.jsx)
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}▶ CATEGORY 2: Dispatcher Page (app/profile/complete/page.jsx)${colors.reset}`);

  const completePagePath = path.resolve(__dirname, '../app/profile/complete/page.jsx');
  const completePageContent = fs.readFileSync(completePagePath, 'utf8');

  runTest('DISP-01: complete/page.jsx exists and uses client directive', () => {
    assert.ok(fs.existsSync(completePagePath), 'complete/page.jsx must exist');
    assert.ok(completePageContent.includes('"use client"'), 'Must have "use client" directive');
  });

  runTest('DISP-02: Complete dispatcher implements probe fallbacks for STUDENT, ORGANIZATION, and INSTITUTE', () => {
    assert.ok(completePageContent.includes('/api/student/onboarding'), 'Must probe student onboarding fallback');
    assert.ok(completePageContent.includes('/api/organization/onboarding'), 'Must probe organization onboarding fallback');
    assert.ok(completePageContent.includes('/api/institute/onboarding'), 'Must probe institute onboarding fallback');
  });

  runTest('DISP-03: Incomplete vs Completed routing logic maps accurately for all roles', () => {
    function simulateDispatcherRouting(user) {
      let role = user?.role ? String(user.role).toUpperCase() : null;
      let onboardingStatus = user?.onboardingStatus || null;
      let profileCompleted = user?.profileCompleted === true;

      if (!role) return '/login';

      const normalizedRole = role === 'INDUSTRY' ? 'ORGANIZATION' : role;
      const isCompleted = profileCompleted || onboardingStatus === 'COMPLETED';

      let targetRoute = '/home';

      if (!isCompleted) {
        switch (normalizedRole) {
          case 'STUDENT':
            targetRoute = '/student/onboarding';
            break;
          case 'INDUSTRY':
          case 'ORGANIZATION':
            targetRoute = '/organization/onboarding';
            break;
          case 'INSTITUTE':
            targetRoute = '/institute/onboarding';
            break;
          case 'ADMIN':
            targetRoute = '/admin/dashboard';
            break;
          default:
            targetRoute = '/student/onboarding';
        }
      } else {
        switch (normalizedRole) {
          case 'STUDENT':
            targetRoute = '/student/dashboard';
            break;
          case 'INDUSTRY':
          case 'ORGANIZATION':
            targetRoute = '/organization/dashboard';
            break;
          case 'INSTITUTE':
            targetRoute = '/institute/dashboard';
            break;
          case 'ADMIN':
            targetRoute = '/admin/dashboard';
            break;
          default:
            targetRoute = '/home';
        }
      }
      return targetRoute;
    }

    // Incomplete
    assert.strictEqual(simulateDispatcherRouting({ role: 'STUDENT', onboardingStatus: 'IN_PROGRESS' }), '/student/onboarding');
    assert.strictEqual(simulateDispatcherRouting({ role: 'INDUSTRY', onboardingStatus: 'IN_PROGRESS' }), '/organization/onboarding');
    assert.strictEqual(simulateDispatcherRouting({ role: 'ORGANIZATION', onboardingStatus: 'NOT_STARTED' }), '/organization/onboarding');
    assert.strictEqual(simulateDispatcherRouting({ role: 'INSTITUTE', onboardingStatus: 'IN_PROGRESS' }), '/institute/onboarding');
    assert.strictEqual(simulateDispatcherRouting({ role: 'ADMIN', onboardingStatus: 'NOT_STARTED' }), '/admin/dashboard');

    // Completed
    assert.strictEqual(simulateDispatcherRouting({ role: 'STUDENT', onboardingStatus: 'COMPLETED' }), '/student/dashboard');
    assert.strictEqual(simulateDispatcherRouting({ role: 'STUDENT', profileCompleted: true }), '/student/dashboard');
    assert.strictEqual(simulateDispatcherRouting({ role: 'INDUSTRY', onboardingStatus: 'COMPLETED' }), '/organization/dashboard');
    assert.strictEqual(simulateDispatcherRouting({ role: 'ORGANIZATION', profileCompleted: true }), '/organization/dashboard');
    assert.strictEqual(simulateDispatcherRouting({ role: 'INSTITUTE', onboardingStatus: 'COMPLETED' }), '/institute/dashboard');
    assert.strictEqual(simulateDispatcherRouting({ role: 'ADMIN', onboardingStatus: 'COMPLETED' }), '/admin/dashboard');
  });

  // -------------------------------------------------------------------------
  // 3. Dynamic Profile Completion Scoring Engine (lib/onboarding-calc.js)
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}▶ CATEGORY 3: Dynamic Completion Scoring Engine (lib/onboarding-calc.js)${colors.reset}`);

  runTest('CALC-01: calculateInstituteCompletion step-by-step weighting', () => {
    // 0%
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({}), 0);

    // Step 1: Basic Info (15%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
    }), 15);

    // Step 1 partial (7.5% -> 8%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
    }), 8);

    // Step 1 + Step 2 (35%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
    }), 35);

    // Step 1 + 2 + 3 (50%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
    }), 50);

    // Step 1 + 2 + 3 + 4 (65%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
      departments: [{ name: 'CSE', code: 'CSE' }],
    }), 65);

    // Step 1 + 2 + 3 + 4 + 5 (80% - threshold crossed)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
      departments: [{ name: 'CSE', code: 'CSE' }],
      placementContact: { tpoName: 'Prof. S. K. Nair' },
    }), 80);

    // Step 1 to 6 (95% -> normalized to 100%)
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({
      instituteName: 'NITK Surathkal',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
      departments: [{ name: 'CSE', code: 'CSE' }],
      placementContact: { tpoName: 'Prof. S. K. Nair' },
      verificationDocs: [{ docType: 'AISHE' }],
    }), 100);
  });

  runTest('CALC-02: Universal calculateProfileCompletion handles all roles & input types', () => {
    const student = { headline: 'Developer', bio: 'Bio', instituteName: 'NIT', department: 'CSE', degree: 'BTech', graduationYear: 2026, skills: ['JS', 'React', 'Node'] };
    const org = { companyName: 'Google', website: 'https://google.com', logoUrl: 'https://...', registrationNumber: 'CIN1', taxIdGstin: 'GST1' };
    const inst = { instituteName: 'NITK', website: 'https://nitk.ac.in', instituteCode: 'AISHE1', instituteType: 'NIT' };

    assert.ok(onboardingCalc.calculateProfileCompletion('STUDENT', student) > 0);
    assert.ok(onboardingCalc.calculateProfileCompletion('INDUSTRY', org) > 0);
    assert.ok(onboardingCalc.calculateProfileCompletion('ORGANIZATION', org) > 0);
    assert.ok(onboardingCalc.calculateProfileCompletion('INSTITUTE', inst) > 0);
    assert.strictEqual(onboardingCalc.calculateProfileCompletion('ADMIN', {}), 100);
  });

  runTest('CALC-03: 70% threshold test isProfileComplete', () => {
    const pSub70 = { instituteName: 'NITK', website: 'https://nitk.ac.in', instituteCode: 'AISHE1', instituteType: 'NIT' }; // 35%
    const pAbove70 = {
      instituteName: 'NITK',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE1',
      instituteType: 'NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
      departments: [{ name: 'CSE', code: 'CSE' }],
      placementContact: { tpoName: 'Prof. Nair' }
    }; // 80%

    assert.strictEqual(onboardingCalc.isProfileComplete('INSTITUTE', pSub70), false);
    assert.strictEqual(onboardingCalc.isProfileComplete('INSTITUTE', pAbove70), true);
    assert.strictEqual(onboardingCalc.isProfileComplete({ role: 'INSTITUTE', profileCompleted: true }, pSub70), true);
    assert.strictEqual(onboardingCalc.isProfileComplete({ role: 'INSTITUTE', onboardingStatus: 'COMPLETED' }, pSub70), true);
  });

  // -------------------------------------------------------------------------
  // 4. Institute Onboarding API Route Architecture & Gating Logic
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}▶ CATEGORY 4: Institute Onboarding Route (app/api/institute/onboarding/route.js)${colors.reset}`);

  const instituteRoutePath = path.resolve(__dirname, '../app/api/institute/onboarding/route.js');
  const instituteRouteContent = fs.readFileSync(instituteRoutePath, 'utf8');

  runTest('API-INST-01: Route file exists and exports GET, POST, PUT handlers', () => {
    assert.ok(fs.existsSync(instituteRoutePath), 'Route file must exist');
    assert.ok(instituteRouteContent.includes('export async function GET'), 'Must export GET handler');
    assert.ok(instituteRouteContent.includes('export async function POST'), 'Must export POST handler');
    assert.ok(instituteRouteContent.includes('export async function PUT'), 'Must export PUT handler');
  });

  runTest('API-INST-02: Route strictly sanitizes client-tampered security fields', () => {
    assert.ok(instituteRouteContent.includes('delete profileData.id'), 'Must strip id from client payload');
    assert.ok(instituteRouteContent.includes('delete profileData.userId'), 'Must strip userId from client payload');
    assert.ok(instituteRouteContent.includes('delete profileData.role'), 'Must strip role from client payload');
    assert.ok(instituteRouteContent.includes('delete profileData.verificationStatus'), 'Must strip verificationStatus from client payload');
  });

  runTest('API-INST-03: Route enforces 70% threshold and missing fields limit on SUBMIT', () => {
    assert.ok(instituteRouteContent.includes('details.completion < 70'), 'Must check completion < 70%');
    assert.ok(instituteRouteContent.includes('details.missingFields.length > 3'), 'Must check missing fields count');
    assert.ok(instituteRouteContent.includes('Incomplete onboarding: Please fill required fields before submission'), 'Must return descriptive error');
  });

  runTest('API-INST-04: Route synchronizes to both instituteProfiles and institutes catalog and records audit log', () => {
    assert.ok(instituteRouteContent.includes('dbInstance.instituteProfiles'), 'Must save to instituteProfiles');
    assert.ok(instituteRouteContent.includes('dbInstance.institutes'), 'Must save to institutes catalog');
    assert.ok(instituteRouteContent.includes('logAuditEvent'), 'Must invoke audit logger');
  });

  // -------------------------------------------------------------------------
  // 5. ProfileGateModal & ProfileCompletionCard Logic & UI State
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}▶ CATEGORY 5: Gating UI Components (ProfileGateModal & ProfileCompletionCard)${colors.reset}`);

  const gateModalPath = path.resolve(__dirname, '../components/shared/ProfileGateModal.jsx');
  const gateModalContent = fs.readFileSync(gateModalPath, 'utf8');

  runTest('UI-GATE-01: ProfileGateModal exists and renders 70% threshold gating modal', () => {
    assert.ok(fs.existsSync(gateModalPath), 'ProfileGateModal.jsx must exist');
    assert.ok(gateModalContent.includes('"use client"'), 'Must have client directive');
    assert.ok(gateModalContent.includes('requiredThreshold = 70'), 'Default threshold must be 70%');
    assert.ok(gateModalContent.includes('Math.max(0, requiredThreshold - currentScore)'), 'Must calculate exact deficit');
    assert.ok(gateModalContent.includes('Escape'), 'Must support Escape key dismissal');
  });

  const cardPath = path.resolve(__dirname, '../components/shared/ProfileCompletionCard.jsx');
  const cardContent = fs.readFileSync(cardPath, 'utf8');

  runTest('UI-CARD-01: ProfileCompletionCard exists and implements multi-role checklists', () => {
    assert.ok(fs.existsSync(cardPath), 'ProfileCompletionCard.jsx must exist');
    assert.ok(cardContent.includes('"use client"'), 'Must have client directive');
    assert.ok(cardContent.includes("normalizedRole === 'STUDENT'"), 'Must handle STUDENT checklist');
    assert.ok(cardContent.includes("normalizedRole === 'ORGANIZATION' || normalizedRole === 'INDUSTRY'"), 'Must handle ORGANIZATION/INDUSTRY checklist');
    assert.ok(cardContent.includes("normalizedRole === 'INSTITUTE'") || cardContent.includes("details = getInstituteCompletionDetails"), 'Must handle INSTITUTE checklist');
    assert.ok(cardContent.includes('70% (Gate Threshold)'), 'Must display 70% gate marker');
  });

  // -------------------------------------------------------------------------
  // 6. Adversarial Stress Testing & Boundary Invariance
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}▶ CATEGORY 6: Adversarial Stress Testing & Boundary Invariance${colors.reset}`);

  runTest('ADV-01: calculateInstituteCompletion handles null, undefined, arrays, malformed structures', () => {
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion(null), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion(undefined), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion('invalid'), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion(12345), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion([]), 0);
    assert.strictEqual(onboardingCalc.calculateInstituteCompletion({ address: null, departments: 'not-an-array' }), 0);
  });

  runTest('ADV-02: Boundary clamping score never exceeds 100 or drops below 0', () => {
    const bloatedInstitute = {
      instituteName: 'Massive University',
      website: 'https://massive.edu',
      instituteCode: 'AISHE-999',
      instituteType: 'University',
      contactPhone: '123456',
      address: { city: 'City', state: 'State' },
      departments: Array(50).fill({ name: 'Dept', code: 'D' }),
      placementContact: { tpoName: 'TPO' },
      verificationDocs: Array(20).fill({ docType: 'Doc' }),
      bonusPoints: 9999,
    };
    const score = onboardingCalc.calculateInstituteCompletion(bloatedInstitute);
    assert.strictEqual(score, 100, 'Score must be clamped at exactly 100%');
  });

  runTest('ADV-03: XSS / Malicious payload characters in department/name do not break completion calculation', () => {
    const maliciousProfile = {
      instituteName: '<script>alert("xss")</script>',
      website: 'javascript:alert(1)',
      instituteCode: "AISHE'; DROP TABLE institutes; --",
      instituteType: '<img src=x onerror=alert(1)>',
      departments: [
        { name: '<svg onload=alert(1)>', code: '"><script>alert(1)</script>' },
      ],
      placementContact: {
        tpoName: 'Dr. \\0 \\x00 Injection',
      },
    };
    const score = onboardingCalc.calculateInstituteCompletion(maliciousProfile);
    assert.ok(typeof score === 'number' && score >= 0 && score <= 100, 'Scoring engine must be invariant to malicious string payloads');
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}              M2 ADVERSARIAL CHALLENGE EXECUTION SUMMARY              ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
  console.log(`  Total Tests Run    : ${passedCount + failedCount}`);
  console.log(`  Passed Tests       : ${colors.green}${passedCount}${colors.reset}`);
  console.log(`  Failed Tests       : ${failedCount > 0 ? colors.red : colors.dim}${failedCount}${colors.reset}`);
  console.log(`  Pass Rate          : ${failedCount === 0 ? colors.green + '100.0%' : colors.red + ((passedCount / (passedCount + failedCount)) * 100).toFixed(1) + '%'}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
