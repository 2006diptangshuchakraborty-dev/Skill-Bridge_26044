const { NextResponse } = require("next/server");
const { computeInstituteSkillGapAlerts } = require("../../../lib/alerts");

export async function GET() {
  const alerts = computeInstituteSkillGapAlerts();
  return NextResponse.json({
    count: alerts.length,
    alerts
  });
}
