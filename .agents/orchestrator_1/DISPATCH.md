## 2026-08-25T14:11:03Z

<USER_REQUEST>
You are the Project Orchestrator for the Skill Bridge platform project.
Your working directory is: `e:\sih_2026_044\.agents\orchestrator_1`
The project root is: `e:\sih_2026_044`
The original user request is recorded in: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md`

Your task:
Implement a complete, production-ready Verified Reputation, Rating, Feedback, Trust, and Review System for Skill Bridge platform across Student, Industry, and Institute entities.
Every rating must be tied to a verified platform interaction (Application Review, Interview, Task, Assessment, Internship/Job, Course, Seminar/Event).
Includes separate verification trust signals, objective skill scores vs experience reputation, blind reviews, server-verified eligibility, admin moderation, anti-fraud rules, and Drizzle/Better Auth integration.

Follow all requirements in ORIGINAL_REQUEST.md:
R1. Database Schema & Migration Architecture (Drizzle ORM & local JSON DB fallback, rating_interactions, ratings, rating_categories, rating_category_scores, rating_responses, rating_reports, rating_appeals, rating_audit_logs, rating_aggregates, rating_policies).
R2. Rating Eligibility & Server-Side Security Engine (getRatingEligibility service, Better Auth session check, transactional rating creation, score calculation, blind review publication, anti-fraud & rate-limiting, strict terminology Student/Industry/Institute).
R3. Workflow & Entity Event Integration (Application Review, Interview, Task/Assessment, Internship/Job, Course/Seminar/Event).
R4. Frontend UI Components, Profile Integration & Dashboard (Reputation & Trust breakdown on Student, Industry, Institute profiles, separate verification badges, skill scores 0-100, experience reputation 1.0-5.0 stars, interactive rating modal, Pending Ratings dashboard widget with countdown timer).
R5. Admin Moderation, Anti-Fraud, & Aggregate Recalculation (Admin review management, flagging, hiding, restoring, reports/appeals workflow with audit logs, recalculateProfileRatings utility).
Automated & Manual Acceptance Criteria verification.

Decompose this task, maintain `plan.md` and `progress.md` in your working directory `e:\sih_2026_044\.agents\orchestrator_1`, dispatch to specialist subagents, execute tests, and report back when finished.
</USER_REQUEST>
