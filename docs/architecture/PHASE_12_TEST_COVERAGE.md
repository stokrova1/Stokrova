# STOKROVA Phase 12 — Test Coverage & Acceptance Report

## 1. Test Suite Summary

Phase 12 is verified by a multi-layered test matrix spanning pure domain unit tests, schema validation suites, and end-to-end master acceptance tests.

| Suite | Target | Test Count | Pass Rate | Execution Time |
| :--- | :--- | :---: | :---: | :---: |
| **Domain Engine** | `packages/domain/tests/integration_hub.spec.ts` | 25 | 100% | 33ms |
| **Validation Engine** | `packages/validation/tests/integration_hub.spec.ts` | 14 | 100% | 23ms |
| **Master Acceptance** | `apps/api/src/integrations/integrations-phase12.spec.ts` | 48 | 100% | 877ms |
| **Total Phase 12 Tests** | **All Layers** | **87** | **100%** | **< 1.0s** |

---

## 2. Master Acceptance Scenarios Breakdown (48/48 Passed)

### Section 1: Connector Catalog & Registry (Scenarios 1–5)
- **Scenario 1**: Returns all 10 standard connectors with categories and capabilities (`PASS`).
- **Scenario 2**: Retrieves individual connector metadata by code (`PASS`).
- **Scenario 3**: Throws 404 on non-existent connector code (`PASS`).
- **Scenario 4**: Performs connector health check reporting latency and status (`PASS`).
- **Scenario 5**: Validates connector configuration schemas rejecting invalid parameters (`PASS`).

### Section 2: Developer Platform & API Key Management (Scenarios 6–10)
- **Scenario 6**: Generates `ak_live_` prefixed key, returns plaintext once, stores SHA-256 hash (`PASS`).
- **Scenario 7**: Verifies valid API key against hash and rejects invalid secret (`PASS`).
- **Scenario 8**: Lists tenant API keys showing masked preview and never exposing hash or plaintext (`PASS`).
- **Scenario 9**: Revokes API key transitioning status and failing subsequent verifications (`PASS`).
- **Scenario 10**: Enforces sliding rate limiting by throwing BadRequestException when threshold exceeded (`PASS`).

### Section 3: Credential Reference & Secret Masking (Scenarios 11–13)
- **Scenario 11**: Stores credential reference with masked preview and SHA-256 fingerprint (`PASS`).
- **Scenario 12**: Rotates credential updating fingerprint and preview (`PASS`).
- **Scenario 13**: Never leaks secret values under credential listing or lookup queries (`PASS`).

### Section 4: Integration Instance Lifecycle & SSRF Defense (Scenarios 14–18)
- **Scenario 14**: Creates integration instance in `DRAFT` state with tenant isolation (`PASS`).
- **Scenario 15**: Supports valid lifecycle transitions (`DRAFT` -> `CONFIGURED` -> `VALIDATING` -> `ACTIVE` -> `SUSPENDED`) (`PASS`).
- **Scenario 16**: Throws error on illegal lifecycle transitions (e.g., `DRAFT` directly to `ACTIVE`) (`PASS`).
- **Scenario 17**: Blocks SSRF attempts targeting loopback, RFC 1918 LAN, and cloud metadata (`PASS`).
- **Scenario 18**: Allows legitimate public HTTPS API endpoints (`PASS`).

### Section 5: Inbound Webhook Gateway, Replay & Deduplication (Scenarios 19–24)
- **Scenario 19**: Accepts valid HMAC-SHA256 inbound webhook and records receipt (`PASS`).
- **Scenario 20**: Rejects invalid or tampered signature with 401 Unauthorized (`PASS`).
- **Scenario 21**: Rejects webhook timestamp older than 300s replay window (`PASS`).
- **Scenario 22**: Returns cached idempotent receipt on duplicate `event_id` without reprocessing (`PASS`).
- **Scenario 23**: Rejects inbound payload exceeding 1MB size limit (`PASS`).
- **Scenario 24**: Enforces tenant isolation on webhook receipt lookups (`PASS`).

### Section 6: Bidirectional Sync, Field Mapping & Conflict Resolution (Scenarios 25–30)
- **Scenario 25**: Records bidirectional identity mapping between STOKROVA and external system (`PASS`).
- **Scenario 26**: Resolves conflict with `STOKROVA_WINS` preserving internal record (`PASS`).
- **Scenario 27**: Resolves conflict with `EXTERNAL_WINS` applying external updates (`PASS`).
- **Scenario 28**: Throws ConflictException when `MANUAL_REVIEW` policy requires human review (`PASS`).
- **Scenario 29**: Executes field transformation pipeline (`DIRECT`, `ENUM_MAP`, `CURRENCY_MINOR`, `BASIS_POINTS`) (`PASS`).
- **Scenario 30**: Tracks sync run lifecycle with checkpoints and processed counts (`PASS`).

### Section 7: Reconciliation & Discrepancy Auditing (Scenarios 31–34)
- **Scenario 31**: Detects state discrepancies between internal entities and external systems (`PASS`).
- **Scenario 32**: Resolves discrepancy marking record as `RESOLVED` (`PASS`).
- **Scenario 33**: Marks matched records without discrepancies as `MATCHED` (`PASS`).
- **Scenario 34**: Filters reconciliations by status (`PASS`).

### Section 8: Integration Audit Logging & Redaction (Scenarios 35–37)
- **Scenario 35**: Generates immutable audit log entry for integration operations (`PASS`).
- **Scenario 36**: Automatically redacts sensitive fields (tokens, secrets, passwords) in audit payload (`PASS`).
- **Scenario 37**: Enforces strict multi-tenant isolation on audit log queries (`PASS`).

### Section 9: End-to-End Connector Ingestion (Scenarios 38–42)
- **Scenario 38**: Ingests Shopify order webhook, mapping external IDs and validating schema (`PASS`).
- **Scenario 39**: Ingests WooCommerce order mapping line items and pure integer minor-unit prices (`PASS`).
- **Scenario 40**: Ingests Stripe payment event without direct General Ledger mutation (`PASS`).
- **Scenario 41**: Ingests FedEx tracking webhook without bypassing logistics domain (`PASS`).
- **Scenario 42**: Ingests DHL tracking status and maps tracking number (`PASS`).

### Section 10: Zero-Bypass Domain Invariants & Security Boundaries (Scenarios 43–45)
- **Scenario 43**: Inbound integrations cannot directly post General Ledger journal entries (`PASS`).
- **Scenario 44**: Webhook retries and duplicate transmissions are strictly idempotent (`PASS`).
- **Scenario 45**: Integration credentials and API keys are zero-plaintext in storage and telemetry (`PASS`).

### Section 11: Controller Integration & HTTP Endpoints (3 tests)
- Exposes catalog endpoints through controller (`PASS`).
- Exposes API key management and revocation through controller (`PASS`).
- Exposes instance lifecycle transitions and connection testing through controller (`PASS`).
