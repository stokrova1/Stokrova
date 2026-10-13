# STOKROVA — Security Deployment & Hardening Checklist

This checklist verifies all security controls, environment settings, and hardening measures required for production deployment.

---

## 1. Environment & Secret Management

- [x] **Zero Plaintext Secrets in Repository**: No `.env` files containing live secrets are tracked in Git.
- [x] **Mandatory Environment Variables in Production**:
  - `NODE_ENV=production`
  - `DATABASE_URL`: Strong, unique password, SSL enabled (`sslmode=require`).
  - `JWT_SECRET`: Cryptographically strong random key (minimum 32 characters).
  - `SUPABASE_SERVICE_ROLE_KEY`: Secured in backend server environment only; never exposed to clients.
  - `STORAGE_SECRET_ACCESS_KEY`: Secured in backend server environment.
- [x] **Safe Configuration Logging**: `sanitizeConfig` is active, masking credentials before logging.

---

## 2. API Gateway & Network Security

- [x] **Strict CORS Policy**: `CORS_ALLOWED_ORIGINS` explicitly defined (no wildcard `*` with credentials).
- [x] **HTTP Security Headers Enforced**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [x] **Rate Limiting**: Sliding-window rate limiting enabled globally and on authentication endpoints.
- [x] **Payload Body Limits**: Maximum payload size constrained to 1MB.

---

## 3. Authentication & Tenant Authorization

- [x] **Cryptographic JWT Signature Verification**: All bearer tokens cryptographically verified using HMAC-SHA256.
- [x] **Token Expiry Enforced**: Expired tokens rejected with 401 Unauthorized.
- [x] **Tenant Boundary Validation**: `TenantGuard` verifies actor tenant membership; cross-tenant access rejected with 403 Forbidden.
- [x] **Scoped RBAC Evaluation**: Capability checks verified per operation and operational scope.
- [x] **Test Bypass Headers Disabled in Production**: `x-test-*` headers strictly ignored when `NODE_ENV === 'production'`.

---

## 4. Database & Storage Hardening

- [x] **PostgreSQL Row-Level Security (RLS)**: RLS enabled and forced on all tenant tables (`0013_security_hardening_rls.sql`).
- [x] **Parameterized Queries**: All queries execute with parameterized bindings (zero string concatenation in SQL).
- [x] **Storage Bucket Permissions**: S3/R2 buckets private; downloads operate via short-lived signed URLs.
- [x] **Immutable Audit Tables**: Audit logs are append-only.

---

## 5. Integrations & External Webhooks

- [x] **HMAC-SHA256 Webhook Verification**: Constant-time signature comparison for inbound webhooks.
- [x] **Anti-Replay Window**: 300-second timestamp tolerance window enforced.
- [x] **Idempotent Webhook Deduplication**: Inbound webhooks indexed by `(tenant_id, provider, event_id)` preventing duplicate processing.
- [x] **SSRF Defense Filter**: URL destinations validated against private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), and cloud metadata (`169.254.169.254`).

---

## 6. Software Supply Chain & CI/CD

- [x] **Dependency Vulnerability Scan**: All known critical and high vulnerabilities resolved.
- [x] **Lockfile Integrity**: `pnpm-lock.yaml` synchronized and verified.
- [x] **Automated Secret Scanning**: Pre-commit and CI secret scanning active.
