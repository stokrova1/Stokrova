# STOKROVA — Tenancy Architecture & Isolation Model

## 1. Tenancy Hierarchy

STOKROVA establishes a multi-tenant hierarchy designed to scale from a single-register kiosk to multinational multi-company enterprises:

```text
Platform (SaaS Operator Level)
  └── Tenant (Top-level billing & data boundary)
        └── Company / Legal Entity (Tax entity, accounting base currency)
              └── Branch (Physical operating location)
                    └── Department (Cost center / business unit)
                          └── Warehouse (Physical fulfillment node)
                                └── Storage Location (Aisle / Shelf / Bin)
```

---

## 2. Tenant Context Resolution

Client applications never dictate the tenant boundary. Every authenticated HTTP request, offline synchronization batch, or background worker executes inside a cryptographically verified `TenantContext`:

```typescript
export interface TenantContext {
  tenant_id: string;
  company_id?: string;
  branch_id?: string;
  user_id?: string;
  roles?: string[];
  permissions?: string[];
  scope?: 'tenant' | 'company' | 'branch' | 'warehouse';
}
```

### Resolution Flow:
1. `SupabaseAuthGuard` verifies the incoming JWT and extracts the authenticated subject ID (`sub`).
2. `TenantGuard` extracts the requested tenant scope from headers (`x-tenant-id`) or routing parameters.
3. The guard queries `tenant_memberships` in the database to verify the user has an active membership (`status = 'ACTIVE'`) in that exact tenant.
4. If unauthorized, a `403 Forbidden` (`AUTH_FORBIDDEN` / `TENANT_ACCESS_DENIED`) is returned immediately.
5. Once verified, the request is stamped with `req.tenantContext` and made available to controllers and domain commands via `@CurrentTenant()`.

---

## 3. Database Isolation Controls

Every tenant-owned table in PostgreSQL includes:
- `tenant_id varchar(36) not null references tenants(id) on delete cascade`
- Compound indexes for fast, isolated querying: `index('idx_entity_tenant').on(table.tenant_id, ...)`
- Invariant application query filters ensuring `where(eq(table.tenant_id, tenantContext.tenant_id))` is applied defensively on all read/write repositories.
