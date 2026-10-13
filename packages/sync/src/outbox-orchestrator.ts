import type {
  SyncOperationEnvelope,
  SyncPushRequest,
  SyncPushResponse,
  SyncOperationStatus,
} from '@stokrova/contracts';
import {
  generateUuidV7,
  calculateNextRetryDelay,
  assertValidOutboxTransition,
} from '@stokrova/domain';

export interface EnqueueOperationParams {
  tenant_id: string;
  device_id: string;
  actor_user_id: string;
  command_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  operation_id?: string;
  schema_version?: number;
}

export interface OutboxRecord {
  id: string;
  operation_id: string;
  tenant_id: string;
  device_id: string;
  actor_user_id: string;
  client_sequence: number;
  command_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  schema_version: number;
  status: SyncOperationStatus;
  attempt_count: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
}

export class ClientOutboxOrchestrator {
  private records: Map<string, OutboxRecord> = new Map();
  private currentSequence = 0;

  constructor(initialSequence = 0, initialRecords: OutboxRecord[] = []) {
    this.currentSequence = initialSequence;
    for (const record of initialRecords) {
      this.records.set(record.operation_id, { ...record });
      if (record.client_sequence > this.currentSequence) {
        this.currentSequence = record.client_sequence;
      }
    }
  }

  /**
   * Enqueues a local command with monotonic client_sequence and RFC 9562 UUIDv7.
   */
  enqueueOperation(params: EnqueueOperationParams): OutboxRecord {
    this.currentSequence += 1;
    const opId = params.operation_id ?? generateUuidV7();
    const id = generateUuidV7();

    const record: OutboxRecord = {
      id,
      operation_id: opId,
      tenant_id: params.tenant_id,
      device_id: params.device_id,
      actor_user_id: params.actor_user_id,
      client_sequence: this.currentSequence,
      command_type: params.command_type,
      entity_id: params.entity_id,
      payload: params.payload,
      schema_version: params.schema_version ?? 1,
      status: 'PENDING',
      attempt_count: 0,
      next_attempt_at: null,
      last_error_code: null,
      last_error_message: null,
      created_at: new Date().toISOString(),
    };

    this.records.set(opId, record);
    return { ...record };
  }

  /**
   * Prepares a batch of pending or retryable operations for push transmission.
   * Transitions selected items to 'SENDING'.
   */
  preparePushBatch(limit = 50): SyncPushRequest | null {
    const now = new Date().toISOString();
    const eligible: OutboxRecord[] = [];

    const sortedRecords = Array.from(this.records.values()).sort(
      (a, b) => a.client_sequence - b.client_sequence,
    );

    for (const record of sortedRecords) {
      if (eligible.length >= limit) break;

      if (record.status === 'PENDING') {
        eligible.push(record);
      } else if (
        record.status === 'FAILED_RETRYABLE' &&
        (!record.next_attempt_at || record.next_attempt_at <= now)
      ) {
        eligible.push(record);
      }
    }

    if (eligible.length === 0) return null;

    // Transition eligible records to SENDING
    const operations: SyncOperationEnvelope[] = [];
    for (const record of eligible) {
      assertValidOutboxTransition(record.status, 'SENDING');
      record.status = 'SENDING';
      this.records.set(record.operation_id, record);

      operations.push({
        operation_id: record.operation_id,
        tenant_id: record.tenant_id,
        device_id: record.device_id,
        actor_user_id: record.actor_user_id,
        client_sequence: record.client_sequence,
        command_type: record.command_type,
        entity_id: record.entity_id,
        payload: record.payload,
        schema_version: record.schema_version,
        occurred_at: record.created_at,
      });
    }

    return { operations };
  }

  /**
   * Processes the server's push response and updates outbox state accordingly.
   */
  processPushResponse(response: SyncPushResponse): void {
    for (const result of response.results) {
      const record = this.records.get(result.operation_id);
      if (!record) continue;

      if (result.status === 'APPLIED' || result.status === 'ALREADY_APPLIED') {
        assertValidOutboxTransition(record.status, 'ACKED');
        record.status = 'ACKED';
        record.last_error_code = null;
        record.last_error_message = null;
      } else if (result.status === 'RETRY') {
        assertValidOutboxTransition(record.status, 'FAILED_RETRYABLE');
        record.status = 'FAILED_RETRYABLE';
        record.attempt_count += 1;
        const delayMs = calculateNextRetryDelay(record.attempt_count);
        record.next_attempt_at = new Date(Date.now() + delayMs).toISOString();
        record.last_error_code = result.error_code ?? 'RETRY_REQUESTED';
        record.last_error_message = result.error_message ?? 'Server requested retry';
      } else if (result.status === 'CONFLICT') {
        assertValidOutboxTransition(record.status, 'CONFLICT');
        record.status = 'CONFLICT';
        record.last_error_code = result.error_code ?? 'CONFLICT_DETECTED';
        record.last_error_message = result.error_message ?? 'Business conflict detected';
      } else if (result.status === 'REJECTED') {
        assertValidOutboxTransition(record.status, 'FAILED_PERMANENT');
        record.status = 'FAILED_PERMANENT';
        record.last_error_code = result.error_code ?? 'REJECTED_BY_SERVER';
        record.last_error_message = result.error_message ?? 'Permanent rejection';
      }

      this.records.set(record.operation_id, record);
    }
  }

  /**
   * Reverts currently SENDING items to FAILED_RETRYABLE if a network failure occurs before response.
   */
  markSendingFailed(errorMessage = 'Network connection failure'): void {
    for (const record of this.records.values()) {
      if (record.status === 'SENDING') {
        assertValidOutboxTransition('SENDING', 'FAILED_RETRYABLE');
        record.status = 'FAILED_RETRYABLE';
        record.attempt_count += 1;
        const delayMs = calculateNextRetryDelay(record.attempt_count);
        record.next_attempt_at = new Date(Date.now() + delayMs).toISOString();
        record.last_error_code = 'NETWORK_ERROR';
        record.last_error_message = errorMessage;
        this.records.set(record.operation_id, record);
      }
    }
  }

  /**
   * Returns count of operations pending push transmission.
   */
  getPendingCount(): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.status !== 'ACKED' && record.status !== 'FAILED_PERMANENT') {
        count++;
      }
    }
    return count;
  }

  /**
   * Returns the current client sequence number.
   */
  getCurrentSequence(): number {
    return this.currentSequence;
  }

  /**
   * Returns a record by operation_id.
   */
  getRecord(operationId: string): OutboxRecord | undefined {
    const record = this.records.get(operationId);
    return record ? { ...record } : undefined;
  }

  /**
   * Returns all outbox records.
   */
  getAllRecords(): OutboxRecord[] {
    return Array.from(this.records.values()).map((r) => ({ ...r }));
  }
}
