"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Send, CheckCircle2, AlertTriangle, Building2, Calendar } from "lucide-react";
import StatusPill from "../../../components/shared/StatusPill";

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const personaId = localStorage.getItem("sih_active_student_id") || "std_001";
      const res = await fetch(`/api/applications?studentId=${personaId}`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Error loading applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const handlePersonaChange = () => {
      loadApplications();
    };

    window.addEventListener("sih_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("sih_persona_changed", handlePersonaChange);
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-slate-400 font-mono text-xs">Loading submitted applications...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Send className="text-emerald-400" /> Submitted Applications & Status Tracker
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track submitted opportunity applications and verification scorecards.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <p className="text-slate-400 text-sm">You have not submitted any applications yet.</p>
          <Link
            href="/student/opportunities"
            className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Browse Eligible Opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <StatusPill status={app.matchStatus} isEligible={true} />
                  <h3 className="text-lg font-bold text-slate-100 mt-2">{app.opportunityTitle}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <Building2 size={13} className="text-emerald-400" /> {app.companyName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-500" /> Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">High Priority Match</div>
                  <div className="text-emerald-400 font-bold text-sm">{app.highPriorityMatchPct}% ✓</div>
                  <div className="text-[10px] text-slate-400 uppercase mt-1">Preferred Match</div>
                  <div className="text-amber-400 font-bold text-sm">{app.lowPriorityMatchPct}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
