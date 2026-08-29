"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Briefcase, MapPin, Building2, Calendar, ArrowRight, Sparkles } from "lucide-react";
import StatusPill from "../../../components/shared/StatusPill";

export default function StudentOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState("std_001");
  const [student, setStudent] = useState(null);
  const [matchMap, setMatchMap] = useState({});
  const [filterEligibility, setFilterEligibility] = useState("all"); // all, eligible, partial, ineligible
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async (personaId) => {
    setLoading(true);
    try {
      // 1. Fetch student profile
      const stdRes = await fetch(`/api/students?id=${personaId}`);
      const studentData = await stdRes.json();
      setStudent(studentData);

      // 2. Fetch opportunities
      const oppRes = await fetch("/api/opportunities");
      const oppData = await oppRes.json();
      const oppList = oppData.opportunities || [];
      setOpportunities(oppList);

      // 3. Compute match evaluations for student
      const matches = {};
      for (const opp of oppList) {
        const mRes = await fetch(`/api/match?studentId=${personaId}&opportunityId=${opp.id}`);
        const mData = await mRes.json();
        if (mData.success) {
          matches[opp.id] = mData.matchResult;
        }
      }
      setMatchMap(matches);
    } catch (err) {
      console.error("Error loading student opportunities data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedId = localStorage.getItem("sih_active_student_id") || "std_001";
    setActivePersonaId(savedId);
    loadData(savedId);

    const handlePersonaChange = () => {
      const newId = localStorage.getItem("sih_active_student_id") || "std_001";
      setActivePersonaId(newId);
      loadData(newId);
    };

    window.addEventListener("sih_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("sih_persona_changed", handlePersonaChange);
  }, []);

  const filteredOpportunities = opportunities.filter((opp) => {
    const match = matchMap[opp.id];
    if (!match) return true;

    // Search filter
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.location && opp.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Eligibility filter
    if (filterEligibility === "eligible") return match.isEligible;
    if (filterEligibility === "partial") return match.status === "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH";
    if (filterEligibility === "ineligible") return !match.isEligible;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={14} /> Student Opportunity Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Recommended Opportunities for <span className="text-emerald-400">{student?.name || "Student"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluated using SIH 2026 Priority-Aware Skill Matching Engine (`100% High Priority Gatekeeper Rule`).
          </p>
        </div>

        {student && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono space-y-1">
            <div className="text-slate-400">Persona Profile:</div>
            <div className="text-slate-200 font-bold flex items-center gap-2">
              <span>{student.department}</span> • <span>Year {student.year}</span>
            </div>
            <div className="text-emerald-400 text-[11px] font-sans">
              {student.skills?.length || 0} Registered Skills
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => setFilterEligibility("all")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filterEligibility === "all"
                ? "bg-slate-800 text-slate-100 border-slate-700"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            All Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setFilterEligibility("eligible")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filterEligibility === "eligible"
                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                : "text-slate-400 border-transparent hover:text-emerald-400"
            }`}
          >
            Eligible Only
          </button>
          <button
            onClick={() => setFilterEligibility("partial")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filterEligibility === "partial"
                ? "bg-amber-950 text-amber-300 border-amber-800"
                : "text-slate-400 border-transparent hover:text-amber-400"
            }`}
          >
            Partial Preferred Match
          </button>
          <button
            onClick={() => setFilterEligibility("ineligible")}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filterEligibility === "ineligible"
                ? "bg-rose-950 text-rose-300 border-rose-800"
                : "text-slate-400 border-transparent hover:text-rose-400"
            }`}
          >
            Mandatory Skill Gap
          </button>
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs font-mono">
          Evaluating student profile against opportunity requirement specs...
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-slate-400 text-sm">No opportunities found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOpportunities.map((opp) => {
            const match = matchMap[opp.id];
            return (
              <div
                key={opp.id}
                className={`bg-slate-900/80 border rounded-2xl p-6 transition-all hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  match?.isEligible ? "border-slate-800" : "border-rose-950/60 bg-rose-950/5"
                }`}
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={match?.status} isEligible={match?.isEligible} />
                    <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                      {opp.type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Deadline: {opp.applicationDeadline || opp.deadline}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-100 hover:text-emerald-400 transition-colors">
                      <Link href={`/student/opportunities/${opp.id}`}>{opp.title}</Link>
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-300">
                        <Building2 size={13} className="text-emerald-400" /> {opp.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-500" /> {opp.location} ({opp.workMode})
                      </span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        Stipend: {opp.stipend || opp.salary}
                      </span>
                    </div>
                  </div>

                  {/* Dual Match Percentage Breakdown */}
                  {match && (
                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Mandatory Match</span>
                        <span
                          className={`font-mono font-bold ${
                            match.scores.highPriorityMatchPct === 100 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {match.scores.highPriorityMatchPct}% {match.scores.highPriorityMatchPct === 100 ? "✓" : "✗"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Preferred Match</span>
                        <span
                          className={`font-mono font-bold ${
                            match.scores.lowPriorityMatchPct === 100 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {match.scores.lowPriorityMatchPct}% {match.scores.lowPriorityMatchPct < 100 ? "⚠️" : "✓"}
                        </span>
                      </div>

                      {/* Explicit Missing Preferred Skills */}
                      {match.isEligible && match.lowPriorityAnalysis?.gaps?.length > 0 && (
                        <div className="text-[11px] text-amber-300 bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-500/20">
                          Missing Preferred:{" "}
                          <span className="font-mono font-semibold">
                            {match.lowPriorityAnalysis.gaps.map((g) => g.canonicalName).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Explicit Missing Mandatory Skills */}
                      {!match.isEligible && (
                        <div className="text-[11px] text-rose-300 bg-rose-950/30 px-3 py-1 rounded-lg border border-rose-500/20">
                          Missing Mandatory:{" "}
                          <span className="font-mono font-semibold">
                            {match.highPriorityAnalysis.gaps.map((g) => g.canonicalName).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center md:flex-col justify-end gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                  <Link
                    href={`/student/opportunities/${opp.id}`}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-center"
                  >
                    View Match Analysis <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
