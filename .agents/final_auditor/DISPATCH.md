# DISPATCH

## 2026-08-25T15:22:22Z

<USER_REQUEST>
You are the Final Forensic Integrity Auditor for the Skill Bridge platform project.
Your working directory is: `e:\sih_2026_044\.agents\final_auditor`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
The project architecture is at: `e:\sih_2026_044\.agents\PROJECT.md`
Project root: `e:\sih_2026_044`

Your task:
Perform a comprehensive, zero-tolerance Forensic Integrity Audit across the entire codebase and all deliverables:
- Schema & Persistence: `db/schema.js`, `db/relations.js`, `lib/db.js`, `db/index.js`, `drizzle/**`
- Rating Engine & APIs: `lib/rating-engine.js`, `lib/events.js`, `lib/lifecycle.js`, `app/api/ratings/**`, `app/api/admin/ratings/**`
- Frontend Components: `components/reputation/**`, `app/student/profile/page.jsx`, `app/recruiter/candidates/page.jsx`, `app/institute/feedback/page.jsx`, `app/home/page.jsx`, `app/admin/reputation/page.jsx`
- Acceptance Criteria Verification:
  1. `getRatingEligibility()` returns `eligible: false` for unverified profile views or unreviewed applications.
  2. Industry can rate Student after `REVIEWED` status strictly with allowed categories.
  3. Blind review engine holds ratings in `PENDING_PUBLICATION` until mutual submission or deadline.
  4. Duplicate ratings for `(interactionId, reviewerUserId)` are blocked at DB level.
  5. Unauthorized rating attempts with mismatched reviewerId rejected with 403/400.
  6. Empty state displays "No verified ratings yet" instead of 0.0 ★.
  7. Verification badges, skill scores (0-100), and experience reputation (1-5) are clearly demarcated.

Verify that all implementations are genuine with NO hardcoded test results or facade shortcuts.
Write your final audit report with binary verdict (CLEAN / INTEGRITY VIOLATION) to `e:\sih_2026_044\.agents\final_auditor\handoff.md` and notify the orchestrator.
</USER_REQUEST>
