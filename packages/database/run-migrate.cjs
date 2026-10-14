const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Client } = require('pg');
const path = require('node:path');

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch (_) {
  try {
    process.loadEnvFile(path.resolve(__dirname, './.env'));
  } catch (_) {
    try {
      process.loadEnvFile(path.resolve(__dirname, '../../.env'));
    } catch (_) {}
  }
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runMigrations() {
  console.log('--- STOKROVA SUPABASE MIGRATION RUNNER ---');
  console.log('Connecting to Supabase host:', connectionString.split('@')[1]?.split('/')[0]);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  const db = drizzle(client);

  const migrationsFolder = path.resolve(__dirname, './drizzle');
  console.log('Applying migrations from folder:', migrationsFolder);

  await migrate(db, { migrationsFolder });

  console.log('--- ALL DRIZZLE MIGRATIONS APPLIED SUCCESSFULLY! ---');

  // Verify total tables and RLS
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(`Total public tables now present: ${tablesRes.rows.length}`);

  const rlsRes = await client.query(`
    SELECT count(*) as count 
    FROM pg_policies 
    WHERE schemaname = 'public';
  `);
  console.log(`Total active RLS policies in public schema: ${rlsRes.rows[0].count}`);

  await client.end();
}

runMigrations().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
