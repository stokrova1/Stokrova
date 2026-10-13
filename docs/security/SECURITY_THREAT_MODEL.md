# STOKROVA — Enterprise Security Threat Model

## 1. Threat Modeling Methodology

This threat model uses the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) mapped to the OWASP Top 10 (2025) and OWASP API Security Top 10 standards.

---

## 2. Core Assets & Security Invariants

| Asset Class | Key Invariant | Impact if Compromised |
| :--- | :--- | :--- |
| **Tenant Isolation** | No tenant may view, query, or mutate another tenant's records under any circumstance. | Critical breach of enterprise privacy and confidentiality. |
| **Financial Ledgers** | General Ledger journal entries and posted financial lines are immutable. Receipts are not financial truth. | Financial fraud, regulatory non-compliance, tax penalties. |
| **Inventory Truth** | Physical inventory balances are computed strictly as the mathematical sum of authorized movement ledger lines. | Inventory shrinkage, phantom stock, stockouts. |
| **Payment Integrity** | Payment transactions must be strictly idempotent. Replays cannot duplicate captures or refunds. | Financial loss, duplicate customer billing, chargeback disputes. |
| **API Credentials** | Developer API keys and external integration tokens must never exist in plaintext in database or logs. | Full account takeover and lateral movement across external providers. |
| **Audit Trails** | All security, lifecycle, and financial operations generate immutable append-only audit entries. | Inability to establish non-repudiation or forensic evidence. |

---

## 3. STRIDE Threat Analysis Matrix

### 3.1 Spoofing (Identity & Authentication)
- **Threat T-01**: Attacker crafts forged JWT with `is_platform_admin: true` to bypass authorization.
  - *Mitigation*: Cryptographic signature verification with HMAC-SHA256 (`JWT_SECRET`), validation of `iss`, `aud`, and `exp` claims. Test header bypass strictly restricted to `NODE_ENV === 'test'`.
- **Threat T-02**: Attacker spoofs inbound webhook events claiming to be Stripe or Shopify.
  - *Mitigation*: HMAC-SHA256 signature verification with shared secret, anti-replay timestamp window (300 seconds), and idempotency deduplication.

### 3.2 Tampering (Data & Integrity)
- **Threat T-03**: Client submits crafted order payload with negative price or overridden discount.
  - *Mitigation*: Server-side authoritative recalculation of prices, discounts, and taxes. Client totals are strictly ignored.
- **Threat T-04**: Client modifies protected properties (`tenant_id`, `created_by`, `status`) via mass assignment.
  - *Mitigation*: Strict Zod validation schemas stripping unpermitted fields; DTO allowlists in all controllers.

### 3.3 Repudiation
- **Threat T-05**: User performs unauthorized financial adjustment or deletes stock record and denies action.
  - *Mitigation*: Immutable append-only audit logging (`audit_events` and `integration_audit_logs`) recording actor ID, timestamp, and redacted state snapshot. Deletion of financial records is physically disallowed by domain invariants.

### 3.4 Information Disclosure
- **Threat T-06**: Frontend production bundles contain database connection strings or Supabase service-role keys.
  - *Mitigation*: Zero frontend secrets. Service-role keys and database passwords are restricted to backend environment variables. Automated secret scanner in CI.
- **Threat T-07**: API error responses reveal internal SQL queries, file paths, or stack traces.
  - *Mitigation*: `GlobalHttpExceptionFilter` sanitizes error details, replacing internal exceptions with generic user-friendly messages and correlation `requestId`.
- **Threat T-08**: Multi-tenant data leakage via missing Row-Level Security in Supabase PostgreSQL.
  - *Mitigation*: Database migration `0013_security_hardening_rls.sql` enables and forces RLS on all tenant-owned tables with tenant isolation policies.

### 3.5 Denial of Service (DoS)
- **Threat T-09**: Attacker floods API with large payloads or expensive unindexed queries.
  - *Mitigation*: Global rate limiting middleware, 1MB payload body size limit, query pagination ceilings, and query index optimization.
- **Threat T-10**: Attacker triggers infinite webhook retry storms.
  - *Mitigation*: Bounded retry budgets with exponential backoff and jitter, idempotent receipt caching.

### 3.6 Elevation of Privilege
- **Threat T-11**: Authenticated cashier manipulates `x-tenant-id` header to read another tenant's store data.
  - *Mitigation*: `TenantGuard` enforces tenant membership verification against authenticated user identities. Cross-tenant access is blocked with 403 Forbidden.
- **Threat T-12**: SSRF attack targeting internal metadata (`169.254.169.254`) or internal services (`127.0.0.1`, `10.0.0.0/8`).
  - *Mitigation*: `validateExternalEndpointUrl` blocks all non-HTTP/HTTPS URLs, embedded userinfo, private IP ranges, loopback addresses, and cloud metadata endpoints.
