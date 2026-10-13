# STOKROVA — Phase 11 Standard Metric Dictionary

## 1. Governance Principles

The STOKROVA Metric Dictionary serves as the single authoritative source of truth for business intelligence across the enterprise. Every metric adheres to the following principles:

1. **No Ambiguous Definitions:** Every metric has a unique identifier, an assigned owner domain, and clear inclusion and exclusion criteria.
2. **Explicit Value Provenance:** Values are cataloged as `ACTUAL` (historical ledger truth), `ESTIMATED` (statistical approximations), `FORECAST` (pipeline probabilities), or `DERIVED` (mathematical formulas).
3. **Pure Integer Representation:** Currency metrics are stored in integer minor units (cents, pence, kobo); ratios and rates are stored in basis points ($10,000 = 100.00\%$).
4. **Currency Sensitivity:** Monetary metrics require single-currency scoping to prevent mathematical errors during aggregation.

---

## 2. Master Metric Catalog

| Metric ID | Category | Name | Data Type | Aggregation | Provenance | Currency Sensitive | Owner Domain | Source Service | Required Permission |
|---|---|---|---|---|---|---|---|---|---|
| `GROSS_SALES` | SALES | Gross Sales | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Commerce | `OrdersService` | `reporting.sales.view` |
| `NET_SALES` | SALES | Net Sales | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Commerce | `OrdersService` | `reporting.sales.view` |
| `COMPLETED_ORDER_COUNT` | SALES | Completed Orders | `COUNT` | `COUNT` | `ACTUAL` | No | Commerce | `OrdersService` | `reporting.sales.view` |
| `AVERAGE_ORDER_VALUE` | SALES | Average Order Value | `CURRENCY_MINOR` | `RATIO` | `DERIVED` | Yes | Commerce | `OrdersService` | `reporting.sales.view` |
| `SALES_VOLUME` | SALES | Sales Volume | `QUANTITY_INTEGER` | `SUM` | `ACTUAL` | No | Commerce | `OrdersService` | `reporting.sales.view` |
| `ON_HAND_STOCK` | INVENTORY | On-Hand Stock Quantity | `QUANTITY_INTEGER` | `SUM` | `ACTUAL` | No | Inventory | `StockLedgerService` | `reporting.inventory.view` |
| `ON_HAND_COUNT` | INVENTORY | On-Hand Item Count | `QUANTITY_INTEGER` | `SUM` | `ACTUAL` | No | Inventory | `StockLedgerService` | `reporting.inventory.view` |
| `AVAILABLE_TO_PROMISE` | INVENTORY | Available To Promise (ATP) | `QUANTITY_INTEGER` | `SUM` | `DERIVED` | No | Inventory | `StockReservationsService` | `reporting.inventory.view` |
| `TOTAL_INVENTORY_VALUE` | INVENTORY | Total Inventory Valuation | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Inventory | `StockLedgerService` | `reporting.inventory.view` |
| `INVENTORY_VALUATION_FIFO`| INVENTORY | Inventory Valuation (FIFO) | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Inventory | `StockLedgerService` | `reporting.inventory.view` |
| `COGS` | FINANCE | Cost of Goods Sold | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Finance | `GeneralLedgerService` | `reporting.financial.view` |
| `GROSS_PROFIT` | FINANCE | Gross Profit | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Finance | `GeneralLedgerService` | `reporting.financial.view` |
| `GROSS_MARGIN_BP` | FINANCE | Gross Margin (Basis Points)| `BASIS_POINTS` | `RATIO` | `DERIVED` | No | Finance | `GeneralLedgerService` | `reporting.financial.view` |
| `ACCOUNTS_RECEIVABLE` | FINANCE | Accounts Receivable (AR) | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Finance | `InvoicesService` | `reporting.financial.view` |
| `ACCOUNTS_PAYABLE` | FINANCE | Accounts Payable (AP) | `CURRENCY_MINOR` | `SUM` | `ACTUAL` | Yes | Finance | `GeneralLedgerService` | `reporting.financial.view` |
| `PO_FULFILLMENT_RATE_BP` | PROCUREMENT | Purchase Order Fulfillment Rate| `BASIS_POINTS` | `RATIO` | `DERIVED` | No | Procurement | `ProcurementService` | `reporting.procurement.view` |
| `ON_TIME_DELIVERY_RATE_BP`| LOGISTICS | On-Time Delivery Rate | `BASIS_POINTS` | `RATIO` | `DERIVED` | No | Logistics | `LogisticsShipmentsService` | `reporting.logistics.view` |
| `DELIVERY_FAILURE_RATE_BP`| LOGISTICS | Delivery Attempt Failure Rate | `BASIS_POINTS` | `RATIO` | `DERIVED` | No | Logistics | `LogisticsDeliveryService` | `reporting.logistics.view` |
| `LEAD_CONVERSION_RATE_BP` | CRM | Lead Conversion Rate | `BASIS_POINTS` | `RATIO` | `DERIVED` | No | CRM | `CrmPipelineService` | `reporting.crm.view` |
| `PROJECTED_PIPELINE_VALUE`| CRM | Projected Opportunity Value | `CURRENCY_MINOR` | `SUM` | `FORECAST` | Yes | CRM | `CrmPipelineService` | `reporting.crm.view` |

---

## 3. Inclusion & Exclusion Rules Detailed Specification

### Commerce & Sales
- **`GROSS_SALES`**
  - *Inclusion:* Total recognized line totals of sales orders in `CONFIRMED`, `FULFILLED`, or `COMPLETED` status.
  - *Exclusion:* Draft orders, cancelled orders, sales taxes, and shipping fees.
- **`NET_SALES`**
  - *Inclusion:* `GROSS_SALES` minus line-level and order-level promotional discounts, customer trade rebates, and credit memos from processed returns.
  - *Exclusion:* Unapproved returns and pending quotation adjustments.
- **`SALES_VOLUME`**
  - *Inclusion:* Total physical unit count of items delivered across completed customer transactions.
  - *Exclusion:* Voided sales tickets, cancelled line items.

### Inventory & Warehousing
- **`ON_HAND_STOCK` / `ON_HAND_COUNT`**
  - *Inclusion:* Sum of positive double-entry balance records in `stock_ledger_entries` for usable bin locations.
  - *Exclusion:* Quarantined stock, damaged goods marked for scrap disposal, and goods in transit between warehouses.
- **`AVAILABLE_TO_PROMISE`**
  - *Inclusion:* On-hand stock units minus unexpired allocated stock reservations for active orders plus supplier-confirmed in-transit PO quantities.
  - *Exclusion:* Draft purchase requisitions and unapproved POs.

### Finance & Accounting
- **`COGS`**
  - *Inclusion:* Authoritative debits to the Cost of Goods Sold account posted through the General Ledger posting engine when goods are fulfilled.
  - *Exclusion:* Storage carrying costs, warehouse operational overhead, and unposted draft inventory adjustments.
- **`GROSS_MARGIN_BP`**
  - *Inclusion:* Exact calculation: $\frac{\text{Gross Profit} \times 10,000}{\text{Net Sales}}$.
  - *Exclusion:* Must never be calculated by taking an arithmetic average of sub-entity margin percentages.

### Logistics & Distribution
- **`ON_TIME_DELIVERY_RATE_BP`**
  - *Inclusion:* Shipments where POD timestamp $\le$ customer SLA delivery promise window, scaled to basis points ($10,000 = 100.00\%$).
  - *Exclusion:* Cancelled shipments and shipments currently in-flight.
- **`DELIVERY_FAILURE_RATE_BP`**
  - *Inclusion:* Deliveries recording an exception code (`CUSTOMER_UNAVAILABLE`, `INCORRECT_ADDRESS`, `REFUSED`) divided by total delivery run stops.
  - *Exclusion:* Successful deliveries on subsequent attempts.

### Customer Engagement & CRM
- **`PROJECTED_PIPELINE_VALUE`**
  - *Inclusion:* Sum of opportunity estimated value multiplied by stage probability percentage.
  - *Exclusion:* **Strict Boundary:** This is an estimated forecast figure and is barred by platform architectural invariants from being recognized as revenue or posting into the General Ledger.
