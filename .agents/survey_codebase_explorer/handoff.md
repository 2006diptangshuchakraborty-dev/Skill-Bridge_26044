# Handoff Report — Codebase & Stack Survey

**Agent**: `survey_codebase_explorer`  
**Date**: 2026-08-23  
**Handoff Type**: Hard (Task Complete)  
**Output Document**: `e:/sih_2026_044/.agents/survey_codebase_explorer/codebase_survey.md`

---

## 1. Observation

1. **Framework & Router**:
   - `package.json` line 21 defines `"next": "14.2.5"`, line 22-23 defines `"react": "^18.3.1"`, `"react-dom": "^18.3.1"`.
   - Routing structure uses Next.js **App Router** with `app/layout.jsx` and `app/page.jsx`, subdirectories `app/admin/`, `app/institute/`, `app/recruiter/`, `app/student/`, and `app/api/`.
   - No `tsconfig.json` exists at the root; the codebase uses pure JavaScript/JSX (`.js`, `.jsx`). `devDependencies` includes `"tsx": "^4.23.12"`.

2. **Package Manager & Scripts**:
   - `package-lock.json` (92,609 bytes) is present at root.
   - Command `node -v` returned `v24.11.0`, `npm -v` returned `11.6.2`.
   - Available scripts in `package.json` (lines 6-14):
     ```json
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "seed": "node scripts/seed.js",
       "test:matching": "node scripts/test-matching-rules.js",
       "test:e2e": "node scripts/run-e2e-tests.js"
     }
     ```

3. **Installed Packages vs Missing Packages**:
   - `dependencies` in `package.json`:
     - `@neondatabase/serverless: ^1.1.0` (Installed)
     - `clsx: ^2.1.1` (Installed)
     - `dotenv: ^17.4.2` (Installed)
     - `drizzle-orm: ^1.0.0-rc.4` (Installed)
     - `lucide-react: ^0.428.0` (Installed)
     - `next: 14.2.5` (Installed)
     - `react: ^18.3.1` (Installed)
     - `react-dom: ^18.3.1` (Installed)
     - `tailwind-merge: ^2.5.2` (Installed)
   - `devDependencies` in `package.json`:
     - `autoprefixer: ^10.4.20`, `drizzle-kit: ^1.0.0-rc.4`, `postcss: ^8.4.41`, `tailwindcss: ^3.4.10`, `tsx: ^4.23.12`.
   - **Missing Package**: `better-auth` is **NOT** installed in `dependencies` or `node_modules`.

4. **Database & Persistence Setup**:
   - `.env` contains `DATABASE_URL=postgresql://neondb_owner:npg_4QTjbBp2rOtl@ep-solitary-cherry-axr1b8mb-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`.
   - Current application persistence runs through `lib/db.js` using JSON file storage (`data/db.json`, seeded from `data/seed.json`).
   - No `drizzle.config.js` or Drizzle schema files exist in the project yet.

5. **Auth & Route Protection**:
   - No Better Auth route handler (`/api/auth/[...all]/route.js`) or client configuration (`lib/auth-client.js`) exists.
   - Current authentication uses mock client-side state in `components/shared/RoleSwitcher.jsx` (saving `sih_active_student_id` in localStorage).
   - No `middleware.js` or server-side role gating is implemented.
   - Portal pages exist for `/student/*`, `/recruiter/*`, `/institute/*`, `/admin/*`, but no onboarding pages exist (`/student/onboarding`, `/organization/onboarding`).

6. **Test Infrastructure & Build**:
   - `tests/test-runner.js` executes 191 standalone tests across 4 tiers with 100% pass rate in 296ms (Exit code 0).
   - `npm run build` executed `next build` and completed with 0 errors across 28 routes.

---

## 2. Logic Chain

1. **Step 1 (Framework & Router Verification)**:
   - Observation 1 confirms Next.js 14.2.5 App Router in `.js`/`.jsx`. Therefore, all new auth route handlers (`/api/auth/[...all]/route.js`), onboarding pages, and middleware should align with App Router conventions.
2. **Step 2 (Package & Dependency Audit)**:
   - Observation 3 shows `better-auth` is missing while `drizzle-orm`, `drizzle-kit`, and `@neondatabase/serverless` are already installed. Therefore, running `npm install better-auth` is the only core dependency installation required before configuring Better Auth.
3. **Step 3 (Persistence Transition to Drizzle/Neon)**:
   - Observation 4 indicates that a working Neon PostgreSQL `DATABASE_URL` is configured, but Drizzle schema definitions and migrations have not yet been authored. Therefore, creating `drizzle.config.js` and `lib/db/schema.js` for Better Auth tables (`user`, `session`, `account`, `verification`), signup intents (`signup_intents`), role profiles (`student_profile`, `organization_profile`, `admin_profile`), and governance (`audit_logs`) is the required path.
4. **Step 4 (Security & Middleware Implementation)**:
   - Observation 5 confirms no server-side route protection or Better Auth handlers exist. Therefore, a server instance `lib/auth.js`, client helper `lib/auth-client.js`, route handler `app/api/auth/[...all]/route.js`, and `middleware.js` must be implemented to fulfill requirements R1, R2, and R6.
5. **Step 5 (Onboarding & Portal Integration)**:
   - Observation 5 notes that `/student/onboarding` and `/organization/onboarding` are missing. Integrating these flows with role-based redirection will satisfy R4 and R5.

---

## 3. Caveats

- The current repository utilizes `/recruiter/*` for employer functions, whereas `ORIGINAL_REQUEST.md` specifies `/organization/*` and role `ORGANIZATION`. The system should provide `/organization/*` routes or proxy mappings to maintain backwards compatibility while adhering strictly to the required `ORGANIZATION` role spec.
- Real Google OAuth login requires valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. For local offline testing, mock credentials or local session test bypasses can be provided alongside production Google OAuth configuration.
- No other caveats.

---

## 4. Conclusion

The repository is built on Next.js 14.2.5 (App Router, JavaScript/Tailwind CSS) with an active Neon PostgreSQL database URL. To implement the full role-based authentication and governance requirements of `ORIGINAL_REQUEST.md`:
1. Install `better-auth`.
2. Configure `drizzle.config.js` and Drizzle schemas in `lib/db/schema.js`.
3. Create Better Auth server (`lib/auth.js`), client (`lib/auth-client.js`), and handler (`app/api/auth/[...all]/route.js`).
4. Implement `middleware.js` for server-side role and session protection.
5. Build `/student/onboarding` and `/organization/onboarding` flows.
6. Add environment variable documentation in `.env.example`.

---

## 5. Verification Method

To independently verify these findings:
1. **Next.js & React Version**: Inspect `package.json` lines 21-23 (`view_file` on `package.json`).
2. **App Router Structure**: Check directories `app/` and route handlers in `app/api/` (`list_dir` on `e:/sih_2026_044/app`).
3. **Dependencies**: Run `npm ls better-auth` (returns not found) and `npm ls drizzle-orm` (returns `drizzle-orm@1.0.0-rc.4`).
4. **Test Suite Verification**: Run `node tests/test-runner.js` in terminal — confirms 191/191 tests pass with Exit Code 0.
5. **Production Build**: Run `npm run build` in terminal — confirms Next.js compiles 28 routes with Exit Code 0.
