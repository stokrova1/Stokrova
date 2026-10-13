# ADR-020: Multi-Tenancy and Database Security Isolation Model

## Status
Accepted

## Context
STOKROVA is a multi-tenant business operating platform serving diverse clients from solo merchants to multi-branch enterprises. Data isolation between tenants is an absolute security boundary. A breach or leak of financial, inventory, customer, or audit data across tenants would violate the platform's core architectural contract.

We evaluated three primary multi-tenancy models for PostgreSQL:
1. **Database-Per-Tenant**: Separate physical or logical databases for each tenant.
2. **PostgreSQL Row Level Security (RLS) with Session Variables**: Single shared database where every SQL statement executes under `SET LOCAL app.current_tenant_id = '...'`.
3. **Application-Level Tenancy with Relational Constraints & Defensive Query Boundaries**: Single shared database with explicit `tenant_id` foreign keys, composite indexes, and strict application-level tenant context resolution.

## Decision
We adopt **Application-Level Tenancy with Relational Constraints and Defensive Query Boundaries**, complemented by:
1. Every tenant-owned table explicitly includes `tenant_id varchar(36) not null references tenants(id) on delete cascade`.
2. Compound indexes `(tenant_id, ...)` are required on all tenant tables for index-level query separation and high performance.
3. Every authenticated request is validated through `SupabaseAuthGuard` and `TenantGuard`, establishing a trusted `TenantContext`. The client cannot specify or override `tenantId` in payloads to access unauthorized resources.
4. Database queries executed by the API use connection pooling managed by Drizzle ORM, with repositories defensively scoping every query by `where(eq(table.tenant_id, tenantContext.tenant_id))`.
5. Direct client access to the PostgreSQL database is strictly prohibited; clients communicate solely with the STOKROVA API.

## Alternatives Considered
- **Database-Per-Tenant**: Rejected due to high operational complexity, slow migrations across hundreds of databases, and inefficient connection pooling on serverless/cloud environments.
- **Pure PostgreSQL RLS**: While offering database-engine guarantees, RLS introduces fragile session state in connection pools (`SET LOCAL` leakage risks), complex permission bypasses when background jobs run, and reduced visibility into query plans.

## Consequences
- **Positive**: High query throughput, unified migrations via Drizzle ORM, seamless connection pooling, clear application-level audit logging, and consistent multi-entity scoping (`tenant -> company -> branch`).
- **Negative**: Developers must ensure that all queries and repository methods include the `tenant_id` filter. To mitigate this risk, automated tenant isolation tests (`tenant.guard.spec.ts` and `warehouse.service.spec.ts`) verify that cross-tenant access attempts are rejected.
