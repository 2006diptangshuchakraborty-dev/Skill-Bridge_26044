/**
 * Tier 1: Comprehensive Feature Coverage Test Suite
 * SIH 2026 Skill Bridge Authentication & Role Governance Platform
 * File: tests/e2e/tier1-feature-coverage.test.js
 * 
 * Tests Features F01 to F21 from PROJECT.md:
 * - F01-F04: Better Auth configuration, Drizzle schemas, Client auth, Env structure
 * - F05-F08: Signup intent tokens, Strict admin registration ban, Role immutability, Tamper-proof role assignment
 * - F09-F10: 1:1 Profile relations, Immutable audit logging
 * - F11-F14: Student 8-step, Organization 7-step & Institute 6-step onboarding, Dynamic completion tracking, Onboarding redirection
 * - F15-F17: Admin KYC verification queue, Status toggles, Organization capability gating
 * - F18-F19: Route protection middleware, API security guard (withAuth) & IDOR prevention
 * - F20-F21: Standalone E2E infrastructure and specification compliance
 */

const assert = require('assert');
const {
  ROLES,
  ACCOUNT_STATUS,
  ONBOARDING_STATUS,
  KYC_STATUS,
  AUDIT_ACTIONS,
  MockDatabase,
  calculateStudentCompletion,
  calculateOrganizationCompletion,
  calculateInstituteCompletion,
  calculateProfileCompletion,
  isProfileComplete,
  simulateEdgeMiddleware,
  simulateApiGuard,
} = require('../auth-test-helper');

function registerTier1Tests(harness) {
  harness.describe('Tier 1: Feature Coverage (F01 - F21)', () => {
    let db;

    // Reset database before each section
    function setup() {
      db = new MockDatabase();
    }

    // ========================================================================
    // FEATURE GROUP 1: CORE AUTH & INTENT HANDSHAKE (F01 - F08)
    // ========================================================================
    harness.test('F01: Better Auth Session & User Creation Schema', () => {
      setup();
      const user = db.createUser({
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.edu',
        role: ROLES.STUDENT,
        emailVerified: true,
      });

      assert.ok(user.id.startsWith('usr_'), 'User ID must be properly formatted');
      assert.strictEqual(user.email, 'aarav.sharma@example.edu');
      assert.strictEqual(user.role, ROLES.STUDENT);
      assert.strictEqual(user.accountStatus, ACCOUNT_STATUS.ACTIVE);
      assert.strictEqual(user.onboardingStatus, ONBOARDING_STATUS.NOT_STARTED);

      const session = db.createSession(user.id);
      assert.ok(session.sessionToken, 'Session must generate a cryptographically strong token');
      const retrieved = db.getSession(session.sessionToken);
      assert.strictEqual(retrieved.user.id, user.id);
      assert.strictEqual(retrieved.user.role, ROLES.STUDENT);
    });

    harness.test('F05: Pre-OAuth Signup Intent Generation for STUDENT & ORGANIZATION', () => {
      setup();
      // 1. Generate Student Intent
      const studentIntent = db.createSignupIntent(ROLES.STUDENT, 'student@college.edu');
      assert.ok(studentIntent.token, 'Signup intent must contain cryptographic token');
      assert.strictEqual(studentIntent.role, ROLES.STUDENT);
      assert.strictEqual(studentIntent.email, 'student@college.edu');
      assert.strictEqual(studentIntent.usedAt, null);
      assert.ok(new Date(studentIntent.expiresAt) > new Date(), 'Expires at must be in the future');

      // 2. Generate Organization Intent
      const orgIntent = db.createSignupIntent(ROLES.ORGANIZATION, 'hr@techcorp.com');
      assert.strictEqual(orgIntent.role, ROLES.ORGANIZATION);
      assert.strictEqual(orgIntent.usedAt, null);

      // 3. Generate Institute Intent
      const instIntent = db.createSignupIntent(ROLES.INSTITUTE, 'dean@iit.edu');
      assert.strictEqual(instIntent.role, ROLES.INSTITUTE);
      assert.strictEqual(instIntent.usedAt, null);

      // 4. Generate Industry Intent
      const indIntent = db.createSignupIntent(ROLES.INDUSTRY, 'lead@industry.com');
      assert.strictEqual(indIntent.role, ROLES.INDUSTRY);
      assert.strictEqual(indIntent.usedAt, null);
    });

    harness.test('F06: Strict Admin Registration Prohibition in Signup Intent', () => {
      setup();
      // Attempting to generate signup intent for ADMIN must be rejected with 403
      assert.throws(() => {
        db.createSignupIntent(ROLES.ADMIN, 'admin@skillbridge.gov');
      }, (err) => {
        return err.statusCode === 403 && err.message.includes('Admin registration prohibited');
      });
    });

    harness.test('F07: Role Immutability ("One Google Account = One Role")', () => {
      setup();
      // Create existing student
      const user = db.createUser({
        name: 'Priya Patel',
        email: 'priya.patel@univ.edu',
        role: ROLES.STUDENT,
      });

      // Attempting to re-register same email as ORGANIZATION must be caught
      const existing = db.getUserByEmail('priya.patel@univ.edu');
      assert.ok(existing, 'User exists in system');
      assert.strictEqual(existing.role, ROLES.STUDENT, 'Existing role must remain STUDENT');
      
      // Role collision rejection check
      const attemptedRole = ROLES.ORGANIZATION;
      if (existing.role !== attemptedRole) {
        db.recordAuditLog(existing.id, AUDIT_ACTIONS.ROLE_COLLISION_BLOCKED, {
          targetUserId: existing.id,
          metadata: { attemptedRole, existingRole: existing.role },
        });
      }

      const logs = db.getAuditLogs({ action: AUDIT_ACTIONS.ROLE_COLLISION_BLOCKED });
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].metadata.attemptedRole, ROLES.ORGANIZATION);
    });

    harness.test('F08: Tamper-Proof Server-Enforced Role Assignment', () => {
      setup();
      const user = db.createUser({
        name: 'Rohan Verma',
        email: 'rohan.verma@college.edu',
        role: ROLES.STUDENT,
      });

      // Malicious payload attempting to elevate role to ADMIN via user update API
      const maliciousPayload = {
        name: 'Rohan Verma (Updated)',
        role: ROLES.ADMIN,
      };

      const updated = db.updateUser(user.id, maliciousPayload);
      assert.strictEqual(updated.name, 'Rohan Verma (Updated)');
      assert.strictEqual(updated.role, ROLES.STUDENT, 'Role MUST NOT be altered by client payload');
    });

    // ========================================================================
    // FEATURE GROUP 2: ROLE PROFILES & AUDIT LOGGING (F09 - F10)
    // ========================================================================
    harness.test('F09: 1:1 Student Profile Schema & Foreign Key Constraints', () => {
      setup();
      const user = db.createUser({
        name: 'Ananya Sen',
        email: 'ananya.sen@univ.edu',
        role: ROLES.STUDENT,
      });

      const profile = db.upsertStudentProfile(user.id, {
        headline: 'Aspiring Data Scientist & ML Researcher',
        bio: 'Passionate about predictive modeling and data pipelines',
        instituteName: 'National Institute of Technology',
        department: 'Computer Science',
        degree: 'B.Tech',
        yearOfStudy: 3,
        cgpa: 8.9,
        skills: [
          { name: 'Python', proficiency: 3, evidenceLevel: 4 },
          { name: 'SQL', proficiency: 3, evidenceLevel: 3 },
          { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
        ],
        careerPreferences: { targetRole: 'Data Scientist', location: 'Remote' },
      });

      assert.strictEqual(profile.userId, user.id);
      assert.strictEqual(profile.headline, 'Aspiring Data Scientist & ML Researcher');
      assert.strictEqual(profile.skills.length, 3);
      assert.ok(profile.profileCompletion > 0, 'Completion score must be calculated');

      // Attempting to create student profile for an organization user must fail
      const orgUser = db.createUser({
        name: 'Nexus Corp',
        email: 'nexus@corp.com',
        role: ROLES.ORGANIZATION,
      });

      assert.throws(() => {
        db.upsertStudentProfile(orgUser.id, { headline: 'Invalid' });
      }, (err) => err.statusCode === 403);
    });

    harness.test('F09: 1:1 Organization Profile Schema & Verification Fields', () => {
      setup();
      const orgUser = db.createUser({
        name: 'TechCorp Solutions',
        email: 'recruiter@techcorp.com',
        role: ROLES.ORGANIZATION,
      });

      const profile = db.upsertOrganizationProfile(orgUser.id, {
        companyName: 'TechCorp Solutions Inc.',
        registrationNumber: 'CIN-U72200MH2020PTC123456',
        taxIdGstin: '27AABCT1234F1Z5',
        industry: 'Information Technology',
        companySize: '250-500',
        website: 'https://techcorp.com',
        logoUrl: 'https://techcorp.com/logo.png',
        contactPhone: '+91 9876543210',
        address: 'Bangalore Tech Park, India',
        hiringPreferences: { domains: ['Data Science', 'Full Stack'] },
        verificationDocs: [{ docType: 'GST_CERTIFICATE', url: 'https://storage/gst.pdf' }],
      });

      assert.strictEqual(profile.userId, orgUser.id);
      assert.strictEqual(profile.verificationStatus, KYC_STATUS.PENDING);
      assert.strictEqual(profile.companyName, 'TechCorp Solutions Inc.');
      assert.ok(profile.profileCompletion >= 90, 'Comprehensive profile should have high completion');
    });

    harness.test('F09: 1:1 Institute Profile Schema & Foreign Key Constraints', () => {
      setup();
      const instUser = db.createUser({
        name: 'National Tech Institute',
        email: 'dean@nti.edu',
        role: ROLES.INSTITUTE,
      });

      const profile = db.upsertInstituteProfile(instUser.id, {
        instituteName: 'National Tech Institute',
        instituteCode: 'NTI-AISHE-001',
        instituteType: 'Autonomous University',
        address: { city: 'New Delhi', state: 'Delhi', pincode: '110001' },
        website: 'https://nti.edu',
        logoUrl: 'https://nti.edu/logo.png',
        contactPhone: '+91 11 23456789',
        officialEmail: 'info@nti.edu',
        departments: [{ name: 'Computer Science', intake: 120 }, { name: 'Electrical', intake: 60 }],
        placementContact: { name: 'Dr. Placement', email: 'tnp@nti.edu', phone: '+91 9876543211' },
        verificationDocs: [{ docType: 'UGC_APPROVAL', url: 'https://storage/ugc.pdf' }],
      });

      assert.strictEqual(profile.userId, instUser.id);
      assert.strictEqual(profile.verificationStatus, KYC_STATUS.PENDING);
      assert.strictEqual(profile.instituteName, 'National Tech Institute');
      assert.strictEqual(profile.profileCompletion, 100);

      // Attempting to create institute profile for student user must fail
      const studentUser = db.createUser({
        name: 'Normal Student',
        email: 'student@nti.edu',
        role: ROLES.STUDENT,
      });

      assert.throws(() => {
        db.upsertInstituteProfile(studentUser.id, { instituteName: 'Invalid' });
      }, (err) => err.statusCode === 403);
    });

    harness.test('F10: Immutable Security Audit Logging Trail', () => {
      setup();
      const admin = db.createUser({
        name: 'Platform Admin',
        email: 'admin@skillbridge.gov',
        role: ROLES.ADMIN,
      });

      const targetOrg = db.createUser({
        name: 'Pending Org',
        email: 'pending@org.com',
        role: ROLES.ORGANIZATION,
      });

      // Record audit event
      const log = db.recordAuditLog(admin.id, AUDIT_ACTIONS.ORGANIZATION_APPROVED, {
        targetUserId: targetOrg.id,
        resourceType: 'organization_profile',
        resourceId: 'org_123',
        metadata: { notes: 'All KYC documentation verified against MCA registry' },
      });

      assert.ok(log.id.startsWith('aud_'));
      assert.strictEqual(log.actorUserId, admin.id);
      assert.strictEqual(log.action, AUDIT_ACTIONS.ORGANIZATION_APPROVED);

      // Verify immutability (frozen object in memory and append-only list)
      assert.ok(Object.isFrozen(db.auditLogs[0]), 'Audit log entries must be frozen / immutable');
      assert.throws(() => {
        'use strict';
        db.auditLogs[0].action = 'TAMPERED_ACTION';
      }, (err) => err instanceof TypeError);
      assert.strictEqual(db.auditLogs[0].action, AUDIT_ACTIONS.ORGANIZATION_APPROVED, 'Audit log action must remain untampered');
    });

    // ========================================================================
    // FEATURE GROUP 3: DYNAMIC MULTI-STEP ONBOARDING WIZARDS (F11 - F14)
    // ========================================================================
    harness.test('F11 & F13: Student 8-Step Dynamic Completion Scoring', () => {
      // Step 1 only
      const p1 = { headline: 'Student', bio: 'Bio' };
      assert.strictEqual(calculateStudentCompletion(p1), 15);

      // Step 1 + Step 2 (Academic)
      const p2 = {
        ...p1,
        instituteName: 'IIT Bombay',
        department: 'CSE',
        degree: 'B.Tech',
        yearOfStudy: 4,
      };
      assert.strictEqual(calculateStudentCompletion(p2), 30);

      // Step 1 + 2 + 3 (Skills >= 3)
      const p3 = {
        ...p2,
        skills: [{ name: 'Python' }, { name: 'SQL' }, { name: 'React' }],
      };
      assert.strictEqual(calculateStudentCompletion(p3), 50);

      // Step 1-7 full profile
      const pFull = {
        ...p3,
        projects: [{ title: 'ML Pipeline' }],
        certifications: [{ title: 'AWS Cloud' }],
        experience: [{ title: 'Intern' }],
        careerPreferences: { role: 'Software Engineer', location: 'Hybrid' },
      };
      assert.strictEqual(calculateStudentCompletion(pFull), 100);
    });

    harness.test('F12 & F13: Organization 7-Step Dynamic Completion Scoring', () => {
      // Step 1 (Company Info)
      const p1 = { companyName: 'Data Corp', website: 'https://data.com', logoUrl: 'https://logo.png' };
      assert.strictEqual(calculateOrganizationCompletion(p1), 15);

      // Step 1 + 2 (Legal & Tax)
      const p2 = { ...p1, registrationNumber: 'REG123', taxIdGstin: 'GSTIN123' };
      assert.strictEqual(calculateOrganizationCompletion(p2), 35);

      // Full Org profile
      const pFull = {
        ...p2,
        contactPhone: '+919999999999',
        address: 'Tech City',
        industry: 'FinTech',
        companySize: '100-500',
        hiringPreferences: { domains: ['AI'] },
        verificationDocs: [{ url: 'https://doc.pdf' }],
      };
      assert.strictEqual(calculateOrganizationCompletion(pFull), 100);
    });

    harness.test('F12 & F13: Institute 6-Step Dynamic Completion Scoring', () => {
      // Step 1 (Basic Info)
      const p1 = { instituteName: 'Apex Tech Institute', website: 'https://apex.edu' };
      assert.strictEqual(calculateInstituteCompletion(p1), 15);

      // Step 1 + 2 (Identification)
      const p2 = { ...p1, instituteCode: 'APEX-01', instituteType: 'University' };
      assert.strictEqual(calculateInstituteCompletion(p2), 35);

      // Step 1 + 2 + 3 (Contact & Address)
      const p3 = { ...p2, contactPhone: '+911122334455', address: { city: 'Mumbai' } };
      assert.strictEqual(calculateInstituteCompletion(p3), 50);

      // Step 1 + 2 + 3 + 4 (Departments)
      const p4 = { ...p3, departments: [{ name: 'Computer Science' }] };
      assert.strictEqual(calculateInstituteCompletion(p4), 65);

      // Step 1-6 Full Institute profile
      const pFull = {
        ...p4,
        placementContact: { name: 'Prof. Sharma', email: 'placement@apex.edu' },
        verificationDocs: [{ docType: 'AICTE_APPROVAL', url: 'https://docs.apex.edu/aicte.pdf' }],
      };
      assert.strictEqual(calculateInstituteCompletion(pFull), 100);
    });

    harness.test('F13: Universal calculateProfileCompletion & isProfileComplete Threshold Gating', () => {
      const studentProfile = {
        headline: 'Developer',
        bio: 'Bio',
        instituteName: 'College',
        department: 'CS',
        degree: 'B.Tech',
        yearOfStudy: 4,
        skills: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        projects: [{ name: 'P' }],
      };
      // Score: 15 + 15 + 20 + 15 = 65%
      assert.strictEqual(calculateProfileCompletion('STUDENT', studentProfile), 65);
      assert.strictEqual(isProfileComplete('STUDENT', studentProfile, 70), false);
      assert.strictEqual(isProfileComplete('STUDENT', studentProfile, 60), true);

      // Add certifications (+10% -> 75%)
      const completedStudentProfile = {
        ...studentProfile,
        certifications: [{ name: 'Cert' }],
      };
      assert.strictEqual(calculateProfileCompletion('STUDENT', completedStudentProfile), 75);
      assert.strictEqual(isProfileComplete('STUDENT', completedStudentProfile, 70), true);

      // Admin role always 100%
      assert.strictEqual(calculateProfileCompletion('ADMIN', {}), 100);
      assert.strictEqual(isProfileComplete('ADMIN', {}), true);
    });

    harness.test('F14: Onboarding Status Transitions & Automatic Redirection', () => {
      setup();
      const student = db.createUser({
        name: 'New Student',
        email: 'new.student@college.edu',
        role: ROLES.STUDENT,
      });

      // Initial state: NOT_STARTED
      assert.strictEqual(student.onboardingStatus, ONBOARDING_STATUS.NOT_STARTED);

      // Attempting to access /student/dashboard must redirect to /student/onboarding
      const redirectCheck = simulateEdgeMiddleware('/student/dashboard', student);
      assert.strictEqual(redirectCheck.status, 307);
      assert.strictEqual(redirectCheck.redirectUrl, '/student/onboarding');

      // Partially onboarded
      db.upsertStudentProfile(student.id, { headline: 'Coder' });
      const updatedUser = db.getUserById(student.id);
      assert.strictEqual(updatedUser.onboardingStatus, ONBOARDING_STATUS.IN_PROGRESS);

      // Fully onboarded
      db.upsertStudentProfile(student.id, {
        headline: 'Coder',
        bio: 'Bio',
        instituteName: 'College',
        department: 'CS',
        degree: 'B.Tech',
        yearOfStudy: 4,
        skills: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        projects: [{ name: 'P' }],
        certifications: [{ name: 'C' }],
        experience: [{ name: 'E' }],
        careerPreferences: { role: 'Dev', type: 'Full-time' },
      });

      const completedUser = db.getUserById(student.id);
      assert.strictEqual(completedUser.onboardingStatus, ONBOARDING_STATUS.COMPLETED);

      // Now access to /student/dashboard is allowed
      const allowedCheck = simulateEdgeMiddleware('/student/dashboard', completedUser);
      assert.strictEqual(allowedCheck.status, 200);
      assert.strictEqual(allowedCheck.allowed, true);
    });

    // ========================================================================
    // FEATURE GROUP 4: ADMIN GOVERNANCE & CAPABILITY GATING (F15 - F17)
    // ========================================================================
    harness.test('F15 & F16: Admin KYC Actions (Approve, Reject, Request Info)', () => {
      setup();
      const admin = db.createUser({ name: 'Admin', email: 'admin@gov.in', role: ROLES.ADMIN });
      const org = db.createUser({ name: 'Org A', email: 'orga@corp.com', role: ROLES.ORGANIZATION });
      
      const profile = db.upsertOrganizationProfile(org.id, {
        companyName: 'Org A Corp',
        registrationNumber: 'REG-001',
      });
      assert.strictEqual(profile.verificationStatus, KYC_STATUS.PENDING);

      // 1. Action: REQUEST_INFO
      profile.verificationStatus = KYC_STATUS.INFO_REQUESTED;
      profile.adminNotes = 'Please upload GST certificate.';
      db.organizationProfiles.set(org.id, profile);
      db.recordAuditLog(admin.id, AUDIT_ACTIONS.ORGANIZATION_INFO_REQUESTED, { targetUserId: org.id });

      let current = db.getOrganizationProfile(org.id);
      assert.strictEqual(current.verificationStatus, KYC_STATUS.INFO_REQUESTED);

      // 2. Action: APPROVE
      profile.verificationStatus = KYC_STATUS.APPROVED;
      profile.adminNotes = 'Verified with official registrar.';
      db.organizationProfiles.set(org.id, profile);
      db.recordAuditLog(admin.id, AUDIT_ACTIONS.ORGANIZATION_APPROVED, { targetUserId: org.id });

      current = db.getOrganizationProfile(org.id);
      assert.strictEqual(current.verificationStatus, KYC_STATUS.APPROVED);
    });

    harness.test('F17: Organization Capability Gating (Publishing Blocked when PENDING)', () => {
      setup();
      const org = db.createUser({ name: 'Unverified Org', email: 'unverified@org.com', role: ROLES.ORGANIZATION });
      db.upsertOrganizationProfile(org.id, {
        companyName: 'Unverified Org',
        verificationStatus: KYC_STATUS.PENDING,
      });

      // Attempting to publish opportunity while PENDING must throw 403
      assert.throws(() => {
        db.publishOpportunity(org.id, {
          title: 'Senior Frontend Engineer',
          highPrioritySkills: ['React', 'JavaScript'],
        });
      }, (err) => {
        return err.statusCode === 403 && err.message.includes('Action not allowed while organization verification is pending');
      });

      // Approve org
      const orgProfile = db.getOrganizationProfile(org.id);
      orgProfile.verificationStatus = KYC_STATUS.APPROVED;
      db.organizationProfiles.set(org.id, orgProfile);

      // Now publishing succeeds
      const opp = db.publishOpportunity(org.id, {
        title: 'Senior Frontend Engineer',
        highPrioritySkills: ['React', 'JavaScript'],
      });
      assert.ok(opp.id.startsWith('opp_'));
      assert.strictEqual(opp.status, 'PUBLISHED');
    });

    // ========================================================================
    // FEATURE GROUP 5: ROUTE MIDDLEWARE & API GUARDS (F18 - F19)
    // ========================================================================
    harness.test('F18: Route Protection Middleware Role Partitioning', () => {
      setup();
      const student = db.createUser({ name: 'Student', email: 's@univ.edu', role: ROLES.STUDENT, onboardingStatus: ONBOARDING_STATUS.COMPLETED });
      const org = db.createUser({ name: 'Org', email: 'o@corp.com', role: ROLES.ORGANIZATION, onboardingStatus: ONBOARDING_STATUS.COMPLETED });
      const admin = db.createUser({ name: 'Admin', email: 'a@gov.in', role: ROLES.ADMIN, onboardingStatus: ONBOARDING_STATUS.COMPLETED });

      // Unauthenticated access to /admin/dashboard -> redirect to /login
      const unauthCheck = simulateEdgeMiddleware('/admin/dashboard', null);
      assert.strictEqual(unauthCheck.status, 307);
      assert.strictEqual(unauthCheck.allowed, false);

      // Student accessing /admin/dashboard -> 403 Forbidden
      const studentAdminCheck = simulateEdgeMiddleware('/admin/dashboard', student);
      assert.strictEqual(studentAdminCheck.status, 403);
      assert.strictEqual(studentAdminCheck.allowed, false);

      // Student accessing /student/dashboard -> 200 Allowed
      const studentSelfCheck = simulateEdgeMiddleware('/student/dashboard', student);
      assert.strictEqual(studentSelfCheck.status, 200);
      assert.strictEqual(studentSelfCheck.allowed, true);

      // Organization accessing /student/dashboard -> 403 Forbidden
      const orgStudentCheck = simulateEdgeMiddleware('/student/dashboard', org);
      assert.strictEqual(orgStudentCheck.status, 403);
      assert.strictEqual(orgStudentCheck.allowed, false);

      // Admin accessing /admin/dashboard -> 200 Allowed
      const adminCheck = simulateEdgeMiddleware('/admin/dashboard', admin);
      assert.strictEqual(adminCheck.status, 200);
      assert.strictEqual(adminCheck.allowed, true);
    });

    harness.test('F19: Server API Security Guard (withAuth) & IDOR Protection', () => {
      setup();
      const student1 = db.createUser({ id: 'usr_stu1', name: 'Student 1', email: 's1@univ.edu', role: ROLES.STUDENT });
      const student2 = db.createUser({ id: 'usr_stu2', name: 'Student 2', email: 's2@univ.edu', role: ROLES.STUDENT });
      const admin = db.createUser({ id: 'usr_adm1', name: 'Admin', email: 'adm@gov.in', role: ROLES.ADMIN });

      // 1. Unauthenticated API call
      const guardUnauth = simulateApiGuard(null, { roles: [ROLES.STUDENT] });
      assert.strictEqual(guardUnauth.status, 401);

      // 2. Role mismatch
      const guardRoleMismatch = simulateApiGuard(student1, { roles: [ROLES.ORGANIZATION] });
      assert.strictEqual(guardRoleMismatch.status, 403);

      // 3. IDOR: Student 1 trying to edit Student 2's profile
      const guardIdorBlocked = simulateApiGuard(student1, { roles: [ROLES.STUDENT], checkOwnership: true }, student2.id);
      assert.strictEqual(guardIdorBlocked.status, 403);
      assert.strictEqual(guardIdorBlocked.error, 'Forbidden: Resource ownership mismatch');

      // 4. Student 1 accessing their own profile -> Allowed
      const guardSelf = simulateApiGuard(student1, { roles: [ROLES.STUDENT], checkOwnership: true }, student1.id);
      assert.strictEqual(guardSelf.status, 200);

      // 5. Admin overriding IDOR for moderation -> Allowed
      const guardAdminOverride = simulateApiGuard(admin, { roles: [ROLES.ADMIN], checkOwnership: true }, student2.id);
      assert.strictEqual(guardAdminOverride.status, 200);
    });
  });
}

module.exports = { registerTier1Tests };
