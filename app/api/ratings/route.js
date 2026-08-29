/**
 * Skill Bridge Platform - Ratings API (List & Create)
 * File: app/api/ratings/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb } from '../../../lib/db.js';
import { createRating, recalculateProfileRatings, ROLES, RATING_STATUS } from '../../../lib/rating-engine.js';
import { withAuth } from '../../../lib/auth-guard.js';

/**
 * GET /api/ratings
 * Filter and list published ratings for a target entity with aggregate summary
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetEntityId = searchParams.get('targetEntityId');
    const targetRole = searchParams.get('targetRole');
    const contextType = searchParams.get('contextType');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const dbData = getDb();
    let allRatings = dbData.ratings || [];

    // Filter by published status
    allRatings = allRatings.filter(r => r.status === RATING_STATUS.PUBLISHED);

    if (targetEntityId) {
      const targetStr = String(targetEntityId).trim();
      allRatings = allRatings.filter(
        r =>
          r.targetEntityId === targetStr ||
          r.targetUserId === targetStr ||
          (targetStr.startsWith('std_') && r.targetEntityId === 'stu_' + targetStr.slice(4)) ||
          (targetStr.startsWith('stu_') && r.targetEntityId === 'std_' + targetStr.slice(4))
      );
    }

    if (targetRole) {
      allRatings = allRatings.filter(r => r.targetRole === targetRole.toUpperCase());
    }

    if (contextType) {
      allRatings = allRatings.filter(r => r.contextType === contextType);
    }

    // Attach category scores and reviewer info (PII-safe)
    const ratingIds = new Set(allRatings.map(r => r.id));
    const allCatScores = dbData.ratingCategoryScores || [];
    const allUsers = dbData.users || [];

    const enrichedRatings = allRatings.map(r => {
      const scores = allCatScores.filter(cs => cs.ratingId === r.id);
      const reviewer = allUsers.find(u => u.id === r.reviewerUserId);
      return {
        ...r,
        categoryScores: scores,
        reviewer: reviewer
          ? {
              id: reviewer.id,
              name: reviewer.name,
              role: reviewer.role,
            }
          : null,
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedRatings = enrichedRatings.slice(startIndex, startIndex + limit);

    // Compute or fetch aggregate if target is specified
    let aggregate = null;
    if (targetEntityId && targetRole) {
      aggregate = recalculateProfileRatings(targetRole.toUpperCase(), targetEntityId);
    }

    return NextResponse.json({
      success: true,
      count: enrichedRatings.length,
      page,
      limit,
      ratings: paginatedRatings,
      aggregate,
    });
  } catch (err) {
    console.error('[Ratings GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error fetching ratings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ratings
 * Submit a verified rating with Better Auth session security
 */
async function handleCreateRating(req, { user }) {
  try {
    const body = await req.json();
    const {
      interactionId,
      contextType,
      targetUserId,
      targetEntityId,
      targetRole,
      scores,
      recommendation,
      headline,
      reviewText,
      pros,
      cons,
    } = body || {};

    if (!interactionId || !targetEntityId || !targetRole || !scores || !recommendation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing mandatory fields: interactionId, targetEntityId, targetRole, scores, recommendation are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const payload = {
      reviewerUserId: user.id,
      targetUserId: targetUserId || targetEntityId,
      targetEntityId,
      targetRole: String(targetRole).toUpperCase(),
      interactionId,
      contextType,
      scores,
      recommendation,
      headline,
      reviewText,
      pros,
      cons,
      isVerified: true,
    };

    const result = createRating(payload);

    if (!result.success) {
      let statusCode = 400;
      if (result.code === 'UNAUTHORIZED' || result.code === 'SELF_RATING_FORBIDDEN') {
        statusCode = 403;
      } else if (result.code === 'RATE_LIMIT_EXCEEDED') {
        statusCode = 429;
      } else if (result.code === 'UNVERIFIED_INTERACTION' || result.code === 'INTERACTION_STAGE_INVALID') {
        statusCode = 422;
      } else if (result.code === 'ALREADY_RATED') {
        statusCode = 409;
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Ratings POST Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error submitting rating',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleCreateRating, { requireActive: true });
