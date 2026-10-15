# STOKROVA Platform Admin Security & Row-Level Security (RLS) Audit

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Classification:** Application Security, Cryptographic Gating & Access Control  
**Security Tier:** Sovereign Platform Boundary (Tier 1)  
**Evaluator:** Principal Security Architect & Release Engineer

---

## 1. Security Architecture & Threat Model

The Platform Founder Console holds sovereign operational control over the STOKROVA multi-tenant platform. The threat model addresses three primary attack vectors:

1. **Privilege Escalation by Tenant Users:** A Business Owner or staff member attempting to call platform founder APIs to view other tenants or suspend competitor accounts.
2. **Context Bleed / Pool Hijacking:** A connection reused from the database pool retaining platform admin privileges during a subsequent tenant-scoped query.
3. **Audit Log Tampering / Repudiation:** An administrative actor attempting to modify or delete historical suspension records.

---

## 2. Authentication & Guard Enforcement Pipeline

All requests directed to `/v1/platform-admin/*` pass through a deterministic three-stage security pipeline:

```
 Incoming Request
       │
       ▼
 [Stage 1: AuthGuard]
 ├── Validates RFC 7519 JWT signature via Supabase JWKS / Secret.
 ├── Extracts claims: user_id, email, app_metadata, is_platform_admin.
 └── Rejects forged or missing tokens -> 401 Unauthorized.
       │
       ▼
 [Stage 2: PlatformAdminGuard]
 ├── Verifies: user.is_platform_admin === true OR 
 │             user.app_metadata.is_platform_admin === true OR
 │             user.role === 'PLATFORM_SUPER_ADMIN'.
 └── Rejects regular Business Owners / Staff -> 403 Forbidden.
       │
       ▼
 [Stage 3: Capability Verification]
 ├── Inspects @RequirePlatformCapability(code) metadata.
 ├── If user has restricted capabilities array, verifies required code.
 └── Rejects unauthorized capabilities -> 403 Forbidden.
       │
       ▼
 Target Controller Handler Executed
```

---

## 3. Database Row-Level Security (RLS) Verification

### 3.1 Policy Specifications
| Table | RLS Policy Name | Permitted Scope | Evaluation Expression |
| :--- | :--- | :--- | :--- |
| `public.tenants` | `tenants_isolation_policy` | Tenant Users | `id = current_setting('app.current_tenant_id', true)` |
| `public.tenants` | `tenants_platform_admin_bypass` | Platform Founder | `current_setting('app.is_platform_admin', true) = 'true'` |
| `public.companies` | `companies_isolation_policy` | Tenant Users | `tenant_id = current_setting('app.current_tenant_id', true)` |
| `public.companies` | `companies_platform_admin_bypass` | Platform Founder | `current_setting('app.is_platform_admin', true) = 'true'` |
| `public.branches` | `branches_isolation_policy` | Tenant Users | `tenant_id = current_setting('app.current_tenant_id', true)` |
| `public.branches` | `branches_platform_admin_bypass` | Platform Founder | `current_setting('app.is_platform_admin', true) = 'true'` |
| `public.audit_events` | `audit_append_only` | All Authenticated | `FOR INSERT WITH CHECK (true)` — `UPDATE` and `DELETE` strictly forbidden |

### 3.2 Context Boundary Guarantees
- The platform admin setting (`SELECT set_config('app.is_platform_admin', 'true', true)`) is executed with `is_local = true`. It is scoped strictly to the executing transaction and is completely wiped upon transaction completion.
- Pool recycling tests confirm that a subsequent connection checked out by standard tenant requests evaluates `current_setting('app.is_platform_admin', true)` as `NULL` or `'false'`.

---

## 4. Audit Trail Cryptographic Immutability

1. **Append-Only Invariant:** No SQL `UPDATE` or `DELETE` statements exist for `public.audit_events`. Postgres RLS grants `SELECT` and `INSERT` privileges only.
2. **Payload Completeness:** Every administrative action captures actor ID, IP address, timestamp, previous entity state, target entity state, and the mandatory human reason.
3. **Cryptographic Sealing:** Platform events participate in the STOKROVA Merkle tamper chain verification, ensuring that any external database mutation would immediately break the hash validation chain.
