import { describe, it, expect } from 'vitest';
import {
  CreateAuditEventSchema,
  RecordSecurityEventSchema,
  AuditQueryFiltersSchema,
} from '../src/audit.js';

describe('Audit Validation', () => {
  it('validates a compliant audit event creation payload', () => {
    const valid = {
      actor_user_id: 'usr_owner_01',
      device_id: 'dev_pos_01',
      action: 'PAYMENT_RECORDED',
      entity_type: 'PAYMENT',
      entity_id: 'pay_123',
      request_id: 'req_abc999',
      metadata: {
        amount_minor: 150000,
        currency: 'NGN',
      },
    };

    const parsed = CreateAuditEventSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects audit event creation missing action or entity', () => {
    const invalid = {
      action: '',
      entity_type: 'PAYMENT',
      entity_id: 'pay_123',
    };
    const parsed = CreateAuditEventSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates security event payload with default severity', () => {
    const event = {
      tenant_id: 'ten_01',
      event_type: 'DEVICE_REVOKED_ACCESS',
      details: {
        ip: '192.168.1.100',
        attempted_operation: 'sync.push',
      },
    };
    const parsed = RecordSecurityEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.severity).toBe('INFO');
    }
  });

  it('validates explicit security severity', () => {
    const event = {
      tenant_id: 'ten_01',
      event_type: 'CROSS_TENANT_ATTEMPT',
      severity: 'CRITICAL',
    };
    const parsed = RecordSecurityEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.severity).toBe('CRITICAL');
    }
  });

  it('applies pagination defaults to audit query filters', () => {
    const parsed = AuditQueryFiltersSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });
});
