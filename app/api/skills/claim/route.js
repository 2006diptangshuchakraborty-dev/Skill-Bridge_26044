/**
 * Skill Bridge Platform - Student Skill Claims API
 * File: app/api/skills/claim/route.js
 */

const { NextResponse } = require('next/server');
const { getDb, saveDb } = require('../../../../lib/db');
const { getSkillByIdOrSlug } = require('../../../../lib/taxonomy');
const { withAuth } = require('../../../../lib/auth-guard');

async function handleGetStudentSkills(req, { user }) {
  const dbData = getDb();
  const student = (dbData.students || []).find(s => s.userId === user.id || s.id === user.id) || {
    id: user.id,
    skills: [],
  };

  return NextResponse.json({
    success: true,
    skills: student.skills || [],
  });
}

async function handleClaimSkill(req, { user }) {
  try {
    const body = await req.json();
    const { skillId, selfRatedLevel, yearsExperience, projectCount, certificates, portfolioUrl } = body;

    if (!skillId) {
      return NextResponse.json({ success: false, error: 'skillId is required' }, { status: 400 });
    }

    const skill = getSkillByIdOrSlug(skillId);
    if (!skill) {
      return NextResponse.json({ success: false, error: `Skill '${skillId}' not found in taxonomy` }, { status: 404 });
    }

    const dbData = getDb();
    dbData.students = dbData.students || [];
    let student = dbData.students.find(s => s.userId === user.id || s.id === user.id);

    if (!student) {
      student = {
        id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        name: user.name || 'Student',
        email: user.email,
        skills: [],
      };
      dbData.students.push(student);
    }

    student.skills = student.skills || [];
    const existingIndex = student.skills.findIndex(s => s.skillId === skill.id || s.name === skill.name);

    const newClaim = {
      skillId: skill.id,
      name: skill.name,
      category: skill.categoryName || skill.category,
      selfRatedLevel: selfRatedLevel || 'Intermediate',
      yearsExperience: parseFloat(yearsExperience) || 0,
      projectCount: parseInt(projectCount, 10) || 0,
      certificates: certificates || [],
      portfolioUrl: portfolioUrl || '',
      status: existingIndex >= 0 ? student.skills[existingIndex].status || 'UNVERIFIED' : 'UNVERIFIED',
      proficiency: existingIndex >= 0 ? student.skills[existingIndex].proficiency || 0 : 0,
      claimedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      student.skills[existingIndex] = { ...student.skills[existingIndex], ...newClaim };
    } else {
      student.skills.push(newClaim);
    }

    saveDb(dbData);

    return NextResponse.json({
      success: true,
      message: `Skill '${skill.name}' claimed successfully`,
      skill: newClaim,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const GET = withAuth(handleGetStudentSkills, { roles: ['STUDENT', 'ADMIN'] });
export const POST = withAuth(handleClaimSkill, { roles: ['STUDENT', 'ADMIN'] });
