/**
 * Skill Bridge Platform - Admin Rating Detail & Moderation Action API
 * Endpoint: /api/admin/ratings/[id]
 * Methods: GET, PATCH
 * File: app/api/admin/ratings/[id]/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb, saveDb, logRatingAuditEvent } from '../../../../../lib/db.js';
import {
  hideRating,
  restoreRating,
  recalculateProfileRatings,
  RATING_STATUS,
  APPEAL_STATUS,
  REPORT_STATUS,
} from '../../../../../lib/rating-engine.js';

/**
 * Resolves admin session from request headers or DB session
 */
function getAdminSession(req) {
  if (process.env.NODE_ENV !== 'production') {
    const roleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role') || '';
    const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id') || '';
    const authHeader = req.headers.get('authorization') || '';

    if (roleHeader.toUpperCase() === 'ADMIN' || authHeader.toLowerCase().includes('admin')) {
      return {
        user: {
          id: userIdHeader || 'usr_adm_master',
          role: 'ADMIN',
          name: 'System Administrator',
          email: 'admin@skillbridge.gov',
        },
      };
    }
  }

  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:better-auth\.session_token|sb_session_token)=([^;]+)/);
    const token = match ? match[1].trim() : null;

    const dbData = getDb();
    if (token) {
      const sessionRecord = (dbData.sessions || []).find(s => s.token === token || s.sessionToken === token);
      if (sessionRecord) {
        const userRecord = (dbData.users || []).find(u => u.id === sessionRecord.userId);
        if (userRecord && userRecord.role === 'ADMIN') {
          return { user: userRecord };
        }
      }
    }

    const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id') || '';
    if (userIdHeader) {
      const user = (dbData.users || []).find(u => u.id === userIdHeader);
      if (user && user.role === 'ADMIN') {
        return { user };
      }
    }

    const defaultAdmin = (dbData.users || []).find(u => u.role === 'ADMIN');
    if (defaultAdmin && process.env.NODE_ENV !== 'production' && !userIdHeader) {
      return { user: defaultAdmin };
    }
  } catch (e) {
    // Proceed
  }

  return null;
}

/**
 * GET /api/admin/ratings/[id]
 * Fetch detailed rating inspection data with category scores, reports, appeals, and full audit logs
 */
export async function GET(request, { params }) {
  try {
    const session = getAdminSession(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin privileges required', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    const { id } = params || {};
    if (!id) {
      return NextResponse.json({ success: false, error: 'Rating ID is required' }, { status: 400 });
    }

    const dbData = getDb();
    const allRatings = dbData.ratings || [];
    const rating = allRatings.find(r => r.id === id);

    if (!rating) {
      return NextResponse.json(
        { success: false, error: `Rating with ID '${id}' not found`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const categoryScores = (dbData.ratingCategoryScores || []).filter(cs => cs.ratingId === id);
    const reports = (dbData.ratingReports || []).filter(rep => rep.ratingId === id);
    const appeals = (dbData.ratingAppeals || []).filter(app => app.ratingId === id);
    const auditLogs = (dbData.ratingAuditLogs || []).filter(log => log.ratingId === id);
    const reviewer = (dbData.users || []).find(u => u.id === rating.reviewerUserId) || null;
    const targetUser = (dbData.users || []).find(u => u.id === rating.targetUserId || u.id === rating.targetEntityId) || null;

    return NextResponse.json({
      success: true,
      rating: {
        ...rating,
        categoryScores,
        reports,
        appeals,
        auditLogs,
        reviewer: reviewer
          ? { id: reviewer.id, name: reviewer.name, email: reviewer.email, role: reviewer.role }
          : null,
        target: targetUser
          ? { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: rating.targetRole }
          : { id: rating.targetEntityId, role: rating.targetRole },
      },
    });
  } catch (err) {
    console.error('[Admin Rating Detail GET Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error fetching rating details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ratings/[id]
 * Moderator actions: HIDE, RESTORE, FLAG, REJECT with audit logging and aggregate synchronization
 */
export async function PATCH(request, { params }) {
  try {
    const session = getAdminSession(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin privileges required', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    const { id } = params || {};
    if (!id) {
      return NextResponse.json({ success: false, error: 'Rating ID is required' }, { status: 400 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { action, reason, adminNotes, resolutionNotes } = body || {};
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory field: action is required (HIDE | RESTORE | FLAG | REJECT)' },
        { status: 400 }
      );
    }

    const normalizedAction = String(action).trim().toUpperCase();
    const validActions = ['HIDE', 'RESTORE', 'FLAG', 'REJECT'];
    if (!validActions.includes(normalizedAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid moderation action '${action}'. Must be one of: ${validActions.join(', ')}`,
          code: 'INVALID_ACTION',
        },
        { status: 400 }
      );
    }

    const dbData = getDb();
    dbData.ratings = dbData.ratings || [];
    const ratingIdx = dbData.ratings.findIndex(r => r.id === id);

    if (ratingIdx === -1) {
      return NextResponse.json(
        { success: false, error: `Rating with ID '${id}' not found`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const rating = dbData.ratings[ratingIdx];
    const previousState = { ...rating };
    const now = new Date().toISOString();
    const adminUserId = session.user.id;
    const notes = reason || adminNotes || resolutionNotes || '';

    let newStatus = rating.status;
    let auditAction = 'RATING_MODERATED';

    if (normalizedAction === 'HIDE') {
      newStatus = RATING_STATUS.HIDDEN;
      auditAction = 'RATING_HIDDEN_BY_ADMIN';
      rating.status = newStatus;
      rating.updatedAt = now;

      // Update associated pending reports to RESOLVED_HIDDEN
      dbData.ratingReports = dbData.ratingReports || [];
      dbData.ratingReports
        .filter(rep => rep.ratingId === id && rep.status === 'PENDING')
        .forEach(rep => {
          rep.status = 'RESOLVED_HIDDEN';
          rep.moderatorNotes = notes;
          rep.resolvedByAdminId = adminUserId;
          rep.resolvedAt = now;
          rep.updatedAt = now;
        });
    } else if (normalizedAction === 'RESTORE') {
      newStatus = RATING_STATUS.PUBLISHED;
      auditAction = 'RATING_RESTORED_BY_ADMIN';
      rating.status = newStatus;
      rating.updatedAt = now;
      if (!rating.publishedAt) {
        rating.publishedAt = now;
      }

      // Resolve associated pending appeals to APPROVED_RESTORED
      dbData.ratingAppeals = dbData.ratingAppeals || [];
      dbData.ratingAppeals
        .filter(app => app.ratingId === id && (app.status === 'PENDING' || app.status === 'PENDING_REVIEW'))
        .forEach(app => {
          app.status = 'APPROVED_RESTORED';
          app.moderatorVerdict = notes || 'Appeal approved and review restored by moderator';
          app.reviewedByAdminId = adminUserId;
          app.reviewedAt = now;
          app.updatedAt = now;
        });

      // Dismiss pending reports if restored
      dbData.ratingReports = dbData.ratingReports || [];
      dbData.ratingReports
        .filter(rep => rep.ratingId === id && rep.status === 'PENDING')
        .forEach(rep => {
          rep.status = 'DISMISSED';
          rep.moderatorNotes = notes || 'Report dismissed after investigation';
          rep.resolvedByAdminId = adminUserId;
          rep.resolvedAt = now;
          rep.updatedAt = now;
        });
    } else if (normalizedAction === 'FLAG') {
      newStatus = RATING_STATUS.FLAGGED;
      auditAction = 'RATING_FLAGGED_BY_ADMIN';
      rating.status = newStatus;
      rating.updatedAt = now;
    } else if (normalizedAction === 'REJECT') {
      newStatus = 'REJECTED';
      auditAction = 'RATING_REJECTED_BY_ADMIN';
      rating.status = newStatus;
      rating.updatedAt = now;

      // Reject associated pending appeals
      dbData.ratingAppeals = dbData.ratingAppeals || [];
      dbData.ratingAppeals
        .filter(app => app.ratingId === id && (app.status === 'PENDING' || app.status === 'PENDING_REVIEW'))
        .forEach(app => {
          app.status = 'REJECTED';
          app.moderatorVerdict = notes || 'Appeal rejected by moderator';
          app.reviewedByAdminId = adminUserId;
          app.reviewedAt = now;
          app.updatedAt = now;
        });
    }

    saveDb(dbData);

    // Immutable Rating Audit Log Entry
    const auditRecord = logRatingAuditEvent({
      action: auditAction,
      ratingId: id,
      interactionId: rating.interactionId,
      actorUserId: adminUserId,
      actorRole: 'ADMIN',
      reason: notes,
      previousState,
      newState: rating,
    });

    // Synchronize Pre-Computed Rating Aggregates for target entity
    const updatedAggregate = recalculateProfileRatings(rating.targetRole, rating.targetEntityId);

    return NextResponse.json({
      success: true,
      message: `Rating ${id} successfully transitioned to ${newStatus}`,
      action: normalizedAction,
      ratingId: id,
      status: newStatus,
      updatedAt: rating.updatedAt,
      auditLogId: auditRecord?.id,
      aggregate: updatedAggregate,
    });
  } catch (err) {
    console.error('[Admin Rating PATCH Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error performing moderation action' },
      { status: 500 }
    );
  }
}
