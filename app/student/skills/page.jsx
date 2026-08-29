'use client';

/**
 * Skill Bridge Platform - Student Skill Dashboard
 * File: app/student/skills/page.jsx
 */

import React, { useState, useEffect } from 'react';
import { Award, Plus, Search, ShieldCheck, CheckCircle2, Clock, AlertCircle, ExternalLink, Code, Database, Globe, Cpu, ChevronRight } from 'lucide-react';

export default function StudentSkillsPage() {
  const [skills, setSkills] = useState([]);
  const [taxonomy, setTaxonomy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, VERIFIED, UNVERIFIED

  // Modal State for Claiming Skill
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selfRatedLevel, setSelfRatedLevel] = useState('Intermediate');
  const [yearsExp, setYearsExp] = useState('1');
  const [projectCount, setProjectCount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudentSkills();
  }, []);

  async function fetchStudentSkills() {
    try {
      const res = await fetch('/api/skills/claim');
      const data = await res.json();

      if (data.success) {
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to load student skills:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimSkill(e) {
    e.preventDefault();
    if (!selectedSkillId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/skills/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: selectedSkillId,
          selfRatedLevel,
          yearsExperience: parseFloat(yearsExp),
          projectCount: parseInt(projectCount, 10),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowClaimModal(false);
        fetchStudentSkills();
      }
    } catch (err) {
      alert('Error claiming skill');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartVerification(skillId, level) {
    try {
      const res = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, claimedLevel: level }),
      });
      const data = await res.json();

      if (data.success && data.attemptId) {
        window.location.href = `/student/assessments/${data.attemptId}`;
      } else {
        alert(data.error || 'Failed to start assessment');
      }
    } catch (err) {
      alert('Failed to start assessment session');
    }
  }

  const filteredSkills = skills.filter(s => {
    if (activeTab === 'VERIFIED') return s.status === 'VERIFIED';
    if (activeTab === 'UNVERIFIED') return s.status !== 'VERIFIED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-7 h-7 text-cyan-400" />
              Skill Verification Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Transform self-declared skill claims into Skill Bridge Verified credentials backed by objective assessments.
            </p>
          </div>

          <button
            onClick={() => setShowClaimModal(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Claim New Skill
          </button>
        </div>

        {/* Filters & Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80">
          {[
            { id: 'ALL', label: 'All Skills', count: skills.length },
            { id: 'VERIFIED', label: 'Verified Skills', count: skills.filter(s => s.status === 'VERIFIED').length },
            { id: 'UNVERIFIED', label: 'Unverified Claims', count: skills.filter(s => s.status !== 'VERIFIED').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label} <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Skill Cards Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading skill profiles...</div>
        ) : filteredSkills.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
            <Award className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No skills found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Claim a skill to start the Skill Bridge verification pipeline and prove your proficiency to top employers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map(skill => {
              const isVerified = skill.status === 'VERIFIED';
              return (
                <div
                  key={skill.skillId || skill.name}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{skill.category || 'Programming'}</span>
                        <h3 className="text-xl font-bold text-white">{skill.name}</h3>
                      </div>
                      {isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Unverified
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block">Proficiency Level</span>
                        <span className="font-semibold text-slate-200">{skill.level || skill.selfRatedLevel || 'Intermediate'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assessment Score</span>
                        <span className="font-semibold text-cyan-400">{skill.score ? `${skill.score} / 100` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    {isVerified && skill.verificationId ? (
                      <a
                        href={`/verify/${skill.verificationId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-medium text-cyan-400 hover:text-cyan-300"
                      >
                        View Verification Badge <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleStartVerification(skill.skillId || skill.name, skill.selfRatedLevel)}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow transition-all flex items-center justify-center"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Start Verification Assessment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Skill Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Claim Skill for Verification</h2>
            <form onSubmit={handleClaimSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Skill</label>
                <select
                  value={selectedSkillId}
                  onChange={e => setSelectedSkillId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Choose Skill --</option>
                  <option value="skill_javascript">JavaScript</option>
                  <option value="skill_python">Python</option>
                  <option value="skill_sql">SQL</option>
                  <option value="skill_react">React</option>
                  <option value="skill_postgresql">PostgreSQL</option>
                  <option value="skill_docker">Docker</option>
                  <option value="skill_data_analysis">Data Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Self-Rated Proficiency Level</label>
                <select
                  value={selfRatedLevel}
                  onChange={e => setSelfRatedLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Years Experience</label>
                  <input
                    type="number"
                    step="0.5"
                    value={yearsExp}
                    onChange={e => setYearsExp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Projects Built</label>
                  <input
                    type="number"
                    value={projectCount}
                    onChange={e => setProjectCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Skill Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
