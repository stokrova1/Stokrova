# STOKROVA — Phase 9 Master Implementation Plan
## CRM, Marketing Automation & Customer Engagement

**Document Version:** 1.0.0  
**Status:** APPROVED & AUTHORIZED  
**Milestone:** Phase 9  
**Starting Gate:** `READY_FOR_PHASE_9`  
**Target Quality Gate:** `READY_FOR_PHASE_10`  
**Author:** Principal Software Architect & Core Engineering Team  

---

## 1. Executive Mission & Scope Boundaries

Phase 9 implements an enterprise-grade, multi-tenant, offline-capable Customer Relationship Management (CRM) and Marketing Engagement system for the STOKROVA platform.

### Core Product Philosophy
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

The system scales progressively:
- **Solo Trader / Small Shop:** Minimal customer records, notes, direct interaction timeline, no mandatory enterprise pipeline setup.
- **Wholesaler / Distributor:** Business account hierarchies, multiple contacts per account, credit terms, quotations, and commercial contracts integration.
- **Retail Chain:** High-volume customer profiles, segmentation, marketing campaigns, loyalty engagement, automated re-engagement workflows.
- **Enterprise Group:** Scoped sales pipelines, opportunity forecasting, multi-stage approval workflows, marketing automation, consent and privacy compliance.

### Non-Negotiable Invariants & Boundaries
1. **Reuse Existing Authority:** The existing `customers` table and `CustomersService` are the canonical customer foundation. Do not create a competing customer database.
2. **Financial Isolation:** Opportunities and sales forecasts are CRM projections. They must **never** create posted General Ledger journals, recognized revenue, or inventory allocations.
3. **Commerce Preservation:** Opportunity conversion to Quotations or Sales Orders strictly invokes the established `QuotationsService` or `OrdersService`. Do not build a second commercial document engine.
4. **Loyalty Preservation:** Loyalty point operations must route through Phase 8 `LoyaltyService` and its append-only ledger. CRM never directly writes point balances.
5. **Pure Integer Math:** All monetary values (pipeline values, campaign budgets, spend thresholds) use integer minor units (`BigInt` / string minor units). All probabilities, margins, and conversion rates use integer basis points ($10000 = 100.00\%$). Zero floating-point arithmetic.
6. **Strict Consent Precedence:** Consent withdrawal and suppression lists take absolute precedence over segment membership at dispatch time.
7. **Two-Person Rule / Governance:** Campaign dispatch requires explicit approval. Marketing drafts and previews never send real communications.
8. **Multi-Tenant Isolation:** All entities have `tenant_id` foreign keys with `onDelete: 'restrict'`. Cross-tenant customer access or merging is strictly prohibited.

---

## 2. Capability Architecture & Module Decomposition

The CRM system is organized into four integrated modules within the modular monolith:

```text
packages/contracts/src/crm.ts         → Shared TypeScript DTOs, Enums, and Request/Response Contracts
packages/database/src/schema/crm.ts    → Drizzle ORM Schema Tables, Constraints, and Indexes
packages/domain/src/crm.ts            → Pure Domain Engine (De-dup, Segments, Automation, Attribution)
packages/validation/src/crm.ts        → Zod Runtime Validation Schemas
apps/api/src/crm/                     → NestJS Services, Controllers, and Integration Adapters
  ├── crm-customers.service.ts         → Account Hierarchies, Contacts, De-duplication & Safe Merging
  ├── crm-pipeline.service.ts          → Leads, Qualification, Pipelines, Stages & Opportunities
  ├── crm-activities.service.ts        → Activity Timeline, Notes, Follow-up Tasks
  ├── crm-marketing.service.ts         → Segments, Consent, Suppression, Campaigns & Delivery Adapters
  ├── crm-automation.service.ts        → Declarative Event-Driven Workflow Automation Engine
  ├── crm-analytics.service.ts         → Funnel Conversions, Pipeline Value, Campaign Attribution
  ├── adapters/communication.adapter.ts→ Pluggable Email, SMS, WhatsApp & In-App Mock Adapters
  └── crm.module.ts                   → NestJS Module Registration
```

---

## 3. Database Schema Design (`packages/database/src/schema/crm.ts`)

Migration: `0009_brave_crm.sql`

### 3.1 Business Accounts & Contact Management
- `crm_account_relationships`: Parent-subsidiary account graph (`parent_customer_id`, `child_customer_id`, `relationship_type`).
- `crm_contacts`: Multiple contacts per business customer (`customer_id`, `first_name`, `last_name`, `email`, `phone`, `role_title`, `is_primary`, `department`).
- `crm_customer_merges`: Audit history of merged identities (`surviving_customer_id`, `merged_customer_id`, `merged_by`, `merged_at`, `audit_evidence_json`).

### 3.2 Leads & Configurable Sales Pipelines
- `crm_leads`: Prospective leads (`lead_code`, `first_name`, `last_name`, `company_name`, `email`, `phone`, `status`, `source`, `assigned_to`, `qualification_score_bp`, `disqualification_reason`, `external_id`).
- `crm_pipelines`: Configurable sales pipelines (`code`, `name`, `is_default`, `is_active`).
- `crm_pipeline_stages`: Pipeline stages (`pipeline_id`, `stage_code`, `name`, `order_index`, `probability_bp`, `is_won_stage`, `is_lost_stage`).
- `crm_opportunities`: Sales deals (`opportunity_code`, `title`, `customer_id`, `pipeline_id`, `current_stage_id`, `estimated_value_minor`, `currency_code`, `probability_bp`, `expected_close_date`, `assigned_to`, `status`, `loss_reason`).
- `crm_opportunity_stage_history`: Stage transitions (`opportunity_id`, `from_stage_id`, `to_stage_id`, `changed_by`, `transitioned_at`).

### 3.3 Activity Timelines & Follow-Up Tasks
- `crm_activities`: Customer interactions (`customer_id`, `contact_id`, `opportunity_id`, `lead_id`, `activity_type`, `subject`, `description`, `performed_by`, `performed_at`).
- `crm_tasks`: Follow-up action items (`customer_id`, `opportunity_id`, `lead_id`, `subject`, `due_date`, `priority`, `status`, `completed_at`, `assigned_to`).

### 3.4 Segmentation, Consent & Suppression
- `crm_segments`: Audience segments (`name`, `code`, `segment_type` [STATIC/DYNAMIC], `rules_json`, `is_active`).
- `crm_segment_members`: Static audience members (`segment_id`, `customer_id`).
- `crm_consent_records`: Consent evidence (`customer_id`, `purpose`, `channel`, `status` [OPTED_IN/OPTED_OUT], `source`, `policy_version`, `timestamp`).
- `crm_suppression_list`: Global suppression (`channel`, `identifier`, `reason` [UNSUBSCRIBED/HARD_BOUNCE/COMPLAINT/ADMIN]).

### 3.5 Marketing Campaigns & Message Delivery
- `crm_campaigns`: Campaigns (`campaign_code`, `name`, `campaign_type`, `status` [DRAFT/REVIEW/APPROVED/SCHEDULED/RUNNING/COMPLETED/CANCELLED], `channel`, `segment_id`, `budget_limit_minor`, `scheduled_at`, `approved_by`).
- `crm_messages`: Delivery tracking (`campaign_id`, `customer_id`, `channel`, `recipient_address`, `status` [PENDING/QUEUED/SENT/DELIVERED/FAILED/UNDELIVERED], `operation_id`, `provider_message_id`, `sent_at`, `delivered_at`, `error_message`).

### 3.6 Marketing Automation Engine
- `crm_automations`: Workflow definitions (`automation_code`, `name`, `trigger_type`, `trigger_filter_json`, `actions_json`, `status` [DRAFT/ACTIVE/PAUSED/ARCHIVED], `version`).
- `crm_automation_executions`: Execution log (`automation_id`, `version`, `customer_id`, `trigger_event_id`, `status` [RUNNING/COMPLETED/FAILED], `step_results_json`, `executed_at`).

---

## 4. Pure Domain Engine Specifications (`packages/domain/src/crm.ts`)

1. **Duplicate Detection Scoring:**
   - Evaluates match confidence based on normalized email (100 pts), phone (90 pts), tax ID (100 pts), and legal name similarity. Scores $\ge 85$ trigger duplicate candidate flags.
2. **Safe Customer Merge Invariants:**
   - Re-parents all child entities (contacts, addresses, activities, opportunities, leads) to the surviving customer.
   - Marks target customer as `ACTIVE` and source customer as `MERGED`.
   - Never deletes past financial, order, or loyalty records.
3. **Declarative Segment Evaluator:**
   - Evaluates customer profiles against structured JSON conditions (`AND`/`OR`) with zero dynamic SQL or `eval`.
4. **Pre-Dispatch Suppression Filter:**
   - Pure function `filterSuppressedRecipients(recipients, consentMap, suppressionSet, channel, purpose)`.
   - Hard suppression and lack of opt-in instantly remove recipient from dispatch batch.
5. **Marketing Automation Execution Bounds:**
   - Max 10 steps per execution, cycle prevention, tenant execution budget limits.
6. **Pipeline Forecasting & Win Rates:**
   - Expected Value Minor: $\left\lfloor \frac{\text{EstimatedValueMinor} \times \text{ProbabilityBp}}{10000} \right\rfloor$.
   - Conversion Rates: Integer basis point ratio of won vs total decided opportunities.

---

## 5. Security & Scoped RBAC Matrix

New standard permissions registered in `StandardPermissions`:
- `crm.customer.view`, `crm.customer.manage`, `crm.customer.merge`
- `crm.contact.manage`
- `crm.lead.view`, `crm.lead.manage`, `crm.lead.convert`
- `crm.opportunity.view`, `crm.opportunity.manage`, `crm.pipeline.manage`
- `crm.activity.view`, `crm.activity.manage`
- `crm.segment.view`, `crm.segment.manage`
- `crm.campaign.view`, `crm.campaign.manage`, `crm.campaign.approve`, `crm.campaign.dispatch`
- `crm.automation.manage`, `crm.automation.publish`
- `crm.consent.view`, `crm.consent.manage`
- `crm.analytics.view`

Standard Role Templates registered:
- `SALES_REPRESENTATIVE`: Leads, customers, opportunities, activities.
- `SALES_MANAGER`: Pipelines, leads, customer merge, opportunities, approvals.
- `MARKETING_SPECIALIST`: Segments, campaigns (create/review), communications, consent.
- `CRM_ADMINISTRATOR`: Full CRM administrative authority across all modules.

---

## 6. Master Acceptance Matrix (35 Scenarios)

The test suite in `apps/api/src/crm/crm-phase9.spec.ts` must rigorously verify all 35 evaluation scenarios:
- **Identity & Relationships (1-5):** Individual customer creation, B2B account with multiple contacts, duplicate detection without auto-merge, authorized merge preserving financial truth, reject cross-tenant merge.
- **Leads & Pipelines (6-10):** Lead qualification and conversion, idempotent external ingestion, custom pipeline transitions, won opportunity converted to quotation/order, reject unauthorized conversions.
- **Activities & Segmentation (11-15):** Timeline with linked commerce events, follow-up task query/completion, dynamic segment evaluation, non-destructive preview, tenant-isolated audience export.
- **Campaigns, Consent & Delivery (16-22):** Draft/preview sends no messages, unapproved dispatch rejected, consent/suppression filtering, last-minute consent withdrawal respected, provider timeout recovery, campaign cancellation halts queued messages, idempotent delivery reconciliation.
- **Automation (23-27):** Duplicate domain event processed idempotently, in-flight workflow version pinned, reject unsafe/looping automation, worker restart recovery, per-tenant execution limits.
- **Integration & Platform Safety (28-35):** Pipeline forecast $\ne$ recognized revenue, attribution does not mutate GL, loyalty operations use Phase 8 service, offline activity sync, stale offline state cannot bypass consent withdrawal, API idempotency, migration integrity, zero direct mutation of past orders/financial journals.

---

## 7. Execution Schedule

1. **Step 1:** Authorize implementation plan (this document).
2. **Step 2:** Define contracts in `packages/contracts/src/crm.ts` and export.
3. **Step 3:** Define database schema in `packages/database/src/schema/crm.ts`, generate Drizzle migration `0009_brave_crm.sql`, and build.
4. **Step 4:** Implement domain algorithms in `packages/domain/src/crm.ts`, update RBAC permissions, and build domain.
5. **Step 5:** Implement Zod validation schemas in `packages/validation/src/crm.ts` and build validation.
6. **Step 6:** Implement NestJS CRM services, adapters, controllers, and module in `apps/api/src/crm/`.
7. **Step 7:** Author comprehensive test suite `apps/api/src/crm/crm-phase9.spec.ts` covering all 35 scenarios.
8. **Step 8:** Run typecheck, production build, and monorepo regression test suites.
9. **Step 9:** Execute dangerous-pattern audit.
10. **Step 10:** Author architecture model and completion report certifying `READY_FOR_PHASE_10`.
