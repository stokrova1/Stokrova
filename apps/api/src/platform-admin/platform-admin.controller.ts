import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { PlatformAdminGuard } from '../auth/platform-admin.guard.js';
import { RequirePlatformCapability } from '../auth/decorators/require-platform-capability.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import { PlatformAdminService } from './platform-admin.service.js';
import type {
  PlatformAdminQueryDto,
  SuspendBusinessDto,
  ReactivateBusinessDto,
  UpdateBusinessTierDto,
  UpdatePlanPriceDto,
  SuspendUserDto,
  ReactivateUserDto,
} from './platform-admin.dto.js';

@Controller('platform-admin')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  @Get('overview')
  @RequirePlatformCapability('platform.overview.view')
  async getOverview(@CurrentUser() user?: UserIdentity) {
    return this.service.getOverview(user?.id);
  }

  @Get('businesses')
  @RequirePlatformCapability('platform.businesses.view')
  async listBusinesses(@Query() query: PlatformAdminQueryDto) {
    return this.service.listBusinesses(query);
  }

  @Get('businesses/:id')
  @RequirePlatformCapability('platform.businesses.view')
  async getBusinessDetails(@Param('id') id: string) {
    return this.service.getBusinessDetails(id);
  }

  @Post('businesses/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.businesses.suspend')
  async suspendBusiness(
    @Param('id') id: string,
    @Body() dto: SuspendBusinessDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.suspendBusiness(id, dto, user?.id || 'usr_platform_admin');
  }

  @Post('businesses/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.businesses.reactivate')
  async reactivateBusiness(
    @Param('id') id: string,
    @Body() dto: ReactivateBusinessDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.reactivateBusiness(id, dto, user?.id || 'usr_platform_admin');
  }

  @Patch('businesses/:id/tier')
  @RequirePlatformCapability('platform.businesses.tier')
  async updateBusinessTier(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessTierDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.updateBusinessTier(id, dto, user?.id || 'usr_platform_admin');
  }

  @Get('plans')
  @RequirePlatformCapability('platform.plans.view')
  async listPlans() {
    return this.service.listPlans();
  }

  @Patch('plans/:tier')
  @RequirePlatformCapability('platform.plans.manage')
  async updatePlanPrice(
    @Param('tier') tier: string,
    @Body() dto: UpdatePlanPriceDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.updatePlanPrice(tier, dto, user?.id || 'usr_platform_admin');
  }

  @Get('businesses/:id/billing')
  @RequirePlatformCapability('platform.businesses.view')
  async getBusinessBilling(@Param('id') id: string) {
    return this.service.getBusinessBilling(id);
  }

  @Patch('businesses/:id/billing')
  @RequirePlatformCapability('platform.businesses.tier')
  async setBusinessBilling(@Param('id') id: string, @Body() dto: { mode?: string; value?: string; note?: string }, @CurrentUser() user?: UserIdentity) {
    return this.service.setBusinessBilling(id, dto, user?.id || 'usr_platform_admin');
  }

  /** Founder: extra features or raised limits for one business, on top of its plan. */
  @Patch('businesses/:id/entitlements')
  @RequirePlatformCapability('platform.businesses.tier')
  async setBusinessEntitlements(@Param('id') id: string, @Body() dto: { features?: string[]; limits?: Record<string, number | null>; note?: string }, @CurrentUser() user?: UserIdentity) {
    return this.service.setBusinessEntitlements(id, dto ?? {}, user?.id || 'usr_platform_admin');
  }

  @Post('businesses/:id/extend-trial')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.businesses.tier')
  async extendTrial(@Param('id') id: string, @Body() dto: { days?: number }, @CurrentUser() user?: UserIdentity) {
    return this.service.extendBusinessTrial(id, Number(dto?.days), user?.id || 'usr_platform_admin');
  }

  @Post('businesses/:id/invoices/:invoiceId/mark-paid')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.businesses.tier')
  async markInvoicePaid(@Param('id') id: string, @Param('invoiceId') invoiceId: string, @Body() dto: { reference?: string }, @CurrentUser() user?: UserIdentity) {
    return this.service.markBusinessInvoicePaid(id, invoiceId, dto?.reference ?? '', user?.id || 'usr_platform_admin');
  }

  @Get('users')
  @RequirePlatformCapability('platform.users.view')
  async listUsers(@Query() query: PlatformAdminQueryDto) {
    return this.service.listUsers(query);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.users.suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.suspendUser(id, dto, user?.id || 'usr_platform_admin');
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformCapability('platform.users.reactivate')
  async reactivateUser(
    @Param('id') id: string,
    @Body() dto: ReactivateUserDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.service.reactivateUser(id, dto, user?.id || 'usr_platform_admin');
  }

  @Get('health')
  @RequirePlatformCapability('platform.health.view')
  async getHealth() {
    return this.service.getHealth();
  }

  @Get('audit')
  @RequirePlatformCapability('platform.audit.view')
  async getAuditEvents(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.getAuditEvents(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
