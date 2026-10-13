import { describe, it, expect } from 'vitest';
import {
  assertAuditRecordImmutable,
  sanitizeSensitiveAuditData,
  classifySecuritySeverity,
  normalizeAuditAction,
} from '../src/audit.js';

describe('Audit Domain Engine', () => {
  describe('Immutability Invariant', () => {
    it('permits INSERT operations for append-only audit trail', () => {
      expect(() => assertAuditRecordImmutable('INSERT')).not.toThrow();
    });

    it('strictly forbids UPDATE or DELETE operations on audit records', () => {
      expect(() => assertAuditRecordImmutable('UPDATE')).toThrowError(/strictly append-only/);
      expect(() => assertAuditRecordImmutable('DELETE')).toThrowError(/strictly append-only/);
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('redacts sensitive fields from audit metadata', () => {
      const sensitivePayload = {
        user_id: 'usr_123',
        password: 'SuperSecretPassword123!',
        api_token: 'tok_live_987654321',
        payment: {
          amount: 50000,
          pan: '4111111111111111',
          cvv: '123',
          authorization_code: 'auth_999',
        },
        device_details: {
          app_version: '1.0.0',
          refresh_token: 'rt_abc123',
        },
      };

      const sanitized = sanitizeSensitiveAuditData(sensitivePayload);
      expect(sanitized).toEqual({
        user_id: 'usr_123',
        password: '[REDACTED]',
        api_token: '[REDACTED]',
        payment: {
          amount: 50000,
          pan: '[REDACTED]',
          cvv: '[REDACTED]',
          authorization_code: '[REDACTED]',
        },
        device_details: {
          app_version: '1.0.0',
          refresh_token: '[REDACTED]',
        },
      });
    });

    it('returns null for empty or null payload', () => {
      expect(sanitizeSensitiveAuditData(null)).toBeNull();
      expect(sanitizeSensitiveAuditData(undefined)).toBeNull();
    });
  });

  describe('Security Severity Classification', () => {
    it('classifies cross-tenant attempts and token tampering as CRITICAL', () => {
      expect(classifySecuritySeverity('CROSS_TENANT_ATTEMPT')).toBe('CRITICAL');
      expect(classifySecuritySeverity('TOKEN_FORGERY_DETECTED')).toBe('CRITICAL');
      expect(classifySecuritySeverity('BRUTE_FORCE_LOGIN')).toBe('CRITICAL');
    });

    it('classifies device revocation and auth failures as WARN', () => {
      expect(classifySecuritySeverity('DEVICE_REVOKED_ACCESS')).toBe('WARN');
      expect(classifySecuritySeverity('UNAUTHORIZED_ACCESS')).toBe('WARN');
      expect(classifySecuritySeverity('AUTH_FAILURE')).toBe('WARN');
    });

    it('classifies routine events as INFO', () => {
      expect(classifySecuritySeverity('AUTH_LOGIN_SUCCESS')).toBe('INFO');
      expect(classifySecuritySeverity('SESSION_EXPIRED')).toBe('INFO');
    });
  });

  describe('Audit Action Normalization', () => {
    it('normalizes audit actions to UPPER_SNAKE_CASE', () => {
      expect(normalizeAuditAction('auth.login')).toBe('AUTH_LOGIN');
      expect(normalizeAuditAction('payment recorded')).toBe('PAYMENT_RECORDED');
      expect(normalizeAuditAction('branch-created')).toBe('BRANCH_CREATED');
    });

    it('rejects empty or whitespace-only action', () => {
      expect(() => normalizeAuditAction('')).toThrowError(/cannot be empty/);
      expect(() => normalizeAuditAction('   ')).toThrowError(/cannot be empty/);
    });
  });
});
