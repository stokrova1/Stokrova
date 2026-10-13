import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { ReplenishmentService } from './replenishment.service.js';
import { ReplenishmentController } from './replenishment.controller.js';

describe('Multi-Echelon Replenishment, Safety Stock & Reorder Engine (Phase 8)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let replenishmentService: ReplenishmentService;
  let controller: ReplenishmentController;

  let tenant1Id: string;
  let branch1Id: string;
  let tenant2Id: string;
  let wh1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    replenishmentService = new ReplenishmentService(warehousesService);
    controller = new ReplenishmentController(replenishmentService);

    // Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Nordic Logistics Group',
        slug: 'nordic-logistics',
        owner_email: 'ops@nordic.com',
        owner_full_name: 'Nordic Director',
        default_currency: 'EUR',
      },
      'usr_nordic_1',
    );
    tenant1Id = t1.tenant.id;
    branch1Id = t1.default_branch.id;

    // Tenant 2
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Baltic Supply Corp',
        slug: 'baltic-supply',
        owner_email: 'lead@baltic.com',
        owner_full_name: 'Baltic Lead',
        default_currency: 'USD',
      },
      'usr_baltic_1',
    );
    tenant2Id = t2.tenant.id;

    // Warehouse in Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-MAIN-CDC',
      name: 'Central Distribution Center',
    });
    wh1Id = wh1.id;
  });

  // ==========================================================================
  // 1. Replenishment Rule Management
  // ==========================================================================
  describe('Replenishment Rule Management', () => {
    it('creates, updates, retrieves and lists replenishment rules', async () => {
      // 1. Create rule
      const created = await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_sku_101',
        sku: 'SKU-WIDGET-PRO',
        strategy: 'REORDER_POINT_SAFETY_STOCK',
        min_quantity: 20,
        max_quantity: 200,
        safety_stock: 30,
        reorder_point: 60,
        lead_time_days: 5,
        order_multiple: 12,
        min_order_quantity: 24,
        primary_vendor_id: 'vend_alpha_1',
        preferred_sourcing: 'PURCHASE_ORDER',
      });

      expect(created.rule.id).toBeDefined();
      expect(created.rule.sku).toBe('SKU-WIDGET-PRO');
      expect(created.rule.order_multiple).toBe(12);
      const ruleId = created.rule.id;

      // 2. Reject duplicate rule for same variant in same warehouse
      await expect(
        replenishmentService.createRule(tenant1Id, {
          warehouse_id: wh1Id,
          variant_id: 'var_sku_101',
          sku: 'SKU-WIDGET-PRO',
          min_quantity: 10,
          max_quantity: 100,
        }),
      ).rejects.toThrow(BadRequestException);

      // 3. Update rule
      const updated = await replenishmentService.updateRule(tenant1Id, ruleId, {
        safety_stock: 40,
        reorder_point: 75,
      });
      expect(updated.rule.safety_stock).toBe(40);
      expect(updated.rule.reorder_point).toBe(75);

      // 4. List rules
      const list = await replenishmentService.listRules(tenant1Id, wh1Id);
      expect(list.rules.length).toBe(1);
      expect(list.rules[0]?.id).toBe(ruleId);
    });

    it('enforces multi-tenant isolation on rules', async () => {
      const created = await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_iso',
        sku: 'SKU-ISO',
        min_quantity: 10,
        max_quantity: 50,
      });

      // Tenant 2 cannot access Tenant 1's rule
      await expect(
        replenishmentService.getRuleById(tenant2Id, created.rule.id),
      ).rejects.toThrow(NotFoundException);

      await expect(
        replenishmentService.listRules(tenant2Id, wh1Id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // 2. Evaluation & Reorder Generation
  // ==========================================================================
  describe('Stock Health & Replenishment Evaluation', () => {
    it('evaluates healthy inventory and does not generate recommendations', async () => {
      await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_healthy',
        sku: 'SKU-HEALTHY',
        min_quantity: 20,
        max_quantity: 200,
        reorder_point: 50,
      });

      // Set mock stock: on_hand = 100 > ROP (50)
      replenishmentService.setMockStock(tenant1Id, wh1Id, 'var_healthy', {
        on_hand: 100,
        on_order: 0,
        in_transit: 0,
        allocated: 10,
        backordered: 0,
      });

      const evalRes = await replenishmentService.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });

      expect(evalRes.stock_positions.length).toBe(1);
      expect(evalRes.stock_positions[0]?.health_status).toBe('HEALTHY');
      expect(evalRes.stock_positions[0]?.net_position).toBe(90);
      expect(evalRes.recommendations.length).toBe(0);
    });

    it('triggers reorder recommendation with pack size rounding when below ROP', async () => {
      await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_reorder',
        sku: 'SKU-REORDER',
        min_quantity: 20,
        max_quantity: 200,
        reorder_point: 60,
        order_multiple: 12,
        min_order_quantity: 24,
      });

      // Net stock: 40 on_hand - 0 = 40 <= ROP (60)
      // Deficit: 200 - 40 = 160 -> ceil(160 / 12) * 12 = 14 * 12 = 168
      replenishmentService.setMockStock(tenant1Id, wh1Id, 'var_reorder', {
        on_hand: 40,
        on_order: 0,
        in_transit: 0,
        allocated: 0,
        backordered: 0,
      });

      const evalRes = await replenishmentService.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });

      expect(evalRes.stock_positions[0]?.health_status).toBe('REORDER_TRIGGERED');
      expect(evalRes.recommendations.length).toBe(1);
      expect(evalRes.recommendations[0]?.recommended_quantity).toBe(168);
      expect(evalRes.recommendations[0]?.status).toBe('PROPOSED');
    });

    it('handles CRITICAL_STOCKOUT with negative stock position', async () => {
      await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_critical',
        sku: 'SKU-CRITICAL',
        min_quantity: 20,
        max_quantity: 200,
        reorder_point: 50,
        order_multiple: 10,
      });

      // On hand 5, allocated 25 -> Net = -20
      // Deficit = 200 - (-20) = 220 -> ceil(220 / 10) * 10 = 220
      replenishmentService.setMockStock(tenant1Id, wh1Id, 'var_critical', {
        on_hand: 5,
        on_order: 0,
        in_transit: 0,
        allocated: 25,
        backordered: 0,
      });

      const evalRes = await replenishmentService.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });

      expect(evalRes.stock_positions[0]?.health_status).toBe('CRITICAL_STOCKOUT');
      expect(evalRes.recommendations[0]?.recommended_quantity).toBe(220);
    });
  });

  // ==========================================================================
  // 3. Recommendation Approval & Conversion Workflow
  // ==========================================================================
  describe('Recommendation Workflow & Conversion', () => {
    it('approves and converts recommendation to purchase order', async () => {
      await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_flow',
        sku: 'SKU-FLOW',
        min_quantity: 10,
        max_quantity: 100,
        reorder_point: 30,
        preferred_sourcing: 'PURCHASE_ORDER',
      });

      replenishmentService.setMockStock(tenant1Id, wh1Id, 'var_flow', {
        on_hand: 15,
        on_order: 0,
        in_transit: 0,
        allocated: 0,
        backordered: 0,
      });

      const evalRes = await replenishmentService.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });
      const recId = evalRes.recommendations[0]!.id;

      // 1. Approve recommendation with override quantity
      const approved = await replenishmentService.approveRecommendation(tenant1Id, recId, {
        override_quantity: 90,
        approved_by: 'usr_inventory_planner_1',
      });
      expect(approved.recommendation.status).toBe('APPROVED');
      expect(approved.recommendation.recommended_quantity).toBe(90);
      expect(approved.recommendation.approved_by).toBe('usr_inventory_planner_1');

      // 2. Convert recommendation
      const converted = await replenishmentService.convertRecommendation(tenant1Id, recId, {
        operator_id: 'usr_buyer_1',
      });
      expect(converted.recommendation.status).toBe('CONVERTED');
      expect(converted.recommendation.generated_order_id).toMatch(/^po_/);
    });

    it('rejects proposed recommendation', async () => {
      await replenishmentService.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_reject',
        sku: 'SKU-REJECT',
        min_quantity: 10,
        max_quantity: 50,
        reorder_point: 20,
      });

      replenishmentService.setMockStock(tenant1Id, wh1Id, 'var_reject', {
        on_hand: 10,
        on_order: 0,
        in_transit: 0,
        allocated: 0,
        backordered: 0,
      });

      const evalRes = await replenishmentService.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });
      const recId = evalRes.recommendations[0]!.id;

      const rejected = await replenishmentService.rejectRecommendation(tenant1Id, recId);
      expect(rejected.recommendation.status).toBe('REJECTED');

      // Cannot convert rejected recommendation
      await expect(
        replenishmentService.convertRecommendation(tenant1Id, recId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 4. ReplenishmentController Endpoints
  // ==========================================================================
  describe('ReplenishmentController Endpoints', () => {
    it('creates rules and evaluates replenishment via controller', async () => {
      const ruleRes = await controller.createRule(tenant1Id, {
        warehouse_id: wh1Id,
        variant_id: 'var_ctrl_sku',
        sku: 'SKU-CTRL',
        min_quantity: 15,
        max_quantity: 120,
      });

      expect(ruleRes.rule.id).toBeDefined();

      const listRes = await controller.listRules(tenant1Id, wh1Id);
      expect(listRes.rules.length).toBeGreaterThan(0);

      const evalRes = await controller.evaluateReplenishment(tenant1Id, {
        warehouse_id: wh1Id,
      });
      expect(evalRes.stock_positions.length).toBeGreaterThan(0);
    });
  });
});
