"use client";

import React from "react";
import { Award, ShieldCheck, CheckCircle2, FileCode, Check } from "lucide-react";

export default function EvidenceBadge({ level = 1, showLabel = true }) {
  const numLevel = typeof level === "number" ? level : parseInt(level, 10) || 1;

  const config = {
    1: { label: "Level 1 — Self Declared", color: "bg-slate-800 text-slate-300 border-slate-700", icon: Check },
    2: { label: "Level 2 — Certificate", color: "bg-blue-950 text-blue-300 border-blue-800", icon: Award },
    3: { label: "Level 3 — Assessment Verified", color: "bg-purple-950 text-purple-300 border-purple-800", icon: CheckCircle2 },
    4: { label: "Level 4 — Project Verified", color: "bg-teal-950 text-teal-300 border-teal-800", icon: FileCode },
    5: { label: "Level 5 — Industry Verified", color: "bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm", icon: ShieldCheck }
  };

  const active = config[numLevel] || config[1];
  const Icon = active.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${active.color}`}>
      <Icon size={12} />
      {showLabel ? active.label : `L${numLevel}`}
    </span>
  );
}
