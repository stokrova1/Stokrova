# ADR-014: Scoped Dynamic RBAC and Custom Roles

## Status
Accepted

## Context
Hard-coding user roles (e.g. `users.role = 'cashier'`) fails to support real-world businesses where:
1. Small business owners perform multiple roles simultaneously.
2. Large enterprises require specialized roles with organizational boundaries (e.g., Cashier only at Branch Lagos Register 02, or Regional Manager across 3 branches).
3. Businesses need to define custom roles with granular permissions without code changes.

## Decision
Adopt a dynamic, scoped authorization hierarchy:
```text
Identity (Supabase Auth)
  -> Membership (Tenant / Company)
    -> Role Assignment
        ├── Role (Template or Custom)
        ├── Permissions (Granular capability flags)
        └── Scope (Tenant, Company, Branch, Warehouse, Register, Work Center)
```
Platform Super Admins (SaaS operators) are separated from Tenant Admins (business owners).

## Consequences
- Granular, location-bound permissions prevent unauthorized inter-branch access.
- Businesses can configure role templates or define bespoke operational roles dynamically.
