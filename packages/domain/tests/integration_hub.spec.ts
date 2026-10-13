import { describe, it, expect } from 'vitest';
import {
  STANDARD_CONNECTOR_DEFINITIONS,
  getConnectorDefinition,
  assertValidInstanceTransition,
  validateExternalEndpointUrl,
  maskSecret,
  redactSensitiveObject,
  applyFieldTransformation,
  resolveRecordConflict,
  isWithinReplayWindow,
  computeSha256Hash,
  IntegrationDomainError,
} from '../src/integration_hub.js';

describe('STOKROVA Phase 12 — Integration Hub Domain Logic', () => {
  describe('1. Connector Catalog Governance', () => {
    it('contains all standard enterprise connectors', () => {
      expect(STANDARD_CONNECTOR_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
      const codes = STANDARD_CONNECTOR_DEFINITIONS.map((c) => c.code);
      expect(codes).toContain('ECOMMERCE_SHOPIFY');
      expect(codes).toContain('PAYMENT_STRIPE');
      expect(codes).toContain('CARRIER_FEDEX');
      expect(codes).toContain('ACCOUNTING_QUICKBOOKS');
      expect(codes).toContain('CUSTOM_WEBHOOK');
    });

    it('successfully retrieves known connector definition', () => {
      const shopify = getConnectorDefinition('ECOMMERCE_SHOPIFY');
      expect(shopify.name).toContain('Shopify');
      expect(shopify.category).toBe('ECOMMERCE');
      expect(shopify.capabilities).toContain('ORDER_IMPORT');
      expect(shopify.capabilities).toContain('STOCK_SYNC');
    });

    it('rejects unknown connector with IntegrationDomainError', () => {
      expect(() => getConnectorDefinition('UNKNOWN_VENDOR')).toThrowError(
        IntegrationDomainError,
      );
    });
  });

  describe('2. Integration Instance State Machine', () => {
    it('allows valid lifecycle transitions', () => {
      expect(() => assertValidInstanceTransition('DRAFT', 'CONFIGURED')).not.toThrow();
      expect(() => assertValidInstanceTransition('CONFIGURED', 'VALIDATING')).not.toThrow();
      expect(() => assertValidInstanceTransition('VALIDATING', 'ACTIVE')).not.toThrow();
      expect(() => assertValidInstanceTransition('ACTIVE', 'SUSPENDED')).not.toThrow();
      expect(() => assertValidInstanceTransition('SUSPENDED', 'ACTIVE')).not.toThrow();
      expect(() => assertValidInstanceTransition('ACTIVE', 'DISCONNECTED')).not.toThrow();
      expect(() => assertValidInstanceTransition('DISCONNECTED', 'DRAFT')).not.toThrow();
    });

    it('rejects invalid lifecycle transitions', () => {
      expect(() => assertValidInstanceTransition('DRAFT', 'ACTIVE')).toThrowError(
        IntegrationDomainError,
      );
      expect(() => assertValidInstanceTransition('DISCONNECTED', 'ACTIVE')).toThrowError(
        IntegrationDomainError,
      );
    });
  });

  describe('3. SSRF Defense Engine', () => {
    it('accepts legitimate public HTTPS endpoints', () => {
      expect(validateExternalEndpointUrl('https://api.shopify.com/admin/oauth').isValid).toBe(true);
      expect(validateExternalEndpointUrl('https://api.stripe.com/v1/charges').isValid).toBe(true);
      expect(validateExternalEndpointUrl('https://hooks.slack.com/services/T00/B00/X00').isValid).toBe(true);
      expect(validateExternalEndpointUrl('https://8.8.8.8/dns-query').isValid).toBe(true);
    });

    it('rejects loopback and localhost destinations', () => {
      expect(validateExternalEndpointUrl('http://localhost:8080/webhook').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://127.0.0.1:3000/internal').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://127.1.2.3/admin').isValid).toBe(false);
      expect(validateExternalEndpointUrl('http://0.0.0.0/test').isValid).toBe(false);
    });

    it('rejects RFC 1918 private IPv4 addresses', () => {
      // 10.0.0.0/8
      expect(validateExternalEndpointUrl('http://10.0.0.1/secrets').isValid).toBe(false);
      // 172.16.0.0/12
      expect(validateExternalEndpointUrl('http://172.20.10.5/api').isValid).toBe(false);
      // 192.168.0.0/16
      expect(validateExternalEndpointUrl('http://192.168.1.1/router').isValid).toBe(false);
    });

    it('rejects cloud metadata IP 169.254.169.254', () => {
      expect(
        validateExternalEndpointUrl('http://169.254.169.254/latest/meta-data/').isValid,
      ).toBe(false);
    });

    it('rejects non-HTTP protocols', () => {
      expect(validateExternalEndpointUrl('file:///etc/passwd').isValid).toBe(false);
      expect(validateExternalEndpointUrl('ftp://ftp.example.com').isValid).toBe(false);
      expect(validateExternalEndpointUrl('gopher://example.com').isValid).toBe(false);
    });

    it('rejects URLs with embedded credentials', () => {
      expect(validateExternalEndpointUrl('https://admin:secret@api.example.com/sync').isValid).toBe(false);
    });
  });

  describe('4. Secret Masking & Redaction', () => {
    it('masks long secrets safely', () => {
      const masked = maskSecret('ak_live_abcdef1234567890');
      expect(masked).toBe('ak_live****7890');
      expect(masked).not.toContain('abcdef');
    });

    it('redacts sensitive fields in nested payloads', () => {
      const payload = {
        name: 'Shopify Store',
        api_key: 'super_secret_value',
        nested: {
          token: 'token_abc',
          active: true,
        },
      };
      const redacted = redactSensitiveObject(payload);
      expect(redacted['api_key']).toBe('[REDACTED]');
      expect((redacted['nested'] as Record<string, unknown>)['token']).toBe('[REDACTED]');
      expect((redacted['nested'] as Record<string, unknown>)['active']).toBe(true);
    });
  });

  describe('5. Field Mapping & Transformation Engine', () => {
    it('applies direct mapping', () => {
      expect(applyFieldTransformation('hello', 'DIRECT')).toBe('hello');
    });

    it('applies enum dictionary mapping', () => {
      const config = { mapping: { open: 'PROPOSED', closed: 'COMPLETED' }, default_value: 'UNKNOWN' };
      expect(applyFieldTransformation('open', 'ENUM_MAP', config)).toBe('PROPOSED');
      expect(applyFieldTransformation('unmapped', 'ENUM_MAP', config)).toBe('UNKNOWN');
    });

    it('transforms decimal currency to integer minor units', () => {
      expect(applyFieldTransformation(19.99, 'CURRENCY_MINOR')).toBe('1999');
      expect(applyFieldTransformation('100.50', 'CURRENCY_MINOR')).toBe('10050');
    });

    it('transforms percentage to basis points', () => {
      expect(applyFieldTransformation(5.25, 'BASIS_POINTS')).toBe(525);
      expect(applyFieldTransformation('12.00', 'BASIS_POINTS')).toBe(1200);
    });

    it('normalizes timestamps to ISO-8601', () => {
      const iso = applyFieldTransformation('2026-10-13T12:00:00Z', 'DATE_FORMAT');
      expect(iso).toBe('2026-10-13T12:00:00.000Z');
    });
  });

  describe('6. Conflict Resolution Policy Engine', () => {
    const internalRec = { id: 'ord_1', total: '100', version: 2 };
    const externalRec = { id: 'ext_1', total: '150', version: 1 };

    it('resolves STOKROVA_WINS deterministically', () => {
      const res = resolveRecordConflict({
        policy: 'STOKROVA_WINS',
        internalRecord: internalRec,
        externalRecord: externalRec,
        internalUpdatedAt: '2026-10-13T10:00:00Z',
        externalUpdatedAt: '2026-10-13T12:00:00Z',
      });
      expect(res.resolution).toBe('INTERNAL');
      expect(res.winningRecord).toBe(internalRec);
    });

    it('resolves EXTERNAL_WINS deterministically', () => {
      const res = resolveRecordConflict({
        policy: 'EXTERNAL_WINS',
        internalRecord: internalRec,
        externalRecord: externalRec,
        internalUpdatedAt: '2026-10-13T10:00:00Z',
        externalUpdatedAt: '2026-10-13T12:00:00Z',
      });
      expect(res.resolution).toBe('EXTERNAL');
      expect(res.winningRecord).toBe(externalRec);
    });

    it('resolves NEWEST_VERSION based on timestamps', () => {
      const res = resolveRecordConflict({
        policy: 'NEWEST_VERSION',
        internalRecord: internalRec,
        externalRecord: externalRec,
        internalUpdatedAt: '2026-10-13T10:00:00Z',
        externalUpdatedAt: '2026-10-13T12:00:00Z',
      });
      expect(res.resolution).toBe('EXTERNAL');
      expect(res.winningRecord).toBe(externalRec);
    });

    it('flags MANUAL_REVIEW when specified', () => {
      const res = resolveRecordConflict({
        policy: 'MANUAL_REVIEW',
        internalRecord: internalRec,
        externalRecord: externalRec,
        internalUpdatedAt: '2026-10-13T10:00:00Z',
        externalUpdatedAt: '2026-10-13T12:00:00Z',
      });
      expect(res.resolution).toBe('MANUAL_REQUIRED');
    });
  });

  describe('7. Webhook Replay & Hash Protection', () => {
    it('accepts timestamps within 5 minutes', () => {
      const now = 1792000000;
      expect(isWithinReplayWindow(now - 120, now, 300)).toBe(true);
      expect(isWithinReplayWindow(now + 60, now, 300)).toBe(true);
    });

    it('rejects replayed timestamps older than tolerance window', () => {
      const now = 1792000000;
      expect(isWithinReplayWindow(now - 301, now, 300)).toBe(false);
    });

    it('computes sha256 hash deterministically', () => {
      const hash1 = computeSha256Hash('stokrova_payload_test');
      const hash2 = computeSha256Hash('stokrova_payload_test');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });
});
