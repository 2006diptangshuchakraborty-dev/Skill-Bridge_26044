/**
 * Skill Bridge Platform - Rating Abuse & Content Reporting API
 * Endpoint: /api/ratings/[id]/report
 * Method: POST
 * File: app/api/ratings/[id]/report/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb, saveDb, logRatingAuditEvent, createRatingReport } from '../../../../../lib/db.js';
import { RATING_STATUS, REPORT_STATUS } from '../../../../../lib/rating-engine.js';

/**
 * Resolves session user from request headers, cookies, or DB
 */
function getRequestUser(req) {
  if (process.env.NODE_ENV !== 'production') {
    const userId = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
    const role = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role') || 'STUDENT';
    if (userId) {
      return { id: userId, role: role.toUpperCase() };
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
        if (userRecord) {
          return userRecord;
        }
      }
    }

    const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
    if (userIdHeader) {
      const user = (dbData.users || []).find(u => u.id === userIdHeader);
      if (user) return user;
    }
  } catch (e) {
    // Proceed
  }

  return null;
}

const VALID_REPORT_REASONS = [
  'INAPPROPRIATE_CONTENT',
  'FALSE_INFORMATION',
  'HARASSMENT',
  'SPAM',
  'CONFLICT_OF_INTEREST',
  'ABUSIVE_LANGUAGE',
  'FRAUDULENT_INTERACTION',
  'OTHER',
];

/**
 * POST /api/ratings/[id]/report
 * Submit a formal report against a review with reason and details
 */
export async function POST(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) {
      return NextResponse.json({ success: false, error: 'Rating ID is required' }, { status: 400 });
    }

    const user = getRequestUser(request);
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to report a review', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { reason, details, description } = body || {};
    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report reason is required. Must be one of: ' + VALID_REPORT_REASONS.join(', '),
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const normalizedReason = String(reason).trim().toUpperCase();
    if (!VALID_REPORT_REASONS.includes(normalizedReason)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid report reason '${reason}'. Allowed values: ${VALID_REPORT_REASONS.join(', ')}`,
          code: 'INVALID_REASON',
        },
        { status: 400 }
      );
    }

    const dbData = getDb();
    const allRatings = dbData.ratings || [];
    const ratingIdx = allRatings.findIndex(r => r.id === id);

    if (ratingIdx === -1) {
      return NextResponse.json(
        { success: false, error: `Rating with ID '${id}' not found`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const rating = allRatings[ratingIdx];
    const reportDetails = details || description || '';

    // Create report entry
    const reportData = {
      ratingId: id,
      reporterUserId: user.id,
      reason: normalizedReason,
      details: reportDetails,
    };

    const report = createRatingReport(reportData);

    // If rating is currently PUBLISHED, mark as FLAGGED for moderator queue review
    if (rating.status === RATING_STATUS.PUBLISHED) {
      rating.status = RATING_STATUS.FLAGGED;
      rating.updatedAt = new Date().toISOString();
      saveDb(dbData);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Review report submitted successfully and flagged for moderator review.',
        reportId: report.id,
        report,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Rating Report POST Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error submitting report' },
      { status: 500 }
    );
  }
}
