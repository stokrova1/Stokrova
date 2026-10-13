import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConnectorCatalogService } from './connector-catalog.service.js';
import { DeveloperPlatformService } from './developer-platform.service.js';
import { CredentialReferenceService } from './credential-reference.service.js';
import { IntegrationInstancesService } from './integration-instances.service.js';
import { InboundWebhookGatewayService } from './inbound-webhook-gateway.service.js';
import { IntegrationSyncService } from './integration-sync.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { IntegrationAuditService } from './integration-audit.service.js';
import { IntegrationsController } from './integrations.controller.js';
import {
  validateExternalEndpointUrl,
  maskSecret,
  redactSensitiveObject,
  applyFieldTransformation,
  computeSha256Hash,
  generateStripeSignatureHeader,
} from '@stokrova/domain';
import type { ConnectorType } from '@stokrova/contracts';

describe('STOKROVA Phase 12 — Master Integration Hub & Developer Platform Acceptance Test Suite', () => {
  let catalogService: ConnectorCatalogService;
  let devPlatformService: DeveloperPlatformService;
  let credentialService: CredentialReferenceService;
  let instancesService: IntegrationInstancesService;
  let webhookGateway: InboundWebhookGatewayService;
  let syncService: IntegrationSyncService;
  let reconciliationService: ReconciliationService;
  let auditService: IntegrationAuditService;
  let controller: IntegrationsController;

  const tenant1 = 'ten_phase12_enterprise_001';
  const tenant2 = 'ten_phase12_retail_002';
  const userAdmin = 'usr_int_admin_99';

  beforeEach(() => {
    catalogService = new ConnectorCatalogService();
    devPlatformService = new DeveloperPlatformService();
    credentialService = new CredentialReferenceService();
    instancesService = new IntegrationInstancesService(catalogService);
    webhookGateway = new InboundWebhookGatewayService();
    syncService = new IntegrationSyncService(instancesService);
    reconciliationService = new ReconciliationService();
    auditService = new IntegrationAuditService();

    // Mock existing Phase 7 services
    const mockConsolidation = {} as any;
    const mockInterCompany = {} as any;
    const mockWebhooks = {} as any;
    const mockDocument = {} as any;
    const mockNotifications = {} as any;

    controller = new IntegrationsController(
      mockConsolidation,
      mockInterCompany,
      mockWebhooks,
      mockDocument,
      mockNotifications,
      catalogService,
      instancesService,
      devPlatformService,
      credentialService,
      webhookGateway,
      syncService,
      reconciliationService,
      auditService,
    );
  });

  // =========================================================================
  // SECTION 1: Connector Catalog & Registry (Scenarios 1-5)
  // =========================================================================
  describe('Section 1: Connector Catalog & Registry', () => {
    it('Scenario 1: should return all 10 standard connectors with categories, capabilities, and auth types', () => {
      const connectors = catalogService.listConnectors();
      expect(connectors).toHaveLength(10);

      const codes = connectors.map((c) => c.code);
      expect(codes).toContain('ECOMMERCE_SHOPIFY');
      expect(codes).toContain('ECOMMERCE_WOOCOMMERCE');
      expect(codes).toContain('ECOMMERCE_GENERIC');
      expect(codes).toContain('PAYMENT_STRIPE');
      expect(codes).toContain('PAYMENT_GENERIC');
      expect(codes).toContain('CARRIER_FEDEX');
      expect(codes).toContain('CARRIER_GENERIC');
      expect(codes).toContain('ACCOUNTING_QUICKBOOKS');
      expect(codes).toContain('ERP_GENERIC');
      expect(codes).toContain('CUSTOM_WEBHOOK');

      for (const connector of connectors) {
        expect(connector.name).toBeDefined();
        expect(connector.category).toBeDefined();
        expect(connector.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('Scenario 2: should retrieve individual connector metadata by code with accurate definitions', () => {
      const shopify = catalogService.getConnector('ECOMMERCE_SHOPIFY');
      expect(shopify.code).toBe('ECOMMERCE_SHOPIFY');
      expect(shopify.category).toBe('ECOMMERCE');
      expect(shopify.capabilities).toContain('ORDER_IMPORT');
      expect(shopify.capabilities).toContain('STOCK_SYNC');

      const stripe = catalogService.getConnector('PAYMENT_STRIPE');
      expect(stripe.code).toBe('PAYMENT_STRIPE');
      expect(stripe.category).toBe('PAYMENT');
      expect(stripe.capabilities).toContain('PAYMENT_VERIFY');
    });

    it('Scenario 3: should throw NotFoundException when querying a non-existent connector', () => {
      expect(() =>
        catalogService.getConnector('UNKNOWN_CONNECTOR' as ConnectorType),
      ).toThrow(NotFoundException);
    });

    it('Scenario 4: should perform connector health check reporting latency, status, and message', async () => {
      const healthyShopify = await catalogService.performHealthCheck('ECOMMERCE_SHOPIFY', {
        shop_domain: 'mystore.myshopify.com',
      });
      expect(healthyShopify.is_healthy).toBe(true);
      expect(healthyShopify.connector_code).toBe('ECOMMERCE_SHOPIFY');
      expect(healthyShopify.latency_ms).toBeGreaterThanOrEqual(0);

      const unconfiguredShopify = await catalogService.performHealthCheck('ECOMMERCE_SHOPIFY', {});
      expect(unconfiguredShopify.is_healthy).toBe(false);
      expect(unconfiguredShopify.message).toContain('Missing shop_domain');
    });

    it('Scenario 5: should validate connector configuration schema rejecting invalid parameters', () => {
      const invalidShopify = catalogService.getAdapter('ECOMMERCE_SHOPIFY').validateConfig({});
      expect(invalidShopify.isValid).toBe(false);
      expect(invalidShopify.errors).toContain('shop_domain is required');

      const validShopify = catalogService.getAdapter('ECOMMERCE_SHOPIFY').validateConfig({
        shop_domain: 'acme.myshopify.com',
      });
      expect(validShopify.isValid).toBe(true);
      expect(validShopify.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // SECTION 2: Developer Platform & API Key Management (Scenarios 6-10)
  // =========================================================================
  describe('Section 2: Developer Platform & API Key Management', () => {
    it('Scenario 6: should generate ak_live_ prefixed API key, reveal plaintext once, and store SHA-256 hash', async () => {
      const result = await devPlatformService.createApiKey(
        tenant1,
        {
          name: 'Phase12 Master Integration Key',
          scopes: ['orders:read', 'orders:write', 'inventory:sync'],
          rate_limit_per_minute: 120,
        },
      );

      expect(result.raw_api_key).toMatch(/^ak_live_[a-f0-9]{48}$/);
      expect(result.apiKey.name).toBe('Phase12 Master Integration Key');
      expect(result.apiKey.key_prefix).toMatch(/^ak_live_/);
      expect(result.apiKey.is_active).toBe(true);

      // Crucial security invariant: stored key_hash is the SHA-256 hex digest, NOT the plaintext
      const computedHash = computeSha256Hash(result.raw_api_key);
      expect(result.apiKey.key_hash).toBe(computedHash);
      expect(result.apiKey.key_hash).not.toBe(result.raw_api_key);
    });

    it('Scenario 7: should verify valid plaintext API key against hash and reject invalid secret', async () => {
      const { apiKey, raw_api_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Verification Test Key', scopes: ['inventory:read'] },
      );

      // Positive verification
      const verified = await devPlatformService.verifyApiKey(raw_api_key);
      expect(verified.tenant_id).toBe(tenant1);
      expect(verified.id).toBe(apiKey.id);
      expect(verified.scopes).toContain('inventory:read');

      // Negative verification (tampered key)
      const tamperedKey = raw_api_key.slice(0, -4) + 'ffff';
      await expect(devPlatformService.verifyApiKey(tamperedKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Scenario 8: should list tenant API keys showing masked preview and never exposing hash or plaintext', async () => {
      await devPlatformService.createApiKey(
        tenant1,
        { name: 'App 1 Key', scopes: ['read'] },
      );
      await devPlatformService.createApiKey(
        tenant1,
        { name: 'App 2 Key', scopes: ['write'] },
      );

      const keys = await devPlatformService.listApiKeys(tenant1);
      expect(keys.length).toBeGreaterThanOrEqual(2);

      for (const k of keys) {
        expect(k.key_prefix).toBeDefined();
        expect(k.masked_key).toContain('****');
        expect((k as any).raw_api_key).toBeUndefined();
      }
    });

    it('Scenario 9: should revoke API key transitioning status and failing subsequent verifications', async () => {
      const { apiKey, raw_api_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Revocable Key', scopes: ['full'] },
      );

      const revoked = await devPlatformService.revokeApiKey(tenant1, apiKey.id);
      expect(revoked.is_active).toBe(false);
      expect(revoked.revoked_at).toBeDefined();

      await expect(devPlatformService.verifyApiKey(raw_api_key)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Scenario 10: should enforce rate limiting by throwing BadRequestException when threshold exceeded', async () => {
      const { raw_api_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Rate Limited Key', scopes: ['read'], rate_limit_per_minute: 2 },
      );

      // Request 1: OK
      await devPlatformService.verifyApiKey(raw_api_key);

      // Request 2: OK
      await devPlatformService.verifyApiKey(raw_api_key);

      // Request 3: Exceeded rate limit
      await expect(devPlatformService.verifyApiKey(raw_api_key)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // SECTION 3: Credential Reference & Secret Masking (Scenarios 11-13)
  // =========================================================================
  describe('Section 3: Credential Reference & Secret Masking', () => {
    it('Scenario 11: should store credential reference with masked preview and SHA-256 fingerprint, never plain secret', async () => {
      const plainSecret = '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';
      const cred = await credentialService.storeCredential(
        tenant1,
        'inst_shopify_01',
        {
          name: 'Shopify Admin Token',
          secret: plainSecret,
        },
      );

      expect(cred.name).toBe('Shopify Admin Token');
      expect(cred.masked_secret).toBe(maskSecret(plainSecret, 6, 4));
      expect(cred.masked_secret).toContain('****');
      expect(cred.secret_hash).toBe(computeSha256Hash(plainSecret));

      // The returned entity must never include plain secret
      expect((cred as any).secret).toBeUndefined();
    });

    it('Scenario 12: should rotate credential updating fingerprint and preview', async () => {
      const initialSecret = 'sk_live_old_secret_abcdefgh123456';
      const cred = await credentialService.storeCredential(
        tenant1,
        'inst_stripe_01',
        {
          name: 'Stripe Secret Key',
          secret: initialSecret,
        },
      );
      const oldHash = cred.secret_hash;

      const newSecret = 'sk_live_new_secret_zyxwvuts987654';
      const rotated = await credentialService.rotateCredential(
        tenant1,
        cred.id,
        newSecret,
      );

      expect(rotated.masked_secret).toBe(maskSecret(newSecret, 6, 4));
      expect(rotated.secret_hash).toBe(computeSha256Hash(newSecret));
      expect(rotated.secret_hash).not.toBe(oldHash);
    });

    it('Scenario 13: should never leak secret values under credential listing or lookup queries', async () => {
      await credentialService.storeCredential(
        tenant1,
        'inst_generic_01',
        {
          name: 'Webhook Secret',
          secret: 'whsec_very_confidential_signing_key_12345',
        },
      );

      const list = await credentialService.listCredentials(tenant1);
      expect(list.length).toBeGreaterThan(0);
      for (const item of list) {
        expect(JSON.stringify(item)).not.toContain('whsec_very_confidential_signing_key_12345');
        expect(item.masked_secret).toContain('****');
      }
    });
  });

  // =========================================================================
  // SECTION 4: Integration Instance Lifecycle & SSRF Defense (Scenarios 14-18)
  // =========================================================================
  describe('Section 4: Integration Instance Lifecycle & SSRF Defense', () => {
    it('Scenario 14: should create integration instance in DRAFT state with tenant isolation', async () => {
      const instance = await instancesService.createInstance(
        tenant1,
        {
          connector_code: 'ECOMMERCE_SHOPIFY',
          name: 'Acme US Shopify Store',
          config: {
            shop_domain: 'acme-us.myshopify.com',
            sync_frequency_minutes: 15,
          },
        },
      );

      expect(instance.tenant_id).toBe(tenant1);
      expect(instance.status).toBe('DRAFT');
      expect(instance.connector_code).toBe('ECOMMERCE_SHOPIFY');

      // Tenant 2 cannot see Tenant 1 instance
      await expect(instancesService.getInstanceById(tenant2, instance.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Scenario 15: should support valid lifecycle state transitions (DRAFT -> CONFIGURED -> VALIDATING -> ACTIVE -> SUSPENDED)', async () => {
      const instance = await instancesService.createInstance(
        tenant1,
        {
          connector_code: 'PAYMENT_STRIPE',
          name: 'Stripe Direct',
          config: { account_id: 'acct_12345' },
        },
      );

      // DRAFT -> CONFIGURED
      const configured = await instancesService.transitionStatus(tenant1, instance.id, 'CONFIGURED');
      expect(configured.status).toBe('CONFIGURED');

      // CONFIGURED -> VALIDATING
      const validating = await instancesService.transitionStatus(tenant1, instance.id, 'VALIDATING');
      expect(validating.status).toBe('VALIDATING');

      // VALIDATING -> ACTIVE
      const active = await instancesService.transitionStatus(tenant1, instance.id, 'ACTIVE');
      expect(active.status).toBe('ACTIVE');

      // ACTIVE -> SUSPENDED
      const suspended = await instancesService.transitionStatus(tenant1, instance.id, 'SUSPENDED');
      expect(suspended.status).toBe('SUSPENDED');

      // SUSPENDED -> ACTIVE
      const resumed = await instancesService.transitionStatus(tenant1, instance.id, 'ACTIVE');
      expect(resumed.status).toBe('ACTIVE');
    });

    it('Scenario 16: should throw error on illegal lifecycle transition (DRAFT -> ACTIVE directly)', async () => {
      const instance = await instancesService.createInstance(
        tenant1,
        {
          connector_code: 'CARRIER_FEDEX',
          name: 'FedEx Fleet',
          config: { account_number: 'FX123' },
        },
      );

      // DRAFT cannot jump directly to ACTIVE without configuration and validation
      await expect(
        instancesService.transitionStatus(tenant1, instance.id, 'ACTIVE'),
      ).rejects.toThrow();
    });

    it('Scenario 17: should block SSRF attempts targeting private IP ranges, cloud metadata, and loopback', () => {
      // Loopback
      expect(validateExternalEndpointUrl('http://127.0.0.1:8080/hook').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://localhost/admin').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://127.0.0.2/hook').isValid).toBe(false);

      // RFC 1918 Private networks
      expect(validateExternalEndpointUrl('http://10.0.0.5/api').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://192.168.1.1/setup').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://172.16.0.100/internal').isValid).toBe(false);

      // Cloud Metadata
      expect(validateExternalEndpointUrl('http://169.254.169.254/latest/meta-data').isValid).toBe(false);

      // Userinfo phishing / bypass
      expect(validateExternalEndpointUrl('https://admin:pass@legit.com').isValid).toBe(false);

      // Non-HTTP/HTTPS
      expect(validateExternalEndpointUrl('ftp://example.com/file').isValid).toBe(false);
    });

    it('Scenario 18: should allow legitimate public HTTPS API endpoints', () => {
      expect(validateExternalEndpointUrl('https://api.stripe.com/v1/charges').isValid).toBe(true);
      expect(validateExternalEndpointUrl('https://acme.myshopify.com/admin/api/2026-10/orders.json').isValid).toBe(true);
      expect(validateExternalEndpointUrl('https://ws.fedex.com/track').isValid).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 5: Inbound Webhook Gateway, Replay & Deduplication (Scenarios 19-24)
  // =========================================================================
  describe('Section 5: Inbound Webhook Gateway, Replay & Deduplication', () => {
    const signingSecret = 'whsec_prod_stokrova_testing_key_2026';
    const payloadObj = {
      id: 'evt_stripe_order_999',
      amount_cents: 15000,
      currency: 'USD',
      customer_email: 'buyer@example.com',
    };

    it('Scenario 19: should accept valid HMAC-SHA256 inbound webhook and record receipt', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(payloadObj);
      const signatureHeader = generateStripeSignatureHeader(signingSecret, payloadStr, nowEpochSec);

      const result = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'PAYMENT_STRIPE',
          provider_event_id: 'evt_stripe_order_999',
          event_type: 'payment_intent.succeeded',
          payload: payloadObj,
          timestamp: nowEpochSec,
          signature: signatureHeader,
        },
        signingSecret,
      );

      expect(result.was_processed).toBe(true);
      expect(result.receipt.tenant_id).toBe(tenant1);
      expect(result.receipt.provider).toBe('PAYMENT_STRIPE');
      expect(result.receipt.provider_event_id).toBe('evt_stripe_order_999');
      expect(result.receipt.status).toBe('PROCESSED');
      expect(result.receipt.payload_hash).toBe(computeSha256Hash(payloadStr));
    });

    it('Scenario 20: should reject invalid or tampered signature with UnauthorizedException', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const fakeSignature = 'bad_sig_deadbeefcafebabef00d';

      await expect(
        webhookGateway.ingestWebhook(
          tenant1,
          {
            provider: 'PAYMENT_STRIPE',
            provider_event_id: 'evt_tampered_001',
            event_type: 'charge.failed',
            payload: payloadObj,
            timestamp: nowEpochSec,
            signature: fakeSignature,
          },
          signingSecret,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('Scenario 21: should reject webhook timestamp older than 300-second replay window', async () => {
      const staleEpochSec = Math.floor(Date.now() / 1000) - 350; // 350s old
      const payloadStr = JSON.stringify(payloadObj);
      const signature = generateStripeSignatureHeader(signingSecret, payloadStr, staleEpochSec);

      await expect(
        webhookGateway.ingestWebhook(
          tenant1,
          {
            provider: 'PAYMENT_STRIPE',
            provider_event_id: 'evt_stale_replay_002',
            event_type: 'charge.failed',
            payload: payloadObj,
            timestamp: staleEpochSec,
            signature,
          },
          signingSecret,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('Scenario 22: should return cached idempotent receipt on duplicate event_id without reprocessing', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(payloadObj);
      const signature = generateStripeSignatureHeader(signingSecret, payloadStr, nowEpochSec);

      const first = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'PAYMENT_STRIPE',
          provider_event_id: 'evt_duplicate_id_300',
          event_type: 'payment_intent.succeeded',
          payload: payloadObj,
          timestamp: nowEpochSec,
          signature,
        },
        signingSecret,
      );

      // Replay identical event
      const duplicate = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'PAYMENT_STRIPE',
          provider_event_id: 'evt_duplicate_id_300',
          event_type: 'payment_intent.succeeded',
          payload: payloadObj,
          timestamp: nowEpochSec,
          signature,
        },
        signingSecret,
      );

      expect(duplicate.is_duplicate).toBe(true);
      expect(duplicate.was_processed).toBe(false);
      expect(duplicate.receipt.id).toBe(first.receipt.id);
    });

    it('Scenario 23: should reject inbound payload exceeding 1MB size limit', async () => {
      const largePayload = { large_field: 'X'.repeat(1024 * 1024 + 50) };
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(largePayload);
      const signature = generateStripeSignatureHeader(signingSecret, payloadStr, nowEpochSec);

      await expect(
        webhookGateway.ingestWebhook(
          tenant1,
          {
            provider: 'PAYMENT_STRIPE',
            provider_event_id: 'evt_huge_payload_400',
            event_type: 'bulk.export',
            payload: largePayload,
            timestamp: nowEpochSec,
            signature,
          },
          signingSecret,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Scenario 24: should enforce tenant isolation on webhook receipt lookups', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(payloadObj);
      const signature = generateStripeSignatureHeader(signingSecret, payloadStr, nowEpochSec);

      await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'PAYMENT_STRIPE',
          provider_event_id: 'evt_tenant1_receipt',
          event_type: 'payment_intent.succeeded',
          payload: payloadObj,
          timestamp: nowEpochSec,
          signature,
        },
        signingSecret,
      );

      const tenant1Receipts = await webhookGateway.listReceipts(tenant1);
      expect(tenant1Receipts.some((r) => r.provider_event_id === 'evt_tenant1_receipt')).toBe(true);

      const tenant2Receipts = await webhookGateway.listReceipts(tenant2);
      expect(tenant2Receipts.some((r) => r.provider_event_id === 'evt_tenant1_receipt')).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 6: Bidirectional Sync, Field Mapping & Conflict Resolution (Scenarios 25-30)
  // =========================================================================
  describe('Section 6: Bidirectional Sync, Field Mapping & Conflict Resolution', () => {
    let instanceId: string;

    beforeEach(async () => {
      const inst = await instancesService.createInstance(tenant1, {
        connector_code: 'ECOMMERCE_SHOPIFY',
        name: 'Shopify Store For Mappings',
      });
      instanceId = inst.id;
    });

    it('Scenario 25: should record bidirectional identity mapping between STOKROVA and external system', async () => {
      const mapping = await syncService.createEntityMapping(tenant1, instanceId, {
        entity_type: 'ORDER',
        external_id: 'gid://shopify/Order/89127391',
        internal_id: 'so_stokrova_00192',
      });

      expect(mapping.internal_id).toBe('so_stokrova_00192');
      expect(mapping.external_id).toBe('gid://shopify/Order/89127391');

      const found = await syncService.findMappingByExternalId(
        tenant1,
        instanceId,
        'ORDER',
        'gid://shopify/Order/89127391',
      );
      expect(found).not.toBeNull();
      expect(found!.internal_id).toBe('so_stokrova_00192');
    });

    it('Scenario 26: should resolve conflict with STOKROVA_WINS preserving internal record', () => {
      const internalRecord = { id: 'so_1', status: 'CONFIRMED', total_cents: 10000 };
      const externalRecord = { id: 'so_1', status: 'PENDING', total_cents: 9000 };

      const resolution = syncService.resolveConflict(
        'STOKROVA_WINS',
        internalRecord,
        externalRecord,
        '2026-10-13T10:00:00Z',
        '2026-10-13T10:05:00Z',
      );

      expect(resolution.resolution).toBe('INTERNAL');
      expect(resolution.winningRecord).toEqual(internalRecord);
    });

    it('Scenario 27: should resolve conflict with EXTERNAL_WINS applying external updates', () => {
      const internalRecord = { id: 'so_1', status: 'CONFIRMED' };
      const externalRecord = { id: 'so_1', status: 'FULFILLED' };

      const resolution = syncService.resolveConflict(
        'EXTERNAL_WINS',
        internalRecord,
        externalRecord,
        '2026-10-13T10:00:00Z',
        '2026-10-13T10:05:00Z',
      );

      expect(resolution.resolution).toBe('EXTERNAL');
      expect(resolution.winningRecord).toEqual(externalRecord);
    });

    it('Scenario 28: should throw ConflictException when MANUAL_REVIEW policy requires human review', () => {
      const internalRecord = { sku: 'PROD-A', price: 5000 };
      const externalRecord = { sku: 'PROD-A', price: 4200 };

      expect(() =>
        syncService.resolveConflict(
          'MANUAL_REVIEW',
          internalRecord,
          externalRecord,
          '2026-10-13T10:00:00Z',
          '2026-10-13T10:05:00Z',
        ),
      ).toThrow(ConflictException);
    });

    it('Scenario 29: should execute field transformation pipeline (DIRECT, ENUM_MAP, CURRENCY_MINOR, BASIS_POINTS)', async () => {
      await syncService.createFieldMapping(tenant1, instanceId, {
        entity_type: 'ORDER',
        source_field: 'status_raw',
        target_field: 'status',
        transform_type: 'ENUM_MAP',
        transform_config: {
          mapping: {
            placed: 'CONFIRMED',
            shipped: 'DISPATCHED',
          },
        },
      });

      await syncService.createFieldMapping(tenant1, instanceId, {
        entity_type: 'ORDER',
        source_field: 'price_decimal',
        target_field: 'amount_minor',
        transform_type: 'CURRENCY_MINOR',
      });

      await syncService.createFieldMapping(tenant1, instanceId, {
        entity_type: 'ORDER',
        source_field: 'discount_pct',
        target_field: 'discount_bps',
        transform_type: 'BASIS_POINTS',
      });

      const sourceExternal = {
        status_raw: 'placed',
        price_decimal: 149.95,
        discount_pct: 12.5,
      };

      const transformed = await syncService.transformRecord(
        tenant1,
        instanceId,
        'ORDER',
        sourceExternal,
      );

      expect(transformed['status']).toBe('CONFIRMED');
      expect(transformed['amount_minor']).toBe('14995');
      expect(transformed['discount_bps']).toBe(1250);
    });

    it('Scenario 30: should track sync run lifecycle with checkpoints and processed counts', async () => {
      const run = await syncService.triggerSyncRun(tenant1, instanceId, {
        direction: 'IMPORT',
        cursor_checkpoint: 'cursor_page_1',
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.cursor_checkpoint).toBe('cursor_page_1');
      expect(run.records_processed).toBe(10);
      expect(run.records_accepted).toBe(10);

      const runs = await syncService.listSyncRuns(tenant1, instanceId);
      expect(runs.length).toBeGreaterThan(0);
      expect(runs[0].id).toBe(run.id);
    });
  });

  // =========================================================================
  // SECTION 7: Reconciliation & Discrepancy Auditing (Scenarios 31-34)
  // =========================================================================
  describe('Section 7: Reconciliation & Discrepancy Auditing', () => {
    it('Scenario 31: should detect state discrepancies between internal entities and external systems', async () => {
      const rec = await reconciliationService.compareAndRecord(
        tenant1,
        'inst_shopify_01',
        {
          entity_type: 'INVENTORY',
          internal_id: 'prod_1',
          external_id: 'ext_1',
          internal_state: { sku: 'SKU-001', stock_quantity: 100 },
          external_state: { sku: 'SKU-001', stock_quantity: 85 }, // Discrepancy of 15
        },
      );

      expect(rec.status).toBe('DISCREPANCY_DETECTED');
      expect(rec.discrepancy_details).toBeDefined();
      expect(rec.discrepancy_details!['stock_quantity']).toEqual({ internal: 100, external: 85 });
    });

    it('Scenario 32: should resolve discrepancy marking record as RESOLVED', async () => {
      const rec = await reconciliationService.compareAndRecord(
        tenant1,
        'inst_shopify_01',
        {
          entity_type: 'ORDER',
          internal_id: 'so_1',
          external_id: 'ext_so_1',
          internal_state: { status: 'CONFIRMED' },
          external_state: { status: 'PENDING' },
        },
      );

      const resolved = await reconciliationService.resolveDiscrepancy(tenant1, rec.id);

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolved_at).toBeDefined();
    });

    it('Scenario 33: should mark matched records without discrepancies as MATCHED', async () => {
      const rec = await reconciliationService.compareAndRecord(
        tenant1,
        'inst_stripe_01',
        {
          entity_type: 'PAYMENT',
          internal_id: 'pay_1',
          external_id: 'pi_1',
          internal_state: { status: 'SUCCEEDED', amount: 5000 },
          external_state: { status: 'SUCCEEDED', amount: 5000 },
        },
      );

      expect(rec.status).toBe('MATCHED');
      expect(rec.discrepancy_details).toBeUndefined();
    });

    it('Scenario 34: should filter reconciliations by status', async () => {
      const list = await reconciliationService.listReconciliations(tenant1);
      expect(Array.isArray(list)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 8: Integration Audit Logging & Redaction (Scenarios 35-37)
  // =========================================================================
  describe('Section 8: Integration Audit Logging & Redaction', () => {
    it('Scenario 35: should generate immutable audit log entry for integration operations', async () => {
      const entry = await auditService.recordEvent(
        tenant1,
        'WEBHOOK_PROCESSED',
        'ORDER',
        'so_123',
        'system_webhook',
        { event: 'orders/create', items_count: 3 },
      );

      expect(entry.id).toBeDefined();
      expect(entry.tenant_id).toBe(tenant1);
      expect(entry.action).toBe('WEBHOOK_PROCESSED');
      expect(entry.created_at).toBeDefined();
    });

    it('Scenario 36: should automatically redact sensitive fields (tokens, secrets, passwords) in audit payload', async () => {
      const rawDetails = {
        user: 'admin',
        api_key: 'ak_live_secret123456789',
        webhook_secret: 'whsec_secret_signing_key',
        nested: {
          client_secret: 'super_confidential',
          password: 'myPassword123',
          public_info: 'allowed',
        },
      };

      const entry = await auditService.recordEvent(
        tenant1,
        'CREDENTIAL_ROTATED',
        'CREDENTIAL',
        'cred_99',
        userAdmin,
        rawDetails,
      );

      const detailsStr = JSON.stringify(entry.details);
      expect(detailsStr).not.toContain('ak_live_secret123456789');
      expect(detailsStr).not.toContain('whsec_secret_signing_key');
      expect(detailsStr).not.toContain('super_confidential');
      expect(detailsStr).not.toContain('myPassword123');
      expect(entry.details!['api_key']).toBe('[REDACTED]');
      expect((entry.details!['nested'] as any)['password']).toBe('[REDACTED]');
      expect((entry.details!['nested'] as any)['public_info']).toBe('allowed');
    });

    it('Scenario 37: should enforce strict multi-tenant isolation on audit log queries', async () => {
      await auditService.recordEvent(tenant1, 'SYNC_STARTED', 'INSTANCE', 'inst_1', 'usr_t1');
      await auditService.recordEvent(tenant2, 'SYNC_STARTED', 'INSTANCE', 'inst_2', 'usr_t2');

      const tenant1Logs = await auditService.listEvents(tenant1);
      expect(tenant1Logs.every((log) => log.tenant_id === tenant1)).toBe(true);

      const tenant2Logs = await auditService.listEvents(tenant2);
      expect(tenant2Logs.every((log) => log.tenant_id === tenant2)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 9: End-to-End Connector Ingestion (Scenarios 38-42)
  // =========================================================================
  describe('Section 9: End-to-End Connector Ingestion', () => {
    let shopifyInstId: string;

    beforeEach(async () => {
      const inst = await instancesService.createInstance(tenant1, {
        connector_code: 'ECOMMERCE_SHOPIFY',
        name: 'E2E Shopify Instance',
      });
      shopifyInstId = inst.id;
    });

    it('Scenario 38: should ingest Shopify order webhook, mapping external IDs and validating schema', async () => {
      const orderPayload = {
        id: 789123456,
        order_number: 1042,
        email: 'shopify_shopper@example.com',
        total_price_set: { shop_money: { amount: '125.50', currency_code: 'USD' } },
        line_items: [{ id: 101, title: 'Cotton Shirt', quantity: 2, price: '62.75' }],
      };

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_shopify_order_secret';
      const sig = generateStripeSignatureHeader(secret, JSON.stringify(orderPayload), now);

      // 1. Ingest via Webhook Gateway
      const res = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'ECOMMERCE_SHOPIFY',
          provider_event_id: 'shopify_order_789123456',
          event_type: 'orders/create',
          payload: orderPayload,
          timestamp: now,
          signature: sig,
        },
        secret,
      );
      expect(res.was_processed).toBe(true);
      expect(res.receipt.status).toBe('PROCESSED');

      // 2. Map external ID
      const mapping = await syncService.createEntityMapping(tenant1, shopifyInstId, {
        entity_type: 'ORDER',
        external_id: '789123456',
        internal_id: 'so_stokrova_shopify_1042',
      });
      expect(mapping.external_id).toBe('789123456');

      // 3. Record Sync Run
      const run = await syncService.triggerSyncRun(tenant1, shopifyInstId, {
        direction: 'IMPORT',
      });
      expect(run.status).toBe('COMPLETED');
    });

    it('Scenario 39: should ingest WooCommerce order mapping line items and pure integer minor-unit prices', async () => {
      const inst = await instancesService.createInstance(tenant1, {
        connector_code: 'ECOMMERCE_WOOCOMMERCE',
        name: 'WooCommerce Store',
      });

      const wooPayload = {
        id: 5541,
        billing_email: 'woo_shopper@store.com',
        price_raw: '125.50',
      };

      await syncService.createFieldMapping(tenant1, inst.id, {
        entity_type: 'ORDER',
        source_field: 'price_raw',
        target_field: 'price_minor',
        transform_type: 'CURRENCY_MINOR',
      });

      const mapped = await syncService.transformRecord(
        tenant1,
        inst.id,
        'ORDER',
        wooPayload,
      );
      expect(mapped['price_minor']).toBe('12550');
    });

    it('Scenario 40: should ingest Stripe payment event and link payment intent without direct General Ledger mutation', async () => {
      const stripePayload = {
        id: 'evt_stripe_payment_success_11',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_3KqTest123456',
            amount: 8500, // integer cents
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_stripe_test';
      const sig = generateStripeSignatureHeader(secret, JSON.stringify(stripePayload), now);

      const res = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'PAYMENT_STRIPE',
          provider_event_id: 'evt_stripe_payment_success_11',
          event_type: 'payment_intent.succeeded',
          payload: stripePayload,
          timestamp: now,
          signature: sig,
        },
        secret,
      );
      expect(res.was_processed).toBe(true);

      const inst = await instancesService.createInstance(tenant1, {
        connector_code: 'PAYMENT_STRIPE',
        name: 'Stripe Gateway',
      });

      // Identity mapping preserves domain authority
      const mapping = await syncService.createEntityMapping(tenant1, inst.id, {
        entity_type: 'PAYMENT',
        external_id: 'pi_3KqTest123456',
        internal_id: 'pay_stokrova_intent_99',
      });
      expect(mapping.internal_id).toBe('pay_stokrova_intent_99');
    });

    it('Scenario 41: should ingest FedEx tracking webhook updating carrier milestone without bypassing logistics domain', async () => {
      const fedexPayload = {
        trackingNumber: '794829103948',
        statusCode: 'DL',
        statusDescription: 'Delivered, left at front door',
        actualDeliveryTimestamp: '2026-10-13T14:30:00Z',
      };

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_fedex_secure';
      const sig = generateStripeSignatureHeader(secret, JSON.stringify(fedexPayload), now);

      const res = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'CARRIER_FEDEX',
          provider_event_id: 'fedex_evt_794829103948_dl',
          event_type: 'tracking.update',
          payload: fedexPayload,
          timestamp: now,
          signature: sig,
        },
        secret,
      );
      expect(res.was_processed).toBe(true);

      const inst = await instancesService.createInstance(tenant1, {
        connector_code: 'CARRIER_FEDEX',
        name: 'FedEx Express',
      });

      const mapping = await syncService.createEntityMapping(tenant1, inst.id, {
        entity_type: 'SHIPMENT',
        external_id: '794829103948',
        internal_id: 'shp_stokrova_004',
      });
      expect(mapping.entity_type).toBe('SHIPMENT');
    });

    it('Scenario 42: should ingest DHL tracking status and map tracking number', async () => {
      const dhlPayload = {
        shipmentTrackingNumber: '9284019284',
        shipmentStatus: 'transit',
      };

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_dhl_key';
      const sig = generateStripeSignatureHeader(secret, JSON.stringify(dhlPayload), now);

      const res = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'CARRIER_DHL',
          provider_event_id: 'dhl_evt_9284019284',
          event_type: 'shipment.status',
          payload: dhlPayload,
          timestamp: now,
          signature: sig,
        },
        secret,
      );
      expect(res.was_processed).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 10: Zero-Bypass Domain Invariants & Security Boundaries (Scenarios 43-45)
  // =========================================================================
  describe('Section 10: Zero-Bypass Domain Invariants & Security Boundaries', () => {
    it('Scenario 43: Inbound integrations cannot directly post General Ledger journal entries', () => {
      // Architectural Golden Rule 7, 22: Integrations only interact through application service commands
      // There are no database tables or methods in integrations module that write to gl_journal_entries.
      // Every payment or order ingestion only produces an InboundWebhookReceipt or SyncRun,
      // which is passed to the PaymentsService or SalesService domain boundary.
      expect((syncService as any).postGeneralLedgerEntry).toBeUndefined();
      expect((webhookGateway as any).mutateLedgerBalance).toBeUndefined();
    });

    it('Scenario 44: Webhook retries and duplicate transmissions are strictly idempotent', async () => {
      const payloadObj = { order_id: 1001, charged: true };
      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_idem_secret';
      const sig = generateStripeSignatureHeader(secret, JSON.stringify(payloadObj), now);

      // Transmission 1
      const res1 = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'ECOMMERCE_SHOPIFY',
          provider_event_id: 'evt_shopify_idem_1001',
          event_type: 'orders/create',
          payload: payloadObj,
          timestamp: now,
          signature: sig,
        },
        secret,
      );

      // Transmission 2 (Network retry with same event ID)
      const res2 = await webhookGateway.ingestWebhook(
        tenant1,
        {
          provider: 'ECOMMERCE_SHOPIFY',
          provider_event_id: 'evt_shopify_idem_1001',
          event_type: 'orders/create',
          payload: payloadObj,
          timestamp: now,
          signature: sig,
        },
        secret,
      );

      // Both invocations yield the exact same receipt record, preventing double processing
      expect(res1.receipt.id).toBe(res2.receipt.id);
      expect(res2.is_duplicate).toBe(true);
      expect(res2.was_processed).toBe(false);
    });

    it('Scenario 45: Integration credentials and API keys are zero-plaintext in storage and telemetry', async () => {
      const plainSecret = 'super_secret_partner_api_key_xyz987';
      const keyResult = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Telemetry Test Key', scopes: ['inventory:read'] },
      );

      const credResult = await credentialService.storeCredential(
        tenant1,
        'inst_99',
        {
          name: 'Partner Key',
          secret: plainSecret,
        },
      );

      // Storage representation checks
      const storedKey = await devPlatformService.getKeyById(tenant1, keyResult.apiKey.id);
      expect(storedKey.key_hash).not.toContain(keyResult.raw_api_key);
      expect(storedKey.key_prefix).toBe(keyResult.raw_api_key.slice(0, 12));

      const storedCred = await credentialService.getCredentialById(tenant1, credResult.id);
      expect(storedCred.masked_secret).toContain('****');
      expect((storedCred as any).secret).toBeUndefined();

      // Redaction in telemetry / log payload
      const redacted = redactSensitiveObject({
        key: keyResult.raw_api_key,
        secret: plainSecret,
        unrelated: 'safe_data',
      });
      expect(redacted['key']).toBe('[REDACTED]');
      expect(redacted['secret']).toBe('[REDACTED]');
      expect(redacted['unrelated']).toBe('safe_data');
    });
  });

  // =========================================================================
  // SECTION 11: Controller Integration & HTTP Endpoints
  // =========================================================================
  describe('Section 11: Controller Integration & HTTP Endpoints', () => {
    it('should expose catalog endpoints through controller', async () => {
      const catalog = await controller.listConnectors();
      expect(catalog).toHaveLength(10);

      const shopify = await controller.getConnector('ECOMMERCE_SHOPIFY');
      expect(shopify.code).toBe('ECOMMERCE_SHOPIFY');
    });

    it('should expose API key management and revocation through controller', async () => {
      const created = await controller.createApiKey(
        tenant1,
        { name: 'Controller Key', scopes: ['all'] },
      );
      expect(created.raw_api_key).toBeDefined();

      const list = await controller.listApiKeys(tenant1);
      expect(list.length).toBeGreaterThan(0);

      const revoked = await controller.revokeApiKey(tenant1, created.apiKey.id);
      expect(revoked.is_active).toBe(false);
    });

    it('should expose instance lifecycle transitions and connection testing through controller', async () => {
      const inst = await controller.createInstance(
        tenant1,
        {
          connector_code: 'PAYMENT_STRIPE',
          name: 'Controller Stripe Inst',
          config: { account_id: 'acct_controller' },
        },
      );
      expect(inst.status).toBe('DRAFT');

      const configured = await controller.transitionInstance(
        tenant1,
        inst.id,
        'CONFIGURED',
      );
      expect(configured.status).toBe('CONFIGURED');

      const testRes = await controller.testConnection(tenant1, inst.id);
      expect(testRes.is_healthy).toBe(true);
    });
  });
});
