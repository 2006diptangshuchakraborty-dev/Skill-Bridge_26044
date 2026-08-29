/**
 * Skill Bridge Platform - Organization Profile CRUD Route Handler
 * File: app/api/organization/profile/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateOrganizationCompletion } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

function resolveCaller(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');

  if (userIdHeader) {
    return {
      user: {
        id: userIdHeader,
        role: userRoleHeader || 'ORGANIZATION',
      },
    };
  }

  const dbInstance = localDb.getDb();
  const orgUser = (dbInstance.users || []).find((u) => u.role === 'ORGANIZATION');
  if (orgUser) return { user: orgUser };

  return null;
}

/**
 * GET /api/organization/profile
 */
export async function GET(request) {
  try {
    const session = resolveCaller(request);
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    const targetUserId = requestedUserId || (session ? session.user.id : null);
    if (!targetUserId) {
      return NextResponse.json({ error: 'Unauthorized: User session required' }, { status: 401 });
    }

    if (requestedUserId && session && session.user.id !== requestedUserId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Cannot inspect another organization profile' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const orgProfiles = dbInstance.organizationProfiles || [];
    let profile = orgProfiles.find((p) => p.userId === targetUserId || p.id === targetUserId);

    // Fallback: check legacy companies table
    if (!profile && dbInstance.companies) {
      profile = dbInstance.companies.find((c) => c.userId === targetUserId || c.id === targetUserId || c.companyId === targetUserId);
    }

    if (!profile) {
      const initialProfile = {
        userId: targetUserId,
        companyName: '',
        registrationNumber: '',
        taxIdGstin: '',
        industry: '',
        companySize: '',
        website: '',
        logoUrl: '',
        contactPhone: '',
        address: {},
        hiringPreferences: {},
        verificationStatus: 'PENDING',
        verificationDocs: [],
        adminNotes: '',
        profileCompletion: 0,
      };
      return NextResponse.json({ success: true, profile: initialProfile, isNew: true }, { status: 200 });
    }

    return NextResponse.json({ success: true, profile }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT / PATCH /api/organization/profile
 */
export async function POST(request) {
  return handleSaveOrgProfile(request);
}

export async function PUT(request) {
  return handleSaveOrgProfile(request);
}

export async function PATCH(request) {
  return handleSaveOrgProfile(request);
}

async function handleSaveOrgProfile(request) {
  try {
    const session = resolveCaller(request);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    const body = await request.json();
    const targetUserId = body.userId || session.user.id;

    // IDOR check: Users cannot edit another organization profile unless ADMIN
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You cannot modify another organization profile' }, { status: 403 });
    }

    // Role check: Only ORGANIZATION or ADMIN can update
    if (session.user.role !== 'ORGANIZATION' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only organizations can manage organization profiles' }, { status: 403 });
    }

    // SECURITY TAMPER-PROOFING:
    // verificationStatus, role, accountStatus, and adminNotes are strictly IMMUTABLE by non-admins!
    const { id, role, accountStatus, ...allowedUpdates } = body;
    if (session.user.role !== 'ADMIN') {
      delete allowedUpdates.verificationStatus;
      delete allowedUpdates.adminNotes;
    }

    const dbInstance = localDb.getDb();
    dbInstance.organizationProfiles = dbInstance.organizationProfiles || [];
    const existingIndex = dbInstance.organizationProfiles.findIndex((p) => p.userId === targetUserId);

    let updatedRecord;
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const existing = dbInstance.organizationProfiles[existingIndex];
      const merged = {
        ...existing,
        ...allowedUpdates,
        userId: targetUserId,
        verificationStatus:
          session.user.role === 'ADMIN' && allowedUpdates.verificationStatus
            ? allowedUpdates.verificationStatus
            : existing.verificationStatus || 'PENDING',
        updatedAt: now,
      };

      merged.profileCompletion = calculateOrganizationCompletion(merged);
      dbInstance.organizationProfiles[existingIndex] = merged;
      updatedRecord = merged;
    } else {
      const newOrgProfile = {
        id: `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: targetUserId,
        companyName: allowedUpdates.companyName || '',
        registrationNumber: allowedUpdates.registrationNumber || '',
        taxIdGstin: allowedUpdates.taxIdGstin || '',
        industry: allowedUpdates.industry || '',
        companySize: allowedUpdates.companySize || '',
        website: allowedUpdates.website || '',
        logoUrl: allowedUpdates.logoUrl || '',
        contactPhone: allowedUpdates.contactPhone || '',
        address: allowedUpdates.address || {},
        hiringPreferences: allowedUpdates.hiringPreferences || {},
        verificationStatus:
          session.user.role === 'ADMIN' && allowedUpdates.verificationStatus
            ? allowedUpdates.verificationStatus
            : 'PENDING',
        verificationDocs: allowedUpdates.verificationDocs || allowedUpdates.documents || [],
        adminNotes: session.user.role === 'ADMIN' ? allowedUpdates.adminNotes || '' : '',
        createdAt: now,
        updatedAt: now,
      };

      newOrgProfile.profileCompletion = calculateOrganizationCompletion(newOrgProfile);
      dbInstance.organizationProfiles.push(newOrgProfile);
      updatedRecord = newOrgProfile;
    }

    // Advance onboarding status if requirements met
    if (dbInstance.users) {
      const userIdx = dbInstance.users.findIndex((u) => u.id === targetUserId);
      if (userIdx !== -1) {
        if (updatedRecord.profileCompletion >= 95) {
          dbInstance.users[userIdx].onboardingStatus = 'COMPLETED';
        } else if (updatedRecord.profileCompletion > 0) {
          dbInstance.users[userIdx].onboardingStatus = 'IN_PROGRESS';
        }
      }
    }

    localDb.saveDb(dbInstance);

    // Record Immutable Audit Log
    await logAuditEvent({
      actorUserId: session.user.id,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: targetUserId,
      resourceType: 'ORGANIZATION_PROFILE',
      resourceId: updatedRecord.id,
      metadata: {
        companyName: updatedRecord.companyName,
        completion: updatedRecord.profileCompletion,
        verificationStatus: updatedRecord.verificationStatus,
      },
      req: request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Organization profile updated successfully',
        profile: updatedRecord,
        profileCompletion: updatedRecord.profileCompletion,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update organization profile', message: err.message }, { status: 500 });
  }
}
