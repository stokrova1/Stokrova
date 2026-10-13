# STOKROVA — Authorization Architecture & Dynamic Scoped RBAC

## 1. Principles

1. **Capability-Oriented**: Authorization evaluates capabilities rather than hard-coded roles. Code never performs `if (role === 'admin')` checks.
2. **Dynamic Scopes**: Access is granted within an explicit operational boundary:
   - `tenant`: Full tenant-wide authority.
   - `company`: Restricted to a specific legal entity.
   - `branch`: Restricted to a specific physical branch or store.
   - `warehouse`: Restricted to a specific fulfillment or inventory center.
3. **Decoupled Identity**: Identity comes from Supabase Auth; authorization is determined strictly within STOKROVA's `roles`, `permissions`, and `role_permissions` schema.

---

## 2. Capability Model

Permissions follow the standard `action:subject` convention:
- `inventory:read`, `inventory:adjust`, `inventory:transfer`
- `catalog:create`, `catalog:update`, `catalog:delete`
- `orders:create`, `orders:void`, `orders:discount`
- `payments:process`, `payments:refund`
- `audit:read`, `security:manage`

### Schema Mapping:
```text
users (id)
  └── tenant_memberships (tenant_id, user_id)
        └── user_roles (membership_id, role_id, scope_type, scope_id)
              └── roles (id, name)
                    └── role_permissions (role_id, permission_id)
                          └── permissions (id, code, description)
```

---

## 3. Enforcement Layers

1. **Declarative Decorators**:
   ```typescript
   @RequirePermissions('warehouse:create')
   @RequireScope('branch')
   @Post('/warehouses')
   async createWarehouse(@Body() dto: CreateWarehouseDto) { ... }
   ```
2. **RbacGuard**: Intercepts the request, evaluates the user's effective permissions for the requested resource and scope ID, and rejects unauthorized access with `403 Forbidden` (`AUTH_FORBIDDEN`).
3. **Domain Invariants**: Application services verify contextual ownership before executing critical commands (e.g. verifying that a destination warehouse belongs to the current tenant).
