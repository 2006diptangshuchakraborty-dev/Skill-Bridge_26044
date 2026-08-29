/**
 * Milestone 3 Lifecycle & Entity Event Integration Verification Suite
 * File: tests/test-lifecycle-events.js
 */

const assert = require('assert');
const {
  PLATFORM_EVENTS,
  emitPlatformEvent,
  emitPlatformEventAsync,
  onPlatformEvent,
} = require('../lib/events');

const {
  handleApplicationReview,
  handleInterviewCompletion,
  handleAssessmentEvaluation,
  handleInternshipCompletion,
  handleCourseCompletion,
  triggerLifecycleEvent,
  resolveUserForEntity,
  resolveEntityForUser,
} = require('../lib/lifecycle');

const {
  createRatingSandbox,
  ROLES,
  INTERACTION_TYPES,
  INTERACTION_STATUS,
  RATING_STATUS,
  RECOMMENDATION_TYPES,
} = require('./rating-test-helper');

const {
  getRatingEligibility,
  createRating,
  recalculateProfileRatings,
} = require('../lib/rating-engine');

console.log('\n======================================================================');
console.log('  Milestone 3: Workflow & Entity Event Lifecycle Test Suite');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log('  ✔ [PASS] ' + name);
    passed++;
  } catch (err) {
    console.error('  ✖ [FAIL] ' + name);
    console.error('     Error: ' + err.message);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log('  ✔ [PASS] ' + name);
    passed++;
  } catch (err) {
    console.error('  ✖ [FAIL] ' + name);
    console.error('     Error: ' + err.message);
    failed++;
  }
}

(async () => {
  // --------------------------------------------------------------------------
  // Test 1: Application Review Lifecycle Hook (REVIEWED & SHORTLISTED)
  // --------------------------------------------------------------------------
  runTest('L01: Application review status -> REVIEWED creates rating interaction', () => {
    const sandbox = createRatingSandbox();
    const student = sandbox.addUser({ id: 'usr_cand_01', name: 'Alice Candidate', role: ROLES.STUDENT, entityId: 'std_001' });
    const recruiter = sandbox.addUser({ id: 'usr_rec_01', name: 'Bob Recruiter', role: ROLES.INDUSTRY, entityId: 'comp_001' });

    sandbox.applications = sandbox.applications || [];
    sandbox.applications.push({
      id: 'app_test_01',
      studentId: 'std_001',
      studentName: 'Alice Candidate',
      opportunityId: 'opp_001',
      opportunityTitle: 'Full Stack Engineer',
      companyName: 'Apex Analytics',
      status: 'APPLIED',
    });

    const result = handleApplicationReview({
      applicationId: 'app_test_01',
      status: 'REVIEWED',
      reviewerUserId: recruiter.id,
      notes: 'Strong portfolio and clear GitHub contributions',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.application.status, 'REVIEWED');
    assert.strictEqual(result.interaction.interactionType, 'APPLICATION_REVIEW');
    assert.strictEqual(result.interaction.status, 'REVIEWED');
    assert.strictEqual(result.interaction.initiatorUserId, recruiter.id);
    assert.strictEqual(result.interaction.targetUserId, student.id);
    assert.strictEqual(result.interaction.isBlind, false);

    // Verify rating eligibility
    const eligibility = getRatingEligibility(sandbox, {
      reviewerUserId: recruiter.id,
      targetEntityId: student.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.APPLICATION_REVIEW,
    });

    assert.strictEqual(eligibility.eligible, true);
    assert.strictEqual(eligibility.allowedCategories.length, 5);
    const catCodes = eligibility.allowedCategories.map(c => c.code);
    assert.ok(catCodes.includes('APPLICATION_QUALITY'));
    assert.ok(catCodes.includes('SKILL_RELEVANCE'));
    assert.ok(catCodes.includes('COMMUNICATION'));
    assert.ok(catCodes.includes('PROFESSIONALISM'));
    assert.ok(catCodes.includes('OVERALL_IMPRESSION'));
  });

  runTest('L02: Application status -> SHORTLISTED updates interaction and preserves eligibility', () => {
    const sandbox = createRatingSandbox();
    const student = sandbox.addUser({ id: 'usr_cand_02', role: ROLES.STUDENT, entityId: 'std_002' });
    const recruiter = sandbox.addUser({ id: 'usr_rec_02', role: ROLES.INDUSTRY, entityId: 'comp_002' });

    sandbox.applications = [{
      id: 'app_test_02',
      studentId: 'std_002',
      opportunityId: 'opp_002',
      status: 'UNDER_REVIEW',
    }];

    const result = handleApplicationReview({
      applicationId: 'app_test_02',
      status: 'SHORTLISTED',
      reviewerUserId: recruiter.id,
      notes: 'Candidate shortlisted for technical round',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.interaction.status, 'SHORTLISTED');

    const eligibility = getRatingEligibility(sandbox, {
      reviewerUserId: recruiter.id,
      targetEntityId: student.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: result.interaction.id,
    });
    assert.strictEqual(eligibility.eligible, true);
  });

  // --------------------------------------------------------------------------
  // Test 2: Interview Completion Lifecycle Hook
  // --------------------------------------------------------------------------
  runTest('L03: Interview completion creates 2-way rating eligible interaction', () => {
    const sandbox = createRatingSandbox();
    const student = sandbox.addUser({ id: 'usr_std_03', role: ROLES.STUDENT, entityId: 'std_003' });
    const interviewer = sandbox.addUser({ id: 'usr_intv_01', role: ROLES.INDUSTRY, entityId: 'comp_001' });

    const result = handleInterviewCompletion({
      referenceId: 'intv_round_1',
      companyId: 'comp_001',
      studentId: 'std_003',
      interviewerUserId: interviewer.id,
      studentUserId: student.id,
      interviewType: 'System Design & Algorithms',
      round: 1,
      notes: 'Solid system design instincts',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.interaction.interactionType, 'INTERVIEW_FEEDBACK');
    assert.strictEqual(result.interaction.status, 'INTERVIEW_COMPLETED');
    assert.strictEqual(result.interaction.isBlind, false);

    // Verify interviewer can rate student
    const indEligibility = getRatingEligibility(sandbox, {
      reviewerUserId: interviewer.id,
      targetEntityId: student.id,
      targetEntityType: ROLES.STUDENT,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.INTERVIEW_FEEDBACK,
    });
    assert.strictEqual(indEligibility.eligible, true);

    // Verify student can rate industry employer/interviewer (2-way eligibility)
    const stuEligibility = getRatingEligibility(sandbox, {
      reviewerUserId: student.id,
      targetEntityId: interviewer.id,
      targetEntityType: ROLES.INDUSTRY,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.INTERVIEW_FEEDBACK,
    });
    assert.strictEqual(stuEligibility.eligible, true);
  });

  // --------------------------------------------------------------------------
  // Test 3: Assessment / Task Evaluation Lifecycle Hook
  // --------------------------------------------------------------------------
  runTest('L04: Assessment evaluation links objective skill verification score & recalculates aggregate', () => {
    const sandbox = createRatingSandbox();
    const student = sandbox.addUser({ id: 'usr_std_04', role: ROLES.STUDENT, entityId: 'std_004' });
    const evaluator = sandbox.addUser({ id: 'usr_eval_lead', role: ROLES.INDUSTRY });

    const verificationRecord = {
      id: 'SB-PYTH-XYZ12',
      studentId: student.id,
      skillId: 'skill_python',
      skillName: 'Python Architecture',
      overallScore: 94,
      level: 'Expert',
      levelNum: 4,
      confidence: 'High',
      status: 'VERIFIED',
      breakdown: {
        'Conceptual Knowledge': 95,
        'Problem Solving': 90,
        'Practical Coding': 96,
      },
    };

    sandbox.verifications = [verificationRecord];

    const result = handleAssessmentEvaluation({
      attemptId: 'att_test_99',
      studentId: student.id,
      studentUserId: student.id,
      evaluatorUserId: evaluator.id,
      evaluatorType: 'INDUSTRY',
      verification: verificationRecord,
      skillId: 'skill_python',
      skillName: 'Python Architecture',
      overallScore: 94,
      proficiencyLevel: 'Expert',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.interaction.status, 'EVALUATED');
    assert.strictEqual(result.interaction.interactionType, 'TASK_EVALUATION');
    assert.strictEqual(result.interaction.metadata.overallScore, 94);

    // Verify student profile aggregate reflects objective skill score
    const ratingResult = createRating(sandbox, {
      reviewerUserId: evaluator.id,
      targetUserId: student.id,
      targetRole: ROLES.STUDENT,
      interactionId: result.interaction.id,
      scores: { CODE_QUALITY: 5, ARCHITECTURE: 5, SPEED_DELIVERY: 4, DOCUMENTATION: 5, ACCURACY: 5 },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(ratingResult.success, true);

    const agg = recalculateProfileRatings(sandbox, ROLES.STUDENT, student.id);
    assert.strictEqual(agg.objectiveSkillScore, 94);
  });

  // --------------------------------------------------------------------------
  // Test 4: Internship Completion 2-Way Blind Review Lifecycle Hook
  // --------------------------------------------------------------------------
  runTest('L05: Internship completion creates 2-way blind interaction with 14-day deadline', () => {
    const sandbox = createRatingSandbox();
    const employer = sandbox.addUser({ id: 'usr_lead_01', role: ROLES.INDUSTRY, entityId: 'comp_001' });
    const intern = sandbox.addUser({ id: 'usr_intern_01', role: ROLES.STUDENT, entityId: 'std_005' });

    const result = handleInternshipCompletion({
      internshipId: 'intern_2026_fall',
      companyId: 'comp_001',
      studentId: 'std_005',
      recruiterUserId: employer.id,
      studentUserId: intern.id,
      title: 'Backend Engineering Intern',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.interaction.interactionType, 'INTERNSHIP_PERFORMANCE');
    assert.strictEqual(result.interaction.status, 'INTERNSHIP_COMPLETED');
    assert.strictEqual(result.interaction.isBlind, true);
    assert.ok(result.interaction.deadline, 'Deadline must be present');

    // Deadline is ~14 days in future
    const deadlineTime = new Date(result.interaction.deadline).getTime();
    const nowTime = Date.now();
    const diffDays = Math.round((deadlineTime - nowTime) / (24 * 3600 * 1000));
    assert.strictEqual(diffDays, 14);

    // Verify blind review workflow: first submission is held in PENDING_PUBLICATION
    const internRating = createRating(sandbox, {
      reviewerUserId: intern.id,
      targetUserId: employer.id,
      targetRole: ROLES.INDUSTRY,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: {
        MENTORSHIP_QUALITY: 5,
        WORK_ENVIRONMENT: 5,
        LEARNING_OPPORTUNITIES: 4,
        PROJECT_RELEVANCE: 5,
        COMPENSATION_FAIRNESS: 5,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(internRating.status, RATING_STATUS.PENDING_PUBLICATION);

    // Second reciprocal submission publishes both
    const employerRating = createRating(sandbox, {
      reviewerUserId: employer.id,
      targetUserId: intern.id,
      targetRole: ROLES.STUDENT,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.INTERNSHIP_PERFORMANCE,
      scores: {
        WORK_ETHIC: 5,
        TECHNICAL_EXECUTION: 5,
        TEAMWORK: 4,
        LEARNING_AGILITY: 5,
        INITIATIVE: 5,
      },
      recommendation: RECOMMENDATION_TYPES.RECOMMENDED,
    });
    assert.strictEqual(employerRating.status, RATING_STATUS.PUBLISHED);

    const empAgg = recalculateProfileRatings(sandbox, ROLES.INDUSTRY, employer.id);
    const stuAgg = recalculateProfileRatings(sandbox, ROLES.STUDENT, intern.id);
    assert.strictEqual(empAgg.totalRatingsCount, 1);
    assert.strictEqual(stuAgg.totalRatingsCount, 1);
  });

  // --------------------------------------------------------------------------
  // Test 5: Course & Training Program Completion Lifecycle Hook
  // --------------------------------------------------------------------------
  runTest('L06: Course completion creates Institute <-> Student rating interaction', () => {
    const sandbox = createRatingSandbox();
    const institute = sandbox.addUser({ id: 'usr_inst_dean', role: ROLES.INSTITUTE, entityId: 'inst_001' });
    const student = sandbox.addUser({ id: 'usr_std_06', role: ROLES.STUDENT, entityId: 'std_006' });

    const result = handleCourseCompletion({
      trainingProgramId: 'tp_cloud_devops',
      instituteId: 'inst_001',
      studentId: 'std_006',
      instituteUserId: institute.id,
      studentUserId: student.id,
      courseName: 'Full Stack Cloud DevOps Certification',
      grade: 'A+',
      db: sandbox,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.interaction.interactionType, 'COURSE_EVALUATION');
    assert.strictEqual(result.interaction.status, 'COURSE_COMPLETED');
    assert.strictEqual(result.interaction.isBlind, false);

    // Student can rate Institute
    const stuEligibility = getRatingEligibility(sandbox, {
      reviewerUserId: student.id,
      targetEntityId: institute.id,
      targetEntityType: ROLES.INSTITUTE,
      interactionId: result.interaction.id,
      contextType: INTERACTION_TYPES.COURSE_EVALUATION,
    });
    assert.strictEqual(stuEligibility.eligible, true);
  });

  // --------------------------------------------------------------------------
  // Test 6: Generic triggerLifecycleEvent Dispatcher
  // --------------------------------------------------------------------------
  runTest('L07: Generic triggerLifecycleEvent router dispatches correctly for all events', () => {
    const sandbox = createRatingSandbox();
    sandbox.addUser({ id: 'usr_std_07', role: ROLES.STUDENT, entityId: 'std_007' });
    sandbox.addUser({ id: 'usr_rec_07', role: ROLES.INDUSTRY, entityId: 'comp_007' });

    const res1 = triggerLifecycleEvent(PLATFORM_EVENTS.APPLICATION_REVIEWED, {
      applicationId: 'app_dyn_01',
      studentId: 'std_007',
      companyId: 'comp_007',
      reviewerUserId: 'usr_rec_07',
    }, sandbox);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.interaction.interactionType, 'APPLICATION_REVIEW');

    const res2 = triggerLifecycleEvent(PLATFORM_EVENTS.INTERNSHIP_COMPLETED, {
      internshipId: 'intern_dyn_01',
      studentId: 'std_007',
      companyId: 'comp_007',
      recruiterUserId: 'usr_rec_07',
    }, sandbox);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.interaction.isBlind, true);
  });

  // --------------------------------------------------------------------------
  // Test 7: Platform Events Hub Async Dispatching
  // --------------------------------------------------------------------------
  await runAsyncTest('L08: Event hub asynchronously dispatches events and executes listeners', async () => {
    let receivedPayload = null;
    const unsubscribe = onPlatformEvent(PLATFORM_EVENTS.APPLICATION_REVIEWED, (event) => {
      receivedPayload = event;
    });

    emitPlatformEvent(PLATFORM_EVENTS.APPLICATION_REVIEWED, {
      applicationId: 'app_evt_99',
      studentId: 'std_001',
      testMarker: 'LIFECYCLE_EVENT_TEST_OK',
    });

    assert.ok(receivedPayload);
    assert.strictEqual(receivedPayload.applicationId, 'app_evt_99');
    assert.strictEqual(receivedPayload.testMarker, 'LIFECYCLE_EVENT_TEST_OK');
    assert.ok(receivedPayload.emittedAt);

    unsubscribe();
  });

  console.log('\n----------------------------------------------------------------------');
  console.log('                     LIFECYCLE TEST RUN SUMMARY                      ');
  console.log('----------------------------------------------------------------------');
  console.log('  Total Tests : ' + (passed + failed));
  console.log('  Passed      : ' + passed);
  console.log('  Failed      : ' + failed);
  console.log('----------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('   ALL LIFECYCLE EVENT INTEGRATION TESTS PASSED SUCCESSFULLY \n');
    process.exit(0);
  }
})();
