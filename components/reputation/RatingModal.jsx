"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  Lock,
  EyeOff,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";

/**
 * Standard Context-Specific Category Taxonomy
 */
const DEFAULT_CONTEXT_CATEGORIES = {
  APPLICATION_REVIEW: [
    { code: "APPLICATION_QUALITY", name: "Application Quality", weight: 0.25, description: "Structure, clarity, and portfolio relevance" },
    { code: "SKILL_RELEVANCE", name: "Skill Relevance", weight: 0.25, description: "Alignment with job requirements and core stack" },
    { code: "COMMUNICATION", name: "Communication", weight: 0.20, description: "Responsiveness, clarity, and articulation" },
    { code: "PROFESSIONALISM", name: "Professionalism", weight: 0.15, description: "Conduct, preparedness, and reliability" },
    { code: "OVERALL_IMPRESSION", name: "Overall Impression", weight: 0.15, description: "Holistic evaluation of candidate suitability" },
  ],
  INTERVIEW_FEEDBACK: [
    { code: "TECHNICAL_DEPTH", name: "Technical Depth", weight: 0.25, description: "Conceptual understanding and problem-solving mastery" },
    { code: "PROBLEM_SOLVING", name: "Problem Solving", weight: 0.25, description: "Analytical reasoning and algorithmic approach" },
    { code: "COMMUNICATION", name: "Communication & Articulation", weight: 0.20, description: "Clarity of explanation and discussion" },
    { code: "PUNCTUALITY", name: "Punctuality & Preparedness", weight: 0.15, description: "Time management and interview readiness" },
    { code: "CULTURE_FIT", name: "Culture & Collaboration", weight: 0.15, description: "Teamwork potential and values alignment" },
  ],
  TASK_EVALUATION: [
    { code: "CODE_QUALITY", name: "Code Quality & Cleanliness", weight: 0.25, description: "Clean code principles, formatting, and maintainability" },
    { code: "ARCHITECTURE", name: "Architecture & Design", weight: 0.25, description: "System design patterns and modular structure" },
    { code: "SPEED_DELIVERY", name: "Speed of Delivery", weight: 0.20, description: "Execution speed and milestone adherence" },
    { code: "DOCUMENTATION", name: "Documentation", weight: 0.15, description: "Code comments, README, and API specs" },
    { code: "ACCURACY", name: "Requirement Accuracy", weight: 0.15, description: "Test coverage and specification completeness" },
  ],
  INTERNSHIP_PERFORMANCE: [
    { code: "WORK_ETHIC", name: "Work Ethic & Dedication", weight: 0.25, description: "Ownership, dependability, and diligence" },
    { code: "TECHNICAL_EXECUTION", name: "Technical Execution", weight: 0.25, description: "Quality of shipped deliverables and bug rate" },
    { code: "TEAMWORK", name: "Teamwork & Collaboration", weight: 0.20, description: "Cross-functional synergy and communication" },
    { code: "LEARNING_AGILITY", name: "Learning Agility", weight: 0.15, description: "Speed of onboarding new tools and concepts" },
    { code: "INITIATIVE", name: "Initiative & Proactivity", weight: 0.15, description: "Self-driven problem solving and innovation" },
  ],
  COURSE_EVALUATION: [
    { code: "CURRICULUM_DEPTH", name: "Curriculum Depth & Rigor", weight: 0.25, description: "Syllabus contemporariness and academic quality" },
    { code: "INSTRUCTOR_QUALITY", name: "Instructor Guidance & Quality", weight: 0.25, description: "Pedagogical clarity and mentorship availability" },
    { code: "PRACTICAL_APPLICATION", name: "Practical Application", weight: 0.20, description: "Hands-on lab work and real-world project scope" },
    { code: "RESOURCE_AVAILABILITY", name: "Resource Availability", weight: 0.15, description: "Access to tools, libraries, and lab infrastructure" },
    { code: "CAREER_IMPACT", name: "Career Impact", weight: 0.15, description: "Employability enhancement and skill relevance" },
  ],
  SEMINAR_FEEDBACK: [
    { code: "CONTENT_QUALITY", name: "Content Quality", weight: 0.30, description: "Relevance, originality, and actionable takeaways" },
    { code: "SPEAKER_EXPERTISE", name: "Speaker Expertise", weight: 0.30, description: "Domain mastery and engaging presentation delivery" },
    { code: "ORGANIZATION", name: "Event Organization", weight: 0.20, description: "Pacing, logistics, and technical stability" },
    { code: "INTERACTION", name: "Audience Interaction", weight: 0.20, description: "Q&A depth and participant engagement" },
  ],
};

const SCORE_LABELS = {
  1: "1 — Unsatisfactory",
  2: "2 — Developing",
  3: "3 — Proficient",
  4: "4 — Advanced",
  5: "5 — Exceptional",
};

/**
 * RatingModal Component
 * Interactive rating modal for submitting verified platform reviews.
 */
export default function RatingModal({
  isOpen = false,
  onClose,
  interaction = null,
  onSubmit = null,
  onSuccess = null,
}) {
  const [scores, setScores] = useState({});
  const [hoveredStars, setHoveredStars] = useState({});
  const [recommendation, setRecommendation] = useState("RECOMMENDED");
  const [headline, setHeadline] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [pros, setPros] = useState([]);
  const [cons, setCons] = useState([]);
  const [currentPro, setCurrentPro] = useState("");
  const [currentCon, setCurrentCon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Determine context and category taxonomy
  const contextType = interaction?.interactionType || interaction?.contextType || "APPLICATION_REVIEW";
  const targetRole = String(interaction?.targetRole || "STUDENT").toUpperCase();
  const isBlind = Boolean(interaction?.isBlind);
  const deadline = interaction?.deadline;

  const categories =
    interaction?.allowedCategories && interaction.allowedCategories.length > 0
      ? interaction.allowedCategories
      : DEFAULT_CONTEXT_CATEGORIES[contextType] || DEFAULT_CONTEXT_CATEGORIES.APPLICATION_REVIEW;

  // Initialize category default scores
  useEffect(() => {
    if (interaction && categories) {
      const initialScores = {};
      categories.forEach((cat) => {
        initialScores[cat.code] = scores[cat.code] || 5;
      });
      setScores(initialScores);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [interaction]);

  if (!isOpen || !interaction) return null;

  // Calculate live weighted score
  const calculateWeightedScore = () => {
    let totalWeight = 0;
    let weightedSum = 0;
    categories.forEach((cat) => {
      const score = Number(scores[cat.code] || 5);
      const weight = Number(cat.weight || (1 / categories.length));
      totalWeight += weight;
      weightedSum += score * weight;
    });
    if (totalWeight === 0) return 5.0;
    return (weightedSum / totalWeight).toFixed(2);
  };

  const currentWeightedScore = calculateWeightedScore();

  // Handlers for Pros & Cons tags
  const handleAddPro = (e) => {
    if (e) e.preventDefault();
    if (currentPro.trim()) {
      if (!pros.includes(currentPro.trim())) {
        setPros([...pros, currentPro.trim()]);
      }
      setCurrentPro("");
    }
  };

  const handleRemovePro = (indexToRemove) => {
    setPros(pros.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCon = (e) => {
    if (e) e.preventDefault();
    if (currentCon.trim()) {
      if (!cons.includes(currentCon.trim())) {
        setCons([...cons, currentCon.trim()]);
      }
      setCurrentCon("");
    }
  };

  const handleRemoveCon = (indexToRemove) => {
    setCons(cons.filter((_, idx) => idx !== indexToRemove));
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    for (const cat of categories) {
      const score = scores[cat.code];
      if (!score || score < 1 || score > 5) {
        setErrorMessage(`Please provide a rating (1-5) for ${cat.name}.`);
        return;
      }
    }

    if (!recommendation) {
      setErrorMessage("Please select a recommendation option.");
      return;
    }

    const payload = {
      interactionId: interaction.interactionId || interaction.id,
      contextType,
      targetUserId: interaction.targetUserId || interaction.targetEntityId,
      targetEntityId: interaction.targetEntityId || interaction.targetUserId,
      targetRole,
      scores,
      recommendation,
      headline: headline.trim(),
      reviewText: reviewText.trim(),
      pros,
      cons,
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        const res = await onSubmit(payload);
        setSuccessMessage("Rating submitted successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess(res);
          onClose();
        }, 1200);
      } else {
        const response = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to submit verified rating.");
        }

        setSuccessMessage(data.message || "Verified rating submitted successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess(data);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("[RatingModal Submission Error]:", err);
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const targetName =
    interaction.targetName ||
    interaction.targetEntityName ||
    interaction.metadata?.targetName ||
    (targetRole === "STUDENT" ? "Student Candidate" : targetRole === "INDUSTRY" ? "Industry Employer" : "Institute Faculty");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Verified Platform Review
              </span>
              {isBlind && (
                <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                  <Lock size={11} /> Blind Review
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              Submit Verified Rating for <span className="text-emerald-400">{targetName}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Context: <span className="text-slate-200 font-medium">{contextType.replace(/_/g, " ")}</span> • Target:{" "}
              <span className="text-slate-200 font-mono">{targetRole}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Blind Review Notice Banner */}
        {isBlind && (
          <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-4 flex items-start gap-3 text-xs">
            <EyeOff className="text-purple-400 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <div className="font-bold text-purple-200">Two-Way Blind Review Active</div>
              <p className="text-purple-300/80 text-[11px] leading-relaxed">
                Your ratings and feedback will remain completely confidential and sealed until both parties have submitted their reviews or the rating deadline passes. This eliminates retaliatory scoring.
              </p>
            </div>
          </div>
        )}

        {/* Deadline Alert */}
        {deadline && (
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400">
            <Clock size={14} className="text-amber-400" />
            <span>Rating Window Closes: <strong className="text-slate-200">{new Date(deadline).toLocaleString()}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Contextual Category Ratings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                1. Context Dimension Scores (1–5 Stars)
              </h3>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                Weighted Score: <strong className="text-sm font-bold">{currentWeightedScore}</strong> / 5.0
              </div>
            </div>

            <div className="space-y-3">
              {categories.map((cat) => {
                const currentScore = scores[cat.code] || 5;
                const hovered = hoveredStars[cat.code] || 0;
                const activeStarCount = hovered || currentScore;
                const weightPct = Math.round((cat.weight || (1 / categories.length)) * 100);

                return (
                  <div
                    key={cat.code}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-sm">{cat.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {weightPct}% weight
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>

                      {/* Interactive Stars */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setScores({ ...scores, [cat.code]: star })}
                              onMouseEnter={() =>
                                setHoveredStars({ ...hoveredStars, [cat.code]: star })
                              }
                              onMouseLeave={() =>
                                setHoveredStars({ ...hoveredStars, [cat.code]: 0 })
                              }
                              className="p-1 rounded-md text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                            >
                              <Star
                                size={22}
                                className={
                                  star <= activeStarCount
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-700"
                                }
                              />
                            </button>
                          ))}
                        </div>

                        <span className="w-28 text-right text-xs font-mono font-semibold text-slate-300">
                          {SCORE_LABELS[activeStarCount] || `${activeStarCount} / 5`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Recommendation Choice */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              2. Recommendation Verdict
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRecommendation("RECOMMENDED")}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  recommendation === "RECOMMENDED"
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`p-2 rounded-xl ${recommendation === "RECOMMENDED" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                  <ThumbsUp size={16} />
                </div>
                <div>
                  <div className="font-bold text-xs">Recommended</div>
                  <div className="text-[10px] opacity-75">Strong endorsement</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("NEUTRAL")}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  recommendation === "NEUTRAL"
                    ? "bg-slate-800 border-slate-500 text-slate-100"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`p-2 rounded-xl ${recommendation === "NEUTRAL" ? "bg-slate-300 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                  <Minus size={16} />
                </div>
                <div>
                  <div className="font-bold text-xs">Neutral</div>
                  <div className="text-[10px] opacity-75">Met baseline criteria</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("NOT_RECOMMENDED")}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  recommendation === "NOT_RECOMMENDED"
                    ? "bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-500/10"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`p-2 rounded-xl ${recommendation === "NOT_RECOMMENDED" ? "bg-rose-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                  <ThumbsDown size={16} />
                </div>
                <div>
                  <div className="font-bold text-xs">Not Recommended</div>
                  <div className="text-[10px] opacity-75">Gaps in delivery</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Written Narrative */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              3. Qualitative Review & Feedback
            </h3>

            {/* Headline */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Review Headline <span className="text-slate-500 font-normal">(Short summary)</span>
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Exceptional problem solver with strong database optimization skills"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={120}
              />
            </div>

            {/* Review Body */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Detailed Feedback & Observations
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                placeholder="Describe specific milestones, key strengths, code deliverables, or collaboration experiences during this interaction..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={1000}
              />
              <div className="text-[10px] font-mono text-right text-slate-500">
                {reviewText.length} / 1000 characters
              </div>
            </div>

            {/* Pros & Cons Tag Lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pros */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <label className="block text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 size={13} /> Key Strengths / Pros
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentPro}
                    onChange={(e) => setCurrentPro(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddPro(e);
                    }}
                    placeholder="e.g. Fast turnaround"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPro}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {pros.map((pro, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                    >
                      + {pro}
                      <button
                        type="button"
                        onClick={() => handleRemovePro(idx)}
                        className="hover:text-emerald-100"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Cons */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <label className="block text-xs font-bold text-rose-400 font-mono flex items-center gap-1">
                  <Minus size={13} /> Areas for Growth / Cons
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentCon}
                    onChange={(e) => setCurrentCon(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCon(e);
                    }}
                    placeholder="e.g. Async communication"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCon}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-slate-100 text-xs font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {cons.map((con, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-rose-950 text-rose-300 border border-rose-500/30"
                    >
                      - {con}
                      <button
                        type="button"
                        onClick={() => handleRemoveCon(idx)}
                        className="hover:text-rose-100"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback & Error Messages */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl p-3.5 flex items-center gap-2 text-xs text-rose-200">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Submit Verified Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
