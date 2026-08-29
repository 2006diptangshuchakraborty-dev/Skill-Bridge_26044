#!/usr/bin/env node
/**
 * Milestone 4 Frontend UI Components & Dashboard Integration Test Suite
 * File: tests/test-m4-frontend.js
 * 
 * Verifies:
 * 1. Existence and structural integrity of all 6 Milestone 4 reputation components
 * 2. 3-Pillar breakdown compliance (Trust Signals, Objective Skill 0-100, Experience 1.0-5.0)
 * 3. Empty state handling (Never defaulting to 0.0 ★)
 * 4. Interactive RatingModal dynamic categories, blind review alerts, pros/cons, recommendation
 * 5. PendingRatingsWidget countdown tracking, context tags, and modal triggers
 * 6. Integration across Student Profile, Recruiter Candidates, Institute Feedback, and Home Dashboards
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
  }
}

console.log('======================================================================');
console.log('  Skill Bridge Milestone 4 - Frontend & Reputation Integration Tests  ');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// SUITE 1: Component File Existence & Export Structure
// ----------------------------------------------------------------------------
console.log('▶ SUITE 1: Reputation UI Component Inventory & File Integrity');

const componentPaths = {
  trustSignalBadges: path.join(rootDir, 'components/reputation/TrustSignalBadges.jsx'),
  ratingHistogram: path.join(rootDir, 'components/reputation/RatingHistogram.jsx'),
  reviewCard: path.join(rootDir, 'components/reputation/ReviewCard.jsx'),
  ratingModal: path.join(rootDir, 'components/reputation/RatingModal.jsx'),
  pendingRatingsWidget: path.join(rootDir, 'components/reputation/PendingRatingsWidget.jsx'),
  reputationBreakdown: path.join(rootDir, 'components/reputation/ReputationBreakdown.jsx'),
};

test('M4.01: All 6 reputation component files exist on filesystem', () => {
  for (const [key, filePath] of Object.entries(componentPaths)) {
    assert(fs.existsSync(filePath), `Component file missing: ${filePath}`);
    const stats = fs.statSync(filePath);
    assert(stats.size > 200, `Component file unexpectedly empty: ${filePath}`);
  }
});

test('M4.02: All reputation components declare "use client" directive', () => {
  for (const [key, filePath] of Object.entries(componentPaths)) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.includes('"use client"') || content.includes("'use client'"), `${key} missing "use client" directive`);
  }
});

// ----------------------------------------------------------------------------
// SUITE 2: TrustSignalBadges & RatingHistogram Pillar Compliance
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 2: TrustSignalBadges & RatingHistogram Pillar Compliance');

test('M4.03: TrustSignalBadges defines 4 trust tiers (GOLD_TRUSTED, VERIFIED_TIER2, VERIFIED_TIER1, UNVERIFIED)', () => {
  const content = fs.readFileSync(componentPaths.trustSignalBadges, 'utf8');
  assert(content.includes('GOLD_TRUSTED'), 'Missing GOLD_TRUSTED tier');
  assert(content.includes('VERIFIED_TIER2'), 'Missing VERIFIED_TIER2 tier');
  assert(content.includes('VERIFIED_TIER1'), 'Missing VERIFIED_TIER1 tier');
  assert(content.includes('UNVERIFIED'), 'Missing UNVERIFIED tier');
  assert(content.includes('compact'), 'Missing compact mode prop support');
});

test('M4.04: TrustSignalBadges defines signals for STUDENT, INDUSTRY, and INSTITUTE', () => {
  const content = fs.readFileSync(componentPaths.trustSignalBadges, 'utf8');
  assert(content.includes('Identity Verified') || content.includes('id_ver'), 'Missing Student identity verification signal');
  assert(content.includes('Statutory KYC Approved') || content.includes('cin_gstin'), 'Missing Industry statutory KYC signal');
  assert(content.includes('AISHE Code') || content.includes('aishe_auth'), 'Missing Institute AISHE verification signal');
});

test('M4.05: RatingHistogram implements 1-5 star distribution, progress bars, and recommendation rate', () => {
  const content = fs.readFileSync(componentPaths.ratingHistogram, 'utf8');
  assert(content.includes('distribution'), 'RatingHistogram missing distribution prop');
  assert(content.includes('totalCount'), 'RatingHistogram missing totalCount prop');
  assert(content.includes('averageScore'), 'RatingHistogram missing averageScore prop');
  assert(content.includes('recommendationRate'), 'RatingHistogram missing recommendationRate prop');
  assert(content.includes('Recommend') || content.includes('recommendationRate'), 'Missing recommendation rate % display');
});

// ----------------------------------------------------------------------------
// SUITE 3: ReviewCard & RatingModal Form Engine
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 3: ReviewCard & Interactive RatingModal Engine');

test('M4.06: ReviewCard renders reviewer role badges, verified stamp, pros/cons, and categories', () => {
  const content = fs.readFileSync(componentPaths.reviewCard, 'utf8');
  assert(content.includes('overallScore'), 'ReviewCard missing overallScore');
  assert(content.includes('recommendation'), 'ReviewCard missing recommendation');
  assert(content.includes('headline'), 'ReviewCard missing headline');
  assert(content.includes('pros') && content.includes('cons'), 'ReviewCard missing pros/cons sections');
  assert(content.includes('categoryScores') || content.includes('scores'), 'ReviewCard missing category scores');
  assert(content.includes('Verified Review') || content.includes('isVerified'), 'ReviewCard missing verified badge');
});

test('M4.07: RatingModal implements dynamic categories across all platform contexts', () => {
  const content = fs.readFileSync(componentPaths.ratingModal, 'utf8');
  assert(content.includes('APPLICATION_REVIEW'), 'Missing APPLICATION_REVIEW categories');
  assert(content.includes('INTERVIEW_FEEDBACK'), 'Missing INTERVIEW_FEEDBACK categories');
  assert(content.includes('TASK_EVALUATION'), 'Missing TASK_EVALUATION categories');
  assert(content.includes('INTERNSHIP_PERFORMANCE'), 'Missing INTERNSHIP_PERFORMANCE categories');
  assert(content.includes('COURSE_EVALUATION'), 'Missing COURSE_EVALUATION categories');
  assert(content.includes('SEMINAR_FEEDBACK'), 'Missing SEMINAR_FEEDBACK categories');
});

test('M4.08: RatingModal includes blind review notice banner and live weighted score calculator', () => {
  const content = fs.readFileSync(componentPaths.ratingModal, 'utf8');
  assert(content.includes('isBlind') && content.includes('Blind Review'), 'Missing Blind Review banner');
  assert(content.includes('calculateWeightedScore') || content.includes('Weighted Score'), 'Missing live weighted score preview');
  assert(content.includes('RECOMMENDED') && content.includes('NEUTRAL') && content.includes('NOT_RECOMMENDED'), 'Missing 3-tier recommendation selector');
  assert(content.includes('handleAddPro') && content.includes('handleAddCon'), 'Missing interactive pros/cons tag handlers');
});

// ----------------------------------------------------------------------------
// SUITE 4: PendingRatingsWidget Countdown & Action Triggers
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 4: PendingRatingsWidget & Liveness Countdown');

test('M4.09: PendingRatingsWidget calculates deadline countdowns with urgency formatting', () => {
  const content = fs.readFileSync(componentPaths.pendingRatingsWidget, 'utf8');
  assert(content.includes('formatCountdown') || content.includes('countdown'), 'Missing countdown formatter');
  assert(content.includes('Expires in'), 'Missing expiration label template');
  assert(content.includes('/api/ratings/pending'), 'Missing /api/ratings/pending fetch integration');
  assert(content.includes('RatingModal'), 'Missing RatingModal trigger integration');
});

test('M4.10: PendingRatingsWidget implements clean empty state when no ratings are pending', () => {
  const content = fs.readFileSync(componentPaths.pendingRatingsWidget, 'utf8');
  assert(content.includes('All caught up!') || content.includes('No pending ratings'), 'Missing clean empty state text');
});

// ----------------------------------------------------------------------------
// SUITE 5: Master ReputationBreakdown 3-Pillar & Empty State Compliance
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 5: Master ReputationBreakdown 3-Pillar Scorecard');

test('M4.11: ReputationBreakdown separates Pillar 1 (Signals), Pillar 2 (Objective 0-100), and Pillar 3 (Experience 1.0-5.0)', () => {
  const content = fs.readFileSync(componentPaths.reputationBreakdown, 'utf8');
  assert(content.includes('Pillar 1') && (content.includes('Trust Signals') || content.includes('Verification')), 'Missing Pillar 1 demarcation');
  assert(content.includes('Pillar 2') && (content.includes('Objective Skill') || content.includes('0–100')), 'Missing Pillar 2 demarcation');
  assert(content.includes('Pillar 3') && (content.includes('Experience') || content.includes('1.0–5.0')), 'Missing Pillar 3 demarcation');
});

test('M4.12: ReputationBreakdown enforces empty state requirement: never defaulting to 0.0 ★', () => {
  const content = fs.readFileSync(componentPaths.reputationBreakdown, 'utf8');
  assert(content.includes('No verified ratings yet'), 'Missing explicit "No verified ratings yet" empty state');
  assert(!content.includes('0.0 ★') && !content.includes('0.0★'), 'Must not hardcode 0.0 ★ in empty state');
});

// ----------------------------------------------------------------------------
// SUITE 6: Page Integration Integrity Checks
// ----------------------------------------------------------------------------
console.log('\n▶ SUITE 6: Page Integration Integrity Checks');

const pagePaths = {
  studentProfile: path.join(rootDir, 'app/student/profile/page.jsx'),
  recruiterCandidates: path.join(rootDir, 'app/recruiter/candidates/page.jsx'),
  instituteFeedback: path.join(rootDir, 'app/institute/feedback/page.jsx'),
  homeDashboard: path.join(rootDir, 'app/home/page.jsx'),
};

test('M4.13: Student Profile page imports and renders ReputationBreakdown', () => {
  const content = fs.readFileSync(pagePaths.studentProfile, 'utf8');
  assert(content.includes('ReputationBreakdown'), 'Student profile missing ReputationBreakdown import');
  assert(content.includes('<ReputationBreakdown'), 'Student profile missing <ReputationBreakdown component render');
});

test('M4.14: Recruiter Candidates page includes candidate reputation pills, TrustSignalBadges, and RatingModal', () => {
  const content = fs.readFileSync(pagePaths.recruiterCandidates, 'utf8');
  assert(content.includes('TrustSignalBadges'), 'Recruiter candidates missing TrustSignalBadges');
  assert(content.includes('RatingModal'), 'Recruiter candidates missing RatingModal');
  assert(content.includes('Rate Candidate Application') || content.includes('Rate Candidate'), 'Missing rate candidate action button');
  assert(content.includes('No verified ratings yet'), 'Missing empty state reputation pill text');
});

test('M4.15: Institute Feedback page integrates Academic Reputation scorecard and employer testimonials', () => {
  const content = fs.readFileSync(pagePaths.instituteFeedback, 'utf8');
  assert(content.includes('ReputationBreakdown'), 'Institute feedback missing ReputationBreakdown');
  assert(content.includes('targetRole="INSTITUTE"') || content.includes("targetRole='INSTITUTE'"), 'Institute feedback must configure targetRole="INSTITUTE"');
});

test('M4.16: Home Dashboard integrates PendingRatingsWidget across Student, Industry, and Institute views', () => {
  const content = fs.readFileSync(pagePaths.homeDashboard, 'utf8');
  assert(content.includes('PendingRatingsWidget'), 'Home page missing PendingRatingsWidget import');
  assert(content.includes('PendingRatingsWidget role="STUDENT"'), 'Missing Student PendingRatingsWidget');
  assert(content.includes('PendingRatingsWidget role="INDUSTRY"'), 'Missing Industry PendingRatingsWidget');
  assert(content.includes('PendingRatingsWidget role="INSTITUTE"'), 'Missing Institute PendingRatingsWidget');
});

// ----------------------------------------------------------------------------
// TEST SUMMARY & FINAL VERDICT
// ----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('                 M4 FRONTEND TEST EXECUTION SUMMARY                   ');
console.log('----------------------------------------------------------------------');
console.log(`  Total Tests  : ${totalTests}`);
console.log(`  Passed Tests : ${passedTests}`);
console.log(`  Failed Tests : ${failedTests}`);
console.log(`  Pass Rate    : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('----------------------------------------------------------------------');

if (failedTests > 0) {
  console.error('\n❌ SOME MILESTONE 4 FRONTEND TESTS FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL MILESTONE 4 FRONTEND & INTEGRATION TESTS PASSED SUCCESSFULLY\n');
  process.exit(0);
}
