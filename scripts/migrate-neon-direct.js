import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "@neondatabase/serverless";

if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Ensure .env.local exists.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Connecting to live Neon database...");
  const client = await pool.connect();
  try {
    console.log("Applying safe schema expansions and migrations...");

    // 1. Ensure Better Auth core tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "emailVerified" boolean DEFAULT false NOT NULL,
        "image" text,
        "role" text DEFAULT 'STUDENT',
        "account_status" text DEFAULT 'ACTIVE',
        "onboarding_status" text DEFAULT 'NOT_STARTED',
        "profile_completed" boolean DEFAULT false,
        "last_login_at" timestamp with time zone,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY,
        "expiresAt" timestamp with time zone NOT NULL,
        "token" text NOT NULL UNIQUE,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
        "ipAddress" text,
        "userAgent" text,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY,
        "issuer" text NOT NULL,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamp with time zone,
        "refreshTokenExpiresAt" timestamp with time zone,
        "scope" text,
        "password" text,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- 2. Signup Intents Table
      CREATE TABLE IF NOT EXISTS "signup_intents" (
        "id" text PRIMARY KEY,
        "token" text NOT NULL UNIQUE,
        "role" text NOT NULL,
        "email" text,
        "expires_at" timestamp with time zone NOT NULL,
        "used" boolean DEFAULT false NOT NULL,
        "used_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "signup_intent_token_idx" ON "signup_intents" ("token");

      -- 3. Students Table & Columns
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "full_name" text,
        "email" text,
        "role" text DEFAULT 'STUDENT',
        "phone" text,
        "headline" text,
        "bio" text,
        "institute_name" text,
        "department" text,
        "degree" text,
        "year_of_study" text,
        "graduation_year" integer,
        "cgpa" text,
        "skills" jsonb DEFAULT '[]'::jsonb,
        "projects" jsonb DEFAULT '[]'::jsonb,
        "certifications" jsonb DEFAULT '[]'::jsonb,
        "experience" jsonb DEFAULT '[]'::jsonb,
        "career_preferences" jsonb DEFAULT '{}'::jsonb,
        "github_url" text,
        "linkedin_url" text,
        "profile_completion" integer DEFAULT 0,
        "current_onboarding_step" integer DEFAULT 1,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );

      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "phone" text,
        ADD COLUMN IF NOT EXISTS "institute_name" text,
        ADD COLUMN IF NOT EXISTS "department" text,
        ADD COLUMN IF NOT EXISTS "degree" text,
        ADD COLUMN IF NOT EXISTS "year_of_study" text,
        ADD COLUMN IF NOT EXISTS "graduation_year" integer,
        ADD COLUMN IF NOT EXISTS "cgpa" text,
        ADD COLUMN IF NOT EXISTS "github_url" text,
        ADD COLUMN IF NOT EXISTS "linkedin_url" text;

      DROP INDEX IF EXISTS "students_user_id_idx";
      CREATE UNIQUE INDEX IF NOT EXISTS "students_user_id_idx" ON "students" ("user_id");

      -- 4. Industries Table & Columns
      CREATE TABLE IF NOT EXISTS "industries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "role" text DEFAULT 'INDUSTRY',
        "company_name" text NOT NULL,
        "email" text,
        "registration_number" text,
        "tax_id_gstin" text,
        "company_type" text,
        "company_size" text,
        "industry" text,
        "industry_type" text,
        "website" text,
        "description" text,
        "primary_contact_name" text,
        "primary_contact_phone" text,
        "primary_contact_designation" text,
        "contact_phone" text,
        "official_email" text,
        "logo_url" text,
        "domain_focus" jsonb DEFAULT '[]'::jsonb,
        "address" jsonb DEFAULT '{}'::jsonb,
        "documents" jsonb DEFAULT '[]'::jsonb,
        "verification_docs" jsonb DEFAULT '[]'::jsonb,
        "hiring_preferences" jsonb DEFAULT '{}'::jsonb,
        "verification_status" text DEFAULT 'PENDING',
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );

      ALTER TABLE "industries"
        ADD COLUMN IF NOT EXISTS "registration_number" text,
        ADD COLUMN IF NOT EXISTS "tax_id_gstin" text,
        ADD COLUMN IF NOT EXISTS "company_type" text,
        ADD COLUMN IF NOT EXISTS "company_size" text,
        ADD COLUMN IF NOT EXISTS "industry" text,
        ADD COLUMN IF NOT EXISTS "primary_contact_name" text,
        ADD COLUMN IF NOT EXISTS "primary_contact_phone" text,
        ADD COLUMN IF NOT EXISTS "primary_contact_designation" text,
        ADD COLUMN IF NOT EXISTS "contact_phone" text,
        ADD COLUMN IF NOT EXISTS "official_email" text,
        ADD COLUMN IF NOT EXISTS "logo_url" text,
        ADD COLUMN IF NOT EXISTS "domain_focus" jsonb DEFAULT '[]'::jsonb;

      DROP INDEX IF EXISTS "industries_user_id_idx";
      CREATE UNIQUE INDEX IF NOT EXISTS "industries_user_id_idx" ON "industries" ("user_id");

      -- 5. Institutes Table & Columns
      CREATE TABLE IF NOT EXISTS "institutes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "role" text DEFAULT 'INSTITUTE',
        "institute_name" text NOT NULL,
        "email" text,
        "institute_code" text,
        "institute_type" text,
        "aishe_code" text,
        "contact_phone" text,
        "official_email" text,
        "logo_url" text,
        "website" text,
        "address" jsonb DEFAULT '{}'::jsonb,
        "departments" jsonb DEFAULT '[]'::jsonb,
        "placement_contact" jsonb DEFAULT '{}'::jsonb,
        "accreditation_details" jsonb DEFAULT '{}'::jsonb,
        "verification_docs" jsonb DEFAULT '[]'::jsonb,
        "verification_status" text DEFAULT 'PENDING',
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      );

      ALTER TABLE "institutes"
        ADD COLUMN IF NOT EXISTS "institute_code" text,
        ADD COLUMN IF NOT EXISTS "contact_phone" text,
        ADD COLUMN IF NOT EXISTS "official_email" text,
        ADD COLUMN IF NOT EXISTS "logo_url" text,
        ADD COLUMN IF NOT EXISTS "accreditation_details" jsonb DEFAULT '{}'::jsonb;

      DROP INDEX IF EXISTS "institutes_user_id_idx";
      CREATE UNIQUE INDEX IF NOT EXISTS "institutes_user_id_idx" ON "institutes" ("user_id");

      -- 6. MCQ Questions Table
      CREATE TABLE IF NOT EXISTS "mcq_questions" (
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
      CREATE INDEX IF NOT EXISTS "mcq_questions_field_idx" ON "mcq_questions" ("field");
      CREATE INDEX IF NOT EXISTS "mcq_questions_subject_idx" ON "mcq_questions" ("subject");

      -- 7. Add Unique Constraints on user_id if not already present
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_unique') THEN
          ALTER TABLE "students" ADD CONSTRAINT "students_user_id_unique" UNIQUE ("user_id");
        END IF;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'industries_user_id_unique') THEN
          ALTER TABLE "industries" ADD CONSTRAINT "industries_user_id_unique" UNIQUE ("user_id");
        END IF;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'institutes_user_id_unique') THEN
          ALTER TABLE "institutes" ADD CONSTRAINT "institutes_user_id_unique" UNIQUE ("user_id");
        END IF;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);

    console.log("Safe migration completed successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
