/**
 * SIH 2026 In-Memory & Persistent JSON Database Layer
 * File: lib/db.js
 */

const fs = require('fs');
const path = require('path');
const { normalizeSkill, normalizeSkillList, getOntology } = require('./normalization');

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const SEED_PATH = path.join(process.cwd(), 'data', 'seed.json');

let cachedDb = null;

const DEFAULT_RATING_CATEGORIES = [
  // Context 1: APPLICATION_REVIEW (Reviewer: INDUSTRY -> Target: STUDENT)
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

  // Context 2: INTERVIEW_FEEDBACK (Reviewer: INDUSTRY -> Target: STUDENT)
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

  // Context 3A: INTERNSHIP_PERFORMANCE (Reviewer: INDUSTRY -> Target: STUDENT)
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

  // Context 3B: INTERNSHIP_PERFORMANCE (Reviewer: STUDENT -> Target: INDUSTRY)
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

  // Context 4: COURSE_EVALUATION (Reviewer: STUDENT / INDUSTRY -> Target: INSTITUTE)
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

/**
 * Ensures data/db.json exists, cloning from data/seed.json if needed
 */
function ensureDbExists() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    if (fs.existsSync(SEED_PATH)) {
      const seedRaw = fs.readFileSync(SEED_PATH, 'utf-8');
      fs.writeFileSync(DB_PATH, seedRaw, 'utf-8');
    } else {
      // Fallback initial dataset if seed.json is absent
      const initialSeed = {
        users: [],
        students: [],
        studentProfiles: [],
        companies: [],
        organizationProfiles: [],
        opportunities: [],
        skills: [],
        applications: [],
        institutes: [],
        instituteProfiles: [],
        adminProfiles: [],
        departments: [],
        alerts: [],
        trainingPrograms: [],
        feedbackReports: [],
        auditLogs: [],
        signupIntents: [],
        sessions: [],
        accounts: [],
        verifications: [],
        ratingInteractions: [],
        ratings: [],
        ratingCategories: JSON.parse(JSON.stringify(DEFAULT_RATING_CATEGORIES)),
        ratingCategoryScores: [],
        ratingResponses: [],
        ratingReports: [],
        ratingAppeals: [],
        ratingAggregates: [],
        ratingPolicies: JSON.parse(JSON.stringify(DEFAULT_RATING_POLICIES)),
        ratingAuditLogs: [],
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialSeed, null, 2), 'utf-8');
    }
  }
}

/**
 * Returns active DB snapshot from memory or disc
 */
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

/**
 * Synchronously and atomically persists database state
 */
function saveDb(data) {
  cachedDb = data;
  ensureDbExists();
  const tmpPath = `${DB_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (e) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (_) {}
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }
  return cachedDb;
}

/**
 * Resets database back to golden seed
 */
function resetDb() {
  ensureDbExists();
  if (fs.existsSync(SEED_PATH)) {
    const seedRaw = fs.readFileSync(SEED_PATH, 'utf-8');
    cachedDb = JSON.parse(seedRaw);
    cachedDb.ratingCategories = (cachedDb.ratingCategories && cachedDb.ratingCategories.length > 0)
      ? cachedDb.ratingCategories
      : JSON.parse(JSON.stringify(DEFAULT_RATING_CATEGORIES));
    cachedDb.ratingPolicies = (cachedDb.ratingPolicies && cachedDb.ratingPolicies.length > 0)
      ? cachedDb.ratingPolicies
      : JSON.parse(JSON.stringify(DEFAULT_RATING_POLICIES));
    cachedDb.ratingInteractions = cachedDb.ratingInteractions || [];
    cachedDb.ratings = cachedDb.ratings || [];
    cachedDb.ratingCategoryScores = cachedDb.ratingCategoryScores || [];
    cachedDb.ratingResponses = cachedDb.ratingResponses || [];
    cachedDb.ratingReports = cachedDb.ratingReports || [];
    cachedDb.ratingAppeals = cachedDb.ratingAppeals || [];
    cachedDb.ratingAggregates = cachedDb.ratingAggregates || [];
    cachedDb.ratingAuditLogs = cachedDb.ratingAuditLogs || [];
    saveDb(cachedDb);
  } else {
    cachedDb = {
      users: [],
      students: [],
      studentProfiles: [],
      companies: [],
      organizationProfiles: [],
      opportunities: [],
      skills: [],
      applications: [],
      institutes: [],
      instituteProfiles: [],
      adminProfiles: [],
      departments: [],
      alerts: [],
      trainingPrograms: [],
      feedbackReports: [],
      auditLogs: [],
      signupIntents: [],
      sessions: [],
      accounts: [],
      verifications: [],
      ratingInteractions: [],
      ratings: [],
      ratingCategories: JSON.parse(JSON.stringify(DEFAULT_RATING_CATEGORIES)),
      ratingCategoryScores: [],
      ratingResponses: [],
      ratingReports: [],
      ratingAppeals: [],
      ratingAggregates: [],
      ratingPolicies: JSON.parse(JSON.stringify(DEFAULT_RATING_POLICIES)),
      ratingAuditLogs: [],
    };
    saveDb(cachedDb);
  }
  return cachedDb;
}

// -------------------------------------------------------------
// User Management
// -------------------------------------------------------------
function getUsers() {
  const db = getDb();
  return db.users || [];
}

function getUserById(id) {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function createUser(userData) {
  const db = getDb();
  db.users = db.users || [];
  const newUser = {
    id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...userData
  };
  db.users.push(newUser);
  saveDb(db);
  return newUser;
}

function updateUser(id, updateData) {
  const db = getDb();
  db.users = db.users || [];
  const idx = db.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    db.users[idx] = { ...db.users[idx], ...updateData, updatedAt: new Date().toISOString() };
    saveDb(db);
    return db.users[idx];
  }
  return null;
}

// -------------------------------------------------------------
// Student Profiles & Skills
// -------------------------------------------------------------
function getStudents(query = {}) {
  const db = getDb();
  let students = db.students || [];

  if (query.department) {
    students = students.filter(s => s.department === query.department || s.departmentName === query.department);
  }
  if (query.instituteId) {
    students = students.filter(s => s.instituteId === query.instituteId);
  }
  if (query.search) {
    const q = query.search.toLowerCase();
    students = students.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }

  return students;
}

function getStudentById(id) {
  if (!id) return null;
  const students = getStudents();
  const targetId = String(id).trim();

  // Direct match or standard alias matching (std_001 <-> stu_001)
  let found = students.find(s => s.id === targetId || s.studentId === targetId || s.userId === targetId);
  if (!found) {
    if (targetId.startsWith('stu_')) {
      const altId = 'std_' + targetId.slice(4);
      found = students.find(s => s.id === altId || s.studentId === altId);
    } else if (targetId.startsWith('std_')) {
      const altId = 'stu_' + targetId.slice(4);
      found = students.find(s => s.id === altId || s.studentId === altId);
    }
  }
  return found || null;
}

function updateStudent(id, updateData) {
  const db = getDb();
  db.students = db.students || [];
  const targetId = String(id).trim();
  let idx = db.students.findIndex(s => s.id === targetId || s.studentId === targetId);

  if (idx === -1) {
    if (targetId.startsWith('stu_')) {
      const altId = 'std_' + targetId.slice(4);
      idx = db.students.findIndex(s => s.id === altId || s.studentId === altId);
    } else if (targetId.startsWith('std_')) {
      const altId = 'stu_' + targetId.slice(4);
      idx = db.students.findIndex(s => s.id === altId || s.studentId === altId);
    }
  }

  if (idx !== -1) {
    db.students[idx] = { ...db.students[idx], ...updateData, updatedAt: new Date().toISOString() };
    saveDb(db);
    return db.students[idx];
  }
  return null;
}

function addStudentSkill(studentId, skillPayload) {
  const student = getStudentById(studentId);
  if (!student) return null;

  student.skills = student.skills || [];
  const normalized = normalizeSkillList([skillPayload])[0];
  if (!normalized) return student;

  const existingIdx = student.skills.findIndex(s => {
    const sName = normalizeSkill(s.canonicalName || s.name || s.skillName);
    return sName.toLowerCase() === normalized.canonicalName.toLowerCase();
  });

  if (existingIdx !== -1) {
    student.skills[existingIdx] = {
      ...student.skills[existingIdx],
      ...normalized,
      proficiency: Math.max(student.skills[existingIdx].proficiency || 1, normalized.proficiency || 1),
      evidenceLevel: Math.max(student.skills[existingIdx].evidenceLevel || 1, normalized.evidenceLevel || 1)
    };
  } else {
    student.skills.push(normalized);
  }

  updateStudent(student.id, { skills: student.skills });
  return student;
}

function updateStudentSkill(studentId, skillId, skillPayload) {
  const student = getStudentById(studentId);
  if (!student || !student.skills) return null;

  const idx = student.skills.findIndex(s => s.skillId === skillId || s.id === skillId || normalizeSkill(s.name || s.canonicalName) === normalizeSkill(skillId));
  if (idx !== -1) {
    student.skills[idx] = { ...student.skills[idx], ...skillPayload };
    updateStudent(student.id, { skills: student.skills });
    return student.skills[idx];
  }
  return null;
}

function removeStudentSkill(studentId, skillId) {
  const student = getStudentById(studentId);
  if (!student || !student.skills) return false;

  const initialLen = student.skills.length;
  student.skills = student.skills.filter(s => s.skillId !== skillId && s.id !== skillId && normalizeSkill(s.name || s.canonicalName) !== normalizeSkill(skillId));
  if (student.skills.length !== initialLen) {
    updateStudent(student.id, { skills: student.skills });
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Companies & Employers
// -------------------------------------------------------------
function getCompanies() {
  const db = getDb();
  return db.companies || [];
}

function getCompanyById(id) {
  const companies = getCompanies();
  return companies.find(c => c.id === id || c.companyId === id) || null;
}

function createCompany(companyData) {
  const db = getDb();
  db.companies = db.companies || [];
  const newComp = {
    id: companyData.id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    verified: companyData.verified !== undefined ? companyData.verified : false,
    kycStatus: companyData.kycStatus || (companyData.verified ? 'VERIFIED' : 'PENDING'),
    createdAt: new Date().toISOString(),
    ...companyData
  };
  db.companies.push(newComp);
  saveDb(db);
  return newComp;
}

function updateCompany(id, updateData) {
  const db = getDb();
  db.companies = db.companies || [];
  const idx = db.companies.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.companies[idx] = { ...db.companies[idx], ...updateData, updatedAt: new Date().toISOString() };
    saveDb(db);
    return db.companies[idx];
  }
  return null;
}

function verifyCompany(id, isVerified = true, adminNotes = '') {
  return updateCompany(id, {
    verified: Boolean(isVerified),
    kycStatus: isVerified ? 'VERIFIED' : 'REJECTED',
    adminNotes,
    verifiedAt: new Date().toISOString()
  });
}

// -------------------------------------------------------------
// Opportunities
// -------------------------------------------------------------
function getOpportunities(filter = {}) {
  const db = getDb();
  let opps = db.opportunities || [];

  if (filter.companyId) {
    opps = opps.filter(o => o.companyId === filter.companyId);
  }
  if (filter.status) {
    opps = opps.filter(o => o.status === filter.status);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    opps = opps.filter(o => o.title.toLowerCase().includes(q) || (o.company && o.company.toLowerCase().includes(q)));
  }

  return opps;
}

function getOpportunityById(id) {
  const opps = getOpportunities();
  return opps.find(o => o.id === id || o.opportunityId === id) || null;
}

function createOpportunity(oppData) {
  const db = getDb();
  db.opportunities = db.opportunities || [];
  const newOpp = {
    id: oppData.id || `opp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: oppData.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    ...oppData
  };
  db.opportunities.push(newOpp);
  saveDb(db);
  return newOpp;
}

function updateOpportunity(id, updateData) {
  const db = getDb();
  db.opportunities = db.opportunities || [];
  const idx = db.opportunities.findIndex(o => o.id === id);
  if (idx !== -1) {
    db.opportunities[idx] = { ...db.opportunities[idx], ...updateData, updatedAt: new Date().toISOString() };
    saveDb(db);
    return db.opportunities[idx];
  }
  return null;
}

function deleteOpportunity(id) {
  const db = getDb();
  db.opportunities = db.opportunities || [];
  const initialLen = db.opportunities.length;
  db.opportunities = db.opportunities.filter(o => o.id !== id);
  if (db.opportunities.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Applications
// -------------------------------------------------------------
function getApplications(filter = {}) {
  const db = getDb();
  let apps = db.applications || [];

  if (filter.studentId) {
    const target = filter.studentId;
    apps = apps.filter(a => a.studentId === target || (target.startsWith('std_') && a.studentId === 'stu_' + target.slice(4)) || (target.startsWith('stu_') && a.studentId === 'std_' + target.slice(4)));
  }
  if (filter.opportunityId) {
    apps = apps.filter(a => a.opportunityId === filter.opportunityId);
  }
  if (filter.status) {
    apps = apps.filter(a => a.status === filter.status);
  }

  return apps;
}

function getApplicationById(id) {
  const apps = getApplications();
  return apps.find(a => a.id === id) || null;
}

function createApplication(applicationData) {
  const db = getDb();
  db.applications = db.applications || [];
  const newApp = {
    id: applicationData.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: applicationData.status || 'SUBMITTED',
    createdAt: new Date().toISOString(),
    appliedDate: new Date().toISOString(),
    ...applicationData
  };
  db.applications.push(newApp);
  saveDb(db);
  return newApp;
}

function updateApplicationStatus(id, newStatus, notes = '') {
  const db = getDb();
  db.applications = db.applications || [];
  const idx = db.applications.findIndex(a => a.id === id);
  if (idx !== -1) {
    db.applications[idx].status = newStatus;
    if (notes) db.applications[idx].reviewNotes = notes;
    db.applications[idx].updatedAt = new Date().toISOString();
    saveDb(db);
    return db.applications[idx];
  }
  return null;
}

// -------------------------------------------------------------
// Skills Ontology
// -------------------------------------------------------------
function getSkills() {
  const db = getDb();
  return db.skills || [];
}

function getSkillById(id) {
  const skills = getSkills();
  return skills.find(s => s.id === id || s.skillId === id || s.canonicalName.toLowerCase() === String(id).toLowerCase()) || null;
}

function addSkill(skillData) {
  const db = getDb();
  db.skills = db.skills || [];
  const newSkill = {
    id: skillData.id || `skill_${skillData.canonicalName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    canonicalName: skillData.canonicalName || skillData.name,
    category: skillData.category || 'General',
    aliases: Array.isArray(skillData.aliases) ? skillData.aliases : [skillData.canonicalName.toLowerCase()]
  };
  db.skills.push(newSkill);
  saveDb(db);
  return newSkill;
}

function updateSkill(id, updateData) {
  const db = getDb();
  db.skills = db.skills || [];
  const idx = db.skills.findIndex(s => s.id === id);
  if (idx !== -1) {
    db.skills[idx] = { ...db.skills[idx], ...updateData };
    saveDb(db);
    return db.skills[idx];
  }
  return null;
}

function addSkillAlias(skillId, alias) {
  const db = getDb();
  db.skills = db.skills || [];
  const skill = db.skills.find(s => s.id === skillId || s.canonicalName.toLowerCase() === skillId.toLowerCase());
  if (skill) {
    skill.aliases = skill.aliases || [];
    if (!skill.aliases.includes(alias.toLowerCase())) {
      skill.aliases.push(alias.toLowerCase());
      saveDb(db);
    }
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Alerts & Training Programs
// -------------------------------------------------------------
function getAlerts(filter = {}) {
  const db = getDb();
  let alerts = db.alerts || [];
  if (filter.department) {
    alerts = alerts.filter(a => a.department === filter.department);
  }
  return alerts;
}

function createAlert(alertData) {
  const db = getDb();
  db.alerts = db.alerts || [];
  const newAlert = {
    id: alertData.id || `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    hasPII: false,
    createdAt: new Date().toISOString(),
    ...alertData
  };
  db.alerts.push(newAlert);
  saveDb(db);
  return newAlert;
}

function getTrainingPrograms() {
  const db = getDb();
  return db.trainingPrograms || [];
}

function getTrainingProgramById(id) {
  const programs = getTrainingPrograms();
  return programs.find(p => p.id === id) || null;
}

function createTrainingProgram(programData) {
  const db = getDb();
  db.trainingPrograms = db.trainingPrograms || [];
  const newProgram = {
    id: programData.id || `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: programData.status || 'SCHEDULED',
    enrolledCount: programData.enrolledCount || 0,
    createdAt: new Date().toISOString(),
    ...programData
  };
  db.trainingPrograms.push(newProgram);
  saveDb(db);
  return newProgram;
}

function updateTrainingProgram(id, updateData) {
  const db = getDb();
  db.trainingPrograms = db.trainingPrograms || [];
  const idx = db.trainingPrograms.findIndex(p => p.id === id);
  if (idx !== -1) {
    db.trainingPrograms[idx] = { ...db.trainingPrograms[idx], ...updateData };
    saveDb(db);
    return db.trainingPrograms[idx];
  }
  return null;
}

// -------------------------------------------------------------
// Employer Feedback & Evidence Elevation
// -------------------------------------------------------------
function getFeedbackReports() {
  const db = getDb();
  return db.feedbackReports || [];
}

function submitFeedbackReport(feedbackPayload) {
  const db = getDb();
  db.feedbackReports = db.feedbackReports || [];

  const newReport = {
    id: feedbackPayload.id || `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    ...feedbackPayload
  };
  db.feedbackReports.unshift(newReport);

  // Upgrade student skills to Level 5 (Industry Verified)
  const studentId = feedbackPayload.studentId;
  const endorsedSkills = feedbackPayload.endorsedSkills || feedbackPayload.endorsedSkillIds || [];

  if (studentId && endorsedSkills.length > 0) {
    const student = getStudentById(studentId);
    if (student && student.skills) {
      endorsedSkills.forEach(endorsed => {
        const canonical = normalizeSkill(endorsed);
        const skill = student.skills.find(s => normalizeSkill(s.canonicalName || s.name || s.skillName) === canonical);
        if (skill) {
          skill.evidenceLevel = 5;
          skill.isIndustryVerified = true;
          skill.verification = 'Industry Verified';
          skill.verifiedByCompany = feedbackPayload.companyName || feedbackPayload.company || 'Industry Employer';
          skill.confidenceScore = Math.min(100, (skill.confidenceScore || 75) + 15);
        }
      });

      student.overallConfidenceScore = Math.min(
        100,
        Math.round(student.skills.reduce((acc, curr) => acc + (curr.confidenceScore || 75), 0) / student.skills.length)
      );

      updateStudent(student.id, {
        skills: student.skills,
        overallConfidenceScore: student.overallConfidenceScore
      });
    }
  }

  // Audit event
  logAuditEvent(
    feedbackPayload.recruiterName || 'Recruiter',
    'RECRUITER',
    'SUBMIT_FEEDBACK',
    studentId || 'student',
    { reportId: newReport.id, endorsedSkills }
  );

  saveDb(db);
  return newReport;
}

// -------------------------------------------------------------
// System Audit Logs & Telemetry
// -------------------------------------------------------------
function getAuditLogs(limit = 100) {
  const db = getDb();
  const logs = db.auditLogs || [];
  return logs.slice(0, limit);
}

function logAuditEvent(actor, role, action, target, metadata = {}) {
  const db = getDb();
  db.auditLogs = db.auditLogs || [];
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actor: actor || 'System',
    role: role || 'SYSTEM',
    action: action || 'ACTION',
    target: target || 'TARGET',
    metadata,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog);
  saveDb(db);
  return newLog;
}

function getSystemStats() {
  const db = getDb();
  return {
    totalStudents: (db.students || []).length,
    totalCompanies: (db.companies || []).length,
    verifiedCompanies: (db.companies || []).filter(c => c.verified).length,
    totalOpportunities: (db.opportunities || []).length,
    activeOpportunities: (db.opportunities || []).filter(o => o.status === 'ACTIVE').length,
    totalApplications: (db.applications || []).length,
    totalAlerts: (db.alerts || []).length,
    totalSkills: (db.skills || []).length
  };
}

// -------------------------------------------------------------
// Rating & Reputation System CRUD Helpers (R1)
// -------------------------------------------------------------

// 1. Interactions
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

// 2. Ratings
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

  return ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createRating(ratingData) {
  const db = getDb();
  db.ratings = db.ratings || [];

  // Compound uniqueness check: (interactionId, reviewerUserId)
  const duplicate = db.ratings.find(
    r => r.interactionId === ratingData.interactionId && r.reviewerUserId === ratingData.reviewerUserId
  );
  if (duplicate) {
    throw new Error('Duplicate rating: Reviewer has already submitted a rating for this interaction.');
  }

  // Score calculation if not explicitly provided
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

  // Store category scores if present
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

  // Recalculate Aggregates if Published
  if (newRating.status === 'PUBLISHED') {
    recalculateRatingAggregate(newRating.targetRole, newRating.targetEntityId);
  }

  // Audit Logging
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
  db.ratings[idx] = {
    ...db.ratings[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  if (updateData.status === 'PUBLISHED' && !db.ratings[idx].publishedAt) {
    db.ratings[idx].publishedAt = new Date().toISOString();
  }

  saveDb(db);

  recalculateRatingAggregate(db.ratings[idx].targetRole, db.ratings[idx].targetEntityId);

  logRatingAuditEvent({
    action: 'RATING_UPDATED',
    ratingId: id,
    previousState,
    newState: db.ratings[idx],
  });

  return db.ratings[idx];
}

function updateRatingStatus(id, newStatus, reason = '', adminUserId = null) {
  const db = getDb();
  db.ratings = db.ratings || [];
  const rating = db.ratings.find(r => r.id === id);
  if (!rating) return null;

  const previousState = { ...rating };
  rating.status = newStatus;
  rating.updatedAt = new Date().toISOString();
  if (newStatus === 'PUBLISHED' && !rating.publishedAt) {
    rating.publishedAt = new Date().toISOString();
  }

  saveDb(db);

  recalculateRatingAggregate(rating.targetRole, rating.targetEntityId);

  logRatingAuditEvent({
    action: `RATING_STATUS_${newStatus}`,
    ratingId: id,
    actorUserId: adminUserId,
    actorRole: 'ADMIN',
    reason,
    previousState,
    newState: rating,
  });

  return rating;
}

// 3. Categories
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

function getRatingCategoryByCode(code) {
  if (!code) return null;
  const categories = getRatingCategories();
  return categories.find(c => c.code === code) || null;
}

function createRatingCategory(categoryData) {
  const db = getDb();
  db.ratingCategories = db.ratingCategories || JSON.parse(JSON.stringify(DEFAULT_RATING_CATEGORIES));

  const existing = db.ratingCategories.find(c => c.code === categoryData.code);
  if (existing) throw new Error(`Category code ${categoryData.code} already exists.`);

  const now = new Date().toISOString();
  const newCat = {
    id: categoryData.id || `rcat_${categoryData.code.toLowerCase()}`,
    code: categoryData.code,
    name: categoryData.name,
    description: categoryData.description || '',
    targetRole: categoryData.targetRole,
    contextType: categoryData.contextType,
    minScore: categoryData.minScore || 1,
    maxScore: categoryData.maxScore || 5,
    weight: categoryData.weight || '1.00',
    displayOrder: categoryData.displayOrder || (db.ratingCategories.length + 1),
    isActive: categoryData.isActive !== undefined ? Boolean(categoryData.isActive) : true,
    createdAt: now,
    updatedAt: now,
  };

  db.ratingCategories.push(newCat);
  saveDb(db);
  return newCat;
}

function getRatingCategoryScores(ratingId) {
  if (!ratingId) return [];
  const db = getDb();
  const scores = db.ratingCategoryScores || [];
  return scores.filter(s => s.ratingId === ratingId);
}

function createRatingCategoryScore(scoreData) {
  const db = getDb();
  db.ratingCategoryScores = db.ratingCategoryScores || [];

  const newScore = {
    id: scoreData.id || `rcscore_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ratingId: scoreData.ratingId,
    categoryId: scoreData.categoryId,
    categoryCode: scoreData.categoryCode,
    score: scoreData.score,
    comment: scoreData.comment || '',
    createdAt: new Date().toISOString(),
  };

  db.ratingCategoryScores.push(newScore);
  saveDb(db);
  return newScore;
}

// 4. Responses
function getRatingResponse(ratingId) {
  if (!ratingId) return null;
  const db = getDb();
  const responses = db.ratingResponses || [];
  return responses.find(r => r.ratingId === ratingId) || null;
}

function createRatingResponse(responseData) {
  const db = getDb();
  db.ratingResponses = db.ratingResponses || [];

  const existing = db.ratingResponses.find(r => r.ratingId === responseData.ratingId);
  if (existing) throw new Error('Response already exists for this rating.');

  const now = new Date().toISOString();
  const newResp = {
    id: responseData.id || `rresp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ratingId: responseData.ratingId,
    responderUserId: responseData.responderUserId,
    responseText: responseData.responseText,
    status: responseData.status || 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };

  db.ratingResponses.push(newResp);
  saveDb(db);

  logRatingAuditEvent({
    action: 'RESPONSE_SUBMITTED',
    ratingId: newResp.ratingId,
    actorUserId: newResp.responderUserId,
    newState: newResp,
  });

  return newResp;
}

// 5. Reports
function getRatingReports(filter = {}) {
  const db = getDb();
  let reports = db.ratingReports || [];

  if (filter.ratingId) reports = reports.filter(r => r.ratingId === filter.ratingId);
  if (filter.reporterUserId) reports = reports.filter(r => r.reporterUserId === filter.reporterUserId);
  if (filter.status) reports = reports.filter(r => r.status === filter.status);

  return reports;
}

function createRatingReport(reportData) {
  const db = getDb();
  db.ratingReports = db.ratingReports || [];

  const now = new Date().toISOString();
  const newReport = {
    id: reportData.id || `rrep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ratingId: reportData.ratingId,
    reporterUserId: reportData.reporterUserId,
    reason: reportData.reason,
    details: reportData.details || '',
    status: 'PENDING',
    moderatorNotes: '',
    resolvedByAdminId: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.ratingReports.push(newReport);
  saveDb(db);

  logRatingAuditEvent({
    action: 'RATING_REPORTED',
    ratingId: newReport.ratingId,
    actorUserId: newReport.reporterUserId,
    reason: newReport.reason,
    newState: newReport,
  });

  return newReport;
}

function resolveRatingReport(id, resolutionData) {
  const db = getDb();
  db.ratingReports = db.ratingReports || [];
  const idx = db.ratingReports.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  db.ratingReports[idx] = {
    ...db.ratingReports[idx],
    status: resolutionData.status,
    moderatorNotes: resolutionData.moderatorNotes || db.ratingReports[idx].moderatorNotes,
    resolvedByAdminId: resolutionData.resolvedByAdminId,
    resolvedAt: now,
    updatedAt: now,
  };

  saveDb(db);

  logRatingAuditEvent({
    action: `REPORT_RESOLVED_${resolutionData.status}`,
    ratingId: db.ratingReports[idx].ratingId,
    actorUserId: resolutionData.resolvedByAdminId,
    actorRole: 'ADMIN',
    newState: db.ratingReports[idx],
  });

  return db.ratingReports[idx];
}

// 6. Appeals
function getRatingAppeals(filter = {}) {
  const db = getDb();
  let appeals = db.ratingAppeals || [];

  if (filter.ratingId) appeals = appeals.filter(a => a.ratingId === filter.ratingId);
  if (filter.appellantUserId) appeals = appeals.filter(a => a.appellantUserId === filter.appellantUserId);
  if (filter.status) appeals = appeals.filter(a => a.status === filter.status);

  return appeals;
}

function createRatingAppeal(appealData) {
  const db = getDb();
  db.ratingAppeals = db.ratingAppeals || [];

  const now = new Date().toISOString();
  const newAppeal = {
    id: appealData.id || `rapp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ratingId: appealData.ratingId,
    appellantUserId: appealData.appellantUserId,
    appealReason: appealData.appealReason,
    evidenceDocs: Array.isArray(appealData.evidenceDocs) ? appealData.evidenceDocs : [],
    status: 'PENDING_REVIEW',
    moderatorVerdict: '',
    reviewedByAdminId: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.ratingAppeals.push(newAppeal);
  saveDb(db);

  logRatingAuditEvent({
    action: 'APPEAL_FILED',
    ratingId: newAppeal.ratingId,
    actorUserId: newAppeal.appellantUserId,
    reason: newAppeal.appealReason,
    newState: newAppeal,
  });

  return newAppeal;
}

function resolveRatingAppeal(id, resolutionData) {
  const db = getDb();
  db.ratingAppeals = db.ratingAppeals || [];
  const idx = db.ratingAppeals.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  db.ratingAppeals[idx] = {
    ...db.ratingAppeals[idx],
    status: resolutionData.status,
    moderatorVerdict: resolutionData.moderatorVerdict || db.ratingAppeals[idx].moderatorVerdict,
    reviewedByAdminId: resolutionData.reviewedByAdminId,
    reviewedAt: now,
    updatedAt: now,
  };

  saveDb(db);

  logRatingAuditEvent({
    action: `APPEAL_RESOLVED_${resolutionData.status}`,
    ratingId: db.ratingAppeals[idx].ratingId,
    actorUserId: resolutionData.reviewedByAdminId,
    actorRole: 'ADMIN',
    newState: db.ratingAppeals[idx],
  });

  return db.ratingAppeals[idx];
}

// 7. Aggregates & Recalculation
function getRatingAggregate(targetRole, targetEntityId) {
  const db = getDb();
  const aggregates = db.ratingAggregates || [];
  const target = String(targetEntityId).trim();

  let agg = aggregates.find(a => a.targetRole === targetRole && a.targetEntityId === target);
  if (!agg && targetRole === 'STUDENT') {
    if (target.startsWith('stu_')) {
      agg = aggregates.find(a => a.targetRole === targetRole && a.targetEntityId === 'std_' + target.slice(4));
    } else if (target.startsWith('std_')) {
      agg = aggregates.find(a => a.targetRole === targetRole && a.targetEntityId === 'stu_' + target.slice(4));
    }
  }

  return agg || null;
}

function recalculateRatingAggregate(targetRole, targetEntityId) {
  const db = getDb();
  db.ratingAggregates = db.ratingAggregates || [];
  const target = String(targetEntityId).trim();

  // Find all published ratings for this target entity
  const targetRatings = (db.ratings || []).filter(r => {
    const matchesRole = r.targetRole === targetRole;
    const matchesEntity = r.targetEntityId === target ||
      (target.startsWith('std_') && r.targetEntityId === 'stu_' + target.slice(4)) ||
      (target.startsWith('stu_') && r.targetEntityId === 'std_' + target.slice(4));
    return matchesRole && matchesEntity && r.status === 'PUBLISHED';
  });

  const existingIdx = db.ratingAggregates.findIndex(a => {
    const matchesRole = a.targetRole === targetRole;
    const matchesEntity = a.targetEntityId === target ||
      (target.startsWith('std_') && a.targetEntityId === 'stu_' + target.slice(4)) ||
      (target.startsWith('stu_') && a.targetEntityId === 'std_' + target.slice(4));
    return matchesRole && matchesEntity;
  });

  const existingAgg = existingIdx !== -1 ? db.ratingAggregates[existingIdx] : null;

  // Compute breakdown stats
  const totalCount = targetRatings.length;
  const verifiedCount = targetRatings.filter(r => r.isVerified).length;
  const recommendedCount = targetRatings.filter(r => r.recommendation === 'RECOMMENDED').length;

  let averageScore = '0.00';
  let recommendationRate = '0.00';
  const scoreDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const contextBreakdown = {};
  const categoryScoresMap = {};

  if (totalCount > 0) {
    const totalScoreSum = targetRatings.reduce((sum, r) => sum + Number(r.overallScore || 0), 0);
    averageScore = (totalScoreSum / totalCount).toFixed(2);
    recommendationRate = ((recommendedCount / totalCount) * 100).toFixed(2);

    targetRatings.forEach(r => {
      // Score distribution (rounded to nearest star)
      const star = Math.max(1, Math.min(5, Math.round(Number(r.overallScore || 5))));
      scoreDistribution[String(star)] = (scoreDistribution[String(star)] || 0) + 1;

      // Context breakdown
      const ctx = r.contextType || 'GLOBAL';
      contextBreakdown[ctx] = (contextBreakdown[ctx] || 0) + 1;
    });

    // Category breakdown from ratingCategoryScores
    const ratingIds = new Set(targetRatings.map(r => r.id));
    const allCatScores = (db.ratingCategoryScores || []).filter(cs => ratingIds.has(cs.ratingId));

    allCatScores.forEach(cs => {
      if (!categoryScoresMap[cs.categoryCode]) {
        categoryScoresMap[cs.categoryCode] = { total: 0, count: 0 };
      }
      categoryScoresMap[cs.categoryCode].total += Number(cs.score);
      categoryScoresMap[cs.categoryCode].count += 1;
    });
  }

  const categoryBreakdown = {};
  for (const [code, data] of Object.entries(categoryScoresMap)) {
    categoryBreakdown[code] = Number((data.total / data.count).toFixed(2));
  }

  // Objective Skill Score calculation / preservation
  let objectiveSkillScore = existingAgg ? existingAgg.objectiveSkillScore : '0.00';
  if (targetRole === 'STUDENT') {
    const student = getStudentById(target);
    if (student && student.overallConfidenceScore !== undefined) {
      objectiveSkillScore = Number(student.overallConfidenceScore).toFixed(2);
    }
  }

  // Trust badge evaluation
  const avgNum = Number(averageScore);
  let verificationTrustLevel = 'UNVERIFIED';
  if (avgNum >= 4.8 && totalCount >= 5) {
    verificationTrustLevel = 'VERIFIED_EXCELLENCE';
  } else if (avgNum >= 4.5 && totalCount >= 3) {
    verificationTrustLevel = 'TOP_RATED';
  } else if (verifiedCount > 0) {
    verificationTrustLevel = 'VERIFIED';
  }

  const now = new Date().toISOString();
  const aggregateRecord = {
    id: existingAgg ? existingAgg.id : `ragg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    targetRole,
    targetEntityId: target,
    targetUserId: targetRatings[0]?.targetUserId || existingAgg?.targetUserId || null,
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
    createdAt: existingAgg ? existingAgg.createdAt : now,
    updatedAt: now,
  };

  if (existingIdx !== -1) {
    db.ratingAggregates[existingIdx] = aggregateRecord;
  } else {
    db.ratingAggregates.push(aggregateRecord);
  }

  saveDb(db);
  return aggregateRecord;
}

// 8. Policies
function getRatingPolicies() {
  const db = getDb();
  return db.ratingPolicies || DEFAULT_RATING_POLICIES;
}

function getRatingPolicyByContext(contextType) {
  const policies = getRatingPolicies();
  return policies.find(p => p.contextType === contextType) || null;
}

// 9. Audit Logs
function getRatingAuditLogs(filter = {}) {
  const db = getDb();
  let logs = db.ratingAuditLogs || [];

  if (filter.ratingId) logs = logs.filter(l => l.ratingId === filter.ratingId);
  if (filter.interactionId) logs = logs.filter(l => l.interactionId === filter.interactionId);
  if (filter.actorUserId) logs = logs.filter(l => l.actorUserId === filter.actorUserId);
  if (filter.action) logs = logs.filter(l => l.action === filter.action);

  return logs;
}

function logRatingAuditEvent(eventData) {
  const db = getDb();
  db.ratingAuditLogs = db.ratingAuditLogs || [];

  const newLog = {
    id: `ralog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ratingId: eventData.ratingId || null,
    interactionId: eventData.interactionId || null,
    actorUserId: eventData.actorUserId || null,
    actorRole: eventData.actorRole || null,
    action: eventData.action || 'RATING_ACTION',
    previousState: eventData.previousState || null,
    newState: eventData.newState || null,
    reason: eventData.reason || null,
    ipAddress: eventData.ipAddress || null,
    userAgent: eventData.userAgent || null,
    createdAt: new Date().toISOString(),
  };

  db.ratingAuditLogs.unshift(newLog);
  saveDb(db);
  return newLog;
}

module.exports = {
  getDb,
  saveDb,
  resetDb,
  resetDB: resetDb,
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getStudents,
  getStudentById,
  updateStudent,
  addStudentSkill,
  updateStudentSkill,
  removeStudentSkill,
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  verifyCompany,
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getApplications,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  getSkills,
  getSkillById,
  addSkill,
  updateSkill,
  addSkillAlias,
  getOntology,
  getAlerts,
  createAlert,
  getTrainingPrograms,
  getTrainingProgramById,
  createTrainingProgram,
  updateTrainingProgram,
  getFeedbackReports,
  submitFeedbackReport,
  submitFeedback: submitFeedbackReport,
  getAuditLogs,
  logAuditEvent,
  getSystemStats,

  // Rating & Reputation System Exports (R1)
  DEFAULT_RATING_CATEGORIES,
  DEFAULT_RATING_POLICIES,
  getRatingInteractions,
  getRatingInteractionById,
  findInteractionByReference,
  createRatingInteraction,
  updateRatingInteraction,
  getRatings,
  getRatingById,
  getRatingsForTarget,
  createRating,
  updateRating,
  updateRatingStatus,
  getRatingCategories,
  getRatingCategoryById,
  getRatingCategoryByCode,
  createRatingCategory,
  getRatingCategoryScores,
  createRatingCategoryScore,
  getRatingResponse,
  createRatingResponse,
  getRatingReports,
  createRatingReport,
  resolveRatingReport,
  getRatingAppeals,
  createRatingAppeal,
  resolveRatingAppeal,
  getRatingAggregate,
  recalculateRatingAggregate,
  recalculateProfileRatings: recalculateRatingAggregate,
  getRatingPolicies,
  getRatingPolicyByContext,
  getRatingAuditLogs,
  logRatingAuditEvent,
};
