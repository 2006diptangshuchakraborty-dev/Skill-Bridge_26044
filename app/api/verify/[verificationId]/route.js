/**
 * Skill Bridge Platform - Public Skill Verification API
 * File: app/api/verify/[verificationId]/route.js
 */

const { NextResponse } = require('next/server');
const { getDb } = require('../../../../lib/db');

export async function GET(req, { params }) {
  try {
    const verificationId = params?.verificationId;
    const dbData = getDb();
    const verifications = dbData.verifications || [];

    const record = verifications.find(v => v.id === verificationId);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Verification record not found or invalid ID' }, { status: 404 });
    }

    // Publicly safe payload (excludes PII & exam questions)
    const publicVerification = {
      verificationId: record.id,
      skillName: record.skillName,
      level: record.level,
      overallScore: record.overallScore,
      confidence: record.confidence || 'Medium',
      status: record.status,
      verifiedAt: record.verifiedAt,
      expiresAt: record.expiresAt,
      breakdown: record.breakdown || {},
      integrityScore: record.integrityScore || 100,
    };

    return NextResponse.json({
      success: true,
      verification: publicVerification,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
