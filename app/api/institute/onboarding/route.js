/**
 * Skill Bridge Platform - Institute Onboarding API Route Handler
 * Endpoint: /api/institute/onboarding
 * Methods: GET, POST, PUT
 * File: app/api/institute/onboarding/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateInstituteCompletion, getInstituteCompletionDetails } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

function resolveUser(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');
  const userStatusHeader = req.headers.get('x-account-status') || req.headers.get('x-auth-account-status');
  const userOnboardingHeader = req.headers.get('x-onboarding-status') || req.headers.get('x-auth-onboarding-status');

  if (userIdHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader || 'INSTITUTE',
      accountStatus: userStatusHeader || 'ACTIVE',
      onboardingStatus: userOnboardingHeader || 'NOT_STARTED',
    };
  }

  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const instUser = users.find(u => u.role === 'INSTITUTE');
  if (instUser) return instUser;

  // Fallback to any user for dev/testing or admin
  const adminUser = users.find(u => u.role === 'ADMIN');
  if (adminUser) return adminUser;

  // Initial development fallback user
  return {
    id: 'inst_dev_user_1',
    name: 'National Institute of Technology Surathkal',
    email: 'tpo@nitk.edu.in',
    role: 'INSTITUTE',
    accountStatus: 'ACTIVE',
    onboardingStatus: 'NOT_STARTED',
    profileCompleted: false,
  };
}

/**
 * GET /api/institute/onboarding
 * Returns current onboarding draft state, step progress, and completion score.
 */
export async function GET(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'INSTITUTE' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only institutes can access institute onboarding' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    dbInstance.instituteProfiles = dbInstance.instituteProfiles || [];
    let profile = dbInstance.instituteProfiles.find(p => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        instituteName: user.name || 'National Institute of Technology',
        instituteCode: 'AISHE-U-0123',
        instituteType: 'Autonomous University / NIT',
        website: 'https://nitk.ac.in',
        logoUrl: '',
        officialEmail: user.email || 'tpo@nitk.ac.in',
        contactPhone: '+91 824 2474000',
        address: {
          street: 'NH 66, Srinivasnagar',
          city: 'Surathkal, Mangalore',
          state: 'Karnataka',
          postalCode: '575025',
          country: 'India',
        },
        departments: [
          { name: 'Computer Science & Engineering', code: 'CSE', headOfDept: 'Dr. A. Sharma', studentCount: 240 },
          { name: 'Information Technology', code: 'IT', headOfDept: 'Dr. R. Rao', studentCount: 180 },
          { name: 'Electronics & Communication', code: 'ECE', headOfDept: 'Dr. V. Hegde', studentCount: 200 },
        ],
        placementContact: {
          tpoName: 'Prof. S. K. Nair',
          designation: 'Head, Training & Placement Cell',
          email: 'tpo@nitk.edu.in',
          phone: '+91 824 2474050',
        },
        accreditationDetails: {
          naacGrade: 'A++',
          nirfRank: '12',
          aicteApproved: true,
        },
        verificationStatus: 'PENDING',
        verificationDocs: [
          {
            docType: 'AISHE / UGC Accreditation Certificate',
            fileName: 'AISHE_Certificate_2025.pdf',
            fileUrl: 'https://docs.skillbridge.gov/sample_aishe.pdf',
            uploadedAt: new Date().toISOString(),
          },
        ],
        profileCompletion: 0,
        currentOnboardingStep: 1,
      };
    }

    const details = getInstituteCompletionDetails(profile);

    return NextResponse.json({
      success: true,
      profile,
      onboardingStatus: user.onboardingStatus || (details.completion >= 90 ? 'COMPLETED' : details.completion > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
      verificationStatus: profile.verificationStatus || 'PENDING',
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      currentStep: profile.currentOnboardingStep || 1,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve institute onboarding status', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/institute/onboarding
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

    if (user.role !== 'INSTITUTE' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only institutes can submit institute onboarding' }, { status: 403 });
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
    dbInstance.instituteProfiles = dbInstance.instituteProfiles || [];
    let existingIdx = dbInstance.instituteProfiles.findIndex(p => p.userId === user.id);

    let currentProfile = existingIdx !== -1 ? { ...dbInstance.instituteProfiles[existingIdx] } : {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      instituteName: '',
      instituteCode: '',
      instituteType: '',
      website: '',
      logoUrl: '',
      officialEmail: user.email || '',
      contactPhone: '',
      address: {},
      departments: [],
      placementContact: {},
      accreditationDetails: {},
      verificationStatus: 'PENDING',
      verificationDocs: [],
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
      delete profileData.verificationStatus; // Verification status is governed by admins
      Object.assign(currentProfile, profileData);
    }

    if (step && typeof step === 'number') {
      currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
    }

    // Compute dynamic completion
    const details = getInstituteCompletionDetails(currentProfile);
    currentProfile.profileCompletion = details.completion;
    currentProfile.updatedAt = now;

    // Determine target onboardingStatus
    const isCompleteAction = action === 'COMPLETE_ONBOARDING' || action === 'SUBMIT';
    let targetOnboardingStatus = 'IN_PROGRESS';

    if (isCompleteAction) {
      if (details.completion < 70 && details.missingFields.length > 3) {
        return NextResponse.json({
          error: 'Incomplete onboarding: Please fill required fields before submission',
          missingFields: details.missingFields,
          profileCompletion: details.completion,
        }, { status: 400 });
      }
      targetOnboardingStatus = 'COMPLETED';
      currentProfile.verificationStatus = 'PENDING';
    } else if (details.completion > 0) {
      targetOnboardingStatus = 'IN_PROGRESS';
    }

    // Persist profile in local DB
    if (existingIdx !== -1) {
      dbInstance.instituteProfiles[existingIdx] = currentProfile;
    } else {
      dbInstance.instituteProfiles.push(currentProfile);
    }

    // Also update institutes collection for catalog / analytics lookup
    dbInstance.institutes = dbInstance.institutes || [];
    const instIdx = dbInstance.institutes.findIndex(i => i.id === currentProfile.id || i.userId === user.id || i.instituteCode === currentProfile.instituteCode);
    const instCatalogItem = {
      id: currentProfile.id,
      userId: user.id,
      name: currentProfile.instituteName,
      code: currentProfile.instituteCode,
      type: currentProfile.instituteType,
      city: currentProfile.address?.city || '',
      state: currentProfile.address?.state || '',
      departments: currentProfile.departments || [],
      placementContact: currentProfile.placementContact || {},
      verified: currentProfile.verificationStatus === 'APPROVED',
      updatedAt: now,
    };
    if (instIdx !== -1) {
      dbInstance.institutes[instIdx] = { ...dbInstance.institutes[instIdx], ...instCatalogItem };
    } else {
      dbInstance.institutes.push(instCatalogItem);
    }

    // Update user status in database
    dbInstance.users = dbInstance.users || [];
    const userIdx = dbInstance.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      dbInstance.users[userIdx].onboardingStatus = targetOnboardingStatus;
      dbInstance.users[userIdx].profileCompleted = isCompleteAction || details.completion >= 70;
      dbInstance.users[userIdx].updatedAt = now;
    }

    localDb.saveDb(dbInstance);

    // Audit Logging
    await logAuditEvent({
      actorUserId: user.id,
      action: isCompleteAction ? AUDIT_ACTIONS.ORGANIZATION_SUBMITTED : AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: user.id,
      resourceType: 'INSTITUTE_PROFILE',
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
      message: isCompleteAction ? 'Institute onboarding completed and submitted for statutory verification!' : 'Step draft saved successfully',
      onboardingStatus: targetOnboardingStatus,
      verificationStatus: currentProfile.verificationStatus,
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process institute onboarding step', message: err.message }, { status: 500 });
  }
}
