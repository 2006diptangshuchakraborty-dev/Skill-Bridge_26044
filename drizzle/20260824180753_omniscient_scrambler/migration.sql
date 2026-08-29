CREATE TYPE "account_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "audit_action" AS ENUM('LOGIN', 'LOGOUT', 'ACCOUNT_CREATED', 'ROLE_ASSIGNED', 'ROLE_REJECTED_MISMATCH', 'ORGANIZATION_SUBMITTED', 'ORGANIZATION_APPROVED', 'ORGANIZATION_REJECTED', 'ORGANIZATION_INFO_REQUESTED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'PROFILE_UPDATED', 'OPPORTUNITY_GATED_ATTEMPT', 'CAPABILITY_VIOLATION_BLOCKED', 'ROLE_COLLISION_BLOCKED');--> statement-breakpoint
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
CREATE TABLE "admin_profile" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"admin_level" text DEFAULT 'SUPER_ADMIN' NOT NULL,
	"permissions" jsonb DEFAULT '["ALL","VERIFY_ORGANIZATIONS","MANAGE_USERS","VIEW_AUDIT_LOGS","SYSTEM_CONFIG"]' NOT NULL,
	"department" text DEFAULT 'Platform Governance' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY,
	"actor_user_id" text,
	"actor_email" text,
	"actor_role" text,
	"action" text NOT NULL,
	"target_user_id" text,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institute" (
	"id" text PRIMARY KEY,
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
CREATE TABLE "organization_profile" (
	"id" text PRIMARY KEY,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup_intents" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profile" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"fullName" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"headline" text,
	"bio" text,
	"institute_name" text,
	"institute_id" text,
	"degree" text,
	"department" text,
	"graduation_year" integer,
	"year_of_study" text,
	"cgpa" text,
	"skills" jsonb DEFAULT '[]',
	"projects" jsonb DEFAULT '[]',
	"certifications" jsonb DEFAULT '[]',
	"experience" jsonb DEFAULT '[]',
	"github" text,
	"linkedin" text,
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
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'STUDENT'::"user_role" NOT NULL,
	"account_status" "account_status" DEFAULT 'ACTIVE'::"account_status" NOT NULL,
	"onboarding_status" "onboarding_status" DEFAULT 'NOT_STARTED'::"onboarding_status" NOT NULL,
	"last_login_at" timestamp with time zone,
	"profile_completed" boolean DEFAULT false NOT NULL,
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
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_profile_user_idx" ON "admin_profile" ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institute_profile_user_idx" ON "institute" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institute_profile_code_idx" ON "institute" ("institute_code");--> statement-breakpoint
CREATE INDEX "institute_profile_status_idx" ON "institute" ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_profile_user_idx" ON "organization_profile" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_profile_reg_idx" ON "organization_profile" ("registration_number");--> statement-breakpoint
CREATE INDEX "organization_profile_status_idx" ON "organization_profile" ("verification_status");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" ("token");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "signup_intents_token_idx" ON "signup_intents" ("token");--> statement-breakpoint
CREATE INDEX "signup_intents_expires_idx" ON "signup_intents" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_user_idx" ON "student_profile" ("user_id");--> statement-breakpoint
CREATE INDEX "student_profile_institute_idx" ON "student_profile" ("institute_name");--> statement-breakpoint
CREATE INDEX "student_profile_dept_idx" ON "student_profile" ("department");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" ("role");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "user" ("account_status");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "admin_profile" ADD CONSTRAINT "admin_profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "institute" ADD CONSTRAINT "institute_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_profile" ADD CONSTRAINT "organization_profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_profile" ADD CONSTRAINT "organization_profile_verified_by_admin_id_user_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_institute_id_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institute"("id") ON DELETE SET NULL;