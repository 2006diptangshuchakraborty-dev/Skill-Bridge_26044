const { NextResponse } = require("next/server");
const { getStudents, getStudentById, updateStudent } = require("../../../lib/db");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const student = getStudentById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json(student);
  }

  const students = getStudents();
  return NextResponse.json({ count: students.length, students });
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing student ID" }, { status: 400 });
    }

    const updated = updateStudent(id, data);
    return NextResponse.json({ success: true, student: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
