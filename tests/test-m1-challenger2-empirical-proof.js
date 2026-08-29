#!/usr/bin/env node
/**
 * Empirical Proof Script for Milestone 1 Challenger 2
 * Demonstrates the 3 critical defects in db/index.js createMockDrizzleDb:
 * 1. Table Name Extraction Bug (all schema tables route to 'user')
 * 2. Missing orderBy() query builder method and chaining failure
 * 3. Missing findFirst() methods on db.query.* rating entities
 */

const assert = require('assert');
const schema = require('../db/schema');
const localDb = require('../lib/db');
const { db } = require('../db/index');

console.log('======================================================================');
console.log('  CHALLENGER 2 EMPIRICAL BUG REPRODUCTION REPORT                      ');
console.log('======================================================================\n');

async function reproduceBug1_TableNameRouting() {
  console.log('--- REPRODUCING BUG 1: Table Name Extraction & Routing Failure ---');
  localDb.resetDb();
  const initialUsersCount = (localDb.getDb().users || []).length;
  const initialInteractionsCount = (localDb.getDb().ratingInteractions || []).length;

  console.log(`[Initial State] Users: ${initialUsersCount}, Rating Interactions: ${initialInteractionsCount}`);

  const testInteraction = {
    id: `rint_empirical_${Date.now()}`,
    interactionType: 'APPLICATION_REVIEW',
    referenceId: 'app_emp_001',
    initiatorType: 'INDUSTRY',
    initiatorId: 'comp_emp_001',
    initiatorUserId: 'usr_emp_ind_001',
    targetType: 'STUDENT',
    targetId: 'stu_emp_001',
    targetUserId: 'usr_emp_stu_001',
    status: 'REVIEWED',
  };

  // Execute insert using Drizzle schema table model
  console.log(`[Action] Executing db.insert(schema.ratingInteractions).values(testInteraction)...`);
  await db.insert(schema.ratingInteractions).values(testInteraction);

  const afterData = localDb.getDb();
  const afterUsersCount = (afterData.users || []).length;
  const afterInteractionsCount = (afterData.ratingInteractions || []).length;
  const insertedUserRecord = (afterData.users || []).find(u => u.id === testInteraction.id);
  const insertedInteractionRecord = (afterData.ratingInteractions || []).find(i => i.id === testInteraction.id);

  console.log(`[After Insert] Users count: ${afterUsersCount} (increased by ${afterUsersCount - initialUsersCount})`);
  console.log(`[After Insert] Rating Interactions count: ${afterInteractionsCount} (increased by ${afterInteractionsCount - initialInteractionsCount})`);
  console.log(`[Observation] Record found in data.users:`, !!insertedUserRecord);
  console.log(`[Observation] Record found in data.ratingInteractions:`, !!insertedInteractionRecord);

  // Now test select() routing
  console.log(`[Action] Executing db.select().from(schema.ratingCategories)...`);
  const selectResult = await db.select().from(schema.ratingCategories);
  console.log(`[Observation] db.select().from(schema.ratingCategories) returned ${selectResult.length} items.`);
  console.log(`[Observation] Are returned items users?:`, selectResult.length > 0 && selectResult[0].email !== undefined);
  console.log(`[Cause] 'table?._?.name || table?.name' is undefined for Drizzle pgTable. Defaulted to 'user'.\n`);
}

async function reproduceBug2_MissingOrderBy() {
  console.log('--- REPRODUCING BUG 2: Missing orderBy() Query Builder Method ---');
  
  try {
    console.log(`[Action] Executing db.select().from(schema.ratings).orderBy('createdAt')...`);
    await db.select().from(schema.ratings).orderBy('createdAt');
    console.log(`[Result] Unexpected pass`);
  } catch (err) {
    console.log(`[Result] CAUGHT EXPECTED ERROR:`, err.message);
  }

  try {
    console.log(`[Action] Executing db.select().from(schema.ratings).where({ status: 'PUBLISHED' }).orderBy('createdAt')...`);
    await db.select().from(schema.ratings).where({ status: 'PUBLISHED' }).orderBy('createdAt');
    console.log(`[Result] Unexpected pass`);
  } catch (err) {
    console.log(`[Result] CAUGHT EXPECTED ERROR:`, err.message);
  }
  console.log('');
}

async function reproduceBug3_MissingFindFirst() {
  console.log('--- REPRODUCING BUG 3: Missing findFirst() on db.query.* rating entities ---');
  
  const entities = [
    'ratingCategoryScores',
    'ratingReports',
    'ratingAppeals',
    'ratingAuditLogs'
  ];

  for (const entity of entities) {
    const hasFindFirst = typeof db.query[entity]?.findFirst === 'function';
    console.log(`[Check] db.query.${entity}.findFirst is function:`, hasFindFirst);
  }
  console.log('');
}

async function main() {
  await reproduceBug1_TableNameRouting();
  await reproduceBug2_MissingOrderBy();
  await reproduceBug3_MissingFindFirst();
}

main().catch(err => {
  console.error('Crash in empirical proof runner:', err);
});
