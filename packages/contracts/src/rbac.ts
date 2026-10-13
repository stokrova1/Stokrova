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

export interface InviteStaffRequest {
  email: string;
  full_name: string;
  role_id: string;
  scope?: ScopeTarget;
  delivery_channel?: 'EMAIL' | 'SHAREABLE_LINK';
}

export interface StaffInvitationResponse {
  invitation_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  role_code: string;
  scope: ScopeTarget;
  invite_token: string;
  invite_url: string;
  delivery_channel: 'EMAIL' | 'SHAREABLE_LINK';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

export interface AcceptStaffInvitationRequest {
  invite_token: string;
  password: string;
  cashier_pin?: string;
}

export interface AcceptStaffInvitationResponse {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  primary_role_code: string;
  target_destination_path: string;
  status: 'ACTIVE';
}
