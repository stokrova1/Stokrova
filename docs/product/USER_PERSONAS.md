# User Personas & Operational Roles

## 1. Overview

STOKROVA models real-world business operations by separating **Identity** (who the user is), **Roles** (what responsibilities they hold), and **Scopes** (where they can exercise them). 

A single user can embody different personas depending on their shift, branch, or assigned work center.

---

## 2. Core Personas

### 1. Solo Shopkeeper / Micro-Trader
- **Context**: Owns and runs a single shop or market stall independently.
- **Goals**: Process sales rapidly, collect payment (Cash or Bank Transfer), print a clean receipt, check daily sales totals, and reorder stock when low.
- **Pain Points**: Complicated enterprise menus, having to create fake "purchase orders" just to add stock, multiple confirmation dialogs.
- **Primary UI**: Solo Merchant Dashboard (Sell, Products, Stock, Cash, Reports).

---

### 2. Retail Cashier
- **Context**: Assigned to a specific physical register/till in a retail storefront or supermarket during a work shift.
- **Goals**: Scan barcodes at maximum speed, handle split tender, manage cash drawer, print receipts, suspend/resume carts, and balance the till at end-of-shift.
- **Pain Points**: Slow software latency, mouse-clicking required to scan, confusing return screens, unexplainable cash variances.
- **Primary UI**: Desktop POS (Tauri 2) with full keyboard shortcuts, acoustic barcode feedback, and dedicated Register Session screen.

---

### 3. Warehouse Picker
- **Context**: Operates inside a warehouse or fulfillment center fulfilling sales orders or transfer requisitions.
- **Goals**: View assigned pick lists, navigate efficiently by zone/aisle/shelf/bin, scan item barcodes to verify correct SKU/batch, and mark tasks as picked.
- **Pain Points**: Paper pick lists, walking unnecessary distance due to unoptimized routing, picking expired batches, conflicts with other pickers claiming the same order.
- **Primary UI**: Mobile Handheld Audit App (React Native/Expo) with offline scanning and Picking Queue integration.

---

### 4. Warehouse Checker & Packer
- **Context**: Stations at a Verification / Packing bench at the outbound warehouse dock.
- **Goals**: Perform secondary barcode verification of picked goods against the order, verify serial numbers and batch expiry, pack items securely, print carton shipping labels, and attach packing slips.
- **Pain Points**: Mismatched items sent to packing, duplicate serial numbers, lack of carton weight validation.
- **Primary UI**: Packing Station Web Interface with high-speed barcode verification and automated label printing.

---

### 5. Dispatch & Delivery Driver
- **Context**: Handles logistics dispatch and last-mile delivery runs to retail branches or wholesale customers.
- **Goals**: Inspect dispatch manifests, track delivery routes, confirm physical handoff, capture proof-of-delivery (signature or photo), and record transit issues.
- **Pain Points**: Offline delivery areas, lack of route manifests, manual paper delivery notes.
- **Primary UI**: Mobile Delivery App with offline proof-of-delivery recording.

---

### 6. Inventory Controller
- **Context**: Responsible for stock accuracy, cycle counts, stock movements, and shrinkage reduction across branches and warehouses.
- **Goals**: Execute blind cycle counts, audit stock adjustments, monitor dead stock and expiring batches (FEFO), track inter-branch transit, and reconcile inventory discrepancies.
- **Pain Points**: Unexplained inventory variances, inability to see movement history, difficulty enforcing reason codes for damaged stock.
- **Primary UI**: Inventory Control Console with real-time movement ledger explorer, batch timeline, and cycle count reconciliation.

---

### 7. Procurement Officer
- **Context**: Manages supplier relationships, purchase requisitions, RFQs, purchase orders, and goods receiving.
- **Goals**: Compare supplier quotes, issue purchase orders, monitor supplier lead times, ensure 3-way matching between PO, GRN, and invoice, and track backorders.
- **Pain Points**: Over-ordering, price discrepancy between quote and supplier invoice, lack of visibility into received stock quality.
- **Primary UI**: Procurement Management Console with 3-way matching matrix and supplier performance dashboards.

---

### 8. Branch Manager
- **Context**: Manages day-to-day operations, employees, and profitability for a specific branch location (e.g., Lagos Branch).
- **Goals**: Monitor branch sales in real time, review cashier cash variances, approve high discounts or credit limit overrides, manage local staff shifts, and request replenishment transfers.
- **Pain Points**: Lack of visibility into cashier till shortages, delays in receiving emergency stock from central warehouse, unauthorized discounts.
- **Primary UI**: Branch Manager Dashboard with Approval Inbox, Register Variance alerts, and Branch KPI widgets.

---

### 9. Finance Officer / Accountant
- **Context**: Manages the company's financial truth, accounts receivable, accounts payable, tax compliance, and general ledger.
- **Goals**: Reconcile bank payments with sales invoices, monitor customer credit balances and aging reports, verify double-entry journal balance ($\sum \text{debits} = \sum \text{credits}$), prepare tax filings, and generate P&L and Balance Sheet.
- **Pain Points**: POS software that treats receipts as financial truth, untraceable manual stock adjustments, missing audit trails for invoice voids.
- **Primary UI**: Finance & General Ledger Console with journal explorer, trial balance, and aging analysis.

---

### 10. Business Owner / Enterprise Executive
- **Context**: Senior leadership overseeing the entire commercial organization, branches, and holding companies.
- **Goals**: Strategic visibility into gross margins, top-performing branches, dead stock exposure, cash flow projections, and overall enterprise health.
- **Pain Points**: Siloed reports that take days to compile, inability to trust numbers due to inconsistent branch accounting.
- **Primary UI**: Executive Analytics Portal with real-time KPI roll-ups, branch comparisons, and forecasting intelligence.

---

### 11. SaaS Platform Super Admin
- **Context**: Operates the multi-tenant cloud SaaS infrastructure (STOKROVA operational team).
- **Goals**: Provision tenants, monitor system health and database performance, manage billing subscriptions, monitor sync engine queues, and handle infrastructure diagnostics.
- **Pain Points**: Cross-tenant data leaks, noisy neighbor database locks, uncontrolled sync spam.
- **Security Invariant**: Strictly segregated from tenant business domains; platform admins never have unrestricted access to tenant business ledgers through standard APIs.
- **Primary UI**: Platform Operations Console with tenant health, worker telemetry, and audit feeds.
