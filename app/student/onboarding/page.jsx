"use client";

import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { calculateStudentCompletion } from '@/lib/onboarding-calc';

const STEPS = [
  { id: 1, name: 'Basic Info', icon: User, desc: 'Headline & summary' },
  { id: 2, name: 'Academic', icon: GraduationCap, desc: 'Institute & degree' },
  { id: 3, name: 'Skills', icon: Sparkles, desc: 'Proficiency levels' },
  { id: 4, name: 'Projects', icon: FolderGit2, desc: 'Portfolio & code' },
  { id: 5, name: 'Certifications', icon: Award, desc: 'Verified credentials' },
  { id: 6, name: 'Experience', icon: Briefcase, desc: 'Internships & jobs' },
  { id: 7, name: 'Preferences', icon: Target, desc: 'Roles & location' },
  { id: 8, name: 'Review', icon: CheckCircle2, desc: 'Finalize & submit' },
];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    headline: '',
    bio: '',
    phone: '',
    address: '',
    instituteName: '',
    department: '',
    degree: 'B.Tech',
    yearOfStudy: '3',
    cgpa: '',
    skills: [
      { name: 'JavaScript', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'React.js', proficiency: 'Advanced', category: 'Frontend' },
      { name: 'Node.js', proficiency: 'Intermediate', category: 'Backend' },
    ],
    projects: [
      {
        title: 'Skill Bridge Platform',
        description: 'Role-based skill mapping and vacancy matching engine.',
        techStack: 'React, Node.js, PostgreSQL',
        projectUrl: 'https://github.com/example/skill-bridge',
      },
    ],
    certifications: [
      {
        name: 'AWS Certified Cloud Practitioner',
        issuingOrg: 'Amazon Web Services',
        issueDate: '2025-06',
        credentialUrl: 'https://aws.amazon.com/verify/12345',
      },
    ],
    experience: [
      {
        title: 'Full Stack Engineering Intern',
        company: 'Innovate Labs',
        duration: 'May 2025 - Jul 2025',
        description: 'Built REST APIs and responsive UI dashboards.',
      },
    ],
    careerPreferences: {
      preferredRoles: ['Full-Stack Developer', 'Frontend Engineer'],
      preferredLocations: ['Bengaluru', 'Remote'],
      jobType: 'Full-time',
    },
  });

  // Calculate live completion score
  const completionScore = calculateStudentCompletion(formData);

  // Rehydrate state on mount
  useEffect(() => {
    async function fetchDraft() {
      try {
        setLoading(true);
        const res = await fetch('/api/student/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setFormData(prev => ({
              ...prev,
              ...data.profile,
              skills: Array.isArray(data.profile.skills) && data.profile.skills.length > 0 ? data.profile.skills : prev.skills,
              projects: Array.isArray(data.profile.projects) && data.profile.projects.length > 0 ? data.profile.projects : prev.projects,
              certifications: Array.isArray(data.profile.certifications) && data.profile.certifications.length > 0 ? data.profile.certifications : prev.certifications,
              experience: Array.isArray(data.profile.experience) && data.profile.experience.length > 0 ? data.profile.experience : prev.experience,
              careerPreferences: data.profile.careerPreferences || prev.careerPreferences,
            }));
            if (data.currentStep && data.currentStep > 1 && data.currentStep <= 8) {
              setCurrentStep(data.currentStep);
            }
          }
        }
      } catch (err) {
        console.warn('Could not rehydrate existing draft:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDraft();
  }, []);

  const handleSaveDraft = async (stepToSave = currentStep, silent = false) => {
    try {
      if (!silent) setSaving(true);
      setError(null);

      const res = await fetch('/api/student/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepToSave,
          profileData: formData,
          action: 'SAVE_DRAFT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save step draft');
      }

      if (!silent) {
        setSuccessMsg('Draft progress saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSaveDraft(currentStep, true);
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/student/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 8,
          profileData: formData,
          action: 'COMPLETE_ONBOARDING',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      setSuccessMsg('Onboarding completed! Redirecting to student dashboard...');
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // Field helpers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      careerPreferences: { ...prev.careerPreferences, [field]: value },
    }));
  };

  // Skill Array Helpers
  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', proficiency: 'Intermediate', category: 'General' }],
    }));
  };

  const updateSkill = (idx, field, val) => {
    const updated = [...formData.skills];
    updated[idx][field] = val;
    setFormData(prev => ({ ...prev, skills: updated }));
  };

  const removeSkill = (idx) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== idx),
    }));
  };

  // Project Array Helpers
  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', description: '', techStack: '', projectUrl: '' }],
    }));
  };

  const updateProject = (idx, field, val) => {
    const updated = [...formData.projects];
    updated[idx][field] = val;
    setFormData(prev => ({ ...prev, projects: updated }));
  };

  const removeProject = (idx) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx),
    }));
  };

  // Cert Array Helpers
  const addCert = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuingOrg: '', issueDate: '', credentialUrl: '' }],
    }));
  };

  const updateCert = (idx, field, val) => {
    const updated = [...formData.certifications];
    updated[idx][field] = val;
    setFormData(prev => ({ ...prev, certifications: updated }));
  };

  const removeCert = (idx) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx),
    }));
  };

  // Experience Array Helpers
  const addExp = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }],
    }));
  };

  const updateExp = (idx, field, val) => {
    const updated = [...formData.experience];
    updated[idx][field] = val;
    setFormData(prev => ({ ...prev, experience: updated }));
  };

  const removeExp = (idx) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading onboarding wizard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner & Progress Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <GraduationCap size={16} /> Student Profile Onboarding
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
              Build Your Verified Skill Profile
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete your multi-step profile to unlock AI-powered opportunity matching.
            </p>
          </div>

          {/* Completion Gauge */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 self-start sm:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">Profile Score</div>
              <div className="text-2xl font-black font-mono text-emerald-400">{completionScore}%</div>
            </div>
            <div className="w-14 h-14 relative flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-500"
                  strokeDasharray={`${completionScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-slate-200">{completionScore}%</span>
            </div>
          </div>
        </div>

        {/* 8-Step Navigation Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-2">
          <div className="flex items-center min-w-[700px] justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all text-left ${
                    isCurrent ? 'text-emerald-400' : isPast ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30'
                        : isPast
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                        : 'bg-slate-950 border border-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="text-[11px] font-medium whitespace-nowrap">{step.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step Content Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 1: Professional Headline & Bio</h2>
              <p className="text-xs text-slate-400">Introduce your expertise and key interests to recruiters.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Professional Headline <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="e.g. Final Year CSE Undergrad | Full-Stack & Cloud Developer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Personal Bio & Career Summary <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Summarize your background, core technical skills, and what kind of roles you are seeking..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location / City</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g. Bengaluru, Karnataka"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Academic Info */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 2: Academic Background</h2>
              <p className="text-xs text-slate-400">Specify your university, degree branch, and performance.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institute / University Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.instituteName}
                  onChange={(e) => handleInputChange('instituteName', e.target.value)}
                  placeholder="e.g. National Institute of Technology Karnataka, Surathkal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Department / Branch <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Degree Type</label>
                  <select
                    value={formData.degree}
                    onChange={(e) => handleInputChange('degree', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="B.Tech">B.Tech / B.E.</option>
                    <option value="M.Tech">M.Tech / M.E.</option>
                    <option value="MCA">MCA</option>
                    <option value="BCA">BCA</option>
                    <option value="B.Sc">B.Sc Computer Science</option>
                    <option value="Dual Degree">Integrated Dual Degree</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Year of Study <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={formData.yearOfStudy}
                    onChange={(e) => handleInputChange('yearOfStudy', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="1">1st Year (Freshman)</option>
                    <option value="2">2nd Year (Sophomore)</option>
                    <option value="3">3rd Year (Junior)</option>
                    <option value="4">4th Year (Senior / Final)</option>
                    <option value="5">5th Year / Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">CGPA / Percentage</label>
                  <input
                    type="text"
                    value={formData.cgpa}
                    onChange={(e) => handleInputChange('cgpa', e.target.value)}
                    placeholder="e.g. 8.85 / 10.0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Skills & Proficiency */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 3: Skills & Proficiency Levels</h2>
                <p className="text-xs text-slate-400">Add at least 3 skills to maximize opportunity matching.</p>
              </div>
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Skill
              </button>
            </div>

            <div className="space-y-3">
              {formData.skills.map((skill, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                      placeholder="Skill name (e.g. React, Python, Docker)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <select
                      value={skill.proficiency}
                      onChange={(e) => updateSkill(idx, 'proficiency', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Beginner">Beginner (1/4)</option>
                      <option value="Intermediate">Intermediate (2/4)</option>
                      <option value="Advanced">Advanced (3/4)</option>
                      <option value="Expert">Expert (4/4)</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-36">
                    <select
                      value={skill.category || 'General'}
                      onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Frontend">Frontend</option>
                      <option value="Backend">Backend</option>
                      <option value="Database">Database</option>
                      <option value="DevOps">DevOps</option>
                      <option value="AI/ML">AI / ML</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(idx)}
                    className="text-slate-500 hover:text-rose-400 p-2 transition-colors self-end sm:self-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Projects */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 4: Academic & Personal Projects</h2>
                <p className="text-xs text-slate-400">Showcase your portfolio and real engineering achievements.</p>
              </div>
              <button
                type="button"
                onClick={addProject}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Project
              </button>
            </div>

            <div className="space-y-4">
              {formData.projects.map((proj, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 font-mono">Project #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => updateProject(idx, 'title', e.target.value)}
                      placeholder="Project title (e.g. Distributed Task Queue)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={proj.techStack}
                      onChange={(e) => updateProject(idx, 'techStack', e.target.value)}
                      placeholder="Tech Stack (e.g. React, Go, Redis)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <textarea
                    rows={2}
                    value={proj.description}
                    onChange={(e) => updateProject(idx, 'description', e.target.value)}
                    placeholder="Briefly describe what this project does and problems solved..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />

                  <input
                    type="text"
                    value={proj.projectUrl || ''}
                    onChange={(e) => updateProject(idx, 'projectUrl', e.target.value)}
                    placeholder="GitHub Repo or Demo URL (https://...)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Certifications */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 5: Verified Certifications</h2>
                <p className="text-xs text-slate-400">Add industry-recognized badges and qualifications.</p>
              </div>
              <button
                type="button"
                onClick={addCert}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Certification
              </button>
            </div>

            <div className="space-y-3">
              {formData.certifications.map((cert, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => updateCert(idx, 'name', e.target.value)}
                      placeholder="Certificate Name (e.g. AWS Certified Developer)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cert.issuingOrg}
                        onChange={(e) => updateCert(idx, 'issuingOrg', e.target.value)}
                        placeholder="Issuer (e.g. AWS, Coursera)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={cert.credentialUrl || ''}
                        onChange={(e) => updateCert(idx, 'credentialUrl', e.target.value)}
                        placeholder="Verification Link (https://...)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCert(idx)}
                    className="text-slate-500 hover:text-rose-400 p-2 transition-colors self-end sm:self-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Experience & Internships */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 6: Work & Internship Experience</h2>
                <p className="text-xs text-slate-400">Highlight past internships, open-source work, or campus roles.</p>
              </div>
              <button
                type="button"
                onClick={addExp}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {formData.experience.map((exp, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 font-mono">Role #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExp(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => updateExp(idx, 'title', e.target.value)}
                      placeholder="Title (e.g. Frontend Intern)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExp(idx, 'company', e.target.value)}
                      placeholder="Company (e.g. Google Summer of Code)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => updateExp(idx, 'duration', e.target.value)}
                      placeholder="Duration (e.g. May 2025 - Jul 2025)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={exp.description || ''}
                      onChange={(e) => updateExp(idx, 'description', e.target.value)}
                      placeholder="Key contributions and technologies"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Preferences */}
        {currentStep === 7 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 7: Career & Placement Preferences</h2>
              <p className="text-xs text-slate-400">Tell recruiters your dream roles and working modes.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Job Roles (Comma Separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(formData.careerPreferences?.preferredRoles) ? formData.careerPreferences.preferredRoles.join(', ') : (formData.careerPreferences?.role || '')}
                  onChange={(e) => handlePreferenceChange('preferredRoles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g. Full-Stack Developer, Cloud Engineer, Data Scientist"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Locations</label>
                  <input
                    type="text"
                    value={Array.isArray(formData.careerPreferences?.preferredLocations) ? formData.careerPreferences.preferredLocations.join(', ') : (formData.careerPreferences?.location || '')}
                    onChange={(e) => handlePreferenceChange('preferredLocations', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g. Bengaluru, Hyderabad, Remote"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Employment Type</label>
                  <select
                    value={formData.careerPreferences?.jobType || 'Full-time'}
                    onChange={(e) => handlePreferenceChange('jobType', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Full-time">Full-time Graduate</option>
                    <option value="Internship">Internship</option>
                    <option value="Both">Both (Internship / Full-time)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Review & Submit */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 8: Review & Finalize Profile</h2>
              <p className="text-xs text-slate-400">Review all details before finalizing your verified student profile.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Basic & Academic</span>
                  <button onClick={() => setCurrentStep(1)} className="text-emerald-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-400 font-mono text-[11px]">{formData.headline || 'No headline set'}</p>
                <p className="text-slate-400">{formData.instituteName} • {formData.department} ({formData.degree})</p>
                <p className="text-slate-500">Year {formData.yearOfStudy} • CGPA: {formData.cgpa || 'N/A'}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Skills ({formData.skills.length})</span>
                  <button onClick={() => setCurrentStep(3)} className="text-emerald-400 hover:underline text-[11px]">Edit</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">
                      {s.name} ({s.proficiency})
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Projects ({formData.projects.length})</span>
                  <button onClick={() => setCurrentStep(4)} className="text-emerald-400 hover:underline text-[11px]">Edit</button>
                </div>
                <ul className="space-y-1 text-slate-400">
                  {formData.projects.map((p, i) => (
                    <li key={i}>• {p.title} <span className="text-slate-500">({p.techStack})</span></li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Certifications & Experience</span>
                  <button onClick={() => setCurrentStep(5)} className="text-emerald-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-400">{formData.certifications.length} certifications added</p>
                <p className="text-slate-400">{formData.experience.length} experience entries added</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-emerald-200">
                <span className="font-bold">Ready for Submission:</span> Your profile completion is at{' '}
                <strong className="text-emerald-300 font-mono">{completionScore}%</strong>. Submitting will transition your account to <strong className="text-white">COMPLETED</strong> and grant access to student dashboard and vacancy matching.
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                <ChevronLeft size={16} /> Previous
              </button>
            ) : <div />}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSaveDraft(currentStep, false)}
              disabled={saving}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>

            {currentStep < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> {submitting ? 'Submitting Profile...' : 'Submit & Complete Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
