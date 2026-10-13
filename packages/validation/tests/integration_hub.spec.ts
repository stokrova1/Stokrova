import { describe, it, expect } from 'vitest';
import {
  CreateIntegrationInstanceSchema,
  UpdateIntegrationInstanceSchema,
  CreateDeveloperApiKeySchema,
  StoreIntegrationCredentialSchema,
  CreateEntityMappingSchema,
  CreateFieldMappingSchema,
  InboundWebhookPayloadSchema,
  ExternalEndpointUrlSchema,
} from '../src/integration_hub.js';

describe('STOKROVA Phase 12 — Integration Hub Validation Schemas', () => {
  describe('CreateIntegrationInstanceSchema', () => {
    it('accepts valid integration instance request', () => {
      const res = CreateIntegrationInstanceSchema.safeParse({
        name: 'Main Shopify Store',
        connector_code: 'ECOMMERCE_SHOPIFY',
        company_id: 'comp_1',
        branch_id: 'br_1',
        config: { shop_domain: 'example.myshopify.com' },
      });
      expect(res.success).toBe(true);
    });

    it('rejects unknown connector code', () => {
      const res = CreateIntegrationInstanceSchema.safeParse({
        name: 'Unknown Store',
        connector_code: 'NON_EXISTENT_CONNECTOR',
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty name', () => {
      const res = CreateIntegrationInstanceSchema.safeParse({
        name: '   ',
        connector_code: 'ECOMMERCE_SHOPIFY',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('CreateDeveloperApiKeySchema', () => {
    it('accepts valid API key creation request', () => {
      const res = CreateDeveloperApiKeySchema.safeParse({
        name: 'Warehouse Scanner API Key',
        scopes: ['orders.read', 'inventory.read'],
        rate_limit_per_minute: 120,
        expires_in_days: 90,
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty scopes list', () => {
      const res = CreateDeveloperApiKeySchema.safeParse({
        name: 'Invalid Key',
        scopes: [],
      });
      expect(res.success).toBe(false);
    });
  });

  describe('StoreIntegrationCredentialSchema', () => {
    it('accepts valid credential request', () => {
      const res = StoreIntegrationCredentialSchema.safeParse({
        name: 'Shopify Admin Access Token',
        secret: 'shpat_abcdef1234567890',
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty secret', () => {
      const res = StoreIntegrationCredentialSchema.safeParse({
        name: 'Empty Token',
        secret: '   ',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('ExternalEndpointUrlSchema (SSRF Armor)', () => {
    it('accepts valid external public endpoints', () => {
      expect(ExternalEndpointUrlSchema.safeParse('https://api.stripe.com/v1').success).toBe(true);
      expect(ExternalEndpointUrlSchema.safeParse('https://api.shopify.com').success).toBe(true);
    });

    it('rejects loopback and private IPs via schema refinement', () => {
      expect(ExternalEndpointUrlSchema.safeParse('http://127.0.0.1:8000/callback').success).toBe(false);
      expect(ExternalEndpointUrlSchema.safeParse('http://localhost/test').success).toBe(false);
      expect(ExternalEndpointUrlSchema.safeParse('http://169.254.169.254/latest').success).toBe(false);
      expect(ExternalEndpointUrlSchema.safeParse('http://192.168.1.1/').success).toBe(false);
    });
  });

  describe('CreateEntityMappingSchema', () => {
    it('accepts valid entity mapping', () => {
      const res = CreateEntityMappingSchema.safeParse({
        entity_type: 'ORDER',
        external_id: 'shp_order_998822',
        internal_id: 'ord_uuid_01',
        metadata: { channel: 'shopify' },
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid entity type', () => {
      const res = CreateEntityMappingSchema.safeParse({
        entity_type: 'INVALID_ENTITY_TYPE',
        external_id: 'ext_1',
        internal_id: 'int_1',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('CreateFieldMappingSchema', () => {
    it('accepts valid field mapping with transform', () => {
      const res = CreateFieldMappingSchema.safeParse({
        entity_type: 'PRODUCT',
        source_field: 'remote_price',
        target_field: 'unit_price_minor',
        transform_type: 'CURRENCY_MINOR',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('InboundWebhookPayloadSchema', () => {
    it('accepts valid inbound webhook payload', () => {
      const res = InboundWebhookPayloadSchema.safeParse({
        provider: 'STRIPE',
        provider_event_id: 'evt_1Mb234567',
        event_type: 'payment_intent.succeeded',
        payload: { id: 'pi_123', amount: 5000 },
        signature: 't=1600000,v1=abcdef',
      });
      expect(res.success).toBe(true);
    });

    it('rejects missing event id', () => {
      const res = InboundWebhookPayloadSchema.safeParse({
        provider: 'STRIPE',
        provider_event_id: '',
        event_type: 'payment_intent.succeeded',
        payload: {},
      });
      expect(res.success).toBe(false);
    });
  });
});
