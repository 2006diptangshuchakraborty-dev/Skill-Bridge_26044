## 2026-08-23T13:45:02Z
You are the Security & Architecture Explorer for the Skill Bridge platform.
Your working directory is e:/sih_2026_044/.agents/survey_architecture_explorer/.
The authoritative user request is at e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.

Task:
1. Read e:/sih_2026_044/.agents/ORIGINAL_REQUEST.md.
2. Design the complete end-to-end technical architecture for the authentication, authorization, and profile system:
   - Database schema design (Drizzle ORM for PostgreSQL/Neon): Better Auth tables (user, session, account, verification), signup_intents (id, token, role, email, expiresAt, used), student_profile, organization_profile, admin_profile, audit_logs. Strict 1:1 constraints and indices.
   - Tamper-proof role assignment architecture: server-side signup intent flow before initiating Google OAuth, OAuth callback hook/plugin or post-OAuth role attachment ensuring 1 Google Account = 1 Role, immutability of role, strict admin restriction.
   - Multi-step onboarding state machine and dynamic completion calculation for student and organization.
   - Admin governance workflows: verification queue, capability gating for pending/suspended orgs.
   - Next.js middleware and API route authorization helper (session + role + accountStatus + ownership validation).
3. Write your architecture proposal to e:/sih_2026_044/.agents/survey_architecture_explorer/architecture_proposal.md and write e:/sih_2026_044/.agents/survey_architecture_explorer/handoff.md.
4. Send a completion message to the parent orchestrator with the link to your report.
