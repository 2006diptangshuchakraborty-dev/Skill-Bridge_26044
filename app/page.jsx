"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Building2,
  School,
  Shield,
  ArrowRight,
  ShieldCheck,
  Award,
  FileCode,
  Check,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  BookOpen,
  Briefcase,
  Zap,
  Lock,
  Layers,
  ChevronRight,
  Eye,
  Sliders,
} from "lucide-react";
import EvidenceBadge from "@/components/shared/EvidenceBadge";
import { studentData, industryData, instituteData, adminData } from "@/lib/dummy-data";

export default function Home() {
  return (
    <div className="space-y-20 max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* ============================================================ */}
      {/* 1. HERO SECTION */}
      {/* ============================================================ */}
      <section className="text-center space-y-6 pt-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-sm shadow-emerald-500/10">
          <Sparkles size={14} className="text-emerald-400" />
          SIH 2026 • Skill Bridge Platform
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Industry Collaboration Platform for <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Skill Mapping & Priority Matching
          </span>
        </h1>

        {/* Continuous Connection Tagline */}
        <p className="text-slate-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
          The continuous, automated loop connecting:
          <span className="text-slate-200 font-medium"> Industry Requirements ➔ Skill Mapping ➔ Student Profile ➔ Gap Analysis ➔ Verified Experience ➔ Institute Analytics</span>.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 hover:scale-[1.02] flex items-center gap-2"
          >
            <span>Get Started Free</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-900 hover:text-white hover:border-slate-600 transition-all"
          >
            Sign In to Portal
          </Link>

          <Link
            href="#students"
            className="px-5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
          >
            <span>Explore </span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. PLATFORM VITAL STATS TICKER */}
      {/* ============================================================ */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Zero-Noise Gatekeeper</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-400">4 Levels</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Multi-Evidence Badges</div>
        </div>
        {/* <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">k &ge; 5</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Privacy k-Anonymity</div>
        </div> */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">35+ Skills</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Normalized Ontology</div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. CORE INNOVATION SPOTLIGHT CARD */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" /> Core Rule Engine: Priority-Aware Skill Matching
            </h2>
            <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-semibold self-start sm:self-auto">
               Mandatory 100% High Priority Gate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* High Priority Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <CheckCircle2 size={15} /> High Priority (Mandatory)
              </h3>
              <ul className="space-y-2.5 text-slate-300 text-xs leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Every High-Priority skill must be matched with required proficiency level.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    <strong className="text-emerald-300">100% High-Priority match is strictly required for interview eligibility.</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>If even one mandatory skill is missing or below required proficiency, candidate application is automatically flagged <strong>NOT ELIGIBLE</strong>.</span>
                </li>
              </ul>
            </div>

            {/* Low Priority Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-amber-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <AlertTriangle size={15} /> Low Priority (Preferred)
              </h3>
              <ul className="space-y-2.5 text-slate-300 text-xs leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Evaluated only after High-Priority eligibility is confirmed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Partial matching is permitted (e.g. 75% preferred match) to calculate candidate rank.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>System identifies missing preferred skills and generates automated upskilling alerts for students & faculty.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. QUICK ROLE NAVIGATION JUMP CARDS */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-100">Explore Role Portals</h2>
          <p className="text-xs text-slate-400">Tailored consoles for each stakeholder in the higher education and talent ecosystem</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/student/opportunities"
            className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap size={22} />
            </div>
            <h3 className="font-bold text-slate-100 text-base flex items-center justify-between">
              Student Portal <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              View opportunities, dual match meters, missing preferred skills, upskilling paths, and apply with 100% gatekeeper transparency.
            </p>
          </Link>

          <Link
            href="/recruiter/dashboard"
            className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 size={22} />
            </div>
            <h3 className="font-bold text-slate-100 text-base flex items-center justify-between">
              Industry  <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Create roles with AI JD extraction, filter zero-noise eligible candidate directories, and submit post-intern evaluations.
            </p>
          </Link>

          <Link
            href="/institute/dashboard"
            className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <School size={22} />
            </div>
            <h3 className="font-bold text-slate-100 text-base flex items-center justify-between">
              Institute  <ArrowRight size={16} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Aggregated privacy-preserving skill gap alerts, 1-click corporate workshop creator, and department readiness benchmarks.
            </p>
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. VALUE PROPOSITION: STUDENTS (Anchor #students) */}
      {/* ============================================================ */}
      <section id="students" className="scroll-mt-20 space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase font-mono">
              <GraduationCap size={13} /> For Students
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">
              Clear Roadmap from Classroom to High-Value Placement
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Eliminate recruitment black boxes. Know exactly why you match, prove your skills with 5-level verified badges, and close gaps with targeted learning paths.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/student/opportunities"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20"
            >
              Browse Opportunities
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-900 transition-colors"
            >
              Sign Up as Student
            </Link>
          </div>
        </div>

        {/* Value Prop 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Target size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Priority-Aware Matching</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Transparent Dual-Match meters show you exactly where you stand on mandatory High-Priority requirements (100% required) vs Low-Priority preferences.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">5-Level Evidence Badges</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Back every skill claim with verifiable evidence: Self-declared (L1), Certificates (L2), Proctored Assessments (L3), GitHub Projects (L4), and Employer Endorsements (L5).
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Guaranteed Eligibility</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              When you meet 100% of high-priority requirements, your application bypasses resume screening filters and lands directly in the recruiter shortlist pool.
            </p>
          </div>
        </div>

        {/* Student Realistic Preview Capsule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <img
                src={studentData.profile.avatar}
                alt={studentData.profile.name}
                className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-100">{studentData.profile.name}</h4>
                <p className="text-[11px] text-slate-400">{studentData.profile.instituteName} • {studentData.profile.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {studentData.profile.profileCompletion}% Profile Completed
              </span>
            </div>
          </div>

          {/* Sample Verified Skill Matrix */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Verified Skill Matrix Preview:</div>
            <div className="flex flex-wrap gap-2">
              {studentData.skillMatrix.slice(0, 6).map((sk) => (
                <div key={sk.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">{sk.name}</span>
                  <EvidenceBadge level={sk.evidenceLevel} showLabel={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. VALUE PROPOSITION: INDUSTRY / RECRUITERS (Anchor #industry) */}
      {/* ============================================================ */}
      <section id="industry" className="scroll-mt-20 space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase font-mono">
              <Building2 size={13} /> For Industry & Recruiters
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">
              Zero Noise Hiring with Mandatory Skill Gatekeeping
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Stop reviewing hundreds of mismatched resumes. Filter by verified capability, compare candidates side-by-side, and elevate top interns with Level-5 endorsements.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/recruiter/jobs/create"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-500 text-slate-950 hover:bg-blue-400 transition-colors shadow-sm shadow-blue-500/20"
            >
              Post Opportunity
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-900 transition-colors"
            >
              Register Organization
            </Link>
          </div>
        </div>

        {/* Industry 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Zero-Noise Gatekeeper</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Enforce strict 100% High-Priority gates. Ineligible applicants missing core prerequisites are filtered out before reaching your review desk.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Candidate Comparison Matrix</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Compare candidate coding proficiency, evidence depth, and match percentages side-by-side across 1–4 candidates for faster hiring committee decisions.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Award size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Post-Internship L5 Endorsements</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Submit structured performance evaluations upon internship completion, elevating student skills to prestigious Level 5 (Industry Verified).
            </p>
          </div>
        </div>

        {/* Industry Realistic Preview Capsule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono uppercase text-blue-400 font-semibold">{industryData.profile.companyName}</span>
              <h4 className="text-sm font-bold text-slate-100">Live Hiring Gatekeeper Statistics</h4>
            </div>
            <span className="text-xs font-mono bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20">
              {industryData.kpiStats.zeroNoiseRate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Total Applicants</div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">{industryData.kpiStats.totalApplicants}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">100% Gate Passed</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{industryData.kpiStats.gatePassedApplicants}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Filtered (Gaps)</div>
              <div className="text-lg font-bold text-rose-400 mt-0.5">{industryData.kpiStats.gateFilteredOut}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Time to Shortlist</div>
              <div className="text-lg font-bold text-blue-400 mt-0.5">{industryData.kpiStats.timeToShortlist}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. VALUE PROPOSITION: INSTITUTES / COLLEGES (Anchor #institutes) */}
      {/* ============================================================ */}
      <section id="institutes" className="scroll-mt-20 space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold uppercase font-mono">
              <School size={13} /> For Institutes & Faculty
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">
              Curriculum Gap Analytics & Privacy-Preserving Interventions
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Bridge the academia-industry divide with automated k-anonymity skill gap alerts, 1-click corporate workshop launches, and verified employer feedback analytics.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/institute/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-500 text-slate-950 hover:bg-purple-400 transition-colors shadow-sm shadow-purple-500/20"
            >
              Institute Console
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-900 transition-colors"
            >
              Onboard Institute
            </Link>
          </div>
        </div>

        {/* Institute 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Lock size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">k-Anonymity Gap Alerts</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Privacy-first analytics group students with k &ge; 5 anonymity, surfacing systemic curriculum deficits across departments without exposing student PII.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">1-Click Corporate Workshops</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Instantly spin up targeted upskilling bootcamps co-designed with industry hiring partners to convert identified gaps into verified Level 3 credentials.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Department Benchmarking</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Track multi-department readiness benchmarks, placement conversion rates, and real-time recruiter satisfaction ratings across all engineering branches.
            </p>
          </div>
        </div>

        {/* Institute Realistic Preview Capsule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono uppercase text-purple-400 font-semibold">{instituteData.profile.name}</span>
              <h4 className="text-sm font-bold text-slate-100">Top Automated Skill Gap Alert</h4>
            </div>
            <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full border border-purple-500/20">
              k-Anonymity Verified (k = 91)
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                Target Skill: {instituteData.skillGapAlerts[0].skillName} ({instituteData.skillGapAlerts[0].department})
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {instituteData.skillGapAlerts[0].affectedStudentCount} Students Affected
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {instituteData.skillGapAlerts[0].message}
            </p>
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Action: <strong className="text-purple-300">{instituteData.skillGapAlerts[0].suggestedAction}</strong></span>
              <Link href="/institute/training" className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
                <span>View Program</span> <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FINAL CALL-TO-ACTION SECTION */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Ready to Bridge the Higher Education Skill Gap?
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Join thousands of students, enterprise recruiters, and premier engineering institutes on the Skill Bridge collaborative ecosystem.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 hover:scale-105"
          >
            Create Your Free Account
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:bg-slate-900 transition-colors"
          >
            Sign In to Existing Account
          </Link>
        </div>
      </section>
    </div>
  );
}
