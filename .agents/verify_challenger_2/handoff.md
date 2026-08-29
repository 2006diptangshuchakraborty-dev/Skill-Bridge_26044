# Adversarial Challenge Verification Report (Gatekeeping, Route Access & IDOR)

**Agent**: `verify_challenger_2` (EMPIRICAL CHALLENGER - Critic / Specialist)  
**Date**: 2026-08-23  
**Working Directory**: `e:/sih_2026_044/.agents/verify_challenger_2/`  
**Verdict**: **APPROVE**

---

## 1. Observation

### A. Executed Test Harnesses & Tool Commands
1. **Master Test Suite Execution**:
   - Command: `node tests/test-auth-suite.js`
   - Result: 30 test cases executed across 4 tiers (Tier 1: Feature Coverage, Tier 2: Boundary & Corner Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios). 30 passed, 0 failed (100% pass rate).

2. **Dedicated Adversarial Challenge Suite**:
   - Command: `npx tsx tests/adversarial-gatekeeping-routes-idor.js`
   - Result: 35 targeted adversarial attacks executed against live modules, route handlers, and middleware. 35 passed, 0 failed (100% pass rate).

### B. Observed Code Structures & Line Evidence

1. **Gatekeeping & Capability Gating (`lib/gatekeeper.js`)**:
   - Lines 35-72: `checkPublishingCapability(user, orgProfile)`:
     - Directly checks `user.accountStatus !== ACCOUNT_STATUS.ACTIVE` (returns `{ allowed: false, statusCode: 403 }`).
     - Directly checks `orgProfile.verificationStatus !== KYC_STATUS.APPROVED` (returns `{ allowed: false, reason: 'Action not allowed while organization verification is pending or unapproved', statusCode: 403 }`).
     - Only `ADMIN` role or `ORGANIZATION` with `ACTIVE` account and `APPROVED` KYC status receives `{ allowed: true }`.
   - Lines 82-130: `maskCandidatePii(studentData, callerUser, callerOrgProfile)`:
     - Intercepts requests for candidate data.
     - For unapproved callers, masks `email`, `phone`, `contactPhone`, `resumeUrl`, `resumeLink`, `resume`, `linkedinUrl`, `githubUrl`, and `portfolioUrl` with `[Verification Required]`.
     - Excludes PII masking only for `ADMIN`, `ACTIVE` + `APPROVED` organizations, or when a student inspects their own record (`callerUser.id === student.userId`).

2. **Edge Route Protection & Partitioning (`middleware.js`)**:
   - Lines 16-26: Matcher captures `/student/:path*`, `/organization/:path*`, `/recruiter/:path*`, `/admin/:path*`, `/account-suspended`, `/login`, `/register`.
   - Lines 141-155: Unauthenticated access guard intercepts requests with no session and issues HTTP 307 redirect to `/login?role=[TARGET_ROLE]&redirect=[PATH]`.
   - Lines 158-162: Account status enforcement intercepts `SUSPENDED` and `DEACTIVATED` accounts and issues HTTP 307 redirect to `/account-suspended`.
   - Lines 168-207: Strict role-based URL partitioning:
     - `/admin/*` accessed by non-admin -> redirected to `/organization/dashboard` or `/student/dashboard`.
     - `/student/*` accessed by non-student -> redirected to `/admin/dashboard` or `/organization/dashboard`.
     - `/organization/*` or `/recruiter/*` accessed by non-organization -> redirected to `/admin/dashboard` or `/student/dashboard`.
     - Uncompleted onboarding (`onboardingStatus !== 'COMPLETED'`) -> redirected to `/student/onboarding` or `/organization/onboarding`.

3. **Insecure Direct Object Reference (IDOR) & Zero-Trust Route Handlers**:
   - `app/api/organization/profile/route.js`:
     - Lines 45-47: `if (requestedUserId && session && session.user.id !== requestedUserId && session.user.role !== 'ADMIN') { return NextResponse.json({ error: 'Forbidden: Cannot inspect another organization profile' }, { status: 403 }); }`
     - Lines 110-113: `if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') { return NextResponse.json({ error: 'Forbidden: You cannot modify another organization profile' }, { status: 403 }); }`
     - Lines 121-126: Non-admin updates strip `verificationStatus` and `adminNotes` from input payload.
   - `app/api/student/profile/route.js`:
     - Lines 51-54: `if (requestedUserId && session && session.user.id !== requestedUserId && session.user.role !== 'ADMIN') { return NextResponse.json({ error: 'Forbidden: Cannot access another user profile' }, { status: 403 }); }`
     - Lines 118-121: `if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') { return NextResponse.json({ error: 'Forbidden: You cannot modify another user profile' }, { status: 403 }); }`
   - `app/api/organization/onboarding/route.js` & `app/api/student/onboarding/route.js`:
     - Explicitly strips `userId`, `id`, `role`, and `verificationStatus` from client request payloads, binding updates strictly to `user.id` resolved from verified session context.
   - `app/api/admin/audit-logs/route.js`:
     - Lines 119-140: Direct REST `POST`, `PUT`, `DELETE` operations return `405 Method Not Allowed`, guaranteeing audit trail immutability.
   - `lib/auth-guard.js`:
     - Lines 184-200: Higher-Order Function `withAuth` executes tenant resource ownership validation callback (`checkOwnership`), returning `403 Forbidden` (`IDOR_MISMATCH`) upon any tenant discrepancy.

---

## 2. Logic Chain

1. **Gatekeeping Resistance**:
   - *Observation*: Tests `GATE-01` through `GATE-06` confirmed that `checkPublishingCapability` prevents `PENDING`, `SUSPENDED`, `DEACTIVATED`, `REJECTED`, `INFO_REQUESTED`, and `STUDENT` entities from publishing opportunities (HTTP 403). Only active, approved organizations or administrative overrides are permitted.
   - *Observation*: Tests `GATE-07` through `GATE-09` confirmed that `maskCandidatePii` replaces all candidate contact info, social URLs, and resume links with `[Verification Required]` for any unapproved or pending organization.
   - *Observation*: Tests `GATE-10` through `GATE-12` confirmed that client-side payload tampering attempting to inject `verificationStatus: 'APPROVED'` during profile or onboarding updates is stripped by the server, and freshly submitted onboarding flows are forced into `PENDING` KYC status.
   - *Inference*: Gatekeeping mechanisms are server-enforced and immune to client parameter tampering or capability escalation.

2. **Route Protection & Partitioning**:
   - *Observation*: Tests `ROUTE-01` through `ROUTE-07` confirmed that Next.js Edge Middleware intercepts cross-role navigation, unauthenticated navigation, suspended accounts, and un-onboarded accounts, returning HTTP 307 redirects to appropriate destinations (`/login`, `/account-suspended`, `/student/onboarding`, `/organization/onboarding`, or role dashboards).
   - *Observation*: Tests `ROUTE-08` through `ROUTE-11` confirmed that vertical privilege escalation via direct API calls (`/api/admin/verifications`, `/api/admin/users`, `/api/admin/audit-logs`) by students or non-admins returns HTTP 403 Forbidden, and direct audit mutations return HTTP 405 Method Not Allowed.
   - *Inference*: Both Edge URL routing and Server REST API endpoints enforce defense-in-depth role partitioning.

3. **Insecure Direct Object Reference (IDOR) Protection**:
   - *Observation*: Tests `IDOR-01` through `IDOR-04` confirmed that cross-tenant read and write attempts on `/api/organization/profile` and `/api/student/profile` return HTTP 403 Forbidden. Target records remain unmutated in the database.
   - *Observation*: Tests `IDOR-05` and `IDOR-06` confirmed that cross-role profile creation/mutation (e.g. Student creating an Org profile or Org creating a Student profile) returns HTTP 403 Forbidden.
   - *Observation*: Tests `IDOR-07` and `IDOR-08` confirmed that Admin governance overrides work legitimately for platform administration, while `withAuth({ checkOwnership })` rejects tenant mismatches with `IDOR_MISMATCH`.
   - *Observation*: Tests `IDOR-09` and `IDOR-10` confirmed that attempts to inject foreign `userId` into onboarding routes are sanitized, mutating only the caller's session state.
   - *Inference*: Tenant isolation and resource ownership verification are strictly enforced across all profile and onboarding surfaces.

---

## 3. Caveats

- **External Google OAuth Credentials**: Testing utilized verified cryptographic tokens, session records, and request headers (`x-user-id`, `x-user-role`, `x-account-status`). Live production OAuth flows with Google require valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets configured in `.env`.
- **Public Informational Endpoints**: Public marketing routes (e.g. `/`, `/login`, `/register`) and public search endpoints are intentionally unauthenticated by design.

---

## 4. Conclusion

All 3 core challenge domains required by the verification specification:
1. **Gatekeeping bypass resistance** (Pending/Suspended organization publishing blocks, PII masking for unverified entities, server-enforced KYC queues),
2. **Edge Route Partitioning & Middleware Protection** (Role isolation across `/student/*`, `/organization/*`, `/admin/*`, unauthenticated redirects, suspended account interception),
3. **Insecure Direct Object Reference (IDOR) & Tenant Ownership** (Cross-tenant read/write prevention, profile tamper-proofing, role integrity guards),

have been empirically executed and proven robust with 100% test pass rates across 35 adversarial test scenarios and 30 master test suite cases.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently execute and verify the empirical tests:

```powershell
# 1. Run the dedicated Adversarial Challenge Suite (35 tests):
npx tsx tests/adversarial-gatekeeping-routes-idor.js

# 2. Run the master E2E Test Suite (30 tests across 4 tiers):
node tests/test-auth-suite.js
```

### Invalidation Conditions
- Any test in `tests/adversarial-gatekeeping-routes-idor.js` or `tests/test-auth-suite.js` exits with non-zero code or assertion error.
- An unverified organization successfully receives unmasked candidate PII or publishes a live opportunity.
- An unauthorized user role accesses another role's portal or modifies foreign tenant data without administrative privileges.
