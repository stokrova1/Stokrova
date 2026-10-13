# Reference Analysis: InvenTree

## 1. Overview
- **Repository**: `Inventree/Inventree`
- **Stack**: Python, Django, PostgreSQL, React, REST API
- **License**: MIT

## 2. Useful Domain Concepts to Adopt
- **Clean Part / Variant Hierarchy**: Excellent data model separating part definition, variant attributes, and sellable/stockable items.
- **Location & Sub-Location Topology**: Warehouses structured hierarchically (Warehouse -> Zone -> Shelf/Bin).
- **Stock Tracking Semantics**: Stock Item status lifecycle, quantity tracking, and stock split/merge workflows.
- **Developer Guidelines & Tooling**: Clean API documentation and well-structured plugin architecture.

## 3. Ideas to Reject
- **Server-Centric Synchronization**: InvenTree assumes continuous server connectivity via Django REST API. It lacks an offline-first outbox synchronization engine.
- **Django ORM Runtime**: We use Drizzle ORM and NestJS in TypeScript for unified monorepo typing across backend, web, desktop, and mobile.

## 4. Key Takeaway for STOKROVA
InvenTree provides the clearest domain model for part variants, categories, and hierarchical warehouse locations. We implement these patterns natively in Drizzle schema with offline outbox capability.
