ALTER TABLE "organization_profile" RENAME TO "industries";--> statement-breakpoint
ALTER TABLE "institute" RENAME TO "institutes";--> statement-breakpoint
ALTER TABLE "student_profile" RENAME TO "students";--> statement-breakpoint
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_interaction_id_rating_interactions_id_fkey";--> statement-breakpoint
ALTER TABLE "rating_category_scores" DROP CONSTRAINT "rating_category_scores_category_id_rating_categories_id_fkey";--> statement-breakpoint
DROP TABLE "admin_profile";--> statement-breakpoint
DROP TABLE "audit_logs";--> statement-breakpoint
DROP TABLE "rating_aggregates";--> statement-breakpoint
DROP TABLE "rating_appeals";--> statement-breakpoint
DROP TABLE "rating_audit_logs";--> statement-breakpoint
DROP TABLE "rating_categories";--> statement-breakpoint
DROP TABLE "rating_category_scores";--> statement-breakpoint
DROP TABLE "rating_interactions";--> statement-breakpoint
DROP TABLE "rating_policies";--> statement-breakpoint
DROP TABLE "rating_reports";--> statement-breakpoint
DROP TABLE "rating_responses";--> statement-breakpoint
DROP TABLE "signup_intents";--> statement-breakpoint
DROP INDEX "organization_profile_user_idx";--> statement-breakpoint
DROP INDEX "organization_profile_reg_idx";--> statement-breakpoint
DROP INDEX "organization_profile_status_idx";--> statement-breakpoint
DROP INDEX "institute_profile_user_idx";--> statement-breakpoint
DROP INDEX "institute_profile_code_idx";--> statement-breakpoint
DROP INDEX "institute_profile_status_idx";--> statement-breakpoint
DROP INDEX "ratings_interaction_reviewer_idx";--> statement-breakpoint
DROP INDEX "ratings_target_status_idx";--> statement-breakpoint
DROP INDEX "ratings_reviewer_idx";--> statement-breakpoint
DROP INDEX "ratings_target_user_idx";--> statement-breakpoint
DROP INDEX "ratings_context_idx";--> statement-breakpoint
DROP INDEX "ratings_status_idx";--> statement-breakpoint
DROP INDEX "student_profile_user_idx";--> statement-breakpoint
DROP INDEX "student_profile_institute_idx";--> statement-breakpoint
DROP INDEX "student_profile_dept_idx";--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "industry_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "created_by_id" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "question_id" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "student_id" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "industry_id" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "institute_id" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "scores" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "full_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "portfolio" text;--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "headline";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "review_text";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "pros";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "cons";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "is_blind";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "published_at";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "fullName";--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_pkey";--> statement-breakpoint
ALTER TABLE "questions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "interaction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "reviewer_role" SET DATA TYPE text USING "reviewer_role"::text;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "target_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "target_role" SET DATA TYPE text USING "target_role"::text;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "target_entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "context_type" SET DATA TYPE text USING "context_type"::text;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "context_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "overall_score" SET DATA TYPE double precision USING "overall_score"::double precision;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "recommendation" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "recommendation" SET DATA TYPE text USING "recommendation"::text;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "recommendation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "is_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "institute_id" SET DATA TYPE uuid USING "institute_id"::uuid;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "subtopic" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "exam_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "exam_shift" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question_type" SET DEFAULT 'MCQ';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "difficulty" SET DEFAULT 'MEDIUM';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "marks" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "negative_marks" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "solution_text" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "language" SET DEFAULT 'EN';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "estimated_time_sec" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "tags" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_code_key" UNIQUE("question_code");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_key" UNIQUE("token");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_key" UNIQUE("email");--> statement-breakpoint
CREATE UNIQUE INDEX "industries_user_id_idx" ON "industries" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "industries_registration_number_idx" ON "industries" ("registration_number");--> statement-breakpoint
CREATE INDEX "industries_verification_status_idx" ON "industries" ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_user_id_idx" ON "institutes" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_code_idx" ON "institutes" ("institute_code");--> statement-breakpoint
CREATE INDEX "institutes_verification_status_idx" ON "institutes" ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_code_idx" ON "questions" ("question_code");--> statement-breakpoint
CREATE INDEX "questions_subject_idx" ON "questions" ("subject");--> statement-breakpoint
CREATE INDEX "questions_difficulty_idx" ON "questions" ("difficulty");--> statement-breakpoint
CREATE INDEX "questions_field_idx" ON "questions" ("field");--> statement-breakpoint
CREATE INDEX "questions_industry_id_idx" ON "questions" ("industry_id");--> statement-breakpoint
CREATE INDEX "ratings_reviewer_user_id_idx" ON "ratings" ("reviewer_user_id");--> statement-breakpoint
CREATE INDEX "ratings_target_user_id_idx" ON "ratings" ("target_user_id");--> statement-breakpoint
CREATE INDEX "ratings_target_role_entity_idx" ON "ratings" ("target_role","target_entity_id");--> statement-breakpoint
CREATE INDEX "ratings_question_id_idx" ON "ratings" ("question_id");--> statement-breakpoint
CREATE INDEX "ratings_student_id_idx" ON "ratings" ("student_id");--> statement-breakpoint
CREATE INDEX "ratings_industry_id_idx" ON "ratings" ("industry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_id_idx" ON "students" ("user_id");--> statement-breakpoint
CREATE INDEX "students_institute_id_idx" ON "students" ("institute_id");--> statement-breakpoint
CREATE INDEX "students_department_idx" ON "students" ("department");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_question_id_questions_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_institute_id_institutes_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE;--> statement-breakpoint
DROP TYPE "audit_action";--> statement-breakpoint
DROP TYPE "rating_appeal_status";--> statement-breakpoint
DROP TYPE "rating_context_type";--> statement-breakpoint
DROP TYPE "rating_interaction_status";--> statement-breakpoint
DROP TYPE "rating_interaction_type";--> statement-breakpoint
DROP TYPE "rating_recommendation";--> statement-breakpoint
DROP TYPE "rating_report_reason";--> statement-breakpoint
DROP TYPE "rating_report_status";--> statement-breakpoint
DROP TYPE "rating_status";