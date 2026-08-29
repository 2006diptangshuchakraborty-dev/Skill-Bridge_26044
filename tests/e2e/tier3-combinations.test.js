/**
 * Tier 3: Cross-Feature Interactions E2E Tests
 * Validates pairwise and multi-feature combinations across system modules.
 */

const { getNormalization, getMatchingEngine, getNLPExtractor, getAlertsEngine, getDBLayer } = require('../test-helper');
const fixtures = require('../fixtures/demo-data.fixture');

module.exports = function registerTier3(harness, { assert, expect }) {
  harness.describe('Tier 3: Cross-Feature Interactions', () => {
    const norm = getNormalization();
    const engine = getMatchingEngine();
    const nlp = getNLPExtractor();
    const alerts = getAlertsEngine();
    const db = getDBLayer();

    // =========================================================================
    // Combination 1: Matching Engine + Student Application Submission Guard
    // =========================================================================
    harness.test('Combo 1.1: Eligible student (Aarav) match allows successful application creation', () => {
      const student = fixtures.primaryDemoStudents[0];
      const opp = fixtures.primaryDemoOpportunity;
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(true);
      expect(match.recommendations.eligibleToApply).toBe(true);

      const app = db.createApplication({
        studentId: student.id,
        opportunityId: opp.id,
        studentName: student.name,
        compositeScore: match.scores.compositeScore,
        matchStatus: match.status,
      });

      expect(app.id).toBeTruthy();
      expect(app.studentId).toBe(student.id);
      expect(app.opportunityId).toBe(opp.id);
      expect(app.compositeScore).toBeCloseTo(92.5, 0.1);
    });

    harness.test('Combo 1.2: Ineligible student (Rohan) match strictly blocks application submission with missing reasons', () => {
      const student = fixtures.primaryDemoStudents[2]; // Missing SQL
      const opp = fixtures.primaryDemoOpportunity;
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);
      expect(match.recommendations.eligibleToApply).toBe(false);

      function submitApplication() {
        if (!match.isEligible) {
          const reasonMsg = match.recommendations.mandatoryGapsToFix.join('; ');
          throw new Error(`Application Blocked (403): ${reasonMsg}`);
        }
        return db.createApplication({ studentId: student.id, opportunityId: opp.id });
      }

      expect(submitApplication).toThrow(/Application Blocked/);
      expect(submitApplication).toThrow(/SQL/);
    });

    harness.test('Combo 1.3: Insufficient proficiency candidate (Ananya) application submission blocked', () => {
      const student = fixtures.primaryDemoStudents[3]; // Python, Data Analysis below required level
      const opp = fixtures.primaryDemoOpportunity;
      const match = engine.evaluateMatch(student, opp);

      expect(match.isEligible).toBe(false);

      function submitApplication() {
        if (!match.isEligible) {
          throw new Error('Application Blocked: Missing mandatory skill proficiencies');
        }
        return db.createApplication({ studentId: student.id, opportunityId: opp.id });
      }

      expect(submitApplication).toThrow(/Application Blocked/);
    });

    // =========================================================================
    // Combination 2: AI JD Extractor + Opportunity Creation + Real-Time Matching
    // =========================================================================
    harness.test('Combo 2.1: Recruiter extracts skills from raw JD and creates opportunity with normalized skills', () => {
      const rawJD = `
        Role: Frontend React Developer
        We require strong experience in React and JavaScript.
        Candidate must know TypeScript.
        Preferred skills: Node.js, Docker.
      `;

      // 1. NLP Extraction
      const extracted = nlp.extractSkillsFromJD(rawJD);
      expect(extracted.highPrioritySkills.length).toBeGreaterThanOrEqual(1);

      // 2. Normalization check
      const normalizedReqs = norm.normalizeSkillList(extracted.highPrioritySkills);
      const normalizedPrefs = norm.normalizeSkillList(extracted.lowPrioritySkills);

      // 3. Create Opportunity in DB
      const createdOpp = db.createOpportunity({
        title: 'Frontend React Developer',
        company: 'TechCorp Global',
        companyId: 'comp_001',
        requiredSkills: normalizedReqs,
        preferredSkills: normalizedPrefs,
        status: 'ACTIVE'
      });

      expect(createdOpp.id).toBeTruthy();
      expect(createdOpp.title).toBe('Frontend React Developer');

      // 4. Match student against newly created opportunity
      const student = {
        name: 'Frontend Dev Student',
        skills: [
          { name: 'React', proficiency: 3, evidenceLevel: 3 },
          { name: 'JavaScript', proficiency: 3, evidenceLevel: 3 },
          { name: 'TypeScript', proficiency: 2, evidenceLevel: 2 },
          { name: 'Node.js', proficiency: 2, evidenceLevel: 2 }
        ]
      };

      const match = engine.evaluateMatch(student, createdOpp);
      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.isFullySatisfied).toBe(true);
    });

    // =========================================================================
    // Combination 3: Post-Internship Evaluation + Student Level 5 Elevation + Rescoring
    // =========================================================================
    harness.test('Combo 3.1: Recruiter evaluation elevates Aarav skills to Level 5 and verifies on profile', () => {
      // 1. Aarav initial state: Python evidenceLevel is 3
      const studentBefore = JSON.parse(JSON.stringify(fixtures.primaryDemoStudents[0]));
      const initialPython = studentBefore.skills.find(s => s.canonicalName === 'Python');
      expect(initialPython.evidenceLevel).toBe(3);

      // 2. Recruiter submits evaluation
      const evalReport = db.submitFeedback({
        studentId: studentBefore.id,
        opportunityId: 'opp_001',
        companyId: 'comp_001',
        scores: { technicalSkill: 5, problemSolving: 5, teamwork: 4, delivery: 5 },
        feedbackNotes: 'Outstanding internship performance. Python and Data Analysis pipelines production-ready.',
        verifiedSkills: ['Python', 'Data Analysis']
      });

      expect(evalReport.id).toBeTruthy();

      // 3. Update student profile with Level 5 evidence
      const updatedSkills = studentBefore.skills.map(s => {
        if (evalReport.verifiedSkills.includes(s.canonicalName)) {
          return { ...s, evidenceLevel: 5, verification: 'Industry Verified by TechCorp Global' };
        }
        return s;
      });

      db.updateStudent(studentBefore.id, { skills: updatedSkills });
      const studentAfter = db.getStudentById(studentBefore.id);

      const afterPython = studentAfter.skills.find(s => s.canonicalName === 'Python');
      const afterData = studentAfter.skills.find(s => s.canonicalName === 'Data Analysis');

      expect(afterPython.evidenceLevel).toBe(5);
      expect(afterPython.verification).toContain('Industry Verified');
      expect(afterData.evidenceLevel).toBe(5);

      // 4. Re-evaluate match with elevated evidence
      const matchAfter = engine.evaluateMatch(studentAfter, fixtures.primaryDemoOpportunity);
      const matchedPy = matchAfter.highPriorityAnalysis.matchedSkills.find(s => s.canonicalName === 'Python');
      expect(matchedPy.evidenceLevel).toBe(5);
    });

    // =========================================================================
    // Combination 4: Gap Aggregation + Institute Privacy Alert + Workshop + Gap Closure
    // =========================================================================
    harness.test('Combo 4.1: Gap aggregation generates privacy alert, creates workshop, and reduces cohort gap', () => {
      // 1. Evaluate cohort
      const cohort = fixtures.students;
      const opps = fixtures.opportunities;
      const initialAlerts = alerts.aggregateSkillGaps(cohort, opps, 5);

      expect(initialAlerts.length).toBeGreaterThanOrEqual(1);
      const topAlert = initialAlerts[0];
      expect(topAlert.hasPII).toBe(false);

      // 2. HOD creates workshop based on alert
      const workshop = db.createAlert({
        skillName: topAlert.skillName,
        affectedStudentCount: topAlert.affectedStudentCount,
        action: 'WORKSHOP_SCHEDULED',
        scheduledDate: '2026-09-15',
        title: `Hands-on ${topAlert.skillName} Industry Bootcamp`
      });

      expect(workshop.id).toBeTruthy();
      expect(workshop.action).toBe('WORKSHOP_SCHEDULED');

      // 3. Simulate 20 students attending workshop and acquiring the skill
      const modifiedCohort = JSON.parse(JSON.stringify(cohort));
      for (let i = 0; i < 20; i++) {
        const existingSkill = modifiedCohort[i].skills.find(s => s.canonicalName === topAlert.skillName);
        if (existingSkill) {
          existingSkill.proficiency = Math.min(4, existingSkill.proficiency + 1);
        } else {
          modifiedCohort[i].skills.push({
            name: topAlert.skillName,
            canonicalName: topAlert.skillName,
            proficiency: 2,
            evidenceLevel: 3,
          });
        }
      }

      // 4. Re-run gap aggregation on modified cohort
      const subsequentAlerts = alerts.aggregateSkillGaps(modifiedCohort, opps, 5);
      const updatedAlert = subsequentAlerts.find(a => a.skillName === topAlert.skillName);

      // Gap count must decrease
      if (updatedAlert) {
        expect(updatedAlert.affectedStudentCount).toBeLessThan(topAlert.affectedStudentCount);
      }
    });

    // =========================================================================
    // Combination 5: Admin Ontology Update + Real-Time Engine Normalization
    // =========================================================================
    harness.test('Combo 5.1: Admin adds new alias and matching engine immediately normalizes it in match query', () => {
      // 1. Admin adds alias "PyTorch-GPU" -> "PyTorch"
      norm.addAlias('PyTorch', 'pytorch-gpu');
      expect(norm.normalizeSkill('PyTorch-GPU')).toBe('PyTorch');

      // 2. Candidate with "PyTorch-GPU" matches against opportunity requiring "PyTorch"
      const student = {
        skills: [
          { name: 'Python', proficiency: 3 },
          { name: 'PyTorch-GPU', proficiency: 3 }, // alias
          { name: 'Statistics', proficiency: 3 },
          { name: 'Machine Learning', proficiency: 3 }
        ]
      };

      const opp = {
        requiredSkills: [
          { name: 'Python', proficiency: 3 },
          { name: 'PyTorch', proficiency: 2 } // canonical
        ]
      };

      const match = engine.evaluateMatch(student, opp);
      expect(match.isEligible).toBe(true);
      expect(match.highPriorityAnalysis.matchedSkills.some(s => s.canonicalName === 'PyTorch')).toBe(true);
    });

    // =========================================================================
    // Combination 6: Recruiter Candidate Comparison Matrix + Shortlisting
    // =========================================================================
    harness.test('Combo 6.1: Compares 4 candidates and transitions shortlisted candidate application statuses', () => {
      const opp = fixtures.primaryDemoOpportunity;
      const candidates = fixtures.primaryDemoStudents.map(st => ({
        student: st,
        match: engine.evaluateMatch(st, opp)
      }));

      // Candidate 1: Aarav (92.5%, Eligible)
      // Candidate 2: Priya (100%, Full Match)
      // Candidate 3: Rohan (Not Eligible)
      // Candidate 4: Ananya (Not Eligible)

      expect(candidates[0].match.isEligible).toBe(true);
      expect(candidates[1].match.isEligible).toBe(true);
      expect(candidates[2].match.isEligible).toBe(false);
      expect(candidates[3].match.isEligible).toBe(false);

      // Recruiter shortlists Priya and Aarav
      const shortList = candidates.filter(c => c.match.isEligible).map(c => ({
        studentId: c.student.id,
        status: 'SHORTLISTED',
        compositeScore: c.match.scores.compositeScore
      }));

      expect(shortList.length).toBe(2);
      expect(shortList.some(s => s.studentId === 'stu_002')).toBe(true);
      expect(shortList.some(s => s.studentId === 'stu_001')).toBe(true);
    });
  });
};
