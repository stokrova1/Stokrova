import { describe, it, expect } from 'vitest';
import {
  normalizeSupplierCode,
  assertValidSupplierMoq,
  assertEligibleSupplierStatus,
  calculateSupplierDeliveryScore,
  assertValidPoStatusTransition,
  evaluatePoApprovalRequirement,
  calculatePurchaseOrderTotals,
  assertValidOverReceipt,
  assertValidInspectionQuantities,
  allocateLandedCosts,
  verifyThreeWayMatch,
  ProcurementDomainError,
  SupplierBlockedDomainError,
  SupplierInactiveDomainError,
  MoqViolationDomainError,
  OrderIncrementViolationDomainError,
  InvalidPoStatusTransitionDomainError,
  OverReceiptToleranceExceededDomainError,
  InspectionQuantitiesMismatchDomainError,
  LandedCostAllocationDomainError,
} from '../src/procurement.js';

describe('Procurement & Supplier Domain Engine (Phase 4)', () => {
  describe('Phase 4A: Suppliers & Vendor Rules', () => {
    describe('Supplier Code Normalization', () => {
      it('normalizes valid alphanumeric codes with hyphens', () => {
        expect(normalizeSupplierCode('  sup-acme-01  ')).toBe('SUP-ACME-01');
        expect(normalizeSupplierCode('VEND_999')).toBe('VEND_999');
      });

      it('rejects invalid or too short codes', () => {
        expect(() => normalizeSupplierCode('A')).toThrow(ProcurementDomainError);
        expect(() => normalizeSupplierCode('invalid code with spaces')).toThrow(ProcurementDomainError);
      });
    });

    describe('MOQ & Order Increment Validation', () => {
      it('passes when order quantity meets MOQ and order increment', () => {
        expect(() => assertValidSupplierMoq(10, 10, 5)).not.toThrow();
        expect(() => assertValidSupplierMoq(15, 10, 5)).not.toThrow();
        expect(() => assertValidSupplierMoq(25, 10, 5)).not.toThrow();
      });

      it('throws MoqViolationDomainError when order is below MOQ', () => {
        expect(() => assertValidSupplierMoq(8, 10, 1)).toThrow(MoqViolationDomainError);
      });

      it('throws OrderIncrementViolationDomainError when order violates pack increment', () => {
        expect(() => assertValidSupplierMoq(12, 10, 5)).toThrow(OrderIncrementViolationDomainError);
      });

      it('rejects non-positive order quantities', () => {
        expect(() => assertValidSupplierMoq(0, 10, 1)).toThrow(ProcurementDomainError);
        expect(() => assertValidSupplierMoq(-5, 10, 1)).toThrow(ProcurementDomainError);
      });
    });

    describe('Supplier Eligibility Status', () => {
      it('allows ACTIVE suppliers', () => {
        expect(() => assertEligibleSupplierStatus('Acme Corp', 'ACTIVE')).not.toThrow();
      });

      it('blocks purchasing from BLOCKED suppliers', () => {
        expect(() => assertEligibleSupplierStatus('Bad Vendor', 'BLOCKED')).toThrow(
          SupplierBlockedDomainError,
        );
      });

      it('blocks purchasing from INACTIVE suppliers', () => {
        expect(() => assertEligibleSupplierStatus('Stale Vendor', 'INACTIVE')).toThrow(
          SupplierInactiveDomainError,
        );
      });
    });

    describe('Supplier Performance Score Calculation', () => {
      it('calculates on-time delivery rate in basis points', () => {
        expect(calculateSupplierDeliveryScore(95, 100)).toBe(9500);
        expect(calculateSupplierDeliveryScore(4, 5)).toBe(8000);
      });

      it('returns baseline 10000 for brand new suppliers with 0 deliveries', () => {
        expect(calculateSupplierDeliveryScore(0, 0)).toBe(10000);
      });

      it('rejects invalid parameters', () => {
        expect(() => calculateSupplierDeliveryScore(12, 10)).toThrow(ProcurementDomainError);
        expect(() => calculateSupplierDeliveryScore(-1, 10)).toThrow(ProcurementDomainError);
      });
    });
  });

  describe('Phase 4B: Purchase Order Lifecycle & Totals', () => {
    describe('assertValidPoStatusTransition', () => {
      it('allows valid lifecycle transitions', () => {
        expect(() => assertValidPoStatusTransition('DRAFT', 'PENDING_APPROVAL')).not.toThrow();
        expect(() => assertValidPoStatusTransition('PENDING_APPROVAL', 'APPROVED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('APPROVED', 'ISSUED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('ISSUED', 'PARTIALLY_RECEIVED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('PARTIALLY_RECEIVED', 'RECEIVED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('RECEIVED', 'CLOSED')).not.toThrow();
      });

      it('allows cancellation from unfulfilled states', () => {
        expect(() => assertValidPoStatusTransition('DRAFT', 'CANCELLED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('PENDING_APPROVAL', 'CANCELLED')).not.toThrow();
        expect(() => assertValidPoStatusTransition('ISSUED', 'CANCELLED')).not.toThrow();
      });

      it('rejects invalid transitions', () => {
        expect(() => assertValidPoStatusTransition('DRAFT', 'RECEIVED')).toThrow(
          InvalidPoStatusTransitionDomainError,
        );
        expect(() => assertValidPoStatusTransition('CLOSED', 'DRAFT')).toThrow(
          InvalidPoStatusTransitionDomainError,
        );
        expect(() => assertValidPoStatusTransition('CANCELLED', 'APPROVED')).toThrow(
          InvalidPoStatusTransitionDomainError,
        );
      });
    });

    describe('evaluatePoApprovalRequirement', () => {
      it('evaluates threshold tiers correctly', () => {
        // <= $5,000 (500000 minor)
        expect(evaluatePoApprovalRequirement(250000n)).toEqual({ requiresApproval: false, tier: 'AUTO' });
        expect(evaluatePoApprovalRequirement(500000n)).toEqual({ requiresApproval: false, tier: 'AUTO' });

        // $5,001 to $50,000
        expect(evaluatePoApprovalRequirement(500001n)).toEqual({ requiresApproval: true, tier: 'MANAGER' });
        expect(evaluatePoApprovalRequirement(5000000n)).toEqual({ requiresApproval: true, tier: 'MANAGER' });

        // > $50,000
        expect(evaluatePoApprovalRequirement(5000001n)).toEqual({ requiresApproval: true, tier: 'EXECUTIVE' });
        expect(evaluatePoApprovalRequirement(15000000n)).toEqual({ requiresApproval: true, tier: 'EXECUTIVE' });
      });
    });

    describe('calculatePurchaseOrderTotals', () => {
      it('calculates line subtotals, tax, and order totals accurately with zero floating point', () => {
        const lines = [
          { quantity: 10, unit_cost_minor: 1000n, tax_rate_basis_points: 1000 }, // subtotal 10000, tax 1000, total 11000
          { quantity: 5, unit_cost_minor: 2000n, tax_rate_basis_points: 500 },   // subtotal 10000, tax 500, total 10500
        ];
        const result = calculatePurchaseOrderTotals(lines, 500n); // discount 500

        expect(result.subtotal_minor).toBe(20000n);
        expect(result.tax_minor).toBe(1500n);
        expect(result.discount_minor).toBe(500n);
        expect(result.total_minor).toBe(21000n); // 20000 + 1500 - 500
        expect(result.lines).toHaveLength(2);
        expect(result.lines[0]?.line_total_minor).toBe(11000n);
        expect(result.lines[1]?.line_total_minor).toBe(10500n);
      });

      it('rejects invalid negative discount or quantity', () => {
        expect(() => calculatePurchaseOrderTotals([{ quantity: 0, unit_cost_minor: 1000n }])).toThrow(
          ProcurementDomainError,
        );
        expect(() => calculatePurchaseOrderTotals([{ quantity: 2, unit_cost_minor: 1000n }], -100n)).toThrow(
          ProcurementDomainError,
        );
      });
    });
  });

  describe('Phase 4C: Goods Receiving & Quarantine', () => {
    describe('assertValidOverReceipt', () => {
      it('allows receipts within tolerance', () => {
        // Ordered 100, tolerance 500 bps (5%) -> max allowed 105
        expect(() => assertValidOverReceipt(100, 0, 100, 500)).not.toThrow();
        expect(() => assertValidOverReceipt(100, 50, 55, 500)).not.toThrow(); // total 105
      });

      it('rejects over-receipt beyond tolerance', () => {
        // Ordered 100, tolerance 5% -> total 106 exceeds max 105
        expect(() => assertValidOverReceipt(100, 0, 106, 500)).toThrow(
          OverReceiptToleranceExceededDomainError,
        );
      });

      it('rejects non-positive receipt quantity', () => {
        expect(() => assertValidOverReceipt(100, 0, 0)).toThrow(ProcurementDomainError);
      });
    });

    describe('assertValidInspectionQuantities', () => {
      it('passes when received equals sum of accepted, quarantined, and rejected', () => {
        expect(() => assertValidInspectionQuantities(100, 90, 8, 2)).not.toThrow();
        expect(() => assertValidInspectionQuantities(50, 50, 0, 0)).not.toThrow();
      });

      it('throws InspectionQuantitiesMismatchDomainError when sum does not match', () => {
        expect(() => assertValidInspectionQuantities(100, 90, 5, 2)).toThrow(
          InspectionQuantitiesMismatchDomainError,
        );
      });

      it('rejects negative quantities', () => {
        expect(() => assertValidInspectionQuantities(100, -10, 110, 0)).toThrow(
          ProcurementDomainError,
        );
      });
    });
  });

  describe('Phase 4D: Landed Cost Allocation Engine', () => {
    it('allocates landed cost charges by value with exact integer cent conservation', () => {
      const lines = [
        {
          goods_receipt_line_id: 'grn-1',
          variant_id: 'var-1',
          received_quantity: 10,
          original_line_cost_minor: 10000n, // $100.00 (1/3 of total value)
        },
        {
          goods_receipt_line_id: 'grn-2',
          variant_id: 'var-2',
          received_quantity: 20,
          original_line_cost_minor: 20000n, // $200.00 (2/3 of total value)
        },
      ];
      // Total charges = 1000 minor ($10.00)
      const results = allocateLandedCosts('BY_VALUE', 1000n, lines);

      expect(results).toHaveLength(2);
      // 1000 / 3 = 333 remainder 1. Line 1 remainder: 10000 * 1000 % 30000 = 10000. Line 2 remainder: 20000.
      // Line 2 gets remainder 1 cent: 667 cents. Line 1: 333 cents.
      const sumAllocated = results.reduce((acc, r) => acc + r.allocated_charge_minor, 0n);
      expect(sumAllocated).toBe(1000n); // 100% exact integer conservation!

      expect(results[0]?.allocated_charge_minor).toBe(333n);
      expect(results[1]?.allocated_charge_minor).toBe(667n);

      expect(results[0]?.final_line_cost_minor).toBe(10333n);
      expect(results[1]?.final_line_cost_minor).toBe(20667n);
    });

    it('allocates landed cost charges by quantity', () => {
      const lines = [
        {
          goods_receipt_line_id: 'grn-1',
          variant_id: 'var-1',
          received_quantity: 3,
          original_line_cost_minor: 3000n,
        },
        {
          goods_receipt_line_id: 'grn-2',
          variant_id: 'var-2',
          received_quantity: 7,
          original_line_cost_minor: 7000n,
        },
      ];
      const results = allocateLandedCosts('BY_QUANTITY', 500n, lines);
      const sumAllocated = results.reduce((acc, r) => acc + r.allocated_charge_minor, 0n);
      expect(sumAllocated).toBe(500n);
      expect(results[0]?.allocated_charge_minor).toBe(150n); // 3/10 of 500
      expect(results[1]?.allocated_charge_minor).toBe(350n); // 7/10 of 500
    });

    it('handles zero charges cleanly without modifying line costs', () => {
      const lines = [
        {
          goods_receipt_line_id: 'grn-1',
          variant_id: 'var-1',
          received_quantity: 5,
          original_line_cost_minor: 5000n,
        },
      ];
      const results = allocateLandedCosts('BY_VALUE', 0n, lines);
      expect(results[0]?.allocated_charge_minor).toBe(0n);
      expect(results[0]?.final_line_cost_minor).toBe(5000n);
      expect(results[0]?.unit_landed_cost_minor).toBe(1000n);
    });

    it('rejects allocation when zero lines provided', () => {
      expect(() => allocateLandedCosts('BY_VALUE', 100n, [])).toThrow(
        LandedCostAllocationDomainError,
      );
    });
  });

  describe('Phase 4E: 3-Way Matching Engine', () => {
    it('reports PERFECT_MATCH when all quantities and prices match exactly', () => {
      const matchResult = verifyThreeWayMatch([
        {
          po_quantity: 10,
          po_unit_cost_minor: 1500n,
          grn_accepted_quantity: 10,
          invoiced_quantity: 10,
          invoiced_unit_cost_minor: 1500n,
        },
      ]);

      expect(matchResult.match_status).toBe('PERFECT_MATCH');
      expect(matchResult.is_within_tolerance).toBe(true);
      expect(matchResult.price_variance_minor).toBe('0');
      expect(matchResult.quantity_variance).toBe(0);
      expect(matchResult.discrepancies).toHaveLength(0);
    });

    it('accepts match within price tolerance basis points', () => {
      // PO price 10,000 minor ($100.00), invoice price 10,050 minor ($100.50) -> 50 bp difference
      // Tolerance set to 100 bps (1.00%)
      const matchResult = verifyThreeWayMatch(
        [
          {
            po_quantity: 5,
            po_unit_cost_minor: 10000n,
            grn_accepted_quantity: 5,
            invoiced_quantity: 5,
            invoiced_unit_cost_minor: 10050n,
          },
        ],
        { tolerancePriceBasisPoints: 100 },
      );

      expect(matchResult.match_status).toBe('TOLERANCE_ACCEPTED');
      expect(matchResult.is_within_tolerance).toBe(true);
      expect(matchResult.price_variance_minor).toBe('250'); // 50 * 5
      expect(matchResult.discrepancies).toHaveLength(1);
    });

    it('flags DISCREPANCY_FLAGGED when price or quantity exceeds tolerance', () => {
      // Invoiced quantity 12 vs accepted 10 (over-billing by 2 units)
      const matchResult = verifyThreeWayMatch(
        [
          {
            po_quantity: 10,
            po_unit_cost_minor: 2000n,
            grn_accepted_quantity: 10,
            invoiced_quantity: 12,
            invoiced_unit_cost_minor: 2200n, // $22.00 vs $20.00 (10% hike)
          },
        ],
        { tolerancePriceBasisPoints: 200, toleranceQuantity: 0 },
      );

      expect(matchResult.match_status).toBe('DISCREPANCY_FLAGGED');
      expect(matchResult.is_within_tolerance).toBe(false);
      expect(matchResult.quantity_variance).toBe(2);
      expect(matchResult.discrepancies).toHaveLength(1);
    });
  });
});
