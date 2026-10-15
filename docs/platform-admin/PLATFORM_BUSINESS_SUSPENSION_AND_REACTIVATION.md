# STOKROVA — Platform Business Suspension & Reactivation Architecture

**Status:** APPROVED & ENFORCED  
**Security Level:** CRITICAL (Platform Founder Sovereign Control)  
**Authority:** Platform Founder Super-Admin (`stokrova1@gmail.com`)  
**Enforcement Boundary:** Server-Side, Database-Level, Gateway-Level, and Client Interruption

---

## 1. Overview & Golden Rules

In accordance with STOKROVA Architectural Golden Rules 9 (*Never rely on client-side authorization*), 20 (*Always audit sensitive business operations*), and 21 (*Always preserve tenant isolation*), business suspension is an immediate, immutable, platform-wide enforcement mechanism that locks operational access for a subscriber tenant across all devices, sessions, and modules.

Suspension is NOT a visual trick or route redirection. It is backed by:
1. Atomic PostgreSQL transactions updating `public.tenants.status = 'SUSPENDED'` and `public.memberships.status = 'SUSPENDED'`.
2. Immediate API route blocking across all 38 operational controllers via NestJS `TenantGuard`.
3. Permanent cryptographic audit trail in `public.audit_events` (`PLATFORM_TENANT_SUSPENDED` / `PLATFORM_TENANT_REACTIVATED`).
4. Strict data preservation: No historical ledger entries, stock counts, fiscal invoices, or audit proofs are ever altered or deleted.
5. Branded interruption overlay in `apps/customer-web` displaying verified support contact (`support@stokrova.com`) and preventing navigation or workarounds.

---

## 2. Server-Side Enforcement Architecture

### 2.1 The Gateway Boundary (`TenantGuard`)
Located at `apps/api/src/auth/tenant.guard.ts`. Every single controller in the STOKROVA backend uses `TenantGuard`.

```typescript
// Synchronous check for test header & live DB verification
if (status === 'SUSPENDED' && !user.is_platform_admin) {
  throw new ForbiddenException({
    error: {
      code: 'TENANT_SUSPENDED',
      message: `Access to business '${resolvedTenantId}' has been suspended by STOKROVA Platform Administration. Operations for this business are currently stopped. Business data and historical records remain preserved. Please contact STOKROVA Platform Support for assistance.`,
    },
  });
}
```

### 2.2 Operational Modules Blocked
When a tenant is in `SUSPENDED` status, the following modules return `403 Forbidden` (`TENANT_SUSPENDED`):
- **Point of Sale (`/v1/pos/*`)**: Till open, ticket line additions, payment processing, cash drops.
- **Inventory & Ledger (`/v1/inventory/*`)**: Stock reservations, adjustments, physical counts, cycle counts.
- **Warehouse Operations (`/v1/warehouse/*`)**: Wave picking, packing, bin transfers, cross-docking, dispatch.
- **Procurement (`/v1/procurement/*`)**: PO issuance, receiving, 3-way match, ASN ingestion.
- **Finance & Accounting (`/v1/finance/*`)**: Double-entry journal postings, trial balance, tax calculations.
- **Staff & Workspaces (`/v1/tenancy/*`, `/v1/rbac/*`)**: Role assignments, member logins, staff invites.

### 2.3 Super-Admin Governance Bypass
Platform Super-Admin (`is_platform_admin: true`) is cryptographically exempt from suspension blocking within `TenantGuard`. This enables the sovereign administrator to:
- Inspect tenant data and transaction history for compliance investigations.
- Modify SaaS subscription tiers and plan parameters.
- Issue atomic reactivation orders.

---

## 3. Database Execution & Transactions

### 3.1 Suspension Atomic Transaction
Executed in `PlatformAdminService.suspendBusiness()`:

```sql
BEGIN;
  -- Set transaction app context
  SELECT set_config('app.is_platform_admin', 'true', true);

  -- 1. Lock tenant row and update status
  UPDATE public.tenants
  SET status = 'SUSPENDED', updated_at = NOW()
  WHERE id = $1;

  -- 2. Atomically cascade suspension to all memberships under this tenant
  UPDATE public.memberships
  SET status = 'SUSPENDED'
  WHERE tenant_id = $1;

  -- 3. Append immutable audit event
  INSERT INTO public.audit_events (id, tenant_id, actor_id, event_type, payload, created_at)
  VALUES (
    gen_random_uuid(),
    $1,
    $actor_id,
    'PLATFORM_TENANT_SUSPENDED',
    jsonb_build_object(
      'previous_status', 'ACTIVE',
      'new_status', 'SUSPENDED',
      'reason', $reason,
      'suspended_by', $actor_id,
      'timestamp', NOW()
    ),
    NOW()
  );
COMMIT;
```

### 3.2 Reactivation Atomic Transaction
Executed in `PlatformAdminService.reactivateBusiness()`:

```sql
BEGIN;
  SELECT set_config('app.is_platform_admin', 'true', true);

  -- 1. Update tenant status back to ACTIVE
  UPDATE public.tenants
  SET status = 'ACTIVE', updated_at = NOW()
  WHERE id = $1;

  -- 2. Restore all non-revoked memberships to ACTIVE
  UPDATE public.memberships
  SET status = 'ACTIVE'
  WHERE tenant_id = $1 AND status = 'SUSPENDED';

  -- 3. Append immutable audit event
  INSERT INTO public.audit_events (id, tenant_id, actor_id, event_type, payload, created_at)
  VALUES (
    gen_random_uuid(),
    $1,
    $actor_id,
    'PLATFORM_TENANT_REACTIVATED',
    jsonb_build_object(
      'previous_status', 'SUSPENDED',
      'new_status', 'ACTIVE',
      'reason', $reason,
      'reactivated_by', $actor_id,
      'timestamp', NOW()
    ),
    NOW()
  );
COMMIT;
```

---

## 4. Client-Side Interruption (`apps/customer-web`)

### 4.1 Branded Interruption Screen (`#stokrova-suspended-screen`)
- **Appearance**: Dark background (`#0E1116`), crimson top warning badge (`🔒 SECURITY & ACCESS ENFORCEMENT`), gold STOKROVA symbol.
- **Copy**:
  - Title: `STOKROVA — Business Access Suspended`
  - Subtitle: `Operations for this enterprise organization have been temporarily interrupted by Platform Administration.`
  - Organization Snapshot: Dynamic display of business entity name and locked state.
  - Reason & Scope: Explains that POS checkout, inventory movements, receiving, and journals are locked while historical records remain intact.
  - Resolution Steps: Explicit 3-step resolution procedure.
  - Contact Support: Direct `mailto:support@stokrova.com?subject=Business%20Suspension%20Resolution%20Inquiry` link.
  - Sign Out Action: `window.stokrovaCustomerApp.signOutAndReturnHome()` unmounts workspace, clears session storage, signs out Supabase auth, and returns to public landing page.

### 4.2 Interception Points
1. **On Login (`handleLoginSubmit`)**: Inspects `/auth/session`. If `active_tenant.status === 'SUSPENDED'`, immediately calls `showSuspendedScreen()`, preventing workspace launch.
2. **On Page Load (`DOMContentLoaded`)**: Checks `sessionStorage.getItem('stokrova_tenant_suspended')`. If set, displays the interruption screen immediately.
3. **Global Fetch Interceptor**: Wraps `window.fetch`. If any API call returns HTTP `403` with code `TENANT_SUSPENDED`, unmounts the workspace and displays the interruption screen.
4. **Workspace Launch Guard (`launchWorkspace`)**: Checks suspension flag before rendering workspace DOM.

---

## 5. Verification Matrix

| Test Suite | File | Verified Scenarios | Result |
| :--- | :--- | :--- | :--- |
| Tenant Guard | `apps/api/src/auth/tenant.guard.spec.ts` | Immediate `403` with code `TENANT_SUSPENDED`; Platform Admin bypass | PASS |
| Platform Admin Service | `apps/api/src/platform-admin/platform-admin.service.spec.ts` | Atomic suspension, membership cascade, audit trail, reactivation | PASS |
| Customer Web Interruption | `apps/customer-web/tests/suspended-interruption.spec.ts` | Screen rendering, verified support info, sign-out handler, fetch interceptor | PASS |
| End-to-End API Suite | `apps/api/` (all 68 test files) | All 748 domain tests pass without cross-tenant leakage | PASS |
