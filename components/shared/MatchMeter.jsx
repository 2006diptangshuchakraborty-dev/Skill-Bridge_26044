"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Check, X } from "lucide-react";

export default function MatchMeter({ matchResult }) {
  if (!matchResult) return null;

  const {
    isEligible,
    status,
    scores,
    highPriorityAnalysis,
    lowPriorityAnalysis
  } = matchResult;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400 font-semibold">
            SIH 2026 Skill Match Analysis
          </span>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            {isEligible ? (
              <span className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" /> ELIGIBLE FOR APPLICATION
              </span>
            ) : (
              <span className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-6 h-6 text-rose-400" /> NOT ELIGIBLE — MANDATORY SKILL GAP
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black font-mono tracking-tight text-slate-100">
              {scores?.compositeScore}%
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Preferred Skill Coverage
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Section (High Priority) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              SECTION 01 — HIGH PRIORITY (MANDATORY SKILLS)
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {scores?.highPriorityMatchPct}% MATCH {scores?.highPriorityMatchPct === 100 ? "✓" : "✗"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              scores?.highPriorityMatchPct === 100
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-rose-500 to-amber-500"
            }`}
            style={{ width: `${scores?.highPriorityMatchPct || 0}%` }}
          />
        </div>

        {/* High Priority Skills Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {highPriorityAnalysis?.matchedSkills?.map((skill, idx) => (
            <div
              key={`high-match-${idx}`}
              className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" /> {skill.canonicalName}
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                Matched
              </span>
            </div>
          ))}

          {highPriorityAnalysis?.gaps?.map((gap, idx) => (
            <div
              key={`high-gap-${idx}`}
              className="bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2 font-semibold">
                <X className="w-4 h-4 text-rose-400" /> {gap.canonicalName}
              </span>
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                Missing Mandatory
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferred Section (Low Priority) */}
      <div className="space-y-3 border-t border-slate-800/80 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              SECTION 02 — LOW PRIORITY (PREFERRED SKILLS)
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {scores?.lowPriorityMatchPct}% MATCH {scores?.lowPriorityMatchPct < 100 ? "⚠️" : "✓"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-yellow-400"
            style={{ width: `${scores?.lowPriorityMatchPct || 0}%` }}
          />
        </div>

        {/* Low Priority Skills Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {lowPriorityAnalysis?.matchedSkills?.map((skill, idx) => (
            <div
              key={`low-match-${idx}`}
              className="bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-emerald-400" /> {skill.canonicalName}
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                Matched
              </span>
            </div>
          ))}

          {lowPriorityAnalysis?.gaps?.map((gap, idx) => (
            <div
              key={`low-gap-${idx}`}
              className="bg-amber-950/30 border border-amber-500/30 text-amber-200 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> {gap.canonicalName}
              </span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                Missing Preferred
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explainable Decision Summary */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
        <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
          Why are you evaluated as: <span className="text-emerald-400 font-mono">{status}</span>?
        </h5>
        {isEligible ? (
          <div className="text-slate-300 space-y-1">
            <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 size={14} /> All mandatory High-Priority requirements have been satisfied 100%.
            </p>
            {lowPriorityAnalysis?.gaps?.length > 0 && (
              <p className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={14} /> You have missing preferred skills:{" "}
                <span className="font-mono text-amber-200">
                  {lowPriorityAnalysis.gaps.map(g => g.canonicalName).join(", ")}
                </span>. You can still apply, but taking short workshops will strengthen your profile.
              </p>
            )}
          </div>
        ) : (
          <div className="text-rose-300 space-y-1">
            <p className="flex items-center gap-1.5 text-rose-400 font-medium">
              <XCircle size={14} /> Missing mandatory High-Priority skill(s):{" "}
              <span className="font-mono font-bold text-rose-200">
                {highPriorityAnalysis.gaps.map(g => g.canonicalName).join(", ")}
              </span>.
            </p>
            <p className="text-slate-400 text-[11px]">
              Platform policy enforces 100% match on mandatory skills for candidate eligibility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
