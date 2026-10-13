import { Injectable } from '@nestjs/common';
import type { DomainEvent, OutboxEventRecord } from '@stokrova/contracts';
import { generateUuidV7 } from '@stokrova/domain';
import type { DatabaseTransaction } from '@stokrova/database';
import { outbox_events } from '@stokrova/database';

@Injectable()
export class OutboxService {
  private readonly inMemoryOutbox: OutboxEventRecord[] = [];

  /**
   * Persists a domain event to the transactional outbox table.
   * If an active database transaction is provided, this insert executes atomically
   * within that transaction.
   */
  async saveEvent(
    tx: DatabaseTransaction | null,
    event: DomainEvent,
  ): Promise<OutboxEventRecord> {
    const record: OutboxEventRecord = {
      id: generateUuidV7(),
      tenant_id: event.tenantId,
      event_id: event.eventId,
      event_type: event.eventType,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      operation_id: event.operationId || null,
      payload: event.payload,
      metadata: event.metadata || null,
      status: 'PENDING',
      attempts: 0,
      last_error: null,
      occurred_at: event.occurredAt,
      published_at: null,
    };

    if (tx) {
      await tx.insert(outbox_events).values({
        id: record.id,
        tenant_id: record.tenant_id,
        event_id: record.event_id,
        event_type: record.event_type,
        aggregate_type: record.aggregate_type,
        aggregate_id: record.aggregate_id,
        operation_id: record.operation_id,
        payload: record.payload as any,
        metadata: record.metadata as any,
        status: record.status,
        attempts: record.attempts,
        last_error: record.last_error,
        occurred_at: new Date(record.occurred_at),
      });
    } else {
      this.inMemoryOutbox.push(record);
    }

    return record;
  }

  /**
   * Helper to enqueue a domain event to the outbox without an explicit transaction.
   */
  async enqueueEvent(
    tenantId: string,
    eventType: string,
    payload: unknown,
    operationId?: string,
    aggregateType = 'COMMERCE',
    aggregateId?: string,
  ): Promise<OutboxEventRecord> {
    const event: DomainEvent = {
      eventId: generateUuidV7(),
      eventType,
      aggregateType,
      aggregateId: aggregateId || generateUuidV7(),
      tenantId,
      occurredAt: new Date().toISOString(),
      operationId,
      payload,
    };
    return this.saveEvent(null, event);
  }

  /**
   * Retrieves pending outbox events awaiting asynchronous dispatch.
   */
  async getPendingEvents(limit = 50): Promise<OutboxEventRecord[]> {
    return this.inMemoryOutbox.filter((e) => e.status === 'PENDING').slice(0, limit);
  }

  /**
   * Marks an outbox event as published upon confirmation by the event broker.
   */
  async markPublished(eventId: string): Promise<void> {
    const record = this.inMemoryOutbox.find((e) => e.event_id === eventId);
    if (record) {
      record.status = 'PUBLISHED';
      record.published_at = new Date().toISOString();
    }
  }

  /**
   * Marks an outbox event as failed with recorded error information.
   */
  async markFailed(eventId: string, error: string): Promise<void> {
    const record = this.inMemoryOutbox.find((e) => e.event_id === eventId);
    if (record) {
      record.status = 'FAILED';
      record.attempts++;
      record.last_error = error;
    }
  }

  // Helper for tests/resets
  clear(): void {
    this.inMemoryOutbox.length = 0;
  }
}
