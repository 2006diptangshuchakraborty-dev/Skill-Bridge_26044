## 2026-08-23T14:46:18Z
You are verify_challenger_2, an adversarial challenger.
Your working directory is e:/sih_2026_044/.agents/verify_challenger_2/.
You MUST read the authoritative user request at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.

Task:
Adversarially challenge and stress-test gatekeeping, route access, and API resource ownership:
1. Create and execute adversarial tests against:
   - Gatekeeping bypass: Pending or Suspended organization attempting to publish an opportunity or query private student candidates.
   - Route bypass: Student accessing `/admin/*` or `/organization/*`, Organization accessing `/student/*` or `/admin/*`, unauthenticated requests accessing protected portals.
   - Insecure Direct Object Reference (IDOR): Organization A attempting to modify or access Organization B's private profiles/opportunities.
2. Report the test code, execution results, and your verdict (APPROVE or FAIL).
3. Write your report to e:/sih_2026_044/.agents/verify_challenger_2/handoff.md and notify parent.
