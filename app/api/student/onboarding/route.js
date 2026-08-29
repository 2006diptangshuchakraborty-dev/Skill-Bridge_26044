/**
 * Skill Bridge Platform - Student Onboarding API Route Handler
 * Endpoint: /api/student/onboarding
 * Methods: GET, POST, PUT
 * File: app/api/student/onboarding/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateStudentCompletion, getStudentCompletionDetails } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

// Extracts and validates calling user session
function resolveUser(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');
  const userStatusHeader = req.headers.get('x-account-status') || req.headers.get('x-auth-account-status');
  const userOnboardingHeader = req.headers.get('x-onboarding-status') || req.headers.get('x-auth-onboarding-status');

  if (userIdHeader) {
    return {
      id: userIdHeader,
      role: userRoleHeader || 'STUDENT',
      accountStatus: userStatusHeader || 'ACTIVE',
      onboardingStatus: userOnboardingHeader || 'NOT_STARTED',
    };
  }

  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const student = users.find(u => u.role === 'STUDENT');
  if (student) return student;

  return null;
}

/**
 * GET /api/student/onboarding
 * Returns current onboarding draft state, step progress, and completion score.
 */
export async function GET(request) {
  try {
    const user = resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only students can access student onboarding' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const studentProfiles = dbInstance.studentProfiles || [];
    let profile = studentProfiles.find(p => p.userId === user.id);

    if (!profile) {
      profile = {
        userId: user.id,
        headline: '',
        bio: '',
        phone: '',
        address: '',
        instituteName: '',
        department: '',
        degree: '',
        yearOfStudy: '',
        cgpa: '',
        skills: [],
        projects: [],
        certifications: [],
        experience: [],
        careerPreferences: {
          preferredRoles: [],
          preferredLocations: [],
          jobType: 'Full-time',
        },
        profileCompletion: 0,
        currentOnboardingStep: 1,
      };
    }

    const details = getStudentCompletionDetails(profile);

    return NextResponse.json({
      success: true,
      profile,
      onboardingStatus: user.onboardingStatus || (details.completion >= 100 ? 'COMPLETED' : details.completion > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      currentStep: profile.currentOnboardingStep || 1,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve student onboarding status', message: err.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/student/onboarding
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

    if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only students can submit student onboarding' }, { status: 403 });
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
    dbInstance.studentProfiles = dbInstance.studentProfiles || [];
    let existingIdx = dbInstance.studentProfiles.findIndex(p => p.userId === user.id);

    let currentProfile = existingIdx !== -1 ? { ...dbInstance.studentProfiles[existingIdx] } : {
      id: `stp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      headline: '',
      bio: '',
      phone: '',
      address: '',
      instituteName: '',
      department: '',
      degree: '',
      yearOfStudy: '',
      cgpa: '',
      skills: [],
      projects: [],
      certifications: [],
      experience: [],
      careerPreferences: {},
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
      // Disallow tampering with security fields
      delete profileData.id;
      delete profileData.userId;
      delete profileData.role;
      Object.assign(currentProfile, profileData);
    }

    if (step && typeof step === 'number') {
      currentProfile.currentOnboardingStep = Math.max(currentProfile.currentOnboardingStep || 1, step);
    }

    // Compute dynamic completion
    const details = getStudentCompletionDetails(currentProfile);
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
    } else if (details.completion > 0) {
      targetOnboardingStatus = 'IN_PROGRESS';
    }

    // Persist profile
    if (existingIdx !== -1) {
      dbInstance.studentProfiles[existingIdx] = currentProfile;
    } else {
      dbInstance.studentProfiles.push(currentProfile);
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
      action: isCompleteAction ? AUDIT_ACTIONS.PROFILE_UPDATED : AUDIT_ACTIONS.PROFILE_UPDATED,
      targetUserId: user.id,
      resourceType: 'STUDENT_PROFILE',
      resourceId: currentProfile.id,
      metadata: {
        action: action || 'SAVE_DRAFT',
        step: step || currentProfile.currentOnboardingStep,
        profileCompletion: details.completion,
        onboardingStatus: targetOnboardingStatus,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: isCompleteAction ? 'Student onboarding completed successfully!' : 'Step draft saved successfully',
      onboardingStatus: targetOnboardingStatus,
      profileCompletion: details.completion,
      breakdown: details.breakdown,
      missingFields: details.missingFields,
      profile: currentProfile,
      currentStep: currentProfile.currentOnboardingStep,
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process onboarding step', message: err.message }, { status: 500 });
  }
}
