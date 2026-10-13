/**
 * STOKROVA — SaaS Billing, Subscription Tiering, Usage Metering & Platform Orchestration Contracts
 * Golden Rules 4, 5, 7, 8, 14, 15, 16, 21, 26:
 * Zero schema modifications for billing configuration, strict tenant isolation,
 * pure integer currency units, progressive complexity (Solo Trader to Enterprise).
 */

export type SubscriptionTier =
  | 'SOLO_TRADER'
  | 'RETAIL_STARTER'
  | 'WHOLESALE_GROWTH'
  | 'ENTERPRISE_LOGISTICS'
  | 'CUSTOM';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'SUSPENDED';

export type FeatureFlagKey =
  | 'manufacturing_enabled'
  | 'edi_enabled'
  | 'b2b_portal_enabled'
  | 'multi_currency_enabled'
  | 'offline_sync_enabled'
  | 'advanced_crm_enabled'
  | 'custom_webhooks_enabled'
  | 'automated_replenishment_enabled';

export type TierFeatureFlags = Record<FeatureFlagKey, boolean>;

export interface TierEntitlements {
  tier: SubscriptionTier;
  name: string;
  monthly_price_minor: string;
  annual_price_minor: string;
  currency: string;
  max_branches: number;
  max_active_registers: number;
  max_warehouses: number;
  max_skus: number;
  max_monthly_orders: number;
  max_users: number;
  feature_flags: TierFeatureFlags;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_ends_at: string | null;
  feature_flag_overrides?: Partial<TierFeatureFlags>;
  limit_overrides?: {
    max_branches?: number;
    max_active_registers?: number;
    max_warehouses?: number;
    max_skus?: number;
    max_monthly_orders?: number;
    max_users?: number;
  };
  created_at: string;
  updated_at: string;
}

export type MeteredUsageMetric =
  | 'api_calls'
  | 'orders'
  | 'storage_bytes'
  | 'webhook_deliveries';

export interface MeteredUsageRecord {
  id: string;
  tenant_id: string;
  subscription_id: string;
  metric: MeteredUsageMetric;
  quantity: string;
  recorded_at: string;
  idempotency_key: string;
}

export type SaaSInvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'UNCOLLECTIBLE' | 'VOID';

export interface SaaSInvoiceLineItem {
  id: string;
  description: string;
  unit_price_minor: string;
  quantity: number;
  amount_minor: string;
  is_proration: boolean;
}

export interface SaaSInvoice {
  id: string;
  tenant_id: string;
  subscription_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_minor: string;
  tax_minor: string;
  total_minor: string;
  currency: string;
  status: SaaSInvoiceStatus;
  lines: SaaSInvoiceLineItem[];
  payment_gateway_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ProrationQuote {
  tenant_id: string;
  current_tier: SubscriptionTier;
  target_tier: SubscriptionTier;
  effective_date: string;
  unused_credit_minor: string;
  new_tier_charge_minor: string;
  net_prorated_amount_minor: string;
  remaining_days: number;
  total_days_in_cycle: number;
  proration_factor_bp: number;
}

export interface DunningAttempt {
  tenant_id: string;
  subscription_id: string;
  invoice_id: string;
  attempt_number: number;
  attempted_at: string;
  status: 'SUCCESS' | 'FAILED';
  failure_reason: string | null;
  next_retry_at: string | null;
}

export interface QuotaEvaluationResult {
  metric: string;
  current_usage: number;
  limit: number;
  is_exceeded: boolean;
  is_warning: boolean;
  percentage_used_bp: number; // Basis points 0 - 10,000+
}
