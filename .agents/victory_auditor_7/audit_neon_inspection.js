const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function inspectNeon() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = res.rows.map(r => r.table_name);
    console.log('ALL PUBLIC TABLES IN LIVE NEON DB:');
    console.log(JSON.stringify(tableNames, null, 2));

    for (const t of tableNames) {
      const cols = await pool.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [t]);
      console.log(`\n=== TABLE: ${t} ===`);
      cols.rows.forEach(c => {
        console.log(`  - ${c.column_name} (${c.data_type} / ${c.udt_name}) null=${c.is_nullable} def=${c.column_default}`);
      });

      const pks = await pool.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = $1;
      `, [t]);
      console.log(`  PK:`, pks.rows.map(r => r.column_name).join(', '));
    }
  } finally {
    await pool.end();
  }
}

inspectNeon().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
