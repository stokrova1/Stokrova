import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@stokrova/contracts';
import { TenancyService, type StoredBranch } from '../tenancy/tenancy.service.js';

@Injectable()
export class BranchesService {
  constructor(private readonly tenancyService: TenancyService) {}

  async createBranch(
    tenantId: string,
    req: CreateBranchRequest,
  ): Promise<BranchResponse> {
    let companyId = req.company_id;
    if (!companyId) {
      const companies = await this.tenancyService.getCompaniesByTenant(tenantId);
      if (!companies.length || !companies[0]) {
        throw new NotFoundException(`No company found for this tenant to attach the branch to.`);
      }
      companyId = companies[0].id;
    } else {
      const company = await this.tenancyService.getCompanyById(tenantId, companyId);
      if (!company) {
        throw new NotFoundException(`Company with ID '${companyId}' not found for this tenant.`);
      }
    }

    const existingBranches = await this.tenancyService.getBranchesByTenant(tenantId);
    const code = req.code.toUpperCase().trim();
    if (existingBranches.some((b) => b.code === code)) {
      throw new ConflictException(`Branch with code '${code}' already exists for this tenant.`);
    }

    const branchId = `brn_${randomUUID().replace(/-/g, '')}`;
    const branch: StoredBranch = {
      id: branchId,
      tenant_id: tenantId,
      company_id: companyId,
      name: req.name.trim(),
      code,
      created_at: new Date().toISOString(),
    };

    await this.tenancyService.addBranch(branch);
    return branch;
  }


  async getBranches(tenantId: string, companyId?: string): Promise<BranchResponse[]> {
    const branches = await this.tenancyService.getBranchesByTenant(tenantId);
    if (companyId) {
      return branches.filter((b) => b.company_id === companyId);
    }
    return branches;
  }

  async getBranchById(tenantId: string, branchId: string): Promise<BranchResponse> {
    const branches = await this.tenancyService.getBranchesByTenant(tenantId);
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) {
      throw new NotFoundException(`Branch with ID '${branchId}' not found.`);
    }
    return branch;
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    req: UpdateBranchRequest,
  ): Promise<BranchResponse> {
    const branch = await this.getBranchById(tenantId, branchId);
    const existingBranches = await this.tenancyService.getBranchesByTenant(tenantId);

    let newCode = branch.code;
    if (req.code) {
      const normalized = req.code.toUpperCase().trim();
      if (
        normalized !== branch.code &&
        existingBranches.some((b) => b.id !== branchId && b.code === normalized)
      ) {
        throw new ConflictException(`Branch with code '${normalized}' already exists for this tenant.`);
      }
      newCode = normalized;
    }

    const updated: StoredBranch = {
      ...branch,
      name: req.name?.trim() || branch.name,
      code: newCode,
    };

    await this.tenancyService.addBranch(updated);
    return updated;
  }
}
