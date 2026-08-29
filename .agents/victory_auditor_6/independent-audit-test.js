require("dotenv").config({ path: ".env" });
const { Pool } = require("@neondatabase/serverless");

async function runIndependentAudit() {
  console.log("================================================================================");
  console.log("       INDEPENDENT NEON DATABASE & DRIZZLE SCHEMA AUDIT (ROUND 6)              ");
  console.log("================================================================================\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const report = {
    connected: false,
    publicTables: [],
    expected9Tables: {
      user: false,
      session: false,
      account: false,
      verification: false,
      students: false,
      industries: false,
      institutes: false,
      questions: false,
      ratings: false,
    },
    tableDetails: {},
  };

  try {
    // 1. Connection check
    const conn = await pool.query("SELECT current_database(), current_user, version()");
    report.connected = true;
    console.log(`[DB] Connected successfully to database: ${conn.rows[0].current_database} as ${conn.rows[0].current_user}`);

    // 2. Fetch all public tables
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    report.publicTables = tablesRes.rows.map(r => r.table_name);
    console.log(`[DB] Public tables present (${report.publicTables.length}):`, report.publicTables.join(", "));

    // 3. Check each of the 9 required Drizzle tables
    for (const tbl of Object.keys(report.expected9Tables)) {
      report.expected9Tables[tbl] = report.publicTables.includes(tbl);
      console.log(`  - Table '${tbl}': ${report.expected9Tables[tbl] ? "EXISTS" : "MISSING"}`);
    }

    // 4. Inspect columns and PKs for relevant tables
    for (const tbl of ["user", "session", "account", "verification", "students", "student_profile", "industries", "organization_profile", "institutes", "institute", "questions", "ratings"]) {
      if (report.publicTables.includes(tbl)) {
        const colsRes = await pool.query(
          "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
          [tbl]
        );
        const pkRes = await pool.query(`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = $1
        `, [tbl]);

        report.tableDetails[tbl] = {
          columns: colsRes.rows.map(c => `${c.column_name} (${c.data_type})`),
          primaryKey: pkRes.rows.map(p => p.column_name),
        };
      }
    }

    console.log("\n[DB] Table Column & Primary Key Details:");
    console.log(JSON.stringify(report.tableDetails, null, 2));

  } catch (err) {
    console.error("[DB] Error during audit:", err);
  } finally {
    await pool.end();
  }
}

runIndependentAudit().catch(console.error);
