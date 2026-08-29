/**
 * Skill Bridge Platform - Adversarial Challenge Test Suite 2
 * Focus: Gatekeeping Bypass, Edge Route Partitioning & IDOR Ownership Enforcement
 * File: tests/adversarial-gatekeeping-routes-idor.js
 */

const Module = require('module');
const path = require('path');
const assert = require('assert');

// Setup path alias @/ -> project root
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', request.slice(2));
  }
  return origResolve.call(this, request, parent);
};

// Import core security components
const gatekeeper = require('../lib/gatekeeper');
const { KYC_STATUS, ACCOUNT_STATUS, ROLES, MASKED_PII_PLACEHOLDER, checkPublishingCapability, maskCandidatePii } = gatekeeper;
const { withAuth } = require('../lib/auth-guard');
const localDb = require('../lib/db');
const { AUDIT_ACTIONS, logAuditEvent } = require('../lib/audit');

// Import Edge Middleware
let middleware;
try {
  const mwMod = require('../middleware');
  middleware = mwMod.middleware || mwMod.default || mwMod;
} catch (e) {
  console.warn('Warning: Loading middleware fallback');
}

// Import Route Handlers
const orgProfileRoute = require('../app/api/organization/profile/route');
const studentProfileRoute = require('../app/api/student/profile/route');
const adminVerificationsRoute = require('../app/api/admin/verifications/route');
const adminUsersRoute = require('../app/api/admin/users/route');
const adminAuditLogsRoute = require('../app/api/admin/audit-logs/route');
const orgOnboardingRoute = require('../app/api/organization/onboarding/route');
const studentOnboardingRoute = require('../app/api/student/onboarding/route');

// Test tracking
let totalTests = 0;
let passedTests = 0;
const failureList = [];

function runTest(testName, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          passedTests++;
          console.log(`  ✔ [PASS] ${testName}`);
        })
        .catch((err) => {
          failureList.push({ testName, error: err.message, stack: err.stack });
          console.error(`  ✖ [FAIL] ${testName}`);
          console.error(`     Reason: ${err.message}`);
        });
    } else {
      passedTests++;
      console.log(`  ✔ [PASS] ${testName}`);
    }
  } catch (err) {
    failureList.push({ testName, error: err.message, stack: err.stack });
    console.error(`  ✖ [FAIL] ${testName}`);
    console.error(`     Reason: ${err.message}`);
  }
}

// Helper to build Mock NextRequest
function createMockRequest({
  url = 'http://localhost:3000',
  method = 'GET',
  headers = {},
  cookies = {},
  body = null,
} = {}) {
  const headerMap = new Map();
  Object.entries(headers).forEach(([k, v]) => headerMap.set(k.toLowerCase(), v));

  const urlObj = new URL(url);

  return {
    url,
    method: method.toUpperCase(),
    nextUrl: {
      pathname: urlObj.pathname,
      search: urlObj.search,
      searchParams: urlObj.searchParams,
      href: urlObj.href,
    },
    headers: {
      get: (name) => headerMap.get(name.toLowerCase()) || null,
      has: (name) => headerMap.has(name.toLowerCase()),
    },
    cookies: {
      get: (name) => (cookies[name] ? { name, value: cookies[name] } : undefined),
    },
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body || {}),
  };
}

async function runAllAdversarialTests() {
  console.log('======================================================================');
  console.log('  ADVERSARIAL CHALLENGER 2: GATEKEEPING, ROUTES & IDOR HARNESS        ');
  console.log('======================================================================\n');

  // ==========================================================================
  // SECTION 1: GATEKEEPING BYPASS CHALLENGES
  // ==========================================================================
  console.log('--- SECTION 1: GATEKEEPING BYPASS CHALLENGES ---');

  runTest('GATE-01: Pending organization blocked from publishing live opportunity', () => {
    const pendingOrgUser = {
      id: 'usr_org_pending_01',
      role: ROLES.ORGANIZATION,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };
    const pendingOrgProfile = {
      userId: 'usr_org_pending_01',
      companyName: 'Pending Ventures',
      verificationStatus: KYC_STATUS.PENDING,
    };

    const cap = checkPublishingCapability(pendingOrgUser, pendingOrgProfile);
    assert.strictEqual(cap.allowed, false, 'Pending org must not be allowed to publish');
    assert.strictEqual(cap.statusCode, 403);
    assert.ok(cap.reason.toLowerCase().includes('pending') || cap.reason.toLowerCase().includes('unapproved'));
  });

  runTest('GATE-02: Suspended organization blocked from publishing live opportunity', () => {
    const suspendedOrgUser = {
      id: 'usr_org_susp_01',
      role: ROLES.ORGANIZATION,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
    };
    const approvedProfile = {
      userId: 'usr_org_susp_01',
      verificationStatus: KYC_STATUS.APPROVED,
    };

    const cap = checkPublishingCapability(suspendedOrgUser, approvedProfile);
    assert.strictEqual(cap.allowed, false, 'Suspended org must not publish even if profile was approved');
    assert.strictEqual(cap.statusCode, 403);
    assert.ok(cap.reason.toLowerCase().includes('suspended'));
  });

  runTest('GATE-03: Deactivated and Rejected organizations blocked from publishing', () => {
    const deactivatedUser = { id: 'usr_deact', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.DEACTIVATED };
    const rejectedProfile = { userId: 'usr_rej', verificationStatus: KYC_STATUS.REJECTED };
    const activeUser = { id: 'usr_rej', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };

    assert.strictEqual(checkPublishingCapability(deactivatedUser, { verificationStatus: KYC_STATUS.APPROVED }).allowed, false);
    assert.strictEqual(checkPublishingCapability(activeUser, rejectedProfile).allowed, false);
    assert.strictEqual(checkPublishingCapability(activeUser, { verificationStatus: KYC_STATUS.INFO_REQUESTED }).allowed, false);
  });

  runTest('GATE-04: Student and Unauthenticated users blocked from publishing opportunities', () => {
    const studentUser = { id: 'usr_stu_01', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    assert.strictEqual(checkPublishingCapability(studentUser, {}).allowed, false);
    assert.strictEqual(checkPublishingCapability(null, {}).allowed, false);
  });

  runTest('GATE-05: Approved & Active organization granted publishing capability', () => {
    const activeOrgUser = { id: 'usr_org_ok', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const approvedProfile = { userId: 'usr_org_ok', verificationStatus: KYC_STATUS.APPROVED };
    const cap = checkPublishingCapability(activeOrgUser, approvedProfile);
    assert.strictEqual(cap.allowed, true);
  });

  runTest('GATE-06: Admin granted unconditional publishing capability override', () => {
    const adminUser = { id: 'usr_admin', role: ROLES.ADMIN, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const cap = checkPublishingCapability(adminUser, null);
    assert.strictEqual(cap.allowed, true);
  });

  runTest('GATE-07: Candidate PII Masking: Single student profile masking for pending organization', () => {
    const studentCandidate = {
      id: 'stu_cand_01',
      userId: 'usr_stu_01',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.edu',
      phone: '+91 98765 43210',
      contactPhone: '+91 98765 43210',
      resumeUrl: 'https://docs.example.com/resumes/aarav.pdf',
      resumeLink: 'https://docs.example.com/resumes/aarav.pdf',
      resume: 'https://docs.example.com/resumes/aarav.pdf',
      linkedinUrl: 'https://linkedin.com/in/aarav-sharma',
      githubUrl: 'https://github.com/aarav',
      portfolioUrl: 'https://aarav.dev',
      skills: ['Python', 'SQL'],
    };

    const pendingCallerUser = { id: 'usr_pending_org', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const pendingOrgProfile = { userId: 'usr_pending_org', verificationStatus: KYC_STATUS.PENDING };

    const sanitized = maskCandidatePii(studentCandidate, pendingCallerUser, pendingOrgProfile);

    assert.strictEqual(sanitized.name, 'Aarav Sharma', 'Non-PII fields like name/skills remain readable');
    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER, 'Email must be masked');
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER, 'Phone must be masked');
    assert.strictEqual(sanitized.contactPhone, MASKED_PII_PLACEHOLDER, 'contactPhone must be masked');
    assert.strictEqual(sanitized.resumeUrl, MASKED_PII_PLACEHOLDER, 'resumeUrl must be masked');
    assert.strictEqual(sanitized.resumeLink, MASKED_PII_PLACEHOLDER, 'resumeLink must be masked');
    assert.strictEqual(sanitized.linkedinUrl, MASKED_PII_PLACEHOLDER, 'linkedinUrl must be masked');
    assert.strictEqual(sanitized.githubUrl, MASKED_PII_PLACEHOLDER, 'githubUrl must be masked');
    assert.strictEqual(sanitized.portfolioUrl, MASKED_PII_PLACEHOLDER, 'portfolioUrl must be masked');
    assert.strictEqual(sanitized.isPiiMasked, true);
  });

  runTest('GATE-08: Candidate PII Masking: Bulk array student candidate data masking', () => {
    const candidates = [
      { id: 'c1', name: 'Student 1', email: 's1@edu.in', phone: '11111' },
      { id: 'c2', name: 'Student 2', email: 's2@edu.in', phone: '22222' },
      { id: 'c3', name: 'Student 3', email: 's3@edu.in', phone: '33333' },
    ];
    const pendingUser = { id: 'usr_p', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const pendingProfile = { verificationStatus: KYC_STATUS.PENDING };

    const sanitizedList = maskCandidatePii(candidates, pendingUser, pendingProfile);
    assert.strictEqual(sanitizedList.length, 3);
    for (const c of sanitizedList) {
      assert.strictEqual(c.email, MASKED_PII_PLACEHOLDER);
      assert.strictEqual(c.phone, MASKED_PII_PLACEHOLDER);
      assert.strictEqual(c.isPiiMasked, true);
    }
  });

  runTest('GATE-09: Candidate PII Unmasking: Approved organization, Admin, and Student Self view unmasked PII', () => {
    const studentCandidate = {
      id: 'usr_stu_01',
      userId: 'usr_stu_01',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.edu',
      phone: '+91 98765 43210',
      resumeUrl: 'https://docs.example.com/resumes/aarav.pdf',
    };

    // 1. Approved Org
    const approvedOrgUser = { id: 'usr_appr_org', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const approvedProfile = { userId: 'usr_appr_org', verificationStatus: KYC_STATUS.APPROVED };
    const orgView = maskCandidatePii(studentCandidate, approvedOrgUser, approvedProfile);
    assert.strictEqual(orgView.email, 'aarav.sharma@example.edu');
    assert.strictEqual(orgView.phone, '+91 98765 43210');

    // 2. Admin
    const adminUser = { id: 'usr_adm', role: ROLES.ADMIN, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const adminView = maskCandidatePii(studentCandidate, adminUser, null);
    assert.strictEqual(adminView.email, 'aarav.sharma@example.edu');

    // 3. Student Self
    const studentSelf = { id: 'usr_stu_01', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const selfView = maskCandidatePii(studentCandidate, studentSelf, null);
    assert.strictEqual(selfView.email, 'aarav.sharma@example.edu');
  });

  await runTest('GATE-10: Body Tampering Attack: Pending org attempting to elevate verificationStatus during profile update is neutralized', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_tamper_org', role: 'ORGANIZATION', accountStatus: 'PENDING', onboardingStatus: 'IN_PROGRESS' },
    ];
    dbInstance.organizationProfiles = [
      { id: 'org_tamper', userId: 'usr_tamper_org', companyName: 'Sneaky Corp', verificationStatus: 'PENDING' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile',
      method: 'PATCH',
      headers: {
        'x-user-id': 'usr_tamper_org',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        userId: 'usr_tamper_org',
        companyName: 'Sneaky Corp Updated',
        verificationStatus: 'APPROVED', // Malicious attempt to self-approve
        accountStatus: 'ACTIVE',         // Malicious attempt to activate
        role: 'ADMIN',                   // Malicious attempt to elevate role
      },
    });

    const res = await orgProfileRoute.PATCH(req);
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.profile.companyName, 'Sneaky Corp Updated');
    assert.strictEqual(json.profile.verificationStatus, 'PENDING', 'Self-approval must be stripped and rejected');

    const freshDb = localDb.getDb();
    const org = freshDb.organizationProfiles.find(p => p.userId === 'usr_tamper_org');
    assert.strictEqual(org.verificationStatus, 'PENDING', 'DB verificationStatus must remain PENDING');
    const u = freshDb.users.find(x => x.id === 'usr_tamper_org');
    assert.strictEqual(u.role, 'ORGANIZATION', 'DB role must remain ORGANIZATION');
  });

  await runTest('GATE-11: Gatekeeping in Onboarding API: Incomplete onboarding submission is rejected with 400 Bad Request', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_onb_incomp', role: 'ORGANIZATION', accountStatus: 'PENDING', onboardingStatus: 'IN_PROGRESS' },
    ];
    dbInstance.organizationProfiles = [
      { id: 'org_incomp', userId: 'usr_onb_incomp', companyName: 'Incomplete Corp' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_onb_incomp',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        action: 'COMPLETE_ONBOARDING',
        profileData: {
          companyName: 'Incomplete Corp',
        },
      },
    });

    const res = await orgOnboardingRoute.POST(req);
    assert.strictEqual(res.status, 400, 'Incomplete onboarding submission must be rejected with 400');
    const json = await res.json();
    assert.ok(json.error.includes('Incomplete onboarding'));
  });

  await runTest('GATE-12: Gatekeeping in Onboarding API: Complete onboarding submission forces verificationStatus to PENDING', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_onb_org', role: 'ORGANIZATION', accountStatus: 'PENDING', onboardingStatus: 'IN_PROGRESS' },
    ];
    dbInstance.organizationProfiles = [
      {
        id: 'org_onb',
        userId: 'usr_onb_org',
        companyName: 'Fintech Solutions',
        companySize: '51-200',
        website: 'https://fintech.example.com',
        logoUrl: 'https://fintech.example.com/logo.png',
        registrationNumber: 'U72200KA2020PTC123456',
        taxIdGstin: '29AAAAA0000A1Z5',
        contactPhone: '+91 80 1234 5678',
        address: { city: 'Bengaluru', country: 'India' },
        industry: 'FinTech',
        hiringPreferences: { targetRoles: ['Developer'], hiringType: 'Full-time' },
        verificationDocs: [{ docType: 'COI', fileName: 'coi.pdf', fileUrl: 'https://docs.example.com/coi.pdf' }],
        verificationStatus: 'PENDING',
      },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_onb_org',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        action: 'COMPLETE_ONBOARDING',
        profileData: {
          companyName: 'Fintech Solutions Ltd',
          verificationStatus: 'APPROVED', // Attempt to forge approved status
        },
      },
    });

    const res = await orgOnboardingRoute.POST(req);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.verificationStatus, 'PENDING', 'Newly completed org onboarding MUST enter PENDING KYC review');
    assert.strictEqual(json.onboardingStatus, 'COMPLETED');
  });

  await runTest('GATE-13: Student Onboarding Gatekeeping: Incomplete student onboarding is rejected with 400 Bad Request', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_stu_incomp', role: 'STUDENT', accountStatus: 'ACTIVE', onboardingStatus: 'IN_PROGRESS' },
    ];
    dbInstance.studentProfiles = [
      { id: 'sp_incomp', userId: 'usr_stu_incomp', headline: 'Just a headline' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_stu_incomp',
        'x-user-role': 'STUDENT',
      },
      body: {
        action: 'COMPLETE_ONBOARDING',
        profileData: { headline: 'Just a headline' },
      },
    });

    const res = await studentOnboardingRoute.POST(req);
    assert.strictEqual(res.status, 400, 'Incomplete student onboarding must be rejected with 400');
    const json = await res.json();
    assert.ok(json.error.includes('Incomplete onboarding'));
  });

  await runTest('GATE-14: Student Onboarding Gatekeeping: Fully completed student profile transitions to COMPLETED', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_stu_full', role: 'STUDENT', accountStatus: 'ACTIVE', onboardingStatus: 'IN_PROGRESS' },
    ];
    dbInstance.studentProfiles = [
      {
        id: 'sp_full',
        userId: 'usr_stu_full',
        headline: 'Full Stack Engineer',
        bio: 'Passionate software engineer',
        instituteName: 'National Institute of Technology',
        department: 'Computer Science',
        degree: 'B.Tech',
        yearOfStudy: '4th Year',
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        projects: [{ title: 'Skill Bridge', description: 'Matching engine' }],
        certifications: [{ name: 'AWS Certified Developer' }],
        experience: [{ role: 'SDE Intern', company: 'TechLabs' }],
        careerPreferences: { preferredRoles: ['Full Stack Developer'] },
      },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_stu_full',
        'x-user-role': 'STUDENT',
      },
      body: {
        action: 'COMPLETE_ONBOARDING',
        profileData: {
          headline: 'Full Stack Software Engineer',
        },
      },
    });

    const res = await studentOnboardingRoute.POST(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.onboardingStatus, 'COMPLETED');
    assert.strictEqual(json.profileCompletion, 100);
  });

  // ==========================================================================
  // SECTION 2: ROUTE ACCESS & EDGE MIDDLEWARE BYPASS CHALLENGES
  // ==========================================================================
  console.log('\n--- SECTION 2: ROUTE ACCESS & EDGE MIDDLEWARE BYPASS CHALLENGES ---');

  runTest('ROUTE-01: Student accessing /admin/* is blocked and redirected to /student/dashboard', () => {
    const studentReq = createMockRequest({
      url: 'http://localhost:3000/admin/dashboard',
      headers: {
        'x-user-id': 'usr_stu_01',
        'x-user-role': 'STUDENT',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'COMPLETED',
      },
    });

    const res = middleware(studentReq);
    assert.ok(res, 'Middleware must return a response');
    assert.strictEqual(res.status, 307, 'Must redirect unauthorized role');
    const location = res.headers.get('location');
    assert.ok(location.includes('/student/dashboard'), `Expected redirect to /student/dashboard, got ${location}`);
  });

  runTest('ROUTE-02: Student accessing /organization/* is blocked and redirected to /student/dashboard', () => {
    const studentReq = createMockRequest({
      url: 'http://localhost:3000/organization/dashboard',
      headers: {
        'x-user-id': 'usr_stu_01',
        'x-user-role': 'STUDENT',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'COMPLETED',
      },
    });

    const res = middleware(studentReq);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location.includes('/student/dashboard'), `Expected redirect to /student/dashboard, got ${location}`);
  });

  runTest('ROUTE-03: Organization accessing /student/* is blocked and redirected to /organization/dashboard', () => {
    const orgReq = createMockRequest({
      url: 'http://localhost:3000/student/dashboard',
      headers: {
        'x-user-id': 'usr_org_01',
        'x-user-role': 'ORGANIZATION',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'COMPLETED',
      },
    });

    const res = middleware(orgReq);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location.includes('/organization/dashboard'), `Expected redirect to /organization/dashboard, got ${location}`);
  });

  runTest('ROUTE-04: Organization accessing /admin/* is blocked and redirected to /organization/dashboard', () => {
    const orgReq = createMockRequest({
      url: 'http://localhost:3000/admin/verifications',
      headers: {
        'x-user-id': 'usr_org_01',
        'x-user-role': 'ORGANIZATION',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'COMPLETED',
      },
    });

    const res = middleware(orgReq);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location.includes('/organization/dashboard'), `Expected redirect to /organization/dashboard, got ${location}`);
  });

  runTest('ROUTE-05: Unauthenticated access to /admin/*, /organization/*, /student/* redirects to /login with redirect params', () => {
    const paths = ['/admin/dashboard', '/organization/dashboard', '/student/dashboard', '/recruiter/dashboard'];

    for (const path of paths) {
      const unauthReq = createMockRequest({ url: `http://localhost:3000${path}` });
      const res = middleware(unauthReq);
      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location');
      assert.ok(location.includes('/login'), `Unauthenticated path ${path} must redirect to /login`);
      assert.ok(location.includes('redirect='), `Must preserve redirect param for ${path}`);
    }
  });

  runTest('ROUTE-06: Suspended account attempting portal navigation is redirected to /account-suspended', () => {
    const suspReq = createMockRequest({
      url: 'http://localhost:3000/student/dashboard',
      headers: {
        'x-user-id': 'usr_stu_susp',
        'x-user-role': 'STUDENT',
        'x-account-status': 'SUSPENDED',
        'x-onboarding-status': 'COMPLETED',
      },
    });

    const res = middleware(suspReq);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location.includes('/account-suspended'), `Suspended account must be redirected to /account-suspended, got ${location}`);
  });

  runTest('ROUTE-07: Incomplete onboarding user accessing dashboard is redirected to onboarding wizard', () => {
    // 1. Incomplete Student
    const incompleteStudentReq = createMockRequest({
      url: 'http://localhost:3000/student/dashboard',
      headers: {
        'x-user-id': 'usr_stu_new',
        'x-user-role': 'STUDENT',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'IN_PROGRESS',
      },
    });
    const sRes = middleware(incompleteStudentReq);
    assert.strictEqual(sRes.status, 307);
    assert.ok(sRes.headers.get('location').includes('/student/onboarding'));

    // 2. Incomplete Organization
    const incompleteOrgReq = createMockRequest({
      url: 'http://localhost:3000/organization/dashboard',
      headers: {
        'x-user-id': 'usr_org_new',
        'x-user-role': 'ORGANIZATION',
        'x-account-status': 'ACTIVE',
        'x-onboarding-status': 'NOT_STARTED',
      },
    });
    const oRes = middleware(incompleteOrgReq);
    assert.strictEqual(oRes.status, 307);
    assert.ok(oRes.headers.get('location').includes('/organization/onboarding'));
  });

  await runTest('ROUTE-08: Vertical API Privilege Escalation: Student calling /api/admin/* endpoints receives 403 Forbidden', async () => {
    // A. Student invoking /api/admin/verifications
    const studentVerifReq = createMockRequest({
      url: 'http://localhost:3000/api/admin/verifications',
      method: 'GET',
      headers: { 'x-user-id': 'usr_stu_01', 'x-user-role': 'STUDENT' },
    });
    const vRes = await adminVerificationsRoute.GET(studentVerifReq);
    assert.strictEqual(vRes.status, 403, 'Student must receive 403 on admin verifications');

    // B. Student invoking /api/admin/users
    const studentUsersReq = createMockRequest({
      url: 'http://localhost:3000/api/admin/users',
      method: 'GET',
      headers: { 'x-user-id': 'usr_stu_01', 'x-user-role': 'STUDENT' },
    });
    const uRes = await adminUsersRoute.GET(studentUsersReq);
    assert.strictEqual(uRes.status, 403, 'Student must receive 403 on admin users');

    // C. Student invoking /api/admin/audit-logs
    const studentAuditReq = createMockRequest({
      url: 'http://localhost:3000/api/admin/audit-logs',
      method: 'GET',
      headers: { 'x-user-id': 'usr_stu_01', 'x-user-role': 'STUDENT' },
    });
    const aRes = await adminAuditLogsRoute.GET(studentAuditReq);
    assert.strictEqual(aRes.status, 403, 'Student must receive 403 on admin audit logs');
  });

  await runTest('ROUTE-09: Direct REST mutations on /api/admin/audit-logs are rejected with 405 Method Not Allowed', async () => {
    const postRes = await adminAuditLogsRoute.POST();
    assert.strictEqual(postRes.status, 405, 'POST on audit logs must be 405');

    const putRes = await adminAuditLogsRoute.PUT();
    assert.strictEqual(putRes.status, 405, 'PUT on audit logs must be 405');

    const delRes = await adminAuditLogsRoute.DELETE();
    assert.strictEqual(delRes.status, 405, 'DELETE on audit logs must be 405');
  });

  await runTest('ROUTE-10: Non-admin calling /api/admin/verifications PATCH to self-approve is rejected with 403', async () => {
    const orgReq = createMockRequest({
      url: 'http://localhost:3000/api/admin/verifications',
      method: 'PATCH',
      headers: {
        'x-user-id': 'usr_org_01',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        organizationId: 'usr_org_01',
        action: 'APPROVE',
      },
    });

    const res = await adminVerificationsRoute.PATCH(orgReq);
    assert.strictEqual(res.status, 403, 'Non-admin cannot execute KYC verification action');
  });

  await runTest('ROUTE-11: Non-admin calling /api/admin/users PATCH to unsuspend account is rejected with 403', async () => {
    const userReq = createMockRequest({
      url: 'http://localhost:3000/api/admin/users',
      method: 'PATCH',
      headers: {
        'x-user-id': 'usr_susp_01',
        'x-user-role': 'STUDENT',
      },
      body: {
        userId: 'usr_susp_01',
        accountStatus: 'ACTIVE',
      },
    });

    const res = await adminUsersRoute.PATCH(userReq);
    assert.strictEqual(res.status, 403, 'Non-admin cannot modify user account status');
  });

  // ==========================================================================
  // SECTION 3: INSECURE DIRECT OBJECT REFERENCE (IDOR) & OWNERSHIP CHALLENGES
  // ==========================================================================
  console.log('\n--- SECTION 3: INSECURE DIRECT OBJECT REFERENCE (IDOR) CHALLENGES ---');

  await runTest('IDOR-01: Organization A attempting to read Organization B profile receives 403 Forbidden', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.organizationProfiles = [
      { id: 'org_a', userId: 'usr_org_a', companyName: 'Alpha Corp' },
      { id: 'org_b', userId: 'usr_org_b', companyName: 'Beta Confidential Inc' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile?userId=usr_org_b',
      method: 'GET',
      headers: {
        'x-user-id': 'usr_org_a',
        'x-user-role': 'ORGANIZATION',
      },
    });

    const res = await orgProfileRoute.GET(req);
    assert.strictEqual(res.status, 403, 'Cross-tenant profile read must return 403 Forbidden');
    const json = await res.json();
    assert.ok(json.error.includes('Forbidden') || json.error.includes('another'));
  });

  await runTest('IDOR-02: Organization A attempting to modify Organization B profile receives 403 Forbidden', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.organizationProfiles = [
      { id: 'org_a', userId: 'usr_org_a', companyName: 'Alpha Corp' },
      { id: 'org_b', userId: 'usr_org_b', companyName: 'Beta Confidential Inc' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile',
      method: 'PATCH',
      headers: {
        'x-user-id': 'usr_org_a',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        userId: 'usr_org_b', // Malicious target
        companyName: 'Hacked by Alpha',
      },
    });

    const res = await orgProfileRoute.PATCH(req);
    assert.strictEqual(res.status, 403, 'Cross-tenant profile mutation must return 403 Forbidden');

    // Verify DB integrity
    const freshDb = localDb.getDb();
    const orgB = freshDb.organizationProfiles.find(p => p.userId === 'usr_org_b');
    assert.strictEqual(orgB.companyName, 'Beta Confidential Inc', 'Target profile must not be modified');
  });

  await runTest('IDOR-03: Student A attempting to read Student B profile receives 403 Forbidden', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.studentProfiles = [
      { id: 'sp_a', userId: 'usr_stu_a', headline: 'Student A' },
      { id: 'sp_b', userId: 'usr_stu_b', headline: 'Student B Private' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/profile?userId=usr_stu_b',
      method: 'GET',
      headers: {
        'x-user-id': 'usr_stu_a',
        'x-user-role': 'STUDENT',
      },
    });

    const res = await studentProfileRoute.GET(req);
    assert.strictEqual(res.status, 403, 'Cross-student profile inspection must return 403 Forbidden');
  });

  await runTest('IDOR-04: Student A attempting to modify Student B profile receives 403 Forbidden', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.studentProfiles = [
      { id: 'sp_a', userId: 'usr_stu_a', headline: 'Student A' },
      { id: 'sp_b', userId: 'usr_stu_b', headline: 'Student B Private' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/profile',
      method: 'PUT',
      headers: {
        'x-user-id': 'usr_stu_a',
        'x-user-role': 'STUDENT',
      },
      body: {
        userId: 'usr_stu_b', // Malicious target
        headline: 'Defaced by Student A',
      },
    });

    const res = await studentProfileRoute.PUT(req);
    assert.strictEqual(res.status, 403, 'Cross-student profile modification must return 403 Forbidden');

    const freshDb = localDb.getDb();
    const stuB = freshDb.studentProfiles.find(p => p.userId === 'usr_stu_b');
    assert.strictEqual(stuB.headline, 'Student B Private', 'Student B headline must remain untouched');
  });

  await runTest('IDOR-05: Cross-Role Attack: Student attempting to mutate Organization Profile receives 403 Forbidden', async () => {
    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_stu_01',
        'x-user-role': 'STUDENT',
      },
      body: {
        companyName: 'Fake Org By Student',
      },
    });

    const res = await orgProfileRoute.POST(req);
    assert.strictEqual(res.status, 403, 'Student must not create/edit organization profiles');
  });

  await runTest('IDOR-06: Cross-Role Attack: Organization attempting to mutate Student Profile receives 403 Forbidden', async () => {
    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/profile',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_org_01',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        headline: 'Org trying to be student',
      },
    });

    const res = await studentProfileRoute.POST(req);
    assert.strictEqual(res.status, 403, 'Organization must not create/edit student profiles');
  });

  await runTest('IDOR-07: Admin Governance Override: Admin permitted to inspect and update profiles across tenants', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_adm_01', role: 'ADMIN', accountStatus: 'ACTIVE' },
      { id: 'usr_org_t1', role: 'ORGANIZATION', accountStatus: 'ACTIVE' },
    ];
    dbInstance.organizationProfiles = [
      { id: 'org_t1', userId: 'usr_org_t1', companyName: 'Target Org', verificationStatus: 'PENDING' },
    ];
    localDb.saveDb(dbInstance);

    // Admin Reading Org Profile
    const readReq = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile?userId=usr_org_t1',
      method: 'GET',
      headers: {
        'x-user-id': 'usr_adm_01',
        'x-user-role': 'ADMIN',
      },
    });
    const readRes = await orgProfileRoute.GET(readReq);
    assert.strictEqual(readRes.status, 200, 'Admin must be able to inspect any org profile');
    const readJson = await readRes.json();
    assert.strictEqual(readJson.profile.companyName, 'Target Org');

    // Admin Updating Org Profile (including verificationStatus and adminNotes)
    const updateReq = createMockRequest({
      url: 'http://localhost:3000/api/organization/profile',
      method: 'PATCH',
      headers: {
        'x-user-id': 'usr_adm_01',
        'x-user-role': 'ADMIN',
      },
      body: {
        userId: 'usr_org_t1',
        verificationStatus: 'APPROVED',
        adminNotes: 'Verified via MCA portal by Admin',
      },
    });
    const updateRes = await orgProfileRoute.PATCH(updateReq);
    assert.strictEqual(updateRes.status, 200, 'Admin must be able to update org profile');
    const updateJson = await updateRes.json();
    assert.strictEqual(updateJson.profile.verificationStatus, 'APPROVED');
    assert.strictEqual(updateJson.profile.adminNotes, 'Verified via MCA portal by Admin');
  });

  await runTest('IDOR-08: Higher-Order Function withAuth enforces tenant ownership and rejects IDOR', async () => {
    const protectedMockHandler = withAuth(
      async (req, { user }) => {
        return { status: 200, data: `Access granted for user ${user.id}` };
      },
      {
        roles: ['ORGANIZATION'],
        checkOwnership: async (auth, req, params) => {
          const requestedId = req.headers.get('x-target-resource-owner');
          return auth.user.id === requestedId;
        },
      }
    );

    // 1. Authorized Owner Request
    const ownerReq = createMockRequest({
      headers: {
        'x-user-id': 'usr_org_owner',
        'x-user-role': 'ORGANIZATION',
        'x-target-resource-owner': 'usr_org_owner',
      },
    });
    const ownerRes = await protectedMockHandler(ownerReq);
    assert.strictEqual(ownerRes.status, 200);

    // 2. Adversarial IDOR Mismatch Request
    const attackerReq = createMockRequest({
      headers: {
        'x-user-id': 'usr_org_attacker',
        'x-user-role': 'ORGANIZATION',
        'x-target-resource-owner': 'usr_org_victim',
      },
    });
    const attackerRes = await protectedMockHandler(attackerReq);
    assert.strictEqual(attackerRes.status, 403);
    const attackerJson = await attackerRes.json();
    assert.strictEqual(attackerJson.code, 'IDOR_MISMATCH');
  });

  await runTest('IDOR-09: Org A attempting to hijack Org B onboarding by injecting userId in body is neutralized', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_org_attacker', role: 'ORGANIZATION', accountStatus: 'ACTIVE' },
      { id: 'usr_org_victim', role: 'ORGANIZATION', accountStatus: 'ACTIVE' },
    ];
    dbInstance.organizationProfiles = [
      { id: 'org_victim', userId: 'usr_org_victim', companyName: 'Victim Corp' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/organization/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_org_attacker',
        'x-user-role': 'ORGANIZATION',
      },
      body: {
        profileData: {
          userId: 'usr_org_victim', // Malicious attempt to hijack
          companyName: 'Attacker Hijacked Company',
        },
      },
    });

    const res = await orgOnboardingRoute.POST(req);
    assert.strictEqual(res.status, 200);

    const freshDb = localDb.getDb();
    const victim = freshDb.organizationProfiles.find(p => p.userId === 'usr_org_victim');
    assert.strictEqual(victim.companyName, 'Victim Corp', 'Victim profile must NOT be modified by attacker onboarding call');

    const attackerProfile = freshDb.organizationProfiles.find(p => p.userId === 'usr_org_attacker');
    assert.strictEqual(attackerProfile.companyName, 'Attacker Hijacked Company', 'Update must be bound to caller session only');
  });

  await runTest('IDOR-10: Student A attempting to hijack Student B onboarding by injecting userId in body is neutralized', async () => {
    const dbInstance = localDb.getDb();
    dbInstance.users = [
      { id: 'usr_stu_attacker', role: 'STUDENT', accountStatus: 'ACTIVE' },
      { id: 'usr_stu_victim', role: 'STUDENT', accountStatus: 'ACTIVE' },
    ];
    dbInstance.studentProfiles = [
      { id: 'sp_victim', userId: 'usr_stu_victim', headline: 'Victim Student Headline' },
    ];
    localDb.saveDb(dbInstance);

    const req = createMockRequest({
      url: 'http://localhost:3000/api/student/onboarding',
      method: 'POST',
      headers: {
        'x-user-id': 'usr_stu_attacker',
        'x-user-role': 'STUDENT',
      },
      body: {
        profileData: {
          userId: 'usr_stu_victim', // Malicious attempt to hijack
          headline: 'Attacker Injected Headline',
        },
      },
    });

    const res = await studentOnboardingRoute.POST(req);
    assert.strictEqual(res.status, 200);

    const freshDb = localDb.getDb();
    const victim = freshDb.studentProfiles.find(p => p.userId === 'usr_stu_victim');
    assert.strictEqual(victim.headline, 'Victim Student Headline', 'Victim profile must NOT be modified');

    const attackerProfile = freshDb.studentProfiles.find(p => p.userId === 'usr_stu_attacker');
    assert.strictEqual(attackerProfile.headline, 'Attacker Injected Headline', 'Update must be bound to caller session only');
  });

  // Summary
  console.log('\n======================================================================');
  console.log(`TOTAL ADVERSARIAL TESTS : ${totalTests}`);
  console.log(`PASSED TESTS            : ${passedTests}`);
  console.log(`FAILED TESTS            : ${failureList.length}`);
  console.log('======================================================================');

  if (failureList.length > 0) {
    console.error('\nFAILED ADVERSARIAL CHALLENGES:');
    failureList.forEach(f => {
      console.error(`- ${f.testName}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✔ ALL ADVERSARIAL CHALLENGES CONFIRMED ROBUST & PASSED EMPIRICALLY!');
    process.exit(0);
  }
}

runAllAdversarialTests().catch(err => {
  console.error('Unhandled harness error:', err);
  process.exit(1);
});
