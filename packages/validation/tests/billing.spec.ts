import { describe, it, expect } from 'vitest';
import {
  CreateSubscriptionSchema,
  ChangeSubscriptionPlanSchema,
  UpdateSubscriptionStatusSchema,
  RecordMeteredUsageSchema,
  ProcessInvoicePaymentSchema,
} from '../src/billing.js';

describe('Phase 24 @stokrova/validation — SaaS Billing & Subscription Schemas', () => {
  describe('CreateSubscriptionSchema', () => {
    it('accepts valid subscription creation request with default values', () => {
      const parsed = CreateSubscriptionSchema.parse({
        tenant_id: 'tenant_alpha_01',
        tier: 'SOLO_TRADER',
      });

      expect(parsed.tenant_id).toBe('tenant_alpha_01');
      expect(parsed.tier).toBe('SOLO_TRADER');
      expect(parsed.billing_cycle).toBe('MONTHLY');
      expect(parsed.currency).toBe('USD');
    });

    it('rejects invalid currency codes', () => {
      expect(() =>
        CreateSubscriptionSchema.parse({
          tenant_id: 'tenant_alpha_01',
          tier: 'RETAIL_STARTER',
          currency: 'US', // 2 letters instead of 3
        }),
      ).toThrow();
    });

    it('rejects negative trial days', () => {
      expect(() =>
        CreateSubscriptionSchema.parse({
          tenant_id: 'tenant_alpha_01',
          tier: 'RETAIL_STARTER',
          trial_days: -5,
        }),
      ).toThrow();
    });
  });

  describe('ChangeSubscriptionPlanSchema', () => {
    it('parses valid plan change requests', () => {
      const parsed = ChangeSubscriptionPlanSchema.parse({
        target_tier: 'ENTERPRISE_LOGISTICS',
      });
      expect(parsed.target_tier).toBe('ENTERPRISE_LOGISTICS');
      expect(parsed.effective_immediately).toBe(true);
    });

    it('rejects unknown subscription tiers', () => {
      expect(() =>
        ChangeSubscriptionPlanSchema.parse({
          target_tier: 'SUPER_TIER_INVALID',
        }),
      ).toThrow();
    });
  });

  describe('UpdateSubscriptionStatusSchema', () => {
    it('validates status updates with optional reason', () => {
      const parsed = UpdateSubscriptionStatusSchema.parse({
        status: 'PAST_DUE',
        reason: 'Payment card expired on Stripe',
      });
      expect(parsed.status).toBe('PAST_DUE');
      expect(parsed.reason).toBe('Payment card expired on Stripe');
    });

    it('rejects invalid statuses', () => {
      expect(() =>
        UpdateSubscriptionStatusSchema.parse({
          status: 'PENDING_DELETION',
        }),
      ).toThrow();
    });
  });

  describe('RecordMeteredUsageSchema', () => {
    it('validates positive usage quantities and idempotency keys', () => {
      const parsed = RecordMeteredUsageSchema.parse({
        tenant_id: 'tenant_alpha_01',
        metric: 'api_calls',
        quantity: 1500,
        idempotency_key: 'usage_oct12_batch_001',
      });
      expect(parsed.quantity).toBe(1500);
      expect(parsed.idempotency_key).toBe('usage_oct12_batch_001');
    });

    it('rejects zero or negative quantities', () => {
      expect(() =>
        RecordMeteredUsageSchema.parse({
          tenant_id: 'tenant_alpha_01',
          metric: 'api_calls',
          quantity: 0,
          idempotency_key: 'usage_key_valid',
        }),
      ).toThrow();
    });

    it('rejects short idempotency keys (<8 characters)', () => {
      expect(() =>
        RecordMeteredUsageSchema.parse({
          tenant_id: 'tenant_alpha_01',
          metric: 'api_calls',
          quantity: 10,
          idempotency_key: 'short',
        }),
      ).toThrow();
    });
  });

  describe('ProcessInvoicePaymentSchema (Rule 26)', () => {
    it('validates payment with pure integer minor currency units', () => {
      const parsed = ProcessInvoicePaymentSchema.parse({
        invoice_id: 'inv_saas_1001',
        payment_gateway_reference: 'ch_stripe_3Nq98x2eZvKYlo2C',
        amount_paid_minor: '4900', // $49.00
      });
      expect(parsed.amount_paid_minor).toBe('4900');
    });

    it('rejects non-integer minor unit formats (e.g. floats with decimals)', () => {
      expect(() =>
        ProcessInvoicePaymentSchema.parse({
          invoice_id: 'inv_saas_1001',
          payment_gateway_reference: 'ch_stripe_3Nq98x2eZvKYlo2C',
          amount_paid_minor: '49.00', // Floats forbidden by Rule 26
        }),
      ).toThrow();
    });
  });
});
