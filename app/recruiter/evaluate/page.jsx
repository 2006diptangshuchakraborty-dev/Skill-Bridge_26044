"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Award, Send, CheckCircle2 } from "lucide-react";

export default function RecruiterEvaluatePage() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("std_001");
  const [evaluatedSkill, setEvaluatedSkill] = useState("SQL");
  const [technicalRating, setTechnicalRating] = useState(4);
  const [feedback, setFeedback] = useState("Demonstrated strong industry capability during project deliverables.");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error("Fetch students error:", err);
      }
    }
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      // Elevate skill evidence level to Level 5 (Industry Verified)
      const updatedSkills = student.skills.map(s => {
        if (s.name.toLowerCase() === evaluatedSkill.toLowerCase()) {
          return {
            ...s,
            evidenceLevel: 5,
            evidence: `Industry Verified Project (${evaluatedSkill})`,
            confidenceScore: Math.min(100, s.confidenceScore + 15),
            isIndustryVerified: true
          };
        }
        return s;
      });

      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStudentId,
          skills: updatedSkills
        })
      });

      if (res.ok) {
        setSuccessMsg(`Successfully evaluated ${student.name}! Skill '${evaluatedSkill}' upgraded to Level 5 (Industry Verified).`);
      }
    } catch (err) {
      console.error("Evaluation submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck size={14} /> Employer Feedback Loop
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Post-Internship Candidate Evaluation</h1>
        <p className="text-xs text-slate-400">
          Evaluations update student skill confidence scores and elevate evidence to <strong className="text-emerald-400">Level 5 (Industry Verified)</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Select Candidate</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Target Skill to Verify</label>
            <input
              type="text"
              value={evaluatedSkill}
              onChange={(e) => setEvaluatedSkill(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Technical Performance Rating (1 to 5)</label>
            <select
              value={technicalRating}
              onChange={(e) => setTechnicalRating(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value={5}>5 — Exceptional / Industry Expert</option>
              <option value={4}>4 — Exceeds Expectations (Level 5 Industry Verified)</option>
              <option value={3}>3 — Meets Expectations</option>
              <option value={2}>2 — Developing</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Employer Qualitative Feedback</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
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
          <Send size={16} /> {submitting ? "Submitting Evaluation..." : "Submit Evaluation & Verify Skill (Level 5)"}
        </button>
      </form>
    </div>
  );
}
