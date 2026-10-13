/**
 * STOKROVA Phase 9 — CRM, Marketing Automation & Customer Engagement Contracts
 */

// ==========================================
// 1. Account Relationships & Contacts
// ==========================================

export type CrmRelationshipType =
  | 'PARENT_SUBSIDIARY'
  | 'FRANCHISE'
  | 'HOLDING'
  | 'AFFILIATE'
  | 'DIVISION';

export interface CrmAccountRelationship {
  id: string;
  tenant_id: string;
  parent_customer_id: string;
  child_customer_id: string;
  relationship_type: CrmRelationshipType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmAccountRelationshipRequest {
  parent_customer_id: string;
  child_customer_id: string;
  relationship_type: CrmRelationshipType;
  notes?: string | null;
}

export interface CrmAccountHierarchyNode {
  customer_id: string;
  customer_code: string;
  display_name: string;
  relationship_type?: CrmRelationshipType;
  children: CrmAccountHierarchyNode[];
}

export interface CrmContact {
  id: string;
  tenant_id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  department: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmContactRequest {
  customer_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role_title?: string | null;
  department?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface UpdateCrmContactRequest {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role_title?: string | null;
  department?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

export interface CrmDuplicateCandidate {
  customer_id: string;
  customer_code: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  confidence_score_bp: number; // 0 - 10000 basis points
  match_reasons: string[];
}

export interface CrmCustomerMergeRequest {
  surviving_customer_id: string;
  merged_customer_id: string;
  reason: string;
}

export interface CrmCustomerMergeResponse {
  surviving_customer_id: string;
  merged_customer_id: string;
  merged_by: string;
  merged_at: string;
  reparented_contacts_count: number;
  reparented_opportunities_count: number;
  reparented_activities_count: number;
  reparented_tasks_count: number;
}

// ==========================================
// 2. Leads & Sales Pipelines
// ==========================================

export type CrmLeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'CONVERTED';

export type CrmLeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'TRADE_SHOW'
  | 'COLD_CALL'
  | 'INBOUND_EMAIL'
  | 'CAMPAIGN'
  | 'PARTNER'
  | 'OTHER';

export interface CrmLead {
  id: string;
  tenant_id: string;
  lead_code: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: CrmLeadStatus;
  source: CrmLeadSource;
  qualification_score_bp: number;
  disqualification_reason: string | null;
  assigned_to: string | null;
  converted_customer_id: string | null;
  converted_opportunity_id: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmLeadRequest {
  lead_code?: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: CrmLeadSource;
  qualification_score_bp?: number;
  assigned_to?: string | null;
  external_id?: string | null;
  notes?: string | null;
}

export interface UpdateCrmLeadRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: CrmLeadStatus;
  source?: CrmLeadSource;
  qualification_score_bp?: number;
  disqualification_reason?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface ConvertCrmLeadRequest {
  lead_id: string;
  create_opportunity?: boolean;
  opportunity_title?: string;
  pipeline_id?: string;
  estimated_value_minor?: string;
  currency_code?: string;
}

export interface ConvertCrmLeadResponse {
  lead_id: string;
  customer_id: string;
  opportunity_id?: string;
  converted_at: string;
}

export interface CrmPipeline {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  stages?: CrmPipelineStage[];
  created_at: string;
  updated_at: string;
}

export interface CreateCrmPipelineRequest {
  code: string;
  name: string;
  is_default?: boolean;
}

export interface UpdateCrmPipelineRequest {
  name?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface CrmPipelineStage {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  stage_code: string;
  name: string;
  order_index: number;
  probability_bp: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmPipelineStageRequest {
  pipeline_id: string;
  stage_code: string;
  name: string;
  order_index?: number;
  probability_bp: number;
  is_won_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface UpdateCrmPipelineStageRequest {
  name?: string;
  order_index?: number;
  probability_bp?: number;
  is_won_stage?: boolean;
  is_lost_stage?: boolean;
}

export type CrmOpportunityStatus = 'OPEN' | 'WON' | 'LOST' | 'ABANDONED';

export interface CrmOpportunity {
  id: string;
  tenant_id: string;
  opportunity_code: string;
  title: string;
  customer_id: string;
  pipeline_id: string;
  current_stage_id: string;
  estimated_value_minor: string;
  currency_code: string;
  probability_bp: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  status: CrmOpportunityStatus;
  loss_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmOpportunityRequest {
  opportunity_code?: string;
  title: string;
  customer_id: string;
  pipeline_id: string;
  current_stage_id?: string;
  estimated_value_minor: string;
  currency_code?: string;
  probability_bp?: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
}

export interface UpdateCrmOpportunityRequest {
  title?: string;
  estimated_value_minor?: string;
  currency_code?: string;
  probability_bp?: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
  status?: CrmOpportunityStatus;
  loss_reason?: string | null;
}

export interface TransitionCrmOpportunityStageRequest {
  to_stage_id: string;
  notes?: string | null;
  loss_reason?: string | null;
}

export interface CrmOpportunityStageHistory {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string;
  notes: string | null;
  transitioned_at: string;
}

// ==========================================
// 3. Activity Timeline & Tasks
// ==========================================

export type CrmActivityType =
  | 'CALL'
  | 'MEETING'
  | 'NOTE'
  | 'TASK'
  | 'EMAIL'
  | 'MESSAGE';

export interface CrmActivity {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  activity_type: CrmActivityType;
  subject: string;
  description: string | null;
  performed_by: string;
  duration_minutes: number | null;
  performed_at: string;
  created_at: string;
}

export interface CreateCrmActivityRequest {
  customer_id?: string | null;
  contact_id?: string | null;
  opportunity_id?: string | null;
  lead_id?: string | null;
  activity_type: CrmActivityType;
  subject: string;
  description?: string | null;
  performed_by?: string;
  duration_minutes?: number | null;
  performed_at?: string;
}

export type CrmTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CrmTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CrmTask {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  subject: string;
  description: string | null;
  due_date: string;
  priority: CrmTaskPriority;
  status: CrmTaskStatus;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmTaskRequest {
  customer_id?: string | null;
  opportunity_id?: string | null;
  lead_id?: string | null;
  subject: string;
  description?: string | null;
  due_date: string;
  priority?: CrmTaskPriority;
  assigned_to?: string | null;
}

export interface UpdateCrmTaskRequest {
  subject?: string;
  description?: string | null;
  due_date?: string;
  priority?: CrmTaskPriority;
  status?: CrmTaskStatus;
  completed_at?: string | null;
  assigned_to?: string | null;
}

export interface CrmTimelineEvent {
  id: string;
  source: 'CRM_ACTIVITY' | 'CRM_TASK' | 'COMMERCE_ORDER' | 'COMMERCE_INVOICE' | 'COMMERCE_PAYMENT' | 'LOYALTY_TRANSACTION';
  event_type: string;
  timestamp: string;
  title: string;
  description: string | null;
  entity_id: string;
  actor_id: string | null;
  metadata?: Record<string, any>;
}

// ==========================================
// 4. Segmentation, Consent & Suppression
// ==========================================

export type CrmSegmentType = 'STATIC' | 'DYNAMIC';

export interface CrmSegmentRule {
  field: string;
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'IN'
    | 'NOT_IN';
  value: any;
}

export interface CrmSegmentRuleGroup {
  combinator: 'AND' | 'OR';
  rules: (CrmSegmentRule | CrmSegmentRuleGroup)[];
}

export interface CrmSegment {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  segment_type: CrmSegmentType;
  rules_json: CrmSegmentRuleGroup | null;
  is_active: boolean;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmSegmentRequest {
  name: string;
  code: string;
  segment_type?: CrmSegmentType;
  rules_json?: CrmSegmentRuleGroup | null;
  static_customer_ids?: string[];
}

export interface UpdateCrmSegmentRequest {
  name?: string;
  rules_json?: CrmSegmentRuleGroup | null;
  is_active?: boolean;
}

export interface CrmSegmentPreviewResponse {
  total_matching: number;
  preview_customer_ids: string[];
}

export type CrmConsentPurpose =
  | 'MARKETING'
  | 'PRODUCT_UPDATES'
  | 'TRANSACTIONAL'
  | 'SURVEYS';

export type CrmCommunicationChannel =
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'IN_APP';

export type CrmConsentStatus = 'OPTED_IN' | 'OPTED_OUT';

export interface CrmConsentRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  purpose: CrmConsentPurpose;
  channel: CrmCommunicationChannel;
  status: CrmConsentStatus;
  source: string;
  policy_version: string;
  timestamp: string;
  notes: string | null;
}

export interface RecordCrmConsentRequest {
  customer_id: string;
  purpose: CrmConsentPurpose;
  channel: CrmCommunicationChannel;
  status: CrmConsentStatus;
  source: string;
  policy_version: string;
  notes?: string | null;
}

export type CrmSuppressionReason =
  | 'UNSUBSCRIBED'
  | 'HARD_BOUNCE'
  | 'COMPLAINT'
  | 'ADMIN';

export interface CrmSuppressionEntry {
  id: string;
  tenant_id: string;
  channel: CrmCommunicationChannel;
  identifier: string; // e.g. email or phone
  reason: CrmSuppressionReason;
  suppressed_at: string;
}

export interface AddCrmSuppressionRequest {
  channel: CrmCommunicationChannel;
  identifier: string;
  reason: CrmSuppressionReason;
}

// ==========================================
// 5. Campaigns & Delivery
// ==========================================

export type CrmCampaignType = 'ONE_TIME' | 'TRIGGERED' | 'RECURRING';

export type CrmCampaignStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CrmCampaign {
  id: string;
  tenant_id: string;
  campaign_code: string;
  name: string;
  campaign_type: CrmCampaignType;
  status: CrmCampaignStatus;
  channel: CrmCommunicationChannel;
  segment_id: string;
  subject_template: string | null;
  body_template: string;
  budget_limit_minor: string;
  actual_spend_minor: string;
  scheduled_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmCampaignRequest {
  campaign_code?: string;
  name: string;
  campaign_type?: CrmCampaignType;
  channel: CrmCommunicationChannel;
  segment_id: string;
  subject_template?: string | null;
  body_template: string;
  budget_limit_minor?: string;
  scheduled_at?: string | null;
}

export interface UpdateCrmCampaignRequest {
  name?: string;
  subject_template?: string | null;
  body_template?: string;
  budget_limit_minor?: string;
  scheduled_at?: string | null;
}

export interface ApproveCrmCampaignRequest {
  approved_by: string;
}

export interface DispatchCrmCampaignRequest {
  operation_id?: string;
}

export type CrmMessageStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'UNDELIVERED';

export interface CrmMessage {
  id: string;
  tenant_id: string;
  campaign_id: string;
  customer_id: string;
  channel: CrmCommunicationChannel;
  recipient_address: string;
  status: CrmMessageStatus;
  operation_id: string;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ==========================================
// 6. Marketing Automation
// ==========================================

export type CrmAutomationTriggerType =
  | 'CUSTOMER_CREATED'
  | 'LEAD_CREATED'
  | 'ORDER_PLACED'
  | 'STAGE_CHANGED'
  | 'TAG_ADDED';

export type CrmAutomationActionType =
  | 'SEND_MESSAGE'
  | 'CREATE_TASK'
  | 'UPDATE_TAG'
  | 'ASSIGN_OWNER'
  | 'RECORD_ACTIVITY';

export type CrmAutomationStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface CrmAutomationActionStep {
  step_id: string;
  action_type: CrmAutomationActionType;
  params: Record<string, any>;
}

export interface CrmAutomation {
  id: string;
  tenant_id: string;
  automation_code: string;
  name: string;
  trigger_type: CrmAutomationTriggerType;
  trigger_filter_json: Record<string, any> | null;
  actions_json: CrmAutomationActionStep[];
  status: CrmAutomationStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCrmAutomationRequest {
  automation_code?: string;
  name: string;
  trigger_type: CrmAutomationTriggerType;
  trigger_filter_json?: Record<string, any> | null;
  actions_json: CrmAutomationActionStep[];
}

export interface UpdateCrmAutomationRequest {
  name?: string;
  trigger_filter_json?: Record<string, any> | null;
  actions_json?: CrmAutomationActionStep[];
  status?: CrmAutomationStatus;
}

export type CrmAutomationExecutionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface CrmAutomationExecution {
  id: string;
  tenant_id: string;
  automation_id: string;
  version: number;
  customer_id: string | null;
  trigger_event_id: string;
  status: CrmAutomationExecutionStatus;
  step_results_json: Record<string, any>;
  executed_at: string;
}

// ==========================================
// 7. Analytics & Attribution
// ==========================================

export interface CrmPipelineMetrics {
  total_opportunities: number;
  open_value_minor: string;
  weighted_pipeline_value_minor: string;
  won_value_minor: string;
  win_rate_bp: number;
}

export interface CrmFunnelConversion {
  stage_code: string;
  stage_name: string;
  count: number;
  conversion_rate_to_next_bp: number;
}

export interface CrmCampaignAttribution {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  attributed_revenue_minor: string;
  touchpoint_model: 'FIRST_TOUCH' | 'LAST_TOUCH';
}
