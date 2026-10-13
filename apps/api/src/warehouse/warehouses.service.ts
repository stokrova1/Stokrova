import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from '@stokrova/contracts';
import { TenancyService } from '../tenancy/tenancy.service.js';

@Injectable()
export class WarehousesService {
  private warehousesStore = new Map<string, Warehouse>();

  constructor(private readonly tenancyService: TenancyService) {}

  async createWarehouse(
    tenantId: string,
    req: CreateWarehouseRequest,
  ): Promise<Warehouse> {
    const code = req.code.trim().toUpperCase();

    // Verify unique code per tenant
    const existing = Array.from(this.warehousesStore.values()).find(
      (w) => w.tenant_id === tenantId && w.code === code,
    );
    if (existing) {
      throw new ConflictException(`Warehouse with code '${code}' already exists.`);
    }

    // Verify branch belongs to tenant
    const branches = await this.tenancyService.getBranchesByTenant(tenantId);
    if (!branches.some((b) => b.id === req.branch_id)) {
      throw new BadRequestException(
        `Branch with ID '${req.branch_id}' not found for this tenant.`,
      );
    }

    const now = new Date().toISOString();
    const warehouse: Warehouse = {
      id: `wh_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      branch_id: req.branch_id,
      code,
      name: req.name.trim(),
      address: req.address?.trim() || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.warehousesStore.set(warehouse.id, warehouse);
    return warehouse;
  }

  async getWarehouses(
    tenantId: string,
    branchId?: string,
  ): Promise<Warehouse[]> {
    return Array.from(this.warehousesStore.values()).filter(
      (w) => w.tenant_id === tenantId && (!branchId || w.branch_id === branchId),
    );
  }

  async getWarehouseById(tenantId: string, id: string): Promise<Warehouse> {
    const warehouse = this.warehousesStore.get(id);
    if (!warehouse || warehouse.tenant_id !== tenantId) {
      throw new NotFoundException(`Warehouse with ID '${id}' not found.`);
    }
    return warehouse;
  }

  async updateWarehouse(
    tenantId: string,
    id: string,
    req: UpdateWarehouseRequest,
  ): Promise<Warehouse> {
    const warehouse = await this.getWarehouseById(tenantId, id);

    if (req.name !== undefined) {
      warehouse.name = req.name.trim();
    }

    if (req.address !== undefined) {
      warehouse.address = req.address?.trim() || null;
    }

    if (req.is_active !== undefined) {
      warehouse.is_active = req.is_active;
    }

    warehouse.updated_at = new Date().toISOString();
    this.warehousesStore.set(warehouse.id, warehouse);
    return warehouse;
  }

  clearStore(): void {
    this.warehousesStore.clear();
  }
}
