import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { StandardPermissions } from '@stokrova/domain';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { SalesTicketsService, type CreateTicketInput, type PayTicketInput } from './sales-tickets.service.js';

const user = (id?: string) => {
  if (!id) throw new BadRequestException('Signed-in staff member is required.');
  return id;
};

/** Shop-counter order tickets: order taker writes, picker ticks, cashier scans and records payment. */
@Controller('pos/tickets')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class SalesTicketsController {
  constructor(private readonly tickets: SalesTicketsService, private readonly warehouses: WarehousesService) {}

  /** Shops/stores an order taker can write a list against (names only). */
  @Get('stores')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async stores(@CurrentTenant() tenantId: string) {
    return (await this.warehouses.getWarehouses(tenantId)).map((w) => ({ id: w.id, name: w.name, code: w.code }));
  }

  @Post()
  @RequirePermission(StandardPermissions.SALES_ORDER_CREATE)
  create(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Body() body: CreateTicketInput) {
    return this.tickets.create(tenantId, user(me?.id), body || ({} as CreateTicketInput));
  }

  @Get()
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  list(@CurrentTenant() tenantId: string, @Query('status') status?: string) {
    return this.tickets.list(tenantId, status);
  }

  /** Picker and cashier both open a ticket by scanning the slip barcode. */
  @Get(':code')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  get(@CurrentTenant() tenantId: string, @Param('code') code: string) {
    return this.tickets.getByCode(tenantId, code);
  }

  @Post(':code/pick')
  @RequirePermission(StandardPermissions.INVENTORY_PICK)
  pick(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Param('code') code: string, @Body() body: { variant_id: string; picked_quantity: number }) {
    return this.tickets.pick(tenantId, user(me?.id), code, body?.variant_id, Number(body?.picked_quantity));
  }

  @Post(':code/pay')
  @RequirePermission(StandardPermissions.POS_CHECKOUT)
  pay(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Param('code') code: string, @Body() body: PayTicketInput) {
    if (!body?.pos_session_id || !body?.pos_register_id || !body?.tenders?.length) throw new BadRequestException('Open a shift and record cash or transfer first.');
    return this.tickets.pay(tenantId, user(me?.id), code, body);
  }

  @Post(':code/cancel')
  @RequirePermission(StandardPermissions.SALES_ORDER_CANCEL)
  cancel(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Param('code') code: string) {
    return this.tickets.cancel(tenantId, user(me?.id), code);
  }
}

/** Every signed-in worker's own daily count. Only ever returns the caller's own work. */
@Controller('staff')
@UseGuards(AuthGuard, TenantGuard)
export class StaffDayController {
  constructor(private readonly tickets: SalesTicketsService) {}

  @Get('my-day')
  myDay(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Query('date') date?: string) {
    return this.tickets.myDay(tenantId, user(me?.id), date);
  }
}
