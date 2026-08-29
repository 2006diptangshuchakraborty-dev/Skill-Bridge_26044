"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCheck, Shield, Building2, School, GraduationCap } from "lucide-react";

export default function RoleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeRole, setActiveRole] = useState("student");
  const [activePersona, setActivePersona] = useState("std_001"); // Aarav Sharma (Eligible Partial)

  useEffect(() => {
    if (pathname.startsWith("/recruiter")) setActiveRole("recruiter");
    else if (pathname.startsWith("/institute")) setActiveRole("institute");
    else if (pathname.startsWith("/admin")) setActiveRole("admin");
    else setActiveRole("student");
  }, [pathname]);

  const handleRoleChange = (role, path) => {
    setActiveRole(role);
    router.push(path);
  };

  const handlePersonaChange = (personaId) => {
    setActivePersona(personaId);
    if (typeof window !== "undefined") {
      localStorage.setItem("sih_active_student_id", personaId);
      window.dispatchEvent(new Event("sih_persona_changed"));
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Role Navigation */}
      <div className="flex items-center gap-1">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-2 flex items-center gap-1">
          <UserCheck size={12} className="text-emerald-400" /> Switch Portal:
        </span>

        <button
          onClick={() => handleRoleChange("student", "/student/opportunities")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-medium ${
            activeRole === "student"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <GraduationCap size={13} /> Student Portal
        </button>

        <button
          onClick={() => handleRoleChange("recruiter", "/recruiter/dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-medium ${
            activeRole === "recruiter"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Building2 size={13} /> Industry / Recruiter
        </button>

        <button
          onClick={() => handleRoleChange("institute", "/institute/dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-medium ${
            activeRole === "institute"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <School size={13} /> Institute / Faculty
        </button>

        <button
          onClick={() => handleRoleChange("admin", "/admin/dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-medium ${
            activeRole === "admin"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Shield size={13} /> Admin Console
        </button>
      </div>

      {/* Student Persona Selector */}
      {activeRole === "student" && (
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Demo Persona:</span>
          <select
            value={activePersona}
            onChange={(e) => handlePersonaChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="std_001">Aarav Sharma (Eligible - Partial 50%)</option>
            <option value="std_002">Priya Patel (Full Match 100%)</option>
            <option value="std_003">Rohan Verma (Ineligible - Missing SQL)</option>
            <option value="std_004">Ananya Sen (Ineligible - Low Python Prof)</option>
          </select>
        </div>
      )}
    </div>
  );
}
