import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { PricingService } from './pricing.service.js';
import { PricingController } from './pricing.controller.js';
import { PromotionsService } from './promotions.service.js';
import { LoyaltyService } from './loyalty.service.js';
import { RebatesService } from './rebates.service.js';

@Module({
  imports: [TenancyModule, RbacModule, CatalogModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    PromotionsService,
    LoyaltyService,
    RebatesService,
  ],
  exports: [
    PricingService,
    PromotionsService,
    LoyaltyService,
    RebatesService,
  ],
})
export class PricingModule {}
