const { NextResponse } = require("next/server");
const { getOpportunities, getOpportunityById, createOpportunity } = require("../../../lib/db");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const opp = getOpportunityById(id);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    return NextResponse.json(opp);
  }

  const opportunities = getOpportunities();
  return NextResponse.json({ count: opportunities.length, opportunities });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.title || !body.company) {
      return NextResponse.json({ error: "Missing title or company" }, { status: 400 });
    }

    const created = createOpportunity(body);
    return NextResponse.json({ success: true, opportunity: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
