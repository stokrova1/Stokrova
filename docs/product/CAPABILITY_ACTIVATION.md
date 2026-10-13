# Capability Activation Model

## 1. Architectural Principle: Capabilities, Not Rigid Modes

STOKROVA strictly avoids hardcoding monolithic "modes" or integer complexity tiers (e.g., `mode = 1 | 2 | 3`). 

Instead, tenant configuration operates via **Composable Capabilities**. A tenant activates the exact set of business capabilities required for their operational stage. 

Activating a capability dynamically surfaces corresponding navigation items, validation rules, and workflow options, while the underlying data engine remains unified.

---

## 2. Core Capability Catalog

```text
                                 TENANT CAPABILITIES
                                         │
        ┌───────────────────────┬────────┴──────────────┬───────────────────────┐
        │                       │                       │                       │
      RETAIL                INVENTORY              COMMERCE                 OPERATIONS
   ├── POS Checkout       ├── Multi-Warehouse    ├── B2B Wholesale       ├── Configurable Workflows
   ├── Cash Registers     ├── Bin Locations      ├── Credit Terms        ├── Parallel Task Queues
   └── Loyalty Rewards    ├── Lots & Expiry      ├── Tiered Pricing      ├── Declarative Approvals
                          └── Serial Numbers     └── Quotations          └── Work Centers
        │                       │                       │                       │
        ├───────────────────────┼───────────────────────┼───────────────────────┤
        │                       │                       │                       │
    LOGISTICS              PROCUREMENT               FINANCE                ENTERPRISE
   ├── Delivery Runs      ├── Purchase Orders    ├── Accounts Payable    ├── Multi-Company
   ├── Route Planning     ├── RFQs & Quotes      ├── General Ledger      ├── Multi-Currency
   └── In-Transit Moves   └── Quality Inspection └── Tax Engine          └── Manufacturing (BOM)
```

---

## 3. Capability Definitions & Surface Area

| Capability Code | Description | UI / Functional Impact |
| :--- | :--- | :--- |
| `CAP_RETAIL_POS` | High-speed retail cashier interface | Enables POS screen, cart calculation, barcode scanner autofocus, thermal receipt printing. |
| `CAP_CASH_REGISTERS` | Formal till sessions & cash management | Enforces opening float, cash-in/cash-out tracking, blind closing counts, and variance audits. |
| `CAP_MULTI_WAREHOUSE` | Warehouses beyond a single storefront | Enables warehouse selector, multi-location stock viewing, and inter-facility transfers. |
| `CAP_BIN_LOCATIONS` | Physical bin/shelf locations | Expands warehouse topology to zones, aisles, racks, shelves, and bins; enables location routing. |
| `CAP_LOT_EXPIRY` | Batch numbers & expiration dates | Enforces batch entry on receiving, enables FEFO picking priority, and generates expiry alerts. |
| `CAP_SERIAL_TRACKING` | Unique discrete per-unit tracking | Requires discrete serial number capture on intake and sale; prevents duplicate serial moves. |
| `CAP_B2B_WHOLESALE` | Commercial sales to corporate buyers | Enables customer credit limits, payment terms (Net 30), price lists, and account statements. |
| `CAP_QUOTATIONS` | Pre-sale quotes and pro-forma invoices | Enables quotation builder, expiration dates, and 1-click conversion to confirmed sales orders. |
| `CAP_PROCUREMENT` | Structured supplier purchasing | Enables supplier directory, purchase orders, goods receipts (GRN), and 3-way matching. |
| `CAP_QUALITY_INSPECTION`| Formal inbound inspection | Routes received stock to quarantine; requires explicit pass/fail sign-off before stock availability. |
| `CAP_WORKFLOWS_CONFIG` | Graph-based DAG workflow engine | Enables visual workflow builder, custom task queues, and station assignment. |
| `CAP_APPROVAL_RULES` | Declarative manager sign-offs | Enables rule evaluation engine (e.g., high discounts, credit limit overruns require manager approval). |
| `CAP_LOGISTICS_TRANSFERS`| Inter-branch transit logistics | Enables formal transfer requests, in-transit virtual holding, shipment tracking, and dispatch manifests. |
| `CAP_GENERAL_LEDGER` | Full double-entry financial accounting | Enables chart of accounts, automated journal entries, trial balance, and balance sheet reports. |
| `CAP_MULTI_BRANCH` | Multiple physical trading branches | Enables branch creation, scoped user roles, branch-specific pricing, and consolidated reporting. |
| `CAP_MANUFACTURING_BOM` | Bills of Materials & light assembly | Enables multi-level BOMs, work orders, material consumption, and kit disassembly. |

---

## 4. Capability Bundles by Business Profile

While capabilities are individually toggleable, STOKROVA provides quick-start baseline presets:

```typescript
export const CapabilityPresets = {
  SOLO_TRADER: [
    'CAP_RETAIL_POS',
  ],
  RETAIL_STORE: [
    'CAP_RETAIL_POS',
    'CAP_CASH_REGISTERS',
    'CAP_PROCUREMENT',
  ],
  SUPERMARKET: [
    'CAP_RETAIL_POS',
    'CAP_CASH_REGISTERS',
    'CAP_PROCUREMENT',
    'CAP_LOT_EXPIRY',
  ],
  WHOLESALE_DISTRIBUTOR: [
    'CAP_MULTI_WAREHOUSE',
    'CAP_BIN_LOCATIONS',
    'CAP_LOT_EXPIRY',
    'CAP_SERIAL_TRACKING',
    'CAP_B2B_WHOLESALE',
    'CAP_QUOTATIONS',
    'CAP_PROCUREMENT',
    'CAP_WORKFLOWS_CONFIG',
    'CAP_APPROVAL_RULES',
    'CAP_LOGISTICS_TRANSFERS',
  ],
  ENTERPRISE_HOLDING: [
    // All capabilities enabled
    'CAP_RETAIL_POS',
    'CAP_CASH_REGISTERS',
    'CAP_MULTI_WAREHOUSE',
    'CAP_BIN_LOCATIONS',
    'CAP_LOT_EXPIRY',
    'CAP_SERIAL_TRACKING',
    'CAP_B2B_WHOLESALE',
    'CAP_QUOTATIONS',
    'CAP_PROCUREMENT',
    'CAP_QUALITY_INSPECTION',
    'CAP_WORKFLOWS_CONFIG',
    'CAP_APPROVAL_RULES',
    'CAP_LOGISTICS_TRANSFERS',
    'CAP_GENERAL_LEDGER',
    'CAP_MULTI_BRANCH',
    'CAP_MANUFACTURING_BOM',
  ],
};
```

---

## 5. Architectural Invariant: Schema Immutability

> **Rule 4: Never make workflow configuration change database schema.**
> **Rule 5: Never allow workflow configuration to bypass domain invariants.**

Enabling or disabling capabilities:
- **Never** alters database tables, creates columns, or drops foreign keys.
- Operates purely at the application authorization and UI layout layer.
- Existing historical data created under an active capability is permanently preserved even if the capability is later disabled.
