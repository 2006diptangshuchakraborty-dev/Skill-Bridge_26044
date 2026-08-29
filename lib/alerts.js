/**
 * SIH 2026 Skill Gap & Aggregated Notification Engine
 * File: lib/alerts.js
 */

const { getStudents, getOpportunities, getAlerts, saveAlerts } = require("./db");
const { evaluateMatch } = require("./engine");

/**
 * Privacy-preserving skill gap aggregation algorithm
 * Filters out cohort skill gaps below minThreshold (default 5) to prevent PII re-identification.
 */
function aggregateSkillGaps(studentsList, opportunitiesList, minThreshold = 5) {
  const students = Array.isArray(studentsList) ? studentsList : getStudents();
  const opportunities = Array.isArray(opportunitiesList) ? opportunitiesList : getOpportunities();
  const threshold = typeof minThreshold === "number" ? minThreshold : 5;

  const alertsList = [];

  opportunities.forEach(opp => {
    let eligibleCount = 0;
    let partialMatchCount = 0;
    const missingSkillCounts = new Map();

    students.forEach(student => {
      const match = evaluateMatch(student, opp);

      if (match.isEligible) {
        eligibleCount++;
        if (match.status === "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH") {
          partialMatchCount++;
        }
      }

      const allGaps = [
        ...(match.highPriorityAnalysis?.gaps || []),
        ...(match.lowPriorityAnalysis?.gaps || [])
      ];

      const processedSkills = new Set();
      allGaps.forEach(gap => {
        const skillName = gap.canonicalName;
        if (!processedSkills.has(skillName.toLowerCase())) {
          processedSkills.add(skillName.toLowerCase());
          missingSkillCounts.set(skillName, (missingSkillCounts.get(skillName) || 0) + 1);
        }
      });
    });

    missingSkillCounts.forEach((count, skillName) => {
      if (count >= threshold) {
        alertsList.push({
          id: `alert_${opp.id}_${skillName}`,
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          companyName: opp.company,
          department: opp.department || "Analytics",
          skillName: skillName,
          topSkillGap: skillName,
          skillGap: skillName,
          affectedStudentCount: count,
          topSkillGapAffectedCount: count,
          eligibleStudentCount: eligibleCount,
          eligibleStudentsCount: eligibleCount,
          partialMatchStudentsCount: partialMatchCount,
          hasPII: false,
          priority: count >= 20 ? "HIGH" : (count >= 10 ? "MEDIUM" : "LOW"),
          suggestedAction: "Create 1-Click Workshop",
          recommendedAction: `Create Training Workshop for ${skillName} (${count} students lack this skill)`,
          createdAt: new Date().toISOString()
        });
      }
    });
  });

  return alertsList;
}

/**
 * Computes privacy-preserving aggregated skill gap analytics for Institutes
 */
function computeInstituteSkillGapAlerts() {
  return aggregateSkillGaps(getStudents(), getOpportunities(), 1);
}

/**
 * Generates personalized student notifications when an opportunity is matched
 */
function generateStudentNotification(student, opportunity, matchResult) {
  if (!matchResult.isEligible) {
    return null; // Test F15-03: Does not generate eligible notification for ineligible candidate
  }

  if (matchResult.status === "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH") {
    const missingPreferred = matchResult.lowPriorityAnalysis.gaps.map(g => g.canonicalName);
    return {
      type: "PARTIAL_PREFERRED_MATCH",
      title: `🎯 New Opportunity Match: ${opportunity.title}`,
      message: `You match 100% of mandatory requirements for ${opportunity.title} at ${opportunity.company}! You have a partial match in preferred skills.`,
      missingSkills: missingPreferred,
      missingPreferredSkills: missingPreferred,
      actionableAdvice: `Strengthen your application profile by completing short workshops for: ${missingPreferred.join(", ")}.`,
      canApply: true
    };
  }

  return {
    type: "FULL_MATCH",
    title: `🌟 100% Full Match: ${opportunity.title}`,
    message: `Outstanding! You satisfy 100% of both mandatory and preferred skills for ${opportunity.title} at ${opportunity.company}.`,
    missingSkills: [],
    missingPreferredSkills: [],
    canApply: true
  };
}

module.exports = {
  aggregateSkillGaps,
  computeInstituteSkillGapAlerts,
  generateStudentNotification
};
