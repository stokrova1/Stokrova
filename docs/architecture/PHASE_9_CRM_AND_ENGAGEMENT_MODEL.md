# STOKROVA — Phase 9 CRM, Marketing Automation & Customer Engagement Architecture Model

**Product:** STOKROVA — Configurable, Offline-Capable, Multi-Tenant Enterprise Business Operating Platform  
**Phase:** Phase 9 — CRM, Marketing Automation & Customer Engagement  
**Target Milestone Gate:** `READY_FOR_PHASE_10`  
**Status:** COMPLETE & AUTHORITATIVE  

---

## 1. Executive Architectural Overview

Phase 9 implements a production-grade, multi-tenant customer relationship management (CRM) and customer engagement system for STOKROVA.

Instead of creating fragmented, competing silos for customer profiles, sales opportunities, or marketing communications, Phase 9 extends the unified core of STOKROVA:
- Product Catalog & Inventory Core (Phases 2 & 3)
- Commerce, Sales Orders & POS (Phase 3)
- Procurement & Supplier Relationships (Phase 4)
- General Ledger & Accounting Books (Phases 6 & 7)
- Commercial Pricing, Promotions, Loyalty & Rebates (Phase 8)

The CRM system scales dynamically from a solo retailer running an offline till to an enterprise managing national account hierarchies, tiered sales pipelines, dynamic segmentation, consent records, and automated lifecycle marketing workflows:

$$\begin{aligned}
\text{Ingested / Captured Leads} &\longrightarrow \text{Rule-Based Qualification} \longrightarrow \begin{cases} \text{Disqualified} & \text{Archived} \\ \text{Qualified} & \text{Converted to Account \& Opportunity} \end{cases} \\
\text{Customer Profiles} &\longrightarrow \text{Weighted Match Engine} \longrightarrow \begin{cases} \text{Score} \ge 8500\text{ bp} & \text{Duplicate Flagged for Non-Destructive Merge} \\ \text{Score} < 8500\text{ bp} & \text{Clean Profile Confirmed} \end{cases} \\
\text{Sales Opportunities} &\longrightarrow \text{Pipeline Stages (Basis Points)} \longrightarrow \text{Expected Value (Pure Integer Minor Units)} \\
\text{Won Opportunity} &\longrightarrow \text{Contractual Quotation / Sales Order} \longrightarrow \text{Double-Entry Ledger (Downstream Truth)} \\
\text{Audience Target} &\longrightarrow \text{Dynamic Criteria Filter} \longrightarrow \text{Pre-Dispatch Suppression \& Consent Engine} \\
\text{Campaign Dispatch} &\longrightarrow \text{Pluggable Communication Adapter} \longrightarrow \text{Idempotent Delivery \& Real-Time Timeline} \\
\text{Customer Lifecycle Events} &\longrightarrow \text{Deterministic Automation Graph} \longrightarrow \text{Bounded Execution Engine (Max 10 Steps)}
\end{aligned}$$

---

## 2. Core Architectural Pillars

### Pillar A: Universal Customer Identity & Hierarchy Model
The customer model supports both individual retail consumers (B2C) and corporate accounts (B2B):
- **Account Types**: `INDIVIDUAL` and `BUSINESS`.
- **Account Hierarchy**: Self-referencing recursive parent-child relationship (`parent_account_id` $\rightarrow$ `customers.id`) enabling multi-subsidiary enterprise structures.
- **Multiple Contacts**: Associated `crm_customer_contacts` per account, with an explicit `is_primary` flag and unique contact details (email, phone, title, role).
- **Composite Duplicate Detection**:
  - Pure domain matching algorithm (`scoreCustomerDuplicateMatch`) combining normalized exact email matches (4000 bp), normalized exact phone matches (3500 bp), tax identifier matches (3000 bp), and Soundex / Levenshtein string similarity (2500 bp).
  - Maximum composite score is capped at 10000 basis points ($100.00\%$).
  - Profiles with composite score $\ge 8500$ bp are flagged as candidate duplicates.
  - **Zero Destructive Auto-Merging**: Merging requires explicit administrative authorization.
- **Non-Destructive Customer Merging**:
  - The secondary customer record is marked as `MERGED` with `merged_into_customer_id = primary_customer_id`.
  - Child CRM entities (contacts, activities, opportunities, leads, consents) are reparented cleanly to the primary customer.
  - **Financial Invariant Preservation**: Past sales orders, invoices, payments, credit notes, and posted General Ledger journal entries retain their original immutable customer keys to preserve legal auditability and historical financial truth.

---

### Pillar B: Lead Ingestion, Qualification & Conversion
- **Idempotent External Ingestion**: External CRM leads are captured via `external_id` with unique constraint per tenant (`(tenant_id, external_id)`). Duplicate ingestions return the existing lead record idempotently without creating duplicate records or mutations.
- **Qualification Scoring**: Integer score between 0 and 100 based on configurable criteria (budget verified, decision maker identified, timeline established, contact complete).
- **Conversion Workflow**:
  - A qualified lead converts atomically into a target `Customer` account and optionally an associated `CrmOpportunity`.
  - The lead status transitions to `CONVERTED` and records `converted_customer_id`, `converted_opportunity_id`, and `converted_at`.

---

### Pillar C: Configurable Sales Pipelines & Opportunity Tracking
- **Multi-Pipeline Architecture**: Businesses can define multiple concurrent sales pipelines (e.g. `DIRECT_SALES`, `WHOLESALE_KEY_ACCOUNTS`, `PARTNER_CHANNEL`).
- **Ordered Stages with Integer Probabilities**:
  - Each pipeline contains ordered stages (`order_index` $0, 1, 2, \dots$).
  - Stage win probabilities are strictly stored in integer basis points ($0 \dots 10000$, where $10000 = 100.00\%$).
- **Pure Integer Pipeline Valuation**:
  - Opportunity estimated amounts are stored strictly in integer minor units (`BigInt` / numeric string).
  - Expected pipeline value calculation:
    $$\text{ExpectedValueMinor} = \left\lfloor \frac{\text{EstimatedAmountMinor} \times \text{ProbabilityBp}}{10000} \right\rfloor$$
- **Strict Financial Boundary**:
  - Opportunities represent probabilistic projections and **never mutate the General Ledger** or represent recognized revenue.
  - When an opportunity transitions to `CLOSED_WON`, it integrates downstream with `QuotationsService` or `OrdersService` to generate authoritative commerce and financial records.

---

### Pillar D: Unified 360° Activity Timeline
- **Activity Types**: `CALL`, `MEETING`, `NOTE`, `TASK`, `EMAIL`, `MESSAGE`.
- **Commerce Event Blending**: The timeline dynamically aggregates native CRM activities with authoritative commerce order events (`ORDER`) from `OrdersService`.
- **Audit Traceability**: Every activity records `created_by`, timestamps, subject, content, and links to customer accounts, contacts, and opportunities.

---

### Pillar E: Dynamic Segmentation & Non-Destructive Audience Preview
- **Segment Types**:
  - `STATIC`: Fixed list of customer IDs stored in `crm_segment_members`.
  - `DYNAMIC`: Declarative rule tree stored as JSON criteria.
- **Safe Dynamic Rule Evaluator**:
  - Pure domain function (`evaluateDynamicSegmentRules`) evaluates declarative predicates (`equals`, `contains`, `greater_than`, `less_than`, `in`).
  - **Zero Dynamic SQL / Zero `eval`**: Rule evaluation is purely AST/in-memory, preventing SQL injection and arbitrary code execution (Golden Rule 6).
- **Non-Destructive Audience Preview**:
  - Segmentation preview returns matching customer IDs and counts without mutating database state or campaign records.

---

### Pillar F: Explicit Consent & Mandatory Suppression Gate
- **Granular Consent Tracking**:
  - `crm_customer_consents` tracks explicit opt-ins and opt-outs by channel (`EMAIL`, `SMS`, `WHATSAPP`, `PUSH`) and purpose (`MARKETING`, `TRANSACTIONAL`, `NEWSLETTER`).
  - Records timestamp, source (e.g. `WEB_FORM`, `POS_CHECKOUT`), and IP address / audit notes.
- **Global Suppression List**:
  - `crm_suppression_list` maintains unsubscribed and blacklisted email addresses and phone numbers.
- **Pre-Dispatch Suppression Invariant**:
  - Before any campaign or automated message dispatch, the recipient list is evaluated against the pure domain filter (`filterSuppressedRecipients`).
  - Any recipient on the suppression list or lacking active `OPTED_IN` consent for the required channel and purpose is stripped from the dispatch list immediately.
  - Withdrawal of consent strictly overrides segment membership.

---

### Pillar G: Marketing Campaigns & Two-Person Governance
- **Campaign State Machine**:
  $$\text{DRAFT} \longrightarrow \text{REVIEW} \longrightarrow \text{APPROVED} \longrightarrow \text{SCHEDULED} \longrightarrow \text{RUNNING} \longrightarrow \begin{cases} \text{COMPLETED} \\ \text{CANCELLED} \end{cases}$$
- **Two-Person Approval Rule**:
  - Campaigns cannot be transitioned from `REVIEW` to `APPROVED` by the author who created or submitted them:
    $$\text{approver\_id} \ne \text{created\_by}$$
- **Pluggable Communication Adapter**:
  - Modular provider interface (`CommunicationProviderAdapter`) handles external communication (Email, SMS, Push, WhatsApp).
  - Outbox dispatch guarantees fault tolerance, timeout recovery, and retry logging.
- **Idempotent Dispatch**:
  - Dispatches require unique `operation_id`. Retrying a completed or in-progress dispatch with the same `operation_id` returns the existing execution state without sending duplicate messages.
- **Cancellation Guarantee**:
  - Transitioning a campaign to `CANCELLED` immediately halts remaining unsent messages.

---

### Pillar H: Deterministic Marketing Automation Engine
- **Trigger-Action Workflows**:
  - Triggers: `CUSTOMER_CREATED`, `ORDER_COMPLETED`, `STAGE_CHANGED`, `TAG_ADDED`.
  - Action steps: `SEND_MESSAGE`, `ADD_TAG`, `CREATE_TASK`, `WAIT`.
- **Bounded Step Execution**:
  - Workflows are strictly capped at a maximum of 10 steps (`MAX_AUTOMATION_STEPS = 10`).
- **Graph & Loop Validation**:
  - Workflow graph validation (`validateAutomationGraph`) detects cycles and rejects circular or infinite workflow definitions.
- **Version Pinning**:
  - In-flight workflow executions remain pinned to the specific workflow version at execution start (`pinned_version_id`), ensuring modifications to published workflows do not cause inconsistent state transitions (Golden Rule 12).
- **Idempotent Event Execution**:
  - Trigger events record their execution log; repeated event notifications skip execution idempotently.

---

### Pillar I: CRM Analytics & Attribution
- **Funnel & Win/Loss Analytics**:
  - Stage conversion rates calculated strictly in integer basis points:
    $$\text{StageConversionRateBp} = \left\lfloor \frac{\text{StageCount} \times 10000}{\text{TotalPipelineCount}} \right\rfloor$$
  - Win/Loss ratio calculated in basis points over closed opportunities:
    $$\text{WinRateBp} = \left\lfloor \frac{\text{WonCount} \times 10000}{\text{WonCount} + \text{LostCount}} \right\rfloor$$
- **Campaign Revenue Attribution**:
  - Non-destructive reporting engine attributing realized commerce order values to marketing campaigns via `FIRST_TOUCH` or `LAST_TOUCH` models.
  - Attribution reporting produces read-only analytical summaries and **never creates balancing journal entries or mutates General Ledger balances**.

---

### Pillar J: Scoped RBAC Permissions & Role Templates
Phase 9 registers granular permissions and role templates in `packages/domain/src/rbac.ts`:
- `CRM_CUSTOMERS_READ`, `CRM_CUSTOMERS_WRITE`, `CRM_CUSTOMERS_MERGE`
- `CRM_LEADS_READ`, `CRM_LEADS_WRITE`, `CRM_LEADS_CONVERT`
- `CRM_PIPELINE_READ`, `CRM_PIPELINE_WRITE`, `CRM_PIPELINE_ADMIN`
- `CRM_ACTIVITIES_READ`, `CRM_ACTIVITIES_WRITE`
- `CRM_CAMPAIGNS_READ`, `CRM_CAMPAIGNS_WRITE`, `CRM_CAMPAIGNS_APPROVE`, `CRM_CAMPAIGNS_DISPATCH`
- `CRM_AUTOMATION_READ`, `CRM_AUTOMATION_WRITE`
- `CRM_ANALYTICS_READ`

#### Standard Role Templates:
- `SALES_REPRESENTATIVE`: Leads, customers, opportunities, and activities management.
- `SALES_MANAGER`: Full pipeline administration, opportunity management, customer merge authorization.
- `MARKETING_SPECIALIST`: Campaign creation, segments, templates, automation definition.
- `CRM_ADMINISTRATOR`: Super-user role with complete CRM, campaign approval, and dispatch authority.

---

## 3. Database Schema Architecture

Phase 9 defines 18 normalized tables in `packages/database/src/schema/crm.ts` and migration `0009_brave_crm.sql`:

1. `crm_customer_hierarchy`: Account self-referencing and parent-child enterprise trees.
2. `crm_customer_contacts`: Multi-contact directory per customer with primary flag.
3. `crm_customer_merges`: Audit record of customer merge actions and reparenting trace.
4. `crm_leads`: External and internal leads with qualification scoring and status lifecycle.
5. `crm_pipelines`: Configurable sales pipelines per tenant.
6. `crm_pipeline_stages`: Ordered pipeline stages with basis-point probabilities.
7. `crm_opportunities`: Sales opportunities linked to accounts, pipelines, and stages.
8. `crm_activities`: Unified communication and task activity log.
9. `crm_segments`: Dynamic and static customer audience definitions.
10. `crm_segment_members`: Membership associations for static segments.
11. `crm_customer_consents`: Explicit opt-in and opt-out consent ledger by channel and purpose.
12. `crm_suppression_list`: Global unsubscribed and blacklisted addresses and numbers.
13. `crm_campaigns`: Multi-channel marketing campaigns with approval governance.
14. `crm_campaign_messages`: Pluggable message templates and rendered payloads.
15. `crm_campaign_dispatches`: Dispatch run records with idempotency keys and status tracking.
16. `crm_automations`: Trigger-action automated workflow definitions.
17. `crm_automation_steps`: Ordered action steps with parameter configurations.
18. `crm_automation_executions`: Execution audit log with idempotency tracking and step counters.

All tables enforce tenant isolation via foreign key `tenant_id` referencing `tenants(id)` with `onDelete: 'restrict'`.
