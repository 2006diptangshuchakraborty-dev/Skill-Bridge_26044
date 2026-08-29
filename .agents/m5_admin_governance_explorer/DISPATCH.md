## 2026-08-23T14:07:53Z
Task:
1. Design the complete frontend and API architecture for Admin Governance and Organization Gatekeeping:
   - Admin KYC Verification Queue & Management at `app/admin/verifications/page.jsx` and `app/admin/dashboard/page.jsx`:
     - Verification Queue table showing pending organizations with verification documents, CIN/GSTIN, contact info, and status (`PENDING`, `APPROVED`, `REJECTED`, `INFO_REQUESTED`).
     - Actions: Approve (sets `verificationStatus: 'APPROVED'`, `accountStatus: 'ACTIVE'`), Reject (sets `verificationStatus: 'REJECTED'`, `accountStatus: 'SUSPENDED'`), Request Info (sets `verificationStatus: 'INFO_REQUESTED'`, adds admin notes).
     - User Management: List all users, toggle statuses (`ACTIVE`, `PENDING`, `SUSPENDED`, `DEACTIVATED`).
     - Audit Trail Explorer at `app/admin/audit-logs/page.jsx`: View all immutable audit events with actor, action, timestamp, metadata.
   - Admin API endpoints:
     - `app/api/admin/verifications/route.js`: GET pending organizations, POST/PATCH verification decisions (with audit logging).
     - `app/api/admin/users/route.js`: GET users with filters, PATCH user status (with audit logging).
     - `app/api/admin/audit-logs/route.js`: GET audit logs with search/filtering.
   - Organization Capability Gatekeeping rules in backend APIs & UI:
     - In opportunity creation/publishing APIs (`app/api/opportunities/route.js` or recruiter routes): If organization `verificationStatus !== 'APPROVED'` or `accountStatus !== 'ACTIVE'`, allow creating/editing DRAFT listings only, but reject PUBLISH with 403 Forbidden ("Organization verification is pending approval. You can only save drafts.").
     - In student candidate PII endpoints / candidate search: If organization is `PENDING`, `SUSPENDED`, or `REJECTED`, mask candidate PII (email, phone, exact resume) with "[Verification Required]".
2. Write your implementation blueprint to `e:/sih_2026_044/.agents/m5_admin_governance_explorer/m5_blueprint.md` and write `e:/sih_2026_044/.agents/m5_admin_governance_explorer/handoff.md`.
3. Send a completion message when done.
