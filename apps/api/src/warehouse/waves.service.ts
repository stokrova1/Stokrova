import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PickWave,
  PickList,
  CreatePickWaveRequest,
  CreatePickListLineRequest,
} from '@stokrova/contracts';
import { WarehousesService } from './warehouses.service.js';
import { PickingService } from './picking.service.js';

@Injectable()
export class WavesService {
  private wavesStore = new Map<string, PickWave>();

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly pickingService: PickingService,
  ) {}

  async createWave(
    tenantId: string,
    req: CreatePickWaveRequest,
  ): Promise<PickWave> {
    // 1. Ensure warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    const now = new Date().toISOString();
    const waveId = `wv_${randomUUID().replace(/-/g, '')}`;
    const waveNumber = `WV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    const wave: PickWave = {
      id: waveId,
      tenant_id: tenantId,
      warehouse_id: req.warehouse_id,
      wave_number: waveNumber,
      status: 'PLANNING',
      strategy: req.strategy,
      criteria: req.criteria ?? null,
      total_orders: req.order_ids.length,
      total_lines: 0,
      released_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    this.wavesStore.set(wave.id, wave);
    return wave;
  }

  async getWaveById(tenantId: string, id: string): Promise<PickWave> {
    const wave = this.wavesStore.get(id);
    if (!wave || wave.tenant_id !== tenantId) {
      throw new NotFoundException(`Pick wave with ID '${id}' not found.`);
    }
    return wave;
  }

  async getWaves(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickWave[]> {
    return Array.from(this.wavesStore.values()).filter((w) => {
      if (w.tenant_id !== tenantId) return false;
      if (warehouseId && w.warehouse_id !== warehouseId) return false;
      return true;
    });
  }

  /**
   * Releases a planned wave by partitioning orders into pick lists according to strategy:
   * - DISCRETE: 1 pick list per order.
   * - BATCH: Consolidated multi-order pick list.
   * - ZONE: 1 pick list per storage zone.
   * - WAVE: Standard consolidated wave pick list.
   */
  async releaseWave(
    tenantId: string,
    waveId: string,
    orderLines: CreatePickListLineRequest[],
  ): Promise<{ wave: PickWave; pick_lists: PickList[] }> {
    const wave = await this.getWaveById(tenantId, waveId);

    if (wave.status !== 'PLANNING') {
      throw new BadRequestException(
        `Cannot release pick wave with status '${wave.status}'. Only 'PLANNING' waves can be released.`,
      );
    }

    if (orderLines.length === 0) {
      throw new BadRequestException('Cannot release wave without pick lines.');
    }

    const createdPickLists: PickList[] = [];

    if (wave.strategy === 'DISCRETE') {
      // 1 Pick list per order
      const linesByOrder = new Map<string, CreatePickListLineRequest[]>();
      for (const line of orderLines) {
        const list = linesByOrder.get(line.order_id) || [];
        list.push(line);
        linesByOrder.set(line.order_id, list);
      }

      for (const [orderId, lines] of linesByOrder.entries()) {
        const pl = await this.pickingService.createPickList(tenantId, {
          warehouse_id: wave.warehouse_id,
          wave_id: wave.id,
          strategy: 'DISCRETE',
          order_ids: [orderId],
          lines,
        });
        createdPickLists.push(pl);
      }
    } else if (wave.strategy === 'ZONE') {
      // 1 Pick list per zone
      const linesByZone = new Map<string, CreatePickListLineRequest[]>();
      for (const line of orderLines) {
        const zoneKey = line.zone_id || '__NO_ZONE__';
        const list = linesByZone.get(zoneKey) || [];
        list.push(line);
        linesByZone.set(zoneKey, list);
      }

      for (const [zoneKey, lines] of linesByZone.entries()) {
        const uniqueOrders = Array.from(new Set(lines.map((l) => l.order_id)));
        const pl = await this.pickingService.createPickList(tenantId, {
          warehouse_id: wave.warehouse_id,
          wave_id: wave.id,
          strategy: 'ZONE',
          zone_id: zoneKey === '__NO_ZONE__' ? null : zoneKey,
          order_ids: uniqueOrders,
          lines,
        });
        createdPickLists.push(pl);
      }
    } else {
      // BATCH or WAVE: Consolidated pick list across all wave orders
      const uniqueOrders = Array.from(new Set(orderLines.map((l) => l.order_id)));
      const pl = await this.pickingService.createPickList(tenantId, {
        warehouse_id: wave.warehouse_id,
        wave_id: wave.id,
        strategy: wave.strategy,
        order_ids: uniqueOrders,
        lines: orderLines,
      });
      createdPickLists.push(pl);
    }

    const now = new Date().toISOString();
    wave.status = 'RELEASED';
    wave.released_at = now;
    wave.total_lines = orderLines.length;
    wave.updated_at = now;
    this.wavesStore.set(wave.id, wave);

    return {
      wave,
      pick_lists: createdPickLists,
    };
  }

  clearStore(): void {
    this.wavesStore.clear();
  }
}
