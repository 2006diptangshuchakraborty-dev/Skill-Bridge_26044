/**
 * Skill Bridge Platform - Assessment Attempt & Anti-Cheating Engine
 * File: lib/assessment-engine.js
 */

const { getDb, saveDb } = require('./db');
const { getQuestionsForSkill } = require('./questions');
const { getSkillByIdOrSlug } = require('./taxonomy');

/**
 * Initializes a new randomized assessment attempt for a student
 */
function createAssessmentAttempt(studentId, skillId, claimedLevel = 'Intermediate') {
  const dbData = getDb();
  dbData.assessmentAttempts = dbData.assessmentAttempts || [];
  const now = new Date();

  // Find candidate skill
  const skill = getSkillByIdOrSlug(skillId);
  if (!skill) {
    throw new Error(`Skill with ID or slug '${skillId}' not found`);
  }

  // Retrieve published questions for the skill
  let availableQuestions = getQuestionsForSkill(skill.id, { status: 'PUBLISHED' });

  // Fallback fallback questions if available questions count is small
  if (availableQuestions.length === 0) {
    availableQuestions = getQuestionsForSkill('skill_python', { status: 'PUBLISHED' });
  }

  // Shuffle and pick subset (e.g. 5 questions for rapid assessment verification)
  const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, Math.min(shuffled.length, 5));

  // Compute total duration (default: 15 minutes)
  const totalSeconds = selectedQuestions.reduce((acc, q) => acc + (q.timeLimit || 90), 0);
  const expiresAt = new Date(now.getTime() + (totalSeconds || 900) * 1000).toISOString();

  // Strip correct answers and explanations before storing client view
  const clientQuestions = selectedQuestions.map((q, idx) => ({
    questionIndex: idx + 1,
    id: q.id,
    topicId: q.topicId,
    dimension: q.dimension || 'Conceptual Knowledge',
    questionType: q.questionType || 'Single MCQ',
    question: q.question,
    options: q.options || [],
    difficulty: q.difficulty || 'Medium',
    points: q.points || 1,
    timeLimit: q.timeLimit || 90,
  }));

  const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newAttempt = {
    id: attemptId,
    studentId,
    skillId: skill.id,
    skillName: skill.name,
    claimedLevel,
    status: 'IN_PROGRESS',
    startedAt: now.toISOString(),
    expiresAt,
    submittedAt: null,
    durationSeconds: totalSeconds,
    questions: clientQuestions,
    answers: {}, // questionId -> answer
    antiCheating: {
      tabSwitchCount: 0,
      focusLossCount: 0,
      copyPasteCount: 0,
      fullscreenExitCount: 0,
      events: [],
      integrityScore: 100, // Starts at 100
      reviewStatus: 'CLEAN', // CLEAN vs UNDER_REVIEW vs DISQUALIFIED
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  dbData.assessmentAttempts.push(newAttempt);
  saveDb(dbData);

  try {
    const { emitPlatformEvent, PLATFORM_EVENTS } = require('./events');
    emitPlatformEvent(PLATFORM_EVENTS.ASSESSMENT_STARTED, {
      attemptId,
      studentId,
      skillId: skill.id,
      skillName: skill.name,
      claimedLevel,
      startedAt: now.toISOString(),
      expiresAt,
    });
  } catch (e) {
    // Non-fatal fallback
  }

  return newAttempt;
}

/**
 * Retrieves assessment attempt by ID with timer validation
 */
function getAssessmentAttempt(attemptId) {
  const dbData = getDb();
  const attempts = dbData.assessmentAttempts || [];
  const attempt = attempts.find(a => a.id === attemptId);

  if (!attempt) return null;

  // Server-side timer validation check
  if (attempt.status === 'IN_PROGRESS') {
    const now = new Date();
    const expiry = new Date(attempt.expiresAt);
    if (now > expiry) {
      attempt.status = 'EXPIRED';
      attempt.submittedAt = expiry.toISOString();
      saveDb(dbData);
    }
  }

  return attempt;
}

/**
 * Records student's answer for a specific question in an active attempt
 */
function recordAnswer(attemptId, questionId, answer, timeSpentSeconds = 0) {
  const dbData = getDb();
  const attempts = dbData.assessmentAttempts || [];
  const attempt = attempts.find(a => a.id === attemptId);

  if (!attempt) {
    throw new Error('Assessment attempt not found');
  }

  if (attempt.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot submit answer. Attempt status is ${attempt.status}`);
  }

  attempt.answers = attempt.answers || {};
  attempt.answers[questionId] = {
    answer,
    timeSpentSeconds,
    answeredAt: new Date().toISOString(),
  };
  attempt.updatedAt = new Date().toISOString();

  saveDb(dbData);
  return attempt;
}

/**
 * Log suspicious anti-cheating events during assessment
 */
function recordAntiCheatingEvent(attemptId, eventType, details = {}) {
  const dbData = getDb();
  const attempts = dbData.assessmentAttempts || [];
  const attempt = attempts.find(a => a.id === attemptId);

  if (!attempt) return null;

  attempt.antiCheating = attempt.antiCheating || {
    tabSwitchCount: 0,
    focusLossCount: 0,
    copyPasteCount: 0,
    fullscreenExitCount: 0,
    events: [],
    integrityScore: 100,
    reviewStatus: 'CLEAN',
  };

  const now = new Date().toISOString();
  let penalty = 0;

  if (eventType === 'TAB_SWITCH') {
    attempt.antiCheating.tabSwitchCount += 1;
    penalty = 10;
  } else if (eventType === 'FOCUS_LOSS') {
    attempt.antiCheating.focusLossCount += 1;
    penalty = 5;
  } else if (eventType === 'COPY_PASTE') {
    attempt.antiCheating.copyPasteCount += 1;
    penalty = 15;
  } else if (eventType === 'FULLSCREEN_EXIT') {
    attempt.antiCheating.fullscreenExitCount += 1;
    penalty = 10;
  }

  attempt.antiCheating.events.push({
    type: eventType,
    details,
    timestamp: now,
  });

  attempt.antiCheating.integrityScore = Math.max(0, attempt.antiCheating.integrityScore - penalty);

  if (attempt.antiCheating.integrityScore < 40) {
    attempt.antiCheating.reviewStatus = 'UNDER_REVIEW';
  }

  saveDb(dbData);
  return attempt.antiCheating;
}

module.exports = {
  createAssessmentAttempt,
  getAssessmentAttempt,
  recordAnswer,
  recordAntiCheatingEvent,
};
