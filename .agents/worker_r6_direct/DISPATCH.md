## 2026-08-27T02:09:08Z
You are the Implementation Worker for Round 6.
Working directory: e:\sih_2026_044\.agents\worker_r6_direct
Original User Request: e:\sih_2026_044\.agents\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work.

You MUST perform the following tool actions:

STEP 1: Delete `e:\sih_2026_044\db\drizzle-schema.js`
Use `run_command` with:
CommandLine: `powershell -Command "if (Test-Path 'e:\sih_2026_044\db\drizzle-schema.js') { Remove-Item -Force 'e:\sih_2026_044\db\drizzle-schema.js'; Write-Host 'Deleted drizzle-schema.js' } else { Write-Host 'drizzle-schema.js does not exist' }"`
Cwd: `e:\sih_2026_044`

STEP 2: Overwrite `e:\sih_2026_044\db\schema\index.js` using `write_to_file` (Overwrite: true) with EXACTLY:
[Schema index definition with relations]

STEP 3: Check and overwrite `db/schema/user.js`, `student.js`, `industry.js`, `institute.js`, `questions.js`, `ratings.js` using `write_to_file` (Overwrite: true) to ensure NO alias variables (like `users = user; export const student = students;`) exist in any of them.

STEP 4: Overwrite `e:\sih_2026_044\drizzle.config.js` using `write_to_file` (Overwrite: true) with clean drizzle config.

STEP 5: Write `e:\sih_2026_044\scripts\migrate-neon-direct.js` using `write_to_file` (Overwrite: true)

STEP 6: Overwrite `e:\sih_2026_044\scripts\test-db.js` using `write_to_file` (Overwrite: true)

STEP 7: Execute the following via `run_command` in sequence and verify each:
1. `node scripts/migrate-neon-direct.js` (Cwd: `e:\sih_2026_044`)
2. `npx drizzle-kit generate` (Cwd: `e:\sih_2026_044`) -> MUST EXIT WITH CODE 0
3. `node scripts/test-db.js` (Cwd: `e:\sih_2026_044`) -> MUST EXIT WITH CODE 0
4. `node .agents/victory_auditor_1/test-comprehensive-audit.js` (Cwd: `e:\sih_2026_044`) -> MUST PASS 100% (18/18 checks)
5. `node tests/test-auth-onboarding-e2e.js` (Cwd: `e:\sih_2026_044`) -> MUST PASS 100%

STEP 8: Write your full handoff report in `e:\sih_2026_044\.agents\worker_r6_direct\handoff.md` with full outputs and send a message to parent.
