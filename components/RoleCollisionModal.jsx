"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

/**
 * RoleCollisionModal Component
 *
 * Displays when a returning user attempts to sign up or switch to a different role.
 * Enforces the platform invariant: "One Google Account = One Skill Bridge Account = One Role".
 */
export default function RoleCollisionModal({
  isOpen = true,
  existingRole = 'STUDENT',
  attemptedRole = 'ORGANIZATION',
  onClose,
}) {
  const router = useRouter();

  if (!isOpen) return null;

  const roleDisplayNames = {
    STUDENT: 'Student & Job Seeker',
    ORGANIZATION: 'Organization & Employer',
    ADMIN: 'System Administrator',
  };

  const existingTitle = roleDisplayNames[existingRole] || existingRole;
  const targetDashboard = `/${existingRole.toLowerCase()}/dashboard`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100">
              Role Collision Detected
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Account Role Immutability Policy
            </p>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            This Google account is already registered as a{' '}
            <strong className="text-emerald-400 font-bold">{existingTitle}</strong>.
          </p>
          
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Existing Role:</span>
              <strong className="text-emerald-400 font-bold">{existingRole}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Attempted Role:</span>
              <strong className="text-amber-400 font-bold">{attemptedRole}</strong>
            </div>
          </div>

          <p className="text-slate-400 text-[11px]">
            Skill Bridge strictly enforces <strong className="text-slate-200">&ldquo;One Google Account = One Skill Bridge Role&rdquo;</strong> to maintain platform integrity, verified profiles, and statutory compliance.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => router.push(targetDashboard)}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            <span>Continue to {existingRole} Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose || (() => router.push('/login'))}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Sign in with a Different Google Account
          </button>
        </div>
      </div>
    </div>
  );
}
