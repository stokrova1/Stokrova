const { Client } = require('pg');
const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(__dirname, '../../.env'));
  } catch (_) {}
}

async function testPermissiveRls() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const nowEpoch = Date.now();
  const tenantAId = `ten_test_a_${nowEpoch}`;
  const tenantBId = `ten_test_b_${nowEpoch}`;
  const companyAId = `cmp_a_${nowEpoch}`;

  await client.query('BEGIN;');
  try {
    // 1. Recreate policies as PERMISSIVE in this transaction
    await client.query(`
      DROP POLICY IF EXISTS "tenants_isolation_policy" ON "tenants";
      CREATE POLICY "tenants_isolation_policy" ON "tenants"
        AS PERMISSIVE
        FOR ALL
        TO authenticated, anon, public
        USING (
          id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
          OR current_setting('app.is_platform_admin', true) = 'true'
        )
        WITH CHECK (
          id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
          OR current_setting('app.is_platform_admin', true) = 'true'
        );

      DROP POLICY IF EXISTS tenant_isolation_policy ON companies;
      CREATE POLICY tenant_isolation_policy ON companies
        AS PERMISSIVE
        FOR ALL
        TO authenticated, anon, public
        USING (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
          OR current_setting('app.is_platform_admin', true) = 'true'
        )
        WITH CHECK (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
          OR current_setting('app.is_platform_admin', true) = 'true'
        );
    `);

    // 2. Insert tenants as platform admin
    await client.query(`SELECT set_config('app.is_platform_admin', 'true', true);`);
    await client.query(`
      INSERT INTO public.tenants (id, name, slug, status)
      VALUES 
        ($1, 'Alpha Corp', $2, 'ACTIVE'),
        ($3, 'Beta Logistics', $4, 'ACTIVE');
    `, [tenantAId, 'alpha-' + nowEpoch, tenantBId, 'beta-' + nowEpoch]);

    // 3. Switch to authenticated role as Tenant A
    await client.query('SET LOCAL ROLE authenticated;');
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true);`, [tenantAId]);
    await client.query(`SELECT set_config('app.is_platform_admin', 'false', true);`);

    const resA = await client.query(`SELECT id, name FROM public.tenants WHERE id IN ($1, $2);`, [tenantAId, tenantBId]);
    console.log('Tenant A visible tenants:', resA.rows);
    if (resA.rows.length !== 1 || resA.rows[0].id !== tenantAId) {
      throw new Error('Tenant A read isolation failed');
    }
    console.log('  [PASS] Tenant A can ONLY see Tenant A!');

    // 4. Switch to Tenant B
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true);`, [tenantBId]);
    const resB = await client.query(`SELECT id, name FROM public.tenants WHERE id IN ($1, $2);`, [tenantAId, tenantBId]);
    console.log('Tenant B visible tenants:', resB.rows);
    if (resB.rows.length !== 1 || resB.rows[0].id !== tenantBId) {
      throw new Error('Tenant B read isolation failed');
    }
    console.log('  [PASS] Tenant B can ONLY see Tenant B!');

    // 5. Tenant A creates company under Tenant A
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true);`, [tenantAId]);
    await client.query(`
      INSERT INTO public.companies (id, tenant_id, name, currency_code)
      VALUES ($1, $2, 'Alpha UK Ltd', 'GBP');
    `, [companyAId, tenantAId]);
    console.log('  [PASS] Tenant A created company successfully.');

    // 6. Cross-Tenant Insert Attack with SAVEPOINT: Tenant A tries to insert company under Tenant B
    let insertBlocked = false;
    await client.query('SAVEPOINT rls_attack;');
    try {
      await client.query(`
        INSERT INTO public.companies (id, tenant_id, name, currency_code)
        VALUES ($1, $2, 'Hijacked Company', 'USD');
      `, [`cmp_illegal_${nowEpoch}`, tenantBId]);
    } catch (err) {
      insertBlocked = true;
      console.log('  [PASS] Cross-tenant insert was BLOCKED by RLS WITH CHECK policy! Error:', err.message);
      await client.query('ROLLBACK TO SAVEPOINT rls_attack;');
    }
    if (!insertBlocked) {
      throw new Error('Cross-tenant insert was not blocked!');
    }

    // 7. Cross-Tenant Read Attack: Tenant B queries companyA
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true);`, [tenantBId]);
    const resCompB = await client.query(`SELECT id, name FROM public.companies WHERE id = $1;`, [companyAId]);
    console.log('Tenant B visible companies for companyAId:', resCompB.rows);
    if (resCompB.rows.length !== 0) {
      throw new Error('Tenant B was able to see Tenant A company!');
    }
    console.log("  [PASS] Tenant B cannot see Tenant A's company (0 rows returned)!");

    console.log('\n>>> ALL REAL POSTGRESQL RLS ISOLATION ASSERTIONS PASSED WITH FLYING COLORS! <<<');
  } finally {
    await client.query('ROLLBACK;');
  }

  await client.end();
}

testPermissiveRls().catch(console.error);
