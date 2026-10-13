# OpenBoxes Reference Architecture & Capability Analysis

## 1. System Identity & Overview
- **Repository**: `https://github.com/openboxes/openboxes`
- **Architecture**: Groovy / Grails / Spring / Hibernate / MySQL / GSP server-rendered pages.
- **License**: Eclipse Public License 2.0 (EPL-2.0)
- **Primary Domain**: Warehouse Logistics, Storage Locations, Regulated Goods, Expiry Management, and Supply Chains.

---

## 2. Core Capabilities & Observed Architecture

### Capability A: Granular Warehouse Storage Topography
- **Reference Behavior**: Models warehouse layouts down to specific bin identifiers within zones, aisles, and racks.
- **Evidence**: `grails-app/domain/org/pih/warehouse/core/Location.groovy` and `LocationGroup` model physical and logical spaces.
- **Limitation**: Hibernate relational mappings create N+1 query patterns when rendering inventory lists across large warehouse hierarchies.
- **STOKROVA Decision**: Implement an 8-tier location model (`Tenant → Company → Branch → Warehouse → Zone → Aisle → Rack → Shelf → Bin`) using Drizzle ORM and materialized path indexing.
- **Reason**: Provides identical physical precision while eliminating ORM join latency.

### Capability B: First Expired, First Out (FEFO) Picking & Lot Tracking
- **Reference Behavior**: Warehouse pick lists prioritize batches based on earliest expiration date.
- **Evidence**: `grails-app/domain/org/pih/warehouse/inventory/InventoryItem.groovy` pairs lot numbers with mandatory expiration dates.
- **Limitation**: Tightly coupled to institutional pharmaceutical requisition forms; cannot be toggled off for non-perishable goods without code changes.
- **STOKROVA Decision**: Implement FEFO picking as a configurable domain strategy, dynamically activated by the `CAP_LOT_EXPIRY` capability flag.
- **Reason**: Delivers hospital-grade expiry discipline to businesses handling perishable goods without burdening hardware or apparel merchants.

### Capability C: Inter-Facility Transfers & In-Transit Visibility
- **Reference Behavior**: Dispatched shipments remain visible as assets in an in-transit virtual facility until received and reconciled.
- **Evidence**: `grails-app/domain/org/pih/warehouse/shipping/Shipment.groovy` maintains transit statuses (`PENDING`, `SHIPPED`, `PARTIALLY_RECEIVED`, `RECEIVED`).
- **Limitation**: Transit discrepancies require heavy administrative intervention and lack automated variance ledger movements.
- **STOKROVA Decision**: Model in-transit goods in a designated virtual location, paired with automated `TRANSIT_LOSS` and `TRANSIT_DAMAGE` movement ledger entries upon destination intake.
- **Reason**: Guarantees accounting balance preservation and complete financial auditability for multi-branch transit.
