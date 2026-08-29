require("dotenv").config({ path: ".env" });
const { Pool } = require("@neondatabase/serverless");

async function inspect() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("LIVE TABLES IN NEON:", JSON.stringify(tablesRes.rows.map(r => r.table_name), null, 2));

    for (const t of tablesRes.rows.map(r => r.table_name)) {
      const cols = await pool.query(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
        [t]
      );
      console.log(`\n=== Table: ${t} ===`);
      console.log(cols.rows.map(c => `${c.column_name} (${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default})`).join("\n"));
    }

    const enumsRes = await pool.query(`
      SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      GROUP BY t.typname
    `);
    console.log("\n=== Custom Enums in DB ===");
    console.log(JSON.stringify(enumsRes.rows, null, 2));

    const fksRes = await pool.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `);
    console.log("\n=== Foreign Keys in DB ===");
    console.log(JSON.stringify(fksRes.rows, null, 2));

  } catch (err) {
    console.error("Inspection error:", err);
  } finally {
    await pool.end();
  }
}

inspect();
