const path = require('node:path');
const { Client } = require(path.resolve(__dirname, '../packages/database/node_modules/pg'));

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(path.resolve(__dirname, '../.env')); } catch (_) {}
}

const client = new Client({
  connectionString: process.env.DATABASE_POOLER_TRANSACTION_URL || process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = false
      ORDER BY tablename;
    `);
    console.log('Total tables without RLS:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
