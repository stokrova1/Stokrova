import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { QuotationsModule } from '../quotations/quotations.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { LoyaltyGiftCardsModule } from '../loyalty-giftcards/loyalty-giftcards.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { MockCommunicationAdapter } from './adapters/communication.adapter.js';
import { CrmCustomersService } from './crm-customers.service.js';
import { CrmPipelineService } from './crm-pipeline.service.js';
import { CrmActivitiesService } from './crm-activities.service.js';
import { CrmMarketingService } from './crm-marketing.service.js';
import { CrmAutomationService } from './crm-automation.service.js';
import { CrmAnalyticsService } from './crm-analytics.service.js';
import { CrmController } from './crm.controller.js';

@Module({
  imports: [
    CustomersModule,
    QuotationsModule,
    OrdersModule,
    LoyaltyGiftCardsModule,
    AuditModule,
    TenancyModule,
    RbacModule,
  ],
  controllers: [CrmController],
  providers: [
    MockCommunicationAdapter,
    CrmCustomersService,
    CrmPipelineService,
    CrmActivitiesService,
    CrmMarketingService,
    CrmAutomationService,
    CrmAnalyticsService,
  ],
  exports: [
    MockCommunicationAdapter,
    CrmCustomersService,
    CrmPipelineService,
    CrmActivitiesService,
    CrmMarketingService,
    CrmAutomationService,
    CrmAnalyticsService,
  ],
})
export class CrmModule {}
