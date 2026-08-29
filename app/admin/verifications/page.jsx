"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  FileText,
  Clock,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default function AdminVerificationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, infoRequested: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionModal, setActionModal] = useState(null); // { org, action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' }
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/verifications?${params.toString()}`, {
        headers: { "x-user-role": "ADMIN" },
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch verifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVerifications();
  };

  const handleActionConfirm = async () => {
    if (!actionModal) return;
    try {
      setActionLoading(true);
      setAlert(null);

      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
        },
        body: JSON.stringify({
          organizationId: actionModal.org.id,
          userId: actionModal.org.userId,
          action: actionModal.action,
          adminNotes: adminNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process KYC decision");
      }

      setAlert({
        type: "success",
        message: `Organization ${actionModal.org.companyName} set to ${data.verificationStatus}`,
      });
      setActionModal(null);
      setAdminNotes("");
      fetchVerifications();
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
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileCheck2 size={16} /> Compliance & Statutory KYC Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            Organization Verification Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Review submitted Corporate Identification Numbers (CIN), GSTIN certificates, and official incorporation credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
            {stats.pending} Pending Review
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
            {stats.approved} Approved
          </span>
        </div>
      </div>

      {/* Alert */}
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

      {/* Controls & Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["ALL", "PENDING", "APPROVED", "INFO_REQUESTED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search org, CIN, GSTIN..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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

      {/* Organizations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading verification queue...
          </div>
        ) : organizations.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
            <FileCheck2 size={32} className="mx-auto mb-3 text-slate-600" />
            No organizations found matching filter &quot;{statusFilter}&quot;.
          </div>
        ) : (
          organizations.map((org) => (
            <div
              key={org.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{org.companyName}</h3>
                      <span
                        className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                          org.verificationStatus === "APPROVED"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : org.verificationStatus === "REJECTED"
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : org.verificationStatus === "INFO_REQUESTED"
                            ? "bg-sky-950 text-sky-300 border-sky-800"
                            : "bg-amber-950 text-amber-300 border-amber-800"
                        }`}
                      >
                        {org.verificationStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {org.industry} • {org.companySize} employees • Registered {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => {
                      setActionModal({ org, action: "APPROVE" });
                      setAdminNotes("All statutory documentation verified against official corporate registries.");
                    }}
                    className="py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>

                  <button
                    onClick={() => {
                      setActionModal({ org, action: "REQUEST_INFO" });
                      setAdminNotes("Please provide a clearer copy of the GST registration certificate.");
                    }}
                    className="py-1.5 px-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <HelpCircle size={14} /> Request Info
                  </button>

                  <button
                    onClick={() => {
                      setActionModal({ org, action: "REJECT" });
                      setAdminNotes("Statutory records do not match MCA records.");
                    }}
                    className="py-1.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>

              {/* Statutory details & documents grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Registration (CIN/LLP)</span>
                  <span className="text-slate-200 font-bold">{org.registrationNumber || "N/A"}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Tax ID (GSTIN)</span>
                  <span className="text-slate-200 font-bold">{org.taxIdGstin || "N/A"}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Official Contact</span>
                  <span className="text-slate-200 truncate block">{org.contactPhone || org.userEmail}</span>
                </div>
              </div>

              {/* Document Attachments */}
              {Array.isArray(org.verificationDocs) && org.verificationDocs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Attached Statutory Documents:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {org.verificationDocs.map((doc, dIdx) => (
                      <a
                        key={dIdx}
                        href={doc.fileUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-xs transition-colors"
                      >
                        <FileText size={13} className="text-amber-400" />
                        <span>{doc.docType || doc.fileName || `Doc #${dIdx + 1}`}</span>
                        <ExternalLink size={11} className="text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes if any */}
              {org.adminNotes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-amber-400 font-mono">Admin Remarks:</strong> {org.adminNotes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* KYC Action Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <FileCheck2 size={18} className="text-amber-400" />
                Confirm KYC Decision: {actionModal.action}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                You are about to execute action <strong>{actionModal.action}</strong> for:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-100">{actionModal.org.companyName}</div>
                <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                  CIN: {actionModal.org.registrationNumber} • GSTIN: {actionModal.org.taxIdGstin}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Administrative Notes / Audit Reason <span className="text-slate-500">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="State the reason or required documentation details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleActionConfirm}
                disabled={actionLoading}
                className={`py-2 px-5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                  actionModal.action === "APPROVE"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : actionModal.action === "REJECT"
                    ? "bg-rose-500 hover:bg-rose-400 text-white"
                    : "bg-sky-500 hover:bg-sky-400 text-slate-950"
                }`}
              >
                {actionLoading ? "Processing..." : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
