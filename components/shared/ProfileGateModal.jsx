"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

/**
 * ProfileGateModal Component
 * Interception modal displayed when a student with < 70% profile attempts
 * to apply for an opportunity or perform a gated action.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {number} [props.currentScore=0] - Current profile completion score
 * @param {number} [props.requiredThreshold=70] - Target threshold required to unlock (default 70%)
 * @param {string[]} [props.missingItems=[]] - List of missing mandatory fields/categories
 * @param {string} [props.opportunityTitle] - Title of the opportunity being applied for
 * @param {string} [props.targetUrl='/student/onboarding'] - URL to complete profile
 */
export default function ProfileGateModal({
  isOpen = false,
  onClose,
  currentScore = 0,
  requiredThreshold = 70,
  missingItems = [],
  opportunityTitle,
  targetUrl = '/student/onboarding',
}) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scoreDeficit = Math.max(0, requiredThreshold - currentScore);

  const handleNavigate = () => {
    if (onClose) onClose();
    router.push(targetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-500/10 space-y-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                Platform Gating Rule
              </span>
            </div>
            <h2 id="gate-modal-title" className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
              Profile Completion Required (70%)
            </h2>
            <p className="text-xs text-slate-400">
              {opportunityTitle ? (
                <span>
                  Applications for <strong>&quot;{opportunityTitle}&quot;</strong> are gated.
                </span>
              ) : (
                'Opportunity applications are gated by platform quality standards.'
              )}
            </p>
          </div>
        </div>

        {/* Progress Comparison Widget */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Current Score: <strong className="text-amber-400">{currentScore}%</strong></span>
            <span className="text-slate-400">Required: <strong className="text-emerald-400">{requiredThreshold}%</strong></span>
          </div>

          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            {/* Target 70% line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10"
              style={{ left: `${requiredThreshold}%` }}
            />
            {/* Current Fill */}
            <div
              className="h-full bg-amber-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
            />
          </div>

          <p className="text-[11px] text-amber-300/90 font-medium">
            You need <strong className="text-white">+{scoreDeficit}%</strong> more profile completion to apply.
          </p>
        </div>

        {/* Missing Required Items (if provided) */}
        {missingItems && missingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Wins to Unlock (Missing Items):
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {missingItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rule Explanation Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Why is this required?</strong> Employers evaluate verified competencies, projects, and academic background. A complete profile ensures accurate AI match scoring and high recruiter response rates.
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/3 py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs transition-colors text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleNavigate}
            className="w-full sm:w-2/3 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
          >
            <span>Complete Profile Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
