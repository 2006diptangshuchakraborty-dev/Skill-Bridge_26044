# DISPATCH — 2026-08-25T15:13:02Z

## Task Assignment
You are the Worker subagent for Milestone 5 (Admin Moderation, Anti-Fraud & Aggregate Recalculation).
Your working directory is: `e:\sih_2026_044\.agents\m5_worker`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md`
The project architecture is at: `e:\sih_2026_044\.agents\PROJECT.md`
Backend survey analysis: `e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md`
Project root: `e:\sih_2026_044`

Files owned exclusively:
- `app/admin/reputation/page.jsx`
- `app/api/admin/ratings/route.js`
- `app/api/admin/ratings/[id]/route.js`
- `app/api/ratings/[id]/report/route.js`
- `app/api/ratings/[id]/appeal/route.js`
- `app/api/admin/ratings/recalculate/route.js`
- `components/shared/Navbar.jsx`

Tasks:
1. Implement Admin API routes:
   - `app/api/admin/ratings/route.js`: `GET` (list and filter reviews by status: `ALL`, `PUBLISHED`, `FLAGGED`, `HIDDEN`, `UNDER_APPEAL`; by target role: `STUDENT`, `INDUSTRY`, `INSTITUTE`).
   - `app/api/admin/ratings/[id]/route.js`: `PATCH` (moderator actions: `HIDE`, `RESTORE`, `FLAG`, `REJECT` with audit logging in `rating_audit_logs`).
   - `app/api/ratings/[id]/report/route.js`: `POST` (submit review report with reasons `INAPPROPRIATE_CONTENT`, `FALSE_INFORMATION`, `HARASSMENT`, `SPAM`, `CONFLICT_OF_INTEREST`).
   - `app/api/ratings/[id]/appeal/route.js`: `POST` (submit appeal against moderated reviews).
   - `app/api/admin/ratings/recalculate/route.js`: `POST` (calls `recalculateProfileRatings(targetRole, targetEntityId)` to repair/sync aggregates).
2. Implement `app/admin/reputation/page.jsx`:
   - Moderation dashboard with KPI cards (Total Ratings, Flagged Ratings, Pending Reports/Appeals, Trust Health).
   - Filterable review management table with status tabs (`ALL`, `FLAGGED`, `HIDDEN`, `UNDER_APPEAL`, `PUBLISHED`).
   - Action controls on each review (Hide review, Restore review, View reports, View audit history).
   - Reports and Appeals management modal/panel.
   - Anti-Fraud radar highlighting suspicious spikes (e.g. surge of 5-star or 1-star reviews in short window) or unverified interactions.
   - One-click "Recalculate Profile Aggregates" tool.
3. Update `components/shared/Navbar.jsx` to add "Reputation Moderation" navigation link for Admin users.
4. Verify by running `node tests/test-rating-system.js` (Tier 3 moderation tests and Tier 4 anti-fraud tests) and creating an admin route test suite (`node tests/test-m5-admin-moderation.js`).
5. Write handoff report and notify parent orchestrator.
