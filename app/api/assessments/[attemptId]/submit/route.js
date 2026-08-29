/**
 * Skill Bridge Platform - Assessment Attempt Submit & Evaluate API
 * File: app/api/assessments/[attemptId]/submit/route.js
 */

const { NextResponse } = require('next/server');
const { evaluateAssessmentAttempt } = require('../../../../../lib/scoring-engine');
const { getAssessmentAttempt } = require('../../../../../lib/assessment-engine');
const { withAuth } = require('../../../../../lib/auth-guard');

async function handleSubmitAttempt(req, { params, user }) {
  try {
    const attemptId = params?.attemptId;
    const attempt = getAssessmentAttempt(attemptId);

    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Assessment attempt not found' }, { status: 404 });
    }

    if (attempt.studentId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden: Cannot submit attempt belonging to another user' }, { status: 403 });
    }

    const result = evaluateAssessmentAttempt(attemptId);

    return NextResponse.json({
      success: true,
      message: 'Assessment evaluated successfully',
      result,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const POST = withAuth(handleSubmitAttempt, { roles: ['STUDENT', 'ADMIN'] });
