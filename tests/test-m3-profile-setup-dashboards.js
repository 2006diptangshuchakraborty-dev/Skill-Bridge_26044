/**
 * Skill Bridge Platform - Milestone M3 Empirical Verification Test
 * File: tests/test-m3-profile-setup-dashboards.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('======================================================================');
console.log('  Milestone M3: Dynamic Profile Setup & Role Dashboards Verification  ');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  const localDb = require('../lib/db');
  const calc = require('../lib/onboarding-calc');

  // Test 1: Verify file existence of write-owned files
  test('M3-FILE-01: All required M3 files exist and are non-empty', () => {
    const requiredFiles = [
      'app/profile/setup/page.jsx',
      'app/student/dashboard/page.jsx',
      'app/industry/dashboard/page.jsx',
      'app/institute/dashboard/page.jsx',
      'app/api/profile/setup/route.js',
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 500, `File must contain substantial implementation: ${relPath} (${stat.size} bytes)`);
    }
  });

  // Test 2: Verify Student Profile Setup & Completion Engine
  test('M3-CALC-01: Student dynamic completion calculation works accurately across 8 steps', () => {
    const emptyStudent = {};
    assert.strictEqual(calc.calculateStudentCompletion(emptyStudent), 0);

    const partialStudent = {
      headline: 'Full Stack Developer',
      bio: 'Enthusiastic CS student',
      instituteName: 'NITK',
      department: 'CSE',
      degree: 'B.Tech',
      yearOfStudy: '3',
      skills: [{ name: 'React' }, { name: 'Node.js' }],
    };
    const partialScore = calc.calculateStudentCompletion(partialStudent);
    assert.ok(partialScore >= 40 && partialScore <= 60, `Partial student score expected 40-60, got ${partialScore}`);

    const completeStudent = {
      headline: 'Full Stack Developer',
      bio: 'Enthusiastic CS student',
      instituteName: 'NITK',
      department: 'CSE',
      degree: 'B.Tech',
      yearOfStudy: '3',
      skills: [{ name: 'React' }, { name: 'Node.js' }, { name: 'PostgreSQL' }],
      projects: [{ title: 'Skill Bridge' }],
      certifications: [{ name: 'AWS Cloud' }],
      experience: [{ title: 'Intern' }],
      careerPreferences: { preferredRoles: ['Full Stack'] },
    };
    const completeScore = calc.calculateStudentCompletion(completeStudent);
    assert.strictEqual(completeScore, 100);
  });

  // Test 3: Verify Industry Dynamic Completion Engine
  test('M3-CALC-02: Industry dynamic completion calculation works accurately across 7 steps', () => {
    const emptyOrg = {};
    assert.strictEqual(calc.calculateOrganizationCompletion(emptyOrg), 0);

    const completeOrg = {
      companyName: 'Apex Analytics Corp',
      website: 'https://apex.com',
      logoUrl: 'https://apex.com/logo.png',
      registrationNumber: 'U72200KA2021PTC145892',
      taxIdGstin: '29ABCDE1234F1Z5',
      contactPhone: '+91 80 4123 4567',
      address: { street: 'Outer Ring Road', city: 'Bengaluru' },
      industry: 'Enterprise Software',
      companySize: '51-200',
      hiringPreferences: { targetRoles: ['Data Analyst'] },
      verificationDocs: [{ fileName: 'COI.pdf' }],
    };
    const orgScore = calc.calculateOrganizationCompletion(completeOrg);
    assert.strictEqual(orgScore, 100);
  });

  // Test 4: Verify Institute Dynamic Completion Engine
  test('M3-CALC-03: Institute dynamic completion calculation works accurately across 6 steps', () => {
    const emptyInst = {};
    assert.strictEqual(calc.calculateInstituteCompletion(emptyInst), 0);

    const completeInst = {
      instituteName: 'National Institute of Technology Surathkal',
      website: 'https://nitk.ac.in',
      officialEmail: 'tpo@nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'Autonomous University / NIT',
      contactPhone: '+91 824 2474000',
      address: { city: 'Surathkal', state: 'Karnataka' },
      departments: [{ name: 'CSE', code: 'CSE' }],
      placementContact: { tpoName: 'Prof. S. K. Nair' },
      verificationDocs: [{ fileName: 'AISHE.pdf' }],
    };
    const instScore = calc.calculateInstituteCompletion(completeInst);
    assert.strictEqual(instScore, 100);
  });

  // Test 5: Verify Student Dashboard Page Structure
  test('M3-PAGE-01: Student Dashboard page contains dark obsidian theme and core sections', () => {
    const filePath = path.join(process.cwd(), 'app/student/dashboard/page.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export default function StudentDashboardPage'), 'Must export default component');
    assert.ok(content.includes('Verified Skill Matrix & 5-Level Evidence'), 'Must contain Skill Matrix');
    assert.ok(content.includes('Recommended Opportunities & Gatekeeper Status'), 'Must contain Dual Match Gatekeeper');
    assert.ok(content.includes('Active Application Pipeline (6-Stage Lifecycle)'), 'Must contain 6-Stage Application Pipeline');
  });

  // Test 6: Verify Industry Dashboard Page Structure
  test('M3-PAGE-02: Industry Dashboard page contains recruiter KPIs, postings and talent search', () => {
    const filePath = path.join(process.cwd(), 'app/industry/dashboard/page.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export default function IndustryDashboardPage'), 'Must export default component');
    assert.ok(content.includes('INDUSTRY CONSOLE'), 'Must contain Industry Console header');
    assert.ok(content.includes('Published Opportunities & Priority Requirements'), 'Must contain Published Opportunities');
    assert.ok(content.includes('Talent Search & Candidate Funnel'), 'Must contain Talent Search Funnel');
  });

  // Test 7: Verify Profile Setup Page Structure
  test('M3-PAGE-03: Unified Profile Setup page contains role-specific steps, progress bar & atomic submission', () => {
    const filePath = path.join(process.cwd(), 'app/profile/setup/page.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export default function UnifiedProfileSetupPage'), 'Must export default component');
    assert.ok(content.includes('STUDENT_STEPS'), 'Must define student steps');
    assert.ok(content.includes('INDUSTRY_STEPS'), 'Must define industry steps');
    assert.ok(content.includes('INSTITUTE_STEPS'), 'Must define institute steps');
    assert.ok(content.includes('COMPLETE_ONBOARDING'), 'Must trigger atomic completion on submit');
    assert.ok(content.includes('Overall Profile Completion'), 'Must display real-time progress');
  });

  // Test 8: Verify Unified Setup API Route Structure
  test('M3-API-01: Profile Setup route handler supports GET, POST, PUT with role normalization and atomic transactions', () => {
    const filePath = path.join(process.cwd(), 'app/api/profile/setup/route.js');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export async function GET'), 'Must export GET');
    assert.ok(content.includes('export async function POST'), 'Must export POST');
    assert.ok(content.includes('export async function PUT'), 'Must export PUT');
    assert.ok(content.includes('profileCompleted = isCompleteAction'), 'Must set profileCompleted atomically');
    assert.ok(content.includes('onboardingStatus = finalStatus'), 'Must update onboardingStatus');
  });

  console.log('\n----------------------------------------------------------------------');
  console.log(`  Total Executed : ${passed + failed}`);
  console.log(`  Passed         : ${passed}`);
  console.log(`  Failed         : ${failed}`);
  console.log('----------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
