"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function InstituteSkillGapsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch (err) {
        console.error("Error fetching skill gap alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-slate-400 font-mono text-xs">Computing aggregated institute skill gap alerts...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <AlertTriangle size={14} /> Privacy-Preserving Industry Skill Gap Intelligence
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Aggregated Skill Gap Notifications</h1>
        <p className="text-xs text-slate-400">
          Identifies common missing preferred skills among eligible candidate cohorts to drive targeted faculty workshops. Zero personal PII is exposed.
        </p>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  {alert.department}
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">{alert.opportunityTitle}</h3>
                <p className="text-xs text-slate-400">Posted by {alert.companyName}</p>
              </div>

              <div className="text-right font-mono bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
                <div className="text-slate-400 text-[10px] uppercase">Eligible Students</div>
                <div className="text-emerald-400 font-bold text-sm">{alert.eligibleStudentsCount}</div>
                <div className="text-slate-400 text-[10px] uppercase mt-1">Partial Preferred Matches</div>
                <div className="text-amber-400 font-bold text-sm">{alert.partialMatchStudentsCount}</div>
              </div>
            </div>

            {/* Aggregated Missing Skill Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Common Preferred Skill Gaps Identified:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alert.commonMissingSkills?.map((skill, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span>{skill.skillName}</span>
                      <span className="font-mono text-amber-400">{skill.affectedStudentsCount} Students ({skill.percentageOfEligible}%)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Missing as a preferred requirement in candidate cohort</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action & 1-Click Workshop Creator */}
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-purple-300 font-bold block">Recommended Institute Action:</span>
                <p className="text-slate-300 text-[11px]">{alert.recommendedAction}</p>
              </div>

              <Link
                href={`/institute/training?skill=${encodeURIComponent(alert.topSkillGap)}`}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <BookOpen size={14} /> Create Training Program <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
