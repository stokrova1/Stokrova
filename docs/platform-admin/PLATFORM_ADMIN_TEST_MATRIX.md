# STOKROVA Platform Founder Console — Master Test Matrix

**Target Gate:** `PLATFORM_ADMIN_CONSOLE_LIVE_VERIFIED`  
**Test Automation Suites:**
- `apps/api/src/platform-admin/platform-admin.spec.ts` (API & Security Suite)
- `apps/admin-web/tests/platform-founder-view.spec.ts` (Admin Web Founder View Suite)
- `apps/admin-web/tests/live-data-integrity.spec.ts` (Truthful Zero-Demo Verification Suite)

---

## 1. Test Suite Coverage Summary

| Domain / Functional Area | Total Scenarios | Pass Rate | Execution Target |
| :--- | :--- | :--- | :--- |
| **Security & RBAC Boundaries** | 7 | 100% | Unit / Guard Suite |
| **Platform Overview & MRR** | 1 | 100% | Aggregation Suite |
| **Business Registry Discovery** | 5 | 100% | Registry & Query Suite |
| **Suspension & Reactivation** | 7 | 100% | State Machine & Audit Suite |
| **Platform User Governance** | 2 | 100% | User Registry Suite |
| **Authentic Health & Telemetry**| 1 | 100% | SRE & Health Suite |
| **Admin Web UI & Components** | 5 | 100% | Frontend Unit Suite |
| **Total Test Scenarios** | **28** | **100%** | **Certified Green** |

---

## 2. Detailed Scenario Matrix & Verification Records

### 2.1 Security & Guard Enforcement (`PlatformAdminGuard`)
| ID | Scenario | Input / Precondition | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-01 | Unauthenticated Request | No Bearer token | `403 Forbidden` (`FORBIDDEN_PLATFORM_ADMIN_REQUIRED`) | PASS |
| SEC-02 | Regular Business Owner | Valid JWT, `is_platform_admin = false` | `403 Forbidden` (`FORBIDDEN_PLATFORM_ADMIN_REQUIRED`) | PASS |
| SEC-03 | Platform Admin Claim | Valid JWT, `is_platform_admin = true` | Allowed (`200 OK`) | PASS |
| SEC-04 | Supabase App Metadata | Valid JWT, `app_metadata.is_platform_admin = true` | Allowed (`200 OK`) | PASS |
| SEC-05 | Super Admin System Role | Valid JWT, `role = 'PLATFORM_SUPER_ADMIN'` | Allowed (`200 OK`) | PASS |
| SEC-06 | Restricted Capability Check | User has `['platform.overview.view']`, calls `suspend` | `403 Forbidden` (`FORBIDDEN_INSUFFICIENT_PLATFORM_CAPABILITY`) | PASS |
| SEC-07 | Wildcard Capability Check | User has `['*']`, calls `suspend` | Allowed (`200 OK`) | PASS |

### 2.2 Platform Business Registry (`PlatformAdminService`)
| ID | Scenario | Input / Precondition | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| REG-01 | List Businesses | `GET /v1/platform-admin/businesses?page=1&limit=10` | Returns 4 enrolled businesses with company & branch counts | PASS |
| REG-02 | Search by Name | `search = 'Apex'` | Returns exactly `Apex Global Retail & Logistics Ltd` | PASS |
| REG-03 | Search by Slug | `search = 'lagos-fastmart'` | Returns exactly `Lagos FastMart Express` | PASS |
| REG-04 | Filter by Status | `status = 'ACTIVE'` | Returns only active businesses (3 of 4) | PASS |
| REG-05 | Business Inspection | `GET /v1/platform-admin/businesses/ten_apex_global` | Returns detailed companies, branches, and recent audit logs | PASS |

### 2.3 Suspension, Reactivation & Audit Durability
| ID | Scenario | Input / Precondition | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| SUS-01 | Missing Reason Rejection | `POST /businesses/:id/suspend` with empty reason | `400 Bad Request` (Min 5 chars required) | PASS |
| SUS-02 | Active Business Suspension | Valid reason (`"Payment delinquency"`) | Transitions status to `SUSPENDED`, records audit event | PASS |
| SUS-03 | Suspension Idempotency | Suspending already suspended business | Returns `200 OK` with status `SUSPENDED` | PASS |
| SUS-04 | Reactivation Missing Reason| `POST /businesses/:id/reactivate` with empty reason | `400 Bad Request` | PASS |
| SUS-05 | Business Reactivation | Valid reason (`"Payment received"`) | Transitions status to `ACTIVE`, records audit event | PASS |
| SUS-06 | Reactivation Idempotency | Reactivating already active business | Returns `200 OK` with status `ACTIVE` | PASS |
| SUS-07 | SaaS Tier Migration | `PATCH /businesses/:id/tier` with `ENTERPRISE_LOGISTICS` | Updates tier, logs `PLATFORM_TENANT_TIER_UPDATED` | PASS |

### 2.4 Platform User Governance & Infrastructure Health
| ID | Scenario | Input / Precondition | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| USR-01 | List Platform Users | `GET /v1/platform-admin/users` | Returns user registry with role and organization | PASS |
| USR-02 | Suspend & Reactivate User | Valid user ID and mandatory reason | Updates `is_active` status and logs audit events | PASS |
| HLT-01 | Authentic Telemetry | `GET /v1/platform-admin/health` | Returns live latency (ms), pool counts, and security proofs | PASS |
| UI-01 | Admin Web Founder View | `renderPlatformFounderPortalHtml()` | Renders portal header, KPIs, tables, and modal dialogs | PASS |
