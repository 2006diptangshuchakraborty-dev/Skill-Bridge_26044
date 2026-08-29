"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2, CheckCircle2, AlertTriangle, Building2, Send } from "lucide-react";

export default function CreateOpportunityPage() {
  const router = useRouter();

  const [title, setTitle] = useState("Data Analyst Intern");
  const [company, setCompany] = useState("XYZ Analytics");
  const [type, setType] = useState("Internship");
  const [location, setLocation] = useState("Bengaluru / Remote");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [stipend, setStipend] = useState("₹25,000 / month");
  const [applicationDeadline, setApplicationDeadline] = useState("2026-09-30");
  const [description, setDescription] = useState(
    "We are looking for a Data Analyst Intern with experience in Python, SQL, Excel and Power BI. Knowledge of Tableau and Machine Learning will be an advantage."
  );

  const [highPrioritySkills, setHighPrioritySkills] = useState([
    { name: "Python", requiredProficiency: 2 },
    { name: "SQL", requiredProficiency: 2 },
    { name: "Statistics", requiredProficiency: 2 },
    { name: "Data Analysis", requiredProficiency: 2 }
  ]);

  const [lowPrioritySkills, setLowPrioritySkills] = useState([
    { name: "Power BI", requiredProficiency: 2 },
    { name: "Tableau", requiredProficiency: 2 },
    { name: "Excel", requiredProficiency: 2 },
    { name: "Machine Learning", requiredProficiency: 2 }
  ]);

  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extractNotice, setExtractNotice] = useState(null);

  const handleAIExtract = async () => {
    setExtracting(true);
    setExtractNotice(null);
    try {
      const res = await fetch("/api/extract-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: description })
      });

      const data = await res.json();
      if (data.success) {
        const extracted = data.extracted;
        if (extracted.highPrioritySuggestions?.length > 0) {
          setHighPrioritySkills(
            extracted.highPrioritySuggestions.map(s => ({
              name: s.canonicalName,
              requiredProficiency: 2
            }))
          );
        }
        if (extracted.lowPrioritySuggestions?.length > 0) {
          setLowPrioritySkills(
            extracted.lowPrioritySuggestions.map(s => ({
              name: s.canonicalName,
              requiredProficiency: 2
            }))
          );
        }
        setExtractNotice(`AI Assistant extracted ${extracted.extractedCount} skills from JD into High & Low priority suggestion pools.`);
      }
    } catch (err) {
      console.error("AI Skill extraction error:", err);
    } finally {
      setExtracting(false);
    }
  };

  const addHighSkill = () => {
    setHighPrioritySkills([...highPrioritySkills, { name: "", requiredProficiency: 2 }]);
  };

  const removeHighSkill = (index) => {
    setHighPrioritySkills(highPrioritySkills.filter((_, i) => i !== index));
  };

  const addLowSkill = () => {
    setLowPrioritySkills([...lowPrioritySkills, { name: "", requiredProficiency: 2 }]);
  };

  const removeLowSkill = (index) => {
    setLowPrioritySkills(lowPrioritySkills.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        title,
        company,
        type,
        location,
        workMode,
        stipend,
        applicationDeadline,
        description,
        requiredSkills: highPrioritySkills.filter(s => s.name.trim() !== ""),
        preferredSkills: lowPrioritySkills.filter(s => s.name.trim() !== "")
      };

      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        router.push("/recruiter/dashboard");
      }
    } catch (err) {
      console.error("Submit opportunity error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
          <Building2 size={14} /> Recruiter Opportunity Creator
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Create Internship or Placement Role</h1>
        <p className="text-xs text-slate-400">
          Visually classify required skills into <strong className="text-emerald-400">High Priority (Mandatory)</strong> and <strong className="text-amber-400">Low Priority (Preferred)</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">
            Role & Compensation Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Role Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Company Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Opportunity Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="Internship">Internship</option>
                <option value="Placement">Placement (Full-Time)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Stipend / Salary</label>
              <input
                type="text"
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Application Deadline</label>
              <input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* AI Skill Extraction Assistant */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Job Description & AI Skill Extractor
              </h2>
              <p className="text-xs text-slate-400">
                Paste raw JD text to automatically suggest High vs Low priority skill classification.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAIExtract}
              disabled={extracting}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
              <Sparkles size={15} /> {extracting ? "Extracting..." : "Extract Skills with AI"}
            </button>
          </div>

          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
            placeholder="Paste job description text here..."
          />

          {extractNotice && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl p-3 text-xs font-mono">
              {extractNotice}
            </div>
          )}
        </div>

        {/* Priority Skill Classification Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 01: High Priority (Mandatory) */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5 uppercase">
                  <CheckCircle2 size={16} /> Section 01 — High Priority Skills
                </h3>
                <p className="text-[11px] text-slate-400">Mandatory (100% match required for eligibility)</p>
              </div>
              <button
                type="button"
                onClick={addHighSkill}
                className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="space-y-2">
              {highPrioritySkills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Skill Name (e.g. Python)"
                    value={skill.name}
                    onChange={(e) => {
                      const updated = [...highPrioritySkills];
                      updated[idx].name = e.target.value;
                      setHighPrioritySkills(updated);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={skill.requiredProficiency}
                    onChange={(e) => {
                      const updated = [...highPrioritySkills];
                      updated[idx].requiredProficiency = parseInt(e.target.value, 10);
                      setHighPrioritySkills(updated);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300"
                  >
                    <option value={1}>Beginner (1)</option>
                    <option value={2}>Intermediate (2)</option>
                    <option value={3}>Advanced (3)</option>
                    <option value={4}>Expert (4)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeHighSkill(idx)}
                    className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 02: Low Priority (Preferred) */}
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-amber-400 text-sm flex items-center gap-1.5 uppercase">
                  <AlertTriangle size={16} /> Section 02 — Low Priority Skills
                </h3>
                <p className="text-[11px] text-slate-400">Preferred (Partial matching allowed)</p>
              </div>
              <button
                type="button"
                onClick={addLowSkill}
                className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="space-y-2">
              {lowPrioritySkills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Skill Name (e.g. Power BI)"
                    value={skill.name}
                    onChange={(e) => {
                      const updated = [...lowPrioritySkills];
                      updated[idx].name = e.target.value;
                      setLowPrioritySkills(updated);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={skill.requiredProficiency}
                    onChange={(e) => {
                      const updated = [...lowPrioritySkills];
                      updated[idx].requiredProficiency = parseInt(e.target.value, 10);
                      setLowPrioritySkills(updated);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300"
                  >
                    <option value={1}>Beginner (1)</option>
                    <option value={2}>Intermediate (2)</option>
                    <option value={3}>Advanced (3)</option>
                    <option value={4}>Expert (4)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLowSkill(idx)}
                    className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"
        >
          <Send size={18} /> {submitting ? "Publishing Opportunity..." : "Publish Priority-Aware Opportunity"}
        </button>
      </form>
    </div>
  );
}
