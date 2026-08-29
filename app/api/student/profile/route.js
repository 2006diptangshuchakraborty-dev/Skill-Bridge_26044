/**
 * Skill Bridge Platform - Student Profile CRUD Route Handler
 * File: app/api/student/profile/route.js
 */

import { NextResponse } from 'next/server';
const { logAuditEvent, AUDIT_ACTIONS } = require('@/lib/audit');
const { calculateStudentCompletion } = require('@/lib/onboarding-calc');
const localDb = require('@/lib/db');

// Helper to extract session from request headers or auth context
function resolveCaller(req) {
  const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-auth-user-id');
  const userRoleHeader = req.headers.get('x-user-role') || req.headers.get('x-auth-user-role');

  if (userIdHeader) {
    return {
      user: {
        id: userIdHeader,
        role: userRoleHeader || 'STUDENT',
      },
    };
  }

  // Look up student user from active database in memory if available
  const dbInstance = localDb.getDb();
  const users = dbInstance.users || [];
  const student = users.find((u) => u.role === 'STUDENT');
  if (student) {
    return { user: student };
  }

  return null;
}

/**
 * GET /api/student/profile
 * Query params: ?userId=xxx
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

    // Role check: If requesting another user's profile, caller must be ADMIN
    if (requestedUserId && session && session.user.id !== requestedUserId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Cannot access another user profile' }, { status: 403 });
    }

    const dbInstance = localDb.getDb();
    const studentProfiles = dbInstance.studentProfiles || [];
    let profile = studentProfiles.find((p) => p.userId === targetUserId || p.id === targetUserId);

    // Fallback: check legacy students table
    if (!profile && dbInstance.students) {
      profile = dbInstance.students.find((s) => s.userId === targetUserId || s.id === targetUserId || s.studentId === targetUserId);
    }

    if (!profile) {
      // Return initial template for newly registered students
      const initialProfile = {
        userId: targetUserId,
        headline: '',
        bio: '',
        instituteName: '',
        department: '',
        degree: '',
        yearOfStudy: null,
        cgpa: null,
        skills: [],
        projects: [],
        certifications: [],
        experience: [],
        careerPreferences: {},
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
 * POST / PUT / PATCH /api/student/profile
 * Upserts student profile, updates completion score, and logs PROFILE_UPDATED.
 */
export async function POST(request) {
  return handleSaveProfile(request);
}

export async function PUT(request) {
  return handleSaveProfile(request);
}

export async function PATCH(request) {
  return handleSaveProfile(request);
}

async function handleSaveProfile(request) {
  try {
    const session = resolveCaller(request);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    const body = await request.json();
    const targetUserId = body.userId || session.user.id;

    // IDOR Prevention: User cannot update another student's profile unless ADMIN
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You cannot modify another user profile' }, { status: 403 });
    }

    // Role Integrity Check: Non-students cannot create student profile
    if (session.user.role !== 'STUDENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only students can have a student profile' }, { status: 403 });
    }

    // Strip protected server-owned fields from client body
    const { id, role, accountStatus, verificationStatus, ...profileUpdates } = body;

    const dbInstance = localDb.getDb();
    dbInstance.studentProfiles = dbInstance.studentProfiles || [];
    const existingIndex = dbInstance.studentProfiles.findIndex((p) => p.userId === targetUserId);

    let updatedRecord;
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const merged = {
        ...dbInstance.studentProfiles[existingIndex],
        ...profileUpdates,
        userId: targetUserId,
        updatedAt: now,
      };
      // Calculate dynamic completion score
      merged.profileCompletion = calculateStudentCompletion(merged);
      dbInstance.studentProfiles[existingIndex] = merged;
      updatedRecord = merged;
    } else {
      const newProfile = {
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: targetUserId,
        headline: profileUpdates.headline || '',
        bio: profileUpdates.bio || '',
        instituteName: profileUpdates.instituteName || '',
        department: profileUpdates.department || '',
        degree: profileUpdates.degree || '',
        yearOfStudy: profileUpdates.yearOfStudy || null,
        cgpa: profileUpdates.cgpa || null,
        skills: profileUpdates.skills || [],
        projects: profileUpdates.projects || [],
        certifications: profileUpdates.certifications || [],
        experience: profileUpdates.experience || [],
        careerPreferences: profileUpdates.careerPreferences || {},
        createdAt: now,
        updatedAt: now,
      };
      newProfile.profileCompletion = calculateStudentCompletion(newProfile);
      dbInstance.studentProfiles.push(newProfile);
      updatedRecord = newProfile;
    }

    // Update user onboarding status if profile is completed or in progress
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
      resourceType: 'STUDENT_PROFILE',
      resourceId: updatedRecord.id,
      metadata: {
        completion: updatedRecord.profileCompletion,
        updatedKeys: Object.keys(profileUpdates),
      },
      req: request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Student profile updated successfully',
        profile: updatedRecord,
        profileCompletion: updatedRecord.profileCompletion,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update student profile', message: err.message }, { status: 500 });
  }
}
