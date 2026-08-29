"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  School,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target,
  BarChart3,
  BookOpen,
  Award,
  ShieldCheck,
  Check,
  X,
  FileText,
  Sliders,
  ExternalLink,
  Users,
  Briefcase,
  Layers,
  ChevronRight,
  Activity,
  UserCheck,
  Search,
  PlusCircle,
  FileCheck,
  Zap,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import EvidenceBadge from "@/components/shared/EvidenceBadge";
import ProfileCompletionCard from "@/components/shared/ProfileCompletionCard";
import PendingRatingsWidget from "@/components/reputation/PendingRatingsWidget";
import {
  studentData,
  industryData,
  instituteData,
  adminData,
} from "@/lib/dummy-data";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const user = session?.user || null;
  const rawRole = user?.role ? String(user.role).toUpperCase() : "";

  // Active dashboard view (defaults to session user role, but allows switching for demonstration)
  const [selectedRole, setSelectedRole] = useState("STUDENT");
  const [filterJobCategory, setFilterJobCategory] = useState("ALL");
  const [kycActionNotice, setKycActionNotice] = useState(null);

  useEffect(() => {
    if (rawRole === "ADMIN") {
      setSelectedRole("ADMIN");
    } else if (rawRole === "ORGANIZATION" || rawRole === "INDUSTRY") {
      setSelectedRole("INDUSTRY");
    } else if (rawRole === "INSTITUTE") {
      setSelectedRole("INSTITUTE");
    } else if (rawRole === "STUDENT") {
      setSelectedRole("STUDENT");
    }
  }, [rawRole]);

  // Handle KYC queue actions in Admin view
  const handleKycAction = (id, action) => {
    setKycActionNotice(`KYC Request #${id} marked as ${action}. Audit log recorded.`);
    setTimeout(() => setKycActionNotice(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* ============================================================ */}
      {/* TOP ROLE SWITCHER & SESSION STATUS BAR */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100">Authenticated Central Dashboard</h1>
              {user ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Active User: {user.name || user.email}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Guest Preview Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Role-partitioned continuous intelligence portal for Skill Mapping, Verification, and Placement
            </p>
          </div>
        </div>

        {/* Role Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedRole("STUDENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedRole === "STUDENT"
                ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <GraduationCap size={15} />
            <span>Student</span>
          </button>

          <button
            onClick={() => setSelectedRole("INDUSTRY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedRole === "INDUSTRY"
                ? "bg-blue-500 text-slate-950 shadow-sm shadow-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Building2 size={15} />
            <span>Industry</span>
          </button>

          <button
            onClick={() => setSelectedRole("INSTITUTE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedRole === "INSTITUTE"
                ? "bg-purple-500 text-slate-950 shadow-sm shadow-purple-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <School size={15} />
            <span>Institute</span>
          </button>

          
        </div>
      </div>

      {/* Unauthenticated notice banner if user isn't logged in */}
      {!isPending && !user && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>You are viewing the dashboard in demo mode. Sign in to save your personal skills, applications, and verified credentials.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/20 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. STUDENT VIEW */}
      {/* ============================================================ */}
      {selectedRole === "STUDENT" && (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-start sm:items-center gap-4 relative z-10">
              <img
                src={user?.image || studentData.profile.avatar}
                alt={user?.name || studentData.profile.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-100">{user?.name || studentData.profile.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Gatekeeper Verified ✓
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {studentData.profile.department} • {studentData.profile.instituteName} • CGPA {studentData.profile.cgpa}
                </p>
                <p className="text-xs text-slate-300 italic pt-0.5">
                  &ldquo;{studentData.profile.headline}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 relative z-10">
              <Link
                href="/student/opportunities"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Search size={14} />
                <span>Explore Opportunities</span>
              </Link>
              <Link
                href="/student/profile"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-950/80 hover:bg-slate-900 transition-colors"
              >
                Edit Profile
              </Link>

            </div>
          </div>

          {/* Actionable Pending Ratings & Reviews Widget */}
          <PendingRatingsWidget role="STUDENT" />

          {/* Profile Completion & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 70% Gating Progress Card */}
            <div className="lg:col-span-1">
              <ProfileCompletionCard
                role="STUDENT"
                score={studentData.profile.profileCompletion}
                profile={studentData.profile}
                onboardingUrl="/student/profile"
              />
            </div>

            {/* Quick Metrics Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Verified Skills</span>
                <div className="text-2xl font-black text-slate-100 mt-2">{studentData.skillMatrix.length}</div>
                <span className="text-[11px] text-emerald-400 font-mono mt-1">4 at Level &ge; 3</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Eligible Roles</span>
                <div className="text-2xl font-black text-emerald-400 mt-2">
                  {studentData.recommendedOpportunities.filter((o) => o.isEligible).length}
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-1">100% Gate Passed</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Active Applications</span>
                <div className="text-2xl font-black text-teal-400 mt-2">{studentData.applicationHistory.length}</div>
                <span className="text-[11px] text-teal-400 font-mono mt-1">1 Shortlisted, 1 Interview</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Upskilling Paths</span>
                <div className="text-2xl font-black text-amber-400 mt-2">{studentData.gapUpskilling.length}</div>
                <span className="text-[11px] text-amber-400 font-mono mt-1">3 Workshops Ready</span>
              </div>
            </div>
          </div>

          {/* Recommended Opportunities List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Target size={18} className="text-emerald-400" />
                  Priority-Matched Opportunities
                </h3>
                <p className="text-xs text-slate-400">
                  Opportunities analyzed against Mandatory 100% High-Priority Skill Gate
                </p>
              </div>
              <Link
                href="/student/opportunities"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>View All Roles</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              {studentData.recommendedOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-100">{opp.title}</h4>
                        <span className="text-xs text-slate-400">at {opp.companyName}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                          {opp.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {opp.location} • Stipend: <strong className="text-emerald-400">{opp.stipend}</strong> • Duration: {opp.duration}
                      </p>
                    </div>

                    {/* Dual Match Meter Pills */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          Mandatory: {opp.mandatoryMatch}%
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Preferred: {opp.preferredMatch}%
                        </div>
                      </div>

                      {opp.isEligible ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 size={13} /> ELIGIBLE
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <XCircle size={13} /> NOT ELIGIBLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-900">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                        Mandatory Requirements :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.highPrioritySkills.map((sk, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${
                              sk.matched
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800"
                                : "bg-rose-950/40 text-rose-300 border-rose-800"
                            }`}
                          >
                            {sk.matched ? <Check size={11} /> : <X size={11} />}
                            {sk.name} (Req L{sk.requiredProficiency})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold">
                        Preferred Requirements (Ranking Boost):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.preferredSkills.map((sk, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${
                              sk.matched
                                ? "bg-amber-950/40 text-amber-300 border-amber-800"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            {sk.name} (Req L{sk.requiredProficiency})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                    <span className="text-slate-400">
                      Composite Rank Score: <strong className="text-slate-200">{opp.compositeScore}%</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/student/opportunities/${opp.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-900 transition-colors"
                      >
                        View Full Requirements
                      </Link>
                      {opp.isEligible ? (
                        <Link
                          href={`/student/opportunities/${opp.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
                        >
                          Apply Now
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-900 border border-slate-800 cursor-not-allowed">
                          Mandatory Gap Blocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Matrix with 5-Level Badges & Applications Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5-Level Evidence Skill Matrix */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-teal-400" />
                  5-Level Verified Skill Matrix
                </h3>
                <Link
                  href="/student/profile"
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                >
                  Manage Evidence
                </Link>
              </div>

              <div className="space-y-2.5">
                {studentData.skillMatrix.map((sk) => (
                  <div
                    key={sk.name}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200 text-xs">{sk.name}</div>
                      <div className="text-[10px] text-slate-400">{sk.category} • {sk.proficiencyLabel}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EvidenceBadge level={sk.evidenceLevel} showLabel={true} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6-Stage Application History Tracker */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-400" />
                  Application Tracker
                </h3>
                <Link
                  href="/student/applications"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  View All ({studentData.applicationHistory.length})
                </Link>
              </div>

              <div className="space-y-3">
                {studentData.applicationHistory.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-100 text-xs">{app.roleTitle}</div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          app.status === "SELECTED"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : app.status === "INTERVIEW" || app.status === "SHORTLISTED"
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                            : app.status === "UNDER_REVIEW" || app.status === "APPLIED"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{app.companyName} • Applied {app.appliedDate}</span>
                      <span className="font-mono text-emerald-400">{app.compositeScore}% Match</span>
                    </div>
                    <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                      <strong>Next:</strong> {app.nextStep}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gap Upskilling Recommendations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                Actionable Skill Gap Upskilling Paths
              </h3>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                Automated Recommendations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studentData.gapUpskilling.map((gap) => (
                <div
                  key={gap.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-xs">{gap.skillName}</span>
                      <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        {gap.targetProficiency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{gap.recommendedAction}</p>
                    <div className="text-[11px] text-emerald-400 font-medium">Impact: {gap.impact}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{gap.duration}</span>
                    <Link
                      href={gap.actionUrl}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>Enroll / Take Test</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. INDUSTRY / RECRUITER VIEW */}
      {/* ============================================================ */}
      {selectedRole === "INDUSTRY" && (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
          {/* Recruiter Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-100">{industryData.profile.companyName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Verified Employer ✓
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {industryData.profile.sector} • CIN: {industryData.profile.registrationNumber} • Recruiter: {industryData.profile.recruiterName}
              </p>
              <p className="text-xs text-slate-300">
                Gatekeeper Active: <strong className="text-emerald-400">100% Mandatory Skill Clearance Enforced</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/recruiter/jobs/create"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-500 text-slate-950 hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
              >
                <PlusCircle size={15} />
                <span>Post New Opportunity</span>
              </Link>
              <Link
                href="/recruiter/compare"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-950/80 hover:bg-slate-900 transition-colors"
              >
                Candidate Comparison
              </Link>
            </div>
          </div>

          {/* Actionable Pending Ratings & Reviews Widget */}
          <PendingRatingsWidget role="INDUSTRY" />

          {/* Industry KPI Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Published Roles</span>
              <div className="text-2xl font-black text-slate-100 mt-2">{industryData.kpiStats.activeRoles}</div>
              <span className="text-[11px] text-slate-400 font-mono mt-1">4 Active Live</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Total Applicants</span>
              <div className="text-2xl font-black text-blue-400 mt-2">{industryData.kpiStats.totalApplicants}</div>
              <span className="text-[11px] text-emerald-400 font-mono mt-1">
                {industryData.kpiStats.gatePassedApplicants} Gate Passed (100%)
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Noise Eliminated</span>
              <div className="text-2xl font-black text-emerald-400 mt-2">{industryData.kpiStats.gateFilteredOut}</div>
              <span className="text-[11px] text-emerald-300 font-mono mt-1">52% Ineligible Filtered</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Pending L5 Evals</span>
              <div className="text-2xl font-black text-amber-400 mt-2">{industryData.kpiStats.pendingEvaluations}</div>
              <span className="text-[11px] text-amber-400 font-mono mt-1">Post-Internship</span>
            </div>
          </div>

          {/* Published Opportunities & Talent Pool */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-400" />
                Live Published Opportunities & Gatekeeper Funnel
              </h3>
              <Link href="/recruiter/dashboard" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Manage All Roles
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-2.5 px-3">Role Title</th>
                    <th className="py-2.5 px-3">Location & Type</th>
                    <th className="py-2.5 px-3 text-center">Total Applicants</th>
                    <th className="py-2.5 px-3 text-center">100% Eligible</th>
                    <th className="py-2.5 px-3 text-center">Noise Filtered</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {industryData.publishedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100">{job.title}</div>
                        <div className="text-[10px] text-slate-400">{job.department} • {job.stipend}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{job.location} ({job.type})</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">{job.applicantsCount}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5">
                        {job.eligibleCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-rose-400 bg-rose-500/5">
                        {job.filteredOutCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/recruiter/candidates"
                          className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
                        >
                          Review ({job.eligibleCount})
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Shortlisted Candidates & Post-Internship L5 Evaluations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Candidates */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-400" />
                  Top Gate-Cleared Candidates
                </h3>
                <Link href="/recruiter/candidates" className="text-xs text-emerald-400 font-semibold">
                  Candidate Directory
                </Link>
              </div>

              <div className="space-y-3">
                {industryData.talentSearchCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={cand.avatar}
                          alt={cand.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-100 text-xs">{cand.name}</div>
                          <div className="text-[10px] text-slate-400">{cand.institute} • CGPA {cand.cgpa}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {cand.compositeScore}% Match
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cand.topSkills.map((sk) => (
                        <span key={sk.name} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          <span>{sk.name}</span>
                          <EvidenceBadge level={sk.evidenceLevel} showLabel={false} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-Internship L5 Evaluations */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award size={18} className="text-amber-400" />
                  Pending Post-Internship L5 Endorsements
                </h3>
                <Link href="/recruiter/evaluate" className="text-xs text-amber-400 font-semibold">
                  Evaluation Console
                </Link>
              </div>

              <div className="space-y-3">
                {industryData.postInternshipEvaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-100 text-xs">{ev.studentName}</div>
                        <div className="text-[10px] text-slate-400">{ev.roleTitle} • {ev.period}</div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Rating: {ev.performanceRating} / 5.0
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                      &ldquo;{ev.feedback}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">
                        Proposed: <strong className="text-emerald-400">Level 5 Industry Verified</strong>
                      </span>
                      <Link
                        href="/recruiter/evaluate"
                        className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors shadow-sm"
                      >
                        Sign & Issue L5 Badge
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. INSTITUTE / FACULTY VIEW */}
      {/* ============================================================ */}
      {selectedRole === "INSTITUTE" && (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
          {/* Institute Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-100">{instituteData.profile.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  NIRF Rank #{instituteData.profile.nirfRank}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AISHE Code: {instituteData.profile.aisheCode} • {instituteData.profile.accreditation} • Head: {instituteData.profile.hodName}
              </p>
              <p className="text-xs text-slate-300">
                Real-time Curriculum Alignment & Privacy-Preserving k-Anonymity Analytics (k &ge; 5)
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/institute/training"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-500 text-slate-950 hover:bg-purple-400 transition-colors shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
              >
                <PlusCircle size={15} />
                <span>Launch Corporate Workshop</span>
              </Link>
              <Link
                href="/institute/skill-gaps"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-950/80 hover:bg-slate-900 transition-colors"
              >
                Skill Gap Alerts
              </Link>
            </div>
          </div>

          {/* Actionable Pending Ratings & Reviews Widget */}
          <PendingRatingsWidget role="INSTITUTE" />

          {/* Institute Macro Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Total Students</span>
              <div className="text-2xl font-black text-slate-100 mt-2">{instituteData.profile.totalStudents}</div>
              <span className="text-[11px] text-slate-400 font-mono mt-1">{instituteData.profile.facultyCount} Faculty</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Placement Rate</span>
              <div className="text-2xl font-black text-emerald-400 mt-2">{instituteData.placementStats.overallPlacementRate}</div>
              <span className="text-[11px] text-emerald-300 font-mono mt-1">Highest: {instituteData.placementStats.highestPackage}</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Active Gap Alerts</span>
              <div className="text-2xl font-black text-purple-400 mt-2">{instituteData.skillGapAlerts.length}</div>
              <span className="text-[11px] text-purple-300 font-mono mt-1">k-Anonymity Verified</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Active Bootcamps</span>
              <div className="text-2xl font-black text-teal-400 mt-2">{instituteData.activeWorkshops.length}</div>
              <span className="text-[11px] text-teal-300 font-mono mt-1">170 Enrolled</span>
            </div>
          </div>

          {/* Department Readiness Benchmarks */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 size={18} className="text-purple-400" />
                Department Readiness Benchmarks & Placement Health
              </h3>
              <span className="text-xs font-mono text-purple-400">Real-time Curriculum Alignment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instituteData.departmentReadiness.map((dept) => (
                <div
                  key={dept.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs">{dept.name}</h4>
                      <span className="text-[10px] text-slate-400">{dept.studentCount} Students • {dept.facultyCount} Faculty</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {dept.readinessScore}% Ready
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${dept.readinessScore}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>Placement: <strong className="text-slate-200">{dept.placementRate}</strong> (Avg {dept.averagePackage})</div>
                    <div>Strength: <span className="text-slate-300">{dept.topStrength}</span></div>
                    <div className="text-amber-400">Target Gap: {dept.primaryGapSkill}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top k-Anonymity Gap Alerts & Active Workshops */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gap Alerts */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  Top Privacy-Preserving Skill Gap Alerts
                </h3>
                <Link href="/institute/skill-gaps" className="text-xs text-amber-400 font-semibold">
                  View All Alerts
                </Link>
              </div>

              <div className="space-y-3">
                {instituteData.skillGapAlerts.slice(0, 3).map((al) => (
                  <div
                    key={al.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs">{al.skillName}</span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                        {al.affectedStudentCount} Students (k &ge; 5)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{al.message}</p>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">
                        Action: <strong className="text-purple-300">{al.suggestedAction}</strong>
                      </span>
                      <Link
                        href="/institute/training"
                        className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                      >
                        <span>Launch</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corporate Training Workshops */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen size={18} className="text-teal-400" />
                  Active Corporate Upskilling Bootcamps
                </h3>
                <Link href="/institute/training" className="text-xs text-teal-400 font-semibold">
                  Program Catalog
                </Link>
              </div>

              <div className="space-y-3">
                {instituteData.activeWorkshops.map((ws) => (
                  <div
                    key={ws.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-100 text-xs">{ws.title}</div>
                        <div className="text-[10px] text-slate-400">{ws.targetDepartment} • {ws.duration}</div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          ws.status === "IN_PROGRESS"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {ws.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Instructor: <span className="text-slate-300">{ws.instructor}</span>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Enrollment Progress</span>
                        <span>{ws.enrolledCount} / {ws.maxCapacity} seats</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-teal-400 h-full rounded-full"
                          style={{ width: `${(ws.enrolledCount / ws.maxCapacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ADMIN VIEW */}
      {/* ============================================================ */}
      {selectedRole === "ADMIN" && (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-100">Platform Governance & Forensic Console</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Super Admin Root
                </span>
              </div>
              <p className="text-xs text-slate-400">
                System Status: <strong className="text-emerald-400">All Engines Active</strong> • Rule 01 Gatekeeper Engine • Levels 1–5 Verification • Immutable Audit Trail
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/admin/verifications"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Open KYC Queue
              </Link>
              <Link
                href="/admin/audit-logs"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-950/80 hover:bg-slate-900 transition-colors"
              >
                Audit Trail
              </Link>
            </div>
          </div>

          {/* Action notification toast */}
          {kycActionNotice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in-50">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{kycActionNotice}</span>
            </div>
          )}

          {/* Platform Macro KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Registered Students</span>
              <div className="text-2xl font-black text-slate-100 mt-2">{adminData.platformStats.totalStudents}</div>
              <span className="text-[11px] text-emerald-400 font-mono mt-1">91.2% Placement Rate</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Verified Employers</span>
              <div className="text-2xl font-black text-blue-400 mt-2">{adminData.platformStats.verifiedOrganizations}</div>
              <span className="text-[11px] text-blue-300 font-mono mt-1">315 Live Roles</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Accredited Institutes</span>
              <div className="text-2xl font-black text-purple-400 mt-2">{adminData.platformStats.accreditedInstitutes}</div>
              <span className="text-[11px] text-purple-300 font-mono mt-1">AISHE Validated</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Skill Verifications</span>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {adminData.platformStats.skillVerificationsIssued}
              </div>
              <span className="text-[11px] text-emerald-300 font-mono mt-1">99.8% Screen Accuracy</span>
            </div>
          </div>

          {/* KYC Verification Queue Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileCheck size={18} className="text-amber-400" />
                Statutory KYC Verification Queue
              </h3>
              <Link href="/admin/verifications" className="text-xs text-amber-400 font-semibold">
                View Full Queue
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-2.5 px-3">Entity Name</th>
                    <th className="py-2.5 px-3">Type & Sector</th>
                    <th className="py-2.5 px-3">Registration / Tax ID</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">KYC Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {adminData.kycQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-100">{item.entityName}</td>
                      <td className="py-3 px-3 text-slate-300">{item.entityType} • {item.sector}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.taxIdGstin || item.aisheCode}</td>
                      <td className="py-3 px-3 text-slate-400">{item.submittedDate}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : item.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.status === "PENDING" || item.status === "INFO_REQUESTED" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleKycAction(item.id, "APPROVED")}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleKycAction(item.id, "INFO_REQUESTED")}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                            >
                              Req Info
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-mono">KYC Validated ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forensic Audit Log Stream */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Shield size={18} className="text-amber-400" />
                Forensic Security & Governance Audit Stream
              </h3>
              <Link href="/admin/audit-logs" className="text-xs text-amber-400 font-semibold">
                Full Audit Trail
              </Link>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {adminData.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.severity === "HIGH"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : log.severity === "LOW"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-400">by</span>
                    <span className="text-slate-200 font-bold">{log.actor}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="text-slate-300">{log.target}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 shrink-0">
                    <span>IP: {log.ipAddress}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
