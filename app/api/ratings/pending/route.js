/**
 * Skill Bridge Platform - Pending Ratings API
 * File: app/api/ratings/pending/route.js
 */

import { NextResponse } from 'next/server.js';
import { getPendingRatingsForUser } from '../../../../lib/rating-engine.js';
import { withAuth } from '../../../../lib/auth-guard.js';

/**
 * GET /api/ratings/pending
 * Retrieve all pending rating opportunities for the authenticated user with countdown timer data
 */
async function handleGetPendingRatings(req, { user }) {
  try {
    const pendingRatings = getPendingRatingsForUser(user.id, user.role);

    return NextResponse.json({
      success: true,
      count: pendingRatings.length,
      pendingRatings,
    });
  } catch (err) {
    console.error('[Pending Ratings GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error fetching pending ratings',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetPendingRatings, { requireActive: true });
