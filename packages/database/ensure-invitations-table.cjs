const { Client } = require('pg');
const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(__dirname, '../../.env'));
  } catch (_) {}
}

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.invitations (
      id text PRIMARY KEY,
      tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      email text NOT NULL,
      full_name text NOT NULL,
      role_id text NOT NULL,
      scope jsonb NOT NULL DEFAULT '{}'::jsonb,
      invite_token text NOT NULL UNIQUE,
      delivery_channel text NOT NULL DEFAULT 'SHAREABLE_LINK',
      status text NOT NULL DEFAULT 'PENDING',
      created_at timestamp with time zone NOT NULL DEFAULT NOW(),
      expires_at timestamp with time zone NOT NULL
    );
  `);
  console.log('public.invitations table is ready in live Supabase PostgreSQL!');
  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
