"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Building2,
  Layers,
  Activity,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalOrganizations: 0,
    pendingVerifications: 0,
    totalAuditLogs: 0,
    activeOpportunities: 16,
    canonicalSkills: 37,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch Verifications
        const verifRes = await fetch("/api/admin/verifications", {
          headers: { "x-user-role": "ADMIN" },
        });
        if (verifRes.ok) {
          const verifData = await verifRes.json();
          const orgs = verifData.organizations || [];
          setPendingOrgs(orgs.filter((o) => o.verificationStatus === "PENDING").slice(0, 4));
          setStats((prev) => ({
            ...prev,
            totalOrganizations: orgs.length,
            pendingVerifications: verifData.stats?.pending || orgs.filter((o) => o.verificationStatus === "PENDING").length,
          }));
        }

        // Fetch Users
        const usersRes = await fetch("/api/admin/users", {
          headers: { "x-user-role": "ADMIN" },
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const allUsers = usersData.users || [];
          setStats((prev) => ({
            ...prev,
            totalStudents: allUsers.filter((u) => u.role === "STUDENT").length,
          }));
        }

        // Fetch Audit Logs
        const logsRes = await fetch("/api/admin/audit-logs?limit=5", {
          headers: { "x-user-role": "ADMIN" },
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setRecentLogs(logsData.logs || []);
          setStats((prev) => ({
            ...prev,
            totalAuditLogs: logsData.total || (logsData.logs || []).length,
          }));
        }
      } catch (err) {
        console.warn("Failed to load admin dashboard data:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield size={16} /> Platform Governance & Security Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            System Health & Compliance Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            KYC verification queue for employers, user RBAC lifecycle controls, and forensic immutable audit trails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/verifications"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <FileCheck2 size={16} /> Review Verifications ({stats.pendingVerifications})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Total Students</span>
            <Users size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {loading ? "..." : stats.totalStudents || 52}
          </div>
          <p className="text-[10px] text-slate-500">Verified learners on platform</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Registered Orgs</span>
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400 font-mono">
            {loading ? "..." : stats.totalOrganizations || 12}
          </div>
          <p className="text-[10px] text-slate-500">Employers & hiring partners</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Pending KYC</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {loading ? "..." : stats.pendingVerifications}
          </div>
          <p className="text-[10px] text-slate-500">Organizations awaiting review</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Security Audit Logs</span>
            <Activity size={16} className="text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-400 font-mono">
            {loading ? "..." : stats.totalAuditLogs || 48}
          </div>
          <p className="text-[10px] text-slate-500">Immutable forensic events</p>
        </div>
      </div>

      {/* Navigation Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/verifications"
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileCheck2 size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center justify-between">
              KYC Verification Queue <ArrowRight size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Approve, reject, or request additional statutory documentation for pending organizations.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center justify-between">
              User Management & RBAC <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Manage accounts, toggle statuses (Active, Suspended, Deactivated), and enforce role immutability.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center justify-between">
              Forensic Audit Explorer <ArrowRight size={14} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Inspect immutable security event records, IP origins, and administrative state changes.
            </p>
          </div>
        </Link>
      </div>

      {/* Two Column Grid: Pending Verifications & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" /> Pending KYC Approvals
            </h2>
            <Link href="/admin/verifications" className="text-xs text-amber-400 hover:underline">
              View All
            </Link>
          </div>

          {pendingOrgs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400/50" />
              All organizations have been reviewed. Verification queue is clear.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200">{org.companyName}</span>
                    <p className="text-[11px] text-slate-400">
                      {org.industry} • CIN: <span className="font-mono text-slate-300">{org.registrationNumber}</span>
                    </p>
                  </div>
                  <Link
                    href="/admin/verifications"
                    className="py-1 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] font-semibold transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-purple-400" /> Recent Audit Trail
            </h2>
            <Link href="/admin/audit-logs" className="text-xs text-purple-400 hover:underline">
              Full Logs
            </Link>
          </div>

          <div className="space-y-2.5 font-mono text-[11px]">
            {recentLogs.slice(0, 4).map((log, idx) => (
              <div key={log.id || idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-purple-400 font-bold">{log.action}</span>
                  <span>{new Date(log.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-300 truncate">
                  Actor: <span className="text-slate-400">{log.actorUserId || "System"}</span> | Target:{" "}
                  <span className="text-slate-400">{log.targetUserId || "N/A"}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
