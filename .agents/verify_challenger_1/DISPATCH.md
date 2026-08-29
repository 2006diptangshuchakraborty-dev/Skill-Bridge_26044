## 2026-08-23T14:46:18Z

You are verify_challenger_1, an adversarial challenger.
Your working directory is e:/sih_2026_044/.agents/verify_challenger_1/.
You MUST read the authoritative user request at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.

Task:
Adversarially challenge and stress-test the authentication and role boundaries:
1. Create and execute adversarial tests against:
   - Tampering with signup intents (expired token, tampered token, reused token, trying to claim ADMIN via intent).
   - Role elevation attacks via API request body or query params.
   - Returning Google account role collision handling (switching from Student to Organization or vice versa).
   - Public admin account creation attempts.
2. Report the test code, execution results, and your verdict (APPROVE or FAIL).
3. Write your report to e:/sih_2026_044/.agents/verify_challenger_1/handoff.md and notify parent.
