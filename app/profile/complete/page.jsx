"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Sparkles, ShieldCheck, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export default function ProfileCompleteDispatcherPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Verifying credentials & onboarding status...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const requestedRoleParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('role')
        : null;

    const normalizeRequestedRole = (value) => {
      const normalized = String(value || '').trim().toUpperCase();
      if (normalized === 'ORGANIZATION' || normalized === 'RECRUITER') return 'INDUSTRY';
      return ['STUDENT', 'INDUSTRY', 'INSTITUTE', 'ADMIN'].includes(normalized) ? normalized : null;
    };

    async function dispatchUser() {
      try {
        setStatusMessage('Authenticating session...');
        
        // 1. Fetch active session from Better Auth Client SDK
        const sessionRes = await authClient.getSession();
        const user = sessionRes?.data?.user;
        const requestedRole = normalizeRequestedRole(requestedRoleParam);

        let role = user?.role ? String(user.role).trim().toUpperCase() : null;
        let onboardingStatus = user?.onboardingStatus || null;
        let profileCompleted = user?.profileCompleted === true;

        if (!role && requestedRole) {
          role = requestedRole;
          onboardingStatus = 'NOT_STARTED';
          profileCompleted = false;
        }

        // 2. If no direct session object, attempt fallback API probes
        if (!role) {
          try {
            const studentCheck = await fetch('/api/student/onboarding');
            if (studentCheck.ok) {
              const studentData = await studentCheck.json();
              if (studentData?.profile) {
                role = 'STUDENT';
                onboardingStatus = studentData.onboardingStatus;
                profileCompleted = studentData.profileCompletion >= 70;
              }
            }
          } catch {
            // Ignore fallback probe error
          }
        }

        if (!role) {
          try {
            const orgCheck = await fetch('/api/organization/onboarding');
            if (orgCheck.ok) {
              const orgData = await orgCheck.json();
              if (orgData?.profile) {
                role = 'INDUSTRY';
                onboardingStatus = orgData.onboardingStatus;
                profileCompleted = orgData.profileCompletion >= 70;
              }
            }
          } catch {}
        }

        if (!role) {
          try {
            const instCheck = await fetch('/api/institute/onboarding');
            if (instCheck.ok) {
              const instData = await instCheck.json();
              if (instData?.profile) {
                role = 'INSTITUTE';
                onboardingStatus = instData.onboardingStatus;
                profileCompleted = instData.profileCompletion >= 70;
              }
            }
          } catch {}
        }

        // If no role resolved after all probes, redirect to /auth / /login
        if (!role) {
          setStatusMessage('Session not found. Redirecting to login...');
          setTimeout(() => {
            if (isMounted) router.replace('/auth');
          }, 1000);
          return;
        }

        // Normalize roles for canonical routing
        const canonicalRole = (role === 'ORGANIZATION' || role === 'RECRUITER') ? 'INDUSTRY' : role;
        const isCompleted = profileCompleted || onboardingStatus === 'COMPLETED';

        // Synchronize companion cookies (sb_user_role, sb_profile_completed, sb_user_status)
        // and consume/delete the sb_signup_intent cookie
        if (typeof document !== 'undefined') {
          const cookieMaxAge = 60 * 60 * 24 * 7; // 7 days matching session lifetime
          document.cookie = `sb_user_role=${canonicalRole}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
          document.cookie = `sb_profile_completed=${isCompleted}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
          document.cookie = `sb_user_status=${user?.accountStatus || 'ACTIVE'}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
          // Clear consumed signup intent cookie
          document.cookie = 'sb_signup_intent=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }

        try {
          await fetch('/api/auth/signup-intent', { method: 'DELETE' }).catch(() => {});
        } catch {}

        setStatusMessage(`Directing to ${canonicalRole} portal...`);

        // Routing Logic:
        // - Completed profile -> Direct to role dashboard
        // - Incomplete profile -> Route to /profile/setup wizard with role context
        let targetRoute = '/profile/setup';

        if (isCompleted) {
          switch (canonicalRole) {
            case 'STUDENT':
              targetRoute = '/student/dashboard';
              break;
            case 'INDUSTRY':
            case 'ORGANIZATION':
              targetRoute = '/industry/dashboard';
              break;
            case 'INSTITUTE':
              targetRoute = '/institute/dashboard';
              break;
            case 'ADMIN':
              targetRoute = '/admin/dashboard';
              break;
            default:
              targetRoute = '/student/dashboard';
          }
        } else {
          switch (canonicalRole) {
            case 'STUDENT':
              targetRoute = '/profile/setup?role=student';
              break;
            case 'INDUSTRY':
            case 'ORGANIZATION':
              targetRoute = '/profile/setup?role=industry';
              break;
            case 'INSTITUTE':
              targetRoute = '/profile/setup?role=institute';
              break;
            case 'ADMIN':
              targetRoute = '/admin/dashboard';
              break;
            default:
              targetRoute = '/profile/setup';
          }
        }

        setTimeout(() => {
          if (isMounted) router.replace(targetRoute);
        }, 500);

      } catch (err) {
        console.error('Dispatch error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to resolve user session');
          setTimeout(() => router.replace('/auth'), 2000);
        }
      }
    }

    dispatchUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur text-center space-y-6">
        {/* Animated Brand Pulse */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold shadow-xl shadow-emerald-500/20 mx-auto">
          <Sparkles className="w-8 h-8 animate-pulse" />
          <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400/50 animate-ping opacity-25" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Skill Bridge Dispatcher
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {statusMessage}
          </p>
        </div>

        {error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2 text-xs text-emerald-400 font-mono">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Securely resolving role partition...</span>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Server-Enforced Zero Trust Role Routing</span>
        </div>
      </div>
    </div>
  );
}

