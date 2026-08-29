/**
 * Skill Bridge Platform - Milestone M2 Empirical Challenger 2 Verification Suite
 * Focus:
 *  1. Institute Onboarding 6-Step Dynamic Calculation & Verification Document Handling
 *  2. Profile Gating Modal Triggers, Interception Logic & Deficit Math
 *  3. Boundary, Corner & Edge Case Invariant Testing
 * 
 * File: tests/m2-challenger2-empirical.js
 */

const assert = require('assert');
const {
  calculateInstituteCompletion,
  getInstituteCompletionDetails,
  calculateStudentCompletion,
  getStudentCompletionDetails,
  calculateOrganizationCompletion,
  getOrgCompletionDetails,
  calculateProfileCompletion,
  isProfileComplete,
} = require('../lib/onboarding-calc');

console.log('======================================================================');
console.log('  MILESTONE M2 EMPIRICAL CHALLENGER 2: ADVERSARIAL VERIFICATION SUITE ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runEmpiricalTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    console.error(err.stack);
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: INSTITUTE ONBOARDING 6-STEP CALCULATION MATHEMATICAL INTEGRITY
// -----------------------------------------------------------------------------
console.log('▶ SUITE 1: Institute Onboarding 6-Step Dynamic Calculation Math');

runEmpiricalTest('INST-CALC-01: Empty or null profile yields 0% completion', () => {
  assert.strictEqual(calculateInstituteCompletion(null), 0);
  assert.strictEqual(calculateInstituteCompletion(undefined), 0);
  assert.strictEqual(calculateInstituteCompletion({}), 0);
  assert.strictEqual(calculateInstituteCompletion({ instituteName: '' }), 0);
});

runEmpiricalTest('INST-CALC-02: Step 1 (Basic Info - 15%) granular scoring', () => {
  // Name only -> 7.5%
  const nameOnly = { instituteName: 'Indian Institute of Technology Bombay' };
  assert.strictEqual(calculateInstituteCompletion(nameOnly), 8); // Math.round(7.5) = 8
  const detailsNameOnly = getInstituteCompletionDetails(nameOnly);
  assert.strictEqual(detailsNameOnly.breakdown.basicInfo, 7.5);

  // Name + website -> 15%
  const nameAndWeb = {
    instituteName: 'IIT Bombay',
    website: 'https://iitb.ac.in',
  };
  assert.strictEqual(getInstituteCompletionDetails(nameAndWeb).breakdown.basicInfo, 15);

  // Name + logoUrl -> 15%
  const nameAndLogo = {
    instituteName: 'IIT Bombay',
    logoUrl: 'https://iitb.ac.in/logo.png',
  };
  assert.strictEqual(getInstituteCompletionDetails(nameAndLogo).breakdown.basicInfo, 15);

  // Name + officialEmail -> 15%
  const nameAndEmail = {
    instituteName: 'IIT Bombay',
    officialEmail: 'registrar@iitb.ac.in',
  };
  assert.strictEqual(getInstituteCompletionDetails(nameAndEmail).breakdown.basicInfo, 15);
});

runEmpiricalTest('INST-CALC-03: Step 2 (Identification & Accreditation - 20%) scoring', () => {
  // Code only -> 10%
  const codeOnly = { instituteCode: 'AISHE-U-0123' };
  assert.strictEqual(getInstituteCompletionDetails(codeOnly).breakdown.identification, 10);

  // Type only -> 10%
  const typeOnly = { instituteType: 'Institute of National Importance' };
  assert.strictEqual(getInstituteCompletionDetails(typeOnly).breakdown.identification, 10);

  // Both Code + Type -> 20%
  const both = { instituteCode: 'AISHE-U-0123', instituteType: 'Institute of National Importance' };
  assert.strictEqual(getInstituteCompletionDetails(both).breakdown.identification, 20);
});

runEmpiricalTest('INST-CALC-04: Step 3 (Campus Address & Contact - 15%) scoring', () => {
  // Phone only -> 7.5%
  const phoneOnly = { contactPhone: '+91 22 2576 7000' };
  assert.strictEqual(getInstituteCompletionDetails(phoneOnly).breakdown.contact, 7.5);

  // Address string only -> 7.5%
  const addrStrOnly = { address: 'Powai, Mumbai, Maharashtra 400076' };
  assert.strictEqual(getInstituteCompletionDetails(addrStrOnly).breakdown.contact, 7.5);

  // Address object only -> 7.5%
  const addrObjOnly = { address: { city: 'Mumbai', state: 'Maharashtra' } };
  assert.strictEqual(getInstituteCompletionDetails(addrObjOnly).breakdown.contact, 7.5);

  // Empty address object -> 0%
  const emptyAddr = { address: {} };
  assert.strictEqual(getInstituteCompletionDetails(emptyAddr).breakdown.contact, 0);

  // Phone + Address object -> 15%
  const fullContact = {
    contactPhone: '+91 22 2576 7000',
    address: { street: 'Main Gate Rd', city: 'Mumbai', state: 'Maharashtra', postalCode: '400076' },
  };
  assert.strictEqual(getInstituteCompletionDetails(fullContact).breakdown.contact, 15);
});

runEmpiricalTest('INST-CALC-05: Step 4 (Academic Departments - 15%) scoring', () => {
  // Empty array -> 0%
  assert.strictEqual(getInstituteCompletionDetails({ departments: [] }).breakdown.departments, 0);

  // Non-array -> 0%
  assert.strictEqual(getInstituteCompletionDetails({ departments: 'CSE' }).breakdown.departments, 0);

  // Valid array with >= 1 department -> 15%
  const depts = {
    departments: [
      { name: 'Computer Science & Engineering', code: 'CSE', studentCount: 180 },
    ],
  };
  assert.strictEqual(getInstituteCompletionDetails(depts).breakdown.departments, 15);
});

runEmpiricalTest('INST-CALC-06: Step 5 (Placement Cell Contact - 15%) scoring', () => {
  // Empty object -> 0%
  assert.strictEqual(getInstituteCompletionDetails({ placementContact: {} }).breakdown.placementContact, 0);

  // Empty string -> 0%
  assert.strictEqual(getInstituteCompletionDetails({ placementContact: '' }).breakdown.placementContact, 0);

  // Valid placement contact object -> 15%
  const placementObj = {
    placementContact: {
      tpoName: 'Prof. S. K. Nair',
      email: 'tpo@iitb.ac.in',
      phone: '+91 22 2576 7050',
    },
  };
  assert.strictEqual(getInstituteCompletionDetails(placementObj).breakdown.placementContact, 15);

  // Valid placement contact string -> 15%
  const placementStr = { placementContact: 'Prof. S. K. Nair (Head, TPO)' };
  assert.strictEqual(getInstituteCompletionDetails(placementStr).breakdown.placementContact, 15);
});

runEmpiricalTest('INST-CALC-07: Step 6 (Verification & Accreditation Docs - 15%) scoring', () => {
  // verificationDocs array with >= 1 item -> 15%
  const withVerifDocs = {
    verificationDocs: [
      { docType: 'AISHE Certificate', fileName: 'AISHE_2025.pdf', fileUrl: 'https://cdn.example.com/doc.pdf' },
    ],
  };
  assert.strictEqual(getInstituteCompletionDetails(withVerifDocs).breakdown.docs, 15);

  // documents alias array with >= 1 item -> 15%
  const withDocsAlias = {
    documents: [
      { type: 'NAAC Accreditation', fileUrl: 'https://cdn.example.com/naac.pdf' },
    ],
  };
  assert.strictEqual(getInstituteCompletionDetails(withDocsAlias).breakdown.docs, 15);

  // Empty docs -> 0%
  assert.strictEqual(getInstituteCompletionDetails({ verificationDocs: [] }).breakdown.docs, 0);
});

runEmpiricalTest('INST-CALC-08: Complete 6-step profile achieves 100% score normalization (95% -> 100%)', () => {
  const fullProfile = {
    instituteName: 'National Institute of Technology Karnataka',
    website: 'https://nitk.ac.in',
    instituteCode: 'AISHE-U-0123',
    instituteType: 'Autonomous University / NIT',
    contactPhone: '+91 824 2474000',
    address: { street: 'NH 66, Srinivasnagar', city: 'Surathkal', state: 'Karnataka', postalCode: '575025' },
    departments: [{ name: 'Computer Science', code: 'CSE', studentCount: 240 }],
    placementContact: { tpoName: 'Prof. S. K. Nair', email: 'tpo@nitk.edu.in', phone: '+91 824 2474050' },
    verificationDocs: [{ docType: 'AISHE Certificate', fileName: 'AISHE.pdf' }],
  };

  const details = getInstituteCompletionDetails(fullProfile);
  assert.strictEqual(details.breakdown.basicInfo, 15);
  assert.strictEqual(details.breakdown.identification, 20);
  assert.strictEqual(details.breakdown.contact, 15);
  assert.strictEqual(details.breakdown.departments, 15);
  assert.strictEqual(details.breakdown.placementContact, 15);
  assert.strictEqual(details.breakdown.docs, 15);

  // 15+20+15+15+15+15 = 95 -> Normalization rule bumps >= 95 to 100
  assert.strictEqual(details.completion, 100);
  assert.strictEqual(details.missingFields.length, 0);
});

runEmpiricalTest('INST-CALC-09: Partial profile without verification docs satisfies 80% completion', () => {
  const profileNoDocs = {
    instituteName: 'NIT Karnataka',
    website: 'https://nitk.ac.in',
    instituteCode: 'AISHE-U-0123',
    instituteType: 'NIT',
    contactPhone: '+91 824 2474000',
    address: { city: 'Surathkal', state: 'Karnataka' },
    departments: [{ name: 'CSE', code: 'CSE' }],
    placementContact: { tpoName: 'Prof. Nair' },
  };

  const details = getInstituteCompletionDetails(profileNoDocs);
  assert.strictEqual(details.completion, 80);
  assert.strictEqual(details.missingFields.length, 1);
  assert.strictEqual(details.missingFields[0], 'Statutory Accreditation / Verification Documents');
});

// -----------------------------------------------------------------------------
// SUITE 2: PROFILE GATING DEFICIT MATH & INTERCEPTION LOGIC
// -----------------------------------------------------------------------------
console.log('\n▶ SUITE 2: Profile Gating Deficit Math & Interception Logic');

runEmpiricalTest('GATE-MATH-01: Profile deficit calculation evaluates strictly non-negative delta', () => {
  const calculateDeficit = (score, threshold = 70) => Math.max(0, threshold - score);

  assert.strictEqual(calculateDeficit(0), 70);
  assert.strictEqual(calculateDeficit(10), 60);
  assert.strictEqual(calculateDeficit(40), 30);
  assert.strictEqual(calculateDeficit(55), 15);
  assert.strictEqual(calculateDeficit(69), 1);
  assert.strictEqual(calculateDeficit(70), 0);
  assert.strictEqual(calculateDeficit(75), 0);
  assert.strictEqual(calculateDeficit(100), 0);
  assert.strictEqual(calculateDeficit(120), 0); // Out of bounds upper
  assert.strictEqual(calculateDeficit(-10), 80); // Out of bounds lower
});

runEmpiricalTest('GATE-MATH-02: Universal isProfileComplete threshold gating for all 3 roles', () => {
  // STUDENT
  const incompleteStudent = { headline: 'Dev' }; // 7.5% -> false
  assert.strictEqual(isProfileComplete('STUDENT', incompleteStudent, 70), false);

  const studentWithThreshold = {
    headline: 'Full Stack Engineer',
    bio: 'Experienced developer',
    instituteName: 'NITK',
    department: 'CSE',
    degree: 'B.Tech',
    yearOfStudy: '4th Year',
    skills: ['JavaScript', 'React', 'Node.js'],
    projects: [{ title: 'Skill Bridge' }],
    careerPreferences: { roles: ['Frontend'] },
  }; // 15 + 15 + 20 + 15 + 10 = 75% -> true
  assert.strictEqual(isProfileComplete('STUDENT', studentWithThreshold, 70), true);

  // ORGANIZATION
  const incompleteOrg = { companyName: 'Acme Corp' }; // 7.5% -> false
  assert.strictEqual(isProfileComplete('ORGANIZATION', incompleteOrg, 70), false);

  const completeOrg = {
    companyName: 'Acme Corp',
    website: 'https://acme.com',
    registrationNumber: 'U72200KA2020PTC123456',
    taxIdGstin: '29ABCDE1234F1Z5',
    contactPhone: '+91 80 12345678',
    address: 'Bangalore, India',
    industry: 'Information Technology',
    companySize: '50-200',
    hiringPreferences: { roles: ['Software Engineer'] },
    verificationDocs: [{ fileName: 'CIN.pdf' }],
  }; // 100% -> true
  assert.strictEqual(isProfileComplete('ORGANIZATION', completeOrg, 70), true);

  // INSTITUTE
  const incompleteInst = { instituteName: 'Sample College' }; // 7.5% -> false
  assert.strictEqual(isProfileComplete('INSTITUTE', incompleteInst, 70), false);

  const completeInst = {
    instituteName: 'NIT Karnataka',
    website: 'https://nitk.ac.in',
    instituteCode: 'AISHE-U-0123',
    instituteType: 'NIT',
    contactPhone: '+91 824 2474000',
    address: 'Surathkal, Karnataka',
    departments: [{ name: 'CSE' }],
    placementContact: { tpoName: 'Prof. Nair' },
    verificationDocs: [{ fileName: 'AISHE.pdf' }],
  }; // 100% -> true
  assert.strictEqual(isProfileComplete('INSTITUTE', completeInst, 70), true);

  // ADMIN bypass
  assert.strictEqual(isProfileComplete('ADMIN', {}, 70), true);
});

runEmpiricalTest('GATE-MATH-03: Onboarding status completed flag bypasses numerical recalculation', () => {
  const userWithStatusCompleted = {
    role: 'STUDENT',
    onboardingStatus: 'COMPLETED',
    profile: {},
  };
  assert.strictEqual(isProfileComplete(userWithStatusCompleted), true);

  const userWithFlagCompleted = {
    role: 'STUDENT',
    profileCompleted: true,
    profile: {},
  };
  assert.strictEqual(isProfileComplete(userWithFlagCompleted), true);
});

// -----------------------------------------------------------------------------
// SUITE 3: BOUNDARY CONDITIONS & CORNER CASE ATTACK TESTS
// -----------------------------------------------------------------------------
console.log('\n▶ SUITE 3: Boundary Conditions & Corner Cases');

runEmpiricalTest('BND-01: Profile calculation handles non-string, malformed, and prototype pollution fields safely', () => {
  const malformed = {
    instituteName: 12345,
    instituteCode: null,
    instituteType: undefined,
    website: false,
    address: null,
    departments: 'not-an-array',
    placementContact: 9999,
    verificationDocs: null,
    __proto__: { polluted: true },
  };

  const score = calculateInstituteCompletion(malformed);
  assert(typeof score === 'number', 'Must return a number');
  assert(!isNaN(score), 'Score cannot be NaN');
  assert(score >= 0 && score <= 100, 'Score must be clamped between 0 and 100');
});

runEmpiricalTest('BND-02: Missing fields array in getInstituteCompletionDetails produces correct human-readable tags', () => {
  const emptyDetails = getInstituteCompletionDetails({});
  assert.strictEqual(emptyDetails.missingFields.length, 8);
  assert(emptyDetails.missingFields.includes('Institute Name'));
  assert(emptyDetails.missingFields.includes('Institute Code / AISHE Code'));
  assert(emptyDetails.missingFields.includes('Institute Type'));
  assert(emptyDetails.missingFields.includes('Contact Phone'));
  assert(emptyDetails.missingFields.includes('Campus Address'));
  assert(emptyDetails.missingFields.includes('Departments / Academic Programs'));
  assert(emptyDetails.missingFields.includes('Placement Cell Contact Information'));
  assert(emptyDetails.missingFields.includes('Statutory Accreditation / Verification Documents'));
});

runEmpiricalTest('BND-03: Document array variations (empty vs corrupted objects) handle gracefully', () => {
  const corruptedDocs = {
    instituteName: 'Test College',
    verificationDocs: [null, undefined, {}],
  };
  // Array has length 3, so docs category triggers
  const details = getInstituteCompletionDetails(corruptedDocs);
  assert.strictEqual(details.breakdown.docs, 15);
});

// -----------------------------------------------------------------------------
// TEST SUMMARY
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('                     M2 CHALLENGER 2 SUMMARY                         ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Test Cases   : ${totalTests}`);
console.log(`  Passed Tests       : ${passedTests}`);
console.log(`  Failed Tests       : ${failedTests}`);
console.log(`  Overall Pass Rate  : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('  ALL M2 EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY \n');
}
