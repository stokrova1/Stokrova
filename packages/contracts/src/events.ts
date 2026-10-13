/**
 * STOKROVA Domain Event Contract (Section 17)
 * Authoritative interface for all business domain events.
 */
export interface DomainEvent<TPayload = unknown, TMetadata = Record<string, unknown>> {
  eventId: string; // UUIDv7
  eventType: string; // e.g., 'sales.order.created', 'inventory.movement.posted'
  aggregateType: string; // e.g., 'Order', 'InventoryMovement', 'Tenant'
  aggregateId: string;
  tenantId: string;
  occurredAt: string; // ISO 8601 UTC timestamp
  operationId?: string; // Optional correlation / idempotency operation ID
  payload: TPayload;
  metadata?: TMetadata;
}

export type OutboxEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventRecord {
  id: string;
  tenant_id: string;
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  operation_id?: string | null;
  payload: unknown;
  metadata?: Record<string, unknown> | null;
  status: OutboxEventStatus;
  attempts: number;
  last_error?: string | null;
  occurred_at: string;
  published_at?: string | null;
}
