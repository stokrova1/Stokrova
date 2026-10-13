import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConsolidationService } from './consolidation.service.js';
import { InterCompanyService } from './inter-company.service.js';
import { WebhooksService } from './webhooks.service.js';
import { DocumentEngineService } from './document-engine.service.js';
import { NotificationsService } from './notifications.service.js';
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
  ) {}

  // ==========================================================================
  // 1. Holding Groups & Consolidated Financials
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
  // 2. Inter-Company Transfers
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
  // 3. Webhooks
  // ==========================================================================

  @Post('webhooks/subscriptions')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async createSubscription(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWebhookSubscriptionRequest,
  ): Promise<WebhookSubscription> {
    CreateWebhookSubscriptionSchema.parse(body);
    return this.webhooksService.createSubscription(tenantId, body);
  }

  @Patch('webhooks/subscriptions/:id')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async updateSubscription(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateWebhookSubscriptionRequest,
  ): Promise<WebhookSubscription> {
    UpdateWebhookSubscriptionSchema.parse(body);
    return this.webhooksService.updateSubscription(tenantId, id, body);
  }

  @Get('webhooks/subscriptions')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async listSubscriptions(@CurrentTenant() tenantId: string): Promise<WebhookSubscription[]> {
    return this.webhooksService.listSubscriptions(tenantId);
  }

  @Post('webhooks/test-dispatch')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async testDispatch(
    @CurrentTenant() tenantId: string,
    @Body('event_type') eventType: WebhookEventType,
    @Body('payload') payload: Record<string, unknown>,
  ): Promise<WebhookDeliveryAttempt[]> {
    return this.webhooksService.dispatchWebhookEvent(tenantId, eventType, payload);
  }

  @Post('webhooks/subscriptions/:id/rotate-secret')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
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
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
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
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async listDeadLetters(
    @CurrentTenant() tenantId: string,
    @Query('subscription_id') subscriptionId?: string,
  ) {
    return this.webhooksService.listDeadLetters(tenantId, subscriptionId);
  }

  @Post('webhooks/dead-letter/replay')
  @RequirePermission(StandardPermissions.DEVICES_MANAGE)
  async replayDeadLetters(
    @CurrentTenant() tenantId: string,
    @Body() body: { dead_letter_ids?: string[]; subscription_id?: string },
  ) {
    return this.webhooksService.replayDeadLetters(tenantId, body);
  }

  // ==========================================================================
  // 4. Documents & Notifications
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
}
