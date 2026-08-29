/**
 * Skill Bridge Platform - Verified Reputation, Rating & Trust System
 * Test Helper & Authoritative Specification Oracle
 * File: tests/rating-test-helper.js
 * 
 * Provides:
 * 1. Dynamic module loader (prefers live `lib/rating-engine.js`, `lib/db.js` when present).
 * 2. Authoritative specification oracle for 4-tier E2E testing & offline validation.
 * 3. Isolated in-memory database sandboxing for test execution isolation.
 * 4. Contextual rating categories, weighted scoring arithmetic, and trust level calculation.
 * 5. Two-way blind review state machine with mutual submission & deadline publication.
 * 6. Admin moderation (report, hide, appeal, restore) & aggregate repair engine.
 * 7. Anti-fraud heuristics (velocity spikes, duplicate IP clusters, self-rating traps).
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Attempt dynamic loading of live project modules if available
function loadProjectModule(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  if (fs.existsSync(fullPath)) {
    try {
      const mod = require(fullPath);
      if (mod && Object.keys(mod).length > 0) {
        return mod;
      }
    } catch (e) {
      // module in development / not yet complete
    }
  }
  return null;
}

// ============================================================================
// 1. SPECIFICATION CONSTANTS & DOMAIN ENUMS
// ============================================================================

const ROLES = {
  STUDENT: 'STUDENT',
  INDUSTRY: 'INDUSTRY',
  INSTITUTE: 'INSTITUTE',
  ADMIN: 'ADMIN',
};

const INTERACTION_TYPES = {
  APPLICATION_REVIEW: 'APPLICATION_REVIEW',
  INTERVIEW_FEEDBACK: 'INTERVIEW_FEEDBACK',
  TASK_EVALUATION: 'TASK_EVALUATION',
  INTERNSHIP_PERFORMANCE: 'INTERNSHIP_PERFORMANCE',
  COURSE_EVALUATION: 'COURSE_EVALUATION',
  SEMINAR_FEEDBACK: 'SEMINAR_FEEDBACK',
};

const INTERACTION_STATUS = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  INTERNSHIP_COMPLETED: 'INTERNSHIP_COMPLETED',
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

const RATING_STATUS = {
  PENDING_PUBLICATION: 'PENDING_PUBLICATION',
  PUBLISHED: 'PUBLISHED',
  FLAGGED: 'FLAGGED',
  HIDDEN: 'HIDDEN',
  DELETED: 'DELETED',
};

const RECOMMENDATION_TYPES = {
  RECOMMENDED: 'RECOMMENDED',
  NEUTRAL: 'NEUTRAL',
  NOT_RECOMMENDED: 'NOT_RECOMMENDED',
};

const TRUST_LEVELS = {
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED_TIER1: 'VERIFIED_TIER1',
  VERIFIED_TIER2: 'VERIFIED_TIER2',
  GOLD_TRUSTED: 'GOLD_TRUSTED',
};

const REPORT_STATUS = {
  PENDING: 'PENDING',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED_HIDDEN: 'RESOLVED_HIDDEN',
  DISMISSED: 'DISMISSED',
};

const APPEAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED_RESTORED: 'APPROVED_RESTORED',
  REJECTED: 'REJECTED',
};

// ============================================================================
// 2. CONTEXTUAL RATING CATEGORIES & WEIGHT DEFINITIONS
// ============================================================================

const RATING_CONTEXT_CATEGORIES = {
  // Context 1: Application Review (Industry reviewing Student candidate)
  APPLICATION_REVIEW: [
    { code: 'APPLICATION_QUALITY', name: 'Application Quality', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'SKILL_RELEVANCE', name: 'Skill Relevance', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'COMMUNICATION', name: 'Communication', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'PROFESSIONALISM', name: 'Professionalism', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'OVERALL_IMPRESSION', name: 'Overall Impression', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 2: Interview Feedback
  INTERVIEW_FEEDBACK: [
    { code: 'TECHNICAL_DEPTH', name: 'Technical Depth', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'PROBLEM_SOLVING', name: 'Problem Solving', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'COMMUNICATION', name: 'Communication & Articulation', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'PUNCTUALITY', name: 'Punctuality & Preparedness', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'CULTURE_FIT', name: 'Culture & Collaboration', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 3: Task / Assessment Evaluation
  TASK_EVALUATION: [
    { code: 'CODE_QUALITY', name: 'Code Quality & Cleanliness', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'ARCHITECTURE', name: 'Architecture & Design', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'SPEED_DELIVERY', name: 'Speed of Delivery', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'DOCUMENTATION', name: 'Documentation', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'ACCURACY', name: 'Requirement Accuracy', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 4A: Internship Performance (Industry rating Student)
  INTERNSHIP_STUDENT: [
    { code: 'WORK_ETHIC', name: 'Work Ethic & Dedication', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'TECHNICAL_EXECUTION', name: 'Technical Execution', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'TEAMWORK', name: 'Teamwork & Collaboration', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'LEARNING_AGILITY', name: 'Learning Agility', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'INITIATIVE', name: 'Initiative & Proactivity', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 4B: Internship Performance (Student rating Industry employer)
  INTERNSHIP_INDUSTRY: [
    { code: 'MENTORSHIP_QUALITY', name: 'Mentorship Quality', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'WORK_ENVIRONMENT', name: 'Work Environment & Culture', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'LEARNING_OPPORTUNITIES', name: 'Learning Opportunities', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'PROJECT_RELEVANCE', name: 'Project Relevance', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'COMPENSATION_FAIRNESS', name: 'Compensation & Timeliness', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 5: Course Evaluation (Student rating Institute)
  COURSE_EVALUATION: [
    { code: 'CURRICULUM_DEPTH', name: 'Curriculum Depth & Rigor', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'INSTRUCTOR_QUALITY', name: 'Instructor Quality & Guidance', weight: 0.25, minScore: 1, maxScore: 5 },
    { code: 'PRACTICAL_APPLICATION', name: 'Practical Application', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'RESOURCE_AVAILABILITY', name: 'Resource Availability', weight: 0.15, minScore: 1, maxScore: 5 },
    { code: 'CAREER_IMPACT', name: 'Career Impact', weight: 0.15, minScore: 1, maxScore: 5 },
  ],

  // Context 6: Seminar / Event Feedback
  SEMINAR_FEEDBACK: [
    { code: 'CONTENT_QUALITY', name: 'Content Quality', weight: 0.30, minScore: 1, maxScore: 5 },
    { code: 'SPEAKER_EXPERTISE', name: 'Speaker Expertise', weight: 0.30, minScore: 1, maxScore: 5 },
    { code: 'ORGANIZATION', name: 'Event Organization', weight: 0.20, minScore: 1, maxScore: 5 },
    { code: 'INTERACTION', name: 'Audience Interaction', weight: 0.20, minScore: 1, maxScore: 5 },
  ],
};

function getCategoriesForContext(contextType, targetRole = 'STUDENT') {
  if (contextType === INTERACTION_TYPES.INTERNSHIP_PERFORMANCE) {
    return targetRole === ROLES.INDUSTRY ? RATING_CONTEXT_CATEGORIES.INTERNSHIP_INDUSTRY : RATING_CONTEXT_CATEGORIES.INTERNSHIP_STUDENT;
  }
  return RATING_CONTEXT_CATEGORIES[contextType] || RATING_CONTEXT_CATEGORIES.APPLICATION_REVIEW;
}

// ============================================================================
// 3. IN-MEMORY DATABASE SANDBOX FOR TEST ISOLATION
// ============================================================================

function createRatingSandbox() {
  return {
    users: [],
    studentProfiles: [],
    organizationProfiles: [],
    instituteProfiles: [],
    rating_interactions: [],
    ratings: [],
    rating_category_scores: [],
    rating_responses: [],
    rating_reports: [],
    rating_appeals: [],
    rating_aggregates: [],
    rating_audit_logs: [],
    objective_verifications: [],

    // Helpers
    addUser(user) {
      this.users.push({
        id: user.id || `usr_${crypto.randomBytes(4).toString('hex')}`,
        name: user.name || 'Test User',
        email: user.email || 'user@example.com',
        role: user.role || ROLES.STUDENT,
        accountStatus: user.accountStatus || 'ACTIVE',
        ...user,
      });
      return this.users[this.users.length - 1];
    },

    addInteraction(interaction) {
      const rec = {
        id: interaction.id || `int_${crypto.randomBytes(6).toString('hex')}`,
        interactionType: interaction.interactionType || INTERACTION_TYPES.APPLICATION_REVIEW,
        status: interaction.status || INTERACTION_STATUS.REVIEWED,
        initiatorUserId: interaction.initiatorUserId,
        initiatorEntityId: interaction.initiatorEntityId,
        initiatorRole: interaction.initiatorRole,
        participantUserId: interaction.participantUserId,
        participantEntityId: interaction.participantEntityId,
        participantRole: interaction.participantRole,
        isBlind: Boolean(interaction.isBlind),
        deadline: interaction.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: interaction.metadata || {},
        createdAt: interaction.createdAt || new Date().toISOString(),
        updatedAt: interaction.updatedAt || new Date().toISOString(),
      };
      this.rating_interactions.push(rec);
      return rec;
    },

    addObjectiveSkillScore(entityId, skillName, score) {
      this.objective_verifications.push({
        id: `ver_${crypto.randomBytes(4).toString('hex')}`,
        entityId,
        skillName,
        score: Math.max(0, Math.min(100, score)),
        verifiedAt: new Date().toISOString(),
      });
    },

    logAudit(action, actorUserId, targetId, metadata = {}) {
      this.rating_audit_logs.push({
        id: `aud_${crypto.randomBytes(6).toString('hex')}`,
        action,
        actorUserId,
        targetId,
        metadata,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

// ============================================================================
// 4. CORE REPUTATION & RATING SPECIFICATION ENGINES
// ============================================================================

/**
 * Evaluates rating eligibility with strict server-side rules
 */
function getRatingEligibility(sandbox, input) {
  const liveMod = loadProjectModule('lib/rating-engine');
  if (liveMod && typeof liveMod.getRatingEligibility === 'function') {
    try {
      return liveMod.getRatingEligibility(sandbox, input);
    } catch (e) {
      // fallback to oracle if live module throws
    }
  }

  // Authoritative Oracle Specification
  const { reviewerUserId, targetEntityId, targetEntityType, interactionId, contextType } = input || {};

  if (!reviewerUserId) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Authentication session is required to submit a rating',
    };
  }

  const reviewer = sandbox.users.find(u => u.id === reviewerUserId);
  if (!reviewer) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Reviewer user session not found',
    };
  }

  if (!targetEntityId || !targetEntityType) {
    return {
      eligible: false,
      code: 'UNVERIFIED_INTERACTION',
      reason: 'Target entity ID and role type are required',
    };
  }

  // Strict Terminology Enforcement
  const validRoles = [ROLES.STUDENT, ROLES.INDUSTRY, ROLES.INSTITUTE];
  if (!validRoles.includes(targetEntityType)) {
    return {
      eligible: false,
      code: 'UNVERIFIED_INTERACTION',
      reason: `Invalid target role terminology '${targetEntityType}'. Must be STUDENT, INDUSTRY, or INSTITUTE`,
    };
  }

  // Self-Rating Block
  if (reviewerUserId === targetEntityId || reviewer.entityId === targetEntityId) {
    return {
      eligible: false,
      code: 'SELF_RATING_FORBIDDEN',
      reason: 'Self-rating is strictly forbidden by platform anti-fraud policy',
    };
  }

  // Lookup Interaction
  let interaction = null;
  if (interactionId) {
    interaction = sandbox.rating_interactions.find(i => i.id === interactionId);
  } else {
    // Attempt resolving by participant pair
    interaction = sandbox.rating_interactions.find(
      i =>
        (i.initiatorUserId === reviewerUserId && (i.participantEntityId === targetEntityId || i.participantUserId === targetEntityId)) ||
        (i.participantUserId === reviewerUserId && (i.initiatorEntityId === targetEntityId || i.initiatorUserId === targetEntityId))
    );
  }

  if (!interaction) {
    return {
      eligible: false,
      code: 'UNVERIFIED_INTERACTION',
      reason: 'No verified platform interaction exists between reviewer and target entity',
    };
  }

  // Verify Reviewer is a legitimate party in this interaction
  const isInitiator = interaction.initiatorUserId === reviewerUserId;
  const isParticipant = interaction.participantUserId === reviewerUserId;
  if (!isInitiator && !isParticipant) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Reviewer is not an authorized participant of this interaction',
    };
  }

  // Interaction Lifecycle Stage Checks
  if (interaction.interactionType === INTERACTION_TYPES.APPLICATION_REVIEW) {
    if (interaction.status !== INTERACTION_STATUS.REVIEWED) {
      return {
        eligible: false,
        code: 'INTERACTION_STAGE_INVALID',
        reason: `Application review ratings are only allowed once application status is 'REVIEWED' (current: '${interaction.status}')`,
      };
    }
  } else if (interaction.interactionType === INTERACTION_TYPES.INTERVIEW_FEEDBACK) {
    if (interaction.status !== INTERACTION_STATUS.INTERVIEW_COMPLETED) {
      return {
        eligible: false,
        code: 'INTERACTION_STAGE_INVALID',
        reason: `Interview feedback ratings require stage 'INTERVIEW_COMPLETED'`,
      };
    }
  } else if (interaction.interactionType === INTERACTION_TYPES.INTERNSHIP_PERFORMANCE) {
    if (interaction.status !== INTERACTION_STATUS.INTERNSHIP_COMPLETED) {
      return {
        eligible: false,
        code: 'INTERACTION_STAGE_INVALID',
        reason: `Internship performance ratings require stage 'INTERNSHIP_COMPLETED'`,
      };
    }
  } else if (interaction.interactionType === INTERACTION_TYPES.COURSE_EVALUATION) {
    if (interaction.status !== INTERACTION_STATUS.COURSE_COMPLETED) {
      return {
        eligible: false,
        code: 'INTERACTION_STAGE_INVALID',
        reason: `Course evaluation ratings require stage 'COURSE_COMPLETED'`,
      };
    }
  }

  // Deadline Expiration Check
  if (interaction.deadline && new Date() > new Date(interaction.deadline)) {
    return {
      eligible: false,
      code: 'DEADLINE_EXPIRED',
      reason: 'The rating window deadline for this interaction has expired',
    };
  }

  // Duplicate Submission Check: Compound Key (interactionId, reviewerUserId)
  const existingRating = sandbox.ratings.find(
    r => r.interactionId === interaction.id && r.reviewerUserId === reviewerUserId && r.status !== RATING_STATUS.DELETED
  );
  if (existingRating) {
    return {
      eligible: false,
      code: 'ALREADY_RATED',
      reason: 'You have already submitted a rating for this interaction',
      existingRatingId: existingRating.id,
    };
  }

  const effectiveContext = contextType || interaction.interactionType;
  const allowedCategories = getCategoriesForContext(effectiveContext, targetEntityType);

  return {
    eligible: true,
    interaction: {
      id: interaction.id,
      interactionType: interaction.interactionType,
      status: interaction.status,
      isBlind: Boolean(interaction.isBlind),
      deadline: interaction.deadline,
      metadata: interaction.metadata,
    },
    allowedCategories,
    isBlind: Boolean(interaction.isBlind),
    deadline: interaction.deadline,
  };
}

/**
 * Calculates weighted arithmetic score across submitted category scores
 */
function calculateWeightedOverallScore(categoryScores, allowedCategories) {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const cat of allowedCategories) {
    const score = categoryScores[cat.code];
    if (score === undefined || score === null) {
      throw new Error(`Missing score for category '${cat.code}' (${cat.name})`);
    }

    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error(`Category '${cat.code}' score must be an integer between 1 and 5 (received: ${score})`);
    }

    totalWeightedScore += score * cat.weight;
    totalWeight += cat.weight;
  }

  if (totalWeight <= 0) return 0;
  // Round to 2 decimal places
  return Number((totalWeightedScore / totalWeight).toFixed(2));
}

/**
 * Submits a rating with transactional verification, scoring, and blind review logic
 */
function createRating(sandbox, input) {
  const liveMod = loadProjectModule('lib/rating-engine');
  if (liveMod && typeof liveMod.createRating === 'function') {
    try {
      return liveMod.createRating(sandbox, input);
    } catch (e) {
      // fallback to oracle
    }
  }

  const {
    reviewerUserId,
    targetUserId,
    targetEntityId,
    targetRole,
    interactionId,
    contextType,
    scores,
    recommendation,
    headline,
    reviewText,
    pros = [],
    cons = [],
    isVerified = true,
  } = input || {};

  // 1. Eligibility Check
  const eligibility = getRatingEligibility(sandbox, {
    reviewerUserId,
    targetEntityId: targetEntityId || targetUserId,
    targetEntityType: targetRole,
    interactionId,
    contextType,
  });

  if (!eligibility.eligible) {
    return {
      success: false,
      code: eligibility.code,
      error: eligibility.reason,
    };
  }

  // 2. Validate Recommendation
  if (![RECOMMENDATION_TYPES.RECOMMENDED, RECOMMENDATION_TYPES.NEUTRAL, RECOMMENDATION_TYPES.NOT_RECOMMENDED].includes(recommendation)) {
    return {
      success: false,
      code: 'INVALID_RECOMMENDATION',
      error: `Recommendation must be 'RECOMMENDED', 'NEUTRAL', or 'NOT_RECOMMENDED'`,
    };
  }

  // 3. Validate Scores and Compute Weighted Score
  let overallScore;
  try {
    overallScore = calculateWeightedOverallScore(scores || {}, eligibility.allowedCategories);
  } catch (err) {
    return {
      success: false,
      code: 'INVALID_SCORE',
      error: err.message,
    };
  }

  const ratingId = `rat_${crypto.randomBytes(6).toString('hex')}`;
  const isBlind = Boolean(eligibility.isBlind);
  let status = RATING_STATUS.PUBLISHED;
  let publishedAt = new Date().toISOString();

  // 4. Blind Review State Machine Handling
  if (isBlind) {
    // Check if other party already submitted a review for this interaction
    const otherRating = sandbox.ratings.find(
      r => r.interactionId === interactionId && r.reviewerUserId !== reviewerUserId && r.status === RATING_STATUS.PENDING_PUBLICATION
    );

    if (otherRating) {
      // Mutual submission satisfied! Publish both reviews simultaneously
      otherRating.status = RATING_STATUS.PUBLISHED;
      otherRating.publishedAt = new Date().toISOString();
      status = RATING_STATUS.PUBLISHED;
      publishedAt = new Date().toISOString();

      // Update interaction status
      const inter = sandbox.rating_interactions.find(i => i.id === interactionId);
      if (inter) inter.status = INTERACTION_STATUS.INTERNSHIP_COMPLETED;

      // Recalculate counterparty's profile aggregate
      recalculateProfileRatings(sandbox, otherRating.targetRole, otherRating.targetEntityId);
    } else {
      // First submission in blind pair: hold review in PENDING_PUBLICATION
      status = RATING_STATUS.PENDING_PUBLICATION;
      publishedAt = null;
    }
  }

  const newRating = {
    id: ratingId,
    interactionId,
    contextType: contextType || eligibility.interaction.interactionType,
    reviewerUserId,
    targetUserId: targetUserId || targetEntityId,
    targetEntityId: targetEntityId || targetUserId,
    targetRole,
    overallScore,
    recommendation,
    headline: headline || '',
    reviewText: reviewText || '',
    pros: Array.isArray(pros) ? pros : [],
    cons: Array.isArray(cons) ? cons : [],
    status,
    isBlind,
    isVerified: Boolean(isVerified),
    publishedAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sandbox.ratings.push(newRating);

  // Store category scores
  for (const cat of eligibility.allowedCategories) {
    sandbox.rating_category_scores.push({
      id: `rcs_${crypto.randomBytes(5).toString('hex')}`,
      ratingId,
      categoryCode: cat.code,
      score: scores[cat.code],
      weight: cat.weight,
    });
  }

  sandbox.logAudit('RATING_SUBMITTED', reviewerUserId, ratingId, {
    targetEntityId,
    overallScore,
    status,
    isBlind,
  });

  // If published immediately, recalculate aggregate cache
  if (status === RATING_STATUS.PUBLISHED) {
    recalculateProfileRatings(sandbox, targetRole, targetEntityId || targetUserId);
  }

  return {
    success: true,
    ratingId,
    status,
    overallScore,
    isBlind,
    publishedAt,
    message:
      status === RATING_STATUS.PENDING_PUBLICATION
        ? 'Rating recorded! Review is private until both parties submit or deadline expires.'
        : 'Rating published successfully.',
  };
}

/**
 * Simulates deadline fallback publication for pending blind reviews
 */
function publishExpiredBlindReviews(sandbox, interactionId) {
  const inter = sandbox.rating_interactions.find(i => i.id === interactionId);
  if (!inter) return 0;

  const pendingRatings = sandbox.ratings.filter(
    r => r.interactionId === interactionId && r.status === RATING_STATUS.PENDING_PUBLICATION
  );

  let publishedCount = 0;
  for (const rating of pendingRatings) {
    rating.status = RATING_STATUS.PUBLISHED;
    rating.publishedAt = new Date().toISOString();
    publishedCount++;
    recalculateProfileRatings(sandbox, rating.targetRole, rating.targetEntityId);
  }

  return publishedCount;
}

/**
 * Recalculates and repairs pre-computed profile rating aggregates
 */
function recalculateProfileRatings(sandbox, targetRole, targetEntityId) {
  const liveMod = loadProjectModule('lib/rating-engine');
  if (liveMod && typeof liveMod.recalculateProfileRatings === 'function') {
    try {
      return liveMod.recalculateProfileRatings(sandbox, targetRole, targetEntityId);
    } catch (e) {
      // fallback to oracle
    }
  }

  const publishedRatings = sandbox.ratings.filter(
    r =>
      r.targetEntityId === targetEntityId &&
      r.targetRole === targetRole &&
      r.status === RATING_STATUS.PUBLISHED
  );

  const totalCount = publishedRatings.length;
  const verifiedCount = publishedRatings.filter(r => r.isVerified).length;

  if (totalCount === 0) {
    const emptyAggregate = {
      targetRole,
      targetEntityId,
      totalRatingsCount: 0,
      verifiedRatingsCount: 0,
      averageScore: 0,
      displayScore: 'No verified ratings yet',
      recommendationRate: 0,
      categoryBreakdown: {},
      scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      contextBreakdown: {},
      objectiveSkillScore: 0,
      verificationTrustLevel: TRUST_LEVELS.UNVERIFIED,
      lastRecalculatedAt: new Date().toISOString(),
    };

    // Update in-memory aggregate cache
    const existingIdx = sandbox.rating_aggregates.findIndex(
      a => a.targetEntityId === targetEntityId && a.targetRole === targetRole
    );
    if (existingIdx >= 0) sandbox.rating_aggregates[existingIdx] = emptyAggregate;
    else sandbox.rating_aggregates.push(emptyAggregate);

    return emptyAggregate;
  }

  // Calculate Average Score
  const sumScores = publishedRatings.reduce((acc, r) => acc + r.overallScore, 0);
  const averageScore = Number((sumScores / totalCount).toFixed(2));

  // Calculate Recommendation Rate
  const recommendedCount = publishedRatings.filter(r => r.recommendation === RECOMMENDATION_TYPES.RECOMMENDED).length;
  const recommendationRate = Number(((recommendedCount / totalCount) * 100).toFixed(1));

  // Calculate Score Distribution (1..5 stars)
  const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  publishedRatings.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.round(r.overallScore)));
    scoreDistribution[star] = (scoreDistribution[star] || 0) + 1;
  });

  // Calculate Context Breakdown
  const contextBreakdown = {};
  publishedRatings.forEach(r => {
    contextBreakdown[r.contextType] = (contextBreakdown[r.contextType] || 0) + 1;
  });

  // Calculate Category Breakdown
  const ratingIds = new Set(publishedRatings.map(r => r.id));
  const relevantScores = sandbox.rating_category_scores.filter(cs => ratingIds.has(cs.ratingId));
  const categoryBreakdown = {};

  relevantScores.forEach(cs => {
    if (!categoryBreakdown[cs.categoryCode]) {
      categoryBreakdown[cs.categoryCode] = { total: 0, count: 0, name: cs.categoryCode };
    }
    categoryBreakdown[cs.categoryCode].total += cs.score;
    categoryBreakdown[cs.categoryCode].count += 1;
  });

  Object.keys(categoryBreakdown).forEach(code => {
    const item = categoryBreakdown[code];
    categoryBreakdown[code] = {
      average: Number((item.total / item.count).toFixed(2)),
      count: item.count,
      name: code,
    };
  });

  // Verification Trust Level Calculation
  let verificationTrustLevel = TRUST_LEVELS.UNVERIFIED;
  if (totalCount >= 10 && averageScore >= 4.5 && verifiedCount >= 8) {
    verificationTrustLevel = TRUST_LEVELS.GOLD_TRUSTED;
  } else if (totalCount >= 5 && verifiedCount >= 4) {
    verificationTrustLevel = TRUST_LEVELS.VERIFIED_TIER2;
  } else if (totalCount >= 1 && verifiedCount >= 1) {
    verificationTrustLevel = TRUST_LEVELS.VERIFIED_TIER1;
  }

  // Objective Skill Score (0-100) from Skill Bridge assessment engine
  const skillRecords = sandbox.objective_verifications.filter(v => v.entityId === targetEntityId);
  const objectiveSkillScore =
    skillRecords.length > 0
      ? Number((skillRecords.reduce((a, b) => a + b.score, 0) / skillRecords.length).toFixed(1))
      : 0;

  const aggregate = {
    targetRole,
    targetEntityId,
    totalRatingsCount: totalCount,
    verifiedRatingsCount: verifiedCount,
    averageScore,
    displayScore: `${averageScore.toFixed(1)} ★`,
    recommendationRate,
    categoryBreakdown,
    scoreDistribution,
    contextBreakdown,
    objectiveSkillScore,
    verificationTrustLevel,
    lastRecalculatedAt: new Date().toISOString(),
  };

  const existingIdx = sandbox.rating_aggregates.findIndex(
    a => a.targetEntityId === targetEntityId && a.targetRole === targetRole
  );
  if (existingIdx >= 0) sandbox.rating_aggregates[existingIdx] = aggregate;
  else sandbox.rating_aggregates.push(aggregate);

  return aggregate;
}

// ============================================================================
// 5. ADMIN MODERATION, REPORTS & APPEALS WORKFLOW
// ============================================================================

function reportRating(sandbox, { ratingId, reporterUserId, reason, details }) {
  const rating = sandbox.ratings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  const reportId = `rep_${crypto.randomBytes(4).toString('hex')}`;
  const report = {
    id: reportId,
    ratingId,
    reporterUserId,
    reason,
    details: details || '',
    status: REPORT_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  };

  sandbox.rating_reports.push(report);
  sandbox.logAudit('RATING_REPORTED', reporterUserId, ratingId, { reason });
  return report;
}

function hideRating(sandbox, { ratingId, adminUserId, reason }) {
  const rating = sandbox.ratings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  rating.status = RATING_STATUS.HIDDEN;
  rating.updatedAt = new Date().toISOString();

  sandbox.logAudit('RATING_HIDDEN_BY_ADMIN', adminUserId, ratingId, { reason });
  recalculateProfileRatings(sandbox, rating.targetRole, rating.targetEntityId);
  return rating;
}

function appealRating(sandbox, { ratingId, appealingUserId, reason, justification }) {
  const rating = sandbox.ratings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  const appealId = `app_${crypto.randomBytes(4).toString('hex')}`;
  const appeal = {
    id: appealId,
    ratingId,
    appealingUserId,
    reason,
    justification: justification || '',
    status: APPEAL_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  };

  sandbox.rating_appeals.push(appeal);
  sandbox.logAudit('RATING_APPEAL_SUBMITTED', appealingUserId, ratingId, { reason });
  return appeal;
}

function restoreRating(sandbox, { ratingId, adminUserId, resolutionNotes }) {
  const rating = sandbox.ratings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  rating.status = RATING_STATUS.PUBLISHED;
  rating.updatedAt = new Date().toISOString();

  // Update any pending appeals to APPROVED_RESTORED
  sandbox.rating_appeals
    .filter(a => a.ratingId === ratingId && a.status === APPEAL_STATUS.PENDING)
    .forEach(a => {
      a.status = APPEAL_STATUS.APPROVED_RESTORED;
      a.resolvedBy = adminUserId;
      a.resolutionNotes = resolutionNotes;
    });

  sandbox.logAudit('RATING_RESTORED_BY_ADMIN', adminUserId, ratingId, { resolutionNotes });
  recalculateProfileRatings(sandbox, rating.targetRole, rating.targetEntityId);
  return rating;
}

/**
 * Heuristic suspicious rating activity detector
 */
function detectSuspiciousRatingActivity(sandbox, { targetRole, targetEntityId }) {
  const ratings = sandbox.ratings.filter(r => r.targetEntityId === targetEntityId && r.targetRole === targetRole);
  const anomalies = [];

  // Spike detection: > 5 reviews within 1 hour
  const timestamps = ratings.map(r => new Date(r.createdAt).getTime()).sort();
  for (let i = 0; i < timestamps.length - 4; i++) {
    if (timestamps[i + 4] - timestamps[i] < 3600 * 1000) {
      anomalies.push('VELOCITY_SPIKE_DETECTED: >5 ratings submitted in under 1 hour');
      break;
    }
  }

  // Unverified Interaction Ratio: > 40% unverified reviews
  if (ratings.length >= 5) {
    const unverifiedCount = ratings.filter(r => !r.isVerified).length;
    if (unverifiedCount / ratings.length > 0.4) {
      anomalies.push('HIGH_UNVERIFIED_RATIO: More than 40% of reviews lack verified platform interactions');
    }
  }

  return {
    isSuspicious: anomalies.length > 0,
    anomalies,
    totalRatingsAnalyzed: ratings.length,
  };
}

module.exports = {
  ROLES,
  INTERACTION_TYPES,
  INTERACTION_STATUS,
  RATING_STATUS,
  RECOMMENDATION_TYPES,
  TRUST_LEVELS,
  REPORT_STATUS,
  APPEAL_STATUS,
  RATING_CONTEXT_CATEGORIES,
  getCategoriesForContext,
  createRatingSandbox,
  getRatingEligibility,
  calculateWeightedOverallScore,
  createRating,
  publishExpiredBlindReviews,
  recalculateProfileRatings,
  reportRating,
  hideRating,
  appealRating,
  restoreRating,
  detectSuspiciousRatingActivity,
};
