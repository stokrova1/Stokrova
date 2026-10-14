const { Client } = require('pg');
const https = require('node:https');
const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(__dirname, '../../.env'));
  } catch (e) {
    try {
      process.loadEnvFile(path.resolve(__dirname, './.env'));
    } catch (_) {}
  }
}

async function testHttpsEndpoint() {
  const url = process.env.SUPABASE_URL || 'https://vbtuccvxtgjhaywijmwa.supabase.co';
  console.log('\n--- 1. Testing Supabase HTTPS API Endpoint ---');
  console.log('URL:', url);

  return new Promise((resolve) => {
    https.get(`${url}/auth/v1/health`, (res) => {
      console.log('HTTP Status:', res.statusCode);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('HTTP Response:', data.trim());
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.log('HTTP Request Error:', err.message);
      resolve({ success: false, error: err.message });
    });
  });
}

async function testPgConnection(name, connectionString) {
  console.log(`\n--- Testing ${name} ---`);
  if (!connectionString) {
    console.log('No connection string configured.');
    return { success: false, error: 'Not configured' };
  }

  const masked = connectionString.replace(/:[^:@]+@/, ':***@');
  console.log('Endpoint:', masked);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`[PASS] Connected to ${name} successfully!`);
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log('Database Info:', res.rows[0].current_database, '| User:', res.rows[0].current_user);

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Public tables count:', tables.rows.length);

    const rlsPolicies = await client.query(`
      SELECT count(*) as count 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    console.log('Active RLS policies count:', rlsPolicies.rows[0].count);

    await client.end();
    return { success: true, tablesCount: tables.rows.length, rlsCount: rlsPolicies.rows[0].count };
  } catch (err) {
    console.log(`[FAIL] ${name} connection failed:`, err.message);
    try { await client.end(); } catch (_) {}
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('====================================================');
  console.log('STOKROVA SUPABASE PLATFORM CONNECTIVITY DIAGNOSTIC');
  console.log('====================================================');

  await testHttpsEndpoint();

  const directRes = await testPgConnection('DIRECT_URL', process.env.DIRECT_URL || process.env.DATABASE_URL);
  const sessionRes = await testPgConnection('DATABASE_POOLER_SESSION_URL', process.env.DATABASE_POOLER_SESSION_URL);
  const txRes = await testPgConnection('DATABASE_POOLER_TRANSACTION_URL', process.env.DATABASE_POOLER_TRANSACTION_URL);

  console.log('\n====================================================');
  console.log('DIAGNOSTIC SUMMARY:');
  console.log('Direct DB URL:', directRes.success ? 'CONNECTED' : `FAILED (${directRes.error})`);
  console.log('Session Pooler:', sessionRes.success ? 'CONNECTED' : `FAILED (${sessionRes.error})`);
  console.log('Transaction Pooler:', txRes.success ? 'CONNECTED' : `FAILED (${txRes.error})`);
  console.log('====================================================\n');
}

main().catch(console.error);
