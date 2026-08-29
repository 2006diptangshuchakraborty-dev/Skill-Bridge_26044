import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectDb() {
  console.log("Connecting to live Neon database...");
  const ping = await pool.query("SELECT 1 AS heartbeat, current_database(), current_user, version();");
  console.log("Connection successful!");
  console.log("Database info:", ping.rows[0]);

  const tablesRes = await pool.query(`
    SELECT table_name, table_type 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log(`\nFound ${tablesRes.rows.length} tables in public schema:`);
  for (const row of tablesRes.rows) {
    const colsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [row.table_name]);
    console.log(`\nTable: "${row.table_name}" (${colsRes.rows.length} columns)`);
    for (const c of colsRes.rows) {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    }
  }

  await pool.end();
}

inspectDb().catch(err => {
  console.error("Inspection error:", err);
  process.exit(1);
});
