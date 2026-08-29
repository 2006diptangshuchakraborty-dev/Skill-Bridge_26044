# Comprehensive Specification Report: SIH 2026 Industry Collaboration Platform
**Problem Statement:** Industry Collaboration for Skill Mapping, Internships and Placement  
**Document Type:** Authoritative Technical Specification & Feature Inventory  
**Author:** Survey Spec Miner 3  
**Status:** Approved Specification  
**Date:** 2026-08-22  

---

## 1. Executive Summary & Architectural Overview

The SIH 2026 platform addresses the structural mismatch between tertiary education curricula and evolving industry skill requirements. At the core of the platform is a **Priority-Aware Skill Matching Engine** designed to eliminate false positives in candidate selection by enforcing strict deterministic thresholds on mandatory (High-Priority) skills while facilitating upskilling through explainable gap analysis on preferred (Low-Priority) skills.

### Architectural Pillars:
1. **Deterministic Priority-Aware Matching**: Zero tolerance for missing mandatory skills; proficiency-gated eligibility checks; granular explainability.
2. **Canonical Skill Normalization Ontology**: Ingests multi-format, multi-alias skill strings and resolves them into canonical taxonomy entries before matching.
3. **Automated Notification & Privacy-Preserving Alert Engine**: Event-driven notification dispatch for students and k-anonymized cohort aggregation for institute faculty.
4. **AI/NLP Job Description Skill Extractor**: Semantic and rule-based parser that reads raw unstructured job descriptions and extracts structured High-Priority vs Low-Priority skill requirements with confidence metrics.
5. **Multi-Role Experience**: Four dedicated, secure role portals (Student, Industry Recruiter, Institute Faculty, System Administrator) connected through a unified Next.js JavaScript application with modern Stripe/Linear-grade UI.

---

## 2. Features Discovered & Inventory Matrix

### 2.1 Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F01 | R1: Matching Engine | Strict High-Priority Match Enforcement | Evaluates all High-Priority skills required by an opportunity. Student must have 100% of these skills with `Student proficiency >= Required proficiency`. | `studentSkills[]`, `opportunitySkills[priority='HIGH']` | `highPriorityMatchRatio`, `highPriorityEligible: boolean` | Missing skill or low proficiency forces `NOT ELIGIBLE` | R1, Acceptance Criteria |
| F02 | R1: Matching Engine | Partial Low-Priority Match Calculation | Evaluates Low-Priority (preferred) skills independently after high-priority checks. Computes fractional match ratio and lists gaps. | `studentSkills[]`, `opportunitySkills[priority='LOW']` | `lowPriorityMatchRatio`, `missingLowPrioritySkills[]` | Handled gracefully: 0 low priority skills defaults to 100% match | R1, Acceptance Criteria |
| F03 | R1: Matching Engine | Categorical Eligibility State Machine | Classifies match into one of three standardized enum statuses: `FULL MATCH`, `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`, or `NOT ELIGIBLE - MANDATORY SKILL GAP`. | High & Low priority match results | `status: EligibilityStatusEnum` | Strict fallback to `NOT ELIGIBLE - MANDATORY SKILL GAP` on any mandatory gap | R1, Acceptance Criteria |
| F04 | R1: Matching Engine | Explainable Match JSON Schema | Produces structured, transparent match breakdown containing counts, percentages, matched skills, missing mandatory skills, and missing preferred skills. | Student ID, Opportunity ID | Structured JSON payload | Returns structured error object if student or opportunity not found | R1 |
| F05 | R1: Matching Engine | Canonical Skill Normalization Layer | Normalizes skill name strings (trimming, case folding, alias mapping, punctuation stripping) against a centralized ontology dictionary. | Raw string (e.g. `ReactJS`, `Postgres`) | Canonical Skill Object (`React`, `PostgreSQL`) | Unrecognized skills mapped to sanitized trimmed canonical format | R1, R5 |
| F06 | R1: Matching Engine | Discrete 4-Tier Proficiency Verification | Compares student proficiency against required proficiency using integer scale (1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert). | `studentProficiency`, `requiredProficiency` | `proficiencyMet: boolean` (`student >= required`) | Invalid proficiency defaults to Level 1 (Beginner) | R1, Acceptance Criteria |
| F07 | R2: Student Portal | Student Profile & Skill Evidence Management | Allows students to curate their profile, register technical skills, and attach verifiable evidence with confidence levels (1–5). | Student profile data, skill claims, evidence metadata | Persisted student profile & skill ledger | Validates evidence URL/file schema, rejects duplicate skills | R2, R3 |
| F08 | R2: Student Portal | Opportunity Catalog & Filter Engine | Searchable, filterable list of active internships/placements (`/student/opportunities`) with real-time eligibility tags. | Filter parameters (industry, location, stipend, eligibility status) | Filtered opportunity list | Empty state displayed when no matching opportunities exist | R2 |
| F09 | R2: Student Portal | Match Breakdown View & Visual Analysis Card | Dedicated view (`/student/opportunities/[id]`) showing dual progress bars (High vs Low), matched skills chips, missing mandatory & preferred skill chips. | Opportunity ID, authenticated Student session | Visual Match Analysis Card UI | Renders 404 / redirect if opportunity ID is invalid | R2, Acceptance Criteria |
| F10 | R2: Student Portal | Guarded Application Submission | Enables student to apply only when High-Priority eligibility is satisfied. Action button is disabled with explanatory tooltip when ineligible. | Application form payload (resume, cover note) | Application record (Status: Applied) | Returns 403 Forbidden with missing mandatory skills if ineligible | R2, Acceptance Criteria |
| F11 | R2: Student Portal | Personalized Upskilling & Gap Recommendations | Analyzes missing low-priority skills for saved/viewed opportunities and suggests targeted learning modules and course pathways. | Student missing low-priority skills | Recommended courses, certifications, project prompts | Graceful fallback to default curriculum if no specific mapping exists | R2 |
| F12 | R2: Recruiter Portal | Opportunity Creator with Priority Classification | Recruiter form to create job posts, assigning skills as High-Priority (mandatory) or Low-Priority (preferred) with required proficiency levels. | Job title, description, location, stipend, skill requirements | Persisted Opportunity with tagged skill requirements | Form validation blocks submission without at least 1 High-Priority skill | R2 |
| F13 | R2: Recruiter Portal | AI NLP Job Description Skill Extractor Assistant | Interactive tool that ingests raw JD text, identifies key technologies, matches canonical taxonomy, and suggests High vs Low priority tags. | Raw unstructured JD text | Proposed High-Priority & Low-Priority skill lists with confidence scores | Recruiter can edit, add, remove, and reclassify suggested skills | R2, R3 |
| F14 | R2: Recruiter Portal | Candidate Pipeline with Eligibility Filters | Tabular and kanban view of applicants filtered by `All`, `Full Match`, `Eligible (Partial)`, and `Ineligible`. | Opportunity ID, filter query params | Ranked candidate list with match scores | Handles zero applicants with clear CTA | R2 |
| F15 | R2: Recruiter Portal | Multi-Candidate Comparison Matrix | Side-by-side comparison modal/view comparing up to 4 candidates across High/Low skill proficiencies, evidence levels, and GPA. | Candidate IDs (array of 2-4 IDs) | Matrix view comparing skills, proficiencies, and evidence badges | Disallows comparison of <2 or >4 candidates | R2 |
| F16 | R2: Recruiter Portal | Intern-to-Placement Performance Evaluation | Recruiter form to evaluate intern post-internship, rating competencies, providing feedback, and endorsing skills. | Intern ID, ratings (1-5), feedback notes, hiring recommendation | Updated student profile, Level 5 verified skills | Requires mandatory qualitative feedback and rating fields | R2, R3 |
| F17 | R2: Institute Portal | Departmental Skill Analytics & Distribution | Visual charts showing skill penetration across departments, cohorts, and academic years. | Department ID, Batch Year | Aggregated skill frequency and average proficiency distributions | Empty dataset rendered cleanly when batch has no registered skills | R2 |
| F18 | R2: Institute Portal | Privacy-Preserving Aggregate Skill-Gap Alerts | Alerts faculty when significant cohorts of eligible students miss common preferred skills (e.g. 91 students missing Machine Learning) without PII leakage. | Aggregation parameters, threshold $k \ge 5$ | Anonymized alert cards with cohort counts and missing skill tags | Suppresses alerts if cohort count is below k-anonymity threshold ($k < 5$) | R2, R4 |
| F19 | R2: Institute Portal | Training Program Generator & Dispatcher | One-click action from an aggregate skill gap alert to create targeted bootcamps, elective workshops, or training programs. | Gap Alert ID, instructor, schedule, max capacity | Created Training Program entity, automated invites to affected cohort | Validates start/end dates and instructor assignment | R2, Acceptance Criteria |
| F20 | R2: Institute Portal | Employer Feedback & Curriculum Alignment Reports | Aggregates recruiter feedback across completed internships to highlight curriculum gaps and industry satisfaction trends. | Institute ID, Academic Year | Comprehensive feedback report with rating breakdowns | Summarizes qualitative feedback into anonymized themes | R2 |
| F21 | R2: Admin Portal | System Metric Overview & Telemetry | Live administrative metrics: active students, companies, posted opportunities, match volume, placement conversion rates. | Admin session | Executive dashboard with charts and KPIs | Strict RBAC (Role-Based Access Control) check | R2 |
| F22 | R2: Admin Portal | Skill Ontology & Alias Dictionary Management | CRUD interface for managing canonical skills, categories, and alias mappings (e.g. adding `FastAPI` as alias to `Python Backend`). | Skill name, category, alias array, description | Updated central skill dictionary | Prevents cyclic alias loops and duplicate canonical names | R2 |
| F23 | R2: Admin Portal | Company Verification & Accreditation Workflow | Review and approve/reject newly registered employer accounts with document verification. | Company ID, decision (Approve/Reject), remarks | Company status updated to `VERIFIED` or `REJECTED` | Rejection requires mandatory explanation reason | R2 |
| F24 | R2: Admin Portal | Audit Logs & Compliance Trail | Immutable chronological ledger of critical system events (role changes, ontology updates, verification actions, bulk alerts). | Log query filters (actor, event type, date range) | Paginated audit log records with IP, timestamp, actor ID | Read-only ledger, cannot be mutated or purged via API | R2 |
| F25 | R3: Evidence System | 5-Tier Skill Evidence Hierarchy | Enforces 5 verifiable tiers: Level 1 (Self-declared), Level 2 (Certificate), Level 3 (Assessment), Level 4 (Project), Level 5 (Industry Verified). | Student skill claim, verification artifacts (URL, PDF, assessment score) | Verified skill badge with corresponding tier weight | Rejects unverified Level 5 claims unless submitted via Recruiter Evaluation | R3 |
| F26 | R3: Evidence System | Employer Feedback Loop & Level 5 Elevation | Automatic elevation of student skill evidence to Level 5 upon completion of positive recruiter post-internship evaluation. | Recruiter evaluation payload with confirmed skills | Student skill evidence updated to Level 5 with confidence score boost | Only triggers for skills explicitly endorsed by verified recruiter | R3 |
| F27 | R4: Notifications | Student Partial Match Opportunity Alerts | Background/real-time notification sent to student when a new opportunity matches 100% High skills but has Low skill gaps, listing exact missing skills. | Opportunity publish event, student skill profiles | In-app notification with direct opportunity link and missing skill list | Deduplicated per student/opportunity pair to prevent alert spam | R4 |
| F28 | R4: Notifications | Institute Aggregated Gap Alerts Engine | Scheduled/event-driven aggregation engine that scans student pools against active market demand to identify macro skill deficits. | Market opportunity pool, student skill records | Aggregated Alert records displayed in faculty portal | Omits student names/IDs to protect student privacy | R4 |
| F29 | R5: App Architecture | Next.js Modern App Layout (JavaScript) | Responsive Next.js application using pure JavaScript, Tailwind CSS, Lucide icons, and modern design patterns (Stripe/Linear aesthetics). | User requests, route transitions | Rendered responsive UI with dark/light mode accenting | Fallback error boundaries and responsive mobile/desktop layouts | R5 |
| F30 | R5: Demo Seeding | Comprehensive Seed Data Engine | Auto-initialization on startup generating 50+ students, 10+ companies, 15+ opportunities, 30+ skills, and the primary Data Analyst benchmark scenario. | Database seed trigger / CLI script | Fully populated local database / persistent state | Idempotent seeding prevents duplicate records on restart | R5 |
| F31 | R5: Verification | Programmatic Test & Verification Suite | Automated test harness / API endpoint verifying all matching engine rules, edge cases, proficiency comparisons, and normalization. | Test suite runner execution | Test summary with pass/fail counts and assertion details | Any assertion failure returns non-zero exit code / 500 error status | R5, Acceptance Criteria |

---

### 2.2 Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed & Specified Behavior |
|---|---------|-------------------|-------------------------------|
| E01 | Matching Engine | Opportunity has 0 High-Priority skills | High-Priority match defaults to `100%` (`highPriorityEligible = true`). Status depends entirely on Low-Priority skills (`FULL MATCH` or `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH`). |
| E02 | Matching Engine | Opportunity has 0 Low-Priority skills | Low-Priority match defaults to `100%`. If High-Priority is 100%, status is `FULL MATCH`. If High-Priority < 100%, status is `NOT ELIGIBLE - MANDATORY SKILL GAP`. |
| E03 | Matching Engine | Opportunity has 0 High and 0 Low skills | Edge case: Returns `FULL MATCH` with 100% across all metrics, empty matched and missing lists. System logs warning to recruiter. |
| E04 | Matching Engine | Student has all required skills but 1 skill has `Student proficiency < Required proficiency` | Strict failure: High-Priority skill proficiency check fails -> `highPriorityEligible = false`, Status = `NOT ELIGIBLE - MANDATORY SKILL GAP`. Missing list includes the deficient skill with note `(Proficiency Insufficient: Required X, Found Y)`. |
| E05 | Matching Engine | Student has 100% of Low-Priority skills but misses 1 High-Priority skill | Eligibility = `NOT ELIGIBLE - MANDATORY SKILL GAP`. Low-Priority match score (100%) is reported for analytics, but candidate is strictly non-eligible and Apply button is disabled. |
| E06 | Matching Engine | Student has higher proficiency than required (`Student: Expert (4)` vs `Required: Intermediate (2)`) | Condition `Student >= Required` evaluates to `true` (4 >= 2). Skill is marked matched and contributes 100% to match count. |
| E07 | Normalization | Skill string contains irregular casing, whitespace, and symbols (e.g. `"  react.js  "`, `"Node JS"`, `"c++"`) | Normalization layer trims whitespace, lowercases for lookup, strips extraneous punctuation, and maps `"react.js"` -> `"React"`, `"Node JS"` -> `"Node.js"`, `"c++"` -> `"C++"`. |
| E08 | Normalization | Unknown skill alias not in dictionary (e.g. `"CustomInternalToolV2"`) | System creates canonical fallback by title-casing and trimming: `"CustomInternalToolV2"`, assigning category `"Other/General"`. Matching works on exact canonical name. |
| E09 | Normalization | Duplicate skills submitted in student profile with differing aliases (e.g. student enters both `"React"` and `"ReactJS"`) | Normalizer de-duplicates skills on canonical ID, retaining the entry with the highest proficiency level and highest evidence tier. |
| E10 | NLP JD Extractor | Job description text contains no technical skills (e.g. pure managerial prose) | Extractor returns empty skill arrays with notification `"No recognized technical skills found. Please manually add required skills."` |
| E11 | NLP JD Extractor | Job description has ambiguous modal verbs (e.g. `"Knowledge of Docker is a plus, but Kubernetes is mandatory"`) | NLP linguistic classifier identifies `"is a plus"` -> Low-Priority for Docker, and `"mandatory"` -> High-Priority for Kubernetes. |
| E12 | NLP JD Extractor | Skill mentioned multiple times across different sections (e.g. `"Python"` in overview and `"Python required"` in requirements) | Extractor de-duplicates canonical skill, elevating priority to High-Priority if any mention matches mandatory linguistic markers. |
| E13 | Institute Gap Alert | Number of eligible students with gap is smaller than k-anonymity threshold ($N < 5$, e.g. 2 students missing PyTorch) | Alert engine suppresses the alert from faculty dashboard to prevent de-anonymization of individual student identities. |
| E14 | Student Notification | Opportunity is updated/re-published by recruiter | Notification engine checks hash of skill requirements. Only dispatches new notifications if High/Low skill requirements changed and student status transitioned. |
| E15 | Evidence System | Unverified student attempts to submit Level 5 evidence directly | Profile API validates evidence payload. Direct submissions are capped at Level 4 (Project/Repo). Level 5 is strictly locked to recruiter evaluation webhook/internal API. |
| E16 | Candidate Comparison | Recruiter selects 2 candidates with identical skill sets but different evidence tiers | Comparison matrix displays identical match percentages (e.g. 100%) but visually highlights evidence tier differential (e.g. Level 5 vs Level 2) as key differentiator. |
| E17 | Application Submission | Student modifies skills in separate tab while viewing opportunity, then clicks Apply | Application submission API executes server-side re-verification of the match engine before creating the application record, preventing stale client-side bypass. |
| E18 | Training Program | Faculty creates training program for skill gap; 0 eligible students enroll | System maintains training program record with status `Scheduled - Low Enrollment`, sends reminder alert to eligible cohort. |

---

## 3. Priority-Aware Skill Matching Engine Specification

### 3.1 Mathematical Formulation & Core Business Rules

Let an opportunity $O$ specify a set of required skills $S_{req}$, partitioned into two disjoint subsets:
$$S_{req} = S_{high} \cup S_{low}, \quad S_{high} \cap S_{low} = \emptyset$$

Where:
- $S_{high}$ is the set of **High-Priority (Mandatory)** skill requirements.
- $S_{low}$ is the set of **Low-Priority (Preferred)** skill requirements.

Each requirement $r \in S_{req}$ has a canonical skill identifier $k_r$ and a minimum required proficiency level $P_{req}(r) \in \{1, 2, 3, 4\}$.

Let a student $U$ possess a set of verified skills $S_{stu}$, where each skill $s \in S_{stu}$ has a canonical identifier $k_s$ and an achieved proficiency level $P_{stu}(s) \in \{1, 2, 3, 4\}$.

#### Proficiency Level Scale:
- `1` = **Beginner** (Basic syntax, theoretical understanding)
- `2` = **Intermediate** (Hands-on project experience, standard workflows)
- `3` = **Advanced** (Production experience, optimization, complex debugging)
- `4` = **Expert** (Architectural design, system tuning, deep domain authority)

#### Step 1: Canonical Normalization
Prior to comparison, all skill strings are mapped via the normalization function:
$$\text{Norm}: \text{String} \to \text{CanonicalSkillId}$$

#### Step 2: High-Priority (Mandatory) Evaluation
For each $r \in S_{high}$, a match occurs if and only if:
$$\text{Matched}_{high}(r) = \exists s \in S_{stu} \text{ s.t. } \text{Norm}(k_s) = \text{Norm}(k_r) \land P_{stu}(s) \ge P_{req}(r)$$

The High-Priority match count and ratio are computed as:
$$M_{high} = |\{ r \in S_{high} \mid \text{Matched}_{high}(r) \}|$$
$$R_{high} = \begin{cases} 1.0 & \text{if } |S_{high}| = 0 \\ \frac{M_{high}}{|S_{high}|} & \text{if } |S_{high}| > 0 \end{cases}$$

The High-Priority eligibility boolean $E_{high}$ is strictly defined as:
$$E_{high} = (R_{high} == 1.0)$$

If $E_{high} == \text{false}$, the candidate is unconditionally **NOT ELIGIBLE**.

#### Step 3: Low-Priority (Preferred) Evaluation
For each $r \in S_{low}$, a match occurs if:
$$\text{Matched}_{low}(r) = \exists s \in S_{stu} \text{ s.t. } \text{Norm}(k_s) = \text{Norm}(k_r) \land P_{stu}(s) \ge P_{req}(r)$$

The Low-Priority match count and ratio are computed as:
$$M_{low} = |\{ r \in S_{low} \mid \text{Matched}_{low}(r) \}|$$
$$R_{low} = \begin{cases} 1.0 & \text{if } |S_{low}| = 0 \\ \frac{M_{low}}{|S_{low}|} & \text{if } |S_{low}| > 0 \end{cases}$$

#### Step 4: Overall Composite Score & Eligibility Status Enum
The overall match percentage for eligible candidates is calculated as:
$$\text{Score}_{overall} = \begin{cases} 
R_{high} \times 100 & \text{if } |S_{low}| = 0 \\
(0.70 \times R_{high} + 0.30 \times R_{low}) \times 100 & \text{if } |S_{low}| > 0 \text{ and } E_{high} = \text{true} \\
(0.70 \times R_{high} + 0.30 \times R_{low}) \times 100 & \text{if } E_{high} = \text{false (Informational Only)}
\end{cases}$$

#### Categorical Status Determination:
$$\text{Status} = \begin{cases} 
\text{"FULL MATCH"} & \text{if } E_{high} = \text{true} \land R_{low} == 1.0 \\
\text{"ELIGIBLE - PARTIAL PREFERRED SKILL MATCH"} & \text{if } E_{high} = \text{true} \land R_{low} < 1.0 \\
\text{"NOT ELIGIBLE - MANDATORY SKILL GAP"} & \text{if } E_{high} = \text{false}
\end{cases}$$

---

### 3.2 Canonical Skill Normalization Layer & Ontology Dictionary

The system incorporates an extensible skill ontology dictionary mapping synonyms, framework versions, typos, and abbreviations to authoritative canonical records.

```javascript
// Canonical Skill Ontology Sample Dictionary (30+ core industry skills)
export const SKILL_ONTOLOGY = [
  {
    id: "skill_python",
    canonicalName: "Python",
    category: "Programming Languages",
    aliases: ["python", "python3", "py", "cpython", "python 3.x"]
  },
  {
    id: "skill_sql",
    canonicalName: "SQL",
    category: "Database & Querying",
    aliases: ["sql", "structured query language", "ansi sql", "plsql", "t-sql"]
  },
  {
    id: "skill_postgresql",
    canonicalName: "PostgreSQL",
    category: "Database & Querying",
    aliases: ["postgresql", "postgres", "psql", "pgsql", "postgres db"]
  },
  {
    id: "skill_tableau",
    canonicalName: "Tableau",
    category: "Data Visualization & BI",
    aliases: ["tableau", "tableau desktop", "tableau server", "tableau bi"]
  },
  {
    id: "skill_powerbi",
    canonicalName: "Power BI",
    category: "Data Visualization & BI",
    aliases: ["power bi", "powerbi", "ms power bi", "microsoft power bi"]
  },
  {
    id: "skill_machine_learning",
    canonicalName: "Machine Learning",
    category: "AI & Data Science",
    aliases: ["machine learning", "ml", "statistical learning", "scikit-learn", "sklearn"]
  },
  {
    id: "skill_data_analysis",
    canonicalName: "Data Analysis",
    category: "Data Science",
    aliases: ["data analysis", "data analytics", "eda", "exploratory data analysis"]
  },
  {
    id: "skill_excel",
    canonicalName: "Advanced Excel",
    category: "Data Tools",
    aliases: ["excel", "advanced excel", "ms excel", "vlookup", "excel pivot tables", "spreadsheets"]
  },
  {
    id: "skill_react",
    canonicalName: "React",
    category: "Frontend Development",
    aliases: ["react", "reactjs", "react.js", "react js"]
  },
  {
    id: "skill_nextjs",
    canonicalName: "Next.js",
    category: "Frontend Development",
    aliases: ["nextjs", "next.js", "next js", "next"]
  },
  {
    id: "skill_javascript",
    canonicalName: "JavaScript",
    category: "Programming Languages",
    aliases: ["javascript", "js", "ecmascript", "es6", "es2020"]
  },
  {
    id: "skill_typescript",
    canonicalName: "TypeScript",
    category: "Programming Languages",
    aliases: ["typescript", "ts"]
  },
  {
    id: "skill_nodejs",
    canonicalName: "Node.js",
    category: "Backend Development",
    aliases: ["nodejs", "node.js", "node js", "node"]
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
    category: "DevOps & Cloud",
    aliases: ["docker", "containerization", "docker-compose", "docker containers"]
  },
  {
    id: "skill_kubernetes",
    canonicalName: "Kubernetes",
    category: "DevOps & Cloud",
    aliases: ["kubernetes", "k8s", "kube"]
  },
  {
    id: "skill_aws",
    canonicalName: "AWS",
    category: "Cloud Infrastructure",
    aliases: ["aws", "amazon web services", "ec2", "s3", "aws cloud"]
  },
  {
    id: "skill_git",
    canonicalName: "Git",
    category: "Version Control",
    aliases: ["git", "github", "gitlab", "version control", "git cli"]
  },
  {
    id: "skill_deep_learning",
    canonicalName: "Deep Learning",
    category: "AI & Data Science",
    aliases: ["deep learning", "dl", "neural networks", "pytorch", "tensorflow", "keras"]
  },
  {
    id: "skill_nlp",
    canonicalName: "Natural Language Processing",
    category: "AI & Data Science",
    aliases: ["nlp", "natural language processing", "text mining", "huggingface", "llm", "spacy"]
  },
  {
    id: "skill_mongodb",
    canonicalName: "MongoDB",
    category: "Database & Querying",
    aliases: ["mongodb", "mongo", "nosql", "documentdb"]
  },
  {
    id: "skill_graphql",
    canonicalName: "GraphQL",
    category: "API & Backend",
    aliases: ["graphql", "gql", "apollo graphql"]
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
    category: "Security",
    aliases: ["cybersecurity", "infosec", "network security", "penetration testing", "ethical hacking"]
  },
  {
    id: "skill_linux",
    canonicalName: "Linux",
    category: "Operating Systems & CLI",
    aliases: ["linux", "unix", "bash", "shell scripting", "ubuntu"]
  },
  {
    id: "skill_r",
    canonicalName: "R Programming",
    category: "Data Science",
    aliases: ["r", "r programming", "rstudio", "r-lang"]
  },
  {
    id: "skill_spark",
    canonicalName: "Apache Spark",
    category: "Big Data",
    aliases: ["spark", "apache spark", "pyspark"]
  },
  {
    id: "skill_java",
    canonicalName: "Java",
    category: "Programming Languages",
    aliases: ["java", "core java", "java 17", "java 21", "jvm"]
  },
  {
    id: "skill_spring_boot",
    canonicalName: "Spring Boot",
    category: "Backend Development",
    aliases: ["spring boot", "springboot", "spring framework"]
  },
  {
    id: "skill_cplusplus",
    canonicalName: "C++",
    category: "Programming Languages",
    aliases: ["c++", "cpp", "c plus plus"]
  },
  {
    id: "skill_statistics",
    canonicalName: "Applied Statistics",
    category: "Data Science",
    aliases: ["statistics", "applied statistics", "hypothesis testing", "probability"]
  }
];
```

#### Normalization Logic Algorithm:
```javascript
export function normalizeSkill(inputString) {
  if (!inputString || typeof inputString !== "string") return null;
  
  // 1. Clean input: lower, trim, strip punctuation (keeping plus/sharp)
  const cleaned = inputString
    .toLowerCase()
    .trim()
    .replace(/[._\-]/g, " ")
    .replace(/\s+/g, " ");

  // 2. Direct exact alias match
  for (const skill of SKILL_ONTOLOGY) {
    if (skill.canonicalName.toLowerCase() === cleaned) return skill;
    for (const alias of skill.aliases) {
      const cleanedAlias = alias.toLowerCase().replace(/[._\-]/g, " ").replace(/\s+/g, " ");
      if (cleanedAlias === cleaned) return skill;
    }
  }

  // 3. Substring match fallback for composite names
  for (const skill of SKILL_ONTOLOGY) {
    for (const alias of skill.aliases) {
      if (cleaned.includes(alias.toLowerCase())) return skill;
    }
  }

  // 4. Dynamic fallback for unlisted skills
  const titleCased = inputString.trim().charAt(0).toUpperCase() + inputString.trim().slice(1);
  return {
    id: `skill_custom_${cleaned.replace(/\s+/g, "_")}`,
    canonicalName: titleCased,
    category: "General / Other",
    aliases: [cleaned]
  };
}
```

---

### 3.3 Explainable Match Result JSON Schema & Contract

The matching engine returns an explainable JSON payload complying with the following formal JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MatchResult",
  "type": "object",
  "required": [
    "studentId",
    "opportunityId",
    "opportunityTitle",
    "companyName",
    "eligibilityStatus",
    "isEligible",
    "highPrioritySummary",
    "lowPrioritySummary",
    "matchedSkills",
    "missingHighPrioritySkills",
    "missingLowPrioritySkills",
    "matchBreakdownExplanation",
    "calculatedAt"
  ],
  "properties": {
    "studentId": { "type": "string" },
    "opportunityId": { "type": "string" },
    "opportunityTitle": { "type": "string" },
    "companyName": { "type": "string" },
    "eligibilityStatus": {
      "type": "string",
      "enum": [
        "FULL MATCH",
        "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH",
        "NOT ELIGIBLE - MANDATORY SKILL GAP"
      ]
    },
    "isEligible": { "type": "boolean" },
    "compositeMatchScore": { "type": "number", "minimum": 0, "maximum": 100 },
    "highPrioritySummary": {
      "type": "object",
      "required": ["totalRequired", "totalMatched", "matchPercentage", "isFullyMatched"],
      "properties": {
        "totalRequired": { "type": "integer", "minimum": 0 },
        "totalMatched": { "type": "integer", "minimum": 0 },
        "matchPercentage": { "type": "number", "minimum": 0, "maximum": 100 },
        "isFullyMatched": { "type": "boolean" }
      }
    },
    "lowPrioritySummary": {
      "type": "object",
      "required": ["totalRequired", "totalMatched", "matchPercentage"],
      "properties": {
        "totalRequired": { "type": "integer", "minimum": 0 },
        "totalMatched": { "type": "integer", "minimum": 0 },
        "matchPercentage": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    },
    "matchedSkills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["skillId", "skillName", "priority", "requiredProficiency", "studentProficiency", "evidenceLevel"],
        "properties": {
          "skillId": { "type": "string" },
          "skillName": { "type": "string" },
          "priority": { "type": "string", "enum": ["HIGH", "LOW"] },
          "requiredProficiency": { "type": "integer", "minimum": 1, "maximum": 4 },
          "studentProficiency": { "type": "integer", "minimum": 1, "maximum": 4 },
          "evidenceLevel": { "type": "integer", "minimum": 1, "maximum": 5 }
        }
      }
    },
    "missingHighPrioritySkills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["skillId", "skillName", "requiredProficiency", "studentProficiency", "reason"],
        "properties": {
          "skillId": { "type": "string" },
          "skillName": { "type": "string" },
          "requiredProficiency": { "type": "integer" },
          "studentProficiency": { "type": ["integer", "null"] },
          "reason": { "type": "string", "enum": ["SKILL_ABSENT", "PROFICIENCY_DEFICIENT"] }
        }
      }
    },
    "missingLowPrioritySkills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["skillId", "skillName", "requiredProficiency", "studentProficiency", "reason"],
        "properties": {
          "skillId": { "type": "string" },
          "skillName": { "type": "string" },
          "requiredProficiency": { "type": "integer" },
          "studentProficiency": { "type": ["integer", "null"] },
          "reason": { "type": "string", "enum": ["SKILL_ABSENT", "PROFICIENCY_DEFICIENT"] }
        }
      }
    },
    "matchBreakdownExplanation": { "type": "string" },
    "calculatedAt": { "type": "string", "format": "date-time" }
  }
}
```

#### Sample Real Match Output (Eligible - Partial Preferred Match):
```json
{
  "studentId": "stu_014",
  "opportunityId": "opp_data_analyst_01",
  "opportunityTitle": "Data Analyst Internship",
  "companyName": "Apex Analytics Corp",
  "eligibilityStatus": "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH",
  "isEligible": true,
  "compositeMatchScore": 85.0,
  "highPrioritySummary": {
    "totalRequired": 4,
    "totalMatched": 4,
    "matchPercentage": 100.0,
    "isFullyMatched": true
  },
  "lowPrioritySummary": {
    "totalRequired": 4,
    "totalMatched": 2,
    "matchPercentage": 50.0
  },
  "matchedSkills": [
    { "skillId": "skill_python", "skillName": "Python", "priority": "HIGH", "requiredProficiency": 2, "studentProficiency": 3, "evidenceLevel": 4 },
    { "skillId": "skill_sql", "skillName": "SQL", "priority": "HIGH", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 3 },
    { "skillId": "skill_postgresql", "skillName": "PostgreSQL", "priority": "HIGH", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 2 },
    { "skillId": "skill_data_analysis", "skillName": "Data Analysis", "priority": "HIGH", "requiredProficiency": 2, "studentProficiency": 3, "evidenceLevel": 4 },
    { "skillId": "skill_tableau", "skillName": "Tableau", "priority": "LOW", "requiredProficiency": 1, "studentProficiency": 2, "evidenceLevel": 3 },
    { "skillId": "skill_excel", "skillName": "Advanced Excel", "priority": "LOW", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 2 }
  ],
  "missingHighPrioritySkills": [],
  "missingLowPrioritySkills": [
    {
      "skillId": "skill_machine_learning",
      "skillName": "Machine Learning",
      "requiredProficiency": 2,
      "studentProficiency": null,
      "reason": "SKILL_ABSENT"
    },
    {
      "skillId": "skill_powerbi",
      "skillName": "Power BI",
      "requiredProficiency": 2,
      "studentProficiency": 1,
      "reason": "PROFICIENCY_DEFICIENT"
    }
  ],
  "matchBreakdownExplanation": "Candidate satisfies 100% of mandatory High-Priority skills (Python, SQL, PostgreSQL, Data Analysis) and is ELIGIBLE. Low-Priority match is 50% (missing Machine Learning, Power BI). Recommended for interview with upskilling recommendations.",
  "calculatedAt": "2026-08-22T14:00:00.000Z"
}
```

---

## 4. Automated Notification & Privacy-Preserving Skill-Gap Alert Engine

### 4.1 Student Notifications: Partial Match Opportunity Alerts

When an opportunity is published or refreshed, the system scans the student database and generates personal notifications for students who satisfy all High-Priority skills but possess gaps in Low-Priority skills.

#### Event Trigger Flow:
```
[Opportunity Published/Updated]
            │
            ▼
[Scan Active Student Registry]
            │
            ▼
[Evaluate Priority Matching Engine]
            │
            ├── If isEligible == true AND lowPriorityMatchPercentage < 100%
            │        │
            │        ▼
            │   [Generate Student Notification]
            │   - Notification Type: "PARTIAL_MATCH_OPPORTUNITY"
            │   - Payload: Opportunity Title, Company, Missing Preferred Skills List, CTA Link
            │   - Store in Student Notification Box & Push Realtime Toast
            │
            └── Otherwise (Ineligible OR 100% Full Match): Discard or Standard Route
```

#### Student Notification Payload Schema:
```json
{
  "id": "notif_stu_9812",
  "recipientId": "stu_014",
  "recipientRole": "STUDENT",
  "type": "PARTIAL_MATCH_OPPORTUNITY",
  "title": "You're Eligible for Data Analyst Internship at Apex Analytics!",
  "message": "You meet all 4 mandatory requirements. You have a partial match on preferred skills. Boosting 'Machine Learning' and 'Power BI' will maximize your selection chances.",
  "metadata": {
    "opportunityId": "opp_data_analyst_01",
    "companyName": "Apex Analytics Corp",
    "highPriorityMatch": "4/4 (100%)",
    "lowPriorityMatch": "2/4 (50%)",
    "missingPreferredSkills": ["Machine Learning", "Power BI"],
    "actionUrl": "/student/opportunities/opp_data_analyst_01"
  },
  "read": false,
  "createdAt": "2026-08-22T14:02:00.000Z"
}
```

---

### 4.2 Institute Aggregated Skill-Gap Alert Engine (Privacy-Preserving / Zero-PII)

The Institute Alert Engine provides academic leaders and faculty placement officers with actionable curriculum intelligence while strictly protecting student privacy (Zero PII leakage).

#### Core Privacy Guarantees:
1. **$k$-Anonymity Threshold ($k=5$)**: No aggregated alert is generated or exposed if the number of affected students in a cohort is less than 5, preventing re-identification via quasi-identifiers.
2. **Zero Student Identifiers**: Payloads contain only statistical counts, department identifiers, batch years, and canonical skill names. No student names, roll numbers, GPA, email addresses, or individual IDs are ever exposed in institute alert payloads.
3. **Cohort Aggregation Granularity**: Aggregations are calculated at the Department or Department + Batch level.

#### Aggregation Algorithm:
```javascript
export function generateInstituteGapAlerts(opportunities, studentProfiles, kThreshold = 5) {
  const gapMap = new Map(); // Key: "departmentId:skillId" -> { count, departments, skillName, opportunityCount }

  for (const opp of opportunities) {
    if (!opp.skills || opp.skills.length === 0) continue;
    const lowPrioritySkills = opp.skills.filter(s => s.priority === "LOW");

    for (const student of studentProfiles) {
      // Evaluate high-priority eligibility first
      const highReqs = opp.skills.filter(s => s.priority === "HIGH");
      const highEligible = highReqs.every(req => {
        const match = student.skills.find(s => s.canonicalId === req.canonicalId);
        return match && match.proficiency >= req.proficiency;
      });

      // We only alert on gaps among ELIGIBLE candidates
      if (highEligible) {
        for (const pref of lowPrioritySkills) {
          const hasPref = student.skills.some(s => s.canonicalId === pref.canonicalId && s.proficiency >= pref.proficiency);
          if (!hasPref) {
            const key = `${student.departmentId}:${pref.canonicalId}`;
            if (!gapMap.has(key)) {
              gapMap.set(key, {
                departmentId: student.departmentId,
                departmentName: student.departmentName,
                skillId: pref.canonicalId,
                skillName: pref.canonicalName,
                affectedStudentsCount: 0,
                relatedOpportunities: new Set()
              });
            }
            const record = gapMap.get(key);
            record.affectedStudentsCount += 1;
            record.relatedOpportunities.add(opp.id);
          }
        }
      }
    }
  }

  // Filter with k-anonymity threshold and format output
  const alerts = [];
  for (const [_, item] of gapMap.entries()) {
    if (item.affectedStudentsCount >= kThreshold) {
      alerts.push({
        id: `alert_gap_${item.departmentId}_${item.skillId}`,
        departmentId: item.departmentId,
        departmentName: item.departmentName,
        skillId: item.skillId,
        skillName: item.skillName,
        affectedCohortCount: item.affectedStudentsCount,
        opportunityCount: item.relatedOpportunities.size,
        severity: item.affectedStudentsCount > 50 ? "HIGH" : item.affectedStudentsCount > 20 ? "MEDIUM" : "LOW",
        recommendedAction: `Create ${item.skillName} Training Workshop / Elective`,
        createdAt: new Date().toISOString()
      });
    }
  }

  return alerts.sort((a, b) => b.affectedCohortCount - a.affectedCohortCount);
}
```

#### Institute Alert Payload Schema (Zero PII):
```json
{
  "id": "alert_gap_cse_machine_learning",
  "alertType": "CURRICULUM_SKILL_GAP",
  "departmentId": "dept_cse",
  "departmentName": "Computer Science & Engineering",
  "skillId": "skill_machine_learning",
  "skillName": "Machine Learning",
  "affectedCohortCount": 91,
  "opportunityCount": 12,
  "severity": "HIGH",
  "summary": "91 eligible Computer Science students are currently missing 'Machine Learning', a preferred skill across 12 active internship opportunities.",
  "action": {
    "type": "CREATE_TRAINING_PROGRAM",
    "suggestedTitle": "Hands-on Applied Machine Learning with Scikit-Learn",
    "targetSkillId": "skill_machine_learning",
    "targetDepartmentId": "dept_cse"
  },
  "privacyMetadata": {
    "kAnonymityEnforced": true,
    "cohortSize": 91,
    "piiExposed": false
  },
  "createdAt": "2026-08-22T14:05:00.000Z"
}
```

---

## 5. AI NLP Job Description Skill Extractor Specification

### 5.1 Architecture & Pipeline Overview

The NLP Skill Extractor processes unstructured job descriptions using a deterministic-semantic extraction pipeline that segments text, extracts entities, matches against the canonical ontology, and classifies each extracted skill into **High-Priority (Mandatory)** or **Low-Priority (Preferred)** based on contextual linguistic markers.

```
[Raw Job Description Input]
           │
           ▼
[1. Text Preprocessing & Section Segmenter]
   - Splits into: Title, Responsibilities, Requirements, Preferred/Nice-to-Have
           │
           ▼
[2. Entity Extraction & N-Gram Tokenizer]
   - Sliding window 1-gram, 2-gram, 3-gram extraction
           │
           ▼
[3. Taxonomy Resolution & Normalization]
   - Maps extracted n-grams to Canonical Ontology IDs
           │
           ▼
[4. Contextual Priority Classifier (High vs Low)]
   - Evaluates linguistic cues, modal verbs, and section headers
           │
           ▼
[5. Confidence Scoring & Recruiter Interactive Review UI]
   - Assigns confidence score (0.0 to 1.0)
   - Populates editable High and Low pools for Recruiter one-click modification
```

---

### 5.2 Linguistic Markers & Classification Rules

The extractor evaluates two dimensions to determine priority: **Sectional Placement** and **Linguistic Modifiers**.

#### Sectional Keywords:
- **Mandatory Sections (Weight +0.50 High)**: `"requirements"`, `"minimum qualifications"`, `"must have"`, `"what you need"`, `"eligibility"`, `"core skills"`, `"basic qualifications"`.
- **Preferred Sections (Weight +0.50 Low)**: `"preferred qualifications"`, `"nice to have"`, `"bonus points"`, `"plus"`, `"good to have"`, `"desired skills"`, `"optional"`.

#### Linguistic Context Cues (Window of $\pm 10$ tokens around skill):
- **Mandatory Cue Markers ($Score_{high} + 0.40$)**: `"must"`, `"required"`, `"essential"`, `"mandatory"`, `"fluency in"`, `"strong experience with"`, `"proficiency in"`, `"expert in"`, `"solid foundation in"`.
- **Preferred Cue Markers ($Score_{low} + 0.40$)**: `"familiarity"`, `"exposure to"`, `"plus"`, `"advantage"`, `"bonus"`, `"preferred"`, `"nice to have"`, `"helpful"`, `"beneficial"`.

#### Proficiency Inference Rules:
- `"senior"`, `"expert"`, `"deep knowledge"`, `"architect"` $\to$ Level 4 (Expert)
- `"strong experience"`, `"advanced"`, `"extensive"`, `"3+ years"` $\to$ Level 3 (Advanced)
- `"hands-on"`, `"proficient"`, `"solid"`, `"2+ years"`, `"intermediate"` $\to$ Level 2 (Intermediate)
- `"basic"`, `"familiarity"`, `"understanding"`, `"beginner"`, default $\to$ Level 1 (Beginner)

```javascript
// Heuristic Priority Scoring Function
export function classifySkillPriority(skillMention, sectionType, surroundingText) {
  let highWeight = 0;
  let lowWeight = 0;

  // Section influence
  if (sectionType === "REQUIREMENTS" || sectionType === "MANDATORY") highWeight += 0.50;
  if (sectionType === "PREFERRED" || sectionType === "NICE_TO_HAVE") lowWeight += 0.50;

  const textLower = surroundingText.toLowerCase();

  // Linguistic cue matching
  const mandatoryRegex = /\b(must|required|essential|mandatory|strong proficiency|proficient in|core)\b/i;
  const preferredRegex = /\b(plus|nice to have|preferred|bonus|exposure|familiarity|advantage|optional)\b/i;

  if (mandatoryRegex.test(textLower)) highWeight += 0.40;
  if (preferredRegex.test(textLower)) lowWeight += 0.40;

  // Final priority determination
  const priority = highWeight >= lowWeight ? "HIGH" : "LOW";
  const confidence = Math.min(0.98, Math.max(0.65, Math.abs(highWeight - lowWeight) + 0.60));

  return { priority, confidence };
}
```

---

### 5.3 Extractor API Payload Contract

#### Endpoint: `POST /api/nlp/extract-skills`

**Request Body:**
```json
{
  "jobTitle": "Data Analyst Intern",
  "jobDescription": "We are seeking a Data Analyst Intern. Candidates must have strong proficiency in Python and SQL (PostgreSQL preferred). Solid hands-on experience in Data Analysis is required. Knowledge of Tableau or Advanced Excel is highly desired. Familiarity with Machine Learning concepts and Power BI is a strong plus."
}
```

**Response Body:**
```json
{
  "success": true,
  "extractedSkills": [
    {
      "skillId": "skill_python",
      "canonicalName": "Python",
      "suggestedPriority": "HIGH",
      "suggestedProficiency": 2,
      "confidence": 0.95,
      "matchedText": "Python",
      "reasoning": "Located in mandatory sentence with 'must have strong proficiency'."
    },
    {
      "skillId": "skill_sql",
      "canonicalName": "SQL",
      "suggestedPriority": "HIGH",
      "suggestedProficiency": 2,
      "confidence": 0.92,
      "matchedText": "SQL",
      "reasoning": "Matched directly with mandatory marker 'must have'."
    },
    {
      "skillId": "skill_postgresql",
      "canonicalName": "PostgreSQL",
      "suggestedPriority": "HIGH",
      "suggestedProficiency": 2,
      "confidence": 0.84,
      "matchedText": "PostgreSQL",
      "reasoning": "Normalized from 'PostgreSQL', linked to core SQL qualification."
    },
    {
      "skillId": "skill_data_analysis",
      "canonicalName": "Data Analysis",
      "suggestedPriority": "HIGH",
      "suggestedProficiency": 2,
      "confidence": 0.90,
      "matchedText": "Data Analysis",
      "reasoning": "Matched with marker 'is required'."
    },
    {
      "skillId": "skill_tableau",
      "canonicalName": "Tableau",
      "suggestedPriority": "LOW",
      "suggestedProficiency": 1,
      "confidence": 0.88,
      "matchedText": "Tableau",
      "reasoning": "Matched with modifier 'is highly desired'."
    },
    {
      "skillId": "skill_excel",
      "canonicalName": "Advanced Excel",
      "suggestedPriority": "LOW",
      "suggestedProficiency": 2,
      "confidence": 0.85,
      "matchedText": "Advanced Excel",
      "reasoning": "Matched in desired clause."
    },
    {
      "skillId": "skill_machine_learning",
      "canonicalName": "Machine Learning",
      "suggestedPriority": "LOW",
      "suggestedProficiency": 1,
      "confidence": 0.91,
      "matchedText": "Machine Learning",
      "reasoning": "Matched with modifier 'familiarity with' and 'strong plus'."
    },
    {
      "skillId": "skill_powerbi",
      "canonicalName": "Power BI",
      "suggestedPriority": "LOW",
      "suggestedProficiency": 1,
      "confidence": 0.89,
      "matchedText": "Power BI",
      "reasoning": "Matched with modifier 'strong plus'."
    }
  ],
  "summary": {
    "highPriorityCount": 4,
    "lowPriorityCount": 4,
    "totalDiscovered": 8
  }
}
```

---

## 6. Role-Based Dashboards & Workflows

### 6.1 Student Portal (`/student/*`)
- `/student/profile`: View personal verified skills, evidence badges (Levels 1-5), and update certificates/project links.
- `/student/opportunities`: Search and browse all active opportunities. Each card displays an instantaneous eligibility badge (`FULL MATCH`, `ELIGIBLE (PARTIAL)`, or `NOT ELIGIBLE`).
- `/student/opportunities/[id]`: Detailed opportunity view with the visual **Skill Match Analysis Card**:
  - High-Priority Progress Bar (e.g. `4/4 - 100%`) with green color indicator.
  - Low-Priority Progress Bar (e.g. `2/4 - 50%`) with amber color indicator.
  - Matched skills tagged with student's verified evidence badges.
  - Missing mandatory skills with red alert box.
  - Missing preferred skills with one-click "Recommended Learning Pathway" modal.
  - `Apply Now` button: Fully active for eligible students; disabled with tooltip `Cannot apply: Missing mandatory High-Priority skills` for ineligible students.
- `/student/upskilling`: Interactive curriculum recommendation page mapping missing preferred skills to curated courses and projects.

### 6.2 Industry / Recruiter Portal (`/recruiter/*` or `/industry/*`)
- `/recruiter/jobs/create`: Job posting wizard featuring the interactive **AI NLP Skill Extractor**. Recruiter pastes JD text $\to$ clicks "Extract Skills with AI" $\to$ system auto-populates High and Low priority skill tag pools with full drag-and-drop / click-to-reassign capability.
- `/recruiter/jobs/[id]/applicants`: Candidate listing with quick filters (`All`, `Eligible Only`, `Full Match`, `Ineligible`).
- `/recruiter/jobs/[id]/compare`: Multi-Candidate Comparison Matrix comparing up to 4 selected candidates side-by-side on match percentages, evidence tiers, GPA, and assessment scores.
- `/recruiter/internships/evaluate`: Post-internship evaluation interface allowing supervisors to rate intern performance, provide qualitative feedback, and formally endorse skills (elevating them to Level 5).

### 6.3 Institute / Faculty Portal (`/institute/*`)
- `/institute/dashboard`: High-level department analytics displaying skill distribution across cohorts, placement eligibility rates, and top demanded industry skills.
- `/institute/skill-gaps`: Aggregated Privacy-Preserving Skill-Gap alerts (e.g., `91 students missing Machine Learning`).
- `/institute/training/create`: Training program creation wizard triggered directly from an alert card, pre-filling target skill and invited cohort.
- `/institute/reports/employer-feedback`: Anonymized employer feedback reports showing industry satisfaction trends across departments.

### 6.4 Admin Portal (`/admin/*`)
- `/admin/dashboard`: Platform telemetry (user counts, active opportunities, match calculations, system health).
- `/admin/ontology`: Full CRUD interface for the Canonical Skill Ontology and Alias Dictionary.
- `/admin/companies`: Company verification queue to review employer registration documents and issue verified badges.
- `/admin/audit-logs`: Chronological immutable audit trail of system events.

---

## 7. Evidence System & Employer Feedback Loop

### 7.1 5-Tier Skill Evidence Hierarchy

| Level | Badge Name | Verification Method | Weight Factor | Upgrade Criteria |
|---|---|---|---|---|
| **Level 1** | Self-Declared | Student self-reported upon profile onboarding | $1.0\times$ | Initial registration |
| **Level 2** | Certificate Verified | Uploaded credential URL / PDF verified via automated issuer check or faculty approval | $1.2\times$ | Course completion certificate / badge |
| **Level 3** | Assessment Verified | Platform proctored skill test or standardized test score ($\ge 70\%$) | $1.4\times$ | Verified assessment score |
| **Level 4** | Project Verified | Public repository (GitHub/GitLab) with verified commit history or live project URL | $1.6\times$ | Code repository / capstone review |
| **Level 5** | Industry Verified | Direct endorsement and evaluation by verified employer post-internship | $2.0\times$ | Recruiter post-internship evaluation |

### 7.2 Post-Internship Employer Feedback Loop Workflow

```
[Internship Completed]
          │
          ▼
[Recruiter Submits Performance Evaluation]
   - Ratings (1-5) across technical competencies
   - Direct endorsement of exercised skills
   - Qualitative review
          │
          ▼
[Feedback Engine Processes Submission]
   - Updates student skill confidence score (+20% boost)
   - Elevates endorsed skills to Level 5 (Industry Verified)
   - Generates verified digital credential on student profile
          │
          ▼
[Institute Feedback Aggregator Updated]
   - Anonymized ratings aggregated into departmental curriculum reports
```

---

## 8. Data Model & Architecture Specification

### 8.1 Primary Entity Relationship Schema

```
+-----------------------------------------------------------------------------------+
|                                 DATA MODEL SCHEMAS                                |
+-----------------------------------------------------------------------------------+

[User]
- id: string (UUID / CUID)
- email: string (unique)
- name: string
- role: enum ("STUDENT", "RECRUITER", "FACULTY", "ADMIN")
- avatarUrl: string
- createdAt: DateTime

[StudentProfile]
- id: string
- userId: string (FK -> User.id)
- rollNumber: string
- instituteId: string (FK -> Institute.id)
- departmentId: string (FK -> Department.id)
- batchYear: integer
- gpa: float
- bio: string
- skills: StudentSkill[]

[StudentSkill]
- id: string
- studentId: string (FK -> StudentProfile.id)
- skillId: string (FK -> Skill.id)
- proficiency: integer (1-4)
- evidenceLevel: integer (1-5)
- evidenceUrl: string
- isIndustryVerified: boolean
- verifiedByCompanyId: string (nullable)

[Company]
- id: string
- name: string
- website: string
- logoUrl: string
- isVerified: boolean
- industry: string
- recruiters: User[]

[Opportunity]
- id: string
- companyId: string (FK -> Company.id)
- title: string
- description: string
- roleType: enum ("INTERNSHIP", "FULL_TIME", "APPRENTICESHIP")
- location: string
- stipend: string
- status: enum ("DRAFT", "ACTIVE", "CLOSED")
- skills: OpportunitySkill[]
- createdAt: DateTime

[OpportunitySkill]
- id: string
- opportunityId: string (FK -> Opportunity.id)
- skillId: string (FK -> Skill.id)
- priority: enum ("HIGH", "LOW")
- requiredProficiency: integer (1-4)

[Application]
- id: string
- opportunityId: string (FK -> Opportunity.id)
- studentId: string (FK -> StudentProfile.id)
- matchScoreAtSubmission: float
- eligibilityStatus: enum ("FULL MATCH", "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH")
- status: enum ("APPLIED", "UNDER_REVIEW", "SHORTLISTED", "OFFERED", "REJECTED")
- submittedAt: DateTime

[Notification]
- id: string
- recipientId: string (FK -> User.id)
- type: enum ("PARTIAL_MATCH_OPPORTUNITY", "APPLICATION_UPDATE", "SKILL_VERIFIED")
- title: string
- message: string
- metadata: JSON
- read: boolean
- createdAt: DateTime

[InstituteSkillGapAlert]
- id: string
- departmentId: string
- skillId: string
- affectedCohortCount: integer
- opportunityCount: integer
- severity: enum ("LOW", "MEDIUM", "HIGH")
- createdAt: DateTime

[TrainingProgram]
- id: string
- departmentId: string
- targetSkillId: string
- title: string
- instructorName: string
- startDate: DateTime
- endDate: DateTime
- status: enum ("SCHEDULED", "IN_PROGRESS", "COMPLETED")
```

---

### 8.2 Primary Benchmark Scenario Seed Specification (Data Analyst Internship)

The seeding engine must populate the primary reference benchmark:
- **Company**: `Apex Analytics Corp` (Verified)
- **Opportunity**: `Data Analyst Internship` (`opp_data_analyst_01`)
- **High-Priority Skills (Mandatory, 100% Required)**:
  1. `Python` (Required Proficiency: Level 2 - Intermediate)
  2. `SQL` (Required Proficiency: Level 2 - Intermediate)
  3. `PostgreSQL` (Required Proficiency: Level 2 - Intermediate)
  4. `Data Analysis` (Required Proficiency: Level 2 - Intermediate)
- **Low-Priority Skills (Preferred, Partial Match Allowed)**:
  1. `Tableau` (Required Proficiency: Level 1 - Beginner)
  2. `Advanced Excel` (Required Proficiency: Level 2 - Intermediate)
  3. `Machine Learning` (Required Proficiency: Level 2 - Intermediate)
  4. `Power BI` (Required Proficiency: Level 2 - Intermediate)
- **Seed Cohort Distribution (50+ Students)**:
  - **Cohort A (Full Match)**: ~10 students having all 4 High skills and all 4 Low skills $\to$ Status `FULL MATCH`.
  - **Cohort B (Eligible Partial Match - Primary Demo Persona)**: ~25 students having all 4 High skills and 2 of 4 Low skills (missing ML and Power BI) $\to$ Status `ELIGIBLE - PARTIAL PREFERRED SKILL MATCH` (Triggers student notification & institute alert for ML).
  - **Cohort C (Ineligible - Mandatory Skill Gap)**: ~15 students missing Python or SQL or possessing Level 1 Beginner in Python $\to$ Status `NOT ELIGIBLE - MANDATORY SKILL GAP`.

---

## 9. Programmatic Verification Suite & Test Matrix

The platform specification includes a comprehensive verification suite to ensure all algorithmic rules and edge cases are validated programmatically.

### 9.1 Test Matrix for Matching Engine Rules

| Test ID | Test Scenario Description | Input Data | Expected Output | Assertion Check |
|---|---|---|---|---|
| `TC-MATCH-01` | Candidate with 100% High and 100% Low skills | Student has Python(2), SQL(2), Postgres(2), Data Analysis(2), Tableau(1), Excel(2), ML(2), PowerBI(2) | `isEligible: true`, `status: "FULL MATCH"`, `compositeScore: 100` | Exact status match, score = 100 |
| `TC-MATCH-02` | Candidate with 100% High and 50% Low skills | Student has Python(3), SQL(2), Postgres(2), Data Analysis(3), Tableau(2), Excel(2) (Missing ML, PowerBI) | `isEligible: true`, `status: "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH"`, `high: 100%`, `low: 50%` | Exact status match, missingLow contains ML and PowerBI |
| `TC-MATCH-03` | Candidate missing 1 High skill, has 100% Low skills | Student has SQL(3), Postgres(3), Data Analysis(3), Tableau(2), Excel(2), ML(2), PowerBI(2) (Missing Python) | `isEligible: false`, `status: "NOT ELIGIBLE - MANDATORY SKILL GAP"`, `high: 75%` | `isEligible == false`, missingHigh contains Python |
| `TC-MATCH-04` | Candidate has High skill but deficient proficiency | Student has Python(1 - Beginner) while Required is Python(2 - Intermediate) | `isEligible: false`, `status: "NOT ELIGIBLE - MANDATORY SKILL GAP"`, `reason: "PROFICIENCY_DEFICIENT"` | `isEligible == false`, reason strictly PROFICIENCY_DEFICIENT |
| `TC-MATCH-05` | Candidate has higher proficiency than required | Student has Python(4 - Expert), Required is Python(2) | `high: 100%`, `isEligible: true` | Matched with studentProficiency = 4 |
| `TC-MATCH-06` | Opportunity has 0 High-Priority skills | Opportunity has only Low-Priority skills: React(2), Node.js(2) | `isEligible: true`, `highPriorityMatchRatio: 1.0` | Defaults to eligible without dividing by zero |
| `TC-MATCH-07` | Opportunity has 0 Low-Priority skills | Opportunity has only High-Priority skills: Python(2), SQL(2) | Candidate with both has `status: "FULL MATCH"`, `lowPriorityMatchRatio: 1.0` | Defaults low to 1.0 |
| `TC-MATCH-08` | Alias Normalization check | Student has `"ReactJS"` and `"Postgres"`, Opportunity requires `"React"` and `"PostgreSQL"` | Normalizes to canonical IDs and reports 100% match | Matched canonical IDs match |
| `TC-MATCH-09` | Case-insensitive and whitespace normalization | Student has `"  python3  "`, Opportunity requires `"Python"` | Resolves to `skill_python` and matches | Normalizer resolves canonical ID |
| `TC-MATCH-10` | Duplicate alias de-duplication | Student inputs `"React"` (Level 2) and `"ReactJS"` (Level 3) | De-duplicates to `skill_react` with proficiency Level 3 | Exactly 1 skill retained with highest level |

---

### 9.2 Test Matrix for Alerts, Notifications & Privacy

| Test ID | Test Scenario Description | Input Data | Expected Output | Assertion Check |
|---|---|---|---|---|
| `TC-NOTIF-01` | Partial match student notification generation | Student with 100% High, 50% Low for Opportunity #1 | Notification entity created with type `PARTIAL_MATCH_OPPORTUNITY` | Contains missing skills array `['Machine Learning', 'Power BI']` |
| `TC-NOTIF-02` | Notification deduplication | Opportunity updated without changing required skills | No duplicate notification generated for student | Total notification count remains 1 |
| `TC-ALERT-01` | Institute alert generation for large cohort | 91 eligible students in CSE department missing Machine Learning | Alert entity generated with `affectedCohortCount: 91`, `severity: "HIGH"` | Alert present in Institute alert feed |
| `TC-ALERT-02` | Institute k-anonymity privacy protection ($k=5$) | 3 students in ECE department missing Quantum Computing | Alert suppressed (count < 5) | No alert generated in Institute feed |
| `TC-ALERT-03` | Institute Zero-PII verification | Generate 50 institute alerts | Inspect JSON output of `/api/institute/alerts` | Zero occurrences of student names, emails, roll numbers, or IDs |

---

### 9.3 Test Matrix for AI NLP JD Extractor

| Test ID | Test Scenario Description | Input Data | Expected Output | Assertion Check |
|---|---|---|---|---|
| `TC-NLP-01` | Clear High vs Low Priority extraction | Text: *"Must have Python and SQL. Knowledge of Tableau is a plus."* | Python $\to$ HIGH, SQL $\to$ HIGH, Tableau $\to$ LOW | Correct priority assignments and confidence $> 0.80$ |
| `TC-NLP-02` | Proficiency extraction from JD text | Text: *"Seeking Senior Python Architect with expert knowledge of Docker"* | Python $\to$ Level 4 (Expert), Docker $\to$ Level 3/4 | Proficiency inferred correctly |
| `TC-NLP-03` | Empty JD text edge case | Text: *""* or pure whitespace | Returns empty array with graceful message | `extractedSkills: []`, no server crash |
| `TC-NLP-04` | Recruiter custom edit override | NLP suggests ML as LOW, recruiter edits to HIGH | System persists recruiter's manual override | Opportunity saved with ML as HIGH |

---

### 9.4 Test Matrix for End-to-End User Journeys

| Test ID | Role | Journey Description | Steps & Expected Behavior |
|---|---|---|---|
| `E2E-STU-01` | Student | Eligible Partial Match Application Flow | 1. Student logs in $\to$ navigates to `/student/opportunities` $\to$ views Data Analyst card tagged `ELIGIBLE (PARTIAL)`.<br>2. Clicks card $\to$ views Match Card (4/4 High, 2/4 Low).<br>3. Views missing ML and Power BI tags.<br>4. Clicks active `Apply Now` button $\to$ submits application $\to$ status updates to `APPLIED`. |
| `E2E-STU-02` | Student | Ineligible Candidate Disabled Flow | 1. Ineligible student (missing SQL) navigates to `/student/opportunities/opp_data_analyst_01`.<br>2. Match card shows `0/4 High` in red.<br>3. `Apply Now` button is disabled with explanatory tooltip.<br>4. Attempting to POST to `/api/applications` returns HTTP 403 Forbidden with missing mandatory list. |
| `E2E-REC-01` | Recruiter | Opportunity Creation with AI Extraction | 1. Recruiter goes to `/recruiter/jobs/create`.<br>2. Pastes raw JD $\to$ clicks "Extract Skills with AI".<br>3. UI populates 4 High and 4 Low skills.<br>4. Recruiter reviews and publishes opportunity $\to$ Opportunity saved and indexed for matching. |
| `E2E-REC-02` | Recruiter | Candidate Comparison Matrix | 1. Recruiter navigates to applicants list for Data Analyst role.<br>2. Selects 3 candidates $\to$ clicks "Compare Candidates".<br>3. Side-by-side comparison matrix renders skill proficiencies, evidence levels, and GPA accurately. |
| `E2E-REC-03` | Recruiter | Post-Internship Evaluation & Evidence Upgrade | 1. Recruiter completes evaluation for Intern #014.<br>2. Endorses Python and SQL as verified.<br>3. Student #014 profile instantly reflects Level 5 Industry Verified badge on Python and SQL. |
| `E2E-INS-01` | Institute | Skill Gap to Training Program Dispatch | 1. Faculty logs into `/institute/dashboard`.<br>2. Sees alert: *91 CSE students missing Machine Learning*.<br>3. Clicks "Create Training Program" $\to$ modal pre-fills with target skill.<br>4. Faculty assigns instructor and schedules program $\to$ Training Program created. |
| `E2E-ADM-01` | Admin | Ontology Management & Verification | 1. Admin logs into `/admin/ontology`.<br>2. Adds alias `"FastAPI"` to `"Python"`.<br>3. Verifies newly submitted company $\to$ company status becomes `VERIFIED`. |

---

## 10. Summary & Sign-off

This specification provides the exhaustive technical blueprint for the SIH 2026 platform. All requirements (R1–R5), priority-aware matching formulas, normalization rules, notification/alert engines, AI NLP heuristics, and verification suites are formalized for immediate implementation.
