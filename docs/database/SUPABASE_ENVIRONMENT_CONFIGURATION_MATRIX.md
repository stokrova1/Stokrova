# STOKROVA — Supabase & Monorepo Environment Configuration Matrix

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Milestone:** Database & Identity Production Readiness  
**Target Gate:** `SUPABASE_PLATFORM_CONNECTIVITY_VERIFIED`  
**Security & DevOps Authority:** Antigravity Autonomous Security Engineering  
**Revision:** 1.0.0-PROD-CERTIFIED  
**Date:** October 14, 2026  

---

## 1. Executive Configuration Policy & Secret Separation Standards

In compliance with Security Finding `VULN-001`, `VULN-005`, and Section 18 of the Master Mandate:
1. **Zero Secret Leakage in Client Bundles:** Frontend applications (`apps/admin-web`, `apps/pos-desktop`, `apps/mobile`) never receive database connection strings, JWT signing keys, service-role keys, or storage access credentials.
2. **Strict Validation at Startup:** The API runtime validates all mandatory environment variables via `@stokrova/config` Zod schemas (`validateConfig`) during `OnModuleInit`. In production mode (`NODE_ENV=production`), missing critical secrets immediately halt the process.
3. **Log Sanitization:** All diagnostic and application logs pass through `sanitizeConfig` and URL masking filters, replacing confidential passwords and secrets with `[REDACTED]`.

---

## 2. Platform Environment Configuration Matrix

| Variable Name | Required Runtime | Classification | Default / Source | Purpose & Validation Rule |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | All Runtimes | Non-Secret | `development` | Environment mode (`development`, `test`, `staging`, `production`) |
| `PORT` / `API_PORT` | `apps/api` | Non-Secret | `3000` | HTTP listening port for NestJS REST API |
| `API_PREFIX` | `apps/api` | Non-Secret | `v1` | Global API version prefix enforcing API conventions |
| `CORS_ALLOWED_ORIGINS` | `apps/api` | Non-Secret | Allowlist array | Comma-separated list of permitted browser origins |
| `SUPABASE_PROJECT_REF` | `apps/api`, `packages/database` | Non-Secret | Project reference | Project identifier (`vbtuccvxtgjhaywijmwa`) |
| `SUPABASE_URL` | `apps/api`, `packages/database` | Non-Secret | Supabase URL | Supabase HTTPS root (`https://vbtuccvxtgjhaywijmwa.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend, API | Public Client Key | Publishable key | Public client token for anonymous / user auth |
| `SUPABASE_JWKS_URL` | `apps/api` | Non-Secret | Supabase JWKS URL | OpenID Connect / JWKS public key verification endpoint |
| `DATABASE_URL` | `apps/api`, `packages/database` | **Server Secret** | Direct / Pooler URL | Primary PostgreSQL connection string; mandatory in production |
| `DIRECT_URL` | `packages/database` (Migrations) | **Server Secret** | Direct 5432 URL | Direct PostgreSQL endpoint reserved exclusively for DDL migrations |
| `DATABASE_POOLER_TRANSACTION_URL` | `apps/api` (Production) | **Server Secret** | Pooler 6543 URL | IPv4 PgBouncer transaction-mode connection pooler |
| `DATABASE_POOLER_SESSION_URL` | `apps/api` (Optional) | **Server Secret** | Pooler 5432 URL | IPv4 PgBouncer session-mode connection pooler |
| `JWT_SECRET` | `apps/api` | **Server Secret** | Min 32 chars | HMAC-SHA256 signature secret; strictly mandatory in production |
| `JWT_ACCESS_EXPIRY` | `apps/api` | Non-Secret | `15m` | Lifetime of short-lived access tokens |
| `JWT_REFRESH_EXPIRY` | `apps/api` | Non-Secret | `7d` | Lifetime of long-lived refresh tokens |
| `REDIS_URL` | `apps/api` | **Server Secret** | `redis://localhost:6379` | Distributed cache, token blacklist, rate limit sliding window |
| `REDIS_ENABLED` | `apps/api` | Non-Secret | `true` | Feature toggle for Redis cluster caching |
| `STORAGE_ENDPOINT` | `apps/api` | Non-Secret | R2 / S3 Endpoint | Cloudflare R2 / S3 object storage endpoint |
| `STORAGE_BUCKET` | `apps/api` | Non-Secret | `stokrova-files` | Target bucket for proof-of-delivery photos, bills of lading, CSVs |
| `STORAGE_ACCESS_KEY_ID` | `apps/api` | **Server Secret** | Server env | Access key ID for object storage provider |
| `STORAGE_SECRET_ACCESS_KEY` | `apps/api` | **Server Secret** | Server env | Secret access key for object storage provider |
| `SENTRY_DSN` | All Runtimes (Optional) | Non-Secret | Configured DSN | Error tracking and crash reporting DSN |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| `apps/api` (Optional) | Non-Secret | Configured OTLP | OpenTelemetry metrics and distributed tracing collector |
| `RATE_LIMIT_TTL_MS` | `apps/api` | Non-Secret | `60000` | Sliding window duration for IP/tenant rate limiting (1 minute) |
| `RATE_LIMIT_LIMIT` | `apps/api` | Non-Secret | `100` | Maximum requests permitted per sliding window per IP/tenant |
| `IDEMPOTENCY_TTL_SECONDS` | `apps/api` | Non-Secret | `86400` | Cache duration for duplicate command deduplication (24 hours) |

---

## 3. Client Application Environment Boundaries

### 3.1 Admin Web Console (`apps/admin-web`)
- **Permitted Variables:** `API_URL` (injected via Vercel service binding or local proxy `http://localhost:3000`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Prohibited Variables:** `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_SECRET_ACCESS_KEY`.
- **Secret Verification:** Audited via `docs/security/FRONTEND_SECRET_EXPOSURE_AUDIT.md`. Zero sensitive tokens present in HTML or JS bundles.

### 3.2 POS Desktop Client (`apps/pos-desktop`)
- **Permitted Variables:** Local SQLite connection path, local barcode scanner serial port configs, target NestJS API base URL.
- **Prohibited Variables:** Hosted database passwords, cloud object storage keys.

### 3.3 Mobile WMS Application (`apps/mobile`)
- **Permitted Variables:** Target NestJS API URL, offline SQLite cache configuration, local camera viewfinder flags.
- **Prohibited Variables:** Cloud database credentials, service-role tokens.

---

## 4. Certification Verdict

The environment configuration architecture maintains complete secret separation, strict Zod validation, and zero confidential exposure:
`SUPABASE_ENVIRONMENT_CONFIGURATION_CERTIFIED`
