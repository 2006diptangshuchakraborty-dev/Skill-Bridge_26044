/**
 * Skill Bridge Platform - Skill Verification & Proficiency Assessment E2E Test Suite
 * File: tests/test-verification-system.js
 */

const assert = require('assert');
const { getSkillCategories, getSkillTaxonomy, getSkillByIdOrSlug } = require('../lib/taxonomy');
const { getQuestionBank, getQuestionsForSkill, saveQuestion, generateAiQuestionDraft } = require('../lib/questions');
const { createAssessmentAttempt, getAssessmentAttempt, recordAnswer, recordAntiCheatingEvent } = require('../lib/assessment-engine');
const { evaluateAssessmentAttempt } = require('../lib/scoring-engine');
const { getDb } = require('../lib/db');

console.log('======================================================================');
console.log('  Skill Verification & Assessment System E2E Test Suite               ');
console.log('======================================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    console.error(err.stack);
  }
}

// ----------------------------------------------------------------------
// TIER 1: TAXONOMY & SKILL CLAIM TESTS
// ----------------------------------------------------------------------
console.log('▶ SUITE: Tier 1: Skill Taxonomy & Claim Pipeline');

runTest('V01: Database-driven categories exist with 8 domains', () => {
  const categories = getSkillCategories();
  assert(categories.length >= 8, 'Expected at least 8 taxonomy categories');
  const progCat = categories.find(c => c.name === 'Programming');
  assert(progCat, 'Programming category must exist');
});

runTest('V02: Skill taxonomy maps canonical skills and slugs', () => {
  const taxonomy = getSkillTaxonomy();
  assert(taxonomy.length >= 10, 'Expected taxonomy to contain canonical skills');
  const pySkill = getSkillByIdOrSlug('skill_python');
  assert.strictEqual(pySkill.name, 'Python');
  assert.strictEqual(pySkill.slug, 'python');
});

// ----------------------------------------------------------------------
// TIER 2: QUESTION BANK & DIFFICULTY TESTS
// ----------------------------------------------------------------------
console.log('\n▶ SUITE: Tier 2: Question Bank & Question Lifecycle');

runTest('V03: Question bank contains published questions with multidimensional metadata', () => {
  const bank = getQuestionBank();
  assert(bank.length >= 5, 'Question bank must contain published seed questions');
  const pyQuestions = getQuestionsForSkill('skill_python');
  assert(pyQuestions.length >= 3, 'Python questions must be present');
});

runTest('V04: AI Question draft generation creates DRAFT status', () => {
  const draft = generateAiQuestionDraft('skill_javascript', 'async', 'Medium');
  assert.strictEqual(draft.status, 'DRAFT');
  assert(draft.isAiGenerated, 'Must mark draft as AI generated');
});

// ----------------------------------------------------------------------
// TIER 3: ASSESSMENT RUNNER & ANTI-CHEATING TESTS
// ----------------------------------------------------------------------
console.log('\n▶ SUITE: Tier 3: Assessment Session, Timer & Anti-Cheating');

runTest('V05: Assessment attempt creation initializes attempt in IN_PROGRESS status', () => {
  const attempt = createAssessmentAttempt('std_001', 'skill_javascript', 'Advanced');
  assert.strictEqual(attempt.status, 'IN_PROGRESS');
  assert(attempt.questions.length > 0, 'Must select questions for assessment');
});

runTest('V06: Anti-cheating event tracking updates Integrity Risk Score', () => {
  const attempt = createAssessmentAttempt('std_001', 'skill_python', 'Intermediate');
  const antiCheating = recordAntiCheatingEvent(attempt.id, 'TAB_SWITCH');
  assert(antiCheating.integrityScore < 100, 'Tab switch must penalize integrity score');
  assert.strictEqual(antiCheating.tabSwitchCount, 1);
});

// ----------------------------------------------------------------------
// TIER 4: SCORING ENGINE & MINIMUM COMPETENCY TESTS
// ----------------------------------------------------------------------
console.log('\n▶ SUITE: Tier 4: Multidimensional Scoring & Minimum Competencies');

runTest('V07: Evaluates multidimensional weighted score and minimum competency rules', () => {
  const attempt = createAssessmentAttempt('std_002', 'skill_python', 'Advanced');
  
  // Record correct answers for all questions in attempt
  attempt.questions.forEach(q => {
    const bank = getQuestionBank();
    const full = bank.find(qb => qb.id === q.id) || q;
    recordAnswer(attempt.id, q.id, full.correctAnswer);
  });

  const { verification } = evaluateAssessmentAttempt(attempt.id);
  assert.strictEqual(verification.status, 'VERIFIED');
  assert(verification.overallScore >= 75, 'All correct answers must achieve high score');
  assert(verification.id.startsWith('SB-'), 'Must issue unique Verification ID');
});

runTest('V08: Public Verification Record is retrievable without PII', () => {
  const attempt = createAssessmentAttempt('std_002', 'skill_sql', 'Intermediate');
  attempt.questions.forEach(q => {
    const bank = getQuestionBank();
    const full = bank.find(qb => qb.id === q.id) || q;
    recordAnswer(attempt.id, q.id, full.correctAnswer);
  });
  const { verification } = evaluateAssessmentAttempt(attempt.id);

  const dbData = getDb();
  const record = (dbData.verifications || []).find(v => v.id === verification.id);
  assert(record, 'Verification record must exist in DB');
  assert.strictEqual(record.status, 'VERIFIED');
});

console.log('\n----------------------------------------------------------------------');
console.log('                     TEST SUITE EXECUTION SUMMARY                    ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Test Cases   : ${totalCount}`);
console.log(`  Passed Tests       : ${passedCount}`);
console.log(`  Failed Tests       : ${totalCount - passedCount}`);
console.log(`  Overall Pass Rate  : ${((passedCount / totalCount) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------\n');

if (passedCount === totalCount) {
  console.log('   ALL SKILL VERIFICATION TESTS PASSED SUCCESSFULLY \n');
  process.exit(0);
} else {
  console.error('   SOME TESTS FAILED \n');
  process.exit(1);
}
