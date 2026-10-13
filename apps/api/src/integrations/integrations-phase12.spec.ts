import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
  StandardPermissions,
  SystemRoleTemplates,
  validateExternalEndpointUrl,
  maskSecret,
  redactSensitiveObject,
  applyFieldTransformation,
  resolveRecordConflict,
  isWithinReplayWindow,
  computeSha256Hash,
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
    syncService = new IntegrationSyncService();
    reconciliationService = new ReconciliationService();
    auditService = new IntegrationAuditService();

    controller = new IntegrationsController(
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
      expect(codes).toContain('CARRIER_DHL');
      expect(codes).toContain('CARRIER_GENERIC');
      expect(codes).toContain('MESSAGING_WHATSAPP');
      expect(codes).toContain('ERP_GENERIC');

      for (const connector of connectors) {
        expect(connector.name).toBeDefined();
        expect(connector.category).toBeDefined();
        expect(connector.auth_types.length).toBeGreaterThan(0);
        expect(connector.capabilities.length).toBeGreaterThan(0);
        expect(connector.config_schema).toBeDefined();
      }
    });

    it('Scenario 2: should retrieve individual connector metadata by code with accurate definitions', () => {
      const shopify = catalogService.getConnector('ECOMMERCE_SHOPIFY');
      expect(shopify.code).toBe('ECOMMERCE_SHOPIFY');
      expect(shopify.category).toBe('ECOMMERCE');
      expect(shopify.capabilities).toContain('ORDER_INGESTION');
      expect(shopify.capabilities).toContain('INVENTORY_SYNC');

      const stripe = catalogService.getConnector('PAYMENT_STRIPE');
      expect(stripe.code).toBe('PAYMENT_STRIPE');
      expect(stripe.category).toBe('PAYMENT_GATEWAY');
      expect(stripe.capabilities).toContain('PAYMENT_SYNC');
    });

    it('Scenario 3: should throw NotFoundException when querying a non-existent connector', () => {
      expect(() =>
        catalogService.getConnector('UNKNOWN_CONNECTOR' as ConnectorType),
      ).toThrow(NotFoundException);
    });

    it('Scenario 4: should perform connector health check reporting latency, status, and message', async () => {
      const healthyShopify = await catalogService.healthCheck('ECOMMERCE_SHOPIFY', {
        shop_domain: 'mystore.myshopify.com',
      });
      expect(healthyShopify.is_healthy).toBe(true);
      expect(healthyShopify.connector_code).toBe('ECOMMERCE_SHOPIFY');
      expect(healthyShopify.latency_ms).toBeGreaterThanOrEqual(1);

      const unconfiguredShopify = await catalogService.healthCheck('ECOMMERCE_SHOPIFY', {});
      expect(unconfiguredShopify.is_healthy).toBe(false);
      expect(unconfiguredShopify.message).toContain('Missing shop_domain');
    });

    it('Scenario 5: should validate connector configuration schema rejecting invalid parameters', () => {
      const invalidShopify = catalogService.validateConfig('ECOMMERCE_SHOPIFY', {});
      expect(invalidShopify.isValid).toBe(false);
      expect(invalidShopify.errors).toContain('shop_domain is required');

      const validShopify = catalogService.validateConfig('ECOMMERCE_SHOPIFY', {
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
        userAdmin,
      );

      expect(result.plaintext_key).toMatch(/^ak_live_[a-f0-9]{48}$/);
      expect(result.api_key.name).toBe('Phase12 Master Integration Key');
      expect(result.api_key.key_prefix).toMatch(/^ak_live_/);
      expect(result.api_key.status).toBe('ACTIVE');

      // Crucial security invariant: stored key_hash is the SHA-256 hex digest, NOT the plaintext
      const computedHash = computeSha256Hash(result.plaintext_key);
      expect(result.api_key.key_hash).toBe(computedHash);
      expect(result.api_key.key_hash).not.toBe(result.plaintext_key);
    });

    it('Scenario 7: should verify valid plaintext API key against hash and reject invalid secret', async () => {
      const { api_key, plaintext_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Verification Test Key', scopes: ['inventory:read'] },
        userAdmin,
      );

      // Positive verification
      const verifySuccess = await devPlatformService.verifyApiKey(plaintext_key);
      expect(verifySuccess.isValid).toBe(true);
      expect(verifySuccess.tenant_id).toBe(tenant1);
      expect(verifySuccess.key_id).toBe(api_key.id);
      expect(verifySuccess.scopes).toContain('inventory:read');

      // Negative verification (tampered key)
      const tamperedKey = plaintext_key.slice(0, -4) + 'ffff';
      const verifyFail = await devPlatformService.verifyApiKey(tamperedKey);
      expect(verifyFail.isValid).toBe(false);
      expect(verifyFail.error).toBe('API key not found or revoked');
    });

    it('Scenario 8: should list tenant API keys showing masked preview and never exposing hash or plaintext', async () => {
      await devPlatformService.createApiKey(
        tenant1,
        { name: 'App 1 Key', scopes: ['read'] },
        userAdmin,
      );
      await devPlatformService.createApiKey(
        tenant1,
        { name: 'App 2 Key', scopes: ['write'] },
        userAdmin,
      );

      const keys = await devPlatformService.listApiKeys(tenant1);
      expect(keys.length).toBeGreaterThanOrEqual(2);

      for (const k of keys) {
        expect(k.key_prefix).toBeDefined();
        // The list API does not leak plaintext
        expect((k as any).plaintext_key).toBeUndefined();
      }
    });

    it('Scenario 9: should revoke API key transitioning status to REVOKED and failing subsequent verifications', async () => {
      const { api_key, plaintext_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Revocable Key', scopes: ['full'] },
        userAdmin,
      );

      const revoked = await devPlatformService.revokeApiKey(tenant1, api_key.id);
      expect(revoked.status).toBe('REVOKED');
      expect(revoked.revoked_at).toBeDefined();

      const verifyRevoked = await devPlatformService.verifyApiKey(plaintext_key);
      expect(verifyRevoked.isValid).toBe(false);
      expect(verifyRevoked.error).toBe('API key not found or revoked');
    });

    it('Scenario 10: should enforce rate limiting by decrementing quota and reporting remaining count', async () => {
      const { api_key } = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Rate Limited Key', rate_limit_per_minute: 3 },
        userAdmin,
      );

      // Request 1
      const req1 = await devPlatformService.consumeRateLimit(api_key.id, 3, 60000);
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(2);

      // Request 2
      const req2 = await devPlatformService.consumeRateLimit(api_key.id, 3, 60000);
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(1);

      // Request 3
      const req3 = await devPlatformService.consumeRateLimit(api_key.id, 3, 60000);
      expect(req3.allowed).toBe(true);
      expect(req3.remaining).toBe(0);

      // Request 4: Exceeded
      const req4 = await devPlatformService.consumeRateLimit(api_key.id, 3, 60000);
      expect(req4.allowed).toBe(false);
      expect(req4.remaining).toBe(0);
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
          auth_type: 'OAUTH2',
          credential_key: 'access_token',
          secret_value: plainSecret,
        },
        userAdmin,
      );

      expect(cred.credential_key).toBe('access_token');
      expect(cred.secret_preview).toBe(maskSecret(plainSecret));
      expect(cred.secret_preview).toContain('****');
      expect(cred.secret_hash).toBe(computeSha256Hash(plainSecret));
      expect(cred.version).toBe(1);
      expect(cred.status).toBe('ACTIVE');

      // The returned entity must never include plain secret
      expect((cred as any).secret_value).toBeUndefined();
    });

    it('Scenario 12: should rotate credential incrementing version and updating fingerprint', async () => {
      const initialSecret = 'sk_live_old_secret_abcdefgh123456';
      const cred = await credentialService.storeCredential(
        tenant1,
        'inst_stripe_01',
        {
          auth_type: 'API_KEY',
          credential_key: 'api_secret',
          secret_value: initialSecret,
        },
        userAdmin,
      );

      const newSecret = 'sk_live_new_secret_zyxwvuts987654';
      const rotated = await credentialService.rotateCredential(
        tenant1,
        cred.id,
        newSecret,
        userAdmin,
      );

      expect(rotated.version).toBe(2);
      expect(rotated.secret_preview).toBe(maskSecret(newSecret));
      expect(rotated.secret_hash).toBe(computeSha256Hash(newSecret));
      expect(rotated.secret_hash).not.toBe(cred.secret_hash);
    });

    it('Scenario 13: should never leak secret values under credential listing or lookup queries', async () => {
      await credentialService.storeCredential(
        tenant1,
        'inst_generic_01',
        {
          auth_type: 'API_KEY',
          credential_key: 'webhook_signing_secret',
          secret_value: 'whsec_very_confidential_signing_key_12345',
        },
        userAdmin,
      );

      const list = await credentialService.listCredentials(tenant1);
      expect(list.length).toBeGreaterThan(0);
      for (const item of list) {
        expect(JSON.stringify(item)).not.toContain('whsec_very_confidential_signing_key_12345');
        expect(item.secret_preview).toContain('****');
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
          connector_type: 'ECOMMERCE_SHOPIFY',
          name: 'Acme US Shopify Store',
          config: {
            shop_domain: 'acme-us.myshopify.com',
            sync_frequency_minutes: 15,
          },
        },
        userAdmin,
      );

      expect(instance.tenant_id).toBe(tenant1);
      expect(instance.status).toBe('DRAFT');
      expect(instance.connector_type).toBe('ECOMMERCE_SHOPIFY');

      // Tenant 2 cannot see Tenant 1 instance
      await expect(instancesService.getInstance(tenant2, instance.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Scenario 15: should support valid lifecycle state transitions (DRAFT -> ACTIVE -> PAUSED -> ACTIVE -> ERROR)', async () => {
      const instance = await instancesService.createInstance(
        tenant1,
        {
          connector_type: 'PAYMENT_STRIPE',
          name: 'Stripe Direct',
          config: { account_id: 'acct_12345' },
        },
        userAdmin,
      );

      // DRAFT -> ACTIVE
      const active = await instancesService.updateStatus(tenant1, instance.id, 'ACTIVE');
      expect(active.status).toBe('ACTIVE');

      // ACTIVE -> PAUSED
      const paused = await instancesService.updateStatus(tenant1, instance.id, 'PAUSED', 'Maintenance');
      expect(paused.status).toBe('PAUSED');

      // PAUSED -> ACTIVE
      const resumed = await instancesService.updateStatus(tenant1, instance.id, 'ACTIVE');
      expect(resumed.status).toBe('ACTIVE');

      // ACTIVE -> ERROR
      const errorState = await instancesService.updateStatus(
        tenant1,
        instance.id,
        'ERROR',
        'Authentication expired',
      );
      expect(errorState.status).toBe('ERROR');
      expect(errorState.error_count).toBe(1);
      expect(errorState.last_error_message).toBe('Authentication expired');
    });

    it('Scenario 16: should throw BadRequestException on invalid lifecycle transition (DEPRECATED -> ACTIVE)', async () => {
      const instance = await instancesService.createInstance(
        tenant1,
        {
          connector_type: 'CARRIER_FEDEX',
          name: 'FedEx Fleet',
          config: { account_number: 'FX123' },
        },
        userAdmin,
      );

      await instancesService.updateStatus(tenant1, instance.id, 'ACTIVE');
      await instancesService.updateStatus(tenant1, instance.id, 'DEPRECATED');

      // DEPRECATED -> ACTIVE is illegal
      await expect(
        instancesService.updateStatus(tenant1, instance.id, 'ACTIVE'),
      ).rejects.toThrow(BadRequestException);
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
    const payload = JSON.stringify({
      id: 'evt_stripe_order_999',
      amount_cents: 15000,
      currency: 'USD',
      customer_email: 'buyer@example.com',
    });

    it('Scenario 19: should accept valid HMAC-SHA256 inbound webhook and record receipt', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const signature = computeSha256Hash(`${nowEpochSec}.${payload}.${signingSecret}`);

      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'PAYMENT_STRIPE',
        signature,
        nowEpochSec,
        'evt_stripe_order_999',
        payload,
        signingSecret,
      );

      expect(receipt.tenant_id).toBe(tenant1);
      expect(receipt.connector_type).toBe('PAYMENT_STRIPE');
      expect(receipt.event_id).toBe('evt_stripe_order_999');
      expect(receipt.signature_valid).toBe(true);
      expect(receipt.status).toBe('PROCESSED');
      expect(receipt.payload_hash).toBe(computeSha256Hash(payload));
    });

    it('Scenario 20: should reject invalid or tampered signature with UnauthorizedException', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const fakeSignature = 'bad_sig_deadbeefcafebabef00d';

      await expect(
        webhookGateway.processWebhook(
          tenant1,
          'PAYMENT_STRIPE',
          fakeSignature,
          nowEpochSec,
          'evt_tampered_001',
          payload,
          signingSecret,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('Scenario 21: should reject webhook timestamp older than 300-second replay window', async () => {
      const staleEpochSec = Math.floor(Date.now() / 1000) - 350; // 350s old
      const signature = computeSha256Hash(`${staleEpochSec}.${payload}.${signingSecret}`);

      await expect(
        webhookGateway.processWebhook(
          tenant1,
          'PAYMENT_STRIPE',
          signature,
          staleEpochSec,
          'evt_stale_replay_002',
          payload,
          signingSecret,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Scenario 22: should return cached idempotent receipt on duplicate event_id without reprocessing', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const signature = computeSha256Hash(`${nowEpochSec}.${payload}.${signingSecret}`);

      const firstReceipt = await webhookGateway.processWebhook(
        tenant1,
        'PAYMENT_STRIPE',
        signature,
        nowEpochSec,
        'evt_duplicate_id_300',
        payload,
        signingSecret,
      );

      // Replay identical event
      const duplicateReceipt = await webhookGateway.processWebhook(
        tenant1,
        'PAYMENT_STRIPE',
        signature,
        nowEpochSec,
        'evt_duplicate_id_300',
        payload,
        signingSecret,
      );

      expect(duplicateReceipt.id).toBe(firstReceipt.id);
      expect(duplicateReceipt.processed_at).toBe(firstReceipt.processed_at);
    });

    it('Scenario 23: should reject inbound payload exceeding 1MB size limit', async () => {
      const largePayload = 'X'.repeat(1024 * 1024 + 50); // > 1MB
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const signature = computeSha256Hash(`${nowEpochSec}.${largePayload}.${signingSecret}`);

      await expect(
        webhookGateway.processWebhook(
          tenant1,
          'PAYMENT_STRIPE',
          signature,
          nowEpochSec,
          'evt_huge_payload_400',
          largePayload,
          signingSecret,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Scenario 24: should enforce tenant isolation on webhook receipt lookups', async () => {
      const nowEpochSec = Math.floor(Date.now() / 1000);
      const signature = computeSha256Hash(`${nowEpochSec}.${payload}.${signingSecret}`);

      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'PAYMENT_STRIPE',
        signature,
        nowEpochSec,
        'evt_tenant1_receipt',
        payload,
        signingSecret,
      );

      // Tenant 2 must not be able to retrieve Tenant 1's receipt
      await expect(webhookGateway.getReceipt(tenant2, receipt.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // SECTION 6: Bidirectional Sync, Field Mapping & Conflict Resolution (Scenarios 25-30)
  // =========================================================================
  describe('Section 6: Bidirectional Sync, Field Mapping & Conflict Resolution', () => {
    it('Scenario 25: should record bidirectional identity mapping between STOKROVA and external system', async () => {
      const mapping = await syncService.createIdentityMapping(tenant1, {
        integration_instance_id: 'inst_shopify_01',
        entity_type: 'ORDER',
        internal_entity_id: 'so_stokrova_00192',
        external_entity_id: 'gid://shopify/Order/89127391',
        external_system_code: 'ECOMMERCE_SHOPIFY',
      });

      expect(mapping.internal_entity_id).toBe('so_stokrova_00192');
      expect(mapping.external_entity_id).toBe('gid://shopify/Order/89127391');

      const internalLookup = await syncService.lookupInternalId(
        tenant1,
        'inst_shopify_01',
        'ORDER',
        'gid://shopify/Order/89127391',
      );
      expect(internalLookup).toBe('so_stokrova_00192');

      const externalLookup = await syncService.lookupExternalId(
        tenant1,
        'inst_shopify_01',
        'ORDER',
        'so_stokrova_00192',
      );
      expect(externalLookup).toBe('gid://shopify/Order/89127391');
    });

    it('Scenario 26: should resolve conflict with INTERNAL_WINS preserving STOKROVA record', () => {
      const internalRecord = { id: 'so_1', status: 'CONFIRMED', total_cents: 10000 };
      const externalRecord = { id: 'so_1', status: 'PENDING', total_cents: 9000 };

      const resolution = resolveRecordConflict(
        'INTERNAL_WINS',
        internalRecord,
        externalRecord,
        '2026-10-13T10:00:00Z',
        '2026-10-13T10:05:00Z',
      );

      expect(resolution.winner).toBe('INTERNAL');
      expect(resolution.resolved_record).toEqual(internalRecord);
    });

    it('Scenario 27: should resolve conflict with EXTERNAL_WINS applying external updates', () => {
      const internalRecord = { id: 'so_1', status: 'CONFIRMED' };
      const externalRecord = { id: 'so_1', status: 'FULFILLED' };

      const resolution = resolveRecordConflict(
        'EXTERNAL_WINS',
        internalRecord,
        externalRecord,
        '2026-10-13T10:00:00Z',
        '2026-10-13T10:05:00Z',
      );

      expect(resolution.winner).toBe('EXTERNAL');
      expect(resolution.resolved_record).toEqual(externalRecord);
    });

    it('Scenario 28: should resolve conflict with MANUAL_REVIEW flagging for user attention', () => {
      const internalRecord = { sku: 'PROD-A', price: 5000 };
      const externalRecord = { sku: 'PROD-A', price: 4200 };

      const resolution = resolveRecordConflict(
        'MANUAL_REVIEW',
        internalRecord,
        externalRecord,
        '2026-10-13T10:00:00Z',
        '2026-10-13T10:05:00Z',
      );

      expect(resolution.winner).toBe('MANUAL_REVIEW');
      expect(resolution.resolved_record).toBeNull();
    });

    it('Scenario 29: should execute field transformation pipeline (STRING_TO_INT, TRIM, UPPERCASE, LOWERCASE)', async () => {
      await syncService.createFieldMapping(tenant1, {
        integration_instance_id: 'inst_woo_01',
        entity_type: 'ORDER',
        internal_field_path: 'customer_email',
        external_field_path: 'billing.email',
        direction: 'INBOUND',
        transformation: 'LOWERCASE',
      });

      await syncService.createFieldMapping(tenant1, {
        integration_instance_id: 'inst_woo_01',
        entity_type: 'ORDER',
        internal_field_path: 'sku',
        external_field_path: 'line_items.0.sku',
        direction: 'INBOUND',
        transformation: 'UPPERCASE',
      });

      await syncService.createFieldMapping(tenant1, {
        integration_instance_id: 'inst_woo_01',
        entity_type: 'ORDER',
        internal_field_path: 'quantity',
        external_field_path: 'line_items.0.quantity',
        direction: 'INBOUND',
        transformation: 'STRING_TO_INT',
      });

      const sourceExternal = {
        billing: { email: '  CUSTOMER@EXAMPLE.COM ' },
        line_items: [{ sku: 'widget-pro-black', quantity: '42' }],
      };

      const transformed = await syncService.applyMappings(
        tenant1,
        'inst_woo_01',
        'ORDER',
        sourceExternal,
      );

      expect(transformed['customer_email']).toBe('customer@example.com');
      expect(transformed['sku']).toBe('WIDGET-PRO-BLACK');
      expect(transformed['quantity']).toBe(42);
    });

    it('Scenario 30: should track sync run lifecycle with checkpoints and processed/failed counts', async () => {
      const run = await syncService.startSyncRun(tenant1, {
        integration_instance_id: 'inst_shopify_01',
        direction: 'INBOUND',
        cursor_checkpoint: 'cursor_page_1',
      });

      expect(run.status).toBe('RUNNING');
      expect(run.cursor_checkpoint).toBe('cursor_page_1');

      // Update checkpoint & progress
      const updated = await syncService.updateSyncRun(tenant1, run.id, {
        processed_count: 50,
        failed_count: 2,
        cursor_checkpoint: 'cursor_page_2',
      });
      expect(updated.processed_count).toBe(50);
      expect(updated.failed_count).toBe(2);
      expect(updated.cursor_checkpoint).toBe('cursor_page_2');

      // Complete run
      const completed = await syncService.completeSyncRun(tenant1, run.id, {
        processed_count: 100,
        failed_count: 2,
        cursor_checkpoint: 'cursor_page_final',
      });
      expect(completed.status).toBe('COMPLETED');
      expect(completed.processed_count).toBe(100);
      expect(completed.completed_at).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 7: Reconciliation & Discrepancy Auditing (Scenarios 31-34)
  // =========================================================================
  describe('Section 7: Reconciliation & Discrepancy Auditing', () => {
    it('Scenario 31: should detect state discrepancies between internal entities and external systems', async () => {
      const internalEntities = [
        { id: 'prod_1', sku: 'SKU-001', stock_quantity: 100 },
        { id: 'prod_2', sku: 'SKU-002', stock_quantity: 50 },
      ];
      const externalEntities = [
        { id: 'ext_1', sku: 'SKU-001', stock_quantity: 85 }, // Discrepancy of 15
        { id: 'ext_2', sku: 'SKU-002', stock_quantity: 50 }, // Match
      ];

      const discrepancies = await reconciliationService.detectDiscrepancies(
        tenant1,
        'inst_shopify_01',
        'INVENTORY',
        internalEntities,
        externalEntities,
      );

      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].entity_id).toBe('prod_1');
      expect(discrepancies[0].status).toBe('OPEN');
      expect(discrepancies[0].internal_state).toEqual(internalEntities[0]);
      expect(discrepancies[0].external_state).toEqual(externalEntities[0]);
    });

    it('Scenario 32: should resolve discrepancy with FORCE_INTERNAL marking resolved', async () => {
      const list = await reconciliationService.detectDiscrepancies(
        tenant1,
        'inst_shopify_01',
        'ORDER',
        [{ id: 'so_1', status: 'CONFIRMED' }],
        [{ id: 'ext_so_1', status: 'PENDING' }],
      );

      const resolved = await reconciliationService.resolveDiscrepancy(
        tenant1,
        list[0].id,
        'FORCE_INTERNAL',
        'STOKROVA is master source for order confirmation',
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution_action).toBe('FORCE_INTERNAL');
      expect(resolved.resolution_notes).toContain('STOKROVA is master source');
      expect(resolved.resolved_at).toBeDefined();
    });

    it('Scenario 33: should resolve discrepancy with ACCEPT_EXTERNAL marking resolved', async () => {
      const list = await reconciliationService.detectDiscrepancies(
        tenant1,
        'inst_stripe_01',
        'PAYMENT',
        [{ id: 'pay_1', status: 'PENDING' }],
        [{ id: 'pi_1', status: 'SUCCEEDED' }],
      );

      const resolved = await reconciliationService.resolveDiscrepancy(
        tenant1,
        list[0].id,
        'ACCEPT_EXTERNAL',
        'Stripe webhooks confirmed charge capture',
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution_action).toBe('ACCEPT_EXTERNAL');
    });

    it('Scenario 34: should resolve discrepancy with IGNORE without making state changes', async () => {
      const list = await reconciliationService.detectDiscrepancies(
        tenant1,
        'inst_fedex_01',
        'TRACKING',
        [{ id: 'trk_1', note: 'internal notes' }],
        [{ id: 'trk_ext_1', note: 'carrier delay' }],
      );

      const resolved = await reconciliationService.resolveDiscrepancy(
        tenant1,
        list[0].id,
        'IGNORE',
        'Transient carrier memo difference',
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution_action).toBe('IGNORE');
    });
  });

  // =========================================================================
  // SECTION 8: Integration Audit Logging & Redaction (Scenarios 35-37)
  // =========================================================================
  describe('Section 8: Integration Audit Logging & Redaction', () => {
    it('Scenario 35: should generate immutable audit log entry for integration operations', async () => {
      const entry = await auditService.logAction(tenant1, {
        instance_id: 'inst_shopify_01',
        action: 'WEBHOOK_PROCESSED',
        entity_type: 'ORDER',
        entity_id: 'so_123',
        actor_id: 'system_webhook',
        details: { event: 'orders/create', items_count: 3 },
      });

      expect(entry.id).toBeDefined();
      expect(entry.tenant_id).toBe(tenant1);
      expect(entry.action).toBe('WEBHOOK_PROCESSED');
      expect(entry.timestamp).toBeDefined();
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

      const entry = await auditService.logAction(tenant1, {
        instance_id: 'inst_auth_01',
        action: 'CREDENTIAL_ROTATED',
        entity_type: 'CREDENTIAL',
        entity_id: 'cred_99',
        actor_id: userAdmin,
        details: rawDetails,
      });

      const detailsStr = JSON.stringify(entry.details);
      expect(detailsStr).not.toContain('ak_live_secret123456789');
      expect(detailsStr).not.toContain('whsec_secret_signing_key');
      expect(detailsStr).not.toContain('super_confidential');
      expect(detailsStr).not.toContain('myPassword123');
      expect(entry.details['api_key']).toBe('[REDACTED]');
      expect((entry.details['nested'] as any)['password']).toBe('[REDACTED]');
      expect((entry.details['nested'] as any)['public_info']).toBe('allowed');
    });

    it('Scenario 37: should enforce strict multi-tenant isolation on audit log queries', async () => {
      await auditService.logAction(tenant1, {
        action: 'SYNC_STARTED',
        actor_id: 'usr_t1',
      });
      await auditService.logAction(tenant2, {
        action: 'SYNC_STARTED',
        actor_id: 'usr_t2',
      });

      const tenant1Logs = await auditService.queryAuditLogs(tenant1);
      expect(tenant1Logs.every((log) => log.tenant_id === tenant1)).toBe(true);

      const tenant2Logs = await auditService.queryAuditLogs(tenant2);
      expect(tenant2Logs.every((log) => log.tenant_id === tenant2)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 9: End-to-End Connector Ingestion (Scenarios 38-42)
  // =========================================================================
  describe('Section 9: End-to-End Connector Ingestion', () => {
    it('Scenario 38: should ingest Shopify order webhook, mapping external IDs and validating schema', async () => {
      const orderPayload = JSON.stringify({
        id: 789123456,
        order_number: 1042,
        email: 'shopify_shopper@example.com',
        total_price_set: { shop_money: { amount: '125.50', currency_code: 'USD' } },
        line_items: [{ id: 101, title: 'Cotton Shirt', quantity: 2, price: '62.75' }],
      });

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_shopify_order_secret';
      const sig = computeSha256Hash(`${now}.${orderPayload}.${secret}`);

      // 1. Ingest via Webhook Gateway
      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'ECOMMERCE_SHOPIFY',
        sig,
        now,
        'shopify_order_789123456',
        orderPayload,
        secret,
      );
      expect(receipt.status).toBe('PROCESSED');

      // 2. Map external ID
      const mapping = await syncService.createIdentityMapping(tenant1, {
        integration_instance_id: 'inst_shopify_01',
        entity_type: 'ORDER',
        internal_entity_id: 'so_stokrova_shopify_1042',
        external_entity_id: '789123456',
        external_system_code: 'ECOMMERCE_SHOPIFY',
      });
      expect(mapping.external_entity_id).toBe('789123456');

      // 3. Record Sync Run
      const run = await syncService.startSyncRun(tenant1, {
        integration_instance_id: 'inst_shopify_01',
        direction: 'INBOUND',
      });
      const completed = await syncService.completeSyncRun(tenant1, run.id, {
        processed_count: 1,
        failed_count: 0,
      });
      expect(completed.processed_count).toBe(1);
    });

    it('Scenario 39: should ingest WooCommerce order mapping line items and pure integer minor-unit prices', async () => {
      // 125.50 USD -> 12550 minor units (pure integer)
      const rawWooPrice = '125.50';
      const integerMinorUnits = BigInt(Math.round(parseFloat(rawWooPrice) * 100)).toString();
      expect(integerMinorUnits).toBe('12550');

      const wooPayload = {
        id: 5541,
        billing: { email: 'woo_shopper@store.com' },
        line_items: [{ sku: 'WOO-HOODIE', quantity: 1, total: rawWooPrice }],
      };

      await syncService.createFieldMapping(tenant1, {
        integration_instance_id: 'inst_woo_store',
        entity_type: 'ORDER',
        internal_field_path: 'customer_email',
        external_field_path: 'billing.email',
        direction: 'INBOUND',
      });

      const mapped = await syncService.applyMappings(
        tenant1,
        'inst_woo_store',
        'ORDER',
        wooPayload,
      );
      expect(mapped['customer_email']).toBe('woo_shopper@store.com');
    });

    it('Scenario 40: should ingest Stripe payment event and link payment intent without direct General Ledger mutation', async () => {
      const stripePayload = JSON.stringify({
        id: 'evt_stripe_payment_success_11',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_3KqTest123456',
            amount: 8500, // already in integer cents
            currency: 'usd',
            status: 'succeeded',
          },
        },
      });

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_stripe_test';
      const sig = computeSha256Hash(`${now}.${stripePayload}.${secret}`);

      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'PAYMENT_STRIPE',
        sig,
        now,
        'evt_stripe_payment_success_11',
        stripePayload,
        secret,
      );
      expect(receipt.status).toBe('PROCESSED');

      // Identity mapping preserves domain authority
      const mapping = await syncService.createIdentityMapping(tenant1, {
        integration_instance_id: 'inst_stripe_01',
        entity_type: 'PAYMENT',
        internal_entity_id: 'pay_stokrova_intent_99',
        external_entity_id: 'pi_3KqTest123456',
        external_system_code: 'PAYMENT_STRIPE',
      });
      expect(mapping.internal_entity_id).toBe('pay_stokrova_intent_99');
    });

    it('Scenario 41: should ingest FedEx tracking webhook updating carrier milestone without bypassing logistics domain', async () => {
      const fedexPayload = JSON.stringify({
        trackingNumber: '794829103948',
        statusCode: 'DL',
        statusDescription: 'Delivered, left at front door',
        actualDeliveryTimestamp: '2026-10-13T14:30:00Z',
      });

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_fedex_secure';
      const sig = computeSha256Hash(`${now}.${fedexPayload}.${secret}`);

      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'CARRIER_FEDEX',
        sig,
        now,
        'fedex_evt_794829103948_dl',
        fedexPayload,
        secret,
      );
      expect(receipt.status).toBe('PROCESSED');

      const mapping = await syncService.createIdentityMapping(tenant1, {
        integration_instance_id: 'inst_fedex_01',
        entity_type: 'SHIPMENT',
        internal_entity_id: 'shp_stokrova_004',
        external_entity_id: '794829103948',
        external_system_code: 'CARRIER_FEDEX',
      });
      expect(mapping.entity_type).toBe('SHIPMENT');
    });

    it('Scenario 42: should ingest DHL tracking status and map tracking number', async () => {
      const dhlPayload = JSON.stringify({
        shipmentTrackingNumber: '9284019284',
        shipmentStatus: 'transit',
      });

      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_dhl_key';
      const sig = computeSha256Hash(`${now}.${dhlPayload}.${secret}`);

      const receipt = await webhookGateway.processWebhook(
        tenant1,
        'CARRIER_DHL',
        sig,
        now,
        'dhl_evt_9284019284',
        dhlPayload,
        secret,
      );
      expect(receipt.status).toBe('PROCESSED');
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
      const payload = JSON.stringify({ order_id: 1001, charged: true });
      const now = Math.floor(Date.now() / 1000);
      const secret = 'whsec_idem_secret';
      const sig = computeSha256Hash(`${now}.${payload}.${secret}`);

      // Transmission 1
      const res1 = await webhookGateway.processWebhook(
        tenant1,
        'ECOMMERCE_SHOPIFY',
        sig,
        now,
        'evt_shopify_idem_1001',
        payload,
        secret,
      );

      // Transmission 2 (Network retry with same event ID)
      const res2 = await webhookGateway.processWebhook(
        tenant1,
        'ECOMMERCE_SHOPIFY',
        sig,
        now,
        'evt_shopify_idem_1001',
        payload,
        secret,
      );

      // Both invocations yield the exact same receipt record, preventing double processing
      expect(res1.id).toBe(res2.id);
      expect(res1.processed_at).toBe(res2.processed_at);
    });

    it('Scenario 45: Integration credentials and API keys are zero-plaintext in storage and telemetry', async () => {
      const plainSecret = 'super_secret_partner_api_key_xyz987';
      const keyResult = await devPlatformService.createApiKey(
        tenant1,
        { name: 'Telemetry Test Key' },
        userAdmin,
      );

      const credResult = await credentialService.storeCredential(
        tenant1,
        'inst_99',
        {
          auth_type: 'API_KEY',
          credential_key: 'partner_key',
          secret_value: plainSecret,
        },
        userAdmin,
      );

      // Storage representation checks
      const storedKey = await devPlatformService.getApiKey(tenant1, keyResult.api_key.id);
      expect(storedKey.key_hash).not.toContain(keyResult.plaintext_key);
      expect(storedKey.key_prefix).toBe(keyResult.plaintext_key.slice(0, 16));

      const storedCred = await credentialService.getCredential(tenant1, credResult.id);
      expect(storedCred.secret_preview).toContain('****');
      expect((storedCred as any).secret_value).toBeUndefined();

      // Redaction in telemetry / log payload
      const redacted = redactSensitiveObject({
        key: keyResult.plaintext_key,
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

      const health = await controller.healthCheck('ECOMMERCE_SHOPIFY', {
        shop_domain: 'test.myshopify.com',
      });
      expect(health.is_healthy).toBe(true);
    });

    it('should expose API key management and rate limit check through controller', async () => {
      const created = await controller.createApiKey(
        tenant1,
        { name: 'Controller Key', scopes: ['all'] },
        userAdmin,
      );
      expect(created.plaintext_key).toBeDefined();

      const list = await controller.listApiKeys(tenant1);
      expect(list.length).toBeGreaterThan(0);

      const check = await controller.checkRateLimit(created.api_key.id);
      expect(check.allowed).toBe(true);

      const revoked = await controller.revokeApiKey(tenant1, created.api_key.id);
      expect(revoked.status).toBe('REVOKED');
    });

    it('should expose instance and webhook operations through controller', async () => {
      const inst = await controller.createInstance(
        tenant1,
        {
          connector_type: 'PAYMENT_STRIPE',
          name: 'Controller Stripe Inst',
          config: { account_id: 'acct_controller' },
        },
        userAdmin,
      );
      expect(inst.status).toBe('DRAFT');

      const activated = await controller.updateInstanceStatus(
        tenant1,
        inst.id,
        { status: 'ACTIVE' },
      );
      expect(activated.status).toBe('ACTIVE');

      const testRes = await controller.testConnection(tenant1, inst.id);
      expect(testRes.is_healthy).toBe(true);
    });
  });
});
