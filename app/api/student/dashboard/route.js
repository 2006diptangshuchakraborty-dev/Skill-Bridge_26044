import { NextResponse } from "next/server";

import {
  getStudentData,
  getIndustryData,
  getInstituteData,
} from "../../../../services/userService";

// IMPORTANT:
// This API uses the database, so it must run at request time,
// not while Vercel is building the application.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [students, industries, institutes] = await Promise.all([
      getStudentData(),
      getIndustryData(),
      getInstituteData(),
    ]);

    return NextResponse.json({
      success: true,
      students,
      industries,
      institutes,
    });
  } catch (error) {
    console.error("Student dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
      },
      {
        status: 500,
      }
    );
  }
}