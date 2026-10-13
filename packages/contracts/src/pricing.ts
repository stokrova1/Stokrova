/**
 * STOKROVA Pricing, Tax, Promotion & Cart Calculation Contracts (Phase 3A)
 *
 * Surpassing ERPNext, Odoo, InvenTree, and TetherPOS:
 * - Deterministic integer minor unit pricing pipeline (zero floating point drift)
 * - Multi-tier volume price breaks and customer group pricelists
 * - Inclusive and exclusive tax engines with multi-tax stacking
 * - Capped percentage and fixed promotional discounts
 * - Exact penny-rounding distribution across multi-line order totals
 */

export type TaxInclusionType = 'INCLUSIVE' | 'EXCLUSIVE';

export type TaxComputationType = 'PERCENTAGE' | 'FIXED_PER_UNIT';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PriceList {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  currency_code: string;
  is_default: boolean;
  customer_group: string | null; // e.g. RETAIL, WHOLESALE, VIP, EMPLOYEE
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceListRule {
  id: string;
  tenant_id: string;
  pricelist_id: string;
  variant_id: string;
  min_quantity: number; // Volume break threshold (e.g. 1, 10, 50)
  fixed_price_minor: string | null; // Specific fixed unit price in minor units
  discount_percent_bp: number | null; // Basis points (100 bp = 1%, 1000 bp = 10%)
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  rate_bp: number; // Basis points: 500 = 5.0%, 750 = 7.5%, 2000 = 20.0%
  computation_type: TaxComputationType;
  inclusion_type: TaxInclusionType;
  liability_account_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountPromotion {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  discount_type: DiscountType;
  value_minor_or_bp: string; // Basis points if PERCENTAGE, Minor units if FIXED_AMOUNT
  max_discount_minor: string | null; // Cap on percentage discounts
  min_subtotal_minor: string | null; // Minimum cart subtotal required to qualify
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartTaxDetail {
  tax_rate_id: string;
  tax_name: string;
  tax_code: string;
  amount_minor: string;
  inclusion_type: TaxInclusionType;
}

export interface CalculatedLineItem {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  effective_unit_price_minor: string;
  gross_subtotal_minor: string; // qty * effective_unit_price
  discount_amount_minor: string;
  tax_amount_minor: string;
  net_line_total_minor: string; // gross - discount + (if exclusive: tax)
  taxes: CartTaxDetail[];
}

export interface CalculatedCartSummary {
  items: CalculatedLineItem[];
  subtotal_minor: string; // Sum of line subtotals before discounts/exclusive taxes
  discount_total_minor: string; // Line discounts + cart-level promotional discount
  tax_total_minor: string; // All taxes combined
  grand_total_minor: string; // Final amount payable
  rounding_adjustment_minor: string; // Cash or currency rounding delta if applied
  currency_code: string;
}

// ----------------------------------------------------------------------------
// DTOs: Requests & Responses
// ----------------------------------------------------------------------------

export interface CreatePriceListRequest {
  code: string;
  name: string;
  currency_code: string;
  is_default?: boolean;
  customer_group?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface CreatePriceListRuleRequest {
  pricelist_id: string;
  variant_id: string;
  min_quantity: number;
  fixed_price_minor?: string | null;
  discount_percent_bp?: number | null;
}

export interface CreateTaxRateRequest {
  code: string;
  name: string;
  rate_bp: number;
  computation_type?: TaxComputationType;
  inclusion_type?: TaxInclusionType;
  liability_account_id?: string | null;
}

export interface CreateDiscountPromotionRequest {
  code: string;
  name: string;
  discount_type: DiscountType;
  value_minor_or_bp: string;
  max_discount_minor?: string | null;
  min_subtotal_minor?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_limit?: number | null;
}

export interface CalculateCartItemInput {
  variant_id: string;
  quantity: number;
  base_unit_price_minor: string;
  custom_unit_price_minor?: string | null;
  line_discount_percent_bp?: number | null;
  tax_rate_ids?: string[];
}

export interface CalculateCartRequest {
  currency_code: string;
  pricelist_id?: string | null;
  promo_code?: string | null;
  items: CalculateCartItemInput[];
}

export interface CalculateCartResponse {
  summary: CalculatedCartSummary;
}

export interface PriceListResponse {
  pricelist: PriceList;
}

export interface ListPriceListsResponse {
  pricelists: PriceList[];
}

export interface TaxRateResponse {
  tax_rate: TaxRate;
}

export interface ListTaxRatesResponse {
  tax_rates: TaxRate[];
}

export interface PromotionResponse {
  promotion: DiscountPromotion;
}

export interface ListPromotionsResponse {
  promotions: DiscountPromotion[];
}
