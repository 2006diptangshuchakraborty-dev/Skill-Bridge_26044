const { NextResponse } = require("next/server");
const { extractSkillsFromJD } = require("../../../lib/nlp-extractor");

export async function POST(request) {
  try {
    const body = await request.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "Missing or invalid jobDescription text" }, { status: 400 });
    }

    const extractionResult = extractSkillsFromJD(jobDescription);

    return NextResponse.json({
      success: true,
      extracted: extractionResult
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
