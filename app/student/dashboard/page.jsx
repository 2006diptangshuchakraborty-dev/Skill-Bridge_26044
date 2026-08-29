"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import {
  GraduationCap,
  Sparkles,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Award,
  ExternalLink,
  Target,
  FileCheck,
  ChevronRight,
  Star,
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [skillMatrix, setSkillMatrix] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * --------------------------------------------------------------------------
   * LOAD THE LOGGED-IN STUDENT'S DATA
   * --------------------------------------------------------------------------
   *
   * IMPORTANT:
   * This page is a Client Component.
   *
   * Therefore we DO NOT import getStudentData() directly here.
   *
   * Database access must happen on the server/API side.
   */
  useEffect(() => {
    async function loadStudentData() {
      try {
        setLoading(true);
        setError("");

        // Client role & session guard
        const sessionRes = await authClient.getSession().catch(() => null);
        const user = sessionRes?.data?.user;

        if (!user) {
          router.replace("/auth?role=STUDENT&redirect=/student/dashboard");
          return;
        }

        const userRole = String(user.role || "").toUpperCase();
        if (userRole !== "STUDENT" && userRole !== "ADMIN") {
          const redirectTarget = (userRole === "INDUSTRY" || userRole === "ORGANIZATION")
            ? "/industry/dashboard"
            : (userRole === "INSTITUTE" ? "/institute/dashboard" : "/auth");
          router.replace(redirectTarget);
          return;
        }

        /*
         * Your existing profile API.
         *
         * This should return the currently authenticated student's
         * database profile.
         */
        const response = await fetch("/api/profile/setup", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load student profile (${response.status})`
          );
        }

        const data = await response.json();

        console.log("Student dashboard API response:", data);

        /*
         * --------------------------------------------------------------------
         * PROFILE
         * --------------------------------------------------------------------
         */

        const databaseProfile = data?.profile ?? null;
        const databaseUser = data?.user ?? null;

        if (!databaseProfile && !databaseUser) {
          throw new Error("Student profile was not found.");
        }

        /*
         * Merge the user table data and student profile data.
         */
        const completeProfile = {
          ...(databaseProfile ?? {}),
          ...(databaseUser ?? {}),

          name:
            databaseUser?.name ||
            databaseProfile?.fullName ||
            databaseProfile?.name ||
            "",

          email:
            databaseUser?.email ||
            databaseProfile?.email ||
            "",

          headline:
            databaseProfile?.headline ||
            "",

          bio:
            databaseProfile?.bio ||
            "",

          instituteName:
            databaseProfile?.instituteName ||
            databaseProfile?.institute ||
            "",

          department:
            databaseProfile?.department ||
            "",

          degree:
            databaseProfile?.degree ||
            "",

          cgpa:
            databaseProfile?.cgpa ??
            "",

          profileCompletion:
            data?.profileCompletion ??
            databaseProfile?.profileCompletion ??
            0,
        };

        setProfile(completeProfile);

        /*
         * --------------------------------------------------------------------
         * SKILLS
         * --------------------------------------------------------------------
         */
        if (Array.isArray(databaseProfile?.skills)) {
          const databaseSkills = databaseProfile.skills.map(
            (skill, index) => {
              if (typeof skill === "string") {
                return {
                  id: `skill-${index}`,
                  name: skill,
                  category: "Technical Skills",
                  proficiency: 2,
                  proficiencyLabel: "Advanced",
                  evidenceLevel: 1,
                  evidenceLabel: "Self-Declared",
                  confidenceScore: 0,
                  verification: "Database Profile",
                  evidenceUrl: null,
                  isIndustryVerified: false,
                };
              }

              return {
                id: skill.id ?? `skill-${index}`,

                name:
                  skill.name ||
                  skill.skillName ||
                  "Unnamed Skill",

                category:
                  skill.category ||
                  "Technical Skills",

                proficiency:
                  typeof skill.proficiency === "number"
                    ? skill.proficiency
                    : skill.proficiency === "Expert"
                    ? 4
                    : skill.proficiency === "Advanced"
                    ? 3
                    : skill.proficiency === "Intermediate"
                    ? 2
                    : 1,

                proficiencyLabel:
                  skill.proficiencyLabel ||
                  skill.proficiency ||
                  "Self-Declared",

                evidenceLevel:
                  skill.evidenceLevel ?? 1,

                evidenceLabel:
                  skill.evidenceLabel ||
                  "Self-Declared",

                confidenceScore:
                  skill.confidenceScore ?? 0,

                verification:
                  skill.verification ||
                  "Database Profile",

                evidenceUrl:
                  skill.evidenceUrl ||
                  null,

                isIndustryVerified:
                  skill.isIndustryVerified ?? false,
              };
            }
          );

          setSkillMatrix(databaseSkills);
        } else {
          setSkillMatrix([]);
        }

        /*
         * --------------------------------------------------------------------
         * OPPORTUNITIES
         * --------------------------------------------------------------------
         */
        if (Array.isArray(data?.recommendedOpportunities)) {
          setOpportunities(data.recommendedOpportunities);
        } else if (
          Array.isArray(databaseProfile?.recommendedOpportunities)
        ) {
          setOpportunities(
            databaseProfile.recommendedOpportunities
          );
        } else {
          setOpportunities([]);
        }

        /*
         * --------------------------------------------------------------------
         * APPLICATION HISTORY
         * --------------------------------------------------------------------
         */
        if (Array.isArray(data?.applicationHistory)) {
          setApplications(data.applicationHistory);
        } else if (
          Array.isArray(databaseProfile?.applicationHistory)
        ) {
          setApplications(
            databaseProfile.applicationHistory
          );
        } else {
          setApplications([]);
        }
      } catch (err) {
        console.error(
          "Student dashboard loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load student dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * EVIDENCE BADGE
   * --------------------------------------------------------------------------
   */
  const getEvidenceBadge = (level) => {
    switch (level) {
      case 5:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Award size={12} className="text-purple-400" />
            Level 5: Industry Verified
          </span>
        );

      case 4:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2
              size={12}
              className="text-emerald-400"
            />
            Level 4: Industry Verified
          </span>
        );

      case 3:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <ShieldCheck
              size={12}
              className="text-blue-400"
            />
            Level 3: Assessment Verified
          </span>
        );

      case 2:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <FileCheck
              size={12}
              className="text-amber-400"
            />
            Level 2: Project Verified
          </span>
        );

      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <Sparkles size={12} />
            Level 1: Self-Declared
          </span>
        );
    }
  };

  /*
   * --------------------------------------------------------------------------
   * LOADING STATE
   * --------------------------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * ERROR STATE
   * --------------------------------------------------------------------------
   */
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            Unable to load your dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-2">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const safeProfile = profile ?? {};
  const safeSkills = Array.isArray(skillMatrix) ? skillMatrix : [];
  const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
  const safeApplications = Array.isArray(applications) ? applications : [];

  const eligibleCount = safeOpportunities.filter(
    (opportunity) => opportunity?.isEligible === true
  ).length;

  const verifiedSkillCount = safeSkills.filter(
    (skill) => Number(skill?.evidenceLevel ?? 0) >= 3
  ).length;

  const interviewCount = safeApplications.filter(
    (application) => Number(application?.stage ?? 0) >= 3
  ).length;

  const profileCompletion = Math.min(
    100,
    Math.max(0, Number(safeProfile?.profileCompletion ?? 0))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* PROFILE HERO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              {safeProfile?.name
                ? String(safeProfile.name).charAt(0).toUpperCase()
                : "S"}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  STUDENT PORTAL
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  CGPA: {safeProfile?.cgpa || "—"}
                </span>
                <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                  {safeProfile?.degree || "—"} • {safeProfile?.department || "—"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                {safeProfile?.name || "Student"}
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl">
                {safeProfile?.headline || "Welcome to your student dashboard."}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                <GraduationCap size={13} className="text-emerald-400" />
                <span>{safeProfile?.instituteName || "Institute information not available"}</span>
              </p>
              {safeProfile?.email && (
                <p className="text-[11px] text-slate-500">{safeProfile.email}</p>
              )}
            </div>
          </div>

          {/* Profile status */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Profile Readiness</span>
                <span className="font-mono font-bold text-emerald-400">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/student/opportunities"
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Briefcase size={14} />
                Explore Matches
              </Link>
              <Link
                href="/profile/setup"
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
              >
                Edit Setup
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-teal-400" />
            Verified Skill Score
          </span>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {safeSkills.length}
            <span className="text-xs text-slate-400 font-normal ml-2">Demonstrated</span>
          </div>
          <p className="text-[11px] text-emerald-400">
            {verifiedSkillCount} Assessment/Project Verified
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Target size={13} className="text-emerald-400" />
            Eligible Matches
          </span>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {eligibleCount}
          </div>
          <p className="text-[11px] text-slate-400">Based on current eligibility</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Briefcase size={13} className="text-blue-400" />
            Active Applications
          </span>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {safeApplications.length}
          </div>
          <p className="text-[11px] text-blue-400">
            {interviewCount} In Shortlist / Interview
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-purple-400" />
            Verified Reputation
          </span>
          <div className="text-3xl font-black text-purple-300 font-mono flex items-center gap-1">
            {safeProfile?.reputationScore ?? "—"}
            {safeProfile?.reputationScore && (
              <Star size={18} className="text-amber-400 fill-amber-400" />
            )}
          </div>
          <p className="text-[11px] text-slate-400">Based on verified interactions</p>
        </div>
      </div>

      {/* Verified Skill Matrix & 5-Level Evidence */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="text-teal-400" />
              Verified Skill Matrix & 5-Level Evidence
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Skills currently stored in your student profile.
            </p>
          </div>
          <Link
            href="/student/skills"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Take Skill Assessment</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {safeSkills.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
            <Sparkles size={28} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No skills were found in your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeSkills.slice(0, 6).map((skill) => (
              <div
                key={skill.id}
                className="bg-slate-950 border border-slate-800/90 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {skill.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-100">{skill.name}</h3>
                  </div>
                  {getEvidenceBadge(skill.evidenceLevel)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Proficiency: <strong className="text-slate-200">{skill.proficiencyLabel}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-teal-400 font-bold">
                      Confidence {skill.confidenceScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-400 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (Number(skill.proficiency) / 4) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                  <span>{skill.verification}</span>
                  {skill.evidenceUrl && (
                    <a
                      href={skill.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:underline flex items-center gap-1"
                    >
                      Evidence
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Opportunities & Gatekeeper Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Target className="text-emerald-400" />
              Recommended Opportunities & Gatekeeper Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Opportunities available according to your current student data.
            </p>
          </div>
          <Link
            href="/student/opportunities"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All Opportunities</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {safeOpportunities.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
            <Briefcase size={28} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">
              No recommended opportunities are currently available.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeOpportunities.map((opp) => (
              <div
                key={opp.id}
                className={`bg-slate-950 border rounded-2xl p-6 space-y-4 transition ${
                  opp.isEligible
                    ? "border-emerald-500/30 hover:border-emerald-500/50"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {opp.type && (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {opp.type}
                        </span>
                      )}
                      {opp.stipend && (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {opp.stipend}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          opp.isEligible
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {opp.gateStatus || (opp.isEligible ? "Eligible" : "Not Eligible")}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-100">
                      {opp.title || "Opportunity"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {opp.companyName || opp.company || "Company"}
                      {opp.location ? ` • ${opp.location}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {opp.compositeScore !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-black font-mono text-slate-100">
                          {opp.compositeScore}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Composite Match
                        </div>
                      </div>
                    )}
                    <Link
                      href="/student/opportunities"
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        opp.isEligible
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      <span>{opp.isEligible ? "Apply Now" : "View Details"}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                {(Array.isArray(opp.highPrioritySkills) ||
                  Array.isArray(opp.preferredSkills)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-900 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                        High Priority Mandatory
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(opp.highPrioritySkills ?? []).map((skill, index) => (
                          <span
                            key={index}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              skill.matched
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-950 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {skill.name} {skill.matched ? "✓" : "✗"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                        Low Priority Preferred
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(opp.preferredSkills ?? []).map((skill, index) => (
                          <span
                            key={index}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              skill.matched
                                ? "bg-amber-950 text-amber-300 border-amber-500/30"
                                : "bg-slate-900 text-slate-400 border-slate-700"
                            }`}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Application Pipeline (6-Stage Lifecycle) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Briefcase className="text-blue-400" />
              Active Application Pipeline (6-Stage Lifecycle)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track your current application progress.
            </p>
          </div>
          <Link
            href="/student/applications"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>All Applications</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {safeApplications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
            <Briefcase size={28} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">You don't have any applications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeApplications.slice(0, 3).map((application) => {
              const stage = Math.min(
                6,
                Math.max(1, Number(application?.stage ?? 1))
              );

              return (
                <div
                  key={application.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        Stage {stage}/6{application.stageLabel ? `: ${application.stageLabel}` : ""}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 mt-1">
                        {application.roleTitle || "Application"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {application.companyName || application.company || "Company"}
                        {application.appliedDate ? ` • Applied ${application.appliedDate}` : ""}
                      </p>
                    </div>

                    {application.nextStep && (
                      <div className="text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                        {application.nextStep}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 pt-2">
                    {["Applied", "Review", "Shortlist", "Interview", "Offer", "Verified"].map(
                      (stageName, index) => {
                        const stageNumber = index + 1;
                        const isDone = stageNumber <= stage;
                        const isCurrent = stageNumber === stage;

                        return (
                          <div key={stageName} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                isDone ? "bg-blue-400" : "bg-slate-800"
                              }`}
                            />
                            <span
                              className={`text-[9px] font-mono block truncate ${
                                isCurrent ? "text-blue-300 font-bold" : "text-slate-500"
                              }`}
                            >
                              {stageName}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
