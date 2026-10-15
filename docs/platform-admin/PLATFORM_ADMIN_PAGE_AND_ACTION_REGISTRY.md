# STOKROVA Platform Founder Console — Page, View & Action Registry

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Role:** Platform Founder / Super Administrator (`is_platform_admin: true`)  
**Portal URI:** `/admin/?mode=FOUNDER`  
**Base API Endpoint:** `/v1/platform-admin`

---

## 1. Top-Level Platform Dashboard Views

```
┌────────────────────────────────────────────────────────────────────────┐
│  👑 PLATFORM FOUNDER CONSOLE • Global Ecosystem Administration         │
├────────────────────────────────────────────────────────────────────────┤
│  [1. Telemetry & KPI Cards]                                            │
│  ├── Total Registered Businesses                                      │
│  ├── Active Subscriptions                                              │
│  ├── Suspended Accounts                                                │
│  ├── Aggregated Platform MRR                                           │
│  └── Infrastructure Health (DB Pool & Auth Status)                    │
├────────────────────────────────────────────────────────────────────────┤
│  [2. Enrolled Business Organizations (Tenants) Directory]              │
│  ├── Search (Name / Slug / Owner Email)                               │
│  ├── Status Filter (All / Active / Suspended / Archived)              │
│  ├── Table Columns: Organization, Plan, Created, Status, Actions       │
│  └── Row Actions: Inspect Details, Suspend, Reactivate, Change Plan    │
├────────────────────────────────────────────────────────────────────────┤
│  [3. Platform User Accounts & Security Identities]                     │
│  ├── Table Columns: Name, Email, Role, Business Association, Status    │
│  └── Actions: Inspect User, Suspend User, Reactivate User              │
├────────────────────────────────────────────────────────────────────────┤
│  [4. SaaS Plans & Subscription Tiers Matrix]                           │
│  ├── Starter Tier ($99/mo)                                             │
│  ├── Commerce Pro Tier ($499/mo)                                       │
│  └── Enterprise Logistics Tier ($1,999/mo)                             │
├────────────────────────────────────────────────────────────────────────┤
│  [5. Infrastructure Telemetry & Cryptographic Audit Proofs]            │
│  ├── Supabase PostgreSQL Pool State & Latency (ms)                     │
│  ├── CRDT Event Bus & Outbox Lag Counter                               │
│  ├── Cryptographic Merkle Tamper Seal Verification                    │
│  └── Multi-Tenant Isolation / RLS Active Status                        │
├────────────────────────────────────────────────────────────────────────┤
│  [6. Administrative Action Modals]                                     │
│  ├── Enroll New Business Client Modal                                  │
│  ├── Business Organization Inspection Modal                            │
│  └── Confirm Suspension with Mandatory Reason Modal                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Action & Interaction Registry

### 2.1 Overview & Metrics
| Action / Control | Trigger | Capability Required | API Endpoint & Method | DB Source of Truth | Visual States & Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fetch Platform KPIs** | View load / Refresh button | `platform.overview.view` | `GET /v1/platform-admin/overview` | `public.tenants`, `public.companies`, `public.memberships` | • Loading: Skeleton card pulses<br>• Success: Formatted currency and counts<br>• Error: Error badge with retry prompt |
| **Inspect System Health** | Periodic poll (30s) / On Demand | `platform.health.view` | `GET /v1/platform-admin/health` | PostgreSQL `pg_stat_activity`, Supabase Auth ping | • Latency badge: `< 50ms` green, `> 200ms` amber<br>• DB Pool: Active/idle counts shown honestly |

### 2.2 Enrolled Business Registry (Tenants)
| Action / Control | Trigger | Capability Required | API Endpoint & Method | DB Source of Truth | Visual States & Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Businesses** | Page navigation / Search input | `platform.businesses.view` | `GET /v1/platform-admin/businesses?search=&status=&page=&limit=` | `public.tenants` JOIN `companies`, `branches`, `memberships` | • Loading: Table spinner<br>• Empty: Honest empty state ("No businesses found matching query")<br>• Error: Alert banner |
| **Inspect Business** | Click "Inspect" button | `platform.businesses.view` | `GET /v1/platform-admin/businesses/:id` | `public.tenants`, `companies`, `branches`, `audit_events` | • Opens inspection modal<br>• Shows registered branches, company records, primary owner, and audit log history |
| **Enroll Business** | Submit "Enroll Business" form | `platform.businesses.view` | `POST /v1/tenancy/provision` | `public.tenants`, `companies`, `branches`, `users`, `memberships` | • Validates inputs client + server<br>• Modal closes on 201 Created<br>• Toast: "Business provisioned successfully"<br>• Table auto-refreshes |
| **Suspend Business** | Click "Suspend" -> Modal Confirm | `platform.businesses.suspend` | `POST /v1/platform-admin/businesses/:id/suspend` `{ reason: string }` | `public.tenants.status = 'SUSPENDED'`, writes `public.audit_events` | • Disables button while pending<br>• Enforces mandatory reason (min 5 chars)<br>• Toast: "Business [name] suspended"<br>• Status badge updates to amber "SUSPENDED" |
| **Reactivate Business**| Click "Reactivate" -> Confirm | `platform.businesses.reactivate`| `POST /v1/platform-admin/businesses/:id/reactivate` `{ reason: string }` | `public.tenants.status = 'ACTIVE'`, writes `public.audit_events` | • Disables button while pending<br>• Toast: "Business [name] reactivated"<br>• Status badge updates to green "ACTIVE" |
| **Update SaaS Tier** | Select Tier in dropdown | `platform.businesses.tier` | `PATCH /v1/platform-admin/businesses/:id/tier` `{ tier: string }` | `public.tenants` (or metadata) | • Confirms change with server before updating UI display |

### 2.3 Platform User Management
| Action / Control | Trigger | Capability Required | API Endpoint & Method | DB Source of Truth | Visual States & Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Users** | Tab switch / Page load | `platform.users.view` | `GET /v1/platform-admin/users?search=&role=&status=` | `public.users` LEFT JOIN `public.memberships`, `public.tenants` | • Shows all genuine platform users<br>• Displays business association badge |
| **Suspend User** | Click "Suspend User" | `platform.users.suspend` | `POST /v1/platform-admin/users/:id/suspend` `{ reason: string }` | `public.users.is_active = false`, writes `public.audit_events` | • Immediate server validation<br>• Updates status badge to SUSPENDED |
| **Reactivate User** | Click "Reactivate User" | `platform.users.reactivate` | `POST /v1/platform-admin/users/:id/reactivate` `{ reason: string }` | `public.users.is_active = true`, writes `public.audit_events` | • Immediate server validation<br>• Updates status badge to ACTIVE |

### 2.4 Administrative Audit Trail
| Action / Control | Trigger | Capability Required | API Endpoint & Method | DB Source of Truth | Visual States & Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Query Audit Log** | Founder Audit tab / Tenant inspect | `platform.audit.view` | `GET /v1/platform-admin/audit?limit=50` | `public.audit_events` | • Displays chronological log of administrative events<br>• Shows actor ID, event type, timestamp, and audit payload |

---

## 3. Truthful Feedback Guarantees

1. **Zero Optimistic Deception:** No button updates to "Active" or "Suspended" until the backend database transaction has completed (`COMMIT`) and returned HTTP 200.
2. **True Error Attribution:** If database connection drops or a conflict occurs, the error message from the backend is rendered cleanly in the notification toast or modal error banner.
3. **Honest Empty States:** When there are no businesses or no matching search results, the view explicitly displays "No registered businesses found" with actionable guidance rather than a blank table or mock data.
