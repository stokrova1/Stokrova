import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BillingAccessGuard } from './billing-access.guard.js';
import { PlanFeatureGuard } from './plan-feature.guard.js';
import { PlanEntitlementsService } from './plan-entitlements.service.js';
import { BillingService } from './billing.service.js';
import { BillingController } from './billing.controller.js';
import { PlanPricingService } from './plan-pricing.service.js';
import { BillingRenewalScheduler } from './billing-renewal.scheduler.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';

/** Global so every area can check plan limits without importing billing's dependencies. */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    PlanPricingService,
    PlanEntitlementsService,
    BillingRenewalScheduler,
    { provide: APP_GUARD, useClass: BillingAccessGuard },
    { provide: APP_GUARD, useClass: PlanFeatureGuard },
  ],
  exports: [BillingService, PlanPricingService, PlanEntitlementsService],
})
export class BillingModule {}
