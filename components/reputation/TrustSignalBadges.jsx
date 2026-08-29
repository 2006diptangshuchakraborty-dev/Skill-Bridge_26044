"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  Award,
  FileCheck,
  Lock,
  BadgeCheck,
  Sparkles,
  School,
  Briefcase,
  UserCheck,
  AlertCircle,
} from "lucide-react";

/**
 * TrustSignalBadges Component
 * Displays Pillar 1 Verification Trust Signals for Student, Industry, and Institute entities.
 * Includes statutory KYC, corporate domain, AISHE code, identity verification, and Trust Tier levels.
 */
export default function TrustSignalBadges({
  trustLevel = "UNVERIFIED",
  signals = [],
  entityRole = "STUDENT",
  compact = false,
  className = "",
}) {
  const role = String(entityRole).toUpperCase();

  // Trust tier styling and metadata
  const trustTiers = {
    GOLD_TRUSTED: {
      label: "Gold Trusted Partner",
      badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/10",
      glowClass: "text-amber-400",
      icon: Sparkles,
      description: "10+ verified platform interactions with >= 4.5/5.0 aggregate reputation rating.",
    },
    VERIFIED_TIER2: {
      label: "Tier 2 Verified Entity",
      badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10",
      glowClass: "text-emerald-400",
      icon: ShieldCheck,
      description: "5+ verified reviews with full statutory KYC and identity authentication.",
    },
    VERIFIED_TIER1: {
      label: "Tier 1 Verified",
      badgeClass: "bg-teal-950/80 text-teal-300 border-teal-600/50",
      glowClass: "text-teal-400",
      icon: BadgeCheck,
      description: "Verified interaction history with validated identity or domain credentials.",
    },
    UNVERIFIED: {
      label: "Standard Unverified",
      badgeClass: "bg-slate-900 text-slate-400 border-slate-800",
      glowClass: "text-slate-500",
      icon: Lock,
      description: "Awaiting platform interaction verification and credential validation.",
    },
  };

  const currentTier = trustTiers[trustLevel] || trustTiers.UNVERIFIED;
  const TierIcon = currentTier.icon;

  // Default signal matrix based on role if none provided
  const resolvedSignals =
    signals && signals.length > 0
      ? signals
      : role === "STUDENT"
      ? [
          {
            id: "id_ver",
            title: "Identity Verified",
            description: "Aadhaar / Government ID Authenticated",
            icon: UserCheck,
            verified: true,
            color: "text-emerald-400",
          },
          {
            id: "inst_enroll",
            title: "Institute Enrolled",
            description: "AISHE-Accredited Campus Roster Verified",
            icon: School,
            verified: true,
            color: "text-purple-400",
          },
          {
            id: "skill_test",
            title: "Skill Assessment Certified",
            description: "Objective Proctored Test Benchmark Completed",
            icon: Award,
            verified: true,
            color: "text-teal-400",
          },
        ]
      : role === "INDUSTRY"
      ? [
          {
            id: "cin_gstin",
            title: "Statutory KYC Approved",
            description: "MCA CIN & GSTIN Validated via Registry",
            icon: FileCheck,
            verified: true,
            color: "text-emerald-400",
          },
          {
            id: "corp_domain",
            title: "Corporate Domain Verified",
            description: "Enterprise DNS & Email Ownership Authenticated",
            icon: Building2,
            verified: true,
            color: "text-blue-400",
          },
          {
            id: "opp_auth",
            title: "Opportunity Host Verified",
            description: "Active Verified Internship & Job Provider",
            icon: Briefcase,
            verified: true,
            color: "text-teal-400",
          },
        ]
      : [
          {
            id: "aishe_auth",
            title: "AISHE Code Validated",
            description: "Ministry of Education Campus Registry Verified",
            icon: School,
            verified: true,
            color: "text-purple-400",
          },
          {
            id: "naac_nba",
            title: "NAAC / NBA Accredited",
            description: "National Academic Quality Accreditation Approved",
            icon: Award,
            verified: true,
            color: "text-emerald-400",
          },
          {
            id: "tpo_ver",
            title: "TPO Directorate Verified",
            description: "Training & Placement Cell Coordinator Authenticated",
            icon: UserCheck,
            verified: true,
            color: "text-blue-400",
          },
        ];

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentTier.badgeClass}`}
          title={currentTier.description}
        >
          <TierIcon size={14} className={currentTier.glowClass} />
          {currentTier.label}
        </span>

        {resolvedSignals.map((s, idx) => {
          const SIcon = s.icon || CheckCircle2;
          return (
            <span
              key={s.id || idx}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                s.verified !== false
                  ? "bg-slate-900/90 text-slate-200 border-slate-700/80"
                  : "bg-slate-950 text-slate-500 border-slate-800"
              }`}
              title={s.description || s.title}
            >
              <SIcon size={12} className={s.verified !== false ? s.color || "text-emerald-400" : "text-slate-500"} />
              {s.title}
              {s.verified !== false && <CheckCircle2 size={10} className="text-emerald-400" />}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tier Header Capsule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${currentTier.badgeClass}`}>
            <TierIcon size={20} className={currentTier.glowClass} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{currentTier.label}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                Pillar 1: Verification
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{currentTier.description}</p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-500 self-start sm:self-center">
          Status:{" "}
          <span className="text-emerald-400 font-semibold">
            {trustLevel === "UNVERIFIED" ? "Pending Verification" : "Cryptographically Verified"}
          </span>
        </div>
      </div>

      {/* Verification Signal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {resolvedSignals.map((signal, idx) => {
          const SIcon = signal.icon || CheckCircle2;
          const isVer = signal.verified !== false;
          return (
            <div
              key={signal.id || idx}
              className={`p-3.5 rounded-xl border transition-all ${
                isVer
                  ? "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  : "bg-slate-950/40 border-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isVer ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-600"
                    }`}
                  >
                    <SIcon size={16} className={isVer ? signal.color || "text-emerald-400" : "text-slate-600"} />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{signal.title}</span>
                </div>
                {isVer ? (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{signal.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
