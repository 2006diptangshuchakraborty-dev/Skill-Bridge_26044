/**
 * Skill Bridge Platform - Pre-OAuth Signup Intent API Route
 * File: app/api/auth/signup-intent/route.js
 */

import { NextResponse } from 'next/server';
const {
  createSignupIntent,
  resolveValidIntent,
  SIGNUP_INTENT_COOKIE,
  INTENT_EXPIRY_MS,
} = require('@/lib/signup-intent');

/**
 * POST /api/auth/signup-intent
 * Registers pre-OAuth role intent, sets secure cookie, and returns token
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { role, email } = body || {};

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      );
    }

    const normalizedRole = String(role).trim().toUpperCase();

    // Strict Admin Signup Prohibition
    if (normalizedRole === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin registration is prohibited', code: 'ADMIN_REGISTRATION_FORBIDDEN' },
        { status: 403 }
      );
    }

    const result = await createSignupIntent({ role: normalizedRole, email });

    const response = NextResponse.json(
      {
        success: true,
        intentToken: result.token,
        role: result.role,
        expiresAt: result.expiresAt,
      },
      { status: 201 }
    );

    // Set secure httpOnly cookie
    response.cookies.set(SIGNUP_INTENT_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(INTENT_EXPIRY_MS / 1000), // 900 seconds (15 minutes)
    });

    return response;
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create signup intent',
        code: err.code || 'INTENT_CREATION_FAILED',
      },
      { status }
    );
  }
}

/**
 * GET /api/auth/signup-intent
 * Validates an intent token from query parameter ?token=... or cookie
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenFromQuery = searchParams.get('token');
    const tokenFromCookie = request.cookies?.get?.(SIGNUP_INTENT_COOKIE)?.value;
    const token = tokenFromQuery || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No intent token provided' },
        { status: 400 }
      );
    }

    const intent = await resolveValidIntent(token);

    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Intent token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        isValid: intent.isValid,
        role: intent.role,
        isExpired: intent.isExpired,
        isUsed: intent.isUsed,
        expiresAt: intent.expiresAt,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/signup-intent
 * Clears and invalidates the signup intent cookie
 */
export async function DELETE() {
  const response = NextResponse.json(
    { success: true, message: 'Signup intent cleared' },
    { status: 200 }
  );

  response.cookies.set(SIGNUP_INTENT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
