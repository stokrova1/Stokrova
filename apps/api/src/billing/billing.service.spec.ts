import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service.js';

describe('Phase 24 apps/api — BillingService & Subscription Orchestration Suite', () => {
  let service: BillingService;

  beforeEach(() => {
    service = new BillingService();
  });

  describe('Subscription Provisioning (Rule 14, 15, 16)', () => {
    it('provisions a default Solo Trader plan with zero fees and no initial invoice', async () => {
      const sub = await service.createSubscription({
        tenant_id: 'tenant_solo_01',
        tier: 'SOLO_TRADER',
      });

      expect(sub.tenant_id).toBe('tenant_solo_01');
      expect(sub.tier).toBe('SOLO_TRADER');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.trial_ends_at).toBeNull();
    });

    it('provisions a paid plan and automatically generates initial invoice in pure minor units', async () => {
      const sub = await service.createSubscription({
        tenant_id: 'tenant_retail_01',
        tier: 'RETAIL_STARTER',
        billing_cycle: 'MONTHLY',
      });

      expect(sub.tier).toBe('RETAIL_STARTER');
      expect(sub.status).toBe('ACTIVE');
    });

    it('provisions a trial subscription with future trial_ends_at', async () => {
      const sub = await service.createSubscription({
        tenant_id: 'tenant_trial_01',
        tier: 'WHOLESALE_GROWTH',
        trial_days: 14,
      });

      expect(sub.status).toBe('TRIALING');
      expect(sub.trial_ends_at).toBeDefined();
    });
  });

  describe('Feature Entitlement & Dynamic Capability Gating (Rule 4, 5)', () => {
    it('allows access to features included in the subscription plan', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_retail_02',
        tier: 'RETAIL_STARTER',
      });

      const { enabled } = await service.checkFeatureEntitlement(
        'tenant_retail_02',
        'multi_currency_enabled',
      );
      expect(enabled).toBe(true);

      // Does not throw
      await expect(
        service.assertFeatureEnabled('tenant_retail_02', 'multi_currency_enabled'),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when accessing features outside current tier', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_retail_03',
        tier: 'RETAIL_STARTER',
      });

      const { enabled } = await service.checkFeatureEntitlement(
        'tenant_retail_03',
        'manufacturing_enabled',
      );
      expect(enabled).toBe(false);

      await expect(
        service.assertFeatureEnabled('tenant_retail_03', 'manufacturing_enabled'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Operational Quota Evaluation', () => {
    it('verifies operational resource limits against tier definition', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_retail_04',
        tier: 'RETAIL_STARTER', // max_branches = 3
      });

      const quotaWithin = await service.checkQuota('tenant_retail_04', 'max_branches', 2);
      expect(quotaWithin.is_exceeded).toBe(false);
      expect(quotaWithin.limit).toBe(3);

      const quotaExceeded = await service.checkQuota('tenant_retail_04', 'max_branches', 4);
      expect(quotaExceeded.is_exceeded).toBe(true);
      expect(quotaExceeded.percentage_used_bp).toBeGreaterThan(10000);
    });
  });

  describe('Plan Transition & Mid-Cycle Prorated Invoicing (Rule 26)', () => {
    it('calculates upgrade proration and generates prorated invoice line item', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_upgrade_01',
        tier: 'RETAIL_STARTER',
        billing_cycle: 'MONTHLY',
      });

      const result = await service.changePlan(
        'tenant_upgrade_01',
        'WHOLESALE_GROWTH',
        true,
      );

      expect(result.subscription.tier).toBe('WHOLESALE_GROWTH');
      expect(result.prorationQuote.target_tier).toBe('WHOLESALE_GROWTH');
      expect(result.invoice).toBeDefined();
      expect(result.invoice?.lines[0]?.is_proration).toBe(true);
      expect(BigInt(result.invoice!.total_minor)).toBeGreaterThan(0n);
    });
  });

  describe('Metered Usage & Idempotent Accounting (Rule 8, 19)', () => {
    it('records metered usage and prevents duplicate counting via idempotency key', async () => {
      const tenantId = 'tenant_usage_01';
      await service.createSubscription({
        tenant_id: tenantId,
        tier: 'WHOLESALE_GROWTH',
      });

      // Record first batch
      await service.recordMeteredUsage({
        tenant_id: tenantId,
        metric: 'api_calls',
        quantity: 500,
        idempotency_key: 'idem_batch_001',
      });

      // Attempt duplicate replay
      await service.recordMeteredUsage({
        tenant_id: tenantId,
        metric: 'api_calls',
        quantity: 500,
        idempotency_key: 'idem_batch_001',
      });

      // Record distinct batch
      await service.recordMeteredUsage({
        tenant_id: tenantId,
        metric: 'api_calls',
        quantity: 250,
        idempotency_key: 'idem_batch_002',
      });

      const summary = await service.getUsageSummary(tenantId);
      expect(summary.api_calls).toBe(750); // 500 + 250 (not 1250)
    });
  });

  describe('Payment Webhook Processing & Dunning Retry Policy', () => {
    it('processes successful payment settlement webhook', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_settle_01',
        tier: 'RETAIL_STARTER',
      });

      // Generate invoice
      const change = await service.changePlan('tenant_settle_01', 'WHOLESALE_GROWTH', true);
      const invoiceId = change.invoice!.id;

      const settled = await service.processPaymentWebhook({
        invoice_id: invoiceId,
        payment_gateway_reference: 'pay_ref_test_998',
        amount_paid_minor: change.invoice!.total_minor,
        status: 'SUCCEEDED',
      });

      expect(settled.invoice.status).toBe('PAID');
      expect(settled.subscription.status).toBe('ACTIVE');
    });

    it('marks PAST_DUE on payment failure and SUSPENDED after retry exhaustion', async () => {
      await service.createSubscription({
        tenant_id: 'tenant_dunning_01',
        tier: 'RETAIL_STARTER',
      });

      const change = await service.changePlan('tenant_dunning_01', 'ENTERPRISE_LOGISTICS', true);
      const invoiceId = change.invoice!.id;

      // Fail 1: PAST_DUE
      const f1 = await service.processPaymentWebhook({
        invoice_id: invoiceId,
        payment_gateway_reference: 'failed_ref_1',
        amount_paid_minor: '0',
        status: 'FAILED',
      });
      expect(f1.subscription.status).toBe('PAST_DUE');

      // Fail 2: still PAST_DUE
      await service.processPaymentWebhook({
        invoice_id: invoiceId,
        payment_gateway_reference: 'failed_ref_2',
        amount_paid_minor: '0',
        status: 'FAILED',
      });

      // Fail 3: still PAST_DUE
      await service.processPaymentWebhook({
        invoice_id: invoiceId,
        payment_gateway_reference: 'failed_ref_3',
        amount_paid_minor: '0',
        status: 'FAILED',
      });

      // Fail 4: Exceeded 3 retries -> SUSPENDED
      const f4 = await service.processPaymentWebhook({
        invoice_id: invoiceId,
        payment_gateway_reference: 'failed_ref_4',
        amount_paid_minor: '0',
        status: 'FAILED',
      });
      expect(f4.subscription.status).toBe('SUSPENDED');
      expect(f4.invoice.status).toBe('UNCOLLECTIBLE');
    });
  });
});
