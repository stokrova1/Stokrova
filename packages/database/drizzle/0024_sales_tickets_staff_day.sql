-- Shop-counter order tickets and each worker's daily work log ("My day").
CREATE TABLE IF NOT EXISTS public.sales_tickets (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL,
  warehouse_id text NOT NULL,
  customer_name text,
  notes text,
  lines jsonb NOT NULL,
  written_by text NOT NULL,
  picked_by text,
  paid_by text,
  order_id text,
  receipt_number text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_tickets_tenant_code ON public.sales_tickets (tenant_id, code);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sales_tickets_tenant_status ON public.sales_tickets (tenant_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.staff_work_events (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  kind text NOT NULL,
  reference text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  amount_minor bigint NOT NULL DEFAULT 0,
  cash_minor bigint NOT NULL DEFAULT 0,
  transfer_minor bigint NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_staff_work_events_user_day ON public.staff_work_events (tenant_id, user_id, occurred_at);
--> statement-breakpoint
ALTER TABLE public.sales_tickets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.staff_work_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.sales_tickets FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.staff_work_events FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
