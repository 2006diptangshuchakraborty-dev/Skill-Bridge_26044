"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Award,
  Briefcase,
  Target,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  FileCheck2,
  PhoneCall,
  Layers,
  Users2,
  FileText,
  School,
  MapPin,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  calculateStudentCompletion,
  calculateOrganizationCompletion,
  calculateInstituteCompletion,
  getStudentCompletionDetails,
  getOrgCompletionDetails,
  getInstituteCompletionDetails,
} from '@/lib/onboarding-calc';
import { authClient } from '@/lib/auth-client';

// ============================================================================
// STEP DEFINITIONS PER ROLE
// ============================================================================

const STUDENT_STEPS = [
  { id: 1, name: 'Basic Info', icon: User, desc: 'Headline & summary' },
  { id: 2, name: 'Academic', icon: GraduationCap, desc: 'College, degree & CGPA' },
  { id: 3, name: 'Skills', icon: Sparkles, desc: 'Technical & domain skills' },
  { id: 4, name: 'Projects', icon: FolderGit2, desc: 'Portfolio & repository' },
  { id: 5, name: 'Certifications', icon: Award, desc: 'Verified credentials' },
  { id: 6, name: 'Experience', icon: Briefcase, desc: 'Internships & jobs' },
  { id: 7, name: 'Preferences', icon: Target, desc: 'Roles & location' },
  { id: 8, name: 'Review', icon: CheckCircle2, desc: 'Finalize & submit' },
];

const INDUSTRY_STEPS = [
  { id: 1, name: 'Company Details', icon: Building2, desc: 'Name, size & website' },
  { id: 2, name: 'Registration', icon: FileCheck2, desc: 'CIN & Tax GSTIN' },
  { id: 3, name: 'Contact & HQ', icon: PhoneCall, desc: 'Recruiter phone & address' },
  { id: 4, name: 'Industry Focus', icon: Layers, desc: 'Sector & specializations' },
  { id: 5, name: 'Hiring Focus', icon: Users2, desc: 'Target roles & types' },
  { id: 6, name: 'KYC Docs', icon: FileText, desc: 'Statutory certificates' },
  { id: 7, name: 'Declaration', icon: CheckCircle2, desc: 'Review & submit' },
];

const INSTITUTE_STEPS = [
  { id: 1, name: 'Institute Basics', icon: School, desc: 'Name, AISHE & website' },
  { id: 2, name: 'Campus & Location', icon: MapPin, desc: 'Address, state & phone' },
  { id: 3, name: 'Departments', icon: BookOpen, desc: 'Programs & student counts' },
  { id: 4, name: 'Placement Cell', icon: Users2, desc: 'TPO & official contacts' },
  { id: 5, name: 'Accreditation', icon: Award, desc: 'NAAC, NBA & docs' },
  { id: 6, name: 'Declaration', icon: CheckCircle2, desc: 'Review & submit' },
];

function normalizeStudentProfileForForm(profile = {}, fallback = {}) {
  return {
    ...fallback,
    ...profile,
    githubURL: profile.githubURL || profile.githubUrl || fallback.githubURL || '',
    linkedinURL: profile.linkedinURL || profile.linkedinUrl || fallback.linkedinURL || '',
    skills: Array.isArray(profile.skills) && profile.skills.length > 0 ? profile.skills : fallback.skills,
    projects: Array.isArray(profile.projects) && profile.projects.length > 0 ? profile.projects : fallback.projects,
    certifications: Array.isArray(profile.certifications) && profile.certifications.length > 0 ? profile.certifications : fallback.certifications,
    experience: Array.isArray(profile.experience) && profile.experience.length > 0 ? profile.experience : fallback.experience,
    careerPreferences: profile.careerPreferences || fallback.careerPreferences,
  };
}

export default function UnifiedProfileSetupPage() {
  const router = useRouter();

  // Role state (can be auto-detected or switched if not locked)
  const [role, setRole] = useState('STUDENT'); // 'STUDENT' | 'INDUSTRY' | 'INSTITUTE'
  const [roleLocked, setRoleLocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  // --------------------------------------------------------------------------
  // FORM DATA STATES
  // --------------------------------------------------------------------------

  // 1. Student Form State
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    headline: '',
    bio: '',
    instituteName: '',
    department: '',
    degree: 'B.Tech',
    yearOfStudy: '3',
    graduationYear: 2026,
    cgpa: '',
    skills: [
      { name: 'JavaScript', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'React.js', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'Node.js', proficiency: 'Intermediate', category: 'Backend' },
    ],
    projects: [
      {
        title: 'Skill Bridge Platform',
        description: 'Priority-aware skill mapping and hiring gatekeeper engine.',
        techStack: 'Next.js, Tailwind CSS, PostgreSQL',
        projectUrl: 'https://github.com/example/skill-bridge',
      },
    ],
    certifications: [
      {
        name: 'AWS Cloud Foundations',
        issuingOrg: 'Amazon Web Services',
        issueDate: '2025-06',
        credentialUrl: 'https://aws.amazon.com/verify/123',
      },
    ],
    experience: [
      {
        title: 'Software Engineer Intern',
        company: 'Apex Technologies',
        duration: 'May 2025 - Jul 2025',
        description: 'Designed microservices and improved API query efficiency.',
      },
    ],
    githubURL: '',
    linkedinURL: '',
    careerPreferences: {
      preferredRoles: ['Full-Stack Developer', 'Frontend Engineer'],
      preferredLocations: ['Bengaluru', 'Remote'],
      jobType: 'Full-time',
    },
  });

  // 2. Industry Form State
  const [industryForm, setIndustryForm] = useState({
    companyName: '',
    companySize: '51-200',
    website: '',
    logoUrl: '',
    registrationNumber: '',
    taxIdGstin: '',
    companyType: 'Private Limited',
    primaryContactName: '',
    primaryContactPhone: '',
    primaryContactDesignation: 'Lead Technical Recruiter',
    contactPhone: '',
    officialEmail: '',
    address: {
      street: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    industry: 'Technology & Software',
    domainFocus: ['Cloud Computing', 'AI/ML', 'Full-Stack'],
    hiringPreferences: {
      targetRoles: ['Full-Stack Engineer', 'Data Analyst Intern', 'DevOps Specialist'],
      hiringType: 'Both',
      hiringSeason: 'Year-Round',
      minCgpa: '7.5',
    },
    verificationDocs: [
      {
        docType: 'Certificate of Incorporation (COI)',
        fileName: 'COI_Certificate.pdf',
        fileUrl: 'https://docs.skillbridge.gov/sample_coi.pdf',
        uploadedAt: new Date().toISOString(),
      },
      {
        docType: 'GSTIN Registration Certificate',
        fileName: 'GSTIN_Doc.pdf',
        fileUrl: 'https://docs.skillbridge.gov/sample_gstin.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ],
  });

  // 3. Institute Form State
  const [instituteForm, setInstituteForm] = useState({
    instituteName: '',
    instituteCode: '',
    instituteType: 'Autonomous University / Institute of National Importance',
    website: '',
    logoUrl: '',
    officialEmail: '',
    contactPhone: '',
    address: {
      street: '',
      city: '',
      state: 'Karnataka',
      postalCode: '',
      country: 'India',
    },
    departments: [
      { name: 'Computer Science & Engineering', code: 'CSE', headOfDept: 'Dr. S. Sharma', studentCount: '240' },
      { name: 'Information Technology', code: 'IT', headOfDept: 'Dr. R. Rao', studentCount: '180' },
      { name: 'Electronics & Communication', code: 'ECE', headOfDept: 'Dr. V. Hegde', studentCount: '180' },
    ],
    placementContact: {
      tpoName: 'Prof. K. Verma',
      designation: 'Head, Training & Placement Cell',
      email: 'tpo@institute.ac.in',
      phone: '+91 80 2345 6789',
    },
    accreditationDetails: {
      naacGrade: 'A++',
      nirfRank: '25',
      aicteApproved: true,
    },
    verificationDocs: [
      {
        docType: 'AISHE / UGC Accreditation Certificate',
        fileName: 'AISHE_Approval_Doc.pdf',
        fileUrl: 'https://docs.skillbridge.gov/sample_aishe.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ],
  });

  // --------------------------------------------------------------------------
  // DYNAMIC COMPLETION ENGINE (Exact Match with lib/onboarding-calc.js)
  // --------------------------------------------------------------------------

  const completionDetails = useMemo(() => {
    if (role === 'STUDENT') {
      return getStudentCompletionDetails(studentForm);
    } else if (role === 'INDUSTRY') {
      return getOrgCompletionDetails(industryForm);
    } else if (role === 'INSTITUTE') {
      return getInstituteCompletionDetails(instituteForm);
    }
    return { completion: 0, breakdown: {}, missingFields: [] };
  }, [role, studentForm, industryForm, instituteForm]);

  const activeSteps = useMemo(() => {
    if (role === 'STUDENT') return STUDENT_STEPS;
    if (role === 'INDUSTRY') return INDUSTRY_STEPS;
    return INSTITUTE_STEPS;
  }, [role]);

  // --------------------------------------------------------------------------
  // INITIAL REHYDRATION ON MOUNT
  // --------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;
    const requestedRoleParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('role')
        : null;

    const normalizeRequestedRole = (value) => {
      const normalized = String(value || '').trim().toUpperCase();
      if (normalized === 'ORGANIZATION' || normalized === 'RECRUITER') return 'INDUSTRY';
      return ['STUDENT', 'INDUSTRY', 'INSTITUTE'].includes(normalized) ? normalized : null;
    };

    async function loadInitialProfile() {
      try {
        setLoading(true);
        const requestedRole = normalizeRequestedRole(requestedRoleParam);

        if (requestedRole) {
          setRole(requestedRole);
        }

        // 1. Probe Better Auth session
        const sessionRes = await authClient.getSession().catch(() => null);
        const user = sessionRes?.data?.user;

        if (user?.role) {
          const userRole = String(user.role).toUpperCase();
          const normalized = userRole === 'ORGANIZATION' || userRole === 'INDUSTRY' ? 'INDUSTRY' : userRole;
          if (['STUDENT', 'INDUSTRY', 'INSTITUTE'].includes(normalized)) {
            setRole(normalized);
            setRoleLocked(true);
          }
        }

        // 2. Fetch server draft from /api/profile/setup
        const res = await fetch('/api/profile/setup');
        if (res.ok) {
          const data = await res.json();
          if (data.role) {
            const detectedRole = data.role === 'ORGANIZATION' || data.role === 'INDUSTRY' ? 'INDUSTRY' : data.role;
            setRole(detectedRole);
            setRoleLocked(true);
          }

          if (data.profile) {
            if (data.role === 'STUDENT') {
              setStudentForm(prev => normalizeStudentProfileForForm(data.profile, prev));
            } else if (data.role === 'INDUSTRY' || data.role === 'ORGANIZATION') {
              setIndustryForm(prev => ({
                ...prev,
                ...data.profile,
                address: data.profile.address || prev.address,
                hiringPreferences: data.profile.hiringPreferences || prev.hiringPreferences,
                verificationDocs: Array.isArray(data.profile.verificationDocs) && data.profile.verificationDocs.length > 0 ? data.profile.verificationDocs : prev.verificationDocs,
              }));
            } else if (data.role === 'INSTITUTE') {
              setInstituteForm(prev => ({
                ...prev,
                ...data.profile,
                address: data.profile.address || prev.address,
                departments: Array.isArray(data.profile.departments) && data.profile.departments.length > 0 ? data.profile.departments : prev.departments,
                placementContact: data.profile.placementContact || prev.placementContact,
                accreditationDetails: data.profile.accreditationDetails || prev.accreditationDetails,
                verificationDocs: Array.isArray(data.profile.verificationDocs) && data.profile.verificationDocs.length > 0 ? data.profile.verificationDocs : prev.verificationDocs,
              }));
            }

            if (data.currentStep && data.currentStep > 1) {
              setCurrentStep(data.currentStep);
            }
          }
        }
      } catch (err) {
        console.warn('Initial draft rehydration notice:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------------------------------

  const handleSaveDraft = async (stepToSave = currentStep, silent = false) => {
    try {
      if (!silent) setSaving(true);
      setError(null);

      const activeFormData = role === 'STUDENT' ? studentForm : (role === 'INDUSTRY' ? industryForm : instituteForm);

      const res = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          step: stepToSave,
          profileData: activeFormData,
          action: 'SAVE_DRAFT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile draft');
      }

      if (!silent) {
        setSuccessMsg('Profile progress saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Client-side validation check
      if (role === 'STUDENT') {
        if (!studentForm.headline?.trim() || !studentForm.bio?.trim()) {
          throw new Error('Please fill in your Professional Headline and Personal Bio in Step 1');
        }
        if (!studentForm.instituteName?.trim() || !studentForm.department?.trim() || !studentForm.degree?.trim()) {
          throw new Error('Please fill in your College, Department, and Degree in Step 2');
        }
        if (!studentForm.skills || studentForm.skills.length < 3) {
          throw new Error('Please add at least 3 skills with proficiency levels in Step 3');
        }
        if (studentForm.cgpa) {
          const val = parseFloat(studentForm.cgpa);
          if (isNaN(val) || val < 0 || val > 10) {
            throw new Error('CGPA must be a valid number between 0.0 and 10.0');
          }
        }
      } else if (role === 'INDUSTRY') {
        if (!industryForm.companyName?.trim()) {
          throw new Error('Company Name is required in Step 1');
        }
        if (!industryForm.registrationNumber?.trim() || !industryForm.taxIdGstin?.trim()) {
          throw new Error('Company Registration Number (CIN) and Tax ID (GSTIN) are required in Step 2');
        }
        if (!industryForm.contactPhone?.trim()) {
          throw new Error('Primary contact phone is required in Step 3');
        }
      } else if (role === 'INSTITUTE') {
        if (!instituteForm.instituteName?.trim() || !instituteForm.instituteCode?.trim()) {
          throw new Error('Institute Name and AISHE/Institute Code are required in Step 1');
        }
        if (!instituteForm.contactPhone?.trim()) {
          throw new Error('Campus Contact Phone is required in Step 2');
        }
        if (!instituteForm.departments || instituteForm.departments.length === 0) {
          throw new Error('At least one academic department must be registered in Step 3');
        }
      }

      const activeFormData = role === 'STUDENT' ? studentForm : (role === 'INDUSTRY' ? industryForm : instituteForm);

      const res = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          step: activeSteps.length,
          profileData: activeFormData,
          action: 'COMPLETE_ONBOARDING',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete profile setup');
      }

      setSuccessMsg('Profile setup completed successfully! Redirecting to your dashboard...');

      const targetDashboard = data.redirectUrl || (
        role === 'STUDENT' ? '/student/dashboard' : (role === 'INDUSTRY' ? '/industry/dashboard' : '/institute/dashboard')
      );

      setTimeout(() => {
        router.replace(targetDashboard);
      }, 1200);

    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < activeSteps.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      handleSaveDraft(next, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading profile setup wizard...</span>
        </div>
      </div>
    );
  }

  // Theme color accents per role
  const roleColor = role === 'STUDENT' ? 'emerald' : (role === 'INDUSTRY' ? 'blue' : 'purple');

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      
      {/* -------------------------------------------------------------------- */}
      {/* TOP HEADER & ROLE SELECTOR (If unlocked)                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                role === 'STUDENT'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : role === 'INDUSTRY'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}>
                {role} ONBOARDING
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Step {currentStep} of {activeSteps.length}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {role === 'STUDENT' ? 'Student Profile & Skill Verification Setup' : (
                role === 'INDUSTRY' ? 'Industry Organization & Recruiter Setup' : 'Academic Institute Onboarding Setup'
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {role === 'STUDENT'
                ? 'Complete your verified skill credentials to unlock automated 100% High-Priority job matching.'
                : role === 'INDUSTRY'
                ? 'Set up statutory organization details to publish opportunities and discover verified talent.'
                : 'Configure academic departments and placement contacts for aggregated skill analytics.'
              }
            </p>
          </div>

          {/* Role switcher (available only if not locked to an existing DB account) */}
          {!roleLocked && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => { setRole('STUDENT'); setCurrentStep(1); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  role === 'STUDENT' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => { setRole('INDUSTRY'); setCurrentStep(1); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  role === 'INDUSTRY' ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Industry
              </button>
              <button
                type="button"
                onClick={() => { setRole('INSTITUTE'); setCurrentStep(1); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  role === 'INSTITUTE' ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Institute
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* REAL-TIME DYNAMIC PROGRESS BAR (0-100%)                             */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">Overall Profile Completion</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                completionDetails.completion >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : completionDetails.completion >= 50
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {completionDetails.completion}% Complete
              </span>
            </div>

            <div className="flex items-center gap-2">
              {saving && <span className="text-[11px] text-teal-400 animate-pulse font-mono">Autosaving draft...</span>}
              <button
                type="button"
                onClick={() => handleSaveDraft(currentStep)}
                disabled={saving}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 p-0.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                role === 'STUDENT'
                  ? 'from-emerald-500 via-teal-400 to-cyan-400 shadow-emerald-500/50'
                  : role === 'INDUSTRY'
                  ? 'from-blue-500 via-indigo-400 to-cyan-400 shadow-blue-500/50'
                  : 'from-purple-500 via-indigo-400 to-pink-400 shadow-purple-500/50'
              }`}
              style={{ width: `${Math.max(5, completionDetails.completion)}%` }}
            />
          </div>

          {/* Missing fields prompt if incomplete */}
          {completionDetails.missingFields.length > 0 && currentStep === activeSteps.length && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Pending fields for 100% completion: </span>
                <span>{completionDetails.missingFields.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* STEPPERS NAVIGATION TABS                                              */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {activeSteps.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === currentStep;
          const isPassed = s.id < currentStep;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setCurrentStep(s.id);
                handleSaveDraft(s.id, true);
              }}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                isActive
                  ? role === 'STUDENT'
                    ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-500/10'
                    : role === 'INDUSTRY'
                    ? 'bg-blue-950/50 border-blue-500/50 text-blue-200 shadow-lg shadow-blue-500/10'
                    : 'bg-purple-950/50 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-500/10'
                  : isPassed
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-slate-950/50 border-slate-900 text-slate-500 hover:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono ${
                  isActive
                    ? 'bg-white text-slate-950'
                    : isPassed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isPassed ? '✓' : s.id}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="font-bold text-xs truncate">{s.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* NOTIFICATIONS & MESSAGES                                             */}
      {/* -------------------------------------------------------------------- */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* STEP CONTENT CONTAINER                                               */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        
        {/* ================================================================== */}
        {/* ROLE 1: STUDENT FORM STEPS                                         */}
        {/* ================================================================== */}
        {role === 'STUDENT' && (
          <div className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" /> Personal & Professional Headline
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Introduce yourself to recruiters and platform algorithms.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      value={studentForm.fullName}
                      onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Contact Phone</label>
                    <input
                      type="text"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Professional Headline *</label>
                    <input
                      type="text"
                      value={studentForm.headline}
                      onChange={(e) => setStudentForm({ ...studentForm, headline: e.target.value })}
                      placeholder="e.g. Aspiring Full-Stack Engineer | React • Node.js • PostgreSQL"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Personal Bio & Background *</label>
                    <textarea
                      rows={4}
                      value={studentForm.bio}
                      onChange={(e) => setStudentForm({ ...studentForm, bio: e.target.value })}
                      placeholder="Share a brief overview of your background, academic focus, and career aspirations..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Academic Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-400" /> Academic Credentials & Institute
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter college details for verified academic pedigree.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">College / Institute Name *</label>
                    <input
                      type="text"
                      value={studentForm.instituteName}
                      onChange={(e) => setStudentForm({ ...studentForm, instituteName: e.target.value })}
                      placeholder="e.g. National Institute of Technology Surathkal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Department / Major *</label>
                    <input
                      type="text"
                      value={studentForm.department}
                      onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Degree Program *</label>
                    <select
                      value={studentForm.degree}
                      onChange={(e) => setStudentForm({ ...studentForm, degree: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="B.Tech">B.Tech / B.E.</option>
                      <option value="M.Tech">M.Tech / M.E.</option>
                      <option value="BCA">BCA / MCA</option>
                      <option value="B.Sc">B.Sc / M.Sc</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Current Year of Study *</label>
                    <select
                      value={studentForm.yearOfStudy}
                      onChange={(e) => setStudentForm({ ...studentForm, yearOfStudy: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year (Graduating)</option>
                      <option value="5">5th Year / Dual Degree</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Cumulative CGPA (0.0 - 10.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={studentForm.cgpa}
                      onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })}
                      placeholder="e.g. 8.75"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Skills */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" /> Skill Matrix (Minimum 3 Skills Required)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Add demonstrated skills with proficiency levels for gatekeeper matching.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentForm({
                        ...studentForm,
                        skills: [...(studentForm.skills || []), { name: '', proficiency: 'Intermediate', category: 'General' }],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Skill
                  </button>
                </div>

                <div className="space-y-3">
                  {studentForm.skills?.map((sk, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="text"
                        value={sk.name || ''}
                        onChange={(e) => {
                          const updated = [...studentForm.skills];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setStudentForm({ ...studentForm, skills: updated });
                        }}
                        placeholder="Skill Name (e.g. Python, React, PostgreSQL)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />

                      <select
                        value={sk.proficiency || 'Intermediate'}
                        onChange={(e) => {
                          const updated = [...studentForm.skills];
                          updated[idx] = { ...updated[idx], proficiency: e.target.value };
                          setStudentForm({ ...studentForm, skills: updated });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="Beginner">Level 1: Beginner</option>
                        <option value="Intermediate">Level 2: Intermediate</option>
                        <option value="Advanced">Level 3: Advanced</option>
                        <option value="Expert">Level 4: Expert</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = studentForm.skills.filter((_, i) => i !== idx);
                          setStudentForm({ ...studentForm, skills: updated });
                        }}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Projects */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <FolderGit2 className="w-5 h-5 text-emerald-400" /> Projects & Repositories
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Showcase hands-on implementation evidence.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentForm({
                        ...studentForm,
                        projects: [...(studentForm.projects || []), { title: '', description: '', techStack: '', projectUrl: '' }],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Project
                  </button>
                </div>

                <div className="space-y-4">
                  {studentForm.projects?.map((proj, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Project #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = studentForm.projects.filter((_, i) => i !== idx);
                            setStudentForm({ ...studentForm, projects: updated });
                          }}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={proj.title || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.projects];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setStudentForm({ ...studentForm, projects: updated });
                          }}
                          placeholder="Project Title"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={proj.techStack || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.projects];
                            updated[idx] = { ...updated[idx], techStack: e.target.value };
                            setStudentForm({ ...studentForm, projects: updated });
                          }}
                          placeholder="Tech Stack (e.g. Next.js, Node, Postgres)"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={proj.projectUrl || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.projects];
                            updated[idx] = { ...updated[idx], projectUrl: e.target.value };
                            setStudentForm({ ...studentForm, projects: updated });
                          }}
                          placeholder="Live Demo / GitHub URL"
                          className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={proj.description || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.projects];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setStudentForm({ ...studentForm, projects: updated });
                          }}
                          placeholder="Brief description of the problem solved and your contribution..."
                          className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Certifications */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" /> Certifications & Verified Credentials
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Add industry or academic certifications (AWS, Google, NPTEL, Coursera).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentForm({
                        ...studentForm,
                        certifications: [...(studentForm.certifications || []), { name: '', issuingOrg: '', issueDate: '', credentialUrl: '' }],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Certificate
                  </button>
                </div>

                <div className="space-y-3">
                  {studentForm.certifications?.map((cert, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={cert.name || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.certifications];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setStudentForm({ ...studentForm, certifications: updated });
                          }}
                          placeholder="Certification Name"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={cert.issuingOrg || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.certifications];
                            updated[idx] = { ...updated[idx], issuingOrg: e.target.value };
                            setStudentForm({ ...studentForm, certifications: updated });
                          }}
                          placeholder="Issuing Organization"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={cert.credentialUrl || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.certifications];
                            updated[idx] = { ...updated[idx], credentialUrl: e.target.value };
                            setStudentForm({ ...studentForm, certifications: updated });
                          }}
                          placeholder="Credential / Verification URL"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Experience */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-emerald-400" /> Work Experience & Internships
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Add previous internships, freelance, or research experience.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentForm({
                        ...studentForm,
                        experience: [...(studentForm.experience || []), { title: '', company: '', duration: '', description: '' }],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Experience
                  </button>
                </div>

                <div className="space-y-3">
                  {studentForm.experience?.map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={exp.title || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.experience];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setStudentForm({ ...studentForm, experience: updated });
                          }}
                          placeholder="Job / Role Title"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.experience];
                            updated[idx] = { ...updated[idx], company: e.target.value };
                            setStudentForm({ ...studentForm, experience: updated });
                          }}
                          placeholder="Company / Organization"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={exp.duration || ''}
                          onChange={(e) => {
                            const updated = [...studentForm.experience];
                            updated[idx] = { ...updated[idx], duration: e.target.value };
                            setStudentForm({ ...studentForm, experience: updated });
                          }}
                          placeholder="e.g. May 2025 - Jul 2025"
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Preferences */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" /> Career Preferences & Placement Goals
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Set target roles and work preferences for intelligent matching.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Opportunity Type</label>
                    <select
                      value={studentForm.careerPreferences?.jobType || 'Full-time'}
                      onChange={(e) => {
                        setStudentForm({
                          ...studentForm,
                          careerPreferences: { ...studentForm.careerPreferences, jobType: e.target.value },
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Full-time">Full-time Placement</option>
                      <option value="Internship">Internship (Summer / 6 Months)</option>
                      <option value="Both">Both (Internship + PPO)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Preferred Locations (comma separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(studentForm.careerPreferences?.preferredLocations) ? studentForm.careerPreferences.preferredLocations.join(', ') : ''}
                      onChange={(e) => {
                        const locs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setStudentForm({
                          ...studentForm,
                          careerPreferences: { ...studentForm.careerPreferences, preferredLocations: locs },
                        });
                      }}
                      placeholder="e.g. Bengaluru, Remote, Hyderabad, Pune"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Target Roles (comma separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(studentForm.careerPreferences?.preferredRoles) ? studentForm.careerPreferences.preferredRoles.join(', ') : ''}
                      onChange={(e) => {
                        const rolesList = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setStudentForm({
                          ...studentForm,
                          careerPreferences: { ...studentForm.careerPreferences, preferredRoles: rolesList },
                        });
                      }}
                      placeholder="e.g. Full-Stack Developer, Data Analyst, Cloud Engineer"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Review & Submit */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Review & Submit Profile
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Review your completed details before finalizing your verified student account.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-300">Basic & Academic Summary</span>
                    <p className="text-slate-400"><strong className="text-slate-200">Name:</strong> {studentForm.fullName || 'Not provided'}</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Headline:</strong> {studentForm.headline || 'Not provided'}</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Institute:</strong> {studentForm.instituteName || 'Not provided'}</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Degree & Year:</strong> {studentForm.degree} • Year {studentForm.yearOfStudy}</p>
                    <p className="text-slate-400"><strong className="text-slate-200">CGPA:</strong> {studentForm.cgpa || 'N/A'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-300">Skills & Projects Count</span>
                    <p className="text-slate-400"><strong className="text-slate-200">Total Skills:</strong> {studentForm.skills?.length || 0} skills</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Projects:</strong> {studentForm.projects?.length || 0} projects</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Certifications:</strong> {studentForm.certifications?.length || 0} credentials</p>
                    <p className="text-slate-400"><strong className="text-slate-200">Score:</strong> {completionDetails.completion}%</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-emerald-500 mt-0.5 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300">
                      I declare that the academic credentials, skills, and portfolio links provided are accurate and genuine.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* ROLE 2: INDUSTRY FORM STEPS                                        */}
        {/* ================================================================== */}
        {role === 'INDUSTRY' && (
          <div className="space-y-6">
            {/* Step 1: Company Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" /> Organization & Company Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Set up your enterprise profile and branding.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Company / Organization Name *</label>
                    <input
                      type="text"
                      value={industryForm.companyName}
                      onChange={(e) => setIndustryForm({ ...industryForm, companyName: e.target.value })}
                      placeholder="e.g. Apex Analytics Corporation"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Company Size *</label>
                    <select
                      value={industryForm.companySize}
                      onChange={(e) => setIndustryForm({ ...industryForm, companySize: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="1-10">1-10 Employees (Startup)</option>
                      <option value="11-50">11-50 Employees (Early Stage)</option>
                      <option value="51-200">51-200 Employees (Growth)</option>
                      <option value="201-500">201-500 Employees (Mid-Market)</option>
                      <option value="500+">500+ Employees (Enterprise)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Official Website *</label>
                    <input
                      type="url"
                      value={industryForm.website}
                      onChange={(e) => setIndustryForm({ ...industryForm, website: e.target.value })}
                      placeholder="https://apexanalytics.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Legal & Registration */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-blue-400" /> Statutory Legal Registration & Tax IDs
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide verified corporate registration details for KYC compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Registration Number (CIN / LLPIN) *</label>
                    <input
                      type="text"
                      value={industryForm.registrationNumber}
                      onChange={(e) => setIndustryForm({ ...industryForm, registrationNumber: e.target.value })}
                      placeholder="e.g. U72200KA2021PTC145892"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Tax ID (15-digit GSTIN) *</label>
                    <input
                      type="text"
                      value={industryForm.taxIdGstin}
                      onChange={(e) => setIndustryForm({ ...industryForm, taxIdGstin: e.target.value })}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact & HQ */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-blue-400" /> Recruiter Contact & Headquarters Address
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Lead Recruiter / Contact Person *</label>
                    <input
                      type="text"
                      value={industryForm.primaryContactName}
                      onChange={(e) => setIndustryForm({ ...industryForm, primaryContactName: e.target.value })}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Contact Phone *</label>
                    <input
                      type="text"
                      value={industryForm.contactPhone}
                      onChange={(e) => setIndustryForm({ ...industryForm, contactPhone: e.target.value })}
                      placeholder="+91 80 4123 4567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Headquarters Street Address *</label>
                    <input
                      type="text"
                      value={industryForm.address?.street || ''}
                      onChange={(e) => setIndustryForm({
                        ...industryForm,
                        address: { ...industryForm.address, street: e.target.value },
                      })}
                      placeholder="Tech Park, Outer Ring Road, Bengaluru"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Industry & Domains */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" /> Industry Sector & Domain Specializations
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Primary Industry Sector *</label>
                    <input
                      type="text"
                      value={industryForm.industry}
                      onChange={(e) => setIndustryForm({ ...industryForm, industry: e.target.value })}
                      placeholder="e.g. Information Technology & Big Data Analytics"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Hiring Focus */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-blue-400" /> Hiring Focus & Campus Preferences
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Hiring Model</label>
                    <select
                      value={industryForm.hiringPreferences?.hiringType || 'Both'}
                      onChange={(e) => setIndustryForm({
                        ...industryForm,
                        hiringPreferences: { ...industryForm.hiringPreferences, hiringType: e.target.value },
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Both">Both (Internship + Full-time Placement)</option>
                      <option value="Internship">Internship Only</option>
                      <option value="Full-Time">Full-Time Placement Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Minimum CGPA Filter</label>
                    <input
                      type="text"
                      value={industryForm.hiringPreferences?.minCgpa || '7.5'}
                      onChange={(e) => setIndustryForm({
                        ...industryForm,
                        hiringPreferences: { ...industryForm.hiringPreferences, minCgpa: e.target.value },
                      })}
                      placeholder="e.g. 7.5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: KYC Docs */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" /> Statutory KYC Verification Documents
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Uploaded documents are reviewed by platform administration for the Verified Industry badge.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="font-bold text-xs text-slate-200">Statutory Documents Attached</div>
                      <div className="text-[11px] text-slate-400">Certificate of Incorporation & GSTIN Registration Certificate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" /> Review & Submit for KYC Verification
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-400"><strong className="text-slate-200">Company:</strong> {industryForm.companyName || 'Not provided'}</p>
                  <p className="text-slate-400"><strong className="text-slate-200">CIN:</strong> {industryForm.registrationNumber || 'Not provided'}</p>
                  <p className="text-slate-400"><strong className="text-slate-200">GSTIN:</strong> {industryForm.taxIdGstin || 'Not provided'}</p>
                  <p className="text-slate-400"><strong className="text-slate-200">Contact:</strong> {industryForm.primaryContactName} ({industryForm.contactPhone})</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-blue-500 mt-0.5 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-300">
                      I declare that I am an authorized corporate representative of this entity and all submitted statutory registration details are authentic.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* ROLE 3: INSTITUTE FORM STEPS                                       */}
        {/* ================================================================== */}
        {role === 'INSTITUTE' && (
          <div className="space-y-6">
            {/* Step 1: Institute Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <School className="w-5 h-5 text-purple-400" /> Academic Institute Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Institute / University Name *</label>
                    <input
                      type="text"
                      value={instituteForm.instituteName}
                      onChange={(e) => setInstituteForm({ ...instituteForm, instituteName: e.target.value })}
                      placeholder="e.g. National Institute of Technology Surathkal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">AISHE / Institute Code *</label>
                    <input
                      type="text"
                      value={instituteForm.instituteCode}
                      onChange={(e) => setInstituteForm({ ...instituteForm, instituteCode: e.target.value })}
                      placeholder="e.g. AISHE-U-0123"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Institute Type *</label>
                    <select
                      value={instituteForm.instituteType}
                      onChange={(e) => setInstituteForm({ ...instituteForm, instituteType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="Autonomous University / Institute of National Importance">Autonomous University / IIT / NIT</option>
                      <option value="Affiliated Engineering College">Affiliated Engineering College</option>
                      <option value="State University">State University</option>
                      <option value="Deemed University">Deemed University</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Campus & Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-400" /> Campus Address & Official Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Contact Phone *</label>
                    <input
                      type="text"
                      value={instituteForm.contactPhone}
                      onChange={(e) => setInstituteForm({ ...instituteForm, contactPhone: e.target.value })}
                      placeholder="+91 824 2474000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Campus City *</label>
                    <input
                      type="text"
                      value={instituteForm.address?.city || ''}
                      onChange={(e) => setInstituteForm({
                        ...instituteForm,
                        address: { ...instituteForm.address, city: e.target.value },
                      })}
                      placeholder="e.g. Mangalore / Surathkal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Departments */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-400" /> Academic Departments
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInstituteForm({
                        ...instituteForm,
                        departments: [...(instituteForm.departments || []), { name: '', code: '', headOfDept: '', studentCount: '120' }],
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Department
                  </button>
                </div>

                <div className="space-y-3">
                  {instituteForm.departments?.map((dept, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <input
                        type="text"
                        value={dept.name || ''}
                        onChange={(e) => {
                          const updated = [...instituteForm.departments];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setInstituteForm({ ...instituteForm, departments: updated });
                        }}
                        placeholder="Department Name (e.g. Computer Science & Engineering)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={dept.code || ''}
                        onChange={(e) => {
                          const updated = [...instituteForm.departments];
                          updated[idx] = { ...updated[idx], code: e.target.value };
                          setInstituteForm({ ...instituteForm, departments: updated });
                        }}
                        placeholder="Code (e.g. CSE)"
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Placement Cell */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-purple-400" /> Training & Placement Cell Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">TPO / Head Name *</label>
                    <input
                      type="text"
                      value={instituteForm.placementContact?.tpoName || ''}
                      onChange={(e) => setInstituteForm({
                        ...instituteForm,
                        placementContact: { ...instituteForm.placementContact, tpoName: e.target.value },
                      })}
                      placeholder="e.g. Prof. S. K. Nair"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Placement Cell Email *</label>
                    <input
                      type="email"
                      value={instituteForm.placementContact?.email || ''}
                      onChange={(e) => setInstituteForm({
                        ...instituteForm,
                        placementContact: { ...instituteForm.placementContact, email: e.target.value },
                      })}
                      placeholder="tpo@institute.ac.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Accreditation */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" /> Accreditation & Recognition
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">NAAC Grade</label>
                    <input
                      type="text"
                      value={instituteForm.accreditationDetails?.naacGrade || 'A++'}
                      onChange={(e) => setInstituteForm({
                        ...instituteForm,
                        accreditationDetails: { ...instituteForm.accreditationDetails, naacGrade: e.target.value },
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">NIRF Engineering Rank</label>
                    <input
                      type="text"
                      value={instituteForm.accreditationDetails?.nirfRank || '25'}
                      onChange={(e) => setInstituteForm({
                        ...instituteForm,
                        accreditationDetails: { ...instituteForm.accreditationDetails, nirfRank: e.target.value },
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" /> Review & Submit Institute Profile
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-400"><strong className="text-slate-200">Institute:</strong> {instituteForm.instituteName}</p>
                  <p className="text-slate-400"><strong className="text-slate-200">AISHE Code:</strong> {instituteForm.instituteCode}</p>
                  <p className="text-slate-400"><strong className="text-slate-200">TPO:</strong> {instituteForm.placementContact?.tpoName}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-purple-500 mt-0.5 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-300">
                      I declare that I am the authorized representative of this educational institution.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* BOTTOM STEPPER CONTROLS & ACTIONS                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="pt-6 mt-8 border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || submitting}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 border transition ${
              currentStep === 1 || submitting
                ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-600'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-3">
            {currentStep < activeSteps.length ? (
              <button
                type="button"
                onClick={handleNextStep}
                className={`px-6 py-2.5 rounded-2xl font-bold text-xs text-slate-950 flex items-center gap-2 shadow-lg transition-all ${
                  role === 'STUDENT'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20'
                    : role === 'INDUSTRY'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 shadow-blue-500/20'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 shadow-purple-500/20'
                }`}
              >
                <span>Save & Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting || !declarationChecked}
                className={`px-8 py-3 rounded-2xl font-black text-xs text-slate-950 flex items-center gap-2 shadow-xl transition-all ${
                  submitting || !declarationChecked
                    ? 'opacity-50 cursor-not-allowed bg-slate-600'
                    : role === 'STUDENT'
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:scale-[1.02] shadow-emerald-500/30'
                    : role === 'INDUSTRY'
                    ? 'bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 hover:scale-[1.02] shadow-blue-500/30'
                    : 'bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 hover:scale-[1.02] shadow-purple-500/30'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
