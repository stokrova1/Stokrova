/**
 * STOKROVA Inventory Movement Types & Invariants (Phase 2E)
 * Defined in DOMAIN_MODEL.md & ARCHITECTURE.md
 *
 * ZERO EXTERNAL DEPENDENCIES INVARIANT: Local types only.
 */

export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryDomainError';
  }
}

export const InventoryMovementTypes = {
  OPENING_BALANCE: 'OPENING_BALANCE',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  SALE_ISSUE: 'SALE_ISSUE',
  SALES_DISPATCH: 'SALES_DISPATCH',
  CUSTOMER_RETURN: 'CUSTOMER_RETURN',
  SUPPLIER_RETURN: 'SUPPLIER_RETURN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  DAMAGE: 'DAMAGE',
  SCRAP_DAMAGED: 'SCRAP_DAMAGED',
  EXPIRY: 'EXPIRY',
  ADJUSTMENT: 'ADJUSTMENT',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
  STOCK_COUNT_ADJUSTMENT: 'STOCK_COUNT_ADJUSTMENT',
  QUARANTINE_MOVE: 'QUARANTINE_MOVE',
  QUARANTINE_RELEASE: 'QUARANTINE_RELEASE',
  QUARANTINE_REJECT: 'QUARANTINE_REJECT',
  MANUFACTURING_CONSUMPTION: 'MANUFACTURING_CONSUMPTION',
  MANUFACTURING_RECEIPT: 'MANUFACTURING_RECEIPT',
  MANUFACTURING_SCRAP: 'MANUFACTURING_SCRAP',
  RESERVATION: 'RESERVATION',
  RELEASE_RESERVATION: 'RELEASE_RESERVATION',
} as const;

export type InventoryMovementType =
  (typeof InventoryMovementTypes)[keyof typeof InventoryMovementTypes];

/**
 * Calculates available stock from on-hand and reserved quantity.
 * Invariant: available_qty = on_hand_qty - reserved_qty
 */
export function calculateAvailableStock(
  onHandQty: number,
  reservedQty: number,
): number {
  return onHandQty - reservedQty;
}

/**
 * Validates whether an issue movement violates negative stock policy.
 */
export function canIssueStock(
  availableQty: number,
  requestedQty: number,
  allowNegative = false,
): boolean {
  if (requestedQty <= 0) {
    return false;
  }
  if (allowNegative) {
    return true;
  }
  return availableQty >= requestedQty;
}

/**
 * Phase 2E: Comprehensive Stock Movement Invariant Verifier.
 */
export function assertStockMovementValid(movement: {
  quantity: number;
  movement_type: string;
  source_location_id?: string | null;
  destination_location_id?: string | null;
  source_warehouse_id?: string | null;
  destination_warehouse_id?: string | null;
}): void {
  if (movement.quantity <= 0) {
    throw new InventoryDomainError(
      `Movement quantity must be positive. Received: ${movement.quantity}.`,
    );
  }

  // Location validation by movement type
  switch (movement.movement_type) {
    case 'OPENING_BALANCE':
    case 'PURCHASE_RECEIPT':
    case 'CUSTOMER_RETURN':
    case 'TRANSFER_IN':
    case 'MANUFACTURING_RECEIPT':
      if (!movement.destination_warehouse_id) {
        throw new InventoryDomainError(
          `${movement.movement_type} requires a destination warehouse.`,
        );
      }
      break;

    case 'SALE_ISSUE':
    case 'SALES_DISPATCH':
    case 'SUPPLIER_RETURN':
    case 'TRANSFER_OUT':
    case 'DAMAGE':
    case 'SCRAP_DAMAGED':
    case 'EXPIRY':
    case 'MANUFACTURING_CONSUMPTION':
    case 'MANUFACTURING_SCRAP':
      if (!movement.source_warehouse_id) {
        throw new InventoryDomainError(
          `${movement.movement_type} requires a source warehouse.`,
        );
      }
      break;

    case 'INTERNAL_TRANSFER':
      if (
        !movement.source_warehouse_id ||
        !movement.destination_warehouse_id
      ) {
        throw new InventoryDomainError(
          'Internal transfer requires both source and destination warehouses.',
        );
      }
      if (
        movement.source_warehouse_id === movement.destination_warehouse_id &&
        movement.source_location_id &&
        movement.source_location_id === movement.destination_location_id
      ) {
        throw new InventoryDomainError(
          'Source and destination storage locations cannot be identical for transfer.',
        );
      }
      break;

    case 'ADJUSTMENT':
    case 'STOCK_ADJUSTMENT':
    case 'STOCK_COUNT_ADJUSTMENT':
      if (
        !movement.destination_warehouse_id &&
        !movement.source_warehouse_id
      ) {
        throw new InventoryDomainError(
          `${movement.movement_type} requires at least one target warehouse.`,
        );
      }
      break;

    case 'QUARANTINE_MOVE':
    case 'QUARANTINE_RELEASE':
    case 'QUARANTINE_REJECT':
      if (!movement.destination_warehouse_id && !movement.source_warehouse_id) {
        throw new InventoryDomainError(
          `${movement.movement_type} requires warehouse specifications.`,
        );
      }
      break;
  }
}

/**
 * Authoritative Inventory Invariant:
 * Current Stock = Sum(Posted Inventory Movements)
 * Calculates algebraic sum across ledger entries for a target warehouse/location/batch.
 */
export function calculateLedgerSum(
  entries: Array<{
    movement_type: string;
    quantity: number;
    source_warehouse_id?: string | null;
    source_location_id?: string | null;
    destination_warehouse_id?: string | null;
    destination_location_id?: string | null;
    batch_id?: string | null;
  }>,
  warehouseId: string,
  locationId?: string | null,
  batchId?: string | null,
): number {
  let balance = 0;
  for (const entry of entries) {
    if (batchId && entry.batch_id !== batchId) {
      continue;
    }

    const isDestMatch =
      entry.destination_warehouse_id === warehouseId &&
      (!locationId || entry.destination_location_id === locationId);

    const isSourceMatch =
      entry.source_warehouse_id === warehouseId &&
      (!locationId || entry.source_location_id === locationId);

    if (isDestMatch && !isSourceMatch) {
      balance += entry.quantity;
    } else if (isSourceMatch && !isDestMatch) {
      balance -= entry.quantity;
    }
  }
  return balance;
}

/**
 * Calculates total valuation cost in integer minor units.
 */
export function calculateTotalCostMinor(
  quantity: number,
  unitCostMinorStr: string,
): string {
  const unitCost = BigInt(unitCostMinorStr);
  const qtyBigInt = BigInt(Math.round(quantity));
  return (unitCost * qtyBigInt).toString();
}

/**
 * Calculates real-time Available to Promise (ATP) inventory.
 * ATP = max(0, on_hand - reserved + incoming)
 */
export function calculateAvailableToPromise(
  onHand: number,
  reserved: number,
  incoming = 0,
): number {
  return Math.max(0, onHand - reserved + incoming);
}

/**
 * Evaluates whether a reservation has expired based on TTL expiration timestamp.
 */
export function isReservationExpired(
  expiresAtStr: string,
  asOfStr?: string,
): boolean {
  const expiresAt = new Date(expiresAtStr).getTime();
  const asOf = asOfStr ? new Date(asOfStr).getTime() : Date.now();
  return asOf > expiresAt;
}
