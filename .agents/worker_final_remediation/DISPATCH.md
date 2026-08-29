## 2026-08-27T02:05:03Z

You are the Senior Implementation Worker for Complete Schema Repair & Live Neon DB Synchronization.
Working directory: e:\sih_2026_044\.agents\worker_final_remediation
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md
Round 5 Audit Evidence: e:\sih_2026_044\.agents\orchestrator\DISPATCH.md
Comprehensive Audit Runner: e:\sih_2026_044\.agents\victory_auditor_1\test-comprehensive-audit.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
- `db/drizzle-schema.js` (MUST DELETE)
- `db/schema/index.js`
- `db/schema/user.js`
- `db/schema/student.js`
- `db/schema/industry.js`
- `db/schema/institute.js`
- `db/schema/questions.js`
- `db/schema/ratings.js`
- `drizzle.config.js`
- `lib/auth.js`
- `scripts/migrate-neon-direct.js`
- `scripts/test-db.js`

Step-by-Step Instructions:
1. Delete `db/drizzle-schema.js` from disk.
2. Edit `db/schema/index.js`:
   - Remove lines 36-55 (all alias exports like `export { user as users, user as userTable, ... }`).
   - Export ONLY the 9 canonical tables: `user`, `session`, `account`, `verification`, `students`, `industries`, `institutes`, `questions`, `ratings`, and their compiled relations (`usersRelations`, `studentsRelations`, `industriesRelations`, `institutesRelations`, `questionsRelations`, `ratingsRelations`).
   - In `db/schema/index.js`, use `import { relations } from "drizzle-orm/relations";`.
3. Edit `db/schema/user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js`:
   - Ensure each file defines and exports ONLY its canonical table(s). Remove all secondary alias variable declarations and alias exports.
4. Ensure `drizzle.config.js` points to `schema: "./db/schema/index.js"`.
5. Ensure `lib/auth.js` maps `user: schema.user, session: schema.session, account: schema.account, verification: schema.verification`.
6. Test `npx drizzle-kit generate` via `run_command` and confirm it exits with **code 0 and ZERO duplicate table/index/constraint warnings**.
7. Create and run `scripts/migrate-neon-direct.js` using `@neondatabase/serverless` Pool connecting to `process.env.DATABASE_URL`.
   The script must execute genuine SQL DDL queries to create or update all tables in the live Neon DB:
   - `account` (`id` text PRIMARY KEY, `accountId` text NOT NULL, `providerId` text NOT NULL, `userId` text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, `accessToken` text, `refreshToken` text, `idToken` text, `accessTokenExpiresAt` timestamptz, `refreshTokenExpiresAt` timestamptz, `scope` text, `password` text, `createdAt` timestamptz DEFAULT now() NOT NULL, `updatedAt` timestamptz DEFAULT now() NOT NULL)
   - `students` (`id` uuid PRIMARY KEY DEFAULT gen_random_uuid(), `user_id` text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, `full_name` text, `email` text, `headline` text, `bio` text, `skills` jsonb DEFAULT '[]'::jsonb, `projects` jsonb DEFAULT '[]'::jsonb, `certifications` jsonb DEFAULT '[]'::jsonb, `experience` jsonb DEFAULT '[]'::jsonb, `career_preferences` jsonb DEFAULT '{}'::jsonb, `profile_completion` integer DEFAULT 0, `current_onboarding_step` integer DEFAULT 1, `created_at` timestamptz DEFAULT now(), `updated_at` timestamptz DEFAULT now())
   - `industries` (`id` uuid PRIMARY KEY DEFAULT gen_random_uuid(), `user_id` text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, `company_name` text NOT NULL, `email` text, `industry_type` text, `company_size` text, `website` text, `description` text, `address` jsonb DEFAULT '{}'::jsonb, `documents` jsonb DEFAULT '[]'::jsonb, `verification_docs` jsonb DEFAULT '[]'::jsonb, `hiring_preferences` jsonb DEFAULT '{}'::jsonb, `verification_status` text DEFAULT 'PENDING', `created_at` timestamptz DEFAULT now(), `updated_at` timestamptz DEFAULT now())
   - `institutes` (`id` uuid PRIMARY KEY DEFAULT gen_random_uuid(), `user_id` text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, `institute_name` text NOT NULL, `email` text, `institute_type` text, `aishe_code` text, `website` text, `address` jsonb DEFAULT '{}'::jsonb, `departments` jsonb DEFAULT '[]'::jsonb, `placement_contact` jsonb DEFAULT '{}'::jsonb, `verification_docs` jsonb DEFAULT '[]'::jsonb, `verification_status` text DEFAULT 'PENDING', `created_at` timestamptz DEFAULT now(), `updated_at` timestamptz DEFAULT now())
   - `questions`: Ensure table has `id` uuid PRIMARY KEY DEFAULT gen_random_uuid(), `industry_id` uuid REFERENCES "industries"("id") ON DELETE CASCADE, `student_id` uuid REFERENCES "students"("id") ON DELETE SET NULL, `title` text NOT NULL, `description` text, `category` text, `difficulty` text DEFAULT 'MEDIUM', `status` text DEFAULT 'OPEN', `created_at` timestamptz DEFAULT now(), `updated_at` timestamptz DEFAULT now(). (If legacy table exists with `question_code` PK, drop legacy or migrate/add `id` uuid PK).
   - `ratings`: Ensure table has `id` uuid PRIMARY KEY DEFAULT gen_random_uuid(), `question_id` uuid REFERENCES "questions"("id") ON DELETE CASCADE, `user_id` text REFERENCES "user"("id") ON DELETE CASCADE, `student_id` uuid REFERENCES "students"("id") ON DELETE CASCADE, `industry_id` uuid REFERENCES "industries"("id") ON DELETE CASCADE, `overall_score` numeric(3,2), `scores` jsonb DEFAULT '{}'::jsonb, `recommendation` text, `review` text, `status` text DEFAULT 'PUBLISHED', `created_at` timestamptz DEFAULT now(), `updated_at` timestamptz DEFAULT now().
8. Update `scripts/test-db.js` so it asserts against `REQUIRED_TABLES = ["user", "session", "account", "verification", "students", "industries", "institutes", "questions", "ratings"]` and tests live Neon DB.
9. Execute and capture output for:
   - `node scripts/migrate-neon-direct.js`
   - `npx drizzle-kit generate`
   - `node scripts/test-db.js`
   - `node .agents/victory_auditor_1/test-comprehensive-audit.js`
   - `node tests/test-auth-onboarding-e2e.js`
10. Write full execution logs and evidence in `e:\sih_2026_044\.agents\worker_final_remediation\handoff.md` and send a completion message to parent.
