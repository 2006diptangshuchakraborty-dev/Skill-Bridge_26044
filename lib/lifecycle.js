/**
 * Skill Bridge Platform - Workflow & Entity Event Lifecycle Service
 * File: lib/lifecycle.js
 * 
 * Provides automated rating eligibility & interaction creation across:
 * 1. Application Review: Status -> REVIEWED / SHORTLISTED (Industry -> Student)
 * 2. Interview Completion: Status -> INTERVIEW_COMPLETED (2-way eligibility)
 * 3. Assessment / Task Completion: Status -> EVALUATED (Objective Skill Score 0-100)
 * 4. Internship / Job Completion: Status -> INTERNSHIP_COMPLETED (2-way blind review, 14-day deadline)
 * 5. Course / Seminar Completion: Status -> COURSE_COMPLETED (Institute <-> Student)
 */

const crypto = require('crypto');
const { PLATFORM_EVENTS, emitPlatformEvent } = require('./events');

// ============================================================================
// 1. DATABASE ADAPTER UTILITIES
// ============================================================================

function resolveDb(dbArg) {
  if (dbArg && typeof dbArg === 'object') {
    return {
      isSandbox: true,
      rawDb: dbArg,
      getUsers: () => dbArg.users || [],
      getStudents: () => dbArg.students || [],
      getCompanies: () => dbArg.companies || [],
      getInstitutes: () => dbArg.institutes || [],
      getOpportunities: () => dbArg.opportunities || [],
      getApplications: () => dbArg.applications || [],
      getInteractions: () => dbArg.rating_interactions || dbArg.ratingInteractions || [],
      getVerifications: () => dbArg.verifications || dbArg.objective_verifications || [],
      addInteraction: (inter) => {
        if (typeof dbArg.addInteraction === 'function') {
          return dbArg.addInteraction(inter);
        }
        if (dbArg.rating_interactions) {
          dbArg.rating_interactions.push(inter);
        } else if (dbArg.ratingInteractions) {
          dbArg.ratingInteractions.push(inter);
        } else {
          dbArg.rating_interactions = [inter];
        }
        return inter;
      },
      updateInteraction: (id, updateData) => {
        const list = dbArg.rating_interactions || dbArg.ratingInteractions || [];
        const idx = list.findIndex(i => i.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updateData, updatedAt: new Date().toISOString() };
          return list[idx];
        }
        return null;
      },
      updateApplicationStatus: (id, status, notes) => {
        const apps = dbArg.applications || [];
        const idx = apps.findIndex(a => a.id === id);
        if (idx >= 0) {
          apps[idx].status = status;
          if (notes) apps[idx].reviewNotes = notes;
          apps[idx].updatedAt = new Date().toISOString();
          return apps[idx];
        }
        return null;
      },
      save: () => {
        if (typeof dbArg.save === 'function') dbArg.save();
      }
    };
  }

  // Live Database
  const localDb = require('./db');
  return {
    isSandbox: false,
    rawDb: null,
    getUsers: () => localDb.getUsers(),
    getStudents: () => localDb.getStudents(),
    getCompanies: () => localDb.getCompanies(),
    getInstitutes: () => {
      const db = localDb.getDb();
      return db.institutes || [];
    },
    getOpportunities: () => localDb.getOpportunities(),
    getApplications: () => localDb.getApplications(),
    getInteractions: () => localDb.getRatingInteractions(),
    getVerifications: () => {
      const db = localDb.getDb();
      return db.verifications || [];
    },
    addInteraction: (inter) => localDb.createRatingInteraction(inter),
    updateInteraction: (id, updateData) => localDb.updateRatingInteraction(id, updateData),
    updateApplicationStatus: (id, status, notes) => localDb.updateApplicationStatus(id, status, notes),
    save: () => {},
  };
}

function normalizeArgs(arg1, arg2) {
  if (arg1 && typeof arg1 === 'object' && (arg1.users || arg1.rating_interactions || arg1.ratingInteractions || arg1.isSandbox)) {
    return { dbCtx: resolveDb(arg1), payload: arg2 || {} };
  }
  if (arg2 && typeof arg2 === 'object') {
    return { dbCtx: resolveDb(arg2), payload: arg1 || {} };
  }
  if (arg1 && arg1.db) {
    return { dbCtx: resolveDb(arg1.db), payload: arg1 };
  }
  return { dbCtx: resolveDb(null), payload: arg1 || {} };
}

// Participant Resolution Helpers
function resolveUserForEntity(entityId, entityType, dbCtx) {
  if (!entityId) return null;
  const users = dbCtx.getUsers();
  const matchedUser = users.find(
    u => u.entityId === entityId || u.id === entityId || (u.email && u.email.includes(entityId.toLowerCase()))
  );
  return matchedUser ? matchedUser.id : entityId;
}

function resolveEntityForUser(userId, dbCtx) {
  if (!userId) return null;
  const users = dbCtx.getUsers();
  const matchedUser = users.find(u => u.id === userId);
  return matchedUser && matchedUser.entityId ? matchedUser.entityId : userId;
}

// ============================================================================
// 2. LIFECYCLE EVENT HANDLERS
// ============================================================================

/**
 * 1. Application Review Lifecycle Handler
 * Triggered when an application status is updated to REVIEWED or SHORTLISTED
 * Creates an APPLICATION_REVIEW interaction granting Industry -> Student rating eligibility
 */
function handleApplicationReview(arg1, arg2) {
  const { dbCtx, payload } = normalizeArgs(arg1, arg2);
  const {
    applicationId,
    id,
    status = 'REVIEWED',
    reviewerUserId,
    recruiterUserId,
    notes,
    reviewNotes,
  } = payload;

  const targetAppId = applicationId || id;
  if (!targetAppId) {
    throw new Error('Application ID is required for application review lifecycle hook');
  }

  const applications = dbCtx.getApplications();
  let application = applications.find(a => a.id === targetAppId);

  // Update application status if needed
  if (application && application.status !== status) {
    const updatedApp = dbCtx.updateApplicationStatus(targetAppId, status, reviewNotes || notes);
    if (updatedApp) application = updatedApp;
  }

  if (!application) {
    // If not found in DB list, use mock placeholder from payload
    application = {
      id: targetAppId,
      studentId: payload.studentId || 'std_001',
      studentName: payload.studentName || 'Student Candidate',
      opportunityId: payload.opportunityId || 'opp_001',
      opportunityTitle: payload.opportunityTitle || 'Software Engineer',
      companyName: payload.companyName || payload.company || 'Tech Employer',
      status,
    };
  }

  // Resolve Student & Company Participants
  const studentId = application.studentId || payload.studentId || 'std_001';
  const studentUserId = payload.studentUserId || resolveUserForEntity(studentId, 'STUDENT', dbCtx) || studentId;

  // Resolve Opportunity & Company
  const opportunities = dbCtx.getOpportunities();
  const opp = opportunities.find(o => o.id === application.opportunityId);
  const companyId = opp ? (opp.companyId || opp.company) : (payload.companyId || 'comp_001');
  const actualRecruiterUserId =
    reviewerUserId ||
    recruiterUserId ||
    payload.initiatorUserId ||
    resolveUserForEntity(companyId, 'INDUSTRY', dbCtx) ||
    'usr_rec_01';

  // Check if interaction already exists for this application reference
  const interactions = dbCtx.getInteractions();
  let existingInteraction = interactions.find(
    i => i.referenceId === targetAppId && (i.interactionType === 'APPLICATION_REVIEW' || i.interactionType === 'APPLICATION')
  );

  let interaction;
  const now = new Date().toISOString();

  if (existingInteraction) {
    interaction = dbCtx.updateInteraction(existingInteraction.id, {
      status,
      initiatorUserId: actualRecruiterUserId,
      targetUserId: studentUserId,
      metadata: {
        ...(existingInteraction.metadata || {}),
        applicationId: targetAppId,
        opportunityId: application.opportunityId,
        opportunityTitle: application.opportunityTitle,
        companyName: application.companyName || application.company,
        studentName: application.studentName,
        reviewNotes: reviewNotes || notes,
        reviewedAt: now,
      },
    }) || existingInteraction;
  } else {
    const interactionId = 'rint_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newInteraction = {
      id: interactionId,
      interactionType: 'APPLICATION_REVIEW',
      referenceId: targetAppId,
      initiatorType: 'INDUSTRY',
      initiatorId: companyId,
      initiatorUserId: actualRecruiterUserId,
      initiatorRole: 'INDUSTRY',
      initiatorEntityId: companyId,
      targetType: 'STUDENT',
      targetId: studentId,
      targetUserId: studentUserId,
      targetRole: 'STUDENT',
      targetEntityId: studentId,
      participantRole: 'STUDENT',
      participantUserId: studentUserId,
      participantEntityId: studentId,
      status: status === 'SHORTLISTED' ? 'SHORTLISTED' : 'REVIEWED',
      isBlind: false,
      deadline: null,
      completedAt: now,
      metadata: {
        applicationId: targetAppId,
        opportunityId: application.opportunityId,
        opportunityTitle: application.opportunityTitle,
        companyName: application.companyName || application.company,
        studentName: application.studentName,
        reviewNotes: reviewNotes || notes,
        stage: status,
        allowedCategories: [
          'APPLICATION_QUALITY',
          'SKILL_RELEVANCE',
          'COMMUNICATION',
          'PROFESSIONALISM',
          'OVERALL_IMPRESSION',
        ],
        reviewedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    interaction = dbCtx.addInteraction(newInteraction) || newInteraction;
  }

  // Ensure returned interaction object has all identity aliases
  if (interaction) {
    interaction.targetUserId = interaction.targetUserId || interaction.participantUserId || studentUserId;
    interaction.targetId = interaction.targetId || interaction.participantEntityId || studentId;
    interaction.initiatorUserId = interaction.initiatorUserId || actualRecruiterUserId;
    interaction.initiatorId = interaction.initiatorId || interaction.initiatorEntityId || companyId;
  }

  // Publish platform event
  const eventName = status === 'SHORTLISTED' ? PLATFORM_EVENTS.APPLICATION_SHORTLISTED : PLATFORM_EVENTS.APPLICATION_REVIEWED;
  emitPlatformEvent(eventName, {
    applicationId: targetAppId,
    status,
    application,
    interaction,
    reviewerUserId: actualRecruiterUserId,
    studentId,
  });

  return {
    success: true,
    application,
    interaction,
  };
}

/**
 * 2. Interview Completion Lifecycle Handler
 * Triggered when an interview is completed
 * Creates an INTERVIEW_FEEDBACK interaction with 2-way rating eligibility
 */
function handleInterviewCompletion(arg1, arg2) {
  const { dbCtx, payload } = normalizeArgs(arg1, arg2);
  const {
    referenceId,
    applicationId,
    companyId = 'comp_001',
    studentId = 'std_001',
    interviewerUserId,
    recruiterUserId,
    studentUserId,
    interviewDate,
    interviewType = 'Technical Interview',
    round = 1,
    notes = '',
  } = payload;

  const targetRefId = referenceId || applicationId || ('intv_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));
  const actualRecruiterUserId =
    interviewerUserId ||
    recruiterUserId ||
    resolveUserForEntity(companyId, 'INDUSTRY', dbCtx) ||
    'usr_rec_01';
  const actualStudentUserId =
    studentUserId ||
    resolveUserForEntity(studentId, 'STUDENT', dbCtx) ||
    'usr_001';

  // If tied to an application, update application status
  if (applicationId) {
    dbCtx.updateApplicationStatus(applicationId, 'INTERVIEW_COMPLETED', notes);
  }

  const interactions = dbCtx.getInteractions();
  let existingInteraction = interactions.find(
    i => i.referenceId === targetRefId && (i.interactionType === 'INTERVIEW_FEEDBACK' || i.interactionType === 'INTERVIEW')
  );

  let interaction;
  const now = new Date().toISOString();

  if (existingInteraction) {
    interaction = dbCtx.updateInteraction(existingInteraction.id, {
      status: 'INTERVIEW_COMPLETED',
      completedAt: now,
      metadata: {
        ...(existingInteraction.metadata || {}),
        interviewDate: interviewDate || now,
        interviewType,
        round,
        notes,
        completedAt: now,
      },
    }) || existingInteraction;
  } else {
    const interactionId = 'rint_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newInteraction = {
      id: interactionId,
      interactionType: 'INTERVIEW_FEEDBACK',
      referenceId: targetRefId,
      initiatorType: 'INDUSTRY',
      initiatorId: companyId,
      initiatorUserId: actualRecruiterUserId,
      initiatorRole: 'INDUSTRY',
      initiatorEntityId: companyId,
      targetType: 'STUDENT',
      targetId: studentId,
      targetUserId: actualStudentUserId,
      targetRole: 'STUDENT',
      targetEntityId: studentId,
      participantRole: 'STUDENT',
      participantUserId: actualStudentUserId,
      participantEntityId: studentId,
      status: 'INTERVIEW_COMPLETED',
      isBlind: false,
      deadline: null,
      completedAt: now,
      metadata: {
        referenceId: targetRefId,
        applicationId,
        companyId,
        studentId,
        interviewDate: interviewDate || now,
        interviewType,
        round,
        notes,
        twoWayEligible: true,
        allowedCategories: [
          'TECHNICAL_DEPTH',
          'PROBLEM_SOLVING',
          'COMMUNICATION',
          'PUNCTUALITY',
          'CULTURE_FIT',
        ],
        completedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    interaction = dbCtx.addInteraction(newInteraction) || newInteraction;
  }

  emitPlatformEvent(PLATFORM_EVENTS.INTERVIEW_COMPLETED, {
    referenceId: targetRefId,
    applicationId,
    interaction,
    companyId,
    studentId,
    interviewerUserId: actualRecruiterUserId,
  });

  return {
    success: true,
    interaction,
  };
}

/**
 * 3. Assessment / Task Completion Lifecycle Handler
 * Triggered when a student completes a skill assessment or technical task (status -> EVALUATED)
 * Links objective verification score (0-100) and triggers aggregate score synchronization
 */
function handleAssessmentEvaluation(arg1, arg2) {
  const { dbCtx, payload } = normalizeArgs(arg1, arg2);
  const {
    attemptId,
    attempt,
    verification,
    studentId = 'std_001',
    studentUserId,
    skillId = 'skill_general',
    skillName = 'General Competence',
    overallScore = 85,
    proficiencyLevel = 'Intermediate',
    breakdown = {},
  } = payload;

  const targetRefId = attemptId || (verification && verification.id) || ('task_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));
  const actualStudentUserId =
    studentUserId ||
    (attempt && attempt.userId) ||
    resolveUserForEntity(studentId, 'STUDENT', dbCtx) ||
    'usr_001';

  const actualEvaluatorUserId =
    payload.evaluatorUserId ||
    payload.reviewerUserId ||
    payload.instructorUserId ||
    actualStudentUserId;
  const actualEvaluatorId =
    payload.evaluatorId ||
    payload.companyId ||
    payload.instituteId ||
    studentId;
  const actualEvaluatorType =
    payload.evaluatorType ||
    (payload.evaluatorUserId || payload.reviewerUserId ? 'INDUSTRY' : 'STUDENT');

  const finalScore = verification && verification.overallScore !== undefined ? verification.overallScore : overallScore;
  const finalLevel = verification && verification.level ? verification.level : proficiencyLevel;
  const finalBreakdown = verification && verification.breakdown ? verification.breakdown : breakdown;

  const interactions = dbCtx.getInteractions();
  let existingInteraction = interactions.find(
    i => i.referenceId === targetRefId && (i.interactionType === 'TASK_EVALUATION' || i.interactionType === 'TASK_ASSESSMENT')
  );

  let interaction;
  const now = new Date().toISOString();

  if (existingInteraction) {
    interaction = dbCtx.updateInteraction(existingInteraction.id, {
      status: 'EVALUATED',
      completedAt: now,
      metadata: {
        ...(existingInteraction.metadata || {}),
        attemptId: targetRefId,
        skillId,
        skillName,
        overallScore: finalScore,
        proficiencyLevel: finalLevel,
        breakdown: finalBreakdown,
        verificationId: verification ? verification.id : null,
      },
    }) || existingInteraction;
  } else {
    const interactionId = 'rint_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newInteraction = {
      id: interactionId,
      interactionType: 'TASK_EVALUATION',
      referenceId: targetRefId,
      initiatorType: actualEvaluatorType,
      initiatorId: actualEvaluatorId,
      initiatorUserId: actualEvaluatorUserId,
      initiatorRole: actualEvaluatorType,
      initiatorEntityId: actualEvaluatorId,
      targetType: 'STUDENT',
      targetId: studentId,
      targetUserId: actualStudentUserId,
      targetRole: 'STUDENT',
      targetEntityId: studentId,
      participantRole: 'STUDENT',
      participantUserId: actualStudentUserId,
      participantEntityId: studentId,
      status: 'EVALUATED',
      isBlind: false,
      deadline: null,
      completedAt: now,
      metadata: {
        attemptId: targetRefId,
        skillId,
        skillName,
        overallScore: finalScore,
        proficiencyLevel: finalLevel,
        verificationId: verification ? verification.id : null,
        breakdown: finalBreakdown,
        allowedCategories: [
          'CODE_QUALITY',
          'ARCHITECTURE',
          'SPEED_DELIVERY',
          'DOCUMENTATION',
          'ACCURACY',
        ],
        completedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    interaction = dbCtx.addInteraction(newInteraction) || newInteraction;
  }

  // Ensure objective verification is linked in sandbox DB if applicable
  if (dbCtx.isSandbox && dbCtx.rawDb) {
    dbCtx.rawDb.objective_verifications = dbCtx.rawDb.objective_verifications || [];
    const exists = dbCtx.rawDb.objective_verifications.some(
      v => (v.entityId === studentId || v.entityId === actualStudentUserId) && (v.skillId === skillId || v.skillName === skillName)
    );
    if (!exists) {
      if (typeof dbCtx.rawDb.addObjectiveSkillScore === 'function') {
        dbCtx.rawDb.addObjectiveSkillScore(studentId, skillName, finalScore);
        if (actualStudentUserId !== studentId) {
          dbCtx.rawDb.addObjectiveSkillScore(actualStudentUserId, skillName, finalScore);
        }
      } else {
        dbCtx.rawDb.objective_verifications.push({
          id: `ver_${crypto.randomBytes(4).toString('hex')}`,
          entityId: studentId,
          skillId,
          skillName,
          score: finalScore,
          verifiedAt: now,
        });
        if (actualStudentUserId !== studentId) {
          dbCtx.rawDb.objective_verifications.push({
            id: `ver_${crypto.randomBytes(4).toString('hex')}`,
            entityId: actualStudentUserId,
            skillId,
            skillName,
            score: finalScore,
            verifiedAt: now,
          });
        }
      }
    }
  }

  if (interaction) {
    interaction.targetUserId = interaction.targetUserId || interaction.participantUserId || actualStudentUserId;
    interaction.targetId = interaction.targetId || interaction.participantEntityId || studentId;
    interaction.initiatorUserId = interaction.initiatorUserId || actualStudentUserId;
    interaction.initiatorId = interaction.initiatorId || interaction.initiatorEntityId || studentId;
  }

  // Recalculate Student Rating Aggregate to update objectiveSkillScore cache
  let updatedAggregate = null;
  try {
    const ratingEngine = require('./rating-engine');
    if (typeof ratingEngine.recalculateProfileRatings === 'function') {
      updatedAggregate = ratingEngine.recalculateProfileRatings(dbCtx.rawDb || dbCtx, 'STUDENT', studentId);
      if (actualStudentUserId !== studentId) {
        ratingEngine.recalculateProfileRatings(dbCtx.rawDb || dbCtx, 'STUDENT', actualStudentUserId);
      }
    }
  } catch (e) {
    // If rating-engine is still initializing or in test mode
  }

  emitPlatformEvent(PLATFORM_EVENTS.ASSESSMENT_EVALUATED, {
    attemptId: targetRefId,
    studentId,
    studentUserId: actualStudentUserId,
    skillId,
    skillName,
    overallScore: finalScore,
    proficiencyLevel: finalLevel,
    verification,
    interaction,
    aggregate: updatedAggregate,
  });

  return {
    success: true,
    interaction,
    verification: verification || null,
    aggregate: updatedAggregate,
  };
}

/**
 * 4. Internship / Job Completion Lifecycle Handler
 * Triggered when an internship or job concludes (status -> INTERNSHIP_COMPLETED)
 * Creates a 2-way BLIND rating interaction (isBlind: true, 14-day deadline)
 */
function handleInternshipCompletion(arg1, arg2) {
  const { dbCtx, payload } = normalizeArgs(arg1, arg2);
  const {
    internshipId,
    referenceId,
    companyId = 'comp_001',
    studentId = 'std_001',
    recruiterUserId,
    employerUserId,
    studentUserId,
    title = 'Software Engineering Internship',
    role = 'Intern',
    startDate,
    endDate,
    notes = '',
    ratingWindowDays = 14,
  } = payload;

  const targetRefId = internshipId || referenceId || ('intern_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));
  const actualRecruiterUserId =
    recruiterUserId ||
    employerUserId ||
    resolveUserForEntity(companyId, 'INDUSTRY', dbCtx) ||
    'usr_rec_01';
  const actualStudentUserId =
    studentUserId ||
    resolveUserForEntity(studentId, 'STUDENT', dbCtx) ||
    'usr_001';

  const now = new Date();
  const deadline = new Date(now.getTime() + ratingWindowDays * 24 * 60 * 60 * 1000).toISOString();

  const interactions = dbCtx.getInteractions();
  let existingInteraction = interactions.find(
    i => i.referenceId === targetRefId && (i.interactionType === 'INTERNSHIP_PERFORMANCE' || i.interactionType === 'INTERNSHIP')
  );

  let interaction;
  if (existingInteraction) {
    interaction = dbCtx.updateInteraction(existingInteraction.id, {
      status: 'INTERNSHIP_COMPLETED',
      isBlind: true,
      deadline,
      completedAt: now.toISOString(),
      metadata: {
        ...(existingInteraction.metadata || {}),
        internshipId: targetRefId,
        title,
        role,
        companyId,
        studentId,
        startDate,
        endDate,
        notes,
        isBlind: true,
        ratingWindowDays,
        completedAt: now.toISOString(),
      },
    }) || existingInteraction;
  } else {
    const interactionId = 'rint_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newInteraction = {
      id: interactionId,
      interactionType: 'INTERNSHIP_PERFORMANCE',
      referenceId: targetRefId,
      initiatorType: 'INDUSTRY',
      initiatorId: companyId,
      initiatorUserId: actualRecruiterUserId,
      initiatorRole: 'INDUSTRY',
      initiatorEntityId: companyId,
      targetType: 'STUDENT',
      targetId: studentId,
      targetUserId: actualStudentUserId,
      targetRole: 'STUDENT',
      targetEntityId: studentId,
      participantRole: 'STUDENT',
      participantUserId: actualStudentUserId,
      participantEntityId: studentId,
      status: 'INTERNSHIP_COMPLETED',
      isBlind: true,
      deadline,
      completedAt: now.toISOString(),
      metadata: {
        internshipId: targetRefId,
        title,
        role,
        companyId,
        studentId,
        startDate,
        endDate,
        notes,
        isBlind: true,
        ratingWindowDays,
        allowedCategoriesStudent: [
          'WORK_ETHIC',
          'TECHNICAL_EXECUTION',
          'TEAMWORK',
          'LEARNING_AGILITY',
          'INITIATIVE',
        ],
        allowedCategoriesIndustry: [
          'MENTORSHIP_QUALITY',
          'WORK_ENVIRONMENT',
          'LEARNING_OPPORTUNITIES',
          'PROJECT_RELEVANCE',
          'COMPENSATION_FAIRNESS',
        ],
        completedAt: now.toISOString(),
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    interaction = dbCtx.addInteraction(newInteraction) || newInteraction;
  }

  emitPlatformEvent(PLATFORM_EVENTS.INTERNSHIP_COMPLETED, {
    internshipId: targetRefId,
    companyId,
    studentId,
    interaction,
    recruiterUserId: actualRecruiterUserId,
    studentUserId: actualStudentUserId,
    deadline,
  });

  return {
    success: true,
    interaction,
    deadline,
  };
}

/**
 * 5. Course / Seminar / Training Program Completion Lifecycle Handler
 * Triggered when a student completes a course or training program (status -> COURSE_COMPLETED)
 * Creates a COURSE_EVALUATION interaction between Institute and Student
 */
function handleCourseCompletion(arg1, arg2) {
  const { dbCtx, payload } = normalizeArgs(arg1, arg2);
  const {
    trainingProgramId,
    courseId,
    referenceId,
    instituteId = 'inst_001',
    studentId = 'std_001',
    instituteUserId,
    studentUserId,
    courseName,
    programTitle,
    completionDate,
    grade = 'A',
    certificateId,
    notes = '',
  } = payload;

  const targetRefId = trainingProgramId || courseId || referenceId || ('course_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));
  const actualInstituteUserId =
    instituteUserId ||
    resolveUserForEntity(instituteId, 'INSTITUTE', dbCtx) ||
    'usr_fac_01';
  const actualStudentUserId =
    studentUserId ||
    resolveUserForEntity(studentId, 'STUDENT', dbCtx) ||
    'usr_001';

  const name = courseName || programTitle || 'Advanced Professional Program';
  const now = new Date().toISOString();

  const interactions = dbCtx.getInteractions();
  let existingInteraction = interactions.find(
    i => i.referenceId === targetRefId && (i.interactionType === 'COURSE_EVALUATION' || i.interactionType === 'COURSE')
  );

  let interaction;
  if (existingInteraction) {
    interaction = dbCtx.updateInteraction(existingInteraction.id, {
      status: 'COURSE_COMPLETED',
      completedAt: now,
      metadata: {
        ...(existingInteraction.metadata || {}),
        trainingProgramId: targetRefId,
        courseName: name,
        programTitle: name,
        instituteId,
        studentId,
        completionDate: completionDate || now,
        grade,
        certificateId: certificateId || ('CERT-' + Date.now()),
        notes,
        completedAt: now,
      },
    }) || existingInteraction;
  } else {
    const interactionId = 'rint_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newInteraction = {
      id: interactionId,
      interactionType: 'COURSE_EVALUATION',
      referenceId: targetRefId,
      initiatorType: 'INSTITUTE',
      initiatorId: instituteId,
      initiatorUserId: actualInstituteUserId,
      initiatorRole: 'INSTITUTE',
      initiatorEntityId: instituteId,
      targetType: 'STUDENT',
      targetId: studentId,
      targetUserId: actualStudentUserId,
      targetRole: 'STUDENT',
      targetEntityId: studentId,
      participantRole: 'STUDENT',
      participantUserId: actualStudentUserId,
      participantEntityId: studentId,
      status: 'COURSE_COMPLETED',
      isBlind: false,
      deadline: null,
      completedAt: now,
      metadata: {
        trainingProgramId: targetRefId,
        courseName: name,
        programTitle: name,
        instituteId,
        studentId,
        completionDate: completionDate || now,
        grade,
        certificateId: certificateId || ('CERT-' + Date.now()),
        notes,
        allowedCategories: [
          'CURRICULUM_DEPTH',
          'INSTRUCTOR_QUALITY',
          'PRACTICAL_APPLICATION',
          'RESOURCE_AVAILABILITY',
          'CAREER_IMPACT',
        ],
        completedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    interaction = dbCtx.addInteraction(newInteraction) || newInteraction;
  }

  emitPlatformEvent(PLATFORM_EVENTS.COURSE_COMPLETED, {
    courseId: targetRefId,
    instituteId,
    studentId,
    interaction,
    instituteUserId: actualInstituteUserId,
    studentUserId: actualStudentUserId,
  });

  return {
    success: true,
    interaction,
  };
}

/**
 * Generic Lifecycle Event Trigger
 * Dispatches to the appropriate lifecycle hook based on event type
 */
function triggerLifecycleEvent(eventName, payload, db) {
  const norm = normalizeArgs(payload, db);
  switch (eventName) {
    case PLATFORM_EVENTS.APPLICATION_REVIEWED:
    case PLATFORM_EVENTS.APPLICATION_SHORTLISTED:
    case 'APPLICATION_REVIEW':
      return handleApplicationReview(norm.dbCtx.rawDb || norm.dbCtx, norm.payload);

    case PLATFORM_EVENTS.INTERVIEW_COMPLETED:
    case 'INTERVIEW_COMPLETED':
      return handleInterviewCompletion(norm.dbCtx.rawDb || norm.dbCtx, norm.payload);

    case PLATFORM_EVENTS.ASSESSMENT_EVALUATED:
    case 'ASSESSMENT_EVALUATED':
      return handleAssessmentEvaluation(norm.dbCtx.rawDb || norm.dbCtx, norm.payload);

    case PLATFORM_EVENTS.INTERNSHIP_COMPLETED:
    case 'INTERNSHIP_COMPLETED':
      return handleInternshipCompletion(norm.dbCtx.rawDb || norm.dbCtx, norm.payload);

    case PLATFORM_EVENTS.COURSE_COMPLETED:
    case 'COURSE_COMPLETED':
      return handleCourseCompletion(norm.dbCtx.rawDb || norm.dbCtx, norm.payload);

    default:
      return { success: false, error: `Unknown lifecycle event '${eventName}'` };
  }
}

module.exports = {
  handleApplicationReview,
  onApplicationReview: handleApplicationReview,
  onApplicationStatusChange: handleApplicationReview,
  handleInterviewCompletion,
  onInterviewCompletion: handleInterviewCompletion,
  completeInterview: handleInterviewCompletion,
  handleAssessmentEvaluation,
  onAssessmentEvaluation: handleAssessmentEvaluation,
  onAssessmentEvaluated: handleAssessmentEvaluation,
  handleInternshipCompletion,
  onInternshipCompletion: handleInternshipCompletion,
  completeInternship: handleInternshipCompletion,
  handleCourseCompletion,
  onCourseCompletion: handleCourseCompletion,
  completeCourse: handleCourseCompletion,
  triggerLifecycleEvent,
  resolveUserForEntity,
  resolveEntityForUser,
};
