/**
 * Skill Bridge Platform - Milestone 3 Empirical Challenger Harness
 * File: tests/m3-challenger-empirical.ts
 * 
 * Adversarial Testing Suite for Milestone 3 (/api/profile/setup):
 * 1. IDOR & Identity Tampering (userId, user_id, role, protected fields)
 * 2. Validation Edge Cases & Fuzzing (CGPA bounds, Grad Year bounds, premature submission, invalid JSON)
 * 3. High-Concurrency Racing UPSERTs on Neon PostgreSQL (Student, Industry, Institute, Multi-Tenant)
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

// Load environment variables
if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for empirical verification.");
  process.exit(1);
}

// Import live application modules
import { GET, POST, PUT } from "@/app/api/profile/setup/route.js";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db/index.js";
import { eq } from "drizzle-orm";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: Array<{ name: string; error: string }> = [];

async function runTest(name: string, fn: () => Promise<void>) {
  totalTests++;
  const t0 = performance.now();
  try {
    await fn();
    const t1 = performance.now();
    console.log(`  ✔ [PASS] ${name} (${(t1 - t0).toFixed(1)}ms)`);
    passedTests++;
  } catch (err: any) {
    const t1 = performance.now();
    console.error(`  ✖ [FAIL] ${name} (${(t1 - t0).toFixed(1)}ms)`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split("\n").slice(1, 4).join("\n"));
    }
    failedTests++;
    failures.push({ name, error: err.message });
  }
}

function signCookieValue(value: string, secret: string): string {
  const signature = crypto.createHmac("sha256", secret).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

function createMockRequest(url: string, method: string, body: any, sessionToken: string | null, secret: string) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (sessionToken) {
    const signed = signCookieValue(sessionToken, secret);
    headers.set("cookie", `better-auth.session_token=${signed}; sb_session_token=${sessionToken}`);
  }
  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
}

async function main() {
  console.log("======================================================================");
  console.log("  Milestone 3 Empirical Challenger: IDOR, Fuzzing & Concurrency Race  ");
  console.log("======================================================================\n");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  const authCtx = await (auth as any).$context;
  const authSecret = authCtx.secret;

  const createdUserIds: string[] = [];

  async function createTestAccount(role: string, name: string, email: string) {
    const user = await authCtx.internalAdapter.createUser({
      name,
      email,
      role,
      accountStatus: "ACTIVE",
      onboardingStatus: "NOT_STARTED",
      profileCompleted: false,
    });

    // Ensure database role is authoritatively set (Better Auth defaults to STUDENT on create due to input:false)
    await client.query(`UPDATE "user" SET "role" = $1 WHERE "id" = $2`, [role, user.id]);

    const session = await authCtx.internalAdapter.createSession(user.id);
    createdUserIds.push(user.id);

    return {
      userId: user.id,
      token: session.token,
      email,
      role,
      name,
    };
  }

  try {
    // ========================================================================
    // SUITE 1: IDOR & IDENTITY SPOOFING RESISTANCE
    // ========================================================================
    console.log("▶ SUITE 1: IDOR & Identity Spoofing Attack Resistance");

    const studentA = await createTestAccount("STUDENT", "Student Alice", `alice_${Date.now()}@test.edu`);
    const studentB = await createTestAccount("STUDENT", "Student Bob", `bob_${Date.now()}@test.edu`);
    const industryUser = await createTestAccount("INDUSTRY", "TechCorp Recruiter", `recruiter_${Date.now()}@techcorp.com`);
    const instituteUser = await createTestAccount("INSTITUTE", "Apex Dean", `dean_${Date.now()}@apex.ac.in`);

    await runTest("IDOR-01: Unauthenticated GET request is rejected with 401 Unauthorized", async () => {
      const req = createMockRequest("http://localhost:3000/api/profile/setup", "GET", undefined, null, authSecret);
      const res = await GET(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Unauthorized"));
    });

    await runTest("IDOR-02: Unauthenticated POST request is rejected with 401 Unauthorized", async () => {
      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { headline: "Hacker" }, null, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Unauthorized"));
    });

    await runTest("IDOR-03: Student A sending userId=studentB in body does NOT modify Student B (Server uses session.user.id)", async () => {
      // First, create a benign profile for Bob
      await client.query(
        `INSERT INTO "students" ("user_id", "email", "full_name", "headline")
         VALUES ($1, $2, $3, 'Bob Original Headline')`,
        [studentB.userId, studentB.email, studentB.name]
      );

      // Alice tries to overwrite Bob's profile by injecting Bob's userId into the payload
      const maliciousPayload = {
        userId: studentB.userId,
        user_id: studentB.userId,
        id: `fake_id_${Date.now()}`,
        headline: "Alice Malicious Overwrite",
        phone: "+919999988888",
      };

      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", maliciousPayload, studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.profile.userId, studentA.userId, "Saved profile must be tied to Student A");

      // Verify Bob's profile in PostgreSQL was untouched
      const bobCheck = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [studentB.userId]);
      assert.strictEqual(bobCheck.rows.length, 1);
      assert.strictEqual(bobCheck.rows[0].headline, "Bob Original Headline", "Bob's headline must NOT have changed");
      assert.notStrictEqual(bobCheck.rows[0].phone, "+919999988888", "Bob's phone must NOT have changed");

      // Verify Alice's profile was created with her own ID
      const aliceCheck = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [studentA.userId]);
      assert.strictEqual(aliceCheck.rows.length, 1);
      assert.strictEqual(aliceCheck.rows[0].headline, "Alice Malicious Overwrite");
      assert.strictEqual(aliceCheck.rows[0].user_id, studentA.userId);
    });

    await runTest("IDOR-04: Privilege escalation attack (Student injecting role='ADMIN' or role='INDUSTRY') is blocked", async () => {
      const payload = {
        role: "ADMIN",
        companyName: "Fake Admin Corp",
        headline: "Attempted Admin Escalation",
      };

      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.role, "STUDENT", "Response role must remain STUDENT");

      // Verify DB user role is still STUDENT
      const userCheck = await client.query(`SELECT "role" FROM "user" WHERE "id" = $1`, [studentA.userId]);
      assert.strictEqual(userCheck.rows[0].role, "STUDENT", "Database user role must remain STUDENT");

      // Verify no industry profile created for studentA
      const indCheck = await client.query(`SELECT * FROM "industries" WHERE "user_id" = $1`, [studentA.userId]);
      assert.strictEqual(indCheck.rows.length, 0, "Student must not create row in industries table");
    });

    await runTest("IDOR-05: Client tampering with PROTECTED_FIELDS (accountStatus, verificationStatus) is stripped", async () => {
      const payload = {
        accountStatus: "SUSPENDED",
        account_status: "DEACTIVATED",
        verificationStatus: "APPROVED",
        verification_status: "APPROVED",
        headline: "Headline with Tampered Flags",
      };

      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 200);

      // Verify DB user accountStatus was not tampered
      const userCheck = await client.query(`SELECT "account_status" FROM "user" WHERE "id" = $1`, [studentA.userId]);
      assert.strictEqual(userCheck.rows[0].account_status, "ACTIVE", "User account_status must remain ACTIVE");
    });

    // ========================================================================
    // SUITE 2: VALIDATION EDGE CASES & PAYLOAD FUZZING
    // ========================================================================
    console.log("\n▶ SUITE 2: Validation Edge Cases & Payload Fuzzing");

    await runTest("VAL-01: Negative CGPA (-1.5) is rejected with 400 Bad Request", async () => {
      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { cgpa: -1.5 }, studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("Invalid CGPA"));
    });

    await runTest("VAL-02: Negative boundary CGPA (-0.01) is rejected with 400 Bad Request", async () => {
      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { cgpa: "-0.01" }, studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("Invalid CGPA"));
    });

    await runTest("VAL-03: Excessive CGPA (> 10, e.g. 10.01, 15.0, 100) is rejected with 400 Bad Request", async () => {
      for (const badCgpa of [10.01, "15.0", 100, "99.9"]) {
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { cgpa: badCgpa }, studentA.token, authSecret);
        const res = await POST(req);
        assert.strictEqual(res.status, 400, `CGPA ${badCgpa} should return 400`);
        const json = await res.json();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes("Invalid CGPA"));
      }
    });

    await runTest("VAL-04: Non-numeric / NaN / Infinity CGPA is rejected with 400 Bad Request", async () => {
      for (const badCgpa of ["abc", "NaN", "Infinity", "-Infinity"]) {
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { cgpa: badCgpa }, studentA.token, authSecret);
        const res = await POST(req);
        assert.strictEqual(res.status, 400, `Non-numeric CGPA '${badCgpa}' should return 400`);
        const json = await res.json();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes("Invalid CGPA"));
      }
    });

    await runTest("VAL-05: Valid CGPA boundary values (0, 0.00, 10, 10.00, 9.45) are accepted", async () => {
      for (const validCgpa of [0, "0.00", 10, "10.00", 9.45, "8.70"]) {
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { cgpa: validCgpa }, studentA.token, authSecret);
        const res = await POST(req);
        assert.strictEqual(res.status, 200, `Valid CGPA ${validCgpa} should return 200`);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(String(json.profile.cgpa), String(validCgpa));
      }
    });

    await runTest("VAL-06: Out-of-bounds graduation year (< 1950 or > 2100) is rejected with 400 Bad Request", async () => {
      for (const badYear of [1949, 1800, 0, -2026, 2101, 9999, "not_a_year", "NaN"]) {
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { graduationYear: badYear }, studentA.token, authSecret);
        const res = await POST(req);
        assert.strictEqual(res.status, 400, `Year ${badYear} should return 400`);
        const json = await res.json();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes("Invalid graduation year"));
      }
    });

    await runTest("VAL-07: Valid graduation year boundary values (1950, 2026, 2100) are accepted", async () => {
      for (const validYear of [1950, 2026, 2030, 2100]) {
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { graduationYear: validYear }, studentA.token, authSecret);
        const res = await POST(req);
        assert.strictEqual(res.status, 200, `Valid year ${validYear} should return 200`);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.profile.graduationYear, validYear);
      }
    });

    await runTest("VAL-08: Submission gate blocks incomplete profile when action='COMPLETE_ONBOARDING'", async () => {
      const freshStudent = await createTestAccount("STUDENT", "Incomplete Student", `fresh_${Date.now()}@test.edu`);
      const req = createMockRequest(
        "http://localhost:3000/api/profile/setup",
        "POST",
        { action: "COMPLETE_ONBOARDING", headline: "Only headline" },
        freshStudent.token,
        authSecret
      );
      const res = await POST(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("Incomplete profile"));
      assert.ok(Array.isArray(json.missingFields));
    });

    await runTest("VAL-09: Complete profile with action='COMPLETE_ONBOARDING' succeeds and updates user table", async () => {
      const fullStudent = await createTestAccount("STUDENT", "Complete Student", `complete_${Date.now()}@test.edu`);
      const payload = {
        action: "COMPLETE_ONBOARDING",
        fullName: "Complete Student",
        phone: "+919876543210",
        headline: "Senior Software Engineer",
        bio: "Passionate about full-stack engineering",
        instituteName: "NIT Karnataka",
        department: "Computer Science",
        degree: "B.Tech",
        yearOfStudy: "4",
        graduationYear: 2026,
        cgpa: "9.50",
        skills: ["React", "Node.js", "PostgreSQL", "Next.js"],
        projects: [{ title: "Skill Bridge Platform", description: "AI Platform" }],
        certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon" }],
        experience: [{ role: "Full Stack Intern", company: "Tech Labs" }],
        careerPreferences: { preferredRoles: ["Full Stack Developer"] },
        githubUrl: "https://github.com/completestudent",
        linkedinUrl: "https://linkedin.com/in/completestudent",
      };

      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, fullStudent.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.onboardingStatus, "COMPLETED");
      assert.strictEqual(json.profileCompleted, true);

      // Verify PostgreSQL user record has profileCompleted=true and onboardingStatus='COMPLETED'
      const userCheck = await client.query(`SELECT "onboarding_status", "profile_completed" FROM "user" WHERE "id" = $1`, [fullStudent.userId]);
      assert.strictEqual(userCheck.rows[0].onboarding_status, "COMPLETED");
      assert.strictEqual(userCheck.rows[0].profile_completed, true);
    });

    await runTest("VAL-10: Invalid JSON payload returns 400 Bad Request gracefully without 500 crash", async () => {
      const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", "invalid-json-string{{{", studentA.token, authSecret);
      const res = await POST(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes("Invalid JSON"));
    });

    // ========================================================================
    // SUITE 3: HIGH-CONCURRENCY RACING UPSERTs
    // ========================================================================
    console.log("\n▶ SUITE 3: High-Concurrency Racing UPSERTs on Neon PostgreSQL");

    await runTest("CONC-01: 20 simultaneous parallel UPSERTs for same Student maintain exactly 1 row and 0 deadlocks", async () => {
      const raceStudent = await createTestAccount("STUDENT", "Race Student", `race_stu_${Date.now()}@test.edu`);

      const promises = [];
      for (let i = 1; i <= 20; i++) {
        const payload = {
          step: (i % 8) + 1,
          headline: `Race Condition Step ${i}`,
          phone: `+9198000000${i.toString().padStart(2, "0")}`,
          cgpa: (8.0 + (i % 20) * 0.1).toFixed(2),
          graduationYear: 2025 + (i % 4),
          skills: [`Skill_${i}`, "JavaScript", "SQL"],
        };
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, raceStudent.token, authSecret);
        promises.push(POST(req));
      }

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 20);

      // Verify all 20 returned 200 OK
      for (let i = 0; i < results.length; i++) {
        assert.strictEqual(results[i].status, 200, `Request ${i + 1} should return 200`);
      }

      // Verify database has exactly 1 row
      const dbCheck = await client.query(`SELECT * FROM "students" WHERE "user_id" = $1`, [raceStudent.userId]);
      assert.strictEqual(dbCheck.rows.length, 1, "Must maintain exactly 1 row for the student");
      assert.ok(dbCheck.rows[0].headline.startsWith("Race Condition Step"));
    });

    await runTest("CONC-02: 20 simultaneous parallel UPSERTs for same Industry user maintain exactly 1 row and 0 deadlocks", async () => {
      const raceIndustry = await createTestAccount("INDUSTRY", "Race Industry", `race_ind_${Date.now()}@corp.com`);

      const promises = [];
      for (let i = 1; i <= 20; i++) {
        const payload = {
          step: (i % 7) + 1,
          companyName: `Race Corp Batch ${i}`,
          registrationNumber: `CIN_RACE_${i}`,
          taxIdGstin: `29ABCDE1234F1Z${i % 10}`,
          companyType: "Private Limited",
          primaryContactName: `Contact ${i}`,
          primaryContactPhone: `+9198111111${i.toString().padStart(2, "0")}`,
          domainFocus: [`Focus_${i}`, "AI"],
        };
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, raceIndustry.token, authSecret);
        promises.push(POST(req));
      }

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 20);

      for (let i = 0; i < results.length; i++) {
        assert.strictEqual(results[i].status, 200, `Industry Request ${i + 1} should return 200`);
      }

      const dbCheck = await client.query(`SELECT * FROM "industries" WHERE "user_id" = $1`, [raceIndustry.userId]);
      assert.strictEqual(dbCheck.rows.length, 1, "Must maintain exactly 1 row for the industry");
      assert.ok(dbCheck.rows[0].company_name.startsWith("Race Corp Batch"));
    });

    await runTest("CONC-03: 20 simultaneous parallel UPSERTs for same Institute user maintain exactly 1 row and 0 deadlocks", async () => {
      const raceInstitute = await createTestAccount("INSTITUTE", "Race Institute", `race_inst_${Date.now()}@inst.ac.in`);

      const promises = [];
      for (let i = 1; i <= 20; i++) {
        const payload = {
          step: (i % 6) + 1,
          instituteName: `Race Institute of Tech ${i}`,
          aisheCode: `AISHE_RACE_${i}`,
          instituteType: "Autonomous",
          contactPhone: `+9180222222${i.toString().padStart(2, "0")}`,
          departments: [{ name: `Dept_${i}`, code: `D${i}` }],
        };
        const req = createMockRequest("http://localhost:3000/api/profile/setup", "POST", payload, raceInstitute.token, authSecret);
        promises.push(POST(req));
      }

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 20);

      for (let i = 0; i < results.length; i++) {
        assert.strictEqual(results[i].status, 200, `Institute Request ${i + 1} should return 200`);
      }

      const dbCheck = await client.query(`SELECT * FROM "institutes" WHERE "user_id" = $1`, [raceInstitute.userId]);
      assert.strictEqual(dbCheck.rows.length, 1, "Must maintain exactly 1 row for the institute");
      assert.ok(dbCheck.rows[0].institute_name.startsWith("Race Institute of Tech"));
    });

    await runTest("CONC-04: Cross-tenant concurrent operations between Student, Industry, and Institute run in parallel without crosstalk", async () => {
      const pStudent = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { headline: "Parallel Student" }, studentA.token, authSecret);
      const pIndustry = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { companyName: "Parallel Corp" }, industryUser.token, authSecret);
      const pInstitute = createMockRequest("http://localhost:3000/api/profile/setup", "POST", { instituteName: "Parallel University" }, instituteUser.token, authSecret);

      const [resStu, resInd, resInst] = await Promise.all([
        POST(pStudent),
        POST(pIndustry),
        POST(pInstitute),
      ]);

      assert.strictEqual(resStu.status, 200);
      assert.strictEqual(resInd.status, 200);
      assert.strictEqual(resInst.status, 200);

      const sData = await resStu.json();
      const indData = await resInd.json();
      const instData = await resInst.json();

      assert.strictEqual(sData.role, "STUDENT");
      assert.strictEqual(indData.role, "INDUSTRY");
      assert.strictEqual(instData.role, "INSTITUTE");
    });

  } finally {
    // Clean up created test accounts
    if (createdUserIds.length > 0) {
      console.log(`\n🧹 Cleaning up ${createdUserIds.length} test users from Neon PostgreSQL...`);
      for (const uid of createdUserIds) {
        await client.query(`DELETE FROM "students" WHERE "user_id" = $1`, [uid]).catch(() => {});
        await client.query(`DELETE FROM "industries" WHERE "user_id" = $1`, [uid]).catch(() => {});
        await client.query(`DELETE FROM "institutes" WHERE "user_id" = $1`, [uid]).catch(() => {});
        await client.query(`DELETE FROM "session" WHERE "userId" = $1`, [uid]).catch(() => {});
        await client.query(`DELETE FROM "user" WHERE "id" = $1`, [uid]).catch(() => {});
      }
    }
    client.release();
    await pool.end();
  }

  console.log("\n----------------------------------------------------------------------");
  console.log("             M3 EMPIRICAL CHALLENGER EXECUTION SUMMARY                ");
  console.log("----------------------------------------------------------------------");
  console.log(`  Total Tests Executed : ${totalTests}`);
  console.log(`  Passed Tests         : ${passedTests}`);
  console.log(`  Failed Tests         : ${failedTests}`);
  console.log(`  Pass Rate            : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("----------------------------------------------------------------------\n");

  if (failedTests > 0) {
    console.error("FAILURES:");
    for (const f of failures) {
      console.error(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log("🏆 ALL M3 EMPIRICAL CHALLENGES PASSED SUCCESSFULLY (100% HARDENED)!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error running challenger harness:", err);
  process.exit(1);
});
