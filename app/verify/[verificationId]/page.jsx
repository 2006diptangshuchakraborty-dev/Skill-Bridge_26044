'use client';

/**
 * Skill Bridge Platform - Public Skill Verification Page
 * File: app/verify/[verificationId]/page.jsx
 */

import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ShieldCheck, Clock, ExternalLink, AlertTriangle } from 'lucide-react';

export default function PublicVerificationPage({ params }) {
  const verificationId = params?.verificationId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVerification() {
      try {
        const res = await fetch(`/api/verify/${verificationId}`);
        const result = await res.json();

        if (result.success) {
          setData(result.verification);
        } else {
          setError(result.error || 'Verification ID not found');
        }
      } catch (err) {
        setError('Failed to load verification record');
      } finally {
        setLoading(false);
      }
    }

    if (verificationId) {
      fetchVerification();
    }
  }, [verificationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium">Validating Skill Verification Credentials...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-200">Verification Record Not Found</h2>
          <p className="text-slate-400 text-sm">{error || 'The requested verification certificate ID is invalid or has expired.'}</p>
          <div className="pt-2">
            <a href="/" className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors">
              Return to Skill Bridge
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-[#0d1322] to-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Top Decorative Glow Banner */}
        <div className="h-2 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Official Verification Certificate</span>
                <h1 className="text-xl font-bold text-white tracking-tight">Skill Bridge Platform</h1>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified
              </span>
            </div>
          </div>

          {/* Badge Display Area */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center space-y-4 relative">
            <div className="inline-block p-4 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-500/30">
              <Award className="w-12 h-12 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white">{data.skillName}</h2>
              <p className="text-slate-400 text-sm mt-1">Verified Proficiency Level: <span className="font-semibold text-cyan-300">{data.level}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 text-left">
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                <span className="text-xs text-slate-400 block">Overall Score</span>
                <span className="text-lg font-bold text-white">{data.overallScore} <span className="text-xs font-normal text-slate-400">/ 100</span></span>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                <span className="text-xs text-slate-400 block">Verification Confidence</span>
                <span className="text-lg font-bold text-emerald-400">{data.confidence || 'High'}</span>
              </div>
            </div>
          </div>

          {/* Dimension Breakdown */}
          {data.breakdown && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Dimension Scores</h3>
              <div className="space-y-2">
                {Object.entries(data.breakdown).map(([dim, score]) => (
                  <div key={dim} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{dim}</span>
                      <span className="text-cyan-400 font-semibold">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Details */}
          <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Verification ID:</span>
              <span className="font-mono text-slate-200">{data.verificationId}</span>
            </div>
            <div className="flex justify-between">
              <span>Issued On:</span>
              <span className="text-slate-200">{new Date(data.verifiedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Integrity Score:</span>
              <span className="text-emerald-400 font-medium">{data.integrityScore} / 100</span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 text-center text-xs text-slate-500">
            This verification record is cryptographically signed and stored in the Skill Bridge database.
          </div>
        </div>
      </div>
    </div>
  );
}
