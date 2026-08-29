## 2026-08-23T15:08:34Z
<USER_REQUEST>
You are remediate_explorer_1, an exploration agent.
Your working directory is e:/sih_2026_044/.agents/remediate_explorer_1/.
You MUST read the authoritative user request at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
You MUST read the full forensic audit report at e:/sih_2026_044/.agents/verify_auditor_1/handoff.md.

Task:
Analyze the 4 specific integrity violations and failures reported by the forensic auditor:
1. `npm run build` syntax error in `lib/auth.js:14` (`Expected ',', got '!'` on `process.env.APPLE_CLIENT_ID!`).
2. `lib/auth.js` specification regression: contains unconfigured boilerplate (raw pg pool pointing to localhost, apple provider, missing Drizzle adapter, missing server lifecycle hooks for signup intents and role assignment).
3. Admin route security bypass: In `app/api/admin/audit-logs/route.js`, `app/api/admin/users/route.js`, and `app/api/admin/verifications/route.js`, `getAdminSession` defaults to `defaultAdmin` when unauthenticated.
4. Route file collision: duplicate conflicting files `route.js` and `route.ts` in `app/api/auth/[...all]/`.

Formulate a comprehensive, concrete fix strategy for each issue, specifying exact code structures, hook definitions, and removal actions needed.
Write your report to e:/sih_2026_044/.agents/remediate_explorer_1/handoff.md and notify parent when done.
</USER_REQUEST>
