import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;
  const tenantId = 'ten_lagos_01';

  beforeEach(() => {
    service = new AuditService();
  });

  it('records an immutable audit event and normalizes the action name', async () => {
    const event = await service.recordAuditEvent(tenantId, {
      actor_user_id: 'usr_cashier_01',
      device_id: 'dev_pos_01',
      action: 'payment.collected',
      entity_type: 'PAYMENT',
      entity_id: 'pay_9981',
      metadata: {
        amount_minor: 250000,
        currency: 'NGN',
      },
    });

    expect(event.id).toBeDefined();
    expect(event.tenant_id).toBe(tenantId);
    expect(event.action).toBe('PAYMENT_COLLECTED');
    expect(event.entity_id).toBe('pay_9981');
    expect(event.metadata).toEqual({
      amount_minor: 250000,
      currency: 'NGN',
    });
  });

  it('redacts sensitive fields in recorded audit metadata', async () => {
    const event = await service.recordAuditEvent(tenantId, {
      actor_user_id: 'usr_cashier_01',
      action: 'user.password_reset',
      entity_type: 'USER',
      entity_id: 'usr_02',
      metadata: {
        password: 'PlainTextSecret123',
        token: 'jwt_token_here',
        other_detail: 'Visible info',
      },
    });

    expect(event.metadata).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      other_detail: 'Visible info',
    });
  });

  it('records security events with appropriate severity', async () => {
    const secEvent = await service.recordSecurityEvent({
      tenant_id: tenantId,
      event_type: 'CROSS_TENANT_ATTEMPT',
      details: {
        attempted_tenant: 'ten_other',
        ip: '10.0.0.1',
      },
    });

    expect(secEvent.severity).toBe('CRITICAL');
    expect(secEvent.event_type).toBe('CROSS_TENANT_ATTEMPT');

    const queried = await service.querySecurityEvents({ tenant_id: tenantId });
    expect(queried).toHaveLength(1);
    expect(queried[0]!.id).toBe(secEvent.id);
  });

  it('filters audit events by actor and entity', async () => {
    await service.recordAuditEvent(tenantId, {
      actor_user_id: 'usr_alice',
      action: 'stock.adjusted',
      entity_type: 'STOCK',
      entity_id: 'prod_cement',
    });
    await service.recordAuditEvent(tenantId, {
      actor_user_id: 'usr_bob',
      action: 'order.created',
      entity_type: 'ORDER',
      entity_id: 'ord_101',
    });

    const aliceEvents = await service.queryAuditEvents(tenantId, {
      actor_user_id: 'usr_alice',
    });
    expect(aliceEvents).toHaveLength(1);
    expect(aliceEvents[0]!.entity_id).toBe('prod_cement');

    const orderEvents = await service.queryAuditEvents(tenantId, {
      entity_type: 'ORDER',
    });
    expect(orderEvents).toHaveLength(1);
    expect(orderEvents[0]!.actor_user_id).toBe('usr_bob');
  });
});
