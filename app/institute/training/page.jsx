"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, Send } from "lucide-react";

function TrainingContent() {
  const searchParams = useSearchParams();
  const initialSkill = searchParams.get("skill") || "Machine Learning";

  const [title, setTitle] = useState(`Faculty Industry Workshop: ${initialSkill} Masterclass`);
  const [targetSkill, setTargetSkill] = useState(initialSkill);
  const [duration, setDuration] = useState("3 Days (12 Hours)");
  const [instructor, setInstructor] = useState("Dr. Rajesh Kumar (Industry Adjunct)");
  const [description, setDescription] = useState(
    `Comprehensive hands-on training workshop targeting preferred skill gaps in ${initialSkill}. Designed to elevate student proficiency to Intermediate (Level 3/4).`
  );
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    setTimeout(() => {
      setSuccessMsg(`Successfully created Training Program '${title}'! Affected students notified.`);
      setSubmitting(false);
    }, 600);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Program Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Target Skill Gap</label>
          <input
            type="text"
            value={targetSkill}
            onChange={(e) => setTargetSkill(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Instructor / Faculty Lead</label>
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Duration & Schedule</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Program Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 rounded-xl p-4 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" /> {successMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"
      >
        <Send size={16} /> {submitting ? "Publishing Program..." : "Publish Workshop & Notify Affected Students"}
      </button>
    </form>
  );
}

export default function InstituteTrainingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <BookOpen size={14} /> Faculty Action System
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Create Targeted Training Program</h1>
        <p className="text-xs text-slate-400">
          Transform identified industry skill gaps into active faculty workshops and upskilling modules.
        </p>
      </div>

      <Suspense fallback={<div className="text-xs font-mono text-slate-400 p-4">Loading training form...</div>}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
