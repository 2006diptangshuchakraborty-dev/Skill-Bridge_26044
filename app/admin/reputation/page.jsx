"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  Building2,
  School,
  FileText,
  Flag,
  MessageSquare,
  History,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Info,
  TrendingUp,
  Zap,
  Sliders,
  Award,
} from "lucide-react";

export default function AdminReputationModerationPage() {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    flagged: 0,
    hidden: 0,
    underAppeal: 0,
    pendingPublication: 0,
    rejected: 0,
    totalReports: 0,
    pendingReports: 0,
    totalAppeals: 0,
    pendingAppeals: 0,
    averageScore: 0,
    verifiedPercent: 100,
    anomaliesCount: 0,
  });
  const [suspiciousEntities, setSuspiciousEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [contextFilter, setContextFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Panels state
  const [actionModal, setActionModal] = useState(null); // { rating, action: 'HIDE' | 'RESTORE' | 'FLAG' | 'REJECT' }
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [detailModal, setDetailModal] = useState(null); // rating object
  const [auditModal, setAuditModal] = useState(null); // rating object
  const [reportsModal, setReportsModal] = useState(null); // rating object or 'ALL'
  const [recalcModalOpen, setRecalcModalOpen] = useState(false);
  const [recalcRole, setRecalcRole] = useState("STUDENT");
  const [recalcEntityId, setRecalcEntityId] = useState("");
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);

  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusTab !== "ALL") params.set("status", statusTab);
      if (roleFilter !== "ALL") params.set("targetRole", roleFilter);
      if (contextFilter !== "ALL") params.set("contextType", contextFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`/api/admin/ratings?${params.toString()}`, {
        headers: { "x-user-role": "ADMIN" },
      });

      if (res.ok) {
        const data = await res.json();
        setRatings(data.ratings || []);
        if (data.stats) setStats(data.stats);
        if (data.suspiciousEntities) setSuspiciousEntities(data.suspiciousEntities);
        if (data.totalPages) setTotalPages(data.totalPages);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification("error", errData.error || "Failed to fetch ratings data");
      }
    } catch (err) {
      console.error("Fetch admin ratings error:", err);
      showNotification("error", "Error connecting to ratings management API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [statusTab, roleFilter, contextFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRatings();
  };

  const handleExecuteAction = async () => {
    if (!actionModal || !actionModal.rating) return;
    try {
      setActionLoading(true);
      const ratingId = actionModal.rating.id;
      const res = await fetch(`/api/admin/ratings/${ratingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
        },
        body: JSON.stringify({
          action: actionModal.action,
          reason: actionReason || `Moderator performed ${actionModal.action}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to execute ${actionModal.action}`);
      }

      showNotification(
        "success",
        `Review ${ratingId} transitioned to ${data.status}. Pre-computed aggregate synchronized.`
      );
      setActionModal(null);
      setActionReason("");
      fetchRatings();
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculate = async (isGlobal = false) => {
    try {
      setRecalcLoading(true);
      setRecalcResult(null);

      const payload = isGlobal
        ? { recalculateAll: true }
        : { targetRole: recalcRole, targetEntityId: recalcEntityId.trim() };

      const res = await fetch("/api/admin/ratings/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Recalculation failed");
      }

      setRecalcResult(data);
      showNotification("success", data.message);
      fetchRatings();
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setRecalcLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Published
          </span>
        );
      case "FLAGGED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Flag size={12} /> Flagged
          </span>
        );
      case "HIDDEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <EyeOff size={12} /> Hidden
          </span>
        );
      case "UNDER_APPEAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RotateCcw size={12} /> Under Appeal
          </span>
        );
      case "PENDING_PUBLICATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock size={12} /> Blind Hold
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "STUDENT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            <User size={11} /> Student
          </span>
        );
      case "INDUSTRY":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
            <Building2 size={11} /> Industry
          </span>
        );
      case "INSTITUTE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
            <School size={11} /> Institute
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 animate-in fade-in-50 slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
              : "bg-rose-950/90 border-rose-700 text-rose-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/50 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={16} /> Trust & Governance Engine
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Reputation & Review Moderation
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Inspect verified platform interactions, review abuse reports and appeals, flag anomalous review spikes, and repair profile trust aggregates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setRecalcModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <RefreshCw size={14} /> Recalculate Aggregates
            </button>

            <button
              onClick={fetchRatings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            >
              <RotateCcw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Ratings</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{stats.total}</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={12} /> {stats.published} Published
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Star size={24} className="fill-indigo-500/20" />
          </div>
        </div>

        {/* Flagged & Hidden Reviews Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Moderation Queue</p>
            <h3 className="text-2xl font-extrabold text-amber-300 mt-1">
              {stats.flagged + stats.hidden}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.flagged} Flagged · {stats.hidden} Hidden
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert size={24} />
          </div>
        </div>

        {/* Reports & Appeals Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports & Appeals</p>
            <h3 className="text-2xl font-extrabold text-rose-300 mt-1">
              {stats.pendingReports + stats.pendingAppeals}
            </h3>
            <p className="text-[11px] text-rose-400 mt-1 font-medium">
              {stats.pendingReports} Reports · {stats.pendingAppeals} Appeals Pending
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flag size={24} />
          </div>
        </div>

        {/* Platform Trust Health Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trust Health</p>
            <h3 className="text-2xl font-extrabold text-emerald-300 mt-1">
              {stats.averageScore ? `${stats.averageScore} ★` : "N/A"}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <Award size={12} /> {stats.verifiedPercent}% Verified Interactions
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* Anti-Fraud Radar Alert (If anomalies detected) */}
      {suspiciousEntities && suspiciousEntities.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-5 shadow-xl backdrop-blur space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Zap size={16} /> Anti-Fraud Activity Radar: Suspicious Surge Detected
          </div>
          <p className="text-xs text-amber-200/90">
            The platform heuristic engine detected anomalous rating velocity or high unverified interaction ratios on the following entities:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {suspiciousEntities.map((se, idx) => (
              <div
                key={`se-${idx}`}
                className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3.5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(se.targetRole)}
                    <span className="font-mono text-xs font-bold text-slate-200">{se.targetEntityId}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {se.anomalies.map((anom, aIdx) => (
                      <li key={`a-${aIdx}`} className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                        <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                        <span>{anom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery(se.targetEntityId);
                    setRoleFilter(se.targetRole);
                    fetchRatings();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 shrink-0"
                >
                  Filter Target
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Review Management Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur overflow-hidden">
        {/* Status Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-800 bg-slate-950/40">
          {[
            { key: "ALL", label: "All Ratings", count: stats.total },
            { key: "FLAGGED", label: "Flagged", count: stats.flagged },
            { key: "UNDER_APPEAL", label: "Under Appeal", count: stats.underAppeal },
            { key: "HIDDEN", label: "Hidden", count: stats.hidden },
            { key: "PUBLISHED", label: "Published", count: stats.published },
            { key: "PENDING_PUBLICATION", label: "Blind Reviews", count: stats.pendingPublication },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusTab(tab.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                statusTab === tab.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusTab === tab.key ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer, candidate, headline, ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Target Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Filter size={13} /> Target:
              </span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="INDUSTRY">Industry</option>
                <option value="INSTITUTE">Institute</option>
              </select>
            </div>

            {/* Context Type Filter */}
            <div className="flex items-center gap-2">
              <select
                value={contextFilter}
                onChange={(e) => {
                  setContextFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Contexts</option>
                <option value="APPLICATION_REVIEW">Application Review</option>
                <option value="INTERVIEW_FEEDBACK">Interview Feedback</option>
                <option value="TASK_EVALUATION">Task / Assessment</option>
                <option value="INTERNSHIP_PERFORMANCE">Internship Performance</option>
                <option value="COURSE_EVALUATION">Course Evaluation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ratings Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs text-slate-400">Loading moderation records...</p>
            </div>
          ) : ratings.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <ShieldCheck size={36} className="text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No ratings matching criteria</p>
              <p className="text-xs text-slate-500">Try adjusting your status or search query filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Review ID & Target</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Score & Context</th>
                  <th className="py-3 px-4">Headline & Feedback</th>
                  <th className="py-3 px-4">Status & Flags</th>
                  <th className="py-3 px-4 text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ratings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* ID & Target Column */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <span className="font-mono text-[11px] font-bold text-indigo-300 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/40">
                          {r.id}
                        </span>
                        <div className="pt-1">
                          <p className="font-semibold text-slate-100">{r.target?.name || r.targetEntityId}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getRoleBadge(r.targetRole)}
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                              {r.targetEntityId}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Reviewer Column */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-200">{r.reviewer?.name || "Anonymous"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.reviewer?.email || r.reviewerUserId}</p>
                        <span className="inline-block text-[10px] uppercase font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {r.reviewerRole || r.reviewer?.role}
                        </span>
                      </div>
                    </td>

                    {/* Score & Context Column */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-amber-400 font-extrabold text-sm">
                          <Star size={14} className="fill-amber-400" />
                          <span>{Number(r.overallScore).toFixed(1)}</span>
                          <span className="text-[10px] text-slate-500 font-normal">/ 5.0</span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {r.contextType || "INTERACTION"}
                        </span>
                        <div>
                          {r.recommendation === "RECOMMENDED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                              <ThumbsUp size={11} /> Recommended
                            </span>
                          )}
                          {r.recommendation === "NOT_RECOMMENDED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-400">
                              <ThumbsDown size={11} /> Not Recommended
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Headline & Feedback Preview */}
                    <td className="py-4 px-4 align-top max-w-xs">
                      <div className="space-y-1">
                        {r.headline ? (
                          <p className="font-semibold text-slate-100 truncate">{r.headline}</p>
                        ) : (
                          <p className="text-slate-500 italic text-[11px]">No headline</p>
                        )}
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {r.reviewText || "No written review text provided."}
                        </p>
                        {r.isBlind && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 font-mono">
                            <Shield size={10} /> Blind Review Mode
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status & Reports Column */}
                    <td className="py-4 px-4 align-top space-y-1.5">
                      <div>{getStatusBadge(r.status)}</div>
                      {r.reportCount > 0 && (
                        <button
                          onClick={() => setReportsModal(r)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 hover:bg-rose-900/50"
                        >
                          <Flag size={10} /> {r.reportCount} Report(s)
                        </button>
                      )}
                      {r.appealCount > 0 && (
                        <button
                          onClick={() => setReportsModal(r)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 hover:bg-cyan-900/50"
                        >
                          <RotateCcw size={10} /> {r.appealCount} Appeal(s)
                        </button>
                      )}
                    </td>

                    {/* Action Controls Column */}
                    <td className="py-4 px-4 align-top text-right space-y-1.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspection Button */}
                        <button
                          onClick={() => setDetailModal(r)}
                          title="View Full Breakdown"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Audit History Button */}
                        <button
                          onClick={() => setAuditModal(r)}
                          title="Audit Trail"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <History size={14} />
                        </button>

                        {/* Hide Review Action */}
                        {r.status !== "HIDDEN" && (
                          <button
                            onClick={() => setActionModal({ rating: r, action: "HIDE" })}
                            title="Hide Review from Public"
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Hide
                          </button>
                        )}

                        {/* Restore Review Action */}
                        {r.status === "HIDDEN" && (
                          <button
                            onClick={() => setActionModal({ rating: r, action: "RESTORE" })}
                            title="Restore Review to Published"
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Restore
                          </button>
                        )}

                        {/* Flag Review Action */}
                        {r.status === "PUBLISHED" && (
                          <button
                            onClick={() => setActionModal({ rating: r, action: "FLAG" })}
                            title="Flag Review for Investigation"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                          >
                            <Flag size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="font-bold text-slate-200">{page}</span> of{" "}
            <span className="font-bold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Moderation Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ShieldAlert size={20} className="text-amber-400" />
                Confirm Moderation Action: {actionModal.action}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                You are performing <span className="font-bold text-amber-300">{actionModal.action}</span> on review{" "}
                <span className="font-mono text-indigo-300">{actionModal.rating.id}</span>.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">Target Entity: <span className="text-slate-200 font-bold">{actionModal.rating.targetEntityId} ({actionModal.rating.targetRole})</span></p>
                <p className="text-slate-400">Score: <span className="text-amber-400 font-bold">{actionModal.rating.overallScore} ★</span></p>
                <p className="text-slate-400">Headline: <span className="text-slate-200 italic">{actionModal.rating.headline || "None"}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Administrative Notes (Recorded in Audit Trail):
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide context, violation reference, or policy clause..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  actionModal.action === "HIDE"
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                Confirm {actionModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Review Detail & Category Score Breakdown */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  {detailModal.id}
                </span>
                <h3 className="font-bold text-lg text-white mt-1">Review Inspection & Category Scoring</h3>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            {/* Overview Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Overall Score</p>
                <p className="text-xl font-extrabold text-amber-400 mt-0.5">{detailModal.overallScore} ★</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Recommendation</p>
                <p className="text-xs font-bold text-emerald-400 mt-1">{detailModal.recommendation}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Target Entity</p>
                <p className="text-xs font-bold text-slate-200 mt-1">{detailModal.targetEntityId}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Status</p>
                <div className="mt-1">{getStatusBadge(detailModal.status)}</div>
              </div>
            </div>

            {/* Category Score Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Multi-Dimensional Category Scores (1–5 Stars)
              </h4>
              <div className="space-y-2">
                {detailModal.categoryScores && detailModal.categoryScores.length > 0 ? (
                  detailModal.categoryScores.map((cs, idx) => (
                    <div
                      key={`cs-${idx}`}
                      className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-200">{cs.categoryCode || cs.categoryId}</span>
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star size={13} className="fill-amber-400" />
                        <span>{cs.score} / 5</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No discrete category score entries recorded.</p>
                )}
              </div>
            </div>

            {/* Feedback Content */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Written Feedback</h4>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-400">Headline:</p>
                  <p className="text-slate-100 font-bold mt-0.5">{detailModal.headline || "None provided"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400">Review Text:</p>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{detailModal.reviewText || "None provided"}</p>
                </div>

                {detailModal.pros && detailModal.pros.length > 0 && (
                  <div>
                    <p className="font-semibold text-emerald-400">Pros / Strengths:</p>
                    <ul className="list-disc list-inside mt-1 text-slate-300 space-y-0.5">
                      {detailModal.pros.map((p, idx) => (
                        <li key={`pro-${idx}`}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {detailModal.cons && detailModal.cons.length > 0 && (
                  <div>
                    <p className="font-semibold text-rose-400">Cons / Areas of Improvement:</p>
                    <ul className="list-disc list-inside mt-1 text-slate-300 space-y-0.5">
                      {detailModal.cons.map((c, idx) => (
                        <li key={`con-${idx}`}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setDetailModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Audit Trail Modal */}
      {auditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <History size={20} className="text-indigo-400" />
                Audit Trail Timeline: {auditModal.id}
              </h3>
              <button onClick={() => setAuditModal(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {auditModal.auditLogs && auditModal.auditLogs.length > 0 ? (
                auditModal.auditLogs.map((log, idx) => (
                  <div
                    key={`log-${idx}`}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Actor: <span className="font-mono font-bold text-slate-100">{log.actorUserId || "System"}</span> (
                      {log.actorRole || "SYSTEM"})
                    </p>
                    {log.reason && (
                      <p className="text-slate-400 italic">Reason: {log.reason}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-6 text-center">No specific audit entries recorded for this rating.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setAuditModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Reports & Appeals Drawer/Modal */}
      {reportsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Flag size={20} className="text-rose-400" />
                Reports & Appeals: {reportsModal.id}
              </h3>
              <button onClick={() => setReportsModal(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            {/* Reports Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flag size={13} /> User Content Reports ({reportsModal.reports?.length || 0})
              </h4>
              {reportsModal.reports && reportsModal.reports.length > 0 ? (
                reportsModal.reports.map((rep, idx) => (
                  <div key={`rep-${idx}`} className="bg-slate-950 p-4 rounded-xl border border-rose-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 uppercase font-mono">{rep.reason}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(rep.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300">Details: {rep.details || "No written explanation provided."}</p>
                    <p className="text-[10px] text-slate-500">Reporter: {rep.reporterUserId}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No reports filed for this review.</p>
              )}
            </div>

            {/* Appeals Section */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={13} /> Review Appeals ({reportsModal.appeals?.length || 0})
              </h4>
              {reportsModal.appeals && reportsModal.appeals.length > 0 ? (
                reportsModal.appeals.map((app, idx) => (
                  <div key={`app-${idx}`} className="bg-slate-950 p-4 rounded-xl border border-cyan-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400 uppercase font-mono">{app.appealReason || app.reason}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(app.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300">Justification: {app.justification || "None provided"}</p>
                    <p className="text-[10px] text-slate-500">Appellant: {app.appellantUserId}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No appeals submitted for this review.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setReportsModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Aggregate Recalculator Tool Modal */}
      {recalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <RefreshCw size={18} className="text-indigo-400" />
                Profile Aggregate Recalculation & Repair
              </h3>
              <button onClick={() => setRecalcModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <p>
                Synchronize and rebuild pre-computed rating aggregates (overall score, recommendation rate, 5-star distribution, and trust badges) from verified review records.
              </p>

              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Entity Role:</label>
                  <select
                    value={recalcRole}
                    onChange={(e) => setRecalcRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="INDUSTRY">Industry</option>
                    <option value="INSTITUTE">Institute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Entity ID:</label>
                  <input
                    type="text"
                    value={recalcEntityId}
                    onChange={(e) => setRecalcEntityId(e.target.value)}
                    placeholder="e.g. std_001, stu_alice_dev, org_techcorp"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {recalcResult && recalcResult.aggregate && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Recalculation Complete!
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div>Average: <span className="font-bold text-amber-300">{recalcResult.aggregate.averageScore} ★</span></div>
                    <div>Ratings: <span className="font-bold text-slate-200">{recalcResult.aggregate.totalRatingsCount}</span></div>
                    <div>Trust: <span className="font-bold text-emerald-300">{recalcResult.aggregate.verificationTrustLevel}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => handleRecalculate(true)}
                disabled={recalcLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Zap size={13} /> Recalculate All
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecalcModalOpen(false)}
                  disabled={recalcLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRecalculate(false)}
                  disabled={recalcLoading || !recalcEntityId.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {recalcLoading ? <RefreshCw size={13} className="animate-spin" /> : null}
                  Recalculate Entity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
