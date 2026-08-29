/**
 * Skill Bridge Platform - Organization Onboarding API Route Handler
 * Endpoint: /api/organization/onboarding
 * Methods: GET, POST, PUT
 * File: app/api/organization/onboarding/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateOrganizationCompletion, getOrgCompletionDetails } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

function resolveUser(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');
  const userStatusHeader = req.headers.get('x-account-status') || req.headers.get('x-auth-account-status');
  const userOnboardingHeader = req.headers.get('x-onboarding-status') || req.headers.get('x-auth-onboarding-status');

  if (userIdHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader || 'ORGANIZATION',
      accountStatus: userStatusHeader || 'ACTIVE',
      onboardingStatus: userOnboardingHeader || 'NOT_STARTED',
    };
  }

  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const org = users.find(u => u.role === 'ORGANIZATION');
  if (org) return org;

  return null;
}

/**
 * GET /api/organization/onboarding
 * Returns current onboarding draft state, step progress, and completion score.
 */
export async function GET(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'ORGANIZATION' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only organizations can access organization onboarding' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const orgProfiles = dbInstance.organizationProfiles || [];
    let profile = orgProfiles.find(p => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        companyName: '',
        companySize: '',
        website: '',
        logoUrl: '',
        registrationNumber: '',
        taxIdGstin: '',
        contactPhone: '',
        officialEmail: user.email || '',
        primaryContactName: '',
        address: {},
        industry: '',
        domainFocus: [],
        techFocus: [],
        hiringPreferences: {
          targetRoles: [],
          hiringType: 'Both',
        },
        verificationStatus: 'PENDING',
        verificationDocs: [],
        adminNotes: '',
        profileCompletion: 0,
        currentOnboardingStep: 1,
      };
    }

    const details = getOrgCompletionDetails(profile);

    return NextResponse.json({
      success: true,
      profile,
      onboardingStatus: user.onboardingStatus || (details.completion >= 100 ? 'COMPLETED' : details.completion > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
      verificationStatus: profile.verificationStatus || 'PENDING',
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      currentStep: profile.currentOnboardingStep || 1,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve organization onboarding status', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/organization/onboarding
 * Saves onboarding step draft or finalizes complete onboarding.
 */
export async function POST(request) {
  return handleSaveStep(request);
}

export async function PUT(request) {
  return handleSaveStep(request);
}

async function handleSaveStep(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'ORGANIZATION' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only organizations can submit organization onboarding' }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { step, stepData, profileData, action } = body;
    const now = new Date().toISOString();

    const dbInstance = localDb.getDb();
    dbInstance.organizationProfiles = dbInstance.organizationProfiles || [];
    let existingIdx = dbInstance.organizationProfiles.findIndex(p => p.userId === user.id);

    let currentProfile = existingIdx !== -1 ? { ...dbInstance.organizationProfiles[existingIdx] } : {
      id: `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      companyName: '',
      companySize: '',
      website: '',
      logoUrl: '',
      registrationNumber: '',
      taxIdGstin: '',
      contactPhone: '',
      address: {},
      industry: '',
      hiringPreferences: {},
      verificationStatus: 'PENDING',
      verificationDocs: [],
      adminNotes: '',
      profileCompletion: 0,
      currentOnboardingStep: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Merge incoming data
    if (stepData) {
      Object.assign(currentProfile, stepData);
    }
    if (profileData) {
      delete profileData.id;
      delete profileData.userId;
      delete profileData.role;
      delete profileData.verificationStatus; // Verification status is only changed by admins
      Object.assign(currentProfile, profileData);
    }

    if (step && typeof step === 'number') {
      currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
    }

    // Compute dynamic completion
    const details = getOrgCompletionDetails(currentProfile);
    currentProfile.profileCompletion = details.completion;
    currentProfile.updatedAt = now;

    // Determine target onboardingStatus
    const isCompleteAction = action === 'COMPLETE_ONBOARDING' || action === 'SUBMIT';
    let targetOnboardingStatus = 'IN_PROGRESS';

    if (isCompleteAction) {
      if (details.completion < 80 && details.missingFields.length > 2) {
        return NextResponse.json({
          error: 'Incomplete onboarding: Please complete all mandatory steps before submission',
          missingFields: details.missingFields,
          profileCompletion: details.completion,
        }, { status: 400 });
      }
      targetOnboardingStatus = 'COMPLETED';
      currentProfile.verificationStatus = 'PENDING';
    } else if (details.completion > 0) {
      targetOnboardingStatus = 'IN_PROGRESS';
    }

    // Persist profile
    if (existingIdx !== -1) {
      dbInstance.organizationProfiles[existingIdx] = currentProfile;
    } else {
      dbInstance.organizationProfiles.push(currentProfile);
    }

    // Update user status in database
    dbInstance.users = dbInstance.users || [];
    const userIdx = dbInstance.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      dbInstance.users[userIdx].onboardingStatus = targetOnboardingStatus;
      dbInstance.users[userIdx].updatedAt = now;
    }

    localDb.saveDb(dbInstance);

    // Audit Logging
    await logAuditEvent({
      actorUserId: user.id,
      action: isCompleteAction ? AUDIT_ACTIONS.ORGANIZATION_SUBMITTED : AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: user.id,
      resourceType: 'ORGANIZATION_PROFILE',
      resourceId: currentProfile.id,
      metadata: {
        action: action || 'SAVE_DRAFT',
        step: step || currentProfile.currentOnboardingStep,
        profileCompletion: details.completion,
        onboardingStatus: targetOnboardingStatus,
        verificationStatus: currentProfile.verificationStatus,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: isCompleteAction ? 'Organization onboarding completed and submitted for KYC review!' : 'Step draft saved successfully',
      onboardingStatus: targetOnboardingStatus,
      verificationStatus: currentProfile.verificationStatus,
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process organization onboarding step', message: err.message }, { status: 500 });
  }
}
