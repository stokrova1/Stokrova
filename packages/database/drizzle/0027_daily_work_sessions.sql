-- Daily work sessions & shift lifecycle for each business role.
CREATE TABLE IF NOT EXISTS public.daily_work_sessions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  business_role text NOT NULL DEFAULT 'OPERATOR',
  warehouse_id text,
  session_date text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  offline_origin boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  total_sales_minor bigint NOT NULL DEFAULT 0,
  total_cogs_minor bigint,
  total_profit_minor bigint,
  margin_basis_points integer,
  cash_minor bigint NOT NULL DEFAULT 0,
  transfer_minor bigint NOT NULL DEFAULT 0,
  items_handled integer NOT NULL DEFAULT 0,
  transactions_count integer NOT NULL DEFAULT 0,
  tickets_written integer NOT NULL DEFAULT 0,
  tickets_picked integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_work_sessions_idempotency ON public.daily_work_sessions (tenant_id, idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_daily_work_sessions_user_date ON public.daily_work_sessions (tenant_id, user_id, session_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_daily_work_sessions_tenant_status ON public.daily_work_sessions (tenant_id, status);
--> statement-breakpoint
ALTER TABLE public.daily_work_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY durable_tenant_isolation ON public.daily_work_sessions FOR ALL
  USING (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR tenant_id = current_setting('app.current_tenant_id', true));
