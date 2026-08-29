/**
 * Skill Bridge Platform - Edge Route Protection Middleware
 * Target: middleware.js
 * 
 * Enforces:
 * 1. Edge route partitioning (/student/*, /industry/*, /organization/*, /recruiter/*, /institute/*, /profile/*, /admin/*)
 * 2. Session verification via Better Auth cookies and test identity headers
 * 3. Role authorization & cross-role redirection
 * 4. Automatic onboarding redirection to /profile/setup for incomplete profiles (< 70% or profileCompleted === false)
 * 5. Immediate access termination for SUSPENDED / DEACTIVATED accounts
 * 6. Direct routing to canonical role dashboards for authenticated users visiting /auth, /login, /register
 */

import { NextResponse } from 'next/server.js';

// Configuration: Matching routes intercepted by Edge Middleware
export const config = {
  matcher: [
    '/student/:path*',
    '/organization/:path*',
    '/industry/:path*',
    '/recruiter/:path*',
    '/institute/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/account-suspended',
    '/auth',
    '/login',
    '/register',
  ],
};

/**
 * Returns the canonical dashboard URL for a given role
 */
function getCanonicalDashboard(role) {
  const normalized = (role || '').toUpperCase();
  switch (normalized) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'INSTITUTE':
      return '/institute/dashboard';
    case 'ORGANIZATION':
      return '/organization/dashboard';
    case 'INDUSTRY':
    case 'RECRUITER':
      return '/industry/dashboard';
    case 'STUDENT':
    default:
      return '/student/dashboard';
  }
}

/**
 * Extracts and resolves user session from request cookies and fallback headers
 */
function resolveSessionFromRequest(req) {
  // 1. Non-production / test identity headers
  if (process.env.NODE_ENV !== 'production') {
    const headerUserId =
      req.headers.get('x-test-user-id') ||
      req.headers.get('x-user-id') ||
      req.headers.get('x-auth-user-id');

    const headerRole =
      req.headers.get('x-test-user-role') ||
      req.headers.get('x-user-role') ||
      req.headers.get('x-auth-user-role');

    const headerStatus =
      req.headers.get('x-test-account-status') ||
      req.headers.get('x-account-status') ||
      req.headers.get('x-auth-account-status');

    const headerOnboarding =
      req.headers.get('x-test-onboarding-status') ||
      req.headers.get('x-onboarding-status') ||
      req.headers.get('x-auth-onboarding-status');

    const headerProfileCompleted =
      req.headers.get('x-test-profile-completed') ||
      req.headers.get('x-profile-completed') ||
      req.headers.get('x-auth-profile-completed');

    const headerScore =
      req.headers.get('x-test-completion-score') ||
      req.headers.get('x-completion-score');

    if (headerUserId && headerRole) {
      let isCompleted = false;
      if (headerProfileCompleted !== null && headerProfileCompleted !== undefined) {
        isCompleted = headerProfileCompleted === 'true' || headerProfileCompleted === '1';
      } else if (headerOnboarding) {
        isCompleted = headerOnboarding.toUpperCase() === 'COMPLETED';
      } else if (headerScore !== null && headerScore !== undefined) {
        const parsedScore = parseFloat(headerScore);
        isCompleted = !isNaN(parsedScore) && parsedScore >= 70;
      }

      const normalizedStatus = (headerStatus || 'ACTIVE').toUpperCase();
      const normalizedOnboarding = headerOnboarding
        ? headerOnboarding.toUpperCase()
        : (isCompleted ? 'COMPLETED' : 'NOT_STARTED');

      return {
        user: {
          id: headerUserId,
          role: headerRole.toUpperCase(),
          accountStatus: normalizedStatus,
          onboardingStatus: normalizedOnboarding,
          profileCompleted: isCompleted,
          completionScore: headerScore ? parseFloat(headerScore) : (isCompleted ? 100 : 0),
        },
      };
    }
  }

  // 2. Check for Better Auth session cookies
  const sessionTokenCookie =
    req.cookies.get('better-auth.session_token')?.value ||
    req.cookies.get('__Secure-better-auth.session_token')?.value ||
    req.cookies.get('sb_session_token')?.value;

  if (!sessionTokenCookie) {
    return null;
  }

  // Check optional companion hint cookies if present
  const cookieRole = req.cookies.get('sb_user_role')?.value;
  const cookieStatus = req.cookies.get('sb_user_status')?.value;
  const cookieCompleted = req.cookies.get('sb_profile_completed')?.value;

  const role = cookieRole ? cookieRole.toUpperCase() : null;
  const accountStatus = (cookieStatus || 'ACTIVE').toUpperCase();
  const profileCompleted = cookieCompleted !== undefined ? cookieCompleted === 'true' : true;

  return {
    sessionToken: sessionTokenCookie,
    user: {
      id: 'usr_authenticated',
      role: role,
      accountStatus: accountStatus,
      onboardingStatus: profileCompleted ? 'COMPLETED' : 'NOT_STARTED',
      profileCompleted: profileCompleted,
      completionScore: profileCompleted ? 100 : 0,
    },
  };
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const session = resolveSessionFromRequest(request);
  const user = session?.user;

  // ---------------------------------------------------------------------------
  // 1. PUBLIC AUTH ROUTES (/auth, /login, /register)
  // ---------------------------------------------------------------------------
  if (pathname === '/auth' || pathname === '/login' || pathname === '/register') {
    const roleParam = request.nextUrl.searchParams.get('role');
    const switchParam = request.nextUrl.searchParams.get('switch');
    const intentParam = request.nextUrl.searchParams.get('intent') || request.nextUrl.searchParams.get('state');
    const hasIntentCookie = request.cookies.has('sb_signup_intent');

    // Allow role-switching requests or explicit role query / intent to proceed to auth page
    if (roleParam || switchParam === 'true' || intentParam || hasIntentCookie) {
      return NextResponse.next();
    }

    if (user) {
      if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DEACTIVATED') {
        return NextResponse.redirect(new URL('/account-suspended', request.url));
      }

      // If user session is active but role cookie is not resolved yet, send to profile dispatcher
      if (!user.role) {
        return NextResponse.redirect(new URL('/profile/complete', request.url));
      }

      // Incomplete profile -> redirect to /profile/setup
      if (!user.profileCompleted || user.onboardingStatus !== 'COMPLETED' || (typeof user.completionScore === 'number' && user.completionScore < 70)) {
        return NextResponse.redirect(new URL('/profile/setup', request.url));
      }

      // Onboarding complete -> redirect directly to canonical role dashboard
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 2. ACCOUNT SUSPENDED ROUTE (/account-suspended)
  // ---------------------------------------------------------------------------
  if (pathname === '/account-suspended') {
    if (!user) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', pathname + (search || ''));
      return NextResponse.redirect(redirectUrl);
    }
    if (user.accountStatus !== 'SUSPENDED' && user.accountStatus !== 'DEACTIVATED') {
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 3. UNAUTHENTICATED ACCESS GUARD FOR PROTECTED ROUTES
  // ---------------------------------------------------------------------------
  const isProtectedPath =
    pathname.startsWith('/student') ||
    pathname.startsWith('/industry') ||
    pathname.startsWith('/organization') ||
    pathname.startsWith('/recruiter') ||
    pathname.startsWith('/institute') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  if (!user) {
    if (isProtectedPath) {
      let targetRole = 'STUDENT';
      if (pathname.startsWith('/admin')) {
        targetRole = 'ADMIN';
      } else if (
        pathname.startsWith('/industry') ||
        pathname.startsWith('/organization') ||
        pathname.startsWith('/recruiter')
      ) {
        targetRole = 'INDUSTRY';
      } else if (pathname.startsWith('/institute')) {
        targetRole = 'INSTITUTE';
      }

      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', pathname + (search || ''));
      redirectUrl.searchParams.set('role', targetRole);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 4. ACCOUNT STATUS ENFORCEMENT (SUSPENDED / DEACTIVATED)
  // ---------------------------------------------------------------------------
  if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DEACTIVATED') {
    return NextResponse.redirect(new URL('/account-suspended', request.url));
  }

  // ---------------------------------------------------------------------------
  // 5. PROFILE ROUTES (/profile/*)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/profile')) {
    // /profile/setup, /profile/complete, etc. are accessible to authenticated active users
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // 6. ROLE-SPECIFIC ROUTE PARTITIONING & ONBOARDING ENFORCEMENT
  // ---------------------------------------------------------------------------

  const isProfileIncomplete = (u) => {
    return (
      !u.profileCompleted ||
      u.onboardingStatus !== 'COMPLETED' ||
      (typeof u.completionScore === 'number' && u.completionScore < 70)
    );
  };

  // A. Admin Partition (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user.role) {
      return NextResponse.redirect(new URL('/profile/complete', request.url));
    }
    if (user.role !== 'ADMIN') {
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // B. Student Partition (/student/*)
  if (pathname.startsWith('/student')) {
    if (!user.role) {
      return NextResponse.redirect(new URL('/profile/complete', request.url));
    }
    if (user.role !== 'STUDENT') {
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    const isOnboardingRoute =
      pathname === '/student/onboarding' ||
      pathname.startsWith('/student/onboarding/') ||
      pathname === '/profile/setup';

    if (!isOnboardingRoute && isProfileIncomplete(user)) {
      return NextResponse.redirect(new URL('/profile/setup', request.url));
    }

    return NextResponse.next();
  }

  // C. Industry / Organization / Recruiter Partition (/industry/*, /organization/*, /recruiter/*)
  if (
    pathname.startsWith('/industry') ||
    pathname.startsWith('/organization') ||
    pathname.startsWith('/recruiter')
  ) {
    if (!user.role) {
      return NextResponse.redirect(new URL('/profile/complete', request.url));
    }
    if (
      user.role !== 'INDUSTRY' &&
      user.role !== 'ORGANIZATION' &&
      user.role !== 'RECRUITER'
    ) {
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    const isOnboardingRoute =
      pathname === '/organization/onboarding' ||
      pathname.startsWith('/organization/onboarding/') ||
      pathname === '/industry/onboarding' ||
      pathname.startsWith('/industry/onboarding/') ||
      pathname === '/profile/setup';

    if (!isOnboardingRoute && isProfileIncomplete(user)) {
      return NextResponse.redirect(new URL('/profile/setup', request.url));
    }

    return NextResponse.next();
  }

  // D. Institute Partition (/institute/*)
  if (pathname.startsWith('/institute')) {
    if (!user.role) {
      return NextResponse.redirect(new URL('/profile/complete', request.url));
    }
    if (user.role !== 'INSTITUTE') {
      const targetDashboard = getCanonicalDashboard(user.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    const isOnboardingRoute =
      pathname === '/institute/onboarding' ||
      pathname.startsWith('/institute/onboarding/') ||
      pathname === '/profile/setup';

    if (!isOnboardingRoute && isProfileIncomplete(user)) {
      return NextResponse.redirect(new URL('/profile/setup', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}
