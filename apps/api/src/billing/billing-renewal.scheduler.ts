import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { PlanPricingService } from './plan-pricing.service.js';

const HOUR = 60 * 60 * 1000;

/**
 * Hourly: starts a subscription for any business that has none (using the plan saved on it),
 * then renews every subscription whose period has ended at the current plan price.
 * Off in tests and when BILLING_RENEWALS=off.
 */
@Injectable()
export class BillingRenewalScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BillingRenewalScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly billing: BillingService,
    private readonly pricing: PlanPricingService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env['NODE_ENV'] === 'test' || process.env['BILLING_RENEWALS'] === 'off') return;
    setTimeout(() => void this.runOnce(), 60_000).unref?.();
    this.timer = setInterval(() => void this.runOnce(), HOUR);
    this.timer.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()): Promise<number> {
    try {
      for (const tenantId of await this.pricing.tenantsWithoutSubscription()) {
        await this.billing.getSubscription(tenantId);
      }
      const issued = await this.billing.renewDueSubscriptions(now);
      if (issued.length) this.logger.log(`Issued ${issued.length} renewal invoice(s).`);
      return issued.length;
    } catch (e) {
      this.logger.error(`Renewal run failed: ${(e as Error).message}`);
      return 0;
    }
  }
}
