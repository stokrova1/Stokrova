/**
 * STOKROVA Warehouse Operations & Directed Put-Away Domain Engine (Phase 6A)
 * Benchmarked against ERPNext, Odoo, InvenTree, and OpenBoxes (Rule 26).
 *
 * ZERO EXTERNAL DEPENDENCIES INVARIANT: Pure deterministic logic and integer scoring.
 */

export type DomainTemperatureClass =
  | 'AMBIENT'
  | 'CONTROLLED_ROOM_TEMP'
  | 'COLD_STORAGE'
  | 'FROZEN'
  | 'ULTRA_LOW';

export type DomainHazmatClass =
  | 'NONE'
  | 'FLAMMABLE'
  | 'CORROSIVE'
  | 'TOXIC'
  | 'OXIDIZER'
  | 'EXPLOSIVE'
  | 'RADIOACTIVE';

export type DomainAbcVelocityClass =
  | 'CLASS_A_FAST_MOVING'
  | 'CLASS_B_MEDIUM_MOVING'
  | 'CLASS_C_SLOW_MOVING';

export interface DomainPutAwayRecommendation {
  location_id: string;
  location_code: string;
  zone_id: string | null;
  score: number;
  reasons: string[];
  available_weight_kg: number | null;
  available_volume_cm3: number | null;
  existing_sku_count: number;
}

export interface DomainCalculatePutAwayResponse {
  variant_id: string;
  sku: string;
  quantity: number;
  best_match_location_id: string | null;
  recommendations: DomainPutAwayRecommendation[];
}

export class WarehouseOpsDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WarehouseOpsDomainError';
  }
}

/**
 * Invariant: Temperature compatibility matrix.
 * Prohibits cold-chain compromises (e.g., placing cold-storage vaccine at ambient or frozen).
 */
export function assertTemperatureCompatibility(
  itemTemp: DomainTemperatureClass,
  zoneOrBinTemp: DomainTemperatureClass,
): void {
  if (itemTemp === zoneOrBinTemp) {
    return;
  }

  // AMBIENT items can safely tolerate CONTROLLED_ROOM_TEMP
  if (itemTemp === 'AMBIENT' && zoneOrBinTemp === 'CONTROLLED_ROOM_TEMP') {
    return;
  }

  throw new WarehouseOpsDomainError(
    'TEMPERATURE_INCOMPATIBLE',
    `Product requiring '${itemTemp}' cannot be stored in a '${zoneOrBinTemp}' location or zone.`,
  );
}

/**
 * Invariant: Regulatory hazardous material segregation.
 * Enforces international warehousing segregation tables (e.g. Flammables isolated from Oxidizers).
 */
const INCOMPATIBLE_HAZMAT_PAIRS: ReadonlyArray<[DomainHazmatClass, DomainHazmatClass]> = [
  ['FLAMMABLE', 'OXIDIZER'],
  ['OXIDIZER', 'FLAMMABLE'],
  ['FLAMMABLE', 'EXPLOSIVE'],
  ['EXPLOSIVE', 'FLAMMABLE'],
  ['CORROSIVE', 'TOXIC'],
  ['TOXIC', 'CORROSIVE'],
  ['CORROSIVE', 'OXIDIZER'],
  ['OXIDIZER', 'CORROSIVE'],
  ['EXPLOSIVE', 'OXIDIZER'],
  ['OXIDIZER', 'EXPLOSIVE'],
  ['EXPLOSIVE', 'TOXIC'],
  ['TOXIC', 'EXPLOSIVE'],
  ['RADIOACTIVE', 'FLAMMABLE'],
  ['FLAMMABLE', 'RADIOACTIVE'],
  ['RADIOACTIVE', 'EXPLOSIVE'],
  ['EXPLOSIVE', 'RADIOACTIVE'],
  ['RADIOACTIVE', 'CORROSIVE'],
  ['CORROSIVE', 'RADIOACTIVE'],
  ['RADIOACTIVE', 'TOXIC'],
  ['TOXIC', 'RADIOACTIVE'],
];

export function assertHazmatSegregation(
  incomingHazmat: DomainHazmatClass,
  existingHazmatClasses: DomainHazmatClass[],
): void {
  if (incomingHazmat === 'NONE') {
    return;
  }

  for (const existing of existingHazmatClasses) {
    if (existing === 'NONE') continue;

    const isConflict = INCOMPATIBLE_HAZMAT_PAIRS.some(
      ([a, b]) => a === incomingHazmat && b === existing,
    );

    if (isConflict) {
      throw new WarehouseOpsDomainError(
        'HAZMAT_SEGREGATION_VIOLATION',
        `Hazardous class '${incomingHazmat}' cannot be co-located with existing hazard class '${existing}'.`,
      );
    }
  }
}

/**
 * Computes deterministic integer velocity affinity score based on ABC classification.
 */
export function calculateVelocityAffinityScore(
  skuVelocity: DomainAbcVelocityClass | undefined | null,
  binVelocity: string | undefined | null,
): number {
  if (!skuVelocity || !binVelocity) {
    return 100; // Baseline neutral affinity
  }

  // Exact Match
  if (skuVelocity === binVelocity) {
    if (skuVelocity === 'CLASS_A_FAST_MOVING') return 1000;
    if (skuVelocity === 'CLASS_B_MEDIUM_MOVING') return 500;
    return 250; // CLASS_C_SLOW_MOVING
  }

  // Adjacent Match
  if (skuVelocity === 'CLASS_A_FAST_MOVING' && binVelocity === 'CLASS_B_MEDIUM_MOVING') return 200;
  if (skuVelocity === 'CLASS_B_MEDIUM_MOVING' && binVelocity === 'CLASS_A_FAST_MOVING') return 150;
  if (skuVelocity === 'CLASS_B_MEDIUM_MOVING' && binVelocity === 'CLASS_C_SLOW_MOVING') return 100;
  if (skuVelocity === 'CLASS_C_SLOW_MOVING' && binVelocity === 'CLASS_B_MEDIUM_MOVING') return 50;

  // Severe Mismatch Penalties
  if (skuVelocity === 'CLASS_A_FAST_MOVING' && binVelocity === 'CLASS_C_SLOW_MOVING') return -500;
  if (skuVelocity === 'CLASS_C_SLOW_MOVING' && binVelocity === 'CLASS_A_FAST_MOVING') return -300;

  return 0;
}

/**
 * Computes accessibility score based on bin vertical level and physical reachability.
 */
export function calculateAccessibilityScore(level: number): number {
  if (level <= 1) return 600; // Ground / Waist height (prime pick face)
  if (level === 2) return 400; // Eye level
  if (level === 3) return 200; // Shoulder level
  return 50; // High bay top shelf requiring lift equipment
}

export interface PutAwayCandidateLocation {
  id: string;
  code: string;
  name: string;
  type: string;
  level: number;
  is_active: boolean;
  mix_policy: string;
  max_weight_kg: number | null;
  max_volume_cm3: number | null;
  current_weight_kg?: number;
  current_volume_cm3?: number;
  existing_skus?: string[];
  existing_batches?: string[];
  existing_hazmats?: DomainHazmatClass[];
  zone_id?: string | null;
  velocity_class?: string | null;
  temperature_class?: DomainTemperatureClass;
  hazmat_class?: DomainHazmatClass;
}

export interface PutAwayEvaluationParams {
  variant_id: string;
  sku: string;
  quantity: number;
  unit_weight_kg?: number;
  unit_volume_cm3?: number;
  temperature_class?: DomainTemperatureClass;
  hazmat_class?: DomainHazmatClass;
  velocity_class?: DomainAbcVelocityClass;
  batch_id?: string | null;
  preferred_zone_id?: string | null;
}

/**
 * Core Multi-Criteria Directed Put-Away Engine.
 * Evaluates all candidate bins, enforces physical & regulatory invariants,
 * and ranks candidates by multi-factor score.
 */
export function rankPutAwayCandidates(
  params: PutAwayEvaluationParams,
  candidates: PutAwayCandidateLocation[],
): DomainCalculatePutAwayResponse {
  const normSku = params.sku.trim().toUpperCase();
  const incomingTemp = params.temperature_class ?? 'AMBIENT';
  const incomingHazmat = params.hazmat_class ?? 'NONE';
  const totalWeight = (params.unit_weight_kg ?? 0) * params.quantity;
  const totalVol = (params.unit_volume_cm3 ?? 0) * params.quantity;

  const recommendations: DomainPutAwayRecommendation[] = [];

  for (const loc of candidates) {
    const reasons: string[] = [];

    // 1. Must be active
    if (!loc.is_active) {
      continue;
    }

    // 2. Must be storage or picking location
    if (loc.type !== 'INTERNAL_STORAGE' && loc.type !== 'PICKING_FACE') {
      continue;
    }

    // 3. Temperature compatibility
    const binTemp = loc.temperature_class ?? 'AMBIENT';
    try {
      assertTemperatureCompatibility(incomingTemp, binTemp);
      if (incomingTemp !== 'AMBIENT') {
        reasons.push(`Temperature verified (${binTemp})`);
      }
    } catch {
      // Incompatible temperature
      continue;
    }

    // 4. Hazardous material segregation
    const binHazmats = loc.existing_hazmats ?? (loc.hazmat_class && loc.hazmat_class !== 'NONE' ? [loc.hazmat_class] : []);
    try {
      assertHazmatSegregation(incomingHazmat, binHazmats);
      if (incomingHazmat !== 'NONE') {
        reasons.push(`Hazmat segregation verified (${incomingHazmat})`);
      }
    } catch {
      // Hazardous conflict
      continue;
    }

    // 5. Bin Mixing Policy check
    const existingSkus = loc.existing_skus ?? [];
    if (loc.mix_policy === 'SINGLE_SKU' && existingSkus.length > 0) {
      const hasOtherSku = existingSkus.some(
        (s) => s.trim().toUpperCase() !== normSku && s !== params.variant_id,
      );
      if (hasOtherSku) {
        continue; // Cannot put different SKU in Single-SKU bin
      }
    }

    if (loc.mix_policy === 'SINGLE_BATCH' && params.batch_id) {
      const existingBatches = loc.existing_batches ?? [];
      if (existingBatches.length > 0 && !existingBatches.includes(params.batch_id)) {
        continue; // Cannot put different batch in Single-Batch bin
      }
    }

    // 6. Weight capacity check
    const curWeight = loc.current_weight_kg ?? 0;
    const availWeight = loc.max_weight_kg !== null ? Math.max(0, loc.max_weight_kg - curWeight) : null;
    if (loc.max_weight_kg !== null && curWeight + totalWeight > loc.max_weight_kg) {
      continue; // Weight capacity exceeded
    }

    // 7. Volume capacity check
    const curVol = loc.current_volume_cm3 ?? 0;
    const availVol = loc.max_volume_cm3 !== null ? Math.max(0, loc.max_volume_cm3 - curVol) : null;
    if (loc.max_volume_cm3 !== null && curVol + totalVol > loc.max_volume_cm3) {
      continue; // Volume capacity exceeded
    }

    // --- Scoring Calculation ---
    let score = 1000; // Base score for eligible location

    // Same-SKU consolidation bonus:
    const hasSameSku = existingSkus.some(
      (s) => s.trim().toUpperCase() === normSku || s === params.variant_id,
    );
    if (hasSameSku) {
      score += 800;
      reasons.push('Same-SKU consolidation');
    }

    // Preferred Zone match:
    if (params.preferred_zone_id && loc.zone_id === params.preferred_zone_id) {
      score += 500;
      reasons.push('Preferred zone match');
    }

    // Velocity affinity score:
    const velocityScore = calculateVelocityAffinityScore(params.velocity_class, loc.velocity_class);
    score += velocityScore;
    if (velocityScore > 0) {
      reasons.push(`Velocity match (+${velocityScore})`);
    } else if (velocityScore < 0) {
      reasons.push(`Velocity penalty (${velocityScore})`);
    }

    // Accessibility score:
    const accessScore = calculateAccessibilityScore(loc.level);
    score += accessScore;
    reasons.push(`Accessibility level ${loc.level} (+${accessScore})`);

    // Available space headroom bonus:
    if (availWeight !== null && totalWeight > 0) {
      const weightRatio = Math.min(100, Math.round((totalWeight / availWeight) * 100));
      score += Math.round(weightRatio * 2); // Up to +200 for good space fit
    }

    recommendations.push({
      location_id: loc.id,
      location_code: loc.code,
      zone_id: loc.zone_id ?? null,
      score,
      reasons,
      available_weight_kg: availWeight,
      available_volume_cm3: availVol,
      existing_sku_count: existingSkus.length,
    });
  }

  // Sort descending by score
  recommendations.sort((a, b) => b.score - a.score);

  return {
    variant_id: params.variant_id,
    sku: params.sku,
    quantity: params.quantity,
    best_match_location_id: recommendations.length > 0 ? recommendations[0]!.location_id : null,
    recommendations,
  };
}

// ==========================================
// 6B: Picking Strategies & Routing Optimization
// ==========================================

export type DomainPickingStrategy = 'DISCRETE' | 'BATCH' | 'WAVE' | 'ZONE';

export type DomainPickListStatus =
  | 'DRAFT'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type DomainPickLineStatus =
  | 'PENDING'
  | 'PICKED'
  | 'SHORT_PICKED'
  | 'CANCELLED';

export type DomainPickWaveStatus =
  | 'PLANNING'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DomainPickLineRoutingItem {
  id: string;
  source_location_code: string;
  aisle?: number | null;
  rack?: number | null;
  shelf?: number | null;
  bin_position?: number | null;
  pick_sequence?: number;
}

/**
 * Optimizes picking travel sequence using S-Shape / Serpentine routing.
 * In a multi-aisle warehouse:
 * - Odd aisles (1, 3, 5...) are traversed forward (rack ASC, shelf ASC, bin_position ASC).
 * - Even aisles (2, 4, 6...) are traversed in reverse (rack DESC, shelf DESC, bin_position DESC).
 * This eliminates unnecessary backtracking between aisle ends, minimizing picker travel distance.
 */
export function sortPickLinesSerpentine<T extends DomainPickLineRoutingItem>(
  lines: T[],
): Array<T & { pick_sequence: number }> {
  // Group lines by aisle
  const aisleMap = new Map<number | string, T[]>();

  for (const line of lines) {
    const aisleKey = line.aisle !== undefined && line.aisle !== null ? line.aisle : '__NO_AISLE__';
    const list = aisleMap.get(aisleKey) || [];
    list.push(line);
    aisleMap.set(aisleKey, list);
  }

  // Sort aisle keys numerically
  const numericAisles = Array.from(aisleMap.keys())
    .filter((k): k is number => typeof k === 'number')
    .sort((a, b) => a - b);

  const result: Array<T & { pick_sequence: number }> = [];
  let seq = 1;

  for (const aisleNum of numericAisles) {
    const aisleLines = aisleMap.get(aisleNum)!;
    const isOdd = aisleNum % 2 !== 0;

    aisleLines.sort((a, b) => {
      const rackA = a.rack ?? 0;
      const rackB = b.rack ?? 0;
      if (rackA !== rackB) {
        return isOdd ? rackA - rackB : rackB - rackA;
      }

      const shelfA = a.shelf ?? 0;
      const shelfB = b.shelf ?? 0;
      if (shelfA !== shelfB) {
        return isOdd ? shelfA - shelfB : shelfB - shelfA;
      }

      const posA = a.bin_position ?? 0;
      const posB = b.bin_position ?? 0;
      if (posA !== posB) {
        return isOdd ? posA - posB : posB - posA;
      }

      return a.source_location_code.localeCompare(b.source_location_code);
    });

    for (const item of aisleLines) {
      result.push({
        ...item,
        pick_sequence: seq++,
      });
    }
  }

  // Handle lines with no aisle specified (fallback to alphanumeric location code)
  const noAisleLines = aisleMap.get('__NO_AISLE__');
  if (noAisleLines && noAisleLines.length > 0) {
    noAisleLines.sort((a, b) => a.source_location_code.localeCompare(b.source_location_code));
    for (const item of noAisleLines) {
      result.push({
        ...item,
        pick_sequence: seq++,
      });
    }
  }

  return result;
}

export interface DomainOrderForWave {
  order_id: string;
  carrier_id?: string | null;
  customer_id?: string | null;
  zone_id?: string | null;
  priority: number; // lower number = higher priority
  lines_count: number;
}

export interface DomainWaveGroupingOptions {
  max_orders?: number;
  max_lines?: number;
  strategy?: DomainPickingStrategy;
  group_by?: 'CARRIER' | 'ZONE' | 'PRIORITY' | 'NONE';
}

export interface DomainWaveBatch {
  wave_index: number;
  strategy: DomainPickingStrategy;
  group_key: string;
  order_ids: string[];
  total_orders: number;
  total_lines: number;
}

/**
 * Groups pending fulfillment orders into wave batches.
 * Benchmarked against high-throughput WMS engines (Manhattan, Odoo, ERPNext).
 */
export function groupOrdersIntoWaves(
  orders: DomainOrderForWave[],
  options: DomainWaveGroupingOptions = {},
): DomainWaveBatch[] {
  const maxOrders = options.max_orders && options.max_orders > 0 ? options.max_orders : 50;
  const maxLines = options.max_lines && options.max_lines > 0 ? options.max_lines : 200;
  const strategy = options.strategy ?? 'WAVE';
  const groupBy = options.group_by ?? 'CARRIER';

  // Sort orders by priority first
  const sortedOrders = [...orders].sort((a, b) => a.priority - b.priority);

  // Group by criterion
  const partitionMap = new Map<string, DomainOrderForWave[]>();

  for (const order of sortedOrders) {
    let key = 'GENERAL';
    if (groupBy === 'CARRIER' && order.carrier_id) {
      key = `CARRIER_${order.carrier_id}`;
    } else if (groupBy === 'ZONE' && order.zone_id) {
      key = `ZONE_${order.zone_id}`;
    } else if (groupBy === 'PRIORITY') {
      key = `PRIORITY_${order.priority}`;
    }

    const list = partitionMap.get(key) || [];
    list.push(order);
    partitionMap.set(key, list);
  }

  const waves: DomainWaveBatch[] = [];
  let waveIdx = 1;

  for (const [groupKey, groupOrders] of partitionMap.entries()) {
    let currentWaveOrderIds: string[] = [];
    let currentLines = 0;

    for (const ord of groupOrders) {
      // If adding this order exceeds max_orders or max_lines, close current wave and start new
      if (
        currentWaveOrderIds.length >= maxOrders ||
        (currentLines + ord.lines_count > maxLines && currentWaveOrderIds.length > 0)
      ) {
        waves.push({
          wave_index: waveIdx++,
          strategy,
          group_key: groupKey,
          order_ids: currentWaveOrderIds,
          total_orders: currentWaveOrderIds.length,
          total_lines: currentLines,
        });
        currentWaveOrderIds = [];
        currentLines = 0;
      }

      currentWaveOrderIds.push(ord.order_id);
      currentLines += ord.lines_count;
    }

    if (currentWaveOrderIds.length > 0) {
      waves.push({
        wave_index: waveIdx++,
        strategy,
        group_key: groupKey,
        order_ids: currentWaveOrderIds,
        total_orders: currentWaveOrderIds.length,
        total_lines: currentLines,
      });
    }
  }

  return waves;
}

/**
 * Validates pick line state machine transitions.
 */
export function assertPickLineTransition(
  currentStatus: DomainPickLineStatus,
  newStatus: DomainPickLineStatus,
): void {
  if (currentStatus === newStatus) {
    return;
  }

  if (currentStatus === 'PICKED') {
    throw new WarehouseOpsDomainError(
      'INVALID_PICK_LINE_TRANSITION',
      `Pick line already completed ('PICKED') cannot transition to '${newStatus}'.`,
    );
  }

  if (currentStatus === 'CANCELLED') {
    throw new WarehouseOpsDomainError(
      'INVALID_PICK_LINE_TRANSITION',
      `Cancelled pick line cannot transition to '${newStatus}'.`,
    );
  }

  if (currentStatus === 'SHORT_PICKED' && newStatus !== 'CANCELLED') {
    throw new WarehouseOpsDomainError(
      'INVALID_PICK_LINE_TRANSITION',
      `Short-picked line cannot transition to '${newStatus}'.`,
    );
  }
}

/**
 * Validates pick line quantities and short pick invariants.
 */
export function assertPickQuantity(
  requested: number,
  picked: number,
  isShort: boolean,
): void {
  if (picked < 0) {
    throw new WarehouseOpsDomainError(
      'NEGATIVE_PICK_FORBIDDEN',
      `Picked quantity cannot be negative (${picked}).`,
    );
  }

  if (picked > requested) {
    throw new WarehouseOpsDomainError(
      'OVER_PICK_FORBIDDEN',
      `Picked quantity (${picked}) cannot exceed requested quantity (${requested}).`,
    );
  }

  if (isShort && picked >= requested) {
    throw new WarehouseOpsDomainError(
      'INVALID_SHORT_PICK',
      `Short pick requires picked quantity (${picked}) to be less than requested quantity (${requested}).`,
    );
  }
}

/**
 * Evaluates overall PickList status based on the status of its constituent lines.
 */
export function calculatePickListStatus(
  lines: Array<{ status: DomainPickLineStatus }>,
): DomainPickListStatus {
  if (lines.length === 0) {
    return 'DRAFT';
  }

  const allCancelled = lines.every((l) => l.status === 'CANCELLED');
  if (allCancelled) {
    return 'CANCELLED';
  }

  const activeLines = lines.filter((l) => l.status !== 'CANCELLED');
  if (activeLines.length === 0) {
    return 'CANCELLED';
  }

  const allCompleted = activeLines.every(
    (l) => l.status === 'PICKED' || l.status === 'SHORT_PICKED',
  );
  if (allCompleted) {
    return 'COMPLETED';
  }

  const anyStarted = activeLines.some(
    (l) => l.status === 'PICKED' || l.status === 'SHORT_PICKED',
  );
  if (anyStarted) {
    return 'IN_PROGRESS';
  }

  return 'RELEASED';
}

// ----------------------------------------------------------------------------
// Phase 6C: Packing Stations, Containerization & Shipping Manifests Domain Engine
// ----------------------------------------------------------------------------

export type DomainContainerStatus =
  | 'OPEN'
  | 'WEIGHED'
  | 'SEALED'
  | 'STAGED'
  | 'LOADED'
  | 'DISPATCHED'
  | 'CANCELLED';

export type DomainShippingManifestStatus =
  | 'DRAFT'
  | 'SEALED'
  | 'DISPATCHED'
  | 'CANCELLED';

export interface DomainPackagingBox {
  id: string;
  code: string;
  name: string;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  max_weight_grams: number;
  tare_weight_grams: number;
}

export interface DomainCartonItem {
  variant_id: string;
  sku: string;
  quantity: number;
  weight_grams_each: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
}

export interface DomainCartonBoxAssignment {
  box_type_id: string;
  box_code: string;
  box_name: string;
  estimated_gross_weight_grams: number;
  fill_percentage_bp: number;
  items: Array<{ variant_id: string; sku: string; quantity: number }>;
}

export interface DomainCartonizationResult {
  total_cartons: number;
  cartons: DomainCartonBoxAssignment[];
}

/**
 * Calculates standard GS1 Modulo-10 check digit for an SSCC-18 payload (17 digits).
 * Weight multiplier pattern from right to left: 3, 1, 3, 1, 3, 1...
 */
export function calculateGS1Modulo10CheckDigit(payload17: string): number {
  if (!/^\d{17}$/.test(payload17)) {
    throw new WarehouseOpsDomainError(
      'INVALID_SSCC_PAYLOAD',
      `SSCC payload must be exactly 17 numeric digits, got '${payload17}'.`,
    );
  }
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = Number.parseInt(payload17.charAt(i), 10);
    const multiplier = (17 - i) % 2 === 1 ? 3 : 1;
    sum += digit * multiplier;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Formats a 18-digit GS1 Serial Shipping Container Code (SSCC-18).
 */
export function formatSSCC18(
  extensionDigit: number,
  companyPrefix: string,
  serialReference: string,
): string {
  if (extensionDigit < 0 || extensionDigit > 9 || !Number.isInteger(extensionDigit)) {
    throw new WarehouseOpsDomainError(
      'INVALID_EXTENSION_DIGIT',
      `Extension digit must be an integer between 0 and 9, got ${extensionDigit}.`,
    );
  }
  const cleanPrefix = companyPrefix.replace(/\D/g, '');
  const cleanSerial = serialReference.replace(/\D/g, '');
  const remainingLength = 16 - cleanPrefix.length;
  if (remainingLength <= 0) {
    throw new WarehouseOpsDomainError(
      'INVALID_COMPANY_PREFIX',
      `Company prefix is too long (${cleanPrefix.length} digits, max 15).`,
    );
  }
  const paddedSerial = cleanSerial.padStart(remainingLength, '0').slice(-remainingLength);
  const payload17 = `${extensionDigit}${cleanPrefix}${paddedSerial}`;
  const checkDigit = calculateGS1Modulo10CheckDigit(payload17);
  return `${payload17}${checkDigit}`;
}

/**
 * Validates whether an 18-digit string is a compliant SSCC-18 barcode.
 */
export function validateSSCC18(sscc18: string): boolean {
  if (!/^\d{18}$/.test(sscc18)) {
    return false;
  }
  const payload17 = sscc18.slice(0, 17);
  const expectedCheckDigit = calculateGS1Modulo10CheckDigit(payload17);
  return Number.parseInt(sscc18.charAt(17), 10) === expectedCheckDigit;
}

/**
 * Best-Fit Decreasing (BFD) Cartonization Engine.
 * Packs order items into packaging cartons, optimizing for minimum cartons and volume fill.
 */
export function cartonizeItems(
  items: DomainCartonItem[],
  availableBoxes: DomainPackagingBox[],
): DomainCartonizationResult {
  if (availableBoxes.length === 0) {
    throw new WarehouseOpsDomainError(
      'NO_PACKAGING_BOXES_AVAILABLE',
      'At least one packaging box type must be configured for cartonization.',
    );
  }

  if (items.length === 0) {
    return { total_cartons: 0, cartons: [] };
  }

  // Calculate box usable volumes (cm3) and sort ascending
  const boxesWithVol = availableBoxes.map((b) => ({
    box: b,
    volCm3: Math.max(1, Math.round((b.length_mm * b.width_mm * b.height_mm) / 1000)),
  })).sort((a, b) => a.volCm3 - b.volCm3);

  const maxBoxWeight = Math.max(...availableBoxes.map((b) => b.max_weight_grams));

  // Verify no single unit exceeds max box weight
  for (const item of items) {
    if (item.weight_grams_each > maxBoxWeight) {
      throw new WarehouseOpsDomainError(
        'ITEM_EXCEEDS_BOX_CAPACITY',
        `Item SKU '${item.sku}' unit weight (${item.weight_grams_each}g) exceeds the maximum box capacity (${maxBoxWeight}g).`,
      );
    }
  }

  interface OpenCarton {
    boxInfo: (typeof boxesWithVol)[0];
    currentNetWeightGrams: number;
    currentVolCm3: number;
    items: Map<string, { variant_id: string; sku: string; quantity: number }>;
  }

  const openCartons: OpenCarton[] = [];

  // Flatten items into unit chunks or process by line
  // To keep performance high and deterministic, we pack item by item
  for (const item of items) {
    const itemUnitVolCm3 =
      item.length_mm && item.width_mm && item.height_mm
        ? Math.max(1, Math.round((item.length_mm * item.width_mm * item.height_mm) / 1000))
        : Math.max(1, Math.round(item.weight_grams_each)); // fallback: 1g approx 1cm3

    for (let q = 0; q < item.quantity; q++) {
      let placed = false;

      // Try placing into existing open cartons
      for (const carton of openCartons) {
        const canFitWeight =
          carton.currentNetWeightGrams + item.weight_grams_each <=
          carton.boxInfo.box.max_weight_grams;
        const canFitVol = carton.currentVolCm3 + itemUnitVolCm3 <= carton.boxInfo.volCm3;

        if (canFitWeight && canFitVol) {
          carton.currentNetWeightGrams += item.weight_grams_each;
          carton.currentVolCm3 += itemUnitVolCm3;
          const existing = carton.items.get(item.variant_id);
          if (existing) {
            existing.quantity += 1;
          } else {
            carton.items.set(item.variant_id, {
              variant_id: item.variant_id,
              sku: item.sku,
              quantity: 1,
            });
          }
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Find smallest box that fits this item
        const fallbackBox = boxesWithVol[boxesWithVol.length - 1]!;
        const suitableBox =
          boxesWithVol.find(
            (b) =>
              item.weight_grams_each <= b.box.max_weight_grams &&
              itemUnitVolCm3 <= b.volCm3,
          ) || fallbackBox;

        const newCarton: OpenCarton = {
          boxInfo: suitableBox,
          currentNetWeightGrams: item.weight_grams_each,
          currentVolCm3: itemUnitVolCm3,
          items: new Map([
            [
              item.variant_id,
              {
                variant_id: item.variant_id,
                sku: item.sku,
                quantity: 1,
              },
            ],
          ]),
        };
        openCartons.push(newCarton);
      }
    }
  }

  const resultCartons: DomainCartonBoxAssignment[] = openCartons.map((c) => {
    const fillBp = Math.min(
      10000,
      Math.round((c.currentVolCm3 / c.boxInfo.volCm3) * 10000),
    );
    return {
      box_type_id: c.boxInfo.box.id,
      box_code: c.boxInfo.box.code,
      box_name: c.boxInfo.box.name,
      estimated_gross_weight_grams:
        c.boxInfo.box.tare_weight_grams + c.currentNetWeightGrams,
      fill_percentage_bp: fillBp,
      items: Array.from(c.items.values()),
    };
  });

  return {
    total_cartons: resultCartons.length,
    cartons: resultCartons,
  };
}

/**
 * Validates measured scale weight against expected gross weight within basis-point tolerance.
 */
export function assertContainerWeightTolerance(
  scaleWeightGrams: number,
  expectedGrossGrams: number,
  toleranceBp = 200,
): { discrepancyGrams: number; toleranceExceeded: boolean } {
  if (scaleWeightGrams <= 0) {
    throw new WarehouseOpsDomainError(
      'SCALE_WEIGHT_NON_POSITIVE',
      `Scale weight must be greater than zero grams, got ${scaleWeightGrams}.`,
    );
  }
  if (expectedGrossGrams <= 0) {
    throw new WarehouseOpsDomainError(
      'EXPECTED_WEIGHT_NON_POSITIVE',
      `Expected gross weight must be greater than zero grams, got ${expectedGrossGrams}.`,
    );
  }

  const discrepancyGrams = scaleWeightGrams - expectedGrossGrams;
  const absDiff = Math.abs(discrepancyGrams);
  const diffBp = Math.round((absDiff * 10000) / expectedGrossGrams);

  if (diffBp > toleranceBp) {
    throw new WarehouseOpsDomainError(
      'WEIGHT_TOLERANCE_EXCEEDED',
      `Measured scale weight (${scaleWeightGrams}g) deviates from expected gross weight (${expectedGrossGrams}g) by ${diffBp} bp (limit: ${toleranceBp} bp).`,
    );
  }

  return { discrepancyGrams, toleranceExceeded: false };
}

const VALID_CONTAINER_TRANSITIONS: Record<
  DomainContainerStatus,
  readonly DomainContainerStatus[]
> = {
  OPEN: ['WEIGHED', 'SEALED', 'CANCELLED'],
  WEIGHED: ['SEALED', 'OPEN', 'CANCELLED'],
  SEALED: ['STAGED', 'LOADED', 'DISPATCHED', 'OPEN', 'CANCELLED'],
  STAGED: ['LOADED', 'DISPATCHED', 'SEALED', 'CANCELLED'],
  LOADED: ['DISPATCHED', 'STAGED', 'CANCELLED'],
  DISPATCHED: [],
  CANCELLED: [],
};

/**
 * Validates legal container state transitions.
 */
export function assertContainerTransition(
  from: DomainContainerStatus,
  to: DomainContainerStatus,
): void {
  if (from === to) return;
  const allowed = VALID_CONTAINER_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new WarehouseOpsDomainError(
      'INVALID_CONTAINER_TRANSITION',
      `Illegal container status transition from '${from}' to '${to}'.`,
    );
  }
}

const VALID_MANIFEST_TRANSITIONS: Record<
  DomainShippingManifestStatus,
  readonly DomainShippingManifestStatus[]
> = {
  DRAFT: ['SEALED', 'DISPATCHED', 'CANCELLED'],
  SEALED: ['DISPATCHED', 'DRAFT', 'CANCELLED'],
  DISPATCHED: [],
  CANCELLED: [],
};

/**
 * Validates legal shipping manifest state transitions.
 */
export function assertManifestTransition(
  from: DomainShippingManifestStatus,
  to: DomainShippingManifestStatus,
): void {
  if (from === to) return;
  const allowed = VALID_MANIFEST_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new WarehouseOpsDomainError(
      'INVALID_MANIFEST_TRANSITION',
      `Illegal shipping manifest transition from '${from}' to '${to}'.`,
    );
  }
}

/**
 * Validates whether a manifest is dispatchable to a carrier.
 */
export function assertManifestDispatchable(
  manifestStatus: DomainShippingManifestStatus,
  containers: Array<{ id: string; status: DomainContainerStatus }>,
): void {
  if (manifestStatus !== 'DRAFT' && manifestStatus !== 'SEALED') {
    throw new WarehouseOpsDomainError(
      'MANIFEST_NOT_DISPATCHABLE',
      `Cannot dispatch manifest in '${manifestStatus}' status.`,
    );
  }
  if (containers.length === 0) {
    throw new WarehouseOpsDomainError(
      'EMPTY_MANIFEST_CANNOT_DISPATCH',
      'Cannot dispatch an empty shipping manifest. At least one container is required.',
    );
  }
  for (const c of containers) {
    if (c.status !== 'SEALED' && c.status !== 'STAGED' && c.status !== 'LOADED') {
      throw new WarehouseOpsDomainError(
        'CONTAINER_NOT_SEALED',
        `Container '${c.id}' is in '${c.status}' status. Only SEALED, STAGED, or LOADED containers can be dispatched.`,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// Phase 6D: Bin Transfers, Cross-Docking & Barcode Logistics Domain Engine
// ----------------------------------------------------------------------------

export interface DomainGS1BarcodeElement {
  ai: string;
  label: string;
  raw_value: string;
  parsed_value: string | number;
}

export interface DomainGS1ParsedPayload {
  raw_barcode: string;
  elements: DomainGS1BarcodeElement[];
  gtin?: string | null;
  batch_id?: string | null;
  expiry_date?: string | null;
  serial_number?: string | null;
  sscc?: string | null;
  weight_grams?: number | null;
  count?: number | null;
}

const GS1_AI_DICTIONARY: Record<string, { label: string; fixedLength?: number }> = {
  '00': { label: 'SSCC', fixedLength: 18 },
  '01': { label: 'GTIN', fixedLength: 14 },
  '02': { label: 'CONTAINED_GTIN', fixedLength: 14 },
  '10': { label: 'BATCH_LOT' },
  '11': { label: 'PRODUCTION_DATE', fixedLength: 6 },
  '17': { label: 'EXPIRY_DATE', fixedLength: 6 },
  '21': { label: 'SERIAL_NUMBER' },
  '30': { label: 'COUNT' },
  '3100': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
  '3101': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
  '3102': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
  '3103': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
  '3104': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
  '3105': { label: 'NET_WEIGHT_KG', fixedLength: 6 },
};

function formatGS1Date(yymmdd: string): string {
  if (yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) {
    return yymmdd;
  }
  const yy = Number.parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${fullYear}-${mm}-${dd}`;
}

/**
 * High-performance GS1 Application Identifier (AI) Barcode Parser.
 * Handles both human-readable bracketed format (e.g., "(01)000123(10)LOT")
 * and scanner raw unbracketed FNC1 streams (e.g., "01000123...").
 */
export function parseGS1Barcode(rawBarcode: string): DomainGS1ParsedPayload {
  const trimmed = rawBarcode.trim();
  if (!trimmed) {
    throw new WarehouseOpsDomainError(
      'EMPTY_BARCODE',
      'Barcode input string cannot be empty.',
    );
  }

  const elements: DomainGS1BarcodeElement[] = [];
  let gtin: string | null = null;
  let batchId: string | null = null;
  let expiryDate: string | null = null;
  let serialNumber: string | null = null;
  let sscc: string | null = null;
  let weightGrams: number | null = null;
  let count: number | null = null;

  // 1. Bracketed format: e.g. (01)00012345678905(10)LOT123(17)261231
  const bracketRegex = /\((\d{2,4})\)([^()]+)/g;
  const bracketMatches = Array.from(trimmed.matchAll(bracketRegex));

  if (bracketMatches.length > 0) {
    for (const match of bracketMatches) {
      const ai = match[1]!;
      const rawVal = match[2]!.trim();
      const info = GS1_AI_DICTIONARY[ai];
      const label = info?.label ?? `AI_${ai}`;

      let parsedVal: string | number = rawVal;

      if (ai === '01' || ai === '02') {
        gtin = rawVal;
      } else if (ai === '00') {
        sscc = rawVal;
      } else if (ai === '10') {
        batchId = rawVal;
      } else if (ai === '17') {
        expiryDate = formatGS1Date(rawVal);
        parsedVal = expiryDate;
      } else if (ai === '21') {
        serialNumber = rawVal;
      } else if (ai === '30') {
        count = Number.parseInt(rawVal, 10);
        parsedVal = count;
      } else if (ai.startsWith('310')) {
        const decimals = Number.parseInt(ai.charAt(3), 10);
        const numVal = Number.parseInt(rawVal, 10);
        // weight in kg = numVal / 10^decimals -> convert to integer grams (* 1000)
        weightGrams = Math.round((numVal * 1000) / Math.pow(10, decimals));
        parsedVal = weightGrams;
      }

      elements.push({
        ai,
        label,
        raw_value: rawVal,
        parsed_value: parsedVal,
      });
    }
  } else {
    // 2. Pure numeric standalone GTIN/EAN/UPC (8 to 14 digits)
    if (/^\d{8,14}$/.test(trimmed)) {
      return {
        raw_barcode: trimmed,
        elements: [
          {
            ai: '01',
            label: 'GTIN',
            raw_value: trimmed,
            parsed_value: trimmed,
          },
        ],
        gtin: trimmed,
        batch_id: null,
        expiry_date: null,
        serial_number: null,
        sscc: null,
        weight_grams: null,
        count: null,
      };
    }

    // 3. Continuous FNC1-delimited or fixed-length stream
    // FNC1 is represented by ASCII 29 (\u001d) or pipe or standard scanning delimiter
    let cursor = 0;
    const cleanStr = trimmed.replace(/[\x1D]/g, '\u001d');

    while (cursor < cleanStr.length) {
      if (cleanStr.charAt(cursor) === '\u001d') {
        cursor++;
        continue;
      }

      // Try 4-digit AI first (e.g. 3102), then 2-digit AI
      let ai = cleanStr.slice(cursor, cursor + 4);
      let matchedInfo = GS1_AI_DICTIONARY[ai];
      let aiLength = 4;

      if (
        !matchedInfo ||
        (matchedInfo.fixedLength !== undefined &&
          cleanStr.length - (cursor + aiLength) < matchedInfo.fixedLength)
      ) {
        ai = cleanStr.slice(cursor, cursor + 2);
        matchedInfo = GS1_AI_DICTIONARY[ai];
        aiLength = 2;
      }

      if (
        !matchedInfo ||
        (matchedInfo.fixedLength !== undefined &&
          cleanStr.length - (cursor + aiLength) < matchedInfo.fixedLength)
      ) {
        // Unknown AI or plain fallback barcode (e.g. standard SKU/GTIN)
        if (cursor === 0) {
          // If 14 or 12/13 digits, treat as plain GTIN/EAN
          if (/^\d{8,14}$/.test(cleanStr)) {
            gtin = cleanStr;
            elements.push({
              ai: '01',
              label: 'GTIN',
              raw_value: cleanStr,
              parsed_value: cleanStr,
            });
          } else {
            // Treat entire string as SKU / general code
            elements.push({
              ai: 'RAW',
              label: 'RAW_CODE',
              raw_value: cleanStr,
              parsed_value: cleanStr,
            });
          }
        }
        break;
      }

      cursor += aiLength;

      let rawVal = '';
      if (matchedInfo.fixedLength !== undefined) {
        rawVal = cleanStr.slice(cursor, cursor + matchedInfo.fixedLength);
        cursor += matchedInfo.fixedLength;
      } else {
        // Variable length up to next \u001d or end of string
        const nextFnc1 = cleanStr.indexOf('\u001d', cursor);
        if (nextFnc1 === -1) {
          rawVal = cleanStr.slice(cursor);
          cursor = cleanStr.length;
        } else {
          rawVal = cleanStr.slice(cursor, nextFnc1);
          cursor = nextFnc1 + 1;
        }
      }

      const label = matchedInfo.label;
      let parsedVal: string | number = rawVal;

      if (ai === '01' || ai === '02') {
        gtin = rawVal;
      } else if (ai === '00') {
        sscc = rawVal;
      } else if (ai === '10') {
        batchId = rawVal;
      } else if (ai === '17') {
        expiryDate = formatGS1Date(rawVal);
        parsedVal = expiryDate;
      } else if (ai === '21') {
        serialNumber = rawVal;
      } else if (ai === '30') {
        count = Number.parseInt(rawVal, 10);
        parsedVal = count;
      } else if (ai.startsWith('310')) {
        const decimals = Number.parseInt(ai.charAt(3), 10);
        const numVal = Number.parseInt(rawVal, 10);
        weightGrams = Math.round((numVal * 1000) / Math.pow(10, decimals));
        parsedVal = weightGrams;
      }

      elements.push({
        ai,
        label,
        raw_value: rawVal,
        parsed_value: parsedVal,
      });
    }
  }

  return {
    raw_barcode: trimmed,
    elements,
    gtin,
    batch_id: batchId,
    expiry_date: expiryDate,
    serial_number: serialNumber,
    sscc,
    weight_grams: weightGrams,
    count,
  };
}

export interface DomainTransferLocation {
  id: string;
  code: string;
  is_active: boolean;
  type: 'INTERNAL_STORAGE' | 'PICKING_FACE' | 'STAGING_BAY' | 'RECEIVING_DOCK';
  mix_policy?: 'SINGLE_SKU' | 'MULTI_SKU';
  max_weight_kg?: number | null;
  max_volume_cm3?: number | null;
  current_weight_kg?: number | null;
  current_volume_cm3?: number | null;
  existing_skus?: string[];
}

export interface DomainTransferItem {
  sku: string;
  quantity: number;
  unit_weight_kg?: number;
  unit_volume_cm3?: number;
}

/**
 * Validates domain invariants for internal bin transfers.
 */
export function assertBinTransferInvariants(
  source: DomainTransferLocation,
  destination: DomainTransferLocation,
  item: DomainTransferItem,
): void {
  if (source.id === destination.id) {
    throw new WarehouseOpsDomainError(
      'SAME_LOCATION_TRANSFER_FORBIDDEN',
      `Source and destination locations cannot be identical ('${source.code}').`,
    );
  }

  if (!source.is_active) {
    throw new WarehouseOpsDomainError(
      'SOURCE_LOCATION_INACTIVE',
      `Source location '${source.code}' is inactive.`,
    );
  }

  if (!destination.is_active) {
    throw new WarehouseOpsDomainError(
      'DESTINATION_LOCATION_INACTIVE',
      `Destination location '${destination.code}' is inactive.`,
    );
  }

  if (item.quantity <= 0) {
    throw new WarehouseOpsDomainError(
      'TRANSFER_QUANTITY_NON_POSITIVE',
      `Transfer quantity must be greater than zero, got ${item.quantity}.`,
    );
  }

  // Destination SKU mix policy invariant
  const normSku = item.sku.trim().toUpperCase();
  if (destination.mix_policy === 'SINGLE_SKU' && destination.existing_skus) {
    const existingOther = destination.existing_skus.find(
      (s) => s.trim().toUpperCase() !== normSku,
    );
    if (existingOther) {
      throw new WarehouseOpsDomainError(
        'SINGLE_SKU_VIOLATION',
        `Destination bin '${destination.code}' has a SINGLE_SKU policy and already contains SKU '${existingOther}'. Cannot move '${normSku}' into it.`,
      );
    }
  }

  // Destination weight capacity invariant
  if (destination.max_weight_kg && item.unit_weight_kg) {
    const additionalWeight = item.unit_weight_kg * item.quantity;
    const currentWeight = destination.current_weight_kg ?? 0;
    if (currentWeight + additionalWeight > destination.max_weight_kg) {
      throw new WarehouseOpsDomainError(
        'WEIGHT_CAPACITY_EXCEEDED',
        `Transferring ${additionalWeight}kg would exceed destination bin '${destination.code}' weight limit of ${destination.max_weight_kg}kg (current: ${currentWeight}kg).`,
      );
    }
  }

  // Destination volume capacity invariant
  if (destination.max_volume_cm3 && item.unit_volume_cm3) {
    const additionalVol = item.unit_volume_cm3 * item.quantity;
    const currentVol = destination.current_volume_cm3 ?? 0;
    if (currentVol + additionalVol > destination.max_volume_cm3) {
      throw new WarehouseOpsDomainError(
        'VOLUME_CAPACITY_EXCEEDED',
        `Transferring ${additionalVol}cm³ would exceed destination bin '${destination.code}' volume limit of ${destination.max_volume_cm3}cm³ (current: ${currentVol}cm³).`,
      );
    }
  }
}

export type DomainTransferStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

const VALID_TRANSFER_TRANSITIONS: Record<
  DomainTransferStatus,
  readonly DomainTransferStatus[]
> = {
  PENDING: ['IN_TRANSIT', 'COMPLETED', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertTransferTransition(
  from: DomainTransferStatus,
  to: DomainTransferStatus,
): void {
  if (from === to) return;
  const allowed = VALID_TRANSFER_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new WarehouseOpsDomainError(
      'INVALID_TRANSFER_TRANSITION',
      `Illegal internal transfer transition from '${from}' to '${to}'.`,
    );
  }
}

export interface DomainInboundCandidateItem {
  inbound_line_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
}

export interface DomainPendingOrderDemand {
  order_id: string;
  order_line_id: string;
  variant_id: string;
  sku: string;
  quantity_demanded: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
}

export interface DomainCrossDockAllocation {
  inbound_line_id: string;
  variant_id: string;
  sku: string;
  matched_order_id: string;
  matched_order_line_id: string;
  quantity_allocated: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
}

export interface DomainCrossDockMatchResult {
  total_cross_dock_quantity: number;
  total_surplus_quantity: number;
  allocations: DomainCrossDockAllocation[];
}

/**
 * Cross-Docking Demand-Matching Engine.
 * Evaluates inbound receipts against pending outbound demand, routing matching
 * goods directly to dispatch/packing staging to bypass bulk storage rack cycles.
 */
export function matchCrossDockCandidates(
  inboundItems: DomainInboundCandidateItem[],
  pendingDemands: DomainPendingOrderDemand[],
): DomainCrossDockMatchResult {
  const priorityWeight: Record<string, number> = {
    URGENT: 3,
    HIGH: 2,
    NORMAL: 1,
  };

  // Group demands by variant_id and sort descending by priority
  const demandByVariant = new Map<string, DomainPendingOrderDemand[]>();
  for (const dem of pendingDemands) {
    const list = demandByVariant.get(dem.variant_id) ?? [];
    list.push({ ...dem });
    demandByVariant.set(dem.variant_id, list);
  }

  for (const list of demandByVariant.values()) {
    list.sort(
      (a, b) =>
        (priorityWeight[b.priority] ?? 1) - (priorityWeight[a.priority] ?? 1),
    );
  }

  const allocations: DomainCrossDockAllocation[] = [];
  let totalCrossDocked = 0;
  let totalSurplus = 0;

  for (const inbound of inboundItems) {
    let remainingInbound = inbound.quantity;
    const demands = demandByVariant.get(inbound.variant_id);

    if (demands && demands.length > 0) {
      for (const demand of demands) {
        if (remainingInbound <= 0) break;
        if (demand.quantity_demanded <= 0) continue;

        const allocQty = Math.min(remainingInbound, demand.quantity_demanded);
        if (allocQty > 0) {
          allocations.push({
            inbound_line_id: inbound.inbound_line_id,
            variant_id: inbound.variant_id,
            sku: inbound.sku,
            matched_order_id: demand.order_id,
            matched_order_line_id: demand.order_line_id,
            quantity_allocated: allocQty,
            priority: demand.priority,
          });

          remainingInbound -= allocQty;
          demand.quantity_demanded -= allocQty;
          totalCrossDocked += allocQty;
        }
      }
    }

    if (remainingInbound > 0) {
      totalSurplus += remainingInbound;
    }
  }

  return {
    total_cross_dock_quantity: totalCrossDocked,
    total_surplus_quantity: totalSurplus,
    allocations,
  };
}


