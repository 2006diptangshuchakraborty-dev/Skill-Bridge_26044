const { NextResponse } = require("next/server");
const { getApplications, createApplication, getStudentById, getOpportunityById } = require("../../../lib/db");
const { evaluateMatch } = require("../../../lib/engine");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  let apps = getApplications();
  if (studentId) {
    apps = apps.filter(a => a.studentId === studentId);
  }

  return NextResponse.json({ count: apps.length, applications: apps });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, opportunityId } = body;

    if (!studentId || !opportunityId) {
      return NextResponse.json({ error: "studentId and opportunityId required" }, { status: 400 });
    }

    const student = getStudentById(studentId);
    const opportunity = getOpportunityById(opportunityId);

    if (!student || !opportunity) {
      return NextResponse.json({ error: "Student or Opportunity not found" }, { status: 404 });
    }

    // STRICT BUSINESS RULE CHECK: Candidates missing mandatory skills CANNOT apply
    const match = evaluateMatch(student, opportunity);

    if (!match.isEligible) {
      return NextResponse.json({
        error: "Application rejected: Mandatory skill gap detected.",
        isEligible: false,
        missingMandatorySkills: match.highPriorityAnalysis.gaps.map(g => g.canonicalName),
        matchResult: match
      }, { status: 422 });
    }

    const appData = {
      studentId,
      studentName: student.name,
      opportunityId,
      opportunityTitle: opportunity.title,
      companyName: opportunity.company,
      highPriorityMatchPct: match.scores.highPriorityMatchPct,
      lowPriorityMatchPct: match.scores.lowPriorityMatchPct,
      compositeScore: match.scores.compositeScore,
      matchStatus: match.status,
      appliedAt: new Date().toISOString(),
      status: "APPLIED"
    };

    const newApp = createApplication(appData);

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully!",
      application: newApp,
      matchResult: match
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { applicationId, id, status, reviewNotes, notes, reviewerUserId, interviewerUserId } = body;
    const targetAppId = applicationId || id;

    if (!targetAppId) {
      return NextResponse.json({ error: "applicationId or id is required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const { handleApplicationReview, handleInterviewCompletion } = require("../../../lib/lifecycle");

    if (status === 'REVIEWED' || status === 'SHORTLISTED') {
      const result = handleApplicationReview({
        applicationId: targetAppId,
        status,
        reviewerUserId,
        notes: reviewNotes || notes,
      });

      return NextResponse.json({
        success: true,
        message: `Application status updated to ${status} and rating interaction created`,
        application: result.application,
        interaction: result.interaction,
      });
    } else if (status === 'INTERVIEW_COMPLETED') {
      const result = handleInterviewCompletion({
        applicationId: targetAppId,
        referenceId: targetAppId,
        interviewerUserId: interviewerUserId || reviewerUserId,
        notes: reviewNotes || notes,
      });

      const { getApplicationById } = require("../../../lib/db");
      const app = getApplicationById(targetAppId);

      return NextResponse.json({
        success: true,
        message: "Interview marked as completed and rating interaction created",
        application: app,
        interaction: result.interaction,
      });
    } else {
      const { updateApplicationStatus, getApplicationById } = require("../../../lib/db");
      const updated = updateApplicationStatus(targetAppId, status, reviewNotes || notes);
      if (!updated) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Application status updated to ${status}`,
        application: updated,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  return PATCH(request);
}

