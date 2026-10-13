# STOKROVA — Production Configuration Inventory & Secret Governance

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** Operational Security Inventory  
**Date:** October 13, 2026  

---

## 1. Exhaustive Configuration Inventory

Every configuration parameter consumed across the STOKROVA monorepo is audited, classified, and governed below. **No plaintext secret values are stored in source control or this documentation.**

### Configuration Classification Taxonomy:
- **[A] Public Client Configuration**: Safe to embed in frontend bundles and client applications.
- **[B] Nonconfidential Operational Configuration**: Internal runtime flags, ports, timeouts, log levels.
- **[C] Confidential Application Secret**: Application cryptographic keys, signing tokens, JWT secrets.
- **[D] External Provider Credential**: Third-party API keys, webhook signing secrets, payment gateways.
- **[E] Privileged Infrastructure Credential**: Production database URLs, storage master keys, Redis passwords.
- **[F] Deployment-Only Credential**: CI/CD tokens, registry credentials, cloud deployment keys.

---

## 2. Configuration Inventory Table

| Parameter / Variable | Classification | Consumed By | Default Value | Production Requirement |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | **[B]** | All Apps & Packages | `development` | Mandatory `production` |
| `PORT` / `API_PORT` | **[B]** | `apps/api` | `3000` | Port `3000` (mapped via ingress) |
| `APP_NAME` | **[B]** | `apps/api` | `STOKROVA API` | Brand identifier string |
| `APP_VERSION` | **[B]** | All Apps | `0.1.0` | Commit SHA / Release semantic version |
| `LOG_LEVEL` | **[B]** | `apps/api` | `info` | `info` or `warn` in production |
| `CORS_ALLOWED_ORIGINS` | **[B]** | `apps/api` | Localhost defaults | Explicit domain list (e.g. `https://admin.stokrova.com`) |
| `DATABASE_URL` | **[E]** | `apps/api`, `packages/database` | Localhost default | **Mandatory**. SSL required (`sslmode=require`). |
| `DATABASE_POOLER_TRANSACTION_URL` | **[E]** | `apps/api` | None | Dedicated PgBouncer transaction pooler (port 6543) |
| `DIRECT_URL` | **[E]** | Database Migrations | None | Direct Supabase PostgreSQL URL for DDL migrations |
| `JWT_SECRET` | **[C]** | `apps/api` (`AuthGuard`) | None in prod | **Mandatory**. Cryptographically random $\ge 32$ chars. |
| `JWT_ACCESS_EXPIRY` | **[B]** | `apps/api` | `15m` | Token lifespan (`15m`) |
| `JWT_REFRESH_EXPIRY` | **[B]** | `apps/api` | `7d` | Refresh token lifespan (`7d`) |
| `SUPABASE_URL` | **[A]** | All Apps | Dev endpoint | Production Supabase tenant project endpoint |
| `SUPABASE_ANON_KEY` | **[A]** | Clients / Admin Web | Dev anon key | Supabase public anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | **[E]** | Backend API only | None in prod | Privileged backend management key. **Never expose to client.** |
| `REDIS_URL` | **[E]** | `apps/api` | `redis://localhost:6379` | TLS-encrypted Redis connection string (`rediss://`) |
| `REDIS_ENABLED` | **[B]** | `apps/api` | `true` | `true` (enables distributed locks & cache) |
| `STORAGE_ENDPOINT` | **[B]** | `apps/api` (`StorageService`) | None | Cloudflare R2 / S3-compatible S3 API endpoint |
| `STORAGE_BUCKET` | **[B]** | `apps/api` | `stokrova-assets` | Private object store bucket name |
| `STORAGE_ACCESS_KEY_ID` | **[E]** | `apps/api` | None in prod | Cloudflare R2 API token access key ID |
| `STORAGE_SECRET_ACCESS_KEY` | **[E]** | `apps/api` | None in prod | Cloudflare R2 API secret access key |
| `STORAGE_PUBLIC_URL` | **[A]** | Public CDN Assets | None | Optional public CDN URL for public brand logos |
| `RATE_LIMIT_TTL_MS` | **[B]** | `RateLimiterMiddleware` | `60000` | Sliding window duration ($60{,}000\text{ms}$) |
| `RATE_LIMIT_LIMIT` | **[B]** | `RateLimiterMiddleware` | `100` | Max requests per sliding window ($100$) |
| `IDEMPOTENCY_TTL_SECONDS`| **[B]** | `IdempotencyService` | `86400` | Idempotency record expiration ($86{,}400\text{s} = 24\text{h}$) |
| `PAYMENT_GATEWAY_API_KEY` | **[D]** | `PaymentsService` | None in prod | Stripe / Adyen production live secret key |
| `PAYMENT_WEBHOOK_SECRET` | **[D]** | Webhook Controller | None in prod | HMAC-SHA256 signature verification secret |
| `SENTRY_DSN` | **[B]** | Global Error Tracking | None | Production Sentry ingestion endpoint |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | **[B]** | OpenTelemetry Collector | None | Telemetry collector gRPC / HTTP endpoint |
| `GITHUB_TOKEN` | **[F]** | CI/CD Runner | Injected by GitHub | Scope restricted to repository checkout & build |

---

## 3. Secret Rotation Procedures

To ensure operational resilience without service downtime, secret rotations follow a staged dual-secret transition model where supported:

### 3.1 Database Credential Rotation
- **Frequency**: Every 90 days or immediately upon suspected compromise.
- **Procedure**:
  1. In Supabase Dashboard / AWS RDS, generate a secondary database user with identical role permissions.
  2. Verify connectivity using secondary credentials in non-production verification script.
  3. Update `DATABASE_URL` in the secrets manager (e.g. AWS Secrets Manager, Doppler, Vault).
  4. Perform a rolling restart of the API cluster. The connection pool gracefully drains old connections and establishes new ones.
  5. Once all pods/replicas report ready (`/v1/health/ready` 200 OK) with zero errors for 15 minutes, revoke the old database user credentials.

### 3.2 JWT Signing Secret Rotation (`JWT_SECRET`)
- **Frequency**: Every 180 days.
- **Procedure**:
  1. STOKROVA token verification verifies signature against the primary secret while permitting previous secret during grace window.
  2. Update environment secret to the new key.
  3. Newly issued tokens are signed with the new key.
  4. Previously issued tokens continue to validate until token expiration ($15\text{m}$).
  5. After the expiration window passes, retire the old key completely.

### 3.3 Object Storage Access Key Rotation (`STORAGE_SECRET_ACCESS_KEY`)
- **Frequency**: Every 90 days.
- **Procedure**:
  1. In Cloudflare R2 dashboard, create a new API Token with Read/Write permissions on `stokrova-assets`.
  2. Inject new `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY` into staging environment; run file upload/download verification.
  3. Deploy updated credentials to production API cluster via rolling restart.
  4. Verify receipt and document generation.
  5. Delete the obsolete R2 API token.

### 3.4 Payment & Webhook Secrets Rotation (`PAYMENT_WEBHOOK_SECRET`)
- **Frequency**: On compromise or annual audit.
- **Procedure**:
  1. In payment processor console (e.g. Stripe), register a secondary webhook signing secret alongside the primary secret.
  2. In STOKROVA API, both secrets are evaluated during transition.
  3. Delete the older webhook endpoint in processor console.

---

## 4. Verification Controls & Startup Guardrails

1. **Fatal Startup Validation**: `packages/config` strictly checks mandatory variables during NestJS `onModuleInit()`. If `NODE_ENV === 'production'` and either `DATABASE_URL` or `JWT_SECRET` is missing, the process terminates immediately with code 1 and logs a detailed `ConfigValidationError` describing the missing variable.
2. **Telemetry Sanitization**: `sanitizeConfig()` masks connection passwords with `******` and replaces secrets with `[REDACTED]` prior to logging.
3. **Frontend Bundle Hygiene**: `pnpm -r run build` outputs are scanned by bundle analyzers to verify that zero `process.env` secrets are bundled into client code.
