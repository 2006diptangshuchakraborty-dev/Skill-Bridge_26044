import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function probe() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('--- ALL PUBLIC TABLES ---');
    console.log(tablesRes.rows.map(r => r.table_name));

    const authTables = ['user', 'session', 'account', 'verification', 'users', 'sessions', 'accounts', 'verifications'];
    for (const t of authTables) {
      const cols = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [t]);
      if (cols.rows.length > 0) {
        console.log(`\n--- COLUMNS FOR TABLE "${t}" ---`);
        console.table(cols.rows);
      }
    }

    const constraints = await client.query(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        conrelid::regclass AS table_name,
        pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
      ORDER BY table_name, conname;
    `);
    console.log('\n--- CONSTRAINTS ---');
    console.table(constraints.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

probe().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
