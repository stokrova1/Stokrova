/**
 * Tenancy and Identity Contracts
 * Based on ARCHITECTURE.md, SECURITY.md, and Phase 1A specification
 */

export interface UserIdentity {
  id: string;
  email: string;
  full_name: string;
  is_platform_admin?: boolean;
  tenant_ids?: string[];
  tenant_id?: string;
}

export interface TenantContext {
  tenant_id: string;
  company_id?: string;
  branch_id?: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  owner_email: string;
  owner_full_name: string;
  default_currency?: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface CompanyResponse {
  id: string;
  tenant_id: string;
  name: string;
  currency_code: string;
  created_at: string;
}

export interface BranchResponse {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface ProvisionedTenantResult {
  tenant: TenantResponse;
  company: CompanyResponse;
  default_branch: BranchResponse;
}
