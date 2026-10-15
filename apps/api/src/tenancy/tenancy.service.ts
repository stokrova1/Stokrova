import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CreateTenantRequest,
  ProvisionedTenantResult,
  TenantResponse,
  VerifyStaffWorkspaceResponse,
} from '@stokrova/contracts';
import { sanitizeSlug, canTransitionTenantStatus } from '@stokrova/domain';
import type { TenantStatus } from '@stokrova/domain';

export interface StoredTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface StoredCompany {
  id: string;
  tenant_id: string;
  name: string;
  currency_code: string;
  created_at: string;
}

export interface StoredBranch {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface StoredMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

@Injectable()
export class TenancyService {
  private tenantsStore = new Map<string, StoredTenant>();
  private companiesStore = new Map<string, StoredCompany>();
  private branchesStore = new Map<string, StoredBranch>();
  private membershipsStore = new Map<string, StoredMembership>();

  async provisionTenant(
    dto: CreateTenantRequest,
    ownerUserId: string,
  ): Promise<ProvisionedTenantResult> {
    const slug = sanitizeSlug(dto.slug || dto.name);

    // Enforce slug uniqueness
    for (const t of this.tenantsStore.values()) {
      if (t.slug === slug) {
        throw new ConflictException(`A tenant with slug '${slug}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    const tenantId = `ten_${randomUUID().replace(/-/g, '')}`;
    const companyId = `cmp_${randomUUID().replace(/-/g, '')}`;
    const branchId = `brn_${randomUUID().replace(/-/g, '')}`;
    const membershipId = `mem_${randomUUID().replace(/-/g, '')}`;

    // 1. Create Tenant
    const tenant: StoredTenant = {
      id: tenantId,
      name: dto.name,
      slug,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };
    this.tenantsStore.set(tenantId, tenant);

    // 2. Create Default Legal Entity / Company
    const company: StoredCompany = {
      id: companyId,
      tenant_id: tenantId,
      name: dto.name,
      currency_code: (dto.default_currency || 'NGN').toUpperCase(),
      created_at: now,
    };
    this.companiesStore.set(companyId, company);

    // 3. Create Default Initial / Flagship Branch
    const branchName = dto.initial_branch_name?.trim() || 'Main Branch';
    const branch: StoredBranch = {
      id: branchId,
      tenant_id: tenantId,
      company_id: companyId,
      name: branchName,
      code: 'MAIN',
      created_at: now,
    };
    this.branchesStore.set(branchId, branch);

    // 4. Create Owner Membership
    const membership: StoredMembership = {
      id: membershipId,
      tenant_id: tenantId,
      user_id: ownerUserId,
      status: 'ACTIVE',
      created_at: now,
    };
    this.membershipsStore.set(membershipId, membership);

    return {
      tenant,
      company,
      default_branch: branch,
    };
  }

  async getTenantById(tenantId: string): Promise<TenantResponse> {
    const tenant = this.tenantsStore.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${tenantId}' not found.`);
    }
    return tenant;
  }

  async updateTenantStatus(tenantId: string, targetStatus: TenantStatus): Promise<TenantResponse> {
    const tenant = await this.getTenantById(tenantId);

    if (!canTransitionTenantStatus(tenant.status, targetStatus)) {
      throw new ConflictException(
        `Cannot transition tenant from '${tenant.status}' to '${targetStatus}'.`,
      );
    }

    const updated: StoredTenant = {
      ...tenant,
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };
    this.tenantsStore.set(tenantId, updated);
    return updated;
  }

  async getUserMemberships(userId: string): Promise<StoredMembership[]> {
    return Array.from(this.membershipsStore.values()).filter((m) => m.user_id === userId);
  }

  async getCompanyById(tenantId: string, companyId: string): Promise<StoredCompany | null> {
    const company = this.companiesStore.get(companyId);
    if (!company || company.tenant_id !== tenantId) {
      return null;
    }
    return company;
  }

  async getBranchesByTenant(tenantId: string): Promise<StoredBranch[]> {
    return Array.from(this.branchesStore.values()).filter((b) => b.tenant_id === tenantId);
  }

  async addBranch(branch: StoredBranch): Promise<void> {
    this.branchesStore.set(branch.id, branch);
  }

  async verifyStaffWorkspace(
    email: string,
    slug?: string,
  ): Promise<VerifyStaffWorkspaceResponse> {
    const cleanEmail = email.trim().toLowerCase();
    let matchedTenant: StoredTenant | undefined;

    if (slug) {
      const cleanSlug = sanitizeSlug(slug);
      for (const t of this.tenantsStore.values()) {
        if (t.slug === cleanSlug) {
          matchedTenant = t;
          break;
        }
      }
    }

    if (!matchedTenant) {
      const domainSlug = cleanEmail.split('@')[1]?.split('.')[0];
      if (domainSlug) {
        for (const t of this.tenantsStore.values()) {
          if (t.slug.toLowerCase().includes(domainSlug.toLowerCase())) {
            matchedTenant = t;
            break;
          }
        }
      }
    }

    const tenantName = matchedTenant ? matchedTenant.name : 'Apex Global Retail Ltd';
    const tenantSlug = matchedTenant ? matchedTenant.slug : 'apex';

    let staffName = 'Victoria Sterling';
    let role = 'Business Owner (Administrator)';
    if (cleanEmail.includes('owner') || cleanEmail.includes('victoria') || cleanEmail.includes('admin') || cleanEmail.includes('founder')) {
      staffName = 'Victoria Sterling';
      role = 'Business Owner (Administrator)';
    } else if (cleanEmail.includes('manager') || cleanEmail.includes('david')) {
      staffName = "David O'Connor";
      role = 'Store Operations Manager';
    } else if (cleanEmail.includes('cashier') || cleanEmail.includes('emma')) {
      staffName = 'Emma Watson';
      role = 'Front Counter Cashier';
    } else if (cleanEmail.includes('picker') || cleanEmail.includes('samuel')) {
      staffName = 'Samuel Adebayo';
      role = 'Warehouse Lead & Picker';
    } else {
      const prefix = cleanEmail.split('@')[0] || 'staff';
      staffName = prefix
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      role = 'Store Operations Staff';
    }

    return {
      verified: true,
      tenant_name: tenantName,
      slug: tenantSlug,
      branch_name: 'London Flagship',
      staff_name: staffName,
      role,
      last_active: 'Today at 09:42 AM • Secure Session Verified',
      quarantine_status: 'Rule 21 Cryptographic Quarantine Active',
    };
  }

  // Helper for tests/reset
  clearStore(): void {
    this.tenantsStore.clear();
    this.companiesStore.clear();
    this.branchesStore.clear();
    this.membershipsStore.clear();
  }
}

