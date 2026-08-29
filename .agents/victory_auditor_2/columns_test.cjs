const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  for (const tbl of ["user", "session", "student_profile", "organization_profile", "institute", "questions", "ratings"]) {
    const r = await p.query("SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '" + tbl + "' ORDER BY ordinal_position ASC");
    console.log("\n--- TABLE: " + tbl + " ---");
    r.rows.forEach(c => console.log("  " + c.column_name + ": " + c.data_type + " (" + c.udt_name + ") nullable=" + c.is_nullable));
  }
  await p.end();
}
run();