'use client';

/**
 * Skill Bridge Platform - Admin Question Bank Management & AI Review Dashboard
 * File: app/admin/questions/page.jsx
 */

import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, Sparkles, Check, X, Search, Filter, ShieldAlert } from 'lucide-react';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSkill, setFilterSkill] = useState('ALL');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSkill, setAiSkill] = useState('skill_javascript');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAi() {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_AI', skillId: aiSkill, difficulty: aiDifficulty }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAiModal(false);
        fetchQuestions();
      }
    } catch (e) {
      alert('Error generating AI question');
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateStatus(question, newStatus) {
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionData: { ...question, status: newStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      }
    } catch (e) {
      alert('Failed to update question status');
    }
  }

  const filteredQuestions = questions.filter(q => {
    if (filterSkill !== 'ALL' && q.skillId !== filterSkill) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-cyan-400" />
            Admin Question Bank & AI Review
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage assessment question pools, review AI-generated question drafts, set difficulty weights, and approve questions for live verification.
          </p>
        </div>

        <button
          onClick={() => setShowAiModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2 text-yellow-300" /> Generate AI Question Draft
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center space-x-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Filter by Skill:</span>
        <select
          value={filterSkill}
          onChange={e => setFilterSkill(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Skills</option>
          <option value="skill_javascript">JavaScript</option>
          <option value="skill_python">Python</option>
          <option value="skill_sql">SQL</option>
          <option value="skill_react">React</option>
        </select>
      </div>

      {/* Question Cards List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading question bank...</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          No questions found in this pool.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map(q => (
            <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                      {q.skillId.replace('skill_', '').toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {q.difficulty} ({q.points} pt)
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {q.questionType}
                    </span>
                    {q.isAiGenerated && (
                      <span className="text-xs font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-300" /> AI Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-medium text-white pt-1">{q.question}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  {q.status === 'PUBLISHED' ? (
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-full">
                      ✓ Published
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(q, 'PUBLISHED')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Publish
                    </button>
                  )}
                </div>
              </div>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border ${
                        opt === q.correctAnswer
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'border-slate-800/60 text-slate-400'
                      }`}
                    >
                      {opt} {opt === q.correctAnswer && '✓ (Correct)'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Draft Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Generate AI Question Draft
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Target Skill</label>
                <select
                  value={aiSkill}
                  onChange={e => setAiSkill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2"
                >
                  <option value="skill_javascript">JavaScript</option>
                  <option value="skill_python">Python</option>
                  <option value="skill_sql">SQL</option>
                  <option value="skill_react">React</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Target Difficulty</label>
                <select
                  value={aiDifficulty}
                  onChange={e => setAiDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAi}
                disabled={generating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
