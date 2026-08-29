/**
 * Milestone M1 Empirical Challenge Test Suite
 * File: tests/m1-profile-calc-empirical-challenge.test.js
 * 
 * Deep boundary, stress, fuzz, and contract verification for:
 * 1. calculateStudentCompletion
 * 2. calculateOrganizationCompletion
 * 3. calculateInstituteCompletion
 * 4. calculateProfileCompletion (Universal router)
 * 5. isProfileComplete (Threshold & bypass gates)
 * 6. getStudentCompletionDetails, getOrgCompletionDetails, getInstituteCompletionDetails
 */

const assert = require('assert');
const {
  calculateStudentCompletion,
  calculateOrganizationCompletion,
  calculateOrgCompletion,
  calculateInstituteCompletion,
  calculateInstCompletion,
  calculateProfileCompletion,
  isProfileComplete,
  getStudentCompletionDetails,
  getOrgCompletionDetails,
  getInstituteCompletionDetails,
} = require('../lib/onboarding-calc');

console.log('======================================================================');
console.log('  MILESTONE M1 EMPIRICAL CHALLENGE SUITE: PROFILE CALC & SCHEMAS     ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureLog = [];

function challenge(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failureLog.push({ name, error: err.message, stack: err.stack });
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: STUDENT PROFILE COMPLETION BOUNDARIES
// ----------------------------------------------------------------------------
console.log('▶ SUITE 1: calculateStudentCompletion Boundary & Edge Conditions');

challenge('STU-01: Null, undefined, empty object, and primitive inputs return 0', () => {
  assert.strictEqual(calculateStudentCompletion(null), 0);
  assert.strictEqual(calculateStudentCompletion(undefined), 0);
  assert.strictEqual(calculateStudentCompletion({}), 0);
  assert.strictEqual(calculateStudentCompletion(0), 0);
  assert.strictEqual(calculateStudentCompletion(''), 0);
  assert.strictEqual(calculateStudentCompletion(false), 0);
});

challenge('STU-02: Granular category scores add up correctly', () => {
  // Step 1: Basic Info
  assert.strictEqual(calculateStudentCompletion({ headline: 'Dev' }), 8); // 7.5 rounded -> 8
  assert.strictEqual(calculateStudentCompletion({ bio: 'Bio' }), 8); // 7.5 rounded -> 8
  assert.strictEqual(calculateStudentCompletion({ headline: 'Dev', bio: 'Bio' }), 15);

  // Step 2: Academic Info
  assert.strictEqual(calculateStudentCompletion({ instituteName: 'IIT' }), 8);
  assert.strictEqual(calculateStudentCompletion({ instituteName: 'IIT', department: 'CS' }), 8);
  assert.strictEqual(calculateStudentCompletion({
    instituteName: 'IIT', department: 'CS', degree: 'BTech', yearOfStudy: '3'
  }), 15);
  assert.strictEqual(calculateStudentCompletion({
    instituteName: 'IIT', department: 'CS', degree: 'BTech', graduationYear: '2026'
  }), 15);

  // Step 3: Skills
  assert.strictEqual(calculateStudentCompletion({ skills: [] }), 0);
  assert.strictEqual(calculateStudentCompletion({ skills: ['Python'] }), 10);
  assert.strictEqual(calculateStudentCompletion({ skills: ['Python', 'SQL'] }), 10);
  assert.strictEqual(calculateStudentCompletion({ skills: ['Python', 'SQL', 'React'] }), 20);
  assert.strictEqual(calculateStudentCompletion({ skills: ['a', 'b', 'c', 'd', 'e', 'f'] }), 20);

  // Step 4: Projects
  assert.strictEqual(calculateStudentCompletion({ projects: [] }), 0);
  assert.strictEqual(calculateStudentCompletion({ projects: [{ title: 'P1' }] }), 15);

  // Step 5: Certifications
  assert.strictEqual(calculateStudentCompletion({ certifications: [] }), 0);
  assert.strictEqual(calculateStudentCompletion({ certifications: [{ title: 'C1' }] }), 10);

  // Step 6: Experience
  assert.strictEqual(calculateStudentCompletion({ experience: [] }), 0);
  assert.strictEqual(calculateStudentCompletion({ experience: [{ company: 'E1' }] }), 10);

  // Step 7: Career Preferences
  assert.strictEqual(calculateStudentCompletion({ careerPreferences: {} }), 0);
  assert.strictEqual(calculateStudentCompletion({ careerPreferences: { roles: ['Dev'] } }), 10);
});

challenge('STU-03: Full student profile scores exactly 100 with normalization threshold bump', () => {
  const fullProfile = {
    headline: 'Senior Full Stack Developer',
    bio: 'Passionate software engineer building scalable web applications.',
    instituteName: 'Indian Institute of Technology, Bombay',
    department: 'Computer Science & Engineering',
    degree: 'Bachelor of Technology',
    yearOfStudy: '4th Year',
    graduationYear: '2026',
    skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL'],
    projects: [
      { title: 'Skill Bridge Platform', description: 'AI powered recruitment and verification.' }
    ],
    certifications: [
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' }
    ],
    experience: [
      { title: 'Software Engineering Intern', company: 'Google' }
    ],
    careerPreferences: {
      targetRoles: ['Full Stack Engineer', 'Backend Engineer'],
      preferredLocations: ['Bengaluru', 'Remote']
    }
  };

  const score = calculateStudentCompletion(fullProfile);
  assert.strictEqual(score, 100);
});

challenge('STU-04: Extreme non-array types for array fields do not crash and score 0', () => {
  const malformedProfile = {
    skills: 'not an array',
    projects: 12345,
    certifications: { foo: 'bar' },
    experience: true,
    careerPreferences: 'not an object'
  };
  const score = calculateStudentCompletion(malformedProfile);
  assert.strictEqual(score, 0);
});

// ----------------------------------------------------------------------------
// SUITE 2: ORGANIZATION PROFILE COMPLETION BOUNDARIES
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 2: calculateOrganizationCompletion Boundary & Edge Conditions');

challenge('ORG-01: Null, undefined, and empty objects return 0', () => {
  assert.strictEqual(calculateOrganizationCompletion(null), 0);
  assert.strictEqual(calculateOrganizationCompletion(undefined), 0);
  assert.strictEqual(calculateOrganizationCompletion({}), 0);
  assert.strictEqual(calculateOrgCompletion({}), 0); // Alias check
});

challenge('ORG-02: Organization partial calculations and address polymorphism (string vs object)', () => {
  // Company basic
  assert.strictEqual(calculateOrganizationCompletion({ companyName: 'Acme Corp' }), 8); // 7.5 -> 8
  assert.strictEqual(calculateOrganizationCompletion({ companyName: 'Acme Corp', website: 'https://acme.com' }), 10);
  assert.strictEqual(calculateOrganizationCompletion({ companyName: 'Acme Corp', website: 'https://acme.com', logoUrl: 'https://acme.com/logo.png' }), 15);

  // Legal & Registration
  assert.strictEqual(calculateOrganizationCompletion({ registrationNumber: 'U72200MH2020PTC123456' }), 10);
  assert.strictEqual(calculateOrganizationCompletion({ taxIdGstin: '27AAAAA0000A1Z5' }), 10);
  assert.strictEqual(calculateOrganizationCompletion({ registrationNumber: 'CIN123', taxIdGstin: 'GST123' }), 20);

  // Address as string vs object
  assert.strictEqual(calculateOrganizationCompletion({ contactPhone: '+919876543210', address: '123 Tech Park, Bengaluru' }), 15);
  assert.strictEqual(calculateOrganizationCompletion({ contactPhone: '+919876543210', address: { city: 'Bengaluru', country: 'India' } }), 15);
  assert.strictEqual(calculateOrganizationCompletion({ contactPhone: '+919876543210', address: '' }), 8);
  assert.strictEqual(calculateOrganizationCompletion({ contactPhone: '+919876543210', address: {} }), 8);

  // Documents (verificationDocs vs documents)
  assert.strictEqual(calculateOrganizationCompletion({ verificationDocs: [{ url: 'doc1.pdf' }] }), 15);
  assert.strictEqual(calculateOrganizationCompletion({ documents: [{ url: 'doc1.pdf' }] }), 15);
});

challenge('ORG-03: Full organization profile scores 100', () => {
  const fullOrg = {
    companyName: 'Apex Innovations Pvt Ltd',
    website: 'https://apexinnovations.io',
    logoUrl: 'https://apexinnovations.io/logo.svg',
    registrationNumber: 'U72200KA2021PTC987654',
    taxIdGstin: '29ABCDE1234F1Z5',
    contactPhone: '+91 80 1234 5678',
    address: 'Embassy TechVillage, Outer Ring Road, Bengaluru',
    industry: 'Information Technology & Services',
    companySize: '50-200',
    hiringPreferences: {
      internshipDuration: '6 Months',
      stipendRange: '₹30,000 - ₹50,000 / month',
      domains: ['Full Stack', 'Data Engineering']
    },
    verificationDocs: [
      { name: 'Certificate of Incorporation', url: 'https://s3.amazonaws.com/coi.pdf' }
    ]
  };

  assert.strictEqual(calculateOrganizationCompletion(fullOrg), 100);
});

// ----------------------------------------------------------------------------
// SUITE 3: INSTITUTE PROFILE COMPLETION BOUNDARIES
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 3: calculateInstituteCompletion Boundary & Edge Conditions');

challenge('INS-01: Null, undefined, and empty objects return 0', () => {
  assert.strictEqual(calculateInstituteCompletion(null), 0);
  assert.strictEqual(calculateInstituteCompletion(undefined), 0);
  assert.strictEqual(calculateInstituteCompletion({}), 0);
  assert.strictEqual(calculateInstCompletion({}), 0); // Alias check
});

challenge('INS-02: Institute partial calculations and contacts', () => {
  // Basic info (15%)
  assert.strictEqual(calculateInstituteCompletion({ instituteName: 'National Institute of Tech' }), 8);
  assert.strictEqual(calculateInstituteCompletion({ instituteName: 'NIT', website: 'https://nit.ac.in' }), 15);
  assert.strictEqual(calculateInstituteCompletion({ instituteName: 'NIT', officialEmail: 'tpo@nit.ac.in' }), 15);

  // Accreditation (20%)
  assert.strictEqual(calculateInstituteCompletion({ instituteCode: 'AISHE-U-1234' }), 10);
  assert.strictEqual(calculateInstituteCompletion({ instituteCode: 'AISHE-U-1234', instituteType: 'Government Autonomous' }), 20);

  // Departments (15%)
  assert.strictEqual(calculateInstituteCompletion({ departments: [] }), 0);
  assert.strictEqual(calculateInstituteCompletion({ departments: ['CSE', 'ECE'] }), 15);

  // Placement Contact (15%)
  assert.strictEqual(calculateInstituteCompletion({ placementContact: 'Prof. Sharma (TPO)' }), 15);
  assert.strictEqual(calculateInstituteCompletion({ placementContact: { name: 'Prof. Sharma', email: 'tpo@nit.ac.in' } }), 15);
});

challenge('INS-03: Full institute profile scores 100', () => {
  const fullInst = {
    instituteName: 'National Institute of Technology Karnataka',
    website: 'https://nitk.ac.in',
    logoUrl: 'https://nitk.ac.in/logo.png',
    officialEmail: 'tpo@nitk.edu.in',
    instituteCode: 'AISHE-U-0237',
    instituteType: 'Institute of National Importance',
    contactPhone: '+91 824 2474000',
    address: 'NH 66, Srinivasnagar, Surathkal, Mangalore, Karnataka 575025',
    departments: ['Computer Science', 'Information Technology', 'Electronics & Comm'],
    placementContact: {
      headName: 'Dr. Placement Officer',
      email: 'placements@nitk.edu.in',
      phone: '+91 824 2474050'
    },
    verificationDocs: [
      { name: 'AICTE / NIRF Accreditation Document', url: 'https://nitk.ac.in/nirf-2026.pdf' }
    ]
  };

  assert.strictEqual(calculateInstituteCompletion(fullInst), 100);
});

// ----------------------------------------------------------------------------
// SUITE 4: UNIVERSAL ROUTER calculateProfileCompletion
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 4: calculateProfileCompletion Universal Multi-Role Routing');

challenge('ROU-01: Routes correctly by role string (STUDENT, ORGANIZATION, INDUSTRY, INSTITUTE, ADMIN)', () => {
  const sampleStudent = { headline: 'Dev', bio: 'Bio', skills: ['A', 'B', 'C'] }; // 15 + 20 = 35%
  assert.strictEqual(calculateProfileCompletion('STUDENT', sampleStudent), 35);
  assert.strictEqual(calculateProfileCompletion('student', sampleStudent), 35); // Lowercase check

  const sampleOrg = { companyName: 'Acme', registrationNumber: 'CIN1', taxIdGstin: 'GST1' }; // 7.5 + 20 = 27.5 -> 28%
  assert.strictEqual(calculateProfileCompletion('ORGANIZATION', sampleOrg), 28);
  assert.strictEqual(calculateProfileCompletion('INDUSTRY', sampleOrg), 28); // INDUSTRY synonym
  assert.strictEqual(calculateProfileCompletion('industry', sampleOrg), 28);

  const sampleInst = { instituteName: 'IIT', instituteCode: 'C1', instituteType: 'Govt' }; // 7.5 + 20 = 27.5 -> 28%
  assert.strictEqual(calculateProfileCompletion('INSTITUTE', sampleInst), 28);
  assert.strictEqual(calculateProfileCompletion('institute', sampleInst), 28);

  // ADMIN with object: returns 100%
  assert.strictEqual(calculateProfileCompletion('ADMIN', {}), 100);
  assert.strictEqual(calculateProfileCompletion({ role: 'ADMIN' }), 100);
  
  // Note: calculateProfileCompletion('ADMIN', null) returns 0 due to early `if (!profileData) return 0;` guard
  assert.strictEqual(calculateProfileCompletion('ADMIN', null), 0);
});

challenge('ROU-02: Routes correctly from composite User objects with nested profiles', () => {
  const studentUser = {
    role: 'STUDENT',
    studentProfile: { headline: 'Developer', bio: 'Bio', skills: ['JS', 'TS', 'Py'] }
  };
  assert.strictEqual(calculateProfileCompletion(studentUser), 35);

  const orgUser = {
    role: 'ORGANIZATION',
    organizationProfile: { companyName: 'Apex', registrationNumber: 'CIN', taxIdGstin: 'GST' }
  };
  assert.strictEqual(calculateProfileCompletion(orgUser), 28);

  const instituteUser = {
    role: 'INSTITUTE',
    instituteProfile: { instituteName: 'IIIT', instituteCode: 'CODE', instituteType: 'Autonomous' }
  };
  assert.strictEqual(calculateProfileCompletion(instituteUser), 28);

  const adminUser = {
    role: 'ADMIN'
  };
  assert.strictEqual(calculateProfileCompletion(adminUser), 100);
});

challenge('ROU-03: Defaults safely to STUDENT when role is unknown or missing', () => {
  const genericProfile = { headline: 'Developer', bio: 'Bio' };
  assert.strictEqual(calculateProfileCompletion('UNKNOWN_ROLE', genericProfile), 15);
  assert.strictEqual(calculateProfileCompletion({}, genericProfile), 15);
});

// ----------------------------------------------------------------------------
// SUITE 5: isProfileComplete THRESHOLD & OVERRIDE GATES
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 5: isProfileComplete Threshold Gating & Overrides');

challenge('GAT-01: Strict boundary threshold evaluation (69% -> false, 70% -> true)', () => {
  // Construct student profile scoring ~65% (Basic 15 + Acad 15 + Skills 20 + Proj 15 = 65%)
  const profile65 = {
    headline: 'Dev',
    bio: 'Bio',
    instituteName: 'Univ',
    department: 'CS',
    degree: 'BTech',
    graduationYear: '2026',
    skills: ['A', 'B', 'C'],
    projects: [{ title: 'P1' }]
  };
  assert.strictEqual(calculateStudentCompletion(profile65), 65);
  assert.strictEqual(isProfileComplete('STUDENT', profile65, 70), false);
  assert.strictEqual(isProfileComplete('STUDENT', profile65), false); // Default threshold 70

  // Add Certifications (+10%) -> 75%
  const profile75 = { ...profile65, certifications: [{ title: 'C1' }] };
  assert.strictEqual(calculateStudentCompletion(profile75), 75);
  assert.strictEqual(isProfileComplete('STUDENT', profile75, 70), true);
  assert.strictEqual(isProfileComplete('STUDENT', profile75), true);
});

challenge('GAT-02: Custom threshold parameter support', () => {
  const profile65 = {
    headline: 'Dev',
    bio: 'Bio',
    instituteName: 'Univ',
    department: 'CS',
    degree: 'BTech',
    graduationYear: '2026',
    skills: ['A', 'B', 'C'],
    projects: [{ title: 'P1' }]
  };
  assert.strictEqual(isProfileComplete('STUDENT', profile65, 60), true);
  assert.strictEqual(isProfileComplete('STUDENT', profile65, 65), true);
  assert.strictEqual(isProfileComplete('STUDENT', profile65, 66), false);
  assert.strictEqual(isProfileComplete('STUDENT', profile65, 80), false);
});

challenge('GAT-03: profileCompleted flag bypasses calculation threshold', () => {
  const emptyUserWithFlag = {
    role: 'STUDENT',
    profileCompleted: true,
    profile: {}
  };
  assert.strictEqual(isProfileComplete(emptyUserWithFlag), true);
});

challenge('GAT-04: onboardingStatus === "COMPLETED" flag bypasses calculation threshold', () => {
  const userWithStatusCompleted = {
    role: 'STUDENT',
    onboardingStatus: 'COMPLETED',
    profile: {}
  };
  assert.strictEqual(isProfileComplete(userWithStatusCompleted), true);

  const userWithStatusPending = {
    role: 'STUDENT',
    onboardingStatus: 'IN_PROGRESS',
    profile: {}
  };
  assert.strictEqual(isProfileComplete(userWithStatusPending), false);
});

// ----------------------------------------------------------------------------
// SUITE 6: GRANULAR DETAILS & BREAKDOWN INTEGRITY
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 6: Granular Details, Breakdown & Missing Fields Integrity');

challenge('DET-01: Student completion details returns matching breakdown and missing fields', () => {
  const partial = { headline: 'Engineer' };
  const details = getStudentCompletionDetails(partial);
  assert.strictEqual(typeof details.completion, 'number');
  assert.strictEqual(details.breakdown.basicInfo, 7.5);
  assert.strictEqual(details.breakdown.academic, 0);
  assert.ok(details.missingFields.includes('Personal Bio / Summary'));
  assert.ok(details.missingFields.includes('Institute Name'));
  assert.ok(details.missingFields.includes('Add at least 3 skills'));
});

challenge('DET-02: Organization completion details returns matching breakdown and missing fields', () => {
  const partial = { companyName: 'Nexus AI' };
  const details = getOrgCompletionDetails(partial);
  assert.strictEqual(typeof details.completion, 'number');
  assert.strictEqual(details.breakdown.companyInfo, 7.5);
  assert.ok(details.missingFields.includes('Registration Number (CIN/LLPIN)'));
  assert.ok(details.missingFields.includes('Tax ID (GSTIN)'));
});

challenge('DET-03: Institute completion details returns matching breakdown and missing fields', () => {
  const partial = { instituteName: 'Apex University' };
  const details = getInstituteCompletionDetails(partial);
  assert.strictEqual(typeof details.completion, 'number');
  assert.strictEqual(details.breakdown.basicInfo, 7.5);
  assert.ok(details.missingFields.includes('Institute Code / AISHE Code'));
  assert.ok(details.missingFields.includes('Placement Cell Contact Information'));
});

// ----------------------------------------------------------------------------
// SUITE 7: ADVERSARIAL STRESS & MONTE CARLO FUZZING (10,000 PERMUTATIONS)
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 7: Adversarial Stress & 10,000 Fuzzing Permutations');

challenge('FUZ-01: Fuzz test student completion across 5,000 random permutations', () => {
  const possibleKeys = [
    'headline', 'bio', 'instituteName', 'department', 'degree',
    'yearOfStudy', 'graduationYear', 'skills', 'projects', 'certifications',
    'experience', 'careerPreferences', 'unexpectedField'
  ];

  for (let i = 0; i < 5000; i++) {
    const mock = {};
    for (const key of possibleKeys) {
      const rand = Math.random();
      if (rand < 0.2) {
        // Leave undefined
      } else if (rand < 0.3) {
        mock[key] = null;
      } else if (rand < 0.4) {
        mock[key] = '';
      } else if (rand < 0.5) {
        mock[key] = 12345;
      } else if (rand < 0.6) {
        mock[key] = 'Valid String Content';
      } else if (rand < 0.7) {
        mock[key] = [];
      } else if (rand < 0.8) {
        mock[key] = Array(Math.floor(Math.random() * 10)).fill('item');
      } else {
        mock[key] = { nested: true, key: Math.random() };
      }
    }

    const score = calculateStudentCompletion(mock);
    assert.strictEqual(typeof score, 'number', 'Score must be a number');
    assert.ok(!isNaN(score), 'Score must not be NaN');
    assert.ok(Number.isInteger(score), 'Score must be an integer');
    assert.ok(score >= 0 && score <= 100, `Score ${score} must be within [0, 100]`);
  }
});

challenge('FUZ-02: Fuzz test organization completion across 3,000 random permutations', () => {
  const orgKeys = [
    'companyName', 'website', 'logoUrl', 'registrationNumber', 'taxIdGstin',
    'contactPhone', 'address', 'industry', 'companySize', 'hiringPreferences',
    'verificationDocs', 'documents'
  ];

  for (let i = 0; i < 3000; i++) {
    const mock = {};
    for (const key of orgKeys) {
      const rand = Math.random();
      if (rand < 0.2) mock[key] = null;
      else if (rand < 0.4) mock[key] = '';
      else if (rand < 0.6) mock[key] = 'Sample Value';
      else if (rand < 0.8) mock[key] = [1, 2, 3];
      else mock[key] = { obj: true };
    }

    const score = calculateOrganizationCompletion(mock);
    assert.strictEqual(typeof score, 'number');
    assert.ok(!isNaN(score));
    assert.ok(Number.isInteger(score));
    assert.ok(score >= 0 && score <= 100);
  }
});

challenge('FUZ-03: Fuzz test institute completion across 2,000 random permutations', () => {
  const instKeys = [
    'instituteName', 'website', 'logoUrl', 'officialEmail', 'instituteCode',
    'instituteType', 'contactPhone', 'address', 'departments', 'placementContact',
    'verificationDocs', 'documents'
  ];

  for (let i = 0; i < 2000; i++) {
    const mock = {};
    for (const key of instKeys) {
      const rand = Math.random();
      if (rand < 0.2) mock[key] = undefined;
      else if (rand < 0.4) mock[key] = '';
      else if (rand < 0.6) mock[key] = 'Inst Value';
      else if (rand < 0.8) mock[key] = ['Dept A', 'Dept B'];
      else mock[key] = { phone: '123' };
    }

    const score = calculateInstituteCompletion(mock);
    assert.strictEqual(typeof score, 'number');
    assert.ok(!isNaN(score));
    assert.ok(Number.isInteger(score));
    assert.ok(score >= 0 && score <= 100);
  }
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('                 M1 CHALLENGE EXECUTION SUMMARY                       ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Challenges Executed : ${totalTests}`);
console.log(`  Passed Challenges         : ${passedTests}`);
console.log(`  Failed Challenges         : ${failedTests}`);
console.log(`  Overall Challenge Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failedTests === 0) {
  console.log('  \x1b[42m\x1b[30m ALL 22 EMPIRICAL CHALLENGES (INCL. 10,000 FUZZ RUNS) PASSED \x1b[0m\n');
  process.exit(0);
} else {
  console.error(`  \x1b[41m\x1b[37m ${failedTests} EMPIRICAL CHALLENGES FAILED \x1b[0m\n`);
  process.exit(1);
}
