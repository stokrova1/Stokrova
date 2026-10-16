import {
  Optional,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RegistersService } from './registers.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateRegisterRequestSchema,
  UpdateRegisterRequestSchema,
  OpenSessionRequestSchema,
  CloseSessionRequestSchema,
  RecordCashMovementRequestSchema,
} from '@stokrova/validation';
import type {
  RegisterResponse,
  CreateRegisterRequest,
  UpdateRegisterRequest,
  RegisterSessionResponse,
  CashMovementResponse,
  SessionSummaryResponse,
  OpenSessionRequest,
  CloseSessionRequest,
  RecordCashMovementRequest,
  UserIdentity,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

import { PlanEntitlementsService } from '../billing/plan-entitlements.service.js';

@Controller('registers')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class RegistersController {
  constructor(
    private readonly registersService: RegistersService,
    @Optional() private readonly plans?: PlanEntitlementsService,
  ) {
    this.plans?.registerCounter('max_active_registers', async (t) => (await this.registersService.getRegisters(t)).length);
  }

  @Post()
  @RequirePermission(StandardPermissions.REGISTERS_MANAGE)
  async createRegister(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<RegisterResponse> {
    const parseResult = CreateRegisterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid register creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    await this.plans?.assertCanAdd(tenantId, 'max_active_registers');
    return this.registersService.createRegister(
      tenantId,
      parseResult.data as CreateRegisterRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getRegisters(
    @CurrentTenant() tenantId: string,
    @Query('branch_id') branchId?: string,
    @Query('work_center_id') workCenterId?: string,
  ): Promise<RegisterResponse[]> {
    return this.registersService.getRegisters(tenantId, branchId, workCenterId);
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getRegister(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<RegisterResponse> {
    return this.registersService.getRegisterById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.REGISTERS_MANAGE)
  async updateRegister(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<RegisterResponse> {
    const parseResult = UpdateRegisterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid register update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.registersService.updateRegister(
      tenantId,
      id,
      parseResult.data as UpdateRegisterRequest,
    );
  }

  @Post(':id/sessions/open')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async openSession(
    @CurrentTenant() tenantId: string,
    @Param('id') registerId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<RegisterSessionResponse> {
    const payload = typeof body === 'object' && body !== null ? { ...body, register_id: registerId } : { register_id: registerId };
    const parseResult = OpenSessionRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid open session payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.registersService.openSession(
      tenantId,
      user.id,
      parseResult.data as OpenSessionRequest,
    );
  }

  @Get(':id/sessions/active')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getActiveSession(
    @CurrentTenant() tenantId: string,
    @Param('id') registerId: string,
  ): Promise<RegisterSessionResponse | null> {
    return this.registersService.getActiveSession(tenantId, registerId);
  }

  @Post('sessions/:sessionId/movements')
  @RequirePermission(StandardPermissions.CASH_MOVEMENT_RECORD)
  async recordCashMovement(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<CashMovementResponse> {
    const parseResult = RecordCashMovementRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid cash movement payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.registersService.recordCashMovement(
      tenantId,
      sessionId,
      user.id,
      parseResult.data as RecordCashMovementRequest,
    );
  }

  @Get('sessions/:sessionId/summary')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getSessionSummary(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionSummaryResponse> {
    return this.registersService.getSessionSummary(tenantId, sessionId);
  }

  @Post('sessions/:sessionId/close')
  @RequirePermission(StandardPermissions.REGISTER_CLOSE)
  async closeSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<RegisterSessionResponse> {
    const parseResult = CloseSessionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid close session payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.registersService.closeSession(
      tenantId,
      sessionId,
      user.id,
      parseResult.data as CloseSessionRequest,
    );
  }
}
