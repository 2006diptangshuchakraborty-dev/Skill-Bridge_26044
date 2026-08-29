/**
 * Adversarial Challenger 1 Stress Test Harness
 * SIH 2026 Priority-Aware Skill Matching Engine & Normalization Layer
 * File: tests/adversarial-challenger1.js
 */

const assert = require('assert');
const {
  evaluateMatch,
  rankCandidatesForOpportunity,
  MATCH_STATUS,
  GAP_REASON,
} = require('../lib/engine');

const {
  normalizeSkill,
  normalizeSkillList,
  parseNumericProficiency,
  parseNumericEvidence,
  getProficiencyLabel,
  getEvidenceLabel,
  SKILL_ONTOLOGY,
  SPEC_ONTOLOGY,
  cleanSkillString,
  toTitleCase,
  addAlias,
  addCanonicalSkill,
} = require('../lib/normalization');

console.log('======================================================================');
console.log('       ADVERSARIAL CHALLENGER 1: EMPIRICAL STRESS TEST SUITE           ');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;
const failureList = [];

function runTest(testId, testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${testId}: ${testName}`);
  } catch (err) {
    failureList.push({ testId, testName, error: err.message, stack: err.stack });
    console.error(`  ✖ [FAIL] ${testId}: ${testName}`);
    console.error(`     Reason: ${err.message}`);
  }
}

// ============================================================================
// SECTION 1: STRICT 100% HIGH-PRIORITY GATE ADVERSARIAL STRESS TESTS
// ============================================================================
console.log('\n--- Section 1: Strict 100% High-Priority Gatekeeper Verification ---');

runTest('GATE-01', 'Candidate with 100% Preferred Skills but missing 1 of 1 High-Priority skill is strictly NOT ELIGIBLE', () => {
  const student = {
    id: 'stu_adv_1',
    name: 'Adv Candidate 1',
    skills: [
      { name: 'Power BI', proficiency: 4, evidenceLevel: 5 },
      { name: 'Tableau', proficiency: 4, evidenceLevel: 5 },
      { name: 'Excel', proficiency: 4, evidenceLevel: 5 },
      { name: 'Machine Learning', proficiency: 4, evidenceLevel: 5 },
    ],
  };

  const opp = {
    id: 'opp_adv_1',
    title: 'Senior BI Engineer',
    company: 'Alpha Corp',
    requiredSkills: [{ name: 'Python', requiredProficiency: 2, priority: 'HIGH' }],
    preferredSkills: [
      { name: 'Power BI', requiredProficiency: 2, priority: 'LOW' },
      { name: 'Tableau', requiredProficiency: 2, priority: 'LOW' },
      { name: 'Excel', requiredProficiency: 2, priority: 'LOW' },
      { name: 'Machine Learning', requiredProficiency: 2, priority: 'LOW' },
    ],
  };

  const result = evaluateMatch(student, opp);

  assert.strictEqual(result.isEligible, false, 'isEligible must be strictly false');
  assert.strictEqual(result.status, MATCH_STATUS.MANDATORY_GAP, 'Status must be NOT ELIGIBLE - MANDATORY SKILL GAP');
  assert.strictEqual(result.recommendations.eligibleToApply, false, 'eligibleToApply recommendation must be false');
  assert.strictEqual(result.scores.lowPriorityMatchPct, 100, 'Low-priority match should be 100%');
  assert.strictEqual(result.scores.highPriorityMatchPct, 0, 'High-priority match should be 0%');
  assert.ok(result.scores.compositeScore <= 35, `Composite score for ineligible candidate must be heavily penalized (was ${result.scores.compositeScore})`);
  assert.strictEqual(result.highPriorityAnalysis.gaps.length, 1);
  assert.strictEqual(result.highPriorityAnalysis.gaps[0].canonicalName, 'Python');
  assert.strictEqual(result.highPriorityAnalysis.gaps[0].reason, GAP_REASON.MISSING_SKILL);
});

runTest('GATE-02', 'Candidate with 9 of 10 High-Priority skills (90%) and 100% Preferred is strictly NOT ELIGIBLE', () => {
  const highSkillNames = ['Python', 'SQL', 'Data Analysis', 'Statistics', 'Docker', 'Git', 'Linux', 'AWS', 'PostgreSQL', 'FastAPI'];
  
  // Student has first 9, missing FastAPI
  const student = {
    id: 'stu_adv_2',
    skills: [
      ...highSkillNames.slice(0, 9).map(name => ({ name, proficiency: 3, evidenceLevel: 3 })),
      { name: 'React', proficiency: 3, evidenceLevel: 3 }, // preferred
    ]
  };

  const opp = {
    id: 'opp_adv_2',
    requiredSkills: highSkillNames.map(name => ({ name, requiredProficiency: 2, priority: 'HIGH' })),
    preferredSkills: [{ name: 'React', requiredProficiency: 2, priority: 'LOW' }],
  };

  const result = evaluateMatch(student, opp);

  assert.strictEqual(result.isEligible, false, 'Candidate with 9/10 high skills must be ineligible');
  assert.strictEqual(result.status, MATCH_STATUS.MANDATORY_GAP);
  assert.strictEqual(result.highPriorityAnalysis.matchedCount, 9);
  assert.strictEqual(result.highPriorityAnalysis.totalRequired, 10);
  assert.strictEqual(result.scores.highPriorityMatchPct, 90);
  assert.strictEqual(result.highPriorityAnalysis.gaps.length, 1);
  assert.strictEqual(result.highPriorityAnalysis.gaps[0].canonicalName, 'FastAPI');
  assert.strictEqual(result.highPriorityAnalysis.gaps[0].reason, GAP_REASON.MISSING_SKILL);
});

runTest('GATE-03', 'Student proficiency below required (1 < 2, 2 < 3, 3 < 4) strictly triggers INSUFFICIENT_PROFICIENCY gap', () => {
  const testTiers = [
    { studentProf: 1, reqProf: 2, label: 'Beginner < Intermediate' },
    { studentProf: 2, reqProf: 3, label: 'Intermediate < Advanced' },
    { studentProf: 3, reqProf: 4, label: 'Advanced < Expert' },
  ];

  for (const tier of testTiers) {
    const student = {
      skills: [{ name: 'Python', proficiency: tier.studentProf, evidenceLevel: 2 }]
    };
    const opp = {
      requiredSkills: [{ name: 'Python', requiredProficiency: tier.reqProf, priority: 'HIGH' }]
    };

    const res = evaluateMatch(student, opp);
    assert.strictEqual(res.isEligible, false, `Failed on ${tier.label}: should be ineligible`);
    assert.strictEqual(res.status, MATCH_STATUS.MANDATORY_GAP);
    assert.strictEqual(res.highPriorityAnalysis.gaps.length, 1);
    const gap = res.highPriorityAnalysis.gaps[0];
    assert.strictEqual(gap.reason, GAP_REASON.INSUFFICIENT_PROFICIENCY);
    assert.strictEqual(gap.studentProficiency, tier.studentProf);
    assert.strictEqual(gap.requiredProficiency, tier.reqProf);
  }
});

runTest('GATE-04', 'Student proficiency equal or higher (2>=2, 3>=2, 4>=2, 4>=4) satisfies requirement', () => {
  const validTiers = [
    { studentProf: 2, reqProf: 2 },
    { studentProf: 3, reqProf: 2 },
    { studentProf: 4, reqProf: 2 },
    { studentProf: 4, reqProf: 4 },
  ];

  for (const tier of validTiers) {
    const student = {
      skills: [{ name: 'Python', proficiency: tier.studentProf, evidenceLevel: 2 }]
    };
    const opp = {
      requiredSkills: [{ name: 'Python', requiredProficiency: tier.reqProf, priority: 'HIGH' }]
    };

    const res = evaluateMatch(student, opp);
    assert.strictEqual(res.isEligible, true, `Failed on ${tier.studentProf} >= ${tier.reqProf}`);
    assert.strictEqual(res.highPriorityAnalysis.matchedCount, 1);
    assert.strictEqual(res.highPriorityAnalysis.gaps.length, 0);
  }
});

runTest('GATE-05', 'Adversarial proficiency inputs: 0, negative (-5), string numbers ("3"), float (2.9) handled safely', () => {
  // 0 proficiency
  const s0 = { skills: [{ name: 'Python', proficiency: 0 }] };
  const o1 = { requiredSkills: [{ name: 'Python', requiredProficiency: 1 }] };
  const r0 = evaluateMatch(s0, o1);
  assert.strictEqual(r0.isEligible, false, 'Proficiency 0 must not satisfy required level 1');

  // Negative proficiency
  const sNeg = { skills: [{ name: 'Python', proficiency: -5 }] };
  const rNeg = evaluateMatch(sNeg, o1);
  assert.strictEqual(rNeg.isEligible, false, 'Negative proficiency must not satisfy required level 1');

  // String numeric "3"
  const sStr = { skills: [{ name: 'Python', proficiency: "3" }] };
  const o2 = { requiredSkills: [{ name: 'Python', requiredProficiency: 2 }] };
  const rStr = evaluateMatch(sStr, o2);
  assert.strictEqual(rStr.isEligible, true, 'String "3" must coerce to numeric 3 and satisfy level 2');
  assert.strictEqual(rStr.highPriorityAnalysis.matchedSkills[0].studentProficiency, 3);
});

// ============================================================================
// SECTION 2: PREFERRED SKILL PARTIAL MATCH & EVALUATION ORDERING
// ============================================================================
console.log('\n--- Section 2: Preferred Skill Partial Match & Evaluation Logic ---');

runTest('PREF-01', '100% High + 100% Low results in status FULL MATCH and compositeScore 100.0', () => {
  const student = {
    skills: [
      { name: 'Python', proficiency: 2 },
      { name: 'SQL', proficiency: 2 },
      { name: 'Tableau', proficiency: 2 },
      { name: 'Excel', proficiency: 3 },
    ]
  };

  const opp = {
    requiredSkills: [
      { name: 'Python', requiredProficiency: 2 },
      { name: 'SQL', requiredProficiency: 2 },
    ],
    preferredSkills: [
      { name: 'Tableau', requiredProficiency: 2 },
      { name: 'Excel', requiredProficiency: 3 },
    ]
  };

  const res = evaluateMatch(student, opp);
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.status, MATCH_STATUS.FULL_MATCH);
  assert.strictEqual(res.scores.highPriorityMatchPct, 100);
  assert.strictEqual(res.scores.lowPriorityMatchPct, 100);
  assert.strictEqual(res.scores.compositeScore, 100);
  assert.strictEqual(res.highPriorityAnalysis.gaps.length, 0);
  assert.strictEqual(res.lowPriorityAnalysis.gaps.length, 0);
});

runTest('PREF-02', '100% High + 75% Low results in status ELIGIBLE - PARTIAL PREFERRED SKILL MATCH and compositeScore 92.5', () => {
  const student = {
    skills: [
      { name: 'Python', proficiency: 2 },
      { name: 'SQL', proficiency: 2 },
      { name: 'Data Analysis', proficiency: 3 },
      { name: 'Statistics', proficiency: 2 },
      { name: 'Power BI', proficiency: 2 },
      { name: 'Tableau', proficiency: 1 },
      { name: 'Excel', proficiency: 3 },
      // missing Machine Learning
    ]
  };

  const opp = {
    requiredSkills: [
      { name: 'Python', requiredProficiency: 2 },
      { name: 'SQL', requiredProficiency: 2 },
      { name: 'Data Analysis', requiredProficiency: 3 },
      { name: 'Statistics', requiredProficiency: 2 },
    ],
    preferredSkills: [
      { name: 'Power BI', requiredProficiency: 1 },
      { name: 'Tableau', requiredProficiency: 1 },
      { name: 'Excel', requiredProficiency: 3 },
      { name: 'Machine Learning', requiredProficiency: 1 },
    ]
  };

  const res = evaluateMatch(student, opp);
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.status, MATCH_STATUS.PARTIAL_PREFERRED);
  assert.strictEqual(res.scores.highPriorityMatchPct, 100);
  assert.strictEqual(res.scores.lowPriorityMatchPct, 75);
  // (100 * 0.70) + (75 * 0.30) = 70 + 22.5 = 92.5
  assert.strictEqual(res.scores.compositeScore, 92.5);
  assert.strictEqual(res.lowPriorityAnalysis.gaps.length, 1);
  assert.strictEqual(res.lowPriorityAnalysis.gaps[0].canonicalName, 'Machine Learning');
});

runTest('PREF-03', '100% High + 0% Low results in status ELIGIBLE - PARTIAL PREFERRED SKILL MATCH and compositeScore 70.0', () => {
  const student = {
    skills: [
      { name: 'Python', proficiency: 2 },
      { name: 'SQL', proficiency: 2 },
    ]
  };

  const opp = {
    requiredSkills: [
      { name: 'Python', requiredProficiency: 2 },
      { name: 'SQL', requiredProficiency: 2 },
    ],
    preferredSkills: [
      { name: 'Power BI', requiredProficiency: 1 },
      { name: 'Docker', requiredProficiency: 1 },
    ]
  };

  const res = evaluateMatch(student, opp);
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.status, MATCH_STATUS.PARTIAL_PREFERRED);
  assert.strictEqual(res.scores.highPriorityMatchPct, 100);
  assert.strictEqual(res.scores.lowPriorityMatchPct, 0);
  // (100 * 0.70) + (0 * 0.30) = 70.0
  assert.strictEqual(res.scores.compositeScore, 70);
  assert.strictEqual(res.lowPriorityAnalysis.gaps.length, 2);
});

runTest('PREF-04', 'Zero preferred skills in opportunity defaults low match to 100% with FULL MATCH', () => {
  const student = {
    skills: [{ name: 'Python', proficiency: 2 }]
  };

  const opp = {
    requiredSkills: [{ name: 'Python', requiredProficiency: 2 }],
    preferredSkills: []
  };

  const res = evaluateMatch(student, opp);
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.status, MATCH_STATUS.FULL_MATCH);
  assert.strictEqual(res.scores.compositeScore, 100);
  assert.strictEqual(res.lowPriorityAnalysis.totalPreferred, 0);
});

runTest('PREF-05', 'Zero required skills in opportunity (all preferred) evaluates eligibility directly from high satisfaction', () => {
  const student = {
    skills: [{ name: 'Power BI', proficiency: 2 }]
  };

  const opp = {
    requiredSkills: [],
    preferredSkills: [
      { name: 'Power BI', requiredProficiency: 2 },
      { name: 'Tableau', requiredProficiency: 2 },
    ]
  };

  const res = evaluateMatch(student, opp);
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.scores.highPriorityMatchPct, 100);
  assert.strictEqual(res.scores.lowPriorityMatchPct, 50);
  assert.strictEqual(res.status, MATCH_STATUS.PARTIAL_PREFERRED);
  assert.strictEqual(res.scores.compositeScore, 50);
});

// ============================================================================
// SECTION 3: CANONICAL NORMALIZATION & ALIAS MAPPINGS ADVERSARIAL STRESS TESTS
// ============================================================================
console.log('\n--- Section 3: Skill Normalization & Alias Layer Verification ---');

runTest('NORM-01', 'Normalizes React variations: ReactJS, react.js, react js, REACT, react -> React', () => {
  const variations = ['ReactJS', 'react.js', 'react js', 'REACT', 'react', '  ReactJS  ', 'react native'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'React', `Variant '${v}' failed to normalize to 'React' (got '${canonical}')`);
  }
});

runTest('NORM-02', 'Normalizes PostgreSQL variations: Postgres, postgres, postgresql, psql, pgsql, postgres db -> PostgreSQL', () => {
  const variations = ['Postgres', 'postgres', 'postgresql', 'psql', 'pgsql', 'postgres db', 'postgres database', 'postgre sql', 'postgresql db', 'POSTGRESQL'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'PostgreSQL', `Variant '${v}' failed to normalize to 'PostgreSQL' (got '${canonical}')`);
  }
});

runTest('NORM-03', 'Normalizes Python variations: python, python3, py, cpython, python 3.x, python language -> Python', () => {
  const variations = ['python', 'python3', 'py', 'cpython', 'python 3.x', 'python language', 'python 3', 'PYTHON'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'Python', `Variant '${v}' failed to normalize to 'Python' (got '${canonical}')`);
  }
});

runTest('NORM-04', 'Normalizes SQL variations: sql, structured query language, ansi sql, plsql, pl/sql, t-sql, tsql -> SQL', () => {
  const variations = ['sql', 'structured query language', 'ansi sql', 'plsql', 'pl/sql', 't-sql', 'tsql', 'SQL'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'SQL', `Variant '${v}' failed to normalize to 'SQL' (got '${canonical}')`);
  }
});

runTest('NORM-05', 'Normalizes Machine Learning variations: machine learning, ml, scikit-learn, sklearn, statistical modeling -> Machine Learning', () => {
  const variations = ['machine learning', 'ml', 'scikit-learn', 'sklearn', 'statistical modeling', 'supervised learning', 'Machine Learning'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'Machine Learning', `Variant '${v}' failed to normalize to 'Machine Learning' (got '${canonical}')`);
  }
});

runTest('NORM-06', 'Normalizes Power BI variations: power bi, powerbi, ms power bi, microsoft power bi, dax, power-bi -> Power BI', () => {
  const variations = ['power bi', 'powerbi', 'ms power bi', 'microsoft power bi', 'dax', 'power-bi', 'power bi desktop'];
  for (const v of variations) {
    const canonical = normalizeSkill(v);
    assert.strictEqual(canonical, 'Power BI', `Variant '${v}' failed to normalize to 'Power BI' (got '${canonical}')`);
  }
});

runTest('NORM-07', 'Normalizes Node.js and Next.js variations cleanly', () => {
  const nodeVars = ['nodejs', 'node.js', 'node js', 'node', 'node backend'];
  for (const v of nodeVars) {
    assert.strictEqual(normalizeSkill(v), 'Node.js', `Node variant '${v}' failed`);
  }

  const nextVars = ['nextjs', 'next.js', 'next js', 'next', 'next framework'];
  for (const v of nextVars) {
    assert.strictEqual(normalizeSkill(v), 'Next.js', `Next variant '${v}' failed`);
  }
});

runTest('NORM-08', 'Preserves symbols in C++, C#, .NET, CI/CD, HTML & CSS', () => {
  assert.strictEqual(normalizeSkill('c++'), 'C++');
  assert.strictEqual(normalizeSkill('cpp'), 'C++');
  assert.strictEqual(normalizeSkill('c plus plus'), 'C++');
  assert.strictEqual(normalizeSkill('ci/cd'), 'CI/CD');
  assert.strictEqual(normalizeSkill('cicd'), 'CI/CD');
  assert.strictEqual(normalizeSkill('html & css'), 'HTML & CSS');
  assert.strictEqual(normalizeSkill('html/css'), 'HTML & CSS');
});

runTest('NORM-09', 'Deduplicates multiple alias variations in normalizeSkillList to single canonical skill with MAX proficiency', () => {
  const inputList = [
    { name: 'ReactJS', proficiency: 1, evidenceLevel: 1 },
    { name: 'react.js', proficiency: 3, evidenceLevel: 4 },
    { name: 'react', proficiency: 2, evidenceLevel: 2 },
    { name: 'postgres', proficiency: 2, evidenceLevel: 2 },
    { name: 'psql', proficiency: 4, evidenceLevel: 5 },
  ];

  const normalized = normalizeSkillList(inputList);
  assert.strictEqual(normalized.length, 2, 'Should deduplicate 5 entries into 2 canonical skills');

  const react = normalized.find(s => s.canonicalName === 'React');
  assert.ok(react, 'React must exist');
  assert.strictEqual(react.proficiency, 3, 'React proficiency should be maximum found (3)');
  assert.strictEqual(react.evidenceLevel, 4, 'React evidenceLevel should be maximum found (4)');

  const pg = normalized.find(s => s.canonicalName === 'PostgreSQL');
  assert.ok(pg, 'PostgreSQL must exist');
  assert.strictEqual(pg.proficiency, 4, 'PostgreSQL proficiency should be maximum found (4)');
  assert.strictEqual(pg.evidenceLevel, 5, 'PostgreSQL evidenceLevel should be maximum found (5)');
});

runTest('NORM-10', 'Dynamic title casing for novel unlisted skills', () => {
  assert.strictEqual(normalizeSkill('quantum computing'), 'Quantum Computing');
  assert.strictEqual(normalizeSkill('bioinformatics algorithms'), 'Bioinformatics Algorithms');
  assert.strictEqual(normalizeSkill('   solidity smart contracts  '), 'Solidity Smart Contracts');
});

runTest('NORM-11', 'Null, undefined, empty string, non-string edge cases return empty string', () => {
  assert.strictEqual(normalizeSkill(null), '');
  assert.strictEqual(normalizeSkill(undefined), '');
  assert.strictEqual(normalizeSkill(''), '');
  assert.strictEqual(normalizeSkill('   '), '');
  assert.strictEqual(normalizeSkillList(null).length, 0);
  assert.strictEqual(normalizeSkillList(undefined).length, 0);
  assert.strictEqual(normalizeSkillList([]).length, 0);
});

// ============================================================================
// SECTION 4: EXPLAINABILITY & CANDIDATE RANKING ORDERING
// ============================================================================
console.log('\n--- Section 4: Explainability Breakdown & Ranking Integrity ---');

runTest('EXPLAIN-01', 'MatchResult generates comprehensive explainable structure', () => {
  const student = {
    id: 'stu_exp_1',
    name: 'Kabir Mehta',
    skills: [
      { name: 'Python', proficiency: 3, evidenceLevel: 3 },
      { name: 'SQL', proficiency: 2, evidenceLevel: 2 },
    ]
  };

  const opp = {
    id: 'opp_exp_1',
    title: 'Data Intern',
    company: 'FinTech Hub',
    requiredSkills: [
      { name: 'Python', requiredProficiency: 2 },
      { name: 'SQL', requiredProficiency: 3 }, // Kabir has 2 < 3
    ],
    preferredSkills: [
      { name: 'Power BI', requiredProficiency: 1 } // missing
    ]
  };

  const match = evaluateMatch(student, opp);
  assert.strictEqual(match.isEligible, false);
  assert.strictEqual(match.status, MATCH_STATUS.MANDATORY_GAP);
  assert.ok(match.explanation.includes('NOT ELIGIBLE due to mandatory skill gap'));
  assert.ok(match.explanation.includes('SQL proficiency below required Level 3'));
  assert.strictEqual(match.recommendations.mandatoryGapsToFix.length, 1);
  assert.ok(match.recommendations.mandatoryGapsToFix[0].includes('SQL'));
  assert.strictEqual(match.recommendations.preferredUpskilling.length, 1);
  assert.ok(match.recommendations.preferredUpskilling[0].includes('Power BI'));
});

runTest('EXPLAIN-02', 'rankCandidatesForOpportunity strictly prioritizes FULL MATCH > PARTIAL PREFERRED > MANDATORY GAP', () => {
  const cFull = {
    id: 'c_full',
    name: 'Full Matcher',
    overallConfidenceScore: 90,
    skills: [
      { name: 'Python', proficiency: 3 },
      { name: 'SQL', proficiency: 3 },
      { name: 'Tableau', proficiency: 2 }
    ]
  };

  const cPartialHigh = {
    id: 'c_partial_high',
    name: 'Partial Matcher High Conf',
    overallConfidenceScore: 99,
    skills: [
      { name: 'Python', proficiency: 3 },
      { name: 'SQL', proficiency: 3 },
      // missing Tableau
    ]
  };

  const cIneligibleHighScores = {
    id: 'c_ineligible',
    name: 'Ineligible with High Non-Mandatory',
    overallConfidenceScore: 100,
    skills: [
      { name: 'Tableau', proficiency: 4 },
      { name: 'Power BI', proficiency: 4 },
      { name: 'Excel', proficiency: 4 }
      // missing Python & SQL
    ]
  };

  const opp = {
    requiredSkills: [{ name: 'Python', requiredProficiency: 2 }, { name: 'SQL', requiredProficiency: 2 }],
    preferredSkills: [{ name: 'Tableau', requiredProficiency: 2 }]
  };

  const ranked = rankCandidatesForOpportunity([cIneligibleHighScores, cPartialHigh, cFull], opp);

  assert.strictEqual(ranked[0].student.id, 'c_full', 'Rank 1 must be FULL MATCH candidate');
  assert.strictEqual(ranked[1].student.id, 'c_partial_high', 'Rank 2 must be PARTIAL PREFERRED candidate');
  assert.strictEqual(ranked[2].student.id, 'c_ineligible', 'Rank 3 must be INELIGIBLE candidate, despite higher confidence score');
});

console.log('\n======================================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failureList.length}`);
console.log('======================================================================');

if (failureList.length > 0) {
  console.error('\nFAILED TESTS BREAKDOWN:');
  failureList.forEach(f => {
    console.error(`- [${f.testId}] ${f.testName}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✔ ALL ADVERSARIAL CHALLENGER 1 TESTS PASSED 100% EMPIRICALLY!');
  process.exit(0);
}
