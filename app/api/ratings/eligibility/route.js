/**
 * Skill Bridge Platform - Rating Eligibility API
 * File: app/api/ratings/eligibility/route.js
 */

import { NextResponse } from 'next/server.js';
import { getRatingEligibility } from '../../../../lib/rating-engine.js';
import { getDb } from '../../../../lib/db.js';

function resolveSessionUser(req) {
  // Check header fallback
  const headerUserId = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  if (headerUserId) return headerUserId;

  // Check cookies
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:better-auth\.session_token|sb_session_token)=([^;]+)/);
  if (match) {
    try {
      const dbData = getDb();
      const sessionRecord = (dbData.sessions || []).find(s => s.token === match[1] || s.sessionToken === match[1]);
      if (sessionRecord) return sessionRecord.userId;
    } catch {}
  }

  return null;
}

/**
 * GET /api/ratings/eligibility
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionUserId = resolveSessionUser(request);

    const reviewerUserId = searchParams.get('reviewerUserId') || sessionUserId;
    const targetEntityId = searchParams.get('targetEntityId') || searchParams.get('targetUserId');
    const targetEntityType = searchParams.get('targetEntityType') || searchParams.get('targetRole');
    const interactionId = searchParams.get('interactionId');
    const contextType = searchParams.get('contextType');

    const result = getRatingEligibility({
      reviewerUserId,
      targetEntityId,
      targetEntityType: targetEntityType ? targetEntityType.toUpperCase() : null,
      interactionId,
      contextType,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Rating Eligibility GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        eligible: false,
        error: err.message || 'Internal server error evaluating rating eligibility',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ratings/eligibility
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionUserId = resolveSessionUser(request);

    const reviewerUserId = body.reviewerUserId || sessionUserId;
    const targetEntityId = body.targetEntityId || body.targetUserId;
    const targetEntityType = body.targetEntityType || body.targetRole;
    const interactionId = body.interactionId;
    const contextType = body.contextType;

    const result = getRatingEligibility({
      reviewerUserId,
      targetEntityId,
      targetEntityType: targetEntityType ? targetEntityType.toUpperCase() : null,
      interactionId,
      contextType,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Rating Eligibility POST Error]:', err);
    return NextResponse.json(
      {
        success: false,
        eligible: false,
        error: err.message || 'Internal server error evaluating rating eligibility',
      },
      { status: 500 }
    );
  }
}
