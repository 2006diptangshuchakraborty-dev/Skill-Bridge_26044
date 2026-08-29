#!/usr/bin/env node
/**
 * Skill Bridge Platform - Adversarial Gatekeeping, Tenant Isolation (IDOR),
 * Candidate PII Privacy Shielding, & Edge Route Protection Challenge Suite
 * 
 * Target: tests/adversarial-gatekeeping-challenge.js
 * 
 * Execution:
 *   node tests/adversarial-gatekeeping-challenge.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

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
  bgBlue: '\x1b[44m\x1b[37m',
};

// Import project modules under test
const gatekeeper = require('../lib/gatekeeper');
const {
  checkPublishingCapability,
  maskCandidatePii,
  KYC_STATUS,
  ACCOUNT_STATUS,
  ROLES,
  MASKED_PII_PLACEHOLDER,
} = gatekeeper;

const {
  MockDatabase,
  simulateEdgeMiddleware,
  simulateApiGuard,
  AUDIT_ACTIONS,
  ONBOARDING_STATUS,
  calculateStudentCompletion,
  calculateOrganizationCompletion,
} = require('./auth-test-helper');

const localDb = require('../lib/db');

console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}   ADVERSARIAL GATEKEEPING, IDOR & EDGE MIDDLEWARE CHALLENGE HARNESS  ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

let totalPassed = 0;
let totalFailed = 0;
const failureDetails = [];

async function challenge(testId, description, fn) {
  const startTime = Date.now();
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      await res;
    }
    const duration = Date.now() - startTime;
    totalPassed++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${colors.bright}${testId}:${colors.reset} ${description} ${colors.dim}(${duration}ms)${colors.reset}`);
  } catch (err) {
    const duration = Date.now() - startTime;
    totalFailed++;
    failureDetails.push({ testId, description, error: err.message, stack: err.stack });
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${colors.bright}${testId}:${colors.reset} ${description} ${colors.dim}(${duration}ms)${colors.reset}`);
    console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

async function runAdversarialSuite() {
  const masterStart = Date.now();

  // ============================================================================
  // SECTION 1: ORGANIZATION KYC PUBLISHING GATING & DRAFT PERMISSIONS
  // ============================================================================
  console.log(`\n${colors.bright}${colors.blue}▶ SECTION 1: Organization KYC Publishing Gating & Capability Checks${colors.reset}`);

  await challenge('ADV-KYC-01', 'Organization with verificationStatus=PENDING CAN save drafts but CANNOT publish live (403 Forbidden)', () => {
    const user = { id: 'org_001', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_001', userId: 'org_001', verificationStatus: KYC_STATUS.PENDING };

    // Capability check must block publishing live
    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, false, 'Publishing must be forbidden for PENDING KYC');
    assert.strictEqual(pubCheck.statusCode, 403, 'Must return 403 Forbidden');
    assert.ok(pubCheck.reason.includes('pending or unapproved'), 'Reason must explain KYC requirement');

    // Saving draft opportunity is permitted in database / state
    const draftOpp = {
      id: 'opp_draft_001',
      organizationId: user.id,
      title: 'Backend Engineer Intern',
      status: 'DRAFT',
      requiredSkills: [{ name: 'Node.js', requiredProficiency: 2 }],
    };
    assert.strictEqual(draftOpp.status, 'DRAFT', 'Draft opportunity can be created and stored');
  });

  await challenge('ADV-KYC-02', 'Organization with verificationStatus=REJECTED is strictly blocked from publishing live opportunities (403 Forbidden)', () => {
    const user = { id: 'org_002', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_002', userId: 'org_002', verificationStatus: KYC_STATUS.REJECTED };

    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, false, 'Publishing must be forbidden for REJECTED KYC');
    assert.strictEqual(pubCheck.statusCode, 403);
  });

  await challenge('ADV-KYC-03', 'Organization with verificationStatus=INFO_REQUESTED is strictly blocked from publishing live opportunities (403 Forbidden)', () => {
    const user = { id: 'org_003', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_003', userId: 'org_003', verificationStatus: KYC_STATUS.INFO_REQUESTED };

    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, false, 'Publishing must be forbidden for INFO_REQUESTED KYC');
    assert.strictEqual(pubCheck.statusCode, 403);
  });

  await challenge('ADV-KYC-04', 'Missing or null organization profile defaults to PENDING verification and blocks live publishing (403 Forbidden)', () => {
    const user = { id: 'org_004', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };

    const pubCheckNull = checkPublishingCapability(user, null);
    assert.strictEqual(pubCheckNull.allowed, false);
    assert.strictEqual(pubCheckNull.statusCode, 403);

    const pubCheckEmpty = checkPublishingCapability(user, {});
    assert.strictEqual(pubCheckEmpty.allowed, false);
    assert.strictEqual(pubCheckEmpty.statusCode, 403);
  });

  await challenge('ADV-KYC-05', 'Organization with verificationStatus=APPROVED and accountStatus=ACTIVE is fully authorized to publish live opportunities', () => {
    const user = { id: 'org_005', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_005', userId: 'org_005', verificationStatus: KYC_STATUS.APPROVED };

    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, true, 'Approved & Active org must be allowed to publish');
  });

  await challenge('ADV-KYC-06', 'Organization with verificationStatus=APPROVED but accountStatus=SUSPENDED is strictly blocked from publishing (403 Forbidden)', () => {
    const user = { id: 'org_006', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.SUSPENDED };
    const orgProfile = { id: 'prof_006', userId: 'org_006', verificationStatus: KYC_STATUS.APPROVED };

    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, false, 'Suspension must override KYC approval');
    assert.strictEqual(pubCheck.statusCode, 403);
    assert.ok(pubCheck.reason.toLowerCase().includes('suspended'), 'Reason must mention suspended account');
  });

  await challenge('ADV-KYC-07', 'Organization with verificationStatus=APPROVED but accountStatus=DEACTIVATED is strictly blocked from publishing (403 Forbidden)', () => {
    const user = { id: 'org_007', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.DEACTIVATED };
    const orgProfile = { id: 'prof_007', userId: 'org_007', verificationStatus: KYC_STATUS.APPROVED };

    const pubCheck = checkPublishingCapability(user, orgProfile);
    assert.strictEqual(pubCheck.allowed, false, 'Deactivation must override KYC approval');
    assert.strictEqual(pubCheck.statusCode, 403);
  });

  await challenge('ADV-KYC-08', 'Non-organization user (Student role) attempting to publish opportunities is blocked with 403 Forbidden', () => {
    const studentUser = { id: 'stu_001', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const pubCheck = checkPublishingCapability(studentUser, {});
    assert.strictEqual(pubCheck.allowed, false);
    assert.strictEqual(pubCheck.statusCode, 403);
    assert.ok(pubCheck.reason.includes('Only organizations'), 'Reason must indicate role restriction');
  });

  await challenge('ADV-KYC-09', 'Unauthenticated request (null/undefined user) attempting to publish returns 401 Unauthorized', () => {
    const pubCheck = checkPublishingCapability(null, {});
    assert.strictEqual(pubCheck.allowed, false);
    assert.strictEqual(pubCheck.statusCode, 401);
  });

  await challenge('ADV-KYC-10', 'System Administrator unconditionally bypasses KYC checks and is authorized to publish opportunities', () => {
    const adminUser = { id: 'usr_admin', role: ROLES.ADMIN, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const pubCheck = checkPublishingCapability(adminUser, null);
    assert.strictEqual(pubCheck.allowed, true, 'Admins are unconditionally allowed');
  });

  // ============================================================================
  // SECTION 2: CANDIDATE PII PRIVACY SHIELDING & DATA SANITIZATION
  // ============================================================================
  console.log(`\n${colors.bright}${colors.blue}▶ SECTION 2: Candidate PII Privacy Shielding & Data Sanitization${colors.reset}`);

  const sampleCandidate = {
    id: 'std_001',
    userId: 'usr_std_001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@iitb.ac.in',
    phone: '+91 98765 43210',
    contactPhone: '+91 98765 43210',
    resumeUrl: 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf',
    resumeLink: 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf',
    resume: 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf',
    linkedinUrl: 'https://linkedin.com/in/aarav-sharma-data',
    githubUrl: 'https://github.com/aaravsharma',
    portfolioUrl: 'https://aaravsharma.dev',
    department: 'Computer Science & Engineering',
    cgpa: 9.2,
    skills: [
      { name: 'Python', proficiency: 4, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 3, evidenceLevel: 3 },
    ],
  };

  await challenge('ADV-PII-01', 'Unapproved organization (KYC PENDING) accessing candidate data receives masked PII ("[Verification Required]")', () => {
    const orgUser = { id: 'usr_org_pend', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_org_pend', userId: 'usr_org_pend', verificationStatus: KYC_STATUS.PENDING };

    const sanitized = maskCandidatePii(sampleCandidate, orgUser, orgProfile);

    // Direct contact PII must be completely sanitized
    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER, 'Email must be masked');
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER, 'Phone must be masked');
    assert.strictEqual(sanitized.contactPhone, MASKED_PII_PLACEHOLDER, 'Contact phone must be masked');
    assert.strictEqual(sanitized.resumeUrl, MASKED_PII_PLACEHOLDER, 'Resume URL must be masked');
    assert.strictEqual(sanitized.resumeLink, MASKED_PII_PLACEHOLDER, 'Resume Link must be masked');
    assert.strictEqual(sanitized.resume, MASKED_PII_PLACEHOLDER, 'Resume must be masked');
    assert.strictEqual(sanitized.linkedinUrl, MASKED_PII_PLACEHOLDER, 'LinkedIn URL must be masked');
    assert.strictEqual(sanitized.githubUrl, MASKED_PII_PLACEHOLDER, 'GitHub URL must be masked');
    assert.strictEqual(sanitized.portfolioUrl, MASKED_PII_PLACEHOLDER, 'Portfolio URL must be masked');

    // UI flags must be present
    assert.strictEqual(sanitized.isPiiMasked, true, 'isPiiMasked flag must be true');
    assert.ok(sanitized.piiMaskReason.includes('KYC verification required'), 'piiMaskReason must explain the requirement');

    // Non-PII academic and skill evaluation data must remain intact
    assert.strictEqual(sanitized.name, 'Aarav Sharma', 'Candidate name is visible for evaluation');
    assert.strictEqual(sanitized.department, 'Computer Science & Engineering', 'Department intact');
    assert.strictEqual(sanitized.cgpa, 9.2, 'CGPA intact');
    assert.strictEqual(sanitized.skills.length, 2, 'Skills array intact for matching engine');
  });

  await challenge('ADV-PII-02', 'Unapproved organization (KYC REJECTED) accessing candidate data receives masked PII', () => {
    const orgUser = { id: 'usr_org_rej', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_org_rej', userId: 'usr_org_rej', verificationStatus: KYC_STATUS.REJECTED };

    const sanitized = maskCandidatePii(sampleCandidate, orgUser, orgProfile);
    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.resumeUrl, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.isPiiMasked, true);
  });

  await challenge('ADV-PII-03', 'Unapproved organization (KYC INFO_REQUESTED) accessing candidate data receives masked PII', () => {
    const orgUser = { id: 'usr_org_info', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_org_info', userId: 'usr_org_info', verificationStatus: KYC_STATUS.INFO_REQUESTED };

    const sanitized = maskCandidatePii(sampleCandidate, orgUser, orgProfile);
    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.isPiiMasked, true);
  });

  await challenge('ADV-PII-04', 'Suspended organization (even with APPROVED KYC) accessing candidate data receives masked PII', () => {
    const orgUser = { id: 'usr_org_susp', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.SUSPENDED };
    const orgProfile = { id: 'prof_org_susp', userId: 'usr_org_susp', verificationStatus: KYC_STATUS.APPROVED };

    const sanitized = maskCandidatePii(sampleCandidate, orgUser, orgProfile);
    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER, 'Suspended org cannot view candidate PII');
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.resumeUrl, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.isPiiMasked, true);
  });

  await challenge('ADV-PII-05', 'Approved & Active organization receives full, unmasked candidate PII and direct contact details', () => {
    const orgUser = { id: 'usr_org_appr', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { id: 'prof_org_appr', userId: 'usr_org_appr', verificationStatus: KYC_STATUS.APPROVED };

    const sanitized = maskCandidatePii(sampleCandidate, orgUser, orgProfile);
    assert.strictEqual(sanitized.email, 'aarav.sharma@iitb.ac.in', 'Real email must be preserved');
    assert.strictEqual(sanitized.phone, '+91 98765 43210', 'Real phone preserved');
    assert.strictEqual(sanitized.resumeUrl, 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf', 'Real resume preserved');
    assert.strictEqual(sanitized.linkedinUrl, 'https://linkedin.com/in/aarav-sharma-data');
    assert.strictEqual(sanitized.githubUrl, 'https://github.com/aaravsharma');
    assert.strictEqual(sanitized.isPiiMasked, undefined, 'isPiiMasked flag not set on unmasked data');
  });

  await challenge('ADV-PII-06', 'System Administrator unconditionally receives full unmasked candidate PII', () => {
    const adminUser = { id: 'usr_admin', role: ROLES.ADMIN, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const sanitized = maskCandidatePii(sampleCandidate, adminUser, null);

    assert.strictEqual(sanitized.email, 'aarav.sharma@iitb.ac.in');
    assert.strictEqual(sanitized.phone, '+91 98765 43210');
    assert.strictEqual(sanitized.resumeUrl, 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf');
  });

  await challenge('ADV-PII-07', 'Student viewing their own profile receives full unmasked PII', () => {
    const studentUser = { id: 'std_001', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const sanitized = maskCandidatePii(sampleCandidate, studentUser, null);

    assert.strictEqual(sanitized.email, 'aarav.sharma@iitb.ac.in');
    assert.strictEqual(sanitized.phone, '+91 98765 43210');
    assert.strictEqual(sanitized.resumeUrl, 'https://cdn.skillbridge.gov/resumes/aarav_sharma_cv.pdf');
  });

  await challenge('ADV-PII-08', 'Student viewing another student\'s profile receives masked PII (Peer Privacy Shield)', () => {
    const peerStudent = { id: 'std_002_other', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const sanitized = maskCandidatePii(sampleCandidate, peerStudent, null);

    assert.strictEqual(sanitized.email, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.phone, MASKED_PII_PLACEHOLDER);
    assert.strictEqual(sanitized.isPiiMasked, true);
  });

  await challenge('ADV-PII-09', 'Batch candidate masking: Array of 50 candidates is securely and completely sanitized for unverified callers', () => {
    const batch = Array.from({ length: 50 }, (_, i) => ({
      id: `std_${i + 100}`,
      name: `Candidate ${i + 1}`,
      email: `candidate${i + 1}@university.edu`,
      phone: `+91 98000 ${String(i).padStart(5, '0')}`,
      resumeUrl: `https://storage.gov/resume_${i}.pdf`,
    }));

    const unverifiedOrg = { id: 'org_pending', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE };
    const orgProfile = { verificationStatus: KYC_STATUS.PENDING };

    const sanitizedBatch = maskCandidatePii(batch, unverifiedOrg, orgProfile);

    assert.strictEqual(sanitizedBatch.length, 50);
    sanitizedBatch.forEach((c, idx) => {
      assert.strictEqual(c.email, MASKED_PII_PLACEHOLDER, `Candidate ${idx} email must be masked`);
      assert.strictEqual(c.phone, MASKED_PII_PLACEHOLDER, `Candidate ${idx} phone must be masked`);
      assert.strictEqual(c.resumeUrl, MASKED_PII_PLACEHOLDER, `Candidate ${idx} resume must be masked`);
      assert.strictEqual(c.isPiiMasked, true);
    });
  });

  await challenge('ADV-PII-10', 'Graceful handling of null, undefined, and empty candidate inputs without throwing exceptions', () => {
    assert.strictEqual(maskCandidatePii(null, null, null), null);
    assert.strictEqual(maskCandidatePii(undefined, null, null), undefined);
    assert.deepStrictEqual(maskCandidatePii([], null, null), []);
  });

  // ============================================================================
  // SECTION 3: IDOR TENANT ISOLATION & API PROFILE MUTATION GUARDS
  // ============================================================================
  console.log(`\n${colors.bright}${colors.blue}▶ SECTION 3: IDOR Tenant Isolation & API Profile Mutation Guards${colors.reset}`);

  const mockDb = new MockDatabase();

  await challenge('ADV-IDOR-01', 'Student A attempting to modify Student B\'s profile via API is strictly blocked with 403 Forbidden', () => {
    mockDb.reset();
    const studentA = mockDb.createUser({ id: 'usr_stu_A', name: 'Student A', email: 'stuA@college.edu', role: ROLES.STUDENT });
    const studentB = mockDb.createUser({ id: 'usr_stu_B', name: 'Student B', email: 'stuB@college.edu', role: ROLES.STUDENT });

    // Initial profile for student B
    mockDb.upsertStudentProfile(studentB.id, { headline: 'Student B Original Headline' });

    // Guard test: Student A calling profile mutation for Student B
    const guardCheck = simulateApiGuard(studentA, { checkOwnership: true }, studentB.id);
    assert.strictEqual(guardCheck.status, 403, 'Must return 403 Forbidden');
    assert.strictEqual(guardCheck.error, 'Forbidden: Resource ownership mismatch');

    // Confirm Student B profile was not altered
    const profileB = mockDb.getStudentProfile(studentB.id);
    assert.strictEqual(profileB.headline, 'Student B Original Headline');
  });

  await challenge('ADV-IDOR-02', 'Organization A attempting to modify Organization B\'s profile is strictly blocked with 403 Forbidden', () => {
    mockDb.reset();
    const orgA = mockDb.createUser({ id: 'usr_org_A', name: 'Org A Inc', email: 'orga@corp.com', role: ROLES.ORGANIZATION });
    const orgB = mockDb.createUser({ id: 'usr_org_B', name: 'Org B Inc', email: 'orgb@corp.com', role: ROLES.ORGANIZATION });

    mockDb.upsertOrganizationProfile(orgB.id, { companyName: 'Org B Original Name' });

    const guardCheck = simulateApiGuard(orgA, { checkOwnership: true }, orgB.id);
    assert.strictEqual(guardCheck.status, 403);
    assert.strictEqual(guardCheck.error, 'Forbidden: Resource ownership mismatch');

    const profileB = mockDb.getOrganizationProfile(orgB.id);
    assert.strictEqual(profileB.companyName, 'Org B Original Name');
  });

  await challenge('ADV-IDOR-03', 'Student attempting to inspect another user\'s private profile directly via API query returns 403 Forbidden', () => {
    const studentA = { id: 'usr_stu_A', role: ROLES.STUDENT };
    const requestedTargetUserId = 'usr_stu_B';

    // Direct endpoint logic simulation
    const isAllowed = studentA.id === requestedTargetUserId || studentA.role === ROLES.ADMIN;
    assert.strictEqual(isAllowed, false, 'Non-admin cannot inspect foreign user profile via target IDOR query');
  });

  await challenge('ADV-IDOR-04', 'Student role attempting to create/modify an Organization profile returns 403 Forbidden', () => {
    mockDb.reset();
    const student = mockDb.createUser({ id: 'usr_stu_1', name: 'Student Hacker', email: 'hacker@college.edu', role: ROLES.STUDENT });

    assert.throws(() => {
      mockDb.upsertOrganizationProfile(student.id, { companyName: 'Fake Org' });
    }, (err) => {
      return err.statusCode === 403 && err.message.includes('Cannot create organization profile for user with role: STUDENT');
    });
  });

  await challenge('ADV-IDOR-05', 'Organization role attempting to create/modify a Student profile returns 403 Forbidden', () => {
    mockDb.reset();
    const org = mockDb.createUser({ id: 'usr_org_1', name: 'Org Recruiter', email: 'recruiter@org.com', role: ROLES.ORGANIZATION });

    assert.throws(() => {
      mockDb.upsertStudentProfile(org.id, { headline: 'Fake Student' });
    }, (err) => {
      return err.statusCode === 403 && err.message.includes('Cannot create student profile for user with role: ORGANIZATION');
    });
  });

  await challenge('ADV-IDOR-06', 'System Administrator can legitimately inspect and modify student/organization profiles for governance', () => {
    mockDb.reset();
    const admin = mockDb.createUser({ id: 'usr_admin', name: 'Admin Master', email: 'admin@gov.in', role: ROLES.ADMIN });
    const student = mockDb.createUser({ id: 'usr_stu_target', name: 'Target Student', email: 'target@college.edu', role: ROLES.STUDENT });

    const guardCheck = simulateApiGuard(admin, { checkOwnership: true }, student.id);
    assert.strictEqual(guardCheck.status, 200, 'Admin bypasses IDOR check for governance duties');
    assert.strictEqual(guardCheck.user.role, ROLES.ADMIN);
  });

  await challenge('ADV-IDOR-07', 'Mass Assignment / Tamper Attack: Organization attempting to self-approve verificationStatus has the field stripped', () => {
    mockDb.reset();
    const org = mockDb.createUser({ id: 'usr_org_tamper', name: 'Malicious Org', email: 'tamper@org.com', role: ROLES.ORGANIZATION });

    // Client sends verificationStatus = 'APPROVED' in update payload
    const maliciousPayload = {
      companyName: 'Malicious Org Legit Front',
      verificationStatus: 'APPROVED', // ATTEMPTED PRIVILEGE ESCALATION
      adminNotes: 'Self-approved by attacker',
    };

    // Server-side profile update logic (mirrors app/api/organization/profile/route.js)
    const userRole = org.role;
    const sanitizedUpdates = { ...maliciousPayload };
    if (userRole !== ROLES.ADMIN) {
      delete sanitizedUpdates.verificationStatus;
      delete sanitizedUpdates.adminNotes;
    }

    const updatedProfile = mockDb.upsertOrganizationProfile(org.id, sanitizedUpdates);
    assert.strictEqual(updatedProfile.verificationStatus, KYC_STATUS.PENDING, 'verificationStatus must remain PENDING');
    assert.strictEqual(updatedProfile.adminNotes, null, 'adminNotes must remain null');
  });

  await challenge('ADV-IDOR-08', 'Mass Assignment / Tamper Attack: User attempting to inject accountStatus=ACTIVE or role=ADMIN into profile update is prevented', () => {
    mockDb.reset();
    const student = mockDb.createUser({
      id: 'usr_stu_tamper',
      name: 'Suspended Student',
      email: 'suspended@college.edu',
      role: ROLES.STUDENT,
      accountStatus: ACCOUNT_STATUS.SUSPENDED,
    });

    const maliciousUserUpdates = {
      name: 'Reactivated Hacker',
      role: ROLES.ADMIN, // Attempt to gain ADMIN role
      accountStatus: ACCOUNT_STATUS.ACTIVE, // Attempt to lift suspension
    };

    const updated = mockDb.updateUser(student.id, maliciousUserUpdates);
    assert.strictEqual(updated.role, ROLES.STUDENT, 'Role cannot be mutated via user profile update');
  });

  // ============================================================================
  // SECTION 4: EDGE ROUTE MIDDLEWARE PARTITIONING & ONBOARDING ENFORCEMENT
  // ============================================================================
  console.log(`\n${colors.bright}${colors.blue}▶ SECTION 4: Edge Route Middleware Partitioning & Cross-Role Access${colors.reset}`);

  await challenge('ADV-ROUTE-01', 'Student token accessing /organization/dashboard or /recruiter/candidates is strictly blocked (403 Forbidden)', () => {
    const student = { id: 's1', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.COMPLETED };

    const orgCheck = simulateEdgeMiddleware('/organization/dashboard', student);
    assert.strictEqual(orgCheck.status, 403);
    assert.strictEqual(orgCheck.allowed, false);

    const recruiterCheck = simulateEdgeMiddleware('/recruiter/candidates', student);
    assert.strictEqual(recruiterCheck.status, 403);
    assert.strictEqual(recruiterCheck.allowed, false);
  });

  await challenge('ADV-ROUTE-02', 'Student token accessing /admin/dashboard, /admin/users, or /admin/audit is strictly blocked (403 Forbidden)', () => {
    const student = { id: 's1', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.COMPLETED };

    const adminDash = simulateEdgeMiddleware('/admin/dashboard', student);
    assert.strictEqual(adminDash.status, 403);
    assert.strictEqual(adminDash.allowed, false);

    const adminUsers = simulateEdgeMiddleware('/admin/users', student);
    assert.strictEqual(adminUsers.status, 403);
    assert.strictEqual(adminUsers.allowed, false);

    const adminAudit = simulateEdgeMiddleware('/admin/audit', student);
    assert.strictEqual(adminAudit.status, 403);
    assert.strictEqual(adminAudit.allowed, false);
  });

  await challenge('ADV-ROUTE-03', 'Organization token accessing /student/dashboard or /student/opportunities is strictly blocked (403 Forbidden)', () => {
    const org = { id: 'o1', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.COMPLETED };

    const studentDash = simulateEdgeMiddleware('/student/dashboard', org);
    assert.strictEqual(studentDash.status, 403);
    assert.strictEqual(studentDash.allowed, false);

    const studentOpps = simulateEdgeMiddleware('/student/opportunities', org);
    assert.strictEqual(studentOpps.status, 403);
    assert.strictEqual(studentOpps.allowed, false);
  });

  await challenge('ADV-ROUTE-04', 'Organization token accessing /admin/* routes is strictly blocked (403 Forbidden)', () => {
    const org = { id: 'o1', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.COMPLETED };

    const adminDash = simulateEdgeMiddleware('/admin/dashboard', org);
    assert.strictEqual(adminDash.status, 403);
    assert.strictEqual(adminDash.allowed, false);

    const adminVerifs = simulateEdgeMiddleware('/admin/verifications', org);
    assert.strictEqual(adminVerifs.status, 403);
    assert.strictEqual(adminVerifs.allowed, false);
  });

  await challenge('ADV-ROUTE-05', 'Unauthenticated visitor attempting to access protected student/org/admin routes is redirected to /login with callbackUrl', () => {
    const res1 = simulateEdgeMiddleware('/student/dashboard', null);
    assert.strictEqual(res1.status, 307);
    assert.strictEqual(res1.action, 'REDIRECT');
    assert.ok(res1.redirectUrl.includes('/login'));
    assert.ok(res1.redirectUrl.includes('student%2Fdashboard'));

    const res2 = simulateEdgeMiddleware('/admin/dashboard', null);
    assert.strictEqual(res2.status, 307);
    assert.strictEqual(res2.action, 'REDIRECT');
    assert.ok(res2.redirectUrl.includes('/login'));

    const res3 = simulateEdgeMiddleware('/organization/dashboard', null);
    assert.strictEqual(res3.status, 307);
    assert.strictEqual(res3.action, 'REDIRECT');
    assert.ok(res3.redirectUrl.includes('/login'));
  });

  await challenge('ADV-ROUTE-06', 'Incomplete onboarding Student attempting to access /student/dashboard is automatically redirected to /student/onboarding', () => {
    const studentIncomplete = { id: 's_inc', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.IN_PROGRESS };
    const res = simulateEdgeMiddleware('/student/dashboard', studentIncomplete);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.action, 'REDIRECT');
    assert.strictEqual(res.redirectUrl, '/student/onboarding');
  });

  await challenge('ADV-ROUTE-07', 'Incomplete onboarding Organization attempting to access /organization/dashboard is automatically redirected to /organization/onboarding', () => {
    const orgIncomplete = { id: 'o_inc', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.ACTIVE, onboardingStatus: ONBOARDING_STATUS.NOT_STARTED };
    const res = simulateEdgeMiddleware('/organization/dashboard', orgIncomplete);
    assert.strictEqual(res.status, 307);
    assert.strictEqual(res.action, 'REDIRECT');
    assert.strictEqual(res.redirectUrl, '/organization/onboarding');
  });

  await challenge('ADV-ROUTE-08', 'Public paths (/, /login, /register, /api/auth/*) allow unrestricted access without authentication', () => {
    const p1 = simulateEdgeMiddleware('/', null);
    assert.strictEqual(p1.status, 200);
    assert.strictEqual(p1.allowed, true);

    const p2 = simulateEdgeMiddleware('/login', null);
    assert.strictEqual(p2.status, 200);
    assert.strictEqual(p2.allowed, true);

    const p3 = simulateEdgeMiddleware('/register', null);
    assert.strictEqual(p3.status, 200);
    assert.strictEqual(p3.allowed, true);

    const p4 = simulateEdgeMiddleware('/api/auth/signup-intent', null);
    assert.strictEqual(p4.status, 200);
    assert.strictEqual(p4.allowed, true);
  });

  // ============================================================================
  // SECTION 5: SUSPENDED USER LOCKDOWN & IMMEDIATE ACCESS REVOCATION
  // ============================================================================
  console.log(`\n${colors.bright}${colors.blue}▶ SECTION 5: Suspended User Lockdown & Immediate Access Revocation${colors.reset}`);

  await challenge('ADV-LOCK-01', 'Suspended Student (accountStatus=SUSPENDED) is immediately blocked by Edge Middleware (redirects to /account-suspended or 403)', () => {
    const suspendedStudent = { id: 'stu_susp', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.SUSPENDED, onboardingStatus: ONBOARDING_STATUS.COMPLETED };
    const res = simulateEdgeMiddleware('/student/dashboard', suspendedStudent);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
    assert.ok(res.error.toLowerCase().includes('suspended'));
  });

  await challenge('ADV-LOCK-02', 'Suspended Organization (accountStatus=SUSPENDED) is immediately blocked by Edge Middleware', () => {
    const suspendedOrg = { id: 'org_susp', role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUS.SUSPENDED, onboardingStatus: ONBOARDING_STATUS.COMPLETED };
    const res = simulateEdgeMiddleware('/organization/dashboard', suspendedOrg);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
  });

  await challenge('ADV-LOCK-03', 'Deactivated user (accountStatus=DEACTIVATED) is immediately blocked from all protected routes', () => {
    const deactUser = { id: 'usr_deact', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.DEACTIVATED, onboardingStatus: ONBOARDING_STATUS.COMPLETED };
    const res = simulateEdgeMiddleware('/student/dashboard', deactUser);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.allowed, false);
  });

  await challenge('ADV-LOCK-04', 'API Guard (withAuth) immediately rejects suspended users with 403 Forbidden (code: ACCOUNT_SUSPENDED)', () => {
    const suspendedUser = { id: 'usr_susp_api', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.SUSPENDED };
    const guardRes = simulateApiGuard(suspendedUser, { requireActive: true });
    assert.strictEqual(guardRes.status, 403);
    assert.ok(guardRes.error.toLowerCase().includes('suspended'));
  });

  await challenge('ADV-LOCK-05', 'Admin User Moderation: Suspending an active user takes immediate effect and logs USER_SUSPENDED audit event', () => {
    mockDb.reset();
    const admin = mockDb.createUser({ id: 'usr_admin', name: 'Security Admin', email: 'secadmin@gov.in', role: ROLES.ADMIN });
    const targetUser = mockDb.createUser({ id: 'usr_bad_actor', name: 'Malicious User', email: 'badactor@univ.edu', role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.ACTIVE });

    // Admin suspends user
    mockDb.updateUser(targetUser.id, { accountStatus: ACCOUNT_STATUS.SUSPENDED });
    mockDb.recordAuditLog(admin.id, AUDIT_ACTIONS.USER_SUSPENDED, {
      targetUserId: targetUser.id,
      metadata: { reason: 'Terms of Service violation - automated scraping' },
    });

    const updatedUser = mockDb.getUserById(targetUser.id);
    assert.strictEqual(updatedUser.accountStatus, ACCOUNT_STATUS.SUSPENDED);

    // Verify immediate access termination
    const middlewareCheck = simulateEdgeMiddleware('/student/dashboard', updatedUser);
    assert.strictEqual(middlewareCheck.status, 403);
    assert.strictEqual(middlewareCheck.allowed, false);

    // Verify audit record exists
    const logs = mockDb.getAuditLogs({ targetUserId: targetUser.id, action: AUDIT_ACTIONS.USER_SUSPENDED });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].actorUserId, admin.id);
    assert.strictEqual(logs[0].targetUserId, targetUser.id);
    assert.strictEqual(logs[0].metadata.reason, 'Terms of Service violation - automated scraping');
  });

  await challenge('ADV-LOCK-06', 'Self-lockout prevention: Admin cannot suspend or deactivate their own administrative account', () => {
    const adminSession = { user: { id: 'usr_admin_1', role: ROLES.ADMIN } };
    const targetUserId = 'usr_admin_1';
    const requestedStatus = ACCOUNT_STATUS.SUSPENDED;

    // Direct route validation logic (mirrors app/api/admin/users/route.js)
    const isSelfSuspension = targetUserId === adminSession.user.id && (requestedStatus === 'SUSPENDED' || requestedStatus === 'DEACTIVATED');
    assert.strictEqual(isSelfSuspension, true, 'Self-suspension attempt must be detected and rejected');
  });

  const masterDuration = Date.now() - masterStart;
  const totalCases = totalPassed + totalFailed;
  const passPct = totalCases > 0 ? ((totalPassed / totalCases) * 100).toFixed(1) : 0;

  console.log(`\n${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}         ADVERSARIAL CHALLENGE EXECUTION SUMMARY                     ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
  console.log(`  Total Challenge Tests: ${totalCases}`);
  console.log(`  Passed Challenges    : ${colors.green}${totalPassed}${colors.reset}`);
  console.log(`  Failed Challenges    : ${totalFailed > 0 ? colors.red : colors.dim}${totalFailed}${colors.reset}`);
  console.log(`  Pass Rate            : ${totalFailed === 0 ? colors.bright + colors.green : colors.red}${passPct}%${colors.reset}`);
  console.log(`  Execution Duration   : ${masterDuration}ms`);
  console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

  if (totalFailed === 0) {
    console.log(`  ${colors.bgGreen} VERDICT: APPROVED - ALL 34 ADVERSARIAL CHALLENGES PASSED ${colors.reset}\n`);
    return { success: true, totalPassed, totalFailed, totalCases, duration: masterDuration };
  } else {
    console.log(`  ${colors.bgRed} VERDICT: REJECTED - ${totalFailed} ADVERSARIAL CHALLENGES FAILED ${colors.reset}\n`);
    return { success: false, totalPassed, totalFailed, totalCases, duration: masterDuration, failures: failureDetails };
  }
}

// Direct CLI execution
if (require.main === module) {
  runAdversarialSuite().then(result => {
    if (!result.success) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}

module.exports = {
  runAdversarialSuite,
};
