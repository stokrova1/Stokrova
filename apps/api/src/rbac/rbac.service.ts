import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  RoleResponse,
  RoleAssignmentResponse,
  CreateCustomRoleRequest,
  AssignRoleRequest,
  ScopeTarget,
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

@Injectable()
export class RbacService {
  private rolesStore = new Map<string, StoredRole>();
  private assignmentsStore = new Map<string, StoredRoleAssignment>();

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
    this.seedSystemTemplates();
  }
}
