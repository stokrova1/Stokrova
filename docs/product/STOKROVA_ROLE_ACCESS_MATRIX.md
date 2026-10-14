# STOKROVA Role Access Matrix & Persona Workspace Directory
## Complete RBAC Mapping, Post-Login Routing, Data Scopes & Permission Boundaries

**Project:** STOKROVA Enterprise Business Operations Platform  
**Authority:** ADR-014 (Scoped Dynamic RBAC), `MASTER_PERMISSION_MODEL.md`  
**Status:** Canonical Role-to-Workspace Registry

---

## 1. Principles of STOKROVA Role-Based Navigation & Security

1. **Server-Side Enforcement**: Navigation filtering is strictly an ergonomic feature. All API operations and database row accesses are enforced by `AuthGuard`, `TenantGuard`, `RbacGuard`, and PostgreSQL RLS.
2. **5-Tier Scoped Authority**: A role assignment is scoped to `Tenant -> Company -> Branch -> Warehouse -> Register -> Work Center`. A global assignment has empty scope keys.
3. **Progressive Experience**: Roles only see tools and navigation relevant to their operational responsibility.
4. **Zero Fallback Superuser Leakage**: Unassigned or restricted roles must never default to an administrative dashboard.

---

## 2. Master Role Access Matrix

### Tier 1: Platform & Executive Governance

#### 1. PLATFORM_FOUNDER (Global Super-Admin)
- **Role Code:** `PLATFORM_FOUNDER`
- **Persona Context:** SaaS Platform Executive & Infrastructure Engineer.
- **Login Route:** `/login` (Unified Auth)
- **Post-Login Landing:** `/founder` (Platform Founder Portal)
- **Dashboard:** Platform Metrics (Total Tenants, Global GMV, SaaS MRR, Core Microservice Health).
- **Authorized Applications:** `apps/admin-web` (Platform Founder Console).
- **Visible Navigation:** Tenant Organizations, Enroll Business, Subscription Tiers, Global Audit & Health.
- **Primary Actions:** Enroll new business tenant, toggle tenant status (Suspend/Reactivate), set subscription tier, inspect tenant workspace.
- **Restricted Operations:** Direct mutation of tenant business ledgers without explicit audit impersonation.
- **Data Scope:** Platform-wide multi-tenant root.
- **Required Permissions:** Wildcard (`*`, `admin.*`).
- **Feature IDs:** `FEAT-PLT-001`, `FEAT-PLT-002`, `FEAT-ANL-001`.
- **Verification Tests:** `platform-founder-view.spec.ts`.

#### 2. BUSINESS_OWNER (Tenant Executive / Owner)
- **Role Code:** `BUSINESS_OWNER`
- **Persona Context:** Victoria Sterling — Owner of Apex Global Retail & Logistics Ltd.
- **Login Route:** `/login`
- **Post-Login Landing:** `/analytics/dashboards`
- **Dashboard:** Executive Command Center (GMV, Net Revenue, Gross Margin %, Stockout Risk, Cashier Variance Alerts, Active Workflows).
- **Authorized Applications:** `apps/admin-web`, `apps/pos-desktop`, `apps/mobile`.
- **Visible Navigation:** Full 8 master sections: Commerce & Sales, Inventory & Locations, Procurement & Supply, Logistics & Delivery, Manufacturing, Finance & Cash Truth, Analytics & Governance, Platform Administration.
- **Primary Actions:** Company setup, branch creation, catalog management, high-level approvals, general ledger review, financial statements, pricing overrides, staff role assignment.
- **Restricted Operations:** Cannot access or see other tenant data (strictly bounded by `tenant_id`).
- **Data Scope:** Tenant-wide across all companies, branches, and warehouses.
- **Required Permissions:** All tenant capabilities (`StandardPermissions.*`).
- **Feature IDs:** All canonical features (`FEAT-PLT-001` through `FEAT-WFK-002`).
- **Verification Tests:** `phase1-master-acceptance.spec.ts`, `admin-shell.spec.ts`.

#### 3. EXECUTIVE_VIEWER (Corporate Board / Investor)
- **Role Code:** `EXECUTIVE_VIEWER`
- **Persona Context:** Non-executive board member or external auditor requiring read-only business summaries.
- **Login Route:** `/login`
- **Post-Login Landing:** `/analytics/dashboards`
- **Dashboard:** Read-only Executive Operations & Financial Performance Dashboard.
- **Authorized Applications:** `apps/admin-web` (Read-only mode).
- **Visible Navigation:** Executive Dashboard, ABC Inventory Velocity, Financial Statements.
- **Primary Actions:** View KPI summaries, generate scheduled report exports, inspect branch comparisons.
- **Restricted Operations:** No write or state-changing actions (cannot create orders, edit catalog, post journals, or alter stock).
- **Data Scope:** Tenant-wide read-only.
- **Required Permissions:** `reporting.dashboard.view`, `reporting.report.view`, `reporting.report.export`, `analytics.view`.
- **Feature IDs:** `FEAT-ANL-001`, `FEAT-ANL-002`, `FEAT-ANL-004`.
- **Verification Tests:** `analytics.spec.ts`, `admin-shell.spec.ts`.

---

### Tier 2: Retail Branch & Cash Operations

#### 4. BRANCH_MANAGER (Store / Branch General Manager)
- **Role Code:** `BRANCH_MANAGER`
- **Persona Context:** David O'Connor — Branch Manager of London Flagship Store.
- **Login Route:** `/login`
- **Post-Login Landing:** `/analytics/dashboards` (Scoped to Branch)
- **Dashboard:** Branch Operational Dashboard (Branch Sales, Open Register Sessions, Cash Variances, Pending Staff Approvals).
- **Authorized Applications:** `apps/admin-web`, `apps/pos-desktop`.
- **Visible Navigation:** Commerce (POS, Orders, Invoices, Quotes), Inventory (Catalog, Stock Movement, Warehouses), Procurement (Orders, Receiving), Finance (Registers, Till Reconciliation), Settings (Staff Roles).
- **Primary Actions:** Approve high discount/credit override, monitor cashier cash drawers, request stock transfers, review local staff shifts.
- **Restricted Operations:** Cannot edit global tenant chart of accounts, run multi-company consolidation, or mutate DAG workflow architectures.
- **Data Scope:** Scoped to assigned `branch_id`.
- **Required Permissions:** `sales.order.*`, `inventory.view`, `inventory.adjust`, `inventory.transfer`, `register.*`, `registers.manage`, `approvals.manage`, `staff.manage`, `catalog.view`, `catalog.manage`.
- **Feature IDs:** `FEAT-COM-001`, `FEAT-COM-003`, `FEAT-INV-001`, `FEAT-WFK-002`.
- **Verification Tests:** `branches.service.spec.ts`, `commerce-pos.spec.ts`.

#### 5. CASHIER (Retail POS Till Operator)
- **Role Code:** `CASHIER`
- **Persona Context:** Emma Watson — Retail Cashier at London Flagship Register 01.
- **Login Route:** `/login` or Quick PIN Switch on POS Till.
- **Post-Login Landing:** `/pos` (Point of Sale Interface)
- **Dashboard:** Active Till Session Status (Current Float, Expected Cash, Transactions Processed).
- **Authorized Applications:** `apps/pos-desktop`.
- **Visible Navigation:** Single-purpose POS interface: Fast-Tile Grid, Cart Ledger, Till Session / Cash In/Out, Blind Closing Reconciliation.
- **Primary Actions:** Scan product barcodes, apply approved discounts, split tender payment collection, suspend/resume carts, print thermal receipts, blind closing cash count.
- **Restricted Operations:** Cannot view cost prices, wholesale margins, executive dashboards, or general ledgers. Cannot override credit limits without manager sign-off.
- **Data Scope:** Scoped to assigned `register_id` and `branch_id`.
- **Required Permissions:** `pos.checkout`, `pos.sync`, `sales.order.view`, `register.open`, `register.close`, `cash.movement.record`, `payments.collect`, `catalog.view`.
- **Feature IDs:** `FEAT-COM-002`, `FEAT-COM-003`, `FEAT-COM-004`.
- **Verification Tests:** `pos.spec.ts`, `pos-views.spec.ts`.

#### 6. SOLO_TRADER (Micro-Merchant / Single Shopkeeper)
- **Role Code:** `SOLO_TRADER`
- **Persona Context:** Independent shop owner managing counter sales, stock, and cash independently.
- **Login Route:** `/login`
- **Post-Login Landing:** `/pos` (Unified Solo Merchant Terminal)
- **Dashboard:** Daily Sales Summary & Cash Position.
- **Authorized Applications:** `apps/admin-web` (Simplified Solo Mode) or `apps/pos-desktop`.
- **Visible Navigation:** Streamlined 5 tabs: Sell, Products, Stock, Cash Drawer, Daily Report.
- **Primary Actions:** Counter checkout, instant product add, stock count adjustment, cash in/out, daily report export.
- **Restricted Operations:** No warehouse hierarchy or DAG workflows displayed by default (progressive complexity Rule 25).
- **Data Scope:** Tenant-wide for single-branch business.
- **Required Permissions:** `pos.checkout`, `sales.order.create`, `inventory.adjust`, `catalog.manage`, `payments.collect`, `reporting.report.view`.
- **Feature IDs:** `FEAT-COM-002`, `FEAT-INV-001`, `FEAT-COM-003`.
- **Verification Tests:** `commerce-pos.spec.ts`.

---

### Tier 3: Warehouse & Supply Chain Logistics

#### 7. WAREHOUSE_PICKER (Fulfillment & Pick Operator)
- **Role Code:** `WAREHOUSE_PICKER`
- **Persona Context:** Samuel Adebayo — Warehouse Picker at North Distribution Center.
- **Login Route:** `/login` (Mobile Scanner)
- **Post-Login Landing:** `/logistics/picking` (Active Pick Wave Queue)
- **Dashboard:** Pick Task Queue (Assigned orders, routing path by Aisle/Rack/Bin, items remaining).
- **Authorized Applications:** `apps/mobile` (Handheld Scanner App).
- **Visible Navigation:** Pick Tasks, Barcode Scanner Viewfinder, Bin Route Guide.
- **Primary Actions:** Claim pick task lease, scan storage bin barcode, scan item barcode/lot, confirm picked quantity.
- **Restricted Operations:** Cannot modify sales order lines, change product pricing, or view customer financial balances.
- **Data Scope:** Scoped to assigned `warehouse_id`.
- **Required Permissions:** `inventory.view`, `inventory.pick`, `warehouses.view`, `catalog.view`.
- **Feature IDs:** `FEAT-LOG-001`, `FEAT-INV-002`, `FEAT-INV-003`.
- **Verification Tests:** `mobile-views.spec.ts`, `warehouse-ops.spec.ts`.

#### 8. WAREHOUSE_CHECKER (Packing & Verification Inspector)
- **Role Code:** `WAREHOUSE_CHECKER`
- **Persona Context:** Packing bench inspector verifying goods against orders before carton sealing.
- **Login Route:** `/login`
- **Post-Login Landing:** `/logistics/packing` (Packing Station View)
- **Dashboard:** Outbound Order Verification Queue.
- **Authorized Applications:** `apps/admin-web` (Packing Station View).
- **Visible Navigation:** Order Verification, Carton Packing, SSCC Pallet Assembly.
- **Primary Actions:** High-speed barcode scan verification against sales order, serial number verification, generate carton packing slip, generate SSCC-18 pallet label.
- **Restricted Operations:** Cannot issue credit refunds or post accounting entries.
- **Data Scope:** Scoped to assigned `warehouse_id` / Packing Work Center.
- **Required Permissions:** `inventory.view`, `inventory.verify`, `warehouses.view`, `catalog.view`.
- **Feature IDs:** `FEAT-LOG-002`, `FEAT-INV-004`.
- **Verification Tests:** `logistics.spec.ts`.

#### 9. WAREHOUSE_DISPATCHER (Outbound Shipping Clerk)
- **Role Code:** `WAREHOUSE_DISPATCHER`
- **Persona Context:** Dock coordinator dispatching shipments and handing freight to carriers.
- **Login Route:** `/login`
- **Post-Login Landing:** `/logistics/dispatch`
- **Dashboard:** Carrier Dispatch Dock (Pending manifests, scheduled truck arrivals, loaded pallets).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Logistics (Fulfillment, Containerization, Carrier Manifests, Dispatch Runs).
- **Primary Actions:** Assign carrier, verify Bill of Lading (BOL), transition shipment status to DISPATCHED, generate shipping manifests.
- **Restricted Operations:** Cannot alter customer invoices or supplier prices.
- **Data Scope:** Scoped to assigned `warehouse_id`.
- **Required Permissions:** `logistics.fulfillment.*`, `logistics.shipment.*`, `inventory.view`, `warehouses.view`.
- **Feature IDs:** `FEAT-LOG-003`, `FEAT-LOG-002`.
- **Verification Tests:** `logistics.spec.ts`.

#### 10. DELIVERY_DRIVER (Fleet & Last-Mile Courier)
- **Role Code:** `DELIVERY_DRIVER`
- **Persona Context:** Driver on multi-stop delivery run across retail branches or customer destinations.
- **Login Route:** `/login` (Mobile)
- **Post-Login Landing:** `/logistics/fleet` (Driver Route Manifest)
- **Dashboard:** Today's Delivery Run (Sequential stops, customer address, package count, status).
- **Authorized Applications:** `apps/mobile` (Driver Delivery App).
- **Visible Navigation:** Route Manifest, Stop Navigation, Proof of Delivery (POD) Scanner.
- **Primary Actions:** Start delivery run, update stop status, capture recipient signature, take delivery confirmation photo, record failed delivery exceptions.
- **Restricted Operations:** Cannot adjust general inventory or create sales orders.
- **Data Scope:** Scoped to assigned `delivery_run_id`.
- **Required Permissions:** `logistics.delivery_run.view`, `logistics.delivery.execute`, `logistics.pod.*`, `logistics.shipment.view`.
- **Feature IDs:** `FEAT-LOG-004`.
- **Verification Tests:** `delivery-fleet.spec.ts`.

#### 11. LOGISTICS_MANAGER (Supply Chain & Fleet Director)
- **Role Code:** `LOGISTICS_MANAGER`
- **Persona Context:** Director managing freight carriers, warehouse docks, and distribution networks.
- **Login Route:** `/login`
- **Post-Login Landing:** `/logistics/dispatch`
- **Dashboard:** Fleet & Fulfillment Performance (On-time dispatch %, in-transit inventory, carrier SLA tracking).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Logistics (Picking, Dispatch, Fleet, Carriers, Reverse Logistics, Freight Policies).
- **Primary Actions:** Create fulfillment waves, negotiate carrier rates, approve reverse logistics RMAs, optimize delivery routes.
- **Restricted Operations:** Cannot close financial accounting periods.
- **Data Scope:** Tenant-wide or Company-wide logistics operations.
- **Required Permissions:** `logistics.*`, `inventory.view`, `warehouses.view`.
- **Feature IDs:** `FEAT-LOG-001`, `FEAT-LOG-002`, `FEAT-LOG-003`, `FEAT-LOG-004`.
- **Verification Tests:** `logistics.spec.ts`.

#### 12. INVENTORY_CONTROLLER (Stock Auditor & Warehouse Quality Lead)
- **Role Code:** `INVENTORY_CONTROLLER`
- **Persona Context:** Stock accuracy auditor conducting cycle counts, investigating variances, and tracking FEFO lots.
- **Login Route:** `/login`
- **Post-Login Landing:** `/inventory/ledger`
- **Dashboard:** Stock Accuracy & Inventory Health (Velocity, variance alerts, expiring lots, quarantine holds).
- **Authorized Applications:** `apps/admin-web`, `apps/mobile`.
- **Visible Navigation:** Inventory (Catalog, Movement Ledger, Locations & Bins, FEFO Explorer, Cycle Counts, Stock Adjustments).
- **Primary Actions:** Execute blind cycle count reconciliation, post stock adjustments with typed reason codes, place lots on QA hold, manage inter-facility stock transfers.
- **Restricted Operations:** Cannot delete ledger history (Rule 11); cannot modify customer credit terms.
- **Data Scope:** Company-wide across all warehouses.
- **Required Permissions:** `inventory.*`, `warehouses.*`, `purchases.receive`, `catalog.view`, `catalog.manage`.
- **Feature IDs:** `FEAT-INV-001`, `FEAT-INV-002`, `FEAT-INV-003`, `FEAT-INV-004`, `FEAT-INV-005`.
- **Verification Tests:** `inventory.spec.ts`, `inventory-view.ts`.

---

### Tier 4: Procurement & Manufacturing

#### 13. PROCUREMENT_OFFICER (Purchasing Agent)
- **Role Code:** `PROCUREMENT_OFFICER`
- **Persona Context:** Buyer managing supplier contracts, purchase requisitions, and purchase orders.
- **Login Route:** `/login`
- **Post-Login Landing:** `/procurement/orders`
- **Dashboard:** Procurement & Supplier Pipeline (Open POs, pending deliveries, vendor lead times).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Procurement & Supply (Suppliers & Catalogs, Purchase Orders, Goods Receipt & 3-Way Match).
- **Primary Actions:** Issue RFQs, generate Purchase Orders, inspect 3-way match variances (PO vs GRN vs Invoice), approve supplier receipts.
- **Restricted Operations:** Cannot approve own POs exceeding company authorization thresholds without manager sign-off.
- **Data Scope:** Company-wide procurement.
- **Required Permissions:** `procurement.*`, `suppliers.*`, `purchases.*`.
- **Feature IDs:** `FEAT-PRO-001`, `FEAT-PRO-002`, `FEAT-PRO-003`.
- **Verification Tests:** `procurement.spec.ts`.

#### 14. PRODUCTION_MANAGER (Plant Supervisor)
- **Role Code:** `PRODUCTION_MANAGER`
- **Persona Context:** Factory floor supervisor scheduling manufacturing orders and tracking material yields.
- **Login Route:** `/login`
- **Post-Login Landing:** `/manufacturing/orders`
- **Dashboard:** Manufacturing Command Center (Active work orders, BOM cost efficiency, machine utilization, scrap %).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Manufacturing (Bills of Materials, Work Orders, Operations Scheduling, Scrap Approvals).
- **Primary Actions:** Create and version BOM formulas, release production orders, reserve raw materials, approve scrap adjustments.
- **Restricted Operations:** Cannot issue sales discounts or post financial bank reconciliations.
- **Data Scope:** Assigned Manufacturing Facility / Work Centers.
- **Required Permissions:** `manufacturing.*`, `work_centers.manage`, `inventory.view`, `catalog.view`.
- **Feature IDs:** `FEAT-MFG-001`, `FEAT-MFG-002`, `FEAT-MFG-003`.
- **Verification Tests:** `manufacturing.spec.ts`.

#### 15. PRODUCTION_OPERATOR (Shop Floor Worker)
- **Role Code:** `PRODUCTION_OPERATOR`
- **Persona Context:** Machine operator executing assembly and recording component consumption.
- **Login Route:** `/login`
- **Post-Login Landing:** `/manufacturing/floor`
- **Dashboard:** Station Work Order Queue (Active job, step instructions, component list).
- **Authorized Applications:** `apps/admin-web` (Shop Floor Touch Mode).
- **Visible Navigation:** Station Queue, Material Consumption, Output Recording.
- **Primary Actions:** Start operation step, scan raw materials consumed, record finished goods quantity, record scrap defect reason.
- **Restricted Operations:** Cannot create BOMs, approve scrap, or modify inventory outside assigned work center.
- **Data Scope:** Assigned Work Center station.
- **Required Permissions:** `manufacturing.order.view`, `manufacturing.material.consume`, `manufacturing.operation.*`, `manufacturing.output.record`, `manufacturing.scrap.record`.
- **Feature IDs:** `FEAT-MFG-003`.
- **Verification Tests:** `manufacturing.spec.ts`.

---

### Tier 5: Finance, Accounting, Tax & Treasury

#### 16. FINANCIAL_CONTROLLER (Chief Accounting Officer)
- **Role Code:** `FINANCIAL_CONTROLLER`
- **Persona Context:** Chief Accountant governing general ledger truth, period closings, and fiscal integrity.
- **Login Route:** `/login`
- **Post-Login Landing:** `/finance/ledger`
- **Dashboard:** Financial Controller Console (Trial Balance balance check, AR/AP aging, period status, unposted batches).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Finance & Cash Truth (General Ledger, Chart of Accounts, Fiscal Periods, Journal Posting Rules, Tax, Financial Statements).
- **Primary Actions:** Post double-entry journal entries, close and reopen fiscal periods, approve reconciliations, generate P&L and Balance Sheet reports.
- **Restricted Operations:** Cannot delete financial journal records (Rule 11: never silently delete financial history).
- **Data Scope:** Company-wide across all books.
- **Required Permissions:** `finance.*`, `accounting.*`, `audit.view`.
- **Feature IDs:** `FEAT-FIN-001`, `FEAT-FIN-002`, `FEAT-FIN-003`, `FEAT-FIN-004`.
- **Verification Tests:** `finance.spec.ts`.

#### 17. GENERAL_ACCOUNTANT (Staff Accountant)
- **Role Code:** `GENERAL_ACCOUNTANT` (or `ACCOUNTANT`)
- **Persona Context:** Staff accountant handling invoices, receipts, journal entries, and reconciliation.
- **Login Route:** `/login`
- **Post-Login Landing:** `/finance/ledger`
- **Dashboard:** Daily Accounting Tasks (Pending invoices, unreconciled till sessions, draft journals).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Finance (General Ledger, Chart of Accounts, Bank Reconciliation, Invoices, Till Sessions).
- **Primary Actions:** Draft journal entries, match bank transactions, audit cashier variances, create customer invoices.
- **Restricted Operations:** Cannot close fiscal periods or modify posting rule architectures.
- **Data Scope:** Assigned Company.
- **Required Permissions:** `finance.view`, `finance.journal.post`, `accounting.journals.*`, `accounting.reports.view`, `accounting.reconciliation.view`.
- **Feature IDs:** `FEAT-FIN-001`, `FEAT-COM-003`, `FEAT-FIN-004`.
- **Verification Tests:** `finance.spec.ts`.

#### 18. GROUP_CONTROLLER (Multi-Entity Holding Controller)
- **Role Code:** `GROUP_CONTROLLER`
- **Persona Context:** Corporate holding controller managing multi-company consolidations and intercompany accounts.
- **Login Route:** `/login`
- **Post-Login Landing:** `/finance/consolidation`
- **Dashboard:** Group Financial Consolidation Portal (Subsidiary reporting status, elimination match %, currency exposure).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Finance (Consolidation, Intercompany Transfers, Eliminations, Group Reports).
- **Primary Actions:** Run consolidation engine, match intercompany transactions, calculate elimination entries, finalize group statements.
- **Restricted Operations:** Cannot bypass subsidiary local branch controls.
- **Data Scope:** Tenant-wide across all subsidiary companies.
- **Required Permissions:** `consolidation.*`, `intercompany.*`, `finance.view`, `accounting.reports.view`.
- **Feature IDs:** `FEAT-CON-001`.
- **Verification Tests:** `finance_phase7.spec.ts`.

#### 19. TREASURY_MANAGER (Corporate Treasury & Cash Manager)
- **Role Code:** `TREASURY_MANAGER`
- **Persona Context:** Liquidity officer managing corporate bank accounts and fund disbursements.
- **Login Route:** `/login`
- **Post-Login Landing:** `/finance/treasury`
- **Dashboard:** Treasury & Liquidity Command Center (Cash position, upcoming payables, 30-day cash forecast).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Finance (Treasury, Bank Feeds, Intercompany Transfers, Cash Forecasting).
- **Primary Actions:** Initiate and approve treasury transfers, sync bank transaction feeds, generate cash runway forecasts.
- **Restricted Operations:** Cannot unilaterally execute payments without dual authorization.
- **Data Scope:** Tenant-wide bank accounts.
- **Required Permissions:** `treasury.*`, `finance.view`.
- **Feature IDs:** `FEAT-TRS-001`.
- **Verification Tests:** `finance_phase7.spec.ts`.

#### 20. TAX_MANAGER (Tax Compliance Officer)
- **Role Code:** `TAX_MANAGER`
- **Persona Context:** Tax specialist managing VAT/sales tax rules, digital e-invoicing, and filings.
- **Login Route:** `/login`
- **Post-Login Landing:** `/finance/tax`
- **Dashboard:** Tax & Fiscal Compliance Overview (Tax liability by jurisdiction, upcoming filing deadlines, e-invoice status).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Finance (Tax Rates, Tax Registrations, Fiscal E-Invoicing, Tax Filing Returns).
- **Primary Actions:** Configure jurisdiction tax rules, prepare tax returns, approve digital e-invoices, submit filing exports.
- **Restricted Operations:** Cannot alter completed sales receipts.
- **Data Scope:** Company-wide across active tax jurisdictions.
- **Required Permissions:** `tax.*`, `finance.view`.
- **Feature IDs:** `FEAT-TAX-001`.
- **Verification Tests:** `fiscal.spec.ts`, `finance_phase7.spec.ts`.

---

### Tier 6: Commercial, Pricing, CRM & Marketing

#### 21. PRICING_MANAGER (Commercial Pricing & Promotions Manager)
- **Role Code:** `PRICING_MANAGER`
- **Persona Context:** Commercial manager setting up retail/wholesale price lists, seasonal campaigns, and coupons.
- **Login Route:** `/login`
- **Post-Login Landing:** `/pricing/price-lists`
- **Dashboard:** Pricing & Promotions Governance (Active price lists, campaign conversion rates, margin floors).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Pricing & Promotions (Price Lists, Contract Pricing, Promotions & Coupons, Rebate Agreements).
- **Primary Actions:** Create multi-tier price lists, schedule promotional campaigns, generate coupon codes, set margin floors.
- **Restricted Operations:** Cannot override margin floor violations without commercial controller sign-off.
- **Data Scope:** Company-wide commercial pricing.
- **Required Permissions:** `pricing.contracts.manage`, `promotions.*`, `catalog.view`.
- **Feature IDs:** `FEAT-PRC-001`, `FEAT-PRC-003`.
- **Verification Tests:** `pricing_advanced.spec.ts`.

#### 22. COMMERCIAL_CONTROLLER (Margin Governance & Rebates Director)
- **Role Code:** `COMMERCIAL_CONTROLLER`
- **Persona Context:** Financial commercial controller protecting profit margins and governing rebate contracts.
- **Login Route:** `/login`
- **Post-Login Landing:** `/pricing/overrides`
- **Dashboard:** Commercial Margin Guard (Pending margin override requests, rebate accruals, vendor claim settlements).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Pricing (Margin Overrides Inbox, Rebates Agreements, Accrual Calculations, Settlements).
- **Primary Actions:** Approve or reject price overrides below margin floor, calculate rebate accruals, approve and settle rebate claims.
- **Restricted Operations:** Cannot alter inventory stock records directly.
- **Data Scope:** Company-wide commercial accounts.
- **Required Permissions:** `pricing.margin.approve`, `pricing.margin.override`, `rebates.*`, `finance.view`.
- **Feature IDs:** `FEAT-PRC-002`, `FEAT-REB-001`.
- **Verification Tests:** `pricing_advanced.spec.ts`.

#### 23. LOYALTY_PROGRAM_MANAGER (Customer Retention Specialist)
- **Role Code:** `LOYALTY_PROGRAM_MANAGER`
- **Persona Context:** Marketer managing customer reward tiers and loyalty point economics.
- **Login Route:** `/login`
- **Post-Login Landing:** `/loyalty`
- **Dashboard:** Customer Loyalty Analytics (Active reward members, points issued vs redeemed, tier distribution).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Commercial (Loyalty Program, Reward Tiers, Point Rules, Customer Point Ledger).
- **Primary Actions:** Define point earn/burn rules, adjust customer loyalty points with reason code, configure reward tiers.
- **Restricted Operations:** Cannot alter core customer credit balances.
- **Data Scope:** Tenant-wide loyalty program.
- **Required Permissions:** `loyalty.program.manage`, `loyalty.points.adjust`, `customers.view`.
- **Feature IDs:** `FEAT-LOY-001`.
- **Verification Tests:** `loyalty-giftcards.spec.ts`.

#### 24. SALES_REPRESENTATIVE (B2B Account Executive)
- **Role Code:** `SALES_REPRESENTATIVE`
- **Persona Context:** Account rep managing B2B customer relationships, leads, and quotations.
- **Login Route:** `/login`
- **Post-Login Landing:** `/crm/pipeline`
- **Dashboard:** Sales Rep Pipeline (My leads, active deals, quotes expiring, month-to-date quota).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Commerce (Sales Orders, Quotations), CRM (Customers, Leads, Opportunities, Activities).
- **Primary Actions:** Create quotations, convert quotes to sales orders, update opportunity stages, record call logs and meeting notes.
- **Restricted Operations:** Cannot override customer credit limits without manager approval.
- **Data Scope:** Scoped to assigned customer accounts or Branch.
- **Required Permissions:** `customers.view`, `crm.lead.*`, `crm.opportunity.*`, `crm.activity.*`, `sales.order.create`, `sales.order.view`.
- **Feature IDs:** `FEAT-CRM-001`, `FEAT-CRM-002`, `FEAT-COM-005`.
- **Verification Tests:** `crm.spec.ts`.

#### 25. SALES_MANAGER (Commercial Sales Director)
- **Role Code:** `SALES_MANAGER`
- **Persona Context:** Sales director managing sales quotas, pipelines, and customer allocations.
- **Login Route:** `/login`
- **Post-Login Landing:** `/crm/pipeline`
- **Dashboard:** Sales Team Command Center (Team pipeline velocity, win/loss ratios, revenue forecasts).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Commerce (Orders, Quotes, Invoices), CRM (Customers, Pipeline, Opportunities, Team Activities, Analytics).
- **Primary Actions:** Reassign leads, approve quotation discounts, merge duplicate customer profiles, monitor rep performance.
- **Restricted Operations:** Cannot post direct financial general ledger adjustments.
- **Data Scope:** Company-wide commercial sales.
- **Required Permissions:** `crm.*`, `customers.view`, `sales.order.*`.
- **Feature IDs:** `FEAT-CRM-001`, `FEAT-CRM-002`, `FEAT-COM-001`.
- **Verification Tests:** `crm.spec.ts`.

#### 26. MARKETING_SPECIALIST (Campaign & Growth Marketer)
- **Role Code:** `MARKETING_SPECIALIST`
- **Persona Context:** Growth marketer creating customer audience segments and promotional broadcasts.
- **Login Route:** `/login`
- **Post-Login Landing:** `/crm/campaigns`
- **Dashboard:** Marketing Campaign Performance (Broadcast reach, click-through %, opt-out rates, revenue attributed).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** CRM (Audience Segments, Campaigns, Omnichannel Consent, Automation).
- **Primary Actions:** Build behavioral customer segments, draft marketing campaigns, verify customer consent opt-ins.
- **Restricted Operations:** Cannot dispatch campaigns without manager approval or override customer opt-out suppression.
- **Data Scope:** Company-wide marketing audience.
- **Required Permissions:** `crm.segment.*`, `crm.campaign.view`, `crm.campaign.manage`, `crm.consent.*`, `crm.automation.manage`.
- **Feature IDs:** `FEAT-CRM-003`.
- **Verification Tests:** `crm.spec.ts`.

#### 27. CRM_ADMINISTRATOR (CRM & Engagement Lead)
- **Role Code:** `CRM_ADMINISTRATOR`
- **Persona Context:** Administrator managing customer data models, campaign approvals, and communication channels.
- **Login Route:** `/login`
- **Post-Login Landing:** `/crm/customers`
- **Dashboard:** Customer Data Integrity & Engagement Console.
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Full CRM suite (Customers, Leads, Opportunities, Segments, Campaigns, Automation, Consent).
- **Primary Actions:** Approve campaign dispatch, execute customer profile merges, configure automation workflows, audit GDPR consent logs.
- **Restricted Operations:** Cannot alter general ledger accounts.
- **Data Scope:** Tenant-wide CRM data.
- **Required Permissions:** `crm.*`, `customers.view`, `audit.view`.
- **Feature IDs:** `FEAT-CRM-001`, `FEAT-CRM-002`, `FEAT-CRM-003`.
- **Verification Tests:** `crm.spec.ts`.

---

### Tier 7: Analytics, Audit, Integrations & IT Operations

#### 28. REPORTING_ANALYST (BI & Data Analyst)
- **Role Code:** `REPORTING_ANALYST`
- **Persona Context:** Business analyst creating operational dashboards, KPIs, and scheduled exports.
- **Login Route:** `/login`
- **Post-Login Landing:** `/analytics/dashboards`
- **Dashboard:** Analytics & Business Intelligence Studio.
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Analytics & Governance (Executive Dashboard, ABC Velocity, Custom Reports Builder, Scheduled Exports).
- **Primary Actions:** Configure dashboard widgets, create custom report schemas, schedule automated CSV/PDF exports.
- **Restricted Operations:** Read-only access to operational transactional data (cannot post or mutate records).
- **Data Scope:** Tenant-wide read-only.
- **Required Permissions:** `reporting.*`, `analytics.*`.
- **Feature IDs:** `FEAT-ANL-001`, `FEAT-ANL-002`, `FEAT-ANL-004`.
- **Verification Tests:** `reporting.spec.ts`.

#### 29. AUDITOR / FINANCIAL_AUDITOR (Independent Compliance Auditor)
- **Role Code:** `AUDITOR` / `FINANCIAL_AUDITOR`
- **Persona Context:** Internal or external auditor reviewing compliance, SOX 404 controls, and Merkle audit trails.
- **Login Route:** `/login`
- **Post-Login Landing:** `/audit/forensics`
- **Dashboard:** Compliance & Forensic Audit Center (Tamper verification status, suspicious access alerts, void transactions).
- **Authorized Applications:** `apps/admin-web` (Strict Read-Only).
- **Visible Navigation:** Analytics & Governance (Audit Forensics & Merkle Ledger, General Ledger Journals, Void History, Compliance).
- **Primary Actions:** Inspect immutable Merkle audit trails, verify cryptographic hash chains, export audit evidence packages.
- **Restricted Operations:** Strictly forbidden from performing any state-changing operations or mutations.
- **Data Scope:** Tenant-wide read-only audit logs.
- **Required Permissions:** `audit.view`, `accounting.journals.view`, `accounting.periods.view`, `sales.order.view`, `inventory.view`.
- **Feature IDs:** `FEAT-ANL-003`, `FEAT-FIN-001`.
- **Verification Tests:** `audit.spec.ts`.

#### 30. INTEGRATION_ADMIN (IT Systems & Connector Administrator)
- **Role Code:** `INTEGRATION_ADMIN`
- **Persona Context:** IT engineer configuring third-party integrations, webhook subscriptions, and developer API keys.
- **Login Route:** `/login`
- **Post-Login Landing:** `/settings/integrations`
- **Dashboard:** Integration Hub & Connector Health (Active connectors, sync latency, failed webhooks, API key usage).
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Platform Administration (External Connectors, Webhooks & Replay, API Keys & Scopes, Sync Logs).
- **Primary Actions:** Connect external systems (Shopify, QuickBooks), rotate connector credentials, generate scoped API keys, replay failed webhook events.
- **Restricted Operations:** Cannot modify financial ledger entries.
- **Data Scope:** Tenant-wide integration infrastructure.
- **Required Permissions:** `integration.*`, `audit.view`.
- **Feature IDs:** `FEAT-INT-001`, `FEAT-INT-002`, `FEAT-INT-003`.
- **Verification Tests:** `integration_hub.spec.ts`, `webhooks.spec.ts`.

#### 31. INTEGRATION_OPERATOR (IT Operations Specialist)
- **Role Code:** `INTEGRATION_OPERATOR`
- **Persona Context:** Operational technician monitoring sync jobs and resolving mapping discrepancies.
- **Login Route:** `/login`
- **Post-Login Landing:** `/settings/integrations`
- **Dashboard:** Sync Queue & Webhook Delivery Monitor.
- **Authorized Applications:** `apps/admin-web`.
- **Visible Navigation:** Integrations (Sync Telemetry, Webhook Delivery Logs, Reconciliation Queue).
- **Primary Actions:** Trigger on-demand sync runs, replay failed webhooks, inspect entity reconciliation mismatches.
- **Restricted Operations:** Cannot generate root API keys or rotate production credentials.
- **Data Scope:** Tenant-wide integration telemetry.
- **Required Permissions:** `integration.view`, `integration.sync.execute`, `integration.sync.retry`, `integration.webhook.manage`, `integration.reconciliation.*`.
- **Feature IDs:** `FEAT-INT-001`, `FEAT-INT-002`.
- **Verification Tests:** `integration_hub.spec.ts`.

#### 32. API_INTEGRATION_CLIENT (Machine-to-Machine Service Account)
- **Role Code:** `API_INTEGRATION_CLIENT`
- **Persona Context:** Scoped machine-to-machine service agent calling external REST endpoints.
- **Login Route:** Scoped API Key / OAuth Bearer Token.
- **Post-Login Landing:** Headless API `/v1/*`
- **Dashboard:** None (Headless).
- **Authorized Applications:** `apps/api`.
- **Visible Navigation:** N/A (Headless).
- **Primary Actions:** Sync inventory balances, push external orders, receive fulfillment webhooks.
- **Restricted Operations:** Scoped strictly to permitted API endpoints.
- **Data Scope:** Defined by API key scope targets.
- **Required Permissions:** `integration.view`, `integration.sync.execute`.
- **Feature IDs:** `FEAT-INT-001`, `FEAT-INT-003`.
- **Verification Tests:** `integrations.spec.ts`.
