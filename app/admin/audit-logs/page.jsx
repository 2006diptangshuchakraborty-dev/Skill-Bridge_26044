"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Shield,
  Search,
  Filter,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileCode,
  Lock,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { "x-user-role": "ADMIN" },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity size={16} /> Forensic Audit Trail & Immutability Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            Platform Security Audit Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Append-only, immutable record of all administrative state transitions, role assignments, authentication events, and KYC actions.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1.5">
            <Lock size={12} /> Append-Only Store
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Action Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {[
            "ALL",
            "LOGIN",
            "ACCOUNT_CREATED",
            "ROLE_ASSIGNED",
            "ORGANIZATION_APPROVED",
            "ORGANIZATION_REJECTED",
            "USER_SUSPENDED",
            "PROFILE_UPDATED",
          ].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                actionFilter === act
                  ? "bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {act.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-72">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter actor, target, IP, ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Audit Log Entries List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading forensic logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
            <Activity size={32} className="mx-auto mb-3 text-slate-600" />
            No audit records found matching &quot;{actionFilter}&quot;.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 transition-all space-y-3 font-mono text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                        log.action.includes("APPROVED") || log.action.includes("CREATED") || log.action.includes("REACTIVATED")
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : log.action.includes("REJECTED") || log.action.includes("SUSPENDED") || log.action.includes("BLOCKED")
                          ? "bg-rose-950 text-rose-300 border-rose-800"
                          : log.action.includes("INFO") || log.action.includes("UPDATE")
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : "bg-purple-950 text-purple-300 border-purple-800"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[11px] font-sans">
                      Actor: <strong className="text-slate-200">{log.actorUserId || "System"}</strong>
                    </span>
                    {log.targetUserId && (
                      <span className="text-slate-500 text-[11px] font-sans">
                        Target: <strong className="text-slate-300">{log.targetUserId}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>ID: <span className="text-slate-300">{log.id}</span></div>
                  <div>IP: <span className="text-slate-300">{log.ipAddress || "127.0.0.1"}</span></div>
                  {log.resourceType && <div>Resource: <span className="text-slate-300">{log.resourceType}</span></div>}
                </div>

                {/* Expanded JSON details */}
                {isExpanded && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 overflow-x-auto space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                      <FileCode size={12} /> Metadata Payload
                    </div>
                    <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed">
                      {JSON.stringify(log.metadata || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
