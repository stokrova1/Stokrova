import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from './rbac.guard.js';
import { RequirePermission } from './decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import {
  CreateCustomRoleRequestSchema,
  AssignRoleRequestSchema,
  InviteStaffRequestSchema,
  AcceptStaffInvitationRequestSchema,
} from '@stokrova/validation';
import type {
  RoleResponse,
  RoleAssignmentResponse,
  CreateCustomRoleRequest,
  AssignRoleRequest,
  InviteStaffRequest,
  StaffInvitationResponse,
  AcceptStaffInvitationRequest,
  AcceptStaffInvitationResponse,
  UserIdentity,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('rbac')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('templates')
  async getTemplates(): Promise<RoleResponse[]> {
    return this.rbacService.getRoleTemplates();
  }

  @Get('roles')
  async getRoles(@CurrentTenant() tenantId: string): Promise<RoleResponse[]> {
    return this.rbacService.getRolesForTenant(tenantId);
  }

  @Post('roles')
  @RequirePermission(StandardPermissions.ROLES_MANAGE)
  async createCustomRole(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<RoleResponse> {
    const parseResult = CreateCustomRoleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid role creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rbacService.createCustomRole(
      tenantId,
      parseResult.data as CreateCustomRoleRequest,
    );
  }

  @Post('assignments')
  @RequirePermission(StandardPermissions.ROLES_MANAGE)
  async assignRole(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<RoleAssignmentResponse> {
    const parseResult = AssignRoleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid role assignment payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rbacService.assignRole(
      tenantId,
      parseResult.data as AssignRoleRequest,
    );
  }

  @Get('assignments/me')
  async getMyAssignments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.rbacService.getUserActiveAssignments(tenantId, user.id);
  }

  @Post('invitations')
  @RequirePermission(StandardPermissions.STAFF_MANAGE)
  async inviteStaff(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<StaffInvitationResponse> {
    const parseResult = InviteStaffRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid staff invitation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rbacService.inviteStaff(
      tenantId,
      user.id,
      parseResult.data as InviteStaffRequest,
    );
  }

  @Get('invitations')
  @RequirePermission(StandardPermissions.STAFF_MANAGE)
  async listInvitations(
    @CurrentTenant() tenantId: string,
  ): Promise<StaffInvitationResponse[]> {
    return this.rbacService.listInvitations(tenantId);
  }

  @Public()
  @Post('invitations/accept')
  async acceptInvitation(
    @Body() body: unknown,
  ): Promise<AcceptStaffInvitationResponse> {
    const parseResult = AcceptStaffInvitationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid invitation acceptance payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rbacService.acceptInvitation(
      parseResult.data as AcceptStaffInvitationRequest,
    );
  }
}

