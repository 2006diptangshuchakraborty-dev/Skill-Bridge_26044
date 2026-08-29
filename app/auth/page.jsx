"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import RoleSelector from '@/components/auth/RoleSelector';
import {
  Sparkles,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Parse pre-selected role parameter if provided (?role=student | industry | institute)
    const roleParam = searchParams.get('role');
    if (roleParam) {
      const normalized = roleParam.trim().toUpperCase();
      if (['STUDENT', 'INDUSTRY', 'ORGANIZATION', 'INSTITUTE'].includes(normalized)) {
        setSelectedRole(normalized === 'ORGANIZATION' ? 'INDUSTRY' : normalized);
      }
    }
  }, [searchParams]);

  const handleGoogleAuth = async () => {
    if (!selectedRole) {
      setError('Please select a role before continuing.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Pre-OAuth handshake: Send signup intent to register role intent and set secure cookie
      const targetRole = selectedRole === 'INDUSTRY' ? 'INDUSTRY' : selectedRole;
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

      // Trigger OAuth redirect through /profile/complete dispatcher
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
        return 'Student / Learner';
      case 'INDUSTRY':
      case 'ORGANIZATION':
        return 'Industry / Employer';
      case 'INSTITUTE':
        return 'Institute / University';
      default:
        return role;
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-500/5">
      {/* Brand Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
          Welcome to Skill Bridge
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Select your platform role to sign in or create your verified account. Your role determines your dashboard, permissions, and credential verification pathways.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Role Selection Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Step 1: Choose Your Platform Role
          </label>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Role Gating
          </span>
        </div>

        <RoleSelector
          selectedRole={selectedRole}
          onSelectRole={(role) => {
            setSelectedRole(role);
            setError(null);
          }}
          disabled={loading}
          layout="grid"
        />
      </div>

      {/* Role Immutability & Trust Banner */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-emerald-400">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>One Google Account = Exactly One Role</span>
        </div>
        <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
          {selectedRole ? (
            <>
              You are continuing as <strong className="text-slate-200">{getRoleDisplayName(selectedRole)}</strong>. You will be routed to the correct portal after authentication.
            </>
          ) : (
            'Select one of the 3 cards above to enable Google authentication. Your role will be securely bound to your Google account upon sign-in.'
          )}
        </p>
      </div>

      {/* Action / Google OAuth Button */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Step 2: Authenticate with Google
          </span>
          {selectedRole && (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Role Selected: {selectedRole}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={!selectedRole || loading}
          aria-disabled={!selectedRole || loading}
          className={`w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg ${
            !selectedRole
              ? 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              : loading
              ? 'bg-white text-slate-900 opacity-90 cursor-wait'
              : 'bg-white text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-[0.99] shadow-emerald-500/5 hover:shadow-emerald-500/10'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Connecting with Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {selectedRole
                  ? `Continue with Google as ${getRoleDisplayName(selectedRole)}`
                  : 'Select a Role to Continue'}
              </span>
              {selectedRole && <ArrowRight className="w-4 h-4 ml-1 text-slate-600" />}
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-500">
          By continuing, you agree to Skill Bridge&apos;s Terms of Service, Privacy Policy, and Role Governance Rules.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-8">
      <Suspense
        fallback={
          <div className="max-w-3xl w-full mx-auto bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center text-slate-400 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto mb-4" />
            <div className="h-6 w-48 bg-slate-800 rounded mx-auto mb-2" />
            <div className="h-4 w-72 bg-slate-800 rounded mx-auto" />
          </div>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}
