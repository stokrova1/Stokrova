-- Each seller's products and profit, and a history of every price change.
ALTER TABLE public.staff_work_events ADD COLUMN IF NOT EXISTS order_id text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_staff_work_events_order ON public.staff_work_events (tenant_id, order_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.product_price_changes (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  changed_by text NOT NULL,
  old_cost_minor bigint,
  new_cost_minor bigint,
  old_selling_minor bigint NOT NULL,
  new_selling_minor bigint NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_product_price_changes_variant ON public.product_price_changes (tenant_id, variant_id, changed_at);
--> statement-breakpoint
ALTER TABLE public.product_price_changes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.product_price_changes FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
