# Technical Specification: Next.js Configuration, Verification Endpoints & Matching Engine Test Script

**Author**: M1 Explorer 3 (`m1_explorer_3`)  
**Scope**: Milestone 1 (Project Base Setup & Verification Endpoints)  
**Target Codebase**: Pure JavaScript Next.js App Router (`.js`, `.jsx`), Tailwind CSS, Node.js CLI Runner  
**Working Directory**: `e:\sih_2026_044\.agents\m1_explorer_3`  
**Date**: 2026-08-22  

---

## 1. Executive Summary

This specification establishes the exact, production-ready implementation requirements for:
1. **Next.js Package Configuration & Environment**: Pure JavaScript configuration (`package.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `app/globals.css`) with zero TypeScript overhead, modern Dark Slate aesthetic tokens inspired by Stripe/Linear, and essential libraries (`next`, `react`, `react-dom`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`).
2. **Evaluation API Endpoint (`app/api/match/route.js`)**: A versatile `POST` endpoint accepting both entity IDs (`studentId`, `opportunityId`) with database lookup and inline object payloads (`student`, `opportunity`), executing the Priority-Aware Matching Engine (`lib/engine.js`) and returning explainable match breakdowns.
3. **Verification API Endpoint (`app/api/test-matching/route.js`)**: A fast `GET` endpoint executing 11+ automated test assertions covering the 4 anchor personas, normalization edge cases, and boundary conditions, returning structured test telemetry JSON.
4. **Standalone Verification Script (`scripts/test-matching-rules.js`)**: A standalone Node.js CLI test runner with rich ANSI color formatting, detailed gap breakdowns, and deterministic exit code semantics (`0` for success, `1` for failures) runnable via `npm run test:matching`.

---

## 2. Next.js Package Configuration & Environment Setup

### 2.1 Dependency Blueprint (`package.json`)

The platform strictly uses pure JavaScript (`.js`, `.jsx`). No TypeScript dependencies or build steps are included.

```json
{
  "name": "sih-2026-skill-mapping-platform",
  "version": "1.0.0",
  "private": true,
  "description": "SIH 2026 Industry Collaboration Platform for Skill Mapping, Internships and Placement with Priority-Aware Skill Matching Engine",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "node scripts/seed.js",
    "test:matching": "node scripts/test-matching-rules.js",
    "test:e2e": "node scripts/run-e2e-tests.js"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.428.0",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10"
  }
}
```

### 2.2 Next.js Runtime Configuration (`next.config.js`)

Pure CommonJS configuration compatible with Next.js 14+ App Router:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
```

### 2.3 PostCSS Configuration (`postcss.config.js`)

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 2.4 Tailwind CSS Configuration (`tailwind.config.js`)

The styling configuration implements the Stripe/Linear dark slate aesthetic with semantic tokens for eligibility statuses, priority levels, and evidence badges.

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Obsidian / Slate background palette
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        // Semantic Match & Status Palette
        match: {
          full: '#10b981',       // Emerald - FULL MATCH
          partial: '#f59e0b',    // Amber - ELIGIBLE - PARTIAL PREFERRED
          ineligible: '#ef4444', // Red - NOT ELIGIBLE - MANDATORY SKILL GAP
          high: '#6366f1',       // Indigo - High Priority (Mandatory)
          low: '#8b5cf6',        // Violet - Low Priority (Preferred)
        },
        evidence: {
          level1: '#94a3b8', // Gray - Self-declared
          level2: '#38bdf8', // Sky - Certificate
          level3: '#818cf8', // Indigo - Assessment
          level4: '#a855f7', // Purple - Project
          level5: '#eab308', // Gold - Industry Verified
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'monospace',
        ],
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
        'glow-rose': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
        'glow-indigo': '0 0 20px -5px rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [],
};
```

### 2.5 Global Stylesheet (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #090d16;
}

::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* Animation utilities for match score meters and verification badges */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 3s ease-in-out infinite;
}
```

---

## 3. Evaluation API Endpoint: `app/api/match/route.js`

### 3.1 Endpoint Specification

- **Path**: `/api/match`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Purpose**: Evaluates candidate eligibility and skill alignment against a job opportunity using `evaluateMatch` from `lib/engine.js`.
- **Supported Payload Contracts**:

#### Contract 1: ID-Based Evaluation (Persistent DB Mode)
```json
{
  "studentId": "std_001",
  "opportunityId": "opp_001"
}
```

#### Contract 2: Inline Object Evaluation (Direct / Simulator Mode)
```json
{
  "student": {
    "id": "sim_001",
    "name": "Alex Test",
    "skills": [
      { "name": "Python", "proficiency": 3, "evidenceLevel": 4 },
      { "name": "SQL", "proficiency": 2, "evidenceLevel": 3 },
      { "name": "Data Analysis", "proficiency": 2, "evidenceLevel": 3 },
      { "name": "Excel", "proficiency": 2, "evidenceLevel": 2 },
      { "name": "Tableau", "proficiency": 2, "evidenceLevel": 2 }
    ]
  },
  "opportunity": {
    "id": "opp_sim_01",
    "title": "Data Analyst Intern",
    "skills": [
      { "name": "Python", "priority": "HIGH", "requiredProficiency": 2 },
      { "name": "SQL", "priority": "HIGH", "requiredProficiency": 2 },
      { "name": "Data Analysis", "priority": "HIGH", "requiredProficiency": 2 },
      { "name": "Excel", "priority": "HIGH", "requiredProficiency": 2 },
      { "name": "Machine Learning", "priority": "LOW", "requiredProficiency": 2 }
    ]
  }
}
```

### 3.2 Response Payload Format (HTTP 200 OK)

```json
{
  "success": true,
  "timestamp": "2026-08-22T14:35:00.000Z",
  "student": {
    "id": "std_001",
    "name": "Aarav Sharma",
    "department": "Computer Science & Engineering"
  },
  "opportunity": {
    "id": "opp_001",
    "title": "Data Analyst Internship",
    "company": "Apex Analytics Corp"
  },
  "match": {
    "isEligible": true,
    "status": "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH",
    "scores": {
      "compositeScore": 92.5,
      "highPriorityMatchPct": 100,
      "lowPriorityMatchPct": 75
    },
    "highPriorityAnalysis": {
      "totalRequired": 4,
      "matchedCount": 4,
      "isFullySatisfied": true,
      "matchedSkills": [
        { "canonicalName": "Python", "requiredProficiency": 2, "studentProficiency": 3, "evidenceLevel": 4 },
        { "canonicalName": "SQL", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 3 },
        { "canonicalName": "Data Analysis", "requiredProficiency": 2, "studentProficiency": 3, "evidenceLevel": 4 },
        { "canonicalName": "Excel", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 2 }
      ],
      "gaps": []
    },
    "lowPriorityAnalysis": {
      "totalPreferred": 4,
      "matchedCount": 3,
      "matchedSkills": [
        { "canonicalName": "Tableau", "requiredProficiency": 1, "studentProficiency": 2, "evidenceLevel": 3 },
        { "canonicalName": "Power BI", "requiredProficiency": 1, "studentProficiency": 2, "evidenceLevel": 2 },
        { "canonicalName": "Statistics", "requiredProficiency": 2, "studentProficiency": 2, "evidenceLevel": 3 }
      ],
      "gaps": [
        { "canonicalName": "Machine Learning", "requiredProficiency": 2, "studentProficiency": 0, "reason": "MISSING_SKILL" }
      ]
    },
    "recommendations": {
      "eligibleToApply": true,
      "mandatoryGapsToFix": [],
      "preferredUpskilling": ["Machine Learning"]
    }
  }
}
```

### 3.3 Error Responses

| Status Code | Reason | Example Response Body |
|---|---|---|
| `400 Bad Request` | Missing or invalid request body | `{"success": false, "error": "Invalid request payload. Provide studentId/opportunityId or student/opportunity objects."}` |
| `404 Not Found` | Entity not found in database | `{"success": false, "error": "Student 'std_999' not found in database."}` |
| `500 Internal Error` | Unexpected server evaluation error | `{"success": false, "error": "Matching engine failed: <details>"}` |

### 3.4 Implementation Blueprint (`app/api/match/route.js`)

```javascript
import { NextResponse } from 'next/server';
import { evaluateMatch } from '@/lib/engine';
import { getStudentById, getOpportunityById } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    let student = body.student || null;
    let opportunity = body.opportunity || null;

    // Resolve student if studentId is provided
    if (!student && body.studentId) {
      student = await getStudentById(body.studentId);
      if (!student) {
        return NextResponse.json(
          { success: false, error: `Student '${body.studentId}' not found.` },
          { status: 404 }
        );
      }
    }

    // Resolve opportunity if opportunityId is provided
    if (!opportunity && body.opportunityId) {
      opportunity = await getOpportunityById(body.opportunityId);
      if (!opportunity) {
        return NextResponse.json(
          { success: false, error: `Opportunity '${body.opportunityId}' not found.` },
          { status: 404 }
        );
      }
    }

    if (!student || !opportunity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both student and opportunity must be provided via objects or valid IDs.',
        },
        { status: 400 }
      );
    }

    // Run priority-aware matching engine
    const matchResult = evaluateMatch(student, opportunity);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      student: {
        id: student.id || 'custom',
        name: student.name || 'Anonymous Candidate',
        department: student.department || 'N/A',
      },
      opportunity: {
        id: opportunity.id || 'custom',
        title: opportunity.title || 'Custom Role',
        company: opportunity.companyName || opportunity.company || 'N/A',
      },
      match: matchResult,
    });
  } catch (error) {
    console.error('Error in /api/match:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal evaluation error' },
      { status: 500 }
    );
  }
}
```

---

## 4. Verification API Endpoint: `app/api/test-matching/route.js`

### 4.1 Endpoint Specification

- **Path**: `/api/test-matching`
- **Method**: `GET`
- **Query Parameters**:
  - `verbose` (boolean, optional, default `false`): Include input fixtures and full evaluation dumps.
  - `suite` (string, optional: `all`, `anchor`, `normalization`, `edge_cases`, default `all`): Filter specific test suites.
- **Purpose**: Runs a suite of programmatic assertions against `lib/engine.js` and `lib/normalization.js` validating the 4 anchor personas, proficiency gates, alias mappings, and edge cases.
- **HTTP Status Codes**:
  - `200 OK`: Test suite executed (contains `summary.passed` and `summary.failed` counts; returns 200 even if assertions fail so caller can inspect structured failure reports).

### 4.2 Test Suite Matrix Executed by `/api/test-matching`

| Test ID | Suite | Scenario Description | Expected Outcome |
|---|---|---|---|
| `TC-ANC-01` | Anchor | **std_001 (Aarav)** vs opp_001 (Data Analyst) | `isEligible: true`, `status: "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH"`, `highPct: 100`, `lowPct: 75`, `compositeScore: 92.5`, missing preferred contains `Machine Learning` |
| `TC-ANC-02` | Anchor | **std_002 (Priya)** vs opp_001 (Data Analyst) | `isEligible: true`, `status: "FULL MATCH"`, `highPct: 100`, `lowPct: 100`, `compositeScore: 100`, zero gaps |
| `TC-ANC-03` | Anchor | **std_003 (Rohan)** vs opp_001 (Missing SQL) | `isEligible: false`, `status: "NOT ELIGIBLE - MANDATORY SKILL GAP"`, high gaps contains `SQL` (`MISSING_SKILL`), `eligibleToApply: false` |
| `TC-ANC-04` | Anchor | **std_004 (Ananya)** vs opp_001 (Python Beg < Int) | `isEligible: false`, `status: "NOT ELIGIBLE - MANDATORY SKILL GAP"`, high gaps contains `Python` (`INSUFFICIENT_PROFICIENCY`), `eligibleToApply: false` |
| `TC-NRM-01` | Normalization | Framework alias resolution (`ReactJS`, `react.js`, `REACT` -> `React`) | Normalizes to `React` |
| `TC-NRM-02` | Normalization | Database alias resolution (`postgres`, `psql`, `Postgres DB` -> `PostgreSQL`) | Normalizes to `PostgreSQL` |
| `TC-NRM-03` | Normalization | Whitespace & casing trimming (`"   pYtHoN 3  "` -> `Python`) | Normalizes to `Python` |
| `TC-EDG-01` | Edge Cases | Empty student skills pool vs opportunity with mandatory skills | `isEligible: false`, `highPct: 0`, all mandatory skills in gaps |
| `TC-EDG-02` | Edge Cases | Opportunity with 0 High-Priority skills | `isEligible: true`, `highPriorityMatchPct: 100`, no divide-by-zero |
| `TC-EDG-03` | Edge Cases | Opportunity with 0 Low-Priority skills | Candidate satisfying all High skills receives `FULL MATCH` and `compositeScore: 100` |
| `TC-EDG-04` | Edge Cases | Student proficiency higher than required (e.g. Expert 4 vs Intermediate 2) | High match satisfied, `studentProficiency: 4` reported |
| `TC-EDG-05` | Edge Cases | Low priority sub-proficiency (Student Beg 1 vs Required Int 2) | Low gap emitted with `reason: "INSUFFICIENT_PROFICIENCY"` |

### 4.3 Response Payload Schema (`/api/test-matching`)

```json
{
  "success": true,
  "timestamp": "2026-08-22T14:35:00.000Z",
  "summary": {
    "total": 12,
    "passed": 12,
    "failed": 0,
    "passRate": 100,
    "durationMs": 9
  },
  "suites": [
    {
      "name": "Anchor Personas Verification",
      "total": 4,
      "passed": 4,
      "failed": 0,
      "tests": [
        {
          "id": "TC-ANC-01",
          "name": "Aarav Sharma (std_001) - 100% High, 75% Low",
          "passed": true,
          "expected": { "isEligible": true, "status": "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH", "highPct": 100, "lowPct": 75 },
          "actual": { "isEligible": true, "status": "ELIGIBLE - PARTIAL PREFERRED SKILL MATCH", "highPct": 100, "lowPct": 75 }
        }
      ]
    }
  ]
}
```

### 4.4 Implementation Blueprint (`app/api/test-matching/route.js`)

```javascript
import { NextResponse } from 'next/server';
import { evaluateMatch } from '@/lib/engine';
import { normalizeSkill } from '@/lib/normalization';

// Standardized benchmark opportunity fixture
const BENCHMARK_OPPORTUNITY = {
  id: 'opp_001',
  title: 'Data Analyst Internship',
  companyName: 'Apex Analytics Corp',
  skills: [
    { name: 'Python', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'SQL', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Data Analysis', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Excel', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Tableau', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Power BI', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Machine Learning', priority: 'LOW', requiredProficiency: 2 },
    { name: 'Statistics', priority: 'LOW', requiredProficiency: 2 },
  ],
};

// 4 Anchor Student Personas
const ANCHOR_STUDENTS = {
  std_001: {
    id: 'std_001',
    name: 'Aarav Sharma',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 2, evidenceLevel: 3 },
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 4 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 3 },
      // Missing Machine Learning
    ],
  },
  std_002: {
    id: 'std_002',
    name: 'Priya Patel',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 3, evidenceLevel: 4 },
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 4 },
      { name: 'Excel', proficiency: 3, evidenceLevel: 3 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 3 },
      { name: 'Statistics', proficiency: 3, evidenceLevel: 4 },
      { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
    ],
  },
  std_003: {
    id: 'std_003',
    name: 'Rohan Verma',
    skills: [
      { name: 'Python', proficiency: 2, evidenceLevel: 3 },
      // Missing SQL (Mandatory)
      { name: 'Data Analysis', proficiency: 2, evidenceLevel: 3 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
      { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
    ],
  },
  std_004: {
    id: 'std_004',
    name: 'Ananya Sen',
    skills: [
      { name: 'Python', proficiency: 1, evidenceLevel: 1 }, // Deficient (1 < 2)
      { name: 'SQL', proficiency: 2, evidenceLevel: 2 },
      { name: 'Data Analysis', proficiency: 2, evidenceLevel: 3 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 1, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
    ],
  },
};

export async function GET(request) {
  const startTime = Date.now();
  const results = [];

  const addTest = (suite, id, name, passed, expected, actual, error = null) => {
    results.push({ suite, id, name, passed, expected, actual, error });
  };

  // --- SUITE 1: ANCHOR PERSONAS ---
  try {
    // TC-ANC-01: Aarav
    const resAarav = evaluateMatch(ANCHOR_STUDENTS.std_001, BENCHMARK_OPPORTUNITY);
    const passAarav =
      resAarav.isEligible === true &&
      resAarav.status === 'ELIGIBLE - PARTIAL PREFERRED SKILL MATCH' &&
      resAarav.scores.highPriorityMatchPct === 100 &&
      resAarav.scores.lowPriorityMatchPct === 75 &&
      resAarav.lowPriorityAnalysis.gaps.some((g) => g.canonicalName === 'Machine Learning');
    addTest(
      'Anchor Personas',
      'TC-ANC-01',
      'std_001 (Aarav) - 100% High, 75% Low -> ELIGIBLE - PARTIAL PREFERRED',
      passAarav,
      { isEligible: true, status: 'ELIGIBLE - PARTIAL PREFERRED SKILL MATCH', highPct: 100, lowPct: 75 },
      { isEligible: resAarav.isEligible, status: resAarav.status, highPct: resAarav.scores.highPriorityMatchPct, lowPct: resAarav.scores.lowPriorityMatchPct }
    );

    // TC-ANC-02: Priya
    const resPriya = evaluateMatch(ANCHOR_STUDENTS.std_002, BENCHMARK_OPPORTUNITY);
    const passPriya =
      resPriya.isEligible === true &&
      resPriya.status === 'FULL MATCH' &&
      resPriya.scores.highPriorityMatchPct === 100 &&
      resPriya.scores.lowPriorityMatchPct === 100 &&
      resPriya.scores.compositeScore === 100;
    addTest(
      'Anchor Personas',
      'TC-ANC-02',
      'std_002 (Priya) - 100% High, 100% Low -> FULL MATCH',
      passPriya,
      { isEligible: true, status: 'FULL MATCH', highPct: 100, lowPct: 100, compositeScore: 100 },
      { isEligible: resPriya.isEligible, status: resPriya.status, highPct: resPriya.scores.highPriorityMatchPct, lowPct: resPriya.scores.lowPriorityMatchPct, compositeScore: resPriya.scores.compositeScore }
    );

    // TC-ANC-03: Rohan
    const resRohan = evaluateMatch(ANCHOR_STUDENTS.std_003, BENCHMARK_OPPORTUNITY);
    const passRohan =
      resRohan.isEligible === false &&
      resRohan.status === 'NOT ELIGIBLE - MANDATORY SKILL GAP' &&
      resRohan.recommendations.eligibleToApply === false &&
      resRohan.highPriorityAnalysis.gaps.some((g) => g.canonicalName === 'SQL' && g.reason === 'MISSING_SKILL');
    addTest(
      'Anchor Personas',
      'TC-ANC-03',
      'std_003 (Rohan) - Missing Mandatory SQL -> NOT ELIGIBLE',
      passRohan,
      { isEligible: false, status: 'NOT ELIGIBLE - MANDATORY SKILL GAP', missingHigh: 'SQL' },
      { isEligible: resRohan.isEligible, status: resRohan.status, gaps: resRohan.highPriorityAnalysis.gaps }
    );

    // TC-ANC-04: Ananya
    const resAnanya = evaluateMatch(ANCHOR_STUDENTS.std_004, BENCHMARK_OPPORTUNITY);
    const passAnanya =
      resAnanya.isEligible === false &&
      resAnanya.status === 'NOT ELIGIBLE - MANDATORY SKILL GAP' &&
      resAnanya.highPriorityAnalysis.gaps.some((g) => g.canonicalName === 'Python' && g.reason === 'INSUFFICIENT_PROFICIENCY');
    addTest(
      'Anchor Personas',
      'TC-ANC-04',
      'std_004 (Ananya) - Python Proficient (1 < 2) -> NOT ELIGIBLE',
      passAnanya,
      { isEligible: false, status: 'NOT ELIGIBLE - MANDATORY SKILL GAP', reason: 'INSUFFICIENT_PROFICIENCY' },
      { isEligible: resAnanya.isEligible, status: resAnanya.status, gaps: resAnanya.highPriorityAnalysis.gaps }
    );
  } catch (err) {
    addTest('Anchor Personas', 'TC-ANC-ERR', 'Execution of Anchor Suite', false, {}, {}, err.message);
  }

  // --- SUITE 2: NORMALIZATION & ALIAS MAPPINGS ---
  try {
    const normReact = normalizeSkill('ReactJS');
    const normReactDot = normalizeSkill('react.js');
    const normPostgres = normalizeSkill('Postgres');
    const normTrimCase = normalizeSkill('   pYtHoN 3   ');

    addTest(
      'Skill Normalization',
      'TC-NRM-01',
      "Alias 'ReactJS' and 'react.js' -> 'React'",
      normReact === 'React' && normReactDot === 'React',
      'React',
      { ReactJS: normReact, 'react.js': normReactDot }
    );

    addTest(
      'Skill Normalization',
      'TC-NRM-02',
      "Alias 'Postgres' -> 'PostgreSQL'",
      normPostgres === 'PostgreSQL',
      'PostgreSQL',
      normPostgres
    );

    addTest(
      'Skill Normalization',
      'TC-NRM-03',
      "Whitespace & Casing '   pYtHoN 3   ' -> 'Python'",
      normTrimCase === 'Python',
      'Python',
      normTrimCase
    );
  } catch (err) {
    addTest('Skill Normalization', 'TC-NRM-ERR', 'Execution of Normalization Suite', false, {}, {}, err.message);
  }

  // --- SUITE 3: BOUNDARY & EDGE CASES ---
  try {
    // Zero student skills
    const emptyStudent = { id: 'empty', name: 'Zero Skills', skills: [] };
    const resEmpty = evaluateMatch(emptyStudent, BENCHMARK_OPPORTUNITY);
    addTest(
      'Boundary & Edge Cases',
      'TC-EDG-01',
      'Empty student skills pool -> Ineligible with 0% match',
      resEmpty.isEligible === false && resEmpty.scores.highPriorityMatchPct === 0,
      { isEligible: false, highPct: 0 },
      { isEligible: resEmpty.isEligible, highPct: resEmpty.scores.highPriorityMatchPct }
    );

    // Zero High-Priority skills in opportunity
    const oppNoHigh = {
      id: 'opp_no_high',
      title: 'No Mandatory Role',
      skills: [{ name: 'React', priority: 'LOW', requiredProficiency: 2 }],
    };
    const stuReact = { id: 'stu_r', skills: [{ name: 'React', proficiency: 2 }] };
    const resNoHigh = evaluateMatch(stuReact, oppNoHigh);
    addTest(
      'Boundary & Edge Cases',
      'TC-EDG-02',
      'Opportunity with 0 High-Priority skills -> Eligible by default',
      resNoHigh.isEligible === true && resNoHigh.scores.highPriorityMatchPct === 100,
      { isEligible: true, highPct: 100 },
      { isEligible: resNoHigh.isEligible, highPct: resNoHigh.scores.highPriorityMatchPct }
    );

    // Zero Low-Priority skills in opportunity
    const oppNoLow = {
      id: 'opp_no_low',
      title: 'Only Mandatory Role',
      skills: [{ name: 'Python', priority: 'HIGH', requiredProficiency: 2 }],
    };
    const stuPython = { id: 'stu_p', skills: [{ name: 'Python', proficiency: 2 }] };
    const resNoLow = evaluateMatch(stuPython, oppNoLow);
    addTest(
      'Boundary & Edge Cases',
      'TC-EDG-03',
      'Opportunity with 0 Low-Priority skills -> FULL MATCH if High satisfied',
      resNoLow.isEligible === true && resNoLow.status === 'FULL MATCH' && resNoLow.scores.compositeScore === 100,
      { isEligible: true, status: 'FULL MATCH', compositeScore: 100 },
      { isEligible: resNoLow.isEligible, status: resNoLow.status, compositeScore: resNoLow.scores.compositeScore }
    );

    // Higher proficiency than required (Expert 4 vs Int 2)
    const stuExpert = { id: 'stu_exp', skills: [{ name: 'Python', proficiency: 4 }] };
    const resExpert = evaluateMatch(stuExpert, oppNoLow);
    addTest(
      'Boundary & Edge Cases',
      'TC-EDG-04',
      'Higher student proficiency (4 >= 2) satisfies requirement',
      resExpert.isEligible === true && resExpert.highPriorityAnalysis.matchedSkills[0]?.studentProficiency === 4,
      { isEligible: true, studentProficiency: 4 },
      { isEligible: resExpert.isEligible, matched: resExpert.highPriorityAnalysis.matchedSkills }
    );

    // Low priority sub-proficiency gap
    const oppLowReq = {
      id: 'opp_low_req',
      skills: [
        { name: 'Python', priority: 'HIGH', requiredProficiency: 2 },
        { name: 'Machine Learning', priority: 'LOW', requiredProficiency: 3 },
      ],
    };
    const stuLowSub = {
      id: 'stu_sub',
      skills: [
        { name: 'Python', proficiency: 2 },
        { name: 'Machine Learning', proficiency: 1 }, // 1 < 3
      ],
    };
    const resLowSub = evaluateMatch(stuLowSub, oppLowReq);
    addTest(
      'Boundary & Edge Cases',
      'TC-EDG-05',
      'Low Priority sub-proficiency (1 < 3) recorded as INSUFFICIENT_PROFICIENCY gap',
      resLowSub.isEligible === true &&
        resLowSub.lowPriorityAnalysis.gaps.some(
          (g) => g.canonicalName === 'Machine Learning' && g.reason === 'INSUFFICIENT_PROFICIENCY'
        ),
      { isEligible: true, gapReason: 'INSUFFICIENT_PROFICIENCY' },
      { isEligible: resLowSub.isEligible, gaps: resLowSub.lowPriorityAnalysis.gaps }
    );
  } catch (err) {
    addTest('Boundary & Edge Cases', 'TC-EDG-ERR', 'Execution of Edge Cases Suite', false, {}, {}, err.message);
  }

  const durationMs = Date.now() - startTime;
  const passedCount = results.filter((t) => t.passed).length;
  const failedCount = results.filter((t) => !t.passed).length;

  // Group by suite
  const suiteMap = {};
  for (const t of results) {
    if (!suiteMap[t.suite]) {
      suiteMap[t.suite] = { name: t.suite, total: 0, passed: 0, failed: 0, tests: [] };
    }
    suiteMap[t.suite].total += 1;
    if (t.passed) suiteMap[t.suite].passed += 1;
    else suiteMap[t.suite].failed += 1;
    suiteMap[t.suite].tests.push(t);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      passRate: results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0,
      durationMs,
    },
    suites: Object.values(suiteMap),
  });
}
```

---

## 5. Standalone Verification Script: `scripts/test-matching-rules.js`

### 5.1 CLI Requirements & Features

1. **Standalone Execution**: Can be run via `node scripts/test-matching-rules.js` without spinning up the Next.js dev server.
2. **Deterministic Exit Codes**:
   - `0` when all assertions pass.
   - `1` when one or more assertions fail.
3. **ANSI Colored Output**:
   - Green bold for `[PASS]`
   - Red bold for `[FAIL]`
   - Cyan/Indigo for Suite headers and test descriptions.
   - Yellow for warning notes and gap analyses.
4. **Comprehensive Test Suites**:
   - Suite 1: Anchor Students (`std_001` to `std_004`) on `opp_001`
   - Suite 2: Skill Normalization & Alias Mapping
   - Suite 3: Proficiency Gating & Threshold Boundary Rules
   - Suite 4: Empty / Asymmetric Skill Pools & Zero Divisions
   - Suite 5: Weighted Composite Score Math Verification

### 5.2 Implementation Blueprint (`scripts/test-matching-rules.js`)

```javascript
#!/usr/bin/env node

/**
 * Priority-Aware Matching Engine Verification Script
 * Validates core business rules, anchor personas, normalization, and edge cases.
 *
 * Usage:
 *   node scripts/test-matching-rules.js
 */

const path = require('path');
const fs = require('fs');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GRAY = '\x1b[90m';

// Safe module loader
let evaluateMatch, normalizeSkill;
try {
  const engineModule = require('../lib/engine');
  evaluateMatch = engineModule.evaluateMatch || engineModule.default;
  const normModule = require('../lib/normalization');
  normalizeSkill = normModule.normalizeSkill || normModule.default;
} catch (e) {
  console.error(`${RED}${BOLD}[ERROR] Could not load lib/engine.js or lib/normalization.js${RESET}`);
  console.error(e.message);
  process.exit(1);
}

// Test Runner State
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureLog = [];

function runTest(suiteName, testId, description, testFn) {
  totalTests += 1;
  try {
    const result = testFn();
    if (result === true || (result && result.passed === true)) {
      passedTests += 1;
      console.log(`  ${GREEN}✓ [PASS]${RESET} ${GRAY}${testId}:${RESET} ${description}`);
    } else {
      failedTests += 1;
      const reason = result && result.reason ? result.reason : 'Assertion returned falsy';
      console.log(`  ${RED}✗ [FAIL]${RESET} ${BOLD}${testId}:${RESET} ${description}`);
      console.log(`     ${RED}Reason: ${reason}${RESET}`);
      failureLog.push({ suiteName, testId, description, reason });
    }
  } catch (err) {
    failedTests += 1;
    console.log(`  ${RED}✗ [FAIL - EXCEPTION]${RESET} ${BOLD}${testId}:${RESET} ${description}`);
    console.log(`     ${RED}${err.stack || err.message}${RESET}`);
    failureLog.push({ suiteName, testId, description, reason: err.message });
  }
}

// ==========================================
// FIXTURES
// ==========================================

const DEMO_OPPORTUNITY = {
  id: 'opp_001',
  title: 'Data Analyst Internship',
  companyName: 'Apex Analytics Corp',
  skills: [
    { name: 'Python', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'SQL', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Data Analysis', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Excel', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Tableau', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Power BI', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Machine Learning', priority: 'LOW', requiredProficiency: 2 },
    { name: 'Statistics', priority: 'LOW', requiredProficiency: 2 },
  ],
};

const ANCHOR_STUDENTS = {
  std_001: {
    id: 'std_001',
    name: 'Aarav Sharma',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 2, evidenceLevel: 3 },
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 4 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 3 },
      // Missing Machine Learning
    ],
  },
  std_002: {
    id: 'std_002',
    name: 'Priya Patel',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 3, evidenceLevel: 4 },
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 4 },
      { name: 'Excel', proficiency: 3, evidenceLevel: 3 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 3 },
      { name: 'Statistics', proficiency: 3, evidenceLevel: 4 },
      { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
    ],
  },
  std_003: {
    id: 'std_003',
    name: 'Rohan Verma',
    skills: [
      { name: 'Python', proficiency: 2, evidenceLevel: 3 },
      // Missing Mandatory SQL
      { name: 'Data Analysis', proficiency: 2, evidenceLevel: 3 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 2, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
      { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
    ],
  },
  std_004: {
    id: 'std_004',
    name: 'Ananya Sen',
    skills: [
      { name: 'Python', proficiency: 1, evidenceLevel: 1 }, // Deficient (1 < 2)
      { name: 'SQL', proficiency: 2, evidenceLevel: 2 },
      { name: 'Data Analysis', proficiency: 2, evidenceLevel: 3 },
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 1, evidenceLevel: 2 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
    ],
  },
};

// ==========================================
// TEST EXECUTION
// ==========================================

console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
console.log(`${BOLD}${CYAN}  SIH 2026 MATCHING ENGINE RULE VERIFICATION SUITE   ${RESET}`);
console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

// ------------------------------------------
// SUITE 1: ANCHOR PERSONAS
// ------------------------------------------
console.log(`${BOLD}${MAGENTA}▶ SUITE 1: Primary Demo Anchor Personas (opp_001)${RESET}`);

runTest('Anchor Personas', 'TC-ANC-01', 'std_001 (Aarav): 100% High, 75% Low -> ELIGIBLE - PARTIAL PREFERRED', () => {
  const res = evaluateMatch(ANCHOR_STUDENTS.std_001, DEMO_OPPORTUNITY);
  if (!res.isEligible) return { passed: false, reason: 'Expected isEligible=true' };
  if (res.status !== 'ELIGIBLE - PARTIAL PREFERRED SKILL MATCH') {
    return { passed: false, reason: `Unexpected status: '${res.status}'` };
  }
  if (res.scores.highPriorityMatchPct !== 100) return { passed: false, reason: 'High match should be 100%' };
  if (res.scores.lowPriorityMatchPct !== 75) return { passed: false, reason: 'Low match should be 75%' };
  if (!res.recommendations.eligibleToApply) return { passed: false, reason: 'eligibleToApply must be true' };
  const mlGap = res.lowPriorityAnalysis.gaps.find((g) => g.canonicalName === 'Machine Learning');
  if (!mlGap) return { passed: false, reason: 'Missing Machine Learning should be in lowPriorityAnalysis gaps' };
  return true;
});

runTest('Anchor Personas', 'TC-ANC-02', 'std_002 (Priya): 100% High, 100% Low -> FULL MATCH (Score: 100)', () => {
  const res = evaluateMatch(ANCHOR_STUDENTS.std_002, DEMO_OPPORTUNITY);
  if (!res.isEligible) return { passed: false, reason: 'Expected isEligible=true' };
  if (res.status !== 'FULL MATCH') return { passed: false, reason: `Unexpected status: '${res.status}'` };
  if (res.scores.compositeScore !== 100) return { passed: false, reason: `Composite score expected 100, got ${res.scores.compositeScore}` };
  if (res.highPriorityAnalysis.gaps.length > 0 || res.lowPriorityAnalysis.gaps.length > 0) {
    return { passed: false, reason: 'Zero gaps expected for FULL MATCH candidate' };
  }
  return true;
});

runTest('Anchor Personas', 'TC-ANC-03', 'std_003 (Rohan): Missing Mandatory SQL -> NOT ELIGIBLE - MANDATORY SKILL GAP', () => {
  const res = evaluateMatch(ANCHOR_STUDENTS.std_003, DEMO_OPPORTUNITY);
  if (res.isEligible !== false) return { passed: false, reason: 'Expected isEligible=false' };
  if (res.status !== 'NOT ELIGIBLE - MANDATORY SKILL GAP') {
    return { passed: false, reason: `Unexpected status: '${res.status}'` };
  }
  if (res.recommendations.eligibleToApply !== false) return { passed: false, reason: 'eligibleToApply must be false' };
  const sqlGap = res.highPriorityAnalysis.gaps.find((g) => g.canonicalName === 'SQL');
  if (!sqlGap || sqlGap.reason !== 'MISSING_SKILL') {
    return { passed: false, reason: 'SQL missing gap not correctly identified' };
  }
  return true;
});

runTest('Anchor Personas', 'TC-ANC-04', 'std_004 (Ananya): Python Proficient 1 < 2 -> NOT ELIGIBLE (INSUFFICIENT_PROFICIENCY)', () => {
  const res = evaluateMatch(ANCHOR_STUDENTS.std_004, DEMO_OPPORTUNITY);
  if (res.isEligible !== false) return { passed: false, reason: 'Expected isEligible=false' };
  if (res.status !== 'NOT ELIGIBLE - MANDATORY SKILL GAP') {
    return { passed: false, reason: `Unexpected status: '${res.status}'` };
  }
  const pyGap = res.highPriorityAnalysis.gaps.find((g) => g.canonicalName === 'Python');
  if (!pyGap || pyGap.reason !== 'INSUFFICIENT_PROFICIENCY') {
    return { passed: false, reason: 'Python insufficient proficiency gap not correctly identified' };
  }
  return true;
});

// ------------------------------------------
// SUITE 2: NORMALIZATION & ALIAS MAPPINGS
// ------------------------------------------
console.log(`\n${BOLD}${MAGENTA}▶ SUITE 2: Normalization & Alias Mapping Layer${RESET}`);

runTest('Normalization', 'TC-NRM-01', "Resolves 'ReactJS', 'React.js', 'react' to canonical 'React'", () => {
  const c1 = normalizeSkill('ReactJS');
  const c2 = normalizeSkill('React.js');
  const c3 = normalizeSkill('react');
  if (c1 !== 'React' || c2 !== 'React' || c3 !== 'React') {
    return { passed: false, reason: `Failed mapping: ${c1}, ${c2}, ${c3}` };
  }
  return true;
});

runTest('Normalization', 'TC-NRM-02', "Resolves 'postgres', 'psql', 'PostgreSQL DB' to canonical 'PostgreSQL'", () => {
  const c1 = normalizeSkill('postgres');
  const c2 = normalizeSkill('psql');
  if (c1 !== 'PostgreSQL' || c2 !== 'PostgreSQL') {
    return { passed: false, reason: `Failed mapping: ${c1}, ${c2}` };
  }
  return true;
});

runTest('Normalization', 'TC-NRM-03', 'Trims whitespace and handles mixed case input', () => {
  const c1 = normalizeSkill('   PyThOn 3   ');
  const c2 = normalizeSkill('\tNode.JS\n');
  if (c1 !== 'Python' || c2 !== 'Node.js') {
    return { passed: false, reason: `Failed mapping: '${c1}', '${c2}'` };
  }
  return true;
});

// ------------------------------------------
// SUITE 3: PROFICIENCY & COMPOSITE SCORING
// ------------------------------------------
console.log(`\n${BOLD}${MAGENTA}▶ SUITE 3: Proficiency Gating & Composite Scoring Math${RESET}`);

runTest('Scoring', 'TC-SCR-01', 'Higher proficiency than required satisfies requirement (Expert 4 >= Int 2)', () => {
  const stu = { id: 's1', skills: [{ name: 'Python', proficiency: 4 }] };
  const opp = { id: 'o1', skills: [{ name: 'Python', priority: 'HIGH', requiredProficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (!res.isEligible) return { passed: false, reason: 'Expected isEligible=true' };
  if (res.highPriorityAnalysis.matchedSkills[0].studentProficiency !== 4) {
    return { passed: false, reason: 'Student proficiency level not preserved' };
  }
  return true;
});

runTest('Scoring', 'TC-SCR-02', 'Calculates weighted composite score: 70% High + 30% Low', () => {
  // Candidate: 100% High, 50% Low -> Composite = (1.0 * 70) + (0.5 * 30) = 70 + 15 = 85%
  const stu = {
    id: 's2',
    skills: [
      { name: 'Python', proficiency: 2 },
      { name: 'SQL', proficiency: 2 },
      { name: 'Tableau', proficiency: 2 }, // Matches 1 of 2 low
    ],
  };
  const opp = {
    id: 'o2',
    skills: [
      { name: 'Python', priority: 'HIGH', requiredProficiency: 2 },
      { name: 'SQL', priority: 'HIGH', requiredProficiency: 2 },
      { name: 'Tableau', priority: 'LOW', requiredProficiency: 2 },
      { name: 'Machine Learning', priority: 'LOW', requiredProficiency: 2 },
    ],
  };
  const res = evaluateMatch(stu, opp);
  if (!res.isEligible) return { passed: false, reason: 'Expected isEligible=true' };
  if (Math.round(res.scores.compositeScore) !== 85) {
    return { passed: false, reason: `Expected composite score 85, got ${res.scores.compositeScore}` };
  }
  return true;
});

// ------------------------------------------
// SUITE 4: BOUNDARY CONDITIONS & EDGE CASES
// ------------------------------------------
console.log(`\n${BOLD}${MAGENTA}▶ SUITE 4: Boundary Conditions & Edge Cases${RESET}`);

runTest('Boundary', 'TC-BND-01', 'Candidate with zero skills receives 0% match without throwing errors', () => {
  const stu = { id: 'zero', skills: [] };
  const opp = { id: 'o_req', skills: [{ name: 'Python', priority: 'HIGH', requiredProficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (res.isEligible !== false) return { passed: false, reason: 'Candidate with 0 skills must be ineligible' };
  if (res.scores.highPriorityMatchPct !== 0) return { passed: false, reason: 'High match % should be 0' };
  return true;
});

runTest('Boundary', 'TC-BND-02', 'Opportunity with 0 High-Priority skills defaults to eligible (no divide-by-zero)', () => {
  const stu = { id: 's3', skills: [{ name: 'React', proficiency: 2 }] };
  const opp = { id: 'o_no_high', skills: [{ name: 'React', priority: 'LOW', requiredProficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (!res.isEligible) return { passed: false, reason: 'Role with no high priority skills should be eligible' };
  if (res.scores.highPriorityMatchPct !== 100) return { passed: false, reason: 'High match % should default to 100' };
  return true;
});

runTest('Boundary', 'TC-BND-03', 'Opportunity with 0 Low-Priority skills defaults Low match to 100% upon High match', () => {
  const stu = { id: 's4', skills: [{ name: 'Python', proficiency: 2 }] };
  const opp = { id: 'o_no_low', skills: [{ name: 'Python', priority: 'HIGH', requiredProficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (res.status !== 'FULL MATCH') return { passed: false, reason: `Status should be FULL MATCH, got ${res.status}` };
  if (res.scores.compositeScore !== 100) return { passed: false, reason: 'Composite score should be 100' };
  return true;
});

// ==========================================
// SUMMARY
// ==========================================

console.log(`\n${BOLD}${CYAN}------------------------------------------------------${RESET}`);
console.log(`${BOLD}Test Run Summary:${RESET}`);
console.log(`  Total Executed : ${BOLD}${totalTests}${RESET}`);
console.log(`  Passed         : ${GREEN}${BOLD}${passedTests}${RESET}`);
console.log(`  Failed         : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);
console.log(`  Pass Rate      : ${BOLD}${Math.round((passedTests / totalTests) * 100)}%${RESET}`);
console.log(`${BOLD}${CYAN}------------------------------------------------------${RESET}\n`);

if (failedTests > 0) {
  console.log(`${RED}${BOLD}Failed Assertions:${RESET}`);
  failureLog.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.suiteName}] ${f.testId} - ${f.description}`);
    console.log(`     ${RED}Reason: ${f.reason}${RESET}`);
  });
  console.log('');
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}✓ ALL MATCHING ENGINE RULES & VERIFICATIONS PASSED SUCCESSFULLY!${RESET}\n`);
  process.exit(0);
}
```

---

## 6. Cross-Module Integration Matrix

The following table documents how the components specified in this document interact with other Milestone 1 and platform modules:

```
+-----------------------------------------------------------------------------------------+
|                                CROSS-MODULE INTEGRATION                                 |
+-----------------------------------------------------------------------------------------+

  [Next.js App Config]
     ├── package.json / next.config.js / tailwind.config.js / postcss.config.js
     └── Provides Tailwind dark theme tokens & execution scripts

  [Client UI Components] (Milestone 2 - 4)
     └── Calls POST /api/match or GET /api/test-matching

  [app/api/match/route.js]
     ├── Input: { studentId, opportunityId } OR { student, opportunity }
     ├── Imports: getStudentById, getOpportunityById from lib/db.js
     ├── Calls: evaluateMatch(student, opportunity) from lib/engine.js
     └── Returns: Explainable JSON match response

  [app/api/test-matching/route.js]
     ├── Imports: evaluateMatch from lib/engine.js
     ├── Imports: normalizeSkill from lib/normalization.js
     └── Returns: 12-test assertion report in structured JSON format

  [scripts/test-matching-rules.js]
     ├── Imports: evaluateMatch from lib/engine.js
     ├── Imports: normalizeSkill from lib/normalization.js
     └── CLI Output: Colored terminal test suite summary with process.exit(0/1)
```

---

## 7. Implementation Checklist for M1 Developers

- [ ] Ensure `package.json` contains `next`, `react`, `react-dom`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`.
- [ ] Ensure `next.config.js`, `tailwind.config.js`, `postcss.config.js` are in root directory with pure JavaScript.
- [ ] Create `app/api/match/route.js` implementing ID resolution and inline matching with comprehensive error handling.
- [ ] Create `app/api/test-matching/route.js` implementing the 12 automated test assertions.
- [ ] Create `scripts/test-matching-rules.js` implementing standalone ANSI color test runner.
- [ ] Verify test runner passes via `node scripts/test-matching-rules.js` and `npm run test:matching`.
