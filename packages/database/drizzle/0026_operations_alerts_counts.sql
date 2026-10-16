-- Product photos, guided stock counts and daily summary / alert settings.
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.stock_count_sessions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  warehouse_id text NOT NULL,
  status text NOT NULL,
  started_by text NOT NULL,
  posted_by text,
  lines jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_stock_count_sessions_tenant ON public.stock_count_sessions (tenant_id, status);
--> statement-breakpoint
ALTER TABLE public.stock_count_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.stock_count_sessions FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text,
  whatsapp text,
  send_hour integer NOT NULL DEFAULT 20,
  low_stock_at integer NOT NULL DEFAULT 5,
  expiry_days integer NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT false,
  last_sent_day text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.alert_settings FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
