"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function StatusPill({ status, isEligible }) {
  if (status === "FULL MATCH") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        <CheckCircle2 size={13} className="text-emerald-400" /> FULL MATCH ✓
      </span>
    );
  }

  if (status === "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH" || isEligible) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
        <AlertTriangle size={13} className="text-amber-400" /> ELIGIBLE — PARTIAL PREFERRED ⚠️
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
      <XCircle size={13} className="text-rose-400" /> NOT ELIGIBLE — MANDATORY GAP ✗
    </span>
  );
}
