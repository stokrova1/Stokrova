# STOKROVA Phase 12 — Connector Contracts & Developer API Specification

## 1. Overview

This document specifies the standard API contracts, connector adapter interfaces, and developer platform endpoints introduced in STOKROVA Phase 12.

---

## 2. Developer Platform Endpoints

All developer platform endpoints require tenant-scoped authentication via `TenantGuard`, `AuthGuard`, and `RbacGuard`.

### 2.1 API Keys Management

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/integrations/api-keys` | `INTEGRATION_API_KEYS_MANAGE` | Create new API key. Plaintext returned **once**. |
| `GET` | `/api/v1/integrations/api-keys` | `INTEGRATION_VIEW` | List API keys for the current tenant (masked keys). |
| `POST` | `/api/v1/integrations/api-keys/:id/revoke` | `INTEGRATION_API_KEYS_MANAGE` | Revoke an API key immediately. |
| `POST` | `/api/v1/integrations/api-keys/:id/rotate` | `INTEGRATION_API_KEYS_MANAGE` | Revoke existing key and issue a new raw key. |

#### Request Payload: `CreateDeveloperApiKeyRequest`
```json
{
  "name": "Shopify Fulfillment Bot",
  "scopes": ["orders:read", "inventory:sync"],
  "rate_limit_per_minute": 120,
  "expires_in_days": 90
}
```

#### Response Payload: `CreateDeveloperApiKeyResponse`
```json
{
  "apiKey": {
    "id": "key_e92bf18b-...",
    "tenant_id": "ten_001",
    "name": "Shopify Fulfillment Bot",
    "key_prefix": "ak_live_d819",
    "masked_key": "ak_live_d819****************4a1f",
    "key_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "scopes": ["orders:read", "inventory:sync"],
    "rate_limit_per_minute": 120,
    "expires_at": "2026-11-13T10:00:00.000Z",
    "is_active": true,
    "created_at": "2026-10-13T10:00:00.000Z"
  },
  "raw_api_key": "ak_live_d8194e82b7c6a5d4e3f2b1a09876543210fedcba4a1f"
}
```

---

## 3. Integration Instances Endpoints

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/integrations/connectors` | `INTEGRATION_VIEW` | List available connector catalog definitions. |
| `GET` | `/api/v1/integrations/connectors/:code` | `INTEGRATION_VIEW` | Get specific connector metadata. |
| `POST` | `/api/v1/integrations/instances` | `INTEGRATION_MANAGE` | Create new integration instance (starts in `DRAFT`). |
| `GET` | `/api/v1/integrations/instances` | `INTEGRATION_VIEW` | List instances for the current tenant. |
| `GET` | `/api/v1/integrations/instances/:id` | `INTEGRATION_VIEW` | Get instance details by ID. |
| `PATCH` | `/api/v1/integrations/instances/:id` | `INTEGRATION_CONFIGURE` | Update instance name or configuration parameters. |
| `POST` | `/api/v1/integrations/instances/:id/transition` | `INTEGRATION_ACTIVATE` | Transition instance lifecycle state. |
| `POST` | `/api/v1/integrations/instances/:id/test-connection` | `INTEGRATION_VIEW` | Execute real-time health check on configured instance. |

---

## 4. Credentials & Secret Vault References

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/integrations/instances/:id/credentials` | `INTEGRATION_MANAGE` | Store credential reference. Never leaks raw secret. |
| `GET` | `/api/v1/integrations/instances/:id/credentials` | `INTEGRATION_VIEW` | List credentials with masked secret previews. |
| `POST` | `/api/v1/integrations/credentials/:id/rotate` | `INTEGRATION_MANAGE` | Rotate stored secret value. |

---

## 5. Inbound Webhooks & Synchronization Endpoints

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/integrations/webhooks/inbound` | *(Gateway Signature)* | Ingest and verify inbound webhook event. |
| `GET` | `/api/v1/integrations/webhooks/receipts` | `INTEGRATION_VIEW` | List recent inbound webhook receipts. |
| `POST` | `/api/v1/integrations/instances/:id/sync` | `INTEGRATION_SYNC` | Manually trigger sync run for an instance. |
| `GET` | `/api/v1/integrations/instances/:id/sync-runs` | `INTEGRATION_VIEW` | List execution logs for sync runs. |

---

## 6. Entity & Field Mappings

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/integrations/instances/:id/mappings` | `INTEGRATION_CONFIGURE` | Create external identity mapping. |
| `GET` | `/api/v1/integrations/instances/:id/mappings` | `INTEGRATION_VIEW` | List identity mappings for instance. |
| `POST` | `/api/v1/integrations/instances/:id/field-mappings` | `INTEGRATION_CONFIGURE` | Create declarative field transform rule. |
| `GET` | `/api/v1/integrations/instances/:id/field-mappings` | `INTEGRATION_VIEW` | List field transform rules. |

---

## 7. Reconciliation & Audit Log Endpoints

| HTTP Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/integrations/reconciliation` | `INTEGRATION_VIEW` | List detected entity discrepancies. |
| `POST` | `/api/v1/integrations/reconciliation/:id/resolve` | `INTEGRATION_MANAGE` | Resolve entity discrepancy. |
| `GET` | `/api/v1/integrations/audit-logs` | `INTEGRATION_VIEW` | Query redacted integration audit trail. |
