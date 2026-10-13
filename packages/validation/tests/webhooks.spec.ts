import { describe, it, expect } from 'vitest';
import {
  WebhookEventTypeSchema,
  CreateWebhookSubscriptionSchema,
  ReplayDeadLetterSchema,
  RotateWebhookSecretSchema,
  TestWebhookSubscriptionSchema,
  NotificationTemplateSchema,
} from '../src/index.js';

describe('Enterprise Webhooks & Event Notification Validation Schemas (Phase 19)', () => {
  describe('WebhookEventTypeSchema', () => {
    it('validates supported event topics including Phase 19 additions', () => {
      expect(WebhookEventTypeSchema.safeParse('ORDER_CREATED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('ORDER_UPDATED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('PAYMENT_FAILED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('SHIPMENT_DISPATCHED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('B2B_CREDIT_HOLD').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('EDI_DOCUMENT_RECEIVED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('LOYALTY_TIER_UPGRADED').success).toBe(true);
      expect(WebhookEventTypeSchema.safeParse('INVALID_EVENT').success).toBe(false);
    });
  });

  describe('CreateWebhookSubscriptionSchema', () => {
    it('validates valid subscription payload', () => {
      const valid = {
        name: 'Inventory Alerts Webhook',
        target_url: 'https://api.example.com/webhooks/stokrova',
        event_types: ['INVENTORY_STOCK_LOW', 'B2B_CREDIT_HOLD'],
      };
      const res = CreateWebhookSubscriptionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects invalid target URLs', () => {
      const invalid = {
        name: 'Invalid URL Webhook',
        target_url: 'not-a-valid-url',
        event_types: ['ORDER_CREATED'],
      };
      expect(CreateWebhookSubscriptionSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects empty event_types array', () => {
      const invalid = {
        name: 'No Events Webhook',
        target_url: 'https://api.example.com/webhooks',
        event_types: [],
      };
      expect(CreateWebhookSubscriptionSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('ReplayDeadLetterSchema & RotateWebhookSecretSchema', () => {
    it('validates dead letter replay options', () => {
      expect(ReplayDeadLetterSchema.safeParse({ subscription_id: 'sub-1' }).success).toBe(true);
      expect(ReplayDeadLetterSchema.safeParse({ dead_letter_ids: ['dlq-1', 'dlq-2'] }).success).toBe(true);
      expect(ReplayDeadLetterSchema.safeParse({}).success).toBe(true);
    });

    it('validates secret rotation schema', () => {
      expect(
        RotateWebhookSecretSchema.safeParse({
          subscription_id: 'sub-1',
          custom_secret: 'whsec_new_super_secret_token_123456789',
        }).success,
      ).toBe(true);

      // Secret too short (< 16 chars)
      expect(
        RotateWebhookSecretSchema.safeParse({
          subscription_id: 'sub-1',
          custom_secret: 'short',
        }).success,
      ).toBe(false);
    });

    it('validates test subscription schema', () => {
      expect(
        TestWebhookSubscriptionSchema.safeParse({
          subscription_id: 'sub-10',
          event_type: 'ORDER_FULFILLED',
        }).success,
      ).toBe(true);
    });
  });

  describe('NotificationTemplateSchema', () => {
    it('validates template with variables', () => {
      const valid = {
        template: 'Order {{order_id}} has been completed for {{customer}}.',
        variables: { order_id: '1001', customer: 'Acme Corp' },
      };
      expect(NotificationTemplateSchema.safeParse(valid).success).toBe(true);
    });
  });
});
