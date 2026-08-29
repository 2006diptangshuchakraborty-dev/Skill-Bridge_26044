# Schema & Relationship Specification Audit Report

**Date**: 2026-08-26  
**Auditor**: Schema & Relationship Spec Miner (`spec_miner_survey_schema`)  
**Scope**: Complete database schema audit across Drizzle ORM, PostgreSQL / Neon, Better Auth, and fallback data layers.

---

## 1. Executive Summary & Critical Findings

A forensic audit of the repository database layer was conducted across all schema definition files (`db/schema/*.js`), Drizzle configurations (`drizzle.config.js`), database entry points (`db/index.js`), migration snapshots (`drizzle/**`), and Better Auth configurations (`lib/auth.js`).

### Critical Observations:
1. **Broken Schema File Stubs**: 5 out of 6 modular schema files (`db/schema/user.js`, `db/schema/student.js`, `db/schema/industry.js`, `db/schema/institute.js`, `db/schema/ratings.js`) currently attempt to require `../schema.js` (`const schema = require("../schema.js");`), but `db/schema.js` was deleted. As a result, importing any of these files throws a fatal `Cannot find module '../schema.js'` error.
2. **Only One Concrete Schema File**: `db/schema/questions.js` is the only schema file that currently defines a concrete `pgTable` (`questions`).
3. **Missing Schema Aggregator (`db/schema/index.js`)**: The root schema aggregator `db/schema/index.js` does not exist on disk, causing all runtime imports from `@/db` or `require('../db/schema')` to fail.
4. **Driver Disconnection in `db/index.js`**: `db/index.js` has its legacy connection logic and mock schema builder commented out (lines 1–638), exporting only a bare `export const db = drizzle(sql);` without passing `{ schema }`, which breaks Drizzle relational query builder (`db.query.*`).
5. **Full Schema Snapshot Recoverable**: The full 21-table PostgreSQL schema is completely preserved in Drizzle migration snapshots (`drizzle/20260826155818_steady_rictor/snapshot.json` and migration SQLs). All 21 tables, 13 PostgreSQL enums, indexes, and cascades have been reverse-engineered and cataloged below.

---

## 2. Table-by-Table Comprehensive Schema Inventory

The platform requires exactly **21 tables** and **13 PostgreSQL enums** across 6 domain schema modules:

### Summary Table

| # | Domain Module | Exported Model | DB Table Name | PK Column & Type | Foreign Keys & Cascades | Status in Codebase |
|---|---|---|---|---|---|---|
| 1 | `user.js` | `users` / `user` | `user` | `id` (text) | None | Broken stub (`require('../schema.js')`) |
| 2 | `user.js` | `sessions` / `session` | `session` | `id` (text) | `userId` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 3 | `user.js` | `accounts` / `account` | `account` | `id` (text) | `userId` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 4 | `user.js` | `verifications` / `verification` | `verification` | `id` (text) | None | Broken stub (`require('../schema.js')`) |
| 5 | `user.js` | `signupIntents` / `signup_intents` | `signup_intents` | `id` (text) | None | Broken stub (`require('../schema.js')`) |
| 6 | `user.js` | `adminProfiles` / `admin_profile` | `admin_profile` | `id` (text) | `user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 7 | `user.js` | `auditLogs` / `audit_logs` | `audit_logs` | `id` (text) | `actor_user_id` -> `user.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 8 | `student.js` | `studentProfiles` / `studentTable` | `student_profile` | `id` (text) | `user_id` -> `user.id` (CASCADE), `institute_id` -> `institute.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 9 | `industry.js` | `organizationProfiles` / `industryTable` | `organization_profile` | `id` (text) | `user_id` -> `user.id` (CASCADE), `verified_by_admin_id` -> `user.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 10 | `institute.js` | `instituteProfiles` / `instituteTable` | `institute` | `id` (text) | `user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 11 | `questions.js` | `questionTable` / `questions` | `questions` | `question_code` (varchar 255) | None | Implemented (`pgTable`) |
| 12 | `ratings.js` | `ratingInteractions` | `rating_interactions` | `id` (text) | `initiator_user_id` -> `user.id` (CASCADE), `target_user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 13 | `ratings.js` | `ratings` | `ratings` | `id` (text) | `interaction_id` -> `rating_interactions.id` (CASCADE), `reviewer_user_id` -> `user.id` (CASCADE), `target_user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 14 | `ratings.js` | `ratingCategories` | `rating_categories` | `id` (text) | None | Broken stub (`require('../schema.js')`) |
| 15 | `ratings.js` | `ratingCategoryScores` | `rating_category_scores` | `id` (text) | `rating_id` -> `ratings.id` (CASCADE), `category_id` -> `rating_categories.id` (RESTRICT) | Broken stub (`require('../schema.js')`) |
| 16 | `ratings.js` | `ratingResponses` | `rating_responses` | `id` (text) | `rating_id` -> `ratings.id` (CASCADE), `responder_user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 17 | `ratings.js` | `ratingReports` | `rating_reports` | `id` (text) | `rating_id` -> `ratings.id` (CASCADE), `reporter_user_id` -> `user.id` (CASCADE), `resolved_by_admin_id` -> `user.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 18 | `ratings.js` | `ratingAppeals` | `rating_appeals` | `id` (text) | `rating_id` -> `ratings.id` (CASCADE), `appellant_user_id` -> `user.id` (CASCADE), `reviewed_by_admin_id` -> `user.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 19 | `ratings.js` | `ratingAuditLogs` | `rating_audit_logs` | `id` (text) | `actor_user_id` -> `user.id` (SET NULL) | Broken stub (`require('../schema.js')`) |
| 20 | `ratings.js` | `ratingAggregates` | `rating_aggregates` | `id` (text) | `target_user_id` -> `user.id` (CASCADE) | Broken stub (`require('../schema.js')`) |
| 21 | `ratings.js` | `ratingPolicies` | `rating_policies` | `id` (text) | None | Broken stub (`require('../schema.js')`) |

---

## 3. Detailed Column-by-Column Specification per File

### 3.1 `db/schema/user.js`

Contains core Better Auth tables, governance enums, admin profiles, and audit log models.

#### PostgreSQL Enums:
- `user_role`: `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']`
- `account_status`: `['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']`
- `onboarding_status`: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`
- `org_verification_status`: `['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']`
- `audit_action`: `['LOGIN', 'LOGOUT', 'ACCOUNT_CREATED', 'ROLE_ASSIGNED', 'ROLE_REJECTED_MISMATCH', 'ORGANIZATION_SUBMITTED', 'ORGANIZATION_APPROVED', 'ORGANIZATION_REJECTED', 'ORGANIZATION_INFO_REQUESTED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'PROFILE_UPDATED', 'OPPORTUNITY_GATED_ATTEMPT', 'CAPABILITY_VIOLATION_BLOCKED', 'ROLE_COLLISION_BLOCKED']`

#### Tables:
1. **`user` (`users`)**:
   - `id`: `text('id').primaryKey()`
   - `name`: `text('name').notNull()`
   - `email`: `text('email').notNull()`
   - `emailVerified`: `boolean('emailVerified').default(false).notNull()`
   - `image`: `text('image')`
   - `role`: `userRoleEnum('role').default('STUDENT').notNull()`
   - `accountStatus`: `accountStatusEnum('account_status').default('ACTIVE').notNull()`
   - `onboardingStatus`: `onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull()`
   - `lastLoginAt`: `timestamp('last_login_at', { withTimezone: true, mode: 'date' })`
   - `profileCompleted`: `boolean('profile_completed').default(false).notNull()`
   - `createdAt`: `timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `index('user_email_idx').on(table.email)`, `index('user_role_idx').on(table.role)`, `index('user_status_idx').on(table.accountStatus)`

2. **`session` (`sessions`)**:
   - `id`: `text('id').primaryKey()`
   - `userId`: `text('userId').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `token`: `text('token').notNull().unique()`
   - `expiresAt`: `timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull()`
   - `ipAddress`: `text('ipAddress')`
   - `userAgent`: `text('userAgent')`
   - `createdAt`: `timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `index('session_user_idx').on(table.userId)`, `uniqueIndex('session_token_idx').on(table.token)`, `index('session_expires_idx').on(table.expiresAt)`

3. **`account` (`accounts`)**:
   - `id`: `text('id').primaryKey()`
   - `userId`: `text('userId').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `accountId`: `text('accountId').notNull()`
   - `providerId`: `text('providerId').notNull()`
   - `accessToken`: `text('accessToken')`
   - `refreshToken`: `text('refreshToken')`
   - `accessTokenExpiresAt`: `timestamp('accessTokenExpiresAt', { withTimezone: true, mode: 'date' })`
   - `refreshTokenExpiresAt`: `timestamp('refreshTokenExpiresAt', { withTimezone: true, mode: 'date' })`
   - `scope`: `text('scope')`
   - `idToken`: `text('idToken')`
   - `password`: `text('password')`
   - `createdAt`: `timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `uniqueIndex('account_provider_account_idx').on(table.providerId, table.accountId)`, `index('account_user_idx').on(table.userId)`

4. **`verification` (`verifications`)**:
   - `id`: `text('id').primaryKey()`
   - `identifier`: `text('identifier').notNull()`
   - `value`: `text('value').notNull()`
   - `expiresAt`: `timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull()`
   - `createdAt`: `timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `index('verification_identifier_idx').on(table.identifier)`

5. **`signup_intents` (`signupIntents`)**:
   - `id`: `text('id').primaryKey()`
   - `token`: `text('token').notNull()`
   - `role`: `userRoleEnum('role').notNull()`
   - `email`: `text('email')`
   - `expiresAt`: `timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()`
   - `used`: `boolean('used').default(false).notNull()`
   - `usedAt`: `timestamp('used_at', { withTimezone: true, mode: 'date' })`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `uniqueIndex('signup_intents_token_idx').on(table.token)`, `index('signup_intents_expires_idx').on(table.expiresAt)`

6. **`admin_profile` (`adminProfiles`)**:
   - `id`: `text('id').primaryKey()`
   - `userId`: `text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
   - `adminLevel`: `text('admin_level').default('SUPER_ADMIN').notNull()`
   - `permissions`: `jsonb('permissions').default(['ALL', 'VERIFY_ORGANIZATIONS', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'SYSTEM_CONFIG']).notNull()`
   - `department`: `text('department').default('Platform Governance').notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `uniqueIndex('admin_profile_user_idx').on(table.userId)`

7. **`audit_logs` (`auditLogs`)**:
   - `id`: `text('id').primaryKey()`
   - `actorUserId`: `text('actor_user_id').references(() => users.id, { onDelete: 'set null' })`
   - `actorEmail`: `text('actor_email')`
   - `actorRole`: `text('actor_role')`
   - `action`: `text('action').notNull()`
   - `targetUserId`: `text('target_user_id')`
   - `resourceType`: `text('resource_type')`
   - `resourceId`: `text('resource_id')`
   - `metadata`: `jsonb('metadata').default({}).notNull()`
   - `ipAddress`: `text('ip_address')`
   - `userAgent`: `text('user_agent')`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**: `index('audit_logs_actor_idx').on(table.actorUserId)`, `index('audit_logs_action_idx').on(table.action)`, `index('audit_logs_created_idx').on(table.createdAt)`, `index('audit_logs_target_idx').on(table.targetUserId)`

---

### 3.2 `db/schema/student.js`

Contains student profile definition with foreign key references to `users` and `institute`.

#### Table:
**`student_profile` (`studentProfiles` / `studentTable`)**:
- `id`: `text('id').primaryKey()`
- `userId`: `text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
- `fullName`: `text('fullName').notNull()`
- `phone`: `text('phone')`
- `email`: `text('email').notNull()`
- `headline`: `text('headline')`
- `bio`: `text('bio')`
- `instituteName`: `text('institute_name')`
- `instituteId`: `text('institute_id').references(() => instituteProfiles.id, { onDelete: 'set null' })`
- `degree`: `text('degree')`
- `department`: `text('department')`
- `graduationYear`: `integer('graduation_year')`
- `yearOfStudy`: `text('year_of_study')`
- `cgpa`: `text('cgpa')`
- `skills`: `jsonb('skills').default([]).notNull()`
- `projects`: `jsonb('projects').default([]).notNull()`
- `certifications`: `jsonb('certifications').default([]).notNull()`
- `experience`: `jsonb('experience').default([]).notNull()`
- `github`: `text('github')`
- `linkedin`: `text('linkedin')`
- `hobby`: `text('hobby')`
- `careerPreferences`: `jsonb('career_preferences').default({}).notNull()`
- `profileCompletion`: `integer('profile_completion').default(0).notNull()`
- `currentOnboardingStep`: `integer('current_onboarding_step').default(1).notNull()`
- `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- **Indexes**:
  - `uniqueIndex('student_profile_user_idx').on(table.userId)`
  - `index('student_profile_institute_idx').on(table.instituteName)`
  - `index('student_profile_dept_idx').on(table.department)`

---

### 3.3 `db/schema/industry.js`

Contains industry organization profile definition with verification fields and foreign keys.

#### Table:
**`organization_profile` (`organizationProfiles` / `industryTable`)**:
- `id`: `text('id').primaryKey()`
- `userId`: `text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
- `companyName`: `text('company_name').notNull()`
- `registrationNumber`: `text('registration_number').unique()`
- `taxIdGstin`: `text('tax_id_gstin')`
- `companyType`: `text('company_type')`
- `industry`: `text('industry')`
- `companySize`: `text('company_size')`
- `website`: `text('website')`
- `logoUrl`: `text('logo_url')`
- `contactPhone`: `text('contact_phone')`
- `address`: `jsonb('address').default({}).notNull()`
- `primaryContactName`: `text('primary_contact_name')`
- `primaryContactPhone`: `text('primary_contact_phone')`
- `primaryContactDesignation`: `text('primary_contact_designation')`
- `documents`: `jsonb('documents').default([]).notNull()`
- `verificationDocs`: `jsonb('verification_docs').default([]).notNull()`
- `hiringPreferences`: `jsonb('hiring_preferences').default({}).notNull()`
- `verificationStatus`: `orgVerificationStatusEnum('verification_status').default('PENDING').notNull()`
- `verificationNotes`: `text('verification_notes')`
- `adminNotes`: `text('admin_notes')`
- `verifiedByAdminId`: `text('verified_by_admin_id').references(() => users.id, { onDelete: 'set null' })`
- `verifiedAt`: `timestamp('verified_at', { withTimezone: true, mode: 'date' })`
- `profileCompletion`: `integer('profile_completion').default(0).notNull()`
- `currentOnboardingStep`: `integer('current_onboarding_step').default(1).notNull()`
- `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- **Indexes**:
  - `uniqueIndex('organization_profile_user_idx').on(table.userId)`
  - `uniqueIndex('organization_profile_reg_idx').on(table.registrationNumber)`
  - `index('organization_profile_status_idx').on(table.verificationStatus)`

---

### 3.4 `db/schema/institute.js`

Contains academic institute profile definition and verification fields.

#### Table:
**`institute` (`instituteProfiles` / `instituteTable`)**:
- `id`: `text('id').primaryKey()`
- `userId`: `text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' })`
- `instituteName`: `text('institute_name').notNull()`
- `instituteCode`: `text('institute_code').unique()`
- `instituteType`: `text('institute_type')`
- `address`: `jsonb('address').default({}).notNull()`
- `website`: `text('website')`
- `logoUrl`: `text('logo_url')`
- `contactPhone`: `text('contact_phone')`
- `officialEmail`: `text('official_email')`
- `departments`: `jsonb('departments').default([]).notNull()`
- `placementContact`: `jsonb('placement_contact').default({}).notNull()`
- `verificationStatus`: `orgVerificationStatusEnum('verification_status').default('PENDING').notNull()`
- `verificationDocs`: `jsonb('verification_docs').default([]).notNull()`
- `profileCompletion`: `integer('profile_completion').default(0).notNull()`
- `currentOnboardingStep`: `integer('current_onboarding_step').default(1).notNull()`
- `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
- **Indexes**:
  - `uniqueIndex('institute_profile_user_idx').on(table.userId)`
  - `uniqueIndex('institute_profile_code_idx').on(table.instituteCode)`
  - `index('institute_profile_status_idx').on(table.verificationStatus)`

---

### 3.5 `db/schema/questions.js`

Contains assessment questions bank schema (already implemented in repository).

#### Table:
**`questions` (`questionTable` / `questions`)**:
- `question_code`: `varchar('question_code', { length: 255 }).primaryKey()`
- `field`: `varchar('field', { length: 255 }).notNull()`
- `exam`: `varchar('exam', { length: 255 }).notNull()`
- `subject`: `varchar('subject', { length: 255 }).notNull()`
- `chapter`: `varchar('chapter', { length: 255 }).notNull()`
- `topic`: `varchar('topic', { length: 255 }).notNull()`
- `subtopic`: `varchar('subtopic', { length: 255 }).notNull()`
- `exam_date`: `varchar('exam_date', { length: 255 }).notNull()`
- `exam_shift`: `varchar('exam_shift', { length: 255 }).notNull()`
- `question_type`: `varchar('question_type', { length: 255 }).notNull()`
- `difficulty`: `varchar('difficulty', { length: 255 }).notNull()`
- `marks`: `integer('marks').notNull()`
- `negative_marks`: `doublePrecision('negative_marks').notNull()`
- `question_statement`: `text('question_statement').notNull()`
- `question_img_url_1`: `varchar('question_img_url_1', { length: 255 })`
- `question_img_url_2`: `varchar('question_img_url_2', { length: 255 })`
- `question_img_url_3`: `varchar('question_img_url_3', { length: 255 })`
- `option_a`: `text('option_a').notNull()`
- `option_a_img_url`: `varchar('option_a_img_url', { length: 255 })`
- `option_b`: `text('option_b').notNull()`
- `option_b_img_url`: `varchar('option_b_img_url', { length: 255 })`
- `option_c`: `text('option_c').notNull()`
- `option_c_img_url`: `varchar('option_c_img_url', { length: 255 })`
- `option_d`: `text('option_d').notNull()`
- `option_d_img_url`: `varchar('option_d_img_url', { length: 255 })`
- `option_e`: `text('option_e')`
- `option_e_img_url`: `varchar('option_e_img_url', { length: 255 })`
- `option_f`: `text('option_f')`
- `option_f_img_url`: `varchar('option_f_img_url', { length: 255 })`
- `correct_answer`: `varchar('correct_answer', { length: 255 }).notNull()`
- `numerical_answer`: `integer('numerical_answer')`
- `solution_text`: `text('solution_text').notNull()`
- `solution_img_url`: `varchar('solution_img_url_1', { length: 255 })`
- `video_solution_url`: `varchar('video_solution_url', { length: 255 })`
- `language`: `varchar('language', { length: 255 }).notNull()`
- `estimated_time_sec`: `integer('estimated_time_sec').notNull()`
- `tags`: `varchar('tags', { length: 255 }).notNull()`
- `status`: `varchar('status', { length: 255 }).notNull()`

---

### 3.6 `db/schema/ratings.js`

Contains the 10 multi-party rating, review, moderation, appeal, and aggregate cache tables.

#### PostgreSQL Enums:
- `rating_interaction_type`: `['APPLICATION_REVIEW', 'INTERVIEW', 'TASK_ASSESSMENT', 'INTERNSHIP', 'JOB', 'COURSE', 'SEMINAR_EVENT']`
- `rating_interaction_status`: `['PENDING_REVIEW', 'REVIEWED', 'INTERVIEW_COMPLETED', 'TASK_COMPLETED', 'INTERNSHIP_COMPLETED', 'COURSE_COMPLETED', 'COMPLETED', 'EXPIRED', 'CLOSED']`
- `rating_context_type`: `['APPLICATION_REVIEW', 'INTERVIEW_FEEDBACK', 'TASK_EVALUATION', 'INTERNSHIP_PERFORMANCE', 'COURSE_EVALUATION', 'SEMINAR_FEEDBACK', 'GLOBAL']`
- `rating_status`: `['PENDING_PUBLICATION', 'PUBLISHED', 'FLAGGED', 'HIDDEN', 'REJECTED', 'UNDER_APPEAL']`
- `rating_recommendation`: `['RECOMMENDED', 'NEUTRAL', 'NOT_RECOMMENDED']`
- `rating_report_reason`: `['INAPPROPRIATE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'SPAM', 'CONFLICT_OF_INTEREST', 'OTHER']`
- `rating_report_status`: `['PENDING', 'INVESTIGATING', 'RESOLVED_UPHELD', 'RESOLVED_DISMISSED']`
- `rating_appeal_status`: `['PENDING_REVIEW', 'APPROVED_RESTORED', 'REJECTED', 'INFO_REQUESTED']`

#### Tables:
1. **`rating_interactions` (`ratingInteractions`)**:
   - `id`: `text('id').primaryKey()`
   - `interactionType`: `ratingInteractionTypeEnum('interaction_type').notNull()`
   - `referenceId`: `text('reference_id').notNull()`
   - `initiatorType`: `userRoleEnum('initiator_type').notNull()`
   - `initiatorId`: `text('initiator_id').notNull()`
   - `initiatorUserId`: `text('initiator_user_id').references(() => users.id, { onDelete: 'cascade' })`
   - `targetType`: `userRoleEnum('target_type').notNull()`
   - `targetId`: `text('target_id').notNull()`
   - `targetUserId`: `text('target_user_id').references(() => users.id, { onDelete: 'cascade' })`
   - `status`: `ratingInteractionStatusEnum('status').default('PENDING_REVIEW').notNull()`
   - `isBlind`: `boolean('is_blind').default(false).notNull()`
   - `deadline`: `timestamp('deadline', { withTimezone: true, mode: 'date' })`
   - `completedAt`: `timestamp('completed_at', { withTimezone: true, mode: 'date' })`
   - `metadata`: `jsonb('metadata').default({}).notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `index('rating_interactions_ref_idx').on(table.referenceId, table.interactionType)`
     - `index('rating_interactions_target_idx').on(table.targetType, table.targetId)`
     - `index('rating_interactions_initiator_idx').on(table.initiatorType, table.initiatorId)`
     - `index('rating_interactions_status_idx').on(table.status, table.deadline)`
     - `index('rating_interactions_init_user_idx').on(table.initiatorUserId)`
     - `index('rating_interactions_target_user_idx').on(table.targetUserId)`

2. **`ratings` (`ratings`)**:
   - `id`: `text('id').primaryKey()`
   - `interactionId`: `text('interaction_id').notNull().references(() => ratingInteractions.id, { onDelete: 'cascade' })`
   - `reviewerUserId`: `text('reviewer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `reviewerRole`: `userRoleEnum('reviewer_role').notNull()`
   - `targetUserId`: `text('target_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `targetRole`: `userRoleEnum('target_role').notNull()`
   - `targetEntityId`: `text('target_entity_id').notNull()`
   - `contextType`: `ratingContextTypeEnum('context_type').notNull()`
   - `overallScore`: `numeric('overall_score', { precision: 3, scale: 2 }).notNull()`
   - `recommendation`: `ratingRecommendationEnum('recommendation').default('RECOMMENDED').notNull()`
   - `headline`: `text('headline')`
   - `reviewText`: `text('review_text')`
   - `pros`: `jsonb('pros').default([]).notNull()`
   - `cons`: `jsonb('cons').default([]).notNull()`
   - `status`: `ratingStatusEnum('status').default('PUBLISHED').notNull()`
   - `isVerified`: `boolean('is_verified').default(true).notNull()`
   - `isBlind`: `boolean('is_blind').default(false).notNull()`
   - `publishedAt`: `timestamp('published_at', { withTimezone: true, mode: 'date' })`
   - `metadata`: `jsonb('metadata').default({}).notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `uniqueIndex('ratings_interaction_reviewer_idx').on(table.interactionId, table.reviewerUserId)`
     - `index('ratings_target_status_idx').on(table.targetRole, table.targetEntityId, table.status)`
     - `index('ratings_reviewer_idx').on(table.reviewerUserId)`
     - `index('ratings_target_user_idx').on(table.targetUserId)`
     - `index('ratings_context_idx').on(table.contextType)`
     - `index('ratings_status_idx').on(table.status)`

3. **`rating_categories` (`ratingCategories`)**:
   - `id`: `text('id').primaryKey()`
   - `code`: `text('code').notNull().unique()`
   - `name`: `text('name').notNull()`
   - `description`: `text('description')`
   - `targetRole`: `userRoleEnum('target_role').notNull()`
   - `contextType`: `ratingContextTypeEnum('context_type').notNull()`
   - `minScore`: `integer('min_score').default(1).notNull()`
   - `maxScore`: `integer('max_score').default(5).notNull()`
   - `weight`: `numeric('weight', { precision: 3, scale: 2 }).default('1.00').notNull()`
   - `displayOrder`: `integer('display_order').default(0).notNull()`
   - `isActive`: `boolean('is_active').default(true).notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `uniqueIndex('rating_categories_code_idx').on(table.code)`
     - `index('rating_categories_context_target_idx').on(table.contextType, table.targetRole, table.isActive)`

4. **`rating_category_scores` (`ratingCategoryScores`)**:
   - `id`: `text('id').primaryKey()`
   - `ratingId`: `text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' })`
   - `categoryId`: `text('category_id').notNull().references(() => ratingCategories.id, { onDelete: 'restrict' })`
   - `categoryCode`: `text('category_code').notNull()`
   - `score`: `integer('score').notNull()`
   - `comment`: `text('comment')`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `uniqueIndex('rating_category_scores_rating_cat_idx').on(table.ratingId, table.categoryId)`
     - `index('rating_category_scores_rating_idx').on(table.ratingId)`
     - `index('rating_category_scores_category_idx').on(table.categoryId)`

5. **`rating_responses` (`ratingResponses`)**:
   - `id`: `text('id').primaryKey()`
   - `ratingId`: `text('rating_id').notNull().unique().references(() => ratings.id, { onDelete: 'cascade' })`
   - `responderUserId`: `text('responder_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `responseText`: `text('response_text').notNull()`
   - `status`: `text('status').default('PUBLISHED').notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `uniqueIndex('rating_responses_rating_idx').on(table.ratingId)`
     - `index('rating_responses_responder_idx').on(table.responderUserId)`

6. **`rating_reports` (`ratingReports`)**:
   - `id`: `text('id').primaryKey()`
   - `ratingId`: `text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' })`
   - `reporterUserId`: `text('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `reason`: `ratingReportReasonEnum('reason').notNull()`
   - `details`: `text('details')`
   - `status`: `ratingReportStatusEnum('status').default('PENDING').notNull()`
   - `moderatorNotes`: `text('moderator_notes')`
   - `resolvedByAdminId`: `text('resolved_by_admin_id').references(() => users.id, { onDelete: 'set null' })`
   - `resolvedAt`: `timestamp('resolved_at', { withTimezone: true, mode: 'date' })`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `index('rating_reports_rating_idx').on(table.ratingId)`
     - `index('rating_reports_reporter_idx').on(table.reporterUserId)`
     - `index('rating_reports_status_idx').on(table.status)`

7. **`rating_appeals` (`ratingAppeals`)**:
   - `id`: `text('id').primaryKey()`
   - `ratingId`: `text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' })`
   - `appellantUserId`: `text('appellant_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
   - `appealReason`: `text('appeal_reason').notNull()`
   - `evidenceDocs`: `jsonb('evidence_docs').default([]).notNull()`
   - `status`: `ratingAppealStatusEnum('status').default('PENDING_REVIEW').notNull()`
   - `moderatorVerdict`: `text('moderator_verdict')`
   - `reviewedByAdminId`: `text('reviewed_by_admin_id').references(() => users.id, { onDelete: 'set null' })`
   - `reviewedAt`: `timestamp('reviewed_at', { withTimezone: true, mode: 'date' })`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `index('rating_appeals_rating_idx').on(table.ratingId)`
     - `index('rating_appeals_appellant_idx').on(table.appellantUserId)`
     - `index('rating_appeals_status_idx').on(table.status)`

8. **`rating_audit_logs` (`ratingAuditLogs`)**:
   - `id`: `text('id').primaryKey()`
   - `ratingId`: `text('rating_id')`
   - `interactionId`: `text('interaction_id')`
   - `actorUserId`: `text('actor_user_id').references(() => users.id, { onDelete: 'set null' })`
   - `actorRole`: `text('actor_role')`
   - `action`: `text('action').notNull()`
   - `previousState`: `jsonb('previous_state')`
   - `newState`: `jsonb('new_state')`
   - `reason`: `text('reason')`
   - `ipAddress`: `text('ip_address')`
   - `userAgent`: `text('user_agent')`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `index('rating_audit_logs_rating_idx').on(table.ratingId)`
     - `index('rating_audit_logs_interaction_idx').on(table.interactionId)`
     - `index('rating_audit_logs_actor_idx').on(table.actorUserId)`
     - `index('rating_audit_logs_action_idx').on(table.action)`
     - `index('rating_audit_logs_created_idx').on(table.createdAt)`

9. **`rating_aggregates` (`ratingAggregates`)**:
   - `id`: `text('id').primaryKey()`
   - `targetRole`: `userRoleEnum('target_role').notNull()`
   - `targetEntityId`: `text('target_entity_id').notNull()`
   - `targetUserId`: `text('target_user_id').references(() => users.id, { onDelete: 'cascade' })`
   - `totalRatingsCount`: `integer('total_ratings_count').default(0).notNull()`
   - `verifiedRatingsCount`: `integer('verified_ratings_count').default(0).notNull()`
   - `averageScore`: `numeric('average_score', { precision: 3, scale: 2 }).default('0.00').notNull()`
   - `recommendationRate`: `numeric('recommendation_rate', { precision: 5, scale: 2 }).default('0.00').notNull()`
   - `categoryBreakdown`: `jsonb('category_breakdown').default({}).notNull()`
   - `scoreDistribution`: `jsonb('score_distribution').default({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }).notNull()`
   - `contextBreakdown`: `jsonb('context_breakdown').default({}).notNull()`
   - `objectiveSkillScore`: `numeric('objective_skill_score', { precision: 5, scale: 2 }).default('0.00').notNull()`
   - `verificationTrustLevel`: `text('verification_trust_level').default('UNVERIFIED').notNull()`
   - `lastRecalculatedAt`: `timestamp('last_recalculated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
   - **Indexes**:
     - `uniqueIndex('rating_aggregates_target_idx').on(table.targetRole, table.targetEntityId)`
     - `index('rating_aggregates_user_idx').on(table.targetUserId)`

10. **`rating_policies` (`ratingPolicies`)**:
    - `id`: `text('id').primaryKey()`
    - `contextType`: `ratingContextTypeEnum('context_type').notNull().unique()`
    - `ratingWindowDays`: `integer('rating_window_days').default(30).notNull()`
    - `isBlindReview`: `boolean('is_blind_review').default(false).notNull()`
    - `blindHoldTimeoutDays`: `integer('blind_hold_timeout_days').default(14).notNull()`
    - `minRatingsForPublicAggregate`: `integer('min_ratings_for_public_aggregate').default(1).notNull()`
    - `allowTargetResponse`: `boolean('allow_target_response').default(true).notNull()`
    - `allowAppeals`: `boolean('allow_appeals').default(true).notNull()`
    - `badgeThresholds`: `jsonb('badge_thresholds').default({ TOP_RATED: 4.5, VERIFIED_EXCELLENCE: 4.8 }).notNull()`
    - `isActive`: `boolean('is_active').default(true).notNull()`
    - `createdAt`: `timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
    - `updatedAt`: `timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()`
    - **Indexes**:
      - `uniqueIndex('rating_policies_context_idx').on(table.contextType)`

---

## 4. Drizzle Relations (`relations(...)`) Matrix

To support relational querying in Drizzle ORM (`db.query.*`), bidirectional relations must be declared cleanly without circular module imports.

```
+------------------+         1:1           +-----------------------+
|      users       |---------------------->|    studentProfiles    |
+------------------+                       +-----------------------+
         |                                             |
         | 1:1                                         | N:1
         v                                             v
+------------------+                       +-----------------------+
|  adminProfiles   |                       |   instituteProfiles   |
+------------------+                       +-----------------------+
         |                                             ^
         | 1:1                                         | 1:1
         v                                             |
+----------------------+                               |
| organizationProfiles |-------------------------------+
+----------------------+
         |
         | 1:N
         v
+----------------------+         1:N       +-----------------------+
|  ratingInteractions  |------------------>|        ratings        |
+----------------------+                   +-----------------------+
                                                       |
                                        +--------------+--------------+
                                        | 1:N                         | 1:1
                                        v                             v
                             +----------------------+      +--------------------+
                             | ratingCategoryScores |      |  ratingResponses   |
                             +----------------------+      +--------------------+
```

### Complete Relations Definitions:
```javascript
// usersRelations
usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  organizationProfile: one(organizationProfiles, {
    fields: [users.id],
    references: [organizationProfiles.userId],
  }),
  instituteProfile: one(instituteProfiles, {
    fields: [users.id],
    references: [instituteProfiles.userId],
  }),
  adminProfile: one(adminProfiles, {
    fields: [users.id],
    references: [adminProfiles.userId],
  }),
  auditLogsAsActor: many(auditLogs, { relationName: 'actor' }),
  ratingsAsReviewer: many(ratings, { relationName: 'reviewer' }),
  ratingsAsTarget: many(ratings, { relationName: 'target' }),
  ratingInteractionsAsInitiator: many(ratingInteractions, { relationName: 'initiator' }),
  ratingInteractionsAsTarget: many(ratingInteractions, { relationName: 'target' }),
}));

// studentProfilesRelations
studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  institute: one(instituteProfiles, {
    fields: [studentProfiles.instituteId],
    references: [instituteProfiles.id],
  }),
}));

// organizationProfilesRelations
organizationProfilesRelations = relations(organizationProfiles, ({ one }) => ({
  user: one(users, {
    fields: [organizationProfiles.userId],
    references: [users.id],
  }),
  verifiedByAdmin: one(users, {
    fields: [organizationProfiles.verifiedByAdminId],
    references: [users.id],
  }),
}));

// instituteProfilesRelations
instituteProfilesRelations = relations(instituteProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [instituteProfiles.userId],
    references: [users.id],
  }),
  students: many(studentProfiles),
}));

// ratingInteractionsRelations
ratingInteractionsRelations = relations(ratingInteractions, ({ one, many }) => ({
  initiatorUser: one(users, {
    fields: [ratingInteractions.initiatorUserId],
    references: [users.id],
    relationName: 'initiator',
  }),
  targetUser: one(users, {
    fields: [ratingInteractions.targetUserId],
    references: [users.id],
    relationName: 'target',
  }),
  ratings: many(ratings),
}));

// ratingsRelations
ratingsRelations = relations(ratings, ({ one, many }) => ({
  interaction: one(ratingInteractions, {
    fields: [ratings.interactionId],
    references: [ratingInteractions.id],
  }),
  reviewerUser: one(users, {
    fields: [ratings.reviewerUserId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  targetUser: one(users, {
    fields: [ratings.targetUserId],
    references: [users.id],
    relationName: 'target',
  }),
  categoryScores: many(ratingCategoryScores),
  response: one(ratingResponses, {
    fields: [ratings.id],
    references: [ratingResponses.ratingId],
  }),
  reports: many(ratingReports),
  appeals: many(ratingAppeals),
}));

// ratingCategoryScoresRelations
ratingCategoryScoresRelations = relations(ratingCategoryScores, ({ one }) => ({
  rating: one(ratings, {
    fields: [ratingCategoryScores.ratingId],
    references: [ratings.id],
  }),
  category: one(ratingCategories, {
    fields: [ratingCategoryScores.categoryId],
    references: [ratingCategories.id],
  }),
}));
```

---

## 5. Circular Dependency & Export Architecture Diagnosis

### The Defect Mechanism
The previous refactor split `db/schema.js` into modular files (`user.js`, `student.js`, `industry.js`, `institute.js`, `ratings.js`) by writing stub exports that attempted to re-export from `../schema.js` (`const schema = require("../schema.js");`). Once `db/schema.js` was deleted, all five files broke simultaneously.

### The Clean Modular Dependency DAG (Directed Acyclic Graph)
To eliminate any circular requires while preserving 100% modular encapsulation:

```
[ drizzle-orm/pg-core ]
        |
        +----------------------------------------+
        |                                        |
        v                                        v
+------------------+                    +------------------+
| db/schema/user.js|                    |db/schema/quest.. |
+------------------+                    +------------------+
        |
        +----------------+----------------+
        |                |                |
        v                v                v
+------------------+ +------------------+ +------------------+
|db/schema/instit..| |db/schema/indust..| |db/schema/rating..|
+------------------+ +------------------+ +------------------+
        |
        v
+------------------+
|db/schema/studen..|
+------------------+
        |
        +----------------+----------------+
                         |
                         v
              +---------------------+
              | db/schema/index.js  |
              +---------------------+
```

1. **`user.js`**: Imports ONLY from `drizzle-orm/pg-core`. Defines all common enums, `users`, `sessions`, `accounts`, `verifications`, `signupIntents`, `adminProfiles`, and `auditLogs`. Zero project dependencies.
2. **`institute.js`**: Imports from `user.js` (`users`, `orgVerificationStatusEnum`). Defines `instituteProfiles` (`pgTable('institute', ...)`).
3. **`industry.js`**: Imports from `user.js` (`users`, `orgVerificationStatusEnum`). Defines `organizationProfiles` (`pgTable('organization_profile', ...)`).
4. **`student.js`**: Imports from `user.js` (`users`) and `institute.js` (`instituteProfiles`). Defines `studentProfiles` (`pgTable('student_profile', ...)`).
5. **`questions.js`**: Self-contained. Imports ONLY `drizzle-orm/pg-core`. Defines `questionTable` (`pgTable('questions', ...)`).
6. **`ratings.js`**: Imports from `user.js` (`users`, `userRoleEnum`). Defines all 10 rating tables and 8 rating enums.
7. **`index.js`**: Re-exports all tables, enums, aliases, and compiled Drizzle relations.

---

## 6. Symmetrical Support Checklist for Implementation Workers

When Workers implement the schema repair:
1. `db/schema/user.js`: Implement concrete `users`, `sessions`, `accounts`, `verifications`, `signupIntents`, `adminProfiles`, `auditLogs`, and enums.
2. `db/schema/student.js`: Implement concrete `studentProfiles` (`student_profile`).
3. `db/schema/industry.js`: Implement concrete `organizationProfiles` (`organization_profile`).
4. `db/schema/institute.js`: Implement concrete `instituteProfiles` (`institute`).
5. `db/schema/questions.js`: Maintain existing `questionTable` (`questions`).
6. `db/schema/ratings.js`: Implement concrete 10 rating tables and 8 rating enums.
7. `db/schema/index.js`: Re-export all entities, enums, and relations from the 6 schema modules.
8. `db/index.js`: Ensure `drizzle(client, { schema })` passes the aggregated schema object, and restore dual-mode support (`createMockDrizzleDb` when `USE_MOCK_DB=true`).
9. `drizzle.config.js`: Ensure `schema: ["./db/schema/user.js", "./db/schema/student.js", "./db/schema/industry.js", "./db/schema/institute.js", "./db/schema/questions.js", "./db/schema/ratings.js"]` (or `"./db/schema/index.js"`) generates cleanly without altering existing table structures.

---

## 7. Empirical Discovery Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth Schema | User Table | User core table for Better Auth with role/onboarding extensions | `user` columns | `pgTable('user')` | `Cannot find module '../schema.js'` in `db/schema/user.js:1` | Code Inspection & Node require test |
| 2 | Auth Schema | Session Table | Session management for Better Auth | `session` columns | `pgTable('session')` | `Cannot find module '../schema.js'` in `db/schema/user.js:1` | Code Inspection & Node require test |
| 3 | Auth Schema | Account Table | OAuth/Credentials account mapping for Better Auth | `account` columns | `pgTable('account')` | `Cannot find module '../schema.js'` in `db/schema/user.js:1` | Code Inspection & Node require test |
| 4 | Auth Schema | Verification Table | Token verification table for Better Auth | `verification` columns | `pgTable('verification')` | `Cannot find module '../schema.js'` in `db/schema/user.js:1` | Code Inspection & Node require test |
| 5 | Domain Schema | Student Profile | 1:1 Student profile with academic & skill jsonb fields | `student_profile` columns | `pgTable('student_profile')` | `Cannot find module '../schema.js'` in `db/schema/student.js:1` | Code Inspection & Node require test |
| 6 | Domain Schema | Organization Profile | 1:1 Industry profile with KYC & verification fields | `organization_profile` columns | `pgTable('organization_profile')` | `Cannot find module '../schema.js'` in `db/schema/industry.js:1` | Code Inspection & Node require test |
| 7 | Domain Schema | Institute Profile | 1:1 Institute profile with code & placement fields | `institute` columns | `pgTable('institute')` | `Cannot find module '../schema.js'` in `db/schema/institute.js:1` | Code Inspection & Node require test |
| 8 | Domain Schema | Questions Bank | Assessment questions bank with options & solutions | `questions` columns | `pgTable('questions')` | Functional (valid `pgTable`) | `db/schema/questions.js:9` |
| 9 | Rating Schema | Multi-Party Ratings | 10 rating tables for peer review, appeal, moderation | `ratings` columns | 10 `pgTable` objects | `Cannot find module '../schema.js'` in `db/schema/ratings.js:1` | Code Inspection & Node require test |
| 10 | Driver Config | Database Connection | Neon PostgreSQL connection with Drizzle ORM | `DATABASE_URL` | Drizzle DB instance | Relational schema omitted in `db/index.js:657` | `db/index.js:657` |
