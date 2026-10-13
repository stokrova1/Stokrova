import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from './billing.service.js';
import {
  CreateSubscriptionSchema,
  ChangeSubscriptionPlanSchema,
  RecordMeteredUsageSchema,
} from '@stokrova/validation';
import { TIER_ENTITLEMENT_DEFINITIONS } from '@stokrova/domain';
import type { SubscriptionTier } from '@stokrova/contracts';

@Controller('v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  getAvailablePlans() {
    return Object.values(TIER_ENTITLEMENT_DEFINITIONS);
  }

  @Get('subscription')
  async getSubscription(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return this.billingService.getSubscription(tenantId);
  }

  @Post('subscription')
  async createSubscription(@Body() body: unknown) {
    const parsed = CreateSubscriptionSchema.parse(body);
    return this.billingService.createSubscription(parsed);
  }

  @Get('subscription/quote')
  async quotePlanChange(
    @Headers('x-tenant-id') tenantId: string,
    @Query('target_tier') targetTier: SubscriptionTier,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    if (!targetTier) {
      throw new BadRequestException('target_tier query parameter is required');
    }
    return this.billingService.quotePlanChange(tenantId, targetTier);
  }

  @Post('subscription/plan')
  async changePlan(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: unknown,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    const parsed = ChangeSubscriptionPlanSchema.parse(body);
    return this.billingService.changePlan(
      tenantId,
      parsed.target_tier,
      parsed.effective_immediately,
    );
  }

  @Post('usage')
  @HttpCode(HttpStatus.OK)
  async recordUsage(@Body() body: unknown) {
    const parsed = RecordMeteredUsageSchema.parse(body);
    return this.billingService.recordMeteredUsage(parsed);
  }

  @Get('usage')
  async getUsage(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return this.billingService.getUsageSummary(tenantId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(@Body() body: any) {
    // Validates payload and processes payment settlement
    if (!body?.invoice_id || !body?.payment_gateway_reference) {
      throw new BadRequestException('Invalid webhook event format');
    }
    return this.billingService.processPaymentWebhook({
      invoice_id: body.invoice_id,
      payment_gateway_reference: body.payment_gateway_reference,
      amount_paid_minor: body.amount_paid_minor ?? '0',
      status: body.status === 'FAILED' ? 'FAILED' : 'SUCCEEDED',
      failure_reason: body.failure_reason,
    });
  }
}
