const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name").then(r => { console.log(JSON.stringify(r.rows.map(x => x.table_name), null, 2)); return p.end(); });