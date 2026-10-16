import { DurableMap } from '../infrastructure/database/durable-map.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  WorkCenterResponse,
  CreateWorkCenterRequest,
  UpdateWorkCenterRequest,
} from '@stokrova/contracts';
import { BranchesService } from './branches.service.js';

export interface StoredWorkCenter {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  type: WorkCenterResponse['type'];
  created_at: string;
}

@Injectable()
export class WorkCentersService {
  private workCentersStore = new DurableMap<StoredWorkCenter>('work_centers');

  constructor(private readonly branchesService: BranchesService) {}

  async createWorkCenter(
    tenantId: string,
    req: CreateWorkCenterRequest,
  ): Promise<WorkCenterResponse> {
    // 1. Verify branch exists and belongs to tenant
    await this.branchesService.getBranchById(tenantId, req.branch_id);

    const id = `wc_${randomUUID().replace(/-/g, '')}`;
    const workCenter: StoredWorkCenter = {
      id,
      tenant_id: tenantId,
      branch_id: req.branch_id,
      name: req.name.trim(),
      type: req.type,
      created_at: new Date().toISOString(),
    };

    this.workCentersStore.set(id, workCenter);
    return workCenter;
  }

  async getWorkCenters(
    tenantId: string,
    branchId?: string,
  ): Promise<WorkCenterResponse[]> {
    return Array.from(this.workCentersStore.values()).filter((wc) => {
      if (wc.tenant_id !== tenantId) return false;
      if (branchId && wc.branch_id !== branchId) return false;
      return true;
    });
  }

  async getWorkCenterById(tenantId: string, id: string): Promise<WorkCenterResponse> {
    const workCenter = this.workCentersStore.get(id);
    if (!workCenter || workCenter.tenant_id !== tenantId) {
      throw new NotFoundException(`Work center with ID '${id}' not found.`);
    }
    return workCenter;
  }

  async updateWorkCenter(
    tenantId: string,
    id: string,
    req: UpdateWorkCenterRequest,
  ): Promise<WorkCenterResponse> {
    const workCenter = await this.getWorkCenterById(tenantId, id);

    const updated: StoredWorkCenter = {
      ...workCenter,
      name: req.name?.trim() || workCenter.name,
      type: req.type || workCenter.type,
    };

    this.workCentersStore.set(id, updated);
    return updated;
  }

  async hasWorkCenter(tenantId: string, id: string): Promise<boolean> {
    const wc = this.workCentersStore.get(id);
    return Boolean(wc && wc.tenant_id === tenantId);
  }

  clearStore(): void {
    this.workCentersStore.clear();
  }
}
