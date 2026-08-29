# Milestone 1 Technical Specification & Implementation Plan: Local JSON DB Fallback & Mock Query Builder

**Milestone**: M1 (Database Schema, Local Persistence & Mock Query Builder)  
**Agent**: M1 Explorer 2 (`m1_explorer_2`)  
**Target Files**:
- `lib/db.js` (Storage arrays, seed categories, CRUD helpers, aggregate recalculation engine)
- `db/index.js` (Mock Drizzle ORM query builder extensions for 10 rating tables)
- `db/schema.js` & `db/relations.js` (Backwards compatibility aliases and exports)
- `data/db.json` & `data/seed.json` (Seed arrays and schema synchronization)

---

## 1. Executive Summary

The Skill Bridge platform operates on a dual-persistence hybrid architecture:
1. **Neon PostgreSQL with Drizzle ORM** for production relational storage and schema migrations.
2. **Atomic JSON Database Layer (`lib/db.js`) & Mock Drizzle Query Builder (`db/index.js`)** for zero-dependency local development, in-memory test suites, and serverless fallback.

To support **Requirement R1 (Verified Reputation, Rating, Feedback, Trust, and Review System)** without introducing external DB dependencies or breaking existing test suites, this specification details the exact implementation requirements for:
1. **Storage Array Initializations**: Initializing 10 rating data tables in `lib/db.js` and seeding standardized rating categories across 4 core platform interaction contexts.
2. **Comprehensive CRUD Helpers**: 28+ deterministic helper functions covering interactions, ratings, categories, responses, reports, appeals, policies, audit logs, and live aggregate recalculations.
3. **Mock Drizzle Query Builder Extension**: Extending `createMockDrizzleDb()` in `db/index.js` to support all 10 rating tables in `select()`, `insert()`, `update()`, `delete()`, and `db.query.*` interfaces.
4. **Entity Aliasing & Backwards Compatibility**: Mapping `organization_profile` <-> `industry_profile` / `industryProfiles` and preserving legacy entity lookups (`companies`, `students`, `institutes`).

---

## 2. Storage Array Initializations & Default Seed Categories

### 2.1 The 10 Rating Storage Arrays

`lib/db.js` manages local state via in-memory `cachedDb` synced to `data/db.json`. The following 10 arrays must be initialized in `ensureDbExists()`, `getDb()`, and `resetDb()`:

| # | Storage Array Key | Table Equivalent | Primary Key Prefix | Purpose |
|---|---|---|---|---|
| 1 | `ratingInteractions` | `rating_interactions` | `rint_` | Verified platform lifecycle events (Application, Interview, Internship, Course) |
| 2 | `ratings` | `ratings` | `rat_` | Review submissions with overall scores, recommendation, pros/cons, review text |
| 3 | `ratingCategories` | `rating_categories` | `rcat_` | Standardized 1–5 scoring category definitions per context and role |
| 4 | `ratingCategoryScores` | `rating_category_scores` | `rcscore_` | Granular 1–5 category score breakdowns tied to a rating |
| 5 | `ratingResponses` | `rating_responses` | `rresp_` | 1:1 public responses from rated target entities |
| 6 | `ratingReports` | `rating_reports` | `rrep_` | User reports flagging reviews for moderation |
| 7 | `ratingAppeals` | `rating_appeals` | `rapp_` | Contestation appeals against moderation decisions |
| 8 | `ratingAggregates` | `rating_aggregates` | `ragg_` | Pre-computed cached scores, distribution histogram, recommendation rate |
| 9 | `ratingPolicies` | `rating_policies` | `rpol_` | Configurable rating windows, blind timeouts, and trust badge thresholds |
| 10 | `ratingAuditLogs` | `rating_audit_logs` | `rlog_` | Append-only forensic audit trail for all rating lifecycle actions |

---

### 2.2 Default Seed Categories (`DEFAULT_RATING_CATEGORIES`)

All 20 standard rating categories across the 4 core platform interaction contexts:

```javascript
const DEFAULT_RATING_CATEGORIES = [
  // -------------------------------------------------------------------------
  // Context 1: APPLICATION_REVIEW (Reviewer: INDUSTRY -> Target: STUDENT)
  // -------------------------------------------------------------------------
  {
    id: 'rcat_app_qual',
    code: 'APPLICATION_QUALITY',
    name: 'Application Quality & Presentation',
    description: 'Completeness, clarity of resume/portfolio, formatting, and overall presentation.',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_app_skill_rel',
    code: 'SKILL_RELEVANCE',
    name: 'Skill & Project Relevance',
    description: 'Alignment of candidate listed skills and demonstrated projects with the opportunity requirements.',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_app_comm',
    code: 'COMMUNICATION',
    name: 'Written Communication',
    description: 'Clarity, conciseness, and articulation in application text and cover notes.',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'rcat_app_prof',
    code: 'PROFESSIONALISM',
    name: 'Professionalism & Integrity',
    description: 'Honesty of claims, accuracy of records, and professional demeanor.',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_app_overall',
    code: 'OVERALL_IMPRESSION',
    name: 'Overall Impression & Potential',
    description: 'Holistic assessment of candidate profile strength and growth potential.',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 5,
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // Context 2: INTERVIEW_FEEDBACK (Reviewer: INDUSTRY -> Target: STUDENT)
  // -------------------------------------------------------------------------
  {
    id: 'rcat_intv_tech',
    code: 'TECH_COMPETENCE',
    name: 'Technical Competence & Problem Solving',
    description: 'Analytical depth, algorithmic ability, system knowledge, and live problem-solving capability.',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_intv_comm',
    code: 'COMMUNICATION_ARTICULATION',
    name: 'Articulation & Thought Process',
    description: 'Ability to explain reasoning, answer questions clearly, and listen actively.',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_intv_dom',
    code: 'DOMAIN_KNOWLEDGE',
    name: 'Domain & Core Fundamentals',
    description: 'Understanding of foundational CS/engineering concepts and practical toolsets.',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'rcat_intv_cult',
    code: 'CULTURAL_FIT',
    name: 'Adaptability & Collaboration',
    description: 'Coachability, openness to feedback, team orientation, and culture alignment.',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_intv_punc',
    code: 'PUNCTUALITY',
    name: 'Punctuality & Readiness',
    description: 'Punctuality, interview preparation, setup reliability, and professional conduct.',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '0.50',
    displayOrder: 5,
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // Context 3A: INTERNSHIP_PERFORMANCE (Reviewer: INDUSTRY -> Target: STUDENT)
  // -------------------------------------------------------------------------
  {
    id: 'rcat_intern_stu_ethic',
    code: 'WORK_ETHIC',
    name: 'Work Ethic & Initiative',
    description: 'Proactiveness, diligence, ownership, and self-directed task management.',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_intern_stu_tech',
    code: 'TECHNICAL_EXECUTION',
    name: 'Technical Execution & Deliverable Quality',
    description: 'Code quality, test coverage, debugging skill, and deliverable reliability.',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_intern_stu_prob',
    code: 'PROBLEM_SOLVING',
    name: 'Problem Solving & Autonomy',
    description: 'Overcoming technical roadblocks, independent inquiry, and analytical vigor.',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'rcat_intern_stu_team',
    code: 'TEAMWORK',
    name: 'Teamwork & Collaboration',
    description: 'Effective participation in standups, code reviews, and peer cooperation.',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_intern_stu_time',
    code: 'TIMELINESS',
    name: 'Timeliness & Dependability',
    description: 'Adherence to milestone deadlines and reliability in task completion.',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 5,
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // Context 3B: INTERNSHIP_PERFORMANCE (Reviewer: STUDENT -> Target: INDUSTRY)
  // -------------------------------------------------------------------------
  {
    id: 'rcat_intern_ind_mentor',
    code: 'MENTORSHIP_QUALITY',
    name: 'Mentorship & Guidance',
    description: 'Accessibility of mentors, quality of constructive guidance, and learning growth support.',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_intern_ind_env',
    code: 'WORK_ENVIRONMENT',
    name: 'Work Environment & Culture',
    description: 'Psychological safety, inclusivity, respectful treatment, and positive organizational culture.',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_intern_ind_proj',
    code: 'PROJECT_MEANINGFULNESS',
    name: 'Project Impact & Learning Value',
    description: 'Hands-on production tasks vs trivial busywork, real-world experience gained.',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'rcat_intern_ind_stipend',
    code: 'STIPEND_RESOURCES',
    name: 'Fair Compensation & Tool Access',
    description: 'On-time stipend disbursement and provision of compute, licenses, and necessary hardware/software.',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_intern_ind_growth',
    code: 'CAREER_GROWTH',
    name: 'Career Support & Conversion Clarity',
    description: 'Pre-Placement Offer (PPO) transparency, network building, and professional reference support.',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 5,
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // Context 4: COURSE_EVALUATION (Reviewer: STUDENT / INDUSTRY -> Target: INSTITUTE)
  // -------------------------------------------------------------------------
  {
    id: 'rcat_course_content',
    code: 'COURSE_CONTENT',
    name: 'Curriculum Rigor & Industry Relevance',
    description: 'Modernity of syllabus, technical depth, and alignment with industry standards.',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_course_pedagogy',
    code: 'PEDAGOGY',
    name: 'Instruction Quality & Practical Labs',
    description: 'Clarity of instructors, interactive problem sets, and hands-on laboratory experiences.',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_course_infra',
    code: 'INFRASTRUCTURE',
    name: 'Lab & Compute Infrastructure',
    description: 'Reliability of lab workstations, cloud compute availability, and software tooling.',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'rcat_course_org',
    code: 'ORGANIZATION',
    name: 'Organization & Course Administration',
    description: 'Schedule adherence, clear evaluation rubrics, and timely material delivery.',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_course_value',
    code: 'OVERALL_VALUE',
    name: 'Overall Skill Elevation Value',
    description: 'Tangible skill improvement, career readiness boost, and overall student satisfaction.',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 5,
    isActive: true,
  },
];
```

---

### 2.3 Default Seed Policies (`DEFAULT_RATING_POLICIES`)

```javascript
const DEFAULT_RATING_POLICIES = [
  {
    id: 'rpol_app_review',
    contextType: 'APPLICATION_REVIEW',
    ratingWindowDays: 30,
    isBlindReview: false,
    blindHoldTimeoutDays: 0,
    minRatingsForPublicAggregate: 1,
    allowTargetResponse: true,
    allowAppeals: true,
    badgeThresholds: { TOP_RATED: 4.5, VERIFIED_EXCELLENCE: 4.8 },
    isActive: true,
  },
  {
    id: 'rpol_intv_feedback',
    contextType: 'INTERVIEW_FEEDBACK',
    ratingWindowDays: 30,
    isBlindReview: false,
    blindHoldTimeoutDays: 0,
    minRatingsForPublicAggregate: 1,
    allowTargetResponse: true,
    allowAppeals: true,
    badgeThresholds: { TOP_RATED: 4.5, VERIFIED_EXCELLENCE: 4.8 },
    isActive: true,
  },
  {
    id: 'rpol_intern_perf',
    contextType: 'INTERNSHIP_PERFORMANCE',
    ratingWindowDays: 45,
    isBlindReview: true,
    blindHoldTimeoutDays: 14,
    minRatingsForPublicAggregate: 1,
    allowTargetResponse: true,
    allowAppeals: true,
    badgeThresholds: { TOP_RATED: 4.5, VERIFIED_EXCELLENCE: 4.8 },
    isActive: true,
  },
  {
    id: 'rpol_course_eval',
    contextType: 'COURSE_EVALUATION',
    ratingWindowDays: 60,
    isBlindReview: false,
    blindHoldTimeoutDays: 0,
    minRatingsForPublicAggregate: 1,
    allowTargetResponse: true,
    allowAppeals: true,
    badgeThresholds: { TOP_RATED: 4.5, VERIFIED_EXCELLENCE: 4.8 },
    isActive: true,
  },
];
```

---

### 2.4 Lazy Initialization & Fallback in `getDb()`

To guarantee that database snapshots loaded from `data/db.json` or `data/seed.json` always have all 10 rating arrays initialized without error:

```javascript
function getDb() {
  if (cachedDb) return cachedDb;
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    cachedDb = JSON.parse(raw);
  } catch (err) {
    if (fs.existsSync(SEED_PATH)) {
      const seedRaw = fs.readFileSync(SEED_PATH, 'utf-8');
      fs.writeFileSync(DB_PATH, seedRaw, 'utf-8');
      cachedDb = JSON.parse(seedRaw);
    } else {
      cachedDb = {};
    }
  }

  // Ensure baseline entity arrays
  cachedDb.users = cachedDb.users || [];
  cachedDb.students = cachedDb.students || [];
  cachedDb.studentProfiles = cachedDb.studentProfiles || [];
  cachedDb.companies = cachedDb.companies || [];
  cachedDb.organizationProfiles = cachedDb.organizationProfiles || [];
  cachedDb.institutes = cachedDb.institutes || [];
  cachedDb.instituteProfiles = cachedDb.instituteProfiles || [];
  cachedDb.adminProfiles = cachedDb.adminProfiles || [];
  cachedDb.opportunities = cachedDb.opportunities || [];
  cachedDb.applications = cachedDb.applications || [];
  cachedDb.skills = cachedDb.skills || [];
  cachedDb.departments = cachedDb.departments || [];
  cachedDb.alerts = cachedDb.alerts || [];
  cachedDb.trainingPrograms = cachedDb.trainingPrograms || [];
  cachedDb.feedbackReports = cachedDb.feedbackReports || [];
  cachedDb.auditLogs = cachedDb.auditLogs || [];
  cachedDb.signupIntents = cachedDb.signupIntents || [];
  cachedDb.sessions = cachedDb.sessions || [];
  cachedDb.accounts = cachedDb.accounts || [];
  cachedDb.verifications = cachedDb.verifications || [];

  // Ensure 10 rating tables
  cachedDb.ratingInteractions = cachedDb.ratingInteractions || [];
  cachedDb.ratings = cachedDb.ratings || [];
  cachedDb.ratingCategories = (cachedDb.ratingCategories && cachedDb.ratingCategories.length > 0)
    ? cachedDb.ratingCategories
    : JSON.parse(JSON.stringify(DEFAULT_RATING_CATEGORIES));
  cachedDb.ratingCategoryScores = cachedDb.ratingCategoryScores || [];
  cachedDb.ratingResponses = cachedDb.ratingResponses || [];
  cachedDb.ratingReports = cachedDb.ratingReports || [];
  cachedDb.ratingAppeals = cachedDb.ratingAppeals || [];
  cachedDb.ratingAggregates = cachedDb.ratingAggregates || [];
  cachedDb.ratingPolicies = (cachedDb.ratingPolicies && cachedDb.ratingPolicies.length > 0)
    ? cachedDb.ratingPolicies
    : JSON.parse(JSON.stringify(DEFAULT_RATING_POLICIES));
  cachedDb.ratingAuditLogs = cachedDb.ratingAuditLogs || [];

  return cachedDb;
}
```

---

## 3. CRUD Helper Methods in `lib/db.js`

### 3.1 Interaction Helpers (`ratingInteractions`)

```javascript
/**
 * Retrieves all rating interactions matching optional filter
 */
function getRatingInteractions(filter = {}) {
  const db = getDb();
  let items = db.ratingInteractions || [];

  if (filter.referenceId) items = items.filter(i => i.referenceId === filter.referenceId);
  if (filter.interactionType) items = items.filter(i => i.interactionType === filter.interactionType);
  if (filter.initiatorUserId) items = items.filter(i => i.initiatorUserId === filter.initiatorUserId);
  if (filter.initiatorId) items = items.filter(i => i.initiatorId === filter.initiatorId);
  if (filter.initiatorType) items = items.filter(i => i.initiatorType === filter.initiatorType);
  if (filter.targetUserId) items = items.filter(i => i.targetUserId === filter.targetUserId);
  if (filter.targetId) items = items.filter(i => i.targetId === filter.targetId);
  if (filter.targetType) items = items.filter(i => i.targetType === filter.targetType);
  if (filter.status) items = items.filter(i => i.status === filter.status);
  if (filter.isBlind !== undefined) items = items.filter(i => i.isBlind === Boolean(filter.isBlind));

  return items;
}

function getRatingInteractionById(id) {
  if (!id) return null;
  const interactions = getRatingInteractions();
  return interactions.find(i => i.id === id) || null;
}

function findInteractionByReference(referenceId, interactionType) {
  if (!referenceId) return null;
  const interactions = getRatingInteractions();
  return interactions.find(i => 
    i.referenceId === referenceId && 
    (!interactionType || i.interactionType === interactionType)
  ) || null;
}

function createRatingInteraction(interactionData) {
  const db = getDb();
  db.ratingInteractions = db.ratingInteractions || [];

  const now = new Date().toISOString();
  const newInteraction = {
    id: interactionData.id || `rint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    interactionType: interactionData.interactionType,
    referenceId: interactionData.referenceId,
    initiatorType: interactionData.initiatorType,
    initiatorId: interactionData.initiatorId,
    initiatorUserId: interactionData.initiatorUserId || null,
    targetType: interactionData.targetType,
    targetId: interactionData.targetId,
    targetUserId: interactionData.targetUserId || null,
    status: interactionData.status || 'PENDING_REVIEW',
    isBlind: Boolean(interactionData.isBlind),
    deadline: interactionData.deadline || null,
    completedAt: interactionData.completedAt || null,
    metadata: interactionData.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  db.ratingInteractions.push(newInteraction);
  saveDb(db);

  logRatingAuditEvent({
    action: 'INTERACTION_CREATED',
    interactionId: newInteraction.id,
    actorUserId: interactionData.initiatorUserId,
    actorRole: interactionData.initiatorType,
    newState: newInteraction,
  });

  return newInteraction;
}

function updateRatingInteraction(id, updateData) {
  const db = getDb();
  db.ratingInteractions = db.ratingInteractions || [];
  const idx = db.ratingInteractions.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const previousState = { ...db.ratingInteractions[idx] };
  db.ratingInteractions[idx] = {
    ...db.ratingInteractions[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);

  logRatingAuditEvent({
    action: 'INTERACTION_UPDATED',
    interactionId: id,
    previousState,
    newState: db.ratingInteractions[idx],
  });

  return db.ratingInteractions[idx];
}
```

---

### 3.2 Rating Helpers (`ratings`) & Compound Uniqueness

```javascript
/**
 * Retrieves ratings matching filter
 */
function getRatings(filter = {}) {
  const db = getDb();
  let items = db.ratings || [];

  if (filter.targetRole) items = items.filter(r => r.targetRole === filter.targetRole);
  if (filter.targetEntityId) {
    const target = filter.targetEntityId;
    items = items.filter(r => r.targetEntityId === target || (target.startsWith('std_') && r.targetEntityId === 'stu_' + target.slice(4)) || (target.startsWith('stu_') && r.targetEntityId === 'std_' + target.slice(4)));
  }
  if (filter.targetUserId) items = items.filter(r => r.targetUserId === filter.targetUserId);
  if (filter.reviewerUserId) items = items.filter(r => r.reviewerUserId === filter.reviewerUserId);
  if (filter.reviewerRole) items = items.filter(r => r.reviewerRole === filter.reviewerRole);
  if (filter.interactionId) items = items.filter(r => r.interactionId === filter.interactionId);
  if (filter.contextType) items = items.filter(r => r.contextType === filter.contextType);
  if (filter.status) items = items.filter(r => r.status === filter.status);
  if (filter.isVerified !== undefined) items = items.filter(r => r.isVerified === Boolean(filter.isVerified));
  if (filter.isBlind !== undefined) items = items.filter(r => r.isBlind === Boolean(filter.isBlind));

  return items;
}

function getRatingById(id) {
  if (!id) return null;
  const ratings = getRatings();
  return ratings.find(r => r.id === id) || null;
}

function getRatingsForTarget(targetRole, targetEntityId, options = {}) {
  const db = getDb();
  let ratings = db.ratings || [];

  // Filter by target role and ID
  ratings = ratings.filter(r => {
    const matchesRole = r.targetRole === targetRole;
    const matchesEntity = r.targetEntityId === targetEntityId ||
      (targetEntityId.startsWith('std_') && r.targetEntityId === 'stu_' + targetEntityId.slice(4)) ||
      (targetEntityId.startsWith('stu_') && r.targetEntityId === 'std_' + targetEntityId.slice(4));
    return matchesRole && matchesEntity;
  });

  if (!options.includeUnpublished) {
    ratings = ratings.filter(r => r.status === 'PUBLISHED');
  }

  // Sort descending by creation date
  return ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Creates rating with compound uniqueness enforcement (interactionId, reviewerUserId)
 */
function createRating(ratingData) {
  const db = getDb();
  db.ratings = db.ratings || [];

  // 1. COMPOUND UNIQUENESS ENFORCEMENT AT DB LAYER
  const duplicate = db.ratings.find(
    r => r.interactionId === ratingData.interactionId && r.reviewerUserId === ratingData.reviewerUserId
  );
  if (duplicate) {
    throw new Error('Duplicate rating: Reviewer has already submitted a rating for this interaction.');
  }

  // 2. Score Calculation if not provided
  let overallScore = ratingData.overallScore;
  if (!overallScore && ratingData.scores && typeof ratingData.scores === 'object') {
    const scoreVals = Object.values(ratingData.scores).map(Number).filter(v => !isNaN(v));
    if (scoreVals.length > 0) {
      const avg = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;
      overallScore = Math.max(1.0, Math.min(5.0, Math.round(avg * 100) / 100));
    } else {
      overallScore = 5.0;
    }
  }

  const now = new Date().toISOString();
  const isBlind = Boolean(ratingData.isBlind);
  const status = ratingData.status || (isBlind ? 'PENDING_PUBLICATION' : 'PUBLISHED');

  const newRating = {
    id: ratingData.id || `rat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    interactionId: ratingData.interactionId,
    reviewerUserId: ratingData.reviewerUserId,
    reviewerRole: ratingData.reviewerRole,
    targetUserId: ratingData.targetUserId,
    targetRole: ratingData.targetRole,
    targetEntityId: ratingData.targetEntityId,
    contextType: ratingData.contextType,
    overallScore: Number(overallScore || 5.0).toFixed(2),
    recommendation: ratingData.recommendation || 'RECOMMENDED',
    headline: ratingData.headline || '',
    reviewText: ratingData.reviewText || '',
    pros: Array.isArray(ratingData.pros) ? ratingData.pros : [],
    cons: Array.isArray(ratingData.cons) ? ratingData.cons : [],
    status: status,
    isVerified: ratingData.isVerified !== undefined ? Boolean(ratingData.isVerified) : true,
    isBlind: isBlind,
    publishedAt: status === 'PUBLISHED' ? now : null,
    metadata: ratingData.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  db.ratings.unshift(newRating);

  // 3. Save category scores if present
  if (ratingData.scores && typeof ratingData.scores === 'object') {
    db.ratingCategoryScores = db.ratingCategoryScores || [];
    const categories = db.ratingCategories || DEFAULT_RATING_CATEGORIES;
    for (const [code, scoreVal] of Object.entries(ratingData.scores)) {
      const matchedCat = categories.find(c => c.code === code || c.id === code);
      db.ratingCategoryScores.push({
        id: `rcscore_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ratingId: newRating.id,
        categoryId: matchedCat ? matchedCat.id : `rcat_${code.toLowerCase()}`,
        categoryCode: code,
        score: Math.max(1, Math.min(5, Math.round(Number(scoreVal)))),
        comment: '',
        createdAt: now,
      });
    }
  }

  saveDb(db);

  // 4. Recalculate Aggregates if Published
  if (newRating.status === 'PUBLISHED') {
    recalculateRatingAggregate(newRating.targetRole, newRating.targetEntityId);
  }

  // 5. Audit Logging
  logRatingAuditEvent({
    action: isBlind ? 'BLIND_HELD' : 'RATING_SUBMITTED',
    ratingId: newRating.id,
    interactionId: newRating.interactionId,
    actorUserId: newRating.reviewerUserId,
    actorRole: newRating.reviewerRole,
    newState: newRating,
  });

  return newRating;
}

function updateRating(id, updateData) {
  const db = getDb();
  db.ratings = db.ratings || [];
  const idx = db.ratings.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const previousState = { ...db.ratings[idx] };
  const statusChanged = updateData.status && updateData.status !== previousState.status;

  db.ratings[idx] = {
    ...db.ratings[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  if (updateData.status === 'PUBLISHED' && !db.ratings[idx].publishedAt) {
    db.ratings[idx].publishedAt = new Date().toISOString();
  }

  saveDb(db);

  if (statusChanged) {
    recalculateRatingAggregate(db.ratings[idx].targetRole, db.ratings[idx].targetEntityId);
  }

  logRatingAuditEvent({
    action: updateData.status === 'HIDDEN' ? 'RATING_MODERATED_HIDE' : 'RATING_UPDATED',
    ratingId: id,
    previousState,
    newState: db.ratings[idx],
  });

  return db.ratings[idx];
}

function deleteRating(id) {
  const db = getDb();
  db.ratings = db.ratings || [];
  const rating = db.ratings.find(r => r.id === id);
  if (!rating) return false;

  db.ratings = db.ratings.filter(r => r.id !== id);
  if (db.ratingCategoryScores) {
    db.ratingCategoryScores = db.ratingCategoryScores.filter(s => s.ratingId !== id);
  }
  if (db.ratingResponses) {
    db.ratingResponses = db.ratingResponses.filter(r => r.ratingId !== id);
  }
  if (db.ratingReports) {
    db.ratingReports = db.ratingReports.filter(r => r.ratingId !== id);
  }
  if (db.ratingAppeals) {
    db.ratingAppeals = db.ratingAppeals.filter(a => a.ratingId !== id);
  }

  saveDb(db);
  recalculateRatingAggregate(rating.targetRole, rating.targetEntityId);
  return true;
}
```

---

### 3.3 Rating Categories & Category Scores Helpers

```javascript
function getRatingCategories(filter = {}) {
  const db = getDb();
  let categories = db.ratingCategories || DEFAULT_RATING_CATEGORIES;

  if (filter.contextType) categories = categories.filter(c => c.contextType === filter.contextType);
  if (filter.targetRole) categories = categories.filter(c => c.targetRole === filter.targetRole);
  if (filter.isActive !== undefined) categories = categories.filter(c => c.isActive === Boolean(filter.isActive));

  return categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

function getRatingCategoryById(id) {
  if (!id) return null;
  const categories = getRatingCategories();
  return categories.find(c => c.id === id || c.code === id) || null;
}

function createRatingCategory(catData) {
  const db = getDb();
  db.ratingCategories = db.ratingCategories || [];
  const newCat = {
    id: catData.id || `rcat_${(catData.code || '').toLowerCase()}`,
    code: catData.code,
    name: catData.name,
    description: catData.description || '',
    targetRole: catData.targetRole,
    contextType: catData.contextType,
    minScore: catData.minScore || 1,
    maxScore: catData.maxScore || 5,
    weight: catData.weight || '1.00',
    displayOrder: catData.displayOrder || 0,
    isActive: catData.isActive !== undefined ? Boolean(catData.isActive) : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.ratingCategories.push(newCat);
  saveDb(db);
  return newCat;
}

function updateRatingCategory(id, updateData) {
  const db = getDb();
  db.ratingCategories = db.ratingCategories || [];
  const idx = db.ratingCategories.findIndex(c => c.id === id || c.code === id);
  if (idx === -1) return null;
  db.ratingCategories[idx] = {
    ...db.ratingCategories[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db);
  return db.ratingCategories[idx];
}

function getRatingCategoryScores(ratingId) {
  if (!ratingId) return [];
  const db = getDb();
  const scores = db.ratingCategoryScores || [];
  return scores.filter(s => s.ratingId === ratingId);
}

function saveRatingCategoryScores(ratingId, scoresList) {
  const db = getDb();
  db.ratingCategoryScores = db.ratingCategoryScores || [];

  // Remove existing scores for ratingId
  db.ratingCategoryScores = db.ratingCategoryScores.filter(s => s.ratingId !== ratingId);

  const now = new Date().toISOString();
  const inserted = [];

  for (const item of scoresList) {
    const record = {
      id: item.id || `rcscore_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ratingId: ratingId,
      categoryId: item.categoryId,
      categoryCode: item.categoryCode,
      score: Math.max(1, Math.min(5, Math.round(Number(item.score)))),
      comment: item.comment || '',
      createdAt: now,
    };
    db.ratingCategoryScores.push(record);
    inserted.push(record);
  }

  saveDb(db);
  return inserted;
}
```

---

### 3.4 Rating Responses, Reports, and Appeals

```javascript
// -------------------------------------------------------------
// Rating Responses
// -------------------------------------------------------------
function getRatingResponseByRatingId(ratingId) {
  if (!ratingId) return null;
  const db = getDb();
  const responses = db.ratingResponses || [];
  return responses.find(r => r.ratingId === ratingId) || null;
}

function createRatingResponse(responseData) {
  const db = getDb();
  db.ratingResponses = db.ratingResponses || [];

  // Enforce 1:1 response constraint
  const existing = db.ratingResponses.find(r => r.ratingId === responseData.ratingId);
  if (existing) {
    throw new Error('A response has already been published for this rating.');
  }

  const now = new Date().toISOString();
  const newResponse = {
    id: responseData.id || `rresp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ratingId: responseData.ratingId,
    responderUserId: responseData.responderUserId,
    responseText: responseData.responseText,
    status: responseData.status || 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };

  db.ratingResponses.push(newResponse);
  saveDb(db);

  logRatingAuditEvent({
    action: 'RESPONSE_PUBLISHED',
    ratingId: responseData.ratingId,
    actorUserId: responseData.responderUserId,
    newState: newResponse,
  });

  return newResponse;
}

function updateRatingResponse(id, updateData) {
  const db = getDb();
  db.ratingResponses = db.ratingResponses || [];
  const idx = db.ratingResponses.findIndex(r => r.id === id);
  if (idx === -1) return null;

  db.ratingResponses[idx] = {
    ...db.ratingResponses[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
  return db.ratingResponses[idx];
}

// -------------------------------------------------------------
// Rating Reports
// -------------------------------------------------------------
function getRatingReports(filter = {}) {
  const db = getDb();
  let reports = db.ratingReports || [];
  if (filter.ratingId) reports = reports.filter(r => r.ratingId === filter.ratingId);
  if (filter.reporterUserId) reports = reports.filter(r => r.reporterUserId === filter.reporterUserId);
  if (filter.status) reports = reports.filter(r => r.status === filter.status);
  return reports;
}

function getRatingReportById(id) {
  if (!id) return null;
  const reports = getRatingReports();
  return reports.find(r => r.id === id) || null;
}

function createRatingReport(reportData) {
  const db = getDb();
  db.ratingReports = db.ratingReports || [];

  const now = new Date().toISOString();
  const newReport = {
    id: reportData.id || `rrep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ratingId: reportData.ratingId,
    reporterUserId: reportData.reporterUserId,
    reason: reportData.reason,
    details: reportData.details || '',
    status: reportData.status || 'PENDING',
    moderatorNotes: reportData.moderatorNotes || '',
    resolvedByAdminId: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.ratingReports.unshift(newReport);
  saveDb(db);

  logRatingAuditEvent({
    action: 'RATING_REPORTED',
    ratingId: reportData.ratingId,
    actorUserId: reportData.reporterUserId,
    newState: newReport,
  });

  return newReport;
}

function updateRatingReport(id, updateData) {
  const db = getDb();
  db.ratingReports = db.ratingReports || [];
  const idx = db.ratingReports.findIndex(r => r.id === id);
  if (idx === -1) return null;

  db.ratingReports[idx] = {
    ...db.ratingReports[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
  return db.ratingReports[idx];
}

// -------------------------------------------------------------
// Rating Appeals
// -------------------------------------------------------------
function getRatingAppeals(filter = {}) {
  const db = getDb();
  let appeals = db.ratingAppeals || [];
  if (filter.ratingId) appeals = appeals.filter(a => a.ratingId === filter.ratingId);
  if (filter.appellantUserId) appeals = appeals.filter(a => a.appellantUserId === filter.appellantUserId);
  if (filter.status) appeals = appeals.filter(a => a.status === filter.status);
  return appeals;
}

function getRatingAppealById(id) {
  if (!id) return null;
  const appeals = getRatingAppeals();
  return appeals.find(a => a.id === id) || null;
}

function createRatingAppeal(appealData) {
  const db = getDb();
  db.ratingAppeals = db.ratingAppeals || [];

  const now = new Date().toISOString();
  const newAppeal = {
    id: appealData.id || `rapp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ratingId: appealData.ratingId,
    appellantUserId: appealData.appellantUserId,
    appealReason: appealData.appealReason,
    evidenceDocs: Array.isArray(appealData.evidenceDocs) ? appealData.evidenceDocs : [],
    status: appealData.status || 'PENDING_REVIEW',
    moderatorVerdict: appealData.moderatorVerdict || '',
    reviewedByAdminId: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.ratingAppeals.unshift(newAppeal);
  saveDb(db);

  logRatingAuditEvent({
    action: 'RATING_APPEALED',
    ratingId: appealData.ratingId,
    actorUserId: appealData.appellantUserId,
    newState: newAppeal,
  });

  return newAppeal;
}

function updateRatingAppeal(id, updateData) {
  const db = getDb();
  db.ratingAppeals = db.ratingAppeals || [];
  const idx = db.ratingAppeals.findIndex(a => a.id === id);
  if (idx === -1) return null;

  db.ratingAppeals[idx] = {
    ...db.ratingAppeals[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
  return db.ratingAppeals[idx];
}
```

---

### 3.5 Rating Aggregates & Live Recalculation Engine

```javascript
/**
 * Fetches pre-computed aggregate record or returns clean unrated template
 */
function getRatingAggregate(targetRole, targetEntityId) {
  const db = getDb();
  const aggregates = db.ratingAggregates || [];
  
  const found = aggregates.find(a => 
    a.targetRole === targetRole && 
    (a.targetEntityId === targetEntityId ||
     (targetEntityId.startsWith('std_') && a.targetEntityId === 'stu_' + targetEntityId.slice(4)) ||
     (targetEntityId.startsWith('stu_') && a.targetEntityId === 'std_' + targetEntityId.slice(4)))
  );

  if (found) return found;

  // Clean empty state for unrated entities (never defaults to 0.0 ★)
  return {
    id: `ragg_${targetRole.toLowerCase()}_${targetEntityId}`,
    targetRole,
    targetEntityId,
    targetUserId: null,
    totalRatingsCount: 0,
    verifiedRatingsCount: 0,
    averageScore: '0.00',
    recommendationRate: '0.00',
    categoryBreakdown: {},
    scoreDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    contextBreakdown: {},
    objectiveSkillScore: '0.00',
    verificationTrustLevel: 'UNVERIFIED',
    lastRecalculatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Authoritative recalculation of target reputation metrics from published reviews
 */
function recalculateRatingAggregate(targetRole, targetEntityId) {
  const db = getDb();
  db.ratingAggregates = db.ratingAggregates || [];

  // Gather all published ratings
  const publishedRatings = getRatingsForTarget(targetRole, targetEntityId, { includeUnpublished: false });
  const totalCount = publishedRatings.length;
  const verifiedRatings = publishedRatings.filter(r => r.isVerified);
  const verifiedCount = verifiedRatings.length;

  let averageScore = '0.00';
  let recommendationRate = '0.00';
  const scoreDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const contextBreakdown = {};
  const categoryBreakdown = {};

  if (totalCount > 0) {
    const sum = publishedRatings.reduce((acc, r) => acc + Number(r.overallScore || 0), 0);
    averageScore = (sum / totalCount).toFixed(2);

    const recommendedCount = publishedRatings.filter(r => r.recommendation === 'RECOMMENDED').length;
    recommendationRate = ((recommendedCount / totalCount) * 100).toFixed(2);

    // Distribution Histogram (1..5 stars)
    publishedRatings.forEach(r => {
      const rounded = String(Math.max(1, Math.min(5, Math.round(Number(r.overallScore || 5)))));
      scoreDistribution[rounded] = (scoreDistribution[rounded] || 0) + 1;

      // Context breakdown
      if (r.contextType) {
        contextBreakdown[r.contextType] = (contextBreakdown[r.contextType] || 0) + 1;
      }
    });

    // Category Breakdown
    const ratingIds = publishedRatings.map(r => r.id);
    const categoryScores = (db.ratingCategoryScores || []).filter(s => ratingIds.includes(s.ratingId));
    const catBuckets = {};

    categoryScores.forEach(s => {
      const code = s.categoryCode;
      if (!catBuckets[code]) {
        catBuckets[code] = { total: 0, count: 0 };
      }
      catBuckets[code].total += Number(s.score);
      catBuckets[code].count += 1;
    });

    const allCategories = db.ratingCategories || DEFAULT_RATING_CATEGORIES;
    for (const [code, bucket] of Object.entries(catBuckets)) {
      const def = allCategories.find(c => c.code === code);
      categoryBreakdown[code] = {
        average: Number((bucket.total / bucket.count).toFixed(2)),
        count: bucket.count,
        name: def ? def.name : code,
      };
    }
  }

  // Objective Skill Verification Score from platform assessments
  let objectiveSkillScore = '0.00';
  if (targetRole === 'STUDENT') {
    const student = getStudentById(targetEntityId);
    if (student && student.overallConfidenceScore) {
      objectiveSkillScore = Number(student.overallConfidenceScore).toFixed(2);
    } else if (db.verifications) {
      const studentVers = db.verifications.filter(v => v.studentId === targetEntityId);
      if (studentVers.length > 0) {
        const avgVer = studentVers.reduce((acc, v) => acc + (v.overallScore || 0), 0) / studentVers.length;
        objectiveSkillScore = avgVer.toFixed(2);
      }
    }
  }

  // Verification Trust Tier
  let verificationTrustLevel = 'UNVERIFIED';
  const numAvg = Number(averageScore);

  if (verifiedCount >= 5 && numAvg >= 4.5) {
    verificationTrustLevel = 'GOLD_TRUSTED';
  } else if (verifiedCount >= 3 && numAvg >= 4.0) {
    verificationTrustLevel = 'VERIFIED_TIER2';
  } else if (verifiedCount >= 1) {
    verificationTrustLevel = 'VERIFIED_TIER1';
  }

  const now = new Date().toISOString();
  let targetUserId = null;

  // Resolve targetUserId
  if (targetRole === 'STUDENT') {
    const stu = getStudentById(targetEntityId);
    if (stu) targetUserId = stu.userId || null;
  } else if (targetRole === 'INDUSTRY') {
    const comp = getCompanyById(targetEntityId);
    if (comp) targetUserId = comp.userId || null;
  } else if (targetRole === 'INSTITUTE') {
    const inst = (db.institutes || []).find(i => i.id === targetEntityId);
    if (inst) targetUserId = inst.userId || null;
  }

  const aggregateRecord = {
    id: `ragg_${targetRole.toLowerCase()}_${targetEntityId}`,
    targetRole,
    targetEntityId,
    targetUserId,
    totalRatingsCount: totalCount,
    verifiedRatingsCount: verifiedCount,
    averageScore,
    recommendationRate,
    categoryBreakdown,
    scoreDistribution,
    contextBreakdown,
    objectiveSkillScore,
    verificationTrustLevel,
    lastRecalculatedAt: now,
    updatedAt: now,
  };

  const existingIdx = db.ratingAggregates.findIndex(a => 
    a.targetRole === targetRole && a.targetEntityId === targetEntityId
  );

  if (existingIdx !== -1) {
    db.ratingAggregates[existingIdx] = {
      ...db.ratingAggregates[existingIdx],
      ...aggregateRecord,
    };
  } else {
    aggregateRecord.createdAt = now;
    db.ratingAggregates.push(aggregateRecord);
  }

  saveDb(db);

  logRatingAuditEvent({
    action: 'AGGREGATES_RECALCULATED',
    actorRole: 'SYSTEM',
    newState: aggregateRecord,
  });

  return aggregateRecord;
}
```

---

### 3.6 Rating Policies & Rating Audit Logs

```javascript
// -------------------------------------------------------------
// Rating Policies
// -------------------------------------------------------------
function getRatingPolicies() {
  const db = getDb();
  return db.ratingPolicies || DEFAULT_RATING_POLICIES;
}

function getRatingPolicyByContext(contextType) {
  const policies = getRatingPolicies();
  return policies.find(p => p.contextType === contextType) || policies[0] || null;
}

function updateRatingPolicy(contextType, updateData) {
  const db = getDb();
  db.ratingPolicies = db.ratingPolicies || DEFAULT_RATING_POLICIES;
  const idx = db.ratingPolicies.findIndex(p => p.contextType === contextType);
  if (idx === -1) return null;

  db.ratingPolicies[idx] = {
    ...db.ratingPolicies[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
  return db.ratingPolicies[idx];
}

// -------------------------------------------------------------
// Rating Audit Logs
// -------------------------------------------------------------
function getRatingAuditLogs(filter = {}, limit = 100) {
  const db = getDb();
  let logs = db.ratingAuditLogs || [];
  if (filter.ratingId) logs = logs.filter(l => l.ratingId === filter.ratingId);
  if (filter.interactionId) logs = logs.filter(l => l.interactionId === filter.interactionId);
  if (filter.actorUserId) logs = logs.filter(l => l.actorUserId === filter.actorUserId);
  if (filter.action) logs = logs.filter(l => l.action === filter.action);
  return logs.slice(0, limit);
}

function logRatingAuditEvent(payload) {
  const db = getDb();
  db.ratingAuditLogs = db.ratingAuditLogs || [];

  const newLog = {
    id: `rlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ratingId: payload.ratingId || null,
    interactionId: payload.interactionId || null,
    actorUserId: payload.actorUserId || null,
    actorRole: payload.actorRole || 'SYSTEM',
    action: payload.action || 'RATING_EVENT',
    previousState: payload.previousState || null,
    newState: payload.newState || null,
    reason: payload.reason || '',
    ipAddress: payload.ipAddress || null,
    userAgent: payload.userAgent || null,
    createdAt: new Date().toISOString(),
  };

  db.ratingAuditLogs.unshift(newLog);
  saveDb(db);
  return newLog;
}
```

---

## 4. Query Builder Extension in `db/index.js`

### 4.1 Mock Table Key Normalization

`createMockDrizzleDb()` resolves tables via `table?._?.name || table?.name || (typeof table === 'string' ? table : 'user')`.

The following mapping must be added to support all 10 rating tables:

```javascript
function getStoreForTableName(tableName, dbInstance) {
  switch (tableName) {
    case 'user':
    case 'users':
      return dbInstance.users || (dbInstance.users = []);
    case 'signup_intents':
    case 'signupIntents':
      return dbInstance.signupIntents || (dbInstance.signupIntents = []);
    case 'student_profile':
    case 'studentProfiles':
      return dbInstance.studentProfiles || (dbInstance.studentProfiles = []);
    case 'organization_profile':
    case 'organizationProfiles':
    case 'industry_profile':
    case 'industryProfiles':
      return dbInstance.organizationProfiles || (dbInstance.organizationProfiles = []);
    case 'institute':
    case 'institute_profile':
    case 'instituteProfiles':
    case 'institutes':
      return dbInstance.instituteProfiles || (dbInstance.instituteProfiles = []);
    case 'admin_profile':
    case 'adminProfiles':
      return dbInstance.adminProfiles || (dbInstance.adminProfiles = []);
    case 'audit_logs':
    case 'auditLogs':
      return dbInstance.auditLogs || (dbInstance.auditLogs = []);
    case 'session':
    case 'sessions':
      return dbInstance.sessions || (dbInstance.sessions = []);
    case 'account':
    case 'accounts':
      return dbInstance.accounts || (dbInstance.accounts = []);
    case 'verification':
    case 'verifications':
      return dbInstance.verifications || (dbInstance.verifications = []);

    // 10 Rating Tables
    case 'rating_interactions':
    case 'ratingInteractions':
      return dbInstance.ratingInteractions || (dbInstance.ratingInteractions = []);
    case 'ratings':
      return dbInstance.ratings || (dbInstance.ratings = []);
    case 'rating_categories':
    case 'ratingCategories':
      return dbInstance.ratingCategories || (dbInstance.ratingCategories = []);
    case 'rating_category_scores':
    case 'ratingCategoryScores':
      return dbInstance.ratingCategoryScores || (dbInstance.ratingCategoryScores = []);
    case 'rating_responses':
    case 'ratingResponses':
      return dbInstance.ratingResponses || (dbInstance.ratingResponses = []);
    case 'rating_reports':
    case 'ratingReports':
      return dbInstance.ratingReports || (dbInstance.ratingReports = []);
    case 'rating_appeals':
    case 'ratingAppeals':
      return dbInstance.ratingAppeals || (dbInstance.ratingAppeals = []);
    case 'rating_aggregates':
    case 'ratingAggregates':
      return dbInstance.ratingAggregates || (dbInstance.ratingAggregates = []);
    case 'rating_policies':
    case 'ratingPolicies':
      return dbInstance.ratingPolicies || (dbInstance.ratingPolicies = []);
    case 'rating_audit_logs':
    case 'ratingAuditLogs':
      return dbInstance.ratingAuditLogs || (dbInstance.ratingAuditLogs = []);

    default:
      return [];
  }
}
```

---

### 4.2 Query Interface Extensions (`db.query.*`)

Extend `mockQueryBuilder.query` with all 10 rating tables:

```javascript
query: {
  users: {
    findFirst: async () => localDb.getUsers()[0] || null,
    findMany: async () => localDb.getUsers(),
  },
  signupIntents: {
    findFirst: async () => null,
    findMany: async () => [],
  },
  studentProfiles: {
    findFirst: async () => null,
    findMany: async () => localDb.getStudents(),
  },
  organizationProfiles: {
    findFirst: async () => null,
    findMany: async () => localDb.getCompanies(),
  },
  industryProfiles: {
    findFirst: async () => null,
    findMany: async () => localDb.getCompanies(),
  },
  instituteProfiles: {
    findFirst: async () => null,
    findMany: async () => localDb.getDb().institutes || [],
  },
  adminProfiles: {
    findFirst: async () => null,
    findMany: async () => localDb.getDb().adminProfiles || [],
  },
  auditLogs: {
    findMany: async () => localDb.getAuditLogs(),
  },

  // 10 Rating Table Query Handlers
  ratingInteractions: {
    findFirst: async (options = {}) => {
      const items = localDb.getRatingInteractions();
      return items[0] || null;
    },
    findMany: async (options = {}) => localDb.getRatingInteractions(),
  },
  ratings: {
    findFirst: async (options = {}) => {
      const items = localDb.getRatings();
      return items[0] || null;
    },
    findMany: async (options = {}) => localDb.getRatings(),
  },
  ratingCategories: {
    findFirst: async (options = {}) => {
      const items = localDb.getRatingCategories();
      return items[0] || null;
    },
    findMany: async (options = {}) => localDb.getRatingCategories(),
  },
  ratingCategoryScores: {
    findFirst: async () => null,
    findMany: async (options = {}) => localDb.getDb().ratingCategoryScores || [],
  },
  ratingResponses: {
    findFirst: async () => null,
    findMany: async () => localDb.getDb().ratingResponses || [],
  },
  ratingReports: {
    findFirst: async () => null,
    findMany: async () => localDb.getRatingReports(),
  },
  ratingAppeals: {
    findFirst: async () => null,
    findMany: async () => localDb.getRatingAppeals(),
  },
  ratingAggregates: {
    findFirst: async () => null,
    findMany: async () => localDb.getDb().ratingAggregates || [],
  },
  ratingPolicies: {
    findFirst: async () => localDb.getRatingPolicies()[0] || null,
    findMany: async () => localDb.getRatingPolicies(),
  },
  ratingAuditLogs: {
    findMany: async () => localDb.getRatingAuditLogs(),
  },
}
```

---

## 5. Backwards Compatibility & Aliasing

### 5.1 Aliasing `organizationProfiles` and `industryProfiles`

1. **In `db/schema.js`**:
   ```javascript
   const organizationProfiles = pgTable('organization_profile', { ... });
   const industryProfiles = organizationProfiles; // Direct alias export
   ```
2. **In `db/relations.js`**:
   Define relations for both `organizationProfiles` and `industryProfiles` pointing to `ratingAggregates` and `ratings`.
3. **In `lib/db.js`**:
   Provide alias helper methods:
   - `getIndustryProfiles(query)` -> proxies to `getCompanies(query)` or `db.organizationProfiles`
   - `getIndustryProfileById(id)` -> proxies to `getCompanyById(id)`
   - `updateIndustryProfile(id, data)` -> proxies to `updateCompany(id, data)`

### 5.2 Zero Breaking Changes Guarantee

- Existing tests (`npm test`, `tests/test-auth-suite.js`, `tests/adversarial-auth-challenge.js`) rely on `lib/db.js` existing exports:
  `getUsers`, `getUserById`, `getUserByEmail`, `createUser`, `updateUser`, `getStudents`, `getStudentById`, `updateStudent`, `addStudentSkill`, `updateStudentSkill`, `removeStudentSkill`, `getCompanies`, `getCompanyById`, `createCompany`, `updateCompany`, `verifyCompany`, `getOpportunities`, `getOpportunityById`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`, `getApplications`, `getApplicationById`, `createApplication`, `updateApplicationStatus`, `getSkills`, `getSkillById`, `addSkill`, `updateSkill`, `addSkillAlias`, `getOntology`, `getAlerts`, `createAlert`, `getTrainingPrograms`, `getTrainingProgramById`, `createTrainingProgram`, `updateTrainingProgram`, `getFeedbackReports`, `submitFeedbackReport`, `getAuditLogs`, `logAuditEvent`, `getSystemStats`.
- All these exports are strictly preserved and unchanged.
- All new rating functions are appended as non-conflicting exports.

---

## 6. Verification and Acceptance Matrix

| # | Verification Case | Input / Method | Expected Result |
|---|---|---|---|
| 1 | Array Initialization | Load `lib/db.js` with empty `{}` in memory | All 10 arrays initialized (`ratingInteractions`, `ratings`, `ratingCategories`, etc.) |
| 2 | Default Seed Categories | `getRatingCategories()` | Returns 20 categories (5 for Application, 5 for Interview, 10 for Internship, 5 for Course) |
| 3 | Compound Uniqueness | Call `createRating` twice with same `(interactionId, reviewerUserId)` | Throws Error: `"Duplicate rating: Reviewer has already submitted a rating for this interaction."` |
| 4 | Aggregate Recalculation | Insert 2 ratings (score 4.0 and 5.0) for `std_001` and call `recalculateRatingAggregate('STUDENT', 'std_001')` | `averageScore` = `'4.50'`, `totalRatingsCount` = `2`, `recommendationRate` = `'100.00'` |
| 5 | Empty State Aggregate | `getRatingAggregate('STUDENT', 'unrated_std')` | Returns `totalRatingsCount: 0`, `averageScore: '0.00'`, `verificationTrustLevel: 'UNVERIFIED'` without throw |
| 6 | Mock DB Select & Insert | `db.insert(ratings).values(ratingObj)` and `db.select().from(ratings)` | Resolves inserted rating and returns in select query |
| 7 | Full Regression Pass | `npm test` | All 33 test cases pass with 100% pass rate |
