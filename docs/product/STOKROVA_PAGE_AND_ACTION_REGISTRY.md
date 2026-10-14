# STOKROVA Master Page, Tab & Action Registry
## Complete Frontend Destination Inventory, Control Catalog & Action Specification

**Project:** STOKROVA Enterprise Business Operations Platform  
**Authority:** Section 5 & 14 Master UI Mandate  
**Status:** Authoritative Page & Action Registry

---

## 1. Registry Architecture & UI Action Principles

Every page in STOKROVA must strictly satisfy:
1. **Zero Dead Links / Hash Targets**: Every clickable link, button, and tab must lead to an authorized, functional view or execute a real domain command.
2. **Authoritative Binding**: All tables and forms bind to real data sources via internal/public API endpoints (`apps/api/src/*`), never static hard-coded mock arrays in production.
3. **Deterministic State Progression**: Forms feature loading spinners, disabled submission during in-flight mutations, clear error recovery messages, and automatic data refresh on success.
4. **Zero Fallback Admin Access**: Direct URL access to unauthorized pages renders a standard `403 Forbidden` state with clear tenant/scope recovery context.

---

## 2. Master Page & Tab Directory

### Section 1: Executive & Platform Dashboards

#### `PAGE-DSH-001`: Executive Operations Command Center
- **Title:** Executive Operations Command Center
- **Purpose:** High-impact real-time KPI overview (GMV, Gross Margin, Stockout Risk, Cashier Variance Alerts, Active DAG Workflows).
- **Route:** `/analytics/dashboards`
- **Parent Layout:** `AdminWebShell` (Main Viewport)
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `EXECUTIVE_VIEWER`, `BRANCH_MANAGER` (Scoped)
- **Navigation Location:** Analytics & Governance -> Executive Dashboard (`nav_dashboards`)
- **Related Features:** `FEAT-ANL-001`, `FEAT-COM-001`, `FEAT-INV-001`, `FEAT-COM-003`
- **Required Permission & Scope:** `reporting.dashboard.view` or `analytics.view` (Tenant or Branch scope)
- **Data Source:** `GET /v1/analytics/dashboards/executive-summary`
- **Tabs & Subviews:** 
  1. *Operations Overview* (KPI cards + Revenue Stream Graph)
  2. *Branch Comparison* (Multi-branch margin & GMV breakdown)
  3. *Operational Alerts* (Live critical alert feed)
- **Main Actions:** 
  - `Time Range Selector` (Today, 7D, 30D, Quarter, YTD)
  - `Refresh Metrics` (Re-queries backend projection)
  - `Export PDF Summary` (Downloads executive briefing)
- **Row & Drill-down Actions:** 
  - Click on *Cashier Variance* -> Opens `/registers` filtered by variance
  - Click on *Stockout Risk* -> Opens `/inventory/fefo` filtered by near-expiry
  - Click on *GMV / Orders* -> Opens `/orders` pipeline view
- **Loading State:** Skeleton KPI card placeholders with pulse animation.
- **Empty State:** Honest zero-data state: "No transactions recorded in selected period."
- **Error Handling:** Banner notification: "Telemetry service temporarily degraded — retrying."
- **Permission-Denied Behavior:** Redirects to assigned role landing page (e.g., Cashier to `/pos`).
- **Responsive Behavior:** 4-column KPI grid wraps to single column on mobile (<768px).
- **Acceptance Tests:** `admin-views.spec.ts`, `dashboard-view.ts`.

#### `PAGE-FND-001`: Platform Founder Ecosystem Portal
- **Title:** Platform Founder Console
- **Purpose:** SaaS tenant management, tenant onboarding, subscription tiers, and global system health.
- **Route:** `/founder`
- **Parent Layout:** `AdminWebShell` (Platform Founder Mode)
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PLATFORM_FOUNDER`
- **Navigation Location:** Platform Super-Admin -> Tenant Organizations
- **Related Features:** `FEAT-PLT-001`, `FEAT-PLT-002`, `FEAT-ANL-001`
- **Required Permission & Scope:** Wildcard (`*`)
- **Data Source:** `GET /v1/tenants`, `GET /v1/infrastructure/health`
- **Tabs & Subviews:**
  1. *Enrolled Tenants Directory* (Searchable table of all companies)
  2. *SaaS Subscriptions & MRR* (Tier breakdown: Starter, Commerce Pro, Enterprise)
  3. *Global Sync & Health Telemetry* (Database clusters, monotonic sync workers)
- **Main Actions:** 
  - `+ Enroll New Business` -> Opens Enroll Business Modal
  - `Switch to Business Mode` -> Contextually inspects selected tenant workspace
- **Row Actions:** 
  - `Suspend / Reactivate` -> Toggles tenant active killswitch (`PATCH /v1/tenants/:id/status`)
  - `Inspect Tenant Workspace` -> Switches context and launches tenant executive view
- **Modals:**
  - `Enroll Business Modal` (`new-company-name`, `slug`, `owner-name`, `owner-email`, `currency`, `subscription-tier`)
- **Loading State:** Shimmer table rows with spinner.
- **Empty State:** "No tenants provisioned. Click Enroll to create the first business organization."
- **Error Handling:** Alert: "Unable to reach platform management cluster."
- **Permission-Denied Behavior:** 403 Forbidden: "Platform Founder privileges required."
- **Acceptance Tests:** `platform-founder-view.spec.ts`.

---

### Section 2: Commerce & Sales Operations

#### `PAGE-COM-001`: Omnichannel Sales Orders Pipeline
- **Title:** Sales Orders & Fulfillment Pipeline
- **Purpose:** Visual progression and management of customer sales orders from Draft through Delivery.
- **Route:** `/orders`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `BRANCH_MANAGER`, `SALES_CLERK`, `SALES_MANAGER`
- **Navigation Location:** Commerce & Sales -> Sales Orders (`nav_orders`)
- **Related Features:** `FEAT-COM-001`, `FEAT-COM-004`
- **Required Permission & Scope:** `sales.order.view` (Branch / Company scope)
- **Data Source:** `GET /v1/orders`
- **Tabs & Subviews:**
  1. *Kanban Pipeline View* (Draft -> Approved -> Picked -> Packed -> Invoiced -> Paid -> Dispatched)
  2. *Table Ledger View* (Searchable, sortable list with customer, date, total, status)
  3. *Returns & Credit Notes* (RMA return vouchers and restock notes)
- **Main Actions:** 
  - `+ Create Sales Order` -> Opens order creation wizard
  - `Filter by Branch / Date / Customer`
- **Row & Card Actions:** 
  - `Advance Status` -> Validates status transition (e.g. DRAFT to APPROVED)
  - `View Order Details` -> Opens drawer with line items, tax, payments
  - `Print Invoice / Packing Slip` -> Generates formatted PDF
- **Loading State:** Pulsing column card frames.
- **Empty State:** "No orders in this stage."
- **Error Handling:** Toast alert with error reason (e.g. "Order cannot advance to PAID without invoice").
- **Acceptance Tests:** `orders-view.ts`, `orders.spec.ts`.

#### `PAGE-POS-001`: Retail Point of Sale (POS) Station
- **Title:** High-Speed Retail POS Checkout
- **Purpose:** Sub-second barcode scanning, fast touch-tile cart assembly, split tender payment collection.
- **Route:** `/pos`
- **Parent Layout:** `PosShell`
- **Target Application:** `apps/pos-desktop`, `apps/admin-web` (Web POS mode)
- **Intended Roles:** `CASHIER`, `SOLO_TRADER`, `BRANCH_MANAGER`
- **Navigation Location:** Commerce & Sales -> Point of Sale (POS) (`nav_pos`)
- **Related Features:** `FEAT-COM-002`, `FEAT-COM-003`, `FEAT-COM-004`
- **Required Permission & Scope:** `pos.checkout` (Assigned Register scope)
- **Data Source:** Local SQLite (Desktop) / `GET /v1/pos/products`, `POST /v1/pos/checkout`
- **Tabs & Modals:**
  1. *Fast-Tile Touch Matrix* (Categories: All, Beverage, Food, Retail, Electronics)
  2. *Cart Ledger Panel* (Inline qty, line discount, tax, total)
  3. *Held Tickets Modal* (Suspends active cart with customer note; recalls held cart)
  4. *Split Tender Modal* (Cash, Card, Bank Transfer, Gift Card multi-payment)
  5. *Till Session Reconciliation Modal* (Blind closing cash count, variance calculation)
- **Main Actions:** 
  - `Barcode Scanner Listener` (Keystroke buffer < 50ms)
  - `Hold Ticket` (Key: F4)
  - `Pay / Split Tender` (Key: F12)
  - `Open / Close Till Session`
- **Loading State:** Immediate responsive local UI; spinner on remote sync.
- **Error Handling:** Acoustic error beep + red banner: "Barcode not recognized" or "Cart balance unpaid."
- **Acceptance Tests:** `pos-shell.spec.ts`, `pos-views.spec.ts`, `commerce-pos.spec.ts`.

#### `PAGE-QTE-001`: B2B Quotations & Commercial Proposals
- **Title:** Quotations & Pro-Forma Invoices
- **Purpose:** Draft quotes for corporate buyers, price list tier assignment, credit term setting.
- **Route:** `/quotes`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `SALES_REPRESENTATIVE`, `SALES_MANAGER`, `BUSINESS_OWNER`
- **Navigation Location:** Commerce & Sales -> Quotations & B2B (`nav_quotes`)
- **Related Features:** `FEAT-COM-005`, `FEAT-PRC-001`
- **Required Permission & Scope:** `sales.quotation.view`
- **Data Source:** `GET /v1/quotations`
- **Main Actions:** 
  - `+ New Quotation`
  - `Convert to Sales Order` (1-click conversion after buyer acceptance)
  - `Send Quote PDF via Email`
- **Loading State:** Table skeleton.
- **Empty State:** "No active quotations. Create a quote for a wholesale buyer."
- **Acceptance Tests:** `b2b.spec.ts`, `quotations.ts`.

---

### Section 3: Inventory & Storage Topology

#### `PAGE-INV-001`: Master Product Catalog & Attribute Matrix
- **Title:** Products & Variant Matrix Explorer
- **Purpose:** Multi-attribute SKU cataloging (Size, Color), universal barcode aliases, and price tier visualization.
- **Route:** `/catalog/products`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `INVENTORY_CONTROLLER`, `BRANCH_MANAGER`, `SALES_CLERK`
- **Navigation Location:** Inventory & Locations -> Products & Variants (`nav_catalog`)
- **Related Features:** `FEAT-INV-001`, `FEAT-PRC-001`
- **Required Permission & Scope:** `catalog.view`
- **Data Source:** `GET /v1/catalog/products`
- **Tabs & Subviews:**
  1. *Product Variants Table* (SKU, Name, Barcode, Category, Retail Price, Wholesale Price, Stock)
  2. *2D Matrix Grid* (Attribute dimension table for apparel/shoes: Size vs Color)
  3. *Barcode Alias Manager* (Secondary barcodes, manufacturer UPCs)
- **Main Actions:** 
  - `+ New Product / Variant`
  - `Live Search` (Instant query across SKU, barcode, attribute, name)
  - `Bulk Price Update`
- **Loading State:** Table shimmer effect.
- **Empty State:** "No products cataloged. Add your first inventory item."
- **Acceptance Tests:** `catalog-view.ts`, `admin-views.spec.ts`.

#### `PAGE-INV-002`: Authoritative Stock Movement Ledger
- **Title:** Stock Movement Ledger & Invariant Audit
- **Purpose:** Immutable audit trail of every stock change: Stock = sum(movements) (Rule 10 & 20).
- **Route:** `/inventory/ledger`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `INVENTORY_CONTROLLER`, `FINANCIAL_CONTROLLER`, `AUDITOR`
- **Navigation Location:** Inventory & Locations -> Stock Movement Ledger (`nav_ledger`)
- **Related Features:** `FEAT-INV-001`
- **Required Permission & Scope:** `inventory.view`
- **Data Source:** `GET /v1/inventory/movements`
- **Tabs & Subviews:**
  1. *Movement Transactions* (Timestamp, SKU, From Bin, To Bin, Quantity, Operator, Reason Code)
  2. *Materialized Stock Balances* (Current balance grouped by warehouse and bin)
  3. *Audit Trail Hash Verification* (Merkle verification of posted ledger chunks)
- **Main Actions:** 
  - `Filter by SKU / Warehouse / Date / Operator`
  - `Post Manual Stock Adjustment` (Requires typed reason code: Damaged, Discrepancy, Sample)
  - `Export Movement CSV`
- **Loading State:** Shimmering table rows.
- **Empty State:** "No stock movements recorded."
- **Acceptance Tests:** `inventory.spec.ts`, `admin-views.spec.ts`.

#### `PAGE-INV-003`: 8-Tier Storage Location Hierarchy & Bins
- **Title:** Warehouses & 8-Tier Bin Topography
- **Purpose:** Physical warehouse layout visualization (Facility -> Zone -> Aisle -> Rack -> Shelf -> Bin).
- **Route:** `/inventory/locations`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `INVENTORY_CONTROLLER`, `WAREHOUSE_PICKER`, `LOGISTICS_MANAGER`
- **Navigation Location:** Inventory & Locations -> Warehouses & 8-Tier Bins (`nav_locations`)
- **Related Features:** `FEAT-INV-002`
- **Required Permission & Scope:** `warehouses.view`
- **Data Source:** `GET /v1/warehouse/locations`
- **Tabs & Subviews:**
  1. *Hierarchical Tree Explorer* (Expandable tree with occupancy ratios and capacity units)
  2. *Bin Barcode Label Generator* (Prints location barcodes for shelf tagging)
  3. *Quarantine & Holding Zones* (Bins reserved for QA inspection)
- **Main Actions:** 
  - `+ Add Storage Node` (Specify Tier, Code, Name, Parent Node, Max Units)
  - `Toggle Bin Quarantine Status`
- **Acceptance Tests:** `inventory-view.ts`, `warehouse.spec.ts`.

#### `PAGE-INV-004`: FEFO Lots, Batches & Expiry Intelligence
- **Title:** FEFO Lot Expiration & Quarantine Explorer
- **Purpose:** Tracks expiring pharmaceutical/food lots, enforces First Expired First Out picking order.
- **Route:** `/inventory/fefo`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `INVENTORY_CONTROLLER`, `WAREHOUSE_PICKER`, `BUSINESS_OWNER`
- **Navigation Location:** Inventory & Locations -> Stock Availability Engine (`nav_availability`)
- **Related Features:** `FEAT-INV-003`
- **Required Permission & Scope:** `inventory.view`
- **Data Source:** `GET /v1/inventory/lots`
- **Columns:** Lot Number, Product Name, SKU, Bin, Quantity, Expiry Date, Days Remaining, QA Hold Status, Pallet SSCC-18 License Plate.
- **Row Actions:** 
  - `Set QA Hold` (ACTIVE -> QA_HOLD -> REJECTED)
  - `Transfer to Quarantine Bin`
- **Acceptance Tests:** `inventory-view.ts`, `admin-views.spec.ts`.

---

### Section 4: Procurement, Supply & 3-Way Matching

#### `PAGE-PRO-001`: Suppliers & Vendor Catalogs
- **Title:** Suppliers & Vendor Management
- **Purpose:** Vendor directory, contact details, payment terms, and lead time metrics.
- **Route:** `/procurement/suppliers`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PROCUREMENT_OFFICER`, `BUSINESS_OWNER`
- **Navigation Location:** Procurement & Supply -> Suppliers & Catalogs (`nav_suppliers`)
- **Related Features:** `FEAT-PRO-001`
- **Required Permission & Scope:** `suppliers.view`
- **Data Source:** `GET /v1/procurement/suppliers`
- **Main Actions:** `+ Add Supplier`, `View Catalog Mapping`, `Export Vendor Report`.
- **Acceptance Tests:** `procurement.spec.ts`.

#### `PAGE-PRO-002`: Purchase Orders (PO) Management
- **Title:** Purchase Orders & Requisitions
- **Purpose:** Issue purchase orders to suppliers, manage approval limits, track inbound shipping.
- **Route:** `/procurement/orders`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PROCUREMENT_OFFICER`, `BRANCH_MANAGER`, `BUSINESS_OWNER`
- **Navigation Location:** Procurement & Supply -> Purchase Orders (PO) (`nav_po`)
- **Related Features:** `FEAT-PRO-002`
- **Required Permission & Scope:** `procurement.order.view`
- **Data Source:** `GET /v1/procurement/orders`
- **Main Actions:** `+ Create Purchase Order`, `Submit for Approval`, `Generate PO PDF`.
- **Acceptance Tests:** `procurement.spec.ts`.

#### `PAGE-PRO-003`: Goods Receipt (GRN) & 3-Way Matching
- **Title:** Goods Receipt & 3-Way Match Audit
- **Purpose:** Audits PO Ordered Qty vs Warehouse Received Qty vs Vendor Invoiced Qty (Discrepancy guard).
- **Route:** `/procurement/receiving`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PROCUREMENT_OFFICER`, `INVENTORY_CONTROLLER`, `FINANCIAL_CONTROLLER`
- **Navigation Location:** Procurement & Supply -> Goods Receipt & 3-Way Match (`nav_receiving`)
- **Related Features:** `FEAT-PRO-003`
- **Required Permission & Scope:** `procurement.receipt.create` or `purchases.receive`
- **Data Source:** `GET /v1/procurement/receipts`
- **Subviews:** Match Matrix (Matched, Quantity Discrepancy, Price Discrepancy).
- **Main Actions:** `Record Inbound Goods Receipt`, `Resolve Match Variance`, `Approve for Invoice Payment`.
- **Acceptance Tests:** `orders-view.ts`, `procurement.spec.ts`.

---

### Section 5: Manufacturing & Production

#### `PAGE-MFG-001`: Bills of Materials (BOM) & Recipes
- **Title:** Bills of Materials (BOM) & Costing
- **Purpose:** Multi-level assembly formulas, component quantities, scrap tolerances, and labor overhead.
- **Route:** `/manufacturing/boms`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PRODUCTION_MANAGER`, `BUSINESS_OWNER`
- **Navigation Location:** Manufacturing -> Bills of Materials (BOM) (`nav_bom`)
- **Related Features:** `FEAT-MFG-001`
- **Required Permission & Scope:** `manufacturing.bom.view`
- **Data Source:** `GET /v1/manufacturing/boms`
- **Main Actions:** `+ Create BOM`, `Version BOM`, `Simulate Production Cost`.
- **Acceptance Tests:** `manufacturing.spec.ts`.

#### `PAGE-MFG-002`: Production Work Orders & Scheduling
- **Title:** Manufacturing Work Orders & Execution
- **Purpose:** Releases work orders, reserves component stock, tracks floor operation steps.
- **Route:** `/manufacturing/orders`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `PRODUCTION_MANAGER`, `PRODUCTION_OPERATOR`
- **Navigation Location:** Manufacturing -> Production Work Orders (`nav_mo`)
- **Related Features:** `FEAT-MFG-002`, `FEAT-MFG-003`
- **Required Permission & Scope:** `manufacturing.order.view`
- **Data Source:** `GET /v1/manufacturing/orders`
- **Main Actions:** `Release Order to Floor`, `Record Component Consumption`, `Sign-off Yield & Scrap`.
- **Acceptance Tests:** `manufacturing.spec.ts`.

---

### Section 6: Logistics, Fulfillment & Delivery

#### `PAGE-LOG-001`: Wave & Zone Picking Engine
- **Title:** Wave & Zone Picking Queue
- **Purpose:** Groups orders into warehouse pick waves, guides pickers via shortest-path bin routes.
- **Route:** `/logistics/picking`
- **Parent Layout:** `AdminWebShell` / Mobile Shell
- **Target Application:** `apps/admin-web`, `apps/mobile`
- **Intended Roles:** `WAREHOUSE_PICKER`, `LOGISTICS_MANAGER`
- **Navigation Location:** Logistics & Delivery -> Wave & Zone Picking (`nav_picking`)
- **Related Features:** `FEAT-LOG-001`
- **Required Permission & Scope:** `inventory.pick`
- **Data Source:** `GET /v1/logistics/waves`
- **Main Actions:** `Generate Wave`, `Claim Pick Task`, `Confirm Picked Items via Barcode Scan`.
- **Acceptance Tests:** `logistics.spec.ts`, `mobile-views.spec.ts`.

#### `PAGE-LOG-002`: Containerization & Bills of Lading (BOL)
- **Title:** Containerization & Carrier Dispatch
- **Purpose:** Carton packing, SSCC-18 pallet license plates, Bill of Lading generation, carrier handoff.
- **Route:** `/logistics/dispatch`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `WAREHOUSE_DISPATCHER`, `LOGISTICS_MANAGER`
- **Navigation Location:** Logistics & Delivery -> Containerization & BOL (`nav_dispatch`)
- **Related Features:** `FEAT-LOG-002`, `FEAT-LOG-003`
- **Required Permission & Scope:** `logistics.shipment.dispatch`
- **Data Source:** `GET /v1/logistics/shipments`
- **Main Actions:** `Pack Pallet`, `Generate BOL Document`, `Confirm Truck Departure`.
- **Acceptance Tests:** `logistics.spec.ts`.

#### `PAGE-LOG-003`: Fleet & Proof of Delivery (POD)
- **Title:** Fleet Tracking & Proof of Delivery
- **Purpose:** Driver delivery manifests, stop status, signature capture, and delivery verification.
- **Route:** `/logistics/fleet`
- **Parent Layout:** `AdminWebShell` / Mobile Shell
- **Target Application:** `apps/admin-web`, `apps/mobile`
- **Intended Roles:** `DELIVERY_DRIVER`, `LOGISTICS_MANAGER`
- **Navigation Location:** Logistics & Delivery -> Fleet & Proof of Delivery (`nav_fleet`)
- **Related Features:** `FEAT-LOG-004`
- **Required Permission & Scope:** `logistics.delivery_run.view`
- **Data Source:** `GET /v1/delivery/runs`
- **Main Actions:** `Start Delivery Run`, `Capture Recipient Signature & Photo`, `Record Delivery Exception`.
- **Acceptance Tests:** `delivery-fleet.spec.ts`.

---

### Section 7: Finance, General Ledger & Cash Truth

#### `PAGE-FIN-001`: Cash Registers & Till Sessions
- **Title:** Till Sessions & Cash Count Reconciliation
- **Purpose:** Monitors physical register sessions, opening floats, cash-in/out, and blind closing audits.
- **Route:** `/registers`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`, `apps/pos-desktop`
- **Intended Roles:** `BRANCH_MANAGER`, `ACCOUNTANT`, `BUSINESS_OWNER`
- **Navigation Location:** Finance & Cash Truth -> Till Sessions & Cash Count (`nav_registers`)
- **Related Features:** `FEAT-COM-003`
- **Required Permission & Scope:** `registers.manage`
- **Data Source:** `GET /v1/registers/sessions`
- **Main Actions:** `Inspect Active Sessions`, `Review Cashier Shortage / Overage`, `Approve Session Closing`.
- **Acceptance Tests:** `registers.service.spec.ts`, `registers.ts`.

#### `PAGE-FIN-002`: Double-Entry General Ledger
- **Title:** Double-Entry General Ledger & Journals
- **Purpose:** Authoritative financial truth: immutable journal entries with balanced debits and credits.
- **Route:** `/finance/ledger`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `FINANCIAL_CONTROLLER`, `GENERAL_ACCOUNTANT`, `AUDITOR`, `BUSINESS_OWNER`
- **Navigation Location:** Finance & Cash Truth -> Double-Entry General Ledger (`nav_gl`)
- **Related Features:** `FEAT-FIN-001`, `FEAT-FIN-002`
- **Required Permission & Scope:** `accounting.journals.view`
- **Data Source:** `GET /v1/finance/journals`
- **Main Actions:** `Post Manual Journal Entry`, `Reverse Journal Entry`, `View Trial Balance`.
- **Acceptance Tests:** `finance.spec.ts`.

#### `PAGE-FIN-003`: Fiscal E-Invoicing & Tax Compliance
- **Title:** Fiscal E-Invoicing & Taxes
- **Purpose:** Jurisdiction tax rates, VAT returns, digital e-invoice submission records.
- **Route:** `/finance/tax`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `TAX_MANAGER`, `FINANCIAL_CONTROLLER`
- **Navigation Location:** Finance & Cash Truth -> Fiscal E-Invoicing & Taxes (`nav_tax`)
- **Related Features:** `FEAT-TAX-001`
- **Required Permission & Scope:** `tax.manage`
- **Data Source:** `GET /v1/finance/tax`
- **Main Actions:** `Generate Tax Return`, `Submit Fiscal E-Invoice`, `Configure Tax Rates`.
- **Acceptance Tests:** `fiscal.spec.ts`.

---

### Section 8: Analytics, Forensics & Platform Administration

#### `PAGE-ANL-002`: ABC Velocity & Dead Stock Intelligence
- **Title:** ABC Velocity & Dead Stock Analysis
- **Purpose:** Categorizes inventory into A/B/C classes based on revenue; alerts on unmoving capital.
- **Route:** `/analytics/inventory`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `INVENTORY_CONTROLLER`, `BUSINESS_OWNER`, `REPORTING_ANALYST`
- **Navigation Location:** Analytics & Governance -> ABC Velocity & Dead Stock (`nav_abc`)
- **Related Features:** `FEAT-ANL-002`
- **Required Permission & Scope:** `analytics.view`
- **Data Source:** `GET /v1/analytics/velocity`
- **Acceptance Tests:** `analytics.spec.ts`.

#### `PAGE-AUD-001`: Tamper-Resistant Audit Forensics
- **Title:** Audit Forensics & Merkle Ledger
- **Purpose:** Append-only cryptographic ledger of all sensitive state transitions and actor actions.
- **Route:** `/audit/forensics`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `AUDITOR`, `BUSINESS_OWNER`
- **Navigation Location:** Analytics & Governance -> Audit Forensics & Merkle Ledger (`nav_audit`)
- **Related Features:** `FEAT-ANL-003`
- **Required Permission & Scope:** `audit.view`
- **Data Source:** `GET /v1/audit/events`
- **Main Actions:** `Verify Cryptographic Merkle Root`, `Export Audit Trail Evidence`.
- **Acceptance Tests:** `audit.spec.ts`.

#### `PAGE-SET-001`: Tenant Organizations & Companies
- **Title:** Tenant & Organization Setup
- **Purpose:** Configure legal business name, brand logo, currency, subsidiaries, and branches.
- **Route:** `/settings/organization`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `PLATFORM_FOUNDER`
- **Navigation Location:** Platform Administration -> Tenant & Companies (`nav_org`)
- **Related Features:** `FEAT-PLT-002`
- **Required Permission & Scope:** `branches.manage` or `tenancy.manage`
- **Data Source:** `GET /v1/tenants/current`
- **Main Actions:** `Update Brand Colors & Logo`, `+ Add Subsidiary Company`, `+ Add Branch Location`.
- **Acceptance Tests:** `tenancy.service.spec.ts`.

#### `PAGE-SET-002`: Scoped RBAC & Staff Roles
- **Title:** Scoped Dynamic RBAC & Staff Management
- **Purpose:** Define custom roles, assign staff to branch/register scopes, issue staff onboarding invitations.
- **Route:** `/settings/roles`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`, `BRANCH_MANAGER`
- **Navigation Location:** Platform Administration -> Scoped RBAC & Staff Roles (`nav_rbac`)
- **Related Features:** `FEAT-PLT-003`, `FEAT-PLT-004`
- **Required Permission & Scope:** `roles.manage`, `staff.manage`
- **Data Source:** `GET /v1/rbac/roles`, `GET /v1/rbac/invitations`
- **Main Actions:** `+ Invite Staff Member`, `+ Create Custom Role`, `Revoke Role Assignment`.
- **Modals:** `Invite Staff Modal` (Email, Full Name, Role Template, Scope Target, Delivery Channel).
- **Acceptance Tests:** `rbac.spec.ts`, `rbac.service.spec.ts`.

#### `PAGE-SET-003`: Hardware Peripherals & ESC/POS
- **Title:** Hardware Peripherals & Devices
- **Purpose:** Thermal receipt printers, ESC/POS drivers, barcode scanners, digital weighing scales.
- **Route:** `/settings/devices`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`, `apps/pos-desktop`
- **Intended Roles:** `BUSINESS_OWNER`, `BRANCH_MANAGER`
- **Navigation Location:** Platform Administration -> Hardware Peripherals & ESC/POS (`nav_devices`)
- **Related Features:** `FEAT-PLT-005`
- **Required Permission & Scope:** `devices.manage`
- **Data Source:** `GET /v1/devices`
- **Main Actions:** `Test Print Receipt`, `Kick Cash Drawer`, `Calibrate Weight Scale`.
- **Acceptance Tests:** `hardware.spec.ts`.

#### `PAGE-SET-004`: Integration Hub & Webhooks
- **Title:** Webhooks & External Connectors
- **Purpose:** Connect external channels (Shopify, QuickBooks), manage webhooks, rotate API keys.
- **Route:** `/settings/integrations`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `INTEGRATION_ADMIN`, `BUSINESS_OWNER`
- **Navigation Location:** Platform Administration -> Webhooks & EDI Exchange (`nav_integrations`)
- **Related Features:** `FEAT-INT-001`, `FEAT-INT-002`, `FEAT-INT-003`
- **Required Permission & Scope:** `integration.manage`
- **Data Source:** `GET /v1/integrations/connectors`
- **Main Actions:** `+ Add Connector`, `Generate Scoped API Key`, `Replay Failed Webhook Event`.
- **Acceptance Tests:** `integration_hub.spec.ts`, `webhooks.spec.ts`.

#### `PAGE-WFK-001`: Visual DAG Workflows Studio
- **Title:** DAG Workflows Studio & Orchestration
- **Purpose:** Directed Acyclic Graph process builder with strict cycle prevention (Kahn's algorithm).
- **Route:** `/workflows`
- **Parent Layout:** `AdminWebShell`
- **Target Application:** `apps/admin-web`
- **Intended Roles:** `BUSINESS_OWNER`
- **Navigation Location:** Platform Administration -> DAG Workflows
- **Related Features:** `FEAT-WFK-001`
- **Required Permission & Scope:** `workflows.manage`
- **Data Source:** `GET /v1/workflows`
- **Main Actions:** `+ Add Node`, `Connect Nodes (Edge)`, `Test Cycle Detection`, `Deploy Workflow Version`.
- **Acceptance Tests:** `workflows-view.ts`, `workflows.spec.ts`.
