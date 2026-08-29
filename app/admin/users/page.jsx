"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  UserCheck,
  RotateCcw,
  GraduationCap,
  Building2,
  Lock,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusModal, setStatusModal] = useState(null); // { user, targetStatus }
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { "x-user-role": "ADMIN" },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleStatusChangeConfirm = async () => {
    if (!statusModal) return;
    try {
      setActionLoading(true);
      setAlert(null);

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
        },
        body: JSON.stringify({
          userId: statusModal.user.id,
          accountStatus: statusModal.targetStatus,
          reason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user status");
      }

      setAlert({
        type: "success",
        message: `User ${statusModal.user.name || statusModal.user.email} updated to ${statusModal.targetStatus}`,
      });
      setStatusModal(null);
      setReason("");
      fetchUsers();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users size={16} /> User Directory & RBAC Security Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            Platform User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Inspect all registered accounts, enforce role immutability, and toggle account states (Active, Suspended, Deactivated).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-300">
            Total Users: <strong className="text-emerald-400 font-bold text-sm">{users.length}</strong>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            alert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {alert.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {["ALL", "STUDENT", "ORGANIZATION", "ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === r
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DEACTIVATED">DEACTIVATED</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-64">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Onboarding</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-100">{u.name || "Anonymous User"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      <div className="text-[10px] text-slate-600 font-mono">{u.id}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          u.role === "STUDENT"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80"
                            : u.role === "ORGANIZATION"
                            ? "bg-blue-950 text-blue-300 border border-blue-800/80"
                            : "bg-purple-950 text-purple-300 border border-purple-800/80"
                        }`}
                      >
                        {u.role === "STUDENT" && <GraduationCap size={12} />}
                        {u.role === "ORGANIZATION" && <Building2 size={12} />}
                        {u.role === "ADMIN" && <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          u.accountStatus === "ACTIVE"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : u.accountStatus === "SUSPENDED"
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : u.accountStatus === "DEACTIVATED"
                            ? "bg-slate-950 text-slate-400 border-slate-800"
                            : "bg-amber-950 text-amber-300 border-amber-800"
                        }`}
                      >
                        {u.accountStatus || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px]">
                      {u.onboardingStatus === "COMPLETED" ? (
                        <span className="text-emerald-400 font-semibold">✓ Completed</span>
                      ) : u.onboardingStatus === "IN_PROGRESS" ? (
                        <span className="text-amber-400">In Progress</span>
                      ) : (
                        <span className="text-slate-500">Not Started</span>
                      )}
                    </td>
                    <td className="p-4 text-[11px] text-slate-400">
                      {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.accountStatus !== "ACTIVE" && (
                          <button
                            onClick={() => setStatusModal({ user: u, targetStatus: "ACTIVE" })}
                            className="py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Reactivate Account"
                          >
                            <UserCheck size={13} /> Activate
                          </button>
                        )}

                        {u.accountStatus !== "SUSPENDED" && u.role !== "ADMIN" && (
                          <button
                            onClick={() => setStatusModal({ user: u, targetStatus: "SUSPENDED" })}
                            className="py-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Suspend Account"
                          >
                            <Ban size={13} /> Suspend
                          </button>
                        )}

                        {u.accountStatus !== "DEACTIVATED" && u.role !== "ADMIN" && (
                          <button
                            onClick={() => setStatusModal({ user: u, targetStatus: "DEACTIVATED" })}
                            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                            title="Deactivate Account"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Status Toggle Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                Change Status to {statusModal.targetStatus}
              </h3>
              <button onClick={() => setStatusModal(null)} className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                You are updating the account status for:
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-100">{statusModal.user.name || "User"}</div>
                <div className="text-slate-400 font-mono text-[11px] mt-0.5">{statusModal.user.email}</div>
                <div className="text-slate-500 font-mono text-[10px]">{statusModal.user.id}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason for Status Change <span className="text-slate-500">(Logged in audit trail)</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Terms violation, KYC verification, User request..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChangeConfirm}
                disabled={actionLoading}
                className="py-1.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : `Confirm ${statusModal.targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
