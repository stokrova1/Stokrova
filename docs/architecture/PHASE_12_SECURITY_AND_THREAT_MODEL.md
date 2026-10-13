# STOKROVA Phase 12 — Security Architecture & Threat Model

## 1. Security Architecture Principles

Integrations connect STOKROVA to the outside world, creating a high-value attack surface if unhardened. Phase 12 implements defense-in-depth across six core security dimensions:

1. **Zero Domain Bypass**: External data cannot directly write to General Ledger journals, bypass inventory validation, or force invalid transaction states.
2. **Server-Side Request Forgery (SSRF) Defense**: Outbound connection URLs are strictly scrutinized against malicious loopback, internal network, and metadata targets.
3. **Zero-Plaintext Credential Storage**: Plaintext secrets and API keys are NEVER persisted, logged, or returned in list APIs.
4. **Anti-Replay & Webhook Tamper Resistance**: Inbound webhooks require cryptographically verified HMAC-SHA256 signatures and strict timestamp replay windows.
5. **Denial-of-Service (DoS) & Abuse Mitigation**: Sliding 60-second window rate limiting and strict 1MB payload caps.
6. **Strict Multi-Tenant Isolation**: Tenant boundary checks on all credentials, instances, mappings, webhooks, and audit logs.

---

## 2. SSRF Threat Defense Specification

### 2.1 Threat Vector
An adversary provides an external webhook destination or API endpoint pointing to internal infrastructure:
- `http://169.254.169.254/latest/meta-data/` (AWS/GCP Instance Metadata theft)
- `http://127.0.0.1:5432/` (PostgreSQL local port scanning)
- `http://10.0.0.1/admin` or `http://192.168.1.1/` (Internal network exploration)
- `ftp://internal-server/` or `file:///etc/passwd` (Protocol smuggling)

### 2.2 Mitigation: Pure Domain SSRF Filter (`validateExternalEndpointUrl`)
The filter executes deterministic protocol and IP checks:
- Permitted protocols: Only `https:` and `http:` (rejects `file:`, `ftp:`, `gopher:`, etc.).
- Embedded credentials: URLs containing userinfo (`admin:pass@host`) are strictly rejected.
- Loopback prevention: Rejects `localhost`, `127.0.0.1`, `127.x.x.x`, `0.0.0.0`, `::1`.
- RFC 1918 Private IPv4 prevention: Rejects `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- Cloud metadata prevention: Rejects `169.254.0.0/16` (link-local and metadata IPs).

---

## 3. Credential & Key Lifecycle Threat Model

| Threat | Vulnerability Mechanism | Phase 12 Mitigation |
| :--- | :--- | :--- |
| **Database dump leak** | Plaintext API keys stored in database | API keys stored as SHA-256 hashes (`computeSha256Hash`). Plaintext revealed once upon creation and never stored. |
| **Telemetry / Log leakage** | Secrets logged in audit trail or monitoring | Automatic redaction via `redactSensitiveObject`. Keywords (`secret`, `token`, `key`, `password`) replaced with `[REDACTED]`. |
| **Credential sniffing** | Admin screen showing cleartext credentials | Passwords and API secrets rendered with masked preview (e.g. `ak_live_d819****************4a1f`) using `maskSecret`. |
| **Timing side-channel attack** | Non-constant time string equality comparison | HMAC-SHA256 signatures compared using `constantTimeEquals` ($O(N)$ constant time) preventing timing oracle attacks. |
| **Replay attacks** | Re-sending captured webhook request | 300-second timestamp tolerance window (`isWithinReplayWindow`) combined with idempotent dedup index. |
| **Cross-tenant data access** | Tenant A querying Tenant B integration instances | Composite indices on `(tenant_id, id)` and enforced tenant context in all service queries. |

---

## 4. RBAC Matrix for Integrations

Phase 12 introduces granular scoped permissions across 3 system roles:

| Permission | `INTEGRATION_ADMIN` | `INTEGRATION_OPERATOR` | `API_INTEGRATION_CLIENT` |
| :--- | :---: | :---: | :---: |
| `INTEGRATION_VIEW` | Yes | Yes | Yes |
| `INTEGRATION_MANAGE` | Yes | No | No |
| `INTEGRATION_CONFIGURE` | Yes | Yes | No |
| `INTEGRATION_ACTIVATE` | Yes | No | No |
| `INTEGRATION_SYNC` | Yes | Yes | Yes |
| `INTEGRATION_API_KEYS_MANAGE` | Yes | No | No |
