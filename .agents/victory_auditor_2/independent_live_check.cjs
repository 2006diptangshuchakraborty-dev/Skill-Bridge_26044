const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;);
    console.log('=== LIVE NEON TABLES IN DATABASE ===');
    const existing = res.rows.map(r => r.table_name);
    existing.forEach(t => console.log('  * ' + t));

    console.log('\n=== TARGET TABLES EXISTENCE CHECK ===');
    const targets = ['user', 'session', 'account', 'verification', 'students', 'industries', 'institutes', 'questions', 'ratings'];
    targets.forEach(t => {
      console.log('  Table ' + t + ': ' + (existing.includes(t) ? 'FOUND' : 'MISSING'));
    });

    console.log('\n=== COLUMN STRUCTURE OF EXISTING TARGET TABLES ===');
    for (const t of targets) {
      if (existing.includes(t)) {
        const cols = await pool.query(SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ' + t + ' ORDER BY ordinal_position;);
        console.log('\nTable ' + t + ' columns:');
        cols.rows.forEach(c => {
          console.log('   - ' + c.column_name + ' (' + c.data_type + ' / ' + c.udt_name + ', nullable: ' + c.is_nullable + ')');
        });
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });