/**
 * Manufacturing, Bill of Materials (BOM), Work Centers & Routing Domain Engine (Phase 5)
 * Pure zero-dependency domain logic enforcing:
 * - Multi-level BOM hierarchy and circular dependency prevention (5A)
 * - Proportional & fixed scrap rate explosion calculation (5A)
 * - Work center efficiency-adjusted operation durations and rate costing (5B, 5C)
 * - Manufacturing Order (MO) lifecycle transitions and backflushing rules (5D, 5E)
 * - Finished goods unit cost reconciliation with byproduct offsets (5E)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 */

export type ManufacturingOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'INSPECTION'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export class ManufacturingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManufacturingDomainError';
  }
}

export class BomCircularDependencyDomainError extends ManufacturingDomainError {
  constructor(parentVariantId: string, componentVariantId: string) {
    super(
      `Circular dependency detected in Bill of Materials: Component '${componentVariantId}' references parent assembly '${parentVariantId}'.`,
    );
    this.name = 'BomCircularDependencyDomainError';
  }
}

export class InvalidMoStatusTransitionDomainError extends ManufacturingDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid Manufacturing Order transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidMoStatusTransitionDomainError';
  }
}

export class InsufficientComponentQuantityDomainError extends ManufacturingDomainError {
  constructor(componentVariantId: string, required: number, available: number) {
    super(
      `Insufficient component stock for variant '${componentVariantId}': Required ${required}, Available ${available}.`,
    );
    this.name = 'InsufficientComponentQuantityDomainError';
  }
}

// ==========================================
// 5A: BOM Scrap & Multi-Level Explosion
// ==========================================

export function assertNoBomCircularDependency(
  parentVariantId: string,
  componentVariantId: string,
  getSubComponentIds: (variantId: string) => string[],
): void {
  if (parentVariantId === componentVariantId) {
    throw new BomCircularDependencyDomainError(parentVariantId, componentVariantId);
  }

  const visited = new Set<string>();
  const queue: string[] = [componentVariantId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === parentVariantId) {
      throw new BomCircularDependencyDomainError(parentVariantId, componentVariantId);
    }

    if (!visited.has(current)) {
      visited.add(current);
      const subComponents = getSubComponentIds(current);
      for (const sub of subComponents) {
        queue.push(sub);
      }
    }
  }
}

export function calculateComponentGrossRequirement(
  netQuantity: number,
  scrapPercentageBasisPoints: number = 0,
  fixedScrapQuantity: number = 0,
): { netQuantity: number; scrapQuantity: number; grossQuantity: number } {
  if (netQuantity <= 0) {
    throw new ManufacturingDomainError(`Net component quantity must be positive. Received ${netQuantity}`);
  }
  if (scrapPercentageBasisPoints < 0 || scrapPercentageBasisPoints > 10000) {
    throw new ManufacturingDomainError(
      `Scrap percentage basis points must be between 0 and 10000 (0% to 100%). Received ${scrapPercentageBasisPoints}`,
    );
  }
  if (fixedScrapQuantity < 0) {
    throw new ManufacturingDomainError(`Fixed scrap quantity cannot be negative. Received ${fixedScrapQuantity}`);
  }

  // Exact ceiling calculation for proportional scrap pieces
  const proportionalScrap =
    scrapPercentageBasisPoints > 0
      ? Math.ceil((netQuantity * scrapPercentageBasisPoints) / 10000)
      : 0;

  const totalScrap = proportionalScrap + fixedScrapQuantity;
  const gross = netQuantity + totalScrap;

  return {
    netQuantity,
    scrapQuantity: totalScrap,
    grossQuantity: gross,
  };
}

export interface DomainBomLineInput {
  component_variant_id: string;
  quantity: number;
  scrap_percentage_basis_points?: number;
  fixed_scrap_quantity?: number;
}

export interface DomainBomResolverResult {
  output_quantity: number;
  lines: DomainBomLineInput[];
}

export interface DomainBomExplosionItem {
  variant_id: string;
  level: number;
  parent_variant_id: string | null;
  unit_quantity: number;
  total_quantity: number;
  scrap_quantity: number;
  gross_quantity: number;
  is_subassembly: boolean;
}

export function explodeBillOfMaterials(
  targetVariantId: string,
  targetQuantity: number,
  bomResolver: (variantId: string) => DomainBomResolverResult | null,
): DomainBomExplosionItem[] {
  if (targetQuantity <= 0) {
    throw new ManufacturingDomainError(`Target explosion quantity must be positive. Received ${targetQuantity}`);
  }

  const explosionItems: DomainBomExplosionItem[] = [];

  function recurse(
    currentVariantId: string,
    _parentVariantId: string | null,
    multiplierQty: number,
    currentLevel: number,
  ) {
    const bom = bomResolver(currentVariantId);
    if (!bom) {
      return;
    }

    const outputRatio = multiplierQty / (bom.output_quantity > 0 ? bom.output_quantity : 1);

    for (const line of bom.lines) {
      const netLineQty = line.quantity * outputRatio;
      const scrapResult = calculateComponentGrossRequirement(
        netLineQty,
        line.scrap_percentage_basis_points ?? 0,
        line.fixed_scrap_quantity ?? 0,
      );

      const subBom = bomResolver(line.component_variant_id);
      const isSub = subBom !== null;

      explosionItems.push({
        variant_id: line.component_variant_id,
        level: currentLevel,
        parent_variant_id: currentVariantId,
        unit_quantity: line.quantity,
        total_quantity: netLineQty,
        scrap_quantity: scrapResult.scrapQuantity,
        gross_quantity: scrapResult.grossQuantity,
        is_subassembly: isSub,
      });

      if (isSub) {
        recurse(line.component_variant_id, currentVariantId, scrapResult.grossQuantity, currentLevel + 1);
      }
    }
  }

  recurse(targetVariantId, null, targetQuantity, 1);
  return explosionItems;
}

// ==========================================
// 5B & 5C: Work Center Durations & Rate Costing
// ==========================================

export interface OperationCostCalculationInput {
  setupTimeMinutes: number;
  runTimeMinutesPerUnit: number;
  teardownTimeMinutes: number;
  unitsToProduce: number;
  efficiencyBasisPoints: number; // 10000 = 100%
  hourlyLaborRateMinor: bigint;
  hourlyMachineRateMinor: bigint;
  hourlyOverheadRateMinor?: bigint;
}

export interface OperationCostCalculationResult {
  standardDurationMinutes: number;
  actualDurationMinutes: number;
  laborCostMinor: bigint;
  machineCostMinor: bigint;
  overheadCostMinor: bigint;
  totalOperationCostMinor: bigint;
}

export function calculateOperationDurationAndCosts(
  input: OperationCostCalculationInput,
): OperationCostCalculationResult {
  if (input.unitsToProduce <= 0) {
    throw new ManufacturingDomainError(`Units to produce must be positive. Received ${input.unitsToProduce}`);
  }
  const efficiency = input.efficiencyBasisPoints > 0 ? input.efficiencyBasisPoints : 10000;

  const standardMinutes =
    input.setupTimeMinutes +
    input.runTimeMinutesPerUnit * input.unitsToProduce +
    input.teardownTimeMinutes;

  // Actual duration adjusted by efficiency: actual = standard * (10000 / efficiency)
  const actualMinutes = Math.ceil((standardMinutes * 10000) / efficiency);

  // Exact integer math: Cost = (durationMinutes * hourlyRate) / 60
  const durationBig = BigInt(actualMinutes);
  const laborCost = (durationBig * input.hourlyLaborRateMinor) / 60n;
  const machineCost = (durationBig * input.hourlyMachineRateMinor) / 60n;
  const overheadRate = input.hourlyOverheadRateMinor ?? 0n;
  const overheadCost = (durationBig * overheadRate) / 60n;

  return {
    standardDurationMinutes: standardMinutes,
    actualDurationMinutes: actualMinutes,
    laborCostMinor: laborCost,
    machineCostMinor: machineCost,
    overheadCostMinor: overheadCost,
    totalOperationCostMinor: laborCost + machineCost + overheadCost,
  };
}

// ==========================================
// 5D: Manufacturing Order (MO) Lifecycle Machine
// ==========================================

const ALLOWED_MO_TRANSITIONS: Record<ManufacturingOrderStatus, ManufacturingOrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PLANNED', 'IN_PROGRESS', 'CANCELLED'],
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['INSPECTION', 'COMPLETED', 'CANCELLED'],
  INSPECTION: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export function assertValidMoStatusTransition(
  current: ManufacturingOrderStatus,
  target: ManufacturingOrderStatus,
): void {
  const allowed = ALLOWED_MO_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidMoStatusTransitionDomainError(current, target);
  }
}

// ==========================================
// 5E: Finished Goods Cost Reconciliation
// ==========================================

export interface FinishedGoodsCostInput {
  materialCostMinor: bigint;
  laborCostMinor: bigint;
  machineCostMinor: bigint;
  overheadCostMinor: bigint;
  producedQuantity: number;
  byproductCreditMinor?: bigint;
}

export interface FinishedGoodsCostResult {
  totalMaterialCostMinor: bigint;
  totalConversionCostMinor: bigint;
  grossProductionCostMinor: bigint;
  netProductionCostMinor: bigint;
  unitProductionCostMinor: bigint;
}

export function calculateFinishedGoodsUnitCost(
  input: FinishedGoodsCostInput,
): FinishedGoodsCostResult {
  if (input.producedQuantity <= 0) {
    throw new ManufacturingDomainError(
      `Produced quantity must be positive to calculate unit cost. Received ${input.producedQuantity}`,
    );
  }

  const conversionCost = input.laborCostMinor + input.machineCostMinor + input.overheadCostMinor;
  const grossCost = input.materialCostMinor + conversionCost;
  const byproductCredit = input.byproductCreditMinor ?? 0n;

  const netCost = grossCost > byproductCredit ? grossCost - byproductCredit : 0n;
  const unitCost = netCost / BigInt(input.producedQuantity);

  return {
    totalMaterialCostMinor: input.materialCostMinor,
    totalConversionCostMinor: conversionCost,
    grossProductionCostMinor: grossCost,
    netProductionCostMinor: netCost,
    unitProductionCostMinor: unitCost,
  };
}

// ==========================================
// 5F: Output Classification & Quality Gate
// ==========================================

export interface OutputClassificationInput {
  inspectedQuantity: number;
  acceptedQuantity: number;
  quarantinedQuantity?: number;
  rejectedQuantity?: number;
}

export function assertValidOutputClassification(input: OutputClassificationInput): void {
  if (input.inspectedQuantity <= 0) {
    throw new ManufacturingDomainError(
      `Inspected quantity must be positive. Received ${input.inspectedQuantity}`,
    );
  }
  const accepted = input.acceptedQuantity || 0;
  const quarantined = input.quarantinedQuantity || 0;
  const rejected = input.rejectedQuantity || 0;

  if (accepted < 0 || quarantined < 0 || rejected < 0) {
    throw new ManufacturingDomainError(
      'Accepted, quarantined, and rejected quantities cannot be negative.',
    );
  }

  const totalClassified = accepted + quarantined + rejected;
  if (totalClassified !== input.inspectedQuantity) {
    throw new ManufacturingDomainError(
      `Total classified output (${totalClassified}) must exactly equal inspected quantity (${input.inspectedQuantity}). Invariant: accepted (${accepted}) + quarantined (${quarantined}) + rejected (${rejected}) = inspected (${input.inspectedQuantity}).`,
    );
  }
}

// ==========================================
// 5G: Material Shortage Analysis
// ==========================================

export interface ComponentStockCheckInput {
  variantId: string;
  requiredQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
}

export interface ComponentShortageAnalysisResult {
  variantId: string;
  requiredQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
  availableToPromise: number;
  shortageQuantity: number;
  isShortage: boolean;
}

export function evaluateComponentShortage(
  input: ComponentStockCheckInput,
): ComponentShortageAnalysisResult {
  if (input.requiredQuantity <= 0) {
    throw new ManufacturingDomainError(
      `Required component quantity must be positive. Received ${input.requiredQuantity}`,
    );
  }

  const atp = Math.max(0, input.onHandQuantity - input.reservedQuantity);
  const shortage = Math.max(0, input.requiredQuantity - atp);

  return {
    variantId: input.variantId,
    requiredQuantity: input.requiredQuantity,
    onHandQuantity: input.onHandQuantity,
    reservedQuantity: input.reservedQuantity,
    availableToPromise: atp,
    shortageQuantity: shortage,
    isShortage: shortage > 0,
  };
}

// ==========================================
// 5H: Partial Production Yield & Remaining Balance
// ==========================================

export interface PartialYieldCalculationInput {
  plannedQuantity: number;
  previouslyProducedQuantity: number;
  previouslyScrappedQuantity: number;
  runGoodQuantity: number;
  runScrappedQuantity?: number;
}

export interface PartialYieldCalculationResult {
  totalGoodQuantity: number;
  totalScrappedQuantity: number;
  remainingQuantity: number;
  isFullyProduced: boolean;
}

export function calculatePartialProductionYield(
  input: PartialYieldCalculationInput,
): PartialYieldCalculationResult {
  if (input.plannedQuantity <= 0) {
    throw new ManufacturingDomainError(
      `Planned quantity must be positive. Received ${input.plannedQuantity}`,
    );
  }
  if (input.runGoodQuantity < 0) {
    throw new ManufacturingDomainError('Run good quantity cannot be negative.');
  }

  const totalGood = input.previouslyProducedQuantity + input.runGoodQuantity;
  const totalScrap = input.previouslyScrappedQuantity + (input.runScrappedQuantity || 0);
  const remaining = Math.max(0, input.plannedQuantity - totalGood);

  return {
    totalGoodQuantity: totalGood,
    totalScrappedQuantity: totalScrap,
    remainingQuantity: remaining,
    isFullyProduced: totalGood >= input.plannedQuantity,
  };
}

// ==========================================
// 5I: Component Substitution Validation
// ==========================================

export function assertValidComponentSubstitution(
  originalVariantId: string,
  substitutedVariantId: string,
  quantity: number,
): void {
  if (originalVariantId === substitutedVariantId) {
    throw new ManufacturingDomainError(
      `Substituted component cannot be identical to original component '${originalVariantId}'.`,
    );
  }
  if (quantity <= 0) {
    throw new ManufacturingDomainError(
      `Substitution quantity must be positive. Received ${quantity}`,
    );
  }
}

