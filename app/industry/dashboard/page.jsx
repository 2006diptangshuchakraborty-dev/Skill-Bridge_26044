"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Search,
  Filter,
  Award,
  Clock,
  TrendingUp,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import { industryData } from "@/lib/dummy-data";
import { calculateOrganizationCompletion } from "@/lib/onboarding-calc";
import { authClient } from "@/lib/auth-client";

export default function IndustryDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState(industryData.profile);
  const [kpis, setKpis] = useState(industryData.kpiStats);
  const [opportunities, setOpportunities] = useState(industryData.publishedJobs);
  const [candidates, setCandidates] = useState(industryData.talentSearchCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIndustryData() {
      try {
        setLoading(true);

        // Fetch session & enforce role guard
        const sessionRes = await authClient.getSession().catch(() => null);
        const user = sessionRes?.data?.user;

        if (!user) {
          router.replace("/auth?role=INDUSTRY&redirect=/industry/dashboard");
          return;
        }

        const userRole = String(user.role || "").toUpperCase();
        if (userRole !== "INDUSTRY" && userRole !== "ORGANIZATION" && userRole !== "ADMIN") {
          const redirectTarget = userRole === "INSTITUTE" ? "/institute/dashboard" : "/student/dashboard";
          router.replace(redirectTarget);
          return;
        }

        setAuthorized(true);

        // Fetch live profile from /api/profile/setup
        const profileRes = await fetch("/api/profile/setup").catch(() => null);
        if (profileRes && profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile && (profileData.role === "INDUSTRY" || profileData.role === "ORGANIZATION")) {
            setProfile((prev) => ({
              ...prev,
              companyName: profileData.user?.name || profileData.profile.companyName || prev.companyName,
              registrationNumber: profileData.profile.registrationNumber || prev.registrationNumber,
              taxIdGstin: profileData.profile.taxIdGstin || prev.taxIdGstin,
              industry: profileData.profile.industry || prev.industry,
              companySize: profileData.profile.companySize || prev.companySize,
              contactEmail: profileData.user?.email || profileData.profile.officialEmail || prev.contactEmail,
              contactPhone: profileData.profile.contactPhone || prev.contactPhone,
              recruiterName: profileData.profile.primaryContactName || prev.recruiterName,
              kycStatus: profileData.profile.verificationStatus || prev.kycStatus,
              profileCompletion: profileData.profileCompletion || calculateOrganizationCompletion(profileData.profile) || prev.profileCompletion,
            }));
          }
        }

        // Fetch live opportunities if available
        const oppRes = await fetch("/api/opportunities").catch(() => null);
        if (oppRes && oppRes.ok) {
          const oppData = await oppRes.json();
          if (Array.isArray(oppData.opportunities) && oppData.opportunities.length > 0) {
            setOpportunities(oppData.opportunities);
          }
        }
      } catch (err) {
        console.warn("Error loading industry console data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadIndustryData();
  }, [router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading Industry Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      
      {/* -------------------------------------------------------------------- */}
      {/* TOP HEADER / HERO BANNER                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              {profile.companyName ? profile.companyName.charAt(0) : "I"}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-bold">
                  INDUSTRY CONSOLE
                </span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  profile.kycStatus === "APPROVED" || profile.verified
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}>
                  KYC: {profile.kycStatus || "APPROVED"}
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  CIN: {profile.registrationNumber || "U72200KA2021PTC145892"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                {profile.companyName || "Apex Analytics Corporation"}
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl">
                {profile.industry || "Big Data, Cloud Analytics & Business Intelligence"} • {profile.companySize || "250 - 500 Employees"}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Building2 size={13} className="text-blue-400" />
                <span>Lead Recruiter: {profile.recruiterName || "Vikram Malhotra"} ({profile.contactEmail})</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
            <Link
              href="/recruiter/jobs/create"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus size={16} /> Post Opportunity (Priority Gate)
            </Link>

            <Link
              href="/profile/setup"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 text-center transition"
            >
              Update Organization Profile
            </Link>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* KPI METRICS GRID                                                     */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Briefcase size={13} className="text-blue-400" /> Active Postings
          </span>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {opportunities.length}
          </div>
          <p className="text-[11px] text-blue-400 font-medium">100% High-Priority Gate Enabled</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Users size={13} className="text-teal-400" /> Total Talent Pool
          </span>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {kpis.totalApplicants || 142}
          </div>
          <p className="text-[11px] text-teal-400 font-medium">
            {kpis.gatePassedApplicants || 68} Verified Candidates Filtered In
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-emerald-400" /> Zero Noise Ratio
          </span>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {kpis.zeroNoiseRate?.split("%")[0] || "52"}%
          </div>
          <p className="text-[11px] text-slate-400">Irrelevant Applications Eliminated</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Clock size={13} className="text-purple-400" /> Time to Shortlist
          </span>
          <div className="text-3xl font-black text-purple-300 font-mono">1.2d</div>
          <p className="text-[11px] text-slate-400">vs 14d Industry Benchmark</p>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* PUBLISHED OPPORTUNITIES & PRIORITY GATING                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="text-blue-400" /> Published Opportunities & Priority Requirements
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated gatekeeper evaluates candidates: 100% High Priority match required for application entry.
            </p>
          </div>

          <Link
            href="/recruiter/jobs/create"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Create New Role</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      {opp.type || "Internship"}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                      {opp.stipend || "₹35,000 / month"}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      {opp.status || "ACTIVE"}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-100">{opp.title}</h3>
                  <p className="text-xs text-slate-400">
                    {opp.department || "Enterprise Analytics"} • {opp.location || "Bengaluru (Hybrid)"} • Deadline: {opp.deadline || "2026-09-30"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right pr-2">
                    <div className="text-lg font-black font-mono text-emerald-400">
                      {opp.eligibleCount || opp.applicantsCount || 18}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Gate Qualified</div>
                  </div>

                  <Link
                    href={`/recruiter/candidates?opportunityId=${opp.id}`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Users size={14} /> View Funnel
                  </Link>
                </div>
              </div>

              {/* Priority skill breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/20 space-y-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> High Priority Mandatory Skills (100% Gate)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(opp.mandatorySkills || opp.requiredSkills || ["Python", "SQL", "Data Analysis"]).map((s, i) => (
                      <span key={i} className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded text-[11px] font-mono border border-emerald-500/30">
                        {typeof s === "string" ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> Low Priority Preferred Skills (Weighted Bonus)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(opp.preferredSkills || ["Power BI", "Tableau", "Excel"]).map((s, i) => (
                      <span key={i} className="bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded text-[11px] font-mono border border-amber-500/30">
                        {typeof s === "string" ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* CANDIDATE TALENT POOL & APPLICANT FUNNEL                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="text-teal-400" /> Talent Search & Candidate Funnel
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pre-vetted candidates with 100% High-Priority gate clearance and verified skill credentials.
            </p>
          </div>

          <Link
            href="/recruiter/candidates"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Full Candidate Search</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow">
                    {cand.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{cand.name}</h3>
                    <p className="text-xs text-slate-400">{cand.institute} • CGPA {cand.cgpa}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black font-mono text-emerald-400">
                    {cand.compositeScore}% Match
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">100% Mandatory</div>
                </div>
              </div>

              {/* Skills and Verification Levels */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400">Verified Evidence</span>
                <div className="flex flex-wrap gap-1.5">
                  {cand.topSkills?.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1"
                    >
                      <span>{sk.name}</span>
                      <span className="text-teal-400 text-[9px] font-bold">L{sk.evidenceLevel}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  Status: <strong className="text-slate-200">{cand.applicationStatus}</strong>
                </span>

                <Link
                  href={`/recruiter/candidates?candidateId=${cand.id}`}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition"
                >
                  Review Candidate
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
