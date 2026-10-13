import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrossDockOpportunity,
  CrossDockOpportunityResponse,
  ListCrossDockOpportunitiesResponse,
  EvaluateCrossDockOpportunitiesRequest,
  ExecuteCrossDockBypassRequest,
} from '@stokrova/contracts';
import {
  EvaluateCrossDockOpportunitiesSchema,
  ExecuteCrossDockBypassSchema,
} from '@stokrova/validation';
import {
  matchCrossDockCandidates,
  WarehouseOpsDomainError,
  type DomainInboundCandidateItem,
  type DomainPendingOrderDemand,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';

@Injectable()
export class CrossDockService {
  private readonly opportunities = new Map<string, CrossDockOpportunity>();

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  async evaluateOpportunities(
    tenantId: string,
    req: EvaluateCrossDockOpportunitiesRequest,
  ): Promise<ListCrossDockOpportunitiesResponse> {
    const parsed = EvaluateCrossDockOpportunitiesSchema.parse(req);

    // 1. Verify warehouse
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // 2. Verify staging location
    const stagingLoc = await this.locationsService.getLocationById(
      tenantId,
      parsed.staging_location_id,
    );

    const domainInbound: DomainInboundCandidateItem[] = parsed.inbound_items.map((i) => ({
      inbound_line_id: i.inbound_line_id,
      variant_id: i.variant_id,
      sku: i.sku,
      quantity: i.quantity,
    }));

    const domainDemands: DomainPendingOrderDemand[] = parsed.pending_demands.map((d) => ({
      order_id: d.order_id,
      order_line_id: d.order_line_id,
      variant_id: d.variant_id,
      sku: d.sku,
      quantity_demanded: d.quantity_demanded,
      priority: d.priority,
    }));

    try {
      const matchResult = matchCrossDockCandidates(domainInbound, domainDemands);
      const createdOpportunities: CrossDockOpportunity[] = [];
      const now = new Date().toISOString();

      for (const alloc of matchResult.allocations) {
        const opp: CrossDockOpportunity = {
          id: `xdock_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenant_id: tenantId,
          warehouse_id: parsed.warehouse_id,
          variant_id: alloc.variant_id,
          sku: alloc.sku,
          inbound_receipt_id: parsed.inbound_receipt_id,
          inbound_line_id: alloc.inbound_line_id,
          matched_order_id: alloc.matched_order_id,
          matched_order_line_id: alloc.matched_order_line_id,
          quantity_to_cross_dock: alloc.quantity_allocated,
          target_staging_location_id: stagingLoc.id,
          target_staging_location_code: stagingLoc.code,
          status: 'PLANNED',
          created_at: now,
          completed_at: null,
        };

        this.opportunities.set(opp.id, opp);
        createdOpportunities.push(opp);
      }

      return { opportunities: createdOpportunities };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async executeBypass(
    tenantId: string,
    req: ExecuteCrossDockBypassRequest,
  ): Promise<CrossDockOpportunityResponse> {
    const parsed = ExecuteCrossDockBypassSchema.parse(req);
    const opp = await this.getOpportunityEntity(tenantId, parsed.opportunity_id);

    if (opp.status !== 'PLANNED' && opp.status !== 'DIRECTED') {
      throw new BadRequestException(
        `Cannot execute cross-dock bypass in '${opp.status}' status. Opportunity must be PLANNED or DIRECTED.`,
      );
    }

    const now = new Date().toISOString();
    const updated: CrossDockOpportunity = {
      ...opp,
      status: 'COMPLETED',
      completed_at: now,
    };

    this.opportunities.set(opp.id, updated);
    return { opportunity: updated };
  }

  async listOpportunities(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListCrossDockOpportunitiesResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const opportunities = Array.from(this.opportunities.values()).filter(
      (o) => o.tenant_id === tenantId && o.warehouse_id === warehouseId,
    );
    return { opportunities };
  }

  async getOpportunityById(
    tenantId: string,
    id: string,
  ): Promise<CrossDockOpportunityResponse> {
    const opportunity = await this.getOpportunityEntity(tenantId, id);
    return { opportunity };
  }

  private async getOpportunityEntity(
    tenantId: string,
    id: string,
  ): Promise<CrossDockOpportunity> {
    const opp = this.opportunities.get(id);
    if (!opp || opp.tenant_id !== tenantId) {
      throw new NotFoundException(`Cross-dock opportunity '${id}' not found.`);
    }
    return opp;
  }
}
