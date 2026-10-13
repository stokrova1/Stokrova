export type DomainLocationType =
  | 'RECEIVING'
  | 'INTERNAL_STORAGE'
  | 'PICKING_FACE'
  | 'STAGING'
  | 'DISPATCH'
  | 'QUARANTINE'
  | 'DAMAGED'
  | 'SCRAP'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'TRANSIT';

export type DomainBinMixPolicy = 'SINGLE_SKU' | 'MULTI_SKU' | 'SINGLE_BATCH';

export class WarehouseDomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'WarehouseDomainError';
  }
}

/**
 * Calculates a materialized hierarchical path for a storage location.
 * Format: WH-MAIN/ZONE-A/RACK-01/BIN-02
 */
export function calculateMaterializedLocationPath(
  parentPath: string | null,
  code: string,
): string {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.includes('/')) {
    throw new WarehouseDomainError(
      'INVALID_LOCATION_CODE',
      'Location code cannot contain path separator "/"',
    );
  }
  if (!parentPath) {
    return cleanCode;
  }
  return `${parentPath.trim().toUpperCase()}/${cleanCode}`;
}

/**
 * Validates acyclicity and warehouse containment within the storage location tree.
 */
export function validateLocationAcyclicity(
  locationId: string,
  newParentId: string | null,
  locationLookup: (id: string) => { parent_id: string | null; warehouse_id: string } | undefined,
  targetWarehouseId: string,
): void {
  if (!newParentId) return;

  if (locationId === newParentId) {
    throw new WarehouseDomainError(
      'LOCATION_SELF_PARENT_FORBIDDEN',
      'Location cannot be its own parent',
    );
  }

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === locationId) {
      throw new WarehouseDomainError(
        'LOCATION_CYCLE_DETECTED',
        'Circular reference detected in location hierarchy',
      );
    }
    if (visited.has(currentId)) {
      throw new WarehouseDomainError(
        'LOCATION_CYCLE_DETECTED',
        'Loop detected in location hierarchy',
      );
    }
    visited.add(currentId);

    const parent = locationLookup(currentId);
    if (!parent) {
      throw new WarehouseDomainError(
        'PARENT_LOCATION_NOT_FOUND',
        `Parent location with ID '${currentId}' not found`,
      );
    }

    if (parent.warehouse_id !== targetWarehouseId) {
      throw new WarehouseDomainError(
        'CROSS_WAREHOUSE_PARENT_FORBIDDEN',
        'Parent location must belong to the same warehouse',
      );
    }

    currentId = parent.parent_id;
  }
}

/**
 * Asserts physical bin capacity invariants for weight and volume.
 */
export function assertValidBinCapacity(
  currentWeightKg: number,
  maxWeightKg: number | null,
  addedWeightKg: number,
  currentVolCm3: number,
  maxVolCm3: number | null,
  addedVolCm3: number,
): void {
  if (maxWeightKg !== null && maxWeightKg !== undefined) {
    const projectedWeight = currentWeightKg + addedWeightKg;
    if (projectedWeight > maxWeightKg) {
      throw new WarehouseDomainError(
        'BIN_WEIGHT_CAPACITY_EXCEEDED',
        `Projected weight (${projectedWeight} kg) exceeds bin maximum capacity (${maxWeightKg} kg)`,
      );
    }
  }

  if (maxVolCm3 !== null && maxVolCm3 !== undefined) {
    const projectedVol = currentVolCm3 + addedVolCm3;
    if (projectedVol > maxVolCm3) {
      throw new WarehouseDomainError(
        'BIN_VOLUME_CAPACITY_EXCEEDED',
        `Projected volume (${projectedVol} cm³) exceeds bin maximum volume (${maxVolCm3} cm³)`,
      );
    }
  }
}

/**
 * Asserts bin product mixing policy invariants (Single SKU, Multi SKU, Single Batch).
 */
export function assertBinMixPolicy(
  mixPolicy: DomainBinMixPolicy,
  existingSkus: string[],
  incomingSku: string,
  existingBatches?: string[],
  incomingBatch?: string,
): void {
  const normIncomingSku = incomingSku.trim().toUpperCase();

  if (mixPolicy === 'SINGLE_SKU') {
    const foreignSku = existingSkus.find((s) => s.trim().toUpperCase() !== normIncomingSku);
    if (foreignSku) {
      throw new WarehouseDomainError(
        'BIN_MIX_POLICY_VIOLATION',
        `Single-SKU bin already holds SKU '${foreignSku}'; cannot accept '${normIncomingSku}'`,
      );
    }
  }

  if (mixPolicy === 'SINGLE_BATCH') {
    // If incoming product is different, that's already a batch/SKU mismatch
    const foreignSku = existingSkus.find((s) => s.trim().toUpperCase() !== normIncomingSku);
    if (foreignSku) {
      throw new WarehouseDomainError(
        'BIN_MIX_POLICY_VIOLATION',
        `Single-batch bin already holds SKU '${foreignSku}'`,
      );
    }

    if (incomingBatch && existingBatches && existingBatches.length > 0) {
      const foreignBatch = existingBatches.find(
        (b) => b.trim().toUpperCase() !== incomingBatch.trim().toUpperCase(),
      );
      if (foreignBatch) {
        throw new WarehouseDomainError(
          'BIN_MIX_POLICY_VIOLATION',
          `Single-batch bin already holds batch '${foreignBatch}'; cannot accept '${incomingBatch}'`,
        );
      }
    }
  }
}
