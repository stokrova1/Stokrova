const { Client } = require('pg');
const path = require('path');
process.loadEnvFile(path.resolve(__dirname, '.env'));

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  console.log('=== AUTH.USERS IN SUPABASE ===');
  const authUsers = await client.query('SELECT id, email, raw_app_meta_data, raw_user_meta_data, created_at FROM auth.users');
  console.log(authUsers.rows);

  console.log('=== PUBLIC.TENANTS IN SUPABASE ===');
  const tenants = await client.query('SELECT * FROM public.tenants');
  console.log(tenants.rows);

  console.log('=== PUBLIC.USERS IN SUPABASE ===');
  const users = await client.query('SELECT * FROM public.users');
  console.log(users.rows);

  console.log('=== PUBLIC.MEMBERSHIPS IN SUPABASE ===');
  const memberships = await client.query('SELECT * FROM public.memberships');
  console.log(memberships.rows);

  console.log('=== PUBLIC.ROLES (NON-SYSTEM OR RELEVANT) ===');
  const roles = await client.query('SELECT id, name, code, tenant_id, is_system_template FROM public.roles LIMIT 10');
  console.log(roles.rows);

  console.log('=== PUBLIC.AUDIT_EVENTS ===');
  const audit = await client.query('SELECT count(*) FROM public.audit_events');
  console.log(audit.rows);

  await client.end();
}

main().catch(console.error);
