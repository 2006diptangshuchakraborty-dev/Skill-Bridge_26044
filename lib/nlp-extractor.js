/**
 * SIH 2026 AI NLP Job Description Skill Extractor Assistant
 * File: lib/nlp-extractor.js
 */

const { SKILL_ONTOLOGY, normalizeSkill } = require("./normalization");

/**
 * Heuristic/Keyword AI NLP Extraction Assistant for Job Descriptions
 * Extracts technical and domain skills from raw text and assigns them into
 * High Priority (Mandatory) and Low Priority (Preferred) suggestion pools.
 * 
 * @param {string} jobDescription - Unstructured text from recruiter input
 * @returns {object} { highPrioritySuggestions, lowPrioritySuggestions, highPrioritySkills, lowPrioritySkills, extractedCount, rawTextLength, extractedRole, experienceLevel }
 */
function extractSkillsFromJD(jobDescription) {
  if (!jobDescription || typeof jobDescription !== "string") {
    return {
      highPrioritySuggestions: [],
      lowPrioritySuggestions: [],
      highPrioritySkills: [],
      lowPrioritySkills: [],
      extractedCount: 0,
      rawTextLength: 0,
      extractedRole: "General Technical Role",
      experienceLevel: "Entry Level"
    };
  }

  const textLower = jobDescription.toLowerCase();
  const foundSkills = new Map();

  SKILL_ONTOLOGY.forEach(entry => {
    const canonicalName = entry.canonicalName;
    const termsToTest = [canonicalName, ...(entry.aliases || [])];

    for (const term of termsToTest) {
      const termLower = term.toLowerCase();
      const regexEscaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(?:^|[^a-zA-Z0-9+#])${regexEscaped}(?:$|[^a-zA-Z0-9+#])`, "i");

      if (pattern.test(textLower)) {
        const termPos = textLower.indexOf(termLower);
        const snippetBefore = termPos > 0 ? textLower.substring(Math.max(0, termPos - 60), termPos) : "";
        const snippetAfter = textLower.substring(termPos, Math.min(textLower.length, termPos + 60));
        const combinedSnippet = snippetBefore + " " + snippetAfter;

        const preferredKeywords = ["preferred", "advantage", "nice to have", "good to have", "plus", "bonus", "optional", "desirable", "knowledge of"];
        const isPreferredHint = preferredKeywords.some(kw => combinedSnippet.includes(kw));

        if (!foundSkills.has(canonicalName.toLowerCase())) {
          foundSkills.set(canonicalName.toLowerCase(), {
            canonicalName,
            category: entry.category,
            matchedTerm: term,
            isPreferredHint
          });
        }
        break;
      }
    }
  });

  const highPrioritySuggestions = [];
  const lowPrioritySuggestions = [];

  foundSkills.forEach((val) => {
    const item = {
      skillName: val.canonicalName,
      canonicalName: val.canonicalName,
      category: val.category,
      suggestedProficiency: 2,
      proficiencyLabel: "Intermediate"
    };

    if (val.isPreferredHint) {
      lowPrioritySuggestions.push({ ...item, priority: "LOW" });
    } else {
      highPrioritySuggestions.push({ ...item, priority: "HIGH" });
    }
  });

  if (highPrioritySuggestions.length > 4 && lowPrioritySuggestions.length === 0) {
    const preferredCandidates = ["Tableau", "Power BI", "Excel", "Machine Learning", "Docker", "Kubernetes"];
    for (let i = highPrioritySuggestions.length - 1; i >= 0; i--) {
      if (preferredCandidates.includes(highPrioritySuggestions[i].canonicalName)) {
        const [moved] = highPrioritySuggestions.splice(i, 1);
        moved.priority = "LOW";
        lowPrioritySuggestions.unshift(moved);
      }
    }
  }

  // Detect role category and experience level
  let extractedRole = "Software Engineer";
  if (textLower.includes("data analyst") || textLower.includes("analytics")) {
    extractedRole = "Data Analyst";
  } else if (textLower.includes("data scientist") || textLower.includes("machine learning")) {
    extractedRole = "Data Scientist";
  } else if (textLower.includes("frontend") || textLower.includes("react")) {
    extractedRole = "Frontend Developer";
  } else if (textLower.includes("backend") || textLower.includes("node")) {
    extractedRole = "Backend Engineer";
  } else if (textLower.includes("full stack") || textLower.includes("fullstack")) {
    extractedRole = "Full Stack Developer";
  } else if (textLower.includes("devops") || textLower.includes("cloud")) {
    extractedRole = "DevOps Engineer";
  }

  let experienceLevel = "Entry Level";
  if (textLower.includes("intern")) {
    experienceLevel = "Internship / Entry-Level";
  } else if (textLower.includes("senior") || textLower.includes("lead")) {
    experienceLevel = "Senior (3+ Years)";
  } else if (textLower.includes("junior")) {
    experienceLevel = "Junior (1-2 Years)";
  } else if (textLower.includes("mid") || textLower.includes("intermediate")) {
    experienceLevel = "Mid-Level (2-4 Years)";
  }

  return {
    highPrioritySuggestions,
    lowPrioritySuggestions,
    highPrioritySkills: highPrioritySuggestions,
    lowPrioritySkills: lowPrioritySuggestions,
    extractedCount: highPrioritySuggestions.length + lowPrioritySuggestions.length,
    rawTextLength: jobDescription.length,
    extractedRole,
    experienceLevel
  };
}

module.exports = {
  extractSkillsFromJD
};
