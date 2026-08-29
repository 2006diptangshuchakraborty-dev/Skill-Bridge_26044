# Skill Verification & Proficiency Assessment System — Backend, Database & Security Survey

**Document ID**: SB-ARCH-SURVEY-02  
**Date**: 2026-08-24  
**Author**: Explorer 2 (Backend, Database & Security Specialist)  
**Target Repository**: \e:/sih_2026_044\  
**Milestone**: Milestone 1 (Discovery & Architecture Mapping)

---

## 1. Executive Summary & Codebase Architecture Baseline

The Skill Bridge platform is built on **Next.js 14.2.5 (App Router)** with a zero-trust backend architecture utilizing:
1. **Database & ORM**: **Drizzle ORM** (\drizzle-orm\ v1.0.0-rc.4) with **PostgreSQL / Neon Serverless** (\@neondatabase/serverless\, \pg\) with a resilient dual-mode data layer (\db/schema.js\, \db/index.js\) coupled with a high-fidelity in-memory/atomic JSON database engine (\lib/db.js\, \data/db.json\, \data/seed.json\).
2. **Authentication**: **Better Auth** (\etter-auth\ v1.7.1) with Google OAuth social login, short-lived cryptographic signup intents (\signup_intents\), role immutability ("One Google Account = One Role"), and strict admin registration prevention.
3. **Authorization & Security**: Higher-order API security guard (\lib/auth-guard.js\ -> \withAuth\), tenant resource ownership verification (IDOR protection), account status gating (\ACTIVE\, \PENDING\, \SUSPENDED\, \DEACTIVATED\), KYC organization capability gating, and Next.js Edge Middleware (\middleware.js\) for partitioned route protection (\/student/*\, \/organization/*\, \/recruiter/*\, \/admin/*\).
4. **Assessment & Skill Verification Engine**: Core engines in \lib/taxonomy.js\, \lib/questions.js\, \lib/assessment-engine.js\, and \lib/scoring-engine.js\ implementing full server-side validation, randomized exam generation, anti-cheating tracking with dynamic Integrity Risk Scores (100 -> 0), multi-dimensional scoring (5 dimensions), minimum competency thresholding, and unique cryptographic verification records (\SB-<SKILL>-<HASH>\).

---

## 2. Existing Database Architecture & Model Mapping

### 2.1 Database Setup & Storage Modes
- **Location**: \db/schema.js\, \db/index.js\, \lib/db.js\
- **Database Engine**: Dual-mode connection:
  - **Live Mode**: Neon Serverless PostgreSQL (\@neondatabase/serverless\) when \DATABASE_URL\ is present and active.
  - **Mock / Test Mode**: Conforms to Drizzle ORM query builders (\select\, \insert\, \update\, \delete\, \query\) backed by persistent atomic JSON file storage (\data/db.json\) and memory snapshots, enabling zero-external-dependency CI/CD and offline deterministic testing.

### 2.2 Core Existing Models in Drizzle Schema (\db/schema.js\)

| Table Name | Description | Key Fields | Constraints & Relations |
|---|---|---|---|
| \user\ | Core Better Auth user table with Skill Bridge extensions | \id\, \
ame\, \email\, \emailVerified\, \image\, \ole\, \ccountStatus\, \onboardingStatus\, \createdAt\, \updatedAt\ | PK: \id\, Unique: \email\, Enum: \userRoleEnum\, \ccountStatusEnum\, \onboardingStatusEnum\ |
| \session\ | Better Auth active sessions | \id\, \userId\, \	oken\, \expiresAt\, \ipAddress\, \userAgent\ | FK: \userId\ -> \user.id\ (cascade), Unique: \	oken\ |
| \ccount\ | OAuth / Social provider link | \id\, \userId\, \ccountId\, \providerId\, \ccessToken\, \efreshToken\ | FK: \userId\ -> \user.id\ (cascade), Unique: (\providerId\, \ccountId\) |
| \erification\ | Better Auth verification tokens | \id\, \identifier\, \alue\, \expiresAt\ | Unique: \identifier\ |
| \signup_intents\ | Cryptographic pre-OAuth role handshake | \id\, \	oken\, \ole\, \email\, \expiresAt\, \used\, \usedAt\ | Unique: \	oken\, Role: \STUDENT\ / \ORGANIZATION\ (No Admin) |
| \student_profile\ | 1:1 Student Profile | \id\, \userId\, \headline\, \io\, \instituteId\, \department\, \degree\, \yearOfStudy\, \cgpa\, \skills\ (jsonb), \projects\ (jsonb), \certifications\ (jsonb), \experience\ (jsonb), \profileCompletion\ | 1:1 Unique FK: \userId\ -> \user.id\ |
| \organization_profile\ | 1:1 Organization / Recruiter Profile | \id\, \userId\, \companyName\, \egistrationNumber\, \	axIdGstin\, \industry\, \erificationStatus\, \erificationDocs\ (jsonb), \erifiedByAdminId\, \profileCompletion\ | 1:1 Unique FK: \userId\ -> \user.id\, Unique: \egistrationNumber\ |
| \dmin_profile\ | 1:1 Admin Governance Profile | \id\, \userId\, \dminLevel\, \permissions\ (jsonb), \department\ | 1:1 Unique FK: \userId\ -> \user.id\ |
| \udit_logs\ | Immutable Security & Compliance Audit Log | \id\, \ctorUserId\, \ctorEmail\, \ctorRole\, \ction\, \	argetUserId\, \esourceType\, \esourceId\, \metadata\ (jsonb), \ipAddress\, \createdAt\ | Append-only, indexed on actor, action, timestamp |

---

## 3. Comprehensive Data Architecture Design for R1 - R7

To satisfy all requirements from **R1 to R7**, the data architecture is structured across 6 core sub-domains.

### 3.1 Domain 1: Skill Taxonomy & Skill Claiming System (R1)
- **Entities**:
  - \SkillCategory\ (\skill_categories\):
    - \id\: varchar PK (e.g. \cat_prog\, \cat_web\, \cat_db\, \cat_data\, \cat_aiml\, \cat_devops\, \cat_design\, \cat_biz\)
    - \
ame\: varchar (Programming, Web Development, Database, Data, AI/ML, Cloud/DevOps, Design, Business)
    - \slug\: varchar unique
    - \description\: text
    - \status\: varchar default 'ACTIVE' (\ACTIVE\, \INACTIVE\)
  - \Skill\ (\skills\):
    - \id\: varchar PK (e.g. \skill_python\, \skill_javascript\, \skill_sql\)
    - \
ame\: varchar (e.g. 'Python', 'React', 'PostgreSQL')
    - \slug\: varchar unique
    - \categoryId\: varchar FK -> \skill_categories.id\
    - \description\: text
    - \icon\: varchar (e.g. 'Code', 'Database', 'Cpu', 'Layers')
    - \status\: varchar default 'ACTIVE' (\ACTIVE\, \DEACTIVATED\)
    - \parentSkillId\: varchar nullable FK -> \skills.id\ (for skill hierarchies e.g., TypeScript -> JavaScript)
    - \liases\: jsonb default \[]\ (e.g. \["py", "python3", "python 3.x"]\)
  - \UserSkillClaim\ / \StudentSkill\ (embedded in \student_profile.skills\ & normalized):
    - \skillId\: varchar FK -> \skills.id\
    - \
ame\: varchar
    - \category\: varchar
    - \selfRatedLevel\: varchar (\Beginner\, \Intermediate\, \Advanced\, \Expert\)
    - \yearsExperience\: numeric
    - \projectCount\: integer
    - \certificates\: jsonb (array of { name, issuer, issueDate, url })
    - \portfolioUrl\: text / GitHub repository
    - \status\: varchar default \UNVERIFIED\ (\UNVERIFIED\, \VERIFIED\, \EXPIRED\, \REVOKED\)
    - \proficiency\: integer default 0 (0 = Unverified, 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Expert, 5 = Industry Verified)
    - \erificationId\: varchar nullable FK -> \skill_verifications.id\
    - \claimedAt\: timestamp

### 3.2 Domain 2: Question Bank & Multi-Dimension Question Schema (R2)
- **Entities**:
  - \Question\ (\questions\):
    - \id\: varchar PK (e.g. \q_py_001\)
    - \skillId\: varchar FK -> \skills.id\
    - \	opicId\: varchar (e.g. \undamentals\, \sync\, \memory-management\, \joins\)
    - \dimension\: varchar enum (\Conceptual Knowledge\, \Problem Solving\, \Practical Coding\, \Advanced Knowledge\, \Real-world Scenario\)
    - \questionType\: varchar enum:
      1. \Single MCQ\
      2. \Multiple-choice\
      3. \True/False\
      4. \Output prediction\
      5. \Debugging\
      6. \Code completion\
      7. \Short answer\
      8. \Coding challenge\
      9. \Scenario-based question\
      10. \Practical task\
    - \question\: text (supports Markdown and Code syntax blocks)
    - \options\: jsonb default \[]\ (array of option strings)
    - \correctAnswer\: jsonb (string, array of strings, or canonical code snippet)
    - \explanation\: text (server-side only, shown post-assessment)
    - \difficulty\: varchar enum (\Easy\, \Medium\, \Hard\, \Expert\)
    - \points\: integer (Easy: 1 pt, Medium: 2 pts, Hard: 3 pts, Expert: 4 pts)
    - \	imeLimit\: integer (seconds, e.g. 60 - 180s)
    - \	estCases\: jsonb default \[]\ (for coding challenges: array of \{ input, expected, isPublic, description }\)
    - \status\: varchar enum (\DRAFT\, \PENDING_REVIEW\, \APPROVED\, \PUBLISHED\, \ARCHIVED\) — *Only PUBLISHED questions are selected for live attempts*
    - \isAiGenerated\: boolean default false
    - \passRate\: numeric default 0.0
    - \vgTimeSeconds\: numeric default 0.0
    - \lagCount\: integer default 0
    - \createdAt\, \updatedAt\
  - \CodingSubmission\ (\coding_submissions\):
    - \id\: varchar PK
    - \ttemptId\: varchar FK -> \ssessment_attempts.id\
    - \questionId\: varchar FK -> \questions.id\
    - \studentId\: varchar FK -> \user.id\
    - \submittedCode\: text
    - \language\: varchar (e.g. \python\, \javascript\, \sql\)
    - \	estResults\: jsonb (array of \{ testCaseId, passed, actualOutput, executionTimeMs, memoryKb }\)
    - \passRatio\: numeric (e.g. 1.0 for 100% test pass)
    - \scoreEarned\: numeric
    - \createdAt\: timestamp

### 3.3 Domain 3: Server-Validated Assessment Attempt State Machine (R3)
- **State Machine Graph**:
  \NOT_STARTED\ -> \IN_PROGRESS\ -> (\SUBMITTED\ | \EXPIRED\) -> (\EVALUATED\ | \UNDER_REVIEW\ | \DISQUALIFIED\)
- **Entities**:
  - \AssessmentAttempt\ (\ssessment_attempts\):
    - \id\: varchar PK (e.g. \tt_1724458291_a9f2\)
    - \studentId\: varchar FK -> \user.id\
    - \skillId\: varchar FK -> \skills.id\
    - \skillName\: varchar
    - \claimedLevel\: varchar (\Beginner\, \Intermediate\, \Advanced\, \Expert\)
    - \status\: varchar enum (\NOT_STARTED\, \IN_PROGRESS\, \SUBMITTED\, \EXPIRED\, \EVALUATED\, \DISQUALIFIED\)
    - \startedAt\: timestamp
    - \expiresAt\: timestamp (strictly calculated on server as \startedAt + totalDurationSeconds\)
    - \submittedAt\: timestamp nullable
    - \durationSeconds\: integer (total allocated seconds)
    - \questions\: jsonb (sanitized array of questions with stripped answers & explanations)
    - \nswers\: jsonb (map of \questionId -> { answer, timeSpentSeconds, answeredAt, isFlagged }\)
    - \ntiCheating\: jsonb:
      - \	abSwitchCount\: integer
      - \ocusLossCount\: integer
      - \copyPasteCount\: integer
      - \ullscreenExitCount\: integer
      - \integrityScore\: integer (starts at 100, drops with violations)
      - \eviewStatus\: varchar enum (\CLEAN\, \UNDER_REVIEW\, \DISQUALIFIED\)
      - \events\: array of \{ type, details, timestamp }\
    - \score\: numeric nullable (0 - 100)
    - \percentage\: numeric nullable
    - \proficiencyLevel\: varchar nullable
    - \dimensionBreakdown\: jsonb nullable (scores per dimension)
    - \createdAt\, \updatedAt\

### 3.4 Domain 4: Multi-Dimensional Scoring Engine & Verification Records (R4 & R5)
- **Scoring Dimensions & Weights**:
  - **Conceptual Knowledge**: 30%
  - **Problem Solving**: 20%
  - **Practical Coding / Tasks**: 30%
  - **Advanced Knowledge**: 10%
  - **Real-World Scenarios**: 10%
- **Minimum Competency Matrix**:
  | Proficiency Level | Minimum Overall Score | Minimum Practical Coding Score | Minimum Conceptual Knowledge Score |
  |---|---|---|---|
  | **Expert (Level 4)** | $\ge 90\%$ | $\ge 80\%$ | $\ge 80\%$ |
  | **Advanced (Level 3)** | $\ge 75\%$ | $\ge 65\%$ | $\ge 70\%$ |
  | **Intermediate (Level 2)** | $\ge 60\%$ | $\ge 50\%$ | $\ge 60\%$ |
  | **Beginner (Level 1)** | $\ge 40\%$ | N/A ($\ge 0\%$) | $\ge 40\%$ |
  | **Unverified (Level 0)** | $< 40\%$ | Failed Thresholds | Failed Thresholds |
- **Retake Governance**:
  - Maximum Attempts: 3 per skill
  - Cooldown Period: 7 days between attempts
  - Historical progress tracking stored across attempts with versioning
- **Entities**:
  - \SkillVerification\ (\skill_verifications\):
    - \id\: varchar PK (format: \SB-<SKILL_SLUG>-<5_CHAR_UPPER_HASH>\, e.g. \SB-PYTH-8F72K\, \SB-JS-K92ML\)
    - \studentId\: varchar FK -> \user.id\
    - \skillId\: varchar FK -> \skills.id\
    - \skillName\: varchar
    - \overallScore\: integer (0 - 100)
    - \level\: varchar (\Beginner\, \Intermediate\, \Advanced\, \Expert\)
    - \levelNum\: integer (1 to 4)
    - \confidence\: varchar enum (\Low\, \Medium\, \High\, \Very High\)
      - Low: Score < 60% or theoretical only
      - Medium: Standard assessment passed
      - High: Passed with Practical Coding $\ge 75\%$ + Overall $\ge 75\%$
      - Very High: High assessment + verified portfolio/GitHub evidence attachments
    - \status\: varchar enum (\VERIFIED\, \UNVERIFIED\, \EXPIRED\, \REVOKED\)
    - \ttemptId\: varchar FK -> \ssessment_attempts.id\
    - \reakdown\: jsonb (scores across 5 dimensions)
    - \integrityScore\: integer
    - \evidenceAttachments\: jsonb default \[]\ (array of \{ type, url, title, verifiedByAdmin }\)
    - \erifiedAt\: timestamp
    - \expiresAt\: timestamp (1 year validity)

### 3.5 Domain 5: Recruiter Matching & Verified Skill Criteria (R6)
- **Integration with \lib/engine.js\ & Candidate Browser**:
  - Opportunities can define:
    - \equiredSkills\: \[{ skillId, canonicalName, requiredProficiency: 1-4, minimumScore: 70, requireVerified: true }]\
    - \preferredSkills\: \[{ skillId, canonicalName, requiredProficiency: 1-4, minimumScore: 60 }]\
  - Matching Engine prioritizes verified skills:
    - Verified Level $\ge$ Required Level $\implies$ Full credit + Confidence Boost
    - Unverified Skill with Self-Declared Level $\implies$ Eligible with unverified penalty flag
    - Score boost formula: $+15\%$ confidence score weight for candidates with verified badges.

### 3.6 Domain 6: AI Generation & Upskilling Recommendations (R7)
- **Admin AI Generation**:
  - \POST /api/admin/questions\ with \{ action: 'GENERATE_AI', skillId, topic, difficulty }\
  - Generates \DRAFT\ question with suggested options, correct answer, code snippet, and explanation for admin review & one-click publish.
- **Post-Assessment AI Recommendations**:
  - Computed deterministically and returned on \POST /api/assessments/[attemptId]/submit\
  - Identifies specific weak topics (e.g. async/await, closures, indexing) where score $< 70\%$ and provides actionable practice tasks.

---

## 4. Complete Drizzle ORM Schema Specification

The Drizzle ORM schema is enhanced to include the full verification, taxonomy, and question bank modules:

\\\javascript
// db/schema.js (Extensions for Skill Verification & Assessment)

const {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
} = require('drizzle-orm/pg-core');

// Enums
const questionTypeEnum = pgEnum('question_type', [
  'SINGLE_MCQ',
  'MULTI_CHOICE',
  'TRUE_FALSE',
  'OUTPUT_PREDICTION',
  'DEBUGGING',
  'CODE_COMPLETION',
  'SHORT_ANSWER',
  'CODING_CHALLENGE',
  'SCENARIO_BASED',
  'PRACTICAL_TASK'
]);

const questionStatusEnum = pgEnum('question_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
]);

const attemptStatusEnum = pgEnum('attempt_status', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'EXPIRED',
  'EVALUATED',
  'DISQUALIFIED'
]);

const verificationStatusEnum = pgEnum('verification_status_type', [
  'VERIFIED',
  'UNVERIFIED',
  'EXPIRED',
  'REVOKED'
]);

// 1. Skill Categories
const skillCategories = pgTable('skill_categories', {
  id: text('id').primaryKey(), // cat_prog, cat_web, etc.
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  status: text('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// 2. Skills
const skills = pgTable('skills', {
  id: text('id').primaryKey(), // skill_python, skill_javascript, etc.
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  categoryId: text('category_id').notNull().references(() => skillCategories.id),
  description: text('description'),
  icon: text('icon').default('Code').notNull(),
  status: text('status').default('ACTIVE').notNull(),
  parentSkillId: text('parent_skill_id'),
  aliases: jsonb('aliases').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('skills_slug_idx').on(table.slug),
  categoryIdx: index('skills_category_idx').on(table.categoryId),
}));

// 3. Question Bank
const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  skillId: text('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  topicId: text('topic_id').default('general').notNull(),
  dimension: text('dimension').default('Conceptual Knowledge').notNull(),
  questionType: text('question_type').default('Single MCQ').notNull(),
  question: text('question').notNull(),
  options: jsonb('options').default([]).notNull(),
  correctAnswer: jsonb('correct_answer').notNull(),
  explanation: text('explanation'),
  difficulty: text('difficulty').default('Medium').notNull(),
  points: integer('points').default(2).notNull(),
  timeLimit: integer('time_limit').default(90).notNull(),
  testCases: jsonb('test_cases').default([]).notNull(),
  status: text('status').default('DRAFT').notNull(),
  isAiGenerated: boolean('is_ai_generated').default(false).notNull(),
  passRate: numeric('pass_rate').default('0.0'),
  avgTimeSeconds: numeric('avg_time_seconds').default('0.0'),
  flagCount: integer('flag_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  skillIdx: index('questions_skill_idx').on(table.skillId),
  statusIdx: index('questions_status_idx').on(table.status),
  difficultyIdx: index('questions_difficulty_idx').on(table.difficulty),
}));

// 4. Assessment Attempts
const assessmentAttempts = pgTable('assessment_attempts', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  skillName: text('skill_name').notNull(),
  claimedLevel: text('claimed_level').default('Intermediate').notNull(),
  status: text('status').default('IN_PROGRESS').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }),
  durationSeconds: integer('duration_seconds').notNull(),
  questions: jsonb('questions').notNull(),
  answers: jsonb('answers').default({}).notNull(),
  antiCheating: jsonb('anti_cheating').default({
    tabSwitchCount: 0,
    focusLossCount: 0,
    copyPasteCount: 0,
    fullscreenExitCount: 0,
    events: [],
    integrityScore: 100,
    reviewStatus: 'CLEAN',
  }).notNull(),
  score: integer('score'),
  percentage: integer('percentage'),
  proficiencyLevel: text('proficiency_level'),
  dimensionBreakdown: jsonb('dimension_breakdown'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  studentIdx: index('assessment_attempts_student_idx').on(table.studentId),
  skillIdx: index('assessment_attempts_skill_idx').on(table.skillId),
  statusIdx: index('assessment_attempts_status_idx').on(table.status),
}));

// 5. Skill Verifications (Badges & Public Verification Records)
const skillVerifications = pgTable('skill_verifications', {
  id: text('id').primaryKey(), // SB-PYTH-8F72K
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  skillName: text('skill_name').notNull(),
  overallScore: integer('overall_score').notNull(),
  level: text('level').notNull(), // Beginner, Intermediate, Advanced, Expert
  levelNum: integer('level_num').notNull(), // 1 - 4
  confidence: text('confidence').default('Medium').notNull(), // Low, Medium, High, Very High
  status: text('status').default('VERIFIED').notNull(),
  attemptId: text('attempt_id').references(() => assessmentAttempts.id, { onDelete: 'set null' }),
  breakdown: jsonb('breakdown').notNull(),
  integrityScore: integer('integrity_score').default(100).notNull(),
  evidenceAttachments: jsonb('evidence_attachments').default([]).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
  studentIdx: index('skill_verifications_student_idx').on(table.studentId),
  skillIdx: index('skill_verifications_skill_idx').on(table.skillId),
  statusIdx: index('skill_verifications_status_idx').on(table.status),
}));
\\\

---

## 5. API Routing Catalog & Security Contracts

All protected APIs use \withAuth(handler, { roles: [...] })\ in \lib/auth-guard.js\.

| Endpoint | Method | Allowed Roles | Request Body / Params | Response Structure | Security & Validation |
|---|---|---|---|---|---|
| \/api/skills\ | GET | PUBLIC | Query: \categoryId\, \search\ | \{ success: true, skills: [...] }\ | Open read, sanitized fields |
| \/api/skills/claim\ | GET | STUDENT, ADMIN | None | \{ success: true, skills: [...] }\ | IDOR check, returns student's claimed skills |
| \/api/skills/claim\ | POST | STUDENT, ADMIN | \{ skillId, selfRatedLevel, yearsExperience, projectCount, certificates, portfolioUrl }\ | \{ success: true, skill: {...} }\ | Validates skill exists in taxonomy; marks as \UNVERIFIED\ |
| \/api/assessments/start\ | POST | STUDENT, ADMIN | \{ skillId, claimedLevel }\ | \{ success: true, attemptId, attempt }\ | Randomizes published questions, strips answers/explanations, sets strict server \expiresAt\ |
| \/api/assessments/[attemptId]\ | GET | STUDENT, ADMIN | URL param: \ttemptId\ | \{ success: true, attempt: {...} }\ | Verifies user ownership (IDOR defense); validates server timer expiry |
| \/api/assessments/[attemptId]\ | POST | STUDENT, ADMIN | \{ action: 'RECORD_ANSWER' \| 'RECORD_EVENT', ... }\ | \{ success: true, ... }\ | Records answers or anti-cheating violations; updates Integrity Risk Score |
| \/api/assessments/[attemptId]/submit\ | POST | STUDENT, ADMIN | URL param: \ttemptId\ | \{ success: true, result: { attempt, verification, recommendations } }\ | Server-side evaluation, applies minimum competency rules, issues unique \SB-*\ verification ID |
| \/api/verify/[verificationId]\ | GET | PUBLIC | URL param: \erificationId\ | \{ success: true, verification: {...} }\ | Publicly safe view (strips PII, student email, and exam questions) |
| \/api/admin/questions\ | GET | ADMIN | Query: \skillId\, \status\ | \{ success: true, questions: [...] }\ | Role restricted: ADMIN only |
| \/api/admin/questions\ | POST | ADMIN | \{ action: 'GENERATE_AI' \| 'SAVE', questionData }\ | \{ success: true, question: {...} }\ | Creates AI draft or updates question bank; validates schema |
| \/api/admin/ontology\ | POST | ADMIN | \{ action: 'SAVE_SKILL' \| 'DEACTIVATE', skillData }\ | \{ success: true, skill: {...} }\ | Manages categories and skills taxonomy |

---

## 6. Verification & Automated Test Strategy

The verification subsystem is validated by automated test suites:

1. **\	ests/test-verification-system.js\** (8 Test Cases, 100% Pass):
   - **V01**: Taxonomy Categories (8 core domains).
   - **V02**: Skill slug & alias mapping.
   - **V03**: Question bank metadata & dimension validation.
   - **V04**: AI question draft generation (\DRAFT\ status).
   - **V05**: Assessment attempt initialization (\IN_PROGRESS\ state).
   - **V06**: Anti-cheating telemetry & Integrity Score penalty.
   - **V07**: Multidimensional scoring engine & minimum competency thresholds.
   - **V08**: Public verification retrieval & zero-PII leak protection.

2. **\	ests/test-auth-suite.js\** (30 Test Cases, 100% Pass):
   - Auth, role immutability, 1:1 profile relations, KYC gating, Edge middleware, IDOR protection.

3. **\scripts/test-matching-rules.js\** (13 Test Cases, 100% Pass):
   - Priority-aware matching rules, alias normalization, composite scoring math.

---

## 7. Next Steps & Recommendations for Implementation Track

1. **Schema Migration**: Run Drizzle migrations or ensure in-memory JSON DB models stay strictly synchronized with \db/schema.js\.
2. **Coding Sandbox**: Integrate a secure sandboxed execution runner (or WebAssembly / worker-based runner) for \Coding challenge\ test case evaluations.
3. **Frontend Integration**: Bind student portal assessment runner (\/student/assessments/[attemptId]\) and public badge page (\/verify/[verificationId]\) to the tested API endpoints.
