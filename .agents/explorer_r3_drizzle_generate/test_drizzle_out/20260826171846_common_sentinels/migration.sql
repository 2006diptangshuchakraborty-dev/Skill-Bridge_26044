CREATE TYPE "account_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "onboarding_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "org_verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'INFO_REQUESTED');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('STUDENT', 'INDUSTRY', 'INSTITUTE', 'ORGANIZATION', 'ADMIN');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"company_name" text NOT NULL,
	"registration_number" text UNIQUE,
	"tax_id_gstin" text,
	"company_type" text,
	"industry" text,
	"company_size" text,
	"website" text,
	"logo_url" text,
	"contact_phone" text,
	"address" jsonb DEFAULT '{}' NOT NULL,
	"primary_contact_name" text,
	"primary_contact_phone" text,
	"primary_contact_designation" text,
	"documents" jsonb DEFAULT '[]' NOT NULL,
	"verification_docs" jsonb DEFAULT '[]' NOT NULL,
	"hiring_preferences" jsonb DEFAULT '{}' NOT NULL,
	"verification_status" "org_verification_status" DEFAULT 'PENDING'::"org_verification_status" NOT NULL,
	"verification_notes" text,
	"admin_notes" text,
	"verified_by_admin_id" text,
	"verified_at" timestamp with time zone,
	"profile_completion" integer DEFAULT 0 NOT NULL,
	"current_onboarding_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"institute_name" text NOT NULL,
	"institute_code" text UNIQUE,
	"institute_type" text,
	"address" jsonb DEFAULT '{}' NOT NULL,
	"website" text,
	"logo_url" text,
	"contact_phone" text,
	"official_email" text,
	"departments" jsonb DEFAULT '[]' NOT NULL,
	"placement_contact" jsonb DEFAULT '{}' NOT NULL,
	"verification_status" "org_verification_status" DEFAULT 'PENDING'::"org_verification_status" NOT NULL,
	"verification_docs" jsonb DEFAULT '[]' NOT NULL,
	"profile_completion" integer DEFAULT 0 NOT NULL,
	"current_onboarding_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_code" varchar(255) UNIQUE,
	"field" varchar(255) NOT NULL,
	"exam" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"chapter" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"subtopic" varchar(255),
	"exam_date" varchar(255),
	"exam_shift" varchar(255),
	"question_type" varchar(255) DEFAULT 'MCQ' NOT NULL,
	"difficulty" varchar(255) DEFAULT 'MEDIUM' NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"negative_marks" double precision DEFAULT 0 NOT NULL,
	"question_statement" text NOT NULL,
	"question_img_url_1" varchar(255),
	"question_img_url_2" varchar(255),
	"question_img_url_3" varchar(255),
	"option_a" text NOT NULL,
	"option_a_img_url" varchar(255),
	"option_b" text NOT NULL,
	"option_b_img_url" varchar(255),
	"option_c" text NOT NULL,
	"option_c_img_url" varchar(255),
	"option_d" text NOT NULL,
	"option_d_img_url" varchar(255),
	"option_e" text,
	"option_e_img_url" varchar(255),
	"option_f" text,
	"option_f_img_url" varchar(255),
	"correct_answer" varchar(255) NOT NULL,
	"numerical_answer" integer,
	"solution_text" text DEFAULT '' NOT NULL,
	"solution_img_url_1" varchar(255),
	"video_solution_url" varchar(255),
	"language" varchar(255) DEFAULT 'EN' NOT NULL,
	"estimated_time_sec" integer DEFAULT 60 NOT NULL,
	"tags" varchar(255) DEFAULT '' NOT NULL,
	"status" varchar(255) DEFAULT 'ACTIVE' NOT NULL,
	"industry_id" uuid,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"interaction_id" text,
	"reviewer_user_id" text NOT NULL,
	"reviewer_role" text NOT NULL,
	"target_user_id" text,
	"target_role" text NOT NULL,
	"target_entity_id" text,
	"question_id" uuid,
	"student_id" uuid,
	"industry_id" uuid,
	"institute_id" uuid,
	"context_type" text,
	"overall_score" double precision NOT NULL,
	"scores" jsonb DEFAULT '{}' NOT NULL,
	"feedback" text,
	"recommendation" text,
	"status" text DEFAULT 'PUBLISHED' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	"expiresAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"headline" text,
	"bio" text,
	"institute_id" uuid,
	"institute_name" text,
	"degree" text,
	"department" text,
	"graduation_year" integer,
	"year_of_study" text,
	"cgpa" text,
	"skills" jsonb DEFAULT '[]' NOT NULL,
	"projects" jsonb DEFAULT '[]' NOT NULL,
	"certifications" jsonb DEFAULT '[]' NOT NULL,
	"experience" jsonb DEFAULT '[]' NOT NULL,
	"github" text,
	"linkedin" text,
	"portfolio" text,
	"hobby" text,
	"career_preferences" jsonb DEFAULT '{}' NOT NULL,
	"profile_completion" integer DEFAULT 0 NOT NULL,
	"current_onboarding_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'STUDENT'::"user_role" NOT NULL,
	"account_status" "account_status" DEFAULT 'ACTIVE'::"account_status" NOT NULL,
	"onboarding_status" "onboarding_status" DEFAULT 'NOT_STARTED'::"onboarding_status" NOT NULL,
	"profile_completed" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" ("providerId","accountId");--> statement-breakpoint
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
CREATE INDEX "session_user_idx" ON "session" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" ("token");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_id_idx" ON "students" ("user_id");--> statement-breakpoint
CREATE INDEX "students_institute_id_idx" ON "students" ("institute_id");--> statement-breakpoint
CREATE INDEX "students_department_idx" ON "students" ("department");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" ("role");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "user" ("account_status");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_verified_by_admin_id_user_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "institutes" ADD CONSTRAINT "institutes_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_user_id_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_question_id_questions_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_institute_id_institutes_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_institute_id_institutes_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE SET NULL;