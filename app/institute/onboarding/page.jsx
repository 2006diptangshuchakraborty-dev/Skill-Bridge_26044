"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  School,
  MapPin,
  BookOpen,
  Users2,
  FileCheck2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Award,
  Sparkles,
} from 'lucide-react';
import { calculateInstituteCompletion } from '@/lib/onboarding-calc';

const STEPS = [
  { id: 1, name: 'Institute Basics', icon: School, desc: 'Name, AISHE & website' },
  { id: 2, name: 'Campus & Location', icon: MapPin, desc: 'Address, state & pin' },
  { id: 3, name: 'Departments', icon: BookOpen, desc: 'Programs & student counts' },
  { id: 4, name: 'Placement Cell', icon: Users2, desc: 'TPO & official contacts' },
  { id: 5, name: 'Accreditation', icon: Award, desc: 'NAAC, NBA & docs' },
  { id: 6, name: 'Declaration', icon: CheckCircle2, desc: 'Review & submit' },
];

export default function InstituteOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
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
      { name: 'Computer Science & Engineering', code: 'CSE', headOfDept: '', studentCount: '240' },
      { name: 'Information Technology & AI', code: 'IT-AI', headOfDept: '', studentCount: '180' },
      { name: 'Electronics & Communication', code: 'ECE', headOfDept: '', studentCount: '180' },
    ],
    placementContact: {
      tpoName: '',
      designation: 'Head, Training & Placement Cell',
      email: '',
      phone: '',
    },
    accreditationDetails: {
      naacGrade: 'A++',
      nirfRank: '25',
      aicteApproved: true,
      nbaAccredited: true,
    },
    verificationDocs: [
      {
        docType: 'AISHE / UGC Recognition Certificate',
        fileName: 'AISHE_Approval_Doc.pdf',
        fileUrl: 'https://docs.skillbridge.gov/sample_aishe.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ],
  });

  const completionScore = calculateInstituteCompletion(formData);

  // Rehydrate state on mount
  useEffect(() => {
    async function fetchDraft() {
      try {
        setLoading(true);
        const res = await fetch('/api/institute/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setFormData(prev => ({
              ...prev,
              ...data.profile,
              address: typeof data.profile.address === 'object' ? data.profile.address : prev.address,
              departments: Array.isArray(data.profile.departments) && data.profile.departments.length > 0
                ? data.profile.departments
                : prev.departments,
              placementContact: data.profile.placementContact || prev.placementContact,
              accreditationDetails: data.profile.accreditationDetails || prev.accreditationDetails,
              verificationDocs: Array.isArray(data.profile.verificationDocs) && data.profile.verificationDocs.length > 0
                ? data.profile.verificationDocs
                : prev.verificationDocs,
            }));
            if (data.currentStep && data.currentStep > 1 && data.currentStep <= 6) {
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

      const res = await fetch('/api/institute/onboarding', {
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
        setSuccessMsg('Academic institution draft saved successfully!');
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
    if (!declarationChecked) {
      setError('Please check the statutory academic declaration before submission.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/institute/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 6,
          profileData: formData,
          action: 'COMPLETE_ONBOARDING',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete institute onboarding');
      }

      setSuccessMsg('Institute onboarding submitted for statutory verification! Redirecting to academic portal...');
      setTimeout(() => {
        router.push('/institute/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const handlePlacementChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      placementContact: { ...prev.placementContact, [field]: value },
    }));
  };

  const handleAccreditationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      accreditationDetails: { ...prev.accreditationDetails, [field]: value },
    }));
  };

  // Department Array Helpers
  const addDepartment = () => {
    setFormData(prev => ({
      ...prev,
      departments: [
        ...prev.departments,
        { name: '', code: '', headOfDept: '', studentCount: '120' },
      ],
    }));
  };

  const updateDepartment = (idx, field, val) => {
    const updated = [...formData.departments];
    updated[idx][field] = val;
    setFormData(prev => ({ ...prev, departments: updated }));
  };

  const removeDepartment = (idx) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.filter((_, i) => i !== idx),
    }));
  };

  // Verification Doc Helpers
  const addDoc = () => {
    setFormData(prev => ({
      ...prev,
      verificationDocs: [
        ...prev.verificationDocs,
        {
          docType: 'NAAC / NBA Accreditation Certificate',
          fileName: 'Accreditation_Certificate.pdf',
          fileUrl: 'https://docs.skillbridge.gov/sample_naac.pdf',
          uploadedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const removeDoc = (idx) => {
    setFormData(prev => ({
      ...prev,
      verificationDocs: prev.verificationDocs.filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading academic onboarding wizard...</span>
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
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <School size={16} /> Academic Institution Onboarding
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
              Register University / College Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Onboard your academic institution to map student skill proficiencies and bridge campus-to-industry hiring.
            </p>
          </div>

          {/* Dynamic SVG Completion Gauge */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 self-start sm:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">Onboarding Score</div>
              <div className="text-2xl font-black font-mono text-cyan-400">{completionScore}%</div>
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
                  className="text-cyan-500 transition-all duration-500"
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

        {/* 6-Step Navigation Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-2">
          <div className="flex items-center min-w-[580px] justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all text-left ${
                    isCurrent ? 'text-cyan-400' : isPast ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30'
                        : isPast
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
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
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="flex-shrink-0 text-cyan-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* Step 1: Institute Basics */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 1: Institute Basics & Official Identifiers</h2>
              <p className="text-xs text-slate-400">Enter your institution legal name, AISHE code, and digital presence.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institute / University Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.instituteName}
                  onChange={(e) => handleInputChange('instituteName', e.target.value)}
                  placeholder="e.g. National Institute of Technology Karnataka, Surathkal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    AISHE Code / Registration ID <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.instituteCode}
                    onChange={(e) => handleInputChange('instituteCode', e.target.value)}
                    placeholder="e.g. AISHE-U-0123 / C-12345"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Institution Type <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={formData.instituteType}
                    onChange={(e) => handleInputChange('instituteType', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="IIT / NIT / IIIT (INI)">IIT / NIT / IIIT (Institute of National Importance)</option>
                    <option value="Central / State University">Central / State University</option>
                    <option value="Autonomous Engineering College">Autonomous Engineering College (Tier 1/2)</option>
                    <option value="Deemed-to-be University">Deemed-to-be University</option>
                    <option value="Affiliated Technical Institute">Affiliated Technical Institute (AICTE Approved)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Website URL <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://nitk.ac.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Institutional Email <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.officialEmail}
                    onChange={(e) => handleInputChange('officialEmail', e.target.value)}
                    placeholder="registrar@nitk.edu.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Campus Phone Number <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="+91 824 2474000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Institute Logo URL</label>
                  <input
                    type="text"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    placeholder="https://nitk.ac.in/assets/logo.png"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Campus & Location */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 2: Campus Address & Geographical Location</h2>
              <p className="text-xs text-slate-400">Specify your main campus postal address and state jurisdiction.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Campus Street / Road Address <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="e.g. NH 66, Srinivasnagar, PO Surathkal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    City / District <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="Mangalore / Surathkal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State / UT <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address?.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="Karnataka"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    PIN Code <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address?.postalCode || ''}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    placeholder="575025"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Academic Departments & Programs */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 3: Academic Departments & Programs</h2>
                <p className="text-xs text-slate-400">List engineering, computing, and professional departments active at your campus.</p>
              </div>
              <button
                type="button"
                onClick={addDepartment}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Department
              </button>
            </div>

            <div className="space-y-3">
              {formData.departments.map((dept, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={dept.name}
                        onChange={(e) => updateDepartment(idx, 'name', e.target.value)}
                        placeholder="Department Name (e.g. Computer Science)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={dept.code}
                        onChange={(e) => updateDepartment(idx, 'code', e.target.value)}
                        placeholder="Code (CSE)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 uppercase font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={dept.headOfDept || ''}
                        onChange={(e) => updateDepartment(idx, 'headOfDept', e.target.value)}
                        placeholder="HOD Name (Optional)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        value={dept.studentCount || ''}
                        onChange={(e) => updateDepartment(idx, 'studentCount', e.target.value)}
                        placeholder="Intake (e.g. 180)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDepartment(idx)}
                    className="text-slate-500 hover:text-rose-400 p-2 transition-colors self-end sm:self-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Placement / TPO Contact */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 4: Training & Placement Cell (TPO) Contact</h2>
              <p className="text-xs text-slate-400">Point of contact for recruiters, campus placement drives, and skill gap alerts.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    TPO / Placement Officer Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.placementContact?.tpoName || ''}
                    onChange={(e) => handlePlacementChange('tpoName', e.target.value)}
                    placeholder="e.g. Prof. S. K. Nair"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={formData.placementContact?.designation || ''}
                    onChange={(e) => handlePlacementChange('designation', e.target.value)}
                    placeholder="Head, Training & Placement Cell"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Placement Official Email <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.placementContact?.email || ''}
                    onChange={(e) => handlePlacementChange('email', e.target.value)}
                    placeholder="tpo@nitk.edu.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    TPO Direct Phone / Mobile <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.placementContact?.phone || ''}
                    onChange={(e) => handlePlacementChange('phone', e.target.value)}
                    placeholder="+91 824 2474050"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Accreditation & Verification Documents */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 5: Accreditation & Regulatory Documents</h2>
                <p className="text-xs text-slate-400">NAAC / NBA ratings and statutory recognition approvals for platform verification.</p>
              </div>
              <button
                type="button"
                onClick={addDoc}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Document
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">NAAC Grade</label>
                  <select
                    value={formData.accreditationDetails?.naacGrade || 'A++'}
                    onChange={(e) => handleAccreditationChange('naacGrade', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="A++">A++ (CGPA &gt;= 3.51)</option>
                    <option value="A+">A+ (CGPA 3.26 - 3.50)</option>
                    <option value="A">A (CGPA 3.01 - 3.25)</option>
                    <option value="B++">B++</option>
                    <option value="B+">B+</option>
                    <option value="Not Applicable">Not Applicable / In Progress</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">NIRF Ranking Band</label>
                  <input
                    type="text"
                    value={formData.accreditationDetails?.nirfRank || ''}
                    onChange={(e) => handleAccreditationChange('nirfRank', e.target.value)}
                    placeholder="e.g. Top 25 (Engineering)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Uploaded Verification Docs */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Attached Verification Documents ({formData.verificationDocs.length}) <span className="text-cyan-400">*</span>
                </label>
                {formData.verificationDocs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                        <FileCheck2 size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200">{doc.docType}</span>
                        <p className="text-[11px] text-slate-400">{doc.fileName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                      >
                        <ExternalLink size={14} /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => removeDoc(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Statutory Declaration */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 6: Review & Academic Statutory Declaration</h2>
              <p className="text-xs text-slate-400">Confirm institutional particulars before administrative onboarding submission.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Institute Profile</span>
                  <button onClick={() => setCurrentStep(1)} className="text-cyan-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300 font-bold">{formData.instituteName}</p>
                <p className="text-slate-400">AISHE / Code: <span className="font-mono text-cyan-300">{formData.instituteCode || 'N/A'}</span></p>
                <p className="text-slate-400">Type: {formData.instituteType}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Campus Location</span>
                  <button onClick={() => setCurrentStep(2)} className="text-cyan-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300">{formData.address?.street}</p>
                <p className="text-slate-400">{formData.address?.city}, {formData.address?.state} - {formData.address?.postalCode}</p>
                <p className="text-slate-500">{formData.website}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Academic Departments ({formData.departments.length})</span>
                  <button onClick={() => setCurrentStep(3)} className="text-cyan-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300">{formData.departments.map(d => d.code || d.name).join(', ')}</p>
                <p className="text-slate-400">Total Departments: {formData.departments.length}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Placement Cell Contact</span>
                  <button onClick={() => setCurrentStep(4)} className="text-cyan-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300">{formData.placementContact?.tpoName} ({formData.placementContact?.designation})</p>
                <p className="text-slate-400">{formData.placementContact?.email} | {formData.placementContact?.phone}</p>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="inst-declaration"
                checked={declarationChecked}
                onChange={(e) => setDeclarationChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="inst-declaration" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                <strong>Academic Statutory Declaration:</strong> I hereby certify that I am an authorized institutional authority of <strong>{formData.instituteName || 'this university/college'}</strong> and the accreditation credentials, department details, and placement cell contacts submitted herein are genuine and valid.
              </label>
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
              onClick={() => handleSaveDraft(currentStep)}
              disabled={saving || submitting}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                <ShieldCheck size={16} /> {submitting ? 'Submitting...' : 'Complete Academic Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
