import { describe, it, expect } from 'vitest';
import { createDomainEvent, isValidDomainEvent } from '../src/events.js';
import { isValidUuidV7 } from '../src/uuid.js';

describe('Domain Events (Section 17)', () => {
  it('creates a standardized domain event with valid UUIDv7 eventId and UTC timestamp', () => {
    const event = createDomainEvent({
      eventType: 'sales.order.created',
      aggregateType: 'Order',
      aggregateId: 'ord_123',
      tenantId: 'ten_abc',
      payload: { total_minor: 50000 },
      metadata: { source: 'pos' },
    });

    expect(isValidUuidV7(event.eventId)).toBe(true);
    expect(event.eventType).toBe('sales.order.created');
    expect(event.aggregateType).toBe('Order');
    expect(event.aggregateId).toBe('ord_123');
    expect(event.tenantId).toBe('ten_abc');
    expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);
    expect(event.payload).toEqual({ total_minor: 50000 });
    expect(event.metadata).toEqual({ source: 'pos' });
  });

  it('validates structural integrity with isValidDomainEvent', () => {
    const event = createDomainEvent({
      eventType: 'inventory.adjusted',
      aggregateType: 'StockItem',
      aggregateId: 'item_999',
      tenantId: 'ten_abc',
      payload: { quantity: 10 },
    });

    expect(isValidDomainEvent(event)).toBe(true);
    expect(isValidDomainEvent({ not: 'an event' })).toBe(false);
    expect(isValidDomainEvent(null)).toBe(false);
  });

  it('throws an error when mandatory fields are missing', () => {
    expect(() =>
      createDomainEvent({
        eventType: '',
        aggregateType: 'Order',
        aggregateId: 'ord_1',
        tenantId: 'ten_1',
        payload: {},
      }),
    ).toThrowError(/eventType is required/);

    expect(() =>
      createDomainEvent({
        eventType: 'test',
        aggregateType: '',
        aggregateId: 'ord_1',
        tenantId: 'ten_1',
        payload: {},
      }),
    ).toThrowError(/aggregateType is required/);
  });
});
