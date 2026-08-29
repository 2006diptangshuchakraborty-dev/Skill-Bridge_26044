require('dotenv').config({ path: '.env' });
const { Pool } = require('@neondatabase/serverless');

async function inspectDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("=== CONNECTING TO LIVE NEON DB ===");
    console.log("DB URL:", process.env.DATABASE_URL?.split('@')[1]);

    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("\n=== EXISTING TABLES (" + tables.length + ") ===");
    console.log(JSON.stringify(tables, null, 2));

    const colsRes = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    console.log("\n=== DETAILED TABLE COLUMNS ===");
    const tableMap = {};
    for (const row of colsRes.rows) {
      if (!tableMap[row.table_name]) tableMap[row.table_name] = [];
      tableMap[row.table_name].push({
        col: row.column_name,
        type: row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type,
        nullable: row.is_nullable,
        default: row.column_default
      });
    }

    for (const [tbl, cols] of Object.entries(tableMap)) {
      console.log(`\nTable [${tbl}] (${cols.length} cols):`);
      for (const col of cols) {
        console.log(`  - ${col.col}: ${col.type} ${col.nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.default ? 'DEFAULT ' + col.default : ''}`);
      }
    }

    // Constraints and Primary Keys
    const constraintsRes = await pool.query(`
      SELECT
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
    `);

    console.log("\n=== TABLE CONSTRAINTS & KEYS ===");
    for (const r of constraintsRes.rows) {
      if (r.constraint_type === 'FOREIGN KEY') {
        console.log(`  [${r.table_name}] FK: ${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name} (${r.constraint_name})`);
      } else if (r.constraint_type === 'PRIMARY KEY') {
        console.log(`  [${r.table_name}] PK: ${r.column_name} (${r.constraint_name})`);
      } else if (r.constraint_type === 'UNIQUE') {
        console.log(`  [${r.table_name}] UNIQUE: ${r.column_name} (${r.constraint_name})`);
      }
    }

  } finally {
    await pool.end();
  }
}

inspectDb().catch(console.error);
