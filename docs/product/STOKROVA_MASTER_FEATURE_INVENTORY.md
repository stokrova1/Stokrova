# STOKROVA Master Feature Inventory
## Complete Product Capability Catalog & Architectural Traceability Matrix

**Project:** STOKROVA Enterprise Business Operations Platform  
**Version:** 1.0.0 (Post-Phase 13 Master Reconstruction)  
**Status:** Authoritative Baseline Realization  
**Governance:** Architecture-to-UI Integrity Mandate

---

## 1. Inventory Classification Schema

Every feature in STOKROVA is tracked using canonical identifiers (`FEAT-DOM-XXX`) and classified according to verified implementation evidence across the application stack:

| Status Code | Definition |
| :--- | :--- |
| `IMPLEMENTED_AND_VERIFIED` | Implemented in domain, persistence, API, and connected to operational UI with tests. |
| `PARTIALLY_INTEGRATED` | Backend/API exists; UI partially implemented or missing end-to-end operational connection. |
| `IMPLEMENTED_NOT_ACCESSIBLE`| Domain and API exist and function, but UI route, tab, or navigation is missing or permission-blocked. |
| `API_ONLY` | Domain and API controller exist; frontend view has not yet been wired. |
| `DOMAIN_ONLY` | Domain logic and invariants exist in `@stokrova/domain`; API or UI endpoint pending. |
| `FRONTEND_ONLY` | UI presentation exists, but backed by mock/placeholder data rather than authoritative domain. |
| `MOCK_OR_DEMO` | Uses hard-coded sample fixtures or fake success messages in production paths. |
| `DESIGNED_NOT_IMPLEMENTED` | Specified in architecture/ADRs but missing functional implementation. |
| `DEFERRED_BY_APPROVED_DESIGN` | Deliberately scheduled for subsequent enterprise wave with documented ADR. |

---

## 2. Canonical Master Feature Catalog (By Domain)

### Domain 1: Platform Foundation, Tenancy, RBAC & Work Centers

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-PLT-001` | Multi-Tenant Cryptographic Isolation | Isolates tenant data across all queries and operations (Rule 21) | ADR-020, `MASTER_TENANCY_MODEL.md` | `tenancy.ts` | `TenancyService`, `TenancyController`, `TenantGuard` | `tenants`, `tenant_subscriptions` | Platform Founder, All Roles | Tenant-wide | Unified Login & Shell Header | `IMPLEMENTED_AND_VERIFIED` | None in backend; UI tenant switch must update active shell context | Tenant isolation tests, JWT tenant claim verification |
| `FEAT-PLT-002` | Organization, Company & Branch Topology | Models multi-company holding structures and branch locations | ADR-015, ADR-018, `MASTER_DATA_MODEL.md` | `tenancy.ts`, `branches.ts` | `TenancyController`, `BranchesController` | `companies`, `branches` | Platform Founder, Business Owner, Branch Manager | Tenant / Company | `/settings/organization` | `IMPLEMENTED_NOT_ACCESSIBLE` | Settings UI page missing in admin-web navigation | Company/Branch CRUD API integration test |
| `FEAT-PLT-003` | Scoped Dynamic RBAC Engine | Dynamic capability assignment with 5-tier dimensional scope | ADR-014, `MASTER_PERMISSION_MODEL.md` | `rbac.ts` | `RbacService`, `RbacController`, `RbacGuard` | `roles`, `role_permissions`, `role_assignments` | Business Owner, Platform Founder | Tenant / Branch | `/settings/roles` | `PARTIALLY_INTEGRATED` | Navigation permission codes mismatch standard codes; UI view missing | RBAC scope evaluation unit tests, guard tests |
| `FEAT-PLT-004` | Staff Invitation & Token Activation | Onboards employees via cryptographically signed invitation tokens | `MASTER_PERMISSION_MODEL.md`, Phase 1B | `rbac.ts` | `RbacController.inviteStaff`, `acceptInvitation` | `staff_invitations`, `users` | Business Owner, Branch Manager | Tenant / Branch | `/settings/staff/invitations` | `API_ONLY` | Needs staff invite modal and acceptance landing flow | Token signature verification, acceptance workflow test |
| `FEAT-PLT-005` | Work Centers & Register Stations | Physical station definition (Sales Desk, Packing, POS Till) | ADR-015, `MASTER_WAREHOUSE_MODEL.md` | `work_centers.ts` | `WorkCentersController`, `RegistersController` | `work_centers`, `registers` | Business Owner, Branch Manager | Branch / WorkCenter | `/settings/devices`, `/registers` | `PARTIALLY_INTEGRATED` | Station management view missing from admin console | Work center lease and claim tests |

---

### Domain 2: Deep Inventory Core, Hierarchy, FEFO Lots & Movements

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-INV-001` | Pure Immutable Stock Movement Ledger | Prevents stock balance drift: Stock = sum(movements) | ADR-005, `MASTER_INVENTORY_MODEL.md` | `inventory.ts` | `InventoryService`, `InventoryController` | `inventory_movements`, `stock_ledger` | Business Owner, Inventory Controller, Warehouse Mgr | Branch / Warehouse | `/inventory/ledger` | `IMPLEMENTED_AND_VERIFIED` | In admin-web, currently uses client-side ViewModel memory rather than API client | Ledger debit/credit balance tests, invariant tests |
| `FEAT-INV-002` | 8-Tier Storage Location Hierarchy | Materialized path bin routing (Tenant to Bin) | ADR-018, `MASTER_WAREHOUSE_MODEL.md` | `warehouse.ts` | `WarehouseService`, `WarehouseController` | `storage_locations` | Warehouse Picker, Checker, Inventory Controller | Warehouse / Bin | `/inventory/locations` | `PARTIALLY_INTEGRATED` | Interactive location tree exists in view model; needs live API binding | Materialized path queries, bin capacity limits |
| `FEAT-INV-003` | FEFO Lot & Expiry Intelligence | Prioritizes first-expiring batches, enforces QA holds | Phase 2, `MASTER_INVENTORY_MODEL.md` | `inventory.ts` | `InventoryService.getLots`, `setLotHoldStatus` | `inventory_lots`, `lot_inspections` | Inventory Controller, Quality Officer, Warehouse Mgr | Warehouse / Bin | `/inventory/fefo` | `IMPLEMENTED_AND_VERIFIED` | Frontend explorer exists in `InventoryViewModel`; needs live API integration | Expiry date calculation tests, QA hold blocking tests |
| `FEAT-INV-004` | Discrete Unit Serial Number Tracking | Guarantees single physical unit state across lifecycle | ADR-019, `MASTER_INVENTORY_MODEL.md` | `inventory.ts` | `InventoryService.trackSerial` | `inventory_serials` | Inventory Controller, Cashier, Dispatcher | Warehouse / Register | `/inventory/serials` | `API_ONLY` | Serial number history and status UI view missing | Duplicate serial rejection test, status state machine |
| `FEAT-INV-005` | Real-Time Stock Availability Engine | Computes On-Hand, Reserved, Available, In-Transit | `MASTER_INVENTORY_MODEL.md` | `inventory.ts` | `InventoryController.getAvailability` | `inventory_availability_view` | All Roles | Branch / Warehouse | `/inventory/availability` | `PARTIALLY_INTEGRATED` | Fast lookup widget exists; requires branch/warehouse selector binding | Concurrent reservation locking tests |

---

### Domain 3: Multi-Channel Commerce, Sales, Quotes & Retail POS

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-COM-001` | Omnichannel Sales Order Pipeline | Tracks order lifecycle: Draft -> Dispatched | `MASTER_COMMERCE_MODEL.md` | `orders.ts` | `OrdersService`, `OrdersController` | `sales_orders`, `sales_order_lines` | Business Owner, Sales Clerk, Branch Manager | Company / Branch | `/orders` | `IMPLEMENTED_AND_VERIFIED` | Kanban board exists in `OrdersViewModel`; needs live API sync | State transition validation tests, line total math |
| `FEAT-COM-002` | Retail POS High-Speed Checkout | Sub-second barcode scanning, fast cart updates | ADR-004, `MASTER_COMMERCE_MODEL.md` | `pos.ts` | `PosService`, `PosController` | Local SQLite, `pos_transactions` | Cashier, Solo Trader, Store Mgr | Register / Till | `/pos` | `IMPLEMENTED_AND_VERIFIED` | Native POS in `apps/pos-desktop`; needs link in web navigation shell | Barcode scan buffer burst test (<50ms), cart calculations |
| `FEAT-COM-003` | Register Float & Blind Cash Reconciliation | Prevents till shortages through blind end-of-shift count | ADR-006, `MASTER_FINANCIAL_MODEL.md` | `registers.ts` | `RegistersService.closeSession`, `reconcile` | `register_sessions`, `cash_movements` | Cashier, Branch Manager, Accountant | Register / Till | `/registers` | `IMPLEMENTED_AND_VERIFIED` | Modal in `pos-desktop`; admin web till session monitoring view missing | Blind reconciliation variance calculation tests |
| `FEAT-COM-004` | Split Tender Payment Collection | Accepts Cash, Card, Transfer, Gift Card in 1 cart | ADR-008, `MASTER_COMMERCE_MODEL.md` | `payments.ts` | `PaymentsService.collectSplitTender` | `payment_records`, `payment_allocations` | Cashier, Solo Trader | Register / Till | POS Modal / `/invoices` | `IMPLEMENTED_AND_VERIFIED` | In `pos-desktop`; admin order invoices view needs split breakdown | Exact sum validation tests ($\sum \text{tender} = \text{total}$) |
| `FEAT-COM-005` | B2B Quotations & Pro-Forma Conversion | Creates commercial quotes with credit term conversion | `MASTER_COMMERCE_MODEL.md` | `quotations.ts` | `QuotationsService`, `QuotationsController` | `quotations`, `quotation_lines` | Sales Representative, Sales Manager, Owner | Company / Branch | `/quotes` | `API_ONLY` | Quotations management page missing from admin sidebar | 1-click quote-to-order conversion test |

---

### Domain 4: Procurement, Suppliers & 3-Way Matching

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-PRO-001` | Supplier Directory & Catalogs | Vendor contacts, payment terms, and vendor SKU maps | Phase 4, `MASTER_PROCUREMENT_MODEL.md` | `procurement.ts` | `ProcurementService`, `ProcurementController` | `suppliers`, `supplier_catalogs` | Procurement Officer, Business Owner | Company | `/procurement/suppliers` | `API_ONLY` | Supplier management view missing in admin navigation | Vendor lead time and catalog mapping tests |
| `FEAT-PRO-002` | Purchase Orders (PO) Lifecycle | Issue POs to suppliers, track status and revisions | Phase 4, `MASTER_PROCUREMENT_MODEL.md` | `procurement.ts` | `ProcurementController.createOrder` | `purchase_orders`, `po_lines` | Procurement Officer, Branch Manager | Company / Branch | `/procurement/orders` | `API_ONLY` | PO creation and listing view missing in admin navigation | PO approval threshold validation tests |
| `FEAT-PRO-003` | Goods Receipt (GRN) & 3-Way Matching | Audits PO Qty vs Received Qty vs Supplier Invoice | Phase 4, `MASTER_PROCUREMENT_MODEL.md` | `procurement.ts` | `OrdersViewModel.evaluateThreeWayMatch` | `goods_receipts`, `po_invoices` | Receiving Clerk, Procurement Officer, Accountant | Warehouse | `/procurement/receiving` | `PARTIALLY_INTEGRATED` | 3-way match logic exists in view model; needs full receiving UI | Price and quantity variance detection tests |

---

### Domain 5: Manufacturing, Bills of Materials (BOM) & Work Orders

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-MFG-001` | Multi-Level Bills of Materials (BOM) | Defines raw material formulas, scrap rates, and labor | Phase 5, ADR-018 | `manufacturing.ts` | `ManufacturingService`, `ManufacturingController` | `bills_of_materials`, `bom_items` | Production Manager, Business Owner | Company / Plant | `/manufacturing/boms` | `API_ONLY` | BOM visual tree editor missing from admin navigation | BOM recursive cost calculation tests |
| `FEAT-MFG-002` | Production Work Orders & Scheduling | Releases manufacturing orders, allocates components | Phase 5, ADR-018 | `manufacturing.ts` | `ManufacturingController.releaseOrder` | `manufacturing_orders`, `operations` | Production Manager, Operator | WorkCenter / Plant | `/manufacturing/orders` | `API_ONLY` | Production floor work order view missing | Material reservation and issue tests |
| `FEAT-MFG-003` | Shop Floor Execution & Scrap Recording | Records consumed materials, outputs, and scrap sign-off | Phase 5, ADR-018 | `manufacturing.ts` | `ManufacturingController.recordOutput` | `material_consumptions`, `scrap_logs` | Production Operator, QA Officer | WorkCenter | `/manufacturing/floor` | `API_ONLY` | Operator touch console view missing | Yield percentage calculation and scrap approval tests |

---

### Domain 6: Finance, General Ledger & Double-Entry Truth

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-FIN-001` | Double-Entry General Ledger | Immutable journal entries with debit = credit balance | ADR-006, `MASTER_FINANCIAL_MODEL.md` | `finance.ts` | `FinanceService`, `FinanceController` | `general_journals`, `journal_entries` | Financial Controller, Accountant, Owner | Company | `/finance/ledger` | `API_ONLY` | Journal entry explorer and trial balance missing from admin UI | Double-entry invariant tests ($\sum D = \sum C$) |
| `FEAT-FIN-002` | Chart of Accounts Hierarchy | 5-tier financial accounts (Assets, Liab, Eq, Rev, Exp) | Phase 6, `MASTER_FINANCIAL_MODEL.md` | `finance.ts` | `FinanceController.getAccounts` | `chart_of_accounts` | Financial Controller, Accountant | Company | `/finance/accounts` | `API_ONLY` | Account tree explorer missing in admin navigation | Normal balance and roll-up tests |
| `FEAT-FIN-003` | Fiscal Period Close & Reopen | Locks accounting periods against backdated mutations | Phase 6, `MASTER_FINANCIAL_MODEL.md` | `finance.ts` | `FinanceController.closePeriod` | `fiscal_periods` | Financial Controller | Company | `/finance/periods` | `API_ONLY` | Period management screen missing in admin navigation | Closed period backdating rejection tests |
| `FEAT-FIN-004` | Financial Statements (P&L, Balance Sheet) | Standardized GAAP/IFRS financial reports | Phase 6, Phase 11 | `finance.ts`, `reporting.ts`| `FinanceController.getTrialBalance` | Materialized financial projections | Business Owner, Financial Controller | Company | `/finance/reports` | `API_ONLY` | Statement viewer missing in admin UI | Trial balance equality tests |

---

### Domain 7: Multi-Entity Consolidation, Treasury & Tax

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-CON-001` | Multi-Entity Financial Consolidation | Combines subsidiary books with intercompany eliminations| Phase 7, ADR-018 | `consolidation.ts`| `FinanceController.runConsolidation` | `consolidation_runs`, `eliminations` | Group Controller, Business Owner | Tenant-wide | `/finance/consolidation` | `API_ONLY` | Consolidation execution view missing in admin UI | Intercompany elimination matching tests |
| `FEAT-TRS-001` | Advanced Treasury & Cash Flow Forecast | Corporate bank accounts, intercompany funds transfers | Phase 7, ADR-018 | `treasury.ts` | `FinanceController.getTreasury` | `treasury_accounts`, `cash_forecasts` | Treasury Manager, Financial Controller | Company | `/finance/treasury` | `API_ONLY` | Treasury liquidity dashboard missing | Fund transfer dual-approval tests |
| `FEAT-TAX-001` | Fiscal E-Invoicing & Tax Compliance | VAT/sales tax calculation, digital tax return preparation | Phase 7, ADR-018 | `tax.ts`, `fiscal.ts`| `FinanceController.getTaxReturns` | `tax_registrations`, `tax_returns` | Tax Manager, Accountant | Company / Branch | `/finance/tax` | `API_ONLY` | Tax filing and rate manager missing in admin UI | Tax rate jurisdiction calculation tests |

---

### Domain 8: Advanced Pricing, Promotions, Loyalty & Rebates

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-PRC-001` | Multi-Tier Price Lists & Contract Pricing | Tiered B2B price lists, volume breaks, customer overrides | Phase 8, `MASTER_COMMERCE_MODEL.md` | `pricing-advanced.ts`| `PricingController.resolvePrice` | `price_lists`, `contract_prices` | Pricing Manager, Commercial Controller | Company / Branch | `/pricing/price-lists` | `API_ONLY` | Price list management view missing | Best-price resolution hierarchy tests |
| `FEAT-PRC-002` | Margin Floor Governance & Overrides | Prevents selling below minimum gross margin without sign-off | Phase 8, ADR-016 | `pricing-advanced.ts`| `PricingController.requestOverride` | `margin_floor_rules`, `overrides` | Commercial Controller, Branch Mgr | Branch | `/pricing/overrides` | `API_ONLY` | Override approval inbox missing in admin UI | Margin threshold violation blocking tests |
| `FEAT-PRC-003` | Promotional Campaigns & Coupon Engine | BOGO, percentage off, coupon code validation | Phase 8, `MASTER_COMMERCE_MODEL.md` | `pricing-advanced.ts`| `PricingController.applyPromotion` | `promotional_campaigns`, `coupons` | Pricing Manager, Marketing Specialist | Branch / Channel | `/pricing/promotions` | `API_ONLY` | Promo builder and coupon tracker missing | Coupon usage limit and expiry tests |
| `FEAT-LOY-001` | Customer Loyalty Program & Points Ledger | Earn/redeem points, customer reward tiers | Phase 8, `MASTER_COMMERCE_MODEL.md` | `loyalty-giftcards.ts`| `LoyaltyController.adjustPoints` | `loyalty_accounts`, `points_ledger` | Loyalty Manager, Cashier, Owner | Tenant / Branch | `/loyalty` | `API_ONLY` | Loyalty customer search and adjustment UI missing | Points ledger balance and redemption tests |
| `FEAT-REB-001` | Customer & Vendor Rebate Agreements | Volume-based rebate accruals and claim settlement | Phase 8, `MASTER_FINANCIAL_MODEL.md` | `rebates.ts` | `RebatesController.calculateAccruals` | `rebate_agreements`, `rebate_claims` | Commercial Controller, Financial Controller | Company | `/pricing/rebates` | `API_ONLY` | Rebate agreement configuration view missing | Accrual calculation and claim settlement tests |

---

### Domain 9: CRM, Pipelines & Customer Engagement

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-CRM-001` | 360° Customer Profile & Credit Terms | Comprehensive customer history, outstanding AR balance | Phase 9, `MASTER_COMMERCE_MODEL.md` | `crm.ts`, `customers.ts`| `CrmController.getCustomer`, `CustomersController` | `customers`, `customer_contacts` | Sales Rep, CRM Admin, Cashier | Tenant / Branch | `/crm/customers` | `API_ONLY` | Customer 360 detail page missing in admin UI | Credit balance and limit verification tests |
| `FEAT-CRM-002` | Lead & Opportunity Sales Pipeline | Kanban pipeline stages: Lead -> Qualified -> Won | Phase 9, ADR-016 | `crm.ts` | `CrmController.updateOpportunityStage` | `crm_leads`, `crm_opportunities` | Sales Rep, Sales Manager | Company / Branch | `/crm/pipeline` | `API_ONLY` | Opportunity kanban view missing in admin UI | Stage conversion and probability weighting tests |
| `FEAT-CRM-003` | Audience Segmentation & Campaign Automation | Customer tags, behavioral segments, broadcast dispatch | Phase 9, `MASTER_COMMERCE_MODEL.md` | `crm.ts` | `CrmController.dispatchCampaign` | `customer_segments`, `crm_campaigns`| Marketing Specialist, CRM Admin | Company | `/crm/campaigns` | `API_ONLY` | Campaign management screen missing | Consent opt-out suppression tests |

---

### Domain 10: Advanced Logistics, Fulfillment & Distribution

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-LOG-001` | Wave & Zone Fulfillment Picking | Groups sales orders into optimized warehouse pick waves | Phase 10, `MASTER_WAREHOUSE_MODEL.md` | `logistics.ts` | `LogisticsController.createWave` | `fulfillment_waves`, `pick_tasks` | Warehouse Dispatcher, Picker | Warehouse | `/logistics/picking` | `API_ONLY` | Wave generator view missing in admin UI | Concurrent task claiming lease tests |
| `FEAT-LOG-002` | Containerization & SSCC-18 Pallet Packing | Packs cartons onto pallets, generates GS1-128 barcodes | Phase 10, `MASTER_WAREHOUSE_MODEL.md` | `logistics.ts` | `LogisticsController.packCarton` | `pallet_containers`, `shipping_cartons`| Warehouse Checker, Dispatcher | Warehouse | `/logistics/packing` | `API_ONLY` | Packing bench web interface missing | SSCC-18 check digit generation tests |
| `FEAT-LOG-003` | Carrier Dispatch Runs & Bills of Lading (BOL)| Manifest creation, carrier assignment, BOL documentation | Phase 10, `MASTER_WAREHOUSE_MODEL.md` | `logistics.ts` | `LogisticsController.dispatchShipment` | `shipments`, `bills_of_lading` | Logistics Manager, Dispatcher | Warehouse / Hub | `/logistics/dispatch` | `API_ONLY` | Dispatch manifest review view missing | In-transit stock transition tests |
| `FEAT-LOG-004` | Last-Mile Delivery Runs & Proof of Delivery (POD)| Delivery route stops, signature and photo capture | Phase 10, `MASTER_WAREHOUSE_MODEL.md` | `delivery-fleet.ts` | `LogisticsController.recordPod` | `delivery_runs`, `proof_of_delivery` | Delivery Driver, Logistics Manager | Hub / Route | `/logistics/fleet` | `API_ONLY` | Driver route overview missing in admin UI | Offline POD signature capture tests |

---

### Domain 11: Enterprise Analytics, BI & Audit Forensics

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-ANL-001` | Executive Real-Time KPI Command Center | GMV, Gross Margin, Stockout Risk, Cash Variance | Phase 11, `MASTER_ANALYTICS_MODEL.md` | `analytics.ts` | `DashboardViewModel`, `AnalyticsController` | Aggregated telemetry & ledger streams | Business Owner, Platform Founder | Tenant / Company | `/analytics/dashboards` | `PARTIALLY_INTEGRATED` | Mock card data currently hardcoded in static build; requires live API query | Metric calculation and currency formatting tests |
| `FEAT-ANL-002` | ABC Velocity & Dead Stock Analysis | Ranks items A/B/C by revenue; flags unmoving stock | Phase 11, `MASTER_ANALYTICS_MODEL.md` | `analytics.ts` | `AnalyticsController.getAbcAnalysis` | `product_velocity_projections` | Inventory Controller, Owner, Buyer | Warehouse / Branch | `/analytics/inventory` | `API_ONLY` | ABC inventory analysis table missing from admin UI | Pareto distribution calculation tests |
| `FEAT-ANL-003` | Merkle-Tree Tamper-Resistant Audit Forensics | Cryptographically chained audit logs of all mutations | ADR-011, `AUDIT_ARCHITECTURE.md` | `audit.ts` | `AuditService`, `AuditController` | `audit_events`, `merkle_tree_roots` | Auditor, Security Officer, Owner | Tenant-wide | `/audit/forensics` | `API_ONLY` | Forensic log viewer missing from admin UI | Merkle leaf hash verification tests |
| `FEAT-ANL-004` | Custom Report Builder & Scheduled Exports | Ad-hoc table queries, PDF/CSV/Excel automated reports | Phase 11, `MASTER_DOCUMENT_MODEL.md` | `reporting.ts` | `SearchReportingController.export` | Dynamic projection queries | Reporting Analyst, Business Owner | Tenant / Company | `/analytics/reports` | `API_ONLY` | Report builder UI missing from admin UI | CSV/JSON streaming export tests |

---

### Domain 12: Integration Hub, Connectors & Developer Platform

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-INT-001` | External E-Commerce & ERP Connectors | Connects Shopify, WooCommerce, Xero, QuickBooks | Phase 12, ADR-012 | `integrations.ts` | `IntegrationsService`, `IntegrationsController`| `connector_instances`, `connector_configs` | Integration Admin, Business Owner | Company | `/settings/integrations` | `API_ONLY` | Connector directory & credential modal missing | Connector sync handshake and error mapping tests |
| `FEAT-INT-002` | Webhook Subscriptions & Delivery Replay | Outbound event webhooks with retry queue and replay | Phase 12, ADR-007 | `webhooks.ts` | `IntegrationsController.replayWebhook` | `webhook_subscriptions`, `webhook_logs` | Integration Admin, Operator | Tenant-wide | `/settings/webhooks` | `API_ONLY` | Webhook delivery log and replay trigger missing | HMAC-SHA256 signature verification tests |
| `FEAT-INT-003` | Scoped API Keys & Credential Vault | Rotatable scoped developer tokens with permission masks | Phase 12, `MASTER_SECURITY_MODEL.md` | `integrations.ts` | `IntegrationsController.createApiKey` | `api_keys`, `api_key_scopes` | Integration Admin | Tenant-wide | `/settings/api-keys` | `API_ONLY` | API key generator modal missing | Key hashing and scope enforcement tests |

---

### Domain 13 / Shared: Workflows Studio & Core Controls

| Feature ID | Canonical Name | Business Purpose | Authoritative Source | Domain Owner | Backend / API Implementation | Data Source / Entities | Intended Roles | Scope | Frontend Destination | Current State | Identified Gap | Required Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-WFK-001` | DAG Visual Workflows Studio | Interactive Directed Acyclic Graph process designer | ADR-016, `MASTER_WORKFLOW_MODEL.md` | `workflows.ts` | `WorkflowsStudioViewModel`, `WorkflowsController` | `workflow_definitions`, `workflow_nodes` | Business Owner, Operations Mgr | Company | `/workflows` | `IMPLEMENTED_AND_VERIFIED` | Visual DAG canvas exists in `WorkflowsStudioViewModel`; needs live API save | Cycle detection (Kahn's algorithm) tests |
| `FEAT-WFK-002` | Declarative Approval Engine | Threshold-based sign-offs without tenant custom code | ADR-016, `MASTER_WORKFLOW_MODEL.md` | `rules.ts` | `RulesController.evaluateApprovals` | `approval_requests`, `approval_rules` | Branch Manager, Controller, Owner | Branch / Company | `/approvals` | `API_ONLY` | Pending approval inbox missing in admin navigation | Declarative condition evaluation tests |
