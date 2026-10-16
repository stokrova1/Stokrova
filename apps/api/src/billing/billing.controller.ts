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
  UseGuards,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { verifyWebhookSignature } from './webhook-signature.js';
import { configuredProviders, parseProvider, makeReference, invoiceIdFromReference, startCheckout, verifyCharge, chargeSettles, paystackSignatureOk, flutterwaveHashOk, type PayProvider } from './invoice-checkout.js';
import { Param } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import { BillingService } from './billing.service.js';
import { PlanPricingService } from './plan-pricing.service.js';
import {
  CreateSubscriptionSchema,
  ChangeSubscriptionPlanSchema,
  RecordMeteredUsageSchema,
} from '@stokrova/validation';
import { TIER_ENTITLEMENT_DEFINITIONS, OFFERED_TIERS, planForTier, pagesFor } from '@stokrova/domain';
import { PlanEntitlementsService } from './plan-entitlements.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import { Optional } from '@nestjs/common';
import type { SubscriptionTier } from '@stokrova/contracts';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly pricing: PlanPricingService,
    @Optional() private readonly plans: PlanEntitlementsService = new PlanEntitlementsService(billingService),
  ) {}

  /** Public: plans with the price the founder set most recently (used by the website and sign-up). */
  @Get('plans')
  async getAvailablePlans() {
    const prices = new Map((await this.pricing.list()).map((p) => [p.tier, p]));
    return OFFERED_TIERS.map((tier) => {
      const d = { ...TIER_ENTITLEMENT_DEFINITIONS[tier], pages: pagesFor(planForTier(tier)), limits: planForTier(tier).limits };
      const p = prices.get(tier);
      return p ? { ...d, monthly_price_minor: p.monthly_price_minor, annual_price_minor: p.annual_price_minor, currency: p.currency, price_updated_at: p.updated_at } : d;
    });
  }

  /** Any signed-in staff member: the pages, limits and live usage of the business's plan (drives the menu). */
  @Get('entitlements')
  @UseGuards(AuthGuard, TenantGuard)
  async getEntitlements(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.plans.entitlements(tenantId);
  }

  @Get('plan-history')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async getPlanHistory(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.billingService.planHistory(tenantId);
  }

  /** Any signed-in staff member can see whether the workspace is on trial, open, or closed for payment. */
  @Get('access')
  @UseGuards(AuthGuard, TenantGuard)
  async getAccess(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.billingService.access(tenantId);
  }

  @Get('invoices')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async listInvoices(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.billingService.listInvoices(tenantId);
  }

  @Get('subscription')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async getSubscription(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return this.billingService.getSubscription(tenantId);
  }

  @Post('subscription')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async createSubscription(@Body() body: unknown) {
    const parsed = CreateSubscriptionSchema.parse(body);
    return this.billingService.createSubscription(parsed);
  }

  @Get('subscription/quote')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
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
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async changePlan(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: unknown,
    @CurrentUser() user?: UserIdentity,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    const parsed = ChangeSubscriptionPlanSchema.parse(body);
    if (!PlanPricingService.isTier(parsed.target_tier)) {
      throw new BadRequestException('Choose Starter, Growth or Enterprise.');
    }
    // A smaller plan only when the business already fits it (staff, branches, tills, warehouses).
    const blockers = await this.plans.downgradeBlockers(tenantId, parsed.target_tier);
    if (blockers.length) {
      throw new BadRequestException({
        error: { code: 'PLAN_DOWNGRADE_BLOCKED', blockers, message: `Before moving to this plan, ${blockers.join('; ')}.` },
      });
    }
    return this.billingService.changePlan(
      tenantId,
      parsed.target_tier,
      parsed.effective_immediately,
      { actor_id: user?.id ?? 'owner', source: 'OWNER' },
    );
  }

  @Post('usage')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  @HttpCode(HttpStatus.OK)
  async recordUsage(@Body() body: unknown) {
    const parsed = RecordMeteredUsageSchema.parse(body);
    return this.billingService.recordMeteredUsage(parsed);
  }

  @Get('usage')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async getUsage(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return this.billingService.getUsageSummary(tenantId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(
    @Body() body: any,
    @Req() req: RawBodyRequest<{ rawBody?: Buffer }>,
    @Headers('x-stokrova-signature') signature?: string,
  ) {
    // Only the payment provider holding BILLING_WEBHOOK_SECRET can confirm a payment.
    if (!verifyWebhookSignature(process.env['BILLING_WEBHOOK_SECRET'], req.rawBody, signature)) {
      throw new UnauthorizedException('Payment confirmation signature is missing or invalid.');
    }
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

  /** Which pay buttons to show (only providers whose keys are set on this server). */
  @Get('payment-providers')
  paymentProviders() {
    return { providers: configuredProviders() };
  }

  /** Owner starts paying one of their invoices; returns the provider's checkout page. */
  @Post('invoices/:id/pay')
  @UseGuards(AuthGuard, TenantGuard, RbacGuard)
  @RequirePermission(StandardPermissions.BILLING_MANAGE)
  async payInvoice(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any, @CurrentUser() user?: UserIdentity) {
    const provider = parseProvider(body?.provider);
    if (!provider || !configuredProviders().includes(provider)) throw new BadRequestException('Choose Paystack or Flutterwave.');
    const inv = this.billingService.invoiceById(id);
    if (!inv || inv.tenant_id !== tenantId) throw new BadRequestException('Invoice not found.');
    if (inv.status === 'PAID') throw new BadRequestException('This invoice is already paid.');
    const email = (user as any)?.email || body?.email;
    if (!email) throw new BadRequestException('An email address is needed for the payment receipt.');
    const redirect = typeof body?.return_url === 'string' && /^https?:\/\//.test(body.return_url) ? body.return_url : (process.env['APP_PUBLIC_URL'] || 'http://localhost:3000');
    try {
      return await startCheckout(provider, { reference: makeReference(inv.id), amount_minor: String(inv.total_minor), currency: inv.currency, email, redirect_url: redirect, invoice_number: inv.invoice_number });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'The payment could not be started.');
    }
  }

  /** Owner returns from the checkout page: Stokrova asks the provider and settles the invoice if paid. */
  @Post('invoices/:id/verify')
  @UseGuards(AuthGuard, TenantGuard)
  async verifyInvoice(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: any) {
    const provider = parseProvider(body?.provider);
    const reference = String(body?.reference ?? '');
    const inv = this.billingService.invoiceById(id);
    if (!provider || !inv || inv.tenant_id !== tenantId || invoiceIdFromReference(reference) !== id) throw new BadRequestException('Unknown payment.');
    return this.settle(provider, reference);
  }

  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(@Body() body: any, @Req() req: RawBodyRequest<{ rawBody?: Buffer }>, @Headers('x-paystack-signature') sig?: string) {
    if (!paystackSignatureOk(process.env['PAYSTACK_SECRET_KEY'], req.rawBody, sig)) throw new UnauthorizedException('Invalid Paystack signature.');
    if (body?.event !== 'charge.success' || !body?.data?.reference) return { ignored: true };
    return this.settle('PAYSTACK', String(body.data.reference));
  }

  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  async flutterwaveWebhook(@Body() body: any, @Headers('verif-hash') hash?: string) {
    if (!flutterwaveHashOk(process.env['FLUTTERWAVE_WEBHOOK_HASH'], hash)) throw new UnauthorizedException('Invalid Flutterwave hash.');
    const ref = body?.data?.tx_ref ?? body?.txRef;
    if (!ref) return { ignored: true };
    return this.settle('FLUTTERWAVE', String(ref));
  }

  /** Marks the invoice paid only after the provider itself confirms the full amount (safe to call twice). */
  private async settle(provider: PayProvider, reference: string) {
    const id = invoiceIdFromReference(reference);
    const inv = id ? this.billingService.invoiceById(id) : undefined;
    if (!inv) return { paid: false, reason: 'unknown invoice' };
    if (inv.status === 'PAID') return { paid: true, invoice: inv };
    const charge = await verifyCharge(provider, reference);
    if (!chargeSettles(charge, { total_minor: String(inv.total_minor), currency: inv.currency })) return { paid: false, reason: 'not confirmed by provider' };
    const r = await this.billingService.processPaymentWebhook({ invoice_id: inv.id, payment_gateway_reference: `${provider}:${reference}`, amount_paid_minor: charge.amount_minor, status: 'SUCCEEDED' });
    return { paid: true, invoice: r.invoice };
  }
}
