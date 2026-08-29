/**
 * Skill Bridge Platform - Server API Authorization Guard
 * File: lib/auth-guard.js
 * 
 * Higher-Order Function wrapping Next.js route handlers with zero-trust security checks:
 * 1. Cryptographic session verification (Better Auth + DB + Mock)
 * 2. Server-owned role enforcement (STUDENT, ORGANIZATION, ADMIN)
 * 3. Account status checks (ACTIVE vs SUSPENDED / DEACTIVATED)
 * 4. Onboarding status validation (NOT_STARTED, IN_PROGRESS, COMPLETED)
 * 5. Organization KYC verification gatekeeping
 * 6. Tenant resource ownership verification (IDOR protection)
 * 7. Immutable audit trail integration via lib/audit.js
 */

import { NextResponse } from 'next/server';

/**
 * Extracts authenticated session and user from request headers, cookies, or DB
 */
async function resolveApiSession(req) {
  // Test identity headers are useful for local adversarial tests but are not an
  // authentication mechanism in production.
  if (process.env.NODE_ENV !== 'production') {
  const headerUserId = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const headerRole = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');
  const headerStatus = req.headers.get('x-account-status') || req.headers.get('x-auth-account-status');
  const headerOnboarding = req.headers.get('x-onboarding-status') || req.headers.get('x-auth-onboarding-status');

  if (headerUserId) {
    return {
      session: { id: `ses_hdr_${headerUserId}`, userId: headerUserId },
      user: {
        id: headerUserId,
        role: (headerRole || 'STUDENT').toUpperCase(),
        accountStatus: (headerStatus || 'ACTIVE').toUpperCase(),
        onboardingStatus: (headerOnboarding || 'NOT_STARTED').toUpperCase(),
      },
    };
  }
  }

  // 2. Better Auth Server Session Resolution
  try {
    const { auth } = require('./auth');
    if (auth && typeof auth.api?.getSession === 'function') {
      const sessionResult = await auth.api.getSession({ headers: req.headers });
      if (sessionResult && sessionResult.user) {
        return sessionResult;
      }
    }
  } catch (err) {
    // Fall back to direct DB lookup
  }

  // 3. Direct DB / Session Token Lookup
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:better-auth\.session_token|sb_session_token)=([^;]+)/);
    const token = match ? match[1].trim() : null;

    if (token) {
      const localDb = require('./db');
      if (localDb && typeof localDb.getDb === 'function') {
        const dbData = localDb.getDb();
        const sessionRecord = (dbData.sessions || []).find(s => s.token === token || s.sessionToken === token);
        if (sessionRecord) {
          const userRecord = (dbData.users || []).find(u => u.id === sessionRecord.userId);
          if (userRecord) {
            return { session: sessionRecord, user: userRecord };
          }
        }
      }
    }
  } catch (e) {
    // proceed to null
  }

  return null;
}

/**
 * Higher-order function wrapping Next.js API route handlers with comprehensive security checks
 */
export function withAuth(handler, options = {}) {
  const {
    roles = [],
    requireActive = true,
    requireOnboarded = false,
    requireApprovedOrg = false,
    checkOwnership = null,
    auditAction = null,
    resourceType = null,
  } = options;

  return async function protectedHandler(req, context = {}) {
    try {
      // 1. Session Authentication Check
      const authResult = await resolveApiSession(req);
      if (!authResult || !authResult.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Authentication session required',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      const { user, session } = authResult;

      // 2. Account Status Check (Suspension / Deactivation)
      if (requireActive) {
        const status = (user.accountStatus || '').toUpperCase();
        if (status === 'SUSPENDED' || status === 'DEACTIVATED') {
          return NextResponse.json(
            {
              success: false,
              error: 'Forbidden: Account is suspended or deactivated',
              code: 'ACCOUNT_SUSPENDED',
            },
            { status: 403 }
          );
        }
      }

      // 3. Role Authorization Check
      if (Array.isArray(roles) && roles.length > 0) {
        const normalizedUserRole = (user.role || '').toUpperCase();
        const normalizedAllowedRoles = roles.map(r => r.toUpperCase());

        if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Forbidden: Insufficient role permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              userRole: normalizedUserRole,
              requiredRoles: normalizedAllowedRoles,
            },
            { status: 403 }
          );
        }
      }

      // 4. Onboarding Status Check
      if (requireOnboarded) {
        const onboarding = (user.onboardingStatus || '').toUpperCase();
        if (onboarding !== 'COMPLETED') {
          return NextResponse.json(
            {
              success: false,
              error: 'Forbidden: Onboarding completion required before performing this action',
              code: 'ONBOARDING_REQUIRED',
            },
            { status: 403 }
          );
        }
      }

      // 5. Organization KYC Gatekeeping Check
      if (requireApprovedOrg && user.role === 'ORGANIZATION') {
        let isApproved = false;
        try {
          const localDb = require('./db');
          const dbData = localDb.getDb();
          const orgProfile = (dbData.organizationProfiles || []).find(p => p.userId === user.id);
          if (orgProfile && orgProfile.verificationStatus === 'APPROVED') {
            isApproved = true;
          }
        } catch {
          // fallback
        }

        if (!isApproved) {
          return NextResponse.json(
            {
              success: false,
              error: 'Action not allowed while organization verification is pending or unapproved',
              code: 'ORG_VERIFICATION_PENDING',
            },
            { status: 403 }
          );
        }
      }

      // 6. Tenant Ownership & IDOR Check
      if (typeof checkOwnership === 'function') {
        // Admin override: Admins bypass tenant resource ownership checks for governance
        if (user.role !== 'ADMIN') {
          const isOwner = await checkOwnership(authResult, req, context.params || {});
          if (!isOwner) {
            return NextResponse.json(
              {
                success: false,
                error: 'Forbidden: Resource ownership mismatch',
                code: 'IDOR_MISMATCH',
              },
              { status: 403 }
            );
          }
        }
      }

      // 7. Execute Underlying Handler
      const response = await handler(req, {
        session,
        user,
        params: context.params || {},
      });

      // 8. Automatic Audit Logging on Successful Sensitive Actions
      if (auditAction && response && response.status < 400) {
        try {
          const { logAuditEvent } = require('./audit');
          if (typeof logAuditEvent === 'function') {
            await logAuditEvent({
              actorUserId: user.id,
              action: auditAction,
              targetUserId: user.id,
              resourceType: resourceType || 'API_RESOURCE',
              resourceId: user.id,
              metadata: {
                path: req.nextUrl?.pathname || req.url,
                method: req.method,
                role: user.role,
              },
              req,
            });
          }
        } catch (auditErr) {
          console.warn('[Audit Guard Warning]: Failed to record automatic audit log:', auditErr.message);
        }
      }

      return response;
    } catch (err) {
      console.error('[Auth Guard Exception]:', err);
      return NextResponse.json(
        {
          success: false,
          error: err.message || 'Internal server error during authorization',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

export default withAuth;
