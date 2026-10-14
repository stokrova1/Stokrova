-- Migration: 0014_supabase_rls_permissive_stabilization.sql
-- STOKROVA Platform Supabase RLS Permissive Stabilization & Role Privilege Hardening
-- ADR-020 & Supabase Platform Connectivity Compliance

-- 1. Tenants root table RLS Permissive Policy
ALTER TABLE IF EXISTS "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tenants" FORCE ROW LEVEL SECURITY;

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

-- 2. Explicit Core Tenant Tables RLS as PERMISSIVE
DO $$
DECLARE
  tables text[] := ARRAY[
    'companies', 'branches', 'users', 'user_profiles', 'memberships', 'roles',
    'permissions', 'role_permissions', 'role_assignments', 'product_templates', 'product_variants',
    'product_categories', 'price_lists', 'price_list_rules', 'tax_rates', 'discount_promotions',
    'stock_balance_snapshots', 'stock_ledger_entries', 'stock_reservations', 'stock_batches', 'stock_serials',
    'warehouses', 'storage_zones', 'storage_locations', 'sales_orders', 'sales_order_lines',
    'quotations', 'quotation_lines', 'sales_invoices', 'sales_invoice_lines', 'payments',
    'suppliers', 'supplier_contacts', 'purchase_orders', 'purchase_order_lines',
    'goods_receipts', 'goods_receipt_lines', 'purchase_invoices', 'purchase_invoice_lines',
    'customers', 'crm_contacts', 'crm_leads', 'crm_opportunities', 'crm_activities',
    'shipments', 'shipment_lines', 'delivery_runs', 'delivery_stops', 'proof_of_deliveries',
    'report_definitions', 'saved_reports', 'report_schedules', 'analytics_dashboards',
    'webhook_subscriptions', 'developer_api_keys', 'integration_instances', 'audit_events',
    'bill_of_materials', 'bom_lines', 'manufacturing_orders', 'mo_work_orders',
    'pos_registers', 'pos_sessions', 'pos_cash_movements', 'checkout_tenders', 'receipt_prints'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = t 
        AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', t);
      EXECUTE format($sql$
        CREATE POLICY tenant_isolation_policy ON public.%I 
        AS PERMISSIVE 
        FOR ALL 
        TO authenticated, anon, public 
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text OR current_setting('app.is_platform_admin', true) = 'true') 
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text OR current_setting('app.is_platform_admin', true) = 'true');
      $sql$, t);
    END IF;
  END LOOP;
END $$;

-- 3. Dynamic Safeguard: Enforce Permissive RLS across all tables in public schema containing tenant_id
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name NOT IN ('information_schema', 'pg_catalog')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl.table_name);
    EXECUTE format($sql$
      CREATE POLICY tenant_isolation_policy ON public.%I 
      AS PERMISSIVE 
      FOR ALL 
      TO authenticated, anon, public 
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text OR current_setting('app.is_platform_admin', true) = 'true') 
      WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text OR current_setting('app.is_platform_admin', true) = 'true');
    $sql$, tbl.table_name);
  END LOOP;
END $$;

-- 4. Ensure Supabase Auth Roles have Table Privileges for RLS to evaluate
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
