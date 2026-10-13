import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrmCustomersService } from './crm-customers.service.js';
import { CrmPipelineService } from './crm-pipeline.service.js';
import { CrmActivitiesService } from './crm-activities.service.js';
import { CrmMarketingService } from './crm-marketing.service.js';
import { CrmAnalyticsService } from './crm-analytics.service.js';
import { CrmAutomationService } from './crm-automation.service.js';
import { MockCommunicationAdapter } from './adapters/communication.adapter.js';

describe('Phase 22 Enterprise CRM API Services Test Suite', () => {
  const tenantId = 'tenant_crm_test';

  let mockCustomersService: any;
  let mockQuotationsService: any;
  let mockOrdersService: any;
  let commAdapter: MockCommunicationAdapter;

  beforeEach(() => {
    mockCustomersService = {
      getCustomerById: vi.fn(),
      listCustomers: vi.fn(),
      createCustomer: vi.fn(),
      updateCustomer: vi.fn().mockResolvedValue({}),
    };

    mockQuotationsService = {
      createQuotation: vi.fn(),
    };

    mockOrdersService = {
      listSalesOrders: vi.fn(),
    };

    commAdapter = new MockCommunicationAdapter();
  });

  describe('CrmCustomersService', () => {
    it('creates an account relationship and builds hierarchy node tree', async () => {
      const service = new CrmCustomersService(mockCustomersService);

      mockCustomersService.getCustomerById.mockImplementation(async (_t: string, id: string) => {
        if (id === 'cust_parent') {
          return { id: 'cust_parent', customer_code: 'P01', display_name: 'Holding Co' };
        }
        if (id === 'cust_child') {
          return { id: 'cust_child', customer_code: 'C01', display_name: 'Subsidiary Corp' };
        }
        throw new Error('Not found');
      });

      const rel = await service.createRelationship(tenantId, {
        parent_customer_id: 'cust_parent',
        child_customer_id: 'cust_child',
        relationship_type: 'PARENT_SUBSIDIARY',
        notes: 'Wholly owned subsidiary',
      });

      expect(rel.id).toBeDefined();
      expect(rel.relationship_type).toBe('PARENT_SUBSIDIARY');

      const tree = await service.getAccountHierarchy(tenantId, 'cust_parent');
      expect(tree.customer_id).toBe('cust_parent');
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]?.customer_id).toBe('cust_child');
    });

    it('creates contacts and sets a primary contact', async () => {
      const service = new CrmCustomersService(mockCustomersService);

      mockCustomersService.getCustomerById.mockResolvedValue({
        id: 'cust_100',
        customer_code: 'C100',
        display_name: 'Acme',
      });

      const contact = await service.createContact(tenantId, {
        customer_id: 'cust_100',
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'sarah@acme.com',
        is_primary: true,
      });

      expect(contact.id).toBeDefined();
      expect(contact.is_primary).toBe(true);

      const list = await service.listContacts(tenantId, 'cust_100');
      expect(list).toHaveLength(1);
      expect(list[0]?.first_name).toBe('Sarah');
    });

    it('merges customers non-destructively re-parenting contacts and recording audit merge', async () => {
      const service = new CrmCustomersService(mockCustomersService);

      mockCustomersService.getCustomerById.mockImplementation(async (_t: string, id: string) => {
        if (id === 'survivor') {
          return { id: 'survivor', tenant_id: tenantId, status: 'ACTIVE', display_name: 'Primary' };
        }
        if (id === 'to_merge') {
          return { id: 'to_merge', tenant_id: tenantId, status: 'ACTIVE', display_name: 'Secondary' };
        }
        throw new Error('Not found');
      });

      // Add a contact to the customer to be merged
      await service.createContact(tenantId, {
        customer_id: 'to_merge',
        first_name: 'Mark',
        last_name: 'Twain',
      });

      const mergeRes = await service.mergeCustomers(
        tenantId,
        {
          surviving_customer_id: 'survivor',
          merged_customer_id: 'to_merge',
          reason: 'Duplicate account created at register',
        },
        'admin_user_1',
      );

      expect(mergeRes.surviving_customer_id).toBe('survivor');
      expect(mergeRes.merged_customer_id).toBe('to_merge');
      expect(mergeRes.reparented_contacts_count).toBe(1);

      // Verify contact was re-parented to survivor
      const survivorContacts = await service.listContacts(tenantId, 'survivor');
      expect(survivorContacts).toHaveLength(1);
      expect(survivorContacts[0]?.first_name).toBe('Mark');
    });
  });

  describe('CrmPipelineService', () => {
    it('creates lead, converts lead to customer and opportunity, and advances stages', async () => {
      const service = new CrmPipelineService(mockCustomersService, mockQuotationsService);

      const lead = await service.createLead(tenantId, {
        first_name: 'David',
        last_name: 'Miller',
        company_name: 'Miller Dynamics',
        email: 'david@millerdynamics.com',
        source: 'WEBSITE',
        qualification_score_bp: 7500,
      });

      expect(lead.id).toBeDefined();
      expect(lead.status).toBe('NEW');

      mockCustomersService.createCustomer.mockResolvedValue({
        id: 'cust_miller',
        customer_code: 'CUST-MILLER',
        display_name: 'Miller Dynamics',
      });
      mockCustomersService.getCustomerById.mockResolvedValue({
        id: 'cust_miller',
        customer_code: 'CUST-MILLER',
        display_name: 'Miller Dynamics',
      });

      const convRes = await service.convertLead(tenantId, {
        lead_id: lead.id,
        create_opportunity: true,
        opportunity_title: 'Enterprise Supply Contract',
        estimated_value_minor: '8000000',
        currency_code: 'USD',
      });

      expect(convRes.customer_id).toBe('cust_miller');
      expect(convRes.opportunity_id).toBeDefined();

      const opp = await service.getOpportunity(tenantId, convRes.opportunity_id!);
      expect(opp.title).toBe('Enterprise Supply Contract');
      expect(opp.estimated_value_minor).toBe('8000000');
    });

    it('generates a quotation from a won opportunity', async () => {
      const service = new CrmPipelineService(mockCustomersService, mockQuotationsService);

      mockCustomersService.getCustomerById.mockResolvedValue({
        id: 'cust_opp_win',
        display_name: 'Winner Corp',
      });

      const pipeline = await service.createPipeline(tenantId, {
        code: 'PIPE_TEST',
        name: 'Test Pipeline',
      });

      const stage = await service.createStage(tenantId, {
        pipeline_id: pipeline.id,
        stage_code: 'WON',
        name: 'Closed Won',
        probability_bp: 10000,
        is_won_stage: true,
      });

      const opp = await service.createOpportunity(tenantId, {
        title: 'Won Deal',
        customer_id: 'cust_opp_win',
        pipeline_id: pipeline.id,
        current_stage_id: stage.id,
        estimated_value_minor: '5000000',
        currency_code: 'USD',
      });

      mockQuotationsService.createQuotation.mockResolvedValue({
        id: 'quot_123',
        quotation_number: 'Q-12345',
        grand_total_minor: '5000000',
      });

      const quot = await service.convertOpportunityToQuotation(tenantId, opp.id, {
        branch_id: 'branch_main',
        warehouse_id: 'wh_main',
        line_items: [
          { variant_id: 'var_prod_1', quantity: 10, unit_price_minor: '500000' },
        ],
      });

      expect(quot.id).toBe('quot_123');
      expect(mockQuotationsService.createQuotation).toHaveBeenCalled();
    });
  });

  describe('CrmMarketingService & Suppression', () => {
    it('creates segment, records consent, filters suppressions, and dispatches campaign', async () => {
      const service = new CrmMarketingService(mockCustomersService, commAdapter);

      const segment = await service.createSegment(tenantId, {
        name: 'Active Buyers',
        code: 'SEG_ACTIVE',
        segment_type: 'STATIC',
        static_customer_ids: ['cust_optin', 'cust_optout'],
      });

      expect(segment.id).toBeDefined();

      // Record opt-in consent for cust_optin
      await service.recordConsent(tenantId, {
        customer_id: 'cust_optin',
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_IN',
        source: 'PORTAL',
        policy_version: 'v1.0',
      });

      // Record opt-out consent for cust_optout
      await service.recordConsent(tenantId, {
        customer_id: 'cust_optout',
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_OUT',
        source: 'PORTAL',
        policy_version: 'v1.0',
      });

      mockCustomersService.getCustomerById.mockImplementation(async (_t: string, id: string) => {
        if (id === 'cust_optin') {
          return { id: 'cust_optin', email: 'optin@domain.com' };
        }
        if (id === 'cust_optout') {
          return { id: 'cust_optout', email: 'optout@domain.com' };
        }
        return null;
      });

      const campaign = await service.createCampaign(tenantId, {
        name: 'Quarterly Promo',
        channel: 'EMAIL',
        segment_id: segment.id,
        subject_template: 'Special Promotion',
        body_template: 'Discount applied inside.',
      });

      await service.approveCampaign(tenantId, campaign.id, 'marketing_lead');

      const dispatchRes = await service.dispatchCampaign(tenantId, campaign.id);

      expect(dispatchRes.dispatched_count).toBe(1); // Only cust_optin
      expect(dispatchRes.suppressed_count).toBe(1); // cust_optout suppressed
      expect(dispatchRes.campaign.status).toBe('COMPLETED');
    });
  });

  describe('CrmAnalyticsService', () => {
    it('calculates pipeline forecasting metrics and sales funnel conversion', async () => {
      mockCustomersService.getCustomerById.mockResolvedValue({
        id: 'cust_1',
        customer_code: 'C1',
        display_name: 'Customer 1',
      });

      const pipelineService = new CrmPipelineService(mockCustomersService);
      const marketingService = new CrmMarketingService(mockCustomersService, commAdapter);
      const service = new CrmAnalyticsService(pipelineService, marketingService, mockOrdersService);

      const pipeline = await pipelineService.createPipeline(tenantId, {
        code: 'FORECAST_PIPE',
        name: 'Forecast Pipeline',
      });

      const stageDiscovery = await pipelineService.createStage(tenantId, {
        pipeline_id: pipeline.id,
        stage_code: 'DISCOVERY',
        name: 'Discovery',
        probability_bp: 2500, // 25%
        order_index: 0,
      });

      const stageWon = await pipelineService.createStage(tenantId, {
        pipeline_id: pipeline.id,
        stage_code: 'WON',
        name: 'Closed Won',
        probability_bp: 10000,
        is_won_stage: true,
        order_index: 1,
      });

      // Create an open opportunity of 100,000 USD at 25% probability
      await pipelineService.createOpportunity(tenantId, {
        title: 'Deal 1',
        customer_id: 'cust_1',
        pipeline_id: pipeline.id,
        current_stage_id: stageDiscovery.id,
        estimated_value_minor: '10000000',
        currency_code: 'USD',
      });

      // Create a won opportunity of 50,000 USD
      await pipelineService.createOpportunity(tenantId, {
        title: 'Deal 2',
        customer_id: 'cust_1',
        pipeline_id: pipeline.id,
        current_stage_id: stageWon.id,
        estimated_value_minor: '5000000',
        currency_code: 'USD',
      });

      const metrics = await service.getPipelineMetrics(tenantId, pipeline.id);
      expect(metrics.total_opportunities).toBe(2);
      expect(metrics.open_value_minor).toBe('10000000');
      expect(metrics.weighted_pipeline_value_minor).toBe('2500000'); // 25,000 USD
      expect(metrics.won_value_minor).toBe('5000000');

      const funnel = await service.getFunnelConversion(tenantId, pipeline.id);
      expect(funnel).toHaveLength(2);
      expect(funnel[0]?.stage_code).toBe('DISCOVERY');
      expect(funnel[1]?.stage_code).toBe('WON');
    });
  });

  describe('CrmActivitiesService & CrmAutomationService', () => {
    it('records activities, creates tasks, and runs automation step actions', async () => {
      const actService = new CrmActivitiesService(mockOrdersService);
      const autoService = new CrmAutomationService(actService, commAdapter);

      const task = await actService.createTask(tenantId, {
        customer_id: 'cust_activity_test',
        subject: 'Call client about invoice settlement',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        priority: 'HIGH',
      });

      expect(task.id).toBeDefined();
      expect(task.priority).toBe('HIGH');

      const act = await actService.recordActivity(tenantId, {
        customer_id: 'cust_activity_test',
        activity_type: 'CALL',
        subject: 'Client inquiry call',
        performed_by: 'sales_agent_9',
        duration_minutes: 15,
      });

      expect(act.id).toBeDefined();

      const timeline = await actService.getCustomerTimeline(tenantId, 'cust_activity_test');
      expect(timeline.length).toBeGreaterThanOrEqual(2);

      // Create an automation rule
      const automation = await autoService.createAutomation(tenantId, {
        name: 'Auto-Task on Inbound Lead',
        trigger_type: 'LEAD_CREATED',
        actions_json: [
          {
            step_id: 'auto_step_1',
            action_type: 'RECORD_ACTIVITY',
            params: { subject: 'Automated welcome note' },
          },
        ],
      });

      expect(automation.id).toBeDefined();

      // Publish automation to make it ACTIVE
      await autoService.publishAutomation(tenantId, automation.id);

      // Trigger domain event
      const executions = await autoService.processDomainEvent(tenantId, {
        event_id: 'evt_123',
        event_type: 'LEAD_CREATED',
        customer_id: 'cust_activity_test',
        payload: { email: 'lead@test.com' },
      });

      expect(executions).toHaveLength(1);
      expect(executions[0]?.status).toBe('COMPLETED');
    });
  });
});
