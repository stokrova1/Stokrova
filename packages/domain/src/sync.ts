export type SyncOperationStatus =
  | 'PENDING'
  | 'SENDING'
  | 'ACKED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_PERMANENT'
  | 'CONFLICT';

export type SyncResultStatus =
  | 'APPLIED'
  | 'ALREADY_APPLIED'
  | 'REJECTED'
  | 'CONFLICT'
  | 'RETRY';

export type ConflictResolutionStrategy =
  | 'IMMUTABLE_APPEND'
  | 'SERVER_WINS'
  | 'CLIENT_WINS'
  | 'EXCEPTION_WORKFLOW';

/**
 * Valid client outbox transitions:
 * PENDING -> SENDING
 * SENDING -> ACKED
 * SENDING -> FAILED_RETRYABLE
 * SENDING -> FAILED_PERMANENT
 * SENDING -> CONFLICT
 * FAILED_RETRYABLE -> SENDING
 * FAILED_RETRYABLE -> FAILED_PERMANENT
 */
const OUTBOX_TRANSITIONS: Record<SyncOperationStatus, readonly SyncOperationStatus[]> = {
  PENDING: ['SENDING'],
  SENDING: ['ACKED', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'CONFLICT'],
  ACKED: [],
  FAILED_RETRYABLE: ['SENDING', 'FAILED_PERMANENT'],
  FAILED_PERMANENT: [],
  CONFLICT: ['PENDING', 'FAILED_PERMANENT'],
};

export function canTransitionOutbox(from: SyncOperationStatus, to: SyncOperationStatus): boolean {
  if (from === to) return true;
  const allowed = OUTBOX_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidOutboxTransition(from: SyncOperationStatus, to: SyncOperationStatus): void {
  if (!canTransitionOutbox(from, to)) {
    throw new Error(`Invalid outbox operation transition from ${from} to ${to}`);
  }
}

/**
 * Exponential backoff with bounded jitter
 * formula: min(baseDelay * 2^attempt, maxDelay) * (1 +/- jitter)
 */
export function calculateNextRetryDelay(
  attemptCount: number,
  baseDelayMs = 1000,
  maxDelayMs = 60000,
  jitterRatio = 0.1,
): number {
  if (attemptCount < 0) {
    throw new Error('Attempt count cannot be negative');
  }
  const exponential = baseDelayMs * Math.pow(2, attemptCount);
  const bounded = Math.min(exponential, maxDelayMs);
  
  // Deterministic or pseudo-random jitter calculation within range [-jitterRatio, +jitterRatio]
  const jitterRange = bounded * jitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(100, Math.round(bounded + jitter));
}

export interface CachedOperationRecord {
  status: SyncResultStatus;
  server_sequence?: number;
  error_code?: string;
  error_message?: string;
}

export interface InboxDeduplicationEvaluation {
  isDuplicate: boolean;
  statusToProcess: 'PENDING' | 'ALREADY_APPLIED';
  cachedResult?: CachedOperationRecord;
}

/**
 * Evaluates inbox deduplication:
 * If an operation with the same operation_id already exists for the tenant,
 * return duplicate info so the server returns the cached result without re-executing.
 */
export function evaluateInboxDeduplication(
  operationId: string,
  existingRecord: CachedOperationRecord | null | undefined,
): InboxDeduplicationEvaluation {
  if (!operationId || operationId.trim() === '') {
    throw new Error('operation_id is required for inbox deduplication evaluation');
  }

  if (existingRecord) {
    return {
      isDuplicate: true,
      statusToProcess: 'ALREADY_APPLIED',
      cachedResult: existingRecord,
    };
  }

  return {
    isDuplicate: false,
    statusToProcess: 'PENDING',
  };
}

/**
 * Strictly monotonic sequence generation
 */
export function generateNextSequence(currentMaxSequence: number): number {
  if (currentMaxSequence < 0) {
    throw new Error('Current sequence cannot be negative');
  }
  return currentMaxSequence + 1;
}

/**
 * Validates pull cursor request against system bounds
 */
export function validateCursorAdvancement(
  currentServerSequence: number,
  requestedAfter: number,
): boolean {
  if (requestedAfter < 0) return false;
  return requestedAfter <= currentServerSequence;
}

const APPEND_ONLY_COMMANDS = new Set([
  'sales.create',
  'sales.line_item.add',
  'payments.record',
  'payments.refund',
  'inventory.movement',
  'receipt.print',
  'workflow.task.complete',
  'register.session.open',
  'register.session.close',
  'register.cash.movement',
]);

/**
 * Determines whether a command represents an immutable append-only event
 * (which never suffers from lost-update conflicts because each is an independent ledger entry)
 */
export function isAppendOnlyCommand(commandType: string): boolean {
  if (!commandType) return false;
  const normalized = commandType.toLowerCase().trim();
  return APPEND_ONLY_COMMANDS.has(normalized);
}

/**
 * Conflict resolution policy:
 * - Append-only commands are always appended to their respective ledgers
 * - Master data updates prefer server-wins unless configured otherwise
 * - High-risk actions route to exception workflows
 */
export function resolveConflictPolicy(
  commandType: string,
  isServerAhead = false,
): ConflictResolutionStrategy {
  if (isAppendOnlyCommand(commandType)) {
    return 'IMMUTABLE_APPEND';
  }

  if (commandType.startsWith('catalog.') || commandType.startsWith('branch.')) {
    return isServerAhead ? 'SERVER_WINS' : 'CLIENT_WINS';
  }

  return 'EXCEPTION_WORKFLOW';
}

// ============================================================================
// Phase 20: Vector Clock & Multi-Master Concurrency Engine
// ============================================================================

export type VectorClock = Record<string, number>;

export type VectorClockComparison = 'EQUAL' | 'BEFORE' | 'AFTER' | 'CONCURRENT';

export function compareVectorClocks(
  v1: VectorClock,
  v2: VectorClock,
): VectorClockComparison {
  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let v1HasGreater = false;
  let v2HasGreater = false;

  for (const k of allKeys) {
    const val1 = v1[k] ?? 0;
    const val2 = v2[k] ?? 0;

    if (val1 > val2) v1HasGreater = true;
    if (val2 > val1) v2HasGreater = true;
  }

  if (!v1HasGreater && !v2HasGreater) return 'EQUAL';
  if (v1HasGreater && !v2HasGreater) return 'AFTER';
  if (!v1HasGreater && v2HasGreater) return 'BEFORE';
  return 'CONCURRENT';
}

export function mergeVectorClocks(v1: VectorClock, v2: VectorClock): VectorClock {
  const merged: VectorClock = { ...v1 };
  for (const [key, val] of Object.entries(v2)) {
    merged[key] = Math.max(merged[key] ?? 0, val);
  }
  return merged;
}

export function incrementVectorClock(clock: VectorClock, nodeId: string): VectorClock {
  return {
    ...clock,
    [nodeId]: (clock[nodeId] ?? 0) + 1,
  };
}

// ============================================================================
// Phase 20: Multi-Master Conflict Resolution Engine (Rule 10)
// ============================================================================

export interface EntityConflictResolutionResult {
  strategy: ConflictResolutionStrategy;
  winningPayload: Record<string, unknown>;
  isConflict: boolean;
  reason: string;
}

export function resolveMasterEntityConflict(
  commandType: string,
  clientEntity: { version: number; clock?: VectorClock; payload: Record<string, unknown> },
  serverEntity: { version: number; clock?: VectorClock; payload: Record<string, unknown> },
): EntityConflictResolutionResult {
  // 1. Immutable append-only commands never collide (Rule 10)
  if (isAppendOnlyCommand(commandType)) {
    return {
      strategy: 'IMMUTABLE_APPEND',
      winningPayload: clientEntity.payload,
      isConflict: false,
      reason: 'Command is append-only ledger mutation',
    };
  }

  // 2. Vector clock analysis if clocks are present
  if (clientEntity.clock && serverEntity.clock) {
    const clockComp = compareVectorClocks(clientEntity.clock, serverEntity.clock);

    if (clockComp === 'AFTER') {
      return {
        strategy: 'CLIENT_WINS',
        winningPayload: clientEntity.payload,
        isConflict: false,
        reason: 'Client vector clock happened strictly after server',
      };
    }

    if (clockComp === 'BEFORE' || clockComp === 'EQUAL') {
      return {
        strategy: 'SERVER_WINS',
        winningPayload: serverEntity.payload,
        isConflict: false,
        reason: 'Server vector clock is up-to-date or ahead',
      };
    }

    // CONCURRENT: True distributed edit collision
    return {
      strategy: 'EXCEPTION_WORKFLOW',
      winningPayload: serverEntity.payload, // Preserve authoritative server data while raising conflict
      isConflict: true,
      reason: 'Concurrent modifications on different offline branches detected',
    };
  }

  // 3. Fallback to monotonic version checking
  if (clientEntity.version > serverEntity.version) {
    return {
      strategy: 'CLIENT_WINS',
      winningPayload: clientEntity.payload,
      isConflict: false,
      reason: 'Client monotonic version is higher',
    };
  }

  if (clientEntity.version < serverEntity.version) {
    return {
      strategy: 'SERVER_WINS',
      winningPayload: serverEntity.payload,
      isConflict: false,
      reason: 'Server monotonic version is higher',
    };
  }

  // Versions are equal but payloads differ -> Conflict
  const clientStr = JSON.stringify(clientEntity.payload);
  const serverStr = JSON.stringify(serverEntity.payload);

  if (clientStr === serverStr) {
    return {
      strategy: 'SERVER_WINS',
      winningPayload: serverEntity.payload,
      isConflict: false,
      reason: 'Identical payload state',
    };
  }

  return {
    strategy: 'EXCEPTION_WORKFLOW',
    winningPayload: serverEntity.payload,
    isConflict: true,
    reason: 'Equal version with divergent content — exception required',
  };
}

// ============================================================================
// Sequence Gap & Ordering Detection
// ============================================================================

export function detectSequenceGaps(sequences: number[]): {
  hasGaps: boolean;
  missingSequences: number[];
} {
  if (sequences.length <= 1) {
    return { hasGaps: false, missingSequences: [] };
  }

  const sorted = [...sequences].sort((a, b) => a - b);
  const missing: number[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]!;
    const next = sorted[i + 1]!;
    for (let missingSeq = curr + 1; missingSeq < next; missingSeq++) {
      missing.push(missingSeq);
    }
  }

  return {
    hasGaps: missing.length > 0,
    missingSequences: missing,
  };
}
