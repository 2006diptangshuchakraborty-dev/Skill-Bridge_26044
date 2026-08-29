CREATE TYPE "rating_appeal_status" AS ENUM('PENDING_REVIEW', 'APPROVED_RESTORED', 'REJECTED', 'INFO_REQUESTED');--> statement-breakpoint
CREATE TYPE "rating_context_type" AS ENUM('APPLICATION_REVIEW', 'INTERVIEW_FEEDBACK', 'TASK_EVALUATION', 'INTERNSHIP_PERFORMANCE', 'COURSE_EVALUATION', 'SEMINAR_FEEDBACK', 'GLOBAL');--> statement-breakpoint
CREATE TYPE "rating_interaction_status" AS ENUM('PENDING_REVIEW', 'REVIEWED', 'INTERVIEW_COMPLETED', 'TASK_COMPLETED', 'INTERNSHIP_COMPLETED', 'COURSE_COMPLETED', 'COMPLETED', 'EXPIRED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "rating_interaction_type" AS ENUM('APPLICATION_REVIEW', 'INTERVIEW', 'TASK_ASSESSMENT', 'INTERNSHIP', 'JOB', 'COURSE', 'SEMINAR_EVENT');--> statement-breakpoint
CREATE TYPE "rating_recommendation" AS ENUM('RECOMMENDED', 'NEUTRAL', 'NOT_RECOMMENDED');--> statement-breakpoint
CREATE TYPE "rating_report_reason" AS ENUM('INAPPROPRIATE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'SPAM', 'CONFLICT_OF_INTEREST', 'OTHER');--> statement-breakpoint
CREATE TYPE "rating_report_status" AS ENUM('PENDING', 'INVESTIGATING', 'RESOLVED_UPHELD', 'RESOLVED_DISMISSED');--> statement-breakpoint
CREATE TYPE "rating_status" AS ENUM('PENDING_PUBLICATION', 'PUBLISHED', 'FLAGGED', 'HIDDEN', 'REJECTED', 'UNDER_APPEAL');--> statement-breakpoint
CREATE TABLE "rating_aggregates" (
	"id" text PRIMARY KEY,
	"target_role" "user_role" NOT NULL,
	"target_entity_id" text NOT NULL,
	"target_user_id" text,
	"total_ratings_count" integer DEFAULT 0 NOT NULL,
	"verified_ratings_count" integer DEFAULT 0 NOT NULL,
	"average_score" numeric(3,2) DEFAULT '0.00' NOT NULL,
	"recommendation_rate" numeric(5,2) DEFAULT '0.00' NOT NULL,
	"category_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"score_distribution" jsonb DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}' NOT NULL,
	"context_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"objective_skill_score" numeric(5,2) DEFAULT '0.00' NOT NULL,
	"verification_trust_level" text DEFAULT 'UNVERIFIED' NOT NULL,
	"last_recalculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_appeals" (
	"id" text PRIMARY KEY,
	"rating_id" text NOT NULL,
	"appellant_user_id" text NOT NULL,
	"appeal_reason" text NOT NULL,
	"evidence_docs" jsonb DEFAULT '[]' NOT NULL,
	"status" "rating_appeal_status" DEFAULT 'PENDING_REVIEW'::"rating_appeal_status" NOT NULL,
	"moderator_verdict" text,
	"reviewed_by_admin_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_audit_logs" (
	"id" text PRIMARY KEY,
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
--> statement-breakpoint
CREATE TABLE "rating_categories" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"target_role" "user_role" NOT NULL,
	"context_type" "rating_context_type" NOT NULL,
	"min_score" integer DEFAULT 1 NOT NULL,
	"max_score" integer DEFAULT 5 NOT NULL,
	"weight" numeric(3,2) DEFAULT '1.00' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_category_scores" (
	"id" text PRIMARY KEY,
	"rating_id" text NOT NULL,
	"category_id" text NOT NULL,
	"category_code" text NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_interactions" (
	"id" text PRIMARY KEY,
	"interaction_type" "rating_interaction_type" NOT NULL,
	"reference_id" text NOT NULL,
	"initiator_type" "user_role" NOT NULL,
	"initiator_id" text NOT NULL,
	"initiator_user_id" text,
	"target_type" "user_role" NOT NULL,
	"target_id" text NOT NULL,
	"target_user_id" text,
	"status" "rating_interaction_status" DEFAULT 'PENDING_REVIEW'::"rating_interaction_status" NOT NULL,
	"is_blind" boolean DEFAULT false NOT NULL,
	"deadline" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_policies" (
	"id" text PRIMARY KEY,
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
--> statement-breakpoint
CREATE TABLE "rating_reports" (
	"id" text PRIMARY KEY,
	"rating_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" "rating_report_reason" NOT NULL,
	"details" text,
	"status" "rating_report_status" DEFAULT 'PENDING'::"rating_report_status" NOT NULL,
	"moderator_notes" text,
	"resolved_by_admin_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_responses" (
	"id" text PRIMARY KEY,
	"rating_id" text NOT NULL UNIQUE,
	"responder_user_id" text NOT NULL,
	"response_text" text NOT NULL,
	"status" text DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" text PRIMARY KEY,
	"interaction_id" text NOT NULL,
	"reviewer_user_id" text NOT NULL,
	"reviewer_role" "user_role" NOT NULL,
	"target_user_id" text NOT NULL,
	"target_role" "user_role" NOT NULL,
	"target_entity_id" text NOT NULL,
	"context_type" "rating_context_type" NOT NULL,
	"overall_score" numeric(3,2) NOT NULL,
	"recommendation" "rating_recommendation" DEFAULT 'RECOMMENDED'::"rating_recommendation" NOT NULL,
	"headline" text,
	"review_text" text,
	"pros" jsonb DEFAULT '[]' NOT NULL,
	"cons" jsonb DEFAULT '[]' NOT NULL,
	"status" "rating_status" DEFAULT 'PUBLISHED'::"rating_status" NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"is_blind" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rating_aggregates_target_idx" ON "rating_aggregates" ("target_role","target_entity_id");--> statement-breakpoint
CREATE INDEX "rating_aggregates_user_idx" ON "rating_aggregates" ("target_user_id");--> statement-breakpoint
CREATE INDEX "rating_appeals_rating_idx" ON "rating_appeals" ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_appeals_appellant_idx" ON "rating_appeals" ("appellant_user_id");--> statement-breakpoint
CREATE INDEX "rating_appeals_status_idx" ON "rating_appeals" ("status");--> statement-breakpoint
CREATE INDEX "rating_audit_logs_rating_idx" ON "rating_audit_logs" ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_audit_logs_interaction_idx" ON "rating_audit_logs" ("interaction_id");--> statement-breakpoint
CREATE INDEX "rating_audit_logs_actor_idx" ON "rating_audit_logs" ("actor_user_id");--> statement-breakpoint
CREATE INDEX "rating_audit_logs_action_idx" ON "rating_audit_logs" ("action");--> statement-breakpoint
CREATE INDEX "rating_audit_logs_created_idx" ON "rating_audit_logs" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_categories_code_idx" ON "rating_categories" ("code");--> statement-breakpoint
CREATE INDEX "rating_categories_context_target_idx" ON "rating_categories" ("context_type","target_role","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_category_scores_rating_cat_idx" ON "rating_category_scores" ("rating_id","category_id");--> statement-breakpoint
CREATE INDEX "rating_category_scores_rating_idx" ON "rating_category_scores" ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_category_scores_category_idx" ON "rating_category_scores" ("category_id");--> statement-breakpoint
CREATE INDEX "rating_interactions_ref_idx" ON "rating_interactions" ("reference_id","interaction_type");--> statement-breakpoint
CREATE INDEX "rating_interactions_target_idx" ON "rating_interactions" ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "rating_interactions_initiator_idx" ON "rating_interactions" ("initiator_type","initiator_id");--> statement-breakpoint
CREATE INDEX "rating_interactions_status_idx" ON "rating_interactions" ("status","deadline");--> statement-breakpoint
CREATE INDEX "rating_interactions_init_user_idx" ON "rating_interactions" ("initiator_user_id");--> statement-breakpoint
CREATE INDEX "rating_interactions_target_user_idx" ON "rating_interactions" ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_policies_context_idx" ON "rating_policies" ("context_type");--> statement-breakpoint
CREATE INDEX "rating_reports_rating_idx" ON "rating_reports" ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_reports_reporter_idx" ON "rating_reports" ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "rating_reports_status_idx" ON "rating_reports" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_responses_rating_idx" ON "rating_responses" ("rating_id");--> statement-breakpoint
CREATE INDEX "rating_responses_responder_idx" ON "rating_responses" ("responder_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_interaction_reviewer_idx" ON "ratings" ("interaction_id","reviewer_user_id");--> statement-breakpoint
CREATE INDEX "ratings_target_status_idx" ON "ratings" ("target_role","target_entity_id","status");--> statement-breakpoint
CREATE INDEX "ratings_reviewer_idx" ON "ratings" ("reviewer_user_id");--> statement-breakpoint
CREATE INDEX "ratings_target_user_idx" ON "ratings" ("target_user_id");--> statement-breakpoint
CREATE INDEX "ratings_context_idx" ON "ratings" ("context_type");--> statement-breakpoint
CREATE INDEX "ratings_status_idx" ON "ratings" ("status");--> statement-breakpoint
ALTER TABLE "rating_aggregates" ADD CONSTRAINT "rating_aggregates_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_rating_id_ratings_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_appellant_user_id_user_id_fkey" FOREIGN KEY ("appellant_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_appeals" ADD CONSTRAINT "rating_appeals_reviewed_by_admin_id_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rating_audit_logs" ADD CONSTRAINT "rating_audit_logs_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rating_category_scores" ADD CONSTRAINT "rating_category_scores_rating_id_ratings_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_category_scores" ADD CONSTRAINT "rating_category_scores_category_id_rating_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "rating_categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "rating_interactions" ADD CONSTRAINT "rating_interactions_initiator_user_id_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_interactions" ADD CONSTRAINT "rating_interactions_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_rating_id_ratings_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_reporter_user_id_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_resolved_by_admin_id_user_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rating_responses" ADD CONSTRAINT "rating_responses_rating_id_ratings_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rating_responses" ADD CONSTRAINT "rating_responses_responder_user_id_user_id_fkey" FOREIGN KEY ("responder_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_interaction_id_rating_interactions_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "rating_interactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_user_id_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;