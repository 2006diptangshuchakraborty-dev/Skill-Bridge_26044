/**
 * Skill Bridge Platform - Start Assessment API
 * File: app/api/assessments/start/route.js
 */

const { NextResponse } = require('next/server');
const { createAssessmentAttempt } = require('../../../../lib/assessment-engine');
const { withAuth } = require('../../../../lib/auth-guard');

async function handleStartAssessment(req, { user }) {
  try {
    const body = await req.json();
    const { skillId, claimedLevel } = body;

    if (!skillId) {
      return NextResponse.json({ success: false, error: 'skillId is required' }, { status: 400 });
    }

    const attempt = createAssessmentAttempt(user.id, skillId, claimedLevel || 'Intermediate');

    return NextResponse.json({
      success: true,
      message: 'Assessment attempt created',
      attemptId: attempt.id,
      attempt,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const POST = withAuth(handleStartAssessment, { roles: ['STUDENT', 'ADMIN'] });
