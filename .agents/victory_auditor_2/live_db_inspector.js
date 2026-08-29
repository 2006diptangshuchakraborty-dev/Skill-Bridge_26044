import dotenv/config;
import { neon } from @neondatabase/serverless;

const sql = neon(process.env.DATABASE_URL);

async function inspect() {
  console.log(=== LIVE NEON DB INSPECTOR ===);
  
  // 1. Tables in public schema
  const tables = await sql
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  ;
  console.log(\n[1] Tables in public schema ( + tables.length + ):);
  tables.forEach(t => console.log( -  + t.table_name));

  // 2. Inspect target tables specifically
  const targetTables = ['user', 'session', 'account', 'verification', 'students', 'industries', 'institutes', 'questions', 'ratings'];
  console.log(\n[2] Target Tables Check:);
  for (const t of targetTables) {
    const exists = tables.some(row => row.table_name === t);
    console.log( - : );
  }

  // 3. For existing target tables, inspect columns and types
  console.log(\n[3] Target Tables Column Definitions:);
  for (const t of targetTables) {
    const cols = await sql
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 
      ORDER BY ordinal_position;
    ;
    console.log(\n--- Table:  ( columns) ---);
    cols.forEach(c => console.log(    |  |  | nullable:  | default: ));
  }

  // 4. Inspect Foreign Key Constraints
  console.log(\n[4] Foreign Key Constraints on Target Tables:);
  const fkeys = await sql
    SELECT
      tc.table_name, 
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
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  ;
  fkeys.forEach(fk => {
    console.log(   . -> . [ON DELETE: ]);
  });
}

inspect().catch(err => {
  console.error(Error inspecting DB:, err);
  process.exit(1);
});