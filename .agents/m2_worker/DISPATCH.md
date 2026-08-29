## 2026-08-25T14:47:18Z

You are the Worker subagent for Milestone 2 (Rating Eligibility & Server-Side Security Engine).
Your working directory is: `e:\sih_2026_044\.agents\m2_worker`
The original user request is at: `e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md` (READ THIS FIRST!)
The project architecture and contracts are at: `e:\sih_2026_044\.agents\PROJECT.md`
Prior survey analysis: `e:\sih_2026_044\.agents\explorer_survey_backend\analysis.md`
Project root: `e:\sih_2026_044`

Files you own exclusively for editing:
- `lib/rating-engine.js`
- `app/api/ratings/route.js`
- `app/api/ratings/[id]/route.js`
- `app/api/ratings/eligibility/route.js`
- `app/api/ratings/pending/route.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your tasks:
1. Implement `lib/rating-engine.js` with:
   - `getRatingEligibility({ reviewerUserId, targetEntityId, targetEntityType, interactionId, contextType })`: checks Better Auth session, target entity, interaction state (e.g. `Application.status = REVIEWED`), context, deadline, duplicate submission constraint `(interactionId, reviewerUserId)`, and self-rating prohibition.
   - `createRating(payload)`: calculates weighted overall score (1.0-5.0), validates category integer scores (1-5), executes 2-way blind review publication logic (`PENDING_PUBLICATION` until mutual submission or deadline), prevents self-rating, applies rate-limiting, writes to `ratings`, `rating_category_scores`, updates `rating_interactions`, records `rating_audit_logs`, and triggers aggregate recalculation.
   - `getPendingRatingsForUser(userId, role)`: queries interactions where user has not yet submitted a rating and deadline has not expired.
   - Strict terminology: `STUDENT`, `INDUSTRY`, `INSTITUTE`.
2. Implement Next.js App Router API Route Handlers:
   - `app/api/ratings/route.js`: `GET` (filter published ratings by targetRole, targetEntityId) and `POST` (create rating with `withAuth`, `requireActive: true`).
   - `app/api/ratings/[id]/route.js`: `GET` (fetch single rating detail with category scores).
   - `app/api/ratings/eligibility/route.js`: `GET`/`POST` (calls `getRatingEligibility`).
   - `app/api/ratings/pending/route.js`: `GET` (calls `getPendingRatingsForUser` with `withAuth`).
3. Verify your implementation by running:
   - `node tests/test-rating-system.js` (Verify all 46 tests across 4 tiers PASS 100%)
   - `npm run test:e2e` (Verify 54 / 54 tests PASS)
4. Write your handoff report to `e:\sih_2026_044\.agents\m2_worker\handoff.md` and notify the orchestrator.
