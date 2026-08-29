import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("Connecting to live Neon database...");
    const connCheck = await pool.query("SELECT current_database(), current_user, version()");
    console.log("Connected to DB:", connCheck.rows[0]);

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("\nLive Public Tables in Neon DB:");
    console.log(tablesRes.rows.map(r => r.table_name));

    for (const row of tablesRes.rows) {
      const t = row.table_name;
      const colsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [t]);
      console.log(`\n--- Table: ${t} (${colsRes.rows.length} columns) ---`);
      for (const col of colsRes.rows) {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      }
    }
  } catch (err) {
    console.error("Error inspecting Neon DB:", err);
  } finally {
    await pool.end();
  }
}

run();
