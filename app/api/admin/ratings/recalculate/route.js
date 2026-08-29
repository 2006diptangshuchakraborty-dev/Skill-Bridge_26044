/**
 * Skill Bridge Platform - Admin Profile Rating Aggregate Recalculation & Repair API
 * Endpoint: /api/admin/ratings/recalculate
 * Method: POST
 * File: app/api/admin/ratings/recalculate/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb } from '../../../../../lib/db.js';
import { recalculateProfileRatings, ROLES } from '../../../../../lib/rating-engine.js';

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
 * POST /api/admin/ratings/recalculate
 * Rebuilds pre-computed rating aggregates (scores, counts, category breakdowns, trust levels)
 */
export async function POST(request) {
  try {
    const session = getAdminSession(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin privileges required', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { targetRole, targetEntityId, recalculateAll } = body || {};

    if (recalculateAll) {
      const dbData = getDb();
      const allRatings = dbData.ratings || [];
      const targets = [];
      const seen = new Set();

      allRatings.forEach(r => {
        const key = `${r.targetRole}_${r.targetEntityId}`;
        if (!seen.has(key)) {
          seen.add(key);
          targets.push({ targetRole: r.targetRole, targetEntityId: r.targetEntityId });
        }
      });

      // Also include known students and companies
      (dbData.students || []).forEach(s => {
        const key = `STUDENT_${s.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          targets.push({ targetRole: ROLES.STUDENT, targetEntityId: s.id });
        }
      });

      (dbData.companies || []).forEach(c => {
        const key = `INDUSTRY_${c.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          targets.push({ targetRole: ROLES.INDUSTRY, targetEntityId: c.id });
        }
      });

      const results = [];
      for (const target of targets) {
        const agg = recalculateProfileRatings(target.targetRole, target.targetEntityId);
        results.push(agg);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully recalculated aggregates for ${results.length} entities.`,
        count: results.length,
        aggregates: results,
      });
    }

    // Recalculate single entity
    if (!targetRole || !targetEntityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: targetRole and targetEntityId are required when recalculateAll is false',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const normalizedRole = String(targetRole).toUpperCase();
    const validRoles = [ROLES.STUDENT, ROLES.INDUSTRY, ROLES.INSTITUTE];
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid target role '${targetRole}'. Allowed roles: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
        },
        { status: 400 }
      );
    }

    const aggregate = recalculateProfileRatings(normalizedRole, targetEntityId);

    return NextResponse.json({
      success: true,
      message: `Profile rating aggregate synchronized successfully for ${normalizedRole} ${targetEntityId}`,
      targetRole: normalizedRole,
      targetEntityId,
      aggregate,
    });
  } catch (err) {
    console.error('[Recalculate Aggregate Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error recalculating aggregate' },
      { status: 500 }
    );
  }
}
