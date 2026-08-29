"use client";

import React, { useState, useEffect } from "react";
import { Award, ShieldCheck, Building2, School, Star, ThumbsUp, MessageSquare, CheckCircle2 } from "lucide-react";
import EvidenceBadge from "../../../components/shared/EvidenceBadge";
import ReputationBreakdown from "../../../components/reputation/ReputationBreakdown";
import ReviewCard from "../../../components/reputation/ReviewCard";

export default function InstituteFeedbackPage() {
  const [instituteAggregate, setInstituteAggregate] = useState(null);
  const [employerReviews, setEmployerReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInstituteReputation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ratings?targetEntityId=inst_001&targetRole=INSTITUTE");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInstituteAggregate(data.aggregate || null);
          setEmployerReviews(data.ratings || []);
        }
      }
    } catch (err) {
      console.error("Error loading institute reputation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstituteReputation();
  }, []);

  const fallbackReviews = [
    {
      id: "rev_inst_01",
      reviewerName: "Apex Analytics Corp — Campus Hiring Team",
      reviewerRole: "INDUSTRY",
      reviewerCompany: "Apex Analytics Corp",
      contextType: "COURSE_EVALUATION",
      overallScore: 4.9,
      recommendation: "RECOMMENDED",
      headline: "Graduates possess outstanding SQL and algorithmic data modeling fundamentals",
      reviewText: "Students from IIITE demonstrate remarkable database optimization and practical data analysis mastery. Onboarding time was reduced by 60% compared to typical campus hires.",
      pros: ["Exceptional SQL optimization", "Strong work ethic", "Rapid framework onboarding"],
      cons: ["Could benefit from more cloud CI/CD pipeline coursework"],
      categoryScores: [
        { code: "CURRICULUM_DEPTH", name: "Curriculum Depth & Rigor", score: 5 },
        { code: "INSTRUCTOR_QUALITY", name: "Instructor Quality & Guidance", score: 5 },
        { code: "PRACTICAL_APPLICATION", name: "Practical Application", score: 5 },
        { code: "RESOURCE_AVAILABILITY", name: "Resource Availability", score: 4 },
        { code: "CAREER_IMPACT", name: "Career Impact", score: 5 },
      ],
      isVerified: true,
      publishedAt: "2026-08-18",
    },
    {
      id: "rev_inst_02",
      reviewerName: "DevForge Labs — Engineering Directorate",
      reviewerRole: "INDUSTRY",
      reviewerCompany: "DevForge Labs",
      contextType: "COURSE_EVALUATION",
      overallScore: 4.8,
      recommendation: "RECOMMENDED",
      headline: "High caliber full-stack engineering candidates with Level 4 project evidence",
      reviewText: "Campus candidates arrived with verified GitHub portfolio projects and demonstrated sound architectural design principles. Great faculty coordination during placement drives.",
      pros: ["Hands-on project experience", "Effective async communication", "High problem solving aptitude"],
      cons: ["Minor gaps in microservices architecture"],
      categoryScores: [
        { code: "CURRICULUM_DEPTH", name: "Curriculum Depth & Rigor", score: 5 },
        { code: "INSTRUCTOR_QUALITY", name: "Instructor Quality & Guidance", score: 5 },
        { code: "PRACTICAL_APPLICATION", name: "Practical Application", score: 4 },
        { code: "RESOURCE_AVAILABILITY", name: "Resource Availability", score: 5 },
        { code: "CAREER_IMPACT", name: "Career Impact", score: 5 },
      ],
      isVerified: true,
      publishedAt: "2026-08-15",
    },
  ];

  const displayReviews = employerReviews.length > 0 ? employerReviews : fallbackReviews;

  const defaultAggregate = {
    targetRole: "INSTITUTE",
    targetEntityId: "inst_001",
    totalRatingsCount: displayReviews.length,
    verifiedRatingsCount: displayReviews.length,
    averageScore: 4.85,
    recommendationRate: 100,
    objectiveSkillScore: 89,
    verificationTrustLevel: "GOLD_TRUSTED",
    categoryBreakdown: {
      CURRICULUM_DEPTH: { average: 5.0, count: 2, name: "Curriculum Depth & Rigor" },
      INSTRUCTOR_QUALITY: { average: 5.0, count: 2, name: "Instructor Quality & Guidance" },
      PRACTICAL_APPLICATION: { average: 4.5, count: 2, name: "Practical Application" },
      RESOURCE_AVAILABILITY: { average: 4.5, count: 2, name: "Resource Availability" },
      CAREER_IMPACT: { average: 5.0, count: 2, name: "Career Impact" },
    },
    scoreDistribution: { "5": displayReviews.length, "4": 0, "3": 0, "2": 0, "1": 0 },
  };

  const resolvedAggregate = instituteAggregate || defaultAggregate;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <School size={14} /> Institutional Governance & Quality Assurance
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">
          Academic Reputation & Employer Feedback Scorecard
        </h1>
        <p className="text-xs text-slate-400">
          Continuous multidimensional feedback from verified corporate recruiters, alumni evaluations, and placement outcome analytics.
        </p>
      </div>

      {/* 3-Pillar Reputation Breakdown */}
      <ReputationBreakdown
        targetRole="INSTITUTE"
        targetEntityId="inst_001"
        entityName="Indian Institute of Information Technology & Engineering"
        aggregate={resolvedAggregate}
        reviews={displayReviews}
        trustSignals={[
          {
            id: "aishe",
            title: "AISHE Code C-26914 Validated",
            description: "Ministry of Education National Campus Registry Approved",
            verified: true,
            color: "text-purple-400",
          },
          {
            id: "naac",
            title: "NAAC Grade A++ Accredited",
            description: "National Assessment and Accreditation Council Certified",
            verified: true,
            color: "text-emerald-400",
          },
          {
            id: "tpo",
            title: "TPO Directorate Authenticated",
            description: "Training & Placement Cell Coordinator Signed Off",
            verified: true,
            color: "text-blue-400",
          },
        ]}
        objectiveSkills={{
          overallScore: 89,
        }}
      />
    </div>
  );
}
