require(dotenv/config);
const { neon } = require(@neondatabase/serverless);

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log(=== LIVE NEON DB INSPECTION ===);
  const tables = await sql
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  ;
  console.log(Public Tables in Neon:, tables.map(t => t.table_name));

  for (const t of tables) {
    const cols = await sql
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 
      ORDER BY ordinal_position;
    ;
    console.log(\n--- Table:  ---);
    console.table(cols);

    const fkeys = await sql
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ;
    ;
    if (fkeys.length > 0) {
      console.log(Foreign keys for :, fkeys);
    }
  }
}

main().catch(err => {
  console.error(Inspection error:, err);
  process.exit(1);
});