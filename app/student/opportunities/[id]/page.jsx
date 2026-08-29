"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Calendar, DollarSign, Sparkles, Send, AlertOctagon, CheckCircle2, BookOpen } from "lucide-react";
import MatchMeter from "../../../../components/shared/MatchMeter";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [opportunity, setOpportunity] = useState(null);
  const [student, setStudent] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(null);
  const [applicationError, setApplicationError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setApplicationError(null);
    setApplicationSuccess(null);
    try {
      const personaId = localStorage.getItem("sih_active_student_id") || "std_001";

      const [oppRes, stdRes, matchRes] = await Promise.all([
        fetch(`/api/opportunities?id=${id}`),
        fetch(`/api/students?id=${personaId}`),
        fetch(`/api/match?studentId=${personaId}&opportunityId=${id}`)
      ]);

      const oppData = await oppRes.json();
      const stdData = await stdRes.json();
      const matchData = await matchRes.json();

      setOpportunity(oppData);
      setStudent(stdData);
      if (matchData.success) {
        setMatchResult(matchData.matchResult);
      }
    } catch (err) {
      console.error("Error loading opportunity detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handlePersonaChange = () => {
      loadData();
    };

    window.addEventListener("sih_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("sih_persona_changed", handlePersonaChange);
  }, [id]);

  const handleApply = async () => {
    if (!matchResult?.isEligible) {
      setApplicationError("Application blocked: You are missing mandatory High-Priority skills.");
      return;
    }

    setApplying(true);
    setApplicationError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          opportunityId: opportunity.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setApplicationError(data.error || "Failed to submit application.");
      } else {
        setApplicationSuccess("Application submitted successfully!");
      }
    } catch (err) {
      setApplicationError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 font-mono text-xs">
        Calculating Priority Skill Match Engine Analysis...
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-4">
        <p>Opportunity not found.</p>
        <Link href="/student/opportunities" className="text-emerald-400 hover:underline text-xs">
          Return to opportunities browser
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <Link
        href="/student/opportunities"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Opportunities
      </Link>

      {/* Role Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-3 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                {opportunity.type}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Posted by {opportunity.company}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {opportunity.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                <Building2 size={14} className="text-emerald-400" /> {opportunity.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-slate-500" /> {opportunity.location} ({opportunity.workMode})
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                <DollarSign size={14} /> {opportunity.stipend || opportunity.salary}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-slate-500" /> Deadline: {opportunity.applicationDeadline || opportunity.deadline}
              </span>
            </div>
          </div>

          {/* Action Apply Container */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            {matchResult?.isEligible ? (
              <button
                onClick={handleApply}
                disabled={applying || Boolean(applicationSuccess)}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                  applicationSuccess
                    ? "bg-emerald-500 text-slate-950 cursor-default"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25"
                }`}
              >
                {applicationSuccess ? (
                  <>
                    <CheckCircle2 size={16} /> Application Submitted
                  </>
                ) : (
                  <>
                    <Send size={16} /> Apply Now (Eligible)
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-1">
                <button
                  disabled
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertOctagon size={16} className="text-rose-400" /> Apply Disabled (Ineligible)
                </button>
                <p className="text-[10px] text-rose-400 text-center font-mono">
                  Missing High-Priority mandatory skills
                </p>
              </div>
            )}
          </div>
        </div>

        {applicationError && (
          <div className="bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-xl p-4 text-xs font-mono">
            {applicationError}
          </div>
        )}

        {applicationSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 rounded-xl p-4 text-xs font-mono">
            {applicationSuccess}
          </div>
        )}

        {/* Role Description */}
        <div className="border-t border-slate-800 pt-6 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Role Description & Scope
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {opportunity.description}
          </p>
        </div>
      </div>

      {/* Primary Centerpiece Screen: Visual Skill Match Analysis */}
      <MatchMeter matchResult={matchResult} />

      {/* Improve Your Skills & Upskilling Recommendations Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen className="text-teal-400" size={18} />
          <h3 className="text-base font-bold text-slate-100">
            Targeted Skill Gap & Upskilling Recommendations
          </h3>
        </div>

        {matchResult?.lowPriorityAnalysis?.gaps?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              Recommended courses, workshops, and practice modules to bridge your missing preferred skills:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchResult.lowPriorityAnalysis.gaps.map((gap, idx) => (
                <div
                  key={`up-${idx}`}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>Missing Skill: {gap.canonicalName}</span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                      Preferred Gap
                    </span>
                  </div>
                  <ul className="text-slate-400 space-y-1 text-[11px]">
                    <li>✓ {gap.canonicalName} Fundamentals & Hands-on Lab</li>
                    <li>✓ Complete 2 industry projects in {gap.canonicalName}</li>
                    <li>✓ Complete Skill Assessment to boost to Level 3</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {matchResult?.highPriorityAnalysis?.gaps?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-rose-300">
              Mandatory skills required to achieve eligibility for this role:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchResult.highPriorityAnalysis.gaps.map((gap, idx) => (
                <div
                  key={`up-mand-${idx}`}
                  className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="font-bold text-rose-300 flex items-center justify-between">
                    <span>Mandatory Missing: {gap.canonicalName}</span>
                    <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                      Required for Eligibility
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    {gap.reasonDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!matchResult?.lowPriorityAnalysis?.gaps?.length && !matchResult?.highPriorityAnalysis?.gaps?.length && (
          <p className="text-xs text-emerald-400 font-mono">
            🎉 You have 100% skill coverage across both mandatory and preferred requirements! No skill gaps detected.
          </p>
        )}
      </div>
    </div>
  );
}
