/**
 * SIH 2026 Canonical Skill Normalization Layer & Ontology Registry
 * File: lib/normalization.js
 */

const SKILL_ONTOLOGY = [
  {
    id: "skill_python",
    canonicalName: "Python",
    category: "Programming Languages",
    aliases: ["python", "python3", "py", "cpython", "python 3.x", "python language", "python 3"]
  },
  {
    id: "skill_sql",
    canonicalName: "SQL",
    category: "Database & Querying",
    aliases: ["sql", "structured query language", "ansi sql", "plsql", "pl/sql", "t-sql", "tsql"]
  },
  {
    id: "skill_postgresql",
    canonicalName: "PostgreSQL",
    category: "Database & Querying",
    aliases: ["postgresql", "postgres", "psql", "pgsql", "postgres db", "postgres database", "postgre sql", "postgresql db"]
  },
  {
    id: "skill_data_analysis",
    canonicalName: "Data Analysis",
    category: "Data Science & AI",
    aliases: ["data analysis", "data analytics", "eda", "exploratory data analysis", "data wrangling", "data-analysis"]
  },
  {
    id: "skill_excel",
    canonicalName: "Excel",
    category: "Data Science & AI",
    aliases: ["excel", "advanced excel", "ms excel", "microsoft excel", "vlookup", "spreadsheets", "pivot tables"]
  },
  {
    id: "skill_tableau",
    canonicalName: "Tableau",
    category: "Data Science & AI",
    aliases: ["tableau", "tableau desktop", "tableau server", "tableau bi", "tableau visualization"]
  },
  {
    id: "skill_powerbi",
    canonicalName: "Power BI",
    category: "Data Science & AI",
    aliases: ["power bi", "powerbi", "ms power bi", "microsoft power bi", "dax", "power bi desktop", "power-bi"]
  },
  {
    id: "skill_machine_learning",
    canonicalName: "Machine Learning",
    category: "Data Science & AI",
    aliases: ["machine learning", "ml", "scikit-learn", "sklearn", "statistical modeling", "supervised learning"]
  },
  {
    id: "skill_statistics",
    canonicalName: "Statistics",
    category: "Data Science & AI",
    aliases: ["statistics", "applied statistics", "stats", "probability", "hypothesis testing", "biostatistics", "statistical analysis"]
  },
  {
    id: "skill_react",
    canonicalName: "React",
    category: "Frontend Development",
    aliases: ["react", "reactjs", "react.js", "react js", "react native"]
  },
  {
    id: "skill_nextjs",
    canonicalName: "Next.js",
    category: "Frontend Development",
    aliases: ["nextjs", "next.js", "next js", "next", "next framework"]
  },
  {
    id: "skill_javascript",
    canonicalName: "JavaScript",
    category: "Programming Languages",
    aliases: ["javascript", "js", "ecmascript", "es6", "es2020", "es2022"]
  },
  {
    id: "skill_typescript",
    canonicalName: "TypeScript",
    category: "Programming Languages",
    aliases: ["typescript", "ts", "typescript lang"]
  },
  {
    id: "skill_nodejs",
    canonicalName: "Node.js",
    category: "Backend Development",
    aliases: ["nodejs", "node.js", "node js", "node", "node backend"]
  },
  {
    id: "skill_fastapi",
    canonicalName: "FastAPI",
    category: "Backend Development",
    aliases: ["fastapi", "fast api", "python fastapi"]
  },
  {
    id: "skill_docker",
    canonicalName: "Docker",
    category: "Cloud & DevOps",
    aliases: ["docker", "containerization", "docker-compose", "docker containers", "dockerfile"]
  },
  {
    id: "skill_kubernetes",
    canonicalName: "Kubernetes",
    category: "Cloud & DevOps",
    aliases: ["kubernetes", "k8s", "kube", "k8"]
  },
  {
    id: "skill_aws",
    canonicalName: "AWS",
    category: "Cloud & DevOps",
    aliases: ["aws", "amazon web services", "ec2", "s3", "lambda", "aws cloud", "iam"]
  },
  {
    id: "skill_git",
    canonicalName: "Git",
    category: "Tools & Systems",
    aliases: ["git", "github", "gitlab", "version control", "git cli", "bitbucket"]
  },
  {
    id: "skill_deep_learning",
    canonicalName: "Deep Learning",
    category: "Data Science & AI",
    aliases: ["deep learning", "dl", "neural networks", "artificial neural network"]
  },
  {
    id: "skill_pytorch",
    canonicalName: "PyTorch",
    category: "Data Science & AI",
    aliases: ["pytorch", "pytorch-gpu", "torch"]
  },
  {
    id: "skill_tensorflow",
    canonicalName: "TensorFlow",
    category: "Data Science & AI",
    aliases: ["tensorflow", "tf", "keras"]
  },
  {
    id: "skill_nlp",
    canonicalName: "Natural Language Processing",
    category: "Data Science & AI",
    aliases: ["nlp", "natural language processing", "huggingface", "transformers", "spacy", "llm", "large language models"]
  },
  {
    id: "skill_mongodb",
    canonicalName: "MongoDB",
    category: "Database & Querying",
    aliases: ["mongodb", "mongo", "nosql", "documentdb", "mongodb atlas"]
  },
  {
    id: "skill_graphql",
    canonicalName: "GraphQL",
    category: "Backend Development",
    aliases: ["graphql", "gql", "apollo", "apollo graphql"]
  },
  {
    id: "skill_tailwind",
    canonicalName: "Tailwind CSS",
    category: "Frontend Development",
    aliases: ["tailwind", "tailwindcss", "tailwind css"]
  },
  {
    id: "skill_cybersecurity",
    canonicalName: "Cybersecurity",
    category: "Cybersecurity",
    aliases: ["cybersecurity", "infosec", "network security", "ethical hacking", "penetration testing", "soc"]
  },
  {
    id: "skill_linux",
    canonicalName: "Linux",
    category: "Tools & Systems",
    aliases: ["linux", "unix", "bash", "shell scripting", "ubuntu", "centos", "debian"]
  },
  {
    id: "skill_r",
    canonicalName: "R Programming",
    category: "Data Science & AI",
    aliases: ["r", "r programming", "rstudio", "r-lang", "r language"]
  },
  {
    id: "skill_spark",
    canonicalName: "Apache Spark",
    category: "Data Science & AI",
    aliases: ["spark", "apache spark", "pyspark", "spark sql", "databricks"]
  },
  {
    id: "skill_java",
    canonicalName: "Java",
    category: "Programming Languages",
    aliases: ["java", "core java", "java 17", "java 21", "jvm", "java se"]
  },
  {
    id: "skill_spring_boot",
    canonicalName: "Spring Boot",
    category: "Backend Development",
    aliases: ["spring boot", "springboot", "spring framework", "spring mvc"]
  },
  {
    id: "skill_cplusplus",
    canonicalName: "C++",
    category: "Programming Languages",
    aliases: ["c++", "cpp", "c plus plus"]
  },
  {
    id: "skill_html_css",
    canonicalName: "HTML & CSS",
    category: "Frontend Development",
    aliases: ["html", "css", "html5", "css3", "web design", "semantic html", "html & css", "html/css"]
  },
  {
    id: "skill_ci_cd",
    canonicalName: "CI/CD",
    category: "Cloud & DevOps",
    aliases: ["ci/cd", "cicd", "github actions", "jenkins", "continuous integration", "gitlab ci"]
  },
  {
    id: "skill_agile",
    canonicalName: "Agile & Scrum",
    category: "Tools & Systems",
    aliases: ["agile", "scrum", "jira", "sprint planning", "kanban"]
  },
  {
    id: "skill_figma",
    canonicalName: "Figma",
    category: "Frontend Development",
    aliases: ["figma", "ui/ux design", "wireframing", "prototyping", "ui design"]
  }
];

// Runtime dynamic alias registry mapping
const aliasRegistry = {};
SKILL_ONTOLOGY.forEach(s => {
  aliasRegistry[s.canonicalName.toLowerCase()] = s.canonicalName;
  s.aliases.forEach(a => {
    aliasRegistry[a.toLowerCase()] = s.canonicalName;
    aliasRegistry[cleanSkillString(a)] = s.canonicalName;
  });
});

/**
 * Clean and standardize raw skill input string for lookup
 */
function cleanSkillString(input) {
  if (!input || typeof input !== "string") return "";
  let s = input.trim().toLowerCase();
  
  // Protect special tokens like c++, c#, .net, next.js, node.js
  if (s === "c++" || s === "c#" || s === ".net") return s;
  
  // Normalize delimiters to spaces while preserving words
  return s
    .replace(/[._\-\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert string to title case
 */
function toTitleCase(str) {
  if (!str) return "";
  const clean = str.trim();
  if (clean.toLowerCase() === "sql") return "SQL";
  if (clean.toLowerCase() === "aws") return "AWS";
  if (clean.toLowerCase() === "ci/cd" || clean.toLowerCase() === "cicd") return "CI/CD";
  if (clean.toLowerCase() === "nlp") return "NLP";
  if (clean.toLowerCase() === "c++") return "C++";
  if (clean.toLowerCase() === "html & css" || clean.toLowerCase() === "html/css") return "HTML & CSS";

  return clean
    .split(/\s+/)
    .map(word => {
      if (word.toLowerCase() === "js") return "JS";
      if (word.toLowerCase() === "ui/ux") return "UI/UX";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Normalizes a single skill string or object into canonical skill name string
 * @param {string|object} skillInput
 * @returns {string} Canonical skill name (e.g. "React", "Python", "PostgreSQL")
 */
function normalizeSkill(skillInput) {
  if (!skillInput) return "";

  let rawString = "";
  if (typeof skillInput === "string") {
    rawString = skillInput.trim();
  } else if (typeof skillInput === "object") {
    rawString = (skillInput.canonicalName || skillInput.name || skillInput.skillName || skillInput.id || skillInput.skillId || "").trim();
  }

  if (!rawString) return "";

  const lowerRaw = rawString.toLowerCase();
  const cleaned = cleanSkillString(rawString);

  // 1. Direct match in runtime alias registry
  if (aliasRegistry[lowerRaw]) {
    return aliasRegistry[lowerRaw];
  }
  if (aliasRegistry[cleaned]) {
    return aliasRegistry[cleaned];
  }

  // 2. Exact match against canonical ontology
  for (const skill of SKILL_ONTOLOGY) {
    if (skill.canonicalName.toLowerCase() === lowerRaw || cleanSkillString(skill.canonicalName) === cleaned) {
      return skill.canonicalName;
    }
    for (const alias of skill.aliases) {
      if (alias.toLowerCase() === lowerRaw || cleanSkillString(alias) === cleaned) {
        return skill.canonicalName;
      }
    }
  }

  // 3. Substring / token boundary search for composite terms
  for (const skill of SKILL_ONTOLOGY) {
    for (const alias of skill.aliases) {
      const cleanedAlias = cleanSkillString(alias);
      if (cleanedAlias.length > 2) {
        const regex = new RegExp(`\\b${cleanedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleaned)) {
          return skill.canonicalName;
        }
      }
    }
  }

  // 4. Dynamic Fallback for unlisted/custom skills
  return toTitleCase(rawString);
}

/**
 * Normalizes an array of skills, parsing proficiencies and deduplicating entries
 * @param {Array<object|string>} skillsArray
 * @returns {Array<object>} Deduplicated, normalized skill objects
 */
function normalizeSkillList(skillsArray) {
  if (!Array.isArray(skillsArray)) return [];

  const skillMap = new Map();

  for (const item of skillsArray) {
    if (!item) continue;

    let rawSkill = item;
    let proficiency = 1;
    let requiredProficiency = 1;
    let evidenceLevel = 1;
    let evidenceUrl = "";
    let confidenceScore = 75;
    let isIndustryVerified = false;
    let verifiedByCompany = "";
    let priority = "LOW";
    let category = "General";

    if (typeof item === "object") {
      rawSkill = item.canonicalName || item.name || item.skillName || item.skillId || item.id || "";
      proficiency = parseNumericProficiency(item.proficiency !== undefined ? item.proficiency : item.requiredProficiency);
      requiredProficiency = parseNumericProficiency(item.requiredProficiency !== undefined ? item.requiredProficiency : item.proficiency);
      evidenceLevel = parseNumericEvidence(item.evidenceLevel);
      evidenceUrl = item.evidenceUrl || "";
      confidenceScore = typeof item.confidenceScore === "number" ? item.confidenceScore : 75;
      isIndustryVerified = Boolean(item.isIndustryVerified || evidenceLevel === 5);
      verifiedByCompany = item.verifiedByCompany || "";
      priority = (item.priority === "HIGH" || item.priority === "MANDATORY") ? "HIGH" : "LOW";
      category = item.category || category;
    }

    const canonicalName = normalizeSkill(rawSkill);
    if (!canonicalName) continue;

    const ontologyMatch = SKILL_ONTOLOGY.find(s => s.canonicalName.toLowerCase() === canonicalName.toLowerCase());
    const skillId = ontologyMatch ? ontologyMatch.id : `skill_${canonicalName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const skillCategory = ontologyMatch ? ontologyMatch.category : category;

    const mapKey = canonicalName.toLowerCase();

    if (skillMap.has(mapKey)) {
      const existing = skillMap.get(mapKey);
      existing.proficiency = Math.max(existing.proficiency, proficiency);
      existing.requiredProficiency = Math.max(existing.requiredProficiency, requiredProficiency);
      existing.evidenceLevel = Math.max(existing.evidenceLevel, evidenceLevel);
      existing.confidenceScore = Math.max(existing.confidenceScore, confidenceScore);
      existing.isIndustryVerified = existing.isIndustryVerified || isIndustryVerified;
      if (evidenceUrl && !existing.evidenceUrl) existing.evidenceUrl = evidenceUrl;
      if (verifiedByCompany && !existing.verifiedByCompany) existing.verifiedByCompany = verifiedByCompany;
      if (priority === "HIGH") existing.priority = "HIGH";
    } else {
      skillMap.set(mapKey, {
        id: skillId,
        skillId: skillId,
        name: canonicalName,
        canonicalName: canonicalName,
        category: skillCategory,
        proficiency,
        requiredProficiency,
        evidenceLevel,
        evidenceUrl,
        confidenceScore,
        isIndustryVerified,
        verifiedByCompany,
        priority
      });
    }
  }

  return Array.from(skillMap.values());
}

/**
 * Parse numeric proficiency level (1-4)
 */
function parseNumericProficiency(val) {
  if (val === undefined || val === null) return 1;
  if (typeof val === "number") {
    if (isNaN(val)) return 1;
    if (val <= 0) return Math.round(val);
    return Math.min(4, Math.round(val));
  }
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower.includes("expert") || lower === "4") return 4;
    if (lower.includes("advanced") || lower === "3") return 3;
    if (lower.includes("intermediate") || lower === "2") return 2;
    if (lower.includes("beginner") || lower === "1") return 1;
    const parsed = parseInt(lower, 10);
    if (!isNaN(parsed)) return parsed <= 0 ? parsed : Math.min(4, parsed);
  }
  return 1;
}

/**
 * Parse numeric evidence level (1-5)
 */
function parseNumericEvidence(val) {
  if (val === undefined || val === null) return 1;
  if (typeof val === "number") {
    if (isNaN(val)) return 1;
    return Math.max(1, Math.min(5, Math.round(val)));
  }
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower.includes("industry") || lower.includes("verified") || lower === "5") return 5;
    if (lower.includes("project") || lower.includes("repo") || lower === "4") return 4;
    if (lower.includes("assessment") || lower.includes("quiz") || lower === "3") return 3;
    if (lower.includes("cert") || lower === "2") return 2;
    if (lower.includes("self") || lower === "1") return 1;
    const parsed = parseInt(lower, 10);
    if (!isNaN(parsed)) return Math.max(1, Math.min(5, parsed));
  }
  return 1;
}

function getProficiencyLabel(level) {
  switch (level) {
    case 4: return "Expert (Level 4)";
    case 3: return "Advanced (Level 3)";
    case 2: return "Intermediate (Level 2)";
    case 1:
    default: return "Beginner (Level 1)";
  }
}

function getEvidenceLabel(level) {
  switch (level) {
    case 5: return "Level 5 (Industry Verified)";
    case 4: return "Level 4 (Project / Portfolio)";
    case 3: return "Level 3 (Assessment / Test)";
    case 2: return "Level 2 (Course Certificate)";
    case 1:
    default: return "Level 1 (Self-declared)";
  }
}

function getSkillOntology() {
  return SKILL_ONTOLOGY;
}

function getOntology() {
  return {
    canonicalSkills: SKILL_ONTOLOGY.map(s => ({ id: s.id, name: s.canonicalName, category: s.category })),
    aliases: { ...aliasRegistry }
  };
}

function addAlias(canonicalName, alias) {
  if (!canonicalName || !alias) throw new Error("canonicalName and alias are required");
  const cleanAlias = alias.trim().toLowerCase();
  aliasRegistry[cleanAlias] = canonicalName;
  const canonical = SKILL_ONTOLOGY.find(s => s.canonicalName.toLowerCase() === canonicalName.toLowerCase());
  if (canonical && !canonical.aliases.includes(cleanAlias)) {
    canonical.aliases.push(cleanAlias);
  }
  return true;
}

function addCanonicalSkill(skill) {
  if (!skill || (!skill.name && !skill.canonicalName)) throw new Error("Skill name is required");
  const name = skill.canonicalName || skill.name;
  const exists = SKILL_ONTOLOGY.some(s => s.canonicalName.toLowerCase() === name.toLowerCase());
  if (!exists) {
    const newEntry = {
      id: skill.id || `skill_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      canonicalName: name,
      category: skill.category || "General",
      aliases: Array.isArray(skill.aliases) ? skill.aliases.map(a => a.toLowerCase()) : [name.toLowerCase()]
    };
    SKILL_ONTOLOGY.push(newEntry);
    aliasRegistry[name.toLowerCase()] = name;
    newEntry.aliases.forEach(a => {
      aliasRegistry[a.toLowerCase()] = name;
    });
  }
  return SKILL_ONTOLOGY;
}

const SPEC_ONTOLOGY = {
  canonicalSkills: SKILL_ONTOLOGY.map(s => ({ id: s.id, name: s.canonicalName, category: s.category })),
  aliases: { ...aliasRegistry }
};

module.exports = {
  SKILL_ONTOLOGY,
  SKILL_DICTIONARY: aliasRegistry,
  SPEC_ONTOLOGY,
  cleanSkillString,
  toTitleCase,
  normalizeSkill,
  normalizeSkillList,
  parseNumericProficiency,
  parseNumericEvidence,
  getProficiencyLabel,
  getEvidenceLabel,
  getSkillOntology,
  getOntology,
  addAlias,
  addCanonicalSkill,
};
