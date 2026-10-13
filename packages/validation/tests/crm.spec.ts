import { describe, it, expect } from 'vitest';
import {
  CreateCrmAccountRelationshipSchema,
  CreateCrmContactSchema,
  CrmCustomerMergeSchema,
  CreateCrmLeadSchema,
  ConvertCrmLeadSchema,
  CreateCrmPipelineSchema,
  CreateCrmPipelineStageSchema,
  CreateCrmOpportunitySchema,
  TransitionCrmOpportunityStageSchema,
  CreateCrmSegmentSchema,
  RecordCrmConsentSchema,
  AddCrmSuppressionSchema,
  CreateCrmCampaignSchema,
  CreateCrmActivitySchema,
  CreateCrmTaskSchema,
  CreateCrmAutomationSchema,
} from '../src/crm.js';

describe('Phase 22 CRM Validation Schemas', () => {
  describe('Account Relationships & Contacts', () => {
    it('validates account relationship request', () => {
      const res = CreateCrmAccountRelationshipSchema.safeParse({
        parent_customer_id: 'cust_parent',
        child_customer_id: 'cust_child',
        relationship_type: 'PARENT_SUBSIDIARY',
        notes: 'Regional branch subsidiary',
      });
      expect(res.success).toBe(true);
    });

    it('validates contact creation with email and phone', () => {
      const res = CreateCrmContactSchema.safeParse({
        customer_id: 'cust_123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@smith.com',
        phone: '+1 555-0100',
        role_title: 'Procurement Director',
        is_primary: true,
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid email in contact', () => {
      const res = CreateCrmContactSchema.safeParse({
        customer_id: 'cust_123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'invalid-email-format',
      });
      expect(res.success).toBe(false);
    });

    it('validates customer merge schema', () => {
      const res = CrmCustomerMergeSchema.safeParse({
        surviving_customer_id: 'cust_survivor',
        merged_customer_id: 'cust_target',
        reason: 'Duplicate account created via web store',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Leads & Commercial Pipeline', () => {
    it('validates lead creation schema', () => {
      const res = CreateCrmLeadSchema.safeParse({
        first_name: 'Robert',
        last_name: 'Taylor',
        company_name: 'Taylor Logistics Ltd',
        email: 'rtaylor@taylorlogistics.com',
        source: 'TRADE_SHOW',
        qualification_score_bp: 8000,
      });
      expect(res.success).toBe(true);
    });

    it('validates lead conversion schema', () => {
      const res = ConvertCrmLeadSchema.safeParse({
        lead_id: 'lead_999',
        create_opportunity: true,
        opportunity_title: 'Fleet Expansion Contract',
        estimated_value_minor: '12000000',
        currency_code: 'USD',
      });
      expect(res.success).toBe(true);
    });

    it('validates pipeline and stage creation', () => {
      const pipelineRes = CreateCrmPipelineSchema.safeParse({
        code: 'ENTERPRISE_SALES',
        name: 'Enterprise Direct Sales',
        is_default: true,
      });
      expect(pipelineRes.success).toBe(true);

      const stageRes = CreateCrmPipelineStageSchema.safeParse({
        pipeline_id: 'pipe_1',
        stage_code: 'TECHNICAL_REVIEW',
        name: 'Technical Validation',
        order_index: 2,
        probability_bp: 6000,
      });
      expect(stageRes.success).toBe(true);
    });

    it('validates opportunity creation and stage transition', () => {
      const oppRes = CreateCrmOpportunitySchema.safeParse({
        title: 'ERP Integration Services',
        customer_id: 'cust_456',
        pipeline_id: 'pipe_1',
        estimated_value_minor: '4500000',
        currency_code: 'USD',
        probability_bp: 7500,
      });
      expect(oppRes.success).toBe(true);

      const transitionRes = TransitionCrmOpportunityStageSchema.safeParse({
        to_stage_id: 'stage_won',
        notes: 'Contract signed by COO',
      });
      expect(transitionRes.success).toBe(true);
    });
  });

  describe('Consent, Suppression & Segmentation', () => {
    it('validates consent recording schema', () => {
      const res = RecordCrmConsentSchema.safeParse({
        customer_id: 'cust_789',
        purpose: 'MARKETING',
        channel: 'EMAIL',
        status: 'OPTED_IN',
        source: 'CHECKOUT_FORM',
        policy_version: 'v2.1',
      });
      expect(res.success).toBe(true);
    });

    it('validates suppression entry', () => {
      const res = AddCrmSuppressionSchema.safeParse({
        channel: 'EMAIL',
        identifier: 'spam_reporter@domain.com',
        reason: 'COMPLAINT',
      });
      expect(res.success).toBe(true);
    });

    it('validates dynamic segment schema with rules', () => {
      const res = CreateCrmSegmentSchema.safeParse({
        name: 'High Value Wholesale Buyers',
        code: 'VIP_WHOLESALE',
        segment_type: 'DYNAMIC',
        rules_json: {
          combinator: 'AND',
          rules: [
            { field: 'tier', operator: 'EQUALS', value: 'PLATINUM' },
            { field: 'total_spent_minor', operator: 'GREATER_THAN', value: '10000000' },
          ],
        },
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Campaigns & Automation Workflows', () => {
    it('validates campaign creation', () => {
      const res = CreateCrmCampaignSchema.safeParse({
        name: 'Black Friday Wholesale Early Access',
        channel: 'EMAIL',
        segment_id: 'seg_wholesale',
        subject_template: 'Exclusive Wholesale Pricing Announced',
        body_template: 'Hello {{customer_name}}, check your new tier prices.',
      });
      expect(res.success).toBe(true);
    });

    it('validates CRM activities and tasks', () => {
      const actRes = CreateCrmActivitySchema.safeParse({
        activity_type: 'CALL',
        subject: 'Quarterly review call',
        performed_by: 'user_rep_1',
        duration_minutes: 25,
      });
      expect(actRes.success).toBe(true);

      const taskRes = CreateCrmTaskSchema.safeParse({
        subject: 'Send updated enterprise quotation',
        due_date: new Date().toISOString(),
        priority: 'URGENT',
      });
      expect(taskRes.success).toBe(true);
    });

    it('validates marketing automation workflow schema', () => {
      const res = CreateCrmAutomationSchema.safeParse({
        name: 'Welcome Series for New Inbound Leads',
        trigger_type: 'LEAD_CREATED',
        actions_json: [
          {
            step_id: 'step_1',
            action_type: 'SEND_MESSAGE',
            params: { channel: 'EMAIL', subject: 'Welcome to STOKROVA' },
          },
          {
            step_id: 'step_2',
            action_type: 'CREATE_TASK',
            params: { subject: 'Follow-up discovery call', priority: 'HIGH' },
          },
        ],
      });
      expect(res.success).toBe(true);
    });
  });
});
