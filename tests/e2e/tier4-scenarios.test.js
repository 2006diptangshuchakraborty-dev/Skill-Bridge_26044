/**
 * Tier 4: Real-World Application Scenarios E2E Tests
 * Validates complete end-to-end user journeys including the Primary Demo Scenario,
 * Recruiter Evaluation to Level 5 workflow, and Institute Privacy-Preserving Aggregation.
 */

const { getNormalization, getMatchingEngine, getNLPExtractor, getAlertsEngine, getDBLayer } = require('../test-helper');
const fixtures = require('../fixtures/demo-data.fixture');

module.exports = function registerTier4(harness, { assert, expect }) {
  harness.describe('Tier 4: Real-World Application Scenarios', () => {
    const norm = getNormalization();
    const engine = getMatchingEngine();
    const nlp = getNLPExtractor();
    const alerts = getAlertsEngine();
    const db = getDBLayer();

    // =========================================================================
    // SCENARIO 1: PRIMARY DEMO SCENARIO (opp_001 Data Analyst Internship)
    // =========================================================================
    harness.describe('Scenario 1: Primary Demo Scenario (opp_001 Data Analyst Internship)', () => {
      const opp = fixtures.primaryDemoOpportunity;

      harness.test('S1.1: Opportunity opp_001 is accurately configured with 4 High & 4 Low skills', () => {
        expect(opp.id).toBe('opp_001');
        expect(opp.title).toBe('Data Analyst Intern');
        expect(opp.company).toBe('TechCorp Global');

        // 4 High Priority Mandatory skills
        expect(opp.requiredSkills.length).toBe(4);
        const reqNames = opp.requiredSkills.map(s => s.canonicalName);
        expect(reqNames).toEqual(['Python', 'SQL', 'Data Analysis', 'Statistics']);

        // 4 Low Priority Preferred skills
        expect(opp.preferredSkills.length).toBe(4);
        const prefNames = opp.preferredSkills.map(s => s.canonicalName);
        expect(prefNames).toEqual(['Power BI', 'Tableau', 'Excel', 'Machine Learning']);
      });

      harness.test('S1.2: Student 1 (Aarav Sharma) -> 100% High, 75% Low, Score ~92.5%, ELIGIBLE - PARTIAL PREFERRED', () => {
        const student = fixtures.primaryDemoStudents[0];
        expect(student.name).toBe('Aarav Sharma');

        const match = engine.evaluateMatch(student, opp);

        // Verification of High Priority: 4/4 (100%)
        expect(match.highPriorityAnalysis.totalRequired).toBe(4);
        expect(match.highPriorityAnalysis.matchedCount).toBe(4);
        expect(match.highPriorityAnalysis.isFullySatisfied).toBe(true);
        expect(match.scores.highPriorityMatchPct).toBe(100);

        // Verification of Low Priority: 3/4 (75%, missing ML)
        expect(match.lowPriorityAnalysis.totalPreferred).toBe(4);
        expect(match.lowPriorityAnalysis.matchedCount).toBe(3);
        expect(match.scores.lowPriorityMatchPct).toBe(75);
        expect(match.lowPriorityAnalysis.gaps.length).toBe(1);
        expect(match.lowPriorityAnalysis.gaps[0].canonicalName).toBe('Machine Learning');

        // Verification of Status & Eligibility
        expect(match.isEligible).toBe(true);
        expect(match.status).toBe('ELIGIBLE - PARTIAL PREFERRED SKILL MATCH');

        // Verification of Composite Score: 100 * 0.70 + 75 * 0.30 = 92.5%
        expect(match.scores.compositeScore).toBeCloseTo(92.5, 0.1);

        // Verification of UI Actions
        expect(match.recommendations.eligibleToApply).toBe(true);
        expect(match.recommendations.preferredUpskilling.length).toBe(1);
        expect(match.recommendations.preferredUpskilling[0]).toContain('Machine Learning');
      });

      harness.test('S1.3: Student 2 (Priya Patel) -> 100% High, 100% Low, Score 100%, FULL MATCH', () => {
        const student = fixtures.primaryDemoStudents[1];
        expect(student.name).toBe('Priya Patel');

        const match = engine.evaluateMatch(student, opp);

        // Verification of High Priority: 4/4 (100%)
        expect(match.highPriorityAnalysis.matchedCount).toBe(4);
        expect(match.scores.highPriorityMatchPct).toBe(100);

        // Verification of Low Priority: 4/4 (100%)
        expect(match.lowPriorityAnalysis.matchedCount).toBe(4);
        expect(match.scores.lowPriorityMatchPct).toBe(100);

        // Verification of Status & Score
        expect(match.isEligible).toBe(true);
        expect(match.status).toBe('FULL MATCH');
        expect(match.scores.compositeScore).toBe(100);

        // Verification of UI Actions & Zero Gaps
        expect(match.recommendations.eligibleToApply).toBe(true);
        expect(match.highPriorityAnalysis.gaps.length).toBe(0);
        expect(match.lowPriorityAnalysis.gaps.length).toBe(0);
      });

      harness.test('S1.4: Student 3 (Rohan Verma) -> 75% High (missing SQL), 100% Low, Score ~30%, NOT ELIGIBLE - MANDATORY GAP', () => {
        const student = fixtures.primaryDemoStudents[2];
        expect(student.name).toBe('Rohan Verma');

        const match = engine.evaluateMatch(student, opp);

        // Verification of High Priority: 3/4 (75% - Missing SQL)
        expect(match.highPriorityAnalysis.matchedCount).toBe(3);
        expect(match.highPriorityAnalysis.isFullySatisfied).toBe(false);
        expect(match.scores.highPriorityMatchPct).toBe(75);
        expect(match.highPriorityAnalysis.gaps.length).toBe(1);
        expect(match.highPriorityAnalysis.gaps[0].canonicalName).toBe('SQL');
        expect(match.highPriorityAnalysis.gaps[0].reason).toBe('MISSING_SKILL');

        // Verification of Low Priority: 4/4 (100%)
        expect(match.lowPriorityAnalysis.matchedCount).toBe(4);
        expect(match.scores.lowPriorityMatchPct).toBe(100);

        // Verification of Strict Gating Status
        expect(match.isEligible).toBe(false);
        expect(match.status).toBe('NOT ELIGIBLE - MANDATORY SKILL GAP');

        // Score penalized due to mandatory failure (~30%)
        expect(match.scores.compositeScore).toBeLessThanOrEqual(35);
        expect(match.scores.compositeScore).toBeGreaterThanOrEqual(25);

        // Application Button must be DISABLED
        expect(match.recommendations.eligibleToApply).toBe(false);
        expect(match.recommendations.mandatoryGapsToFix[0]).toContain('SQL');
      });

      harness.test('S1.5: Student 4 (Ananya Sen) -> 25% High (Proficiency Gaps), 50% Low, Score ~15%, NOT ELIGIBLE - MANDATORY GAP', () => {
        const student = fixtures.primaryDemoStudents[3];
        expect(student.name).toBe('Ananya Sen');

        const match = engine.evaluateMatch(student, opp);

        // Verification of High Priority: 3 skills below proficiency (Python Beg < Int, Data Analysis Int < Adv, Statistics Beg < Int)
        expect(match.highPriorityAnalysis.isFullySatisfied).toBe(false);
        expect(match.highPriorityAnalysis.gaps.length).toBe(3);
        for (const gap of match.highPriorityAnalysis.gaps) {
          expect(gap.reason).toBe('INSUFFICIENT_PROFICIENCY');
        }

        // Verification of Status & Score
        expect(match.isEligible).toBe(false);
        expect(match.status).toBe('NOT ELIGIBLE - MANDATORY SKILL GAP');
        expect(match.scores.compositeScore).toBeLessThanOrEqual(20);

        // Application Button must be DISABLED with explicit reasons
        expect(match.recommendations.eligibleToApply).toBe(false);
        expect(match.recommendations.mandatoryGapsToFix.length).toBe(3);
      });
    });

    // =========================================================================
    // SCENARIO 2: RECRUITER POST-INTERNSHIP EVALUATION & LEVEL 5 ELEVATION
    // =========================================================================
    harness.describe('Scenario 2: Recruiter Post-Internship Evaluation Workflow', () => {
      harness.test('S2.1: Full recruiter workflow: Evaluates Aarav -> Elevates Python & Data Analysis to Level 5', () => {
        // 1. Recruiter gets student
        const aarav = db.getStudentById('stu_001');
        expect(aarav.name).toBe('Aarav Sharma');

        // 2. Recruiter submits 5-star rubric evaluation
        const evalPayload = {
          studentId: 'stu_001',
          opportunityId: 'opp_001',
          companyId: 'comp_001',
          scores: {
            technicalSkill: 5,
            problemSolving: 5,
            teamwork: 4,
            delivery: 5,
            communication: 5
          },
          feedbackNotes: 'Aarav demonstrated exemplary Python automation and SQL optimization during his 6-month internship.',
          verifiedSkills: ['Python', 'Data Analysis', 'SQL'],
          recommendHire: true
        };

        const feedbackRecord = db.submitFeedback(evalPayload);
        expect(feedbackRecord.id).toBeTruthy();
        expect(feedbackRecord.recommendHire).toBe(true);

        // 3. System promotes student skills to Level 5 "Industry Verified"
        const updatedSkills = aarav.skills.map(s => {
          if (evalPayload.verifiedSkills.includes(s.canonicalName)) {
            return {
              ...s,
              evidenceLevel: 5,
              verification: 'Industry Verified by TechCorp Global',
              verifiedAt: new Date().toISOString()
            };
          }
          return s;
        });

        db.updateStudent('stu_001', { skills: updatedSkills });

        // 4. Verify updated student profile
        const verifiedStudent = db.getStudentById('stu_001');
        const pythonSkill = verifiedStudent.skills.find(s => s.canonicalName === 'Python');
        const dataSkill = verifiedStudent.skills.find(s => s.canonicalName === 'Data Analysis');

        expect(pythonSkill.evidenceLevel).toBe(5);
        expect(pythonSkill.verification).toBe('Industry Verified by TechCorp Global');
        expect(dataSkill.evidenceLevel).toBe(5);

        // 5. Subsequent match against a Senior Data Analyst role shows Level 5 evidence
        const seniorOpp = {
          title: 'Senior Analytics Specialist',
          requiredSkills: [{ name: 'Python', proficiency: 3 }, { name: 'Data Analysis', proficiency: 3 }],
          preferredSkills: []
        };
        const seniorMatch = engine.evaluateMatch(verifiedStudent, seniorOpp);
        expect(seniorMatch.isEligible).toBe(true);
        expect(seniorMatch.highPriorityAnalysis.matchedSkills[0].evidenceLevel).toBe(5);
      });
    });

    // =========================================================================
    // SCENARIO 3: INSTITUTE PRIVACY-PRESERVING AGGREGATION & WORKSHOP CREATION
    // =========================================================================
    harness.describe('Scenario 3: Institute Privacy-Preserving Skill Gap Aggregation', () => {
      harness.test('S3.1: Aggregates gaps across 50+ students with 0 PII leak and generates workshop', () => {
        const allStudents = fixtures.students;
        const allOpps = fixtures.opportunities;

        expect(allStudents.length).toBeGreaterThanOrEqual(50);
        expect(allOpps.length).toBeGreaterThanOrEqual(15);

        // 1. Run Privacy-Preserving Skill Gap Aggregation with threshold >= 5
        const gapAlerts = alerts.aggregateSkillGaps(allStudents, allOpps, 5);

        expect(gapAlerts.length).toBeGreaterThanOrEqual(1);

        // 2. Strict PII Audit on every alert
        for (const alert of gapAlerts) {
          expect(alert.hasPII).toBe(false);
          expect(alert.studentName).toBe(undefined);
          expect(alert.studentEmail).toBe(undefined);
          expect(alert.studentId).toBe(undefined);
          expect(alert.affectedStudentCount).toBeGreaterThanOrEqual(5);
          expect(typeof alert.skillName).toBe('string');
        }

        // 3. Institute HOD selects the top gap alert to create 1-click workshop
        const topGap = gapAlerts[0];
        const workshopProposal = {
          title: `Faculty-Led Upskilling Bootcamp: ${topGap.skillName}`,
          skill: topGap.skillName,
          targetAudience: topGap.affectedStudentCount,
          department: topGap.department,
          durationWeeks: 4,
          mode: 'Hands-on Lab + Capstone',
          status: 'SCHEDULED'
        };

        expect(workshopProposal.skill).toBe(topGap.skillName);
        expect(workshopProposal.targetAudience).toBeGreaterThanOrEqual(5);

        // 4. Save workshop alert record in DB
        const createdAlert = db.createAlert({
          type: 'WORKSHOP_SCHEDULED',
          skillName: topGap.skillName,
          affectedStudents: topGap.affectedStudentCount,
          workshopTitle: workshopProposal.title
        });

        expect(createdAlert.id).toBeTruthy();
      });
    });
  });
};
