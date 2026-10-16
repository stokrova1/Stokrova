import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PickList,
  PickListLine,
  CreatePickListRequest,
  ConfirmPickLineRequest,
  ShortPickRequest,
} from '@stokrova/contracts';
import {
  sortPickLinesSerpentine,
  assertPickLineTransition,
  assertPickQuantity,
  calculatePickListStatus,
  WarehouseOpsDomainError,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';

@Injectable()
export class PickingService {
  private pickListsStore = new DurableMap<PickList>('pick_lists');

  constructor(private readonly warehousesService: WarehousesService) {}

  async createPickList(
    tenantId: string,
    req: CreatePickListRequest,
  ): Promise<PickList> {
    // 1. Ensure warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    const now = new Date().toISOString();
    const pickListId = `pl_${randomUUID().replace(/-/g, '')}`;
    const pickListNumber = `PL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    // 2. Build initial lines with UUIDs
    const rawLines = req.lines.map((l) => ({
      id: `pll_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      pick_list_id: pickListId,
      order_id: l.order_id,
      order_line_id: l.order_line_id,
      variant_id: l.variant_id,
      sku: l.sku,
      batch_id: l.batch_id ?? null,
      source_location_id: l.source_location_id,
      source_location_code: l.source_location_code,
      zone_id: l.zone_id ?? null,
      aisle: l.aisle ?? null,
      rack: l.rack ?? null,
      shelf: l.shelf ?? null,
      bin_position: l.bin_position ?? null,
      pick_sequence: 1,
      quantity_requested: l.quantity_requested,
      quantity_picked: 0,
      quantity_short: 0,
      status: 'PENDING' as const,
      short_reason: null,
      picked_at: null,
      created_at: now,
      updated_at: now,
    }));

    // 3. Apply Serpentine Travel Optimization (Rule 26)
    const sortedLines: PickListLine[] = sortPickLinesSerpentine(rawLines);

    const pickList: PickList = {
      id: pickListId,
      tenant_id: tenantId,
      warehouse_id: req.warehouse_id,
      wave_id: req.wave_id ?? null,
      pick_list_number: pickListNumber,
      strategy: req.strategy,
      status: 'RELEASED',
      picker_id: null,
      zone_id: req.zone_id ?? null,
      staging_location_id: req.staging_location_id ?? null,
      order_ids: req.order_ids,
      lines: sortedLines,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    this.pickListsStore.set(pickList.id, pickList);
    return pickList;
  }

  async getPickListById(tenantId: string, id: string): Promise<PickList> {
    const pl = this.pickListsStore.get(id);
    if (!pl || pl.tenant_id !== tenantId) {
      throw new NotFoundException(`Pick list with ID '${id}' not found.`);
    }
    return pl;
  }

  async getPickLists(
    tenantId: string,
    warehouseId?: string,
    waveId?: string,
  ): Promise<PickList[]> {
    return Array.from(this.pickListsStore.values()).filter((pl) => {
      if (pl.tenant_id !== tenantId) return false;
      if (warehouseId && pl.warehouse_id !== warehouseId) return false;
      if (waveId && pl.wave_id !== waveId) return false;
      return true;
    });
  }

  async confirmPickLine(
    tenantId: string,
    pickListId: string,
    lineId: string,
    req: ConfirmPickLineRequest,
  ): Promise<PickList> {
    const pl = await this.getPickListById(tenantId, pickListId);

    if (pl.status === 'COMPLETED' || pl.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot confirm picks on a pick list that is already ${pl.status}.`,
      );
    }

    const line = pl.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException(`Pick list line with ID '${lineId}' not found.`);
    }

    try {
      assertPickLineTransition(line.status, 'PICKED');
      assertPickQuantity(line.quantity_requested, req.quantity_picked, false);
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    line.quantity_picked = req.quantity_picked;
    line.quantity_short = 0;
    line.status = 'PICKED';
    if (req.batch_id !== undefined) {
      line.batch_id = req.batch_id;
    }
    line.picked_at = now;
    line.updated_at = now;

    if (!pl.started_at) {
      pl.started_at = now;
    }

    pl.status = calculatePickListStatus(pl.lines);
    if (pl.status === 'COMPLETED') {
      pl.completed_at = now;
    }
    pl.updated_at = now;

    this.pickListsStore.set(pl.id, pl);
    return pl;
  }

  async shortPickLine(
    tenantId: string,
    pickListId: string,
    lineId: string,
    req: ShortPickRequest,
  ): Promise<PickList> {
    const pl = await this.getPickListById(tenantId, pickListId);

    if (pl.status === 'COMPLETED' || pl.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot short pick on a pick list that is already ${pl.status}.`,
      );
    }

    const line = pl.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException(`Pick list line with ID '${lineId}' not found.`);
    }

    try {
      assertPickLineTransition(line.status, 'SHORT_PICKED');
      assertPickQuantity(line.quantity_requested, req.quantity_picked, true);
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    line.quantity_picked = req.quantity_picked;
    line.quantity_short = line.quantity_requested - req.quantity_picked;
    line.status = 'SHORT_PICKED';
    line.short_reason = req.short_reason;
    line.picked_at = now;
    line.updated_at = now;

    if (!pl.started_at) {
      pl.started_at = now;
    }

    pl.status = calculatePickListStatus(pl.lines);
    if (pl.status === 'COMPLETED') {
      pl.completed_at = now;
    }
    pl.updated_at = now;

    this.pickListsStore.set(pl.id, pl);
    return pl;
  }

  async cancelPickList(tenantId: string, id: string): Promise<PickList> {
    const pl = await this.getPickListById(tenantId, id);

    if (pl.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel an already completed pick list.');
    }

    const now = new Date().toISOString();
    for (const line of pl.lines) {
      if (line.status === 'PENDING') {
        line.status = 'CANCELLED';
        line.updated_at = now;
      }
    }

    pl.status = 'CANCELLED';
    pl.updated_at = now;
    this.pickListsStore.set(pl.id, pl);
    return pl;
  }

  async optimizeRouting(tenantId: string, id: string): Promise<PickList> {
    const pl = await this.getPickListById(tenantId, id);
    const sorted = sortPickLinesSerpentine(pl.lines);
    pl.lines = sorted;
    pl.updated_at = new Date().toISOString();
    this.pickListsStore.set(pl.id, pl);
    return pl;
  }

  clearStore(): void {
    this.pickListsStore.clear();
  }
}
