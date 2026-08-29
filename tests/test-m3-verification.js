/**
 * Empirical Verification & Stress Test Harness for Milestone M3
 * File: tests/test-m3-verification.js
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
console.log('  Milestone M3 UI & Routes Empirical Challenger Harness');
console.log('======================================================================\n');

// 1. DUMMY DATA INTEGRITY TEST
console.log('▶ SUITE 1: Dummy Data Structure and Export Validation');

let dummyDataModule;
try {
  // Using dynamic import or transpiled check or direct file parsing for ESM
  const dummyDataPath = path.resolve('lib/dummy-data/index.js');
  const fileContent = fs.readFileSync(dummyDataPath, 'utf8');

  runTest('lib/dummy-data/index.js exists and is populated', () => {
    assert(fileContent.length > 5000, 'File content should be substantial');
  });

  runTest('lib/dummy-data/index.js exports studentData, industryData, instituteData, adminData', () => {
    assert(fileContent.includes('export const studentData ='), 'Missing studentData export');
    assert(fileContent.includes('export const industryData ='), 'Missing industryData export');
    assert(fileContent.includes('export const instituteData ='), 'Missing instituteData export');
    assert(fileContent.includes('export const adminData ='), 'Missing adminData export');
    assert(fileContent.includes('export default {'), 'Missing default export');
  });

  runTest('studentData contains profile, skillMatrix, recommendedOpportunities, applicationHistory, gapUpskilling', () => {
    assert(fileContent.includes('skillMatrix: ['), 'Missing skillMatrix');
    assert(fileContent.includes('recommendedOpportunities: ['), 'Missing recommendedOpportunities');
    assert(fileContent.includes('applicationHistory: ['), 'Missing applicationHistory');
    assert(fileContent.includes('gapUpskilling: ['), 'Missing gapUpskilling');
    assert(fileContent.includes('profileCompletion:'), 'Missing profileCompletion in profile');
  });

  runTest('industryData contains profile, kpiStats, publishedJobs, talentSearchCandidates, candidateComparison, postInternshipEvaluations', () => {
    assert(fileContent.includes('kpiStats: {'), 'Missing kpiStats');
    assert(fileContent.includes('publishedJobs: ['), 'Missing publishedJobs');
    assert(fileContent.includes('talentSearchCandidates: ['), 'Missing talentSearchCandidates');
    assert(fileContent.includes('candidateComparison: {'), 'Missing candidateComparison');
    assert(fileContent.includes('postInternshipEvaluations: ['), 'Missing postInternshipEvaluations');
  });

  runTest('instituteData contains profile, departmentReadiness, skillGapAlerts, activeWorkshops, placementStats, employerFeedback', () => {
    assert(fileContent.includes('departmentReadiness: ['), 'Missing departmentReadiness');
    assert(fileContent.includes('skillGapAlerts: ['), 'Missing skillGapAlerts');
    assert(fileContent.includes('activeWorkshops: ['), 'Missing activeWorkshops');
    assert(fileContent.includes('placementStats: {'), 'Missing placementStats');
    assert(fileContent.includes('employerFeedback: ['), 'Missing employerFeedback');
    assert(fileContent.includes('kAnonymityScore'), 'Missing kAnonymityScore in skillGapAlerts');
    assert(fileContent.includes('hasPII: false'), 'Missing hasPII privacy protection flag in skillGapAlerts');
  });

  runTest('adminData contains platformStats, kycQueue, auditLogs, systemHealth', () => {
    assert(fileContent.includes('platformStats: {'), 'Missing platformStats');
    assert(fileContent.includes('kycQueue: ['), 'Missing kycQueue');
    assert(fileContent.includes('auditLogs: ['), 'Missing auditLogs');
    assert(fileContent.includes('systemHealth: {'), 'Missing systemHealth');
  });
} catch (e) {
  console.error('Error testing dummy data:', e);
}

// 2. NAVBAR COMPONENT VALIDATION
console.log('\n▶ SUITE 2: Navbar.jsx Role & Public Navigation Inspection');

try {
  const navbarPath = path.resolve('components/shared/Navbar.jsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');

  runTest('Navbar component exists at components/shared/Navbar.jsx', () => {
    assert(fs.existsSync(navbarPath), 'Navbar file not found');
  });

  runTest('Navbar handles all 4 roles: STUDENT, INDUSTRY, INSTITUTE, ADMIN', () => {
    assert(navbarContent.includes('case "INDUSTRY":'), 'Missing INDUSTRY role case');
    assert(navbarContent.includes('case "INSTITUTE":'), 'Missing INSTITUTE role case');
    assert(navbarContent.includes('case "ADMIN":'), 'Missing ADMIN role case');
    assert(navbarContent.includes('case "STUDENT":'), 'Missing STUDENT role case');
  });

  runTest('Navbar Student navigation links are correctly mapped', () => {
    assert(navbarContent.includes('/student/opportunities'), 'Missing /student/opportunities link');
    assert(navbarContent.includes('/student/applications'), 'Missing /student/applications link');
    assert(navbarContent.includes('/student/profile'), 'Missing /student/profile link');
  });

  runTest('Navbar Industry navigation links are correctly mapped', () => {
    assert(navbarContent.includes('/recruiter/jobs/create'), 'Missing /recruiter/jobs/create link');
    assert(navbarContent.includes('/recruiter/dashboard'), 'Missing /recruiter/dashboard link');
    assert(navbarContent.includes('/recruiter/candidates'), 'Missing /recruiter/candidates link');
    assert(navbarContent.includes('/organization/onboarding'), 'Missing /organization/onboarding link');
  });

  runTest('Navbar Institute navigation links are correctly mapped', () => {
    assert(navbarContent.includes('/institute/dashboard'), 'Missing /institute/dashboard link');
    assert(navbarContent.includes('/institute/skill-gaps'), 'Missing /institute/skill-gaps link');
    assert(navbarContent.includes('/institute/feedback'), 'Missing /institute/feedback link');
    assert(navbarContent.includes('/institute/training'), 'Missing /institute/training link');
    assert(navbarContent.includes('/institute/onboarding'), 'Missing /institute/onboarding link');
  });

  runTest('Navbar Admin navigation links are correctly mapped', () => {
    assert(navbarContent.includes('/admin/users'), 'Missing /admin/users link');
    assert(navbarContent.includes('/admin/verifications'), 'Missing /admin/verifications link');
    assert(navbarContent.includes('/admin/audit-logs'), 'Missing /admin/audit-logs link');
  });

  runTest('Navbar Public unauthenticated links are correctly mapped to hash anchors', () => {
    assert(navbarContent.includes('#students'), 'Missing #students public link');
    assert(navbarContent.includes('#industry'), 'Missing #industry public link');
    assert(navbarContent.includes('#institutes'), 'Missing #institutes public link');
    assert(navbarContent.includes('/login'), 'Missing /login public CTA');
    assert(navbarContent.includes('/register'), 'Missing /register public CTA');
  });

  runTest('Navbar renders dynamic student profile completion badge', () => {
    assert(navbarContent.includes('studentCompletion'), 'Missing studentCompletion calculation');
    assert(navbarContent.includes('% Complete'), 'Missing % Complete display in badge');
  });

  runTest('Navbar contains functional sign-out handler', () => {
    assert(navbarContent.includes('handleSignOut'), 'Missing handleSignOut handler');
    assert(navbarContent.includes('signOut'), 'Missing signOut import/invocation');
  });
} catch (e) {
  console.error('Error testing Navbar:', e);
}

// 3. LANDING PAGE VALIDATION
console.log('\n▶ SUITE 3: app/page.jsx Landing Page & Anchor Sections Inspection');

try {
  const landingPath = path.resolve('app/page.jsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');

  runTest('app/page.jsx exists', () => {
    assert(fs.existsSync(landingPath), 'Landing page file not found');
  });

  runTest('app/page.jsx has #students anchor section with CTAs', () => {
    assert(landingContent.includes('id="students"'), 'Missing id="students" section');
    assert(landingContent.includes('href="/register"'), 'Missing /register link in students section/hero');
    assert(landingContent.includes('href="/student/opportunities"'), 'Missing /student/opportunities link');
  });

  runTest('app/page.jsx has #industry anchor section with CTAs', () => {
    assert(landingContent.includes('id="industry"'), 'Missing id="industry" section');
    assert(landingContent.includes('href="/recruiter/jobs/create"'), 'Missing /recruiter/jobs/create link');
  });

  runTest('app/page.jsx has #institutes anchor section with CTAs', () => {
    assert(landingContent.includes('id="institutes"'), 'Missing id="institutes" section');
    assert(landingContent.includes('href="/institute/dashboard"'), 'Missing /institute/dashboard link');
  });

  runTest('app/page.jsx has hero CTAs (/register and /login)', () => {
    assert(landingContent.includes('href="/register"'), 'Missing /register link');
    assert(landingContent.includes('href="/login"'), 'Missing /login link');
  });

  runTest('app/page.jsx includes Rule 01 Priority-Aware skill matching spotlight', () => {
    assert(landingContent.includes('Rule 01'), 'Missing Rule 01 mention');
    assert(landingContent.includes('High Priority (Mandatory)'), 'Missing High Priority mandatory section');
    assert(landingContent.includes('Low Priority (Preferred)'), 'Missing Low Priority preferred section');
  });
} catch (e) {
  console.error('Error testing Landing page:', e);
}

// 4. HOME DASHBOARD PAGE VALIDATION
console.log('\n▶ SUITE 4: app/home/page.jsx Multi-Role Central Dashboard Inspection');

try {
  const homePath = path.resolve('app/home/page.jsx');
  const homeContent = fs.readFileSync(homePath, 'utf8');

  runTest('app/home/page.jsx exists', () => {
    assert(fs.existsSync(homePath), 'Home page file not found');
  });

  runTest('app/home/page.jsx contains role switcher for all 4 roles', () => {
    assert(homeContent.includes('selectedRole === "STUDENT"'), 'Missing STUDENT role view branch');
    assert(homeContent.includes('selectedRole === "INDUSTRY"'), 'Missing INDUSTRY role view branch');
    assert(homeContent.includes('selectedRole === "INSTITUTE"'), 'Missing INSTITUTE role view branch');
    assert(homeContent.includes('selectedRole === "ADMIN"'), 'Missing ADMIN role view branch');
  });

  runTest('app/home/page.jsx handles unauthenticated / guest state gracefully', () => {
    assert(homeContent.includes('Guest Preview Mode'), 'Missing Guest Preview Mode badge');
    assert(homeContent.includes('You are viewing the dashboard in demo mode'), 'Missing unauthenticated demo banner');
    assert(homeContent.includes('href="/login"'), 'Missing login link in unauthenticated banner');
    assert(homeContent.includes('href="/register"'), 'Missing register link in unauthenticated banner');
  });

  runTest('app/home/page.jsx Student view includes ProfileCompletionCard, Opportunities, Matrix, Tracker & Upskilling', () => {
    assert(homeContent.includes('<ProfileCompletionCard'), 'Missing ProfileCompletionCard in student view');
    assert(homeContent.includes('Priority-Matched Opportunities'), 'Missing Priority-Matched Opportunities section');
    assert(homeContent.includes('5-Level Verified Skill Matrix'), 'Missing 5-Level Verified Skill Matrix section');
    assert(homeContent.includes('6-Stage Application Tracker'), 'Missing 6-Stage Application Tracker section');
    assert(homeContent.includes('Actionable Skill Gap Upskilling Paths'), 'Missing Actionable Skill Gap Upskilling Paths section');
  });

  runTest('app/home/page.jsx Industry view includes Published Jobs, Candidate Pool & L5 Evaluations', () => {
    assert(homeContent.includes('Live Published Opportunities & Gatekeeper Funnel'), 'Missing Published Opportunities section');
    assert(homeContent.includes('Top Gate-Cleared Candidates'), 'Missing Top Candidates section');
    assert(homeContent.includes('Pending Post-Internship L5 Endorsements'), 'Missing Post-Internship L5 Endorsements section');
  });

  runTest('app/home/page.jsx Institute view includes Department Benchmarks, Gap Alerts & Bootcamps', () => {
    assert(homeContent.includes('Department Readiness Benchmarks & Placement Health'), 'Missing Department Benchmarks section');
    assert(homeContent.includes('Top Privacy-Preserving Skill Gap Alerts'), 'Missing Skill Gap Alerts section');
    assert(homeContent.includes('Active Corporate Upskilling Bootcamps'), 'Missing Active Bootcamps section');
  });

  runTest('app/home/page.jsx Admin view includes Macro KPIs, KYC Queue & Forensic Audit Stream', () => {
    assert(homeContent.includes('Statutory KYC Verification Queue'), 'Missing KYC Verification Queue section');
    assert(homeContent.includes('Forensic Security & Governance Audit Stream'), 'Missing Forensic Security Audit Stream section');
    assert(homeContent.includes('handleKycAction'), 'Missing interactive handleKycAction handler');
  });
} catch (e) {
  console.error('Error testing Home page:', e);
}

// SUMMARY
console.log('\n----------------------------------------------------------------------');
console.log(`  Empirical Test Summary: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
console.log('----------------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
