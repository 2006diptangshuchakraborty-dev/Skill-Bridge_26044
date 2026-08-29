'use client';

/**
 * Skill Bridge Platform - Distraction-Free Skill Assessment Runner
 * File: app/student/assessments/[attemptId]/page.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, ShieldAlert, Flag, CheckCircle2, Award, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

export default function AssessmentRunnerPage({ params }) {
  const attemptId = params?.attemptId;
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load attempt state
  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await fetch(`/api/assessments/${attemptId}`);
        const data = await res.json();

        if (data.success && data.attempt) {
          setAttempt(data.attempt);
          setUserAnswers(data.attempt.answers || {});

          // Calculate remaining seconds
          const expiry = new Date(data.attempt.expiresAt).getTime();
          const now = Date.now();
          const rem = Math.max(0, Math.floor((expiry - now) / 1000));
          setSecondsRemaining(rem);

          if (data.attempt.status === 'EVALUATED' || data.attempt.status === 'SUBMITTED') {
            // Already submitted
            triggerEvaluation();
          }
        }
      } catch (err) {
        console.error('Error loading attempt:', err);
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) {
      loadAttempt();
    }
  }, [attemptId]);

  // Timer countdown hook
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || result) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, result]);

  // Anti-cheating tab-switch / focus-loss listener
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || result) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        showToast('Tab switch detected! Integrity Risk Score updated.');
        recordEvent('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      showToast('Focus loss detected! Please keep window active.');
      recordEvent('FOCUS_LOSS');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attempt, result]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function recordEvent(eventType) {
    try {
      await fetch(`/api/assessments/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECORD_EVENT', eventType }),
      });
    } catch (e) {
      // silent
    }
  }

  async function handleSelectAnswer(questionId, answer) {
    const newAns = { ...userAnswers, [questionId]: { answer } };
    setUserAnswers(newAns);

    try {
      await fetch(`/api/assessments/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECORD_ANSWER', questionId, answer }),
      });
    } catch (e) {
      // silent fallback
    }
  }

  async function handleAutoSubmit() {
    showToast('Time expired! Submitting assessment automatically...');
    handleSubmitAttempt();
  }

  async function handleSubmitAttempt() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success && data.result) {
        setResult(data.result);
      } else {
        alert(data.error || 'Failed to submit assessment');
      }
    } catch (err) {
      alert('Error submitting assessment');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-6 font-sans">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium">Initializing Distraction-Free Assessment Runner...</span>
        </div>
      </div>
    );
  }

  if (result) {
    // Render Post-Assessment Evaluation Summary
    const { verification, breakdown, recommendations } = result;
    const isVerified = verification.status === 'VERIFIED';

    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 font-sans flex items-center justify-center">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-3">
            <div className="inline-block p-4 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30">
              <Award className="w-12 h-12 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{attempt.skillName} Verification Results</h1>
            <p className="text-slate-400 text-sm">Official Skill Bridge Assessment Evaluation</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-xs text-slate-500 block">Overall Score</span>
              <span className="text-2xl font-extrabold text-white">{verification.overallScore} <span className="text-xs font-normal text-slate-400">/ 100</span></span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Verified Level</span>
              <span className="text-2xl font-extrabold text-cyan-400">{verification.level}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 block">Verification Status</span>
              <span className={`text-lg font-bold ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isVerified ? '✓ VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
          </div>

          {/* Dimension Breakdown */}
          {breakdown && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dimension Performance</h3>
              <div className="space-y-2">
                {Object.entries(breakdown).map(([dim, pct]) => (
                  <div key={dim} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{dim}</span>
                      <span className="text-cyan-400 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">AI Upskilling Recommendations</h4>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 flex justify-between items-center border-t border-slate-800">
            <a href="/student/skills" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors">
              Return to My Skills
            </a>
            {isVerified && verification.id && (
              <a href={`/verify/${verification.id}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition-colors">
                View Official Verification Badge
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = attempt.questions[currentIdx];
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-6 font-sans flex flex-col justify-between">
      {/* Toast Warning */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-amber-500 text-slate-950 font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm z-50 animate-bounce">
          <ShieldAlert className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Runner Header */}
      <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Skill Bridge Verification</span>
          <h2 className="text-lg font-bold text-white">{attempt.skillName} Assessment</h2>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-200 font-mono text-sm">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{timeFormatted}</span>
          </div>

          <button
            onClick={() => handleSubmitAttempt()}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? 'Evaluating...' : 'Submit Assessment'}
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 my-6 shadow-2xl flex-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <span className="text-xs font-medium text-slate-400">
            Question <span className="text-cyan-400 font-bold">{currentIdx + 1}</span> of {attempt.questions.length}
          </span>
          <span className="text-xs font-medium text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Dimension: <span className="text-slate-200">{currentQ.dimension}</span>
          </span>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white leading-relaxed whitespace-pre-wrap">{currentQ.question}</h3>

          {/* Options / Code Input */}
          {currentQ.options && currentQ.options.length > 0 ? (
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, i) => {
                const selected = userAnswers[currentQ.id]?.answer === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAnswer(currentQ.id, opt)}
                    className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all ${
                      selected
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="inline-block w-6 text-slate-500 font-mono">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              rows={6}
              value={userAnswers[currentQ.id]?.answer || ''}
              onChange={e => handleSelectAnswer(currentQ.id, e.target.value)}
              placeholder="Enter your solution code or text response here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          )}
        </div>
      </div>

      {/* Runner Footer Controls */}
      <div className="max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(prev => prev - 1)}
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </button>

        <span className="text-xs text-slate-500">
          Answered {Object.keys(userAnswers).length} / {attempt.questions.length}
        </span>

        <button
          disabled={currentIdx === attempt.questions.length - 1}
          onClick={() => setCurrentIdx(prev => prev + 1)}
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium rounded-xl transition-colors"
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
