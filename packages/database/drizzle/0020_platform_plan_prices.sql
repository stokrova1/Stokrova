-- Founder-set plan prices (single source for billing, the public plans list and the website)
-- and the plan each business is on. Additive and idempotent.
CREATE TABLE IF NOT EXISTS public.platform_plan_prices (
  tier text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_minor bigint NOT NULL CHECK (monthly_price_minor >= 0),
  annual_price_minor bigint NOT NULL CHECK (annual_price_minor >= 0),
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
--> statement-breakpoint
INSERT INTO public.platform_plan_prices (tier, name, monthly_price_minor, annual_price_minor) VALUES
  ('RETAIL_STARTER', 'Starter', 4900, 47000),
  ('WHOLESALE_GROWTH', 'Growth', 14900, 143000),
  ('ENTERPRISE_LOGISTICS', 'Enterprise', 39900, 383000)
ON CONFLICT (tier) DO NOTHING;
--> statement-breakpoint
ALTER TABLE public.platform_plan_prices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS plan_prices_public_read ON public.platform_plan_prices;
--> statement-breakpoint
CREATE POLICY plan_prices_public_read ON public.platform_plan_prices FOR SELECT USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS plan_prices_platform_write ON public.platform_plan_prices;
--> statement-breakpoint
CREATE POLICY plan_prices_platform_write ON public.platform_plan_prices FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true');
--> statement-breakpoint
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'RETAIL_STARTER';
