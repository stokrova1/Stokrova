import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PosService } from './pos.service.js';
import { PosCheckoutService } from './pos-checkout.service.js';
import { PosSyncService } from './pos-sync.service.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import {
  CreatePosRegisterConfigSchema,
  UpdatePosRegisterConfigSchema,
  OpenPosSessionSchema,
  RecordPosCashInSchema,
  RecordPosCashOutSchema,
  RecordPosCashDropSchema,
  ClosePosSessionSchema,
  ReconcilePosSessionSchema,
  PosCheckoutSchema,
  PosSyncBatchRequestSchema,
} from '@stokrova/validation';
import type {
  CreatePosRegisterConfigRequest,
  UpdatePosRegisterConfigRequest,
  OpenPosSessionRequest,
  RecordPosCashInRequest,
  RecordPosCashOutRequest,
  RecordPosCashDropRequest,
  ClosePosSessionRequest,
  ReconcilePosSessionRequest,
  PosCheckoutRequest,
  PosSyncBatchRequest,
} from '@stokrova/contracts';

@Controller('v1/pos')
@UseGuards(TenantGuard, RbacGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly checkoutService: PosCheckoutService,
    private readonly syncService: PosSyncService,
  ) {}

  @Post('registers')
  @RequirePermission('registers:manage')
  async createRegister(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreatePosRegisterConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.createRegisterConfig(
      tenantId,
      parsed.data as CreatePosRegisterConfigRequest,
    );
  }

  @Get('registers')
  @RequirePermission('registers:read')
  async getRegisters(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.posService.getRegisterConfigs(tenantId, branchId);
  }

  @Get('registers/:id')
  @RequirePermission('registers:read')
  async getRegisterById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getRegisterConfigById(tenantId, id);
  }

  @Patch('registers/:id')
  @RequirePermission('registers:manage')
  async updateRegister(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdatePosRegisterConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.updateRegisterConfig(
      tenantId,
      id,
      parsed.data as UpdatePosRegisterConfigRequest,
    );
  }

  @Post('sessions/open')
  @RequirePermission('registers:operate')
  async openSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: unknown,
  ) {
    const parsed = OpenPosSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.openSession(
      tenantId,
      userId || 'usr_anonymous',
      parsed.data as OpenPosSessionRequest,
    );
  }

  @Get('sessions/active')
  @RequirePermission('registers:read')
  async getActiveSession(
    @Headers('x-tenant-id') tenantId: string,
    @Query('register_id') registerId: string,
  ) {
    if (!registerId) {
      throw new BadRequestException('register_id query parameter is required.');
    }
    return this.posService.getActiveSession(tenantId, registerId);
  }

  @Get('sessions/:id')
  @RequirePermission('registers:read')
  async getSessionById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getSessionById(tenantId, id);
  }

  @Get('sessions/:id/summary')
  @RequirePermission('registers:read')
  async getSessionSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getSessionSummary(tenantId, id);
  }

  @Post('sessions/:id/suspend')
  @RequirePermission('registers:operate')
  async suspendSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.posService.suspendSession(tenantId, id, userId || 'usr_anonymous');
  }

  @Post('sessions/:id/resume')
  @RequirePermission('registers:operate')
  async resumeSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.posService.resumeSession(tenantId, id, userId || 'usr_anonymous');
  }

  @Post('sessions/:id/cash-in')
  @RequirePermission('registers:operate')
  async recordCashIn(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RecordPosCashInSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.recordCashIn(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parsed.data as RecordPosCashInRequest,
    );
  }

  @Post('sessions/:id/cash-out')
  @RequirePermission('registers:operate')
  async recordCashOut(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RecordPosCashOutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.recordCashOut(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parsed.data as RecordPosCashOutRequest,
    );
  }

  @Post('sessions/:id/cash-drop')
  @RequirePermission('registers:operate')
  async recordCashDrop(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RecordPosCashDropSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.recordCashDrop(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parsed.data as RecordPosCashDropRequest,
    );
  }

  @Post('sessions/:id/close')
  @RequirePermission('registers:operate')
  async closeSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = ClosePosSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.closeSession(
      tenantId,
      id,
      userId || 'usr_anonymous',
      parsed.data as ClosePosSessionRequest,
    );
  }

  @Post('sessions/:id/reconcile')
  @RequirePermission('registers:manage')
  async reconcileSession(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = ReconcilePosSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.posService.reconcileSession(
      tenantId,
      id,
      parsed.data as ReconcilePosSessionRequest,
    );
  }

  @Post('checkout')
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
  async checkout(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: unknown,
  ) {
    const parsed = PosCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.checkoutService.processCheckout(
      tenantId,
      userId || 'usr_anonymous',
      parsed.data as PosCheckoutRequest,
    );
  }

  @Post('sync')
  @RequirePermission(StandardPermissions.POS_SYNC)
  async sync(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: unknown,
  ) {
    const parsed = PosSyncBatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.syncService.processSyncBatch(
      tenantId,
      userId || 'usr_anonymous',
      parsed.data as PosSyncBatchRequest,
    );
  }
}

