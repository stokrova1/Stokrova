import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StandardPermissions } from '@stokrova/domain';
import type { UserIdentity } from '@stokrova/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InsightsService } from './insights.service.js';

/** Prices & margin, product profit, live staff activity, stock in/out and deliveries. */
@Controller('insights')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('prices')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  prices(@CurrentTenant() tenantId: string) {
    return this.insights.prices(tenantId);
  }

  @Get('prices/:variantId/history')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  history(@CurrentTenant() tenantId: string, @Param('variantId') id: string) {
    return this.insights.priceHistory(tenantId, id);
  }

  @Post('prices/:variantId')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  updatePrice(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined, @Param('variantId') id: string, @Body() body: { cost_price_minor?: unknown; selling_price_minor?: unknown }) {
    if (!me?.id) throw new BadRequestException('Sign in to change prices.');
    return this.insights.updatePrice(tenantId, me.id, id, body || {});
  }

  /** Whole business: every product's units, money taken and profit. */
  @Get('products')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  products(@CurrentTenant() tenantId: string) {
    return this.insights.products(tenantId);
  }

  /** Only what the signed-in seller sold. */
  @Get('my-products')
  myProducts(@CurrentTenant() tenantId: string, @CurrentUser() me: UserIdentity | undefined) {
    if (!me?.id) throw new BadRequestException('Signed-in staff member is required.');
    return this.insights.myProducts(tenantId, me.id);
  }

  @Get('abc')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  abc(@CurrentTenant() tenantId: string) {
    return this.insights.abc(tenantId);
  }

  @Get('activity')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  activity(@CurrentTenant() tenantId: string) {
    return this.insights.activity(tenantId);
  }

  @Get('stock')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  stock(@CurrentTenant() tenantId: string) {
    return this.insights.stockSummary(tenantId);
  }

  @Get('delivery')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  delivery(@CurrentTenant() tenantId: string) {
    return this.insights.deliverySummary(tenantId);
  }
}
