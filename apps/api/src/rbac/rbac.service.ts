import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  RoleResponse,
  RoleAssignmentResponse,
  CreateCustomRoleRequest,
  AssignRoleRequest,
  ScopeTarget,
  InviteStaffRequest,
  StaffInvitationResponse,
  AcceptStaffInvitationRequest,
  AcceptStaffInvitationResponse,
} from '@stokrova/contracts';
import {
  SystemRoleTemplates,
  type ActiveRoleAssignment,
} from '@stokrova/domain';

interface StoredRole {
  id: string;
  tenant_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_system_template: boolean;
  permissions: string[];
  created_at: string;
}

interface StoredRoleAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  scope: ScopeTarget;
  created_at: string;
}

interface StoredInvitation {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role_id: string;
  scope: ScopeTarget;
  invite_token: string;
  delivery_channel: 'EMAIL' | 'SHAREABLE_LINK';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

@Injectable()
export class RbacService {
  private rolesStore = new Map<string, StoredRole>();
  private assignmentsStore = new Map<string, StoredRoleAssignment>();
  private invitationsStore = new Map<string, StoredInvitation>();

  constructor() {
    this.seedSystemTemplates();
  }

  private seedSystemTemplates(): void {
    const now = new Date().toISOString();
    for (const [code, template] of Object.entries(SystemRoleTemplates)) {
      const id = `role_tmpl_${code.toLowerCase()}`;
      this.rolesStore.set(id, {
        id,
        tenant_id: null,
        name: template.name,
        code: template.code,
        description: template.description,
        is_system_template: true,
        permissions: template.permissions,
        created_at: now,
      });
    }
  }

  async getRoleTemplates(): Promise<RoleResponse[]> {
    return Array.from(this.rolesStore.values())
      .filter((r) => r.is_system_template)
      .map(this.toRoleResponse);
  }

  async getRolesForTenant(tenantId: string): Promise<RoleResponse[]> {
    return Array.from(this.rolesStore.values())
      .filter((r) => r.is_system_template || r.tenant_id === tenantId)
      .map(this.toRoleResponse);
  }

  async createCustomRole(
    tenantId: string,
    req: CreateCustomRoleRequest,
  ): Promise<RoleResponse> {
    const code = req.code.toUpperCase().trim();

    // Check duplicate code within tenant
    for (const r of this.rolesStore.values()) {
      if ((r.tenant_id === tenantId || r.is_system_template) && r.code === code) {
        throw new ConflictException(`Role with code '${code}' already exists.`);
      }
    }

    const id = `role_${randomUUID().replace(/-/g, '')}`;
    const role: StoredRole = {
      id,
      tenant_id: tenantId,
      name: req.name.trim(),
      code,
      description: req.description?.trim() || null,
      is_system_template: false,
      permissions: req.permission_codes,
      created_at: new Date().toISOString(),
    };

    this.rolesStore.set(id, role);
    return this.toRoleResponse(role);
  }

  async assignRole(
    tenantId: string,
    req: AssignRoleRequest,
  ): Promise<RoleAssignmentResponse> {
    const role = this.rolesStore.get(req.role_id);
    if (!role || (role.tenant_id !== null && role.tenant_id !== tenantId)) {
      throw new NotFoundException(`Role with ID '${req.role_id}' not found.`);
    }

    const id = `asgn_${randomUUID().replace(/-/g, '')}`;
    const assignment: StoredRoleAssignment = {
      id,
      tenant_id: tenantId,
      user_id: req.user_id,
      role_id: role.id,
      scope: req.scope || {},
      created_at: new Date().toISOString(),
    };

    this.assignmentsStore.set(id, assignment);

    return {
      id: assignment.id,
      tenant_id: assignment.tenant_id,
      user_id: assignment.user_id,
      role_id: role.id,
      role_name: role.name,
      role_code: role.code,
      permissions: role.permissions,
      scope: assignment.scope,
      created_at: assignment.created_at,
    };
  }

  async getUserActiveAssignments(
    tenantId: string,
    userId: string,
  ): Promise<ActiveRoleAssignment[]> {
    const assignments = Array.from(this.assignmentsStore.values()).filter(
      (a) => a.tenant_id === tenantId && a.user_id === userId,
    );

    return assignments.map((a) => {
      const role = this.rolesStore.get(a.role_id);
      return {
        role_code: role?.code || 'UNKNOWN',
        permissions: role?.permissions || [],
        scope: a.scope,
      };
    });
  }

  async inviteStaff(
    tenantId: string,
    invitedByOrReq: string | InviteStaffRequest,
    maybeReq?: InviteStaffRequest,
  ): Promise<StaffInvitationResponse> {
    const req = typeof invitedByOrReq === 'string' ? maybeReq! : invitedByOrReq;
    const role = this.rolesStore.get(req.role_id);
    if (!role || (role.tenant_id !== null && role.tenant_id !== tenantId)) {
      throw new NotFoundException(`Role '${req.role_id}' not found.`);
    }

    const invitationId = `inv_${randomUUID().replace(/-/g, '')}`;
    const inviteToken = `tok_${randomUUID().replace(/-/g, '')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const channel = req.delivery_channel || 'SHAREABLE_LINK';
    const inviteUrl = `https://app.stokrova.com/auth/invite?token=${inviteToken}`;

    const invitation: StoredInvitation = {
      id: invitationId,
      tenant_id: tenantId,
      email: req.email.toLowerCase().trim(),
      full_name: req.full_name.trim(),
      role_id: role.id,
      scope: req.scope || {},
      invite_token: inviteToken,
      delivery_channel: channel,
      status: 'PENDING',
      created_at: now.toISOString(),
      expires_at: expiresAt,
    };

    this.invitationsStore.set(invitationId, invitation);

    return {
      invitation_id: invitation.id,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: invitation.full_name,
      role_id: role.id,
      role_name: role.name,
      role_code: role.code,
      scope: invitation.scope,
      invite_token: invitation.invite_token,
      invite_url: inviteUrl,
      delivery_channel: invitation.delivery_channel,
      status: invitation.status,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
    };
  }

  async listInvitations(tenantId: string): Promise<StaffInvitationResponse[]> {
    const invites = Array.from(this.invitationsStore.values()).filter(
      (inv) => inv.tenant_id === tenantId,
    );

    return invites.map((inv) => {
      const role = this.rolesStore.get(inv.role_id);
      return {
        invitation_id: inv.id,
        tenant_id: inv.tenant_id,
        email: inv.email,
        full_name: inv.full_name,
        role_id: inv.role_id,
        role_name: role?.name || 'Unknown Role',
        role_code: role?.code || 'UNKNOWN',
        scope: inv.scope,
        invite_token: inv.invite_token,
        invite_url: `https://app.stokrova.com/auth/invite?token=${inv.invite_token}`,
        delivery_channel: inv.delivery_channel,
        status: inv.status,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
      };
    });
  }

  async acceptInvitation(
    req: AcceptStaffInvitationRequest,
  ): Promise<AcceptStaffInvitationResponse> {
    const existing = Array.from(this.invitationsStore.values()).find(
      (inv) => inv.invite_token === req.invite_token,
    );

    if (!existing) {
      throw new NotFoundException('Invalid invitation token.');
    }

    if (existing.status === 'ACCEPTED') {
      throw new ConflictException('Invitation has already been accepted.');
    }

    const now = new Date();
    if (existing.status === 'EXPIRED' || new Date(existing.expires_at) < now) {
      existing.status = 'EXPIRED';
      throw new ConflictException('Invitation token has expired.');
    }

    const invitation = existing;
    invitation.status = 'ACCEPTED';


    const userId = `usr_${randomUUID().replace(/-/g, '')}`;
    const role = this.rolesStore.get(invitation.role_id);
    const roleCode = role?.code || 'STAFF';

    await this.assignRole(invitation.tenant_id, {
      user_id: userId,
      role_id: invitation.role_id,
      scope: invitation.scope,
    });

    let destinationPath = '/analytics/dashboards';
    if (roleCode === 'CASHIER') {
      destinationPath = '/pos';
    } else if (roleCode === 'WAREHOUSE_PICKER') {
      destinationPath = '/logistics/picking';
    } else if (roleCode.includes('ACCOUNTANT') || roleCode.includes('CONTROLLER')) {
      destinationPath = '/finance/ledger';
    } else if (roleCode === 'BRANCH_MANAGER') {
      destinationPath = '/registers';
    } else if (roleCode === 'DELIVERY_DRIVER') {
      destinationPath = '/logistics/fleet';
    }

    return {
      user_id: userId,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: invitation.full_name,
      primary_role_code: roleCode,
      target_destination_path: destinationPath,
      status: 'ACTIVE',
    };
  }

  private toRoleResponse(role: StoredRole): RoleResponse {
    return {
      id: role.id,
      tenant_id: role.tenant_id,
      name: role.name,
      code: role.code,
      description: role.description,
      is_system_template: role.is_system_template,
      permissions: role.permissions,
      created_at: role.created_at,
    };
  }

  clearStore(): void {
    this.rolesStore.clear();
    this.assignmentsStore.clear();
    this.invitationsStore.clear();
    this.seedSystemTemplates();
  }
}
