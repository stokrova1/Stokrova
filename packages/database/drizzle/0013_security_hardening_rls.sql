-- Migration: 0013_security_hardening_rls.sql
-- STOKROVA Platform Security Hardening — PostgreSQL Row Level Security (RLS)
-- ADR-020 Compliance & Multi-Tenant Cryptographic Isolation

-- 1. Tenants root table RLS
ALTER TABLE IF EXISTS "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tenants" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_isolation_policy" ON "tenants";
CREATE POLICY "tenants_isolation_policy" ON "tenants"
  AS RESTRICTIVE
  FOR ALL
  USING (
    id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    OR current_setting('app.is_platform_admin', true) = 'true'
  )
  WITH CHECK (
    id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- 2. Explicit Core Tenant Tables RLS
DO $$
DECLARE
  tables text[] := ARRAY[
    'companies', 'branches', 'users', 'user_profiles', 'memberships', 'roles',
    'permissions', 'role_permissions', 'role_assignments', 'products', 'product_variants',
    'categories', 'price_lists', 'price_list_rules', 'tax_rates', 'discount_promotions',
    'stock_balances', 'stock_ledger', 'stock_reservations', 'stock_adjustments',
    'warehouses', 'storage_zones', 'storage_locations', 'orders', 'order_lines',
    'quotations', 'quotation_lines', 'invoices', 'invoice_lines', 'payments',
    'payment_allocations', 'suppliers', 'supplier_contacts', 'purchase_orders',
    'purchase_order_lines', 'goods_receipts', 'goods_receipt_lines', 'supplier_invoices',
    'customers', 'crm_contacts', 'crm_leads', 'crm_opportunities', 'crm_activities',
    'logistics_shipments', 'shipment_items', 'delivery_runs', 'delivery_stops',
    'report_definitions', 'saved_reports', 'report_schedules', 'analytics_dashboards',
    'webhook_endpoints', 'api_keys', 'integration_connections', 'audit_logs'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', t);
      EXECUTE format('CREATE POLICY tenant_isolation_policy ON public.%I AS RESTRICTIVE FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '')::text OR current_setting(''app.is_platform_admin'', true) = ''true'') WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '')::text OR current_setting(''app.is_platform_admin'', true) = ''true'');', t);
    END IF;
  END LOOP;
END $$;

-- 3. Dynamic Safeguard: Enforce RLS across all tables in public schema containing tenant_id
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
    EXECUTE format('CREATE POLICY tenant_isolation_policy ON public.%I AS RESTRICTIVE FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '')::text OR current_setting(''app.is_platform_admin'', true) = ''true'') WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '')::text OR current_setting(''app.is_platform_admin'', true) = ''true'');', tbl.table_name);
  END LOOP;
END $$;
