/**
 * ============================================================================
 * STOKROVA — Advanced Pricing, Promotions, Loyalty, Governance & Snapshots
 * Phase 8 Contracts
 * ============================================================================
 */

import type { CartTaxDetail } from './pricing.js';

// ----------------------------------------------------------------------------
// 1. Customer Contract Pricing
// ----------------------------------------------------------------------------

export interface CustomerContract {
  id: string;
  tenant_id: string;
  contract_number: string;
  customer_id: string;
  name: string;
  currency_code: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerContractItem {
  id: string;
  tenant_id: string;
  contract_id: string;
  variant_id: string;
  min_quantity: number;
  fixed_price_minor: string | null;
  discount_percent_bp: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerContractRequest {
  contract_number: string;
  customer_id: string;
  name: string;
  currency_code?: string;
  valid_from: string;
  valid_until?: string | null;
}

export interface AddContractItemRequest {
  variant_id: string;
  min_quantity?: number;
  fixed_price_minor?: string | null;
  discount_percent_bp?: number | null;
}

// ----------------------------------------------------------------------------
// 2. Advanced Promotional Campaigns
// ----------------------------------------------------------------------------

export type PromotionType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'BUY_X_GET_Y'
  | 'BUNDLE_PRICE';

export type PromotionStackingRule = 'EXCLUSIVE' | 'STACKABLE' | 'BEST_DEAL';

export interface PromotionCampaign {
  id: string;
  tenant_id: string;
  campaign_code: string;
  name: string;
  description?: string | null;
  promotion_type: PromotionType;
  stacking_rule: PromotionStackingRule;
  value_minor_or_bp: string;
  // BXGY parameters
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_discount_percent_bp?: number | null;
  // Bundle parameters
  bundle_variant_ids?: string[] | null;
  bundle_fixed_price_minor?: string | null;
  // Eligibility & Boundaries
  min_subtotal_minor?: string | null;
  max_discount_minor?: string | null;
  eligible_variant_ids?: string[] | null;
  eligible_customer_group?: string | null;
  eligible_channel?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  // Budget & Usage Caps
  budget_limit_minor?: string | null;
  budget_consumed_minor: string;
  usage_limit_total?: number | null;
  usage_count_total: number;
  usage_limit_per_customer?: number | null;
  coupon_code?: string | null;
  requires_coupon: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionCampaignRequest {
  campaign_code: string;
  name: string;
  description?: string;
  promotion_type: PromotionType;
  stacking_rule?: PromotionStackingRule;
  value_minor_or_bp: string;
  buy_quantity?: number;
  get_quantity?: number;
  get_discount_percent_bp?: number;
  bundle_variant_ids?: string[];
  bundle_fixed_price_minor?: string;
  min_subtotal_minor?: string;
  max_discount_minor?: string;
  eligible_variant_ids?: string[];
  eligible_customer_group?: string;
  eligible_channel?: string;
  valid_from?: string;
  valid_until?: string;
  budget_limit_minor?: string;
  usage_limit_total?: number;
  usage_limit_per_customer?: number;
  coupon_code?: string;
  requires_coupon?: boolean;
}

export interface PromotionRedemptionRecord {
  id: string;
  tenant_id: string;
  campaign_id: string;
  coupon_code?: string | null;
  order_id: string;
  customer_id?: string | null;
  discount_amount_minor: string;
  operation_id: string;
  redeemed_at: string;
}

export interface RedeemPromotionRequest {
  campaign_id: string;
  coupon_code?: string;
  order_id: string;
  customer_id?: string;
  discount_amount_minor: string;
  operation_id: string;
}

// ----------------------------------------------------------------------------
// 3. Margin Protection & Discount Governance
// ----------------------------------------------------------------------------

export type CostBasisType =
  | 'INVENTORY_COST'
  | 'LANDED_COST'
  | 'CONFIGURED_COST';

export interface PricingMarginPolicy {
  id: string;
  tenant_id: string;
  name: string;
  min_margin_percent_bp: number; // e.g. 1500 = 15.00%
  max_discount_percent_bp: number; // e.g. 3000 = 30.00%
  cost_basis_type: CostBasisType;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMarginPolicyRequest {
  name: string;
  min_margin_percent_bp: number;
  max_discount_percent_bp: number;
  cost_basis_type?: CostBasisType;
  requires_approval?: boolean;
}

export type PricingOverrideStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PricingOverrideRequest {
  id: string;
  tenant_id: string;
  order_id?: string | null;
  variant_id: string;
  original_price_minor: string;
  requested_price_minor: string;
  cost_minor: string;
  margin_percent_bp: number;
  discount_percent_bp: number;
  reason: string;
  requested_by: string;
  approved_by?: string | null;
  status: PricingOverrideStatus;
  operation_id: string;
  created_at: string;
  decided_at?: string | null;
}

export interface RequestPriceOverrideRequest {
  order_id?: string;
  variant_id: string;
  original_price_minor: string;
  requested_price_minor: string;
  cost_minor: string;
  reason: string;
  requested_by: string;
  operation_id: string;
}

export interface DecidePriceOverrideRequest {
  override_id: string;
  decision: 'APPROVE' | 'REJECT';
  decided_by: string;
}

// ----------------------------------------------------------------------------
// 4. Commercial Price Snapshots & Explainability
// ----------------------------------------------------------------------------

export type PriceRuleMatchTier =
  | 'CUSTOMER_CONTRACT'
  | 'CUSTOMER_PRICELIST'
  | 'CUSTOMER_GROUP_PRICELIST'
  | 'CHANNEL_PRICELIST'
  | 'DEFAULT_PRICELIST'
  | 'BASE_PRICE';

export interface PriceRuleMatch {
  rule_tier: PriceRuleMatchTier;
  rule_id?: string | null;
  rule_name: string;
  resolved_unit_price_minor: string;
  is_winner: boolean;
  elimination_reason?: string | null;
}

export interface PromotionEvaluationDetail {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  is_applied: boolean;
  calculated_discount_minor: string;
  rejection_reason?: string | null;
}

export interface CommercialPriceSnapshot {
  id: string;
  tenant_id: string;
  order_id?: string | null;
  line_item_id?: string | null;
  variant_id: string;
  quantity: number;
  currency_code: string;
  base_unit_price_minor: string;
  resolved_unit_price_minor: string;
  gross_line_minor: string;
  discount_amount_minor: string;
  net_line_minor: string;
  matched_rules: PriceRuleMatch[];
  applied_promotions: PromotionEvaluationDetail[];
  tax_details: CartTaxDetail[];
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  override_id?: string | null;
  evaluation_timestamp: string;
}

// ----------------------------------------------------------------------------
// 5. Deterministic Price Resolution Request & Response
// ----------------------------------------------------------------------------

export interface ResolvePriceItemInput {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  unit_cost_minor?: string;
  customer_id?: string;
  customer_group?: string;
  channel?: string;
  pricelist_id?: string;
  currency_code?: string;
  tax_rate_ids?: string[];
  coupon_code?: string;
}

export interface ResolvedPriceItemResult {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  resolved_unit_price_minor: string;
  gross_subtotal_minor: string;
  promotion_discount_minor: string;
  tax_amount_minor: string;
  net_line_total_minor: string;
  margin_percent_bp?: number;
  margin_approved: boolean;
  snapshot: CommercialPriceSnapshot;
}
