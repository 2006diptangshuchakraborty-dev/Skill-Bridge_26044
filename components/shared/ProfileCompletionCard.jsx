"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  calculateProfileCompletion,
  getStudentCompletionDetails,
  getOrgCompletionDetails,
  getInstituteCompletionDetails,
} from '@/lib/onboarding-calc';

/**
 * ProfileCompletionCard Component
 * Displays a 70% threshold progress indicator, color-coded stages,
 * Required vs Optional item checklists with jump links, and gating warning banner.
 *
 * @param {Object} props
 * @param {Object} [props.profile] - User profile object
 * @param {string} [props.role='STUDENT'] - Role (STUDENT, INDUSTRY/ORGANIZATION, INSTITUTE)
 * @param {number} [props.score] - Explicit completion score (optional override)
 * @param {boolean} [props.showGatingBanner=true] - Whether to show the <70% gating warning banner
 * @param {string} [props.onboardingUrl] - Explicit redirect URL for completing profile
 */
export default function ProfileCompletionCard({
  profile = {},
  role = 'STUDENT',
  score,
  showGatingBanner = true,
  onboardingUrl,
}) {
  const [expanded, setExpanded] = useState(false);

  const normalizedRole = String(role || 'STUDENT').toUpperCase();
  const completionScore = score !== undefined ? score : calculateProfileCompletion(normalizedRole, profile);

  // Threshold stages: red < 40%, amber 40-69%, emerald >= 70%
  const isGated = completionScore < 70;
  const isCritical = completionScore < 40;

  const stageColor = isCritical
    ? 'text-rose-400'
    : isGated
    ? 'text-amber-400'
    : 'text-emerald-400';

  const barColor = isCritical
    ? 'bg-rose-500'
    : isGated
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const glowColor = isCritical
    ? 'shadow-rose-500/10'
    : isGated
    ? 'shadow-amber-500/10'
    : 'shadow-emerald-500/10';

  // Target onboarding route
  const defaultOnboardingUrl =
    normalizedRole === 'ORGANIZATION' || normalizedRole === 'INDUSTRY'
      ? '/organization/onboarding'
      : normalizedRole === 'INSTITUTE'
      ? '/institute/onboarding'
      : '/student/onboarding';

  const targetUrl = onboardingUrl || defaultOnboardingUrl;

  // Build checklist based on role
  let requiredItems = [];
  let optionalItems = [];

  if (normalizedRole === 'STUDENT') {
    const details = getStudentCompletionDetails(profile);
    requiredItems = [
      { id: 'headline', label: 'Professional Headline', complete: Boolean(profile?.headline), step: 1 },
      { id: 'bio', label: 'Bio / Summary', complete: Boolean(profile?.bio), step: 1 },
      { id: 'institute', label: 'Institute & Degree Branch', complete: Boolean(profile?.instituteName && profile?.department), step: 2 },
      { id: 'skills', label: 'At least 3 core skills', complete: Array.isArray(profile?.skills) && profile.skills.length >= 3, step: 3 },
      { id: 'projects', label: 'At least 1 project or code repo', complete: Array.isArray(profile?.projects) && profile.projects.length >= 1, step: 4 },
      { id: 'careerPrefs', label: 'Career Preferences', complete: Boolean(profile?.careerPreferences && Object.keys(profile.careerPreferences).length >= 1), step: 7 },
    ];

    optionalItems = [
      { id: 'certifications', label: 'Verified Certifications (10%)', complete: Array.isArray(profile?.certifications) && profile.certifications.length >= 1, step: 5 },
      { id: 'experience', label: 'Internships / Work Experience (10%)', complete: Array.isArray(profile?.experience) && profile.experience.length >= 1, step: 6 },
      { id: 'phone', label: 'Contact Phone Number', complete: Boolean(profile?.phone), step: 1 },
    ];
  } else if (normalizedRole === 'ORGANIZATION' || normalizedRole === 'INDUSTRY') {
    const details = getOrgCompletionDetails(profile);
    requiredItems = [
      { id: 'companyName', label: 'Official Company Name', complete: Boolean(profile?.companyName), step: 1 },
      { id: 'cin', label: 'Registration Number (CIN/LLPIN)', complete: Boolean(profile?.registrationNumber), step: 2 },
      { id: 'gstin', label: 'Tax ID (GSTIN)', complete: Boolean(profile?.taxIdGstin), step: 2 },
      { id: 'phone', label: 'Official Contact Phone', complete: Boolean(profile?.contactPhone), step: 3 },
      { id: 'industry', label: 'Industry Sector & Size', complete: Boolean(profile?.industry && profile?.companySize), step: 4 },
      { id: 'hiring', label: 'Hiring Preferences', complete: Boolean(profile?.hiringPreferences && Object.keys(profile.hiringPreferences).length >= 1), step: 5 },
      { id: 'docs', label: 'Statutory KYC Documents', complete: (Array.isArray(profile?.verificationDocs) && profile.verificationDocs.length >= 1) || (Array.isArray(profile?.documents) && profile.documents.length >= 1), step: 6 },
    ];

    optionalItems = [
      { id: 'website', label: 'Company Website URL', complete: Boolean(profile?.website), step: 1 },
      { id: 'logo', label: 'Brand Logo URL', complete: Boolean(profile?.logoUrl), step: 1 },
      { id: 'primaryContact', label: 'Primary Contact Designation', complete: Boolean(profile?.primaryContactName), step: 3 },
    ];
  } else {
    // Institute
    const details = getInstituteCompletionDetails(profile);
    requiredItems = [
      { id: 'instituteName', label: 'Institute Legal Name', complete: Boolean(profile?.instituteName), step: 1 },
      { id: 'aishe', label: 'AISHE Code / Reg Code', complete: Boolean(profile?.instituteCode), step: 1 },
      { id: 'address', label: 'Campus Physical Address', complete: Boolean(profile?.address && Object.keys(profile.address).length > 0), step: 2 },
      { id: 'departments', label: 'Academic Departments', complete: Array.isArray(profile?.departments) && profile.departments.length >= 1, step: 3 },
      { id: 'tpo', label: 'Placement Cell (TPO) Contact', complete: Boolean(profile?.placementContact && Object.keys(profile.placementContact).length > 0), step: 4 },
      { id: 'docs', label: 'Accreditation Documents', complete: (Array.isArray(profile?.verificationDocs) && profile.verificationDocs.length >= 1) || (Array.isArray(profile?.documents) && profile.documents.length >= 1), step: 5 },
    ];

    optionalItems = [
      { id: 'website', label: 'Official Website URL', complete: Boolean(profile?.website), step: 1 },
      { id: 'phone', label: 'Campus Landline / Mobile', complete: Boolean(profile?.contactPhone), step: 1 },
    ];
  }

  const completedRequiredCount = requiredItems.filter(i => i.complete).length;
  const totalRequiredCount = requiredItems.length;

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl ${glowColor} space-y-4 backdrop-blur`}>
      {/* Header Row: Title + Score Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${stageColor}`} />
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              Profile Completion Status
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {isGated ? (
              <span>Minimum <strong>70%</strong> required to unlock full opportunity access.</span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 inline" /> Profile threshold satisfied (70%+ achieved)
              </span>
            )}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <span className={`text-xl sm:text-2xl font-black font-mono ${stageColor}`}>
            {completionScore}%
          </span>
          <p className="text-[10px] uppercase font-mono text-slate-500">
            {isGated ? 'Gated (<70%)' : 'Unlocked'}
          </p>
        </div>
      </div>

      {/* 70% Threshold Progress Bar with visual threshold notch */}
      <div className="space-y-1.5 pt-1">
        <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
          {/* 70% Target Threshold Indicator Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10 opacity-70"
            style={{ left: '70%' }}
            title="70% Eligibility Threshold"
          />
          {/* Active Fill Bar */}
          <div
            className={`h-full ${barColor} transition-all duration-700 rounded-full`}
            style={{ width: `${Math.min(100, Math.max(0, completionScore))}%` }}
          />
        </div>

        {/* Milestone Scale Labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
          <span>0%</span>
          <span className={completionScore >= 40 ? 'text-amber-400 font-bold' : ''}>40% (Basic)</span>
          <span className={`font-bold ${completionScore >= 70 ? 'text-emerald-400' : 'text-slate-400'}`}>
            70% (Gate Threshold)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Warning Banner if < 70% */}
      {showGatingBanner && isGated && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-200">
              Profile Incomplete ({completionScore}% / 70%)
            </p>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Minimum 70% profile completion is required to browse live vacancy details, take skill assessments, and submit internship or job applications.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats & Checklist Toggle */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Required items completed: <strong className="text-slate-200">{completedRequiredCount} / {totalRequiredCount}</strong>
        </span>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>{expanded ? 'Hide Checklist' : 'View Checklist'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible Checklist */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-slate-800/60 animate-in fade-in duration-200">
          {/* Mandatory Section */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mandatory Steps (Core 70% Requirements)
            </h4>
            <div className="space-y-1.5">
              {requiredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={item.complete ? 'text-slate-300 line-through opacity-80' : 'text-slate-200 font-medium'}>
                      {item.label}
                    </span>
                  </div>

                  {!item.complete && (
                    <Link
                      href={targetUrl}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5"
                    >
                      Fill <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Enhancements Section */}
          {optionalItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Profile Enhancements (To Reach 100%)
              </h4>
              <div className="space-y-1.5">
                {optionalItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/40"
                  >
                    <div className="flex items-center gap-2">
                      {item.complete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                      <span className={item.complete ? 'text-slate-400 line-through' : 'text-slate-300'}>
                        {item.label}
                      </span>
                    </div>

                    {!item.complete && (
                      <Link
                        href={targetUrl}
                        className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                      >
                        Add <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      <div className="pt-2">
        <Link
          href={targetUrl}
          className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md active:scale-[0.99] ${
            isGated
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200'
          }`}
        >
          <span>{isGated ? 'Complete Profile to Unlock Access' : 'Update & Refine Profile'}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
