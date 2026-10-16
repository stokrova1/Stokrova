-- Plan subscriptions and the invoices Stokrova issues for them, so renewals and payments survive restarts.
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier text NOT NULL,
  status text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'MONTHLY',
  currency text NOT NULL DEFAULT 'USD',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  trial_ends_at timestamptz,
  billing_override jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.saas_invoices (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  invoice_number text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  subtotal_minor numeric(20,0) NOT NULL,
  tax_minor numeric(20,0) NOT NULL DEFAULT 0,
  total_minor numeric(20,0) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_gateway_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant ON public.saas_invoices (tenant_id, period_start);
--> statement-breakpoint
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS durable_tenant_isolation ON public.tenant_subscriptions;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.tenant_subscriptions FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
--> statement-breakpoint
DROP POLICY IF EXISTS durable_tenant_isolation ON public.saas_invoices;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.saas_invoices FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
