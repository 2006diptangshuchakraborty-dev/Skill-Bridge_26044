CREATE TABLE "mcq_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source_id" text NOT NULL UNIQUE,
	"field" text NOT NULL,
	"subject" text NOT NULL,
	"question_statement" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_created_by_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_reviewer_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_target_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_institute_id_institutes_id_fkey";--> statement-breakpoint
ALTER TABLE "industries" DROP CONSTRAINT "organization_profile_verified_by_admin_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "student_profile_institute_id_institute_id_fkey";--> statement-breakpoint
ALTER TABLE "industries" DROP CONSTRAINT "organization_profile_user_id_key";--> statement-breakpoint
ALTER TABLE "industries" DROP CONSTRAINT "organization_profile_registration_number_key";--> statement-breakpoint
ALTER TABLE "institutes" DROP CONSTRAINT "institute_user_id_key";--> statement-breakpoint
ALTER TABLE "institutes" DROP CONSTRAINT "institute_institute_code_key";--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_question_code_key";--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "student_profile_user_id_key";--> statement-breakpoint
DROP INDEX "account_provider_account_idx";--> statement-breakpoint
DROP INDEX "questions_code_idx";--> statement-breakpoint
DROP INDEX "questions_subject_idx";--> statement-breakpoint
DROP INDEX "questions_difficulty_idx";--> statement-breakpoint
DROP INDEX "questions_field_idx";--> statement-breakpoint
DROP INDEX "industries_registration_number_idx";--> statement-breakpoint
DROP INDEX "industries_verification_status_idx";--> statement-breakpoint
DROP INDEX "institutes_code_idx";--> statement-breakpoint
DROP INDEX "institutes_verification_status_idx";--> statement-breakpoint
DROP INDEX "ratings_reviewer_user_id_idx";--> statement-breakpoint
DROP INDEX "ratings_target_user_id_idx";--> statement-breakpoint
DROP INDEX "ratings_target_role_entity_idx";--> statement-breakpoint
DROP INDEX "ratings_question_id_idx";--> statement-breakpoint
DROP INDEX "students_institute_id_idx";--> statement-breakpoint
DROP INDEX "students_department_idx";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "issuer" text NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ADD COLUMN "role" "user_role" DEFAULT 'INDUSTRY'::"user_role";--> statement-breakpoint
ALTER TABLE "industries" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "industries" ADD COLUMN "industry_type" text;--> statement-breakpoint
ALTER TABLE "industries" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "institutes" ADD COLUMN "role" "user_role" DEFAULT 'INSTITUTE'::"user_role";--> statement-breakpoint
ALTER TABLE "institutes" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "institutes" ADD COLUMN "aishe_code" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "student_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "review" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "role" "user_role" DEFAULT 'STUDENT'::"user_role";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "registration_number";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "tax_id_gstin";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "company_type";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "industry";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "logo_url";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "primary_contact_name";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "primary_contact_phone";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "primary_contact_designation";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "verification_notes";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "admin_notes";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "verified_by_admin_id";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "verified_at";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "profile_completion";--> statement-breakpoint
ALTER TABLE "industries" DROP COLUMN "current_onboarding_step";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "institute_code";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "logo_url";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "official_email";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "profile_completion";--> statement-breakpoint
ALTER TABLE "institutes" DROP COLUMN "current_onboarding_step";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_code";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "field";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "exam";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "subject";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "chapter";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "topic";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "subtopic";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "exam_date";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "exam_shift";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_type";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "marks";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "negative_marks";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_statement";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_img_url_1";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_img_url_2";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "question_img_url_3";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_a";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_a_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_b";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_b_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_c";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_c_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_d";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_d_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_e";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_e_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_f";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "option_f_img_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "correct_answer";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "numerical_answer";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "solution_text";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "solution_img_url_1";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "video_solution_url";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "language";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "estimated_time_sec";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "created_by_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "interaction_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "reviewer_user_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "reviewer_role";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "target_user_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "target_role";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "target_entity_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "institute_id";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "context_type";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "feedback";--> statement-breakpoint
ALTER TABLE "ratings" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "institute_id";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "institute_name";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "degree";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "department";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "graduation_year";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "year_of_study";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "cgpa";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "github";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "linkedin";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "portfolio";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "hobby";--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "documents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "verification_docs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "hiring_preferences" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "verification_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "verification_status" SET DATA TYPE text USING "verification_status"::text;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "verification_status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "verification_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "departments" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "placement_contact" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "verification_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "verification_status" SET DATA TYPE text USING "verification_status"::text;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "verification_status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "verification_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "verification_docs" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "difficulty" SET DATA TYPE text USING "difficulty"::text;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "difficulty" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "status" SET DEFAULT 'OPEN';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "overall_score" SET DATA TYPE numeric(3,2) USING "overall_score"::numeric(3,2);--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "overall_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "scores" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "full_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "skills" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "projects" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "certifications" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "experience" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "career_preferences" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "profile_completion" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "current_onboarding_step" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "emailVerified" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
DROP INDEX "industries_user_id_idx";--> statement-breakpoint
CREATE INDEX "industries_user_id_idx" ON "industries" ("user_id");--> statement-breakpoint
DROP INDEX "institutes_user_id_idx";--> statement-breakpoint
CREATE INDEX "institutes_user_id_idx" ON "institutes" ("user_id");--> statement-breakpoint
DROP INDEX "students_user_id_idx";--> statement-breakpoint
CREATE INDEX "students_user_id_idx" ON "students" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_idx" ON "account" ("issuer","accountId");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" ("providerId");--> statement-breakpoint
CREATE INDEX "mcq_questions_field_idx" ON "mcq_questions" ("field");--> statement-breakpoint
CREATE INDEX "mcq_questions_subject_idx" ON "mcq_questions" ("subject");--> statement-breakpoint
CREATE INDEX "questions_student_id_idx" ON "questions" ("student_id");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_industry_id_industries_id_fkey", ADD CONSTRAINT "questions_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE;