import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
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
import { DATABASE_POOL } from '../infrastructure/database/database.tokens.js';

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

  constructor(@Optional() @Inject(DATABASE_POOL) private readonly pool?: any) {
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
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const res = await this.pool.query(
          'SELECT id, tenant_id, name, code, description, is_system_template, created_at FROM public.roles WHERE tenant_id IS NULL OR tenant_id = $1',
          [tenantId],
        );
        if (res.rows && res.rows.length > 0) {
          return res.rows.map((r: any) => ({
            id: r.id,
            tenant_id: r.tenant_id,
            name: r.name,
            code: r.code,
            description: r.description,
            is_system_template: r.is_system_template,
            permissions: this.rolesStore.get(r.id)?.permissions || [],
            created_at: new Date(r.created_at).toISOString(),
          }));
        }
      } catch {
        // Fallback
      }
    }

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
    const now = new Date().toISOString();

    if (this.pool && typeof this.pool.query === 'function') {
      try {
        await this.pool.query(
          `INSERT INTO public.roles (id, tenant_id, name, code, description, is_system_template, created_at)
           VALUES ($1, $2, $3, $4, $5, false, NOW())`,
          [id, tenantId, req.name.trim(), code, req.description?.trim() || null],
        );
      } catch {
        // Fallback
      }
    }

    const role: StoredRole = {
      id,
      tenant_id: tenantId,
      name: req.name.trim(),
      code,
      description: req.description?.trim() || null,
      is_system_template: false,
      permissions: req.permission_codes,
      created_at: now,
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
    const now = new Date().toISOString();

    if (this.pool && typeof this.pool.query === 'function') {
      try {
        await this.pool.query(
          `INSERT INTO public.role_assignments (id, tenant_id, user_id, role_id, company_id, branch_id, warehouse_id, register_id, work_center_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            id,
            tenantId,
            req.user_id,
            role.id,
            req.scope?.company_id || null,
            req.scope?.branch_id || null,
            req.scope?.warehouse_id || null,
            req.scope?.register_id || null,
            req.scope?.work_center_id || null,
          ],
        );
      } catch {
        // Fallback
      }
    }

    const assignment: StoredRoleAssignment = {
      id,
      tenant_id: tenantId,
      user_id: req.user_id,
      role_id: role.id,
      scope: req.scope || {},
      created_at: now,
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
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const res = await this.pool.query(
          `SELECT ra.role_id, r.code as role_code, ra.company_id, ra.branch_id, ra.warehouse_id, ra.register_id, ra.work_center_id
           FROM public.role_assignments ra
           LEFT JOIN public.roles r ON r.id = ra.role_id
           WHERE ra.tenant_id = $1 AND ra.user_id = $2`,
          [tenantId, userId],
        );
        if (res.rows && res.rows.length > 0) {
          return res.rows.map((r: any) => ({
            role_code: r.role_code || 'UNKNOWN',
            permissions: this.rolesStore.get(r.role_id)?.permissions || [],
            scope: {
              company_id: r.company_id || undefined,
              branch_id: r.branch_id || undefined,
              warehouse_id: r.warehouse_id || undefined,
              register_id: r.register_id || undefined,
              work_center_id: r.work_center_id || undefined,
            },
          }));
        }
      } catch {
        // Fallback
      }
    }

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

    if (this.pool && typeof this.pool.query === 'function') {
      try {
        await this.pool.query(
          `INSERT INTO public.invitations (id, tenant_id, email, full_name, role_id, scope, invite_token, delivery_channel, status, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW(), $9)`,
          [
            invitationId,
            tenantId,
            req.email.toLowerCase().trim(),
            req.full_name.trim(),
            role.id,
            JSON.stringify(req.scope || {}),
            inviteToken,
            channel,
            expiresAt,
          ],
        );
      } catch {
        // Fallback
      }
    }

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
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const res = await this.pool.query(
          `SELECT i.id, i.tenant_id, i.email, i.full_name, i.role_id, i.scope, i.invite_token, i.delivery_channel, i.status, i.created_at, i.expires_at, r.name as role_name, r.code as role_code
           FROM public.invitations i
           LEFT JOIN public.roles r ON r.id = i.role_id
           WHERE i.tenant_id = $1`,
          [tenantId],
        );
        if (res.rows && res.rows.length > 0) {
          return res.rows.map((inv: any) => ({
            invitation_id: inv.id,
            tenant_id: inv.tenant_id,
            email: inv.email,
            full_name: inv.full_name,
            role_id: inv.role_id,
            role_name: inv.role_name || 'Unknown Role',
            role_code: inv.role_code || 'UNKNOWN',
            scope: typeof inv.scope === 'string' ? JSON.parse(inv.scope) : inv.scope || {},
            invite_token: inv.invite_token,
            invite_url: `https://app.stokrova.com/auth/invite?token=${inv.invite_token}`,
            delivery_channel: inv.delivery_channel,
            status: inv.status,
            created_at: new Date(inv.created_at).toISOString(),
            expires_at: new Date(inv.expires_at).toISOString(),
          }));
        }
      } catch {
        // Fallback
      }
    }

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
    authenticatedUserId?: string,
  ): Promise<AcceptStaffInvitationResponse> {
    let invitation: StoredInvitation | undefined;

    // Check PostgreSQL first
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const res = await this.pool.query(
          `SELECT id, tenant_id, email, full_name, role_id, scope, invite_token, delivery_channel, status, created_at, expires_at
           FROM public.invitations WHERE invite_token = $1`,
          [req.invite_token],
        );
        if (res.rows && res.rows[0]) {
          const row = res.rows[0];
          invitation = {
            id: row.id,
            tenant_id: row.tenant_id,
            email: row.email,
            full_name: row.full_name,
            role_id: row.role_id,
            scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope || {},
            invite_token: row.invite_token,
            delivery_channel: row.delivery_channel,
            status: row.status,
            created_at: new Date(row.created_at).toISOString(),
            expires_at: new Date(row.expires_at).toISOString(),
          };
        }
      } catch {
        // Fallback
      }
    }

    if (!invitation) {
      invitation = Array.from(this.invitationsStore.values()).find(
        (inv) => inv.invite_token === req.invite_token,
      );
    }

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token.');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('Invitation has already been accepted.');
    }

    const now = new Date();
    if (invitation.status === 'EXPIRED' || new Date(invitation.expires_at) < now) {
      invitation.status = 'EXPIRED';
      if (this.pool && typeof this.pool.query === 'function') {
        await this.pool.query(
          "UPDATE public.invitations SET status = 'EXPIRED' WHERE id = $1",
          [invitation.id],
        ).catch(() => {});
      }
      throw new ConflictException('Invitation token has expired.');
    }

    invitation.status = 'ACCEPTED';
    const userId = authenticatedUserId || `usr_${randomUUID().replace(/-/g, '')}`;
    const role = this.rolesStore.get(invitation.role_id);
    const roleCode = role?.code || 'STAFF';

    // Update invitation in DB & insert membership
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        await this.pool.query(
          "UPDATE public.invitations SET status = 'ACCEPTED' WHERE id = $1",
          [invitation.id],
        );
        // Ensure user exists
        await this.pool.query(
          `INSERT INTO public.users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, 'SUPABASE_AUTH', $4, 'staff', true, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
          [userId, invitation.tenant_id, invitation.email, invitation.full_name],
        );
        // Insert membership
        await this.pool.query(
          `INSERT INTO public.memberships (id, tenant_id, user_id, status, created_at)
           VALUES ($1, $2, $3, 'ACTIVE', NOW())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'ACTIVE'`,
          [`mem_${randomUUID().replace(/-/g, '')}`, invitation.tenant_id, userId],
        );
      } catch {
        // Fallback
      }
    }

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
