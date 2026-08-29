/**
 * SIH 2026 Industry Collaboration Platform
 * Standalone E2E Test Runner
 *
 * Usage:
 *   node tests/test-runner.js
 *   node tests/test-runner.js --tier=1
 *   node tests/test-runner.js --tier=2
 *   node tests/test-runner.js --tier=3
 *   node tests/test-runner.js --tier=4
 *   node tests/test-runner.js --verbose
 */

const path = require('path');
const fs = require('fs');

// Terminal colors
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

class TestHarness {
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
    const parentSuite = this.currentSuite;
    const fullName = parentSuite ? `${parentSuite.name} > ${suiteName}` : suiteName;
    const suite = {
      name: fullName,
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
      console.error(`Error in describe block "${fullName}":`, e);
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  async runSuites(filterTier = null) {
    this.startTime = Date.now();
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  SIH 2026 E2E Test Suite - Priority-Aware Skill Matching Platform  ${colors.reset}`);
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

      // Execute registered tests
      for (const test of suite.tests) {
        if (test.skip) {
          suite.skipped++;
          this.totalSkipped++;
          console.log(`  ${colors.yellow}○ [SKIP]${colors.reset} ${test.name}`);
          continue;
        }

        const testStart = Date.now();
        try {
          await test.fn();
          const testDuration = Date.now() - testStart;
          suite.passed++;
          this.totalPassed++;
          console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${test.name} ${colors.dim}(${testDuration}ms)${colors.reset}`);
          test.status = 'PASS';
          test.duration = testDuration;
        } catch (err) {
          const testDuration = Date.now() - testStart;
          suite.failed++;
          this.totalFailed++;
          console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${test.name} ${colors.dim}(${testDuration}ms)${colors.reset}`);
          console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
          if (err.expected !== undefined && err.actual !== undefined) {
            console.log(`     ${colors.dim}Expected: ${JSON.stringify(err.expected)}${colors.reset}`);
            console.log(`     ${colors.dim}Actual:   ${JSON.stringify(err.actual)}${colors.reset}`);
          }
          if (this.verbose && err.stack) {
            console.log(`     ${colors.dim}${err.stack}${colors.reset}`);
          }
          test.status = 'FAIL';
          test.error = err;
          test.duration = testDuration;
        }
      }

      suite.duration = Date.now() - suiteStart;
      console.log(`  ${colors.dim}↳ Result: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped (${suite.duration}ms)${colors.reset}\n`);
    }

    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.totalPassed + this.totalFailed + this.totalSkipped;

    this.printSummaryReport(activeSuites, totalTests, totalDuration);

    return {
      totalPassed: this.totalPassed,
      totalFailed: this.totalFailed,
      totalSkipped: this.totalSkipped,
      totalTests,
      duration: totalDuration,
      suites: activeSuites,
    };
  }

  test(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Cannot register test "${name}" outside of a describe block.`);
    }
    this.currentSuite.tests.push({ name, fn, skip: false });
  }

  it(name, fn) {
    this.test(name, fn);
  }

  skip(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Cannot register test "${name}" outside of a describe block.`);
    }
    this.currentSuite.tests.push({ name, fn, skip: true });
  }

  printSummaryReport(suites, totalTests, totalDuration) {
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}                        TEST EXECUTION SUMMARY                        ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

    console.log(`\n${colors.bright}TIER BREAKDOWN:${colors.reset}`);
    console.log(`┌────────────────────────────────────────────────────────┬────────┬────────┬────────┬──────────┐`);
    console.log(`│ Suite / Tier Name                                      │ Passed │ Failed │ Skip   │ Time(ms) │`);
    console.log(`├────────────────────────────────────────────────────────┼────────┼────────┼────────┼──────────┤`);

    for (const s of suites) {
      const name = s.name.length > 54 ? s.name.substring(0, 51) + '...' : s.name.padEnd(54, ' ');
      const p = String(s.passed).padStart(6, ' ');
      const f = String(s.failed).padStart(6, ' ');
      const sk = String(s.skipped).padStart(6, ' ');
      const dur = String(s.duration).padStart(8, ' ');
      const fColor = s.failed > 0 ? colors.red : colors.dim;
      console.log(`│ ${name} │ ${colors.green}${p}${colors.reset} │ ${fColor}${f}${colors.reset} │ ${colors.yellow}${sk}${colors.reset} │ ${dur} │`);
    }
    console.log(`└────────────────────────────────────────────────────────┴────────┴────────┴────────┴──────────┘`);

    const passRate = totalTests > 0 ? ((this.totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    console.log(`\n${colors.bright}OVERALL STATUS:${colors.reset}`);
    console.log(`  Total Test Suites: ${suites.length}`);
    console.log(`  Total Tests Run:   ${totalTests}`);
    console.log(`  Passed Tests:      ${colors.green}${this.totalPassed}${colors.reset}`);
    console.log(`  Failed Tests:      ${this.totalFailed > 0 ? colors.red + this.totalFailed + colors.reset : '0'}`);
    console.log(`  Skipped Tests:     ${colors.yellow}${this.totalSkipped}${colors.reset}`);
    console.log(`  Pass Rate:         ${this.totalFailed === 0 ? colors.green : colors.red}${passRate}%${colors.reset}`);
    console.log(`  Total Duration:    ${totalDuration}ms`);

    if (this.totalFailed === 0) {
      console.log(`\n${colors.bgGreen}${colors.bright}  ✔ ALL TESTS PASSED SUCCESSFULLY! EXIT CODE 0  ${colors.reset}\n`);
    } else {
      console.log(`\n${colors.bgRed}${colors.bright}  ✖ SOME TESTS FAILED. EXIT CODE 1  ${colors.reset}\n`);
    }
  }
}

// Global assertion helper with deep comparison
const assert = {
  strictEqual(actual, expected, message) {
    if (actual !== expected) {
      const err = new Error(message || `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      err.expected = expected;
      err.actual = actual;
      throw err;
    }
  },
  notStrictEqual(actual, expected, message) {
    if (actual === expected) {
      const err = new Error(message || `Assertion failed: expected value not to equal ${JSON.stringify(expected)}`);
      err.expected = `NOT ${JSON.stringify(expected)}`;
      err.actual = actual;
      throw err;
    }
  },
  deepStrictEqual(actual, expected, message) {
    const actStr = JSON.stringify(actual, Object.keys(actual || {}).sort());
    const expStr = JSON.stringify(expected, Object.keys(expected || {}).sort());
    if (actStr !== expStr) {
      const err = new Error(message || `Deep strict equal failed:\nExpected: ${expStr}\nActual:   ${actStr}`);
      err.expected = expected;
      err.actual = actual;
      throw err;
    }
  },
  ok(value, message) {
    if (!value) {
      const err = new Error(message || `Assertion failed: expected truthy value, got ${JSON.stringify(value)}`);
      err.expected = true;
      err.actual = value;
      throw err;
    }
  },
  isTrue(value, message) {
    assert.strictEqual(value, true, message);
  },
  isFalse(value, message) {
    assert.strictEqual(value, false, message);
  },
  closeTo(actual, expected, delta = 0.01, message) {
    if (Math.abs(actual - expected) > delta) {
      const err = new Error(message || `Assertion failed: ${actual} is not close to ${expected} (delta: ${delta})`);
      err.expected = `${expected} ± ${delta}`;
      err.actual = actual;
      throw err;
    }
  },
  greaterThan(actual, expected, message) {
    if (actual <= expected) {
      const err = new Error(message || `Assertion failed: ${actual} is not > ${expected}`);
      err.expected = `> ${expected}`;
      err.actual = actual;
      throw err;
    }
  },
  greaterThanOrEqual(actual, expected, message) {
    if (actual < expected) {
      const err = new Error(message || `Assertion failed: ${actual} is not >= ${expected}`);
      err.expected = `>= ${expected}`;
      err.actual = actual;
      throw err;
    }
  },
  lessThan(actual, expected, message) {
    if (actual >= expected) {
      const err = new Error(message || `Assertion failed: ${actual} is not < ${expected}`);
      err.expected = `< ${expected}`;
      err.actual = actual;
      throw err;
    }
  },
  lessThanOrEqual(actual, expected, message) {
    if (actual > expected) {
      const err = new Error(message || `Assertion failed: ${actual} is not <= ${expected}`);
      err.expected = `<= ${expected}`;
      err.actual = actual;
      throw err;
    }
  },
  includes(container, item, message) {
    if (Array.isArray(container)) {
      if (!container.includes(item)) {
        const err = new Error(message || `Assertion failed: array does not contain ${JSON.stringify(item)}`);
        err.expected = `Array containing ${JSON.stringify(item)}`;
        err.actual = container;
        throw err;
      }
    } else if (typeof container === 'string') {
      if (!container.includes(item)) {
        const err = new Error(message || `Assertion failed: string does not contain "${item}"`);
        err.expected = `String containing "${item}"`;
        err.actual = container;
        throw err;
      }
    } else {
      throw new Error(`Cannot check inclusion on ${typeof container}`);
    }
  },
  throws(fn, expectedRegexOrMessage) {
    let threw = false;
    let error = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      error = e;
    }
    if (!threw) {
      const err = new Error(`Expected function to throw, but it did not`);
      err.expected = 'Function throws error';
      err.actual = 'Function returned normally';
      throw err;
    }
    if (expectedRegexOrMessage) {
      if (expectedRegexOrMessage instanceof RegExp) {
        if (!expectedRegexOrMessage.test(error.message)) {
          const err = new Error(`Thrown error message "${error.message}" does not match regex ${expectedRegexOrMessage}`);
          err.expected = expectedRegexOrMessage.toString();
          err.actual = error.message;
          throw err;
        }
      } else if (typeof expectedRegexOrMessage === 'string') {
        if (!error.message.includes(expectedRegexOrMessage)) {
          const err = new Error(`Thrown error message "${error.message}" does not include "${expectedRegexOrMessage}"`);
          err.expected = expectedRegexOrMessage;
          err.actual = error.message;
          throw err;
        }
      }
    }
  }
};

// Fluent expect API
function expect(actual) {
  return {
    toBe(expected, msg) { assert.strictEqual(actual, expected, msg); },
    toEqual(expected, msg) { assert.deepStrictEqual(actual, expected, msg); },
    toBeTruthy(msg) { assert.ok(actual, msg); },
    toBeFalsy(msg) { assert.ok(!actual, msg); },
    toBeCloseTo(expected, delta, msg) { assert.closeTo(actual, expected, delta, msg); },
    toBeGreaterThan(expected, msg) { assert.greaterThan(actual, expected, msg); },
    toBeGreaterThanOrEqual(expected, msg) { assert.greaterThanOrEqual(actual, expected, msg); },
    toBeLessThan(expected, msg) { assert.lessThan(actual, expected, msg); },
    toBeLessThanOrEqual(expected, msg) { assert.lessThanOrEqual(actual, expected, msg); },
    toContain(item, msg) { assert.includes(actual, item, msg); },
    toThrow(regexOrMsg) {
      if (typeof actual !== 'function') throw new Error('expect(actual) must be a function when using toThrow()');
      assert.throws(actual, regexOrMsg);
    }
  };
}

// Global harness singleton
const globalHarness = new TestHarness();

// CLI execution helper
async function main() {
  let filterTier = null;
  for (const arg of process.argv) {
    if (arg.startsWith('--tier=')) {
      filterTier = arg.split('=')[1];
    } else if (arg === '-t1' || arg === '--tier1') {
      filterTier = '1';
    } else if (arg === '-t2' || arg === '--tier2') {
      filterTier = '2';
    } else if (arg === '-t3' || arg === '--tier3') {
      filterTier = '3';
    } else if (arg === '-t4' || arg === '--tier4') {
      filterTier = '4';
    }
  }

  // Load test files dynamically
  const tierFiles = [
    { tier: '1', path: path.join(__dirname, 'e2e', 'tier1-features.test.js') },
    { tier: '2', path: path.join(__dirname, 'e2e', 'tier2-boundaries.test.js') },
    { tier: '3', path: path.join(__dirname, 'e2e', 'tier3-combinations.test.js') },
    { tier: '4', path: path.join(__dirname, 'e2e', 'tier4-scenarios.test.js') },
  ];

  for (const file of tierFiles) {
    if (!filterTier || filterTier === file.tier) {
      if (fs.existsSync(file.path)) {
        const testModule = require(file.path);
        if (typeof testModule === 'function') {
          testModule(globalHarness, { assert, expect });
        }
      }
    }
  }

  const result = await globalHarness.runSuites(filterTier);
  process.exit(result.totalFailed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = {
  TestHarness,
  globalHarness,
  assert,
  expect,
};
