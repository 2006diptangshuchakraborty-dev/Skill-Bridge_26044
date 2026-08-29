"use client";

import React, { useState } from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ShieldCheck,
  CheckCircle2,
  Building2,
  GraduationCap,
  School,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Flag,
  Plus,
} from "lucide-react";

/**
 * ReviewCard Component
 * Displays a verified platform interaction review card with star score,
 * recommendation badge, headline, review narrative, pros/cons, and category breakdown.
 */
export default function ReviewCard({
  review,
  onReport = null,
  className = "",
}) {
  const [showCategories, setShowCategories] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (!review) return null;

  const {
    id,
    reviewer,
    reviewerName,
    reviewerRole,
    reviewerCompany,
    contextType,
    interactionType,
    overallScore = 5.0,
    recommendation = "RECOMMENDED",
    headline,
    reviewText,
    comments,
    pros = [],
    cons = [],
    categoryScores = [],
    scores = {},
    isVerified = true,
    createdAt,
    publishedAt,
    response,
  } = review;

  const displayContext = (contextType || interactionType || "APPLICATION_REVIEW")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const name = reviewer?.name || reviewerName || "Verified Evaluator";
  const role = reviewer?.role || reviewerRole || "RECRUITER";
  const company = reviewer?.company || reviewerCompany || "";
  const initial = name.charAt(0).toUpperCase();

  const formattedDate = publishedAt || createdAt
    ? new Date(publishedAt || createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Verified Interaction";

  // Role badges & colors
  const roleConfig = {
    STUDENT: { label: "Verified Student", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40", icon: GraduationCap },
    INDUSTRY: { label: "Industry Recruiter", color: "text-blue-400 border-blue-500/30 bg-blue-950/40", icon: Building2 },
    RECRUITER: { label: "Industry Recruiter", color: "text-blue-400 border-blue-500/30 bg-blue-950/40", icon: Building2 },
    INSTITUTE: { label: "Academic Faculty", color: "text-purple-400 border-purple-500/30 bg-purple-950/40", icon: School },
    FACULTY: { label: "Academic Faculty", color: "text-purple-400 border-purple-500/30 bg-purple-950/40", icon: School },
    ADMIN: { label: "System Auditor", color: "text-amber-400 border-amber-500/30 bg-amber-950/40", icon: ShieldCheck },
  };

  const currentRole = roleConfig[String(role).toUpperCase()] || roleConfig.INDUSTRY;
  const RoleIcon = currentRole.icon;

  // Normalizing category scores
  let resolvedCategories = [];
  if (Array.isArray(categoryScores) && categoryScores.length > 0) {
    resolvedCategories = categoryScores;
  } else if (scores && typeof scores === "object") {
    resolvedCategories = Object.entries(scores).map(([code, score]) => ({
      code,
      name: code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      score: Number(score),
    }));
  }

  // Normalizing Pros & Cons
  const resolvedPros = Array.isArray(pros) ? pros : typeof pros === "string" ? pros.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const resolvedCons = Array.isArray(cons) ? cons : typeof cons === "string" ? cons.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700/80 transition-all ${className}`}>
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-slate-100 font-bold text-sm border border-slate-700 shadow-sm">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-sm">{name}</span>
              {company && <span className="text-xs text-slate-400">• {company}</span>}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${currentRole.color}`}>
                <RoleIcon size={10} />
                {currentRole.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="text-slate-300">{displayContext}</span>
              <span>•</span>
              <span className="text-slate-500">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Verified Stamp & Recommendation Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40" title="Verified Platform Interaction">
              <ShieldCheck size={12} className="text-emerald-400" />
              Verified Review
            </span>
          )}

          {recommendation === "RECOMMENDED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              <ThumbsUp size={11} className="text-emerald-400" />
              Recommended
            </span>
          )}

          {recommendation === "NEUTRAL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <Minus size={11} className="text-slate-400" />
              Neutral
            </span>
          )}

          {recommendation === "NOT_RECOMMENDED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-500/30">
              <ThumbsDown size={11} className="text-rose-400" />
              Not Recommended
            </span>
          )}
        </div>
      </div>

      {/* Rating Score & Headline */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                className={s <= Math.round(Number(overallScore)) ? "fill-amber-400 text-amber-400" : "text-slate-700"}
              />
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-slate-200">
            {Number(overallScore).toFixed(1)} / 5.0
          </span>
        </div>

        {headline && (
          <h4 className="text-sm font-bold text-slate-100 tracking-tight">
            "{headline}"
          </h4>
        )}
      </div>

      {/* Review Written Narrative */}
      {(reviewText || comments) && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
          {reviewText || comments}
        </p>
      )}

      {/* Pros & Cons Section */}
      {(resolvedPros.length > 0 || resolvedCons.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          {resolvedPros.length > 0 && (
            <div className="space-y-1.5 bg-emerald-950/10 border border-emerald-900/30 p-2.5 rounded-xl">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> Highlights / Pros:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resolvedPros.map((pro, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                  >
                    + {pro}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resolvedCons.length > 0 && (
            <div className="space-y-1.5 bg-rose-950/10 border border-rose-900/30 p-2.5 rounded-xl">
              <div className="text-[10px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
                <Minus size={11} /> Areas for Growth / Cons:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resolvedCons.map((con, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-rose-950/60 text-rose-300 border border-rose-500/30"
                  >
                    - {con}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Scores Accordion */}
      {resolvedCategories.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowCategories(!showCategories)}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{showCategories ? "Hide" : "View"} Context Category Breakdown ({resolvedCategories.length})</span>
            {showCategories ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showCategories && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
              {resolvedCategories.map((cat, idx) => {
                const cScore = Number(cat.score || cat.numericScore || 0);
                const cName = cat.name || cat.categoryName || cat.code;
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                    <span className="text-slate-300 text-[11px] truncate">{cName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-amber-400 font-bold text-xs">{cScore}</span>
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Counterparty Response Thread if present */}
      {response && (
        <div className="bg-slate-950/80 border-l-2 border-emerald-500 pl-3.5 pr-3 py-2.5 rounded-r-xl space-y-1 text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <MessageSquare size={11} /> {response.responderName || "Verified Response"}:
            </span>
            <span className="text-slate-500">{response.respondedAt}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {response.responseText}
          </p>
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
        <span>Interaction ID: <span className="text-slate-400">{review.interactionId || id || "rint_ver"}</span></span>
        {onReport && (
          <button
            type="button"
            onClick={() => onReport(review)}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors"
          >
            <Flag size={10} /> Report Review
          </button>
        )}
      </div>
    </div>
  );
}
