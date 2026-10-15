const pgPath = require.resolve('pg', { paths: ['./packages/database'] });
const { Pool } = require(pgPath);
const pool = new Pool({
  connectionString: 'postgresql://postgres:Stokrova%23%23%23%2314@db.vbtuccvxtgjhaywijmwa.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  const tables = ['tenants', 'companies', 'branches', 'users', 'user_profiles', 'memberships', 'role_assignments', 'invitations'];
  for (const t of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [t]
    );
    console.log(`=== TABLE: ${t} ===`);
    res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`));
  }

  const authUsers = await pool.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'auth' AND table_name = 'users'
     ORDER BY ordinal_position`
  );
  console.log(`=== TABLE: auth.users ===`);
  authUsers.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`));

  await pool.end();
}
inspect().catch(err => {
  console.error(err);
  pool.end();
});
