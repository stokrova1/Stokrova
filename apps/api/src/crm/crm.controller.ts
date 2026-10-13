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
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StandardPermissions } from '@stokrova/domain';
import { CrmCustomersService } from './crm-customers.service.js';
import { CrmPipelineService } from './crm-pipeline.service.js';
import { CrmActivitiesService } from './crm-activities.service.js';
import { CrmMarketingService } from './crm-marketing.service.js';
import { CrmAutomationService } from './crm-automation.service.js';
import { CrmAnalyticsService } from './crm-analytics.service.js';

@Controller('v1/crm')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class CrmController {
  constructor(
    private readonly customersService: CrmCustomersService,
    private readonly pipelineService: CrmPipelineService,
    private readonly activitiesService: CrmActivitiesService,
    private readonly marketingService: CrmMarketingService,
    private readonly automationService: CrmAutomationService,
    private readonly analyticsService: CrmAnalyticsService,
  ) {}

  // ==========================================
  // 1. Account Relationships & Contacts
  // ==========================================

  @Post('relationships')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_MANAGE)
  async createRelationship(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.customersService.createRelationship(tenantId, body);
  }

  @Get('customers/:id/hierarchy')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_VIEW)
  async getAccountHierarchy(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.getAccountHierarchy(tenantId, customerId);
  }

  @Get('customers/:id/relationships')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_VIEW)
  async listRelationships(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.listRelationships(tenantId, customerId);
  }

  @Post('contacts')
  @RequirePermission(StandardPermissions.CRM_CONTACT_MANAGE)
  async createContact(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.customersService.createContact(tenantId, body);
  }

  @Patch('contacts/:id')
  @RequirePermission(StandardPermissions.CRM_CONTACT_MANAGE)
  async updateContact(
    @CurrentTenant() tenantId: string,
    @Param('id') contactId: string,
    @Body() body: any,
  ) {
    return this.customersService.updateContact(tenantId, contactId, body);
  }

  @Get('customers/:id/contacts')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_VIEW)
  async listContacts(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.listContacts(tenantId, customerId);
  }

  @Get('customers/:id/duplicates')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_VIEW)
  async findDuplicateCandidates(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.findDuplicateCandidates(tenantId, customerId);
  }

  @Post('customers/merge')
  @RequirePermission(StandardPermissions.CRM_CUSTOMER_MERGE)
  async mergeCustomers(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const mergedBy = user?.id ?? user?.username ?? 'ADMIN';
    return this.customersService.mergeCustomers(tenantId, body, mergedBy);
  }

  // ==========================================
  // 2. Leads & Pipelines
  // ==========================================

  @Post('leads')
  @RequirePermission(StandardPermissions.CRM_LEAD_MANAGE)
  async createLead(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.createLead(tenantId, body);
  }

  @Post('leads/external')
  @RequirePermission(StandardPermissions.CRM_LEAD_MANAGE)
  async ingestExternalLead(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.ingestExternalLead(tenantId, body);
  }

  @Patch('leads/:id')
  @RequirePermission(StandardPermissions.CRM_LEAD_MANAGE)
  async updateLead(
    @CurrentTenant() tenantId: string,
    @Param('id') leadId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.updateLead(tenantId, leadId, body);
  }

  @Post('leads/convert')
  @RequirePermission(StandardPermissions.CRM_LEAD_CONVERT)
  async convertLead(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.convertLead(tenantId, body);
  }

  @Get('leads')
  @RequirePermission(StandardPermissions.CRM_LEAD_VIEW)
  async listLeads(@CurrentTenant() tenantId: string) {
    return this.pipelineService.listLeads(tenantId);
  }

  @Get('leads/:id')
  @RequirePermission(StandardPermissions.CRM_LEAD_VIEW)
  async getLead(
    @CurrentTenant() tenantId: string,
    @Param('id') leadId: string,
  ) {
    return this.pipelineService.getLead(tenantId, leadId);
  }

  @Post('pipelines')
  @RequirePermission(StandardPermissions.CRM_PIPELINE_MANAGE)
  async createPipeline(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.createPipeline(tenantId, body);
  }

  @Get('pipelines')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_VIEW)
  async listPipelines(@CurrentTenant() tenantId: string) {
    return this.pipelineService.listPipelines(tenantId);
  }

  @Get('pipelines/:id')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_VIEW)
  async getPipeline(
    @CurrentTenant() tenantId: string,
    @Param('id') pipelineId: string,
  ) {
    return this.pipelineService.getPipeline(tenantId, pipelineId);
  }

  @Post('stages')
  @RequirePermission(StandardPermissions.CRM_PIPELINE_MANAGE)
  async createStage(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.createStage(tenantId, body);
  }

  @Post('opportunities')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_MANAGE)
  async createOpportunity(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.createOpportunity(tenantId, body);
  }

  @Post('opportunities/:id/transition')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_MANAGE)
  async transitionOpportunityStage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') opportunityId: string,
    @Body() body: any,
  ) {
    const changedBy = user?.id ?? user?.username ?? 'USER';
    return this.pipelineService.transitionOpportunityStage(tenantId, opportunityId, body, changedBy);
  }

  @Post('opportunities/:id/convert-quotation')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_MANAGE)
  async convertOpportunityToQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') opportunityId: string,
    @Body() body: any,
  ) {
    return this.pipelineService.convertOpportunityToQuotation(tenantId, opportunityId, body);
  }

  @Get('opportunities')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_VIEW)
  async listOpportunities(
    @CurrentTenant() tenantId: string,
    @Query('pipeline_id') pipelineId?: string,
  ) {
    return this.pipelineService.listOpportunities(tenantId, pipelineId);
  }

  @Get('opportunities/:id')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_VIEW)
  async getOpportunity(
    @CurrentTenant() tenantId: string,
    @Param('id') opportunityId: string,
  ) {
    return this.pipelineService.getOpportunity(tenantId, opportunityId);
  }

  @Get('opportunities/:id/history')
  @RequirePermission(StandardPermissions.CRM_OPPORTUNITY_VIEW)
  async getOpportunityStageHistory(
    @CurrentTenant() tenantId: string,
    @Param('id') opportunityId: string,
  ) {
    return this.pipelineService.getOpportunityStageHistory(tenantId, opportunityId);
  }

  // ==========================================
  // 3. Activities & Timeline
  // ==========================================

  @Post('activities')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_MANAGE)
  async recordActivity(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.activitiesService.recordActivity(tenantId, body);
  }

  @Get('activities')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_VIEW)
  async listActivities(
    @CurrentTenant() tenantId: string,
    @Query('customer_id') customerId?: string,
    @Query('opportunity_id') opportunityId?: string,
    @Query('lead_id') leadId?: string,
  ) {
    return this.activitiesService.listActivities(tenantId, {
      customer_id: customerId,
      opportunity_id: opportunityId,
      lead_id: leadId,
    });
  }

  @Post('tasks')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_MANAGE)
  async createTask(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.activitiesService.createTask(tenantId, body);
  }

  @Patch('tasks/:id')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_MANAGE)
  async updateTask(
    @CurrentTenant() tenantId: string,
    @Param('id') taskId: string,
    @Body() body: any,
  ) {
    return this.activitiesService.updateTask(tenantId, taskId, body);
  }

  @Get('tasks')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_VIEW)
  async listTasks(
    @CurrentTenant() tenantId: string,
    @Query('customer_id') customerId?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('status') status?: string,
  ) {
    return this.activitiesService.listTasks(tenantId, {
      customer_id: customerId,
      assigned_to: assignedTo,
      status: status,
    });
  }

  @Get('customers/:id/timeline')
  @RequirePermission(StandardPermissions.CRM_ACTIVITY_VIEW)
  async getCustomerTimeline(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.activitiesService.getCustomerTimeline(tenantId, customerId);
  }

  // ==========================================
  // 4. Marketing & Campaigns
  // ==========================================

  @Post('segments')
  @RequirePermission(StandardPermissions.CRM_SEGMENT_MANAGE)
  async createSegment(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.marketingService.createSegment(tenantId, body);
  }

  @Get('segments')
  @RequirePermission(StandardPermissions.CRM_SEGMENT_VIEW)
  async listSegments(@CurrentTenant() tenantId: string) {
    return this.marketingService.listSegments(tenantId);
  }

  @Get('segments/:id')
  @RequirePermission(StandardPermissions.CRM_SEGMENT_VIEW)
  async getSegment(
    @CurrentTenant() tenantId: string,
    @Param('id') segmentId: string,
  ) {
    return this.marketingService.getSegment(tenantId, segmentId);
  }

  @Get('segments/:id/preview')
  @RequirePermission(StandardPermissions.CRM_SEGMENT_VIEW)
  async previewSegment(
    @CurrentTenant() tenantId: string,
    @Param('id') segmentId: string,
  ) {
    return this.marketingService.previewSegment(tenantId, segmentId);
  }

  @Post('consent')
  @RequirePermission(StandardPermissions.CRM_CONSENT_MANAGE)
  async recordConsent(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.marketingService.recordConsent(tenantId, body);
  }

  @Get('customers/:id/consent')
  @RequirePermission(StandardPermissions.CRM_CONSENT_VIEW)
  async getConsentRecords(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.marketingService.getConsentRecords(tenantId, customerId);
  }

  @Post('suppression')
  @RequirePermission(StandardPermissions.CRM_CONSENT_MANAGE)
  async addSuppression(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.marketingService.addSuppression(tenantId, body);
  }

  @Post('campaigns')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_MANAGE)
  async createCampaign(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.marketingService.createCampaign(tenantId, body);
  }

  @Get('campaigns')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_VIEW)
  async listCampaigns(@CurrentTenant() tenantId: string) {
    return this.marketingService.listCampaigns(tenantId);
  }

  @Get('campaigns/:id')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_VIEW)
  async getCampaign(
    @CurrentTenant() tenantId: string,
    @Param('id') campaignId: string,
  ) {
    return this.marketingService.getCampaign(tenantId, campaignId);
  }

  @Post('campaigns/:id/approve')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_APPROVE)
  async approveCampaign(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') campaignId: string,
  ) {
    const approver = user?.id ?? user?.username ?? 'APPROVER';
    return this.marketingService.approveCampaign(tenantId, campaignId, approver);
  }

  @Post('campaigns/:id/dispatch')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_DISPATCH)
  async dispatchCampaign(
    @CurrentTenant() tenantId: string,
    @Param('id') campaignId: string,
    @Body() body: any,
  ) {
    return this.marketingService.dispatchCampaign(tenantId, campaignId, body?.operation_id);
  }

  @Post('campaigns/:id/cancel')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_MANAGE)
  async cancelCampaign(
    @CurrentTenant() tenantId: string,
    @Param('id') campaignId: string,
  ) {
    return this.marketingService.cancelCampaign(tenantId, campaignId);
  }

  @Get('campaigns/:id/messages')
  @RequirePermission(StandardPermissions.CRM_CAMPAIGN_VIEW)
  async listMessages(
    @CurrentTenant() tenantId: string,
    @Param('id') campaignId: string,
  ) {
    return this.marketingService.listMessages(tenantId, campaignId);
  }

  // ==========================================
  // 5. Marketing Automation
  // ==========================================

  @Post('automations')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async createAutomation(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.automationService.createAutomation(tenantId, body);
  }

  @Patch('automations/:id')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async updateAutomation(
    @CurrentTenant() tenantId: string,
    @Param('id') automationId: string,
    @Body() body: any,
  ) {
    return this.automationService.updateAutomation(tenantId, automationId, body);
  }

  @Post('automations/:id/publish')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_PUBLISH)
  async publishAutomation(
    @CurrentTenant() tenantId: string,
    @Param('id') automationId: string,
  ) {
    return this.automationService.publishAutomation(tenantId, automationId);
  }

  @Get('automations')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async listAutomations(@CurrentTenant() tenantId: string) {
    return this.automationService.listAutomations(tenantId);
  }

  @Get('automations/:id')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async getAutomation(
    @CurrentTenant() tenantId: string,
    @Param('id') automationId: string,
  ) {
    return this.automationService.getAutomation(tenantId, automationId);
  }

  @Post('automations/events')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async processDomainEvent(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.automationService.processDomainEvent(tenantId, body);
  }

  @Get('automations/executions')
  @RequirePermission(StandardPermissions.CRM_AUTOMATION_MANAGE)
  async listExecutions(
    @CurrentTenant() tenantId: string,
    @Query('automation_id') automationId?: string,
  ) {
    return this.automationService.listExecutions(tenantId, automationId);
  }

  // ==========================================
  // 6. Analytics & Attribution
  // ==========================================

  @Get('pipelines/:id/metrics')
  @RequirePermission(StandardPermissions.CRM_ANALYTICS_VIEW)
  async getPipelineMetrics(
    @CurrentTenant() tenantId: string,
    @Param('id') pipelineId: string,
  ) {
    return this.analyticsService.getPipelineMetrics(tenantId, pipelineId);
  }

  @Get('pipelines/:id/funnel')
  @RequirePermission(StandardPermissions.CRM_ANALYTICS_VIEW)
  async getFunnelConversion(
    @CurrentTenant() tenantId: string,
    @Param('id') pipelineId: string,
  ) {
    return this.analyticsService.getFunnelConversion(tenantId, pipelineId);
  }

  @Get('campaigns/:id/attribution')
  @RequirePermission(StandardPermissions.CRM_ANALYTICS_VIEW)
  async getCampaignAttribution(
    @CurrentTenant() tenantId: string,
    @Param('id') campaignId: string,
    @Query('model') model?: 'FIRST_TOUCH' | 'LAST_TOUCH',
  ) {
    return this.analyticsService.getCampaignAttribution(tenantId, campaignId, model);
  }
}
