import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ReplenishmentRule,
  ReplenishmentRecommendation,
  StockPosition,
  ReplenishmentRuleResponse,
  ListReplenishmentRulesResponse,
  CreateReplenishmentRuleRequest,
  UpdateReplenishmentRuleRequest,
  EvaluateReplenishmentRequest,
  EvaluateReplenishmentResponse,
  ApproveRecommendationRequest,
  ConvertRecommendationRequest,
  RecommendationResponse,
  ListRecommendationsResponse,
} from '@stokrova/contracts';
import {
  CreateReplenishmentRuleSchema,
  UpdateReplenishmentRuleSchema,
  EvaluateReplenishmentSchema,
  ApproveRecommendationSchema,
  ConvertRecommendationSchema,
} from '@stokrova/validation';
import {
  calculateNetStockPosition,
  classifyStockHealth,
  calculateRecommendedReorderQuantity,
  assertRecommendationTransition,
  ReplenishmentDomainError,
  type DomainRecommendationStatus,
} from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';

@Injectable()
export class ReplenishmentService {
  private readonly rules = new Map<string, ReplenishmentRule>();
  private readonly recommendations = new Map<string, ReplenishmentRecommendation>();
  // In-memory mock inventory positions for demonstration / simulation
  private readonly stockLevels = new Map<string, { on_hand: number; on_order: number; in_transit: number; allocated: number; backordered: number }>();

  constructor(private readonly warehousesService: WarehousesService) {}

  async createRule(
    tenantId: string,
    req: CreateReplenishmentRuleRequest,
  ): Promise<ReplenishmentRuleResponse> {
    const parsed = CreateReplenishmentRuleSchema.parse(req);

    // 1. Verify warehouse belongs to tenant
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // 2. Check if rule for (warehouse, variant) already exists
    const existing = Array.from(this.rules.values()).find(
      (r) =>
        r.tenant_id === tenantId &&
        r.warehouse_id === parsed.warehouse_id &&
        r.variant_id === parsed.variant_id,
    );
    if (existing) {
      throw new BadRequestException(
        `Replenishment rule already exists for variant '${parsed.variant_id}' in warehouse '${parsed.warehouse_id}'.`,
      );
    }

    const now = new Date().toISOString();
    const rule: ReplenishmentRule = {
      id: `repl_rule_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      variant_id: parsed.variant_id,
      sku: parsed.sku,
      strategy: parsed.strategy ?? 'MIN_MAX',
      min_quantity: parsed.min_quantity,
      max_quantity: parsed.max_quantity,
      safety_stock: parsed.safety_stock ?? 0,
      reorder_point: parsed.reorder_point ?? parsed.min_quantity,
      lead_time_days: parsed.lead_time_days ?? 1,
      order_multiple: parsed.order_multiple ?? 1,
      min_order_quantity: parsed.min_order_quantity ?? 1,
      primary_vendor_id: parsed.primary_vendor_id ?? null,
      upstream_warehouse_id: parsed.upstream_warehouse_id ?? null,
      preferred_sourcing: parsed.preferred_sourcing ?? 'PURCHASE_ORDER',
      is_active: parsed.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    this.rules.set(rule.id, rule);
    return { rule };
  }

  async updateRule(
    tenantId: string,
    id: string,
    req: UpdateReplenishmentRuleRequest,
  ): Promise<ReplenishmentRuleResponse> {
    const parsed = UpdateReplenishmentRuleSchema.parse(req);
    const rule = await this.getRuleEntity(tenantId, id);

    const updated: ReplenishmentRule = {
      ...rule,
      strategy: parsed.strategy ?? rule.strategy,
      min_quantity: parsed.min_quantity ?? rule.min_quantity,
      max_quantity: parsed.max_quantity ?? rule.max_quantity,
      safety_stock: parsed.safety_stock ?? rule.safety_stock,
      reorder_point: parsed.reorder_point ?? rule.reorder_point,
      lead_time_days: parsed.lead_time_days ?? rule.lead_time_days,
      order_multiple: parsed.order_multiple ?? rule.order_multiple,
      min_order_quantity: parsed.min_order_quantity ?? rule.min_order_quantity,
      primary_vendor_id: parsed.primary_vendor_id ?? rule.primary_vendor_id,
      upstream_warehouse_id: parsed.upstream_warehouse_id ?? rule.upstream_warehouse_id,
      preferred_sourcing: parsed.preferred_sourcing ?? rule.preferred_sourcing,
      is_active: parsed.is_active ?? rule.is_active,
      updated_at: new Date().toISOString(),
    };

    this.rules.set(id, updated);
    return { rule: updated };
  }

  async getRuleById(
    tenantId: string,
    id: string,
  ): Promise<ReplenishmentRuleResponse> {
    const rule = await this.getRuleEntity(tenantId, id);
    return { rule };
  }

  async listRules(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListReplenishmentRulesResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const rules = Array.from(this.rules.values()).filter(
      (r) => r.tenant_id === tenantId && r.warehouse_id === warehouseId,
    );
    return { rules };
  }

  /**
   * Evaluates replenishment needs across inventory buffers.
   */
  async evaluateReplenishment(
    tenantId: string,
    req: EvaluateReplenishmentRequest,
  ): Promise<EvaluateReplenishmentResponse> {
    const parsed = EvaluateReplenishmentSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    let rules = Array.from(this.rules.values()).filter(
      (r) => r.tenant_id === tenantId && r.warehouse_id === parsed.warehouse_id && r.is_active,
    );

    if (parsed.variant_ids && parsed.variant_ids.length > 0) {
      const allowed = new Set(parsed.variant_ids);
      rules = rules.filter((r) => allowed.has(r.variant_id));
    }

    const stockPositions: StockPosition[] = [];
    const recommendations: ReplenishmentRecommendation[] = [];
    const now = new Date().toISOString();

    for (const rule of rules) {
      const key = `${tenantId}:${rule.warehouse_id}:${rule.variant_id}`;
      const stock = this.stockLevels.get(key) ?? {
        on_hand: 0,
        on_order: 0,
        in_transit: 0,
        allocated: 0,
        backordered: 0,
      };

      const netPosition = calculateNetStockPosition(stock);
      const healthStatus = classifyStockHealth(
        netPosition,
        rule.safety_stock,
        rule.reorder_point,
        rule.max_quantity,
      );

      stockPositions.push({
        warehouse_id: rule.warehouse_id,
        variant_id: rule.variant_id,
        sku: rule.sku,
        on_hand: stock.on_hand,
        on_order: stock.on_order,
        in_transit: stock.in_transit,
        allocated: stock.allocated,
        backordered: stock.backordered,
        net_position: netPosition,
        safety_stock: rule.safety_stock,
        reorder_point: rule.reorder_point,
        max_quantity: rule.max_quantity,
        health_status: healthStatus,
      });

      // If reorder is triggered or critical, compute optimal reorder quantity
      if (netPosition <= rule.reorder_point) {
        const recommendedQty = calculateRecommendedReorderQuantity({
          net_stock_position: netPosition,
          reorder_point: rule.reorder_point,
          max_quantity: rule.max_quantity,
          order_multiple: rule.order_multiple,
          min_order_quantity: rule.min_order_quantity,
        });

        if (recommendedQty > 0) {
          const rec: ReplenishmentRecommendation = {
            id: `rec_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
            tenant_id: tenantId,
            warehouse_id: rule.warehouse_id,
            variant_id: rule.variant_id,
            sku: rule.sku,
            rule_id: rule.id,
            net_stock_position: netPosition,
            reorder_point: rule.reorder_point,
            recommended_quantity: recommendedQty,
            sourcing_method: rule.preferred_sourcing,
            target_vendor_id: rule.primary_vendor_id,
            source_warehouse_id: rule.upstream_warehouse_id,
            estimated_cost_cents: 0,
            currency: 'USD',
            status: 'PROPOSED',
            generated_order_id: null,
            approved_by: null,
            approved_at: null,
            created_at: now,
            updated_at: now,
          };

          this.recommendations.set(rec.id, rec);
          recommendations.push(rec);
        }
      }
    }

    return { recommendations, stock_positions: stockPositions };
  }

  async approveRecommendation(
    tenantId: string,
    id: string,
    req: ApproveRecommendationRequest,
  ): Promise<RecommendationResponse> {
    const parsed = ApproveRecommendationSchema.parse(req);
    const rec = await this.getRecommendationEntity(tenantId, id);

    try {
      assertRecommendationTransition(
        rec.status as DomainRecommendationStatus,
        'APPROVED',
      );
    } catch (err: unknown) {
      if (err instanceof ReplenishmentDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: ReplenishmentRecommendation = {
      ...rec,
      status: 'APPROVED',
      recommended_quantity: parsed.override_quantity ?? rec.recommended_quantity,
      approved_by: parsed.approved_by ?? 'usr_planner_1',
      approved_at: now,
      updated_at: now,
    };

    this.recommendations.set(id, updated);
    return { recommendation: updated };
  }

  async convertRecommendation(
    tenantId: string,
    id: string,
    req: ConvertRecommendationRequest,
  ): Promise<RecommendationResponse> {
    ConvertRecommendationSchema.parse(req);
    const rec = await this.getRecommendationEntity(tenantId, id);

    try {
      assertRecommendationTransition(
        rec.status as DomainRecommendationStatus,
        'CONVERTED',
      );
    } catch (err: unknown) {
      if (err instanceof ReplenishmentDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const generatedOrderId =
      rec.sourcing_method === 'INTERNAL_TRANSFER'
        ? `itr_${randomUUID().replace(/-/g, '').slice(0, 16)}`
        : `po_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const updated: ReplenishmentRecommendation = {
      ...rec,
      status: 'CONVERTED',
      generated_order_id: generatedOrderId,
      updated_at: now,
    };

    this.recommendations.set(id, updated);
    return { recommendation: updated };
  }

  async rejectRecommendation(
    tenantId: string,
    id: string,
  ): Promise<RecommendationResponse> {
    const rec = await this.getRecommendationEntity(tenantId, id);

    try {
      assertRecommendationTransition(
        rec.status as DomainRecommendationStatus,
        'REJECTED',
      );
    } catch (err: unknown) {
      if (err instanceof ReplenishmentDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const updated: ReplenishmentRecommendation = {
      ...rec,
      status: 'REJECTED',
      updated_at: new Date().toISOString(),
    };

    this.recommendations.set(id, updated);
    return { recommendation: updated };
  }

  async listRecommendations(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListRecommendationsResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const recommendations = Array.from(this.recommendations.values()).filter(
      (r) => r.tenant_id === tenantId && r.warehouse_id === warehouseId,
    );
    return { recommendations };
  }

  async getRecommendationById(
    tenantId: string,
    id: string,
  ): Promise<RecommendationResponse> {
    const recommendation = await this.getRecommendationEntity(tenantId, id);
    return { recommendation };
  }

  /**
   * Helper method for tests to seed mock stock levels for simulation.
   */
  setMockStock(
    tenantId: string,
    warehouseId: string,
    variantId: string,
    stock: { on_hand: number; on_order: number; in_transit: number; allocated: number; backordered: number },
  ): void {
    this.stockLevels.set(`${tenantId}:${warehouseId}:${variantId}`, stock);
  }

  private async getRuleEntity(
    tenantId: string,
    id: string,
  ): Promise<ReplenishmentRule> {
    const rule = this.rules.get(id);
    if (!rule || rule.tenant_id !== tenantId) {
      throw new NotFoundException(`Replenishment rule '${id}' not found.`);
    }
    return rule;
  }

  private async getRecommendationEntity(
    tenantId: string,
    id: string,
  ): Promise<ReplenishmentRecommendation> {
    const rec = this.recommendations.get(id);
    if (!rec || rec.tenant_id !== tenantId) {
      throw new NotFoundException(`Replenishment recommendation '${id}' not found.`);
    }
    return rec;
  }
}
