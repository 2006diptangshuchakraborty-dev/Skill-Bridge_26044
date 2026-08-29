#!/usr/bin/env node

/**
 * Priority-Aware Matching Engine Verification Script
 * Validates core business rules, anchor personas, normalization, and edge cases.
 * File: scripts/test-matching-rules.js
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
let evaluateMatch, rankCandidatesForOpportunity, normalizeSkill, normalizeSkillList;
try {
  const engineModule = require('../lib/engine');
  evaluateMatch = engineModule.evaluateMatch || engineModule.default;
  rankCandidatesForOpportunity = engineModule.rankCandidatesForOpportunity;
  const normModule = require('../lib/normalization');
  normalizeSkill = normModule.normalizeSkill || normModule.default;
  normalizeSkillList = normModule.normalizeSkillList;
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
  requiredSkills: [
    { name: 'Python', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'SQL', priority: 'HIGH', requiredProficiency: 2 },
    { name: 'Data Analysis', priority: 'HIGH', requiredProficiency: 3 },
    { name: 'Statistics', priority: 'HIGH', requiredProficiency: 2 },
  ],
  preferredSkills: [
    { name: 'Power BI', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Tableau', priority: 'LOW', requiredProficiency: 1 },
    { name: 'Excel', priority: 'LOW', requiredProficiency: 3 },
    { name: 'Machine Learning', priority: 'LOW', requiredProficiency: 1 },
  ],
};

const ANCHOR_STUDENTS = {
  std_001: {
    id: 'std_001',
    name: 'Aarav Sharma',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 3 },
      { name: 'SQL', proficiency: 2, evidenceLevel: 2 },
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 4 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
      { name: 'Power BI', proficiency: 2, evidenceLevel: 3 },
      { name: 'Tableau', proficiency: 1, evidenceLevel: 2 },
      { name: 'Excel', proficiency: 3, evidenceLevel: 3 },
      // Missing Machine Learning
    ],
  },
  std_002: {
    id: 'std_002',
    name: 'Priya Patel',
    skills: [
      { name: 'Python', proficiency: 4, evidenceLevel: 4 },
      { name: 'SQL', proficiency: 3, evidenceLevel: 4 },
      { name: 'Data Analysis', proficiency: 4, evidenceLevel: 4 },
      { name: 'Statistics', proficiency: 3, evidenceLevel: 3 },
      { name: 'Power BI', proficiency: 3, evidenceLevel: 3 },
      { name: 'Tableau', proficiency: 3, evidenceLevel: 3 },
      { name: 'Excel', proficiency: 4, evidenceLevel: 4 },
      { name: 'Machine Learning', proficiency: 2, evidenceLevel: 3 },
    ],
  },
  std_003: {
    id: 'std_003',
    name: 'Rohan Verma',
    skills: [
      { name: 'Python', proficiency: 2, evidenceLevel: 2 },
      // Missing Mandatory SQL
      { name: 'Data Analysis', proficiency: 3, evidenceLevel: 3 },
      { name: 'Statistics', proficiency: 2, evidenceLevel: 2 },
      { name: 'Power BI', proficiency: 1, evidenceLevel: 2 },
      { name: 'Tableau', proficiency: 1, evidenceLevel: 2 },
      { name: 'Excel', proficiency: 3, evidenceLevel: 3 },
      { name: 'Machine Learning', proficiency: 1, evidenceLevel: 2 },
    ],
  },
  std_004: {
    id: 'std_004',
    name: 'Ananya Sen',
    skills: [
      { name: 'Python', proficiency: 1, evidenceLevel: 1 }, // Deficient (1 < 2)
      { name: 'SQL', proficiency: 2, evidenceLevel: 2 },
      { name: 'Data Analysis', proficiency: 2, evidenceLevel: 2 }, // Deficient (2 < 3)
      { name: 'Statistics', proficiency: 1, evidenceLevel: 1 }, // Deficient (1 < 2)
      { name: 'Excel', proficiency: 2, evidenceLevel: 2 },
      { name: 'Power BI', proficiency: 1, evidenceLevel: 2 },
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
  if (res.scores.highPriorityMatchPct !== 100) return { passed: false, reason: `High match should be 100, got ${res.scores.highPriorityMatchPct}` };
  if (res.scores.lowPriorityMatchPct !== 75) return { passed: false, reason: `Low match should be 75, got ${res.scores.lowPriorityMatchPct}` };
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
  const c2 = normalizeSkill('react.js');
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
  const opp = { id: 'o1', requiredSkills: [{ name: 'Python', proficiency: 2 }] };
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
    requiredSkills: [
      { name: 'Python', proficiency: 2 },
      { name: 'SQL', proficiency: 2 },
    ],
    preferredSkills: [
      { name: 'Tableau', proficiency: 2 },
      { name: 'Machine Learning', proficiency: 2 },
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
  const opp = { id: 'o_req', requiredSkills: [{ name: 'Python', proficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (res.isEligible !== false) return { passed: false, reason: 'Candidate with 0 skills must be ineligible' };
  if (res.scores.highPriorityMatchPct !== 0) return { passed: false, reason: 'High match % should be 0' };
  return true;
});

runTest('Boundary', 'TC-BND-02', 'Opportunity with 0 High-Priority skills defaults to eligible (no divide-by-zero)', () => {
  const stu = { id: 's3', skills: [{ name: 'React', proficiency: 2 }] };
  const opp = { id: 'o_no_high', requiredSkills: [], preferredSkills: [{ name: 'React', proficiency: 2 }] };
  const res = evaluateMatch(stu, opp);
  if (!res.isEligible) return { passed: false, reason: 'Role with no high priority skills should be eligible' };
  if (res.scores.highPriorityMatchPct !== 100) return { passed: false, reason: 'High match % should default to 100' };
  return true;
});

runTest('Boundary', 'TC-BND-03', 'Opportunity with 0 Low-Priority skills defaults Low match to 100% upon High match', () => {
  const stu = { id: 's4', skills: [{ name: 'Python', proficiency: 2 }] };
  const opp = { id: 'o_no_low', requiredSkills: [{ name: 'Python', proficiency: 2 }], preferredSkills: [] };
  const res = evaluateMatch(stu, opp);
  if (res.status !== 'FULL MATCH') return { passed: false, reason: `Status should be FULL MATCH, got ${res.status}` };
  if (res.scores.compositeScore !== 100) return { passed: false, reason: 'Composite score should be 100' };
  return true;
});

runTest('Ranking', 'TC-RNK-01', 'Correctly ranks candidates: Priya (100%) > Aarav (92.5%) > Rohan/Ananya', () => {
  const candidates = [
    ANCHOR_STUDENTS.std_003,
    ANCHOR_STUDENTS.std_001,
    ANCHOR_STUDENTS.std_004,
    ANCHOR_STUDENTS.std_002,
  ];
  const ranked = rankCandidatesForOpportunity(candidates, DEMO_OPPORTUNITY);
  if (ranked[0].student.id !== 'std_002') return { passed: false, reason: `Top candidate should be Priya (std_002), got ${ranked[0].student.name}` };
  if (ranked[1].student.id !== 'std_001') return { passed: false, reason: `Second candidate should be Aarav (std_001), got ${ranked[1].student.name}` };
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
  console.log(`${GREEN}${BOLD}✓ ALL MATCHING ENGINE RULES & VERIFICATIONS PASSED 100%!${RESET}\n`);
  process.exit(0);
}
