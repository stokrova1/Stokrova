import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StorageLocation,
  StorageLocationNode,
  CreateStorageLocationRequest,
  UpdateStorageLocationRequest,
} from '@stokrova/contracts';
import {
  calculateMaterializedLocationPath,
  validateLocationAcyclicity,
  WarehouseDomainError,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';

@Injectable()
export class LocationsService {
  private locationsStore = new Map<string, StorageLocation>();

  constructor(private readonly warehousesService: WarehousesService) {}

  async createLocation(
    tenantId: string,
    req: CreateStorageLocationRequest,
  ): Promise<StorageLocation> {
    // 1. Ensure warehouse exists in tenant
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    const code = req.code.trim().toUpperCase();

    // 2. Check unique code per warehouse
    const existing = Array.from(this.locationsStore.values()).find(
      (l) =>
        l.tenant_id === tenantId &&
        l.warehouse_id === req.warehouse_id &&
        l.code === code,
    );
    if (existing) {
      throw new ConflictException(
        `Storage location with code '${code}' already exists in this warehouse.`,
      );
    }

    let parentPath: string | null = null;
    let parentId: string | null = null;
    let level = 0;

    if (req.parent_id) {
      const parent = await this.getLocationById(tenantId, req.parent_id);
      if (parent.warehouse_id !== req.warehouse_id) {
        throw new BadRequestException(
          'Parent storage location must belong to the same warehouse.',
        );
      }
      parentPath = parent.materialized_path;
      parentId = parent.id;
      level = parent.level + 1;
    }

    let materializedPath: string;
    try {
      materializedPath = calculateMaterializedLocationPath(parentPath, code);
    } catch (err: unknown) {
      if (err instanceof WarehouseDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const location: StorageLocation = {
      id: `loc_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      warehouse_id: req.warehouse_id,
      parent_id: parentId,
      code,
      name: req.name.trim(),
      type: req.type,
      materialized_path: materializedPath,
      level,
      mix_policy: req.mix_policy ?? 'MULTI_SKU',
      max_weight_kg: req.max_weight_kg ?? null,
      max_volume_cm3: req.max_volume_cm3 ?? null,
      is_pickable: req.is_pickable ?? true,
      zone_id: req.zone_id ?? null,
      velocity_class: req.velocity_class ?? null,
      aisle: req.aisle ?? null,
      rack: req.rack ?? null,
      shelf: req.shelf ?? null,
      bin_position: req.bin_position ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.locationsStore.set(location.id, location);
    return location;
  }

  async getLocations(
    tenantId: string,
    warehouseId: string,
    parentId?: string | null,
  ): Promise<StorageLocation[]> {
    return Array.from(this.locationsStore.values()).filter((l) => {
      if (l.tenant_id !== tenantId || l.warehouse_id !== warehouseId) return false;
      if (parentId !== undefined) {
        return l.parent_id === parentId;
      }
      return true;
    });
  }

  async getLocationById(tenantId: string, id: string): Promise<StorageLocation> {
    const location = this.locationsStore.get(id);
    if (!location || location.tenant_id !== tenantId) {
      throw new NotFoundException(`Storage location with ID '${id}' not found.`);
    }
    return location;
  }

  async getLocationTree(
    tenantId: string,
    warehouseId: string,
  ): Promise<StorageLocationNode[]> {
    const all = await this.getLocations(tenantId, warehouseId);
    const nodeMap = new Map<string, StorageLocationNode>();

    for (const loc of all) {
      nodeMap.set(loc.id, { ...loc, children: [] });
    }

    const roots: StorageLocationNode[] = [];

    for (const loc of all) {
      const node = nodeMap.get(loc.id)!;
      if (loc.parent_id && nodeMap.has(loc.parent_id)) {
        nodeMap.get(loc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async updateLocation(
    tenantId: string,
    id: string,
    req: UpdateStorageLocationRequest,
  ): Promise<StorageLocation> {
    const location = await this.getLocationById(tenantId, id);

    if (req.parent_id !== undefined && req.parent_id !== location.parent_id) {
      // Validate acyclicity
      try {
        validateLocationAcyclicity(
          id,
          req.parent_id,
          (lookupId) => {
            const item = this.locationsStore.get(lookupId);
            return item && item.tenant_id === tenantId
              ? { parent_id: item.parent_id, warehouse_id: item.warehouse_id }
              : undefined;
          },
          location.warehouse_id,
        );
      } catch (err: unknown) {
        if (err instanceof WarehouseDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      let newParentPath: string | null = null;
      let newLevel = 0;
      if (req.parent_id) {
        const newParent = await this.getLocationById(tenantId, req.parent_id);
        newParentPath = newParent.materialized_path;
        newLevel = newParent.level + 1;
      }

      const oldPath = location.materialized_path;
      const newPath = calculateMaterializedLocationPath(newParentPath, location.code);

      location.parent_id = req.parent_id;
      location.materialized_path = newPath;
      location.level = newLevel;

      // Update paths and levels of all descendant locations
      for (const item of this.locationsStore.values()) {
        if (
          item.tenant_id === tenantId &&
          item.warehouse_id === location.warehouse_id &&
          item.materialized_path.startsWith(oldPath + '/')
        ) {
          item.materialized_path = newPath + item.materialized_path.slice(oldPath.length);
          item.updated_at = new Date().toISOString();
        }
      }
    }

    if (req.name !== undefined) {
      location.name = req.name.trim();
    }

    if (req.type !== undefined) {
      location.type = req.type;
    }

    if (req.mix_policy !== undefined) {
      location.mix_policy = req.mix_policy;
    }

    if (req.max_weight_kg !== undefined) {
      location.max_weight_kg = req.max_weight_kg;
    }

    if (req.max_volume_cm3 !== undefined) {
      location.max_volume_cm3 = req.max_volume_cm3;
    }

    if (req.is_pickable !== undefined) {
      location.is_pickable = req.is_pickable;
    }

    if (req.is_active !== undefined) {
      location.is_active = req.is_active;
    }

    if (req.zone_id !== undefined) {
      location.zone_id = req.zone_id;
    }

    if (req.velocity_class !== undefined) {
      location.velocity_class = req.velocity_class;
    }

    if (req.aisle !== undefined) {
      location.aisle = req.aisle;
    }

    if (req.rack !== undefined) {
      location.rack = req.rack;
    }

    if (req.shelf !== undefined) {
      location.shelf = req.shelf;
    }

    if (req.bin_position !== undefined) {
      location.bin_position = req.bin_position;
    }

    location.updated_at = new Date().toISOString();
    this.locationsStore.set(location.id, location);
    return location;
  }

  clearStore(): void {
    this.locationsStore.clear();
  }
}
