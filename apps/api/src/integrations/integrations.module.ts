import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ConsolidationService } from './consolidation.service.js';
import { InterCompanyService } from './inter-company.service.js';
import { WebhooksService } from './webhooks.service.js';
import { DocumentEngineService } from './document-engine.service.js';
import { NotificationsService } from './notifications.service.js';
import { IntegrationsController } from './integrations.controller.js';

@Module({
  imports: [FinanceModule, WarehouseModule],
  controllers: [IntegrationsController],
  providers: [
    ConsolidationService,
    InterCompanyService,
    WebhooksService,
    DocumentEngineService,
    NotificationsService,
  ],
  exports: [
    ConsolidationService,
    InterCompanyService,
    WebhooksService,
    DocumentEngineService,
    NotificationsService,
  ],
})
export class IntegrationsModule {}
