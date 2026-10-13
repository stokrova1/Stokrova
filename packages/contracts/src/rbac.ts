/**
 * Scoped Dynamic RBAC Contracts
 * Based on ARCHITECTURE.md, ADR-014, and Phase 1B specifications
 */

export interface PermissionDefinition {
  id: string;
  code: string;
  module: string;
  description: string;
}

export interface RoleResponse {
  id: string;
  tenant_id: string | null; // null for system template
  name: string;
  code: string;
  description: string | null;
  is_system_template: boolean;
  permissions: string[]; // array of permission codes
  created_at: string;
}

export interface ScopeTarget {
  company_id?: string;
  branch_id?: string;
  warehouse_id?: string;
  register_id?: string;
  work_center_id?: string;
}

export interface RoleAssignmentResponse {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  role_code: string;
  permissions: string[];
  scope: ScopeTarget;
  created_at: string;
}

export interface CreateCustomRoleRequest {
  name: string;
  code: string;
  description?: string;
  permission_codes: string[];
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  scope?: ScopeTarget;
}
