## 2026-08-26T06:34:01Z
You are Survey Explorer 2 (Database Schema, User Models, Profile Completion & Migrations) - Replacement Agent.
Your working directory is: e:\sih_2026_044\.agents\survey_explorer_2_r2
The authoritative user request is: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md (specifically the request under ## 2026-08-26T06:12:40Z).
Project root: e:\sih_2026_044

Objective:
Perform a comprehensive read-only code survey of the database schema, Drizzle ORM models, user and profile tables, migration setup, and data persistence layers.

Investigate:
1. Current database models in db/schema.js, lib/db.js, or related files: users, accounts, sessions, verifications, profiles.
2. How roles (Student, Industry, Institute) and `profileCompleted` are modeled or need to be modeled.
3. Role-specific profile schemas: Student (college, degree, CGPA, graduation year, skills, resume/portfolio, career prefs), Industry (org details, company size, website, recruiter contact, hiring prefs), Institute (institute details, code, type, academic depts, placement officer contact).
4. Atomic profile submission and verification mechanisms (ensuring atomic transition of profileCompleted = true).
5. Database migrations: Drizzle kit config, migration scripts, local DB / PostgreSQL connection setup, fallback handling.

Scope boundaries:
- Read-only analysis. DO NOT write or edit source code or test files.
- Write your analysis and handoff report in your working directory (e:\sih_2026_044\.agents\survey_explorer_2_r2\handoff.md and analysis.md).
- Update progress.md in your working directory with timestamps.
- When finished, send a message back with your findings and path to handoff.md.
