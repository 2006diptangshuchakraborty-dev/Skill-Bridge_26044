const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = res.rows.map(r => r.table_name);
    console.log('PUBLIC TABLES (', tables.length, '):', tables.join(', '));

    const canonicalExpected = [
      'user',
      'session',
      'account',
      'verification',
      'students',
      'industries',
      'institutes',
      'questions',
      'ratings'
    ];

    console.log('\n--- CANONICAL 9 TABLES CHECK ---');
    for (const t of canonicalExpected) {
      const exists = tables.includes(t);
      console.log(`Table '${t}': ${exists ? 'EXISTS' : 'MISSING'}`);
      if (exists) {
        const cols = await pool.query(`
          SELECT column_name, data_type, udt_name, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `, [t]);
        const pks = await pool.query(`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1;
        `, [t]);
        console.log(`  Columns:`, cols.rows.map(c => `${c.column_name}(${c.udt_name})`).join(', '));
        console.log(`  PK:`, pks.rows.map(r => r.column_name).join(', '));
      }
    }

    console.log('\n--- ALL TABLES DETAIL ---');
    for (const t of tables) {
      const countRes = await pool.query(`SELECT count(*)::int as count FROM "${t}"`);
      console.log(`- ${t} (rows: ${countRes.rows[0].count})`);
    }
  } finally {
    await pool.end();
  }
}

check().catch(console.error);
