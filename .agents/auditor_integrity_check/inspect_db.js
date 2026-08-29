const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function inspect() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log("ALL TABLES IN PUBLIC SCHEMA:");
    console.log(res.rows.map(r => r.table_name));

    for (const row of res.rows) {
      const colRes = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [row.table_name]);
      console.log(`\nTABLE [${row.table_name}] COLUMNS:`);
      console.log(colRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join(", "));
    }
  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await pool.end();
  }
}

inspect();
