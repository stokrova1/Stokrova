# STOKROVA — Phase 10 Implementation & Engineering Plan
## Advanced Logistics, Fulfillment & Distribution

**Milestone:** Phase 10 — Advanced Logistics, Fulfillment & Distribution  
**Starting Quality Gate:** `READY_FOR_PHASE_10` (reported by Phase 9 completion certification)  
**Target Quality Gate:** `READY_FOR_PHASE_11`  
**Architecture:** Existing STOKROVA Modular Monolith, TypeScript Monorepo, NestJS, PostgreSQL, Supabase, Drizzle ORM, Redis, Transactional Outbox, and Offline Synchronization Infrastructure.  

---

## 1. Executive Summary & Roadmap Alignment

Following the roadmap inspection of `docs/architecture/MASTER_CAPABILITY_MAP.md`, `MASTER_DOMAIN_MODEL.md`, `PHASE_9_COMPLETION_REPORT.md`, and the Phase 10 Master Implementation Authorization:

**Authoritative Phase 10 Scope Confirmed:**
Phase 10 is **Advanced Logistics, Fulfillment & Distribution**. It establishes the physical fulfillment, parcel shipment lifecycle, carrier integration, delivery runs, driver operations, proof of delivery (POD), reverse logistics (RTO), and logistics charge accounting layer of STOKROVA.

The system scales smoothly from a single trader handling counter pickups to an enterprise managing multi-warehouse distribution networks, local delivery fleets, multiple 3PL carriers, and reverse logistics.

### The Central Architectural Axiom
> **"The business does not adapt itself to our software. Our software adapts itself to the business."**

Simple businesses can fulfill and deliver with one-click workflows, while enterprises can configure multi-carrier quoting, wave picking, containerized packing stations, driver delivery runs, and strict dual-custody returns.

---

## 2. Existing Capabilities vs. Phase 10 Scope Gaps

### Existing Capabilities in the Repository
1. **Sales Orders & Commerce (Phase 3)**:
   - `sales_orders` and `sales_order_lines` with status flags (`status`, `fulfillment_status`: `UNFULFILLED`, `PARTIALLY_FULFILLED`, `FULFILLED`).
   - `OrdersService`: basic fulfillment marking (`fulfillOrderLines`) and order dispatch (`dispatchSalesOrder`).
2. **Local Delivery Fleet & Basic POD (Phase 3 Delivery Module)**:
   - `fleet_vehicles`, `fleet_drivers`, `delivery_runs`, `delivery_stops`, `proof_of_deliveries`.
   - `DeliveryRoutingService`, `FleetService`, `PodService`.
   - Geofence distance calculation, signature and photo capture.
3. **Warehouse Operations (Phase 3 & Phase 6D)**:
   - `warehouses`, `storage_zones`, `storage_locations`, `put_away_rules`.
   - `pick_lists`, `pick_list_lines`, `waves.service.ts`, `picking.service.ts`.
   - `packaging_boxes`, `packing_stations`, `shipping_manifests`, `packed_containers`, `packed_container_lines`.
   - `internal_bin_transfers`, `cross_dock_operations`.
4. **Returns & Quality Control (Phase 7B / Returns Module)**:
   - `return_authorizations` (RMA), `return_lines`, `quality_inspections`, `disposition_actions`.
   - State machine: `DRAFT` $\rightarrow$ `REQUESTED` $\rightarrow$ `APPROVED` $\rightarrow$ `RECEIVED` $\rightarrow$ `COMPLETED`.
   - Quality grading (`GRADE_A_NEW` to `SCRAP_HAZMAT`) and disposition (`RESTOCK`, `SCRAP`, `TRANSFER`, `RETURN_TO_VENDOR`).
5. **General Ledger & Financial Truth (Phases 6 & 7)**:
   - Double-entry ledger with immutable journal entries and strict posting rules.

### Identified Gaps & Target Capabilities for Phase 10
1. **Fulfillment Planning & Orchestration Engine**:
   - Lack of dedicated `fulfillments` and `fulfillment_lines` entities to support:
     - 1 sales order $\rightarrow$ multiple fulfillments / shipments.
     - Partial line fulfillment and backorders with cumulative allocated/packed/dispatched tracking.
     - Fulfillment priorities (`LOW`, `STANDARD`, `HIGH`, `URGENT`), delivery windows, and fulfillment holds/release approvals.
     - Strict quantity invariants: preventing over-allocation or over-dispatch beyond valid sales order lines.
2. **Comprehensive Shipment & Parcel Lifecycle**:
   - Lack of unified `shipments`, `shipment_lines`, and `shipment_packages` entities.
   - Comprehensive shipment state machine:
     `DRAFT` $\rightarrow$ `READY_FOR_DISPATCH` $\rightarrow$ `DISPATCHED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`
     (with exception branches: `FAILED_ATTEMPT`, `EXCEPTION`, `RETURNED_TO_ORIGIN`, `CANCELLED`).
   - Milestone event history (`shipment_milestones`) with provider event deduplication.
   - Idempotent dispatch and concurrency protection against double-dispatch.
3. **Provider-Neutral Carrier & Service Integration**:
   - Lack of pluggable carrier adapter interface (`CarrierProviderAdapter`).
   - Rate quotation preview (`shipping_quotes`) distinguishing freight, handling, and fuel surcharges.
   - Deterministic adapter (`MockCarrierAdapter`) with timeout recovery and webhook signature verification.
4. **Delivery Runs & Driver Assignment Controls**:
   - Need capacity verification against vehicle payload/volume limits during run creation.
   - Driver assignment validation and prevention of assigning shipments to multiple active runs.
5. **Auditable Proof of Delivery & Partial Delivery Reconciliation**:
   - Reconciling partial delivery quantities against order lines (preventing false "fully delivered" flags).
   - Driver authorization check: rejecting POD updates from unassigned drivers.
   - Idempotent POD recording via `operation_id`.
6. **Reverse Logistics & Return-To-Origin (RTO)**:
   - Delivery failures triggering `RETURNED_TO_ORIGIN` without prematurely restoring inventory.
   - Integration with `ReturnAuthorizationsService` for receiving, inspection, and disposition.
   - Reshipment creation linked to original order without duplicating commercial sales orders.
7. **Logistics Costs & Financial Invariants**:
   - Structured `logistics_charges` preserving currency and integer minor units.
   - Distinguishing customer delivery charges, carrier quotes, confirmed charges, and carrier invoices.
   - Absolute prohibition against logistics directly mutating General Ledger entries or issuing financial refunds.
8. **Configurable Logistics Policies**:
   - Tenant-scoped `logistics_policies` governing cutoff times, carrier eligibility, maximum delivery attempts, required POD evidence, and automatic rescheduling.
9. **Offline Synchronization & Scoped RBAC**:
   - Offline delivery run manifests and POD drafts with conflict resolution.
   - Scoped RBAC permissions registered in `packages/domain/src/rbac.ts`.

---

## 3. Bounded Domain Modules & Schema Changes

### Schema Design (`packages/database/src/schema/logistics.ts`)

1. **`fulfillments`**:
   - `id`, `tenant_id`, `fulfillment_number`, `order_id`, `warehouse_id`, `status` (`PLANNED`, `ALLOCATED`, `PACKING`, `READY_FOR_DISPATCH`, `DISPATCHED`, `COMPLETED`, `HOLD`, `CANCELLED`), `priority`, `delivery_window_start`, `delivery_window_end`, `hold_reason`, `hold_approved_by`, `released_at`, timestamps.
2. **`fulfillment_lines`**:
   - `id`, `tenant_id`, `fulfillment_id`, `order_line_id`, `variant_id`, `sku`, `quantity_allocated`, `quantity_packed`, `quantity_dispatched`.
3. **`carriers`**:
   - `id`, `tenant_id`, `carrier_code`, `name`, `type` (`INTERNAL_FLEET`, `EXTERNAL_CARRIER`, `POSTAL`, `LOCAL_COURIER`), `api_endpoint`, `is_active`, `settings`, timestamps.
4. **`carrier_services`**:
   - `id`, `tenant_id`, `carrier_id`, `service_code`, `name`, `estimated_transit_days`, `is_active`, timestamps.
5. **`shipping_quotes`**:
   - `id`, `tenant_id`, `quote_number`, `service_id`, `cost_minor`, `currency`, `expires_at`, `parameters`, timestamps.
6. **`shipments`**:
   - `id`, `tenant_id`, `shipment_number`, `order_id`, `fulfillment_id`, `warehouse_id`, `carrier_id`, `carrier_service_id`, `run_id`, `stop_id`, `tracking_number`, `label_url`, `status` (`DRAFT`, `READY_FOR_DISPATCH`, `DISPATCHED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED_ATTEMPT`, `EXCEPTION`, `RETURNED_TO_ORIGIN`, `CANCELLED`), `dispatched_at`, `delivered_at`, `cancelled_at`, timestamps.
7. **`shipment_lines`**:
   - `id`, `tenant_id`, `shipment_id`, `fulfillment_line_id`, `variant_id`, `sku`, `quantity`, timestamps.
8. **`shipment_packages`**:
   - `id`, `tenant_id`, `shipment_id`, `package_number`, `tracking_number`, `weight_grams`, `length_cm`, `width_cm`, `height_cm`, `packaging_type`, timestamps.
9. **`shipment_milestones`**:
   - `id`, `tenant_id`, `shipment_id`, `status`, `description`, `location`, `provider_event_id`, `recorded_at`, timestamps.
10. **`logistics_charges`**:
    - `id`, `tenant_id`, `shipment_id`, `charge_type` (`CARRIER_FREIGHT`, `FUEL_SURCHARGE`, `HANDLING_FEE`, `CUSTOMER_DELIVERY_FEE`), `provenance` (`ESTIMATED`, `QUOTED`, `CONFIRMED_ACTUAL`), `amount_minor`, `currency`, `notes`, timestamps.
11. **`logistics_policies`**:
    - `id`, `tenant_id`, `warehouse_id`, `name`, `cutoff_time`, `max_delivery_attempts`, `required_pod_method`, `allow_partial_delivery`, `auto_reschedule`, timestamps.

### Migration Strategy
- Migration: `packages/database/drizzle/0010_calm_logistics.sql`
- Registered in `packages/database/drizzle/meta/_journal.json`.
- Foreign key `tenant_id` references `tenants(id)` with `onDelete: 'restrict'`.

---

## 4. Pure Domain Architecture (`packages/domain/src/logistics.ts`)

Pure business logic engine with **zero external dependencies**:
1. `assertShipmentTransition(from, to)`: Legal lifecycle validation.
2. `validateFulfillmentQuantities(orderLines, fulfillmentLines)`: Ensures allocated/dispatched quantities do not exceed ordered quantities.
3. `reconcileDeliveredQuantities(shipmentLines, deliveredLines)`: Calculates whether order is partially or fully fulfilled.
4. `calculateLogisticsCharges(charges)`: Pure integer summation in minor units.
5. `reconcileProviderMilestones(currentStatus, incomingMilestone)`: Prevents contradictory or out-of-order updates from corrupting shipment history.
6. `evaluateDeliveryAttemptPolicy(policy, attemptCount)`: Determines whether to reschedule or trigger return to origin.

---

## 5. Service Architecture & API Module (`apps/api/src/logistics/`)

1. **`LogisticsFulfillmentService`**:
   - Plans, allocates, packs, and dispatches fulfillment units.
   - Manages fulfillment holds and approvals.
   - Integrates with `OrdersService` and `InventoryService`.
2. **`LogisticsShipmentsService`**:
   - Creates shipments, adds packages, books carrier, generates tracking numbers.
   - Manages state machine transitions, records milestones, and handles webhooks.
   - Enforces double-dispatch prevention and concurrency locks.
3. **`LogisticsCarrierService`**:
   - Pluggable carrier adapter interface (`CarrierProviderAdapter`).
   - Rate quotation, label generation, timeout handling, and webhook verification.
4. **`LogisticsDeliveryService`**:
   - Extends delivery runs with vehicle capacity checks, driver assignment validation, and stop progression.
   - Proof of delivery recording with driver authorization and idempotent completion.
5. **`LogisticsReverseService`**:
   - Return-to-origin processing and reshipment planning without duplicating commercial orders.
   - Handoff to `ReturnAuthorizationsService` for physical receiving and inspection.
6. **`LogisticsChargesService`**:
   - Structured freight and fee recording in integer minor units without mutating GL journals.
7. **`LogisticsController`**:
   - REST endpoints with scoped RBAC guards and tenant validation.

---

## 6. Tenancy, Security & Scoped RBAC

### Scoped Permissions (`packages/domain/src/rbac.ts`)
- `LOGISTICS_FULFILLMENT_VIEW`, `LOGISTICS_FULFILLMENT_MANAGE`
- `LOGISTICS_SHIPMENT_VIEW`, `LOGISTICS_SHIPMENT_MANAGE`, `LOGISTICS_SHIPMENT_DISPATCH`
- `LOGISTICS_CARRIER_MANAGE`
- `LOGISTICS_DELIVERY_RUN_VIEW`, `LOGISTICS_DELIVERY_RUN_MANAGE`, `LOGISTICS_DELIVERY_RUN_DISPATCH`
- `LOGISTICS_DELIVERY_ASSIGN`, `LOGISTICS_DELIVERY_EXECUTE`
- `LOGISTICS_POD_VIEW`, `LOGISTICS_POD_RECORD`
- `LOGISTICS_REVERSE_MANAGE`
- `LOGISTICS_COST_VIEW`, `LOGISTICS_COST_MANAGE`
- `LOGISTICS_POLICY_MANAGE`

### Standard Role Templates
- `WAREHOUSE_DISPATCHER`: Fulfillment planning, packing, shipment dispatch.
- `DELIVERY_DRIVER`: Delivery run view, stop execution, proof of delivery recording.
- `LOGISTICS_MANAGER`: Carriers, delivery runs, holds, reverse logistics, and policy management.

---

## 7. Master Acceptance Scenarios (35 Scenarios)

The test suite in `apps/api/src/logistics/logistics-phase10.spec.ts` covers the 35 mandatory scenarios:
- **Scenarios 1-8**: Fulfillment planning, multi-shipment order splitting, backorders, quantity limit enforcement, no double-consumption on retries, batch/FEFO/serial traceability, discrepancy rejection, packing non-consumption.
- **Scenarios 9-15**: Shipment state transitions, illegal transition rejection, carrier timeout recovery, webhook deduplication, valid milestone processing, contradictory milestone reconciliation, cancellation preservation.
- **Scenarios 16-22**: Delivery run creation, vehicle capacity violation rejection, run dispatch and stop completion, failed delivery with reason, idempotent POD submission, unauthorized driver rejection, partial delivery order status.
- **Scenarios 23-28**: RTO without premature stock restoration, return inspection integration, reshipment without duplicate commercial order, no direct GL mutation/refund, cost distinction (quotes vs charges), landed-cost flow verification.
- **Scenarios 29-35**: Offline delivery sync deduplication, conflicting offline resolution, revoked permission sync rejection, strict tenant isolation across all entities, scoped RBAC enforcement, migration schema integrity, and dangerous pattern audit.

---

## 8. Implementation Workstreams & Schedule

1. **Workstream 1: Baseline Quality Gate & Plan Certification** — Complete.
2. **Workstream 2: Contracts (`@stokrova/contracts`)** — Author `packages/contracts/src/logistics.ts`.
3. **Workstream 3: Database Schema & Migration (`@stokrova/database`)** — Author `packages/database/src/schema/logistics.ts` and migration `0010_calm_logistics.sql`.
4. **Workstream 4: Pure Domain Engine (`@stokrova/domain`)** — Author `packages/domain/src/logistics.ts` and RBAC updates.
5. **Workstream 5: Validation Schemas (`@stokrova/validation`)** — Author `packages/validation/src/logistics.ts`.
6. **Workstream 6: API Services & Integration (`apps/api/src/logistics/`)** — Implement services, adapters, controllers, module.
7. **Workstream 7: Master Acceptance Test Suite** — Implement and verify 35 scenarios in `apps/api/src/logistics/logistics-phase10.spec.ts`.
8. **Workstream 8: Monorepo Quality Gates** — Run typecheck, build, and all tests across the monorepo.
9. **Workstream 9: Dangerous Pattern Audit** — Verify zero floats, tenant isolation, no premature stock restoration, no direct GL mutation.
10. **Workstream 10: Final Documentation & Quality Gate** — Author `PHASE_10_LOGISTICS_AND_DISTRIBUTION_MODEL.md`, `PHASE_10_TEST_COVERAGE.md`, and `PHASE_10_COMPLETION_REPORT.md` concluding with `READY_FOR_PHASE_11`.
