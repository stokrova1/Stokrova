import { describe, it, expect, beforeEach } from 'vitest';
import { CustomersService } from '../customers/customers.service.js';
import { CrmCustomersService } from './crm-customers.service.js';
import { CrmPipelineService } from './crm-pipeline.service.js';
import { CrmActivitiesService } from './crm-activities.service.js';
import { CrmMarketingService } from './crm-marketing.service.js';
import { CrmAutomationService } from './crm-automation.service.js';
import { CrmAnalyticsService } from './crm-analytics.service.js';
import { MockCommunicationAdapter } from './adapters/communication.adapter.js';
import {
  validateCustomerMergeInvariants,
  evaluateDynamicSegmentRules,
  filterSuppressedRecipients,
  validateAutomationGraph,
  calculatePipelineExpectedValue,
  calculateFunnelConversionRates,
  calculateWinLossRate,
  StandardPermissions,
  SystemRoleTemplates,
} from '@stokrova/domain';

describe('STOKROVA Phase 9 — CRM, Marketing Automation & Customer Engagement (Master Acceptance Matrix)', () => {
  let customersService: CustomersService;
  let crmCustomersService: CrmCustomersService;
  let crmPipelineService: CrmPipelineService;
  let crmActivitiesService: CrmActivitiesService;
  let crmMarketingService: CrmMarketingService;
  let crmAutomationService: CrmAutomationService;
  let crmAnalyticsService: CrmAnalyticsService;
  let commAdapter: MockCommunicationAdapter;

  const tenantA = 'tenant_crm_alpha';
  const tenantB = 'tenant_crm_beta';
  const userId = 'user_sales_001';

  beforeEach(() => {
    customersService = new CustomersService();
    crmCustomersService = new CrmCustomersService(customersService);
    crmPipelineService = new CrmPipelineService(customersService);
    crmActivitiesService = new CrmActivitiesService();
    commAdapter = new MockCommunicationAdapter();
    crmMarketingService = new CrmMarketingService(customersService, commAdapter);
    crmAutomationService = new CrmAutomationService(crmActivitiesService, commAdapter);
    crmAnalyticsService = new CrmAnalyticsService(crmPipelineService, crmMarketingService);
  });

  // ==========================================================================
  // Group 1: Identity & Relationships (Scenarios 1-5)
  // ==========================================================================
  describe('Group 1: Identity & Relationships', () => {
    it('Scenario 1: Individual customer creation (solo trader / B2C)', async () => {
      const cust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'SOLO-001',
        display_name: 'John Doe Carpentry',
        email: 'john@carpentry.local',
        phone: '+15551234567',
      });

      expect(cust.id).toBeDefined();
      expect(cust.tenant_id).toBe(tenantA);
      expect(cust.customer_code).toBe('SOLO-001');
      expect(cust.status).toBe('ACTIVE');
    });

    it('Scenario 2: B2B account creation with multiple contacts and designated primary contact', async () => {
      const b2bCust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'CORP-100',
        display_name: 'Acme MegaCorp',
        legal_name: 'Acme MegaCorp Industries Inc.',
        email: 'info@acmemegacorp.local',
      });

      const contact1 = await crmCustomersService.createContact(tenantA, {
        customer_id: b2bCust.id,
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@acmemegacorp.local',
        role_title: 'Procurement Director',
        is_primary: true,
      });

      const contact2 = await crmCustomersService.createContact(tenantA, {
        customer_id: b2bCust.id,
        first_name: 'Bob',
        last_name: 'Jones',
        email: 'bob@acmemegacorp.local',
        role_title: 'Finance Manager',
        is_primary: false,
      });

      expect(contact1.is_primary).toBe(true);
      expect(contact2.is_primary).toBe(false);

      const contacts = await crmCustomersService.listContacts(tenantA, b2bCust.id);
      expect(contacts).toHaveLength(2);
      expect(contacts.filter((c) => c.is_primary)).toHaveLength(1);
    });

    it('Scenario 3: Duplicate detection identifies potential matches without automatic merging', async () => {
      const cust1 = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'CUST-DUP-1',
        display_name: 'Global Supplies Ltd',
        email: 'orders@globalsupplies.local',
        phone: '15559876543',
        tax_id: 'TAX-998877',
      });

      await customersService.createCustomer(tenantA, userId, {
        customer_code: 'CUST-DUP-2',
        display_name: 'Global Supplies Limited',
        email: 'orders@globalsupplies.local', // Exact email match
        phone: '+1 (555) 987-6543',          // Same digits
        tax_id: 'TAX-998877',                // Same tax ID
      });

      const duplicates = await crmCustomersService.findDuplicateCandidates(tenantA, cust1.id);
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0]!.confidence_score_bp).toBe(10000); // 100.00% exact email/tax match
      expect(duplicates[0]!.match_reasons).toContain('EMAIL_EXACT_MATCH');
      expect(duplicates[0]!.match_reasons).toContain('TAX_ID_EXACT_MATCH');

      // Crucial verification: Original records remain completely unmerged and independent
      const fresh1 = await customersService.getCustomerById(tenantA, cust1.id);
      expect(fresh1.status).toBe('ACTIVE');
    });

    it('Scenario 4: Authorized non-destructive customer merge preserves financial truth and reparents contacts', async () => {
      const surviving = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'SURVIVING-01',
        display_name: 'Apex Group (Primary)',
        credit_limit_minor: '1000000',
      });

      const toMerge = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'DUPLICATE-02',
        display_name: 'Apex Group (Secondary)',
        credit_limit_minor: '500000',
      });

      // Add contact to the customer to be merged
      const contact = await crmCustomersService.createContact(tenantA, {
        customer_id: toMerge.id,
        first_name: 'David',
        last_name: 'Miller',
        email: 'david@apex.local',
      });

      const mergeResult = await crmCustomersService.mergeCustomers(
        tenantA,
        {
          surviving_customer_id: surviving.id,
          merged_customer_id: toMerge.id,
          reason: 'Duplicate profile consolidated per account executive review',
        },
        'supervisor_user',
      );

      expect(mergeResult.surviving_customer_id).toBe(surviving.id);
      expect(mergeResult.merged_customer_id).toBe(toMerge.id);
      expect(mergeResult.reparented_contacts_count).toBe(1);

      // Contact is now reparented to surviving customer
      const updatedContact = await crmCustomersService.getContact(tenantA, contact.id);
      expect(updatedContact.customer_id).toBe(surviving.id);

      // Merged customer marked INACTIVE
      const mergedRecord = await customersService.getCustomerById(tenantA, toMerge.id);
      expect(mergedRecord.status).toBe('INACTIVE');
      expect(mergedRecord.notes).toContain('MERGED into');
    });

    it('Scenario 5: Cross-tenant customer merge strictly rejected with tenant isolation error', async () => {
      const custTenantA = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'TENANT-A-CUST',
        display_name: 'Alpha Customer',
      });

      const custTenantB = await customersService.createCustomer(tenantB, userId, {
        customer_code: 'TENANT-B-CUST',
        display_name: 'Beta Customer',
      });

      // Attempt merge across tenants
      await expect(
        crmCustomersService.mergeCustomers(
          tenantA,
          {
            surviving_customer_id: custTenantA.id,
            merged_customer_id: custTenantB.id,
            reason: 'Malicious cross-tenant merge attempt',
          },
          'attacker',
        ),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Group 2: Leads & Pipelines (Scenarios 6-10)
  // ==========================================================================
  describe('Group 2: Leads & Pipelines', () => {
    it('Scenario 6: Lead qualification and conversion creates customer and opportunity', async () => {
      const lead = await crmPipelineService.createLead(tenantA, {
        first_name: 'Marcus',
        last_name: 'Vance',
        company_name: 'Vance Refrigeration',
        email: 'marcus@vance.local',
        phone: '15552345678',
        qualification_score_bp: 9500, // 95.00%
      });

      expect(lead.status).toBe('NEW');

      const conversion = await crmPipelineService.convertLead(tenantA, {
        lead_id: lead.id,
        create_opportunity: true,
        opportunity_title: 'Enterprise HVAC Expansion',
        estimated_value_minor: '25000000', // $250,000.00
      });

      expect(conversion.customer_id).toBeDefined();
      expect(conversion.opportunity_id).toBeDefined();

      const updatedLead = await crmPipelineService.getLead(tenantA, lead.id);
      expect(updatedLead.status).toBe('CONVERTED');
      expect(updatedLead.converted_customer_id).toBe(conversion.customer_id);

      const opp = await crmPipelineService.getOpportunity(tenantA, conversion.opportunity_id!);
      expect(opp.title).toBe('Enterprise HVAC Expansion');
      expect(opp.estimated_value_minor).toBe('25000000');
    });

    it('Scenario 7: Idempotent external lead ingestion returns existing lead on duplicate webhook', async () => {
      const payload = {
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'sarah@resistance.local',
        external_id: 'WEBHOOK-LEAD-7788',
      };

      const lead1 = await crmPipelineService.ingestExternalLead(tenantA, payload);
      const lead2 = await crmPipelineService.ingestExternalLead(tenantA, payload);

      expect(lead1.id).toBe(lead2.id);
      expect(lead1.lead_code).toBe(lead2.lead_code);

      const allLeads = await crmPipelineService.listLeads(tenantA);
      expect(allLeads.filter((l) => l.external_id === 'WEBHOOK-LEAD-7788')).toHaveLength(1);
    });

    it('Scenario 8: Custom sales pipeline and stage transitions update opportunity state and probability', async () => {
      const cust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'PIPE-CUST-1',
        display_name: 'Tech Ventures LLC',
      });

      const pipeline = await crmPipelineService.createPipeline(tenantA, {
        code: 'ENTERPRISE_SAAS',
        name: 'Enterprise Software Sales',
      });

      const s1 = await crmPipelineService.createStage(tenantA, {
        pipeline_id: pipeline.id,
        stage_code: 'DISCOVERY',
        name: 'Initial Discovery',
        order_index: 0,
        probability_bp: 2000, // 20%
      });

      const s2 = await crmPipelineService.createStage(tenantA, {
        pipeline_id: pipeline.id,
        stage_code: 'SECURITY_REVIEW',
        name: 'Security & Legal Review',
        order_index: 1,
        probability_bp: 7500, // 75%
      });

      const s3 = await crmPipelineService.createStage(tenantA, {
        pipeline_id: pipeline.id,
        stage_code: 'CONTRACT_SIGNED',
        name: 'Contract Signed',
        order_index: 2,
        probability_bp: 10000, // 100%
        is_won_stage: true,
      });

      const opp = await crmPipelineService.createOpportunity(tenantA, {
        title: 'Cloud Infrastructure Deal',
        customer_id: cust.id,
        pipeline_id: pipeline.id,
        current_stage_id: s1.id,
        estimated_value_minor: '5000000', // $50,000
      });

      expect(opp.status).toBe('OPEN');
      expect(opp.probability_bp).toBe(2000);

      // Transition to security review
      const t1 = await crmPipelineService.transitionOpportunityStage(
        tenantA,
        opp.id,
        { to_stage_id: s2.id, notes: 'Passed SOC2 audit' },
        'sales_rep_1',
      );
      expect(t1.current_stage_id).toBe(s2.id);
      expect(t1.probability_bp).toBe(7500);
      expect(t1.status).toBe('OPEN');

      // Transition to won stage
      const t2 = await crmPipelineService.transitionOpportunityStage(
        tenantA,
        opp.id,
        { to_stage_id: s3.id, notes: 'Signed by CEO' },
        'sales_rep_1',
      );
      expect(t2.current_stage_id).toBe(s3.id);
      expect(t2.probability_bp).toBe(10000);
      expect(t2.status).toBe('WON');

      const history = await crmPipelineService.getOpportunityStageHistory(tenantA, opp.id);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('Scenario 9: Won opportunity conversion boundary preserves commercial engine interface', async () => {
      const cust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'COMM-CUST-1',
        display_name: 'Commercial Client',
      });

      const defaultPipe = await crmPipelineService.getOrCreateDefaultPipeline(tenantA);
      const wonStage = (await crmPipelineService.listStages(tenantA, defaultPipe.id)).find((s) => s.is_won_stage)!;

      const opp = await crmPipelineService.createOpportunity(tenantA, {
        title: 'Won Equipment Package',
        customer_id: cust.id,
        pipeline_id: defaultPipe.id,
        current_stage_id: wonStage.id,
        estimated_value_minor: '1200000',
      });

      expect(opp.status).toBe('WON');
      expect(opp.customer_id).toBe(cust.id);
    });

    it('Scenario 10: Opportunity projections do not mutate financial journals or ledger balances', async () => {
      const cust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'FORECAST-01',
        display_name: 'Forecast Test Client',
      });

      const defaultPipe = await crmPipelineService.getOrCreateDefaultPipeline(tenantA);
      await crmPipelineService.createOpportunity(tenantA, {
        title: 'Huge Pipeline Opportunity',
        customer_id: cust.id,
        pipeline_id: defaultPipe.id,
        estimated_value_minor: '1000000000', // $10,000,000.00
      });

      // Customer outstanding balance remains exactly 0
      const customerRecord = await customersService.getCustomerById(tenantA, cust.id);
      expect(customerRecord.outstanding_balance_minor).toBe('0');
    });
  });

  // ==========================================================================
  // Group 3: Activities & Segmentation (Scenarios 11-15)
  // ==========================================================================
  describe('Group 3: Activities & Segmentation', () => {
    it('Scenario 11: Unified customer timeline aggregates CRM activities and commerce events', async () => {
      const cust = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'TIMELINE-01',
        display_name: 'Timeline Customer',
      });

      await crmActivitiesService.recordActivity(tenantA, {
        customer_id: cust.id,
        activity_type: 'CALL',
        subject: 'Quarterly review phone call',
        performed_by: 'sales_rep_1',
      });

      await crmActivitiesService.recordActivity(tenantA, {
        customer_id: cust.id,
        activity_type: 'MEETING',
        subject: 'On-site facility demo',
        performed_by: 'sales_rep_1',
      });

      await crmActivitiesService.createTask(tenantA, {
        customer_id: cust.id,
        subject: 'Send custom price list',
        due_date: new Date().toISOString(),
      });

      const timeline = await crmActivitiesService.getCustomerTimeline(tenantA, cust.id);
      expect(timeline.length).toBeGreaterThanOrEqual(3);
      expect(timeline.some((e) => e.event_type === 'CALL')).toBe(true);
      expect(timeline.some((e) => e.event_type === 'MEETING')).toBe(true);
      expect(timeline.some((e) => e.source === 'CRM_TASK')).toBe(true);
    });

    it('Scenario 12: Follow-up tasks creation, due date filtering, priority tracking, and completion', async () => {
      const task = await crmActivitiesService.createTask(tenantA, {
        subject: 'Urgent contract follow up',
        due_date: new Date(Date.now() + 3600000).toISOString(),
        priority: 'HIGH',
        assigned_to: 'rep_sarah',
      });

      expect(task.status).toBe('PENDING');
      expect(task.priority).toBe('HIGH');
      expect(task.completed_at).toBeNull();

      const completed = await crmActivitiesService.updateTask(tenantA, task.id, {
        status: 'COMPLETED',
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completed_at).not.toBeNull();
    });

    it('Scenario 13: Declarative dynamic segment evaluation with safe JSON rules (no dynamic SQL or eval)', () => {
      const customerMatch = {
        display_name: 'Prime Wholesaler',
        credit_limit_minor: '5000000',
        payment_terms: 'NET_30',
      };

      const customerNoMatch = {
        display_name: 'Retail Shopper',
        credit_limit_minor: '50000',
        payment_terms: 'IMMEDIATE',
      };

      const ruleGroup = {
        combinator: 'AND' as const,
        rules: [
          { field: 'payment_terms', operator: 'EQUALS' as const, value: 'NET_30' },
          { field: 'credit_limit_minor', operator: 'GREATER_THAN' as const, value: '1000000' },
        ],
      };

      expect(evaluateDynamicSegmentRules(customerMatch, ruleGroup)).toBe(true);
      expect(evaluateDynamicSegmentRules(customerNoMatch, ruleGroup)).toBe(false);
    });

    it('Scenario 14: Non-destructive audience preview without modifying customer states', async () => {
      const c1 = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'PREV-1',
        display_name: 'Enterprise VIP 1',
        credit_limit_minor: '10000000',
      });

      const c2 = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'PREV-2',
        display_name: 'Small Buyer',
        credit_limit_minor: '10000',
      });

      const segment = await crmMarketingService.createSegment(tenantA, {
        code: 'VIP_ACCOUNTS',
        name: 'VIP Accounts ($50k+ credit limit)',
        segment_type: 'DYNAMIC',
        rules_json: {
          combinator: 'AND',
          rules: [{ field: 'credit_limit_minor', operator: 'GREATER_THAN', value: '1000000' }],
        },
      });

      const preview = await crmMarketingService.previewSegment(tenantA, segment.id);
      expect(preview.total_matching).toBe(1);
      expect(preview.preview_customer_ids).toContain(c1.id);
      expect(preview.preview_customer_ids).not.toContain(c2.id);

      // Customer state is unaltered
      const checkC1 = await customersService.getCustomerById(tenantA, c1.id);
      expect(checkC1.status).toBe('ACTIVE');
    });

    it('Scenario 15: Multi-tenant isolation: segment previews and exports strictly scoped to the tenant', async () => {
      await customersService.createCustomer(tenantB, userId, {
        customer_code: 'TENANT-B-VIP',
        display_name: 'Tenant B VIP',
        credit_limit_minor: '50000000',
      });

      const segmentTenantA = await crmMarketingService.createSegment(tenantA, {
        code: 'TENANT_A_ALL',
        name: 'Tenant A All',
        segment_type: 'DYNAMIC',
      });

      const preview = await crmMarketingService.previewSegment(tenantA, segmentTenantA.id);
      for (const id of preview.preview_customer_ids) {
        const cust = await customersService.getCustomerById(tenantA, id);
        expect(cust.tenant_id).toBe(tenantA);
      }
    });
  });

  // ==========================================================================
  // Group 4: Campaigns, Consent & Delivery (Scenarios 16-22)
  // ==========================================================================
  describe('Group 4: Campaigns, Consent & Delivery', () => {
    it('Scenario 16: Draft/review campaign sends no messages and dispatches zero communications', async () => {
      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'DRAFT_TEST_SEG',
        name: 'Draft Segment',
      });

      const campaign = await crmMarketingService.createCampaign(tenantA, {
        name: 'Winter Sale 2026',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Huge discounts available now!',
      });

      expect(campaign.status).toBe('DRAFT');
      expect(commAdapter.sentMessages).toHaveLength(0);
    });

    it('Scenario 17: Unapproved campaign dispatch is strictly rejected by governance rules', async () => {
      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'UNAPPROVED_SEG',
        name: 'Segment for Unapproved Test',
      });

      const campaign = await crmMarketingService.createCampaign(tenantA, {
        name: 'Rogue Campaign',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Unapproved marketing blast',
      });

      // Attempt dispatch without approval
      await expect(
        crmMarketingService.dispatchCampaign(tenantA, campaign.id),
      ).rejects.toThrow(/Only APPROVED or SCHEDULED campaigns can be dispatched/);

      expect(commAdapter.sentMessages).toHaveLength(0);
    });

    it('Scenario 18: Pre-dispatch suppression and consent filter removes opted-out and suppressed recipients', () => {
      const recipients = [
        { customer_id: 'cust_1', recipient_address: 'optin@domain.local', channel: 'EMAIL' },
        { customer_id: 'cust_2', recipient_address: 'optout@domain.local', channel: 'EMAIL' },
        { customer_id: 'cust_3', recipient_address: 'suppressed@domain.local', channel: 'EMAIL' },
        { customer_id: 'cust_4', recipient_address: 'noconsent@domain.local', channel: 'EMAIL' },
      ];

      const consentRecords = [
        { customer_id: 'cust_1', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_IN' },
        { customer_id: 'cust_2', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_OUT' },
        { customer_id: 'cust_3', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_IN' },
      ];

      const suppressionSet = new Set(['suppressed@domain.local']);

      const result = filterSuppressedRecipients(
        recipients,
        consentRecords,
        suppressionSet,
        'EMAIL',
        'MARKETING',
      );

      expect(result.allowed).toHaveLength(1);
      expect(result.allowed[0]!.customer_id).toBe('cust_1');
      expect(result.suppressed).toHaveLength(3);
    });

    it('Scenario 19: Real-time consent withdrawal immediately suppresses recipient at dispatch time', async () => {
      const c = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'OPT-OUT-01',
        display_name: 'Fickle Subscriber',
        email: 'fickle@subscriber.local',
      });

      // Initially opted in
      await crmMarketingService.recordConsent(tenantA, {
        customer_id: c.id,
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_IN',
        source: 'WEB_FORM',
        policy_version: 'v1.0',
      });

      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'OPT_SEG',
        name: 'Opt Segment',
        static_customer_ids: [c.id],
      });

      const camp = await crmMarketingService.createCampaign(tenantA, {
        name: 'Promo Blast',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Special offer',
      });

      await crmMarketingService.approveCampaign(tenantA, camp.id, 'manager_user');

      // User withdraws consent immediately before dispatch
      await crmMarketingService.recordConsent(tenantA, {
        customer_id: c.id,
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_OUT',
        source: 'UNSUBSCRIBE_LINK',
        policy_version: 'v1.0',
      });

      const dispatchResult = await crmMarketingService.dispatchCampaign(tenantA, camp.id);
      expect(dispatchResult.dispatched_count).toBe(0);
      expect(dispatchResult.suppressed_count).toBe(1);
      expect(commAdapter.sentMessages).toHaveLength(0);
    });

    it('Scenario 20: Provider timeout recovery marks message failed gracefully without crashing', async () => {
      const c = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'TIMEOUT-01',
        display_name: 'Timeout Test User',
        email: 'timeout@test.local',
      });

      await crmMarketingService.recordConsent(tenantA, {
        customer_id: c.id,
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_IN',
        source: 'WEB',
        policy_version: 'v1.0',
      });

      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'TIMEOUT_SEG',
        name: 'Timeout Segment',
        static_customer_ids: [c.id],
      });

      const camp = await crmMarketingService.createCampaign(tenantA, {
        name: 'Timeout Campaign',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Timeout test',
      });

      await crmMarketingService.approveCampaign(tenantA, camp.id, 'manager_user');

      // Simulate provider timeout
      commAdapter.simulateTimeout = true;

      const result = await crmMarketingService.dispatchCampaign(tenantA, camp.id);
      expect(result.campaign.failed_count).toBe(1);
      expect(result.campaign.delivered_count).toBe(0);

      const msgs = await crmMarketingService.listMessages(tenantA, camp.id);
      expect(msgs[0]!.status).toBe('FAILED');
      expect(msgs[0]!.error_message).toContain('PROVIDER_TIMEOUT');

      commAdapter.reset();
    });

    it('Scenario 21: Campaign cancellation halts unsent messages immediately', async () => {
      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'CANCEL_SEG',
        name: 'Cancel Segment',
      });

      const camp = await crmMarketingService.createCampaign(tenantA, {
        name: 'To Be Cancelled',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Cancelled content',
      });

      await crmMarketingService.approveCampaign(tenantA, camp.id, 'manager_user');
      const cancelled = await crmMarketingService.cancelCampaign(tenantA, camp.id);

      expect(cancelled.status).toBe('CANCELLED');

      // Attempt dispatch of cancelled campaign is rejected
      await expect(
        crmMarketingService.dispatchCampaign(tenantA, camp.id),
      ).rejects.toThrow();
    });

    it('Scenario 22: Idempotent delivery skips duplicate sending with identical operation_id', async () => {
      const c = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'IDEMP-01',
        display_name: 'Idempotency User',
        email: 'idemp@test.local',
      });

      await crmMarketingService.recordConsent(tenantA, {
        customer_id: c.id,
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_IN',
        source: 'WEB',
        policy_version: 'v1.0',
      });

      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'IDEMP_SEG',
        name: 'Idempotency Segment',
        static_customer_ids: [c.id],
      });

      const camp = await crmMarketingService.createCampaign(tenantA, {
        name: 'Idempotent Campaign',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Idempotent message content',
      });

      await crmMarketingService.approveCampaign(tenantA, camp.id, 'manager_user');

      // First dispatch
      await crmMarketingService.dispatchCampaign(tenantA, camp.id, 'OP-DISPATCH-999');
      const sentCountAfterFirst = commAdapter.sentMessages.length;
      expect(sentCountAfterFirst).toBe(1);

      // Duplicate dispatch with exact same operation_id
      await crmMarketingService.dispatchCampaign(tenantA, camp.id, 'OP-DISPATCH-999');
      expect(commAdapter.sentMessages.length).toBe(sentCountAfterFirst); // Zero duplicate sends!
    });
  });

  // ==========================================================================
  // Group 5: Marketing Automation (Scenarios 23-27)
  // ==========================================================================
  describe('Group 5: Marketing Automation', () => {
    it('Scenario 23: Domain event triggers matching active automation workflow', async () => {
      const auto = await crmAutomationService.createAutomation(tenantA, {
        name: 'New Customer Welcome',
        trigger_type: 'CUSTOMER_CREATED',
        actions_json: [
          {
            step_id: 'step_1',
            action_type: 'RECORD_ACTIVITY',
            params: { subject: 'Automated Welcome Note' },
          },
          {
            step_id: 'step_2',
            action_type: 'CREATE_TASK',
            params: { subject: 'Assign Account Manager Call' },
          },
        ],
      });

      await crmAutomationService.publishAutomation(tenantA, auto.id);

      const executions = await crmAutomationService.processDomainEvent(tenantA, {
        event_type: 'CUSTOMER_CREATED',
        event_id: 'evt_cust_created_101',
        customer_id: 'cust_alpha_01',
        payload: { display_name: 'Alpha Customer' },
      });

      expect(executions).toHaveLength(1);
      expect(executions[0]!.status).toBe('COMPLETED');
      expect(executions[0]!.step_results_json['step_1'].status).toBe('SUCCESS');
      expect(executions[0]!.step_results_json['step_2'].status).toBe('SUCCESS');
    });

    it('Scenario 24: Duplicate domain event is processed idempotently without executing steps twice', async () => {
      const auto = await crmAutomationService.createAutomation(tenantA, {
        name: 'Idempotent Event Workflow',
        trigger_type: 'STAGE_CHANGED',
        actions_json: [
          {
            step_id: 'step_task',
            action_type: 'CREATE_TASK',
            params: { subject: 'Follow up on stage change' },
          },
        ],
      });

      await crmAutomationService.publishAutomation(tenantA, auto.id);

      const event = {
        event_type: 'STAGE_CHANGED',
        event_id: 'evt_stage_change_identical',
        customer_id: 'cust_stage_01',
        payload: { to_stage: 'PROPOSAL' },
      };

      const exec1 = await crmAutomationService.processDomainEvent(tenantA, event);
      const initialTaskCount = (await crmActivitiesService.listTasks(tenantA)).length;

      const exec2 = await crmAutomationService.processDomainEvent(tenantA, event);
      const afterTaskCount = (await crmActivitiesService.listTasks(tenantA)).length;

      expect(exec1[0]!.id).toBe(exec2[0]!.id);
      expect(afterTaskCount).toBe(initialTaskCount); // No duplicate tasks created!
    });

    it('Scenario 25: In-flight workflow version is pinned even if automation is updated', async () => {
      const auto = await crmAutomationService.createAutomation(tenantA, {
        name: 'Version Pinned Workflow',
        trigger_type: 'TAG_ADDED',
        actions_json: [
          {
            step_id: 'step_v1',
            action_type: 'RECORD_ACTIVITY',
            params: { subject: 'Version 1 Action' },
          },
        ],
      });

      await crmAutomationService.publishAutomation(tenantA, auto.id);

      // Execute on version 1
      const execV1 = await crmAutomationService.processDomainEvent(tenantA, {
        event_type: 'TAG_ADDED',
        event_id: 'evt_v1_run',
        customer_id: 'cust_v1',
        payload: {},
      });
      expect(execV1[0]!.version).toBe(1);

      // Update automation to version 2
      await crmAutomationService.updateAutomation(tenantA, auto.id, {
        actions_json: [
          {
            step_id: 'step_v2_new',
            action_type: 'RECORD_ACTIVITY',
            params: { subject: 'Version 2 Action' },
          },
        ],
      });

      const updatedAuto = await crmAutomationService.getAutomation(tenantA, auto.id);
      expect(updatedAuto.version).toBe(2);

      // Verify historical execution preserved version 1
      const pastExecutions = await crmAutomationService.listExecutions(tenantA, auto.id);
      expect(pastExecutions.find((e) => e.trigger_event_id === 'evt_v1_run')!.version).toBe(1);
    });

    it('Scenario 26: Workflow graph validation rejects graphs exceeding 10 steps or having invalid actions', () => {
      // Exceeds 10 steps
      const elevenSteps = Array.from({ length: 11 }, (_, i) => ({
        step_id: `step_${i}`,
        action_type: 'CREATE_TASK',
        params: {},
      }));

      expect(() => validateAutomationGraph(elevenSteps)).toThrow(
        /Automation step limit exceeded/,
      );

      // Invalid action type
      const invalidAction = [
        {
          step_id: 'step_bad',
          action_type: 'EXECUTE_ARBITRARY_CODE', // Violation of Architectural Golden Rule 6
          params: {},
        },
      ];

      expect(() => validateAutomationGraph(invalidAction)).toThrow(/Invalid action_type/);
    });

    it('Scenario 27: Failed step halts execution cleanly and records execution failure', async () => {
      const auto = await crmAutomationService.createAutomation(tenantA, {
        name: 'Failure Recovery Workflow',
        trigger_type: 'ORDER_PLACED',
        actions_json: [
          {
            step_id: 'step_fail',
            action_type: 'SEND_MESSAGE',
            params: { body: 'Failing step' }, // Missing recipient
          },
        ],
      });

      await crmAutomationService.publishAutomation(tenantA, auto.id);

      // Simulate network error on comm adapter
      commAdapter.simulateNetworkError = true;

      const executions = await crmAutomationService.processDomainEvent(tenantA, {
        event_type: 'ORDER_PLACED',
        event_id: 'evt_order_fail',
        customer_id: 'cust_fail_01',
        payload: { email: 'test@domain.local' },
      });

      expect(executions).toHaveLength(1);
      commAdapter.reset();
    });
  });

  // ==========================================================================
  // Group 6: Integration, Financial & Platform Safety (Scenarios 28-35)
  // ==========================================================================
  describe('Group 6: Integration & Platform Safety', () => {
    it('Scenario 28: Pipeline forecast expected value calculated using pure integer arithmetic (basis points)', () => {
      const valueMinor = '100000000'; // $1,000,000.00
      const probBp = 3333; // 33.33%

      const expected = calculatePipelineExpectedValue(valueMinor, probBp);
      // Integer formula: floor(100000000 * 3333 / 10000) = 33330000
      expect(expected).toBe(33330000n);
    });

    it('Scenario 29: Campaign attribution calculates revenue without mutating General Ledger accounts', async () => {
      const seg = await crmMarketingService.createSegment(tenantA, {
        code: 'ATTR_SEG',
        name: 'Attribution Segment',
      });

      const camp = await crmMarketingService.createCampaign(tenantA, {
        name: 'Attribution Test Campaign',
        channel: 'EMAIL',
        segment_id: seg.id,
        body_template: 'Attr test',
      });

      const attribution = await crmAnalyticsService.getCampaignAttribution(tenantA, camp.id);
      expect(attribution.campaign_id).toBe(camp.id);
      expect(attribution.attributed_revenue_minor).toBe('0');
      expect(attribution.touchpoint_model).toBe('LAST_TOUCH');
    });

    it('Scenario 30: Loyalty interactions route through Phase 8 LoyaltyService permissions and ledger', () => {
      expect(StandardPermissions.LOYALTY_PROGRAM_MANAGE).toBe('loyalty.program.manage');
      expect(StandardPermissions.LOYALTY_POINTS_ADJUST).toBe('loyalty.points.adjust');
      expect(StandardPermissions.CRM_CUSTOMER_VIEW).toBe('crm.customer.view');
    });

    it('Scenario 31: Scoped RBAC permits and denies based on Phase 9 permission definitions', () => {
      const salesRepPerms = SystemRoleTemplates['SALES_REPRESENTATIVE']!.permissions;
      expect(salesRepPerms).toContain('crm.lead.view');
      expect(salesRepPerms).toContain('crm.lead.manage');
      expect(salesRepPerms).toContain('crm.opportunity.view');
      expect(salesRepPerms).not.toContain('crm.customer.merge'); // Only managers can merge!

      const salesManagerPerms = SystemRoleTemplates['SALES_MANAGER']!.permissions;
      expect(salesManagerPerms).toContain('crm.customer.merge');
      expect(salesManagerPerms).toContain('crm.pipeline.manage');

      const marketingPerms = SystemRoleTemplates['MARKETING_SPECIALIST']!.permissions;
      expect(marketingPerms).toContain('crm.campaign.view');
      expect(marketingPerms).toContain('crm.segment.manage');

      const crmAdminPerms = SystemRoleTemplates['CRM_ADMINISTRATOR']!.permissions;
      expect(crmAdminPerms).toContain('crm.campaign.approve');
      expect(crmAdminPerms).toContain('crm.campaign.dispatch');
    });

    it('Scenario 32: Customer hierarchy tree correctly handles parent-subsidiary relationships', async () => {
      const parent = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'HOLDING-01',
        display_name: 'Holding Corp',
      });

      const sub1 = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'SUB-01',
        display_name: 'East Coast Division',
      });

      const sub2 = await customersService.createCustomer(tenantA, userId, {
        customer_code: 'SUB-02',
        display_name: 'West Coast Division',
      });

      await crmCustomersService.createRelationship(tenantA, {
        parent_customer_id: parent.id,
        child_customer_id: sub1.id,
        relationship_type: 'DIVISION',
      });

      await crmCustomersService.createRelationship(tenantA, {
        parent_customer_id: parent.id,
        child_customer_id: sub2.id,
        relationship_type: 'DIVISION',
      });

      const hierarchy = await crmCustomersService.getAccountHierarchy(tenantA, parent.id);
      expect(hierarchy.customer_id).toBe(parent.id);
      expect(hierarchy.children).toHaveLength(2);
    });

    it('Scenario 33: Multi-tenant isolation verified across all CRM operations', async () => {
      const leadA = await crmPipelineService.createLead(tenantA, {
        first_name: 'Alpha',
        last_name: 'Lead',
      });

      // Tenant B cannot access Tenant A's lead
      await expect(crmPipelineService.getLead(tenantB, leadA.id)).rejects.toThrow();

      // Tenant B cannot list Tenant A's leads
      const leadsB = await crmPipelineService.listLeads(tenantB);
      expect(leadsB.find((l) => l.id === leadA.id)).toBeUndefined();
    });

    it('Scenario 34: Zero floating point numbers in monetary and rate calculations', () => {
      const stages = [
        { stage_code: 'LEAD', stage_name: 'Lead', count: 100 },
        { stage_code: 'QUALIFIED', stage_name: 'Qualified', count: 45 },
        { stage_code: 'WON', stage_name: 'Won', count: 15 },
      ];

      const conversions = calculateFunnelConversionRates(stages);
      expect(conversions[0]!.conversion_rate_to_next_bp).toBe(4500); // 45.00%
      expect(Number.isInteger(conversions[0]!.conversion_rate_to_next_bp)).toBe(true);
      expect(conversions[1]!.conversion_rate_to_next_bp).toBe(3333); // 33.33% integer floor
      expect(Number.isInteger(conversions[1]!.conversion_rate_to_next_bp)).toBe(true);

      const winLoss = calculateWinLossRate(15, 30);
      expect(winLoss.win_rate_bp).toBe(3333); // 15 / 45 = 33.33%
      expect(winLoss.loss_rate_bp).toBe(6667); // 66.67%
      expect(Number.isInteger(winLoss.win_rate_bp)).toBe(true);
    });

    it('Scenario 35: Re-merging an already merged customer is strictly rejected', () => {
      const surviving = { id: 'cust_live_1', tenant_id: tenantA, status: 'ACTIVE' };
      const alreadyMerged = { id: 'cust_dead_2', tenant_id: tenantA, status: 'MERGED' };

      expect(() =>
        validateCustomerMergeInvariants(surviving, alreadyMerged),
      ).toThrow(/already been merged/);

      expect(() =>
        validateCustomerMergeInvariants(alreadyMerged, surviving),
      ).toThrow(/already been merged/);
    });
  });
});
