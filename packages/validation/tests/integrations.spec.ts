import { describe, it, expect } from 'vitest';
import {
  CreateHoldingGroupSchema,
  CreateInterCompanyTransferSchema,
  CreateWebhookSubscriptionSchema,
  RenderDocumentSchema,
  SendNotificationSchema,
} from '../src/integrations.js';

describe('Multi-Company Consolidation & Integrations Validation Schemas (Phase 11)', () => {
  describe('CreateHoldingGroupSchema', () => {
    it('validates a valid holding group declaration', () => {
      const valid = {
        code: 'HOLDING-US',
        name: 'Stokrova US Holding Corp',
        parent_company_id: 'comp-parent',
        subsidiary_company_ids: ['comp-sub-1', 'comp-sub-2'],
        consolidation_currency: 'USD',
      };
      const parsed = CreateHoldingGroupSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects empty subsidiaries array', () => {
      const invalid = {
        code: 'HOLDING-US',
        name: 'Stokrova US Holding Corp',
        parent_company_id: 'comp-parent',
        subsidiary_company_ids: [],
      };
      const parsed = CreateHoldingGroupSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('CreateInterCompanyTransferSchema', () => {
    it('validates a valid inter-company transfer payload', () => {
      const valid = {
        source_company_id: 'comp-a',
        source_warehouse_id: 'wh-a',
        destination_company_id: 'comp-b',
        destination_warehouse_id: 'wh-b',
        items: [
          { variant_id: 'v-1', sku: 'SKU-01', quantity: 10, unit_transfer_price_minor: '2500' },
        ],
      };
      const parsed = CreateInterCompanyTransferSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects transfer with empty items or non-integer price', () => {
      const invalid = {
        source_company_id: 'comp-a',
        source_warehouse_id: 'wh-a',
        destination_company_id: 'comp-b',
        destination_warehouse_id: 'wh-b',
        items: [
          { variant_id: 'v-1', sku: 'SKU-01', quantity: 10, unit_transfer_price_minor: '25.00' },
        ],
      };
      const parsed = CreateInterCompanyTransferSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('CreateWebhookSubscriptionSchema', () => {
    it('validates a valid webhook subscription with valid URL and events', () => {
      const valid = {
        name: 'ERP Order Sync Webhook',
        target_url: 'https://api.partner.com/webhooks/stokrova',
        event_types: ['ORDER_PAID', 'DELIVERY_COMPLETED'],
        secret_token: 'whsec_very_secure_secret_token_123',
      };
      const parsed = CreateWebhookSubscriptionSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid target URL', () => {
      const invalid = {
        name: 'Bad URL Webhook',
        target_url: 'not-a-valid-url',
        event_types: ['ORDER_PAID'],
      };
      const parsed = CreateWebhookSubscriptionSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('RenderDocumentSchema & SendNotificationSchema', () => {
    it('validates document render request', () => {
      const valid = {
        document_type: 'INVOICE',
        entity_id: 'inv-1001',
        format: 'PDF',
      };
      const parsed = RenderDocumentSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('validates notification send request', () => {
      const valid = {
        channel: 'IN_APP',
        severity: 'WARNING',
        title: 'Low Stock Alert',
        message: 'SKU FLANGE-100 below safety buffer at Main Warehouse',
      };
      const parsed = SendNotificationSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });
});
