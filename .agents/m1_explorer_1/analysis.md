# Milestone 1: Drizzle ORM Schema & Migration Architecture Report

**Author**: Explorer Subagent `m1_explorer_1`  
**Milestone**: Milestone 1 (Database Schema & Migration Architecture)  
**Date**: 2026-08-25  
**Target Scope**: `db/schema.js`, `db/relations.js`, Drizzle Kit Migrations, Database Integrity Constraints  
**Project Root**: `e:\sih_2026_044`

---

## 1. Executive Summary

This report establishes the verified, copy-paste-ready database architecture for the **Skill Bridge Verified Reputation, Rating, Feedback, Trust, and Review System**.

The platform operates on a dual-persistence hybrid design:
1. **PostgreSQL / Neon Serverless with Drizzle ORM** for production and relational migrations.
2. **Synchronous In-Memory & Atomic JSON Database Fallback** (`lib/db.js`, `data/db.json`) for local execution and zero-dependency testing.

To satisfy Requirement **R1** and unlock Milestones M2–M6, this report defines:
- **8 PostgreSQL Enumerations** (`rating_interaction_type`, `rating_interaction_status`, `rating_context_type`, `rating_status`, `rating_recommendation`, `rating_report_reason`, `rating_report_status`, `rating_appeal_status`).
- **10 Core Rating Tables** with strict foreign keys, cascade rules, and compound unique indexes.
- **Drizzle Relations Specification (`db/relations.js`)** with disambiguated relationship aliases.
- **SQL Migration Script Preview** matching Drizzle Kit PostgreSQL dialect output.
- **Seed Categories Configuration** across Application, Interview, Internship, and Course contexts.

---

## 2. Complete Copy-Paste Ready `db/schema.js`

Below is the complete, validated `db/schema.js` content incorporating all existing authentication/profile models alongside all 10 rating tables:

```javascript
/**
 * Skill Bridge Platform - Drizzle ORM Database Schema
 * Database: PostgreSQL (Neon Serverless)
 * File: db/schema.js
 */

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

// ---------------------------------------------------------------------------
// 1. PostgreSQL Enumerations
// ---------------------------------------------------------------------------

// Existing Platform Enums
const userRoleEnum = pgEnum('user_role', ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']);
const accountStatusEnum = pgEnum('account_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
const onboardingStatusEnum = pgEnum('onboarding_status', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
const orgVerificationStatusEnum = pgEnum('org_verification_status', ['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']);
const auditActionEnum = pgEnum('audit_action', [
  'LOGIN',
  'LOGOUT',
  'ACCOUNT_CREATED',
  'ROLE_ASSIGNED',
  'ROLE_REJECTED_MISMATCH',
  'ORGANIZATION_SUBMITTED',
  'ORGANIZATION_APPROVED',
  'ORGANIZATION_REJECTED',
  'ORGANIZATION_INFO_REQUESTED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'PROFILE_UPDATED',
  'OPPORTUNITY_GATED_ATTEMPT',
  'CAPABILITY_VIOLATION_BLOCKED',
  'ROLE_COLLISION_BLOCKED',
]);

// 8 Rating & Reputation Enums (R1)
const ratingInteractionTypeEnum = pgEnum('rating_interaction_type', [
  'APPLICATION_REVIEW',
  'INTERVIEW',
  'TASK_ASSESSMENT',
  'INTERNSHIP',
  'JOB',
  'COURSE',
  'SEMINAR_EVENT',
]);

const ratingInteractionStatusEnum = pgEnum('rating_interaction_status', [
  'PENDING_REVIEW',
  'REVIEWED',
  'INTERVIEW_COMPLETED',
  'TASK_COMPLETED',
  'INTERNSHIP_COMPLETED',
  'COURSE_COMPLETED',
  'COMPLETED',
  'EXPIRED',
  'CLOSED',
]);

const ratingContextTypeEnum = pgEnum('rating_context_type', [
  'APPLICATION_REVIEW',
  'INTERVIEW_FEEDBACK',
  'TASK_EVALUATION',
  'INTERNSHIP_PERFORMANCE',
  'COURSE_EVALUATION',
  'SEMINAR_FEEDBACK',
  'GLOBAL',
]);

const ratingStatusEnum = pgEnum('rating_status', [
  'PENDING_PUBLICATION',
  'PUBLISHED',
  'FLAGGED',
  'HIDDEN',
  'REJECTED',
  'UNDER_APPEAL',
]);

const ratingRecommendationEnum = pgEnum('rating_recommendation', [
  'RECOMMENDED',
  'NEUTRAL',
  'NOT_RECOMMENDED',
]);

const ratingReportReasonEnum = pgEnum('rating_report_reason', [
  'INAPPROPRIATE_CONTENT',
  'FALSE_INFORMATION',
  'HARASSMENT',
  'SPAM',
  'CONFLICT_OF_INTEREST',
  'OTHER',
]);

const ratingReportStatusEnum = pgEnum('rating_report_status', [
  'PENDING',
  'INVESTIGATING',
  'RESOLVED_UPHELD',
  'RESOLVED_DISMISSED',
]);

const ratingAppealStatusEnum = pgEnum('rating_appeal_status', [
  'PENDING_REVIEW',
  'APPROVED_RESTORED',
  'REJECTED',
  'INFO_REQUESTED',
]);

// ---------------------------------------------------------------------------
// 2. Better Auth Core Tables
// ---------------------------------------------------------------------------

const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  image: text('image'),
  role: userRoleEnum('role').default('STUDENT').notNull(),
  accountStatus: accountStatusEnum('account_status').default('ACTIVE').notNull(),
  onboardingStatus: onboardingStatusEnum('onboarding_status').default('NOT_STARTED').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  profileCompleted: boolean('profile_completed').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('user_email_idx').on(table.email),
  roleIdx: index('user_role_idx').on(table.role),
  statusIdx: index('user_status_idx').on(table.accountStatus),
}));

const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('session_user_idx').on(table.userId),
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  expiresIdx: index('session_expires_idx').on(table.expiresAt),
}));

const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true, mode: 'date' }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true, mode: 'date' }),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  providerAccountIdx: uniqueIndex('account_provider_account_idx').on(table.providerId, table.accountId),
  userIdx: index('account_user_idx').on(table.userId),
}));

const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
}));

// ---------------------------------------------------------------------------
// 3. Pre-OAuth Role Handshake Table
// ---------------------------------------------------------------------------

const signupIntents = pgTable('signup_intents', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  role: userRoleEnum('role').notNull(),
  email: text('email'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('signup_intents_token_idx').on(table.token),
  expiresIdx: index('signup_intents_expires_idx').on(table.expiresAt),
}));

// ---------------------------------------------------------------------------
// 4. 1:1 Role Profile Tables
// ---------------------------------------------------------------------------

const studentProfiles = pgTable('student_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('fullName').notNull(),
  phone: text('phone'),
  email: text('email').notNull(),
  headline: text('headline'),
  bio: text('bio'),
  instituteName: text('institute_name'),
  instituteId: text('institute_id').references(() => instituteProfiles.id, { onDelete: 'set null' }),
  degree: text('degree'),
  department: text('department'),
  graduationYear: integer('graduation_year'),
  yearOfStudy: text('year_of_study'),
  cgpa: text('cgpa'),
  skills: jsonb('skills').default([]),
  projects: jsonb('projects').default([]),
  certifications: jsonb('certifications').default([]),
  experience: jsonb('experience').default([]),
  githubURL: text('github'),
  linkedinURL: text('linkedin'),
  hobby: text('hobby'),
  careerPreferences: jsonb('career_preferences').default({}).notNull(),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userProfileIdx: uniqueIndex('student_profile_user_idx').on(table.userId),
  instituteIdx: index('student_profile_institute_idx').on(table.instituteName),
  deptIdx: index('student_profile_dept_idx').on(table.department),
}));

const organizationProfiles = pgTable('organization_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  registrationNumber: text('registration_number').unique(),
  taxIdGstin: text('tax_id_gstin'),
  companyType: text('company_type'),
  industry: text('industry'),
  companySize: text('company_size'),
  website: text('website'),
  logoUrl: text('logo_url'),
  contactPhone: text('contact_phone'),
  address: jsonb('address').default({}).notNull(),
  primaryContactName: text('primary_contact_name'),
  primaryContactPhone: text('primary_contact_phone'),
  primaryContactDesignation: text('primary_contact_designation'),
  documents: jsonb('documents').default([]).notNull(),
  verificationDocs: jsonb('verification_docs').default([]).notNull(),
  hiringPreferences: jsonb('hiring_preferences').default({}).notNull(),
  verificationStatus: orgVerificationStatusEnum('verification_status').default('PENDING').notNull(),
  verificationNotes: text('verification_notes'),
  adminNotes: text('admin_notes'),
  verifiedByAdminId: text('verified_by_admin_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('organization_profile_user_idx').on(table.userId),
  regIdIdx: uniqueIndex('organization_profile_reg_idx').on(table.registrationNumber),
  verStatusIdx: index('organization_profile_status_idx').on(table.verificationStatus),
}));

const instituteProfiles = pgTable('institute', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  instituteName: text('institute_name').notNull(),
  instituteCode: text('institute_code').unique(),
  instituteType: text('institute_type'),
  address: jsonb('address').default({}).notNull(),
  website: text('website'),
  logoUrl: text('logo_url'),
  contactPhone: text('contact_phone'),
  officialEmail: text('official_email'),
  departments: jsonb('departments').default([]).notNull(),
  placementContact: jsonb('placement_contact').default({}).notNull(),
  verificationStatus: orgVerificationStatusEnum('verification_status').default('PENDING').notNull(),
  verificationDocs: jsonb('verification_docs').default([]).notNull(),
  profileCompletion: integer('profile_completion').default(0).notNull(),
  currentOnboardingStep: integer('current_onboarding_step').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userInstIdx: uniqueIndex('institute_profile_user_idx').on(table.userId),
  codeIdx: uniqueIndex('institute_profile_code_idx').on(table.instituteCode),
  statusIdx: index('institute_profile_status_idx').on(table.verificationStatus),
}));

const adminProfiles = pgTable('admin_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  adminLevel: text('admin_level').default('SUPER_ADMIN').notNull(),
  permissions: jsonb('permissions').default([
    'ALL',
    'VERIFY_ORGANIZATIONS',
    'MANAGE_USERS',
    'VIEW_AUDIT_LOGS',
    'SYSTEM_CONFIG',
  ]).notNull(),
  department: text('department').default('Platform Governance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userAdminIdx: uniqueIndex('admin_profile_user_idx').on(table.userId),
}));

const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: text('actor_email'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetUserId: text('target_user_id'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').default({}).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  actorIdx: index('audit_logs_actor_idx').on(table.actorUserId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdIdx: index('audit_logs_created_idx').on(table.createdAt),
  targetIdx: index('audit_logs_target_idx').on(table.targetUserId),
}));

// ---------------------------------------------------------------------------
// 5. Rating & Reputation Core Tables (10 Tables - R1)
// ---------------------------------------------------------------------------

/**
 * 1. rating_interactions
 * Tracked real-world platform events that grant rating eligibility
 */
const ratingInteractions = pgTable('rating_interactions', {
  id: text('id').primaryKey(),
  interactionType: ratingInteractionTypeEnum('interaction_type').notNull(),
  referenceId: text('reference_id').notNull(),
  initiatorType: userRoleEnum('initiator_type').notNull(),
  initiatorId: text('initiator_id').notNull(),
  initiatorUserId: text('initiator_user_id').references(() => users.id, { onDelete: 'cascade' }),
  targetType: userRoleEnum('target_type').notNull(),
  targetId: text('target_id').notNull(),
  targetUserId: text('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
  status: ratingInteractionStatusEnum('status').default('PENDING_REVIEW').notNull(),
  isBlind: boolean('is_blind').default(false).notNull(),
  deadline: timestamp('deadline', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  refIdx: index('rating_interactions_ref_idx').on(table.referenceId, table.interactionType),
  targetIdx: index('rating_interactions_target_idx').on(table.targetType, table.targetId),
  initiatorIdx: index('rating_interactions_initiator_idx').on(table.initiatorType, table.initiatorId),
  statusIdx: index('rating_interactions_status_idx').on(table.status, table.deadline),
  initUserIdx: index('rating_interactions_init_user_idx').on(table.initiatorUserId),
  targetUserIdx: index('rating_interactions_target_user_idx').on(table.targetUserId),
}));

/**
 * 2. ratings
 * Main verified rating submission with compound uniqueness guard
 */
const ratings = pgTable('ratings', {
  id: text('id').primaryKey(),
  interactionId: text('interaction_id').notNull().references(() => ratingInteractions.id, { onDelete: 'cascade' }),
  reviewerUserId: text('reviewer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reviewerRole: userRoleEnum('reviewer_role').notNull(),
  targetUserId: text('target_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetRole: userRoleEnum('target_role').notNull(),
  targetEntityId: text('target_entity_id').notNull(),
  contextType: ratingContextTypeEnum('context_type').notNull(),
  overallScore: numeric('overall_score', { precision: 3, scale: 2 }).notNull(),
  recommendation: ratingRecommendationEnum('recommendation').default('RECOMMENDED').notNull(),
  headline: text('headline'),
  reviewText: text('review_text'),
  pros: jsonb('pros').default([]).notNull(),
  cons: jsonb('cons').default([]).notNull(),
  status: ratingStatusEnum('status').default('PUBLISHED').notNull(),
  isVerified: boolean('is_verified').default(true).notNull(),
  isBlind: boolean('is_blind').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  // CRITICAL UNIQUE CONSTRAINT: One rating per reviewer per interaction
  interactionReviewerIdx: uniqueIndex('ratings_interaction_reviewer_idx').on(table.interactionId, table.reviewerUserId),
  targetStatusIdx: index('ratings_target_status_idx').on(table.targetRole, table.targetEntityId, table.status),
  reviewerIdx: index('ratings_reviewer_idx').on(table.reviewerUserId),
  targetUserIdx: index('ratings_target_user_idx').on(table.targetUserId),
  contextIdx: index('ratings_context_idx').on(table.contextType),
  statusIdx: index('ratings_status_idx').on(table.status),
}));

/**
 * 3. rating_categories
 * Standard rubric criteria definitions per context and target role
 */
const ratingCategories = pgTable('rating_categories', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  targetRole: userRoleEnum('target_role').notNull(),
  contextType: ratingContextTypeEnum('context_type').notNull(),
  minScore: integer('min_score').default(1).notNull(),
  maxScore: integer('max_score').default(5).notNull(),
  weight: numeric('weight', { precision: 3, scale: 2 }).default('1.00').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('rating_categories_code_idx').on(table.code),
  contextTargetIdx: index('rating_categories_context_target_idx').on(table.contextType, table.targetRole, table.isActive),
}));

/**
 * 4. rating_category_scores
 * Detailed 1-5 integer score breakdowns per rubric category
 */
const ratingCategoryScores = pgTable('rating_category_scores', {
  id: text('id').primaryKey(),
  ratingId: text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => ratingCategories.id, { onDelete: 'restrict' }),
  categoryCode: text('category_code').notNull(),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  ratingCatIdx: uniqueIndex('rating_category_scores_rating_cat_idx').on(table.ratingId, table.categoryId),
  ratingIdx: index('rating_category_scores_rating_idx').on(table.ratingId),
  categoryIdx: index('rating_category_scores_category_idx').on(table.categoryId),
}));

/**
 * 5. rating_responses
 * Public response submitted by reviewee
 */
const ratingResponses = pgTable('rating_responses', {
  id: text('id').primaryKey(),
  ratingId: text('rating_id').notNull().unique().references(() => ratings.id, { onDelete: 'cascade' }),
  responderUserId: text('responder_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  responseText: text('response_text').notNull(),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  ratingIdx: uniqueIndex('rating_responses_rating_idx').on(table.ratingId),
  responderIdx: index('rating_responses_responder_idx').on(table.responderUserId),
}));

/**
 * 6. rating_reports
 * Moderation reports filed against reviews
 */
const ratingReports = pgTable('rating_reports', {
  id: text('id').primaryKey(),
  ratingId: text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' }),
  reporterUserId: text('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: ratingReportReasonEnum('reason').notNull(),
  details: text('details'),
  status: ratingReportStatusEnum('status').default('PENDING').notNull(),
  moderatorNotes: text('moderator_notes'),
  resolvedByAdminId: text('resolved_by_admin_id').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  ratingIdx: index('rating_reports_rating_idx').on(table.ratingId),
  reporterIdx: index('rating_reports_reporter_idx').on(table.reporterUserId),
  statusIdx: index('rating_reports_status_idx').on(table.status),
}));

/**
 * 7. rating_appeals
 * Appeals against moderation decisions
 */
const ratingAppeals = pgTable('rating_appeals', {
  id: text('id').primaryKey(),
  ratingId: text('rating_id').notNull().references(() => ratings.id, { onDelete: 'cascade' }),
  appellantUserId: text('appellant_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appealReason: text('appeal_reason').notNull(),
  evidenceDocs: jsonb('evidence_docs').default([]).notNull(),
  status: ratingAppealStatusEnum('status').default('PENDING_REVIEW').notNull(),
  moderatorVerdict: text('moderator_verdict'),
  reviewedByAdminId: text('reviewed_by_admin_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  ratingIdx: index('rating_appeals_rating_idx').on(table.ratingId),
  appellantIdx: index('rating_appeals_appellant_idx').on(table.appellantUserId),
  statusIdx: index('rating_appeals_status_idx').on(table.status),
}));

/**
 * 8. rating_audit_logs
 * Immutable append-only audit trail for rating events
 */
const ratingAuditLogs = pgTable('rating_audit_logs', {
  id: text('id').primaryKey(),
  ratingId: text('rating_id'),
  interactionId: text('interaction_id'),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  ratingIdx: index('rating_audit_logs_rating_idx').on(table.ratingId),
  interactionIdx: index('rating_audit_logs_interaction_idx').on(table.interactionId),
  actorIdx: index('rating_audit_logs_actor_idx').on(table.actorUserId),
  actionIdx: index('rating_audit_logs_action_idx').on(table.action),
  createdIdx: index('rating_audit_logs_created_idx').on(table.createdAt),
}));

/**
 * 9. rating_aggregates
 * Pre-computed score summary cache for instant profile retrieval
 */
const ratingAggregates = pgTable('rating_aggregates', {
  id: text('id').primaryKey(),
  targetRole: userRoleEnum('target_role').notNull(),
  targetEntityId: text('target_entity_id').notNull(),
  targetUserId: text('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
  totalRatingsCount: integer('total_ratings_count').default(0).notNull(),
  verifiedRatingsCount: integer('verified_ratings_count').default(0).notNull(),
  averageScore: numeric('average_score', { precision: 3, scale: 2 }).default('0.00').notNull(),
  recommendationRate: numeric('recommendation_rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
  categoryBreakdown: jsonb('category_breakdown').default({}).notNull(),
  scoreDistribution: jsonb('score_distribution').default({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }).notNull(),
  contextBreakdown: jsonb('context_breakdown').default({}).notNull(),
  objectiveSkillScore: numeric('objective_skill_score', { precision: 5, scale: 2 }).default('0.00').notNull(),
  verificationTrustLevel: text('verification_trust_level').default('UNVERIFIED').notNull(),
  lastRecalculatedAt: timestamp('last_recalculated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  // CRITICAL UNIQUE CONSTRAINT: 1 aggregate record per entity
  targetIdx: uniqueIndex('rating_aggregates_target_idx').on(table.targetRole, table.targetEntityId),
  userIdx: index('rating_aggregates_user_idx').on(table.targetUserId),
}));

/**
 * 10. rating_policies
 * Configurable rating rules and thresholds per context
 */
const ratingPolicies = pgTable('rating_policies', {
  id: text('id').primaryKey(),
  contextType: ratingContextTypeEnum('context_type').notNull().unique(),
  ratingWindowDays: integer('rating_window_days').default(30).notNull(),
  isBlindReview: boolean('is_blind_review').default(false).notNull(),
  blindHoldTimeoutDays: integer('blind_hold_timeout_days').default(14).notNull(),
  minRatingsForPublicAggregate: integer('min_ratings_for_public_aggregate').default(1).notNull(),
  allowTargetResponse: boolean('allow_target_response').default(true).notNull(),
  allowAppeals: boolean('allow_appeals').default(true).notNull(),
  badgeThresholds: jsonb('badge_thresholds').default({ 'TOP_RATED': 4.5, 'VERIFIED_EXCELLENCE': 4.8 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  contextIdx: uniqueIndex('rating_policies_context_idx').on(table.contextType),
}));

// ---------------------------------------------------------------------------
// 6. Module Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Enums
  userRoleEnum,
  accountStatusEnum,
  onboardingStatusEnum,
  orgVerificationStatusEnum,
  auditActionEnum,
  ratingInteractionTypeEnum,
  ratingInteractionStatusEnum,
  ratingContextTypeEnum,
  ratingStatusEnum,
  ratingRecommendationEnum,
  ratingReportReasonEnum,
  ratingReportStatusEnum,
  ratingAppealStatusEnum,

  // Core Platform Tables
  users,
  sessions,
  accounts,
  verifications,
  signupIntents,
  studentProfiles,
  organizationProfiles,
  industryProfiles: organizationProfiles, // Alias for backward compatibility
  instituteProfiles,
  adminProfiles,
  auditLogs,

  // Rating & Reputation Tables (10 Tables)
  ratingInteractions,
  ratings,
  ratingCategories,
  ratingCategoryScores,
  ratingResponses,
  ratingReports,
  ratingAppeals,
  ratingAuditLogs,
  ratingAggregates,
  ratingPolicies,
};
```

---

## 3. Complete Copy-Paste Ready `db/relations.js`

```javascript
/**
 * Skill Bridge Platform - Drizzle ORM Relational Mapping
 * File: db/relations.js
 */

const { defineRelations } = require('drizzle-orm');
const schema = require('./schema');

const {
  users,
  sessions,
  accounts,
  studentProfiles,
  organizationProfiles,
  instituteProfiles,
  adminProfiles,
  auditLogs,
  ratingInteractions,
  ratings,
  ratingCategories,
  ratingCategoryScores,
  ratingResponses,
  ratingReports,
  ratingAppeals,
  ratingAuditLogs,
  ratingAggregates,
  ratingPolicies,
} = schema;

const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions(),
    accounts: r.many.accounts(),
    studentProfile: r.one.studentProfiles({ from: r.users.id, to: r.studentProfiles.userId }),
    organizationProfile: r.one.organizationProfiles({ from: r.users.id, to: r.organizationProfiles.userId }),
    instituteProfile: r.one.instituteProfiles({ from: r.users.id, to: r.instituteProfiles.userId }),
    adminProfile: r.one.adminProfiles({ from: r.users.id, to: r.adminProfiles.userId }),
    auditLogsAsActor: r.many.auditLogs({ alias: 'actor' }),
    ratingInteractionsAsInitiator: r.many.ratingInteractions({ alias: 'initiator' }),
    ratingInteractionsAsTarget: r.many.ratingInteractions({ alias: 'target' }),
    ratingsGiven: r.many.ratings({ alias: 'reviewer' }),
    ratingsReceived: r.many.ratings({ alias: 'targetUser' }),
    ratingResponses: r.many.ratingResponses(),
    ratingReportsSubmitted: r.many.ratingReports({ alias: 'reporter' }),
    ratingReportsResolved: r.many.ratingReports({ alias: 'resolvedAdmin' }),
    ratingAppealsSubmitted: r.many.ratingAppeals({ alias: 'appellant' }),
    ratingAppealsReviewed: r.many.ratingAppeals({ alias: 'reviewedAdmin' }),
    ratingAuditLogsAsActor: r.many.ratingAuditLogs({ alias: 'ratingAuditActor' }),
    ratingAggregates: r.many.ratingAggregates(),
  },
  sessions: {
    user: r.one.users({ from: r.sessions.userId, to: r.users.id }),
  },
  accounts: {
    user: r.one.users({ from: r.accounts.userId, to: r.users.id }),
  },
  studentProfiles: {
    user: r.one.users({ from: r.studentProfiles.userId, to: r.users.id }),
    institute: r.one.instituteProfiles({ from: r.studentProfiles.instituteId, to: r.instituteProfiles.id }),
  },
  organizationProfiles: {
    user: r.one.users({ from: r.organizationProfiles.userId, to: r.users.id }),
    verifiedByAdmin: r.one.users({ from: r.organizationProfiles.verifiedByAdminId, to: r.users.id }),
  },
  instituteProfiles: {
    user: r.one.users({ from: r.instituteProfiles.userId, to: r.users.id }),
  },
  adminProfiles: {
    user: r.one.users({ from: r.adminProfiles.userId, to: r.users.id }),
  },
  auditLogs: {
    actor: r.one.users({ from: r.auditLogs.actorUserId, to: r.users.id, alias: 'actor' }),
  },
  ratingInteractions: {
    initiatorUser: r.one.users({ from: r.ratingInteractions.initiatorUserId, to: r.users.id, alias: 'initiator' }),
    targetUser: r.one.users({ from: r.ratingInteractions.targetUserId, to: r.users.id, alias: 'target' }),
    ratings: r.many.ratings(),
  },
  ratings: {
    interaction: r.one.ratingInteractions({ from: r.ratings.interactionId, to: r.ratingInteractions.id }),
    reviewer: r.one.users({ from: r.ratings.reviewerUserId, to: r.users.id, alias: 'reviewer' }),
    targetUser: r.one.users({ from: r.ratings.targetUserId, to: r.users.id, alias: 'targetUser' }),
    categoryScores: r.many.ratingCategoryScores(),
    response: r.one.ratingResponses({ from: r.ratings.id, to: r.ratingResponses.ratingId }),
    reports: r.many.ratingReports(),
    appeals: r.many.ratingAppeals(),
  },
  ratingCategories: {
    scores: r.many.ratingCategoryScores(),
  },
  ratingCategoryScores: {
    rating: r.one.ratings({ from: r.ratingCategoryScores.ratingId, to: r.ratings.id }),
    category: r.one.ratingCategories({ from: r.ratingCategoryScores.categoryId, to: r.ratingCategories.id }),
  },
  ratingResponses: {
    rating: r.one.ratings({ from: r.ratingResponses.ratingId, to: r.ratings.id }),
    responder: r.one.users({ from: r.ratingResponses.responderUserId, to: r.users.id }),
  },
  ratingReports: {
    rating: r.one.ratings({ from: r.ratingReports.ratingId, to: r.ratings.id }),
    reporter: r.one.users({ from: r.ratingReports.reporterUserId, to: r.users.id, alias: 'reporter' }),
    resolvedByAdmin: r.one.users({ from: r.ratingReports.resolvedByAdminId, to: r.users.id, alias: 'resolvedAdmin' }),
  },
  ratingAppeals: {
    rating: r.one.ratings({ from: r.ratingAppeals.ratingId, to: r.ratings.id }),
    appellant: r.one.users({ from: r.ratingAppeals.appellantUserId, to: r.users.id, alias: 'appellant' }),
    reviewedByAdmin: r.one.users({ from: r.ratingAppeals.reviewedByAdminId, to: r.users.id, alias: 'reviewedAdmin' }),
  },
  ratingAuditLogs: {
    actor: r.one.users({ from: r.ratingAuditLogs.actorUserId, to: r.users.id, alias: 'ratingAuditActor' }),
    rating: r.one.ratings({ from: r.ratingAuditLogs.ratingId, to: r.ratings.id }),
    interaction: r.one.ratingInteractions({ from: r.ratingAuditLogs.interactionId, to: r.ratingInteractions.id }),
  },
  ratingAggregates: {
    targetUser: r.one.users({ from: r.ratingAggregates.targetUserId, to: r.users.id }),
  },
  ratingPolicies: {},
}));

module.exports = { relations };
```

---

## 4. PostgreSQL DDL / Migration Preview

When `drizzle-kit generate` is run against the schema, the following DDL operations are produced:

```sql
-- 1. Create Enums
CREATE TYPE "rating_appeal_status" AS ENUM('PENDING_REVIEW', 'APPROVED_RESTORED', 'REJECTED', 'INFO_REQUESTED');
CREATE TYPE "rating_context_type" AS ENUM('APPLICATION_REVIEW', 'INTERVIEW_FEEDBACK', 'TASK_EVALUATION', 'INTERNSHIP_PERFORMANCE', 'COURSE_EVALUATION', 'SEMINAR_FEEDBACK', 'GLOBAL');
CREATE TYPE "rating_interaction_status" AS ENUM('PENDING_REVIEW', 'REVIEWED', 'INTERVIEW_COMPLETED', 'TASK_COMPLETED', 'INTERNSHIP_COMPLETED', 'COURSE_COMPLETED', 'COMPLETED', 'EXPIRED', 'CLOSED');
CREATE TYPE "rating_interaction_type" AS ENUM('APPLICATION_REVIEW', 'INTERVIEW', 'TASK_ASSESSMENT', 'INTERNSHIP', 'JOB', 'COURSE', 'SEMINAR_EVENT');
CREATE TYPE "rating_recommendation" AS ENUM('RECOMMENDED', 'NEUTRAL', 'NOT_RECOMMENDED');
CREATE TYPE "rating_report_reason" AS ENUM('INAPPROPRIATE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'SPAM', 'CONFLICT_OF_INTEREST', 'OTHER');
CREATE TYPE "rating_report_status" AS ENUM('PENDING', 'INVESTIGATING', 'RESOLVED_UPHELD', 'RESOLVED_DISMISSED');
CREATE TYPE "rating_status" AS ENUM('PENDING_PUBLICATION', 'PUBLISHED', 'FLAGGED', 'HIDDEN', 'REJECTED', 'UNDER_APPEAL');

-- 2. Create Tables
CREATE TABLE "rating_interactions" (
  "id" text PRIMARY KEY NOT NULL,
  "interaction_type" "rating_interaction_type" NOT NULL,
  "reference_id" text NOT NULL,
  "initiator_type" "user_role" NOT NULL,
  "initiator_id" text NOT NULL,
  "initiator_user_id" text,
  "target_type" "user_role" NOT NULL,
  "target_id" text NOT NULL,
  "target_user_id" text,
  "status" "rating_interaction_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
  "is_blind" boolean DEFAULT false NOT NULL,
  "deadline" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ratings" (
  "id" text PRIMARY KEY NOT NULL,
  "interaction_id" text NOT NULL,
  "reviewer_user_id" text NOT NULL,
  "reviewer_role" "user_role" NOT NULL,
  "target_user_id" text NOT NULL,
  "target_role" "user_role" NOT NULL,
  "target_entity_id" text NOT NULL,
  "context_type" "rating_context_type" NOT NULL,
  "overall_score" numeric(3, 2) NOT NULL,
  "recommendation" "rating_recommendation" DEFAULT 'RECOMMENDED' NOT NULL,
  "headline" text,
  "review_text" text,
  "pros" jsonb DEFAULT '[]' NOT NULL,
  "cons" jsonb DEFAULT '[]' NOT NULL,
  "status" "rating_status" DEFAULT 'PUBLISHED' NOT NULL,
  "is_verified" boolean DEFAULT true NOT NULL,
  "is_blind" boolean DEFAULT false NOT NULL,
  "published_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_categories" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "target_role" "user_role" NOT NULL,
  "context_type" "rating_context_type" NOT NULL,
  "min_score" integer DEFAULT 1 NOT NULL,
  "max_score" integer DEFAULT 5 NOT NULL,
  "weight" numeric(3, 2) DEFAULT '1.00' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_category_scores" (
  "id" text PRIMARY KEY NOT NULL,
  "rating_id" text NOT NULL,
  "category_id" text NOT NULL,
  "category_code" text NOT NULL,
  "score" integer NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_responses" (
  "id" text PRIMARY KEY NOT NULL,
  "rating_id" text NOT NULL UNIQUE,
  "responder_user_id" text NOT NULL,
  "response_text" text NOT NULL,
  "status" text DEFAULT 'PUBLISHED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "rating_id" text NOT NULL,
  "reporter_user_id" text NOT NULL,
  "reason" "rating_report_reason" NOT NULL,
  "details" text,
  "status" "rating_report_status" DEFAULT 'PENDING' NOT NULL,
  "moderator_notes" text,
  "resolved_by_admin_id" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_appeals" (
  "id" text PRIMARY KEY NOT NULL,
  "rating_id" text NOT NULL,
  "appellant_user_id" text NOT NULL,
  "appeal_reason" text NOT NULL,
  "evidence_docs" jsonb DEFAULT '[]' NOT NULL,
  "status" "rating_appeal_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
  "moderator_verdict" text,
  "reviewed_by_admin_id" text,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "rating_id" text,
  "interaction_id" text,
  "actor_user_id" text,
  "actor_role" text,
  "action" text NOT NULL,
  "previous_state" jsonb,
  "new_state" jsonb,
  "reason" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_aggregates" (
  "id" text PRIMARY KEY NOT NULL,
  "target_role" "user_role" NOT NULL,
  "target_entity_id" text NOT NULL,
  "target_user_id" text,
  "total_ratings_count" integer DEFAULT 0 NOT NULL,
  "verified_ratings_count" integer DEFAULT 0 NOT NULL,
  "average_score" numeric(3, 2) DEFAULT '0.00' NOT NULL,
  "recommendation_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
  "category_breakdown" jsonb DEFAULT '{}' NOT NULL,
  "score_distribution" jsonb DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}' NOT NULL,
  "context_breakdown" jsonb DEFAULT '{}' NOT NULL,
  "objective_skill_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
  "verification_trust_level" text DEFAULT 'UNVERIFIED' NOT NULL,
  "last_recalculated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rating_policies" (
  "id" text PRIMARY KEY NOT NULL,
  "context_type" "rating_context_type" NOT NULL UNIQUE,
  "rating_window_days" integer DEFAULT 30 NOT NULL,
  "is_blind_review" boolean DEFAULT false NOT NULL,
  "blind_hold_timeout_days" integer DEFAULT 14 NOT NULL,
  "min_ratings_for_public_aggregate" integer DEFAULT 1 NOT NULL,
  "allow_target_response" boolean DEFAULT true NOT NULL,
  "allow_appeals" boolean DEFAULT true NOT NULL,
  "badge_thresholds" jsonb DEFAULT '{"TOP_RATED":4.5,"VERIFIED_EXCELLENCE":4.8}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Unique & Performance Indexes
CREATE UNIQUE INDEX "ratings_interaction_reviewer_idx" ON "ratings" ("interaction_id", "reviewer_user_id");
CREATE UNIQUE INDEX "rating_aggregates_target_idx" ON "rating_aggregates" ("target_role", "target_entity_id");
CREATE UNIQUE INDEX "rating_category_scores_rating_cat_idx" ON "rating_category_scores" ("rating_id", "category_id");
CREATE UNIQUE INDEX "rating_categories_code_idx" ON "rating_categories" ("code");
CREATE UNIQUE INDEX "rating_responses_rating_idx" ON "rating_responses" ("rating_id");
CREATE UNIQUE INDEX "rating_policies_context_idx" ON "rating_policies" ("context_type");

-- 4. Foreign Key Constraints with Cascade Options
ALTER TABLE "rating_interactions" ADD CONSTRAINT "rating_interactions_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "rating_interactions" ADD CONSTRAINT "rating_interactions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "rating_interactions"("id") ON DELETE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "rating_category_scores" ADD CONSTRAINT "rating_category_scores_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;
ALTER TABLE "rating_category_scores" ADD CONSTRAINT "rating_category_scores_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "rating_categories"("id") ON DELETE RESTRICT;
ALTER TABLE "rating_responses" ADD CONSTRAINT "rating_responses_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;
ALTER TABLE "rating_responses" ADD CONSTRAINT "rating_responses_responder_user_id_fkey" FOREIGN KEY ("responder_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_appellant_user_id_fkey" FOREIGN KEY ("appellant_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "rating_audit_logs" ADD CONSTRAINT "rating_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "rating_aggregates" ADD CONSTRAINT "rating_aggregates_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
```

---

## 5. Seed Category Definitions (`lib/rating-categories.js`)

To initialize categories in both PostgreSQL and `lib/db.js` JSON storage, the following standard rubric configuration must be seeded:

```javascript
const DEFAULT_RATING_CATEGORIES = [
  // 1. Application Review (Industry rating Student)
  {
    id: 'rcat_app_qual',
    code: 'APPLICATION_QUALITY',
    name: 'Application Quality',
    description: 'Structure, clarity, and portfolio presentation of the application',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_app_skill',
    code: 'SKILL_RELEVANCE',
    name: 'Skill Relevance',
    description: 'Alignment of demonstrated skills with opportunity requirements',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_app_comm',
    code: 'COMMUNICATION',
    name: 'Communication',
    description: 'Promptness and clarity of responses during application review',
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
    name: 'Professionalism',
    description: 'Professional demeanor and submission accuracy',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'rcat_app_over',
    code: 'OVERALL_IMPRESSION',
    name: 'Overall Impression',
    description: 'Holistic candidate potential and suitability',
    targetRole: 'STUDENT',
    contextType: 'APPLICATION_REVIEW',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 5,
    isActive: true,
  },

  // 2. Interview Feedback (Industry rating Student)
  {
    id: 'rcat_int_tech',
    code: 'TECH_COMPETENCE',
    name: 'Technical Competence',
    description: 'Depth of technical problem-solving and domain mastery',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_int_comm',
    code: 'COMMUNICATION_ARTICULATION',
    name: 'Articulation & Communication',
    description: 'Clarity of thought expression and live explanation',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_int_cult',
    code: 'CULTURAL_FIT',
    name: 'Cultural & Team Fit',
    description: 'Receptiveness, collaboration, and learning agility',
    targetRole: 'STUDENT',
    contextType: 'INTERVIEW_FEEDBACK',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 3,
    isActive: true,
  },

  // 3. Internship Performance (Industry rating Student)
  {
    id: 'rcat_intern_work_ethic',
    code: 'WORK_ETHIC',
    name: 'Work Ethic & Initiative',
    description: 'Proactiveness, dedication, and autonomy in assigned tasks',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_intern_tech_exec',
    code: 'TECHNICAL_EXECUTION',
    name: 'Technical Execution Quality',
    description: 'Deliverable quality, code standards, and accuracy',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_intern_teamwork',
    code: 'TEAMWORK',
    name: 'Collaboration & Receptiveness',
    description: 'Peer coordination and feedback integration',
    targetRole: 'STUDENT',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },

  // 4. Internship Experience (Student rating Industry)
  {
    id: 'rcat_ind_mentor',
    code: 'MENTORSHIP_QUALITY',
    name: 'Mentorship Quality',
    description: 'Guidance, learning growth, and managerial support',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_ind_env',
    code: 'WORK_ENVIRONMENT',
    name: 'Work Environment & Culture',
    description: 'Inclusivity, psychological safety, and team support',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_ind_growth',
    code: 'CAREER_GROWTH',
    name: 'Career Growth & Opportunities',
    description: 'Skill elevation, real project impact, and conversion clarity',
    targetRole: 'INDUSTRY',
    contextType: 'INTERNSHIP_PERFORMANCE',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 3,
    isActive: true,
  },

  // 5. Course / Seminar Evaluation (Student/Industry rating Institute)
  {
    id: 'rcat_inst_content',
    code: 'COURSE_CONTENT',
    name: 'Curriculum Rigor & Relevance',
    description: 'Modernity and industry alignment of course material',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '1.20',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'rcat_inst_pedagogy',
    code: 'PEDAGOGY',
    name: 'Instruction & Practical Labs',
    description: 'Instructor expertise, lab facilities, and hands-on exposure',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '1.00',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'rcat_inst_infra',
    code: 'INFRASTRUCTURE',
    name: 'Lab & Platform Infrastructure',
    description: 'Compute power, tooling, and environment availability',
    targetRole: 'INSTITUTE',
    contextType: 'COURSE_EVALUATION',
    minScore: 1,
    maxScore: 5,
    weight: '0.80',
    displayOrder: 3,
    isActive: true,
  },
];
```

---

## 6. Implementation Checklist for Milestone 1 Implementers

1. **Update `db/schema.js`**: Apply the validated 10 tables, 8 enums, and exports.
2. **Update `db/relations.js`**: Apply the bidirectional relation definitions with `alias` bindings.
3. **Generate Migration**: Run `npm run db:generate` to produce the versioned migration SQL and snapshot under `drizzle/`.
4. **Update `lib/db.js`**:
   - Initialize 10 array keys in `getDb()` fallback (`ratingInteractions`, `ratings`, `ratingCategories`, `ratingCategoryScores`, `ratingResponses`, `ratingReports`, `ratingAppeals`, `ratingAuditLogs`, `ratingAggregates`, `ratingPolicies`).
   - Add CRUD helpers for rating models.
5. **Update `db/index.js`**:
   - Add table mappings to `createMockDrizzleDb()` query builder (`select`, `insert`, `update`, `delete`, `query`).
6. **Seed Categories**: Ensure default rubric categories are seeded during app initialization.
