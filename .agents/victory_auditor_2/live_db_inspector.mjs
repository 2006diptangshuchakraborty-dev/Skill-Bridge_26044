import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function inspect() {
  console.log("\n === LIVE NEON DB INSPECTOR ===\n");
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log("[1] Tables in public schema (" + tables.length + "):");
  tables.forEach(t => console.log(" - " + t.table_name));

  const targetTables = ['user', 'session', 'account', 'verification', 'students', 'industries', 'institutes', 'questions', 'ratings'];
  console.log("\n[2] Target Tables Check:");
  for (const t of targetTables) {
    const exists = tables.some(row => row.table_name === t);
    console.log(` - ${t}: ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  console.log("\n[3] Target Tables Column Definitions:");
  for (const t of targetTables) {
    const cols = await sql`��SP���[[�ۘ[YK]Wtype, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${t}
      ORDER BY ordinal_position;
    `;
    console.log(`\n--- Table: ${t} (${cols.length} columns) ---`);
    cols.forEach(c => console.log(`   ${c.column_name.padEnd(25)} | ${c.data_type.padEnd(20)} | ${c.udt_name.padEnd(15)} | nullable: ${c.is_nullable} | default: ${c.column_default}`));
  }

  console.log("\n[4] Foreign Key Constraints on Target Tables:");
  const fkeys = await sql`��SP��˝X�Wۘ[YK���K���[[�ۘ[YK���K�X�Wۘ[YHT��ܙZYۗ�X�Wۘ[YK���K���[[�ۘ[YHT��ܙZYۗ���[[�ۘ[YK��˙[]Wܝ[B����H[��ܛX][ۗ���[XK�X�W��ۜ��Z[��T�����S�[��ܛX][ۗ���[XK��^W���[[��\�Y�HT���B�ӈ˘�ۜ��Z[�ۘ[YHH��K��ۜ��Z[�ۘ[YB�S�˝X�W���[XHH��K�X�W���[XB���S�[��ܛX][ۗ���[XK��ۜ��Z[����[[��\�Y�HT���B�ӈ��K��ۜ��Z[�ۘ[YHH˘�ۜ��Z[�ۘ[YB�S���K�X�W���[XHH˝X�W���[XB���S�[��ܛX][ۗ���[XK��Y�\�[�X[��ۜ��Z[��T��ӈ˘�ۜ��Z[�ۘ[YHH�˘�ۜ��Z[�ۘ[YB��T�H˘�ۜ��Z[��\HH	ѓԑRQӈ�VI�S�˝X�W���[XHH	�X�X�ԑT��H˝X�Wۘ[YK��K���[[�ۘ[YN��^\˙�ܑXX�
��O��ۜ��K���	ٚ˝X�Wۘ[Y_K�ٚ˘��[[�ۘ[Y_HO�	ٚ˙�ܙZYۗ�X�Wۘ[Y_K�ٚ˙�ܙZYۗ���[[�ۘ[Y_H�ӈSUN�	ٚ˙[]Wܝ[_WX
NJNB��[��X�

K��]�
\��O��ۜ��K�\��܊�\��܈[��X�[�����\��N���\�˙^]
JNJN�