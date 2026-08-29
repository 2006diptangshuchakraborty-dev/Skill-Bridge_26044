/**
 * Skill Bridge Platform - Verified Reputation, Rating, Feedback, Trust & Review Engine
 * File: lib/rating-engine.js
 * 
 * Provides:
 * 1. Strict Server-Side Rating Eligibility Verification (getRatingEligibility)
 * 2. Transactional Rating Submission with 2-Way Blind Review State Machine (createRating)
 * 3. Weighted Category Scoring Arithmetic & Category Taxonomy
 * 4. Aggregate Calculation, Trust Badging & Aggregate Repair Engine (recalculateProfileRatings)
 * 5. Pending Ratings Service with Countdown Tracking (getPendingRatingsForUser)
 * 6. Blind Review Deadline Fallback Publication (publishExpiredBlindReviews)
 * 7. Admin Moderation & Anti-Fraud Radar (reportRating, hideRating, appealRating, restoreRating, detectSuspiciousRatingActivity)
 */

const crypto = require('crypto');

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
// 3. UNIFIED DATABASE ACCESS ADAPTER (SANDBOX & LIVE HYBRID)
// ============================================================================

function getDatabaseContext(dbOrNull) {
  if (dbOrNull && typeof dbOrNull === 'object') {
    if (typeof dbOrNull.getUsers === 'function') {
      return dbOrNull;
    }
    // Isolated in-memory sandbox or mock DB object
    return {
      isSandbox: true,
      getUsers: () => dbOrNull.users || [],
      getInteractions: () => dbOrNull.rating_interactions || dbOrNull.ratingInteractions || [],
      getRatings: () => dbOrNull.ratings || [],
      getCategoryScores: () => dbOrNull.rating_category_scores || dbOrNull.ratingCategoryScores || [],
      getAggregates: () => dbOrNull.rating_aggregates || dbOrNull.ratingAggregates || [],
      getReports: () => dbOrNull.rating_reports || dbOrNull.ratingReports || [],
      getAppeals: () => dbOrNull.rating_appeals || dbOrNull.ratingAppeals || [],
      getAuditLogs: () => dbOrNull.rating_audit_logs || dbOrNull.ratingAuditLogs || [],
      getObjectiveVerifications: () => dbOrNull.objective_verifications || dbOrNull.verifications || [],
      pushRating: (r) => {
        if (!dbOrNull.ratings) dbOrNull.ratings = [];
        dbOrNull.ratings.push(r);
      },
      pushCategoryScore: (cs) => {
        if (dbOrNull.rating_category_scores) {
          dbOrNull.rating_category_scores.push(cs);
        } else if (dbOrNull.ratingCategoryScores) {
          dbOrNull.ratingCategoryScores.push(cs);
        } else {
          dbOrNull.rating_category_scores = [cs];
        }
      },
      pushReport: (rep) => {
        if (dbOrNull.rating_reports) dbOrNull.rating_reports.push(rep);
        else if (dbOrNull.ratingReports) dbOrNull.ratingReports.push(rep);
        else dbOrNull.rating_reports = [rep];
      },
      pushAppeal: (app) => {
        if (dbOrNull.rating_appeals) dbOrNull.rating_appeals.push(app);
        else if (dbOrNull.ratingAppeals) dbOrNull.ratingAppeals.push(app);
        else dbOrNull.rating_appeals = [app];
      },
      setAggregate: (targetRole, targetEntityId, aggregate) => {
        const aggs = dbOrNull.rating_aggregates || dbOrNull.ratingAggregates || [];
        const idx = aggs.findIndex(a => a.targetEntityId === targetEntityId && a.targetRole === targetRole);
        if (idx >= 0) aggs[idx] = aggregate;
        else aggs.push(aggregate);
      },
      logAudit: (action, actorUserId, targetId, metadata = {}) => {
        if (typeof dbOrNull.logAudit === 'function') {
          dbOrNull.logAudit(action, actorUserId, targetId, metadata);
        } else {
          const logs = dbOrNull.rating_audit_logs || dbOrNull.ratingAuditLogs || [];
          logs.push({
            id: `aud_${crypto.randomBytes(6).toString('hex')}`,
            action,
            actorUserId,
            targetId,
            metadata,
            timestamp: new Date().toISOString(),
          });
        }
      },
      save: () => {
        if (typeof dbOrNull.save === 'function') dbOrNull.save();
      },
    };
  }

  // Live DB via lib/db.js
  const localDb = require('./db');
  const dbData = localDb.getDb();
  dbData.ratingInteractions = dbData.ratingInteractions || [];
  dbData.ratings = dbData.ratings || [];
  dbData.ratingCategoryScores = dbData.ratingCategoryScores || [];
  dbData.ratingAggregates = dbData.ratingAggregates || [];
  dbData.ratingAuditLogs = dbData.ratingAuditLogs || [];
  dbData.ratingReports = dbData.ratingReports || [];
  dbData.ratingAppeals = dbData.ratingAppeals || [];

  return {
    isSandbox: false,
    getUsers: () => dbData.users || [],
    getInteractions: () => dbData.ratingInteractions || [],
    getRatings: () => dbData.ratings || [],
    getCategoryScores: () => dbData.ratingCategoryScores || [],
    getAggregates: () => dbData.ratingAggregates || [],
    getReports: () => dbData.ratingReports || [],
    getAppeals: () => dbData.ratingAppeals || [],
    getAuditLogs: () => dbData.ratingAuditLogs || [],
    getObjectiveVerifications: () => dbData.verifications || [],
    pushRating: (r) => {
      dbData.ratings.push(r);
    },
    pushCategoryScore: (cs) => {
      dbData.ratingCategoryScores.push(cs);
    },
    pushReport: (rep) => {
      dbData.ratingReports.push(rep);
    },
    pushAppeal: (app) => {
      dbData.ratingAppeals.push(app);
    },
    setAggregate: (targetRole, targetEntityId, aggregate) => {
      const idx = dbData.ratingAggregates.findIndex(a => a.targetEntityId === targetEntityId && a.targetRole === targetRole);
      if (idx >= 0) dbData.ratingAggregates[idx] = aggregate;
      else dbData.ratingAggregates.push(aggregate);
    },
    logAudit: (action, actorUserId, targetId, metadata = {}) => {
      localDb.logRatingAuditEvent({
        action,
        ratingId: targetId,
        actorUserId,
        reason: metadata?.reason || null,
        newState: metadata,
      });
    },
    save: () => {
      localDb.saveDb(dbData);
    },
  };
}

function resolveDbAndInput(arg1, arg2) {
  if (arg2 !== undefined) {
    return { dbCtx: getDatabaseContext(arg1), rawDb: arg1, input: arg2 };
  }
  // Only 1 argument passed: arg1 is the input payload
  return { dbCtx: getDatabaseContext(null), rawDb: null, input: arg1 || {} };
}

// ============================================================================
// 4. SCORING ARITHMETIC
// ============================================================================

/**
 * Calculates weighted arithmetic score across submitted category scores
 * @param {Record<string, number>} categoryScores
 * @param {Array<{code: string, name: string, weight: number}>} allowedCategories
 * @returns {number} Weighted arithmetic score (1.00 - 5.00)
 */
function calculateWeightedOverallScore(categoryScores, allowedCategories) {
  if (!allowedCategories || !Array.isArray(allowedCategories) || allowedCategories.length === 0) {
    throw new Error('Allowed categories configuration is missing or invalid');
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const cat of allowedCategories) {
    const score = categoryScores ? categoryScores[cat.code] : undefined;
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
  return Number((totalWeightedScore / totalWeight).toFixed(2));
}

// ============================================================================
// 5. RATING ELIGIBILITY SERVICE
// ============================================================================

/**
 * Evaluates whether an authenticated user is eligible to rate a target entity
 */
function getRatingEligibility(arg1, arg2) {
  const { dbCtx, input } = resolveDbAndInput(arg1, arg2);
  const { reviewerUserId, targetEntityId, targetEntityType, interactionId, contextType } = input || {};

  // 1. Session & Identity Validation
  if (!reviewerUserId) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Authentication session is required to submit a rating',
    };
  }

  const users = dbCtx.getUsers();
  const reviewer = users.find(u => u.id === reviewerUserId);
  if (!reviewer) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Reviewer user session not found',
    };
  }

  // 2. Target Entity & Role Validation
  if (!targetEntityId || !targetEntityType) {
    return {
      eligible: false,
      code: 'UNVERIFIED_INTERACTION',
      reason: 'Target entity ID and role type are required',
    };
  }

  // 3. Strict Terminology Enforcement
  const validRoles = [ROLES.STUDENT, ROLES.INDUSTRY, ROLES.INSTITUTE];
  if (!validRoles.includes(targetEntityType)) {
    return {
      eligible: false,
      code: 'UNVERIFIED_INTERACTION',
      reason: `Invalid target role terminology '${targetEntityType}'. Must be STUDENT, INDUSTRY, or INSTITUTE`,
    };
  }

  // 4. Self-Rating Prevention
  if (
    reviewerUserId === targetEntityId ||
    reviewer.entityId === targetEntityId ||
    reviewerUserId === input.targetUserId
  ) {
    return {
      eligible: false,
      code: 'SELF_RATING_FORBIDDEN',
      reason: 'Self-rating is strictly forbidden by platform anti-fraud policy',
    };
  }

  // 5. Lookup Interaction
  const interactions = dbCtx.getInteractions();
  let interaction = null;
  if (interactionId) {
    interaction = interactions.find(i => i.id === interactionId);
  } else {
    // Attempt resolving by participant pair
    interaction = interactions.find(
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

  // 6. Verify Reviewer is an authorized participant of this interaction
  const isInitiator = interaction.initiatorUserId === reviewerUserId;
  const isParticipant = interaction.participantUserId === reviewerUserId;
  if (!isInitiator && !isParticipant) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED',
      reason: 'Reviewer is not an authorized participant of this interaction',
    };
  }

  // 7. Interaction Lifecycle Stage Checks
  if (interaction.interactionType === INTERACTION_TYPES.APPLICATION_REVIEW) {
    if (interaction.status !== INTERACTION_STATUS.REVIEWED && interaction.status !== 'SHORTLISTED') {
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

  // 8. Deadline Expiration Check
  if (interaction.deadline && new Date() > new Date(interaction.deadline)) {
    return {
      eligible: false,
      code: 'DEADLINE_EXPIRED',
      reason: 'The rating window deadline for this interaction has expired',
    };
  }

  // 9. Duplicate Submission Check: Compound Key (interactionId, reviewerUserId)
  const ratings = dbCtx.getRatings();
  const existingRating = ratings.find(
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

// ============================================================================
// 6. RATING CREATION SERVICE (TRANSACTIONAL & BLIND REVIEW ENGINE)
// ============================================================================

/**
 * Creates and submits a verified rating with blind review state handling
 */
function createRating(arg1, arg2) {
  const { dbCtx, rawDb, input } = resolveDbAndInput(arg1, arg2);
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

  const normalizedTargetEntityId = targetEntityId || targetUserId;
  const normalizedTargetUserId = targetUserId || targetEntityId;

  // 1. Rate Limiting Check (Velocity limiter: max 10 ratings / hour per user)
  const allRatings = dbCtx.getRatings();
  const oneHourAgo = new Date(Date.now() - 3600 * 1000);
  const userRecentRatings = allRatings.filter(
    r => r.reviewerUserId === reviewerUserId && new Date(r.createdAt) > oneHourAgo
  );
  if (userRecentRatings.length >= 10) {
    return {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Rate limit exceeded: You have submitted maximum allowed ratings for this hour.',
    };
  }

  // 2. Eligibility Validation
  const eligibility = getRatingEligibility(rawDb || dbCtx, {
    reviewerUserId,
    targetEntityId: normalizedTargetEntityId,
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

  // 3. Recommendation Type Validation
  if (
    ![RECOMMENDATION_TYPES.RECOMMENDED, RECOMMENDATION_TYPES.NEUTRAL, RECOMMENDATION_TYPES.NOT_RECOMMENDED].includes(
      recommendation
    )
  ) {
    return {
      success: false,
      code: 'INVALID_RECOMMENDATION',
      error: `Recommendation must be 'RECOMMENDED', 'NEUTRAL', or 'NOT_RECOMMENDED'`,
    };
  }

  // 4. Validate Category Scores & Compute Weighted Overall Score
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

  // 5. Blind Review State Machine Handling
  if (isBlind) {
    const counterpartyRating = allRatings.find(
      r =>
        r.interactionId === interactionId &&
        r.reviewerUserId !== reviewerUserId &&
        r.status === RATING_STATUS.PENDING_PUBLICATION
    );

    if (counterpartyRating) {
      // Mutual submission satisfied! Publish both reviews simultaneously
      counterpartyRating.status = RATING_STATUS.PUBLISHED;
      counterpartyRating.publishedAt = new Date().toISOString();
      status = RATING_STATUS.PUBLISHED;
      publishedAt = new Date().toISOString();

      // Recalculate counterparty's profile aggregate
      recalculateProfileRatings(rawDb || dbCtx, counterpartyRating.targetRole, counterpartyRating.targetEntityId);
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
    targetUserId: normalizedTargetUserId,
    targetEntityId: normalizedTargetEntityId,
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

  dbCtx.pushRating(newRating);

  // Store Category Integer Scores
  for (const cat of eligibility.allowedCategories) {
    dbCtx.pushCategoryScore({
      id: `rcs_${crypto.randomBytes(5).toString('hex')}`,
      ratingId,
      categoryCode: cat.code,
      score: scores[cat.code],
      weight: cat.weight,
    });
  }

  dbCtx.logAudit('RATING_SUBMITTED', reviewerUserId, ratingId, {
    targetEntityId: normalizedTargetEntityId,
    overallScore,
    status,
    isBlind,
  });

  // If published immediately, recalculate aggregate cache
  if (status === RATING_STATUS.PUBLISHED) {
    recalculateProfileRatings(rawDb || dbCtx, targetRole, normalizedTargetEntityId);
  }

  dbCtx.save();

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

// ============================================================================
// 7. AGGREGATE RECALCULATION & REPAIR ENGINE
// ============================================================================

/**
 * Recalculates and repairs pre-computed profile rating aggregates
 */
function recalculateProfileRatings(arg1, arg2, arg3) {
  let dbCtx, rawDb, targetRole, targetEntityId;
  if (arg3 !== undefined) {
    dbCtx = getDatabaseContext(arg1);
    rawDb = arg1;
    targetRole = arg2;
    targetEntityId = arg3;
  } else {
    dbCtx = getDatabaseContext(null);
    rawDb = null;
    targetRole = arg1;
    targetEntityId = arg2;
  }

  const allRatings = dbCtx.getRatings();
  const publishedRatings = allRatings.filter(
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

    dbCtx.setAggregate(targetRole, targetEntityId, emptyAggregate);
    dbCtx.save();
    return emptyAggregate;
  }

  // Calculate Average Score
  const sumScores = publishedRatings.reduce((acc, r) => acc + Number(r.overallScore || 0), 0);
  const averageScore = Number((sumScores / totalCount).toFixed(2));

  // Calculate Recommendation Rate
  const recommendedCount = publishedRatings.filter(r => r.recommendation === RECOMMENDATION_TYPES.RECOMMENDED).length;
  const recommendationRate = Number(((recommendedCount / totalCount) * 100).toFixed(1));

  // Calculate Score Distribution (1..5 stars)
  const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  publishedRatings.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.overallScore || 5))));
    scoreDistribution[star] = (scoreDistribution[star] || 0) + 1;
  });

  // Calculate Context Breakdown
  const contextBreakdown = {};
  publishedRatings.forEach(r => {
    const ctx = r.contextType || 'GLOBAL';
    contextBreakdown[ctx] = (contextBreakdown[ctx] || 0) + 1;
  });

  // Calculate Category Breakdown
  const ratingIds = new Set(publishedRatings.map(r => r.id));
  const allCatScores = dbCtx.getCategoryScores();
  const relevantScores = allCatScores.filter(cs => ratingIds.has(cs.ratingId));
  const categoryBreakdown = {};

  relevantScores.forEach(cs => {
    if (!categoryBreakdown[cs.categoryCode]) {
      categoryBreakdown[cs.categoryCode] = { total: 0, count: 0, name: cs.categoryCode };
    }
    categoryBreakdown[cs.categoryCode].total += Number(cs.score);
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

  // Objective Skill Score (0-100 scale)
  const verifications = dbCtx.getObjectiveVerifications();
  const skillRecords = verifications.filter(
    v => v.entityId === targetEntityId || v.userId === targetEntityId || v.studentId === targetEntityId
  );
  const objectiveSkillScore =
    skillRecords.length > 0
      ? Number((skillRecords.reduce((a, b) => a + (b.score || b.assessmentScore || 0), 0) / skillRecords.length).toFixed(1))
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

  dbCtx.setAggregate(targetRole, targetEntityId, aggregate);
  dbCtx.save();

  return aggregate;
}

// ============================================================================
// 8. PENDING RATINGS QUERY SERVICE
// ============================================================================

/**
 * Retrieves pending rating opportunities for a user across all interaction types
 * @param {string} userId - Authenticated user ID
 * @param {string} role - User role
 * @returns {Array<Object>} List of actionable rating opportunities
 */
function getPendingRatingsForUser(arg1, arg2, arg3) {
  let dbCtx, rawDb, userId, role;
  if (arg3 !== undefined) {
    dbCtx = getDatabaseContext(arg1);
    rawDb = arg1;
    userId = arg2;
    role = arg3;
  } else {
    dbCtx = getDatabaseContext(null);
    rawDb = null;
    userId = arg1;
    role = arg2;
  }

  if (!userId) return [];

  const interactions = dbCtx.getInteractions();
  const ratings = dbCtx.getRatings();
  const now = new Date();

  // Find interactions where user is initiator or participant
  const eligibleInteractions = interactions.filter(i => {
    const isUserInitiator = i.initiatorUserId === userId;
    const isUserParticipant = i.participantUserId === userId;
    if (!isUserInitiator && !isUserParticipant) return false;

    // Check if user has already submitted rating
    const alreadySubmitted = ratings.some(
      r => r.interactionId === i.id && r.reviewerUserId === userId && r.status !== RATING_STATUS.DELETED
    );
    if (alreadySubmitted) return false;

    // Check deadline
    if (i.deadline && new Date(i.deadline) < now) return false;

    // Check interaction stage validity
    if (i.interactionType === INTERACTION_TYPES.APPLICATION_REVIEW) {
      if (i.status !== INTERACTION_STATUS.REVIEWED && i.status !== 'SHORTLISTED') return false;
    } else if (i.interactionType === INTERACTION_TYPES.INTERVIEW_FEEDBACK) {
      if (i.status !== INTERACTION_STATUS.INTERVIEW_COMPLETED) return false;
    } else if (i.interactionType === INTERACTION_TYPES.INTERNSHIP_PERFORMANCE) {
      if (i.status !== INTERACTION_STATUS.INTERNSHIP_COMPLETED) return false;
    } else if (i.interactionType === INTERACTION_TYPES.COURSE_EVALUATION) {
      if (i.status !== INTERACTION_STATUS.COURSE_COMPLETED) return false;
    }

    return true;
  });

  return eligibleInteractions.map(i => {
    const isUserInitiator = i.initiatorUserId === userId;
    const targetUserId = isUserInitiator ? i.participantUserId : i.initiatorUserId;
    const targetEntityId = isUserInitiator ? (i.participantEntityId || i.participantUserId) : (i.initiatorEntityId || i.initiatorUserId);
    const targetRole = isUserInitiator ? (i.participantRole || ROLES.STUDENT) : (i.initiatorRole || ROLES.INDUSTRY);
    const allowedCategories = getCategoriesForContext(i.interactionType, targetRole);
    const deadlineDate = i.deadline ? new Date(i.deadline) : null;
    const countdownMs = deadlineDate ? Math.max(0, deadlineDate.getTime() - now.getTime()) : null;

    return {
      interactionId: i.id,
      interactionType: i.interactionType,
      status: i.status,
      isBlind: Boolean(i.isBlind),
      targetUserId,
      targetEntityId,
      targetRole,
      allowedCategories,
      deadline: i.deadline || null,
      countdownMs,
      metadata: i.metadata || {},
      createdAt: i.createdAt,
    };
  });
}

// ============================================================================
// 9. DEADLINE FALLBACK PUBLICATION
// ============================================================================

/**
 * Publishes expired blind reviews when counterparty misses deadline
 */
function publishExpiredBlindReviews(arg1, arg2) {
  let dbCtx, rawDb, interactionId;
  if (arg2 !== undefined) {
    dbCtx = getDatabaseContext(arg1);
    rawDb = arg1;
    interactionId = arg2;
  } else {
    dbCtx = getDatabaseContext(null);
    rawDb = null;
    interactionId = arg1;
  }

  const interactions = dbCtx.getInteractions();
  const inter = interactions.find(i => i.id === interactionId);
  if (!inter) return 0;

  const allRatings = dbCtx.getRatings();
  const pendingRatings = allRatings.filter(
    r => r.interactionId === interactionId && r.status === RATING_STATUS.PENDING_PUBLICATION
  );

  let publishedCount = 0;
  for (const rating of pendingRatings) {
    rating.status = RATING_STATUS.PUBLISHED;
    rating.publishedAt = new Date().toISOString();
    publishedCount++;
    recalculateProfileRatings(rawDb || dbCtx, rating.targetRole, rating.targetEntityId);
  }

  dbCtx.save();
  return publishedCount;
}

// ============================================================================
// 10. ADMIN MODERATION & ANTI-FRAUD HEURISTICS
// ============================================================================

function reportRating(arg1, arg2) {
  const { dbCtx, input } = resolveDbAndInput(arg1, arg2);
  const { ratingId, reporterUserId, reason, details } = input || {};

  const allRatings = dbCtx.getRatings();
  const rating = allRatings.find(r => r.id === ratingId);
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

  dbCtx.pushReport(report);
  dbCtx.logAudit('RATING_REPORTED', reporterUserId, ratingId, { reason });
  dbCtx.save();
  return report;
}

function hideRating(arg1, arg2) {
  const { dbCtx, rawDb, input } = resolveDbAndInput(arg1, arg2);
  const { ratingId, adminUserId, reason } = input || {};

  const allRatings = dbCtx.getRatings();
  const rating = allRatings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  rating.status = RATING_STATUS.HIDDEN;
  rating.updatedAt = new Date().toISOString();

  dbCtx.logAudit('RATING_HIDDEN_BY_ADMIN', adminUserId, ratingId, { reason });
  recalculateProfileRatings(rawDb || dbCtx, rating.targetRole, rating.targetEntityId);
  dbCtx.save();
  return rating;
}

function appealRating(arg1, arg2) {
  const { dbCtx, input } = resolveDbAndInput(arg1, arg2);
  const { ratingId, appealingUserId, reason, justification } = input || {};

  const allRatings = dbCtx.getRatings();
  const rating = allRatings.find(r => r.id === ratingId);
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

  dbCtx.pushAppeal(appeal);
  dbCtx.logAudit('RATING_APPEAL_SUBMITTED', appealingUserId, ratingId, { reason });
  dbCtx.save();
  return appeal;
}

function restoreRating(arg1, arg2) {
  const { dbCtx, rawDb, input } = resolveDbAndInput(arg1, arg2);
  const { ratingId, adminUserId, resolutionNotes } = input || {};

  const allRatings = dbCtx.getRatings();
  const rating = allRatings.find(r => r.id === ratingId);
  if (!rating) throw new Error(`Rating with ID '${ratingId}' not found`);

  rating.status = RATING_STATUS.PUBLISHED;
  rating.updatedAt = new Date().toISOString();

  const appeals = dbCtx.getAppeals();
  appeals
    .filter(a => a.ratingId === ratingId && a.status === APPEAL_STATUS.PENDING)
    .forEach(a => {
      a.status = APPEAL_STATUS.APPROVED_RESTORED;
      a.resolvedBy = adminUserId;
      a.resolutionNotes = resolutionNotes;
    });

  dbCtx.logAudit('RATING_RESTORED_BY_ADMIN', adminUserId, ratingId, { resolutionNotes });
  recalculateProfileRatings(rawDb || dbCtx, rating.targetRole, rating.targetEntityId);
  dbCtx.save();
  return rating;
}

function detectSuspiciousRatingActivity(arg1, arg2) {
  const { dbCtx, input } = resolveDbAndInput(arg1, arg2);
  const { targetRole, targetEntityId } = input || {};

  const allRatings = dbCtx.getRatings();
  const ratings = allRatings.filter(r => r.targetEntityId === targetEntityId && r.targetRole === targetRole);
  const anomalies = [];

  // 1. Spike detection: > 5 reviews within 1 hour
  const timestamps = ratings.map(r => new Date(r.createdAt).getTime()).sort();
  for (let i = 0; i < timestamps.length - 4; i++) {
    if (timestamps[i + 4] - timestamps[i] < 3600 * 1000) {
      anomalies.push('VELOCITY_SPIKE_DETECTED: >5 ratings submitted in under 1 hour');
      break;
    }
  }

  // 2. High Unverified Interaction Ratio: > 40% unverified reviews
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
  calculateWeightedOverallScore,
  getRatingEligibility,
  createRating,
  recalculateProfileRatings,
  getPendingRatingsForUser,
  publishExpiredBlindReviews,
  reportRating,
  hideRating,
  appealRating,
  restoreRating,
  detectSuspiciousRatingActivity,
};
