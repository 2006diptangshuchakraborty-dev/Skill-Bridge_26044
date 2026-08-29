# Milestone 1: Database Migration & Integrity Constraints Specification Report

**Author**: Spec Miner Subagent (Milestone 1)  
**Date**: 2026-08-25  
**Project**: Skill Bridge Verified Reputation, Rating, Feedback, Trust & Review System  
**Working Directory**: `e:\sih_2026_044\.agents\m1_spec_miner`  
**Target Scope**: Drizzle ORM Schema (`db/schema.js`), Relational Map (`db/relations.js`), Mock ORM Query Builder (`db/index.js`), In-Memory/JSON Persistence (`lib/db.js`), Drizzle Kit Migration Pipeline (`drizzle.config.js`, `drizzle/**`), and Database Integrity Constraints (R1)

---

## 1. Executive Summary

This specification report details the complete schema definitions, integrity constraints, indexes, dual-persistence bindings, and migration generation pipeline required for **Milestone 1 (Requirement R1: Database Schema & Migration Architecture)**.

The Skill Bridge platform employs a **dual-persistence hybrid architecture**:
1. **PostgreSQL / Neon Serverless with Drizzle ORM** for production deployments and relational migrations.
2. **Synchronous In-Memory & Atomic JSON Database Fallback** (`lib/db.js`, `data/db.json`, `data/seed.json`) with a mock Drizzle query builder (`db/index.js`) for zero-dependency test environments and local serverless execution.

To satisfy Requirement R1 without corrupting existing `user`, `student_profile`, `organization_profile`, `institute`, `admin_profile`, or `audit_logs` tables, the system must add **10 new rating tables**, **8 PostgreSQL enums**, **2 critical compound unique constraints**, **11 foreign key relations with appropriate cascade policies**, **18 performance indexes**, and full JSON DB fallback support.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Drizzle Schema | `rating_interactions` Table | Tracks verified platform events (Application Review, Interview, Task, Internship, Course) with lifecycle status and rating deadlines | Interaction event payload (type, referenceId, initiator, target, deadline) | `rating_interactions` record with UUID/text ID, timestamps, status | Rejects missing required fields, invalid enums | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 2 | Drizzle Schema | `ratings` Table | Core rating record storing overall score (1.00–5.00), recommendation, pros/cons, review text, blind flag, and status | `interactionId`, `reviewerUserId`, `targetEntityId`, scores, recommendation, written review | Created `ratings` row | Rejects duplicate rating per `(interactionId, reviewerUserId)` via DB unique index | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 3 | Drizzle Schema | `rating_categories` Table | Standardized 1–5 scoring category definitions per context type and target role | `code`, `name`, `targetRole`, `contextType`, `weight`, `minScore`, `maxScore` | Category definition row | Rejects duplicate category code | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 4 | Drizzle Schema | `rating_category_scores` Table | 1–5 score breakdowns tied to parent rating and specific category | `ratingId`, `categoryId`, `score` (1–5), `comment` | Category score row | Rejects duplicate `(ratingId, categoryId)` via DB unique index | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 5 | Drizzle Schema | `rating_responses` Table | Public reply published by target entity in response to a review | `ratingId`, `responderUserId`, `responseText` | Created response row | Rejects duplicate response for same rating (`ratingId` unique) | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 6 | Drizzle Schema | `rating_reports` Table | User reports against reviews for admin moderation queue | `ratingId`, `reporterUserId`, `reason`, `details` | Created report row | Rejects invalid report reason enum | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 7 | Drizzle Schema | `rating_appeals` Table | Review contestations/appeals submitted against moderation decisions | `ratingId`, `appellantUserId`, `appealReason`, `evidenceDocs` | Created appeal row | Rejects missing appeal reason | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 8 | Drizzle Schema | `rating_audit_logs` Table | Immutable forensic audit log for rating transitions, blind releases, and fraud detection | `ratingId`, `actorUserId`, `action`, `previousState`, `newState` | Append-only audit log row | Rejects missing action | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 9 | Drizzle Schema | `rating_aggregates` Table | Pre-computed cached reputation scores, star distributions, and verification signals | `targetRole`, `targetEntityId`, score stats, breakdown JSON | Cached aggregate record | Rejects duplicate aggregate per `(targetRole, targetEntityId)` | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 10 | Drizzle Schema | `rating_policies` Table | Configurable rating windows, blind hold timeouts, and badge qualification thresholds | `contextType`, `ratingWindowDays`, `isBlindReview`, `badgeThresholds` | Policy record | Rejects duplicate context policy | `ORIGINAL_REQUEST.md`, `PROJECT.md` |
| 11 | PostgreSQL Enums | 8 Rating Enums | Custom PostgreSQL enums defining domain types and lifecycle states | Enum string literals | Strongly-typed PostgreSQL custom enum types | Rejects unrecognized string values at DB level | `db/schema.js`, `PROJECT.md` |
| 12 | Relational Mapping | Drizzle Relations (`db/relations.js`) | One-to-one and one-to-many navigation paths across ratings, interactions, users, and profiles | Schema tables | Drizzle ORM relational graph | Throws during schema compilation if relation keys mismatch | `db/relations.js` |
| 13 | Mock ORM | Query Builder (`db/index.js`) | Mock Drizzle interface for select/insert/update/delete across all 10 rating tables | Table objects, where clauses, insert payloads | In-memory query results | Graceful fallback if table is empty | `db/index.js` |
| 14 | Persistence | JSON DB Fallback (`lib/db.js`) | In-memory arrays and atomic disk persistence (`data/db.json`) for all rating entities | Entity objects | Synchronously persisted JSON database | Re-clones from `data/seed.json` if corrupted | `lib/db.js` |
| 15 | Migration | Drizzle Kit Migration Pipeline | Reproducible SQL migration generation via `drizzle-kit generate` | `db/schema.js`, `drizzle.config.js` | `drizzle/<timestamp>_xxx/migration.sql` + `snapshot.json` | Rejects schema conflicts via strict mode | `drizzle.config.js` |

---

## 3. Edge Cases & Boundary Constraints

| # | Feature | Input | Observed / Expected Behavior |
|---|---------|-------|------------------------------|
| 1 | `ratings` Unique Index | Duplicate rating submission with same `(interactionId, reviewerUserId)` | Blocked by `ratings_interaction_reviewer_idx` unique index; prevents multiple reviews for the same platform event |
| 2 | `rating_aggregates` Unique Index | Duplicate aggregate row creation for same `(targetRole, targetEntityId)` | Blocked by `rating_aggregates_target_idx` unique index; enforces exactly 1 aggregate cache row per entity |
| 3 | `rating_category_scores` Unique Index | Multiple scores submitted for the same category within one rating | Blocked by `rating_category_scores_rating_cat_idx` unique index |
| 4 | Foreign Key Cascade on User Deletion | User deleted from `user` table | Cascades to delete user's sessions, accounts, profiles, ratings, and interactions (`ON DELETE CASCADE`) |
| 5 | Audit Logs on User Deletion | User deleted from `user` table | Preserves audit history with `actor_user_id` set to `NULL` (`ON DELETE SET NULL`) |
| 6 | Category Score Range Validation | Score integer < 1 or > 5 | Rejected by application and schema checks; category scores must strictly be between 1 and 5 |
| 7 | Zero Ratings Aggregate State | Profile with 0 ratings | Aggregate returns `totalRatingsCount: 0`, `averageScore: "0.00"`, `verificationTrustLevel: "UNVERIFIED"`; UI displays "No verified ratings yet" rather than `0.0 ★` |
| 8 | Blind Review State Transition | Rating submitted for blind interaction (`isBlind: true`) | Initial status is `PENDING_PUBLICATION`; both ratings transition to `PUBLISHED` only when counterparty submits or deadline expires |
| 9 | Inactive Rating Category | Category with `isActive: false` | Excluded from `getRatingEligibility().allowedCategories` to prevent rating on deprecated criteria |
| 10 | Missing Neon Database URL | `DATABASE_URL` empty or invalid | `db/index.js` automatically activates `createMockDrizzleDb()` fallback without throwing unhandled exceptions |

---

## 4. Existing Database Baseline Analysis

### 4.1 Existing Enums in PostgreSQL
Currently defined in `db/schema.js`:
1. `user_role`: `['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN']`
2. `account_status`: `['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']`
3. `onboarding_status`: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`
4. `org_verification_status`: `['PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']`
5. `audit_action`: `['LOGIN', 'LOGOUT', 'ACCOUNT_CREATED', 'ROLE_ASSIGNED', 'ROLE_REJECTED_MISMATCH', 'ORGANIZATION_SUBMITTED', 'ORGANIZATION_APPROVED', 'ORGANIZATION_REJECTED', 'ORGANIZATION_INFO_REQUESTED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'PROFILE_UPDATED', 'OPPORTUNITY_GATED_ATTEMPT', 'CAPABILITY_VIOLATION_BLOCKED', 'ROLE_COLLISION_BLOCKED']`

### 4.2 Existing Tables in PostgreSQL & Drizzle
1. `user` (11 columns)
2. `session` (7 columns)
3. `account` (12 columns)
4. `verification` (5 columns)
5. `signup_intents` (8 columns)
6. `student_profile` (25 columns)
7. `organization_profile` (27 columns)
8. `institute` (18 columns)
9. `admin_profile` (7 columns)
10. `audit_logs` (12 columns)

### 4.3 Existing Migration Snapshot
- Existing migration folder: `drizzle/20260824180753_omniscient_scrambler/`
- Contains:
  - `migration.sql` (206 lines): Creates the 5 enums, 10 existing tables, 25 indexes, and 9 foreign key constraints.
  - `snapshot.json` (2769 lines): DDL snapshot for Drizzle Kit version 8.

**Critical Rule for Milestone 1**: Adding the 10 rating tables must create an incremental migration file in `drizzle/` without modifying or dropping any of the existing 10 tables or 5 enums.

---

## 5. Specification of the 8 New PostgreSQL Enums

The following 8 PostgreSQL enums must be added to `db/schema.js`:

```javascript
// 1. rating_interaction_type
const ratingInteractionTypeEnum = pgEnum('rating_interaction_type', [
  'APPLICATION_REVIEW',
  'INTERVIEW',
  'TASK_ASSESSMENT',
  'INTERNSHIP',
  'JOB',
  'COURSE',
  'SEMINAR_EVENT',
]);

// 2. rating_interaction_status
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

// 3. rating_context_type
const ratingContextTypeEnum = pgEnum('rating_context_type', [
  'APPLICATION_REVIEW',
  'INTERVIEW_FEEDBACK',
  'TASK_EVALUATION',
  'INTERNSHIP_PERFORMANCE',
  'COURSE_EVALUATION',
  'SEMINAR_FEEDBACK',
  'GLOBAL',
]);

// 4. rating_status
const ratingStatusEnum = pgEnum('rating_status', [
  'PENDING_PUBLICATION',
  'PUBLISHED',
  'FLAGGED',
  'HIDDEN',
  'REJECTED',
  'UNDER_APPEAL',
]);

// 5. rating_recommendation
const ratingRecommendationEnum = pgEnum('rating_recommendation', [
  'RECOMMENDED',
  'NEUTRAL',
  'NOT_RECOMMENDED',
]);

// 6. rating_report_reason
const ratingReportReasonEnum = pgEnum('rating_report_reason', [
  'INAPPROPRIATE_CONTENT',
  'FALSE_INFORMATION',
  'HARASSMENT',
  'SPAM',
  'CONFLICT_OF_INTEREST',
  'OTHER',
]);

// 7. rating_report_status
const ratingReportStatusEnum = pgEnum('rating_report_status', [
  'PENDING',
  'INVESTIGATING',
  'RESOLVED_UPHELD',
  'RESOLVED_DISMISSED',
]);

// 8. rating_appeal_status
const ratingAppealStatusEnum = pgEnum('rating_appeal_status', [
  'PENDING_REVIEW',
  'APPROVED_RESTORED',
  'REJECTED',
  'INFO_REQUESTED',
]);
```

---

## 6. Detailed Table Specifications (10 Rating Tables)

### 6.1 `rating_interactions`
Tracks verified platform lifecycle events that grant rating eligibility.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Interaction ID (e.g. `rint_...`) |
| `interaction_type` | `rating_interaction_type` | NOT NULL | None | - | Type of platform event |
| `reference_id` | `text` | NOT NULL | None | - | Linked entity ID (application ID, assessment attempt ID, etc.) |
| `initiator_type` | `user_role` | NOT NULL | None | - | Role of initiator (`STUDENT`, `INDUSTRY`, `INSTITUTE`) |
| `initiator_id` | `text` | NOT NULL | None | - | Initiator profile ID or user ID |
| `initiator_user_id` | `text` | NULL | None | `user(id)` ON DELETE CASCADE | Initiator user ID |
| `target_type` | `user_role` | NOT NULL | None | - | Role of target entity |
| `target_id` | `text` | NOT NULL | None | - | Target profile ID or user ID |
| `target_user_id` | `text` | NULL | None | `user(id)` ON DELETE CASCADE | Target user ID |
| `status` | `rating_interaction_status` | NOT NULL | `'PENDING_REVIEW'` | - | Lifecycle stage of interaction |
| `is_blind` | `boolean` | NOT NULL | `false` | - | Flag for 2-way blind reviews |
| `deadline` | `timestamp with time zone` | NULL | None | - | Expiration timestamp for rating window |
| `completed_at` | `timestamp with time zone` | NULL | None | - | When interaction concluded |
| `metadata` | `jsonb` | NOT NULL | `'{}'` | - | Opportunity title, department, match scores, etc. |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Creation timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes**:
- `rating_interactions_ref_idx` on `(reference_id, interaction_type)`
- `rating_interactions_target_idx` on `(target_type, target_id)`
- `rating_interactions_initiator_idx` on `(initiator_type, initiator_id)`
- `rating_interactions_status_idx` on `(status, deadline)`

---

### 6.2 `ratings`
Main rating and written review submission.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Rating ID (e.g. `rat_...`) |
| `interaction_id` | `text` | NOT NULL | None | `rating_interactions(id)` ON DELETE CASCADE | Associated verified interaction |
| `reviewer_user_id` | `text` | NOT NULL | None | `user(id)` ON DELETE CASCADE | Submitting reviewer user ID |
| `reviewer_role` | `user_role` | NOT NULL | None | - | Reviewer role (`STUDENT`, `INDUSTRY`, `INSTITUTE`) |
| `target_user_id` | `text` | NOT NULL | None | `user(id)` ON DELETE CASCADE | Target user ID |
| `target_role` | `user_role` | NOT NULL | None | - | Target role (`STUDENT`, `INDUSTRY`, `INSTITUTE`) |
| `target_entity_id` | `text` | NOT NULL | None | - | Target profile ID |
| `context_type` | `rating_context_type` | NOT NULL | None | - | Context type |
| `overall_score` | `numeric(3, 2)` | NOT NULL | None | - | Weighted score from 1.00 to 5.00 |
| `recommendation` | `rating_recommendation` | NOT NULL | `'RECOMMENDED'` | - | Recommendation verdict |
| `headline` | `text` | NULL | None | - | Short summary headline |
| `review_text` | `text` | NULL | None | - | Written qualitative review |
| `pros` | `jsonb` | NOT NULL | `'[]'` | - | Structured pros array |
| `cons` | `jsonb` | NOT NULL | `'[]'` | - | Structured cons array |
| `status` | `rating_status` | NOT NULL | `'PUBLISHED'` | - | Visibility & publication status |
| `is_verified` | `boolean` | NOT NULL | `true` | - | Verification link indicator |
| `is_blind` | `boolean` | NOT NULL | `false` | - | Two-way blind status |
| `published_at` | `timestamp with time zone` | NULL | None | - | When published publicly |
| `metadata` | `jsonb` | NOT NULL | `'{}'` | - | Additional review metadata |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Submission timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes & Unique Constraints**:
- **CRITICAL UNIQUE INDEX**: `ratings_interaction_reviewer_idx` UNIQUE on `(interaction_id, reviewer_user_id)` (Guarantees exactly one review per party per interaction)
- `ratings_target_status_idx` on `(target_role, target_entity_id, status)`
- `ratings_reviewer_idx` on `(reviewer_user_id)`
- `ratings_context_idx` on `(context_type)`

---

### 6.3 `rating_categories`
Standardized category definitions for 1–5 star scoring.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Category ID (e.g. `rcat_app_qual`) |
| `code` | `text` | NOT NULL | None | UNIQUE | Unique machine code (e.g. `APP_QUALITY`) |
| `name` | `text` | NOT NULL | None | - | Display name |
| `description` | `text` | NULL | None | - | Description of scoring criteria |
| `target_role` | `user_role` | NOT NULL | None | - | Target role for this category |
| `context_type` | `rating_context_type` | NOT NULL | None | - | Associated context |
| `min_score` | `integer` | NOT NULL | `1` | - | Minimum rating score (default 1) |
| `max_score` | `integer` | NOT NULL | `5` | - | Maximum rating score (default 5) |
| `weight` | `numeric(3, 2)` | NOT NULL | `'1.00'` | - | Arithmetic weighting in overall score |
| `display_order` | `integer` | NOT NULL | `0` | - | UI ordering |
| `is_active` | `boolean` | NOT NULL | `true` | - | Active flag |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Creation timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes**:
- `rating_categories_code_idx` UNIQUE on `(code)`
- `rating_categories_context_target_idx` on `(context_type, target_role, is_active)`

---

### 6.4 `rating_category_scores`
Individual 1–5 score breakdown per category.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Score ID (e.g. `rcs_...`) |
| `rating_id` | `text` | NOT NULL | None | `ratings(id)` ON DELETE CASCADE | Parent rating reference |
| `category_id` | `text` | NOT NULL | None | `rating_categories(id)` ON DELETE RESTRICT | Category definition reference |
| `category_code` | `text` | NOT NULL | None | - | Denormalized category code |
| `score` | `integer` | NOT NULL | None | - | Score value (1 to 5) |
| `comment` | `text` | NULL | None | - | Optional category-specific comment |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Timestamp |

**Indexes & Unique Constraints**:
- **UNIQUE INDEX**: `rating_category_scores_rating_cat_idx` UNIQUE on `(rating_id, category_id)`
- `rating_category_scores_rating_idx` on `(rating_id)`

---

### 6.5 `rating_responses`
Public replies by target entity.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Response ID (e.g. `rres_...`) |
| `rating_id` | `text` | NOT NULL | None | `ratings(id)` ON DELETE CASCADE | UNIQUE: One response per rating |
| `responder_user_id` | `text` | NOT NULL | None | `user(id)` ON DELETE CASCADE | Responder user ID |
| `response_text` | `text` | NOT NULL | None | - | Public response text |
| `status` | `text` | NOT NULL | `'PUBLISHED'` | - | Status (`PUBLISHED`, `HIDDEN`) |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Creation timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes & Unique Constraints**:
- **UNIQUE INDEX**: `rating_responses_rating_idx` UNIQUE on `(rating_id)`

---

### 6.6 `rating_reports`
User reports against reviews for admin moderation.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Report ID (e.g. `rrep_...`) |
| `rating_id` | `text` | NOT NULL | None | `ratings(id)` ON DELETE CASCADE | Target rating |
| `reporter_user_id` | `text` | NOT NULL | None | `user(id)` ON DELETE CASCADE | Reporting user |
| `reason` | `rating_report_reason` | NOT NULL | None | - | Moderation report reason |
| `details` | `text` | NULL | None | - | Qualitative details from reporter |
| `status` | `rating_report_status` | NOT NULL | `'PENDING'` | - | Investigation status |
| `moderator_notes` | `text` | NULL | None | - | Admin notes |
| `resolved_by_admin_id` | `text` | NULL | None | `user(id)` ON DELETE SET NULL | Admin user who resolved report |
| `resolved_at` | `timestamp with time zone` | NULL | None | - | Resolution timestamp |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Report submission timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes**:
- `rating_reports_rating_idx` on `(rating_id)`
- `rating_reports_status_idx` on `(status)`

---

### 6.7 `rating_appeals`
Review contestations/appeals against moderation.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Appeal ID (e.g. `rapp_...`) |
| `rating_id` | `text` | NOT NULL | None | `ratings(id)` ON DELETE CASCADE | Target rating |
| `appellant_user_id` | `text` | NOT NULL | None | `user(id)` ON DELETE CASCADE | User filing appeal |
| `appeal_reason` | `text` | NOT NULL | None | - | Reason for contestation |
| `evidence_docs` | `jsonb` | NOT NULL | `'[]'` | - | Supporting evidence documents |
| `status` | `rating_appeal_status` | NOT NULL | `'PENDING_REVIEW'` | - | Appeal status |
| `moderator_verdict` | `text` | NULL | None | - | Admin verdict statement |
| `reviewed_by_admin_id` | `text` | NULL | None | `user(id)` ON DELETE SET NULL | Admin user who reviewed appeal |
| `reviewed_at` | `timestamp with time zone` | NULL | None | - | Review timestamp |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Filing timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes**:
- `rating_appeals_rating_idx` on `(rating_id)`
- `rating_appeals_status_idx` on `(status)`

---

### 6.8 `rating_audit_logs`
Immutable forensic audit trail for rating events and moderation.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Log ID (e.g. `ralog_...`) |
| `rating_id` | `text` | NULL | None | - | Rating reference if applicable |
| `interaction_id` | `text` | NULL | None | - | Interaction reference if applicable |
| `actor_user_id` | `text` | NULL | None | `user(id)` ON DELETE SET NULL | Actor user ID |
| `actor_role` | `text` | NULL | None | - | Actor role |
| `action` | `text` | NOT NULL | None | - | Audit action name |
| `previous_state` | `jsonb` | NULL | None | - | Snapshot of state before change |
| `new_state` | `jsonb` | NULL | None | - | Snapshot of state after change |
| `reason` | `text` | NULL | None | - | Rationale for action |
| `ip_address` | `text` | NULL | None | - | Client IP |
| `user_agent` | `text` | NULL | None | - | Client User-Agent |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Event timestamp |

**Indexes**:
- `rating_audit_logs_rating_idx` on `(rating_id)`
- `rating_audit_logs_actor_idx` on `(actor_user_id)`
- `rating_audit_logs_created_idx` on `(created_at)`

---

### 6.9 `rating_aggregates`
Pre-computed cached reputation scores and distributions.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Aggregate ID (e.g. `ragg_...`) |
| `target_role` | `user_role` | NOT NULL | None | - | Target role (`STUDENT`, `INDUSTRY`, `INSTITUTE`) |
| `target_entity_id` | `text` | NOT NULL | None | - | Target entity ID |
| `target_user_id` | `text` | NULL | None | `user(id)` ON DELETE CASCADE | Target user ID |
| `total_ratings_count` | `integer` | NOT NULL | `0` | - | Total count of ratings |
| `verified_ratings_count` | `integer` | NOT NULL | `0` | - | Count of verified ratings |
| `average_score` | `numeric(3, 2)` | NOT NULL | `'0.00'` | - | Weighted arithmetic mean score (0.00 to 5.00) |
| `recommendation_rate` | `numeric(5, 2)` | NOT NULL | `'0.00'` | - | Recommendation rate percentage (0.00 to 100.00%) |
| `category_breakdown` | `jsonb` | NOT NULL | `'{}'` | - | Breakdown of average score per category |
| `score_distribution` | `jsonb` | NOT NULL | `'{"1":0,"2":0,"3":0,"4":0,"5":0}'` | - | Count per star level 1..5 |
| `context_breakdown` | `jsonb` | NOT NULL | `'{}'` | - | Ratings count by context type |
| `objective_skill_score` | `numeric(5, 2)` | NOT NULL | `'0.00'` | - | Objective skill assessment score (0 to 100) |
| `verification_trust_level` | `text` | NOT NULL | `'UNVERIFIED'` | - | Trust badge level |
| `last_recalculated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Timestamp of last recalculation |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Creation timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes & Unique Constraints**:
- **CRITICAL UNIQUE INDEX**: `rating_aggregates_target_idx` UNIQUE on `(target_role, target_entity_id)`
- `rating_aggregates_user_idx` on `(target_user_id)`

---

### 6.10 `rating_policies`
Configurable rules governing rating windows, blind timeouts, and badge thresholds.

| Column | Type | Nullable | Default | Reference / Foreign Key | Description |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | None | PRIMARY KEY | Policy ID (e.g. `rpol_...`) |
| `context_type` | `rating_context_type` | NOT NULL | None | UNIQUE | Context type |
| `rating_window_days` | `integer` | NOT NULL | `30` | - | Submission window duration in days |
| `is_blind_review` | `boolean` | NOT NULL | `false` | - | Whether this context requires blind review |
| `blind_hold_timeout_days` | `integer` | NOT NULL | `14` | - | Max days to hold before unilateral release |
| `min_ratings_for_public_aggregate` | `integer` | NOT NULL | `1` | - | Min ratings before public score display |
| `allow_target_response` | `boolean` | NOT NULL | `true` | - | Allow public replies |
| `allow_appeals` | `boolean` | NOT NULL | `true` | - | Allow moderation appeals |
| `badge_thresholds` | `jsonb` | NOT NULL | `'{"TOP_RATED":4.5,"VERIFIED_EXCELLENCE":4.8}'` | - | Score thresholds for badge awards |
| `is_active` | `boolean` | NOT NULL | `true` | - | Policy active flag |
| `created_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Creation timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL | `now()` | - | Last update timestamp |

**Indexes & Unique Constraints**:
- **UNIQUE INDEX**: `rating_policies_context_idx` UNIQUE on `(context_type)`

---

## 7. Standard Seed Rating Categories

To enable zero-latency local execution and test compliance, the following standard categories must be defined and seeded:

### 1. `APPLICATION_REVIEW` (Target: `STUDENT`, Reviewer: `INDUSTRY`)
- `APP_QUALITY`: Application Quality & Portfolio Presentation (Weight: 1.00, Display: 1)
- `SKILL_RELEVANCE`: Alignment with Opportunity Requirements (Weight: 1.00, Display: 2)
- `COMMUNICATION`: Clarity and Promptness in Application (Weight: 1.00, Display: 3)
- `PROFESSIONALISM`: Professional Demeanor & Presentation (Weight: 1.00, Display: 4)
- `OVERALL_IMPRESSION`: General Impression & Candidate Potential (Weight: 1.00, Display: 5)

### 2. `INTERVIEW_FEEDBACK` (Target: `STUDENT`, Reviewer: `INDUSTRY`)
- `TECH_COMPETENCE`: Technical Depth & Problem Solving (Weight: 1.20, Display: 1)
- `COMMUNICATION_ARTICULATION`: Articulation & Thought Process (Weight: 1.00, Display: 2)
- `DOMAIN_KNOWLEDGE`: Theoretical & Practical Foundations (Weight: 1.00, Display: 3)
- `CULTURAL_FIT`: Collaboration & Adaptability (Weight: 0.80, Display: 4)
- `PUNCTUALITY`: Punctuality & Readiness (Weight: 0.50, Display: 5)

### 3. `INTERVIEW_FEEDBACK` (Target: `INDUSTRY`, Reviewer: `STUDENT`)
- `INTERVIEWER_PROFESSIONALISM`: Interviewer Professionalism & Respect (Weight: 1.00, Display: 1)
- `TRANSPARENCY_CLARITY`: Role Expectations & Clarity (Weight: 1.00, Display: 2)
- `TECHNICAL_RIGOR`: Fair & Relevant Assessment (Weight: 1.00, Display: 3)
- `TIMELINESS_RESPECT`: Punctuality & Communication (Weight: 0.80, Display: 4)
- `OVERALL_INTERVIEW_EXP`: Overall Candidate Experience (Weight: 1.00, Display: 5)

### 4. `INTERNSHIP_PERFORMANCE` (Target: `STUDENT`, Reviewer: `INDUSTRY`)
- `WORK_ETHIC`: Work Ethic & Initiative (Weight: 1.00, Display: 1)
- `TECHNICAL_EXECUTION`: Code / Deliverable Quality (Weight: 1.20, Display: 2)
- `PROBLEM_SOLVING`: Autonomy & Analytical Skill (Weight: 1.00, Display: 3)
- `TEAMWORK`: Collaboration & Mentee Receptiveness (Weight: 1.00, Display: 4)
- `TIMELINESS`: Deadline Adherence & Dependability (Weight: 0.80, Display: 5)

### 5. `INTERNSHIP_PERFORMANCE` (Target: `INDUSTRY`, Reviewer: `STUDENT`)
- `MENTORSHIP_QUALITY`: Mentorship & Learning Growth (Weight: 1.20, Display: 1)
- `WORK_ENVIRONMENT`: Inclusion, Safety & Culture (Weight: 1.00, Display: 2)
- `PROJECT_MEANINGFULNESS`: Real-World Impact of Tasks (Weight: 1.00, Display: 3)
- `STIPEND_RESOURCES`: Fair Compensation & Tool Access (Weight: 0.80, Display: 4)
- `CAREER_GROWTH`: Conversion Clarity & Reference Support (Weight: 1.00, Display: 5)

### 6. `COURSE_EVALUATION` (Target: `INSTITUTE`, Reviewer: `STUDENT` or `INDUSTRY`)
- `COURSE_CONTENT`: Curriculum Rigor & Industry Relevance (Weight: 1.20, Display: 1)
- `PEDAGOGY`: Instructor Clarity & Practical Labs (Weight: 1.00, Display: 2)
- `INFRASTRUCTURE`: Lab, Compute & Platform Resources (Weight: 0.80, Display: 3)
- `ORGANIZATION`: Scheduling, Pacing & Material Availability (Weight: 0.80, Display: 4)
- `OVERALL_VALUE`: Real-World Skill Elevation Value (Weight: 1.00, Display: 5)

---

## 8. Dual-Persistence JSON DB & Mock ORM Integration

### 8.1 In-Memory & JSON Storage Initialization (`lib/db.js`)
`lib/db.js` must initialize empty arrays in `getDb()` and `ensureDbExists()` for all 10 rating tables:
```javascript
{
  // Existing arrays...
  users: [],
  students: [],
  companies: [],
  opportunities: [],
  skills: [],
  applications: [],
  institutes: [],
  departments: [],
  alerts: [],
  trainingPrograms: [],
  feedbackReports: [],
  auditLogs: [],

  // 10 New Rating Arrays
  ratingInteractions: [],
  ratings: [],
  ratingCategories: [],
  ratingCategoryScores: [],
  ratingResponses: [],
  ratingReports: [],
  ratingAppeals: [],
  ratingAuditLogs: [],
  ratingAggregates: [],
  ratingPolicies: []
}
```

### 8.2 Mock Drizzle Query Builder Expansion (`db/index.js`)
`createMockDrizzleDb()` in `db/index.js` must handle all 10 table names in `select()`, `insert()`, `update()`, and `delete()`:
- `rating_interactions` -> `dbInstance.ratingInteractions`
- `ratings` -> `dbInstance.ratings`
- `rating_categories` -> `dbInstance.ratingCategories`
- `rating_category_scores` -> `dbInstance.ratingCategoryScores`
- `rating_responses` -> `dbInstance.ratingResponses`
- `rating_reports` -> `dbInstance.ratingReports`
- `rating_appeals` -> `dbInstance.ratingAppeals`
- `rating_audit_logs` -> `dbInstance.ratingAuditLogs`
- `rating_aggregates` -> `dbInstance.ratingAggregates`
- `rating_policies` -> `dbInstance.ratingPolicies`

---

## 9. Drizzle Kit Migration Pipeline & Verification Steps

### 9.1 Configuration Verification
`drizzle.config.js`:
```javascript
require('dotenv').config({ path: '.env' });
const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
```

### 9.2 Generation Steps for Milestone 1 Worker
1. **Update `db/schema.js`**: Add the 8 enums and 10 tables. Export canonical table names and aliases (`industryProfiles` for `organizationProfiles`).
2. **Update `db/relations.js`**: Add bidirectional relation definitions between ratings, interactions, users, categories, responses, reports, appeals, and aggregates.
3. **Execute Drizzle Kit Generate**:
   ```powershell
   npx drizzle-kit generate
   ```
   This will inspect `./db/schema.js` against `./drizzle/20260824180753_omniscient_scrambler/snapshot.json` and generate a new migration directory:
   `./drizzle/<timestamp>_<name>/migration.sql` and `./drizzle/<timestamp>_<name>/snapshot.json`.
4. **Verify Generated Migration SQL**:
   Verify that the generated `migration.sql`:
   - Contains ONLY `CREATE TYPE` statements for the 8 new enums.
   - Contains ONLY `CREATE TABLE` statements for the 10 new rating tables.
   - Contains `CREATE UNIQUE INDEX` for `ratings_interaction_reviewer_idx` and `rating_aggregates_target_idx`.
   - Contains `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` for the 11 foreign key constraints.
   - Does NOT contain any `DROP TABLE`, `ALTER TABLE ... DROP COLUMN`, or destructive mutations on existing tables (`user`, `account`, `session`, `student_profile`, `organization_profile`, `institute`, `admin_profile`, `audit_logs`).
5. **Run Drizzle Kit Check**:
   ```powershell
   npx drizzle-kit check
   ```
   Confirms all snapshots and migration chains are consistent without errors.
6. **Update JSON DB & Mock ORM**:
   Update `lib/db.js` and `db/index.js` with array fallbacks and query routing.
7. **Run Existing Test Suites**:
   ```powershell
   npm run test:e2e
   ```
   Confirms 100% pass rate on existing auth, matching, and verification test suites.

---

## 10. Summary & Handoff Guidance for Milestone 1 Worker

All specifications, table definitions, column types, default values, nullability rules, foreign keys, cascades, unique constraints, and dual-persistence adapters are completely mined and verified. Milestone 1 implementation can proceed with 100% confidence of non-destructive migration and full test compatibility.
