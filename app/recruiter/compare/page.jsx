"use client";

import React, { useState, useEffect } from "react";
import { Users, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import StatusPill from "../../../components/shared/StatusPill";

export default function RecruiterComparePage() {
  const [students, setStudents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOppId, setSelectedOppId] = useState("opp_001");
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [oppRes, stdRes] = await Promise.all([
          fetch("/api/opportunities"),
          fetch("/api/students")
        ]);
        const opps = (await oppRes.json()).opportunities || [];
        const stds = (await stdRes.json()).students || [];

        setOpportunities(opps);
        setStudents(stds);

        const targetOpp = opps.find(o => o.id === selectedOppId) || opps[0];
        if (targetOpp) {
          const list = [];
          for (const std of stds.slice(0, 5)) { // Compare top candidate personas
            const mRes = await fetch(`/api/match?studentId=${std.id}&opportunityId=${targetOpp.id}`);
            const mData = await mRes.json();
            if (mData.success) {
              list.push({ student: std, match: mData.matchResult });
            }
          }
          setComparisonData(list);
        }
      } catch (err) {
        console.error("Error loading comparison:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedOppId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users size={14} /> Recruiter Side-by-Side Matrix
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Eligible Candidate Comparison Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare candidate mandatory match, preferred skill coverage, and verified industry evidence.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs">
          <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1 font-semibold">
            Role Comparison Context:
          </label>
          <select
            value={selectedOppId}
            onChange={(e) => setSelectedOppId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
          >
            {opportunities.map(o => (
              <option key={o.id} value={o.id}>
                {o.title} ({o.company})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">Generating comparison matrix...</div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-4 px-6">Candidate Name</th>
                  <th className="py-4 px-4">Mandatory Match</th>
                  <th className="py-4 px-4">Preferred Match</th>
                  <th className="py-4 px-4">Eligibility Status</th>
                  <th className="py-4 px-4">Missing Preferred Skills</th>
                  <th className="py-4 px-4 text-right">Composite Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {comparisonData.map(({ student, match }) => (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-bold">
                      <div className="text-slate-100">{student.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{student.department} • Y{student.year}</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold">
                      <span className={match.scores.highPriorityMatchPct === 100 ? "text-emerald-400" : "text-rose-400"}>
                        {match.scores.highPriorityMatchPct}% {match.scores.highPriorityMatchPct === 100 ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      {match.scores.lowPriorityMatchPct}%
                    </td>
                    <td className="py-4 px-4">
                      <StatusPill status={match.status} isEligible={match.isEligible} />
                    </td>
                    <td className="py-4 px-4 text-amber-300 font-mono text-[11px]">
                      {match.lowPriorityAnalysis.gaps.map(g => g.canonicalName).join(", ") || "None (100% Match)"}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-100 text-sm">
                      {match.scores.compositeScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
