import { generateUuidV7 } from './uuid.js';

export interface DomainEvent<TPayload = unknown, TMetadata = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId: string;
  payload: TPayload;
  metadata?: TMetadata;
  operationId?: string;
  occurredAt: string;
}

export interface CreateDomainEventParams<TPayload = unknown, TMetadata = Record<string, unknown>> {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId: string;
  payload: TPayload;
  metadata?: TMetadata;
  operationId?: string;
  eventId?: string;
  occurredAt?: string;
}

/**
 * Factory for creating standardized STOKROVA Domain Events.
 * Automatically generates UUIDv7 event IDs and UTC timestamps.
 */
export function createDomainEvent<TPayload = unknown, TMetadata = Record<string, unknown>>(
  params: CreateDomainEventParams<TPayload, TMetadata>,
): DomainEvent<TPayload, TMetadata> {
  if (!params.eventType || params.eventType.trim() === '') {
    throw new Error('Domain event eventType is required.');
  }
  if (!params.aggregateType || params.aggregateType.trim() === '') {
    throw new Error('Domain event aggregateType is required.');
  }
  if (!params.aggregateId || params.aggregateId.trim() === '') {
    throw new Error('Domain event aggregateId is required.');
  }
  if (!params.tenantId || params.tenantId.trim() === '') {
    throw new Error('Domain event tenantId is required.');
  }

  return {
    eventId: params.eventId || generateUuidV7(),
    eventType: params.eventType.trim(),
    aggregateType: params.aggregateType.trim(),
    aggregateId: params.aggregateId.trim(),
    tenantId: params.tenantId.trim(),
    occurredAt: params.occurredAt || new Date().toISOString(),
    operationId: params.operationId,
    payload: params.payload,
    metadata: params.metadata,
  };
}

/**
 * Validates domain event structural integrity.
 */
export function isValidDomainEvent(event: unknown): event is DomainEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return (
    typeof e['eventId'] === 'string' &&
    typeof e['eventType'] === 'string' &&
    typeof e['aggregateType'] === 'string' &&
    typeof e['aggregateId'] === 'string' &&
    typeof e['tenantId'] === 'string' &&
    typeof e['occurredAt'] === 'string' &&
    'payload' in e
  );
}
