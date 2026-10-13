import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
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
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateHoldingGroupSchema,
  UpdateHoldingGroupSchema,
  CreateInterCompanyTransferSchema,
  CreateWebhookSubscriptionSchema,
  UpdateWebhookSubscriptionSchema,
  RenderDocumentSchema,
  SendNotificationSchema,
  CreateIntegrationInstanceSchema,
  UpdateIntegrationInstanceSchema,
  CreateDeveloperApiKeySchema,
  StoreIntegrationCredentialSchema,
  CreateEntityMappingSchema,
  CreateFieldMappingSchema,
  TriggerSyncRunSchema,
  InboundWebhookPayloadSchema,
} from '@stokrova/validation';
import type {
  HoldingGroup,
  ConsolidatedTrialBalanceReport,
  InterCompanyTransfer,
  WebhookSubscription,
  WebhookDeliveryAttempt,
  RenderedDocument,
  NotificationMessage,
  CreateHoldingGroupRequest,
  UpdateHoldingGroupRequest,
  CreateInterCompanyTransferRequest,
  CreateWebhookSubscriptionRequest,
  UpdateWebhookSubscriptionRequest,
  RenderDocumentRequest,
  SendNotificationRequest,
  WebhookEventType,
  ConnectorDefinition,
  IntegrationInstance,
  IntegrationInstanceStatus,
  DeveloperApiKey,
  CreateDeveloperApiKeyRequest,
  CreateDeveloperApiKeyResponse,
  IntegrationCredential,
  ExternalIdentityMapping,
  IntegrationFieldMapping,
  IntegrationSyncRun,
  InboundWebhookReceipt,
  IntegrationReconciliation,
  IntegrationReconciliationStatus,
  IntegrationAuditEvent,
  CreateIntegrationInstanceRequest,
  UpdateIntegrationInstanceRequest,
  StoreIntegrationCredentialRequest,
  CreateEntityMappingRequest,
  CreateFieldMappingRequest,
  TriggerSyncRunRequest,
  InboundWebhookPayload,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('integrations')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class IntegrationsController {
  constructor(
    private readonly consolidationService: ConsolidationService,
    private readonly interCompanyService: InterCompanyService,
    private readonly webhooksService: WebhooksService,
    private readonly documentService: DocumentEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly connectorCatalogService: ConnectorCatalogService,
    private readonly instancesService: IntegrationInstancesService,
    private readonly developerPlatformService: DeveloperPlatformService,
    private readonly credentialsService: CredentialReferenceService,
    private readonly webhookGatewayService: InboundWebhookGatewayService,
    private readonly syncService: IntegrationSyncService,
    private readonly reconciliationService: ReconciliationService,
    private readonly auditService: IntegrationAuditService,
  ) {}

  // ==========================================================================
  // 1. Holding Groups & Consolidated Financials (Phase 7)
  // ==========================================================================

  @Post('holding-groups')
  @RequirePermission(StandardPermissions.FINANCE_VIEW)
  async createHoldingGroup(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateHoldingGroupRequest,
  ): Promise<HoldingGroup> {
    CreateHoldingGroupSchema.parse(body);
    return this.consolidationService.createHoldingGroup(tenantId, body);
  }

  @Patch('holding-groups/:id')
  @RequirePermission(StandardPermissions.FINANCE_VIEW)
  async updateHoldingGroup(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateHoldingGroupRequest,
  ): Promise<HoldingGroup> {
    UpdateHoldingGroupSchema.parse(body);
    return this.consolidationService.updateHoldingGroup(tenantId, id, body);
  }

  @Get('holding-groups')
  @RequirePermission(StandardPermissions.FINANCE_VIEW)
  async listHoldingGroups(@CurrentTenant() tenantId: string): Promise<HoldingGroup[]> {
    return this.consolidationService.listHoldingGroups(tenantId);
  }

  @Get('holding-groups/:id/consolidated-trial-balance')
  @RequirePermission(StandardPermissions.FINANCE_VIEW)
  async getConsolidatedTrialBalance(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('as_of_date') asOfDate?: string,
  ): Promise<ConsolidatedTrialBalanceReport> {
    return this.consolidationService.generateConsolidatedTrialBalance(tenantId, id, asOfDate);
  }

  // ==========================================================================
  // 2. Inter-Company Transfers (Phase 7)
  // ==========================================================================

  @Post('inter-company/transfers')
  @RequirePermission(StandardPermissions.INVENTORY_TRANSFER)
  async createTransfer(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateInterCompanyTransferRequest,
  ): Promise<InterCompanyTransfer> {
    CreateInterCompanyTransferSchema.parse(body);
    return this.interCompanyService.createTransfer(tenantId, body);
  }

  @Post('inter-company/transfers/:id/approve')
  @RequirePermission(StandardPermissions.INVENTORY_TRANSFER)
  async approveTransfer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InterCompanyTransfer> {
    return this.interCompanyService.approveTransfer(tenantId, id);
  }

  @Post('inter-company/transfers/:id/dispatch')
  @RequirePermission(StandardPermissions.INVENTORY_TRANSFER)
  async dispatchTransfer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InterCompanyTransfer> {
    return this.interCompanyService.dispatchTransfer(tenantId, id);
  }

  @Get('inter-company/transfers')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async listTransfers(@CurrentTenant() tenantId: string): Promise<InterCompanyTransfer[]> {
    return this.interCompanyService.listTransfers(tenantId);
  }

  // ==========================================================================
  // 3. Outbound Webhooks (Phase 7 / Existing)
  // ==========================================================================

  @Post('webhooks/subscriptions')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async createSubscription(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWebhookSubscriptionRequest,
  ): Promise<WebhookSubscription> {
    CreateWebhookSubscriptionSchema.parse(body);
    return this.webhooksService.createSubscription(tenantId, body);
  }

  @Patch('webhooks/subscriptions/:id')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async updateSubscription(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateWebhookSubscriptionRequest,
  ): Promise<WebhookSubscription> {
    UpdateWebhookSubscriptionSchema.parse(body);
    return this.webhooksService.updateSubscription(tenantId, id, body);
  }

  @Get('webhooks/subscriptions')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async listSubscriptions(@CurrentTenant() tenantId: string): Promise<WebhookSubscription[]> {
    return this.webhooksService.listSubscriptions(tenantId);
  }

  @Post('webhooks/test-dispatch')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async testDispatch(
    @CurrentTenant() tenantId: string,
    @Body('event_type') eventType: WebhookEventType,
    @Body('payload') payload: Record<string, unknown>,
  ): Promise<WebhookDeliveryAttempt[]> {
    return this.webhooksService.dispatchWebhookEvent(tenantId, eventType, payload);
  }

  @Post('webhooks/subscriptions/:id/rotate-secret')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async rotateSecret(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('custom_secret') customSecret?: string,
  ): Promise<WebhookSubscription> {
    return this.webhooksService.rotateSecret(tenantId, {
      subscription_id: id,
      custom_secret: customSecret,
    });
  }

  @Post('webhooks/subscriptions/:id/test')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async testSubscription(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('event_type') eventType?: WebhookEventType,
  ): Promise<WebhookDeliveryAttempt> {
    return this.webhooksService.testSubscription(tenantId, {
      subscription_id: id,
      event_type: eventType ?? 'ORDER_CREATED',
    });
  }

  @Get('webhooks/dead-letter')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async listDeadLetters(
    @CurrentTenant() tenantId: string,
    @Query('subscription_id') subscriptionId?: string,
  ) {
    return this.webhooksService.listDeadLetters(tenantId, subscriptionId);
  }

  @Post('webhooks/dead-letter/replay')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_REPLAY)
  async replayDeadLetters(
    @CurrentTenant() tenantId: string,
    @Body() body: { dead_letter_ids?: string[]; subscription_id?: string },
  ) {
    return this.webhooksService.replayDeadLetters(tenantId, body);
  }

  // ==========================================================================
  // 4. Documents & Notifications (Existing)
  // ==========================================================================

  @Post('documents/render')
  @RequirePermission(StandardPermissions.INVOICES_VIEW)
  async renderDocument(
    @CurrentTenant() tenantId: string,
    @Body() body: RenderDocumentRequest,
  ): Promise<RenderedDocument> {
    RenderDocumentSchema.parse(body);
    return this.documentService.renderDocument(tenantId, body);
  }

  @Post('notifications')
  @RequirePermission(StandardPermissions.STAFF_MANAGE)
  async sendNotification(
    @CurrentTenant() tenantId: string,
    @Body() body: SendNotificationRequest,
  ): Promise<NotificationMessage> {
    SendNotificationSchema.parse(body);
    return this.notificationsService.sendNotification(tenantId, body);
  }

  @Get('notifications')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async listNotifications(
    @CurrentTenant() tenantId: string,
    @Query('user_id') userId?: string,
  ): Promise<NotificationMessage[]> {
    return this.notificationsService.listNotifications(tenantId, userId);
  }

  @Get('notifications/unread-count')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async getUnreadCount(
    @CurrentTenant() tenantId: string,
    @Query('user_id') userId?: string,
  ): Promise<{ unread_count: number }> {
    const count = await this.notificationsService.getUnreadCount(tenantId, userId);
    return { unread_count: count };
  }

  @Post('notifications/:id/read')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async markNotificationRead(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<NotificationMessage> {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  @Post('notifications/mark-all-read')
  @RequirePermission(StandardPermissions.INVENTORY_VIEW)
  async markAllNotificationsRead(
    @CurrentTenant() tenantId: string,
    @Query('user_id') userId?: string,
  ): Promise<{ updated_count: number }> {
    const updated = await this.notificationsService.markAllAsRead(tenantId, userId);
    return { updated_count: updated };
  }

  // ==========================================================================
  // 5. Phase 12: Connector Catalog & Definitions
  // ==========================================================================

  @Get('connectors')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listConnectors(): Promise<readonly ConnectorDefinition[]> {
    return this.connectorCatalogService.listConnectors();
  }

  @Get('connectors/:code')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async getConnector(@Param('code') code: string): Promise<ConnectorDefinition> {
    return this.connectorCatalogService.getConnector(code);
  }

  // ==========================================================================
  // 6. Phase 12: Integration Instances Lifecycle
  // ==========================================================================

  @Post('instances')
  @RequirePermission(StandardPermissions.INTEGRATION_MANAGE)
  async createInstance(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateIntegrationInstanceRequest,
  ): Promise<IntegrationInstance> {
    CreateIntegrationInstanceSchema.parse(body);
    const inst = await this.instancesService.createInstance(tenantId, body);
    await this.auditService.recordEvent(tenantId, 'CREATE_INSTANCE', 'INTEGRATION_INSTANCE', inst.id);
    return inst;
  }

  @Get('instances')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listInstances(@CurrentTenant() tenantId: string): Promise<IntegrationInstance[]> {
    return this.instancesService.listInstances(tenantId);
  }

  @Get('instances/:id')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async getInstance(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<IntegrationInstance> {
    return this.instancesService.getInstanceById(tenantId, id);
  }

  @Patch('instances/:id')
  @RequirePermission(StandardPermissions.INTEGRATION_CONFIGURE)
  async updateInstance(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateIntegrationInstanceRequest,
  ): Promise<IntegrationInstance> {
    UpdateIntegrationInstanceSchema.parse(body);
    const updated = await this.instancesService.updateInstance(tenantId, id, body);
    await this.auditService.recordEvent(tenantId, 'UPDATE_INSTANCE', 'INTEGRATION_INSTANCE', id);
    return updated;
  }

  @Post('instances/:id/transition')
  @RequirePermission(StandardPermissions.INTEGRATION_ACTIVATE)
  async transitionInstance(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: IntegrationInstanceStatus,
  ): Promise<IntegrationInstance> {
    const updated = await this.instancesService.transitionStatus(tenantId, id, status);
    await this.auditService.recordEvent(
      tenantId,
      'TRANSITION_STATUS',
      'INTEGRATION_INSTANCE',
      id,
      null,
      { target_status: status },
    );
    return updated;
  }

  @Post('instances/:id/test-connection')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async testConnection(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.instancesService.testConnection(tenantId, id);
  }

  // ==========================================================================
  // 7. Phase 12: Developer API Keys
  // ==========================================================================

  @Post('api-keys')
  @RequirePermission(StandardPermissions.INTEGRATION_API_KEYS_MANAGE)
  async createApiKey(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDeveloperApiKeyRequest,
  ): Promise<CreateDeveloperApiKeyResponse> {
    CreateDeveloperApiKeySchema.parse(body);
    const res = await this.developerPlatformService.createApiKey(tenantId, body);
    await this.auditService.recordEvent(
      tenantId,
      'CREATE_API_KEY',
      'DEVELOPER_API_KEY',
      res.apiKey.id,
      null,
      { key_prefix: res.apiKey.key_prefix, scopes: res.apiKey.scopes },
    );
    return res;
  }

  @Get('api-keys')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listApiKeys(@CurrentTenant() tenantId: string): Promise<DeveloperApiKey[]> {
    return this.developerPlatformService.listApiKeys(tenantId);
  }

  @Post('api-keys/:id/revoke')
  @RequirePermission(StandardPermissions.INTEGRATION_API_KEYS_MANAGE)
  async revokeApiKey(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeveloperApiKey> {
    const key = await this.developerPlatformService.revokeApiKey(tenantId, id);
    await this.auditService.recordEvent(tenantId, 'REVOKE_API_KEY', 'DEVELOPER_API_KEY', id);
    return key;
  }

  @Post('api-keys/:id/rotate')
  @RequirePermission(StandardPermissions.INTEGRATION_API_KEYS_MANAGE)
  async rotateApiKey(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<CreateDeveloperApiKeyResponse> {
    const res = await this.developerPlatformService.rotateApiKey(tenantId, id);
    await this.auditService.recordEvent(
      tenantId,
      'ROTATE_API_KEY',
      'DEVELOPER_API_KEY',
      res.apiKey.id,
      null,
      { previous_key_id: id },
    );
    return res;
  }

  // ==========================================================================
  // 8. Phase 12: Credentials & Secrets
  // ==========================================================================

  @Post('instances/:id/credentials')
  @RequirePermission(StandardPermissions.INTEGRATION_MANAGE)
  async storeCredential(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
    @Body() body: StoreIntegrationCredentialRequest,
  ): Promise<IntegrationCredential> {
    StoreIntegrationCredentialSchema.parse(body);
    const cred = await this.credentialsService.storeCredential(tenantId, instanceId, body);
    await this.auditService.recordEvent(
      tenantId,
      'STORE_CREDENTIAL',
      'INTEGRATION_CREDENTIAL',
      cred.id,
      null,
      { instance_id: instanceId, masked: cred.masked_secret },
    );
    return cred;
  }

  @Get('instances/:id/credentials')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listCredentials(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
  ): Promise<IntegrationCredential[]> {
    return this.credentialsService.listCredentials(tenantId, instanceId);
  }

  @Post('instances/:id/credentials/:credId/rotate')
  @RequirePermission(StandardPermissions.INTEGRATION_CREDENTIALS_ROTATE)
  async rotateCredential(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
    @Param('credId') credId: string,
    @Body('new_secret') newSecret: string,
  ): Promise<IntegrationCredential> {
    const cred = await this.credentialsService.rotateCredential(tenantId, credId, newSecret);
    await this.auditService.recordEvent(
      tenantId,
      'ROTATE_CREDENTIAL',
      'INTEGRATION_CREDENTIAL',
      credId,
      null,
      { instance_id: instanceId, masked: cred.masked_secret },
    );
    return cred;
  }

  // ==========================================================================
  // 9. Phase 12: Inbound Webhook Ingestion Gateway
  // ==========================================================================

  @Post('inbound-webhooks')
  async ingestInboundWebhook(
    @CurrentTenant() tenantId: string,
    @Body() body: InboundWebhookPayload,
    @Headers('x-webhook-secret') secretHeader?: string,
  ) {
    InboundWebhookPayloadSchema.parse(body);
    const res = await this.webhookGatewayService.ingestWebhook(
      tenantId,
      body,
      secretHeader,
    );
    return res;
  }

  @Get('inbound-webhooks/receipts')
  @RequirePermission(StandardPermissions.INTEGRATION_WEBHOOK_MANAGE)
  async listInboundReceipts(
    @CurrentTenant() tenantId: string,
    @Query('provider') provider?: string,
  ): Promise<InboundWebhookReceipt[]> {
    return this.webhookGatewayService.listReceipts(tenantId, provider);
  }

  // ==========================================================================
  // 10. Phase 12: Entity Mappings & Field Transformations
  // ==========================================================================

  @Post('instances/:id/mappings')
  @RequirePermission(StandardPermissions.INTEGRATION_MAPPING_MANAGE)
  async createEntityMapping(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
    @Body() body: CreateEntityMappingRequest,
  ): Promise<ExternalIdentityMapping> {
    CreateEntityMappingSchema.parse(body);
    return this.syncService.createEntityMapping(tenantId, instanceId, body);
  }

  @Get('instances/:id/mappings')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listEntityMappings(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
  ): Promise<ExternalIdentityMapping[]> {
    return this.syncService.listMappings(tenantId, instanceId);
  }

  @Post('instances/:id/field-mappings')
  @RequirePermission(StandardPermissions.INTEGRATION_MAPPING_MANAGE)
  async createFieldMapping(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
    @Body() body: CreateFieldMappingRequest,
  ): Promise<IntegrationFieldMapping> {
    CreateFieldMappingSchema.parse(body);
    return this.syncService.createFieldMapping(tenantId, instanceId, body);
  }

  @Get('instances/:id/field-mappings')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listFieldMappings(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
  ): Promise<IntegrationFieldMapping[]> {
    return this.syncService.listFieldMappings(tenantId, instanceId);
  }

  // ==========================================================================
  // 11. Phase 12: Sync Runs & Cursors
  // ==========================================================================

  @Post('instances/:id/sync')
  @RequirePermission(StandardPermissions.INTEGRATION_SYNC_EXECUTE)
  async triggerSync(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
    @Body() body: TriggerSyncRunRequest,
  ): Promise<IntegrationSyncRun> {
    TriggerSyncRunSchema.parse(body);
    const run = await this.syncService.triggerSyncRun(tenantId, instanceId, body);
    await this.auditService.recordEvent(
      tenantId,
      'TRIGGER_SYNC_RUN',
      'INTEGRATION_SYNC_RUN',
      run.id,
      null,
      { instance_id: instanceId, direction: run.direction },
    );
    return run;
  }

  @Get('instances/:id/sync-runs')
  @RequirePermission(StandardPermissions.INTEGRATION_VIEW)
  async listSyncRuns(
    @CurrentTenant() tenantId: string,
    @Param('id') instanceId: string,
  ): Promise<IntegrationSyncRun[]> {
    return this.syncService.listSyncRuns(tenantId, instanceId);
  }

  // ==========================================================================
  // 12. Phase 12: Reconciliations & Audit
  // ==========================================================================

  @Get('reconciliations')
  @RequirePermission(StandardPermissions.INTEGRATION_RECONCILIATION_VIEW)
  async listReconciliations(
    @CurrentTenant() tenantId: string,
    @Query('instance_id') instanceId?: string,
    @Query('status') status?: IntegrationReconciliationStatus,
  ): Promise<IntegrationReconciliation[]> {
    return this.reconciliationService.listReconciliations(tenantId, instanceId, status);
  }

  @Post('reconciliations/:id/resolve')
  @RequirePermission(StandardPermissions.INTEGRATION_RECONCILIATION_MANAGE)
  async resolveReconciliation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<IntegrationReconciliation> {
    const res = await this.reconciliationService.resolveDiscrepancy(tenantId, id);
    await this.auditService.recordEvent(
      tenantId,
      'RESOLVE_RECONCILIATION',
      'INTEGRATION_RECONCILIATION',
      id,
    );
    return res;
  }

  @Get('audit-logs')
  @RequirePermission(StandardPermissions.INTEGRATION_AUDIT_VIEW)
  async listAuditLogs(
    @CurrentTenant() tenantId: string,
    @Query('entity_id') entityId?: string,
    @Query('action') action?: string,
  ): Promise<IntegrationAuditEvent[]> {
    return this.auditService.listEvents(tenantId, entityId, action);
  }
}
