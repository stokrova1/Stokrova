import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  HoldingGroup,
  CreateHoldingGroupRequest,
  UpdateHoldingGroupRequest,
  ConsolidatedTrialBalanceReport,
} from '@stokrova/contracts';
import {
  CreateHoldingGroupSchema,
  UpdateHoldingGroupSchema,
} from '@stokrova/validation';
import {
  assertValidHoldingGroupHierarchy,
  calculateConsolidatedTrialBalance,
} from '@stokrova/domain';
import { FinancialReportsService } from '../finance/financial-reports.service.js';

@Injectable()
export class ConsolidationService {
  private readonly holdingGroups = new DurableMap<HoldingGroup>('holding_groups');

  constructor(private readonly reportsService: FinancialReportsService) {}

  async createHoldingGroup(
    tenantId: string,
    req: CreateHoldingGroupRequest,
  ): Promise<HoldingGroup> {
    const parsed = CreateHoldingGroupSchema.parse(req);

    // Validate hierarchy invariants
    assertValidHoldingGroupHierarchy(
      parsed.parent_company_id,
      parsed.subsidiary_company_ids,
    );

    // Check unique code
    const existing = Array.from(this.holdingGroups.values()).find(
      (h) => h.tenant_id === tenantId && h.code.toUpperCase() === parsed.code.toUpperCase(),
    );
    if (existing) {
      throw new ConflictException(`Holding group with code '${parsed.code}' already exists.`);
    }

    const now = new Date().toISOString();
    const group: HoldingGroup = {
      id: randomUUID(),
      tenant_id: tenantId,
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      parent_company_id: parsed.parent_company_id,
      subsidiary_company_ids: parsed.subsidiary_company_ids,
      consolidation_currency: (parsed.consolidation_currency ?? 'USD').toUpperCase(),
      is_active: parsed.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    this.holdingGroups.set(group.id, group);
    return group;
  }

  async updateHoldingGroup(
    tenantId: string,
    groupId: string,
    req: UpdateHoldingGroupRequest,
  ): Promise<HoldingGroup> {
    const parsed = UpdateHoldingGroupSchema.parse(req);
    const group = await this.getHoldingGroupById(tenantId, groupId);

    if (parsed.subsidiary_company_ids !== undefined) {
      assertValidHoldingGroupHierarchy(
        group.parent_company_id,
        parsed.subsidiary_company_ids,
      );
      group.subsidiary_company_ids = parsed.subsidiary_company_ids;
    }

    if (parsed.name !== undefined) {
      group.name = parsed.name.trim();
    }
    if (parsed.is_active !== undefined) {
      group.is_active = parsed.is_active;
    }

    group.updated_at = new Date().toISOString();
    return group;
  }

  async getHoldingGroupById(tenantId: string, groupId: string): Promise<HoldingGroup> {
    const group = this.holdingGroups.get(groupId);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Holding group '${groupId}' not found.`);
    }
    return group;
  }

  async listHoldingGroups(tenantId: string): Promise<HoldingGroup[]> {
    return Array.from(this.holdingGroups.values()).filter((h) => h.tenant_id === tenantId);
  }

  // ==========================================================================
  // Consolidated Trial Balance
  // ==========================================================================

  async generateConsolidatedTrialBalance(
    tenantId: string,
    groupId: string,
    asOfDate?: string,
    eliminations: Array<{ account_code: string; debit_minor: string; credit_minor: string }> = [],
  ): Promise<ConsolidatedTrialBalanceReport> {
    const group = await this.getHoldingGroupById(tenantId, groupId);

    // Fetch trial balances for parent and all subsidiaries
    const allCompanyIds = [group.parent_company_id, ...group.subsidiary_company_ids];
    const companyBalances = await Promise.all(
      allCompanyIds.map(async (companyId) => {
        const tb = await this.reportsService.getTrialBalance(tenantId, companyId, asOfDate);
        return {
          companyId,
          rows: tb.rows,
        };
      }),
    );

    const consolidated = calculateConsolidatedTrialBalance(companyBalances, eliminations);

    return {
      tenant_id: tenantId,
      holding_group_id: group.id,
      as_of_date: asOfDate ?? new Date().toISOString(),
      consolidation_currency: group.consolidation_currency,
      rows: consolidated.rows,
      total_debit_minor: consolidated.total_debit_minor,
      total_credit_minor: consolidated.total_credit_minor,
      total_eliminations_minor: consolidated.total_eliminations_minor,
      is_balanced: consolidated.is_balanced,
    };
  }
}
