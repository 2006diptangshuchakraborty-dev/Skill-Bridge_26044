/**
 * Skill Bridge Platform - Rating Detail API
 * File: app/api/ratings/[id]/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb } from '../../../../lib/db.js';
import { RATING_STATUS } from '../../../../lib/rating-engine.js';

/**
 * GET /api/ratings/[id]
 * Fetch single rating detail with associated category scores and responses
 */
export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) {
      return NextResponse.json({ success: false, error: 'Rating ID is required' }, { status: 400 });
    }

    const dbData = getDb();
    const allRatings = dbData.ratings || [];
    const rating = allRatings.find(r => r.id === id);

    if (!rating) {
      return NextResponse.json(
        {
          success: false,
          error: `Rating with ID '${id}' not found`,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check publication privacy
    if (rating.status === RATING_STATUS.PENDING_PUBLICATION) {
      // For blind reviews pending publication, return restricted metadata
      return NextResponse.json({
        success: true,
        rating: {
          id: rating.id,
          interactionId: rating.interactionId,
          status: rating.status,
          isBlind: true,
          message: 'This rating is currently pending blind review completion and will be visible once published.',
          createdAt: rating.createdAt,
        },
      });
    }

    // Load category scores
    const allCatScores = dbData.ratingCategoryScores || [];
    const categoryScores = allCatScores.filter(cs => cs.ratingId === id);

    // Load responses
    const allResponses = dbData.ratingResponses || [];
    const responses = allResponses.filter(res => res.ratingId === id);

    // Load reviewer public profile
    const allUsers = dbData.users || [];
    const reviewer = allUsers.find(u => u.id === rating.reviewerUserId);

    return NextResponse.json({
      success: true,
      rating: {
        ...rating,
        categoryScores,
        responses,
        reviewer: reviewer
          ? {
              id: reviewer.id,
              name: reviewer.name,
              role: reviewer.role,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('[Rating Detail GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error fetching rating detail',
      },
      { status: 500 }
    );
  }
}
