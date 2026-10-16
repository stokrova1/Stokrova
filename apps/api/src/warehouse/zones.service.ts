import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StorageZone,
  CreateStorageZoneRequest,
  UpdateStorageZoneRequest,
} from '@stokrova/contracts';
import { WarehousesService } from './warehouses.service.js';

@Injectable()
export class ZonesService {
  private zonesStore = new DurableMap<StorageZone>('storage_zones');

  constructor(private readonly warehousesService: WarehousesService) {}

  async createZone(
    tenantId: string,
    req: CreateStorageZoneRequest,
  ): Promise<StorageZone> {
    // 1. Ensure warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    const code = req.code.trim().toUpperCase();

    // 2. Enforce unique zone code per warehouse in tenant
    const existing = Array.from(this.zonesStore.values()).find(
      (z) =>
        z.tenant_id === tenantId &&
        z.warehouse_id === req.warehouse_id &&
        z.code === code,
    );
    if (existing) {
      throw new ConflictException(
        `Storage zone with code '${code}' already exists in this warehouse.`,
      );
    }

    const now = new Date().toISOString();
    const zone: StorageZone = {
      id: `zone_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      warehouse_id: req.warehouse_id,
      code,
      name: req.name.trim(),
      zone_type: req.zone_type,
      temperature_class: req.temperature_class ?? 'AMBIENT',
      hazmat_class: req.hazmat_class ?? 'NONE',
      is_active: req.is_active ?? true,
      notes: req.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.zonesStore.set(zone.id, zone);
    return zone;
  }

  async getZones(
    tenantId: string,
    warehouseId?: string,
  ): Promise<StorageZone[]> {
    return Array.from(this.zonesStore.values()).filter((z) => {
      if (z.tenant_id !== tenantId) return false;
      if (warehouseId && z.warehouse_id !== warehouseId) return false;
      return true;
    });
  }

  async getZoneById(tenantId: string, id: string): Promise<StorageZone> {
    const zone = this.zonesStore.get(id);
    if (!zone || zone.tenant_id !== tenantId) {
      throw new NotFoundException(`Storage zone with ID '${id}' not found.`);
    }
    return zone;
  }

  async updateZone(
    tenantId: string,
    id: string,
    req: UpdateStorageZoneRequest,
  ): Promise<StorageZone> {
    const zone = await this.getZoneById(tenantId, id);

    if (req.name !== undefined) {
      zone.name = req.name.trim();
    }
    if (req.zone_type !== undefined) {
      zone.zone_type = req.zone_type;
    }
    if (req.temperature_class !== undefined) {
      zone.temperature_class = req.temperature_class;
    }
    if (req.hazmat_class !== undefined) {
      zone.hazmat_class = req.hazmat_class;
    }
    if (req.is_active !== undefined) {
      zone.is_active = req.is_active;
    }
    if (req.notes !== undefined) {
      zone.notes = req.notes;
    }

    zone.updated_at = new Date().toISOString();
    this.zonesStore.set(zone.id, zone);
    return zone;
  }

  async deleteZone(tenantId: string, id: string): Promise<void> {
    const zone = await this.getZoneById(tenantId, id);
    this.zonesStore.delete(zone.id);
  }

  clearStore(): void {
    this.zonesStore.clear();
  }
}
