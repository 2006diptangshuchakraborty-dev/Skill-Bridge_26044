const { NextResponse } = require("next/server");
const { getStudents, getOpportunities } = require("../../../lib/db");
const { evaluateMatch } = require("../../../lib/engine");

export async function GET() {
  const students = getStudents();
  const opportunities = getOpportunities();

  const opp001 = opportunities.find(o => o.id === "opp_001") || opportunities[0];

  const results = students.map(student => {
    const evalResult = evaluateMatch(student, opp001);
    return {
      studentId: student.id,
      studentName: student.name,
      opportunityId: opp001.id,
      opportunityTitle: opp001.title,
      isEligible: evalResult.isEligible,
      status: evalResult.status,
      highPriorityMatchPct: evalResult.scores.highPriorityMatchPct,
      lowPriorityMatchPct: evalResult.scores.lowPriorityMatchPct,
      compositeScore: evalResult.scores.compositeScore,
      missingMandatorySkills: evalResult.highPriorityAnalysis.gaps.map(g => g.canonicalName),
      missingPreferredSkills: evalResult.lowPriorityAnalysis.gaps.map(g => g.canonicalName)
    };
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalEvaluated: results.length,
    eligibleCount: results.filter(r => r.isEligible).length,
    ineligibleCount: results.filter(r => !r.isEligible).length,
    results
  });
}
