const { NextResponse } = require("next/server");
const { getStudentById, getOpportunityById, getStudents, getOpportunities } = require("../../../lib/db");
const { evaluateMatch } = require("../../../lib/engine");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const opportunityId = searchParams.get("opportunityId");

  if (!studentId || !opportunityId) {
    return NextResponse.json(
      { error: "Missing required query parameters: studentId and opportunityId" },
      { status: 400 }
    );
  }

  const student = getStudentById(studentId);
  const opportunity = getOpportunityById(opportunityId);

  if (!student) {
    return NextResponse.json({ error: `Student not found with ID: ${studentId}` }, { status: 404 });
  }

  if (!opportunity) {
    return NextResponse.json({ error: `Opportunity not found with ID: ${opportunityId}` }, { status: 404 });
  }

  const matchResult = evaluateMatch(student, opportunity);

  return NextResponse.json({
    success: true,
    student: {
      id: student.id,
      name: student.name,
      department: student.department,
      year: student.year
    },
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      company: opportunity.company
    },
    matchResult
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { student, opportunity } = body;

    if (!student || !opportunity) {
      return NextResponse.json({ error: "Invalid body. Must supply student and opportunity objects." }, { status: 400 });
    }

    const matchResult = evaluateMatch(student, opportunity);
    return NextResponse.json({ success: true, matchResult });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
