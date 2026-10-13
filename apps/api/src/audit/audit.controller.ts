import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateAuditEventSchema,
  AuditQueryFiltersSchema,
  SecurityQueryFiltersSchema,
} from '@stokrova/validation';
import type {
  AuditEventResponse,
  SecurityEventResponse,
  UserIdentity,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('audit')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async queryAuditEvents(
    @CurrentTenant() tenantId: string,
    @Query() query: unknown,
  ): Promise<AuditEventResponse[]> {
    const parsed = AuditQueryFiltersSchema.safeParse(query || {});
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid audit query parameters.',
          details: parsed.error.issues,
        },
      });
    }

    return this.auditService.queryAuditEvents(tenantId, parsed.data);
  }

  @Get('security')
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async querySecurityEvents(
    @CurrentTenant() tenantId: string,
    @Query() query: unknown,
  ): Promise<SecurityEventResponse[]> {
    const parsed = SecurityQueryFiltersSchema.safeParse(query || {});
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid security query parameters.',
          details: parsed.error.issues,
        },
      });
    }

    // Force tenant scope unless Platform Super Admin
    const filters = { ...parsed.data, tenant_id: tenantId };
    return this.auditService.querySecurityEvents(filters);
  }

  @Post('events')
  @RequirePermission(StandardPermissions.AUDIT_VIEW)
  async recordManualAuditEvent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<AuditEventResponse> {
    const parsed = CreateAuditEventSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid audit event payload.',
          details: parsed.error.issues,
        },
      });
    }

    return this.auditService.recordAuditEvent(tenantId, {
      ...parsed.data,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
  }
}
