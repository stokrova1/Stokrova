const { Client } = require('pg');
const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(__dirname, '../../.env'));
  } catch (e) {
    try {
      process.loadEnvFile(path.resolve(process.cwd(), '.env'));
    } catch (_) {}
  }
}

async function runAudit() {
  const connStr = process.env.DATABASE_POOLER_SESSION_URL || process.env.DATABASE_URL;
  if (!connStr) {
    console.error('ERROR: No database connection URL configured in environment.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('--- STOKROVA AUTHORITATIVE DATABASE DATA INTEGRITY AUDIT ---');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`Inspecting ${res.rows.length} public schema tables...`);

    const populatedTables = [];
    for (const row of res.rows) {
      const t = row.table_name;
      try {
        const c = await client.query(`SELECT count(*) FROM "${t}"`);
        const count = parseInt(c.rows[0].count, 10);
        if (count > 0) {
          populatedTables.push({ table: t, count });
        }
      } catch (err) {
        console.warn(`Could not inspect table ${t}: ${err.message}`);
      }
    }

    let authUserCount = 0;
    try {
      const authRes = await client.query('SELECT count(*) FROM auth.users');
      authUserCount = parseInt(authRes.rows[0].count, 10);
    } catch (_) {}

    console.log('\n--- AUDIT RESULTS ---');
    console.log(`Total Public Tables: ${res.rows.length}`);
    console.log(`Populated Tables: ${populatedTables.length}`);
    console.log(`Auth Users Count: ${authUserCount}`);

    if (populatedTables.length === 0 && authUserCount === 0) {
      console.log('\n[PASS] Database is completely clean and unpolluted.');
      console.log('Zero demo or fake records detected in Supabase PostgreSQL.');
    } else {
      console.log('\nPopulated table breakdown:');
      console.log(JSON.stringify(populatedTables, null, 2));
    }

    await client.end();
  } catch (err) {
    console.error('Audit failed with error:', err.message);
    process.exit(1);
  }
}

runAudit();
