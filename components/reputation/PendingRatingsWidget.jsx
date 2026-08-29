"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  GraduationCap,
  School,
  Lock,
  ChevronRight,
  Filter,
} from "lucide-react";
import RatingModal from "./RatingModal";

/**
 * PendingRatingsWidget Component
 * Displays actionable pending rating opportunities for the authenticated user,
 * with countdown timers, context badges, and modal rating triggers.
 */
export default function PendingRatingsWidget({
  userId = null,
  role = "STUDENT",
  pendingRatings: initialPendingRatings = null,
  onRatingSubmitted = null,
  className = "",
}) {
  const [pendingList, setPendingList] = useState(initialPendingRatings || []);
  const [loading, setLoading] = useState(!initialPendingRatings);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  // Fetch pending ratings if not provided via props
  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ratings/pending");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pendingRatings)) {
          setPendingList(data.pendingRatings);
        }
      }
    } catch (err) {
      console.error("[PendingRatingsWidget Fetch Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPendingRatings) {
      setPendingList(initialPendingRatings);
      setLoading(false);
    } else {
      fetchPending();
    }
  }, [initialPendingRatings, userId]);

  // Compute countdown string and urgency color
  const formatCountdown = (deadlineStr, countdownMs) => {
    if (!deadlineStr && countdownMs == null) return { text: "No Expiration", color: "text-slate-400" };

    const now = new Date().getTime();
    const target = deadlineStr ? new Date(deadlineStr).getTime() : now + (countdownMs || 0);
    const diff = target - now;

    if (diff <= 0) {
      return { text: "Window Expired", color: "text-rose-400 font-bold" };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 2) {
      return { text: `Expires in ${days} days`, color: "text-emerald-400" };
    } else if (days > 0) {
      return { text: `Expires in ${days}d ${hours}h`, color: "text-amber-400 font-semibold" };
    } else if (hours > 0) {
      return { text: `Expires in ${hours}h ${minutes}m`, color: "text-amber-400 font-bold" };
    } else {
      return { text: `Expires in ${minutes}m`, color: "text-rose-400 font-bold animate-pulse" };
    }
  };

  const handleOpenModal = (interaction) => {
    setSelectedInteraction(interaction);
    setIsModalOpen(true);
  };

  const handleSuccess = (res) => {
    if (selectedInteraction) {
      setPendingList((prev) =>
        prev.filter((p) => p.interactionId !== selectedInteraction.interactionId && p.id !== selectedInteraction.id)
      );
    }
    if (onRatingSubmitted) onRatingSubmitted(res);
  };

  const roleIcons = {
    STUDENT: GraduationCap,
    INDUSTRY: Building2,
    RECRUITER: Building2,
    INSTITUTE: School,
    FACULTY: School,
  };

  const filteredItems = pendingList.filter((item) => {
    if (filterType === "ALL") return true;
    return item.interactionType === filterType;
  });

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Actionable Ratings & Verified Reviews
              </h3>
              {pendingList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {pendingList.length} Actionable
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Complete mutual feedback to seal reputation scores and unlock Level 5 verified credentials.
            </p>
          </div>
        </div>

        {/* Filter / Refresh */}
        {pendingList.length > 1 && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "ALL" ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({pendingList.length})
            </button>
            <button
              onClick={() => setFilterType("APPLICATION_REVIEW")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "APPLICATION_REVIEW" ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setFilterType("INTERNSHIP_PERFORMANCE")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "INTERNSHIP_PERFORMANCE" ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Internships
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 font-mono text-xs">
          Checking pending rating opportunities...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-6 px-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">All caught up! No pending ratings</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              You have completed all pending reviews. New rating requests will automatically appear here once interviews, candidate reviews, or internships conclude.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => {
            const countdown = formatCountdown(item.deadline, item.countdownMs);
            const RoleIcon = roleIcons[String(item.targetRole).toUpperCase()] || GraduationCap;
            const targetName =
              item.targetName ||
              item.targetEntityName ||
              item.metadata?.targetName ||
              (item.targetRole === "STUDENT" ? "Student Candidate" : "Host Employer");
            const contextLabel = (item.interactionType || "APPLICATION_REVIEW")
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div
                key={item.interactionId || item.id || idx}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                {/* Counterparty & Context Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-slate-200 font-bold border border-slate-700 shrink-0">
                    <RoleIcon size={20} className="text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{targetName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                        {item.targetRole || "STUDENT"}
                      </span>
                      {item.isBlind && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Lock size={10} /> Blind Review
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-medium text-slate-300">{contextLabel}</span>
                      <span>•</span>
                      <span className={`font-mono flex items-center gap-1 ${countdown.color}`}>
                        <Clock size={11} /> {countdown.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Rating Button */}
                <button
                  type="button"
                  onClick={() => handleOpenModal(item)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/10 transition-all shrink-0 self-stretch sm:self-auto"
                >
                  <Star size={13} className="fill-slate-950" />
                  <span>Submit Rating</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Rating Modal Instance */}
      {selectedInteraction && (
        <RatingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInteraction(null);
          }}
          interaction={selectedInteraction}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
