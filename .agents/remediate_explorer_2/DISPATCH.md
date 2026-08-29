## 2026-08-23T15:08:34Z
<USER_REQUEST>
You are remediate_explorer_2, an exploration agent.
Your working directory is e:/sih_2026_044/.agents/remediate_explorer_2/.
You MUST read the authoritative user request at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
You MUST read the full forensic audit report at e:/sih_2026_044/.agents/verify_auditor_1/handoff.md.

Task:
Analyze the 4 specific integrity violations and failures reported by the forensic auditor:
1. Build failure & syntax error in `lib/auth.js`.
2. Better Auth configuration in `lib/auth.js` (must use Drizzle adapter with Neon PostgreSQL schema, Google OAuth provider, server hooks for intent consumption, initial admin provisioning, and role immutability).
3. Elimination of unauthenticated fallback `defaultAdmin` in `app/api/admin/*` routes.
4. Clean deletion of duplicate `app/api/auth/[...all]/route.ts`.

Provide full blueprint details for the implementation worker.
Write your report to e:/sih_2026_044/.agents/remediate_explorer_2/handoff.md and notify parent when done.
</USER_REQUEST>
