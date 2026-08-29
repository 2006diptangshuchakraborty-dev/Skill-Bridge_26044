#!/usr/bin/env node
/**
 * Skill Bridge Authentication & Role Governance Platform
 * Master E2E Test Suite Runner
 * 
 * Usage:
 *   node tests/test-auth-suite.js
 *   node tests/test-auth-suite.js --tier=1
 *   node tests/test-auth-suite.js --tier=2
 *   node tests/test-auth-suite.js --tier=3
 *   node tests/test-auth-suite.js --tier=4
 *   node tests/test-auth-suite.js --verbose
 */

const path = require('path');
const fs = require('fs');

// Color formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgBlue: '\x1b[44m\x1b[37m',
};

class AuthTestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = 0;
    this.verbose = process.argv.includes('--verbose');
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      fn,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;

    try {
      if (typeof fn === 'function') {
        fn(this);
      }
    } catch (e) {
      console.error(`Error configuring describe block "${suiteName}":`, e);
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be defined inside a describe block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: false,
    });
  }

  skip(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be defined inside a describe block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: true,
    });
  }

  async run(filterTier = null) {
    this.startTime = Date.now();
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  Skill Bridge E2E Test Suite - Auth & Role Governance Platform       ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

    const activeSuites = this.suites.filter(s => {
      if (s.tests.length === 0) return false;
      if (!filterTier) return true;
      return s.name.toLowerCase().includes(`tier ${filterTier}`) || s.name.toLowerCase().includes(`tier${filterTier}`);
    });

    if (activeSuites.length === 0) {
      console.log(`${colors.yellow}No test suites matched the filter: tier ${filterTier}${colors.reset}\n`);
      return { totalPassed: 0, totalFailed: 0, totalSkipped: 0, totalTests: 0, duration: 0, suites: [] };
    }

    for (const suite of activeSuites) {
      const suiteStart = Date.now();
      console.log(`${colors.bright}${colors.blue}▶ SUITE: ${suite.name}${colors.reset}`);

      for (const t of suite.tests) {
        if (t.skip) {
          suite.skipped++;
          this.totalSkipped++;
          console.log(`  ${colors.yellow}○ [SKIP]${colors.reset} ${t.name}`);
          continue;
        }

        const tStart = Date.now();
        try {
          if (typeof t.fn === 'function') {
            const res = t.fn();
            if (res && typeof res.then === 'function') {
              await res;
            }
          }
          const tDuration = Date.now() - tStart;
          suite.passed++;
          this.totalPassed++;
          console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${t.name} ${colors.dim}(${tDuration}ms)${colors.reset}`);
        } catch (err) {
          const tDuration = Date.now() - tStart;
          suite.failed++;
          this.totalFailed++;
          console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${t.name} ${colors.dim}(${tDuration}ms)${colors.reset}`);
          console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
          if (this.verbose && err.stack) {
            console.log(`     ${colors.dim}${err.stack}${colors.reset}`);
          }
        }
      }

      suite.duration = Date.now() - suiteStart;
      console.log(`  ${colors.dim}Suite Summary: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped (${suite.duration}ms)${colors.reset}\n`);
    }

    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.totalPassed + this.totalFailed + this.totalSkipped;
    const passRate = totalTests > 0 ? ((this.totalPassed / (this.totalPassed + this.totalFailed)) * 100).toFixed(1) : 0;

    console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
    console.log(`${colors.bright}                     TEST SUITE EXECUTION SUMMARY                    ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
    console.log(`  Total Test Suites  : ${activeSuites.length}`);
    console.log(`  Total Test Cases   : ${totalTests}`);
    console.log(`  Passed Tests       : ${colors.green}${this.totalPassed}${colors.reset}`);
    console.log(`  Failed Tests       : ${this.totalFailed > 0 ? colors.red : colors.dim}${this.totalFailed}${colors.reset}`);
    console.log(`  Skipped Tests      : ${this.totalSkipped > 0 ? colors.yellow : colors.dim}${this.totalSkipped}${colors.reset}`);
    console.log(`  Overall Pass Rate  : ${this.totalFailed === 0 ? colors.bright + colors.green : colors.red}${passRate}%${colors.reset}`);
    console.log(`  Total Duration     : ${totalDuration}ms`);
    console.log(`${colors.bright}${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

    if (this.totalFailed === 0) {
      console.log(`  ${colors.bgGreen} ALL TESTS PASSED SUCCESSFULLY ${colors.reset}\n`);
    } else {
      console.log(`  ${colors.bgRed} TEST SUITE FAILED WITH ${this.totalFailed} FAILURES ${colors.reset}\n`);
    }

    return {
      totalPassed: this.totalPassed,
      totalFailed: this.totalFailed,
      totalSkipped: this.totalSkipped,
      totalTests,
      duration: totalDuration,
      suites: activeSuites,
    };
  }
}

// Instantiate runner and load suites
const harness = new AuthTestHarness();

const { registerTier1Tests } = require('./e2e/tier1-feature-coverage.test');
const { registerTier2Tests } = require('./e2e/tier2-boundary-corner.test');
const { registerTier3Tests } = require('./e2e/tier3-cross-feature.test');
const { registerTier4Tests } = require('./e2e/tier4-real-world-scenarios.test');

registerTier1Tests(harness);
registerTier2Tests(harness);
registerTier3Tests(harness);
registerTier4Tests(harness);

// Parse CLI flags
let filterTier = null;
for (const arg of process.argv) {
  if (arg.startsWith('--tier=')) {
    filterTier = arg.split('=')[1];
  }
}

// Execute
harness.run(filterTier).then(result => {
  if (result.totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
