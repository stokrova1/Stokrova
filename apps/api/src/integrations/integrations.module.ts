import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ConsolidationService } from './consolidation.service.js';
import { InterCompanyService } from './inter-company.service.js';
import { WebhooksService } from './webhooks.service.js';
import { DocumentEngineService } from './document-engine.service.js';
import { NotificationsService } from './notifications.service.js';
import { ConnectorCatalogService } from './connector-catalog.service.js';
import { IntegrationInstancesService } from './integration-instances.service.js';
import { DeveloperPlatformService } from './developer-platform.service.js';
import { CredentialReferenceService } from './credential-reference.service.js';
import { InboundWebhookGatewayService } from './inbound-webhook-gateway.service.js';
import { IntegrationSyncService } from './integration-sync.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { IntegrationAuditService } from './integration-audit.service.js';
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
    ConnectorCatalogService,
    IntegrationInstancesService,
    DeveloperPlatformService,
    CredentialReferenceService,
    InboundWebhookGatewayService,
    IntegrationSyncService,
    ReconciliationService,
    IntegrationAuditService,
  ],
  exports: [
    ConsolidationService,
    InterCompanyService,
    WebhooksService,
    DocumentEngineService,
    NotificationsService,
    ConnectorCatalogService,
    IntegrationInstancesService,
    DeveloperPlatformService,
    CredentialReferenceService,
    InboundWebhookGatewayService,
    IntegrationSyncService,
    ReconciliationService,
    IntegrationAuditService,
  ],
})
export class IntegrationsModule {}
