import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  MfgWorkCenter,
  CreateMfgWorkCenterRequest,
  UpdateMfgWorkCenterRequest,
} from '@stokrova/contracts';
import { generateUuidV7 } from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';

@Injectable()
export class MfgWorkCentersService {
  private workCentersStore = new DurableMap<MfgWorkCenter>('mfg_work_centers');

  constructor(private readonly warehousesService: WarehousesService) {}

  async createWorkCenter(
    tenantId: string,
    request: CreateMfgWorkCenterRequest,
  ): Promise<MfgWorkCenter> {
    await this.warehousesService.getWarehouseById(tenantId, request.warehouse_id);

    const code = request.code.trim().toUpperCase();

    // Check unique code per tenant
    for (const [key, wc] of this.workCentersStore.entries()) {
      if (key.startsWith(`${tenantId}:`) && wc.code === code) {
        throw new ConflictException(`Work center with code '${code}' already exists.`);
      }
    }

    const wcId = generateUuidV7();
    const now = new Date().toISOString();

    const workCenter: MfgWorkCenter = {
      id: wcId,
      tenant_id: tenantId,
      warehouse_id: request.warehouse_id,
      code,
      name: request.name.trim(),
      status: 'ACTIVE',
      capacity_units_per_hour: request.capacity_units_per_hour ?? 1,
      efficiency_basis_points: request.efficiency_basis_points ?? 10000,
      hourly_labor_rate_minor: request.hourly_labor_rate_minor.toString(),
      hourly_machine_rate_minor: request.hourly_machine_rate_minor.toString(),
      hourly_overhead_rate_minor: request.hourly_overhead_rate_minor
        ? request.hourly_overhead_rate_minor.toString()
        : '0',
      notes: request.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.workCentersStore.set(`${tenantId}:${wcId}`, workCenter);
    return workCenter;
  }

  async getWorkCenterById(tenantId: string, id: string): Promise<MfgWorkCenter> {
    const wc = this.workCentersStore.get(`${tenantId}:${id}`);
    if (!wc) {
      throw new NotFoundException(`Manufacturing work center '${id}' not found for tenant '${tenantId}'.`);
    }
    return wc;
  }

  async listWorkCenters(tenantId: string, warehouseId?: string): Promise<MfgWorkCenter[]> {
    const centers: MfgWorkCenter[] = [];
    for (const [key, wc] of this.workCentersStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (warehouseId && wc.warehouse_id !== warehouseId) continue;
        centers.push(wc);
      }
    }
    return centers;
  }

  async updateWorkCenter(
    tenantId: string,
    id: string,
    request: UpdateMfgWorkCenterRequest,
  ): Promise<MfgWorkCenter> {
    const wc = await this.getWorkCenterById(tenantId, id);

    if (request.name !== undefined) wc.name = request.name.trim();
    if (request.status !== undefined) wc.status = request.status;
    if (request.capacity_units_per_hour !== undefined) wc.capacity_units_per_hour = request.capacity_units_per_hour;
    if (request.efficiency_basis_points !== undefined) wc.efficiency_basis_points = request.efficiency_basis_points;
    if (request.hourly_labor_rate_minor !== undefined) wc.hourly_labor_rate_minor = request.hourly_labor_rate_minor.toString();
    if (request.hourly_machine_rate_minor !== undefined) wc.hourly_machine_rate_minor = request.hourly_machine_rate_minor.toString();
    if (request.hourly_overhead_rate_minor !== undefined) wc.hourly_overhead_rate_minor = request.hourly_overhead_rate_minor.toString();
    if (request.notes !== undefined) wc.notes = request.notes;

    wc.updated_at = new Date().toISOString();
    return wc;
  }
}
