import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import assert from 'assert';
import crypto from 'crypto';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as userSchema from '../db/schema/user.js';
import { eq, and, gt, lt } from 'drizzle-orm';

const { user, session, account, verification } = userSchema;

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment or .env file');
}

const db = drizzle(connectionString, { schema: { user, session, account, verification } });
const pool = new Pool({ connectionString });

const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

function recordPass(testName, details = '') {
  testResults.passed++;
  testResults.details.push({ testName, status: 'PASS', details });
  console.log(`  ✔ [PASS] ${testName} ${details ? `(${details})` : ''}`);
}

function recordFail(testName, error) {
  testResults.failed++;
  const errMsg = error?.message || String(error);
  testResults.errors.push({ testName, error: errMsg, stack: error?.stack });
  testResults.details.push({ testName, status: 'FAIL', error: errMsg });
  console.error(`  ✖ [FAIL] ${testName}: ${errMsg}`);
}

function isUniqueViolation(err) {
  const values = [
    err?.code,
    err?.constraint,
    err?.message,
    err?.cause?.code,
    err?.cause?.constraint,
    err?.cause?.message,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return values.some((value) =>
    value.includes('23505') ||
    value.includes('unique') ||
    value.includes('duplicate key')
  );
}

async function runSection(name, fn) {
  console.log(`\n======================================================================`);
  console.log(`  RUNNING SUITE: ${name}`);
  console.log(`======================================================================`);
  try {
    await fn();
  } catch (err) {
    console.error(`Suite fatal error in "${name}":`, err.message);
  }
}

async function main() {
  console.log('\n======================================================================');
  console.log('  CHALLENGER 2: BETTER AUTH & OAUTH PERSISTENCE EMPIRICAL STRESS SUITE');
  console.log('======================================================================');

  const client = await pool.connect();

  try {
    // -------------------------------------------------------------------------
    // SECTION 0: Schema Aggregator & Module Import Health Check
    // -------------------------------------------------------------------------
    await runSection('0. Schema Aggregator & Module Import Health Check', async () => {
      try {
        await import('../db/schema/index.js');
        recordPass('Import db/schema/index.js', 'Schema barrel loaded cleanly');
      } catch (err) {
        recordFail('Import db/schema/index.js', new Error(`Broken export in db/schema/index.js: ${err.message}`));
      }

      try {
        await import('../db/index.js');
        recordPass('Import db/index.js', 'Database connection module loaded cleanly');
      } catch (err) {
        recordFail('Import db/index.js', new Error(`Failed to load db/index.js: ${err.message}`));
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Schema Compliance & Table Definition Verification
    // -------------------------------------------------------------------------
    await runSection('1. Schema Compliance & Table Definition Verification', async () => {
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('user', 'session', 'account', 'verification', 'users', 'sessions', 'accounts', 'verifications');
      `);
      const existingTables = tablesRes.rows.map(r => r.table_name);

      const requiredTables = ['user', 'session', 'account', 'verification'];
      for (const reqTable of requiredTables) {
        if (existingTables.includes(reqTable)) {
          recordPass(`Table Existence: "${reqTable}"`, `Found in information_schema.tables`);
        } else {
          recordFail(`Table Existence: "${reqTable}"`, new Error(`Table "${reqTable}" is MISSING from database public schema. Found tables: [${existingTables.join(', ')}]`));
        }
      }

      // Check columns for "user" table
      const userCols = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user';
      `);
      const userColMap = Object.fromEntries(userCols.rows.map(r => [r.column_name, r]));
      
      const expectedUserCols = ['id', 'name', 'email', 'emailVerified', 'role', 'account_status', 'onboarding_status', 'profile_completed', 'createdAt', 'updatedAt'];
      for (const col of expectedUserCols) {
        if (userColMap[col]) {
          recordPass(`User Column: "${col}"`, `type: ${userColMap[col].data_type}`);
        } else {
          recordFail(`User Column: "${col}"`, new Error(`Missing expected column "${col}" on table "user"`));
        }
      }

      // Check columns for "session" table
      const sessionCols = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session';
      `);
      const sessionColMap = Object.fromEntries(sessionCols.rows.map(r => [r.column_name, r]));
      const expectedSessionCols = ['id', 'userId', 'token', 'expiresAt', 'createdAt', 'updatedAt'];
      for (const col of expectedSessionCols) {
        if (sessionColMap[col]) {
          recordPass(`Session Column: "${col}"`, `type: ${sessionColMap[col].data_type}`);
        } else {
          recordFail(`Session Column: "${col}"`, new Error(`Missing expected column "${col}" on table "session"`));
        }
      }

      // Check columns for "account" table
      const accountCols = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account';
      `);
      const accountColMap = Object.fromEntries(accountCols.rows.map(r => [r.column_name, r]));
      const expectedAccountCols = ['id', 'userId', 'issuer', 'accountId', 'providerId', 'accessToken', 'refreshToken', 'createdAt', 'updatedAt'];
      for (const col of expectedAccountCols) {
        if (accountColMap[col]) {
          recordPass(`Account Column: "${col}"`, `type: ${accountColMap[col].data_type}`);
        } else {
          recordFail(`Account Column: "${col}"`, new Error(`Missing expected column "${col}" on table "account"`));
        }
      }

      // Check columns for "verification" table
      const verifCols = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification';
      `);
      const verifColMap = Object.fromEntries(verifCols.rows.map(r => [r.column_name, r]));
      const expectedVerifCols = ['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'];
      for (const col of expectedVerifCols) {
        if (verifColMap[col]) {
          recordPass(`Verification Column: "${col}"`, `type: ${verifColMap[col].data_type}`);
        } else {
          recordFail(`Verification Column: "${col}"`, new Error(`Missing expected column "${col}" on table "verification"`));
        }
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 2: User Creation, Google OAuth Account Linking, Session & Token Persistence
    // -------------------------------------------------------------------------
    await runSection('2. Better Auth Lifecycle & Google OAuth Linking Persistence', async () => {
      const testSuffix = crypto.randomBytes(4).toString('hex');
      const testUserId = `usr_stress_${testSuffix}`;
      const testEmail = `stress.test.${testSuffix}@example.com`;
      const testGoogleAccountId = `google_sub_${testSuffix}`;
      const testSessionToken = `sess_tok_${crypto.randomBytes(16).toString('hex')}`;
      const testVerifValue = `verif_val_${crypto.randomBytes(16).toString('hex')}`;

      let createdUser = null;
      let createdAccount = null;
      let createdSession = null;
      let createdVerif = null;

      // 2.1 Insert User via Drizzle ORM
      try {
        const [insertedUser] = await db.insert(user).values({
          id: testUserId,
          name: `BetterAuth Stress User ${testSuffix}`,
          email: testEmail,
          emailVerified: true,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          onboardingStatus: 'NOT_STARTED',
          profileCompleted: false,
        }).returning();

        assert.strictEqual(insertedUser.id, testUserId);
        assert.strictEqual(insertedUser.email, testEmail);
        createdUser = insertedUser;
        recordPass('User Creation via Drizzle ORM', `Persisted user id: ${testUserId}`);
      } catch (err) {
        recordFail('User Creation via Drizzle ORM', err);
      }

      // 2.2 Insert Google OAuth Account Linking via Drizzle ORM
      if (createdUser) {
        try {
          const [insertedAccount] = await db.insert(account).values({
            id: `acc_stress_${testSuffix}`,
            userId: testUserId,
            issuer: 'https://accounts.google.com',
            providerId: 'google',
            accountId: testGoogleAccountId,
            accessToken: `ya29.${crypto.randomBytes(32).toString('hex')}`,
            refreshToken: `1//${crypto.randomBytes(32).toString('hex')}`,
            scope: 'openid email profile',
            idToken: `eyJhbGciOiJSUzI1Ni...${testSuffix}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();

          assert.strictEqual(insertedAccount.userId, testUserId);
          assert.strictEqual(insertedAccount.issuer, 'https://accounts.google.com');
          assert.strictEqual(insertedAccount.providerId, 'google');
          assert.strictEqual(insertedAccount.accountId, testGoogleAccountId);
          createdAccount = insertedAccount;
          recordPass('Google OAuth Account Linking Insert', `Linked provider: google, accountId: ${testGoogleAccountId}`);
        } catch (err) {
          recordFail('Google OAuth Account Linking Insert', err);
        }
      }

      // 2.3 Insert Session via Drizzle ORM
      if (createdUser) {
        try {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          const [insertedSession] = await db.insert(session).values({
            id: `sess_id_${testSuffix}`,
            userId: testUserId,
            token: testSessionToken,
            expiresAt: expiresAt,
            ipAddress: '127.0.0.1',
            userAgent: 'BetterAuth-Stress-Agent/1.0',
          }).returning();

          assert.strictEqual(insertedSession.userId, testUserId);
          assert.strictEqual(insertedSession.token, testSessionToken);
          createdSession = insertedSession;
          recordPass('Session Creation via Drizzle ORM', `Token persisted, expiresAt: ${expiresAt.toISOString()}`);
        } catch (err) {
          recordFail('Session Creation via Drizzle ORM', err);
        }
      }

      // 2.4 Insert Verification Token via Drizzle ORM
      try {
        const verifExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const [insertedVerif] = await db.insert(verification).values({
          id: `verif_id_${testSuffix}`,
          identifier: testEmail,
          value: testVerifValue,
          expiresAt: verifExpiresAt,
        }).returning();

        assert.strictEqual(insertedVerif.identifier, testEmail);
        assert.strictEqual(insertedVerif.value, testVerifValue);
        createdVerif = insertedVerif;
        recordPass('Verification Token Persistence', `Identifier: ${testEmail}, value persisted`);
      } catch (err) {
        recordFail('Verification Token Persistence', err);
      }

      // 2.5 Query User with Linked Accounts & Sessions
      if (createdUser) {
        try {
          const userRows = await db.select().from(user).where(eq(user.id, testUserId));
          assert.strictEqual(userRows.length, 1);
          assert.strictEqual(userRows[0].email, testEmail);

          const sessionRows = await db.select().from(session).where(eq(session.token, testSessionToken));
          assert.strictEqual(sessionRows.length, 1);
          assert.strictEqual(sessionRows[0].userId, testUserId);

          recordPass('Query User & Session Relationship', `Session correctly mapped to user ${testUserId}`);
        } catch (err) {
          recordFail('Query User & Session Relationship', err);
        }
      }

      // Cleanup
      if (createdVerif) {
        await db.delete(verification).where(eq(verification.id, createdVerif.id)).catch(() => {});
      }
      if (createdUser) {
        await db.delete(user).where(eq(user.id, testUserId)).catch(() => {});
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 3: Session Expiration & Boundary Logic Stress
    // -------------------------------------------------------------------------
    await runSection('3. Session Expiration & Boundary Logic Stress', async () => {
      const suffix = crypto.randomBytes(4).toString('hex');
      const testUserId = `usr_exp_${suffix}`;
      const activeToken = `tok_active_${suffix}`;
      const expiredToken = `tok_expired_${suffix}`;
      const boundaryToken = `tok_boundary_${suffix}`;

      try {
        await db.insert(user).values({
          id: testUserId,
          name: `Expiration Test User ${suffix}`,
          email: `exp.${suffix}@example.com`,
          emailVerified: true,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
        });

        const futureDate = new Date(Date.now() + 3600 * 1000); // +1 hour
        const pastDate = new Date(Date.now() - 3600 * 1000);   // -1 hour
        const exactBoundaryDate = new Date(Date.now() - 10);    // just expired

        // Insert active session
        await db.insert(session).values({
          id: `sess_act_${suffix}`,
          userId: testUserId,
          token: activeToken,
          expiresAt: futureDate,
        });

        // Insert expired session
        await db.insert(session).values({
          id: `sess_exp_${suffix}`,
          userId: testUserId,
          token: expiredToken,
          expiresAt: pastDate,
        });

        // Insert boundary session
        await db.insert(session).values({
          id: `sess_bnd_${suffix}`,
          userId: testUserId,
          token: boundaryToken,
          expiresAt: exactBoundaryDate,
        });

        // 3.1 Validate active session query returns session
        const activeLookup = await db
          .select()
          .from(session)
          .where(and(eq(session.token, activeToken), gt(session.expiresAt, new Date())));
        assert.strictEqual(activeLookup.length, 1, 'Active session must be found with gt(expiresAt, now())');
        recordPass('Active Session Query Check', `Active session token found (expires: ${futureDate.toISOString()})`);

        // 3.2 Validate expired session query returns NO session when filtering for valid sessions
        const expiredLookup = await db
          .select()
          .from(session)
          .where(and(eq(session.token, expiredToken), gt(session.expiresAt, new Date())));
        assert.strictEqual(expiredLookup.length, 0, 'Expired session must NOT be returned when filtering for gt(expiresAt, now())');
        recordPass('Expired Session Rejection Check', `Expired token rejected by validity predicate`);

        // 3.3 Validate boundary session query returns NO session
        const boundaryLookup = await db
          .select()
          .from(session)
          .where(and(eq(session.token, boundaryToken), gt(session.expiresAt, new Date())));
        assert.strictEqual(boundaryLookup.length, 0, 'Boundary expired session must NOT be returned');
        recordPass('Boundary Expiration Check', `Boundary session properly recognized as expired`);

        // 3.4 Session update/extension simulation (sliding expiration window)
        const extendedDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        await db
          .update(session)
          .set({ expiresAt: extendedDate, updatedAt: new Date() })
          .where(eq(session.token, activeToken));

        const updatedSession = await db.select().from(session).where(eq(session.token, activeToken));
        assert.strictEqual(updatedSession.length, 1);
        assert(Math.abs(updatedSession[0].expiresAt.getTime() - extendedDate.getTime()) < 1000, 'Expiration date extended');
        recordPass('Session Expiration Extension (Sliding Window)', `Updated expiresAt to ${extendedDate.toISOString()}`);

      } catch (err) {
        recordFail('Session Expiration Suite', err);
      } finally {
        await db.delete(user).where(eq(user.id, testUserId)).catch(() => {});
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 4: Unique Constraints, Foreign Keys & Cascade Deletion
    // -------------------------------------------------------------------------
    await runSection('4. Unique Constraints & Cascade Deletion Invariants', async () => {
      const suffix = crypto.randomBytes(4).toString('hex');
      const testUserId1 = `usr_uq1_${suffix}`;
      const testUserId2 = `usr_uq2_${suffix}`;
      const sharedEmail = `duplicate.${suffix}@example.com`;

      // 4.1 Unique Email Constraint on user table
      try {
        await db.insert(user).values({
          id: testUserId1,
          name: `User 1 ${suffix}`,
          email: sharedEmail,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
        });

        let duplicateEmailThrown = false;
        try {
          await db.insert(user).values({
            id: testUserId2,
            name: `User 2 ${suffix}`,
            email: sharedEmail, // Colliding email
            role: 'INDUSTRY',
            accountStatus: 'PENDING',
          });
        } catch (dupErr) {
          duplicateEmailThrown = true;
          assert(isUniqueViolation(dupErr), `Expected unique constraint violation error, got: ${dupErr.message}`);
        }

        const duplicateEmailRows = await db.select().from(user).where(eq(user.email, sharedEmail));
        assert.strictEqual(duplicateEmailRows.length, 1, 'Database must preserve a single row for a unique email');
        assert.strictEqual(duplicateEmailThrown || duplicateEmailRows.length === 1, true, 'Database must reject or prevent duplicate email insert');
        recordPass('Unique Email Constraint Enforcement', `Rejected duplicate email "${sharedEmail}"`);
      } catch (err) {
        recordFail('Unique Email Constraint Enforcement', err);
      }

      // 4.2 Unique (issuer, accountId) Constraint on account table
      try {
        const testGoogleId = `google_acc_${suffix}`;
        await db.insert(account).values({
          id: `acc1_${suffix}`,
          userId: testUserId1,
          issuer: 'https://accounts.google.com',
          providerId: 'google',
          accountId: testGoogleId,
        });

        let duplicateAccountThrown = false;
        try {
          // Attempt to link same google account to user 1 again or another user
          await db.insert(account).values({
            id: `acc2_${suffix}`,
            userId: testUserId1,
            issuer: 'https://accounts.google.com',
            providerId: 'google',
            accountId: testGoogleId, // Colliding issuer + accountId
          });
        } catch (dupAccErr) {
          duplicateAccountThrown = true;
          assert(isUniqueViolation(dupAccErr), `Expected composite unique violation, got: ${dupAccErr.message}`);
        }

        const duplicateAccountRows = await db.select().from(account).where(eq(account.accountId, testGoogleId));
        assert.strictEqual(duplicateAccountRows.length, 1, 'Database must preserve a single row for a unique issuer/account pair');
        assert.strictEqual(duplicateAccountThrown, true, 'Database must reject duplicate (issuer, accountId) pair');
        recordPass('Composite Unique (issuer, accountId) Constraint', `Rejected duplicate Google account linkage`);
      } catch (err) {
        recordFail('Composite Unique (issuer, accountId) Constraint', err);
      }

      // 4.3 Unique Token Constraint on session table
      try {
        const collidingToken = `colliding_token_${suffix}`;
        await db.insert(session).values({
          id: `sess_tok1_${suffix}`,
          userId: testUserId1,
          token: collidingToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });

        let duplicateTokenThrown = false;
        try {
          await db.insert(session).values({
            id: `sess_tok2_${suffix}`,
            userId: testUserId1,
            token: collidingToken, // Colliding token
            expiresAt: new Date(Date.now() + 3600 * 1000),
          });
        } catch (dupTokErr) {
          duplicateTokenThrown = true;
          assert(isUniqueViolation(dupTokErr), `Expected unique token violation, got: ${dupTokErr.message}`);
        }

        const duplicateTokenRows = await db.select().from(session).where(eq(session.token, collidingToken));
        assert.strictEqual(duplicateTokenRows.length, 1, 'Database must preserve a single row for a unique session token');
        assert.strictEqual(duplicateTokenThrown, true, 'Database must reject duplicate session token');
        recordPass('Unique Session Token Constraint', `Rejected duplicate session token`);
      } catch (err) {
        recordFail('Unique Session Token Constraint', err);
      }

      // 4.4 Cascade Deletion of Sessions & Accounts when User is Deleted
      try {
        // Delete user1
        await db.delete(user).where(eq(user.id, testUserId1));

        // Check if session was deleted
        const remainingSessions = await db.select().from(session).where(eq(session.userId, testUserId1));
        assert.strictEqual(remainingSessions.length, 0, 'Sessions must be deleted when parent user is deleted (CASCADE)');

        // Check if account was deleted
        const remainingAccounts = await db.select().from(account).where(eq(account.userId, testUserId1));
        assert.strictEqual(remainingAccounts.length, 0, 'Accounts must be deleted when parent user is deleted (CASCADE)');

        recordPass('Cascade Deletion Integrity (User -> Session, Account)', 'Cascade deleted all child records upon user deletion');
      } catch (err) {
        recordFail('Cascade Deletion Integrity (User -> Session, Account)', err);
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 5: High Concurrency & Token Collision Stress
    // -------------------------------------------------------------------------
    await runSection('5. High Concurrency & Token Collision Stress', async () => {
      const suffix = crypto.randomBytes(4).toString('hex');
      const testUserId = `usr_conc_${suffix}`;

      try {
        await db.insert(user).values({
          id: testUserId,
          name: `Concurrency User ${suffix}`,
          email: `conc.${suffix}@example.com`,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
        });

        // 5.1 Concurrently create 25 sessions for the same user
        const CONCURRENT_COUNT = 25;
        const sessionPromises = [];
        const sessionIds = [];

        for (let i = 0; i < CONCURRENT_COUNT; i++) {
          const sessId = `sess_conc_${suffix}_${i}`;
          const token = `tok_conc_${suffix}_${i}_${crypto.randomBytes(8).toString('hex')}`;
          sessionIds.push(sessId);
          sessionPromises.push(
            db.insert(session).values({
              id: sessId,
              userId: testUserId,
              token: token,
              expiresAt: new Date(Date.now() + 3600 * 1000),
            })
          );
        }

        const insertResults = await Promise.allSettled(sessionPromises);
        const successfulInserts = insertResults.filter(r => r.status === 'fulfilled').length;
        assert.strictEqual(successfulInserts, CONCURRENT_COUNT, `All ${CONCURRENT_COUNT} concurrent session inserts must succeed`);
        recordPass(`Concurrent Session Creation (${CONCURRENT_COUNT} parallel)`, `Successfully persisted ${successfulInserts}/${CONCURRENT_COUNT} sessions`);

        // 5.2 Concurrently read and validate all sessions
        const readPromises = sessionIds.map(id => db.select().from(session).where(eq(session.id, id)));
        const readResults = await Promise.all(readPromises);
        assert.strictEqual(readResults.every(r => r.length === 1), true, 'All concurrent sessions must be readable');
        recordPass(`Concurrent Session Read & Verification (${CONCURRENT_COUNT} parallel)`, `All ${CONCURRENT_COUNT} sessions verified`);

        // 5.3 Concurrency Race: Multiple simultaneous attempts with the same token
        const raceToken = `race_tok_${suffix}`;
        const racePromises = [0, 1, 2, 3, 4].map(idx =>
          db.insert(session).values({
            id: `sess_race_${suffix}_${idx}`,
            userId: testUserId,
            token: raceToken,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          })
        );

        const raceResults = await Promise.allSettled(racePromises);
        const raceSuccesses = raceResults.filter(r => r.status === 'fulfilled').length;
        const raceRejections = raceResults.filter(r => r.status === 'rejected').length;

        assert.strictEqual(raceSuccesses, 1, 'Exactly ONE insert must succeed for colliding token');
        assert.strictEqual(raceRejections, 4, 'All duplicate concurrent token inserts must be rejected by unique constraint');
        recordPass('Concurrent Token Collision Race Protection', `Exactly 1 winner succeeded, 4 duplicates safely rejected`);

      } catch (err) {
        recordFail('High Concurrency Suite', err);
      } finally {
        await db.delete(user).where(eq(user.id, testUserId)).catch(() => {});
      }
    });

  } finally {
    client.release();
    await pool.end();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT & VERDICT
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('  CHALLENGER 2 EMPIRICAL TEST SUMMARY                                  ');
  console.log('======================================================================');
  console.log(`  Total Passed: ${testResults.passed}`);
  console.log(`  Total Failed: ${testResults.failed}`);

  if (testResults.failed > 0) {
    console.log('\n--- FAILURES ENCOUNTERED ---');
    testResults.errors.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.testName}]: ${f.error}`);
    });
  }

  console.log('\n======================================================================');
  const verdict = testResults.failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES';
  console.log(`  FINAL VERDICT: ${verdict}`);
  console.log('======================================================================\n');

  if (testResults.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal crash in test runner:', err);
  process.exit(1);
});
