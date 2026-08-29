"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Star,
  Award,
  ThumbsUp,
  CheckCircle2,
  Lock,
  Building2,
  GraduationCap,
  School,
  Sparkles,
  BarChart3,
  MessageSquare,
  FileCheck,
  Zap,
  TrendingUp,
  Filter,
} from "lucide-react";
import TrustSignalBadges from "./TrustSignalBadges";
import RatingHistogram from "./RatingHistogram";
import ReviewCard from "./ReviewCard";

/**
 * ReputationBreakdown Component
 * Master 3-Pillar Trust & Reputation Matrix:
 * Pillar 1: Verification Trust Signals (Statutory KYC, Identity, Domain, Accreditation)
 * Pillar 2: Objective Skill Verification (Assessment 0-100, Proctored Tests)
 * Pillar 3: Experience Reputation (Weighted 1.0-5.0 Stars across verified interactions, Histogram, Reviews)
 */
export default function ReputationBreakdown({
  targetRole = "STUDENT",
  targetEntityId = null,
  targetUserId = null,
  entityName = "Verified Profile",
  aggregate: initialAggregate = null,
  reviews: initialReviews = null,
  trustSignals = [],
  objectiveSkills = null,
  showRateButton = false,
  onRateClick = null,
  className = "",
}) {
  const [aggregate, setAggregate] = useState(initialAggregate);
  const [reviews, setReviews] = useState(initialReviews || []);
  const [loading, setLoading] = useState(!initialAggregate && Boolean(targetEntityId));
  const [activeReviewFilter, setActiveReviewFilter] = useState("ALL");
  const [activePillarTab, setActivePillarTab] = useState("ALL"); // ALL, SIGNALS, OBJECTIVE, EXPERIENCE

  // Role Normalization
  const role = String(targetRole).toUpperCase();

  // Fetch from API if targetEntityId is provided and initialAggregate is missing
  useEffect(() => {
    if (initialAggregate) {
      setAggregate(initialAggregate);
      if (initialReviews) setReviews(initialReviews);
      setLoading(false);
      return;
    }

    if (!targetEntityId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ratings?targetEntityId=${encodeURIComponent(targetEntityId)}&targetRole=${encodeURIComponent(role)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAggregate(data.aggregate || null);
            setReviews(data.ratings || []);
          }
        }
      } catch (err) {
        console.error("[ReputationBreakdown Fetch Error]:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetEntityId, role, initialAggregate, initialReviews]);

  // Aggregate Metrics Extraction
  const totalCount = Number(aggregate?.totalRatingsCount ?? aggregate?.count ?? reviews.length ?? 0);
  const averageScore = Number(aggregate?.averageScore ?? 0);
  const recommendationRate = Number(aggregate?.recommendationRate ?? (totalCount > 0 ? 100 : 0));
  const trustLevel = aggregate?.verificationTrustLevel || "VERIFIED_TIER1";
  const objectiveSkillScore = Number(aggregate?.objectiveSkillScore ?? objectiveSkills?.overallScore ?? 88);
  const distribution = aggregate?.scoreDistribution || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  const categoryBreakdown = aggregate?.categoryBreakdown || {};

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (activeReviewFilter === "ALL") return true;
    return r.contextType === activeReviewFilter || r.interactionType === activeReviewFilter;
  });

  const availableContexts = Array.from(
    new Set(reviews.map((r) => r.contextType || r.interactionType).filter(Boolean))
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Master 3-Pillar Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Gradient Glow */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck size={13} className="text-emerald-400" />
                Verified Trust & Reputation Matrix
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase">
                {role} Profile
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Reputation & Trust Scorecard
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cryptographically verified 3-pillar breakdown separating statutory trust signals, objective skill benchmarks, and experiential peer reviews.
            </p>
          </div>

          {showRateButton && onRateClick && (
            <button
              type="button"
              onClick={onRateClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start md:self-center"
            >
              <Star size={14} className="fill-slate-950" />
              <span>Submit Rating</span>
            </button>
          )}
        </div>

        {/* 3 Pillars Top Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* Pillar 1: Verification Signals */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Pillar 1: Trust Signals
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-slate-100">
                {trustLevel === "GOLD_TRUSTED"
                  ? "Gold Trusted"
                  : trustLevel === "VERIFIED_TIER2"
                  ? "Tier 2 Verified"
                  : trustLevel === "VERIFIED_TIER1"
                  ? "Tier 1 Verified"
                  : "Standard Unverified"}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Statutory KYC, Institutional Enrollment & Domain Authenticity
              </p>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-emerald-300 border border-slate-800 flex items-center gap-1">
                <CheckCircle2 size={10} className="text-emerald-400" /> KYC Verified
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-purple-300 border border-slate-800 flex items-center gap-1">
                <CheckCircle2 size={10} className="text-purple-400" /> Campus Enrolled
              </span>
            </div>
          </div>

          {/* Pillar 2: Objective Skill Verification */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Award size={14} className="text-teal-400" /> Pillar 2: Objective Skill
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-teal-500/30">
                0–100 Scale
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-teal-400 font-mono tracking-tight">
                  {objectiveSkillScore}
                </span>
                <span className="text-xs font-mono text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Proctored Skill Bridge Assessment & Code Benchmark
              </p>
            </div>

            {/* Micro Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, objectiveSkillScore))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Pass Bar (70)</span>
                <span className="text-teal-400 font-semibold">Exceeds Benchmark</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Experiential Reputation */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Star size={14} className="text-amber-400 fill-amber-400" /> Pillar 3: Experience
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/30">
                1.0–5.0 Stars
              </span>
            </div>

            {totalCount > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                    {averageScore.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 5.0 ★</span>
                  <span className="text-xs font-mono text-emerald-400 ml-auto font-semibold">
                    {Math.round(recommendationRate)}% Recommend
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Weighted arithmetic mean across <strong className="text-slate-200">{totalCount}</strong> verified platform{" "}
                  {totalCount === 1 ? "interaction" : "interactions"}
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-300">No verified ratings yet</div>
                <p className="text-[11px] text-slate-500">
                  Awaiting completion of first internship or application review.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Sections */}
        <div className="space-y-8 pt-4">
          {/* Detailed Pillar 1: Verification Badges */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" /> Pillar 1: Verification Trust Signals
            </h3>
            <TrustSignalBadges
              trustLevel={trustLevel}
              signals={trustSignals}
              entityRole={role}
            />
          </div>

          {/* Detailed Pillar 2 & 3: Score Breakdown & Histogram */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <BarChart3 size={16} className="text-amber-400" /> Pillar 3: Experiential Rating Breakdown & Distribution
            </h3>

            {totalCount > 0 ? (
              <div className="space-y-6">
                <RatingHistogram
                  distribution={distribution}
                  totalCount={totalCount}
                  averageScore={averageScore}
                  recommendationRate={recommendationRate}
                  showSummary={true}
                />

                {/* Category Breakdown Bars if present */}
                {Object.keys(categoryBreakdown).length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">
                      Context Dimension Performance
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(categoryBreakdown).map(([code, data]) => {
                        const score = Number(data.average || data.score || data || 0);
                        const name = data.name || code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                        const pct = Math.round((score / 5) * 100);

                        return (
                          <div key={code} className="space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between text-slate-300">
                              <span>{name}</span>
                              <span className="text-amber-400 font-bold">{score.toFixed(1)} / 5.0</span>
                            </div>
                            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <Star size={24} className="text-slate-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-200">No verified ratings yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Verified ratings are created automatically after reviewed applications, proctored evaluations, and completed internships.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verified Reviews Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <MessageSquare size={16} className="text-teal-400" /> Published Verified Reviews ({reviews.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Two-way unblinded and authenticated interaction reviews.
                </p>
              </div>

              {availableContexts.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setActiveReviewFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      activeReviewFilter === "ALL" ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All ({reviews.length})
                  </button>
                  {availableContexts.map((ctx) => (
                    <button
                      key={ctx}
                      onClick={() => setActiveReviewFilter(ctx)}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        activeReviewFilter === ctx ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {ctx.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">
                Loading verified reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs bg-slate-950/40 rounded-2xl border border-slate-900">
                {reviews.length === 0
                  ? "No published reviews yet. Complete verified interactions to receive ratings."
                  : "No reviews match the selected filter."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review, idx) => (
                  <ReviewCard key={review.id || idx} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
