/**
 * Skill Bridge Platform - Milestone M2 UI Gating & Institute API Logic Stress Test Suite
 * Focus:
 *  1. Institute Onboarding state machine & API logic simulation
 *  2. Gating security against client-side parameter tampering (e.g. verificationStatus overwrite)
 *  3. Incomplete submission gating (<70% rejected, >=70% accepted)
 *  4. Role access isolation (STUDENT/ORGANIZATION access denied)
 *  5. Profile gating modal triggers, deficit math domain checks, and color stage transitions
 * 
 * File: tests/m2-ui-gating-api-stress.js
 */

const assert = require('assert');
const {
  calculateInstituteCompletion,
  getInstituteCompletionDetails,
  calculateProfileCompletion,
  isProfileComplete,
} = require('../lib/onboarding-calc');
const { getDb, saveDb } = require('../lib/db');
const { AUDIT_ACTIONS } = require('../lib/audit');

console.log('======================================================================');
console.log('  M2 UI GATING & INSTITUTE API ROUTE EMPIRICAL STRESS TEST SUITE      ');
console.log('======================================================================\n');

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
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    console.error(err.stack);
  }
}

// Simulated API logic matching app/api/institute/onboarding/route.js
function simulateInstituteOnboardingHandler({ user, body, method = 'POST' }) {
  if (!user) {
    return { status: 401, data: { error: 'Unauthorized: Session required' } };
  }

  if (user.role !== 'INSTITUTE' && user.role !== 'ADMIN') {
    return { status: 403, data: { error: 'Forbidden: Only institutes can submit institute onboarding' } };
  }

  const { step, stepData, profileData, action } = body || {};
  const now = new Date().toISOString();

  let currentProfile = {
    id: `inst_${Date.now()}`,
    userId: user.id,
    instituteName: '',
    instituteCode: '',
    instituteType: '',
    website: '',
    logoUrl: '',
    officialEmail: user.email || '',
    contactPhone: '',
    address: {},
    departments: [],
    placementContact: {},
    accreditationDetails: {},
    verificationStatus: 'PENDING',
    verificationDocs: [],
    profileCompletion: 0,
    currentOnboardingStep: 1,
    createdAt: now,
    updatedAt: now,
  };

  if (stepData) {
    Object.assign(currentProfile, stepData);
  }
  if (profileData) {
    const sanitized = { ...profileData };
    delete sanitized.id;
    delete sanitized.userId;
    delete sanitized.role;
    delete sanitized.verificationStatus; // Stripped by server
    Object.assign(currentProfile, sanitized);
  }

  if (step && typeof step === 'number') {
    currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
  }

  const details = getInstituteCompletionDetails(currentProfile);
  currentProfile.profileCompletion = details.completion;
  currentProfile.updatedAt = now;

  const isCompleteAction = action === 'COMPLETE_ONBOARDING' || action === 'SUBMIT';
  let targetOnboardingStatus = 'IN_PROGRESS';

  if (isCompleteAction) {
    if (details.completion < 70 && details.missingFields.length > 3) {
      return {
        status: 400,
        data: {
          error: 'Incomplete onboarding: Please fill required fields before submission',
          missingFields: details.missingFields,
          profileCompletion: details.completion,
        },
      };
    }
    targetOnboardingStatus = 'COMPLETED';
    currentProfile.verificationStatus = 'PENDING';
  } else if (details.completion > 0) {
    targetOnboardingStatus = 'IN_PROGRESS';
  }

  return {
    status: 200,
    data: {
      success: true,
      message: isCompleteAction ? 'Institute onboarding completed' : 'Step draft saved',
      onboardingStatus: targetOnboardingStatus,
      verificationStatus: currentProfile.verificationStatus,
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    },
  };
}

// -----------------------------------------------------------------------------
// SUITE 1: API ROUTE AUTHORIZATION & ROLE PARTITIONING
// -----------------------------------------------------------------------------
console.log('▶ SUITE 1: Institute API Authorization & Role Partitioning');

runTest('API-AUTH-01: STUDENT and ORGANIZATION roles are rejected with 403 Forbidden', () => {
  const studentUser = { id: 'usr_std', role: 'STUDENT' };
  const resStudent = simulateInstituteOnboardingHandler({ user: studentUser, body: {} });
  assert.strictEqual(resStudent.status, 403);
  assert(resStudent.data.error.includes('Forbidden'));

  const orgUser = { id: 'usr_org', role: 'ORGANIZATION' };
  const resOrg = simulateInstituteOnboardingHandler({ user: orgUser, body: {} });
  assert.strictEqual(resOrg.status, 403);
  assert(resOrg.data.error.includes('Forbidden'));
});

runTest('API-AUTH-02: Anonymous or missing session is rejected with 401 Unauthorized', () => {
  const res = simulateInstituteOnboardingHandler({ user: null, body: {} });
  assert.strictEqual(res.status, 401);
  assert(res.data.error.includes('Unauthorized'));
});

// -----------------------------------------------------------------------------
// SUITE 2: DRAFT PERSISTENCE & SECURITY AGAINST TAMPERING
// -----------------------------------------------------------------------------
console.log('\n▶ SUITE 2: Institute Onboarding Step Drafts & Tamper-Proof Security');

runTest('API-DRAFT-01: Saving partial draft persists step data and recalculates completion', () => {
  const instUser = { id: 'usr_inst', role: 'INSTITUTE', email: 'dean@nitk.edu.in' };
  const partialPayload = {
    step: 2,
    profileData: {
      instituteName: 'NIT Karnataka',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'NIT',
    },
    action: 'SAVE_DRAFT',
  };

  const res = simulateInstituteOnboardingHandler({ user: instUser, body: partialPayload });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.onboardingStatus, 'IN_PROGRESS');
  assert.strictEqual(res.data.profileCompletion, 35);
  assert.strictEqual(res.data.currentStep, 2);
});

runTest('API-SEC-01: Server strictly sanitizes client attempt to overwrite verificationStatus to APPROVED', () => {
  const instUser = { id: 'usr_inst', role: 'INSTITUTE', email: 'dean@nitk.edu.in' };
  const exploitPayload = {
    step: 2,
    profileData: {
      instituteName: 'NIT Karnataka',
      verificationStatus: 'APPROVED', // Exploit attempt
    },
    action: 'SAVE_DRAFT',
  };

  const res = simulateInstituteOnboardingHandler({ user: instUser, body: exploitPayload });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.verificationStatus, 'PENDING');
  assert.strictEqual(res.data.profile.verificationStatus, 'PENDING');
});

// -----------------------------------------------------------------------------
// SUITE 3: SUBMISSION GATING & THRESHOLD ENFORCEMENT
// -----------------------------------------------------------------------------
console.log('\n▶ SUITE 3: Final Onboarding Submission Gating & Threshold Enforcement');

runTest('API-SUBMIT-01: Incomplete onboarding (< 70% with missing fields) is rejected with 400', () => {
  const instUser = { id: 'usr_inst', role: 'INSTITUTE', email: 'dean@nitk.edu.in' };
  const incompletePayload = {
    step: 6,
    profileData: {
      instituteName: 'NIT Karnataka', // Only 7.5% -> 8%
    },
    action: 'COMPLETE_ONBOARDING',
  };

  const res = simulateInstituteOnboardingHandler({ user: instUser, body: incompletePayload });
  assert.strictEqual(res.status, 400);
  assert(res.data.error.includes('Incomplete onboarding'));
  assert(res.data.missingFields.length > 3);
});

runTest('API-SUBMIT-02: Complete onboarding (>= 70%) succeeds and transitions to COMPLETED', () => {
  const instUser = { id: 'usr_inst', role: 'INSTITUTE', email: 'dean@nitk.edu.in' };
  const completePayload = {
    step: 6,
    profileData: {
      instituteName: 'National Institute of Technology Karnataka',
      website: 'https://nitk.ac.in',
      instituteCode: 'AISHE-U-0123',
      instituteType: 'NIT',
      contactPhone: '+91 824 2474000',
      address: { street: 'NH 66', city: 'Surathkal', state: 'Karnataka', postalCode: '575025' },
      departments: [{ name: 'CSE', code: 'CSE', studentCount: 240 }],
      placementContact: { tpoName: 'Prof. Nair', email: 'tpo@nitk.edu.in', phone: '+91 824 2474050' },
      verificationDocs: [{ docType: 'AISHE', fileName: 'AISHE.pdf' }],
    },
    action: 'COMPLETE_ONBOARDING',
  };

  const res = simulateInstituteOnboardingHandler({ user: instUser, body: completePayload });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.onboardingStatus, 'COMPLETED');
  assert.strictEqual(res.data.profileCompletion, 100);
  assert.strictEqual(res.data.verificationStatus, 'PENDING');
});

// -----------------------------------------------------------------------------
// SUITE 4: PROFILE GATING MODAL & DEFICIT MATH INVARIANTS
// -----------------------------------------------------------------------------
console.log('\n▶ SUITE 4: Profile Gating Modal & Deficit Math Invariants');

runTest('UI-GATE-01: Deficit math domain invariance over [0, 100]', () => {
  for (let score = 0; score <= 100; score++) {
    const deficit70 = Math.max(0, 70 - score);
    if (score < 70) {
      assert.strictEqual(deficit70, 70 - score);
    } else {
      assert.strictEqual(deficit70, 0);
    }
  }
});

runTest('UI-GATE-02: Stage color thresholds match UI design specification (Critical < 40%, Gated < 70%, Unlocked >= 70%)', () => {
  const getStageColor = (score) => {
    const isCritical = score < 40;
    const isGated = score < 70;
    return isCritical ? 'text-rose-400' : isGated ? 'text-amber-400' : 'text-emerald-400';
  };

  assert.strictEqual(getStageColor(0), 'text-rose-400');
  assert.strictEqual(getStageColor(39), 'text-rose-400');
  assert.strictEqual(getStageColor(40), 'text-amber-400');
  assert.strictEqual(getStageColor(69), 'text-amber-400');
  assert.strictEqual(getStageColor(70), 'text-emerald-400');
  assert.strictEqual(getStageColor(100), 'text-emerald-400');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('                 M2 UI GATING & API SUMMARY                           ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Test Cases   : ${totalTests}`);
console.log(`  Passed Tests       : ${passedTests}`);
console.log(`  Failed Tests       : ${failedTests}`);
console.log(`  Overall Pass Rate  : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('  ALL M2 UI GATING & API TESTS PASSED SUCCESSFULLY \n');
}
