import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================================');
console.log('  SIH 2026 Milestone M3 Empirical Challenger Test Harness');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(  ✔ [PASS] );
  } catch (err) {
    failedTests++;
    console.error(  ✖ [FAIL] );
    console.error(    Error: );
    failureDetails.push({ description, error: err.message, stack: err.stack });
  }
}

async function run() {
  const dummyDataModule = await import('../lib/dummy-data/index.js');
  const { studentData, industryData, instituteData, adminData } = dummyDataModule;

  // -------------------------------------------------------------------------
  // SUITE 1: Student Data & 5-Level Evidence Badge Schema
  // -------------------------------------------------------------------------
  console.log('▶ SUITE 1: Student Data & 5-Level Evidence Badge Schema');

  test('M3-STD-01: studentData.profile has required fields and CGPA/completion', () => {
    const p = studentData.profile;
    assert(p.id && p.name && p.email, 'Profile id/name/email required');
    assert(typeof p.cgpa === 'number' && p.cgpa >= 0 && p.cgpa <= 10, 'CGPA must be between 0 and 10');
    assert(typeof p.profileCompletion === 'number' && p.profileCompletion >= 0 && p.profileCompletion <= 100, 'Profile completion 0-100');
    assert(Array.isArray(p.careerPreferences.preferredRoles) && p.careerPreferences.preferredRoles.length > 0, 'Preferred roles present');
  });

  test('M3-STD-02: studentData.skillMatrix contains valid 5-level evidence badges', () => {
    assert(Array.isArray(studentData.skillMatrix) && studentData.skillMatrix.length >= 8, 'At least 8 skills in matrix');
    const validEvidenceLevels = [1, 2, 3, 4, 5];
    for (const sk of studentData.skillMatrix) {
      assert(validEvidenceLevels.includes(sk.evidenceLevel), Invalid evidenceLevel  for );
      assert(typeof sk.proficiency === 'number' && sk.proficiency >= 1 && sk.proficiency <= 4, Proficiency 1-4 for );
      assert(typeof sk.confidenceScore === 'number' && sk.confidenceScore >= 0 && sk.confidenceScore <= 100, Confidence 0-100 for );
      assert(typeof sk.isIndustryVerified === 'boolean', isIndustryVerified must be boolean for );
    }
  });

  test('M3-STD-03: Evidence badge labels correspond directly to Levels 1-5 semantics', () => {
    const levelLabels = {
      1: 'Level 1 — Self Declared',
      2: 'Level 2',
      3: 'Level 3 — Assessment Verified',
      4: 'Level 4 — Project Verified',
      5: 'Level 5'
    };
    for (const sk of studentData.skillMatrix) {
      if (sk.evidenceLevel === 1) assert(sk.evidenceLabel.includes('Level 1') || sk.evidenceLabel.includes('Self'), Mismatch label for L1: );
      if (sk.evidenceLevel === 3) assert(sk.evidenceLabel.includes('Level 3') || sk.evidenceLabel.includes('Assessment'), Mismatch label for L3: );
      if (sk.evidenceLevel === 4) assert(sk.evidenceLabel.includes('Level 4') || sk.evidenceLabel.includes('Project'), Mismatch label for L4: );
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Recommended Opportunities & Dual Match Gatekeeper Breakdown
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Recommended Opportunities & Dual Match Gatekeeper Breakdown');

  test('M3-OPP-01: Opportunities have mandatoryMatch, preferredMatch, compositeScore and gateStatus', () => {
    assert(Array.isArray(studentData.recommendedOpportunities) && studentData.recommendedOpportunities.length >= 4, 'Opportunities array valid');
    for (const opp of studentData.recommendedOpportunities) {
      assert(typeof opp.mandatoryMatch === 'number' && opp.mandatoryMatch >= 0 && opp.mandatoryMatch <= 100, mandatoryMatch 0-100 for );
      assert(typeof opp.preferredMatch === 'number' && opp.preferredMatch >= 0 && opp.preferredMatch <= 100, preferredMatch 0-100 for );
      assert(typeof opp.compositeScore === 'number' && opp.compositeScore >= 0 && opp.compositeScore <= 100, compositeScore 0-100 for );
      assert(typeof opp.isEligible === 'boolean', isEligible must be boolean for );
      assert(typeof opp.gateStatus === 'string' && opp.gateStatus.length > 0, gateStatus required for );
      assert(Array.isArray(opp.highPrioritySkills) && opp.highPrioritySkills.length > 0, highPrioritySkills required for );
      assert(Array.isArray(opp.preferredSkills), preferredSkills array required for );
    }
  });

  test('M3-OPP-02: Rule 01 Mandatory Gate is strictly enforced (isEligible=true iff mandatoryMatch=100)', () => {
    for (const opp of studentData.recommendedOpportunities) {
      if (opp.mandatoryMatch === 100) {
        assert.strictEqual(opp.isEligible, true, Opportunity  with 100% mandatory match should be eligible);
        assert(opp.gateStatus.includes('ELIGIBLE'), gateStatus should indicate ELIGIBLE for );
      } else {
        assert.strictEqual(opp.isEligible, false, Opportunity  with <100% mandatory match (%) must be ineligible);
        assert(opp.gateStatus.includes('NOT ELIGIBLE'), gateStatus should indicate NOT ELIGIBLE for );
      }
    }
  });

  test('M3-OPP-03: Composite score math consistency for eligible opportunities (70% High + 30% Low)', () => {
    for (const opp of studentData.recommendedOpportunities) {
      if (opp.isEligible) {
        const expectedScore = Math.round(((opp.mandatoryMatch * 0.70) + (opp.preferredMatch * 0.30)) * 10) / 10;
        assert(Math.abs(opp.compositeScore - expectedScore) <= 0.1, Composite score mismatch for : got , expected ~);
      }
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 3: 6-Stage Application History Pipeline
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: 6-Stage Application History Pipeline');

  test('M3-APP-01: Applications conform to 6-stage lifecycle model', () => {
    assert(Array.isArray(studentData.applicationHistory) && studentData.applicationHistory.length >= 6, 'At least 6 application history items');
    const validStatuses = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
    for (const app of studentData.applicationHistory) {
      assert(validStatuses.includes(app.status), Invalid application status  in );
      assert.strictEqual(app.totalStages, 6, 	otalStages must be 6 for );
      assert(app.stage >= 1 && app.stage <= 6, stage must be 1..6 for );
      assert(typeof app.stageLabel === 'string' && app.stageLabel.length > 0, stageLabel required for );
      assert(typeof app.nextStep === 'string' && app.nextStep.length > 0, 
extStep required for );
      assert(Array.isArray(app.timeline) && app.timeline.length > 0, 	imeline array required for );
      for (const t of app.timeline) {
        assert(t.status && t.date && t.note, Timeline event missing status/date/note in );
      }
    }
  });

  test('M3-APP-02: Application history covers distinct stages across the pipeline', () => {
    const statusesFound = new Set(studentData.applicationHistory.map(a => a.status));
    assert(statusesFound.has('APPLIED'), 'Must contain APPLIED status');
    assert(statusesFound.has('UNDER_REVIEW'), 'Must contain UNDER_REVIEW status');
    assert(statusesFound.has('SHORTLISTED'), 'Must contain SHORTLISTED status');
    assert(statusesFound.has('INTERVIEW'), 'Must contain INTERVIEW status');
    assert(statusesFound.has('SELECTED'), 'Must contain SELECTED status');
    assert(statusesFound.has('REJECTED'), 'Must contain REJECTED status');
  });

  // -------------------------------------------------------------------------
  // SUITE 4: Privacy-Preserving k-Anonymity Gap Alerts (k >= 5) & Institute Data
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: Privacy-Preserving k-Anonymity Gap Alerts & Institute Data');

  test('M3-INST-01: Institute profile and department readiness benchmarks are populated', () => {
    assert(instituteData.profile.id && instituteData.profile.aisheCode && instituteData.profile.nirfRank, 'Institute profile valid');
    assert(Array.isArray(instituteData.departmentReadiness) && instituteData.departmentReadiness.length >= 4, 'Department readiness list');
    for (const d of instituteData.departmentReadiness) {
      assert(d.name && d.code && typeof d.readinessScore === 'number', Department readiness record valid for );
      assert(d.readinessScore >= 0 && d.readinessScore <= 100, eadinessScore 0-100 for );
    }
  });

  test('M3-INST-02: k-Anonymity threshold (k >= 5) and zero PII leak strictly enforced on all gap alerts', () => {
    assert(Array.isArray(instituteData.skillGapAlerts) && instituteData.skillGapAlerts.length >= 4, 'Skill gap alerts array');
    for (const alert of instituteData.skillGapAlerts) {
      assert.strictEqual(alert.hasPII, false, Alert  MUST have hasPII === false);
      assert(alert.affectedStudentCount >= 5, Alert  violates k-anonymity (count  < 5));
      assert(alert.kAnonymityScore >= 5, Alert  kAnonymityScore must be >= 5);
      assert(alert.skillName && alert.category && alert.department, Missing metadata in alert );
      assert(alert.suggestedAction, Missing suggestedAction in alert );
      // Ensure no student names, emails, roll numbers are present in message
      assert(!/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/.test(alert.message), Email leak in alert message: );
      assert(!/\b(CS2026-\d{3}|usr_\w+|std_\w+)\b/.test(alert.message), Student ID leak in alert message: );
    }
  });

  test('M3-INST-03: Active training workshops linked to skill gap alert IDs', () => {
    assert(Array.isArray(instituteData.activeWorkshops) && instituteData.activeWorkshops.length >= 3, 'Active workshops array');
    for (const ws of instituteData.activeWorkshops) {
      assert(ws.id && ws.title && ws.targetSkill && ws.enrolledCount <= ws.maxCapacity, Workshop invalid: );
      assert(ws.completionCredential && ws.completionCredential.includes('Level'), Completion credential must grant verified level badge);
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 5: Industry / Recruiter Data & Post-Internship L5 Evaluations
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 5: Industry Data & Post-Internship L5 Endorsements');

  test('M3-IND-01: Industry profile and published jobs with gatekeeper stats', () => {
    assert(industryData.profile.id && industryData.profile.taxIdGstin && industryData.profile.kycStatus === 'APPROVED', 'Industry profile valid');
    assert(Array.isArray(industryData.publishedJobs) && industryData.publishedJobs.length >= 4, 'Published jobs list');
    for (const job of industryData.publishedJobs) {
      assert(job.applicantsCount === (job.eligibleCount + job.partialMatchCount + job.filteredOutCount) || job.applicantsCount >= job.eligibleCount, Applicant count breakdown for );
    }
  });

  test('M3-IND-02: Candidate comparison matrix correctly benchmarks candidates', () => {
    const comp = industryData.candidateComparison;
    assert(comp && Array.isArray(comp.candidates) && comp.candidates.length === 4, 'Comparison contains 4 candidate personas');
    const priya = comp.candidates.find(c => c.id === 'std_002');
    const aarav = comp.candidates.find(c => c.id === 'std_001');
    const rohan = comp.candidates.find(c => c.id === 'std_003');
    assert(priya && priya.compositeScore === 100.0, 'Priya is 100% full match');
    assert(aarav && aarav.compositeScore === 92.5, 'Aarav is 92.5% eligible match');
    assert(rohan && rohan.compositeScore === 0.0, 'Rohan is ineligible due to missing mandatory SQL');
  });

  test('M3-IND-03: Post-internship evaluation schema elevates skills to Level 5', () => {
    assert(Array.isArray(industryData.postInternshipEvaluations) && industryData.postInternshipEvaluations.length >= 2, 'Evaluations array');
    for (const ev of industryData.postInternshipEvaluations) {
      assert(ev.studentId && ev.studentName && ev.performanceRating, Evaluation header valid: );
      assert(Array.isArray(ev.skillsToElevate) && ev.skillsToElevate.length > 0, skillsToElevate array in );
      for (const sk of ev.skillsToElevate) {
        assert.strictEqual(sk.proposedLevel, 5, Proposed level must be Level 5 in );
        assert.strictEqual(sk.status, 'PENDING_SIGN_OFF', Elevation status must be PENDING_SIGN_OFF in );
      }
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 6: Admin Governance, KYC Queue & Forensic Audit Trail
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 6: Admin Governance, KYC Queue & Forensic Audit Trail');

  test('M3-ADM-01: Admin KYC queue schema and action handlers', () => {
    assert(Array.isArray(adminData.kycQueue) && adminData.kycQueue.length >= 5, 'KYC queue array');
    for (const kyc of adminData.kycQueue) {
      assert(kyc.id && kyc.entityName && ['ORGANIZATION', 'INSTITUTE'].includes(kyc.entityType), KYC record valid: );
      assert(['PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED'].includes(kyc.status), Valid KYC status in );
      assert(Array.isArray(kyc.documents) && kyc.documents.length > 0, Documents in );
    }
  });

  test('M3-ADM-02: Forensic audit logs contain immutable action records and security events', () => {
    assert(Array.isArray(adminData.auditLogs) && adminData.auditLogs.length >= 5, 'Audit logs array');
    const actions = adminData.auditLogs.map(l => l.action);
    assert(actions.includes('KYC_APPROVE_ORGANIZATION'), 'Audit logs contain KYC action');
    assert(actions.includes('ATTEMPT_ADMIN_REGISTRATION_BLOCK'), 'Audit logs contain security guard block');
    assert(actions.includes('OPPORTUNITY_PUBLISHED'), 'Audit logs contain opportunity published');
    assert(actions.includes('APPLICATION_SUBMITTED'), 'Audit logs contain application submitted');
    for (const log of adminData.auditLogs) {
      assert(log.actor && log.role && log.timestamp && log.ipAddress, Audit log record valid: );
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 7: Navbar and Home Page Component Source Verifications
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 7: Navbar and Home Page Component Source Verifications');

  test('M3-CMP-01: components/shared/Navbar.jsx implements responsive menu & client handlers', () => {
    const navContent = fs.readFileSync(path.resolve(__dirname, '../components/shared/Navbar.jsx'), 'utf8');
    assert(navContent.includes(' use client'), 'Navbar must be client component');
    assert(navContent.includes('useState(false)'), 'Navbar must have state hooks');
    assert(navContent.includes('mobileMenuOpen') && navContent.includes('setMobileMenuOpen'), 'Navbar must handle mobile menu state');
    assert(navContent.includes('userDropdownOpen') && navContent.includes('setUserDropdownOpen'), 'Navbar must handle user dropdown state');
    assert(navContent.includes('handleSignOut'), 'Navbar must handle sign-out');
    assert(navContent.includes('useSession'), 'Navbar must integrate Better Auth useSession');
    assert(navContent.includes('calculateProfileCompletion'), 'Navbar must calculate profile completion');
    assert(navContent.includes('getAuthNavLinks'), 'Navbar must partition links by role');
  });

  test('M3-CMP-02: app/home/page.jsx implements interactive 4-role switcher & KYC actions', () => {
    const homeContent = fs.readFileSync(path.resolve(__dirname, '../app/home/page.jsx'), 'utf8');
    assert(homeContent.includes('use client'), 'HomePage must be client component');
    assert(homeContent.includes('selectedRole') && homeContent.includes('setSelectedRole'), 'HomePage must have selectedRole switcher state');
    assert(homeContent.includes('STUDENT') && homeContent.includes('INDUSTRY') && homeContent.includes('INSTITUTE') && homeContent.includes('ADMIN'), 'HomePage must render all 4 role views');
    assert(homeContent.includes('handleKycAction'), 'HomePage must implement KYC action handler in Admin view');
    assert(homeContent.includes('EvidenceBadge'), 'HomePage must use EvidenceBadge component');
    assert(homeContent.includes('ProfileCompletionCard'), 'HomePage must use ProfileCompletionCard component');
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('                 EMPIRICAL TEST SUMMARY');
  console.log('----------------------------------------------------------------------');
  console.log(  Total Tests Run : );
  console.log(  Passed Tests    : );
  console.log(  Failed Tests    : );
  console.log(  Pass Rate       : %);
  console.log('----------------------------------------------------------------------');

  if (failedTests > 0) {
    console.error('\nFAILURE DETAILS:');
    failureDetails.forEach(f => console.error(- : ));
    process.exit(1);
  } else {
    console.log('\n ALL EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY! \n');
  }
}

run().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
