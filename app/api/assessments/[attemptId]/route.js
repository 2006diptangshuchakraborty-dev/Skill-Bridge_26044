/**
 * Skill Bridge Platform - Assessment Attempt Details & Answer Recording API
 * File: app/api/assessments/[attemptId]/route.js
 */

const { NextResponse } = require('next/server');
const { getAssessmentAttempt, recordAnswer, recordAntiCheatingEvent } = require('../../../../lib/assessment-engine');
const { withAuth } = require('../../../../lib/auth-guard');

async function handleGetAttempt(req, { params, user }) {
  const attemptId = params?.attemptId;
  const attempt = getAssessmentAttempt(attemptId);

  if (!attempt) {
    return NextResponse.json({ success: false, error: 'Assessment attempt not found' }, { status: 404 });
  }

  if (attempt.studentId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Cannot access another user attempt' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    attempt,
  });
}

async function handlePostAttemptAction(req, { params, user }) {
  try {
    const attemptId = params?.attemptId;
    const body = await req.json();
    const { action, questionId, answer, timeSpentSeconds, eventType, details } = body;

    const attempt = getAssessmentAttempt(attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Assessment attempt not found' }, { status: 404 });
    }

    if (attempt.studentId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'RECORD_ANSWER') {
      const updated = recordAnswer(attemptId, questionId, answer, timeSpentSeconds);
      return NextResponse.json({ success: true, attempt: updated });
    } else if (action === 'RECORD_EVENT') {
      const antiCheating = recordAntiCheatingEvent(attemptId, eventType, details);
      return NextResponse.json({ success: true, antiCheating });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGetAttempt, { roles: ['STUDENT', 'ADMIN'] });
export const POST = withAuth(handlePostAttemptAction, { roles: ['STUDENT', 'ADMIN'] });
