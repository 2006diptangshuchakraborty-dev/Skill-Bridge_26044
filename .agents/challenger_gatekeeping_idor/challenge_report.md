# Adversarial Challenge Report: Organization Gatekeeping, Tenant Isolation (IDOR), & Edge Middleware

- **Date**: 2026-08-23
- **Challenger Role**: Gatekeeping & IDOR Challenger (Empirical Critic / Specialist)
- **Target Systems**: Capability Gatekeeper (`lib/gatekeeper.js`), Server API Guard (`lib/auth-guard.js`), Edge Middleware (`middleware.js`), Profile APIs (`app/api/student/profile`, `app/api/organization/profile`, `app/api/admin/users`, `app/api/admin/verifications`), and In-Memory Database (`lib/db.js`).

---

## Challenge Summary

**Overall Risk Assessment**: **LOW / ROBUST** (All 42 empirical challenges passed successfully)

The security architecture of Skill Bridge incorporates zero-trust gatekeeping, server-enforced role immutability, cryptographic tenant isolation, candidate PII shielding, and edge route partitioning.

| Challenge Category | Tests Executed | Passed | Failed | Pass Rate | Status |
|---|---|---|---|---|---|
| **1. Org KYC Publishing Gating** | 10 | 10 | 0 | 100% | **PASSED** |
| **2. Candidate PII Privacy Shielding** | 10 | 10 | 0 | 100% | **PASSED** |
| **3. IDOR Tenant Isolation & API Guards** | 8 | 8 | 0 | 100% | **PASSED** |
| **4. Route Middleware Role Partitioning** | 8 | 8 | 0 | 100% | **PASSED** |
| **5. Suspended User Lockdown** | 6 | 6 | 0 | 100% | **PASSED** |
| **Total** | **42** | **42** | **0** | **100%** | **APPROVED** |

---

## Detailed Empirical Challenges & Stress Tests

### Section 1: Organization KYC Publishing Gating & Capability Checks

- **ADV-KYC-01**: Organization with `verificationStatus = 'PENDING'` attempting live publishing.
  - *Attack Scenario*: An unverified organization attempts to publish a live job opportunity without undergoing administrative verification.
  - *Expected Behavior*: Live publishing blocked with `403 Forbidden` (`code: 'ORG_VERIFICATION_PENDING'`, `allowed: false`), while saving draft opportunities remains allowed.
  - *Observed Behavior*: Returns `allowed: false, statusCode: 403, reason: 'Action not allowed while organization verification is pending or unapproved'`. Draft opportunities retain `status = 'DRAFT'` in database.
  - *Verdict*: **PASS**

- **ADV-KYC-02 & ADV-KYC-03**: Organizations with `verificationStatus = 'REJECTED'` or `'INFO_REQUESTED'`.
  - *Attack Scenario*: Rejected organizations or organizations asked for clarification try to bypass restrictions to post live roles.
  - *Observed Behavior*: Both return `403 Forbidden` and block live opportunity publication.
  - *Verdict*: **PASS**

- **ADV-KYC-04 & ADV-KYC-05**: Default state handling and verified active publishing.
  - *Attack Scenario*: Missing org profile payload attempting to bypass status checks.
  - *Observed Behavior*: Null/empty org profiles safely default to `PENDING` and return `403 Forbidden`. Organizations with `verificationStatus = 'APPROVED'` and `accountStatus = 'ACTIVE'` successfully publish (`allowed: true`).
  - *Verdict*: **PASS**

- **ADV-KYC-06 & ADV-KYC-07**: Suspended / Deactivated KYC-Approved Organizations.
  - *Attack Scenario*: Organization that was previously KYC approved is later suspended or deactivated for TOS violations, but attempts to post live jobs.
  - *Observed Behavior*: Account suspension immediately overrides KYC approval, returning `403 Forbidden` (`Account is suspended. Action blocked`).
  - *Verdict*: **PASS**

- **ADV-KYC-08 & ADV-KYC-09**: Role Spoofing & Unauthenticated Publishing.
  - *Attack Scenario*: Student token or unauthenticated caller attempts to post an opportunity.
  - *Observed Behavior*: Student token receives `403 Forbidden: Only organizations can create or publish opportunities`. Unauthenticated caller receives `401 Unauthorized`.
  - *Verdict*: **PASS**

- **ADV-KYC-10**: System Administrator Opportunity Governance.
  - *Observed Behavior*: Admins unconditionally bypass KYC gating to publish and govern opportunities platform-wide.
  - *Verdict*: **PASS**

---

### Section 2: Candidate PII Privacy Shielding & Data Sanitization

- **ADV-PII-01 to ADV-PII-03**: Unapproved Organization Candidate Access.
  - *Attack Scenario*: Unverified organization queries candidate directory to harvest student phone numbers, email addresses, resumes, and portfolio links.
  - *Observed Behavior*: `maskCandidatePii` replaces all direct contact fields (`email`, `phone`, `contactPhone`, `resumeUrl`, `resumeLink`, `resume`, `linkedinUrl`, `githubUrl`, `portfolioUrl`) with `"[Verification Required]"`. Flag `isPiiMasked: true` and `piiMaskReason` are populated. Non-PII evaluation fields (`name`, `department`, `cgpa`, `skills`) remain intact for the skill matching engine.
  - *Verdict*: **PASS**

- **ADV-PII-04**: Suspended Organization Candidate Access.
  - *Attack Scenario*: Suspended organization attempts to access candidate contact data.
  - *Observed Behavior*: PII is masked with `"[Verification Required]"`.
  - *Verdict*: **PASS**

- **ADV-PII-05**: Approved & Active Organization Access.
  - *Observed Behavior*: Verified organizations receive complete, unmasked candidate contact info and portfolio URLs.
  - *Verdict*: **PASS**

- **ADV-PII-06 & ADV-PII-07**: Admin & Self-Inspection.
  - *Observed Behavior*: Admins and students viewing their own profile receive unmasked PII.
  - *Verdict*: **PASS**

- **ADV-PII-08**: Peer Student Inspection (Peer Shielding).
  - *Attack Scenario*: Student A views Student B's profile.
  - *Observed Behavior*: Candidate PII is masked, preventing students from scraping peer contact data.
  - *Verdict*: **PASS**

- **ADV-PII-09 & ADV-PII-10**: High-Volume Batch Sanitization & Null-Safety.
  - *Observed Behavior*: Batch of 50 student candidates sanitized across 100% of records. Null and empty inputs handle cleanly without throwing exceptions.
  - *Verdict*: **PASS**

---

### Section 3: IDOR Tenant Isolation & API Profile Mutation Guards

- **ADV-IDOR-01 & ADV-IDOR-02**: Cross-Tenant Profile Modification (Student A -> Student B, Org A -> Org B).
  - *Attack Scenario*: Authenticated User A sends a PUT/PATCH request with `userId: User_B_ID` to overwrite User B's profile.
  - *Observed Behavior*: `withAuth` and profile route handlers reject the request with `403 Forbidden` (`code: 'IDOR_MISMATCH'` / `Forbidden: You cannot modify another user profile`). Target user data remains unmodified.
  - *Verdict*: **PASS**

- **ADV-IDOR-03 & ADV-IDOR-04**: Cross-Tenant Inspection & Cross-Role Profile Creation.
  - *Attack Scenario*: Student attempts to inspect another student's full profile via `?userId=...` or create an Organization profile.
  - *Observed Behavior*: Blocked with `403 Forbidden`.
  - *Verdict*: **PASS**

- **ADV-IDOR-06**: Admin Governance Override.
  - *Observed Behavior*: Admins can inspect and modify student and organization records for governance and moderation.
  - *Verdict*: **PASS**

- **ADV-IDOR-07 & ADV-IDOR-08**: Mass Assignment & Privilege Escalation Resistance.
  - *Attack Scenario*: Organization submits `verificationStatus: 'APPROVED'` in profile payload; user submits `role: 'ADMIN'` or `accountStatus: 'ACTIVE'`.
  - *Observed Behavior*: Server-side handlers explicitly strip protected server-owned fields (`role`, `accountStatus`, `verificationStatus`, `adminNotes`). Client attempts to self-approve or elevate privileges are discarded.
  - *Verdict*: **PASS**

---

### Section 4: Edge Route Middleware Partitioning & Cross-Role Access

- **ADV-ROUTE-01 to ADV-ROUTE-04**: Role Boundary Partitioning.
  - *Attack Scenario*: Student accesses `/organization/*`, `/recruiter/*`, or `/admin/*`; Organization accesses `/student/*` or `/admin/*`.
  - *Observed Behavior*: All cross-role route accesses are intercepted by Edge Middleware and redirected to the user's authorized role dashboard.
  - *Verdict*: **PASS**

- **ADV-ROUTE-05**: Unauthenticated Protected Access.
  - *Observed Behavior*: Unauthenticated requests to protected routes receive 307 redirect to `/login` with target callback URL.
  - *Verdict*: **PASS**

- **ADV-ROUTE-06 & ADV-ROUTE-07**: Onboarding Status Redirection.
  - *Observed Behavior*: Users with incomplete onboarding attempting to access `/dashboard` are automatically redirected to `/onboarding`.
  - *Verdict*: **PASS**

- **ADV-ROUTE-08**: Public Routes Allowed.
  - *Observed Behavior*: `/`, `/login`, `/register`, `/api/auth/*` permit unrestricted unauthenticated traffic without redirect loops.
  - *Verdict*: **PASS**

---

### Section 5: Suspended User Lockdown & Immediate Access Revocation

- **ADV-LOCK-01 to ADV-LOCK-04**: Immediate Access Termination.
  - *Attack Scenario*: Suspended or deactivated user attempts to navigate pages or invoke protected API endpoints.
  - *Observed Behavior*: Edge Middleware immediately blocks access (redirects to `/account-suspended` or returns 403). API Guard (`withAuth`) returns `403 Forbidden` (`code: 'ACCOUNT_SUSPENDED'`).
  - *Verdict*: **PASS**

- **ADV-LOCK-05**: Admin Moderation Pipeline & Audit Logging.
  - *Observed Behavior*: When Admin suspends a user via `PATCH /api/admin/users`, status updates immediately in DB and an immutable audit log record (`USER_SUSPENDED`) is written. Subsequent requests from that user are blocked immediately.
  - *Verdict*: **PASS**

- **ADV-LOCK-06**: Self-Lockout Defense.
  - *Observed Behavior*: Admin attempting to suspend or deactivate their own admin account is blocked with `400 Bad Request`.
  - *Verdict*: **PASS**

---

## Test Execution Logs Summary

### 1. `tests/adversarial-gatekeeping-challenge.js`
```
Total Challenge Tests: 42
Passed Challenges    : 42
Failed Challenges    : 0
Pass Rate            : 100.0%
Execution Duration   : 18ms
VERDICT              : APPROVED
```

### 2. `tests/test-auth-suite.js`
```
Total Test Suites    : 4 (Tier 1, Tier 2, Tier 3, Tier 4)
Total Test Cases     : 30
Passed Tests         : 30
Failed Tests         : 0
Pass Rate            : 100.0%
Execution Duration   : 20ms
VERDICT              : ALL TESTS PASSED
```

---

## Final Security Verdict

**VERDICT: APPROVED**

The platform implements complete capability gating, robust IDOR prevention, candidate PII privacy shielding, multi-tenant route partitioning, and immediate access termination for suspended accounts. No security regressions or bypasses were discovered.
