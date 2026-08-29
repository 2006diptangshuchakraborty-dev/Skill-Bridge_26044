/**
 * Skill Bridge Platform - Multidimensional Scoring & Verification Engine
 * File: lib/scoring-engine.js
 */

const { getDb, saveDb } = require('./db');
const { getQuestionBank } = require('./questions');

// Configurable Scoring Dimensions & Weights
const DEFAULT_DIMENSION_WEIGHTS = {
  'Conceptual Knowledge': 0.30,
  'Problem Solving': 0.20,
  'Practical Coding': 0.30,
  'Advanced Knowledge': 0.10,
  'Real-world Scenario': 0.10,
};

// Configurable Proficiency Level Thresholds & Minimum Competency Rules
const LEVEL_THRESHOLDS = [
  { level: 'Expert', levelNum: 4, minOverall: 90, minPractical: 80, minConceptual: 80 },
  { level: 'Advanced', levelNum: 3, minOverall: 75, minPractical: 65, minConceptual: 70 },
  { level: 'Intermediate', levelNum: 2, minOverall: 60, minPractical: 50, minConceptual: 60 },
  { level: 'Beginner', levelNum: 1, minOverall: 40, minPractical: 0, minConceptual: 40 },
];

/**
 * Evaluates student assessment attempt and generates verification result
 */
function evaluateAssessmentAttempt(attemptId) {
  const dbData = getDb();
  const attempts = dbData.assessmentAttempts || [];
  const attempt = attempts.find(a => a.id === attemptId);

  if (!attempt) {
    throw new Error(`Assessment attempt '${attemptId}' not found`);
  }

  const questionBank = getQuestionBank();
  const answers = attempt.answers || {};

  const dimensionScores = {
    'Conceptual Knowledge': { earned: 0, max: 0 },
    'Problem Solving': { earned: 0, max: 0 },
    'Practical Coding': { earned: 0, max: 0 },
    'Advanced Knowledge': { earned: 0, max: 0 },
    'Real-world Scenario': { earned: 0, max: 0 },
  };

  let totalEarned = 0;
  let totalMax = 0;

  // Evaluate each question in the attempt
  attempt.questions.forEach(q => {
    const fullQuestion = questionBank.find(qb => qb.id === q.id) || q;
    const dimension = fullQuestion.dimension || 'Conceptual Knowledge';
    const points = fullQuestion.points || 1;

    dimensionScores[dimension] = dimensionScores[dimension] || { earned: 0, max: 0 };
    dimensionScores[dimension].max += points;
    totalMax += points;

    const userAns = answers[q.id]?.answer;
    let isCorrect = false;

    if (userAns !== undefined && userAns !== null) {
      if (Array.isArray(fullQuestion.correctAnswer)) {
        const sortedUser = Array.isArray(userAns) ? userAns.sort() : [userAns];
        const sortedCorrect = [...fullQuestion.correctAnswer].sort();
        isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
      } else {
        isCorrect = String(userAns).trim().toLowerCase() === String(fullQuestion.correctAnswer).trim().toLowerCase();
      }
    }

    if (isCorrect) {
      dimensionScores[dimension].earned += points;
      totalEarned += points;
    }
  });

  // Calculate percentage breakdown per dimension
  const dimensionPercentages = {};
  Object.keys(dimensionScores).forEach(dim => {
    const d = dimensionScores[dim];
    dimensionPercentages[dim] = d.max > 0 ? Math.round((d.earned / d.max) * 100) : 100;
  });

  // Calculate weighted overall score
  let weightedScoreSum = 0;
  let totalWeightUsed = 0;

  Object.keys(DEFAULT_DIMENSION_WEIGHTS).forEach(dim => {
    const weight = DEFAULT_DIMENSION_WEIGHTS[dim];
    if (dimensionScores[dim] && dimensionScores[dim].max > 0) {
      weightedScoreSum += dimensionPercentages[dim] * weight;
      totalWeightUsed += weight;
    }
  });

  const overallScore = totalWeightUsed > 0
    ? Math.round(weightedScoreSum / totalWeightUsed)
    : (totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0);

  // Apply Minimum Competency Rules to determine verified proficiency level
  const conceptualPct = dimensionPercentages['Conceptual Knowledge'] || 0;
  const practicalPct = dimensionPercentages['Practical Coding'] || 0;

  let assignedLevel = 'Unverified';
  let levelNum = 0;

  for (const rule of LEVEL_THRESHOLDS) {
    if (
      overallScore >= rule.minOverall &&
      practicalPct >= rule.minPractical &&
      conceptualPct >= rule.minConceptual
    ) {
      assignedLevel = rule.level;
      levelNum = rule.levelNum;
      break;
    }
  }

  // Fallback level if score >= 40 but practical threshold downgraded it
  if (assignedLevel === 'Unverified' && overallScore >= 40) {
    assignedLevel = 'Beginner';
    levelNum = 1;
  }

  const isVerified = levelNum > 0 && attempt.antiCheating?.reviewStatus !== 'DISQUALIFIED';

  // Calculate Verification Confidence (Low, Medium, High, Very High)
  let confidence = 'Medium';
  if (isVerified) {
    if (dimensionScores['Practical Coding']?.max > 0 && overallScore >= 75) {
      confidence = 'High';
    } else if (overallScore < 60) {
      confidence = 'Low';
    }
  }

  // Update attempt record
  const now = new Date().toISOString();
  attempt.status = isVerified ? 'EVALUATED' : 'SUBMITTED';
  attempt.submittedAt = attempt.submittedAt || now;
  attempt.score = overallScore;
  attempt.percentage = overallScore;
  attempt.proficiencyLevel = assignedLevel;
  attempt.dimensionBreakdown = dimensionPercentages;
  attempt.updatedAt = now;

  // Generate Unique Verification Record
  const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
  const slug = (attempt.skillName || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 4).toUpperCase();
  const verificationId = `SB-${slug}-${hash}`;

  const verificationRecord = {
    id: verificationId,
    studentId: attempt.studentId,
    skillId: attempt.skillId,
    skillName: attempt.skillName,
    overallScore,
    level: assignedLevel,
    levelNum,
    confidence,
    status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
    attemptId: attempt.id,
    breakdown: dimensionPercentages,
    integrityScore: attempt.antiCheating?.integrityScore || 100,
    verifiedAt: now,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
  };

  dbData.verifications = dbData.verifications || [];
  dbData.verifications.push(verificationRecord);

  // Update student profile in db.json
  const students = dbData.students || [];
  const student = students.find(s => s.id === attempt.studentId || s.userId === attempt.studentId);
  if (student) {
    student.skills = student.skills || [];
    const skillIndex = student.skills.findIndex(s => s.skillId === attempt.skillId || s.name === attempt.skillName);

    const updatedSkill = {
      skillId: attempt.skillId,
      name: attempt.skillName,
      proficiency: levelNum,
      level: assignedLevel,
      score: overallScore,
      status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
      verificationId,
      confidence,
      verifiedAt: now,
    };

    if (skillIndex >= 0) {
      student.skills[skillIndex] = { ...student.skills[skillIndex], ...updatedSkill };
    } else {
      student.skills.push(updatedSkill);
    }
  }

  saveDb(dbData);

  // Hook Platform Lifecycle & Rating Interaction Engine (R3)
  let lifecycleResult = null;
  try {
    const { handleAssessmentEvaluation } = require('./lifecycle');
    lifecycleResult = handleAssessmentEvaluation({
      attemptId: attempt.id,
      attempt,
      verification: verificationRecord,
      studentId: attempt.studentId,
      skillId: attempt.skillId,
      skillName: attempt.skillName,
      overallScore,
      proficiencyLevel: assignedLevel,
      breakdown: dimensionPercentages,
    });
  } catch (err) {
    // Non-fatal fallback if running in standalone test sandbox
  }

  return {
    attempt,
    verification: verificationRecord,
    interaction: lifecycleResult?.interaction || null,
    breakdown: dimensionPercentages,
    recommendations: generateUpskillingRecommendations(dimensionPercentages),
  };
}

/**
 * AI-assisted upskilling recommendations based on weak areas
 */
function generateUpskillingRecommendations(breakdown) {
  const recommendations = [];

  if (breakdown['Conceptual Knowledge'] < 70) {
    recommendations.push('Review core language fundamentals, data types, and scope lifecycle rules.');
  }
  if (breakdown['Problem Solving'] < 70) {
    recommendations.push('Practice algorithmic problem solving and space/time complexity optimizations.');
  }
  if (breakdown['Practical Coding'] < 70) {
    recommendations.push('Complete hands-on coding exercises and work on real-world projects.');
  }
  if (breakdown['Advanced Knowledge'] < 70) {
    recommendations.push('Study advanced topics such as async event loop, memory pooling, and decorators.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Excellent performance across all dimensions! You are ready for high-impact industry roles.');
  }

  return recommendations;
}

module.exports = {
  evaluateAssessmentAttempt,
  generateUpskillingRecommendations,
};
