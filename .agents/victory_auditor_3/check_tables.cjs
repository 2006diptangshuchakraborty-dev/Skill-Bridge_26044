const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log("ALL TABLES IN LIVE DB:", r.rows.map(x => x.table_name));
  await pool.end();
}

check().catch(console.error);
