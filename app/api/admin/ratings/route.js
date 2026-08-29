/**
 * Skill Bridge Platform - Admin Ratings Management & Moderation API
 * Endpoint: /api/admin/ratings
 * Method: GET
 * File: app/api/admin/ratings/route.js
 */

import { NextResponse } from 'next/server.js';
import { getDb, getRatingReports, getRatingAppeals, getRatingAuditLogs, getRatingCategoryScores } from '../../../../lib/db.js';
import { RATING_STATUS, ROLES, detectSuspiciousRatingActivity } from '../../../../lib/rating-engine.js';

/**
 * Resolves admin session from request headers, Better Auth session, or database lookup
 */
function getAdminSession(req) {
  // 1. Dev / Test header overrides
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

  // 2. Direct DB session token lookup from cookie
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

    // Default admin fallback in local test/mock environments if test identity was used
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
 * GET /api/admin/ratings
 * Lists and filters all ratings for admin moderation, with KPI statistics and anti-fraud insights
 */
export async function GET(request) {
  try {
    const session = getAdminSession(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = (searchParams.get('status') || 'ALL').toUpperCase();
    const targetRoleFilter = (searchParams.get('targetRole') || 'ALL').toUpperCase();
    const contextTypeFilter = searchParams.get('contextType') || 'ALL';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();
    const hasReportsFilter = searchParams.get('hasReports');
    const hasAppealsFilter = searchParams.get('hasAppeals');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));

    const dbData = getDb();
    const allRatings = dbData.ratings || [];
    const allReports = dbData.ratingReports || [];
    const allAppeals = dbData.ratingAppeals || [];
    const allAuditLogs = dbData.ratingAuditLogs || [];
    const allCategoryScores = dbData.ratingCategoryScores || [];
    const allUsers = dbData.users || [];
    const allStudents = dbData.students || [];
    const allCompanies = dbData.companies || [];

    // Pre-calculate Platform-Wide KPIs
    const totalRatings = allRatings.length;
    const publishedRatings = allRatings.filter(r => r.status === RATING_STATUS.PUBLISHED).length;
    const flaggedRatings = allRatings.filter(r => r.status === RATING_STATUS.FLAGGED).length;
    const hiddenRatings = allRatings.filter(r => r.status === RATING_STATUS.HIDDEN).length;
    const underAppealRatings = allRatings.filter(r => r.status === 'UNDER_APPEAL').length;
    const pendingPublicationRatings = allRatings.filter(r => r.status === RATING_STATUS.PENDING_PUBLICATION).length;
    const rejectedRatings = allRatings.filter(r => r.status === 'REJECTED').length;

    const totalReports = allReports.length;
    const pendingReports = allReports.filter(rep => rep.status === 'PENDING').length;
    const totalAppeals = allAppeals.length;
    const pendingAppeals = allAppeals.filter(app => app.status === 'PENDING' || app.status === 'PENDING_REVIEW').length;

    const verifiedCount = allRatings.filter(r => r.isVerified).length;
    const verifiedPercent = totalRatings > 0 ? Number(((verifiedCount / totalRatings) * 100).toFixed(1)) : 100;

    const publishedScoreSum = allRatings
      .filter(r => r.status === RATING_STATUS.PUBLISHED)
      .reduce((sum, r) => sum + Number(r.overallScore || 0), 0);
    const averageScore = publishedRatings > 0 ? Number((publishedScoreSum / publishedRatings).toFixed(2)) : 0;

    // Scan for suspicious activity spikes across unique entities
    const uniqueTargets = [];
    const seenTargetKeys = new Set();
    allRatings.forEach(r => {
      const key = `${r.targetRole}_${r.targetEntityId}`;
      if (!seenTargetKeys.has(key)) {
        seenTargetKeys.add(key);
        uniqueTargets.push({ targetRole: r.targetRole, targetEntityId: r.targetEntityId });
      }
    });

    const suspiciousEntities = [];
    for (const target of uniqueTargets) {
      const activity = detectSuspiciousRatingActivity({
        targetRole: target.targetRole,
        targetEntityId: target.targetEntityId,
      });
      if (activity.isSuspicious) {
        suspiciousEntities.push({
          targetRole: target.targetRole,
          targetEntityId: target.targetEntityId,
          anomalies: activity.anomalies,
          totalRatingsAnalyzed: activity.totalRatingsAnalyzed,
        });
      }
    }

    // Enrich and Filter Ratings
    let filteredRatings = allRatings.map(r => {
      const reviewer = allUsers.find(u => u.id === r.reviewerUserId) || null;
      let targetName = r.targetEntityId;
      let targetEmail = '';

      if (r.targetRole === ROLES.STUDENT) {
        const student = allStudents.find(s => s.id === r.targetEntityId || s.userId === r.targetUserId);
        if (student) {
          targetName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || targetName;
          targetEmail = student.email || '';
        }
      } else if (r.targetRole === ROLES.INDUSTRY) {
        const company = allCompanies.find(c => c.id === r.targetEntityId || c.userId === r.targetUserId);
        if (company) {
          targetName = company.companyName || company.name || targetName;
          targetEmail = company.email || '';
        }
      }

      if (!targetEmail) {
        const targetUser = allUsers.find(u => u.id === r.targetUserId || u.id === r.targetEntityId);
        if (targetUser) {
          targetEmail = targetUser.email || '';
          if (targetName === r.targetEntityId && targetUser.name) targetName = targetUser.name;
        }
      }

      const scores = allCategoryScores.filter(cs => cs.ratingId === r.id);
      const reports = allReports.filter(rep => rep.ratingId === r.id);
      const appeals = allAppeals.filter(app => app.ratingId === r.id);
      const auditLogs = allAuditLogs.filter(log => log.ratingId === r.id);

      return {
        ...r,
        categoryScores: scores,
        reports,
        appeals,
        auditLogs,
        reportCount: reports.length,
        appealCount: appeals.length,
        hasPendingReport: reports.some(rep => rep.status === 'PENDING'),
        hasPendingAppeal: appeals.some(app => app.status === 'PENDING' || app.status === 'PENDING_REVIEW'),
        reviewer: reviewer
          ? {
              id: reviewer.id,
              name: reviewer.name || 'Anonymous User',
              email: reviewer.email || '',
              role: reviewer.role || r.reviewerRole,
              image: reviewer.image || null,
            }
          : {
              id: r.reviewerUserId,
              name: 'Reviewer',
              email: '',
              role: r.reviewerRole,
              image: null,
            },
        target: {
          id: r.targetEntityId,
          userId: r.targetUserId,
          name: targetName,
          email: targetEmail,
          role: r.targetRole,
        },
      };
    });

    // Apply Status Filter
    if (statusFilter !== 'ALL') {
      filteredRatings = filteredRatings.filter(r => r.status === statusFilter);
    }

    // Apply Target Role Filter
    if (targetRoleFilter !== 'ALL') {
      filteredRatings = filteredRatings.filter(r => r.targetRole === targetRoleFilter);
    }

    // Apply Context Type Filter
    if (contextTypeFilter !== 'ALL') {
      filteredRatings = filteredRatings.filter(r => r.contextType === contextTypeFilter);
    }

    // Apply Reports / Appeals Filter
    if (hasReportsFilter === 'true') {
      filteredRatings = filteredRatings.filter(r => r.reportCount > 0);
    }
    if (hasAppealsFilter === 'true') {
      filteredRatings = filteredRatings.filter(r => r.appealCount > 0);
    }

    // Apply Search Query Filter
    if (searchQuery) {
      filteredRatings = filteredRatings.filter(r => {
        const idMatch = (r.id || '').toLowerCase().includes(searchQuery);
        const headlineMatch = (r.headline || '').toLowerCase().includes(searchQuery);
        const reviewMatch = (r.reviewText || '').toLowerCase().includes(searchQuery);
        const reviewerNameMatch = (r.reviewer?.name || '').toLowerCase().includes(searchQuery);
        const reviewerEmailMatch = (r.reviewer?.email || '').toLowerCase().includes(searchQuery);
        const targetNameMatch = (r.target?.name || '').toLowerCase().includes(searchQuery);
        const targetEmailMatch = (r.target?.email || '').toLowerCase().includes(searchQuery);
        const interactionMatch = (r.interactionId || '').toLowerCase().includes(searchQuery);

        return (
          idMatch ||
          headlineMatch ||
          reviewMatch ||
          reviewerNameMatch ||
          reviewerEmailMatch ||
          targetNameMatch ||
          targetEmailMatch ||
          interactionMatch
        );
      });
    }

    // Sort by latest created first
    filteredRatings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedRatings = filteredRatings.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      count: filteredRatings.length,
      totalCount: totalRatings,
      page,
      limit,
      totalPages: Math.ceil(filteredRatings.length / limit) || 1,
      stats: {
        total: totalRatings,
        published: publishedRatings,
        flagged: flaggedRatings,
        hidden: hiddenRatings,
        underAppeal: underAppealRatings,
        pendingPublication: pendingPublicationRatings,
        rejected: rejectedRatings,
        totalReports,
        pendingReports,
        totalAppeals,
        pendingAppeals,
        averageScore,
        verifiedPercent,
        anomaliesCount: suspiciousEntities.length,
      },
      suspiciousEntities,
      ratings: paginatedRatings,
    });
  } catch (err) {
    console.error('[Admin Ratings GET Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error fetching ratings for admin',
      },
      { status: 500 }
    );
  }
}
