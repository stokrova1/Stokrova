import { z } from 'zod';

// ==========================================
// 1. Account Relationships & Contacts
// ==========================================

export const CrmRelationshipTypeSchema = z.enum([
  'PARENT_SUBSIDIARY',
  'FRANCHISE',
  'HOLDING',
  'AFFILIATE',
  'DIVISION',
]);

export const CreateCrmAccountRelationshipSchema = z.object({
  parent_customer_id: z.string().min(1),
  child_customer_id: z.string().min(1),
  relationship_type: CrmRelationshipTypeSchema.default('PARENT_SUBSIDIARY'),
  notes: z.string().max(1000).optional().nullable(),
});

export const CreateCrmContactSchema = z.object({
  customer_id: z.string().min(1),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role_title: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  is_primary: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

export const UpdateCrmContactSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role_title: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  is_primary: z.boolean().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const CrmCustomerMergeSchema = z.object({
  surviving_customer_id: z.string().min(1),
  merged_customer_id: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

// ==========================================
// 2. Leads & Sales Pipelines
// ==========================================

export const CrmLeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CONVERTED',
]);

export const CrmLeadSourceSchema = z.enum([
  'WEBSITE',
  'REFERRAL',
  'TRADE_SHOW',
  'COLD_CALL',
  'INBOUND_EMAIL',
  'CAMPAIGN',
  'PARTNER',
  'OTHER',
]);

export const CreateCrmLeadSchema = z.object({
  lead_code: z.string().trim().max(50).optional(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  company_name: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  source: CrmLeadSourceSchema.optional().default('WEBSITE'),
  qualification_score_bp: z.number().int().min(0).max(10000).optional().default(0),
  assigned_to: z.string().optional().nullable(),
  external_id: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateCrmLeadSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  company_name: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  status: CrmLeadStatusSchema.optional(),
  source: CrmLeadSourceSchema.optional(),
  qualification_score_bp: z.number().int().min(0).max(10000).optional(),
  disqualification_reason: z.string().max(500).optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const ConvertCrmLeadSchema = z.object({
  lead_id: z.string().min(1),
  create_opportunity: z.boolean().optional().default(false),
  opportunity_title: z.string().max(200).optional(),
  pipeline_id: z.string().optional(),
  estimated_value_minor: z.string().regex(/^\d+$/).optional(),
  currency_code: z.string().length(3).optional(),
});

export const CreateCrmPipelineSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  is_default: z.boolean().optional().default(false),
});

export const UpdateCrmPipelineSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const CreateCrmPipelineStageSchema = z.object({
  pipeline_id: z.string().min(1),
  stage_code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  order_index: z.number().int().min(0).default(0),
  probability_bp: z.number().int().min(0).max(10000).default(0),
  is_won_stage: z.boolean().optional().default(false),
  is_lost_stage: z.boolean().optional().default(false),
});

export const UpdateCrmPipelineStageSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  order_index: z.number().int().min(0).optional(),
  probability_bp: z.number().int().min(0).max(10000).optional(),
  is_won_stage: z.boolean().optional(),
  is_lost_stage: z.boolean().optional(),
});

export const CrmOpportunityStatusSchema = z.enum(['OPEN', 'WON', 'LOST', 'ABANDONED']);

export const CreateCrmOpportunitySchema = z.object({
  opportunity_code: z.string().trim().max(50).optional(),
  title: z.string().trim().min(1).max(200),
  customer_id: z.string().min(1),
  pipeline_id: z.string().min(1),
  current_stage_id: z.string().optional(),
  estimated_value_minor: z.string().regex(/^\d+$/).default('0'),
  currency_code: z.string().length(3).optional().default('USD'),
  probability_bp: z.number().int().min(0).max(10000).optional(),
  expected_close_date: z.string().datetime().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

export const UpdateCrmOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  estimated_value_minor: z.string().regex(/^\d+$/).optional(),
  currency_code: z.string().length(3).optional(),
  probability_bp: z.number().int().min(0).max(10000).optional(),
  expected_close_date: z.string().datetime().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  status: CrmOpportunityStatusSchema.optional(),
  loss_reason: z.string().max(500).optional().nullable(),
});

export const TransitionCrmOpportunityStageSchema = z.object({
  to_stage_id: z.string().min(1),
  notes: z.string().max(1000).optional().nullable(),
  loss_reason: z.string().max(500).optional().nullable(),
});

// ==========================================
// 3. Activities & Tasks
// ==========================================

export const CrmActivityTypeSchema = z.enum([
  'CALL',
  'MEETING',
  'NOTE',
  'TASK',
  'EMAIL',
  'MESSAGE',
]);

export const CreateCrmActivitySchema = z.object({
  customer_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  opportunity_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  activity_type: CrmActivityTypeSchema,
  subject: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  performed_by: z.string().min(1),
  duration_minutes: z.number().int().min(0).optional().nullable(),
  performed_at: z.string().datetime().optional(),
});

export const CrmTaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const CrmTaskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const CreateCrmTaskSchema = z.object({
  customer_id: z.string().optional().nullable(),
  opportunity_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  subject: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().datetime(),
  priority: CrmTaskPrioritySchema.optional().default('MEDIUM'),
  assigned_to: z.string().optional().nullable(),
});

export const UpdateCrmTaskSchema = z.object({
  subject: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().datetime().optional(),
  priority: CrmTaskPrioritySchema.optional(),
  status: CrmTaskStatusSchema.optional(),
  completed_at: z.string().datetime().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

// ==========================================
// 4. Segmentation, Consent & Suppression
// ==========================================

export const CrmSegmentTypeSchema = z.enum(['STATIC', 'DYNAMIC']);

export const CrmSegmentRuleOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'GREATER_THAN',
  'LESS_THAN',
  'IN',
  'NOT_IN',
]);

export const CrmSegmentRuleSchema = z.object({
  field: z.string().min(1),
  operator: CrmSegmentRuleOperatorSchema,
  value: z.any(),
});

export const CrmSegmentRuleGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    combinator: z.enum(['AND', 'OR']),
    rules: z.array(z.union([CrmSegmentRuleSchema, CrmSegmentRuleGroupSchema])),
  }),
);

export const CreateCrmSegmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(50),
  segment_type: CrmSegmentTypeSchema.default('STATIC'),
  rules_json: CrmSegmentRuleGroupSchema.optional().nullable(),
  static_customer_ids: z.array(z.string()).optional(),
});

export const UpdateCrmSegmentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  rules_json: CrmSegmentRuleGroupSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

export const CrmConsentPurposeSchema = z.enum([
  'MARKETING',
  'PRODUCT_UPDATES',
  'TRANSACTIONAL',
  'SURVEYS',
]);

export const CrmCommunicationChannelSchema = z.enum([
  'EMAIL',
  'SMS',
  'WHATSAPP',
  'IN_APP',
]);

export const CrmConsentStatusSchema = z.enum(['OPTED_IN', 'OPTED_OUT']);

export const RecordCrmConsentSchema = z.object({
  customer_id: z.string().min(1),
  purpose: CrmConsentPurposeSchema,
  channel: CrmCommunicationChannelSchema,
  status: CrmConsentStatusSchema,
  source: z.string().min(1).max(100),
  policy_version: z.string().min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
});

export const CrmSuppressionReasonSchema = z.enum([
  'UNSUBSCRIBED',
  'HARD_BOUNCE',
  'COMPLAINT',
  'ADMIN',
]);

export const AddCrmSuppressionSchema = z.object({
  channel: CrmCommunicationChannelSchema,
  identifier: z.string().min(1).max(200),
  reason: CrmSuppressionReasonSchema,
});

// ==========================================
// 5. Campaigns & Delivery
// ==========================================

export const CrmCampaignTypeSchema = z.enum(['ONE_TIME', 'TRIGGERED', 'RECURRING']);

export const CreateCrmCampaignSchema = z.object({
  campaign_code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1).max(100),
  campaign_type: CrmCampaignTypeSchema.optional().default('ONE_TIME'),
  channel: CrmCommunicationChannelSchema.default('EMAIL'),
  segment_id: z.string().min(1),
  subject_template: z.string().max(200).optional().nullable(),
  body_template: z.string().min(1).max(20000),
  budget_limit_minor: z.string().regex(/^\d+$/).optional().default('0'),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export const UpdateCrmCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subject_template: z.string().max(200).optional().nullable(),
  body_template: z.string().min(1).max(20000).optional(),
  budget_limit_minor: z.string().regex(/^\d+$/).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export const ApproveCrmCampaignSchema = z.object({
  approved_by: z.string().min(1),
});

export const DispatchCrmCampaignSchema = z.object({
  operation_id: z.string().optional(),
});

// ==========================================
// 6. Marketing Automation
// ==========================================

export const CrmAutomationTriggerTypeSchema = z.enum([
  'CUSTOMER_CREATED',
  'LEAD_CREATED',
  'ORDER_PLACED',
  'STAGE_CHANGED',
  'TAG_ADDED',
]);

export const CrmAutomationActionTypeSchema = z.enum([
  'SEND_MESSAGE',
  'CREATE_TASK',
  'UPDATE_TAG',
  'ASSIGN_OWNER',
  'RECORD_ACTIVITY',
]);

export const CrmAutomationActionStepSchema = z.object({
  step_id: z.string().min(1).max(50),
  action_type: CrmAutomationActionTypeSchema,
  params: z.record(z.any()),
});

export const CreateCrmAutomationSchema = z.object({
  automation_code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1).max(100),
  trigger_type: CrmAutomationTriggerTypeSchema,
  trigger_filter_json: z.record(z.any()).optional().nullable(),
  actions_json: z.array(CrmAutomationActionStepSchema).min(1).max(10),
});

export const UpdateCrmAutomationSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  trigger_filter_json: z.record(z.any()).optional().nullable(),
  actions_json: z.array(CrmAutomationActionStepSchema).min(1).max(10).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});
