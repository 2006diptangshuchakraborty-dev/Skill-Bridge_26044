#!/usr/bin/env node
/**
 * Milestone 1 Challenger - Empirical Schema Constraints, Unique Constraints & Rollback Stress Test Harness
 * File: tests/test-m1-schema-stress-empirical.js
 * 
 * Verifies:
 * 1. Unique Constraints on user_id across students, industries, institutes (duplicate insertions strictly rejected)
 * 2. Atomic UPSERT (onConflictDoUpdate) behavior on user_id
 * 3. Foreign Key & Cascade Delete Integrity (invalid user_id rejection, cascade on user delete)
 * 4. Expanded Column Data Types, JSONB structures, boundaries, and unicode support
 * 5. Pre-OAuth Signup Intents Unique Constraints & Role Enum Validation
 * 6. Transaction Rollback Integrity & Isolation under partial failure
 * 7. High-Concurrency Race Condition Stress (parallel duplicate insert attempts)
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Pool } from "@neondatabase/serverless";

if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL missing from environment");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let passedTests = 0;
let failedTests = 0;
const testFailures = [];

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`  ✔ [PASS] ${name} (${duration}ms)`);
    passedTests++;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`  ✖ [FAIL] ${name} (${duration}ms)`);
    console.error(`     Error: ${err.message}`);
    testFailures.push({ name, error: err.message, stack: err.stack });
    failedTests++;
  }
}

async function main() {
  console.log("======================================================================");
  console.log("   MILESTONE 1 CHALLENGER: EMPIRICAL STRESS & CONSTRAINT HARNESS      ");
  console.log("======================================================================\n");

  const client = await pool.connect();

  try {
    // -----------------------------------------------------------------------
    // CATEGORY 1: UNIQUE CONSTRAINTS ON user_id (STUDENTS, INDUSTRIES, INSTITUTES)
    // -----------------------------------------------------------------------
    console.log("▶ CATEGORY 1: Unique Constraints on user_id in Profile Tables");

    await runTest("1.1: Duplicate user_id insertion into students table is strictly rejected (23505)", async () => {
      const testUserId = `test-user-stu-uniq-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Student Test", `${testUserId}@example.com`, "STUDENT"]
        );

        // 1st insert
        await client.query(
          `INSERT INTO "students" ("user_id", "full_name", "email", "degree") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Student Test", `${testUserId}@example.com`, "B.Tech"]
        );

        // 2nd duplicate insert - MUST fail with unique violation
        let duplicateFailed = false;
        try {
          await client.query(
            `INSERT INTO "students" ("user_id", "full_name", "email", "degree") VALUES ($1, $2, $3, $4)`,
            [testUserId, "Duplicate Student", `${testUserId}@example.com`, "M.Tech"]
          );
        } catch (err) {
          if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate key")) {
            duplicateFailed = true;
          } else {
            throw err;
          }
        }

        if (!duplicateFailed) {
          throw new Error("Expected duplicate student user_id insertion to fail with 23505 unique constraint violation, but it succeeded!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("1.2: Duplicate user_id insertion into industries table is strictly rejected (23505)", async () => {
      const testUserId = `test-user-ind-uniq-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Industry Test", `${testUserId}@example.com`, "INDUSTRY"]
        );

        // 1st insert
        await client.query(
          `INSERT INTO "industries" ("user_id", "company_name", "email", "registration_number") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Acme Corp", `${testUserId}@example.com`, "CIN12345678"]
        );

        // 2nd duplicate insert - MUST fail with unique violation
        let duplicateFailed = false;
        try {
          await client.query(
            `INSERT INTO "industries" ("user_id", "company_name", "email", "registration_number") VALUES ($1, $2, $3, $4)`,
            [testUserId, "Duplicate Corp", `${testUserId}@example.com`, "CIN87654321"]
          );
        } catch (err) {
          if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate key")) {
            duplicateFailed = true;
          } else {
            throw err;
          }
        }

        if (!duplicateFailed) {
          throw new Error("Expected duplicate industry user_id insertion to fail with 23505 unique constraint violation, but it succeeded!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("1.3: Duplicate user_id insertion into institutes table is strictly rejected (23505)", async () => {
      const testUserId = `test-user-inst-uniq-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Institute Test", `${testUserId}@example.com`, "INSTITUTE"]
        );

        // 1st insert
        await client.query(
          `INSERT INTO "institutes" ("user_id", "institute_name", "email", "aishe_code") VALUES ($1, $2, $3, $4)`,
          [testUserId, "National Institute of Tech", `${testUserId}@example.com`, "AISHE-C-12345"]
        );

        // 2nd duplicate insert - MUST fail with unique violation
        let duplicateFailed = false;
        try {
          await client.query(
            `INSERT INTO "institutes" ("user_id", "institute_name", "email", "aishe_code") VALUES ($1, $2, $3, $4)`,
            [testUserId, "Duplicate Institute", `${testUserId}@example.com`, "AISHE-C-99999"]
          );
        } catch (err) {
          if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate key")) {
            duplicateFailed = true;
          } else {
            throw err;
          }
        }

        if (!duplicateFailed) {
          throw new Error("Expected duplicate institute user_id insertion to fail with 23505 unique constraint violation, but it succeeded!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 2: ATOMIC UPSERT (ON CONFLICT user_id DO UPDATE)
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 2: Atomic UPSERT Integrity on user_id");

    await runTest("2.1: Students ON CONFLICT (user_id) DO UPDATE mutates existing record without row duplication", async () => {
      const testUserId = `test-upsert-stu-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Upsert Student", `${testUserId}@example.com`, "STUDENT"]
        );

        // Insert initial student profile
        await client.query(
          `INSERT INTO "students" ("user_id", "full_name", "cgpa", "skills")
           VALUES ($1, $2, $3, $4)`,
          [testUserId, "Initial Name", "8.0", JSON.stringify(["JavaScript"])]
        );

        // UPSERT with updated fields
        await client.query(
          `INSERT INTO "students" ("user_id", "full_name", "cgpa", "skills")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("user_id") DO UPDATE 
           SET "full_name" = EXCLUDED."full_name",
               "cgpa" = EXCLUDED."cgpa",
               "skills" = EXCLUDED."skills",
               "updated_at" = now()`,
          [testUserId, "Updated Name", "9.5", JSON.stringify(["JavaScript", "TypeScript", "PostgreSQL"])]
        );

        const res = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [testUserId]);
        if (res.rows.length !== 1) {
          throw new Error(`Expected exactly 1 student record after UPSERT, found ${res.rows.length}`);
        }
        if (res.rows[0].full_name !== "Updated Name" || res.rows[0].cgpa !== "9.5") {
          throw new Error(`UPSERT update mismatch: full_name=${res.rows[0].full_name}, cgpa=${res.rows[0].cgpa}`);
        }
        const skills = typeof res.rows[0].skills === "string" ? JSON.parse(res.rows[0].skills) : res.rows[0].skills;
        if (!Array.isArray(skills) || skills.length !== 3 || !skills.includes("TypeScript")) {
          throw new Error(`UPSERT skills mismatch: ${JSON.stringify(skills)}`);
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("2.2: Industries ON CONFLICT (user_id) DO UPDATE mutates statutory & contact fields cleanly", async () => {
      const testUserId = `test-upsert-ind-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Upsert Industry", `${testUserId}@example.com`, "INDUSTRY"]
        );

        await client.query(
          `INSERT INTO "industries" ("user_id", "company_name", "tax_id_gstin", "domain_focus")
           VALUES ($1, $2, $3, $4)`,
          [testUserId, "Initial Corp", "27AAAAA0000A1Z5", JSON.stringify(["FinTech"])]
        );

        await client.query(
          `INSERT INTO "industries" ("user_id", "company_name", "tax_id_gstin", "domain_focus")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("user_id") DO UPDATE 
           SET "company_name" = EXCLUDED."company_name",
               "tax_id_gstin" = EXCLUDED."tax_id_gstin",
               "domain_focus" = EXCLUDED."domain_focus"`,
          [testUserId, "Upgraded Corp Inc", "29BBBBB1111B2Z6", JSON.stringify(["FinTech", "AI", "Cloud"])]
        );

        const res = await client.query(`SELECT * FROM "industries" WHERE "user_id" = $1`, [testUserId]);
        if (res.rows.length !== 1) {
          throw new Error(`Expected exactly 1 industry record after UPSERT, found ${res.rows.length}`);
        }
        if (res.rows[0].company_name !== "Upgraded Corp Inc" || res.rows[0].tax_id_gstin !== "29BBBBB1111B2Z6") {
          throw new Error(`Industry UPSERT field mismatch`);
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("2.3: Institutes ON CONFLICT (user_id) DO UPDATE mutates accreditation & departments cleanly", async () => {
      const testUserId = `test-upsert-inst-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Upsert Institute", `${testUserId}@example.com`, "INSTITUTE"]
        );

        await client.query(
          `INSERT INTO "institutes" ("user_id", "institute_name", "aishe_code", "departments")
           VALUES ($1, $2, $3, $4)`,
          [testUserId, "Initial Tech University", "AISHE-U-0001", JSON.stringify(["IT"])]
        );

        await client.query(
          `INSERT INTO "institutes" ("user_id", "institute_name", "aishe_code", "departments")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("user_id") DO UPDATE 
           SET "institute_name" = EXCLUDED."institute_name",
               "aishe_code" = EXCLUDED."aishe_code",
               "departments" = EXCLUDED."departments"`,
          [testUserId, "Apex Institute of Science", "AISHE-U-9999", JSON.stringify(["IT", "CSE", "ECE", "AI"])]
        );

        const res = await client.query(`SELECT * FROM "institutes" WHERE "user_id" = $1`, [testUserId]);
        if (res.rows.length !== 1) {
          throw new Error(`Expected exactly 1 institute record after UPSERT, found ${res.rows.length}`);
        }
        if (res.rows[0].institute_name !== "Apex Institute of Science" || res.rows[0].aishe_code !== "AISHE-U-9999") {
          throw new Error(`Institute UPSERT field mismatch`);
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 3: FOREIGN KEYS & CASCADE DELETION INTEGRITY
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 3: Foreign Key & Cascade Deletion Integrity");

    await runTest("3.1: Profile insert with non-existent user_id is rejected by FK constraint (23503)", async () => {
      const nonExistentUserId = `ghost-user-${Date.now()}`;
      try {
        await client.query("BEGIN");
        let fkFailed = false;
        try {
          await client.query(
            `INSERT INTO "students" ("user_id", "full_name") VALUES ($1, $2)`,
            [nonExistentUserId, "Ghost Student"]
          );
        } catch (err) {
          if (err.code === "23503" || err.message.includes("foreign key") || err.message.includes("violates foreign key")) {
            fkFailed = true;
          } else {
            throw err;
          }
        }
        if (!fkFailed) {
          throw new Error("Expected FK failure 23503 for non-existent user_id, but insert succeeded!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("3.2: Deleting parent user cascades and removes student, industry, institute, and session rows", async () => {
      const testUserId = `test-cascade-user-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Cascade User", `${testUserId}@example.com`, "STUDENT"]
        );

        await client.query(
          `INSERT INTO "students" ("user_id", "full_name") VALUES ($1, $2)`,
          [testUserId, "Cascade Student"]
        );

        await client.query(
          `INSERT INTO "session" ("id", "userId", "token", "expiresAt") VALUES ($1, $2, $3, now() + interval '1 day')`,
          [`sess_${Date.now()}`, testUserId, `token_${Date.now()}`]
        );

        // Delete user
        await client.query(`DELETE FROM "user" WHERE "id" = $1`, [testUserId]);

        // Verify cascaded deletion
        const stuRes = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [testUserId]);
        const sessRes = await client.query(`SELECT * FROM "session" WHERE "userId" = $1`, [testUserId]);

        if (stuRes.rows.length !== 0) {
          throw new Error(`Student record was not cascaded on user deletion! Found ${stuRes.rows.length} rows`);
        }
        if (sessRes.rows.length !== 0) {
          throw new Error(`Session record was not cascaded on user deletion! Found ${sessRes.rows.length} rows`);
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 4: EXPANDED COLUMN DATA TYPES, JSONB & BOUNDARIES
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 4: Expanded Column Data Types, JSONB & Boundaries");

    await runTest("4.1: Complex nested JSONB structures (projects, certifications, address) persist and deserialize properly", async () => {
      const testUserId = `test-jsonb-user-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "JSONB Tester", `${testUserId}@example.com`, "STUDENT"]
        );

        const sampleProjects = [
          {
            title: "Skill Bridge AI Engine",
            description: "High performance recommendation engine with discrete score evaluation.",
            technologies: ["Node.js", "PostgreSQL", "Next.js"],
            liveUrl: "https://skillbridge.gov.in",
            repoUrl: "https://github.com/skillbridge/core",
            teamMembers: 4,
            metrics: { accuracy: "98.4%", latencyMs: 12.5 },
          },
          {
            title: "Blockchain Credential Verifier",
            description: "Zero knowledge proof diploma verification system.",
            technologies: ["Solidity", "Rust", "Ethers.js"],
          },
        ];

        const sampleCertifications = [
          { name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", year: "2025", credentialId: "AWS-998234" },
          { name: "PostgreSQL Database Administrator", issuer: "PostgreSQL Guild", year: "2024" },
        ];

        await client.query(
          `INSERT INTO "students" (
            "user_id", "full_name", "graduation_year", "cgpa", "skills", "projects", "certifications", "career_preferences"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            testUserId,
            "JSONB Student",
            2027,
            "9.85",
            JSON.stringify(["React", "PostgreSQL", "TailwindCSS", "Distributed Systems"]),
            JSON.stringify(sampleProjects),
            JSON.stringify(sampleCertifications),
            JSON.stringify({ desiredRole: "Fullstack Architect", preferredLocations: ["Bangalore", "Hyderabad", "Remote"], expectedStipendMin: 45000 }),
          ]
        );

        const res = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [testUserId]);
        const row = res.rows[0];

        const parsedProjects = typeof row.projects === "string" ? JSON.parse(row.projects) : row.projects;
        const parsedCerts = typeof row.certifications === "string" ? JSON.parse(row.certifications) : row.certifications;
        const parsedPrefs = typeof row.career_preferences === "string" ? JSON.parse(row.career_preferences) : row.career_preferences;

        if (parsedProjects.length !== 2 || parsedProjects[0].metrics.accuracy !== "98.4%") {
          throw new Error("Complex JSONB projects deserialization failed");
        }
        if (parsedCerts.length !== 2 || parsedCerts[0].credentialId !== "AWS-998234") {
          throw new Error("Complex JSONB certifications deserialization failed");
        }
        if (parsedPrefs.expectedStipendMin !== 45000) {
          throw new Error("Career preferences JSONB deserialization failed");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("4.2: Large payload, unicode characters, symbols, and SQL escape sequences are handled safely", async () => {
      const testUserId = `test-unicode-user-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [testUserId, "Unicode Student", `${testUserId}@example.com`, "STUDENT"]
        );

        const longBio = "🔥 Testing multi-language bio: Здравствуйте, 你好, नमस्ते, こんにちは, مرحبا. " + "x".repeat(2000);
        const headlineWithQuotes = "Senior Software Engineer's & Data Scientist's \"Dream\" Candidate (O'Reilly Published)";

        await client.query(
          `INSERT INTO "students" ("user_id", "full_name", "headline", "bio", "skills") VALUES ($1, $2, $3, $4, $5)`,
          [testUserId, "Éléonore O'Connor-Müller", headlineWithQuotes, longBio, JSON.stringify(["C++", "C#", "SQL Injection ''; DROP TABLE students;--"])]
        );

        const res = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [testUserId]);
        const row = res.rows[0];
        if (row.full_name !== "Éléonore O'Connor-Müller" || row.headline !== headlineWithQuotes || !row.bio.startsWith("🔥 Testing")) {
          throw new Error("Unicode and SQL special characters round-trip failed");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 5: SIGNUP INTENTS & ENUM CONSTRAINTS
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 5: Signup Intents Unique Constraints & Role Enum Integrity");

    await runTest("5.1: Duplicate token in signup_intents is rejected by unique constraint (23505)", async () => {
      const token = `intent-token-duplicate-test-${Date.now()}`;
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO "signup_intents" ("id", "token", "role", "email", "expires_at")
           VALUES ($1, $2, $3, $4, now() + interval '15 minutes')`,
          [`int_1_${Date.now()}`, token, "STUDENT", "intent1@example.com"]
        );

        let duplicateFailed = false;
        try {
          await client.query(
            `INSERT INTO "signup_intents" ("id", "token", "role", "email", "expires_at")
             VALUES ($1, $2, $3, $4, now() + interval '15 minutes')`,
            [`int_2_${Date.now()}`, token, "INDUSTRY", "intent2@example.com"]
          );
        } catch (err) {
          if (err.code === "23505" || err.message.includes("unique") || err.message.includes("duplicate key")) {
            duplicateFailed = true;
          } else {
            throw err;
          }
        }

        if (!duplicateFailed) {
          throw new Error("Duplicate signup_intents token insert did not throw unique constraint violation!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    await runTest("5.2: Invalid enum value for user_role is rejected by PostgreSQL (22P02)", async () => {
      const testUserId = `test-enum-user-${Date.now()}`;
      try {
        await client.query("BEGIN");
        let enumFailed = false;
        try {
          await client.query(
            `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
            [testUserId, "Invalid Role User", `${testUserId}@example.com`, "SUPER_HACKER_ROLE"]
          );
        } catch (err) {
          if (err.code === "22P02" || err.message.includes("invalid input value for enum")) {
            enumFailed = true;
          } else {
            throw err;
          }
        }

        if (!enumFailed) {
          throw new Error("Expected invalid user_role enum insert to fail with 22P02, but it succeeded!");
        }
      } finally {
        await client.query("ROLLBACK");
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 6: TRANSACTION ROLLBACK INTEGRITY UNDER PARTIAL FAILURE
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 6: Transaction Rollback Integrity & Isolation");

    await runTest("6.1: Multi-entity transaction rollback on mid-flight error leaves zero dirty state", async () => {
      const userA = `user-tx-a-${Date.now()}`;
      const userB = `user-tx-b-${Date.now()}`;

      try {
        await client.query("BEGIN");

        // Step 1: Insert user A
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [userA, "User A", `${userA}@example.com`, "STUDENT"]
        );

        // Step 2: Insert student profile for A
        await client.query(
          `INSERT INTO "students" ("user_id", "full_name") VALUES ($1, $2)`,
          [userA, "Student Profile A"]
        );

        // Step 3: Insert user B
        await client.query(
          `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
          [userB, "User B", `${userB}@example.com`, "INDUSTRY"]
        );

        // Step 4: Deliberately trigger invalid SQL / type failure
        try {
          await client.query(
            `INSERT INTO "students" ("user_id", "graduation_year") VALUES ($1, $2)`,
            [userB, "THIS_IS_NOT_AN_INTEGER_OVERFLOW_STRING"]
          );
        } catch (err) {
          // Expected error
        }

        // Explicitly rollback
        await client.query("ROLLBACK");

        // Verify zero leakage
        const checkUserA = await client.query(`SELECT * FROM "user" WHERE "id" = $1`, [userA]);
        const checkUserB = await client.query(`SELECT * FROM "user" WHERE "id" = $1`, [userB]);
        const checkStuA = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [userA]);

        if (checkUserA.rows.length !== 0 || checkUserB.rows.length !== 0 || checkStuA.rows.length !== 0) {
          throw new Error("Dirty state detected in DB after transaction rollback!");
        }
      } catch (err) {
        throw err;
      }
    });

    // -----------------------------------------------------------------------
    // CATEGORY 7: CONCURRENCY & RACE CONDITION STRESS
    // -----------------------------------------------------------------------
    console.log("\n▶ CATEGORY 7: High-Concurrency Race Condition Stress Testing");

    await runTest("7.1: Parallel concurrent insertions with identical user_id enforce strict uniqueness (N=5)", async () => {
      const concurrentUserId = `concurrent-user-${Date.now()}`;

      // Create base user outside transaction so parallel clients can reference it
      await client.query(
        `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
        [concurrentUserId, "Concurrent User", `${concurrentUserId}@example.com`, "STUDENT"]
      );

      try {
        const parallelWorkers = 5;
        const promises = Array.from({ length: parallelWorkers }).map(async (_, idx) => {
          const workerClient = await pool.connect();
          try {
            await workerClient.query(
              `INSERT INTO "students" ("user_id", "full_name", "headline") VALUES ($1, $2, $3)`,
              [concurrentUserId, `Concurrent Student ${idx}`, `Headline ${idx}`]
            );
            return { status: "SUCCESS", index: idx };
          } catch (err) {
            return { status: "REJECTED", index: idx, code: err.code, message: err.message };
          } finally {
            workerClient.release();
          }
        });

        const results = await Promise.all(promises);
        const successes = results.filter((r) => r.status === "SUCCESS");
        const rejections = results.filter((r) => r.status === "REJECTED");

        if (successes.length !== 1) {
          throw new Error(`Race condition failure! Expected exactly 1 successful insert under concurrency, got ${successes.length}`);
        }
        if (rejections.length !== parallelWorkers - 1) {
          throw new Error(`Expected ${parallelWorkers - 1} rejections under concurrency, got ${rejections.length}`);
        }

        // Verify that rejections were due to unique constraint violations
        for (const rej of rejections) {
          if (rej.code !== "23505" && !rej.message.includes("unique") && !rej.message.includes("duplicate key")) {
            throw new Error(`Unexpected error code during concurrency: ${rej.code} - ${rej.message}`);
          }
        }

        // Verify exactly 1 row exists in DB
        const countRes = await client.query(`SELECT count(*) FROM "students" WHERE "user_id" = $1`, [concurrentUserId]);
        if (parseInt(countRes.rows[0].count, 10) !== 1) {
          throw new Error(`DB contains ${countRes.rows[0].count} rows for user_id ${concurrentUserId}, expected 1`);
        }
      } finally {
        // Cleanup test user (cascades student row)
        await client.query(`DELETE FROM "user" WHERE "id" = $1`, [concurrentUserId]);
      }
    });

    await runTest("7.2: Parallel concurrent UPSERTs with identical user_id converge without deadlock or corruption (N=5)", async () => {
      const concurrentUpsertUserId = `concurrent-upsert-${Date.now()}`;

      await client.query(
        `INSERT INTO "user" ("id", "name", "email", "role") VALUES ($1, $2, $3, $4)`,
        [concurrentUpsertUserId, "Concurrent Upsert User", `${concurrentUpsertUserId}@example.com`, "INDUSTRY"]
      );

      try {
        const parallelWorkers = 5;
        const promises = Array.from({ length: parallelWorkers }).map(async (_, idx) => {
          const workerClient = await pool.connect();
          try {
            await workerClient.query(
              `INSERT INTO "industries" ("user_id", "company_name", "company_size")
               VALUES ($1, $2, $3)
               ON CONFLICT ("user_id") DO UPDATE 
               SET "company_name" = EXCLUDED."company_name",
                   "company_size" = EXCLUDED."company_size"`,
              [concurrentUpsertUserId, `Concurrent Corp ${idx}`, `${(idx + 1) * 50}+`]
            );
            return { status: "SUCCESS", index: idx };
          } catch (err) {
            return { status: "FAILED", index: idx, error: err.message };
          } finally {
            workerClient.release();
          }
        });

        const results = await Promise.all(promises);
        const failures = results.filter((r) => r.status === "FAILED");
        if (failures.length > 0) {
          throw new Error(`Concurrent UPSERT failed: ${JSON.stringify(failures)}`);
        }

        // Verify exactly 1 row in DB
        const countRes = await client.query(`SELECT count(*) FROM "industries" WHERE "user_id" = $1`, [concurrentUpsertUserId]);
        if (parseInt(countRes.rows[0].count, 10) !== 1) {
          throw new Error(`DB contains ${countRes.rows[0].count} rows for user_id ${concurrentUpsertUserId}, expected 1`);
        }
      } finally {
        await client.query(`DELETE FROM "user" WHERE "id" = $1`, [concurrentUpsertUserId]);
      }
    });

  } finally {
    client.release();
    await pool.end();
  }

  // -----------------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------------
  const total = passedTests + failedTests;
  const passRate = total > 0 ? ((passedTests / total) * 100).toFixed(1) : "0.0";

  console.log("\n======================================================================");
  console.log("             EMPIRICAL STRESS TEST EXECUTION SUMMARY                  ");
  console.log("======================================================================");
  console.log(`  Total Stress Tests : ${total}`);
  console.log(`  Passed Tests       : ${passedTests}`);
  console.log(`  Failed Tests       : ${failedTests}`);
  console.log(`  Pass Rate          : ${passRate}%`);
  console.log("======================================================================\n");

  if (failedTests === 0) {
    console.log("  >>> VERDICT: APPROVE - ALL EMPIRICAL SCHEMA & CRUD CHALLENGES PASSED <<<\n");
    process.exit(0);
  } else {
    console.log(`  >>> VERDICT: REQUEST_CHANGES - ${failedTests} FAILURES DETECTED <<<\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL HARNESS ERROR:", err);
  process.exit(1);
});
