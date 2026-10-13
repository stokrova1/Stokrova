import { describe, it, expect } from 'vitest';
import {
  assertTemperatureCompatibility,
  assertHazmatSegregation,
  calculateVelocityAffinityScore,
  calculateAccessibilityScore,
  rankPutAwayCandidates,
  sortPickLinesSerpentine,
  groupOrdersIntoWaves,
  assertPickLineTransition,
  assertPickQuantity,
  calculatePickListStatus,
  calculateGS1Modulo10CheckDigit,
  formatSSCC18,
  validateSSCC18,
  cartonizeItems,
  assertContainerWeightTolerance,
  assertContainerTransition,
  assertManifestTransition,
  assertManifestDispatchable,
  parseGS1Barcode,
  assertBinTransferInvariants,
  assertTransferTransition,
  matchCrossDockCandidates,
  WarehouseOpsDomainError,
  PutAwayCandidateLocation,
} from '../src/warehouse-ops.js';

describe('Warehouse Operations & Directed Put-Away Domain Engine (Phase 6A)', () => {
  describe('assertTemperatureCompatibility', () => {
    it('permits identical temperature classes', () => {
      expect(() => assertTemperatureCompatibility('AMBIENT', 'AMBIENT')).not.toThrow();
      expect(() => assertTemperatureCompatibility('COLD_STORAGE', 'COLD_STORAGE')).not.toThrow();
      expect(() => assertTemperatureCompatibility('FROZEN', 'FROZEN')).not.toThrow();
      expect(() => assertTemperatureCompatibility('ULTRA_LOW', 'ULTRA_LOW')).not.toThrow();
    });

    it('permits ambient product in controlled room temperature zone', () => {
      expect(() => assertTemperatureCompatibility('AMBIENT', 'CONTROLLED_ROOM_TEMP')).not.toThrow();
    });

    it('strictly forbids cold-chain compromises', () => {
      expect(() => assertTemperatureCompatibility('COLD_STORAGE', 'AMBIENT')).toThrowError(
        WarehouseOpsDomainError,
      );
      expect(() => assertTemperatureCompatibility('COLD_STORAGE', 'AMBIENT')).toThrow(
        /cannot be stored/i,
      );
      try {
        assertTemperatureCompatibility('COLD_STORAGE', 'AMBIENT');
      } catch (e: any) {
        expect(e.code).toBe('TEMPERATURE_INCOMPATIBLE');
      }

      expect(() => assertTemperatureCompatibility('FROZEN', 'COLD_STORAGE')).toThrowError(
        WarehouseOpsDomainError,
      );

      expect(() => assertTemperatureCompatibility('ULTRA_LOW', 'FROZEN')).toThrowError(
        WarehouseOpsDomainError,
      );
    });
  });

  describe('assertHazmatSegregation', () => {
    it('permits non-hazardous items anywhere', () => {
      expect(() => assertHazmatSegregation('NONE', ['FLAMMABLE', 'OXIDIZER'])).not.toThrow();
    });

    it('permits co-locating same hazard class', () => {
      expect(() => assertHazmatSegregation('FLAMMABLE', ['FLAMMABLE'])).not.toThrow();
    });

    it('strictly forbids incompatible chemical and hazard pairings', () => {
      expect(() => assertHazmatSegregation('FLAMMABLE', ['OXIDIZER'])).toThrow(
        /cannot be co-located/i,
      );
      try {
        assertHazmatSegregation('FLAMMABLE', ['OXIDIZER']);
      } catch (e: any) {
        expect(e.code).toBe('HAZMAT_SEGREGATION_VIOLATION');
      }

      expect(() => assertHazmatSegregation('CORROSIVE', ['TOXIC'])).toThrow(
        /cannot be co-located/i,
      );

      expect(() => assertHazmatSegregation('EXPLOSIVE', ['FLAMMABLE'])).toThrow(
        /cannot be co-located/i,
      );

      expect(() => assertHazmatSegregation('RADIOACTIVE', ['CORROSIVE'])).toThrow(
        /cannot be co-located/i,
      );
    });
  });

  describe('calculateVelocityAffinityScore', () => {
    it('awards highest affinity for matching ABC velocity classes', () => {
      expect(calculateVelocityAffinityScore('CLASS_A_FAST_MOVING', 'CLASS_A_FAST_MOVING')).toBe(1000);
      expect(calculateVelocityAffinityScore('CLASS_B_MEDIUM_MOVING', 'CLASS_B_MEDIUM_MOVING')).toBe(500);
      expect(calculateVelocityAffinityScore('CLASS_C_SLOW_MOVING', 'CLASS_C_SLOW_MOVING')).toBe(250);
    });

    it('penalizes severely mismatched placements', () => {
      // Fast mover in top shelf slow bin
      expect(calculateVelocityAffinityScore('CLASS_A_FAST_MOVING', 'CLASS_C_SLOW_MOVING')).toBe(-500);
      // Slow mover taking prime ground pick bin
      expect(calculateVelocityAffinityScore('CLASS_C_SLOW_MOVING', 'CLASS_A_FAST_MOVING')).toBe(-300);
    });
  });

  describe('calculateAccessibilityScore', () => {
    it('favors ground level for high throughput access', () => {
      expect(calculateAccessibilityScore(1)).toBe(600);
      expect(calculateAccessibilityScore(2)).toBe(400);
      expect(calculateAccessibilityScore(3)).toBe(200);
      expect(calculateAccessibilityScore(4)).toBe(50);
    });
  });

  describe('rankPutAwayCandidates', () => {
    const defaultCandidates: PutAwayCandidateLocation[] = [
      {
        id: 'loc_bin_ambient_01',
        code: 'BIN-AMB-01',
        name: 'Ambient Shelf A1',
        type: 'INTERNAL_STORAGE',
        level: 1,
        is_active: true,
        mix_policy: 'MULTI_SKU',
        max_weight_kg: 500,
        max_volume_cm3: 1000000,
        current_weight_kg: 50,
        current_volume_cm3: 100000,
        existing_skus: ['SKU-OTHER'],
        temperature_class: 'AMBIENT',
        hazmat_class: 'NONE',
        velocity_class: 'CLASS_A_FAST_MOVING',
      },
      {
        id: 'loc_bin_cold_01',
        code: 'BIN-COLD-01',
        name: 'Cold Storage Shelf C1',
        type: 'INTERNAL_STORAGE',
        level: 1,
        is_active: true,
        mix_policy: 'MULTI_SKU',
        max_weight_kg: 500,
        max_volume_cm3: 1000000,
        current_weight_kg: 20,
        current_volume_cm3: 50000,
        existing_skus: ['SKU-VACCINE-A'],
        temperature_class: 'COLD_STORAGE',
        hazmat_class: 'NONE',
        velocity_class: 'CLASS_A_FAST_MOVING',
      },
      {
        id: 'loc_bin_hazmat_flam',
        code: 'BIN-HAZ-FLAM',
        name: 'Flammable Locker F1',
        type: 'INTERNAL_STORAGE',
        level: 1,
        is_active: true,
        mix_policy: 'MULTI_SKU',
        max_weight_kg: 200,
        max_volume_cm3: 500000,
        existing_skus: ['SKU-SOLVENT'],
        existing_hazmats: ['FLAMMABLE'],
        temperature_class: 'AMBIENT',
        hazmat_class: 'FLAMMABLE',
      },
    ];

    it('filters out temperature incompatible locations and assigns cold item to cold storage', () => {
      const res = rankPutAwayCandidates(
        {
          variant_id: 'var_vaccine',
          sku: 'SKU-VACCINE-B',
          quantity: 10,
          unit_weight_kg: 0.5,
          unit_volume_cm3: 1000,
          temperature_class: 'COLD_STORAGE',
          hazmat_class: 'NONE',
        },
        defaultCandidates,
      );

      // Only the cold storage location should be eligible
      expect(res.recommendations).toHaveLength(1);
      expect(res.recommendations[0]!.location_id).toBe('loc_bin_cold_01');
      expect(res.best_match_location_id).toBe('loc_bin_cold_01');
    });

    it('strictly segregates oxidizer product away from flammable bin', () => {
      const res = rankPutAwayCandidates(
        {
          variant_id: 'var_peroxide',
          sku: 'SKU-OXIDIZER-PEROXIDE',
          quantity: 5,
          unit_weight_kg: 2,
          unit_volume_cm3: 2000,
          temperature_class: 'AMBIENT',
          hazmat_class: 'OXIDIZER',
        },
        defaultCandidates,
      );

      // Flammable locker must be disqualified! Only ambient shelf is eligible
      const hasFlammableBin = res.recommendations.some((r) => r.location_id === 'loc_bin_hazmat_flam');
      expect(hasFlammableBin).toBe(false);
      expect(res.best_match_location_id).toBe('loc_bin_ambient_01');
    });

    it('prioritizes same-SKU consolidation to minimize inventory fragmentation', () => {
      const candidatesWithConsolidation: PutAwayCandidateLocation[] = [
        {
          id: 'loc_empty_bin',
          code: 'BIN-EMPTY',
          name: 'Empty Bin',
          type: 'INTERNAL_STORAGE',
          level: 1,
          is_active: true,
          mix_policy: 'MULTI_SKU',
          max_weight_kg: 500,
          max_volume_cm3: 1000000,
          current_weight_kg: 0,
          current_volume_cm3: 0,
          existing_skus: [],
          temperature_class: 'AMBIENT',
          velocity_class: 'CLASS_A_FAST_MOVING',
        },
        {
          id: 'loc_consolidated_bin',
          code: 'BIN-CONSOL',
          name: 'Bin with Existing Stock',
          type: 'INTERNAL_STORAGE',
          level: 1,
          is_active: true,
          mix_policy: 'MULTI_SKU',
          max_weight_kg: 500,
          max_volume_cm3: 1000000,
          current_weight_kg: 50,
          current_volume_cm3: 50000,
          existing_skus: ['SKU-WIDGET-PRO'], // Holds the same SKU!
          temperature_class: 'AMBIENT',
          velocity_class: 'CLASS_A_FAST_MOVING',
        },
      ];

      const res = rankPutAwayCandidates(
        {
          variant_id: 'var_widget',
          sku: 'SKU-WIDGET-PRO',
          quantity: 20,
          unit_weight_kg: 1,
          unit_volume_cm3: 1000,
          velocity_class: 'CLASS_A_FAST_MOVING',
        },
        candidatesWithConsolidation,
      );

      expect(res.recommendations).toHaveLength(2);
      expect(res.best_match_location_id).toBe('loc_consolidated_bin');
      expect(res.recommendations[0]!.reasons).toContain('Same-SKU consolidation');
    });

    it('disqualifies locations when weight or volume capacity would be exceeded', () => {
      const tightCandidate: PutAwayCandidateLocation = {
        id: 'loc_tight_bin',
        code: 'BIN-TIGHT',
        name: 'Small Bin',
        type: 'INTERNAL_STORAGE',
        level: 1,
        is_active: true,
        mix_policy: 'MULTI_SKU',
        max_weight_kg: 10, // Max 10kg
        max_volume_cm3: 10000,
        current_weight_kg: 8, // 8kg already in bin
        current_volume_cm3: 5000,
        existing_skus: [],
      };

      const res = rankPutAwayCandidates(
        {
          variant_id: 'var_heavy',
          sku: 'SKU-HEAVY',
          quantity: 5,
          unit_weight_kg: 1, // 5kg added -> 8 + 5 = 13kg > 10kg
          unit_volume_cm3: 500,
        },
        [tightCandidate],
      );

      expect(res.recommendations).toHaveLength(0);
      expect(res.best_match_location_id).toBeNull();
    });
  });

  describe('Serpentine Pick Routing Optimization (Rule 26)', () => {
    it('sorts odd aisles forward and even aisles in reverse to minimize travel', () => {
      const unorderedLines = [
        // Aisle 2 (even - should be traversed reverse)
        { id: 'l1', source_location_code: 'A2-R1-S1-B1', aisle: 2, rack: 1, shelf: 1, bin_position: 1 },
        { id: 'l2', source_location_code: 'A2-R3-S1-B1', aisle: 2, rack: 3, shelf: 1, bin_position: 1 },
        // Aisle 1 (odd - should be traversed forward)
        { id: 'l3', source_location_code: 'A1-R2-S1-B1', aisle: 1, rack: 2, shelf: 1, bin_position: 1 },
        { id: 'l4', source_location_code: 'A1-R1-S1-B1', aisle: 1, rack: 1, shelf: 1, bin_position: 1 },
      ];

      const sorted = sortPickLinesSerpentine(unorderedLines);

      expect(sorted).toHaveLength(4);
      // Aisle 1 comes first, forward direction: rack 1 before rack 2
      expect(sorted[0]!.id).toBe('l4'); // A1-R1
      expect(sorted[0]!.pick_sequence).toBe(1);
      expect(sorted[1]!.id).toBe('l3'); // A1-R2
      expect(sorted[1]!.pick_sequence).toBe(2);

      // Aisle 2 comes second, reverse serpentine direction: rack 3 before rack 1
      expect(sorted[2]!.id).toBe('l2'); // A2-R3
      expect(sorted[2]!.pick_sequence).toBe(3);
      expect(sorted[3]!.id).toBe('l1'); // A2-R1
      expect(sorted[3]!.pick_sequence).toBe(4);
    });

    it('falls back to alphanumeric location code when aisle is undefined', () => {
      const fallbackLines = [
        { id: 'lB', source_location_code: 'STAGE-B' },
        { id: 'lA', source_location_code: 'STAGE-A' },
      ];

      const sorted = sortPickLinesSerpentine(fallbackLines);

      expect(sorted[0]!.id).toBe('lA');
      expect(sorted[0]!.pick_sequence).toBe(1);
      expect(sorted[1]!.id).toBe('lB');
      expect(sorted[1]!.pick_sequence).toBe(2);
    });
  });

  describe('Pick Wave Grouping Engine', () => {
    it('partitions orders by shipping carrier while respecting max limits', () => {
      const orders = [
        { order_id: 'ord_1', carrier_id: 'FEDEX', priority: 1, lines_count: 5 },
        { order_id: 'ord_2', carrier_id: 'FEDEX', priority: 2, lines_count: 5 },
        { order_id: 'ord_3', carrier_id: 'DHL', priority: 1, lines_count: 10 },
      ];

      const waves = groupOrdersIntoWaves(orders, {
        max_orders: 1, // Max 1 order per wave to test partitioning
        group_by: 'CARRIER',
      });

      // ord_1 and ord_2 should be split into 2 FedEx waves, ord_3 into 1 DHL wave
      expect(waves).toHaveLength(3);
      expect(waves[0]!.group_key).toBe('CARRIER_FEDEX');
      expect(waves[0]!.order_ids).toEqual(['ord_1']);
      expect(waves[1]!.group_key).toBe('CARRIER_FEDEX');
      expect(waves[1]!.order_ids).toEqual(['ord_2']);
      expect(waves[2]!.group_key).toBe('CARRIER_DHL');
      expect(waves[2]!.order_ids).toEqual(['ord_3']);
    });
  });

  describe('Pick Line Transitions & Invariants', () => {
    it('allows legal pick line transitions and rejects illegal ones', () => {
      expect(() => assertPickLineTransition('PENDING', 'PICKED')).not.toThrow();
      expect(() => assertPickLineTransition('PENDING', 'SHORT_PICKED')).not.toThrow();
      expect(() => assertPickLineTransition('PENDING', 'CANCELLED')).not.toThrow();

      // Forbid modifying already picked line
      expect(() => assertPickLineTransition('PICKED', 'PENDING')).toThrowError(
        WarehouseOpsDomainError,
      );

      // Forbid transitioning cancelled line
      expect(() => assertPickLineTransition('CANCELLED', 'PICKED')).toThrowError(
        WarehouseOpsDomainError,
      );
    });

    it('validates pick quantity bounds and short pick rules', () => {
      expect(() => assertPickQuantity(10, 10, false)).not.toThrow();
      expect(() => assertPickQuantity(10, 8, true)).not.toThrow();

      // Negative pick forbidden
      expect(() => assertPickQuantity(10, -1, false)).toThrow(/cannot be negative/i);

      // Over pick forbidden
      expect(() => assertPickQuantity(10, 11, false)).toThrow(/cannot exceed requested/i);

      // Invalid short pick (picked all requested items but marked short)
      expect(() => assertPickQuantity(10, 10, true)).toThrow(/less than requested/i);
    });
  });

  describe('calculatePickListStatus', () => {
    it('computes correct overall pick list status', () => {
      expect(calculatePickListStatus([])).toBe('DRAFT');

      expect(
        calculatePickListStatus([
          { status: 'PENDING' },
          { status: 'PENDING' },
        ]),
      ).toBe('RELEASED');

      expect(
        calculatePickListStatus([
          { status: 'PICKED' },
          { status: 'PENDING' },
        ]),
      ).toBe('IN_PROGRESS');

      expect(
        calculatePickListStatus([
          { status: 'PICKED' },
          { status: 'SHORT_PICKED' },
        ]),
      ).toBe('COMPLETED');

      expect(
        calculatePickListStatus([
          { status: 'CANCELLED' },
          { status: 'CANCELLED' },
        ]),
      ).toBe('CANCELLED');
    });
  });

  describe('GS1 SSCC-18 Barcode Engine (Phase 6C)', () => {
    it('calculates GS1 Modulo-10 check digit accurately', () => {
      // 00012345678901234 -> check digit 3
      expect(calculateGS1Modulo10CheckDigit('00012345678901234')).toBe(3);

      // Rejects non-17 digit payload
      expect(() => calculateGS1Modulo10CheckDigit('12345')).toThrowError(
        WarehouseOpsDomainError,
      );
    });

    it('formats compliant 18-digit SSCC barcode', () => {
      const sscc = formatSSCC18(0, '0123456', '78901234');
      expect(sscc).toHaveLength(18);
      expect(sscc.startsWith('00123456')).toBe(true);
      expect(validateSSCC18(sscc)).toBe(true);
    });

    it('validates SSCC-18 barcodes and detects checksum corruptions', () => {
      const validSSCC = '000123456789012343';
      expect(validateSSCC18(validSSCC)).toBe(true);

      // Corrupted last digit
      const corruptedSSCC = '000123456789012344';
      expect(validateSSCC18(corruptedSSCC)).toBe(false);

      // Invalid length
      expect(validateSSCC18('123')).toBe(false);
    });
  });

  describe('Best-Fit Decreasing Cartonization Engine (Phase 6C)', () => {
    const boxes = [
      {
        id: 'box_small',
        code: 'BOX-S',
        name: 'Small Box',
        length_mm: 200,
        width_mm: 150,
        height_mm: 100, // 3000 cm3
        max_weight_grams: 5000,
        tare_weight_grams: 200,
      },
      {
        id: 'box_large',
        code: 'BOX-L',
        name: 'Large Box',
        length_mm: 400,
        width_mm: 300,
        height_mm: 200, // 24000 cm3
        max_weight_grams: 20000,
        tare_weight_grams: 600,
      },
    ];

    it('packs items into minimum required cartons', () => {
      const items = [
        {
          variant_id: 'var_1',
          sku: 'SKU-SHIRT',
          quantity: 3,
          weight_grams_each: 400,
          length_mm: 100,
          width_mm: 80,
          height_mm: 30,
        },
      ];

      const res = cartonizeItems(items, boxes);
      expect(res.total_cartons).toBe(1);
      expect(res.cartons[0]!.box_code).toBe('BOX-S');
      expect(res.cartons[0]!.estimated_gross_weight_grams).toBe(200 + 3 * 400); // 1400g
      expect(res.cartons[0]!.items[0]!.quantity).toBe(3);
    });

    it('spills over into multiple cartons when weight or volume exceeds box capacity', () => {
      const items = [
        {
          variant_id: 'var_heavy',
          sku: 'SKU-DUMBBELL',
          quantity: 2,
          weight_grams_each: 15000, // 15kg each, large box max is 20kg
        },
      ];

      const res = cartonizeItems(items, boxes);
      // Cannot fit two 15kg dumbbells in one 20kg max box -> must use 2 boxes
      expect(res.total_cartons).toBe(2);
      expect(res.cartons[0]!.box_code).toBe('BOX-L');
      expect(res.cartons[1]!.box_code).toBe('BOX-L');
    });

    it('throws error if item exceeds maximum box capacity', () => {
      const items = [
        {
          variant_id: 'var_huge',
          sku: 'SKU-ANVIL',
          quantity: 1,
          weight_grams_each: 50000, // 50kg > 20kg max
        },
      ];

      expect(() => cartonizeItems(items, boxes)).toThrowError(
        /exceeds the maximum box capacity/i,
      );
    });
  });

  describe('Container Weight Tolerance Invariants (Phase 6C)', () => {
    it('accepts scale weights within tolerance (e.g. 200 bp = 2%)', () => {
      const expected = 10000; // 10kg
      const actual = 10150; // 1.5% discrepancy (150 bp)
      const res = assertContainerWeightTolerance(actual, expected, 200);
      expect(res.discrepancyGrams).toBe(150);
      expect(res.toleranceExceeded).toBe(false);
    });

    it('rejects scale weights outside tolerance', () => {
      const expected = 10000;
      const actual = 10500; // 5% discrepancy (500 bp > 200 bp)
      expect(() => assertContainerWeightTolerance(actual, expected, 200)).toThrowError(
        /deviates from expected gross weight/i,
      );
    });

    it('guards against non-positive scale or expected weights', () => {
      expect(() => assertContainerWeightTolerance(0, 1000)).toThrowError(
        /must be greater than zero grams/i,
      );
      expect(() => assertContainerWeightTolerance(1000, 0)).toThrowError(
        /must be greater than zero grams/i,
      );
    });
  });

  describe('Container & Manifest State Transitions (Phase 6C)', () => {
    it('enforces legal container status transitions', () => {
      expect(() => assertContainerTransition('OPEN', 'WEIGHED')).not.toThrow();
      expect(() => assertContainerTransition('WEIGHED', 'SEALED')).not.toThrow();
      expect(() => assertContainerTransition('SEALED', 'STAGED')).not.toThrow();
      expect(() => assertContainerTransition('STAGED', 'LOADED')).not.toThrow();
      expect(() => assertContainerTransition('LOADED', 'DISPATCHED')).not.toThrow();

      // Illegal transition: OPEN directly to DISPATCHED
      expect(() => assertContainerTransition('OPEN', 'DISPATCHED')).toThrowError(
        WarehouseOpsDomainError,
      );
      // Illegal transition: DISPATCHED cannot change
      expect(() => assertContainerTransition('DISPATCHED', 'OPEN')).toThrowError(
        WarehouseOpsDomainError,
      );
    });

    it('enforces legal shipping manifest transitions', () => {
      expect(() => assertManifestTransition('DRAFT', 'SEALED')).not.toThrow();
      expect(() => assertManifestTransition('SEALED', 'DISPATCHED')).not.toThrow();

      // Illegal: DISPATCHED back to DRAFT
      expect(() => assertManifestTransition('DISPATCHED', 'DRAFT')).toThrowError(
        WarehouseOpsDomainError,
      );
    });

    it('guards manifest dispatchability against unsealed containers', () => {
      expect(() =>
        assertManifestDispatchable('SEALED', [
          { id: 'c1', status: 'SEALED' },
          { id: 'c2', status: 'STAGED' },
        ]),
      ).not.toThrow();

      // Empty manifest cannot be dispatched
      expect(() => assertManifestDispatchable('SEALED', [])).toThrowError(
        /Cannot dispatch an empty shipping manifest/i,
      );

      // Unsealed container blocks dispatch
      expect(() =>
        assertManifestDispatchable('SEALED', [
          { id: 'c1', status: 'SEALED' },
          { id: 'c2', status: 'OPEN' },
        ]),
      ).toThrowError(/is in 'OPEN' status/i);
    });
  });

  describe('GS1 Barcode Logistics Parser (Phase 6D)', () => {
    it('parses bracketed GS1 barcode with GTIN, LOT, Expiry Date, Serial, and Weight', () => {
      // (01)00012345678905(10)LOT98765(17)261231(21)SN112233(3102)001550
      const raw = '(01)00012345678905(10)LOT98765(17)261231(21)SN112233(3102)001550';
      const parsed = parseGS1Barcode(raw);

      expect(parsed.gtin).toBe('00012345678905');
      expect(parsed.batch_id).toBe('LOT98765');
      expect(parsed.expiry_date).toBe('2026-12-31');
      expect(parsed.serial_number).toBe('SN112233');
      // 3102 001550 -> 15.50 kg -> 15,500 integer grams
      expect(parsed.weight_grams).toBe(15500);
      expect(parsed.elements).toHaveLength(5);
    });

    it('parses continuous FNC1-delimited GS1 barcode streams', () => {
      // 01000123456789051726123110BATCH777\u001d21SN888
      const raw = '01000123456789051726123110BATCH777\u001d21SN888';
      const parsed = parseGS1Barcode(raw);

      expect(parsed.gtin).toBe('00012345678905');
      expect(parsed.expiry_date).toBe('2026-12-31');
      expect(parsed.batch_id).toBe('BATCH777');
      expect(parsed.serial_number).toBe('SN888');
    });

    it('gracefully handles standard standalone GTIN or raw SKU barcodes', () => {
      const gtinRaw = '01234567890128';
      const parsedGtin = parseGS1Barcode(gtinRaw);
      expect(parsedGtin.gtin).toBe('01234567890128');

      const plainSku = 'SKU-LAPTOP-M3';
      const parsedSku = parseGS1Barcode(plainSku);
      expect(parsedSku.elements[0]!.label).toBe('RAW_CODE');
      expect(parsedSku.elements[0]!.parsed_value).toBe('SKU-LAPTOP-M3');
    });
  });

  describe('Internal Bin Transfer Invariants (Phase 6D)', () => {
    const validSrc = {
      id: 'loc_src',
      code: 'BIN-A-01',
      is_active: true,
      type: 'INTERNAL_STORAGE' as const,
    };

    const validDst = {
      id: 'loc_dst',
      code: 'BIN-B-01',
      is_active: true,
      type: 'INTERNAL_STORAGE' as const,
      mix_policy: 'MULTI_SKU' as const,
      max_weight_kg: 50,
      current_weight_kg: 10,
      max_volume_cm3: 50000,
      current_volume_cm3: 10000,
    };

    it('accepts valid bin transfer within capacity', () => {
      expect(() =>
        assertBinTransferInvariants(validSrc, validDst, {
          sku: 'SKU-WIDGET',
          quantity: 5,
          unit_weight_kg: 2, // 10kg + 10kg = 20kg < 50kg
          unit_volume_cm3: 1000, // 10000 + 5000 = 15000 < 50000
        }),
      ).not.toThrow();
    });

    it('rejects transfer when source and destination are identical', () => {
      expect(() =>
        assertBinTransferInvariants(validSrc, validSrc, {
          sku: 'SKU-WIDGET',
          quantity: 1,
        }),
      ).toThrowError(/cannot be identical/i);
    });

    it('enforces SINGLE_SKU policy on destination bin', () => {
      const singleSkuDst = {
        ...validDst,
        mix_policy: 'SINGLE_SKU' as const,
        existing_skus: ['SKU-OTHER-ITEM'],
      };

      expect(() =>
        assertBinTransferInvariants(validSrc, singleSkuDst, {
          sku: 'SKU-NEW-ITEM',
          quantity: 2,
        }),
      ).toThrowError(/SINGLE_SKU policy and already contains/i);
    });

    it('rejects transfer when destination weight capacity is exceeded', () => {
      expect(() =>
        assertBinTransferInvariants(validSrc, validDst, {
          sku: 'SKU-HEAVY',
          quantity: 10,
          unit_weight_kg: 5, // 50kg added -> 10 + 50 = 60kg > 50kg max
        }),
      ).toThrowError(/exceed destination bin.*weight limit/i);
    });

    it('enforces legal transfer state transitions', () => {
      expect(() => assertTransferTransition('PENDING', 'IN_TRANSIT')).not.toThrow();
      expect(() => assertTransferTransition('IN_TRANSIT', 'COMPLETED')).not.toThrow();
      expect(() => assertTransferTransition('PENDING', 'COMPLETED')).not.toThrow();

      // Illegal: COMPLETED back to PENDING
      expect(() => assertTransferTransition('COMPLETED', 'PENDING')).toThrowError(
        WarehouseOpsDomainError,
      );
    });
  });

  describe('Cross-Docking Demand-Matching Engine (Phase 6D)', () => {
    it('prioritizes URGENT orders and calculates cross-dock allocations and put-away surplus', () => {
      const inboundItems = [
        {
          inbound_line_id: 'in_l1',
          variant_id: 'var_screen_oled',
          sku: 'SKU-SCREEN-4K',
          quantity: 10, // 10 units received
        },
      ];

      const demands = [
        {
          order_id: 'ord_normal',
          order_line_id: 'ord_l_norm',
          variant_id: 'var_screen_oled',
          sku: 'SKU-SCREEN-4K',
          quantity_demanded: 5,
          priority: 'NORMAL' as const,
        },
        {
          order_id: 'ord_urgent',
          order_line_id: 'ord_l_urg',
          variant_id: 'var_screen_oled',
          sku: 'SKU-SCREEN-4K',
          quantity_demanded: 4,
          priority: 'URGENT' as const,
        },
      ];

      const res = matchCrossDockCandidates(inboundItems, demands);

      expect(res.total_cross_dock_quantity).toBe(9); // 4 (urgent) + 5 (normal)
      expect(res.total_surplus_quantity).toBe(1); // 10 - 9 = 1 for standard put-away
      expect(res.allocations).toHaveLength(2);
      // URGENT must be allocated first
      expect(res.allocations[0]!.matched_order_id).toBe('ord_urgent');
      expect(res.allocations[0]!.quantity_allocated).toBe(4);
      expect(res.allocations[1]!.matched_order_id).toBe('ord_normal');
      expect(res.allocations[1]!.quantity_allocated).toBe(5);
    });
  });
});


