const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();

async function inspectDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("=== PUBLIC SCHEMA TABLES ===");
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("Tables:", tables);

    for (const tbl of tables) {
      console.log(`\n--- Table: ${tbl} ---`);
      const colsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tbl]);
      console.log("Columns:", colsRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`));

      const fkRes = await pool.query(`
        SELECT
          tc.constraint_name, 
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
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [tbl]);
      if (fkRes.rows.length > 0) {
        console.log("Foreign Keys:", fkRes.rows);
      }
    }
  } catch (err) {
    console.error("Error querying DB:", err);
  } finally {
    await pool.end();
  }
}

inspectDb();
