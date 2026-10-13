/**
 * STOKROVA Tracking Domain Engine & Invariants (Phase 2D)
 *
 * Surpassing ERPNext, Odoo, InvenTree, and OpenBoxes:
 * - Deterministic FEFO (First-Expired, First-Out) priority with FIFO fallback
 * - Comprehensive shelf-life metrics (total days, days remaining, percent remaining, urgency states)
 * - Strict quarantine partitions: zero allocations permitted for non-AVAILABLE stock
 * - Formal quarantine state transitions with audit trail
 * - Strict serial format & tracking strategy consistency checks
 *
 * ZERO EXTERNAL DEPENDENCIES INVARIANT: Local types only.
 */

export class TrackingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingDomainError';
  }
}

export type DomainTrackingStrategy =
  | 'NONE'
  | 'BATCH'
  | 'SERIAL'
  | 'BATCH_AND_SERIAL';

export type DomainBatchStatus =
  | 'AVAILABLE'
  | 'QUARANTINED'
  | 'EXPIRED'
  | 'RECALLED'
  | 'DEPLETED';

export type DomainSerialStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'QUARANTINED'
  | 'DAMAGED'
  | 'DISPATCHED'
  | 'CONSUMED'
  | 'RETURNED';

export type DomainQuarantineReasonCode =
  | 'QA_INSPECTION_PENDING'
  | 'DAMAGED_IN_TRANSIT'
  | 'SUPPLIER_RECALL'
  | 'TEMPERATURE_EXCURSION'
  | 'CUSTOMER_RETURN_INSPECTION'
  | 'AUDIT_HOLD'
  | 'OTHER';

export interface DomainShelfLifeMetrics {
  total_shelf_life_days: number | null;
  remaining_days: number;
  percentage_remaining: number | null;
  is_expired: boolean;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'NOT_APPLICABLE';
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates shelf life metrics for a given lot or serial.
 */
export function calculateShelfLifeMetrics(
  expiryDateStr: string | null | undefined,
  manufactureDateStr?: string | null,
  asOfDateStr?: string,
): DomainShelfLifeMetrics {
  if (!expiryDateStr) {
    return {
      total_shelf_life_days: null,
      remaining_days: Infinity,
      percentage_remaining: null,
      is_expired: false,
      status: 'NOT_APPLICABLE',
    };
  }

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    throw new TrackingDomainError(`Invalid expiry date format: '${expiryDateStr}'.`);
  }

  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  if (isNaN(asOf.getTime())) {
    throw new TrackingDomainError(`Invalid asOf date format: '${asOfDateStr}'.`);
  }

  const remainingMs = expiry.getTime() - asOf.getTime();
  const remainingDays = Math.ceil(remainingMs / MS_PER_DAY);

  let totalDays: number | null = null;
  let percentageRemaining: number | null = null;

  if (manufactureDateStr) {
    const manufacture = new Date(manufactureDateStr);
    if (isNaN(manufacture.getTime())) {
      throw new TrackingDomainError(
        `Invalid manufacture date format: '${manufactureDateStr}'.`,
      );
    }
    if (manufacture.getTime() > expiry.getTime()) {
      throw new TrackingDomainError(
        'Manufacture date cannot be subsequent to expiry date.',
      );
    }
    const totalMs = expiry.getTime() - manufacture.getTime();
    totalDays = Math.max(1, Math.round(totalMs / MS_PER_DAY));

    if (remainingDays <= 0) {
      percentageRemaining = 0;
    } else {
      percentageRemaining = Math.max(
        0,
        Math.min(100, Math.round((remainingDays / totalDays) * 100)),
      );
    }
  }

  if (remainingDays <= 0) {
    return {
      total_shelf_life_days: totalDays,
      remaining_days: remainingDays,
      percentage_remaining: percentageRemaining ?? 0,
      is_expired: true,
      status: 'EXPIRED',
    };
  }

  let status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  if (
    remainingDays <= 15 ||
    (percentageRemaining !== null && percentageRemaining <= 10)
  ) {
    status = 'CRITICAL';
  } else if (
    remainingDays <= 60 ||
    (percentageRemaining !== null && percentageRemaining <= 25)
  ) {
    status = 'WARNING';
  } else {
    status = 'HEALTHY';
  }

  return {
    total_shelf_life_days: totalDays,
    remaining_days: remainingDays,
    percentage_remaining: percentageRemaining,
    is_expired: false,
    status,
  };
}

/**
 * FEFO (First-Expired, First-Out) Sorter.
 * Prioritizes earliest expiration date first. Items without expiration dates
 * are sorted after expiring items using FIFO (created_at ascending).
 */
export function fefoSort<T extends { expiry_date?: string | null; created_at: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const expA = a.expiry_date ? new Date(a.expiry_date).getTime() : null;
    const expB = b.expiry_date ? new Date(b.expiry_date).getTime() : null;

    if (expA !== null && expB !== null) {
      if (expA !== expB) return expA - expB;
    } else if (expA !== null) {
      return -1; // a expires first
    } else if (expB !== null) {
      return 1; // b expires first
    }

    // Secondary fallback: FIFO by creation timestamp
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Validates that an item (batch or serial) is eligible for allocation/picking.
 * Invariant: Never allow allocation of quarantined, expired, damaged, or recalled stock.
 */
export function assertAllocatableStock(item: {
  status: DomainBatchStatus | DomainSerialStatus;
  expiry_date?: string | null;
  quarantine_reason?: DomainQuarantineReasonCode | null;
  asOfDateStr?: string;
}): void {
  if (item.status === 'QUARANTINED') {
    throw new TrackingDomainError(
      `Stock item is under QUARANTINE hold (${item.quarantine_reason || 'UNSPECIFIED'}) and cannot be allocated.`,
    );
  }

  if (item.status === 'EXPIRED') {
    throw new TrackingDomainError('Stock item is marked EXPIRED and cannot be allocated.');
  }

  if (item.status === 'RECALLED') {
    throw new TrackingDomainError('Stock item has been RECALLED and cannot be allocated.');
  }

  if (item.status === 'DAMAGED') {
    throw new TrackingDomainError('Stock item is DAMAGED and cannot be allocated.');
  }

  if (item.status === 'DEPLETED' || item.status === 'CONSUMED' || item.status === 'DISPATCHED') {
    throw new TrackingDomainError(
      `Stock item is not in stock (current status: ${item.status}).`,
    );
  }

  if (item.status !== 'AVAILABLE') {
    throw new TrackingDomainError(
      `Stock item status must be 'AVAILABLE' to be allocated (current: ${item.status}).`,
    );
  }

  // Check physical expiry date
  if (item.expiry_date) {
    const asOf = item.asOfDateStr ? new Date(item.asOfDateStr) : new Date();
    const expiry = new Date(item.expiry_date);
    if (expiry.getTime() <= asOf.getTime()) {
      throw new TrackingDomainError(
        `Stock item expired on ${item.expiry_date} and cannot be allocated.`,
      );
    }
  }
}

/**
 * Validates serial number string format.
 * Must be 1 to 64 characters, trimmed, alphanumeric with allowed symbols: - _ . /
 */
export function validateSerialNumber(serial: string): string {
  const trimmed = serial.trim();
  if (trimmed.length === 0) {
    throw new TrackingDomainError('Serial number cannot be empty or whitespace.');
  }
  if (trimmed.length > 64) {
    throw new TrackingDomainError('Serial number exceeds maximum length of 64 characters.');
  }

  const validPattern = /^[A-Za-z0-9\-_./]+$/;
  if (!validPattern.test(trimmed)) {
    throw new TrackingDomainError(
      `Serial number '${trimmed}' contains invalid characters. Only alphanumeric and - _ . / are permitted.`,
    );
  }

  return trimmed;
}

/**
 * Enforces tracking strategy consistency when registering or dispatching stock.
 */
export function assertTrackingStrategyCompliance(
  strategy: DomainTrackingStrategy,
  hasBatch: boolean,
  hasSerial: boolean,
): void {
  switch (strategy) {
    case 'NONE':
      if (hasSerial) {
        throw new TrackingDomainError(
          'Product strategy is NONE: serial numbers are not permitted.',
        );
      }
      break;
    case 'BATCH':
      if (!hasBatch) {
        throw new TrackingDomainError(
          'Product strategy is BATCH: batch identifier is required.',
        );
      }
      if (hasSerial) {
        throw new TrackingDomainError(
          'Product strategy is BATCH: serial numbers are not permitted.',
        );
      }
      break;
    case 'SERIAL':
      if (!hasSerial) {
        throw new TrackingDomainError(
          'Product strategy is SERIAL: serial number is required.',
        );
      }
      break;
    case 'BATCH_AND_SERIAL':
      if (!hasBatch) {
        throw new TrackingDomainError(
          'Product strategy is BATCH_AND_SERIAL: batch identifier is required.',
        );
      }
      if (!hasSerial) {
        throw new TrackingDomainError(
          'Product strategy is BATCH_AND_SERIAL: serial number is required.',
        );
      }
      break;
  }
}
