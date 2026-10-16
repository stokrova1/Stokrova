-- Plans are enforced: founder grants on top of a business's plan, and a history of every plan change.
-- Additive and idempotent. Retired plans (Solo Trader, Custom) are moved to the plans that are sold.
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_grants jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.plan_change_history (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_tier text NOT NULL,
  to_tier text NOT NULL,
  changed_by text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_plan_change_history_tenant ON public.plan_change_history (tenant_id, created_at);
--> statement-breakpoint
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS durable_tenant_isolation ON public.plan_change_history;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.plan_change_history FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
--> statement-breakpoint
ALTER TABLE public.tenants ALTER COLUMN subscription_tier SET DEFAULT 'RETAIL_STARTER';
--> statement-breakpoint
UPDATE public.tenants SET subscription_tier = 'RETAIL_STARTER' WHERE subscription_tier = 'SOLO_TRADER';
--> statement-breakpoint
UPDATE public.tenants SET subscription_tier = 'ENTERPRISE_LOGISTICS' WHERE subscription_tier = 'CUSTOM';
--> statement-breakpoint
UPDATE public.tenant_subscriptions SET tier = 'RETAIL_STARTER' WHERE tier = 'SOLO_TRADER';
--> statement-breakpoint
UPDATE public.tenant_subscriptions SET tier = 'ENTERPRISE_LOGISTICS' WHERE tier = 'CUSTOM';
--> statement-breakpoint
DELETE FROM public.platform_plan_prices WHERE tier IN ('SOLO_TRADER', 'CUSTOM');
