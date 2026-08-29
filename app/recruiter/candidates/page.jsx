"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Filter, CheckCircle2, AlertTriangle, XCircle, Search, ShieldCheck, Star, Sparkles, MessageSquare } from "lucide-react";
import StatusPill from "../../../components/shared/StatusPill";
import EvidenceBadge from "../../../components/shared/EvidenceBadge";
import RatingModal from "../../../components/reputation/RatingModal";
import TrustSignalBadges from "../../../components/reputation/TrustSignalBadges";

export default function RecruiterCandidatesPage() {
  const [students, setStudents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOppId, setSelectedOppId] = useState("opp_001");
  const [matchResults, setMatchResults] = useState([]);
  const [filter, setFilter] = useState("eligible"); // eligible, full, partial, ineligible, all
  const [loading, setLoading] = useState(true);
  const [selectedCandidateForRating, setSelectedCandidateForRating] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingSuccessNotice, setRatingSuccessNotice] = useState(null);
  const [candidateRatings, setCandidateRatings] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [oppRes, stdRes] = await Promise.all([
        fetch("/api/opportunities"),
        fetch("/api/students")
      ]);
      const oppData = await oppRes.json();
      const stdData = await stdRes.json();
      const opps = oppData.opportunities || [];
      const stds = stdData.students || [];

      setOpportunities(opps);
      setStudents(stds);

      // Fetch verified rating aggregates for students
      const ratingsMap = {};
      await Promise.all(
        stds.map(async (std) => {
          try {
            const rRes = await fetch(`/api/ratings?targetEntityId=${std.id}&targetRole=STUDENT`);
            if (rRes.ok) {
              const rData = await rRes.json();
              if (rData.success && rData.aggregate) {
                ratingsMap[std.id] = rData.aggregate;
              }
            }
          } catch (e) {
            // Silently continue
          }
        })
      );
      setCandidateRatings(ratingsMap);

      const targetOpp = opps.find(o => o.id === selectedOppId) || opps[0];
      if (targetOpp) {
        const matches = [];
        for (const std of stds) {
          const mRes = await fetch(`/api/match?studentId=${std.id}&opportunityId=${targetOpp.id}`);
          const mData = await mRes.json();
          if (mData.success) {
            matches.push({ student: std, match: mData.matchResult });
          }
        }
        setMatchResults(matches);
      }
    } catch (err) {
      console.error("Error loading candidate directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOppId]);

  const filteredCandidates = matchResults.filter(({ match }) => {
    if (filter === "eligible") return match.isEligible;
    if (filter === "full") return match.status === "FULL MATCH";
    if (filter === "partial") return match.status === "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH";
    if (filter === "ineligible") return !match.isEligible;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users size={14} /> Candidate Talent Directory
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Eligible Candidate Pool & Skill Matching</h1>
          <p className="text-xs text-slate-400 mt-1">
            Filtered using SIH 2026 100% High-Priority Mandatory Skill Gate.
          </p>
        </div>

        {/* Opportunity Selector */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs">
          <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1 font-semibold">
            Target Opportunity:
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

      {/* Rating Success Alert Banner */}
      {ratingSuccessNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{ratingSuccessNotice}</span>
          </div>
          <button
            onClick={() => setRatingSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 border border-slate-800 rounded-2xl text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1 mr-2">
          <Filter size={13} /> Filter Candidates:
        </span>
        <button
          onClick={() => setFilter("eligible")}
          className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
            filter === "eligible"
              ? "bg-emerald-950 text-emerald-300 border-emerald-700"
              : "text-slate-400 border-transparent hover:text-emerald-400"
          }`}
        >
          All Eligible ({matchResults.filter(m => m.match.isEligible).length})
        </button>
        <button
          onClick={() => setFilter("full")}
          className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
            filter === "full"
              ? "bg-emerald-900 text-emerald-200 border-emerald-600"
              : "text-slate-400 border-transparent hover:text-emerald-400"
          }`}
        >
          Full Match (100%)
        </button>
        <button
          onClick={() => setFilter("partial")}
          className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
            filter === "partial"
              ? "bg-amber-950 text-amber-300 border-amber-700"
              : "text-slate-400 border-transparent hover:text-amber-400"
          }`}
        >
          Partial Preferred Match
        </button>
        <button
          onClick={() => setFilter("ineligible")}
          className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
            filter === "ineligible"
              ? "bg-rose-950 text-rose-300 border-rose-700"
              : "text-slate-400 border-transparent hover:text-rose-400"
          }`}
        >
          Mandatory Skill Gap
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
            filter === "all"
              ? "bg-slate-800 text-slate-100 border-slate-700"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          Show All ({matchResults.length})
        </button>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">Evaluating candidates...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCandidates.map(({ student, match }) => (
            <div
              key={student.id}
              className={`bg-slate-900/80 border rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors ${
                match.isEligible ? "border-slate-800" : "border-rose-950/60 bg-rose-950/5"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-100">{student.name}</h3>
                      <StatusPill status={match.status} isEligible={match.isEligible} />

                      {/* Candidate Reputation Pill */}
                      {candidateRatings[student.id]?.totalRatingsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-950/80 text-amber-300 border border-amber-500/40">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <strong className="font-bold">{candidateRatings[student.id].averageScore.toFixed(1)}</strong>
                          <span className="text-slate-400">({candidateRatings[student.id].totalRatingsCount})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                          No verified ratings yet
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {student.department} • Year {student.year} • {student.institute}
                    </p>

                    {/* Trust Signals Compact Row */}
                    <div className="mt-1.5">
                      <TrustSignalBadges
                        entityRole="STUDENT"
                        trustLevel={candidateRatings[student.id]?.verificationTrustLevel || "VERIFIED_TIER1"}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">High Priority</div>
                    <div className="text-emerald-400 font-bold text-sm">{match.scores.highPriorityMatchPct}%</div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <div className="text-[10px] text-slate-400 uppercase">Preferred</div>
                    <div className="text-amber-400 font-bold text-sm">{match.scores.lowPriorityMatchPct}%</div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <div className="text-[10px] text-slate-400 uppercase">Composite</div>
                    <div className="text-slate-100 font-bold text-sm">{match.scores.compositeScore}%</div>
                  </div>
                </div>
              </div>

              {/* Matched vs Missing Skill Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Matched Skills:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {match.highPriorityAnalysis.matchedSkills.map((s, i) => (
                      <span key={i} className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono border border-emerald-500/30">
                        ✓ {s.canonicalName}
                      </span>
                    ))}
                    {match.lowPriorityAnalysis.matchedSkills.map((s, i) => (
                      <span key={i} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
                        ✓ {s.canonicalName}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Skill Gaps:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {match.highPriorityAnalysis.gaps.map((g, i) => (
                      <span key={i} className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded text-[11px] font-mono border border-rose-500/30">
                        ✗ Mandatory: {g.canonicalName}
                      </span>
                    ))}
                    {match.lowPriorityAnalysis.gaps.map((g, i) => (
                      <span key={i} className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[11px] font-mono border border-amber-500/30">
                        ⚠️ Preferred: {g.canonicalName}
                      </span>
                    ))}
                    {match.highPriorityAnalysis.gaps.length === 0 && match.lowPriorityAnalysis.gaps.length === 0 && (
                      <span className="text-emerald-400 font-mono text-[11px]">No skill gaps detected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar: Rate Candidate Trigger */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                <span className="text-[11px] font-mono text-slate-500">
                  Application Stage: <strong className="text-slate-300">Reviewed & Screened</strong>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCandidateForRating({
                      interactionId: `rint_app_${student.id}_${selectedOppId}`,
                      interactionType: "APPLICATION_REVIEW",
                      targetUserId: student.userId || student.id,
                      targetEntityId: student.id,
                      targetName: student.name,
                      targetRole: "STUDENT",
                      isBlind: false,
                    });
                    setIsRatingModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 border border-slate-700 text-xs font-semibold transition-all"
                >
                  <Star size={13} className="text-amber-400" />
                  <span>Rate Candidate Application</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {selectedCandidateForRating && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => {
            setIsRatingModalOpen(false);
            setSelectedCandidateForRating(null);
          }}
          interaction={selectedCandidateForRating}
          onSuccess={(data) => {
            setRatingSuccessNotice(`Verified candidate rating recorded for ${selectedCandidateForRating.targetName}!`);
            setTimeout(() => setRatingSuccessNotice(null), 5000);
            loadData();
          }}
        />
      )}
    </div>
  );
}
