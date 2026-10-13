import { describe, it, expect } from 'vitest';
import {
  CreateCustomerContractSchema,
  CreatePromotionCampaignSchema,
  RedeemPromotionSchema,
  CreateMarginPolicySchema,
  RequestPriceOverrideSchema,
  DecidePriceOverrideSchema,
} from '../src/pricing-advanced.js';
import {
  CreateRebateAgreementSchema,
  AddRebateTierSchema,
  CalculateRebateAccrualSchema,
  SettleRebateSchema,
} from '../src/rebates.js';

describe('STOKROVA Phase 8: Validation Schemas Specification', () => {
  it('validates Customer Contract request schema', () => {
    const valid = {
      contract_number: 'CNT-2026-001',
      customer_id: 'cust-123',
      name: 'Enterprise Contract',
      currency_code: 'USD',
      valid_from: '2026-01-01T00:00:00.000Z',
    };
    expect(CreateCustomerContractSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      contract_number: '',
      customer_id: '',
      valid_from: 'not-a-date',
    };
    expect(CreateCustomerContractSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates Promotional Campaign request schema', () => {
    const valid = {
      campaign_code: 'SUMMER-DEAL-2026',
      name: 'Summer Deal',
      promotion_type: 'PERCENTAGE',
      stacking_rule: 'BEST_DEAL',
      value_minor_or_bp: '1500', // 15%
    };
    expect(CreatePromotionCampaignSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      campaign_code: 'BAD',
      promotion_type: 'INVALID_TYPE',
      value_minor_or_bp: '-500',
    };
    expect(CreatePromotionCampaignSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates Margin Policy & Price Override schemas', () => {
    const validPolicy = {
      name: 'High Tech Hardware Policy',
      min_margin_percent_bp: 1500,
      max_discount_percent_bp: 3000,
      cost_basis_type: 'INVENTORY_COST',
    };
    expect(CreateMarginPolicySchema.safeParse(validPolicy).success).toBe(true);

    const validOverride = {
      variant_id: 'var-123',
      original_price_minor: '10000',
      requested_price_minor: '8000',
      cost_minor: '6000',
      reason: 'Volume strategic buyer discount',
      requested_by: 'sales-rep-1',
      operation_id: 'op-ovr-001',
    };
    expect(RequestPriceOverrideSchema.safeParse(validOverride).success).toBe(true);
    expect(DecidePriceOverrideSchema.safeParse({ override_id: 'ovr-1', decision: 'APPROVE', decided_by: 'vp-sales' }).success).toBe(true);
  });

  it('validates Rebate Agreement and Accrual schemas', () => {
    const validAgreement = {
      agreement_number: 'RBT-2026-Q1',
      name: 'Distributor Volume Rebate',
      rebate_type: 'CUSTOMER_VOLUME',
      counterparty_type: 'CUSTOMER',
      counterparty_id: 'dist-456',
      currency_code: 'USD',
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: '2026-12-31T23:59:59.000Z',
    };
    expect(CreateRebateAgreementSchema.safeParse(validAgreement).success).toBe(true);

    const validTier = {
      tier_number: 1,
      threshold_quantity: 1000,
      rebate_rate_bp: 300,
    };
    expect(AddRebateTierSchema.safeParse(validTier).success).toBe(true);

    const validAccrual = {
      agreement_id: 'rbt-1',
      period_identifier: '2026-Q1',
      eligible_quantity: 1500,
      eligible_spend_minor: '15000000',
    };
    expect(CalculateRebateAccrualSchema.safeParse(validAccrual).success).toBe(true);

    const validSettle = {
      accrual_id: 'acc-1',
      settlement_reference: 'SETTLE-2026-001',
      settled_by: 'controller-1',
      operation_id: 'op-settle-001',
    };
    expect(SettleRebateSchema.safeParse(validSettle).success).toBe(true);
  });
});
