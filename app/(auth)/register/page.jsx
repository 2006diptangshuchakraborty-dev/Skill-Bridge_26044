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
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function RegisterForm() {
  const searchParams = useSearchParams();

  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ['STUDENT', 'INDUSTRY', 'ORGANIZATION', 'INSTITUTE'].includes(roleParam.toUpperCase())) {
      setSelectedRole(roleParam.toUpperCase() === 'ORGANIZATION' ? 'INDUSTRY' : roleParam.toUpperCase());
    }
  }, [searchParams]);

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError(null);

      // Map INDUSTRY to canonical server role if needed (both INDUSTRY & ORGANIZATION are accepted)
      const targetRole = selectedRole === 'INDUSTRY' ? 'INDUSTRY' : selectedRole;

      // 1. Execute Pre-OAuth Handshake: Cryptographic Signup Intent
      const res = await fetch('/api/auth/signup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize pre-OAuth role intent');
      }

      // 2. Trigger Google OAuth redirect with /profile/complete dispatcher
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/profile/complete',
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
    <div className="max-w-2xl w-full space-y-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-emerald-500/5">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Create Your Skill Bridge Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Select your platform role to initialize your registration.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 3-Role Reusable Selector Card Component */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Choose Your Platform Role <span className="text-emerald-400">*</span>
        </label>
        <RoleSelector
          selectedRole={selectedRole}
          onSelectRole={(role) => setSelectedRole(role)}
          disabled={loading}
        />
      </div>

      {/* Role Immutability Warning Banner */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-emerald-400">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Single Google Account Single Role</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
          Your Google account will be permanently bound to <strong className="text-slate-200">{getRoleDisplayName(selectedRole)}</strong>. Once created, role assignments are immutable and strictly enforced by server authorization guards.
        </p>
      </div>

      {/* Strict Admin Prohibition Notice */}
      {/* <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/70 text-[11px] text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">Admin Governance Notice:</strong> Administrative and regulatory accounts cannot be self-registered and require direct server environment provisioning.
        </span>
      </div> */}

      {/* Action Button */}
      <div className="space-y-4 pt-2">
        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Authenticating...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google as {getRoleDisplayName(selectedRole)}</span>
              <ArrowRight className="w-4 h-4 ml-1 text-slate-600" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Sign in to existing portal
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[88vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading registration portal...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
