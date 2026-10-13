import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PricingService } from './pricing.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreatePriceListSchema,
  CreatePriceListRuleSchema,
  CreateTaxRateSchema,
  CreateDiscountPromotionSchema,
  CalculateCartSchema,
} from '@stokrova/validation';
import type {
  PriceListResponse,
  ListPriceListsResponse,
  CreatePriceListRequest,
  CreatePriceListRuleRequest,
  PriceListRule,
  TaxRateResponse,
  ListTaxRatesResponse,
  CreateTaxRateRequest,
  PromotionResponse,
  CreateDiscountPromotionRequest,
  CalculateCartRequest,
  CalculateCartResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('pricing')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('pricelists')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createPriceList(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PriceListResponse> {
    const parseResult = CreatePriceListSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid price list creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const pricelist = await this.pricingService.createPriceList(
      tenantId,
      parseResult.data as CreatePriceListRequest,
    );
    return { pricelist };
  }

  @Get('pricelists')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getPriceLists(
    @CurrentTenant() tenantId: string,
  ): Promise<ListPriceListsResponse> {
    const pricelists = await this.pricingService.getPriceLists(tenantId);
    return { pricelists };
  }

  @Get('pricelists/:id')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getPriceListById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PriceListResponse> {
    const pricelist = await this.pricingService.getPriceListById(tenantId, id);
    return { pricelist };
  }

  @Post('rules')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createPriceListRule(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<{ rule: PriceListRule }> {
    const parseResult = CreatePriceListRuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid price list rule creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const rule = await this.pricingService.createPriceListRule(
      tenantId,
      parseResult.data as CreatePriceListRuleRequest,
    );
    return { rule };
  }

  @Post('taxes')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createTaxRate(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<TaxRateResponse> {
    const parseResult = CreateTaxRateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid tax rate creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const tax_rate = await this.pricingService.createTaxRate(
      tenantId,
      parseResult.data as CreateTaxRateRequest,
    );
    return { tax_rate };
  }

  @Get('taxes')
  @RequirePermission(StandardPermissions.CATALOG_VIEW)
  async getTaxRates(
    @CurrentTenant() tenantId: string,
  ): Promise<ListTaxRatesResponse> {
    const tax_rates = await this.pricingService.getTaxRates(tenantId);
    return { tax_rates };
  }

  @Post('promotions')
  @RequirePermission(StandardPermissions.CATALOG_MANAGE)
  async createDiscountPromotion(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PromotionResponse> {
    const parseResult = CreateDiscountPromotionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid discount promotion creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const promotion = await this.pricingService.createDiscountPromotion(
      tenantId,
      parseResult.data as CreateDiscountPromotionRequest,
    );
    return { promotion };
  }

  @Post('calculate-cart')
  @RequirePermission(StandardPermissions.SALES_ORDER_CREATE)
  async calculateCart(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CalculateCartResponse> {
    const parseResult = CalculateCartSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid cart calculation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.pricingService.calculateCart(
      tenantId,
      parseResult.data as CalculateCartRequest,
    );
  }
}
