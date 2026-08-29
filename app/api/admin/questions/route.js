/**
 * Skill Bridge Platform - Admin Question Bank API
 * File: app/api/admin/questions/route.js
 */

const { NextResponse } = require('next/server');
const { getQuestionBank, saveQuestion, generateAiQuestionDraft } = require('../../../../lib/questions');
const { withAuth } = require('../../../../lib/auth-guard');

async function handleGetQuestions(req) {
  const bank = getQuestionBank();
  return NextResponse.json({ success: true, questions: bank });
}

async function handleSaveQuestion(req) {
  try {
    const body = await req.json();
    const { action, skillId, topic, difficulty, questionData } = body;

    if (action === 'GENERATE_AI') {
      const draft = generateAiQuestionDraft(skillId || 'skill_javascript', topic || 'async', difficulty || 'Medium');
      return NextResponse.json({ success: true, message: 'AI question draft generated', question: draft });
    }

    if (!questionData || !questionData.question) {
      return NextResponse.json({ success: false, error: 'questionData with question text is required' }, { status: 400 });
    }

    const saved = saveQuestion(questionData);
    return NextResponse.json({ success: true, message: 'Question saved successfully', question: saved });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGetQuestions, { roles: ['ADMIN'] });
export const POST = withAuth(handleSaveQuestion, { roles: ['ADMIN'] });
