/**
 * Skill Bridge Platform - Rating Moderation Contestation & Appeal API
 * Endpoint: /api/ratings/[id]/appeal
 * Method: POST
 * File: app/api/ratings/[id]/appeal/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb, saveDb, logRatingAuditEvent, createRatingAppeal } from '../../../../../lib/db.js';

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

/**
 * POST /api/ratings/[id]/appeal
 * Submit a formal appeal against a moderated/hidden/flagged review
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
        { success: false, error: 'Unauthorized: Authentication required to file an appeal', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { appealReason, reason, justification, evidenceDocs } = body || {};
    const effectiveReason = appealReason || reason || '';

    if (!effectiveReason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appeal reason is required',
          code: 'VALIDATION_ERROR',
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

    // Check if caller is authorized party (the reviewer or the target entity)
    const isReviewer = rating.reviewerUserId === user.id;
    const isTarget = rating.targetUserId === user.id || rating.targetEntityId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isReviewer && !isTarget && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the review author or target party may submit an appeal for this rating',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Create appeal record
    const appealData = {
      ratingId: id,
      appellantUserId: user.id,
      appealReason: effectiveReason,
      justification: justification || '',
      evidenceDocs: Array.isArray(evidenceDocs) ? evidenceDocs : [],
    };

    const appeal = createRatingAppeal(appealData);

    // Transition rating to UNDER_APPEAL
    rating.status = 'UNDER_APPEAL';
    rating.updatedAt = new Date().toISOString();
    saveDb(dbData);

    return NextResponse.json(
      {
        success: true,
        message: 'Appeal submitted successfully and queued for administrative review.',
        appealId: appeal.id,
        appeal,
        ratingStatus: rating.status,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Rating Appeal POST Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error submitting appeal' },
      { status: 500 }
    );
  }
}
