const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=====================================================================');
console.log('  SIH 2026 Milestone M3 Empirical Challenger Test Harness');
console.log('=====================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log('  âœ… [PASS] ' + description);
  } catch (err) {
    failedTests++;
    console.error('  âœ… [FAIL] ' + description);
    console.error('    Error: ' + err.message);
    failureDetails.push({ description, error: err.message });
  }
}

async function run() {
  const dummyDataModule = await import('../lib/dummy-data/index.js');
  const { studentData, industryData, instituteData, adminData } = dummyDataModule;

  console.log('â–¶ SUITE 1: StudentData & 5-Level Evidence Badge Schema');
  test('M3-STD-01: studentData.profile has required fields and CGPA/completion', () => {
    const p = studentData.profile;
    assert(p.id && p.name && p.email, 'Profile id/name/email required');
    assert(typeof p.cgpa === 'number' && p.cgpa >= 0 && p.cgpa <= 10, 'CGPA must be between 0 and 10');
    assert(typeof p.profileCompletion === 'number' && p.profileCompletion >= 0 && p.profileCompletion <= 100, 'Profile completion 0-100');
    assert(Array.isArray(p.careerPreferences.preferredRoles) && p.careerPreferences.preferredRoles.length > 0, 'Preferred roles present');
  });

  test('M3-STD-02: studentData.skillMatrix contains valid 5-level evidence badges', () => {
    assert(Array.isArray(studentData.skillMatrix) && studentData.skillMatrix.length >= 8, 'At least 8 skills in matrix');
    const validEvidenceLevels = [1, 2, 3, 4, 5];
    for (const sk of studentData.skillMatrix) {
      assert(validEvidenceLevels.includes(sk.evidenceLevel), 'Invalid evidenceLevel ' + sk.evidenceLevel + ' for ' + sk.name);
      assert(typeof sk.proficiency === 'number' && sk.proficiency >= 1 && sk.proficiency <= 4, 'Proficiency 1-4 for ' + sk.name);
      assert(typeof sk.confidenceScore === 'number' && sk.confidenceScore >= 0 && sk.confidenceScore <= 100, 'Confidence 0-100 for ' + sk.name);
      assert(typeof sk.isIndustryVerified === 'boolean', 'isIndustryVerified must be boolean for ' + sk.name);
    }
  });

  test('M3-STD-03: Evidence badge labels correspond directly to Levels 1-5 semantics', () => {
    for (const sk of studentData.skillMatrix) {
      if (sk.evidenceLevel === 1) assert(sk.evidenceLabel.includes('Level 1') || sk.evidenceLabel.includes('Self'), 'Mismatch label for L1: ' + sk.evidenceLabel);
      if (sk.evidenceLevel === 3) assert(sk.evidenceLabel.includes('Level 3') || sk.evidenceLabel.includes('Assessment'), 'Mismatch label for L3: ' + sk.evidenceLabel);
      if (sk.evidenceLevel === 4) assert(sk.evidenceLabel.includes('Level 4') || sk.evidenceLabel.includes('Project'), 'Mismatch label for L4: ' + sk.evidenceLabel);
    }
  });

  console.log('\npâ–¶ SUITE 2: Recommended Opportunities & Dual Match Gatekeeper Breakdown');
  test('M3-OPP-01: Opportunities have mandatoryMatch, preferredMatch, compositeScore and gateStatus', () => {
    assert(Array.isArray(studentData.recommendedOpportunities) && studentData.recommendedOpportunities.length >= 4, 'Opportunities array valid');
    for (const opp of studentData.recommendedOpportunities) {
      assert(typeof opp.mandatoryMatch === 'number' && opp.mandatoryMatch >= 0 && opp.mandatoryMatch <= 100, 'mandatoryMatch 0-100 for ' + opp.id);
      assert(typeof opp.preferredMatch === 'number' && opp.preferredMatch >= 0 && opp.preferredMatch <= 100, 'preferredMatch 0-100 for ' + opp.id);
      assert(typeof opp.compositeScore === 'number' && opp.compositeScore >= 0 && opp.compositeScore <= 100, 'compositeScore 0-100 for ' + opp.id);
      assert(typeof opp.isEligible === 'boolean', 'isEligible must be boolean for ' + opp.id);
      assert(typeof opp.gateStatus === 'string' && opp.gateStatus.length > 0, 'gateStatus required for ' + opp.id);
      assert(Array.isArray(opp.highPrioritySkills) && opp.highPrioritySkills.length > 0, 'highPrioritySkills required for ' + opp.id);
      assert(Array.isArray(opp.preferredSkills), 'preferredSkills array required for ' + opp.id);
    }
  });

  test('M3-OPP-02: Rule 01 Mandatory Gate is strictly enforced (isEligible=true iff mandatoryMatch=100)', () => {
    for (const opp of studentData.recommendedOpportunities) {
      if (opp.mandatoryMatch === 100) {
        assert.strictEqual(opp.isEligible, true, 'Opportunity ' + opp.id + ' should be eligible');
        assert(opp.gateStatus.includes('ELIGIBLE'), 'gateStatus should indicate ELIGIBLE for ' + opp.id);
      } else {
        assert.strictEqual(opp.isEligible, false, 'Opportunity ' + opp.id + ' must be ineligible');
        assert(opp.gateStatus.includes('NOT ELIGIBLE'), 'gateStatus should indicate NOT ELIGIBLE for ' + opp.id);
      }
    }
  });

  test('M3-OPP-03: Composite score math consistency for eligible opportunities (70% High + 30% Low)', () => {
    for (const opp of studentData.recommendedOpportunities) {
      if (opp.isEligible) {
        const expectedScore = Math.round(((opp.mandatoryMatch * 0.70) + (opp.preferredMatch * 0.30)) * 10) / 10;
        assert(Math.abs(opp.compositeScore - expectedScore) <= 0.1, 'Composite score mismatch for ' + opp.id);
      }
    }
  });

  console.log('\np–– SUITE 3: 6-Stage Application History Pipeline');
  test('M3-APP-01: Applications conform to 6-stage lifecycle model', () => {
    assert(Array.isArray(studentData.applicationHistory) && studentData.applicationHistory.length >= 6, 'At least 6 application history items');
    const validStatuses = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
    for (const app of studentData.applicationHistory) {
      assert(validStatuses.includes(app.status), 'Invalid application status ' + app.status + ' in ' + app.id);
      assert.strictEqual(app.totalStages, 6, 'totalStages must be 6 for ' + app.id);
      assert(app.stage >= 1 && app.stage <= 6, 'stage must be 1..6 for ' + app.id);
      assert(typeof app.stageLabel === 'string' && app.stageLabel.length > 0, 'stageLabel required for ' + app.id);
      assert(typeof app.nextStep === 'string' && app.nextStep.length > 0, 'nextStep required for ' + app.id);
      assert(Array.isArray(app.timeline) && app.timeline.length > 0, 'timeline array required for ' + app.id);
    }
  });

  test('M3-APP-02: Application history covers distinct stages across the pipeline', () => {
    const statusesFound = new Set(studentData.applicationHistory.map(a => a.status));
    assert(statusesFound.has('APPLIED'), 'Must contain APPLIED');
    assert(statusesFound.has('UNDER_REVIEW'), 'Must contain UNDER_REVIEW');
    assert(statusesFound.has('SHORTLISTED'), 'Must contain SHORTLISTED');
    assert(statusesFound.has('INTERVIEW'), 'Must contain INTERVIEW');
    assert(statusesFound.has('SELECTED'), 'Must contain SELECTED');
    assert(statusesFound.has('REJECTED'), 'Must contain REJECTED');
  });

  console.log('\npâ–¶ SUITE 4: Privacy-Preserving k-Anonymity Gap Alerts & Institute Data');
  test('M3-INST-01: Institute profile and department readiness benchmarks are populated', () => {
    assert(instituteData.profile.id && instituteData.profile.aisheCode && instituteData.profile.nirfRank,x€%¹ÍÑ¥ÑÕÑ”ÁÉ½™¥±”Ù…±¥œ¤ì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥¹ÍÑ¥ÑÕÑ•…Ñ„¹‘•Á…ÉÑµ•¹ÑI•…‘¥¹•ÍÌ¤€˜˜¥¹ÍÑ¥ÑÕÑ•…Ñ„¹‘•Á…ÉÑµ•¹ÑI•…‘¥¹•ÍÌ¹±•¹Ñ €øô€Ð°€•Á…ÉÑµ•¹ÐÉ•…‘¥¹•ÍÌ±¥ÍÐœ¤ì(€ô¤ì((€Ñ•ÍÐ 4Ìµ%9MP´ÀÈè¬µ¹½¹åµ¥ÑäÑ¡É•Í¡½±€¡¬€øô€Ô¤…¹é•É¼A%$±•…¬ÍÑÉ¥Ñ±ä•¹™½É•½¸…±°…À…±•ÉÑÌœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥¹ÍÑ¥ÑÕÑ•…Ñ„¹Í­¥±±…Á±•ÉÑÌ¤€˜˜¥¹ÍÑ¥ÑÕÑ•…Ñ„¹Í­¥±±…Á±•ÉÑÌ¹±•¹Ñ €øô€Ð°€M­¥±°…À…±•ÉÑÌ…ÉÉ…äœ¤ì(€€€™½È€¡½¹ÍÐ…±•ÉÐ½˜¥¹ÍÑ¥ÑÕÑ•…Ñ„¹Í­¥±±…Á±•ÉÑÌ¤ì(€€€€€…ÍÍ•ÉÐ¹ÍÑÉ¥ÑÅÕ…°¡…±•ÉÐ¹¡…ÍA%$°™…±Í”°€±•ÉÐ€œ€¬…±•ÉÐ¹¥€¬€œ5UMP¡…Ù”¡…ÍA%$€ôôô™…±Í”œ¤ì(€€€€€…ÍÍ•ÉÐ¡…±•ÉÐ¹…™™•Ñ•‘MÑÕ‘•¹Ñ½Õ¹Ð€øô€Ô°€±•ÉÐ€œ€¬…±•ÉÐ¹¥€¬€œÙ¥½±…Ñ•Ì¬µ…¹½¹åµ¥Ñä€¡½Õ¹Ð€ð€Ô¤œ¤ì(€€€€€…ÍÍ•ÉÐ¡…±•ÉÐ¹Í­¥±±9…µ”€˜˜…±•ÉÐ¹…Ñ•½Éä€˜˜…±•ÉÐ¹‘•Á…ÉÑµ•¹Ð°€5¥ÍÍ¥¹œµ•Ñ…‘…Ñ„¥¸…±•ÉÐ€œ€¬…±•ÉÐ¹¥¤ì(€€€€€…ÍÍ•ÉÐ „½m„µéµhÀ´å|¸¬­t­m„µéµhÀ´äµt­p¹m„µéµhÀ´ä´¹t­¹Ñ•ÍÐ¡…±•ÉÐ¹µ•ÍÍ…”¤°€µ…¥°±•…¬¥¸…±•ÉÐµ•ÍÍ…”œ¤ì(€€€€€…ÍÍ•ÉÐ …½q¸¡LÈÀÈØµq¬ÍñÕÍÉ}qÜ­ñÍÑ‘}qÜ¬¥qˆ¼¹Ñ•ÍÐ¡…±•ÉÐ¹µ•ÍÍ…”¤°€MÑÕ‘•¹Ð%±•…¬¥¸…±•ÉÐµ•ÍÍ…”œ¤ì(€€€ô(€ô¤ì((€Ñ•ÍÐ 4Ìµ%9MP´ÀÌèÑ¥Ù”ÑÉ…¥¹¥¹œÝ½É­Í¡½ÁÌ±¥¹­•Ñ¼Í­¥±°…À…±•ÉÐ%Èœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥¹ÍÑ¥ÑÕÑ•…Ñ„¹…Ñ¥Ù•]½É­Í¡½ÁÌ¤€˜˜¥¹ÍÑ¥ÑÕÑ•…Ñ„¹…Ñ¥Ù•]½É­Í¡½ÁÌ¹±•¹Ñ €øô€Ì°€Ñ¥Ù”Ý½É­Í¡½ÁÌ…ÉÉ…äœ¤ì(€€€™½È€¡½¹ÍÐÝÌ½˜¥¹ÍÑ¥ÑÕÑ•…Ñ„¹…Ñ¥Ù•]½É­Í¡½ÁÌ¤ì(€€€€€…ÍÍ•ÉÐ¡ÝÌ¹¥€˜˜ÝÌ¹Ñ¥Ñ±”€˜˜ÝÌ¹Ñ…É•ÑM­¥±°€˜˜ÝÌ¹•¹É½±±•‘½Õ¹Ð€ðôÝÌ¹µ…á…Á…¥Ñä°€]½É­Í¡½À¥¹Ù…±¥è€œ€¬ÝÌ¹¥¤ì(€€€€€…ÍÍ•ÉÐ¡ÝÌ¹½µÁ±•Ñ¥½¹É•‘•¹Ñ¥…°€˜˜ÝÌ¹½µÁ±•Ñ¥½¹É•‘•¹Ñ¥…°¹¥¹±Õ‘•Ì 1•Ù•°œ¤°€½µÁ±•Ñ¥½¸É•‘•¹Ñ¥…°µÕÍÐÉ…¹ÐÙ•É¥™¥•±•Ù•°‰…‘”œ¤ì(€€€ô(€ô¤ì((€½¹Í½±”¹±½œ q¹ÂZXMU%Q€Ôè%¹‘ÕÍÑÉä…Ñ„€˜A½ÍÐµ%¹Ñ•É¹Í¡¥À1¹‘½ÉÍ•µ•¹ÑÌœ¤ì(€Ñ•ÍÐ 4Ìµ%9´ÀÄè%¹‘ÕÍÑÉäÁÉ½™¥±”…¹ÁÕ‰±¥Í¡•©½‰ÌÝ¥Ñ …Ñ•­••Á•ÈÍÑ…ÑÌœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡¥¹‘ÕÍÑÉå…Ñ„¹ÁÉ½™¥±”¹¥€˜˜¥¹‘ÕÍÑÉå…Ñ„¹ÁÉ½™¥±”¹Ñ…á%‘ÍÑ¥¸€˜˜¥¹‘ÕÍÑÉå…Ñ„¹ÁÉ½™¥±”¹­åMÑ…ÑÕÌ€ôôô€AAI=Yœ°€%¹‘ÕÍÑÉäÁÉ½™¥±”Ù…±¥œ¤ì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥¹‘ÕÍÑÉå…Ñ„¹ÁÕ‰±¥Í¡•‘)½‰Ì¤€˜˜¥¹‘ÕÍÑÉå…Ñ„¹ÁÕ‰±¥Í¡•‘)½‰Ì¹±•¹Ñ €øô€Ð°€AÕ‰±¥Í¡•©½‰Ì±¥ÍÐœ¤ì(€ô¤ì((€Ñ•ÍÐ 4Ìµ%9´ÀÈè…¹‘¥‘…Ñ”½µÁ…É¥Í½¸µ…ÑÉ¥à½ÉÉ•Ñ±ä‰•¹¡µ…É­Ì…¹‘¥‘…Ñ•Ìœ°€ ¤€ôøì(€€€½¹ÍÐ½µÀ€ô¥¹‘ÕÍÑÉå…Ñ„¹…¹‘¥‘…Ñ•½µÁ…É¥Í½¸ì(€€€…ÍÍ•ÉÐ¡½µÀ€˜˜ÉÉ…ä¹¥ÍÉÉ…ä¡½µÀ¹…¹‘¥‘…Ñ•Ì¤€˜˜½µÀ¹…¹‘¥‘…Ñ•Ì¹±•¹Ñ €ôôô€Ð°€½µÁ…É¥Í½¸½¹Ñ…¥¹Ì€Ð…¹‘¥‘…Ñ”Á•ÉÍ½¹…Ìœ¤ì(€€€½¹ÍÐÁÉ¥å„€ô½µÀ¹…¹‘¥‘…Ñ•Ì¹™¥¹¡Œ€ôøŒ¹¥€ôôô€ÍÑ‘|ÀÀÈœ¤ì(€€€½¹ÍÐ……É½Ø€ô½µÀ¹…¹‘¥‘…Ñ•Ì¹™¥¹¡Œ€ôøŒ¹¥€ôôô€ÍÑ‘|ÀÀÄœ¤ì(€€€½¹ÍÐÉ½¡…¸€ô½µÀ¹…¹‘¥‘…Ñ•Ì¹™¥¹¡Œ€ôøŒ¹¥€ôôô€ÍÑ‘|ÀÀÌœ¤ì(€€€…ÍÍ•ÉÐ¡ÁÉ¥å„€˜˜ÁÉ¥å„¹½µÁ½Í¥Ñ•M½É”€ôôô€ÄÀÀ¸À°€AÉ¥å„¥Ì€ÄÀÀ”µ…Ñ œ¤ì(€€€…ÍÍ•ÉÐ¡……É½Ø€˜˜……É½Ø¹½µÁ½Í¥Ñ•M½É”€ôôô€äÈ¸Ô°€…É…Ø¥Ì€äÈ¸Ô”•±¥‰±”œ¤ì(€€€…ÍÍ•ÉÐ¡É½¡…¸€˜˜É½¡…¸¹½µÁ½Í¥Ñ•M½É”€ôôô€À¸À°€I½¡…¸¥Ì¥¹•±¥¥‰±”œ¤ì(€ô¤ì((€Ñ•ÍÐ 4Ìµ%9´ÀÌèA½ÍÐµ¥¹Ñ•É¹Í¡¥À•Ù…±Õ…Ñ¥½¸Í¡•µ„•±•Ù…Ñ•ÌÍ­¥±±ÌÑ¼1•Ù•°€Ôœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥¹‘ÕÍÑÉå…Ñ„¹Á½ÍÑ%¹Ñ•É¹Í¡¥ÁÙ…±Õ…Ñ¥½¹Ì¤€˜˜¥¹‘ÕÍÑÉå…Ñ„¹Á½ÍÑ%¹Ñ•É¹Í¡¥ÁÙ…±Õ…Ñ¥½¹Ì¹±•¹Ñ €øô€È°€Ù…±Õ…Ñ¥½¹Ì…ÉÉ…äœ¤ì(€€€™½È€¡½¹ÍÐ•Ø½˜¥¹‘ÕÍÑÉå…Ñ„¹Á½ÍÑ%¹Ñ•É¹Í¡¥ÁÙ…±Õ…Ñ¥½¹Ì¤ì(€€€€€…ÍÍ•ÉÐ¡•Ø¹ÍÑÕ‘•¹Ñ%€˜˜•Ø¹ÍÑÕ‘•¹Ñ9…µ”€˜˜•Ø¹Á•É™½Éµ…¹•I…Ñ¥¹œ°€Ù…±Õ…Ñ¥½¸¡•…‘•ÈÙ…±¥è€œ€¬•Ø¹¥¤ì(€€€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡•Ø¹Í­¥±±ÍQ½±•Ù…Ñ”¤€˜˜•Ø¹Í­¥±±ÍQ½±•Ù…Ñ”¹±•¹Ñ €ø€À°€Í­¥±±ÍQ½±•Ù…Ñ”…ÉÉ…ä¥¸€œ€¬•Ø¹¥¤ì(€€€€€™½È€¡½¹ÍÐÍ¬½˜•Ø¹Í­¥±±ÍQ½±•Ù…Ñ”¤ì(€€€€€€€…ÍÍ•ÉÐ¹ÍÑÉ¥ÑÅÕ…°¡Í¬¹ÁÉ½Á½Í•‘1•Ù•°°€Ô°€AÉ½Á½Í•±•Ù•°µÕÍÐ‰”1•Ù•°€Ô¥¸€œ€¬•Ø¹¥¤ì(€€€€€€€…ÍÍ•ÉÐ¹ÍÑÉ¥ÑÅÕ…°¡Í¬¹ÍÑ…ÑÕÌ°€A9%9}M%9}=œ°€±•Ù…Ñ¥½¸ÍÑ…ÑÕÌµÕÍÐ‰”A9%9}M%9}=¥¸€œ€¬•Ø¹¥¤ì(€€€€€ô(€€€ô(€ô¤ì((€½¹Í½±”¹±½œ q¹ÂZXMU%Q€Øè‘µ¥¸½Ù•É¹…¹”°-eEÕ•Õ”€˜½É•¹Í¥ŒÕ‘¥ÐQÉ…¥°œ¤ì(€Ñ•ÍÐ 4Ìµ4´ÀÄè‘µ¥¸-eÅÕ•Õ”Í¡•µ„…¹…Ñ¥½¸¡…¹‘±•ÉÌœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡…‘µ¥¹…Ñ„¹­åEÕ•Õ”¤€˜˜…‘µ¥¹…Ñ„¹­åEÕ•Õ”¹±•¹Ñ €øô€Ô°€-eÅÕ•Õ”…ÉÉ…äœ¤ì(€€€™½È€¡½¹ÍÐ­åŒ½˜…‘µ¥¹…Ñ„¹­åEÕ•Õ”¤ì(€€€€€…ÍÍ•ÉÐ¡­åŒ¹¥€˜˜­åŒ¹•¹Ñ¥Ñå9…µ”€˜˜l=I9%iQ%=8œ°€%9MQ%QUQt¹¥¹±Õ‘•Ì¡­­ä¹•¹Ñ¥ÑåQåÁ”¤°€-eÉ•½ÉÙ…±¥è€œ€¬­åŒ¹¥¤ì(€€€€€…ÍÍ•ÉÐ¡lA9%9œ°€%9=}IEUMQœ°€AAI=Yœ°€I)Qt¹¥¹±Õ‘•Ì¡­åŒ¹ÍÑ…ÑÕÌ¤°€Y…±¥-eÍÑ…ÑÕÌ¥¸€œ€¬­åŒ¹¥¤ì(€€€ô(€ô¤ì((€Ñ•ÍÐ 4Ìµ4´ÀÈè½É•¹Í¥Œ…Õ‘¥Ð±½Ì½¹Ñ…¥¸¥µµÕÑ…‰±”…Ñ¥½¸É•½É‘Ì…¹Í•ÕÉ¥Ñä•Ù•¹ÑÌœ°€ ¤€ôøì(€€€…ÍÍ•ÉÐ¡ÉÉ…ä¹¥ÍÉÉ…ä¡…‘µ¥¹…Ñ„¹…Õ‘¥Ñ1½Ì¤€˜˜…‘µ¥¹…Ñ„¹…Õ‘¥Ñ1½Ì¹±•¹Ñ €øô€Ô°€Õ‘¥Ð±½Ì…ÉÉ…äœ¤ì(€€€½¹ÍÐ…Ñ¥½¹Ì€ô…‘µ¥¹…Ñ„¹…Õ‘¥Ñ1½Ì¹µ…À¡°€ôø°¹…Ñ¥½¸¤ì(€€€…ÍÍ•ÉÐ¡…Ñ¥½¹Ì¹¥¹±Õ‘•Ì -e}AAI=Y}=I9%iQ%=8œ¤°€Õ‘¥Ð±½Ì½¹Ñ…¥¸-e…Ñ¥½¸œ¤ì(€€€…ÍÍ•ÉÐ¡…Ñ¥½¹Ì¹¥¹±Õ‘•Ì QQ5AQ}5%9}I%MQIQ%=9}	1=,œ¤°€Õ‘¥Ð±½Ì½¹Ñ…¥¸Í•ÕÉ¥ÑäÕ…É‰±½¬œ¤ì(€ô¤ì((€½¹Í½±”¹±½œ 1¹ÃŠbØMU%Q€Üè9…Ù‰…È…¹!½µ”A…”½µÁ½¹•¹ÐM½ÕÉ”Y•É¥™¥…Ñ¥½¹Ìœ¤ì(€Ñ•ÍÐ 4Ìµ5@´ÀÄè½µÁ½¹•¹ÑÌ½Í¡…É•½9…Ù‰…È¹©Íà¥µÁ±•µ•¹ÑÌÉ•ÍÁ½¹Í¥Ù”µ•¹Ô€˜±¥•¹Ð¡…¹‘±•ÉÌœ°€ ¤€ôøì(€€€½¹ÍÐ¹…Ù½¹Ñ•¹Ð€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹É•Í½±Ù”¡}}‘¥É¹…µ”°€œ¸¸½½µÁ½¹•¹ÑÌ½Í¡…É•½9…Ù‰…È¹©Íàœ¤°€ÕÑ˜àœ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì œ‰ÕÍ”±¥•¹Ðˆœ¤°€9…Ù‰…ÈµÕÍÐ‰”±¥•¹Ð½µÁ½¹•¹Ðœ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ÕÍ•MÑ…Ñ”¡™…±Í”¤œ¤°€9…Ù‰…ÈµÕÍÐ¡…Ù”ÍÑ…Ñ”¡½½­Ìœ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì µ½‰¥±•5•¹Õ=Á•¸œ¤€˜˜¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Í•Ñ5½‰¥±•5•¹Õ=Á•¸œ¤°€9…Ù‰…ÈµÕÍÐ¡…¹‘±”µ½‰¥±”µ•¹ÔÍÑ…Ñ”œ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ÕÍ•ÉÉ½Á‘½Ý¹=Á•¸œ¤€˜˜¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Í•ÑUÍ•ÉÉ½Á‘½Ý¹=Á•¸œ¤°€9…Ù‰…ÈµÕÍÐ¡…¹‘±”ÕÍ•È‘É½Á‘½Ý¸ÍÑ…Ñ”œ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ¡…¹‘±•M¥¹=ÕÐœ¤°€9…Ù‰…ÈµÕÍÐ¡…¹‘±”Í¥¸µ½ÕÐœ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ÕÍ•M•ÍÍ¥½¸œ¤°€9…Ù‰…ÈµÕÍÐ¥¹Ñ•É…Ñ”	•ÑÑ•ÈÕÑ ÕÍ•M•ÍÍ¥½¸œ¤ì(€€€…ÍÍ•ÉÐ¡¹…Ù½¹Ñ•¹Ð¹¥¹±Õ‘•Ì …±Õ±…Ñ•AÉ½™¥±•½µÁ±•Ñ¥½¸œ¤°€9…Ù‰…ÈµÕÍÐ…±Õ±…Ñ”ÁÉ½™¥±”½µÁ½¹•¹Ðœ¤ì(€ô¤ì((€Ñ•ÍÐ 4Ìµ5@´ÀÈè…ÁÀ½¡½µ”½Á…”¹©Íà¥µÁ±•µ•¹ÑÌ¥¹Ñ•É…Ñ¥Ù”€ÐµÉ½±”ÍÝ¥Ñ¡•È€˜-e…Ñ¥½¹Ìœ°€ ¤€ôøì(€€€½¹ÍÐ¡½µ•½¹Ñ•¹Ð€ô™Ì¹É•…‘¥±•Må¹Œ¡Á…Ñ ¹É•Í½±Ù”¡}}‘¥É¹…µ”°€œ¸¸½…ÁÀ½¡½µ”½Á…”¹©Íàœ¤°€ÕÑ˜àœ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì œ‰ÕÍ”±¥•¹Ðˆœ¤°€!½µ•A…”µÕÍÐ‰”±¥•¹Ð½µÁ½¹•¹Ðœ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Í•±•Ñ•‘I½±”œ¤€˜˜¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Í•ÑM•±•Ñ•‘I½±”œ¤°€!½µ•A…”µÕÍÐ¡…Ù”Í•±•Ñ•‘I½±”ÍÝ¥Ñ¡•ÈÍÑ…Ñ”œ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì MQUDE9Pœ¤€˜˜¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì %9UMQIdœ¤€˜˜¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì %9MQ%QUQœ¤€˜˜¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì 5%8œ¤°€!½µ•A…”µÕÍÐÉ•¹‘•È…±°€ÐÉ½±”Ù¥•ÝÌœ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ¡…¹‘±•-åÑ¥½¸œ¤°€!½µ•A…”µÕÍÐ¥µÁ±•µ•¹Ð-e…Ñ¥½¸¡…¹‘±•È¥¸‘µ¥¸Ù¥•Üœ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Ù¥‘•¹•	…‘”œ¤°€!½µ•A…”µÕÍÐÕÍ”Ù¥‘•¹•	…‘”½µÁ½¹•¹Ðœ¤ì(€€€…ÍÍ•ÉÐ¡¡½µ•½¹Ñ•¹Ð¹¥¹±Õ‘•Ì AÉ½™¥±•½µÁ±•Ñ¥½¹…Éœ¤°€!½µ•A…”µÕÍÐÕÍ”AÉ½™¥±•½µÁ±•Ñ¥½¹…É½µÁ½¹•¹Ðœ¤ì(€ô¤ì((€½¹Í½±”¹±½œ q¹Ä´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´œ¤ì(€½¹Í½±”¹±½œ œ€€€€€€€€€€€€€€€€5A%I%0QMPMU55Idœ¤ì(€½¹Í½±”¹±½œ œ´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´œ¤ì(€½¹Í½±”¹±½œ œ€Q½Ñ…°Q•ÍÑÌIÕ¸€è€œ€¬Ñ½Ñ…±Q•ÍÑÌ¤ì(€½¹Í½±”¹±½œ œ€A…ÍÍ•Q•ÍÑÌ€€€€è€œ€¬Á…ÍÍ•‘Q•ÍÑÌ¤ì(€½¹Í½±”¹±½œ œ€…¥±•Q•ÍÑÌ€€€€è€œ€¬™…¥±•‘Q•ÍÑÌ¤ì(€½¹Í½±”¹±½œ œ€A…ÍÌI…Ñ”€€€€€€€è€œ€¬€ ¡Á…ÍÍ•‘Q•ÍÑÌ€¼Ñ½Ñ…±Q•ÍÑÌ¤€¨€ÄÀÀ¤¹Ñ½¥á• Ä¤€¬€œ”œ¤ì(€½¹Í½±”¹±½œ œ´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´œ¤ì((€¥˜€¡™…¥±•‘Q•ÍÑÌ€ø€À¤ì(€€€½¹Í½±”¹•ÉÉ½È q¹Å%1UIQ%1Lèœ¤ì(€€€™…¥±ÕÉ••Ñ…¥±Ì¹™½É… ¡˜€ôø½¹Í½±”¹•ÉÉ½È œ´€œ€¬˜¹‘•ÍÉ¥ÁÑ¥½¸€¬€œè€œ€¬˜¹•ÉÉ½È¤¤ì(€€€ÁÉ½•ÍÌ¹•á¥Ð Ä¤ì(€ô•±Í”ì(€€€½¹Í½±”¹±½œ q¹Ä105A%I%0!119HQMQLAMMMUMMTLAd1q¸œ¤ì(€ô)ô()ÉÕ¸ ¤¹…Ñ ¡•ÉÈ€ôøì(€½¹Í½±”¹•ÉÉ½È …Ñ…°Ñ•ÍÐÉÕ¹¹•È•ÉÉ½Èèœ°•ÉÈ¤ì(€ÁÉ½•ÍÌ¹•á¥Ð Ä¤ì)ô¤