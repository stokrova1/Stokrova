-- Stokrova bills businesses in Naira. Founder sets the Naira amounts in the console.
ALTER TABLE public.platform_plan_prices ALTER COLUMN currency SET DEFAULT 'NGN';
--> statement-breakpoint
UPDATE public.platform_plan_prices SET currency = 'NGN' WHERE currency = 'USD';
--> statement-breakpoint
ALTER TABLE public.tenant_subscriptions ALTER COLUMN currency SET DEFAULT 'NGN';
