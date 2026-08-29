/**
 * SIH 2026 Priority-Aware Skill Matching Engine
 * File: lib/engine.js
 */

const {
  normalizeSkill,
  normalizeSkillList,
  parseNumericProficiency,
  parseNumericEvidence,
  getProficiencyLabel,
  getEvidenceLabel,
} = require("./normalization");

const MATCH_STATUS = {
  FULL_MATCH: "FULL MATCH",
  PARTIAL_PREFERRED: "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH",
  MANDATORY_GAP: "NOT ELIGIBLE - MANDATORY SKILL GAP"
};

const GAP_REASON = {
  MISSING_SKILL: "MISSING_SKILL",
  INSUFFICIENT_PROFICIENCY: "INSUFFICIENT_PROFICIENCY"
};

/**
 * Extracts and normalizes requirement array from opportunity
 */
function extractRequirements(opp, keyHigh, keyLow) {
  const rawHigh = (opp && (opp[keyHigh] || opp.requiredSkills || opp.highPrioritySkills)) || [];
  const rawLow = (opp && (opp[keyLow] || opp.preferredSkills || opp.lowPrioritySkills)) || [];

  return {
    highReqs: normalizeSkillList(rawHigh).map(s => ({ ...s, priority: "HIGH" })),
    lowReqs: normalizeSkillList(rawLow).map(s => ({ ...s, priority: "LOW" }))
  };
}

/**
 * Evaluates a student profile against an internship/job opportunity
 * @param {object} student - Student profile object with skills array
 * @param {object} opportunity - Opportunity object with requiredSkills/highPrioritySkills and preferredSkills/lowPrioritySkills
 * @returns {object} Explainable structured match evaluation object
 */
function evaluateMatch(student, opportunity) {
  const safeStudent = student && typeof student === "object" ? student : { skills: [] };
  const safeOpp = opportunity && typeof opportunity === "object" ? opportunity : { requiredSkills: [], preferredSkills: [] };

  const studentId = safeStudent.id || safeStudent.studentId || "student";
  const studentName = safeStudent.name || "Candidate";
  const opportunityId = safeOpp.id || safeOpp.opportunityId || "opp";
  const opportunityTitle = safeOpp.title || safeOpp.roleTitle || "Opportunity";
  const companyName = safeOpp.company || safeOpp.companyName || "Employer";

  // 1. Normalize student skills
  const studentSkills = normalizeSkillList(safeStudent.skills || []);
  const studentSkillMap = new Map();
  studentSkills.forEach(s => {
    studentSkillMap.set(s.canonicalName.toLowerCase(), s);
  });

  // 2. Parse and normalize opportunity requirements
  const { highReqs, lowReqs } = extractRequirements(safeOpp, "requiredSkills", "preferredSkills");

  // 3. Evaluate High Priority (Mandatory) Skills
  const highMatchedSkills = [];
  const highGaps = [];

  for (const req of highReqs) {
    const studentSkill = studentSkillMap.get(req.canonicalName.toLowerCase());
    const reqProf = req.requiredProficiency !== undefined ? req.requiredProficiency : (req.proficiency !== undefined ? req.proficiency : 1);

    if (!studentSkill) {
      highGaps.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "HIGH",
        requiredProficiency: reqProf,
        studentProficiency: 0,
        evidenceLevel: 0,
        reason: GAP_REASON.MISSING_SKILL,
        reasonDescription: `Missing mandatory skill: ${req.canonicalName} (Required: ${getProficiencyLabel(reqProf)})`
      });
    } else if (studentSkill.proficiency < reqProf) {
      highGaps.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "HIGH",
        requiredProficiency: reqProf,
        studentProficiency: studentSkill.proficiency,
        evidenceLevel: studentSkill.evidenceLevel || 1,
        reason: GAP_REASON.INSUFFICIENT_PROFICIENCY,
        reasonDescription: `Insufficient proficiency in ${req.canonicalName}: Found ${getProficiencyLabel(studentSkill.proficiency)}, Required ${getProficiencyLabel(reqProf)}`
      });
    } else {
      highMatchedSkills.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "HIGH",
        requiredProficiency: reqProf,
        studentProficiency: studentSkill.proficiency,
        evidenceLevel: studentSkill.evidenceLevel || 1,
        confidenceScore: studentSkill.confidenceScore || 75,
        isIndustryVerified: Boolean(studentSkill.isIndustryVerified || studentSkill.evidenceLevel === 5)
      });
    }
  }

  // 4. Evaluate Low Priority (Preferred) Skills
  const lowMatchedSkills = [];
  const lowGaps = [];

  for (const req of lowReqs) {
    const studentSkill = studentSkillMap.get(req.canonicalName.toLowerCase());
    const reqProf = req.requiredProficiency !== undefined ? req.requiredProficiency : (req.proficiency !== undefined ? req.proficiency : 1);

    if (!studentSkill) {
      lowGaps.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "LOW",
        requiredProficiency: reqProf,
        studentProficiency: 0,
        evidenceLevel: 0,
        reason: GAP_REASON.MISSING_SKILL,
        reasonDescription: `Missing preferred skill: ${req.canonicalName} (Preferred: ${getProficiencyLabel(reqProf)})`
      });
    } else if (studentSkill.proficiency < reqProf) {
      lowGaps.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "LOW",
        requiredProficiency: reqProf,
        studentProficiency: studentSkill.proficiency,
        evidenceLevel: studentSkill.evidenceLevel || 1,
        reason: GAP_REASON.INSUFFICIENT_PROFICIENCY,
        reasonDescription: `Sub-preferred proficiency in ${req.canonicalName}: Found ${getProficiencyLabel(studentSkill.proficiency)}, Preferred ${getProficiencyLabel(reqProf)}`
      });
    } else {
      lowMatchedSkills.push({
        skillId: req.skillId || req.id,
        skillName: req.canonicalName,
        canonicalName: req.canonicalName,
        priority: "LOW",
        requiredProficiency: reqProf,
        studentProficiency: studentSkill.proficiency,
        evidenceLevel: studentSkill.evidenceLevel || 1,
        confidenceScore: studentSkill.confidenceScore || 75,
        isIndustryVerified: Boolean(studentSkill.isIndustryVerified || studentSkill.evidenceLevel === 5)
      });
    }
  }

  // 5. Compute Metrics
  const totalHigh = highReqs.length;
  const highMatchedCount = highMatchedSkills.length;
  const isHighSatisfied = totalHigh === 0 || (highMatchedCount === totalHigh && highGaps.length === 0);
  const highMatchPct = totalHigh === 0 ? 100.0 : Math.round((highMatchedCount / totalHigh) * 1000) / 10;

  const totalLow = lowReqs.length;
  const lowMatchedCount = lowMatchedSkills.length;
  const lowMatchPct = totalLow === 0 ? 100.0 : Math.round((lowMatchedCount / totalLow) * 1000) / 10;

  // 6. Strict Gatekeeper Rule
  const isEligible = isHighSatisfied;
  let status = MATCH_STATUS.MANDATORY_GAP;

  if (isEligible) {
    if (totalLow === 0 || lowMatchPct === 100.0) {
      status = MATCH_STATUS.FULL_MATCH;
    } else {
      status = MATCH_STATUS.PARTIAL_PREFERRED;
    }
  }

  // 7. Composite Score Calculation
  let compositeScore = 0.0;
  if (isEligible) {
    if (totalHigh === 0 && totalLow === 0) {
      compositeScore = 100.0;
    } else if (totalHigh > 0 && totalLow === 0) {
      compositeScore = highMatchPct;
    } else if (totalHigh === 0 && totalLow > 0) {
      compositeScore = lowMatchPct;
    } else {
      compositeScore = Math.round(((highMatchPct * 0.70) + (lowMatchPct * 0.30)) * 10) / 10;
    }
  } else {
    // Penalized score for ineligible candidate
    const rawIneligible = (highMatchPct * 0.30) + (lowMatchPct * 0.10);
    compositeScore = Math.round(Math.min(35.0, rawIneligible) * 10) / 10;
  }

  // 8. Actionable recommendations
  const mandatoryGapsToFix = highGaps.map(g => {
    if (g.reason === GAP_REASON.MISSING_SKILL) {
      return `Missing mandatory skill: ${g.canonicalName} (Required level ${g.requiredProficiency})`;
    }
    return `Proficiency gap: ${g.canonicalName} (Has level ${g.studentProficiency}, requires level ${g.requiredProficiency})`;
  });

  const preferredUpskilling = lowGaps.map(g => {
    if (g.reason === GAP_REASON.MISSING_SKILL) {
      return `Recommended: Learn ${g.canonicalName} (Target level ${g.requiredProficiency})`;
    }
    return `Recommended: Level up ${g.canonicalName} from level ${g.studentProficiency} to level ${g.requiredProficiency}`;
  });

  const explanation = generateExplanation({
    studentName,
    opportunityTitle,
    companyName,
    status,
    isEligible,
    highMatchedCount,
    totalHigh,
    lowMatchedCount,
    totalLow,
    highGaps,
    lowGaps
  });

  const allMatchedSkills = [...highMatchedSkills, ...lowMatchedSkills];

  return {
    studentId,
    opportunityId,
    opportunityTitle,
    companyName,
    isEligible,
    eligibilityStatus: status,
    status,
    scores: {
      compositeScore,
      highPriorityMatchPct: highMatchPct,
      lowPriorityMatchPct: lowMatchPct
    },
    compositeScore,
    highPriorityAnalysis: {
      totalRequired: totalHigh,
      matchedCount: highMatchedCount,
      matchPercentage: highMatchPct,
      isFullySatisfied: isHighSatisfied,
      matchedSkills: highMatchedSkills,
      gaps: highGaps
    },
    lowPriorityAnalysis: {
      totalPreferred: totalLow,
      matchedCount: lowMatchedCount,
      matchPercentage: lowMatchPct,
      isFullySatisfied: lowGaps.length === 0,
      matchedSkills: lowMatchedSkills,
      gaps: lowGaps
    },
    highPrioritySummary: {
      totalRequired: totalHigh,
      totalMatched: highMatchedCount,
      matchPercentage: highMatchPct,
      isFullyMatched: isHighSatisfied
    },
    lowPrioritySummary: {
      totalRequired: totalLow,
      totalMatched: lowMatchedCount,
      matchPercentage: lowMatchPct,
      isFullyMatched: lowGaps.length === 0
    },
    matchedSkills: allMatchedSkills,
    missingHighPrioritySkills: highGaps,
    missingLowPrioritySkills: lowGaps,
    recommendations: {
      eligibleToApply: isEligible,
      mandatoryGapsToFix,
      preferredUpskilling
    },
    matchBreakdownExplanation: explanation,
    explanation,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Generates natural language summary explanation
 */
function generateExplanation(params) {
  const {
    studentName,
    opportunityTitle,
    companyName,
    status,
    highMatchedCount,
    totalHigh,
    lowMatchedCount,
    totalLow,
    highGaps,
    lowGaps
  } = params;

  if (status === MATCH_STATUS.FULL_MATCH) {
    return `${studentName} is ELIGIBLE with a FULL MATCH (100%) for ${opportunityTitle} at ${companyName}. Satisfies all mandatory (${highMatchedCount}/${totalHigh}) and preferred (${lowMatchedCount}/${totalLow}) skills.`;
  }

  if (status === MATCH_STATUS.PARTIAL_PREFERRED) {
    const missingNames = lowGaps.map(g => g.canonicalName).join(", ");
    return `${studentName} is ELIGIBLE with partial preferred match (${highMatchedCount}/${totalHigh} mandatory satisfied, ${lowMatchedCount}/${totalLow} preferred satisfied). Missing or deficient preferred skills: ${missingNames}.`;
  }

  const gapDescriptions = highGaps.map(g => {
    if (g.reason === GAP_REASON.MISSING_SKILL) return `missing mandatory ${g.canonicalName}`;
    return `${g.canonicalName} proficiency below required Level ${g.requiredProficiency} (has Level ${g.studentProficiency})`;
  }).join("; ");

  return `${studentName} is NOT ELIGIBLE due to mandatory skill gap: ${gapDescriptions}. Application submission is restricted until mandatory requirements are met.`;
}

/**
 * Batch rank a list of students for a specific opportunity
 * @param {Array<object>} students
 * @param {object} opportunity
 * @returns {Array<object>}
 */
function rankCandidatesForOpportunity(students, opportunity) {
  if (!Array.isArray(students) || !opportunity) return [];

  const evaluated = students.map(student => {
    const match = evaluateMatch(student, opportunity);
    return {
      student,
      match
    };
  });

  return evaluated.sort((a, b) => {
    const getStatusWeight = s => {
      if (s === MATCH_STATUS.FULL_MATCH) return 3;
      if (s === MATCH_STATUS.PARTIAL_PREFERRED) return 2;
      return 1;
    };
    const weightDiff = getStatusWeight(b.match.status) - getStatusWeight(a.match.status);
    if (weightDiff !== 0) return weightDiff;

    const scoreDiff = b.match.scores.compositeScore - a.match.scores.compositeScore;
    if (scoreDiff !== 0) return scoreDiff;

    const highDiff = b.match.scores.highPriorityMatchPct - a.match.scores.highPriorityMatchPct;
    if (highDiff !== 0) return highDiff;

    const lowDiff = b.match.scores.lowPriorityMatchPct - a.match.scores.lowPriorityMatchPct;
    if (lowDiff !== 0) return lowDiff;

    const confA = a.student.overallConfidenceScore || 0;
    const confB = b.student.overallConfidenceScore || 0;
    if (confB !== confA) return confB - confA;

    const gpaA = a.student.gpa || 0;
    const gpaB = b.student.gpa || 0;
    return gpaB - gpaA;
  });
}

module.exports = {
  MATCH_STATUS,
  GAP_REASON,
  evaluateMatch,
  rankCandidatesForOpportunity,
};
