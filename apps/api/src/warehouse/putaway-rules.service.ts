import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PutAwayRule,
  CreatePutAwayRuleRequest,
  UpdatePutAwayRuleRequest,
  TemperatureClass,
  HazmatClass,
  AbcVelocityClass,
} from '@stokrova/contracts';
import { WarehousesService } from './warehouses.service.js';

@Injectable()
export class PutawayRulesService {
  private rulesStore = new Map<string, PutAwayRule>();

  constructor(private readonly warehousesService: WarehousesService) {}

  async createRule(
    tenantId: string,
    req: CreatePutAwayRuleRequest,
  ): Promise<PutAwayRule> {
    // 1. Ensure warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    const now = new Date().toISOString();
    const rule: PutAwayRule = {
      id: `par_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      warehouse_id: req.warehouse_id,
      name: req.name.trim(),
      priority: req.priority,
      strategy: req.strategy,
      filter_category_id: req.filter_category_id ?? null,
      filter_temperature_class: req.filter_temperature_class ?? null,
      filter_hazmat_class: req.filter_hazmat_class ?? null,
      filter_velocity_class: req.filter_velocity_class ?? null,
      destination_zone_id: req.destination_zone_id ?? null,
      is_active: req.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    this.rulesStore.set(rule.id, rule);
    return rule;
  }

  async getRules(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PutAwayRule[]> {
    return Array.from(this.rulesStore.values())
      .filter((r) => {
        if (r.tenant_id !== tenantId) return false;
        if (warehouseId && r.warehouse_id !== warehouseId) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  async getRuleById(tenantId: string, id: string): Promise<PutAwayRule> {
    const rule = this.rulesStore.get(id);
    if (!rule || rule.tenant_id !== tenantId) {
      throw new NotFoundException(`Put-away rule with ID '${id}' not found.`);
    }
    return rule;
  }

  async updateRule(
    tenantId: string,
    id: string,
    req: UpdatePutAwayRuleRequest,
  ): Promise<PutAwayRule> {
    const rule = await this.getRuleById(tenantId, id);

    if (req.name !== undefined) {
      rule.name = req.name.trim();
    }
    if (req.priority !== undefined) {
      rule.priority = req.priority;
    }
    if (req.strategy !== undefined) {
      rule.strategy = req.strategy;
    }
    if (req.filter_category_id !== undefined) {
      rule.filter_category_id = req.filter_category_id;
    }
    if (req.filter_temperature_class !== undefined) {
      rule.filter_temperature_class = req.filter_temperature_class;
    }
    if (req.filter_hazmat_class !== undefined) {
      rule.filter_hazmat_class = req.filter_hazmat_class;
    }
    if (req.filter_velocity_class !== undefined) {
      rule.filter_velocity_class = req.filter_velocity_class;
    }
    if (req.destination_zone_id !== undefined) {
      rule.destination_zone_id = req.destination_zone_id;
    }
    if (req.is_active !== undefined) {
      rule.is_active = req.is_active;
    }

    rule.updated_at = new Date().toISOString();
    this.rulesStore.set(rule.id, rule);
    return rule;
  }

  async deleteRule(tenantId: string, id: string): Promise<void> {
    const rule = await this.getRuleById(tenantId, id);
    this.rulesStore.delete(rule.id);
  }

  /**
   * Evaluates active rules for a warehouse in priority order.
   * Returns the first matching rule, or null.
   */
  async findMatchingRule(
    tenantId: string,
    warehouseId: string,
    item: {
      categoryId?: string | null;
      temperatureClass?: TemperatureClass;
      hazmatClass?: HazmatClass;
      velocityClass?: AbcVelocityClass;
    },
  ): Promise<PutAwayRule | null> {
    const rules = await this.getRules(tenantId, warehouseId);
    const activeRules = rules.filter((r) => r.is_active);

    for (const rule of activeRules) {
      // 1. Category check
      if (
        rule.filter_category_id &&
        rule.filter_category_id !== item.categoryId
      ) {
        continue;
      }

      // 2. Temperature check
      if (
        rule.filter_temperature_class &&
        rule.filter_temperature_class !== item.temperatureClass
      ) {
        continue;
      }

      // 3. Hazmat check
      if (
        rule.filter_hazmat_class &&
        rule.filter_hazmat_class !== item.hazmatClass
      ) {
        continue;
      }

      // 4. Velocity check
      if (
        rule.filter_velocity_class &&
        rule.filter_velocity_class !== item.velocityClass
      ) {
        continue;
      }

      return rule;
    }

    return null;
  }

  clearStore(): void {
    this.rulesStore.clear();
  }
}
