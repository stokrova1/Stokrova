import { describe, it, expect } from 'vitest';
import {
  calculateNetStockPosition,
  classifyStockHealth,
  calculateReorderPoint,
  calculateDynamicSafetyStock,
  calculateRecommendedReorderQuantity,
  assertRecommendationTransition,
  ReplenishmentDomainError,
} from '../src/replenishment.js';

describe('Replenishment, Safety Stock & Reorder Domain Engine (Phase 8)', () => {
  // ==========================================================================
  // 1. Net Stock Position Calculation
  // ==========================================================================
  describe('calculateNetStockPosition', () => {
    it('calculates net stock position accurately', () => {
      // OnHand(100) + OnOrder(50) + InTransit(20) - Allocated(30) - Backordered(10) = 130
      const net = calculateNetStockPosition({
        on_hand: 100,
        on_order: 50,
        in_transit: 20,
        allocated: 30,
        backordered: 10,
      });
      expect(net).toBe(130);
    });

    it('returns negative value when demand commitments exceed supply', () => {
      const net = calculateNetStockPosition({
        on_hand: 10,
        on_order: 0,
        in_transit: 0,
        allocated: 15,
        backordered: 5,
      });
      expect(net).toBe(-10);
    });
  });

  // ==========================================================================
  // 2. Stock Health Status Classification
  // ==========================================================================
  describe('classifyStockHealth', () => {
    const safetyStock = 20;
    const reorderPoint = 50;
    const maxBuffer = 200;

    it('classifies non-positive net stock as CRITICAL_STOCKOUT', () => {
      expect(classifyStockHealth(0, safetyStock, reorderPoint, maxBuffer)).toBe(
        'CRITICAL_STOCKOUT',
      );
      expect(classifyStockHealth(-5, safetyStock, reorderPoint, maxBuffer)).toBe(
        'CRITICAL_STOCKOUT',
      );
    });

    it('classifies stock at or below ROP as REORDER_TRIGGERED', () => {
      expect(classifyStockHealth(50, safetyStock, reorderPoint, maxBuffer)).toBe(
        'REORDER_TRIGGERED',
      );
      expect(classifyStockHealth(30, safetyStock, reorderPoint, maxBuffer)).toBe(
        'REORDER_TRIGGERED',
      );
    });

    it('classifies stock between ROP and max buffer as HEALTHY', () => {
      expect(classifyStockHealth(51, safetyStock, reorderPoint, maxBuffer)).toBe(
        'HEALTHY',
      );
      expect(classifyStockHealth(150, safetyStock, reorderPoint, maxBuffer)).toBe(
        'HEALTHY',
      );
      expect(classifyStockHealth(200, safetyStock, reorderPoint, maxBuffer)).toBe(
        'HEALTHY',
      );
    });

    it('classifies stock above max buffer as OVERSTOCKED', () => {
      expect(classifyStockHealth(201, safetyStock, reorderPoint, maxBuffer)).toBe(
        'OVERSTOCKED',
      );
      expect(classifyStockHealth(500, safetyStock, reorderPoint, maxBuffer)).toBe(
        'OVERSTOCKED',
      );
    });
  });

  // ==========================================================================
  // 3. Dynamic Reorder Point (ROP) & Safety Stock
  // ==========================================================================
  describe('calculateReorderPoint', () => {
    it('calculates standard reorder point', () => {
      // LeadTime(5 days) * AvgDemand(10/day) + SafetyStock(25) = 75
      const rop = calculateReorderPoint(5, 10, 25);
      expect(rop).toBe(75);
    });

    it('rejects negative parameters', () => {
      expect(() => calculateReorderPoint(-1, 10, 25)).toThrow(
        ReplenishmentDomainError,
      );
      expect(() => calculateReorderPoint(5, -1, 25)).toThrow(
        ReplenishmentDomainError,
      );
      expect(() => calculateReorderPoint(5, 10, -5)).toThrow(
        ReplenishmentDomainError,
      );
    });
  });

  describe('calculateDynamicSafetyStock', () => {
    it('calculates variance-based safety stock', () => {
      const ss = calculateDynamicSafetyStock({
        service_level_factor_bp: 1650, // 95% service level
        lead_time_days: 7,
        lead_time_std_dev: 1,
        daily_demand_avg: 20,
        daily_demand_std_dev: 4,
      });
      expect(ss).toBeGreaterThan(0);
      expect(Number.isInteger(ss)).toBe(true);
    });

    it('returns 0 when service level factor is 0', () => {
      const ss = calculateDynamicSafetyStock({
        service_level_factor_bp: 0,
        lead_time_days: 7,
        lead_time_std_dev: 1,
        daily_demand_avg: 20,
        daily_demand_std_dev: 4,
      });
      expect(ss).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Recommended Reorder Quantity Optimization
  // ==========================================================================
  describe('calculateRecommendedReorderQuantity', () => {
    it('returns 0 when net stock position is above reorder point', () => {
      const qty = calculateRecommendedReorderQuantity({
        net_stock_position: 80,
        reorder_point: 50,
        max_quantity: 200,
      });
      expect(qty).toBe(0);
    });

    it('calculates replenishment to max buffer and rounds to pack size multiple', () => {
      // Net(40) <= ROP(50), Max(200) -> Deficit = 160. Pack size = 12.
      // 160 / 12 = 13.33 -> 14 * 12 = 168
      const qty = calculateRecommendedReorderQuantity({
        net_stock_position: 40,
        reorder_point: 50,
        max_quantity: 200,
        order_multiple: 12,
        min_order_quantity: 24,
      });
      expect(qty).toBe(168);
    });

    it('enforces Minimum Order Quantity (MOQ) constraint', () => {
      // Net(45) <= ROP(50), Max(50) -> Deficit = 5. MOQ = 100.
      const qty = calculateRecommendedReorderQuantity({
        net_stock_position: 45,
        reorder_point: 50,
        max_quantity: 50,
        order_multiple: 1,
        min_order_quantity: 100,
      });
      expect(qty).toBe(100);
    });
  });

  // ==========================================================================
  // 5. Recommendation State Machine Transitions
  // ==========================================================================
  describe('assertRecommendationTransition', () => {
    it('allows valid state progression: PROPOSED -> APPROVED -> CONVERTED', () => {
      expect(() =>
        assertRecommendationTransition('PROPOSED', 'APPROVED'),
      ).not.toThrow();
      expect(() =>
        assertRecommendationTransition('APPROVED', 'CONVERTED'),
      ).not.toThrow();
    });

    it('allows rejection and cancellation from valid states', () => {
      expect(() =>
        assertRecommendationTransition('PROPOSED', 'REJECTED'),
      ).not.toThrow();
      expect(() =>
        assertRecommendationTransition('PROPOSED', 'CANCELLED'),
      ).not.toThrow();
      expect(() =>
        assertRecommendationTransition('APPROVED', 'CANCELLED'),
      ).not.toThrow();
    });

    it('rejects illegal jumps or transitions from terminal states', () => {
      expect(() =>
        assertRecommendationTransition('PROPOSED', 'CONVERTED'),
      ).toThrow(ReplenishmentDomainError);
      expect(() =>
        assertRecommendationTransition('CONVERTED', 'APPROVED'),
      ).toThrow(ReplenishmentDomainError);
      expect(() =>
        assertRecommendationTransition('REJECTED', 'APPROVED'),
      ).toThrow(ReplenishmentDomainError);
    });
  });
});
