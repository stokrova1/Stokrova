# STOKROVA Master Capability Map & Domain Blueprint

## 1. Executive Product Vision

**STOKROVA** is a **World-Class Inventory, Commerce & Business Operations Platform**.

It enables any business to manage the complete physical-goods lifecycle—from procurement and supplier relationships through receiving, multi-echelon warehousing, inventory control, sales, multi-channel fulfillment, payments, transfers, returns, financial accounting, and operational intelligence.

```text
               SINGLE TRADER (Zero-friction unified screen)
                     ↓
               SMALL SHOP / RETAIL STORE
                     ↓
               WHOLESALE BUSINESS
                     ↓
               DISTRIBUTOR / LOGISTICS HUB
                     ↓
               MULTI-BRANCH COMPANY
                     ↓
               LARGE ENTERPRISE (Multi-company, multi-warehouse)
```

The central architectural axiom:
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

---

## 2. The 14 Foundational Questions

A world-class inventory platform does not simply store a mutable integer balance. Every entity and transaction answers:

1. **WHAT** does the business own? *(Products, variants, kits, lots, serials, assets)*
2. **WHERE** is it physically located? *(Branch, warehouse, zone, aisle, rack, shelf, bin)*
3. **HOW MUCH** exists? *(On-hand, available, reserved, allocated, damaged, quarantined, in-transit, safety stock)*
4. **WHO** controls and is accountable for it? *(Owner, branch manager, custodian, work center)*
5. **WHERE** did it come from? *(Supplier, purchase order, manufacture batch, return, transfer)*
6. **WHERE** is it going? *(Customer order, branch transfer, repair, scrap, delivery route)*
7. **WHO** ordered it? *(Customer, sales representative, purchasing agent, system replenishment rule)*
8. **WHO** sold it? *(Cashier, B2B account rep, e-commerce channel)*
9. **WHO** received it? *(Receiving clerk, inspection officer)*
10. **WHO** moved it? *(Warehouse picker, forklift operator, delivery driver)*
11. **WHO** approved it? *(Manager, credit controller, automated declarative policy)*
12. **HOW** was it paid for? *(Cash, bank transfer, card, credit terms, split tender)*
13. **WHEN** did every action happen? *(Client event timestamp, server received timestamp, immutable ledger timestamp)*
14. **WHY** did the balance or state change? *(13+ typed movement reasons, audit event trails)*

---

## 3. The 12 Platform Capability Domains

```text
                                 STOKROVA BUSINESS PLATFORM
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
   COMMERCE                              INVENTORY                              OPERATIONS
  ├── Sales & Orders                    ├── Products & Variants                ├── Graph Workflow Engine
  ├── POS Checkout                      ├── 8-Tier Locations                   ├── Work Centers & Stations
  ├── Customers & Groups                ├── Stock State Engine                 ├── Task Queues & Leases
  ├── Dynamic Pricing                   ├── Lots, Batches & Serials            ├── Approvals & Declarative Rules
  └── Wholesale & Quotes                └── Traceability & Movements           └── Multi-Role Scoped RBAC
      │                                      │                                      │
      ├──────────────────────────────────────┼──────────────────────────────────────┤
      │                                      │                                      │
  PROCUREMENT                             FINANCE                               LOGISTICS
  ├── Suppliers & RFQs                  ├── Registers & Till Sessions          ├── Picking & Packing
  ├── Purchase Orders                   ├── Blind Cash Reconciliation          ├── Verification & Dispatch
  ├── Receiving & Inspection            ├── Invoices & Payments                ├── Inter-Branch Transfers
  ├── Landed Costs                      ├── Expenses & Payables                ├── In-Transit Tracking
  └── Supplier Performance              └── Double-Entry General Ledger        └── Proof of Delivery
      │                                      │                                      │
      ├──────────────────────────────────────┼──────────────────────────────────────┤
      │                                      │                                      │
 MANUFACTURING                           ANALYTICS                               PLATFORM
  ├── Bills of Materials (BOM)          ├── Real-Time Dashboards               ├── Isolated Multi-Tenancy
  ├── Production & Work Orders          ├── ADS Forecasting                    ├── Offline-First SQLite Sync
  ├── Material Consumption              ├── Replenishment Intelligence         ├── Append-Only Audit Trail
  ├── Assembly & Disassembly            ├── Dead Stock & Expiry Alerts         ├── Hardware & Device Ecosystem
  └── Production Costing                └── Financial & Margin Analysis        └── Integrations & Webhooks
```

---

### Domain 1: Commerce & Sales

1. **Multi-Channel Commerce**:
   - Unified engine powering High-Speed POS, B2B Wholesale, Direct Sales, and Remote Mobile Orders.
   - Quotation $\rightarrow$ Sales Order $\rightarrow$ Invoice $\rightarrow$ Payment $\rightarrow$ Receipt $\rightarrow$ Delivery.
2. **Customer Management**:
   - Retail walk-in vs Registered B2B customer accounts.
   - Credit limits, payment terms (e.g. Net 30), outstanding balance tracking, account statements.
3. **Advanced Pricing Engine**:
   - Base Price, Retail Price, Wholesale Price, Distributor Price.
   - Customer-group pricing, branch-specific pricing overrides.
   - Volume/Tiered pricing (Buy 10 $\rightarrow$ ₦X, Buy 100 $\rightarrow$ ₦Y).
   - Time-limited promotions, bundle discounts, manual authorized discounts with margin limits.
4. **Returns & Credit Notes**:
   - Linked returns (referencing original receipt/invoice) vs unlinked manager-approved returns.
   - Restocking to inventory or routing to damaged/quarantine stock.
   - Credit notes, cash refunds, or ledger account credits.

---

### Domain 2: Deep Inventory Core

1. **Product Hierarchy**:
   - Product Concept $\rightarrow$ Sellable Variants $\rightarrow$ Unique SKUs $\rightarrow$ Barcodes / QR Codes.
   - Universal attributes (Size, Color, Voltage, Material, Brand, Category).
   - Bundles, kits, and configurable packaging (e.g. Piece, Pack, Carton, Pallet).
   - Base stock unit with auditable unit conversion multipliers.
2. **Physical Location Topology (8-Tier Hierarchy)**:
   ```text
   Tenant
     └── Company / Legal Entity
           └── Branch (e.g. Lagos, Abuja, Kano)
                 └── Warehouse (e.g. Main Central, Cold Store)
                       └── Zone (e.g. Dry Storage, Bulk Zone)
                             └── Aisle
                                   └── Rack
                                         └── Shelf
                                               └── Bin (e.g. BIN-A-04-02)
   ```
3. **Stock Quantity States (Multi-State Availability)**:
   $$\text{Total On-Hand} = \text{Available} + \text{Reserved} + \text{Allocated} + \text{Quarantined} + \text{Damaged}$$
   - **On-Hand**: Physical stock currently inside the facility.
   - **Available**: Stock free to be sold or transferred.
   - **Reserved**: Held in active customer carts or pending quotes.
   - **Allocated**: Committed to confirmed orders awaiting warehouse picking.
   - **Quarantined**: Awaiting quality inspection or regulatory clearance.
   - **Damaged**: Unsellable physical stock pending write-off or supplier return.
   - **Incoming**: On purchase orders or inbound transfers in-transit.
   - **Outgoing**: Packed and awaiting courier dispatch.
   - **Safety Stock**: Minimum threshold buffer before reorder triggers.
4. **Lots, Batches & Serial Numbers**:
   - **Batch/Lot Tracking**: Batch number, manufacture date, expiry date, supplier trace. Supports FEFO (First Expired, First Out) and FIFO picking logic.
   - **Serial Number Tracking**: Discrete unique identifier per unit (SN123456) with individual warranty status, condition, and movement lifecycle.
5. **Immutable Movement Ledger**:
   $$\text{Current Balance} = \sum(\text{Posted Inventory Movements})$$
   - 13 standard movement types (Opening Balance, Purchase Receipt, Sale Issue, Transfer In/Out, Customer/Supplier Return, Damage, Expiry, Adjustments, Count Corrections).
   - Zero direct mutation (`UPDATE products SET stock = ...` is forbidden).

---

### Domain 3: Operations & Configurable Workflows

1. **Subsystem Role**:
   - The workflow engine is an **operations subsystem**, not the entire application. It orchestrates *what happens next* and *who does it* across Commerce, Inventory, Procurement, and Logistics.
2. **Graph-Based DAG Engine**:
   - Versioned, published, immutable workflows composed of steps and transitions.
   - Parallel tasks (e.g. parallel picking across zones), merge steps, and conditional forks.
3. **Work Centers & Task Queues**:
   - Work stations: Sales Desk, Picking Station, Verification Station, Packing Station, Cashier Till, Dispatch Dock.
   - High-throughput shared queues with lease-based concurrency locks.
4. **Declarative Business Rules**:
   - Automated conditional policies without arbitrary code execution (e.g. High-value discounts, credit overruns).
   - Approval requests routed to designated managers or roles.

---

### Domain 4: Procurement & Supplier Management

1. **Procurement Lifecycle**:
   ```text
   Material / Stock Requisition
         ↓
   Request for Quotation (RFQ)
         ↓
   Supplier Quotation Comparison
         ↓
   Purchase Order (PO)
         ↓
   Goods Receipt Note (GRN)
         ↓
   Inbound Inspection & Quality Control
         ↓
   Stock Ledger Intake (Available / Quarantine)
         ↓
   Supplier Invoice Matching (3-Way Match: PO, GRN, Invoice)
         ↓
   Supplier Payment
   ```
2. **Supplier Relationship & Intelligence**:
   - Supplier master directory, catalogs, lead times, payment terms, and currency.
   - Performance metrics: on-time delivery rate, defect/damage rate, price variance history.

---

### Domain 5: Finance, Cash Truth & Accounting

1. **Cash Truth & Register Sessions**:
   - Registers/tills operate via strict sessions.
   - Mandatory opening float record.
   - Real-time audit of Cash Sales, Cash Refunds, Cash In (Petty cash), Cash Out.
   - Blind closing cash count: system computes expected cash and records variance automatically.
2. **Separation of Financial Concerns**:
   $$\text{Sales Order} \neq \text{Invoice} \neq \text{Payment} \neq \text{Receipt}$$
   - Invoices represent accounts receivable legal claim.
   - Payments record cash/bank asset intake with idempotent tracking (`operation_id`).
   - Receipts are customer documentation; reprinting a receipt never duplicates a financial transaction.
3. **Double-Entry General Ledger Foundation**:
   - Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses).
   - Append-only journal entries ($\sum \text{Debits} = \sum \text{Credits}$).
   - Corrections require explicit reversing entries; history is never deleted.

---

### Domain 6: Logistics & Fulfillment

1. **Order Fulfillment Pipeline**:
   - Pick list generation (by warehouse zone, bin location, and FEFO expiry priority).
   - Physical picking $\rightarrow$ Barcode verification $\rightarrow$ Packing & box labeling $\rightarrow$ Dispatch.
2. **Multi-Branch & Inter-Facility Transfers**:
   - Source warehouse dispatch creates `TRANSFER_OUT` movement.
   - Goods marked `IN_TRANSIT` with shipment tracking and carrier assignment.
   - Destination warehouse receives and inspects stock, creating `TRANSFER_IN` movement.
   - Discrepancy handling: transit loss, transit damage, or quantity adjustments.
3. **Last-Mile Delivery**:
   - Delivery runs, driver assignment, proof of delivery (signature, timestamp, photo).

---

### Domain 7: Manufacturing & Light Assembly

1. **Bills of Materials (BOM)**:
   - Single-level and multi-level hierarchical BOMs.
   - Raw materials, subassemblies, and operational scrap allowance.
2. **Production & Assembly**:
   - Production Orders and Work Orders.
   - Material issue: raw material stock decremented via `CONSUMPTION` movement.
   - Finished goods intake: assembled product incremented via `PRODUCTION` movement.
   - Disassembly / Unbundling workflows for breaking down multi-packs or kits.

---

### Domain 8: Analytics, Forecasting & Intelligence

1. **Demand Forecasting & Replenishment**:
   - **Average Daily Sales (ADS)** calculation over configurable windows (7, 30, 90 days).
   - **Reorder Point (ROP)** formula:
     $$\text{ROP} = (\text{ADS} \times \text{Supplier Lead Time in Days}) + \text{Safety Stock}$$
   - Automated replenishment recommendations (e.g. *"Reorder 430 units of SKU-X from Supplier Y"*).
2. **Inventory Health & Intelligence**:
   - Dead stock detection (zero movements over $N$ days).
   - Fast-moving vs slow-moving ABC inventory classification.
   - Expiry alert pipeline (identifying batches expiring within 30/60/90 days).
   - Shrinkage and stock variance analytics across branches and registers.
3. **Enterprise Operational Dashboards**:
   - Real-time gross margin, inventory valuation (FIFO / Moving Average), branch profitability, cashier settlement variance.

---

### Domain 9: Platform, Tenancy & Security

1. **Isolated Multi-Tenancy**:
   - Top-level `tenants` with child `companies` and `branches`.
   - Every table and query explicitly carries `tenant_id`. Server-side validation guarantees zero cross-tenant leakage.
2. **Scoped Dynamic RBAC**:
   - Granular capability permissions (e.g. `sales.create`, `inventory.adjust`, `registers.close`, `workflow.manage`).
   - Role assignments scoped to specific organizational tiers (Tenant, Company, Branch, Warehouse, Register, Work Center).
   - Separation between SaaS Super Admin and Tenant Business Owner.
3. **Immutable Audit & Governance**:
   - Append-only records logging: Actor, Action, Resource, Timestamp, Device ID, Work Center, and sensitive data redaction.
   - Dedicated security event alerting for unauthorized or cross-tenant attempts.

---

### Domain 10: Offline-First Resilience & Sync

1. **Local-First Reliability**:
   - Native SQLite embedded on desktop (Tauri 2) and handheld mobile (Expo).
   - Full offline POS and warehouse scanning operation when internet is completely down.
2. **Deterministic Sync Engine**:
   - **Client Outbox**: Local mutations write atomically to local SQLite tables + `outbox_operations`.
   - **Server Inbox**: `sync_operations` with deduplication by UUIDv7 `operation_id`.
   - **Monotonic Change Feed**: Ordered `sync_changes` stream consumed via cursor pagination.
   - **Conflict Strategy**: Append-only for ledger and payments; domain exception workflows for concurrent master data collisions (zero naive last-write-wins).

---

### Domain 11: Device & Integration Ecosystem

1. **Supported Client Formats**:
   - Web Management Console (React + Vite).
   - High-Speed Desktop POS (React + Tauri 2 + SQLite).
   - Warehouse Scanner & Audit Mobile (React Native + Expo + SQLite).
2. **Hardware Peripherals**:
   - USB / Network thermal receipt printers (ESC/POS).
   - High-speed 1D/2D barcode scanners and QR code readers.
   - Electronic cash drawers (RJ11 kick-out).
   - Digital weighing scales.
3. **External Integrations**:
   - Webhooks for order, payment, and inventory events.
   - Payment gateways (Paystack, Flutterwave, Moniepoint, Stripe).
   - Cloudflare R2 object storage for product media and PDF invoices.

---

### Domain 12: Cross-Cutting Enterprise Engines

1. **Configurable Tax Engine**:
   - VAT, Sales Tax, Withholding, Compound Tax.
   - Jurisdiction-aware, tax-inclusive vs tax-exclusive calculation.
2. **Document Generation Engine**:
   - Standardized printable documents: Quotations, Invoices, Receipts, Delivery Notes, Goods Receipt Notes, Credit Notes.
   - Multi-template rendering with PDF export and audit tracking.
3. **Notification Engine**:
   - Multi-channel delivery: In-App, Email, SMS, Webhooks.
   - Critical triggers: Low stock alerts, approval requests, payment confirmations, cash variances.
4. **Global High-Performance Search**:
   - Fast multi-entity search across Products, SKUs, Barcodes, Orders, Invoices, Customers, and Serial Numbers.
5. **Observability & Health**:
   - Structured JSON logs with correlation IDs, OpenTelemetry tracing, Sentry error telemetry, and Redis queue monitoring.

---

## 4. Architectural Benchmark: What "World-Class" Means

| Standard | Traditional Legacy Systems | STOKROVA Platform Standard |
| :--- | :--- | :--- |
| **Data Integrity** | Mutable `stock` column, prone to silent drift | Mathematically pure immutable movement ledger: $\text{Stock} = \sum(\text{Movements})$ |
| **Financial Rigor** | Receipts used as financial truth | Double-entry journal entries; payments separated from receipt reprints |
| **Offline Resilience**| Online-only or fragile browser web cache | First-class local SQLite on native desktop/mobile with deterministic outbox sync |
| **Workflow Flexibility**| Hardcoded monolithic state machines | Versioned Directed Acyclic Graph (DAG) with concurrency-leased task queues |
| **Progressive UX** | Massive enterprise forms or toy checkout screens | Scales progressively from single-screen solo trader to enterprise multi-warehouse |
| **Traceability** | Stock count only | Complete genealogy: Supplier $\rightarrow$ PO $\rightarrow$ Batch/Serial $\rightarrow$ Warehouse $\rightarrow$ Transfer $\rightarrow$ Sale $\rightarrow$ Customer |
