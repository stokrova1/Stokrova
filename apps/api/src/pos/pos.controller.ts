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
  Optional,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import { SalesTicketsService } from './sales-tickets.service.js';
import { PosService } from './pos.service.js';
import { PosCheckoutService } from './pos-checkout.service.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { PosCatalogService } from './pos-catalog.service.js';
import { PosSyncService } from './pos-sync.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
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

@Controller('pos')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly checkoutService: PosCheckoutService,
    private readonly syncService: PosSyncService,
    private readonly catalogService: PosCatalogService,
    @Optional() private readonly salesTickets?: SalesTicketsService,
  ) {}

  /** Products with their current price and live stock, for the till and catalog. */
  @Get('products')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getSellableProducts(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('pricelist_id') pricelistId?: string,
    @Query('customer_id') customerId?: string,
  ) {
    return this.catalogService.listSellable(tenantId, { warehouse_id: warehouseId, pricelist_id: pricelistId, customer_id: customerId });
  }

  @Post('registers')
  @RequirePermission(StandardPermissions.REGISTERS_MANAGE)
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
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getRegisters(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.posService.getRegisterConfigs(tenantId, branchId);
  }

  @Get('registers/:id')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getRegisterById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getRegisterConfigById(tenantId, id);
  }

  @Patch('registers/:id')
  @RequirePermission(StandardPermissions.REGISTERS_MANAGE)
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
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
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
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
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
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getSessionById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getSessionById(tenantId, id);
  }

  @Get('sessions/:id/summary')
  @RequirePermission(StandardPermissions.REGISTER_OPEN)
  async getSessionSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.posService.getSessionSummary(tenantId, id);
  }

  @Post('sessions/:id/suspend')
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
  async suspendSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.posService.suspendSession(tenantId, id, userId || 'usr_anonymous');
  }

  @Post('sessions/:id/resume')
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
  async resumeSession(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.posService.resumeSession(tenantId, id, userId || 'usr_anonymous');
  }

  @Post('sessions/:id/cash-in')
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
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
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
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
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
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
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
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
  @RequirePermission(StandardPermissions.REGISTERS_MANAGE)
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
    @CurrentUser() me: UserIdentity | undefined,
    @Body() body: unknown,
  ) {
    const parsed = PosCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    const result = await this.checkoutService.processCheckout(
      tenantId,
      userId || 'usr_anonymous',
      parsed.data as PosCheckoutRequest,
    );
    // Count it on the signed-in cashier's own "My day".
    if (me?.id) this.salesTickets?.recordSale(tenantId, me.id, result.receipt_number, Number(result.total_payable_minor), parsed.data.tenders, result.order_id);
    return result;
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

