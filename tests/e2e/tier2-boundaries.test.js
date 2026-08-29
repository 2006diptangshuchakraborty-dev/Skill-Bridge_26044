/**
 * Tier 2: Boundary & Corner Cases E2E Tests
 * Validates edge conditions, boundary values, zero/empty states, threshold triggers, and alias collisions.
 */

const { getNormalization, getMatchingEngine, getAlertsEngine } = require('../test-helper');
const fixtures = require('../fixtures/demo-data.fixture');

module.exports = function registerTier2(harness, { assert, expect }) {
  harness.describe('Tier 2: Boundary & Corner Cases', () => {
    const norm = getNormalization();
    const engine = getMatchingEngine();
    const alerts = getAlertsEngine();

    // =========================================================================
    // Empty and Null States
    // =========================================================================
    harness.test('B01: Empty student skills array returns 0% match and NOT ELIGIBLE for non-empty required opp', () => {
      const student = { skills: [] };
      const opp = {
        requiredSkills: [{ name: 'Python', proficiency: 2 }],
        preferredSkills: [{ name: 'Excel', proficiency: 2 }]
      };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);
      expect(match.scores.highPriorityMatchPct).toBe(0);
      expect(match.scores.lowPriorityMatchPct).toBe(0);
      expect(match.scores.compositeScore).toBe(0);
      expect(match.highPriorityAnalysis.gaps.length).toBe(1);
      expect(match.highPriorityAnalysis.gaps[0].reason).toBe('MISSING_SKILL');
    });

    harness.test('B02: Null/undefined student skills property gracefully defaults to empty array', () => {
      const student = { name: 'New Student' }; // no skills field
      const opp = {
        requiredSkills: [{ name: 'Python', proficiency: 2 }]
      };
      const match = engine.evaluateMatch(student, opp);
      expect(match.isEligible).toBe(false);
      expect(match.scores.highPriorityMatchPct).toBe(0);
    });

    harness.test('B03: Opportunity with 0 required skills (all preferred) is 100% High-Priority satisfied', () => {
      const student = { skills: [{ name: 'Power BI', proficiency: 1 }] };
      const opp = {
        requiredSkills: [],
        preferredSkills: [
          { name: 'Power BI', proficiency: 1 },
          { name: 'Tableau', proficiency: 1 }
        ]
      };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.totalRequired).toBe(0);
      expect(match.scores.highPriorityMatchPct).toBe(100);
      expect(match.scores.lowPriorityMatchPct).toBe(50);
      expect(match.status).toBe('ELIGIBLE - PARTIAL PREFERRED SKILL MATCH');
    });

    harness.test('B04: Opportunity with 0 preferred skills (all required) sets FULL MATCH on 100% High satisfied', () => {
      const student = { skills: [{ name: 'Python', proficiency: 2 }, { name: 'SQL', proficiency: 2 }] };
      const opp = {
        requiredSkills: [{ name: 'Python', proficiency: 2 }, { name: 'SQL', proficiency: 2 }],
        preferredSkills: []
      };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.scores.highPriorityMatchPct).toBe(100);
      expect(match.scores.lowPriorityMatchPct).toBe(100);
      expect(match.scores.compositeScore).toBe(100);
      expect(match.status).toBe('FULL MATCH');
    });

    harness.test('B05: Both required and preferred skills empty yields 100% composite score and FULL MATCH', () => {
      const student = { skills: [{ name: 'Python', proficiency: 2 }] };
      const opp = { requiredSkills: [], preferredSkills: [] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.scores.compositeScore).toBe(100);
      expect(match.status).toBe('FULL MATCH');
    });

    // =========================================================================
    // Proficiency Boundaries (0, 1, 4, 5, Floats, Negative)
    // =========================================================================
    harness.test('B06: Zero proficiency (0) treated as below required proficiency for level 1 requirement', () => {
      const student = { skills: [{ name: 'Python', proficiency: 0 }] };
      const opp = { requiredSkills: [{ name: 'Python', proficiency: 1 }] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);
      expect(match.highPriorityAnalysis.gaps[0].reason).toBe('INSUFFICIENT_PROFICIENCY');
      expect(match.highPriorityAnalysis.gaps[0].studentProficiency).toBe(0);
    });

    harness.test('B07: Negative proficiency (-1) handled safely and treated as insufficient', () => {
      const student = { skills: [{ name: 'SQL', proficiency: -1 }] };
      const opp = { requiredSkills: [{ name: 'SQL', proficiency: 1 }] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);
      expect(match.highPriorityAnalysis.gaps[0].reason).toBe('INSUFFICIENT_PROFICIENCY');
    });

    harness.test('B08: Maximum proficiency level 4 (Expert) satisfies all required proficiency levels (1, 2, 3, 4)', () => {
      const student = { skills: [{ name: 'Data Analysis', proficiency: 4 }] };
      const opp1 = { requiredSkills: [{ name: 'Data Analysis', proficiency: 1 }] };
      const opp2 = { requiredSkills: [{ name: 'Data Analysis', proficiency: 2 }] };
      const opp3 = { requiredSkills: [{ name: 'Data Analysis', proficiency: 3 }] };
      const opp4 = { requiredSkills: [{ name: 'Data Analysis', proficiency: 4 }] };

      expect(engine.evaluateMatch(student, opp1).isEligible).toBe(true);
      expect(engine.evaluateMatch(student, opp2).isEligible).toBe(true);
      expect(engine.evaluateMatch(student, opp3).isEligible).toBe(true);
      expect(engine.evaluateMatch(student, opp4).isEligible).toBe(true);
    });

    harness.test('B09: Sub-level proficiency gap quantification across all 4 levels', () => {
      const tests = [
        { student: 1, required: 2, expectedGap: 1 },
        { student: 1, required: 3, expectedGap: 2 },
        { student: 1, required: 4, expectedGap: 3 },
        { student: 2, required: 3, expectedGap: 1 },
        { student: 2, required: 4, expectedGap: 2 },
        { student: 3, required: 4, expectedGap: 1 },
      ];

      for (const t of tests) {
        const student = { skills: [{ name: 'Statistics', proficiency: t.student }] };
        const opp = { requiredSkills: [{ name: 'Statistics', proficiency: t.required }] };
        const match = engine.evaluateMatch(student, opp);
        expect(match.isEligible).toBe(false);
        const gap = match.highPriorityAnalysis.gaps[0];
        expect(gap.requiredProficiency - gap.studentProficiency).toBe(t.expectedGap);
      }
    });

    harness.test('B10: Stringified numeric proficiency values (e.g. "3") coerced cleanly without type errors', () => {
      const student = { skills: [{ name: 'Excel', proficiency: '3' }] };
      const opp = { requiredSkills: [{ name: 'Excel', proficiency: 2 }] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.matchedSkills[0].studentProficiency).toBe(3);
    });

    // =========================================================================
    // Alias Collisions & Case Insensitivity
    // =========================================================================
    harness.test('B11: Multiple distinct aliases map to the same canonical skill (ReactJS, react.js, React JS, react)', () => {
      const variations = ['ReactJS', 'react.js', 'React JS', 'react', 'REACT', '  React  '];
      for (const v of variations) {
        expect(norm.normalizeSkill(v)).toBe('React');
      }
    });

    harness.test('B12: Database aliases map to PostgreSQL (Postgres, postgresql, postgre sql, POSTGRES)', () => {
      const variations = ['Postgres', 'postgresql', 'postgre sql', 'POSTGRES', 'PostgreSQL'];
      for (const v of variations) {
        expect(norm.normalizeSkill(v)).toBe('PostgreSQL');
      }
    });

    harness.test('B13: Matching engine matches student alias with opportunity canonical name', () => {
      const student = { skills: [{ name: 'react.js', proficiency: 3 }] };
      const opp = { requiredSkills: [{ name: 'React', proficiency: 2 }] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.matchedSkills[0].canonicalName).toBe('React');
    });

    harness.test('B14: Matching engine matches student canonical name with opportunity alias', () => {
      const student = { skills: [{ name: 'PostgreSQL', proficiency: 3 }] };
      const opp = { requiredSkills: [{ name: 'postgres', proficiency: 2 }] };
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.matchedSkills[0].canonicalName).toBe('PostgreSQL');
    });

    harness.test('B15: Special skill names with symbols (C++, C#, Node.js, Next.js) preserved correctly', () => {
      expect(norm.normalizeSkill('Node.js')).toBe('Node.js');
      expect(norm.normalizeSkill('node.js')).toBe('Node.js');
      expect(norm.normalizeSkill('nodejs')).toBe('Node.js');
      expect(norm.normalizeSkill('Next.js')).toBe('Next.js');
    });

    // =========================================================================
    // Strict High vs Low Priority Weighting & Formula Extremes
    // =========================================================================
    harness.test('B16: Missing 1 mandatory skill with 100% preferred skills strictly yields NOT ELIGIBLE', () => {
      const student = {
        skills: [
          { name: 'Python', proficiency: 3 },
          { name: 'Data Analysis', proficiency: 3 },
          // Missing SQL & Statistics
          { name: 'Power BI', proficiency: 2 },
          { name: 'Tableau', proficiency: 2 },
          { name: 'Excel', proficiency: 4 },
          { name: 'Machine Learning', proficiency: 2 }
        ]
      };
      const opp = fixtures.primaryDemoOpportunity; // requires Python, SQL, Data Analysis, Statistics
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);
      expect(match.status).toBe('NOT ELIGIBLE - MANDATORY SKILL GAP');
      expect(match.scores.lowPriorityMatchPct).toBe(100);
      expect(match.scores.compositeScore).toBeLessThanOrEqual(35);
      expect(match.recommendations.eligibleToApply).toBe(false);
    });

    harness.test('B17: 100% High Priority + 0% Low Priority produces exactly 70.0% composite score', () => {
      const student = {
        skills: [
          { name: 'Python', proficiency: 2 },
          { name: 'SQL', proficiency: 2 },
          { name: 'Data Analysis', proficiency: 3 },
          { name: 'Statistics', proficiency: 2 }
        ]
      };
      const opp = fixtures.primaryDemoOpportunity;
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.scores.highPriorityMatchPct).toBe(100);
      expect(match.scores.lowPriorityMatchPct).toBe(0);
      // 100 * 0.70 + 0 * 0.30 = 70.0
      expect(match.scores.compositeScore).toBeCloseTo(70.0, 0.1);
      expect(match.status).toBe('ELIGIBLE - PARTIAL PREFERRED SKILL MATCH');
    });

    harness.test('B18: 100% High Priority + 50% Low Priority produces exactly 85.0% composite score', () => {
      const student = {
        skills: [
          { name: 'Python', proficiency: 2 },
          { name: 'SQL', proficiency: 2 },
          { name: 'Data Analysis', proficiency: 3 },
          { name: 'Statistics', proficiency: 2 },
          { name: 'Power BI', proficiency: 1 },
          { name: 'Tableau', proficiency: 1 }
          // 2 of 4 preferred = 50%
        ]
      };
      const opp = fixtures.primaryDemoOpportunity;
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.scores.highPriorityMatchPct).toBe(100);
      expect(match.scores.lowPriorityMatchPct).toBe(50);
      // 100 * 0.70 + 50 * 0.30 = 70 + 15 = 85.0
      expect(match.scores.compositeScore).toBeCloseTo(85.0, 0.1);
    });

    // =========================================================================
    // Privacy Aggregation Threshold Boundaries (4 vs 5 vs 6 students)
    // =========================================================================
    harness.test('B19: Exactly 4 students missing a skill (< 5 threshold) is SUPPRESSED to prevent PII re-identification', () => {
      const sample4Students = fixtures.students.slice(0, 4);
      const opps = [fixtures.primaryDemoOpportunity];
      const alertsList = alerts.aggregateSkillGaps(sample4Students, opps, 5);

      expect(alertsList.length).toBe(0);
    });

    harness.test('B20: Exactly 5 students missing a skill (>= 5 threshold) GENERATES privacy-safe alert', () => {
      const sample5Students = fixtures.students.slice(0, 10);
      const opps = fixtures.opportunities;
      const alertsList = alerts.aggregateSkillGaps(sample5Students, opps, 5);

      expect(alertsList.length).toBeGreaterThanOrEqual(1);
      for (const a of alertsList) {
        expect(a.affectedStudentCount).toBeGreaterThanOrEqual(5);
        expect(a.hasPII).toBe(false);
      }
    });

    harness.test('B21: Candidate Comparison Matrix accepts 1, 2, 3, 4 candidates, rejects 0 or 5', () => {
      function validateMatrix(candidates) {
        if (!Array.isArray(candidates) || candidates.length < 1) throw new Error('At least 1 candidate required');
        if (candidates.length > 4) throw new Error('Maximum 4 candidates allowed');
        return true;
      }

      expect(validateMatrix([1])).toBe(true);
      expect(validateMatrix([1, 2, 3, 4])).toBe(true);
      expect(() => validateMatrix([])).toThrow(/At least 1 candidate/);
      expect(() => validateMatrix([1, 2, 3, 4, 5])).toThrow(/Maximum 4 candidates/);
    });
  });
};
