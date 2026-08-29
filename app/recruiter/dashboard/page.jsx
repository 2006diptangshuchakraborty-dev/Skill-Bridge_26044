"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, Users, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Sparkles } from "lucide-react";

export default function RecruiterDashboardPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [oppRes, stdRes] = await Promise.all([
          fetch("/api/opportunities"),
          fetch("/api/students")
        ]);
        const oppData = await oppRes.json();
        const stdData = await stdRes.json();
        setOpportunities(oppData.opportunities || []);
        setStudents(stdData.students || []);
      } catch (err) {
        console.error("Error loading recruiter dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-slate-400 font-mono text-xs">Loading Industry Recruiter Console...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 size={14} /> Industry Recruiter & Employer Console
          </div>
          <h1 className="text-3xl font-bold text-slate-100">XYZ Analytics & Employer Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Define mandatory vs preferred skill requirements with 100% High Priority gating & AI JD skill extraction.
          </p>
        </div>

        <Link
          href="/recruiter/jobs/create"
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={16} /> Post New Opportunity (High/Low Priority Skills)
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400">Active Postings</span>
          <div className="text-3xl font-black text-slate-100 font-mono">{opportunities.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400">Total Talent Pool</span>
          <div className="text-3xl font-black text-blue-400 font-mono">{students.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400">Mandatory Gatekeeper</span>
          <div className="text-xs font-bold text-emerald-400">100% High Priority Match Required</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-slate-400">Post-Internship Eval</span>
          <div className="text-xs font-bold text-purple-400">Level 5 Industry Verified</div>
        </div>
      </div>

      {/* Active Roles Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="text-blue-400" /> Published Opportunities & Priority Requirements
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    {opp.type}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">{opp.title}</h3>
                  <p className="text-xs text-slate-400">{opp.company} • {opp.location} ({opp.workMode})</p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/recruiter/candidates?opportunityId=${opp.id}`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5"
                  >
                    <Users size={14} /> View Candidates
                  </Link>
                </div>
              </div>

              {/* Priority Skill Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> High Priority Mandatory Skills (100% Gate)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.requiredSkills?.map((s, i) => (
                      <span key={i} className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded text-[11px] font-mono border border-emerald-500/30">
                        {typeof s === "string" ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-amber-500/20 space-y-1.5">
                  <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> Low Priority Preferred Skills (Partial Allowed)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.preferredSkills?.map((s, i) => (
                      <span key={i} className="bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded text-[11px] font-mono border border-amber-500/30">
                        {typeof s === "string" ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
