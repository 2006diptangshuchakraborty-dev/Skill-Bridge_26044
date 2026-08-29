require("dotenv").config({ path: ".env" });
const { Pool } = require("@neondatabase/serverless");

async function main() {
  console.log("=== NEON LIVE DATABASE AUDIT SCRIPT ===");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("FAIL: DATABASE_URL not set in .env");
    process.exit(1);
  }
  console.log("DATABASE_URL is present and starts with:", connectionString.substring(0, 20) + "...");

  const pool = new Pool({ connectionString });
  
  try {
    // 1. Connection Ping
    const pingRes = await pool.query("SELECT NOW() as current_time, current_database() as db_name, version()");
    console.log("Ping successful!");
    console.log("Database:", pingRes.rows[0].db_name);
    console.log("Server time:", pingRes.rows[0].current_time);
    console.log("PostgreSQL Version:", pingRes.rows[0].version);

    // 2. Query all tables in public schema
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const existingTables = tablesRes.rows.map(r => r.table_name);
    console.log("\nAll tables in public schema (" + existingTables.length + "):");
    console.log(existingTables);

    // 3. Expected Acceptance Criteria Tables from ORIGINAL_REQUEST.md:
    const expectedTables = [
      "user",
      "session",
      "account",
      "verification",
      "students",
      "industries",
      "institutes",
      "questions",
      "ratings"
    ];

    console.log("\nChecking Acceptance Criteria tables:");
    for (const tbl of expectedTables) {
      const found = existingTables.includes(tbl);
      console.log("  - Table '" + tbl + "': " + (found ? "EXISTS (PASS)" : "MISSING (FAIL)"));
    }

    // 4. Query columns and constraints for each expected table
    console.log("\nTable Column & Constraint Details:");
    for (const tbl of expectedTables) {
      if (existingTables.includes(tbl)) {
        const colRes = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tbl]);
        console.log("\n[Table: " + tbl + "] Columns (" + colRes.rows.length + "):");
        for (const col of colRes.rows) {
          console.log("   * " + col.column_name + " (" + col.data_type + (col.is_nullable === "NO" ? ", NOT NULL" : "") + (col.column_default ? ", DEFAULT " + col.column_default : "") + ")");
        }

        // Foreign keys
        const fkRes = await pool.query(`
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
        `, [tbl]);
        if (fkRes.rows.length > 0) {
          console.log("   Foreign Keys:");
          for (const fk of fkRes.rows) {
            console.log("     -> " + fk.column_name + " -> " + fk.foreign_table_name + "(" + fk.foreign_column_name + ") ON DELETE " + fk.delete_rule);
          }
        }
      }
    }

  } catch (err) {
    console.error("Live DB query error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
