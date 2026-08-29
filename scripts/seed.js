#!/usr/bin/env node

/**
 * SIH 2026 Platform Database Seeder & Verification Tool
 * File: scripts/seed.js
 */

const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';

function runSeed() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   SIH 2026 PLATFORM DATABASE SEEDER & INITIALIZER   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  if (!fs.existsSync(SEED_FILE)) {
    console.error(`${RED}${BOLD}❌ ERROR: data/seed.json not found!${RESET}`);
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(SEED_FILE, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`${RED}${BOLD}❌ ERROR: Failed to parse data/seed.json:${RESET}`, err.message);
    process.exit(1);
  }

  const studentsCount = data.students?.length || 0;
  const companiesCount = data.companies?.length || 0;
  const opportunitiesCount = data.opportunities?.length || 0;
  const skillsCount = data.skills?.length || 0;
  const applicationsCount = data.applications?.length || 0;
  const alertsCount = data.alerts?.length || 0;
  const trainingCount = data.trainingPrograms?.length || 0;

  console.log(`${BOLD}${MAGENTA}📊 Validating Seed Dataset Quantity Thresholds:${RESET}`);
  console.log(`   • Students      : ${BOLD}${studentsCount}${RESET} (Target: >= 50) ${studentsCount >= 50 ? GREEN + '✓ PASS' + RESET : RED + '✗ FAIL' + RESET}`);
  console.log(`   • Companies     : ${BOLD}${companiesCount}${RESET} (Target: >= 10) ${companiesCount >= 10 ? GREEN + '✓ PASS' + RESET : RED + '✗ FAIL' + RESET}`);
  console.log(`   • Opportunities : ${BOLD}${opportunitiesCount}${RESET} (Target: >= 15) ${opportunitiesCount >= 15 ? GREEN + '✓ PASS' + RESET : RED + '✗ FAIL' + RESET}`);
  console.log(`   • Skills        : ${BOLD}${skillsCount}${RESET} (Target: >= 30) ${skillsCount >= 30 ? GREEN + '✓ PASS' + RESET : RED + '✗ FAIL' + RESET}`);
  console.log(`   • Applications  : ${BOLD}${applicationsCount}${RESET}`);
  console.log(`   • Institute Alerts: ${BOLD}${alertsCount}${RESET}`);
  console.log(`   • Training Progs: ${BOLD}${trainingCount}${RESET}`);

  if (studentsCount < 50 || companiesCount < 10 || opportunitiesCount < 15 || skillsCount < 30) {
    console.error(`\n${RED}${BOLD}❌ Seed dataset does not meet minimum quantity thresholds!${RESET}`);
    process.exit(1);
  }

  // Verify anchor personas
  console.log(`\n${BOLD}${MAGENTA}🎯 Validating Anchor Persona Scenarios:${RESET}`);
  const opp001 = data.opportunities?.find(o => o.id === 'opp_001');
  if (!opp001) {
    console.error(`${RED}❌ Missing opp_001 Data Analyst Internship!${RESET}`);
    process.exit(1);
  }
  console.log(`   • Anchor Opportunity (opp_001) : ${GREEN}✓ Found (${opp001.title})${RESET}`);

  const anchorIds = ['std_001', 'std_002', 'std_003', 'std_004'];
  anchorIds.forEach(id => {
    const stu = data.students?.find(s => s.id === id || s.studentId === id);
    if (stu) {
      console.log(`   • Anchor Student (${id})         : ${GREEN}✓ Found (${stu.name})${RESET}`);
    } else {
      console.error(`${RED}❌ Missing anchor student ${id}!${RESET}`);
      process.exit(1);
    }
  });

  // Write to data/db.json
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n${GREEN}${BOLD}✓ DATABASE SUCCESSFULLY SEEDED & WRITTEN TO ${DB_FILE}${RESET}\n`);
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
