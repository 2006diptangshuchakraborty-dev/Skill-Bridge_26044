"use client";

import React from 'react';
import { GraduationCap, Building2, School, CheckCircle2 } from 'lucide-react';

export const ROLES = [
  {
    id: 'STUDENT',
    aliases: ['STUDENT'],
    title: 'Student / Learner',
    badge: 'Candidate',
    subtitle: 'Undergraduates, Graduates & Job Seekers',
    description: 'Build your verified skill profile, complete dynamic onboarding, and discover high-confidence AI-matched opportunities.',
    icon: GraduationCap,
    accentBorder: 'border-emerald-500',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    ringColor: 'ring-emerald-500/30',
    badgeStyle: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'INDUSTRY',
    aliases: ['INDUSTRY', 'ORGANIZATION'],
    title: 'Industry / Employer',
    badge: 'Recruiter',
    subtitle: 'Enterprises, Startups & Hiring Managers',
    description: 'Post internships and job opportunities, verify candidate competency with evidence tiers, and recruit top verified talent.',
    icon: Building2,
    accentBorder: 'border-teal-500',
    accentText: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
    ringColor: 'ring-teal-500/30',
    badgeStyle: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  },
  {
    id: 'INSTITUTE',
    aliases: ['INSTITUTE'],
    title: 'Institute / University',
    badge: 'Academic & TPO',
    subtitle: 'Colleges, Universities & Placement Cells',
    description: 'Track real-time student placement readiness, identify curriculum skill gaps, and establish corporate industry linkages.',
    icon: School,
    accentBorder: 'border-cyan-500',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    ringColor: 'ring-cyan-500/30',
    badgeStyle: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
];

/**
 * RoleSelector Component
 * Reusable 3-role selector card component for STUDENT, INDUSTRY, and INSTITUTE.
 *
 * @param {Object} props
 * @param {string} props.selectedRole - Currently selected role (STUDENT, INDUSTRY/ORGANIZATION, INSTITUTE)
 * @param {Function} props.onSelectRole - Callback when role is selected: (roleId) => void
 * @param {boolean} [props.disabled=false] - Whether the selector is disabled
 * @param {string} [props.layout='grid'] - 'grid' (columns) or 'compact' (tabs) or 'stack' (vertical)
 */
export default function RoleSelector({
  selectedRole = null,
  onSelectRole,
  disabled = false,
  layout = 'grid',
}) {
  const normalizedSelected = selectedRole ? String(selectedRole).trim().toUpperCase() : null;

  const isRoleActive = (role) => {
    if (!normalizedSelected) return false;
    return role.id === normalizedSelected || role.aliases.includes(normalizedSelected);
  };

  if (layout === 'compact') {
    return (
      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80" role="radiogroup">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const active = isRoleActive(role);
          return (
            <button
              key={role.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelectRole && onSelectRole(role.id)}
              className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                active
                  ? `${role.accentBg} ${role.accentText} border ${role.accentBorder} shadow-sm ring-1 ${role.ringColor}`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-[11px] truncate w-full text-center">{role.badge}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" role="radiogroup" aria-label="Select platform role">
      {ROLES.map((role) => {
        const Icon = role.icon;
        const active = isRoleActive(role);

        return (
          <button
            key={role.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelectRole && onSelectRole(role.id)}
            className={`group relative flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 ${
              active
                ? `${role.accentBg} ${role.accentBorder} ring-2 ${role.ringColor} shadow-lg shadow-emerald-950/20`
                : 'bg-slate-950/70 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50 hover:text-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
          >
            {/* Top Row: Icon + Badge + Check */}
            <div className="flex items-start justify-between w-full mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  active
                    ? `${role.accentBg} ${role.accentText} border ${role.accentBorder}`
                    : 'bg-slate-900 text-slate-400 border border-slate-800 group-hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                    active ? role.badgeStyle : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {role.badge}
                </span>
                {active && (
                  <CheckCircle2 className={`w-4 h-4 ${role.accentText}`} />
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <h3 className={`text-xs font-bold tracking-tight mb-0.5 ${active ? 'text-slate-100' : 'text-slate-200'}`}>
              {role.title}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mb-2">
              {role.subtitle}
            </p>

            {/* Description */}
            <p className="text-[11px] text-slate-400/90 leading-relaxed mt-auto">
              {role.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
