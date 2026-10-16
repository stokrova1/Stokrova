/**
 * STOKROVA — SaaS Billing, Usage Metering & Platform Orchestration Domain Engine
 * Golden Rules 1, 4, 5, 8, 14, 15, 16, 21, 26:
 * Pure integer arithmetic, progressive tiers (Solo Trader to Enterprise),
 * zero schema modifications for tenant capabilities, idempotent dunning schedules.
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
  plan_grants?: { features?: string[]; limits?: Partial<Record<'max_branches' | 'max_active_registers' | 'max_users' | 'max_warehouses', number | null>> } | null;
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

export interface QuotaEvaluationResult {
  metric: string;
  current_usage: number;
  limit: number;
  is_exceeded: boolean;
  is_warning: boolean;
  percentage_used_bp: number;
}


/**
 * Standard Tier Entitlement Definitions
 * Progresses smoothly from single-trader simplicity to multi-warehouse enterprise operations.
 */
/** Used for limits a plan does not cap. */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

/**
 * Plan limits and features as sold on the website (see plan-catalog.ts).
 * SOLO_TRADER and CUSTOM are retired: they behave as Starter and Enterprise and are not offered.
 */
export const TIER_ENTITLEMENT_DEFINITIONS: Record<SubscriptionTier, TierEntitlements> = {
  SOLO_TRADER: {
    tier: 'SOLO_TRADER',
    name: 'Starter (retired free plan)',
    monthly_price_minor: '0',
    annual_price_minor: '0',
    currency: 'USD',
    max_branches: 1,
    max_active_registers: 1,
    max_warehouses: 1,
    max_skus: UNLIMITED,
    max_monthly_orders: UNLIMITED,
    max_users: 3,
    feature_flags: {
      manufacturing_enabled: false,
      edi_enabled: false,
      b2b_portal_enabled: false,
      multi_currency_enabled: false,
      offline_sync_enabled: true,
      advanced_crm_enabled: false,
      custom_webhooks_enabled: false,
      automated_replenishment_enabled: false,
    },
  },
  RETAIL_STARTER: {
    tier: 'RETAIL_STARTER',
    name: 'Starter',
    monthly_price_minor: '4900',
    annual_price_minor: '47000',
    currency: 'USD',
    max_branches: 1,
    max_active_registers: 1,
    max_warehouses: 1,
    max_skus: UNLIMITED,
    max_monthly_orders: UNLIMITED,
    max_users: 3,
    feature_flags: {
      manufacturing_enabled: false,
      edi_enabled: false,
      b2b_portal_enabled: false,
      multi_currency_enabled: false,
      offline_sync_enabled: true,
      advanced_crm_enabled: false,
      custom_webhooks_enabled: false,
      automated_replenishment_enabled: false,
    },
  },
  WHOLESALE_GROWTH: {
    tier: 'WHOLESALE_GROWTH',
    name: 'Growth',
    monthly_price_minor: '14900',
    annual_price_minor: '143000',
    currency: 'USD',
    max_branches: 5,
    max_active_registers: UNLIMITED,
    max_warehouses: 5,
    max_skus: UNLIMITED,
    max_monthly_orders: UNLIMITED,
    max_users: UNLIMITED,
    feature_flags: {
      manufacturing_enabled: false,
      edi_enabled: false,
      b2b_portal_enabled: false,
      multi_currency_enabled: true,
      offline_sync_enabled: true,
      advanced_crm_enabled: true,
      custom_webhooks_enabled: false,
      automated_replenishment_enabled: true,
    },
  },
  ENTERPRISE_LOGISTICS: {
    tier: 'ENTERPRISE_LOGISTICS',
    name: 'Enterprise',
    monthly_price_minor: '39900',
    annual_price_minor: '383000',
    currency: 'USD',
    max_branches: UNLIMITED,
    max_active_registers: UNLIMITED,
    max_warehouses: UNLIMITED,
    max_skus: UNLIMITED,
    max_monthly_orders: UNLIMITED,
    max_users: UNLIMITED,
    feature_flags: {
      manufacturing_enabled: true,
      edi_enabled: true,
      b2b_portal_enabled: true,
      multi_currency_enabled: true,
      offline_sync_enabled: true,
      advanced_crm_enabled: true,
      custom_webhooks_enabled: true,
      automated_replenishment_enabled: true,
    },
  },
  CUSTOM: {
    tier: 'CUSTOM',
    name: 'Enterprise (custom)',
    monthly_price_minor: '39900',
    annual_price_minor: '383000',
    currency: 'USD',
    max_branches: UNLIMITED,
    max_active_registers: UNLIMITED,
    max_warehouses: UNLIMITED,
    max_skus: UNLIMITED,
    max_monthly_orders: UNLIMITED,
    max_users: UNLIMITED,
    feature_flags: {
      manufacturing_enabled: true,
      edi_enabled: true,
      b2b_portal_enabled: true,
      multi_currency_enabled: true,
      offline_sync_enabled: true,
      advanced_crm_enabled: true,
      custom_webhooks_enabled: true,
      automated_replenishment_enabled: true,
    },
  },
};

/**
 * Validates permitted subscription lifecycle status transitions.
 */
export function canTransitionSubscriptionStatus(
  current: SubscriptionStatus,
  target: SubscriptionStatus,
): boolean {
  if (current === target) return true;

  switch (current) {
    case 'TRIALING':
      return target === 'ACTIVE' || target === 'CANCELED' || target === 'SUSPENDED';
    case 'ACTIVE':
      return target === 'PAST_DUE' || target === 'CANCELED' || target === 'SUSPENDED';
    case 'PAST_DUE':
      return target === 'ACTIVE' || target === 'SUSPENDED' || target === 'CANCELED';
    case 'SUSPENDED':
      return target === 'ACTIVE' || target === 'CANCELED';
    case 'CANCELED':
      // Reactivation allowed under new billing mandate
      return target === 'ACTIVE' || target === 'TRIALING';
    default:
      return false;
  }
}

/**
 * Dynamic Capability Resolver
 * Evaluates whether a feature flag is active for a tenant, checking overrides first,
 * then falling back to the base tier specification.
 */
export function isFeatureEnabled(
  subscription: TenantSubscription,
  flag: FeatureFlagKey,
): boolean {
  if (subscription.status === 'SUSPENDED' || subscription.status === 'CANCELED') {
    return false;
  }

  // Tenant explicit override has highest priority
  if (
    subscription.feature_flag_overrides &&
    typeof subscription.feature_flag_overrides[flag] === 'boolean'
  ) {
    return Boolean(subscription.feature_flag_overrides[flag]);
  }

  const tierDef = TIER_ENTITLEMENT_DEFINITIONS[subscription.tier];
  return Boolean(tierDef.feature_flags[flag]);
}

/**
 * Resolves effective operational limit for a tenant.
 */
export function getEffectiveLimit(
  subscription: TenantSubscription,
  limitKey:
    | 'max_branches'
    | 'max_active_registers'
    | 'max_warehouses'
    | 'max_skus'
    | 'max_monthly_orders'
    | 'max_users',
): number {
  if (
    subscription.limit_overrides &&
    typeof subscription.limit_overrides[limitKey] === 'number'
  ) {
    return subscription.limit_overrides[limitKey]!;
  }
  const tierDef = TIER_ENTITLEMENT_DEFINITIONS[subscription.tier];
  return tierDef[limitKey];
}

/**
 * Pure Quota Evaluation Engine
 * Returns basis points used ($0 - 10,000+$), warning indicator (>= 90%), and exceeded flag.
 */
export function evaluateTenantQuota(
  metric: string,
  currentUsage: number,
  limit: number,
): QuotaEvaluationResult {
  if (limit <= 0) {
    return {
      metric,
      current_usage: currentUsage,
      limit,
      is_exceeded: currentUsage > 0,
      is_warning: true,
      percentage_used_bp: currentUsage > 0 ? 10000 : 0,
    };
  }

  const percentageUsedBp = Math.floor((currentUsage * 10000) / limit);
  const isExceeded = currentUsage > limit;
  const isWarning = percentageUsedBp >= 9000; // >= 90%

  return {
    metric,
    current_usage: currentUsage,
    limit,
    is_exceeded: isExceeded,
    is_warning: isWarning,
    percentage_used_bp: percentageUsedBp,
  };
}

/**
 * Pure Integer Arithmetic Proration Calculator
 * Golden Rule 26: Pure integer minor units and basis points.
 */
export function calculateProratedBilling(params: {
  tenantId: string;
  currentTier: SubscriptionTier;
  targetTier: SubscriptionTier;
  cycle: BillingCycle;
  periodStart: Date | string;
  periodEnd: Date | string;
  effectiveDate: Date | string;
  /** Current plan prices (founder-set); falls back to the built-in defaults. */
  prices?: Partial<Record<SubscriptionTier, { monthly_price_minor: string; annual_price_minor: string }>>;
}): ProrationQuote {
  const start = new Date(params.periodStart).getTime();
  const end = new Date(params.periodEnd).getTime();
  const effective = new Date(params.effectiveDate).getTime();

  const totalCycleMs = Math.max(1, end - start);
  const remainingMs = Math.max(0, Math.min(end - effective, totalCycleMs));

  const totalDays = Math.max(1, Math.round(totalCycleMs / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));

  const factorBp = Math.floor((remainingMs * 10000) / totalCycleMs);

  const curDef = params.prices?.[params.currentTier] ?? TIER_ENTITLEMENT_DEFINITIONS[params.currentTier];
  const targetDef = params.prices?.[params.targetTier] ?? TIER_ENTITLEMENT_DEFINITIONS[params.targetTier];

  const curRateMinor =
    params.cycle === 'ANNUAL'
      ? BigInt(curDef.annual_price_minor)
      : BigInt(curDef.monthly_price_minor);

  const targetRateMinor =
    params.cycle === 'ANNUAL'
      ? BigInt(targetDef.annual_price_minor)
      : BigInt(targetDef.monthly_price_minor);

  // Unused credit on existing plan
  const unusedCreditMinor = (curRateMinor * BigInt(factorBp)) / 10000n;

  // New plan charge for remaining duration
  const newChargeMinor = (targetRateMinor * BigInt(factorBp)) / 10000n;

  // Net amount due (positive = payment due; negative = credit balance)
  const netDueMinor = newChargeMinor - unusedCreditMinor;

  return {
    tenant_id: params.tenantId,
    current_tier: params.currentTier,
    target_tier: params.targetTier,
    effective_date: new Date(effective).toISOString(),
    unused_credit_minor: unusedCreditMinor.toString(),
    new_tier_charge_minor: newChargeMinor.toString(),
    net_prorated_amount_minor: netDueMinor.toString(),
    remaining_days: remainingDays,
    total_days_in_cycle: totalDays,
    proration_factor_bp: factorBp,
  };
}

/**
 * Metered Overage Calculation
 * Computes overage fees in minor currency units for usage exceeding included units.
 */
export function calculateMeteredOverage(params: {
  unitsConsumed: bigint;
  includedUnits: bigint;
  ratePerBlockMinor: bigint;
  blockSize: bigint;
}): {
  overageUnits: bigint;
  billableBlocks: bigint;
  totalOverageMinor: bigint;
} {
  if (params.unitsConsumed <= params.includedUnits) {
    return {
      overageUnits: 0n,
      billableBlocks: 0n,
      totalOverageMinor: 0n,
    };
  }

  const overageUnits = params.unitsConsumed - params.includedUnits;
  const blockSize = params.blockSize <= 0n ? 1n : params.blockSize;
  const billableBlocks = (overageUnits + blockSize - 1n) / blockSize;
  const totalOverageMinor = billableBlocks * params.ratePerBlockMinor;

  return {
    overageUnits,
    billableBlocks,
    totalOverageMinor,
  };
}

/**
 * Dunning Retry Scheduling Policy
 * Default schedule: Attempt 1 (+2 days), Attempt 2 (+3 days), Attempt 3 (+2 days).
 * After 3 retries (total 4 attempts), account transitions to SUSPENDED.
 */
export function calculateNextDunningRetry(
  attemptNumber: number,
  lastAttemptAt: Date | string,
): {
  nextRetryAt: string | null;
  shouldSuspend: boolean;
} {
  const baseTime = new Date(lastAttemptAt).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (attemptNumber) {
    case 1:
      // Retry in 2 days
      return {
        nextRetryAt: new Date(baseTime + 2 * DAY_MS).toISOString(),
        shouldSuspend: false,
      };
    case 2:
      // Retry in 3 days (day 5)
      return {
        nextRetryAt: new Date(baseTime + 3 * DAY_MS).toISOString(),
        shouldSuspend: false,
      };
    case 3:
      // Final attempt in 2 days (day 7)
      return {
        nextRetryAt: new Date(baseTime + 2 * DAY_MS).toISOString(),
        shouldSuspend: false,
      };
    default:
      // Exhausted retries -> Suspend tenant
      return {
        nextRetryAt: null,
        shouldSuspend: true,
      };
  }
}
