"use client";

import React from "react";
import { Star, ThumbsUp, Users, TrendingUp } from "lucide-react";

/**
 * RatingHistogram Component
 * Displays 1.0 to 5.0 star breakdown bar chart with counts, percentages,
 * average score summary, and recommendation rate %.
 */
export default function RatingHistogram({
  distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  totalCount = 0,
  averageScore = 0,
  recommendationRate = 0,
  showSummary = true,
  className = "",
}) {
  const normDist = {
    "5": distribution?.["5"] || distribution?.[5] || 0,
    "4": distribution?.["4"] || distribution?.[4] || 0,
    "3": distribution?.["3"] || distribution?.[3] || 0,
    "2": distribution?.["2"] || distribution?.[2] || 0,
    "1": distribution?.["1"] || distribution?.[1] || 0,
  };

  const calculatedTotal =
    totalCount > 0
      ? totalCount
      : normDist["5"] + normDist["4"] + normDist["3"] + normDist["2"] + normDist["1"];

  const barColors = {
    "5": "bg-emerald-500",
    "4": "bg-teal-500",
    "3": "bg-amber-500",
    "2": "bg-orange-500",
    "1": "bg-rose-500",
  };

  const stars = ["5", "4", "3", "2", "1"];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Score Summary Card */}
        {showSummary && (
          <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Verified Experience Rating
            </span>

            {calculatedTotal > 0 ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-100 font-mono tracking-tight">
                    {Number(averageScore).toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
                </div>

                {/* 5-Star Visual Row */}
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fillAmount = Math.max(
                      0,
                      Math.min(1, Number(averageScore) - (star - 1))
                    );
                    return (
                      <div key={star} className="relative">
                        <Star size={16} className="text-slate-700" />
                        {fillAmount > 0 && (
                          <div
                            className="absolute inset-0 overflow-hidden text-amber-400"
                            style={{ width: `${fillAmount * 100}%` }}
                          >
                            <Star size={16} fill="currentColor" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs font-mono text-slate-400 pt-1">
                  Based on <span className="text-emerald-400 font-bold">{calculatedTotal}</span> verified{" "}
                  {calculatedTotal === 1 ? "review" : "reviews"}
                </div>

                {/* Recommendation Rate Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 mt-1">
                  <ThumbsUp size={12} className="text-emerald-400" />
                  <span>{Math.round(recommendationRate)}% Recommend</span>
                </div>
              </>
            ) : (
              <div className="py-4 space-y-2">
                <div className="text-sm font-semibold text-slate-300">No verified ratings yet</div>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Experience ratings will appear once platform interactions (applications, interviews, internships, courses) are completed and verified.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Right Histogram Distribution Bars */}
        <div className={`${showSummary ? "md:col-span-7" : "md:col-span-12"} space-y-2`}>
          {stars.map((star) => {
            const count = normDist[star];
            const pct = calculatedTotal > 0 ? Math.round((count / calculatedTotal) * 100) : 0;
            const barBg = barColors[star] || "bg-emerald-500";

            return (
              <div key={star} className="flex items-center gap-3 text-xs font-mono">
                {/* Star Label */}
                <div className="flex items-center gap-1 w-12 text-slate-300 font-medium shrink-0">
                  <span>{star}</span>
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                </div>

                {/* Progress Bar Track */}
                <div className="flex-1 h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${barBg} transition-all duration-500 rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Count & Percentage */}
                <div className="w-16 text-right text-slate-400 shrink-0 text-[11px]">
                  <span className="text-slate-200 font-semibold">{count}</span>
                  <span className="text-slate-500 ml-1">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
