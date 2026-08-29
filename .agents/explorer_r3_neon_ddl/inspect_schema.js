const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();

async function inspect() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = ["user", "session", "verification", "questions", "ratings", "student_profile", "organization_profile", "institute"];
    for (const t of tables) {
      const res = await pool.query(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [t]
      );
      console.log(`\n=== TABLE: ${t} ===`);
      for (const r of res.rows) {
        console.log(`  - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`);
      }
    }
  } finally {
    await pool.end();
  }
}

inspect().catch(console.error);
