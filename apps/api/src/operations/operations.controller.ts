import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StandardPermissions } from '@stokrova/domain';
import type { UserIdentity } from '@stokrova/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { OperationsService } from './operations.service.js';

const who = (me?: UserIdentity) => { if (!me?.id) throw new BadRequestException('Sign in first.'); return me.id; };

/** Money owed, stock counts, product import, photos, alerts and the daily summary. */
@Controller('operations')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class OperationsController {
  constructor(private readonly ops: OperationsService) {}

  @Get('receivables')
  @RequirePermission(StandardPermissions.INVOICES_VIEW)
  receivables(@CurrentTenant() t: string) { return this.ops.receivables(t); }

  @Get('payables')
  @RequirePermission(StandardPermissions.PROCUREMENT_SUPPLIER_INVOICE_VIEW)
  payables(@CurrentTenant() t: string) { return this.ops.payables(t); }

  @Get('stock-counts')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  counts(@CurrentTenant() t: string) { return this.ops.listCounts(t); }

  @Post('stock-counts')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  start(@CurrentTenant() t: string, @CurrentUser() me: UserIdentity | undefined, @Body() b: { warehouse_id?: string }) { return this.ops.startCount(t, who(me), String(b?.warehouse_id || '')); }

  @Post('stock-counts/:id/lines')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  lines(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: { lines?: { variant_id: string; counted: unknown }[] }) { return this.ops.recordCounts(t, id, b?.lines || []); }

  @Post('stock-counts/:id/post')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  post(@CurrentTenant() t: string, @CurrentUser() me: UserIdentity | undefined, @Param('id') id: string) { return this.ops.postCount(t, who(me), id); }

  @Post('stock-counts/:id/cancel')
  @RequirePermission(StandardPermissions.INVENTORY_ADJUST)
  cancel(@CurrentTenant() t: string, @Param('id') id: string) { return this.ops.cancelCount(t, id); }

  @Post('products/import')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  importProducts(@CurrentTenant() t: string, @CurrentUser() me: UserIdentity | undefined, @Body() b: { rows?: Record<string, unknown>[]; warehouse_id?: string; dry_run?: boolean }) { return this.ops.importProducts(t, who(me), b || {}); }

  @Post('products/:variantId/image')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  image(@CurrentTenant() t: string, @Param('variantId') id: string, @Body() b: { image_url?: unknown }) { return this.ops.setImage(t, id, b?.image_url); }

  @Get('alerts')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  digest(@CurrentTenant() t: string) { return this.ops.digest(t); }

  @Post('alerts/settings')
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  settings(@CurrentTenant() t: string, @Body() b: Record<string, unknown>) { return this.ops.saveSettings(t, b as never); }

  @Post('alerts/send-now')
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  send(@CurrentTenant() t: string) { return this.ops.sendSummary(t); }
}
