"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Mail, LogOut, AlertCircle, ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function AccountSuspendedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-slate-900/90 backdrop-blur border border-rose-500/30 rounded-3xl p-8 shadow-2xl shadow-rose-500/5 text-center">
        
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10 animate-pulse">
          <ShieldAlert size={32} />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-100">
            Account Access Restricted
          </h1>
          <p className="text-xs text-rose-300 font-mono">
            Status: SUSPENDED / DEACTIVATED
          </p>
        </div>

        {/* Informative Explanation */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed text-left space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-[11px] uppercase">
            <AlertCircle size={14} /> Administrative Notice
          </div>
          <p>
            Your account has been temporarily suspended or deactivated by platform governance compliance officers.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pt-1">
            <li>Failed or fraudulent statutory KYC credentials</li>
            <li>Terms of Service or platform conduct violations</li>
            <li>Administrative hold pending identity verification</li>
          </ul>
        </div>

        {/* Support Appeal Channel */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-slate-300 font-semibold">
            <Mail size={14} className="text-emerald-400" />
            <span>Compliance Support Desk</span>
          </div>
          <p className="text-[11px]">
            To appeal this decision, email{' '}
            <a
              href="mailto:compliance@skillbridge.gov.in"
              className="text-emerald-400 hover:underline font-mono"
            >
              compliance@skillbridge.gov.in
            </a>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            <span>Sign Out and Switch Account</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            <ArrowLeft size={12} /> Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
