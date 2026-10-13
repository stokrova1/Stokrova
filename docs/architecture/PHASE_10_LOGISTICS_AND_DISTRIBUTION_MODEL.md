# STOKROVA — Phase 10 Logistics, Fulfillment & Distribution Architecture Model

**Product:** STOKROVA — Configurable, Offline-Capable, Multi-Tenant Enterprise Business Operating Platform  
**Phase:** Phase 10 — Advanced Logistics, Fulfillment & Distribution  
**Target Milestone Gate:** `READY_FOR_PHASE_11`  
**Status:** COMPLETE & AUTHORITATIVE  

---

## 1. Executive Architectural Overview

Phase 10 implements a production-grade, multi-tenant logistics, fulfillment, and physical distribution architecture for the STOKROVA platform.

Rather than creating disjointed delivery silos, shadow carrier tables, or standalone transport systems, Phase 10 natively extends STOKROVA's existing enterprise foundations:
- **Product Catalog & Deep Inventory Core** (Phases 2 & 2E): Authoritative double-entry immutable stock ledger, FEFO picking, batch/serial genealogy, and reserved inventory.
- **Commerce, Sales Orders & POS** (Phase 3): Sales order line lifecycle, fulfillment states, and multi-channel demand.
- **Procurement & Goods Receiving** (Phase 4): Inbound purchase orders, supplier shipments, landed cost capitalization, and three-way matching.
- **Manufacturing Execution** (Phase 5): Work-in-progress stock movements, material consumption, and finished goods provenance.
- **Double-Entry General Ledger & Accounting Books** (Phase 6): COGS recognition, expense accounts, and landed cost accounts.
- **Multi-Entity Consolidation & Tax Compliance** (Phase 7): Intercompany logistics transactions, freight tax rules, and legal entity boundaries.
- **Commercial Pricing & Incentive Engine** (Phase 8): Delivery surcharges, promo codes, and customer freight terms.
- **CRM & Customer Engagement** (Phase 9): Delivery tracking notifications, milestone events, and account addresses.

The logistics capability scales dynamically from a solo merchant packing orders for local courier pickup to a multinational enterprise managing multi-depot wave fulfillment, automated 3PL carrier routing, dedicated vehicle fleet dispatch, and offline driver proof of delivery (POD):

$$\begin{aligned}
\text{Confirmed Sales Order} &\longrightarrow \text{Authoritative Stock Reservation} \longrightarrow \text{Fulfillment Planning (Single or Split)} \\
\text{Fulfillment Plan} &\longrightarrow \text{Wave / Batch Picking (FEFO \& Bin Route)} \longrightarrow \text{Packing \& Containerization} \\
\text{Packed Shipment} &\longrightarrow \begin{cases} \text{3PL Carrier Route} & \text{Rate Quote} \rightarrow \text{Idempotent Booking} \rightarrow \text{Label \& Manifest} \\ \text{Internal Fleet Route} & \text{Run Planning} \rightarrow \text{Vehicle / Driver Assignment} \rightarrow \text{Optimized Run Dispatch} \end{cases} \\
\text{En Route} &\longrightarrow \text{Milestone Tracking (Webhook / Driver GPS)} \longrightarrow \begin{cases} \text{Failed Attempt} & \text{Structured Reason} \rightarrow \text{Max Attempts Policy} \rightarrow \text{RTO} \\ \text{Delivered} & \text{Idempotent Proof of Delivery (Signature, Photo, GPS)} \end{cases} \\
\text{Delivered Event} &\longrightarrow \text{Basis Points Reconciliation} \longrightarrow \text{Sales Order Fulfillment Progress} \\
\text{Reverse Logistics (RTO)} &\longrightarrow \text{In-Transit Return (Zero Premature Stock Restoration)} \longrightarrow \text{Physical RMA Inspection \& Disposition} \\
\text{Financial Invariant} &\longrightarrow \text{Carrier Actual Cost} \neq \text{Customer Freight Fee} \longrightarrow \text{Zero Direct Ledger Mutations by Logistics}
\end{aligned}$$

---

## 2. Core Architectural Pillars

### Pillar A: Universal Fulfillment Planning & Inventory Invariants
1. **Order-to-Fulfillment Alignment**:
   - Fulfillments reference existing sales orders (`order_id`) and warehouses (`warehouse_id`).
   - Line items map directly to commercial order lines (`order_line_id`).
2. **Partial Fulfillment & Split Shipments**:
   - A single sales order may be fulfilled across multiple shipments without losing track of total delivered vs. pending quantities.
   - Domain invariant `validateFulfillmentQuantities` strictly enforces that allocated quantities never exceed remaining unfulfilled order quantities.
3. **Double-Entry Inventory Ledger Isolation**:
   - Logistics operations never execute direct inventory write-offs or blind stock deductions.
   - When a shipment is dispatched, inventory is moved or issued through the authoritative `StockLedgerService` using double-entry ledger entries.
   - Retried dispatches check operation idempotency keys (`op_dispatch_*`) to prevent double-consumption of stock.
4. **Genealogy & Tracking Preservation**:
   - Picking and packing retain batch IDs, serial IDs, expiry dates, and bin location paths established in Phase 2E.

---

### Pillar B: Shipment State Machine & Multi-Carrier 3PL Abstraction
1. **Shipment State Lifecycle**:
   $$\text{DRAFT} \longrightarrow \text{READY\_FOR\_DISPATCH} \longrightarrow \text{DISPATCHED} \longrightarrow \begin{cases} \text{IN\_TRANSIT} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED} \\ \text{FAILED\_ATTEMPT} \longrightarrow \text{OUT\_FOR\_DELIVERY} \text{ (Retry)} \\ \text{EXCEPTION} \longrightarrow \text{RETURNED\_TO\_ORIGIN} \end{cases}$$
2. **Cancellation Protection**:
   - Once a shipment transitions to `DISPATCHED` (physical goods have left the facility), it **cannot be cancelled**.
   - Attempted cancellations throw `LogisticsDomainError('CANNOT_CANCEL_DISPATCHED_SHIPMENT')` and mandate return-to-origin procedures.
3. **Pluggable Carrier Adapter Architecture**:
   - Common interface `CarrierAdapter` defines contract methods: `quoteRates()`, `bookShipment()`, `generateLabel()`, `trackShipment()`, and `cancelBooking()`.
   - `MockCarrierAdapter` supports simulated provider latency, timeout recovery, and mock tracking generation.
4. **Timeout Resilience & Idempotent Booking**:
   - External carrier bookings are keyed by unique `operation_id`.
   - If a provider times out, retrying the booking with the same `operation_id` reconciles with the carrier without generating duplicate tracking numbers or billing events.
5. **Webhook Ingestion & Deduplication**:
   - Carrier tracking webhooks are processed idempotently. Duplicate external events are detected via `provider_id:event_id:tracking_number` deduplication keys and skipped without state corruption.
   - Out-of-order milestones are reconciled using monotonic milestone timestamp checks.

---

### Pillar C: Delivery Runs, Route Sequencing & Proof of Delivery (POD)
1. **Internal Fleet Delivery Runs**:
   - Internal shipments are clustered into delivery runs (`DeliveryRun`).
   - Each run references an authoritative `warehouse_id`, `vehicle_id`, and `driver_id`.
2. **Vehicle Capacity Constraints**:
   - Domain rule `assertRunCapacityLimits` verifies combined shipment package weight and volume against the vehicle's `max_payload_grams` and `max_volume_cm3`.
   - Overweight or oversized assignments are rejected before run dispatch.
3. **Stop Sequencing & Execution**:
   - Runs contain ordered delivery stops (`DeliveryStop`), each tied to a customer shipment.
   - Dispatching the run atomically moves shipments to `OUT_FOR_DELIVERY`.
4. **Idempotent Proof of Delivery Capture**:
   - Successful delivery requires non-forgeable proof artifacts: recipient name, signature URL, photo proof URL, GPS coordinates (latitude/longitude), and completion timestamp.
   - Submissions keyed by idempotency key are strictly idempotent.
5. **Driver Authorization Verification**:
   - Only the driver assigned to the active run can submit stop updates or POD records. Submissions from unauthorized driver IDs are rejected.
6. **Failed Attempt Policy**:
   - Failed attempts require a structured outcome reason (`CUSTOMER_UNAVAILABLE`, `INCORRECT_ADDRESS`, `ACCESS_RESTRICTED`, `REJECTED`, `DAMAGED`, `RESCHEDULED`).
   - If consecutive failed attempts reach the tenant policy limit (default 3), the shipment automatically transitions to `RETURNED_TO_ORIGIN`.

---

### Pillar D: Reverse Logistics, Returns & Reshipments
1. **Return to Origin (RTO) Execution**:
   - Shipments that encounter undeliverable conditions, customer refusals, or transit damage transition to `RETURNED_TO_ORIGIN`.
2. **Zero Premature Inventory Restoration**:
   - Physical inventory is **not** restored when a parcel is simply marked RTO while still on a delivery vehicle or in 3PL transit.
   - Premature stock restoration is strictly prohibited because the condition of returned goods is unknown.
3. **Integration with Authoritative RMA Inspection**:
   - Once returned goods physically arrive back at the warehouse, receiving and grading routes through `RmaService` (`createRmaFromReturnedShipment`).
   - Inventory is restocked, refurbished, or scrapped only after physical quality inspection.
4. **Non-Duplicating Reshipments**:
   - When lost or damaged parcels require redelivery, `createReshipment` generates a new fulfillment and shipment linked to the original order without creating duplicate commercial sales orders or distorting historical revenue.

---

### Pillar E: Financial Boundaries & Pure Integer Mathematics
1. **Clear Logistics vs. Finance Separation**:
   - Logistics operations never issue customer refunds, write cash movements, or post journal entries directly to the General Ledger.
   - Refunds and financial credit notes are initiated exclusively by authorized accounting and returns services (`InvoicesService`, `PaymentsService`).
2. **Cost Distinction Invariant**:
   - Carrier actual cost (`CONFIRMED_ACTUAL`), carrier quotes (`QUOTED`), and customer delivery fees charged on sales orders are maintained as distinct financial entities in `logistics_charges`.
   - Customer shipping fees are revenue items; carrier freight charges are operational expenses.
3. **Landed Cost Integration**:
   - Inbound supplier freight and customs charges capitalize into inventory valuation exclusively through the existing `LandedCostService`.
4. **Pure Integer Minor Units & Basis Points**:
   - All charges and fees are stored strictly as `BigInt` or decimal-string integer minor units (e.g., `'4000'` for \$40.00).
   - Fulfillment progress ratios are computed in integer basis points ($10000 = 100.00\%$) using pure integer arithmetic.

---

### Pillar F: Multi-Tenant Isolation, Scoped RBAC & Offline Synchronization
1. **Multi-Tenant Security**:
   - All 11 logistics database tables enforce foreign key references to `tenants(id)` with `onDelete: 'restrict'`.
   - Every API request validates tenant context. Cross-tenant access, carrier sharing, or manifest visibility is strictly prevented.
2. **Granular RBAC Permissions**:
   - `logistics.fulfillment.view`, `logistics.fulfillment.manage`
   - `logistics.shipment.view`, `logistics.shipment.create`, `logistics.shipment.dispatch`, `logistics.shipment.cancel`
   - `logistics.carrier.manage`, `logistics.quote.view`
   - `logistics.delivery.manage`, `logistics.delivery.execute`
   - `logistics.pod.record`
   - `logistics.reverse.manage`
   - `logistics.cost.view`, `logistics.cost.manage`
3. **Role Templates**:
   - `WAREHOUSE_DISPATCHER`: Fulfillment planning, packing, label generation, dispatch.
   - `DELIVERY_DRIVER`: Mobile run inspection, stop arrival, proof of delivery recording.
   - `LOGISTICS_MANAGER`: Full carrier rate, routing, reverse logistics, and cost governance.
4. **Offline Sync & Multi-Master Conflict Resolution**:
   - Mobile driver devices operate offline with local SQLite stores.
   - Synchronized stop events are deduplicated via vector clocks and operation IDs.
   - If conflicting stop outcomes occur, the system preserves all proof artifacts and audit logs rather than silently overwriting evidence.

---

## 3. Database Schema Specification

The Phase 10 logistics engine is backed by 11 normalized, tenant-isolated PostgreSQL tables managed via Drizzle ORM:

```
+---------------------------------------------------------------------------------------------------+
|                                  STOKROVA LOGISTICS SCHEMA                                        |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  +-----------------------+       +------------------------+       +----------------------------+  |
|  |     fulfillments      | 1---* |   fulfillment_lines    |       |         carriers           |  |
|  |-----------------------|       |------------------------|       |----------------------------|  |
|  | id (PK)               |       | id (PK)                |       | id (PK)                    |  |
|  | tenant_id (FK)        |       | tenant_id (FK)         |       | tenant_id (FK)             |  |
|  | order_id (FK)         |       | fulfillment_id (FK)    |       | code (UNIQUE)              |  |
|  | warehouse_id (FK)     |       | order_line_id          |       | name                       |  |
|  | status                |       | variant_id             |       | type (3PL / FLEET / etc.)  |  |
|  | created_at            |       | quantity_requested     |       | is_active                  |  |
|  +-----------------------+       | quantity_allocated     |       +----------------------------+  |
|             | 1                  +------------------------+                     | 1               |
|             |                                                                   |                 |
|             *                                                                   *                 |
|  +-----------------------+       +------------------------+       +----------------------------+  |
|  |       shipments       | 1---* |     shipment_lines     |       |     carrier_services       |  |
|  |-----------------------|       |------------------------|       |----------------------------|  |
|  | id (PK)               |       | id (PK)                |       | id (PK)                    |  |
|  | tenant_id (FK)        |       | tenant_id (FK)         |       | tenant_id (FK)             |  |
|  | fulfillment_id (FK)   |       | shipment_id (FK)       |       | carrier_id (FK)            |  |
|  | carrier_id (FK)       |       | fulfillment_line_id    |       | code                       |  |
|  | tracking_number       |       | variant_id             |       | service_level              |  |
|  | status                |       | quantity               |       +----------------------------+  |
|  | dispatched_at         |       +------------------------+                                       |
|  | delivered_at          |                                                                        |
|  +-----------------------+                                                                        |
|      | 1        | 1            | 1                                                                |
|      *          *              *                                                                  |
|  +----------+ +------------+ +--------------------+       +------------------------------------+  |
|  | packages | | milestones | | logistics_charges  |       |         logistics_policies         |  |
|  |----------| |------------| |--------------------|       |------------------------------------|  |
|  | id (PK)  | | id (PK)    | | id (PK)            |       | id (PK)                            |  |
|  | ...      | | ...        | | charge_type        |       | tenant_id (FK)                     |  |
|  | weight   | | event_name | | amount_minor       |       | max_delivery_attempts              |  |
|  | volume   | | timestamp  | | provenance         |       | auto_rto_after_max_failures        |  |
|  +----------+ +------------+ +--------------------+       +------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Verification & Certification

All 35 master evaluation scenarios across all 5 requirement groups have been implemented and validated in `apps/api/src/logistics/logistics-phase10.spec.ts`:
1. **Fulfillment Planning & Inventory Invariants** (Scenarios 1-8): Passed.
2. **Shipment State & Carrier Integration** (Scenarios 9-15): Passed.
3. **Delivery Runs, Routes & Proof of Delivery** (Scenarios 16-22): Passed.
4. **Reverse Logistics & Financial Boundaries** (Scenarios 23-28): Passed.
5. **Offline Sync, Tenancy, Security & RBAC** (Scenarios 29-35): Passed.

Monorepo Status:
- Recursive TypeScript compilation: 100% clean across all 11 packages and apps.
- Monorepo production build: 100% clean across all 11 packages and apps.
- Automated test suite: 100% passing rate.
