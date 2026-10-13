# STOKROVA — Phase 12 Implementation Plan
## Integration Hub, External Connectors & Developer Platform

**Project:** STOKROVA Enterprise Business Operations Platform  
**Milestone:** Phase 12 — Integration Hub, External Connectors & Developer Platform  
**Previous Gate:** `READY_FOR_PHASE_12` (Phase 11 completion certified)  
**Target Quality Gate:** `READY_FOR_PHASE_13`  
**Architecture:** Modular Monolith, TypeScript Monorepo, NestJS, PostgreSQL / Drizzle ORM, Vitest, Zod  

---

## 1. Verified Phase 12 Scope from Master Roadmap

The master capability roadmap (`docs/architecture/MASTER_CAPABILITY_MAP.md` and `docs/architecture/PHASE_1_BOUNDARY.md`) establishes Phase 12 as:
**Integration Hub, External Connectors & Developer Platform**.

Phase 12 builds upon:
- Phase 1: Tenancy, Scoped RBAC, Audit, Outbox, Redis, Idempotency.
- Phase 2: Inventory Core, Materialized Balances & Stock Ledger.
- Phase 3: Sales Orders, POS Checkout, Multi-Tender Payments.
- Phase 4: Procurement, Receiving, Landed Cost & 3-Way Matching.
- Phase 5: Manufacturing, BOM, Material Consumption & Genealogy.
- Phase 6: General Ledger, Double-Entry Posting, AR/AP & Fiscal Periods.
- Phase 7: Multi-Entity Consolidation, Intercompany & Treasury.
- Phase 8: Advanced Pricing, Promotions, Loyalty & Rebates.
- Phase 9: CRM, Customer Segments, Campaigns & Consent Ledger.
- Phase 10: Advanced Logistics, Fulfillment, Shipments & Carrier Adapters.
- Phase 11: Enterprise Reporting, Central Metric Dictionary & Dashboards.

### Core Architectural Principle
> **"External systems integrate with STOKROVA's business domains; they do not create competing sources of truth."**
- External platforms never write directly to PostgreSQL stock balances or ledger tables.
- External webhook retries never duplicate payments, orders, or journal entries.
- External customer data imports never manufacture marketing consent.

---

## 2. Existing Capabilities & Contracts to Reuse

1. **Authentication & Tenancy:**
   - `TenantGuard`, `AuthGuard`, `RbacGuard`.
   - Multi-tenant data isolation (`tenant_id` scoping).
2. **Transactional Outbox & Idempotency:**
   - `IdempotencyService`, `OutboxService`, deterministic UUIDv7 identities.
3. **Existing Integrations Module:**
   - `WebhooksService` (outbound webhook subscriptions, HMAC-SHA256 signing, delivery attempts, dead-letter queue, exponential backoff, circuit breaker).
   - `ConsolidationService`, `InterCompanyService`, `DocumentEngineService`, `NotificationsService`.
4. **Logistics Carrier Adapters:**
   - `LogisticsCarrierService`, `ICarrierAdapter`, shipment tracking updates.
5. **Commerce & Orders Services:**
   - `OrdersService`, `PosService`, `PaymentsService`.
6. **Domain Math & Validation:**
   - Pure integer minor units (`BigInt` / numeric string), basis points ($10,000 = 100.00\%$), constant-time string equality.

---

## 3. Gaps Requiring Implementation in Phase 12

1. **Integration Registry & Lifecycle Engine:**
   - Connector Catalog (`CONNECTOR_DEFINITIONS`) with capability flags.
   - Tenant-scoped `IntegrationInstance` state machine:
     `DRAFT → CONFIGURED → VALIDATING → ACTIVE → SUSPENDED → DISCONNECTED`.
   - Health checks, heartbeat timestamps, and last successful sync tracking.
2. **Connector Extension Contracts:**
   - Type-safe, versioned connector contracts for Commerce (`ICommerceConnector`), Payments (`IPaymentConnector`), Carriers (`ICarrierConnector`), Accounting (`IAccountingConnector`), and Custom Webhooks (`IWebhookConnector`).
   - Deterministic test adapters / fakes for all connector types.
3. **Developer Platform & Scoped API Key Management:**
   - Secure generation of API keys (`ak_live_...`, `ak_test_...`).
   - Hashed secret storage (SHA-256), one-time plaintext reveal, expiration, granular RBAC scopes, rate limiting, and instant revocation.
4. **Credential Reference Service & Secret Protection:**
   - Zero plaintext credentials stored in database or application logs.
   - Safe masking (`****...`) in DTOs and administrative views.
   - SSRF defense engine: rigorous URL validation blocking private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254` AWS/GCP metadata), invalid schemes, and embedded userinfo.
5. **Inbound Webhook Gateway:**
   - Signature verification (HMAC-SHA256, Stripe `t=...,v1=...`, GitHub `sha256=...`).
   - Replay window verification and deduplication by provider event ID.
   - Tenant context derivation from verified endpoint, never trusted blindly from unverified JSON payload.
   - Payload limits (1MB maximum) and asynchronous processing dispatch.
6. **Outbound Webhook Outbox Delivery:**
   - Envelopes with stable UUIDv7 event IDs, ISO 8601 timestamps, signatures, and correlation IDs.
   - Asynchronous network dispatch decoupled from database transactions.
7. **Synchronization, Identity Mappings & Conflict Policies:**
   - External identity mapping table (`integration_entity_mappings` linking external IDs to internal entities).
   - Configurable field mapping & transformations without dynamic code evaluation or eval.
   - Directional sync: `IMPORT`, `EXPORT`, `BIDIRECTIONAL`.
   - Conflict policies: `STOKROVA_WINS`, `EXTERNAL_WINS`, `MANUAL_REVIEW`, `NEWEST_VERSION`.
   - Sync execution tracking (`integration_sync_runs` with processed, accepted, rejected, skipped counts, cursor checkpoints).
8. **Reconciliation Engine:**
   - Discrepancy detection between external records and internal state (`integration_reconciliations`).
9. **Integration Audit & Administration:**
   - Dedicated integration audit events for configuration changes, credential rotations, test runs, and sync replays.

---

## 4. Domain and Module Boundaries

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        IntegrationsController                          │
│        (Registry, Instances, Credentials, Webhooks, Sync, Mappings)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼─────────────────────┐ ┌───────▼─────────────────────┐ ┌───────▼─────────────────────┐
│ IntegrationRegistrySvc  │ │  DeveloperPlatformService   │ │    WebhookGatewayService    │
│  - Connector catalog    │ │   - API key generation      │ │   - Inbound verification    │
│  - Instance lifecycle   │ │   - Secret hashing (SHA256) │ │   - Signature & replay check│
│  - Health checks        │ │   - Scopes & Revocation     │ │   - Outbound signed delivery│
└───┬─────────────────────┘ └─────────────────────────────┘ └───────┬─────────────────────┘
    │                                                               │
    ├───────────────────────────────┬───────────────────────────────┤
    │                               │                               │
┌───▼─────────────────────┐ ┌───────▼─────────────────────┐ ┌───────▼─────────────────────┐
│  IntegrationSyncService │ │ CredentialReferenceService  │ │  ReconciliationService      │
│   - Field transformations│ │   - Secret masking          │ │   - External vs Internal    │
│   - Conflict policies   │ │   - SSRF protection         │ │   - Discrepancy detection   │
│   - External ID mapping │ │   - Safe rotation           │ │   - Unreconciled queues     │
└───┬─────────────────────┘ └─────────────────────────────┘ └─────────────────────────────┘
    │
┌───▼────────────────────────────────────────────────────────────────────┐
│                  STOKROVA Authoritative Domain Services                │
│    (OrdersService, PaymentsService, StockLedgerService, Shipments)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Proposed Data Model & Migration Sequence

### Migration: `0012_integration_hub.sql` (Index 12)
Tables to introduce:
1. `integration_instances`: Tenant-owned connection instances with lifecycle status (`DRAFT`, `CONFIGURED`, `VALIDATING`, `ACTIVE`, `SUSPENDED`, `DISCONNECTED`), connector code, company/branch scope, config JSON.
2. `developer_api_keys`: API keys with hashed key (`sha256`), prefix, masked display, allowed scopes, rate limits, expiration, revoked status.
3. `integration_credentials`: Encrypted/referenced secrets associated with an instance, rotation timestamps, masked values.
4. `integration_entity_mappings`: Bi-directional identity links (`tenant_id`, `integration_instance_id`, `entity_type`, `external_id`, `internal_id`, `sync_status`).
5. `integration_sync_runs`: Audit records of sync executions (`status`, `records_processed`, `records_accepted`, `records_rejected`, `records_skipped`, `cursor_checkpoint`, `started_at`, `completed_at`).
6. `inbound_webhook_receipts`: Deduplicated log of inbound webhooks (`provider`, `provider_event_id`, `status`, `received_at`, `payload_hash`).
7. `integration_reconciliations`: Discrepancy reports comparing internal vs external entity states.
8. `integration_field_mappings`: Field translation rules for entity types.

---

## 6. Integration Security & Tenancy Model

1. **Tenant Isolation:** Every integration, credential reference, webhook receipt, mapping, and sync run is strictly bound to `tenant_id`. Cross-tenant querying is rejected at guard and service levels.
2. **SSRF Defense Engine:** `validateExternalEndpointUrl` strictly rejects:
   - Loopback / localhost (`127.0.0.1`, `::1`, `localhost`).
   - Private IP addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Link-local and cloud metadata IPs (`169.254.169.254`, `fe80::/10`).
   - Non-HTTP/HTTPS protocols (`file:`, `ftp:`, `gopher:`, `ssh:`).
   - URLs containing embedded basic auth credentials (`user:pass@host`).
3. **Secret Protection:**
   - Raw API key secrets are returned exactly once upon creation.
   - Plaintext keys are never stored in PostgreSQL or logged.
   - Keys are hashed with SHA-256 before persistence.
4. **Scoped RBAC:**
   - Granular permissions: `integration.view`, `integration.manage`, `integration.configure`, `integration.activate`, `integration.disable`, `integration.sync.execute`, `integration.sync.retry`, `integration.mapping.manage`, `integration.webhook.manage`, `integration.webhook.replay`, `integration.reconciliation.view`, `integration.credentials.rotate`, `integration.api_keys.manage`, `integration.audit.view`.
   - Role templates: `INTEGRATION_ADMIN`, `INTEGRATION_OPERATOR`, `API_INTEGRATION_CLIENT`.

---

## 7. Event, Webhook, Retry & Reconciliation Design

1. **Inbound Webhook Verification:**
   - Validates HMAC signatures against integration instance shared secret.
   - Replay window check: timestamp within 300 seconds of current system time.
   - Deduplication: Unique index on `(tenant_id, provider, provider_event_id)` rejects replayed events gracefully with status `DUPLICATE_IGNORED`.
2. **Outbound Delivery:**
   - Persisted via transactional outbox before network call.
   - Signed with HMAC-SHA256 (`t=...,v1=...` or `sha256=...`).
   - Bounded retries with exponential backoff and pseudo-jitter.
   - Circuit breaker trips after 5 consecutive failures with 5-minute cool-off.
3. **Reconciliation:**
   - Scheduled or on-demand comparison of external order/inventory states with STOKROVA records.
   - Unreconciled discrepancies are flagged in an audit queue without mutating financial or inventory ledgers.

---

## 8. Representative External Connectors

1. **E-Commerce Storefront (`ECOMMERCE_SHOPIFY` / `ECOMMERCE_GENERIC`):**
   - Inbound order import, mapping customer and line items to `OrdersService`.
   - Outbound stock level sync, export order fulfillment status.
2. **Payment Provider (`PAYMENT_STRIPE` / `PAYMENT_GENERIC`):**
   - Webhook processing for `payment_intent.succeeded` and `charge.refunded`.
   - Idempotent capture validation, preventing duplicate payment recording.
3. **Carrier & Logistics (`CARRIER_FEDEX` / `CARRIER_GENERIC`):**
   - Inbound webhook for tracking updates, advancing shipment status through existing state machine.
4. **Accounting & ERP (`ACCOUNTING_QUICKBOOKS` / `ERP_GENERIC`):**
   - Export posted journal entries, invoice reconciliation.
5. **Developer Webhook Subscriber (`CUSTOM_WEBHOOK`):**
   - Configurable outgoing webhook subscriber with secret rotation, test dispatch, and DLQ replay.

---

## 9. Master Acceptance Scenarios (45 Scenarios)

1. Register and validate supported connector definition in catalog.
2. Reject invalid connector configuration before activation.
3. Activate and suspend integration instance through authorized state transitions.
4. Prevent one tenant from viewing or mutating another tenant's integration instance.
5. Validate connector capability restrictions and version compatibility.
6. Verify connector failure does not destabilize core API.
7. Create scoped external API credential (API key) with SHA-256 hash.
8. Ensure plaintext credentials are never persisted in DB or telemetry.
9. Reject expired, revoked, malformed, or insufficiently scoped credentials.
10. Prevent API access outside authorized tenant and scope.
11. Verify credential rotation and instant revocation.
12. Confirm SSRF URL validator blocks loopback, private IPs, and cloud metadata.
13. Accept authenticated, valid inbound webhook.
14. Reject invalid signature or authentication failure.
15. Reject expired or replayed inbound webhook outside time window.
16. Deduplicate identical inbound webhook delivered repeatedly.
17. Reject oversized or malformed payloads (>1MB).
18. Prevent untrusted payload `tenant_id` from hijacking tenant context.
19. Handle out-of-order webhook delivery without corrupting domain state.
20. Persist outbound event through transactional outbox.
21. Deliver outbound webhook asynchronously without holding DB transaction open.
22. Verify signed outbound delivery with stable event identifier.
23. Simulate destination timeouts and retries without duplicating business transaction.
24. Suspend endpoint and verify delivery stops with circuit breaker.
25. Reprocess dead-letter delivery with complete audit trail.
26. Import identical external record twice without creating duplicate internal entity.
27. Validate external record against internal domain contract before creating entity.
28. Reject invalid, ambiguous, or unsafe field mappings.
29. Process incremental synchronization with cursor checkpointing.
30. Recover partially failed synchronization without losing progress or duplicating work.
31. Detect conflict when external record is older than internal authoritative state.
32. Verify sensitive financial or inventory operations cannot bypass authoritative services.
33. Confirm external customer import does not fabricate marketing consent.
34. Import external sales order idempotently through authoritative sales workflow.
35. Handle ambiguous payment provider timeout without duplicating capture or refund.
36. Verify provider notifications cannot directly mutate posted general ledger entries.
37. Ensure external stock data cannot directly overwrite inventory ledger or projections.
38. Ensure logistics integrations use existing shipment state machine.
39. Ensure pricing, discounts, and rebates preserve domain invariants during import.
40. Enforce per-provider and per-tenant concurrency limits.
41. Recover integration worker after transient network failure.
42. Prevent invalid mapping from triggering unbounded retry loop.
43. Verify external payloads and credentials are redacted from logs and errors.
44. Verify configuration, credential rotation, and sync audit events.
45. Validate migration integrity, uniqueness, foreign keys, and typecheck across monorepo.

---

## 10. Performance, Security & Operational Risks

- **SSRF Risk:** User-provided webhook or API endpoints could target cloud metadata or internal network services. Mitigated with `validateExternalEndpointUrl` performing strict IP/host allowlisting and blocklisting.
- **Credential Leakage:** Mitigated by SHA-256 hashing API keys, returning secret only upon creation, masking stored secrets, and excluding secrets from logging.
- **Thundering Herd / Retry Storms:** Mitigated by exponential backoff with pseudo-random jitter and circuit breakers.
- **Data Corruption:** Mitigated by enforcing that all external records flow through established domain services (`OrdersService`, `StockLedgerService`, `PaymentsService`).
