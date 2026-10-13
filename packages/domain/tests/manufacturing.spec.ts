import { describe, it, expect } from 'vitest';
import {
  assertNoBomCircularDependency,
  calculateComponentGrossRequirement,
  explodeBillOfMaterials,
  calculateOperationDurationAndCosts,
  assertValidMoStatusTransition,
  calculateFinishedGoodsUnitCost,
  assertValidOutputClassification,
  evaluateComponentShortage,
  calculatePartialProductionYield,
  assertValidComponentSubstitution,
  BomCircularDependencyDomainError,
  InvalidMoStatusTransitionDomainError,
  ManufacturingDomainError,
} from '../src/manufacturing.js';

describe('Manufacturing & Bill of Materials Domain Engine (Phase 5)', () => {
  describe('Phase 5A: BOM Scrap & Multi-Level Explosion', () => {
    describe('assertNoBomCircularDependency', () => {
      it('allows valid acyclic BOM hierarchy', () => {
        // Assembly A -> Sub-assembly B -> Raw Material C
        const graph: Record<string, string[]> = {
          var_assembly_A: ['var_sub_B'],
          var_sub_B: ['var_raw_C'],
          var_raw_C: [],
        };
        const resolver = (vId: string) => graph[vId] || [];

        expect(() =>
          assertNoBomCircularDependency('var_assembly_A', 'var_sub_B', resolver),
        ).not.toThrow();
        expect(() =>
          assertNoBomCircularDependency('var_sub_B', 'var_raw_C', resolver),
        ).not.toThrow();
      });

      it('detects direct self-referencing circular dependency', () => {
        expect(() =>
          assertNoBomCircularDependency('var_A', 'var_A', () => []),
        ).toThrow(BomCircularDependencyDomainError);
      });

      it('detects indirect deep circular dependency (A -> B -> C -> A)', () => {
        const graph: Record<string, string[]> = {
          var_A: ['var_B'],
          var_B: ['var_C'],
          var_C: ['var_A'],
        };
        const resolver = (vId: string) => graph[vId] || [];

        expect(() =>
          assertNoBomCircularDependency('var_A', 'var_B', resolver),
        ).toThrow(BomCircularDependencyDomainError);
      });
    });

    describe('calculateComponentGrossRequirement', () => {
      it('computes exact proportional scrap with ceiling rounding and fixed allowance', () => {
        // 10 units @ 250 bps (2.50%) scrap: ceil(10 * 250 / 10000) = ceil(0.25) = 1 scrap unit
        // Fixed scrap: 2 units -> Total scrap = 3, Gross = 13
        const result = calculateComponentGrossRequirement(10, 250, 2);
        expect(result.netQuantity).toBe(10);
        expect(result.scrapQuantity).toBe(3);
        expect(result.grossQuantity).toBe(13);
      });

      it('handles zero scrap baseline', () => {
        const result = calculateComponentGrossRequirement(50, 0, 0);
        expect(result.scrapQuantity).toBe(0);
        expect(result.grossQuantity).toBe(50);
      });

      it('rejects invalid non-positive net quantities or out-of-range scrap rates', () => {
        expect(() => calculateComponentGrossRequirement(0, 500)).toThrow(ManufacturingDomainError);
        expect(() => calculateComponentGrossRequirement(10, 15000)).toThrow(ManufacturingDomainError);
        expect(() => calculateComponentGrossRequirement(10, 100, -1)).toThrow(ManufacturingDomainError);
      });
    });

    describe('explodeBillOfMaterials', () => {
      it('recursively explodes multi-level BOM with scrap accumulation', () => {
        // Drone Assembly (1) -> Motor Pack (4) [sub-assembly] -> Copper Coil (2) [raw material]
        //                     -> Carbon Frame (1) [raw material]
        const boms: Record<
          string,
          { output_quantity: number; lines: { component_variant_id: string; quantity: number; scrap_percentage_basis_points?: number; fixed_scrap_quantity?: number }[] }
        > = {
          var_drone: {
            output_quantity: 1,
            lines: [
              { component_variant_id: 'var_motor_pack', quantity: 4 },
              { component_variant_id: 'var_frame', quantity: 1 },
            ],
          },
          var_motor_pack: {
            output_quantity: 1,
            lines: [
              { component_variant_id: 'var_copper_coil', quantity: 2, scrap_percentage_basis_points: 500 }, // 5% scrap
            ],
          },
        };

        const resolver = (vId: string) => boms[vId] || null;

        // Explode for 5 Drones
        const explosion = explodeBillOfMaterials('var_drone', 5, resolver);

        // Level 1: 20 Motor Packs, 5 Frames
        // Level 2: 20 Motor Packs * 2 Coils = 40 net Coils + ceil(40 * 500 / 10000 = 2) scrap = 42 gross Coils
        expect(explosion).toHaveLength(3);

        const motorPack = explosion.find((i) => i.variant_id === 'var_motor_pack');
        expect(motorPack).toBeDefined();
        expect(motorPack?.level).toBe(1);
        expect(motorPack?.total_quantity).toBe(20);
        expect(motorPack?.is_subassembly).toBe(true);

        const frame = explosion.find((i) => i.variant_id === 'var_frame');
        expect(frame).toBeDefined();
        expect(frame?.level).toBe(1);
        expect(frame?.total_quantity).toBe(5);
        expect(frame?.is_subassembly).toBe(false);

        const coil = explosion.find((i) => i.variant_id === 'var_copper_coil');
        expect(coil).toBeDefined();
        expect(coil?.level).toBe(2);
        expect(coil?.total_quantity).toBe(40);
        expect(coil?.scrap_quantity).toBe(2);
        expect(coil?.gross_quantity).toBe(42);
        expect(coil?.is_subassembly).toBe(false);
      });
    });
  });

  describe('Phase 5B & 5C: Work Center Durations & Rate Costing', () => {
    it('calculates efficiency-adjusted durations and integer minor hourly costing', () => {
      // 10 units to produce.
      // Setup: 15 min, Run: 10 min/unit (100 min), Teardown: 5 min -> Standard: 120 minutes (2.0 hours)
      // Efficiency: 8000 bps (80.00%) -> Actual duration = ceil(120 * 10000 / 8000) = 150 minutes (2.5 hours)
      // Labor Rate: 3,000 minor/hr ($30.00/hr) -> 150 * 3000 / 60 = 7,500 minor ($75.00)
      // Machine Rate: 1,800 minor/hr ($18.00/hr) -> 150 * 1800 / 60 = 4,500 minor ($45.00)
      // Overhead Rate: 600 minor/hr ($6.00/hr) -> 150 * 600 / 60 = 1,500 minor ($15.00)
      // Total Operation Cost: 7500 + 4500 + 1500 = 13,500 minor ($135.00)
      const costResult = calculateOperationDurationAndCosts({
        setupTimeMinutes: 15,
        runTimeMinutesPerUnit: 10,
        teardownTimeMinutes: 5,
        unitsToProduce: 10,
        efficiencyBasisPoints: 8000,
        hourlyLaborRateMinor: 3000n,
        hourlyMachineRateMinor: 1800n,
        hourlyOverheadRateMinor: 600n,
      });

      expect(costResult.standardDurationMinutes).toBe(120);
      expect(costResult.actualDurationMinutes).toBe(150);
      expect(costResult.laborCostMinor).toBe(7500n);
      expect(costResult.machineCostMinor).toBe(4500n);
      expect(costResult.overheadCostMinor).toBe(1500n);
      expect(costResult.totalOperationCostMinor).toBe(13500n);
    });
  });

  describe('Phase 5D: Manufacturing Order Lifecycle State Machine', () => {
    it('validates compliant MO state transitions', () => {
      expect(() => assertValidMoStatusTransition('DRAFT', 'CONFIRMED')).not.toThrow();
      expect(() => assertValidMoStatusTransition('CONFIRMED', 'PLANNED')).not.toThrow();
      expect(() => assertValidMoStatusTransition('PLANNED', 'IN_PROGRESS')).not.toThrow();
      expect(() => assertValidMoStatusTransition('IN_PROGRESS', 'INSPECTION')).not.toThrow();
      expect(() => assertValidMoStatusTransition('INSPECTION', 'COMPLETED')).not.toThrow();
      expect(() => assertValidMoStatusTransition('COMPLETED', 'CLOSED')).not.toThrow();
    });

    it('rejects invalid transitions', () => {
      expect(() => assertValidMoStatusTransition('DRAFT', 'COMPLETED')).toThrow(
        InvalidMoStatusTransitionDomainError,
      );
      expect(() => assertValidMoStatusTransition('CLOSED', 'IN_PROGRESS')).toThrow(
        InvalidMoStatusTransitionDomainError,
      );
    });
  });

  describe('Phase 5E: Finished Goods Cost Reconciliation', () => {
    it('calculates total manufacturing costs and per-unit production costs with byproduct credit', () => {
      // 10 units produced
      // Materials: 50,000 minor ($500.00)
      // Labor: 12,000 minor ($120.00)
      // Machine: 6,000 minor ($60.00)
      // Overhead: 2,000 minor ($20.00)
      // Byproduct credit: 5,000 minor ($50.00) (e.g. saleable aluminum scrap byproduct)
      // Net Cost: 50000 + 12000 + 6000 + 2000 - 5000 = 65,000 minor ($650.00)
      // Unit Cost: 65,000 / 10 = 6,500 minor ($65.00 per unit)
      const unitCostResult = calculateFinishedGoodsUnitCost({
        materialCostMinor: 50000n,
        laborCostMinor: 12000n,
        machineCostMinor: 6000n,
        overheadCostMinor: 2000n,
        producedQuantity: 10,
        byproductCreditMinor: 5000n,
      });

      expect(unitCostResult.totalMaterialCostMinor).toBe(50000n);
      expect(unitCostResult.totalConversionCostMinor).toBe(20000n);
      expect(unitCostResult.grossProductionCostMinor).toBe(70000n);
      expect(unitCostResult.netProductionCostMinor).toBe(65000n);
      expect(unitCostResult.unitProductionCostMinor).toBe(6500n);
    });
  });

  describe('Phase 5F: Output Classification & Quality Gate', () => {
    it('validates conservation of classified output (accepted + quarantined + rejected = inspected)', () => {
      expect(() =>
        assertValidOutputClassification({
          inspectedQuantity: 100,
          acceptedQuantity: 85,
          quarantinedQuantity: 10,
          rejectedQuantity: 5,
        }),
      ).not.toThrow();
    });

    it('rejects output classification when quantities do not match inspected amount', () => {
      expect(() =>
        assertValidOutputClassification({
          inspectedQuantity: 100,
          acceptedQuantity: 80,
          quarantinedQuantity: 10,
          rejectedQuantity: 5, // Sum = 95 != 100
        }),
      ).toThrow(ManufacturingDomainError);
    });

    it('rejects negative or zero inspection amounts', () => {
      expect(() =>
        assertValidOutputClassification({
          inspectedQuantity: 0,
          acceptedQuantity: 0,
        }),
      ).toThrow(ManufacturingDomainError);

      expect(() =>
        assertValidOutputClassification({
          inspectedQuantity: 50,
          acceptedQuantity: 60,
          rejectedQuantity: -10,
        }),
      ).toThrow(ManufacturingDomainError);
    });
  });

  describe('Phase 5G: Material Shortage Analysis', () => {
    it('accurately identifies shortages against Available-to-Promise (ATP)', () => {
      // Required: 20, On-hand: 30, Reserved: 15 -> ATP = 15 -> Shortage = 5
      const res = evaluateComponentShortage({
        variantId: 'var_motor',
        requiredQuantity: 20,
        onHandQuantity: 30,
        reservedQuantity: 15,
      });

      expect(res.availableToPromise).toBe(15);
      expect(res.shortageQuantity).toBe(5);
      expect(res.isShortage).toBe(true);
    });

    it('identifies zero shortage when ATP covers requirements', () => {
      // Required: 10, On-hand: 50, Reserved: 20 -> ATP = 30 -> Shortage = 0
      const res = evaluateComponentShortage({
        variantId: 'var_chassis',
        requiredQuantity: 10,
        onHandQuantity: 50,
        reservedQuantity: 20,
      });

      expect(res.availableToPromise).toBe(30);
      expect(res.shortageQuantity).toBe(0);
      expect(res.isShortage).toBe(false);
    });
  });

  describe('Phase 5H: Partial Production Yield & Remaining Balance', () => {
    it('tracks partial production runs, cumulative output, and remaining target', () => {
      // Planned: 100 units.
      // Run 1: Produced 35 good, 2 scrap
      const run1 = calculatePartialProductionYield({
        plannedQuantity: 100,
        previouslyProducedQuantity: 0,
        previouslyScrappedQuantity: 0,
        runGoodQuantity: 35,
        runScrappedQuantity: 2,
      });
      expect(run1.totalGoodQuantity).toBe(35);
      expect(run1.totalScrappedQuantity).toBe(2);
      expect(run1.remainingQuantity).toBe(65);
      expect(run1.isFullyProduced).toBe(false);

      // Run 2: Produced 40 good, 1 scrap
      const run2 = calculatePartialProductionYield({
        plannedQuantity: 100,
        previouslyProducedQuantity: run1.totalGoodQuantity,
        previouslyScrappedQuantity: run1.totalScrappedQuantity,
        runGoodQuantity: 40,
        runScrappedQuantity: 1,
      });
      expect(run2.totalGoodQuantity).toBe(75);
      expect(run2.totalScrappedQuantity).toBe(3);
      expect(run2.remainingQuantity).toBe(25);
      expect(run2.isFullyProduced).toBe(false);

      // Run 3: Produced final 25 good
      const run3 = calculatePartialProductionYield({
        plannedQuantity: 100,
        previouslyProducedQuantity: run2.totalGoodQuantity,
        previouslyScrappedQuantity: run2.totalScrappedQuantity,
        runGoodQuantity: 25,
      });
      expect(run3.totalGoodQuantity).toBe(100);
      expect(run3.remainingQuantity).toBe(0);
      expect(run3.isFullyProduced).toBe(true);
    });
  });

  describe('Phase 5I: Component Substitution Validation', () => {
    it('allows valid distinct component substitution with positive quantity', () => {
      expect(() =>
        assertValidComponentSubstitution('var_brass_screw', 'var_steel_screw', 50),
      ).not.toThrow();
    });

    it('rejects self-substitution or invalid non-positive quantities', () => {
      expect(() =>
        assertValidComponentSubstitution('var_same', 'var_same', 10),
      ).toThrow(ManufacturingDomainError);

      expect(() =>
        assertValidComponentSubstitution('var_A', 'var_B', 0),
      ).toThrow(ManufacturingDomainError);
    });
  });
});
