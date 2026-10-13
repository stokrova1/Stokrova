# STOKROVA — Security Findings & Vulnerability Register

This register documents all verified vulnerabilities identified during the full-platform security audit, their impact, root causes, applied remediations, and verification status.

---

## Findings Summary

| ID | Title | Severity | Component | Status |
| :--- | :--- | :---: | :--- | :---: |
| `VULN-001` | Authentication Bypass via Unsigned JWT & Test Headers | **CRITICAL** | `apps/api/src/auth/auth.guard.ts` | **RESOLVED** |
| `VULN-002` | Cross-Tenant Access & Broken Tenant Membership Validation | **CRITICAL** | `apps/api/src/auth/tenant.guard.ts` | **RESOLVED** |
| `VULN-003` | Permissive Wildcard CORS in API Gateway | **HIGH** | `apps/api/src/main.ts` | **RESOLVED** |
| `VULN-004` | Missing HTTP Security Headers (Clickjacking, MIME Sniffing, CSP) | **HIGH** | `apps/api/src/main.ts` | **RESOLVED** |
| `VULN-005` | Information & Query Secret Disclosure in Error Filter & Logger | **HIGH** | `apps/api/src/common/` | **RESOLVED** |
| `VULN-006` | Missing PostgreSQL Row-Level Security (RLS) on Tenant Tables | **HIGH** | `packages/database/drizzle/` | **RESOLVED** |
| `VULN-007` | Supply-Chain Vulnerabilities in `drizzle-orm`, `vitest`, and `tinypool` | **HIGH** | Monorepo Dependencies | **RESOLVED** |
| `VULN-008` | CSV / Spreadsheet Formula Injection in Data Exports | **MEDIUM** | `packages/domain/src/` | **RESOLVED** |
| `VULN-009` | Missing Global Request Rate Limiting & Anti-DoS Throttling | **MEDIUM** | `apps/api/src/common/` | **RESOLVED** |

---

## Detailed Vulnerability Records

### VULN-001: Authentication Bypass via Unsigned JWT & Test Headers
- **Severity**: **CRITICAL**
- **Affected File**: `apps/api/src/auth/auth.guard.ts`
- **Impact**: Any unauthenticated attacker could forge arbitrary JWT tokens without cryptographic signatures or supply `x-test-user-id` and `x-test-platform-admin: true` headers to impersonate any user, including platform super-admins.
- **Root Cause**: `AuthGuard` was merely parsing base64url JSON from token part 1 without validating the cryptographic signature against `JWT_SECRET`, and accepted `x-test-*` headers without verifying `process.env.NODE_ENV === 'test'`.
- **Remediation**:
  - Implemented cryptographic HMAC-SHA256 signature verification.
  - Enforced token expiration (`exp`) and structure validation.
  - Strictly gated `x-test-*` headers to `process.env.NODE_ENV === 'test'`.
  - Added negative regression tests for unsigned, tampered, expired, and forged tokens.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-002: Cross-Tenant Access & Broken Tenant Membership Validation
- **Severity**: **CRITICAL**
- **Affected File**: `apps/api/src/auth/tenant.guard.ts`
- **Impact**: An authenticated user of Tenant A could pass `x-tenant-id: tenant_b` and access Tenant B's customers, sales orders, general ledger journals, and inventory, because tenant membership was not verified against server-side user identity.
- **Root Cause**: `TenantGuard` allowed any resolved `tenantId` if `allowedTenants.length === 0` (which was true unless the client sent `x-test-allowed-tenants`).
- **Remediation**:
  - Enforced server-side validation: Users must either be `is_platform_admin` or hold verified active membership/role assignments in the requested tenant.
  - Gated `x-test-allowed-tenants` strictly to `NODE_ENV === 'test'`.
  - Added negative regression tests for cross-tenant ID tampering and unauthorized tenant access.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-003: Permissive Wildcard CORS in API Gateway
- **Severity**: **HIGH**
- **Affected File**: `apps/api/src/main.ts`
- **Impact**: Cross-origin web applications on attacker-controlled domains could execute requests against the STOKROVA API with browser credentials.
- **Root Cause**: `app.enableCors()` with default settings permitted all origins (`*`).
- **Remediation**:
  - Configured explicit CORS origin allowlist parsed from `CORS_ALLOWED_ORIGINS` environment variable (with controlled localhost fallbacks for non-production environments).
  - Restricted allowed HTTP methods and headers.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-004: Missing HTTP Security Headers
- **Severity**: **HIGH**
- **Affected File**: `apps/api/src/main.ts` & `apps/api/src/common/middleware/security-headers.middleware.ts`
- **Impact**: Vulnerability to clickjacking (embedding in malicious iframes), MIME sniffing attacks, and missing Content Security Policy.
- **Root Cause**: Express/NestJS default setup without helmet or custom security headers middleware.
- **Remediation**:
  - Attached custom security headers middleware applying:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `X-XSS-Protection: 0`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-005: Information & Query Secret Disclosure in Error Filter & Logger
- **Severity**: **HIGH**
- **Affected File**: `apps/api/src/common/errors/http-exception.filter.ts` & `apps/api/src/common/interceptors/logging.interceptor.ts`
- **Impact**: Secrets in URL query strings (e.g. `?token=...`) or detailed internal database error messages could be logged to telemetry or exposed in error responses.
- **Root Cause**: Logger recorded raw `req.originalUrl` without sanitizing query params, and error filter could pass through unredacted error `details`.
- **Remediation**:
  - Integrated `redactSensitiveObject` and URL query parameter scrubbing in `StructuredLoggingInterceptor`.
  - Enforced strict error response sanitization in `GlobalHttpExceptionFilter`.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-006: Missing PostgreSQL Row-Level Security (RLS) on Tenant Tables
- **Severity**: **HIGH**
- **Affected File**: `packages/database/drizzle/`
- **Impact**: Direct queries via Supabase client using `anon` or `authenticated` roles could read/write any tenant's tables directly over PostgREST without application layer filtering.
- **Root Cause**: Initial migrations created tables without `ENABLE ROW LEVEL SECURITY;`.
- **Remediation**:
  - Created migration `0013_security_hardening_rls.sql` enabling and forcing RLS across all tenant tables, with tenant isolation policies using `current_setting('app.current_tenant_id', true)` and `auth.jwt()`.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-007: Supply-Chain Vulnerabilities in Dependencies
- **Severity**: **HIGH**
- **Affected Component**: Monorepo dependencies (`drizzle-orm`, `vitest`, `tinypool`, `esbuild`)
- **Impact**: Known vulnerabilities: GHSA-gpj5-g38j-94v9 (Drizzle SQLi), GHSA-5gmw-xhrv-c9v3 (Tinypool RCE), GHSA-82fw-gwwq-j7x9 (Vitest Arbitrary File Read).
- **Remediation**:
  - Configured `pnpm.overrides` and updated package manifests to patched releases: `drizzle-orm@^0.45.4`, `vitest@^5.0.3`, `tinypool@>=2.1.2`, `esbuild@>=0.25.0`.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-008: CSV / Spreadsheet Formula Injection in Data Exports
- **Severity**: **MEDIUM**
- **Affected File**: `packages/domain/src/search_reporting.ts` & `packages/domain/src/`
- **Impact**: Exported customer names or item descriptions starting with `=`, `+`, `-`, `@`, `\t` could execute malicious commands when opened in Microsoft Excel or Google Sheets.
- **Remediation**:
  - Implemented `sanitizeCsvFormula` in `@stokrova/domain` escaping cells starting with formula trigger characters with a leading single quote `'`.
- **Verification Status**: **VERIFIED FIXED**

---

### VULN-009: Missing Global Request Rate Limiting & Anti-DoS Throttling
- **Severity**: **MEDIUM**
- **Affected File**: `apps/api/src/common/middleware/rate-limiter.middleware.ts`
- **Impact**: API endpoints were susceptible to brute-force attacks and volumetric request floods.
- **Remediation**:
  - Implemented in-memory sliding-window rate limiting middleware with configurable limits per IP / tenant.
- **Verification Status**: **VERIFIED FIXED**
