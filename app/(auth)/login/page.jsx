"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import RoleSelector from '@/components/auth/RoleSelector';
import {
  Sparkles,
  AlertTriangle,
  Lock,
  ArrowRight,
  Shield,
} from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();

  const [activeRole, setActiveRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ['STUDENT', 'INDUSTRY', 'ORGANIZATION', 'INSTITUTE', 'ADMIN'].includes(roleParam.toUpperCase())) {
      setActiveRole(roleParam.toUpperCase() === 'ORGANIZATION' ? 'INDUSTRY' : roleParam.toUpperCase());
    }
  }, [searchParams]);

  const getPostLoginCallbackUrl = () => {
    const callbackRole = activeRole === 'ORGANIZATION' ? 'industry' : activeRole.toLowerCase();
    return `/profile/complete?role=${callbackRole}`;
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pre-OAuth intent call (if new sign in intent is generated for this role)
      try {
        if (activeRole !== 'ADMIN') {
          await fetch('/api/auth/signup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: activeRole === 'INDUSTRY' ? 'INDUSTRY' : activeRole,
            }),
          });
        }
      } catch {
        // Continue to sign in even if pre-intent fails (existing accounts will resolve via Better Auth)
      }

      // Trigger OAuth redirect through /profile/complete dispatcher
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: getPostLoginCallbackUrl(),
      });
    } catch (err) {
      setError(err.message || 'Failed to initialize Google authentication');
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'STUDENT':
        return 'Student';
      case 'INDUSTRY':
        return 'Industry';
      case 'INSTITUTE':
        return 'Institute';
      
      default:
        return role;
    }
  };

  return (
    <div className="max-w-xl w-full space-y-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-emerald-500/5">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Sign In to Skill Bridge
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Skill-Based Authentication & Verification Governance Portal
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selection Tabs / Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Your Role
          </label>
          <button
            type="button"
            onClick={() => setActiveRole(activeRole === 'ADMIN' ? 'STUDENT' : 'ADMIN')}
            className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            {activeRole === 'ADMIN' ? 'Standard User Portals' : 'Admin Login'}
          </button>
        </div>

        {activeRole === 'ADMIN' ? (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 text-purple-400" />
            <div>
              <span className="font-bold">Administrative Governance Portal:</span>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                Signing in with authorized super admin credentials grants system moderation and audit log permissions.
              </p>
            </div>
          </div>
        ) : (
          <RoleSelector
            selectedRole={activeRole}
            onSelectRole={(role) => setActiveRole(role)}
            disabled={loading}
            layout="compact"
          />
        )}
      </div>

      {/* Informative Role Immutability Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 px-4 py-3 shadow-lg shadow-emerald-950/20">
  {/* Subtle glow */}
  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl" />

  <div className="relative flex items-center gap-20 justify-around">
    {/* Icon */}
    <div className="flex h-9 w-9 shrink-0 items-center space-x-8 justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
      <Lock className="h-4 w-4 text-emerald-400" />
    </div>

    {/* Text */}
    <div className="min-w-0 flex-1 flex-col space-y-0.5">
      <p className="text-[11px]  font-medium uppercase tracking-wider text-slate-500">
        Secure authentication
      </p>

      <p className="mt-0.5 text-sm font-medium text-slate-200">
        Signing into{" "}
        <strong className="font-semibold text-emerald-400">
          {getRoleDisplayName(activeRole)}
        </strong>
      </p>
    </div>

    {/* Status */}
    <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      <span className="text-[10px] font-medium text-emerald-400">
        Secure
      </span>
    </div>
  </div>
</div>

      {/* Action Button */}
      <div className="space-y-4 pt-1">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Connecting with Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google as {getRoleDisplayName(activeRole)}</span>
              <ArrowRight className="w-4 h-4 ml-1 text-slate-600" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Create new account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[88vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading login portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
