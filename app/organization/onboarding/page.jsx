"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileCheck2,
  PhoneCall,
  Layers,
  Users2,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { calculateOrganizationCompletion } from '@/lib/onboarding-calc';

const STEPS = [
  { id: 1, name: 'Company Info', icon: Building2, desc: 'Name, size & website' },
  { id: 2, name: 'Registration', icon: FileCheck2, desc: 'CIN, GSTIN & legal ID' },
  { id: 3, name: 'Contact & HQ', icon: PhoneCall, desc: 'Phone & office address' },
  { id: 4, name: 'Industry', icon: Layers, desc: 'Sector & domain' },
  { id: 5, name: 'Hiring Focus', icon: Users2, desc: 'Target roles & types' },
  { id: 6, name: 'KYC Docs', icon: FileText, desc: 'Statutory certificates' },
  { id: 7, name: 'Declaration', icon: CheckCircle2, desc: 'Review & submit' },
];

export default function OrganizationOnboardingPage() {
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
    companyName: '',
    companySize: '51-200',
    website: '',
    logoUrl: '',
    registrationNumber: '',
    taxIdGstin: '',
    companyType: 'Private Limited',
    primaryContactName: '',
    contactPhone: '',
    officialEmail: '',
    address: {
      street: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    industry: 'Information Technology & Services',
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
        docType: 'GSTIN Registration',
        fileName: 'GSTIN_Doc.pdf',
        fileUrl: 'https://docs.skillbridge.gov/sample_gstin.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ],
  });

  const completionScore = calculateOrganizationCompletion(formData);

  // Rehydrate state on mount
  useEffect(() => {
    async function fetchDraft() {
      try {
        setLoading(true);
        const res = await fetch('/api/organization/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setFormData(prev => ({
              ...prev,
              ...data.profile,
              address: typeof data.profile.address === 'object' ? data.profile.address : prev.address,
              hiringPreferences: data.profile.hiringPreferences || prev.hiringPreferences,
              verificationDocs: Array.isArray(data.profile.verificationDocs) && data.profile.verificationDocs.length > 0
                ? data.profile.verificationDocs
                : prev.verificationDocs,
            }));
            if (data.currentStep && data.currentStep > 1 && data.currentStep <= 7) {
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

      const res = await fetch('/api/organization/onboarding', {
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
        setSuccessMsg('Organization draft saved successfully!');
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
      setError('Please check the statutory compliance declaration before submission.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/organization/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 7,
          profileData: formData,
          action: 'COMPLETE_ONBOARDING',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete organization onboarding');
      }

      setSuccessMsg('Organization onboarding submitted for KYC verification! Redirecting to recruiter dashboard...');
      setTimeout(() => {
        router.push('/organization/dashboard');
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

  const handleHiringChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      hiringPreferences: { ...prev.hiringPreferences, [field]: value },
    }));
  };

  const addDoc = () => {
    setFormData(prev => ({
      ...prev,
      verificationDocs: [
        ...prev.verificationDocs,
        {
          docType: 'GSTIN Certificate',
          fileName: 'Document_Upload.pdf',
          fileUrl: 'https://docs.skillbridge.gov/upload_sample.pdf',
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
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading organization onboarding wizard...</span>
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
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building2 size={16} /> Employer KYC Onboarding
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
              Corporate Registration & KYC Verification
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Provide your statutory company identifiers to enable verified talent acquisition and opportunity publishing.
            </p>
          </div>

          {/* Completion Gauge */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 self-start sm:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">KYC Score</div>
              <div className="text-2xl font-black font-mono text-teal-400">{completionScore}%</div>
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
                  className="text-teal-500 transition-all duration-500"
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

        {/* 7-Step Navigation Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-2">
          <div className="flex items-center min-w-[620px] justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all text-left ${
                    isCurrent ? 'text-teal-400' : isPast ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-teal-500 text-slate-950 ring-4 ring-teal-500/20 shadow-lg shadow-teal-500/30'
                        : isPast
                        ? 'bg-teal-950 text-teal-300 border border-teal-800/80'
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
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="flex-shrink-0 text-teal-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 1: Corporate Profile & Brand Information</h2>
              <p className="text-xs text-slate-400">Specify your registered company name, size, and web presence.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Company Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="e.g. TechCorp Solutions Private Limited"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Website URL <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://techcorp.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company Size</label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="1-10">1-10 Employees (Seed / Early Stage)</option>
                    <option value="11-50">11-50 Employees (Small)</option>
                    <option value="51-200">51-200 Employees (Mid-size)</option>
                    <option value="201-500">201-500 Employees (Growth)</option>
                    <option value="500+">500+ Employees (Enterprise)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Brand Logo URL</label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://techcorp.com/assets/logo.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Legal & Business Registration */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 2: Statutory Business Identifiers</h2>
              <p className="text-xs text-slate-400">Corporate Identification Number (CIN) and Goods & Services Tax (GSTIN).</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registration Number (CIN / LLPIN) <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    placeholder="e.g. U72200KA2020PTC123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tax ID (GSTIN) <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.taxIdGstin}
                    onChange={(e) => handleInputChange('taxIdGstin', e.target.value)}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Entity Type</label>
                <select
                  value={formData.companyType}
                  onChange={(e) => handleInputChange('companyType', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="Private Limited">Private Limited Company (Pvt Ltd)</option>
                  <option value="Public Limited">Public Limited Company (Ltd)</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="DPIIT Recognized Startup">DPIIT Recognized Startup</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Address */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 3: Contact Details & Headquarters Address</h2>
              <p className="text-xs text-slate-400">Headquarters location and official point of contact.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Contact Name</label>
                  <input
                    type="text"
                    value={formData.primaryContactName}
                    onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                    placeholder="e.g. Rajesh Kumar (Head of Talent)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Contact Phone <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="+91 80 1234 5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Street Address</label>
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="e.g. Tower B, Tech Park, Outer Ring Road"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">State</label>
                  <input
                    type="text"
                    value={formData.address?.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="Karnataka"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Postal Code</label>
                  <input
                    type="text"
                    value={formData.address?.postalCode || ''}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    placeholder="560001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Country</label>
                  <input
                    type="text"
                    value={formData.address?.country || 'India'}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    placeholder="India"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Industry & Domain */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 4: Industry Sector & Technology Domain</h2>
              <p className="text-xs text-slate-400">Define your primary line of business and technological focus.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Industry Sector <span className="text-teal-400">*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="Information Technology & Services">Information Technology & Services</option>
                  <option value="Financial Technology (FinTech)">Financial Technology (FinTech)</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Manufacturing & Automotive">Manufacturing & Automotive</option>
                  <option value="EdTech & Education">EdTech & Education</option>
                  <option value="Cybersecurity">Cybersecurity & Defense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Core Technology Focus (Comma Separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(formData.domainFocus) ? formData.domainFocus.join(', ') : ''}
                  onChange={(e) => handleInputChange('domainFocus', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g. Cloud Computing, Kubernetes, React, Python, Distributed Systems"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Hiring Focus */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 5: Hiring & Internship Preferences</h2>
              <p className="text-xs text-slate-400">Specify regular hiring requirements to optimize candidate matching.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Hiring Roles (Comma Separated) <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  value={Array.isArray(formData.hiringPreferences?.targetRoles) ? formData.hiringPreferences.targetRoles.join(', ') : ''}
                  onChange={(e) => handleHiringChange('targetRoles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g. Full-Stack Developer, AI Engineer, QA Automation Engineer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hiring Type</label>
                  <select
                    value={formData.hiringPreferences?.hiringType || 'Both'}
                    onChange={(e) => handleHiringChange('hiringType', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Both">Both (Internship & Full-time)</option>
                    <option value="Internship">Internship Only</option>
                    <option value="Full-time Graduate">Full-time Graduate Placement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hiring Season</label>
                  <select
                    value={formData.hiringPreferences?.hiringSeason || 'Year-Round'}
                    onChange={(e) => handleHiringChange('hiringSeason', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Year-Round">Year-Round Continuous Hiring</option>
                    <option value="Summer Season">Summer Internship Season (May - Jul)</option>
                    <option value="Campus Placement">Campus Placement (Aug - Dec)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Statutory Verification Documents */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Step 6: Statutory Verification Documents</h2>
                <p className="text-xs text-slate-400">Upload COI, GST certificate, or official government registrations for KYC review.</p>
              </div>
              <button
                type="button"
                onClick={addDoc}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 hover:bg-teal-500/20 text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Document
              </button>
            </div>

            <div className="space-y-3">
              {formData.verificationDocs.map((doc, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                      <FileText size={20} />
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

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
              <ShieldCheck size={20} className="flex-shrink-0 text-amber-400" />
              <span>
                <strong>Compliance Notice:</strong> Submitted documents will be reviewed by platform administrators before live opportunities can be published or student contact PII is unlocked.
              </span>
            </div>
          </div>
        )}

        {/* Step 7: Review & Compliance Declaration */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100">Step 7: Review & Compliance Declaration</h2>
              <p className="text-xs text-slate-400">Confirm organizational accuracy and submit for administrative KYC review.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Company & Registration</span>
                  <button onClick={() => setCurrentStep(1)} className="text-teal-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300 font-bold">{formData.companyName}</p>
                <p className="text-slate-400">CIN: <span className="font-mono text-teal-300">{formData.registrationNumber || 'N/A'}</span></p>
                <p className="text-slate-400">GSTIN: <span className="font-mono text-teal-300">{formData.taxIdGstin || 'N/A'}</span></p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Contact & Headquarter</span>
                  <button onClick={() => setCurrentStep(3)} className="text-teal-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300">{formData.contactPhone}</p>
                <p className="text-slate-400">{formData.address?.city}, {formData.address?.state}, {formData.address?.country}</p>
                <p className="text-slate-500">{formData.website}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Industry & Hiring</span>
                  <button onClick={() => setCurrentStep(4)} className="text-teal-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-300">{formData.industry} ({formData.companySize})</p>
                <p className="text-slate-400">{Array.isArray(formData.hiringPreferences?.targetRoles) ? formData.hiringPreferences.targetRoles.join(', ') : 'All roles'}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">KYC Documents ({formData.verificationDocs.length})</span>
                  <button onClick={() => setCurrentStep(6)} className="text-teal-400 hover:underline text-[11px]">Edit</button>
                </div>
                <p className="text-slate-400">{formData.verificationDocs.length} statutory files attached</p>
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]">
                  Pending Admin Review
                </span>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="kyc-declaration"
                checked={declarationChecked}
                onChange={(e) => setDeclarationChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500"
              />
              <label htmlFor="kyc-declaration" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                <strong>Statutory Compliance Declaration:</strong> I hereby certify that I am an authorized corporate representative of <strong>{formData.companyName || 'the organization'}</strong> and all statutory registration details (CIN/GSTIN) and uploaded verification documents provided herein are authentic, accurate, and valid under Indian corporate law.
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
              onClick={() => handleSaveDraft(currentStep, false)}
              disabled={saving}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
            </button>

            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 active:scale-95"
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-teal-500/30 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> {submitting ? 'Submitting for KYC...' : 'Submit for KYC Verification'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
