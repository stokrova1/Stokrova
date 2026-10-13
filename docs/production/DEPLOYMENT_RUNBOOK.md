# STOKROVA — Standard Production Deployment Runbook

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** Operational Procedure (SRE Standard SOP-001)  
**Date:** October 13, 2026  

---

## 1. Scope & Preconditions

This runbook defines the verified, repeatable procedure for deploying a production release of STOKROVA.

### Mandatory Preconditions
1. **Target Commit**: Must be a tagged release on `master` or `main` (e.g. `v0.1.0` or git SHA `c6913cf`).
2. **Quality Gate Status**: CI pipeline must have passed with 100% green tests (>1,515 automated tests), zero TypeScript errors, and zero high/critical supply chain vulnerabilities (`pnpm audit`).
3. **Change Window**: Scheduled maintenance window approved by Release Manager.
4. **Backup Verification**: Automated database snapshot verified within the last 60 minutes.
5. **Secrets Injected**: All mandatory production secrets (`DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) securely provisioned in the production environment.

---

## 2. Pre-Deployment Verification (Local / Staging Preflight)

Execute the preflight commands on the build/staging runner:

```bash
# 1. Ensure clean workspace from committed lockfile
pnpm install --frozen-lockfile

# 2. Verify static type integrity across all 12 projects
pnpm -r run typecheck

# 3. Verify zero supply-chain vulnerabilities
pnpm audit

# 4. Verify test suite (including master security & production readiness)
pnpm test

# 5. Build production artifacts
pnpm -r run build
```

**Expected Result**: All commands exit with code 0.

---

## 3. Database Migration Preflight

Before switching application traffic, database schema changes must be applied following the Expand-and-Contract model:

```bash
# 1. Run database migration dry-run / verification against staging
pnpm --filter @stokrova/database run migrate:verify

# 2. Check journal status
# Verify that all migrations up to 0013_security_hardening_rls are applied
```

> [!IMPORTANT]
> DDL migrations must execute using `DIRECT_URL` (direct PostgreSQL connection) rather than the transaction pooler, as transaction poolers (PgBouncer) do not support prepared statements and transactional DDL locks.

---

## 4. Container Build & Image Tagging

Build immutable container images tagged with the exact git commit SHA:

```bash
COMMIT_SHA=$(git rev-parse --short HEAD)
RELEASE_TAG="v0.1.0-${COMMIT_SHA}"

# 1. Build Core API Container
docker build -t stokrova/api:${RELEASE_TAG} -t stokrova/api:latest -f apps/api/Dockerfile .

# 2. Build Admin Web Static Nginx Container
docker build -t stokrova/admin-web:${RELEASE_TAG} -t stokrova/admin-web:latest -f apps/admin-web/Dockerfile .

# 3. Push to Private Container Registry
docker push stokrova/api:${RELEASE_TAG}
docker push stokrova/admin-web:${RELEASE_TAG}
```

---

## 5. Rolling Deployment Execution

Deploy updated container images with rolling update strategy (zero-downtime):

1. **Deploy API Replicas**:
   - Update container image tag to `${RELEASE_TAG}`.
   - Kubernetes / ECS starts new replica.
   - The container executes `dumb-init` and launches NestJS API on port 3000.
   - Orchestrator probes `/v1/health/live` (must return HTTP 200 within 10s).
   - Orchestrator probes `/v1/health/ready` (queries PostgreSQL `SELECT 1;`).
   - Only when readiness probe succeeds does the orchestrator route traffic to the new replica and terminate the old replica.
2. **Deploy Admin Web SPA**:
   - Rolling update of Nginx pods.
   - Cache-busting assets (hashed filenames) ensure browser clients immediately fetch the new JavaScript bundle.

---

## 6. Post-Deployment Smoke Test Protocol

Immediately following rollout, the automated smoke test suite executes against the deployed endpoint:

```bash
# Verify process liveness
curl -fsS https://api.stokrova.com/v1/health/live

# Verify dependency readiness (DB, Redis, Config)
curl -fsS https://api.stokrova.com/v1/health/ready

# Verify telemetry snapshot
curl -fsS https://api.stokrova.com/v1/health/metrics

# Verify security headers presence
curl -sI https://api.stokrova.com/v1/health | grep -E "x-content-type-options|x-frame-options|content-security-policy"
```

### Verification Criteria
- `/v1/health/live` returns HTTP 200 with `status: "alive"`.
- `/v1/health/ready` returns HTTP 200 with `status: "ready"` and `checks.database: "ready"`.
- Response headers include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- Error rate in observability dashboard is $< 0.1\%$ across the first 5 minutes of traffic.

---

## 7. Immediate Rollback Protocol

If any of the following triggers occur within 15 minutes of deployment:
1. `/v1/health/ready` returns HTTP 503 (`database: down`).
2. API HTTP 5xx error rate exceeds $1.0\%$ over a 3-minute window.
3. Unhandled exception spike in Sentry / OpenTelemetry dashboard.
4. Tenant isolation or authorization failure detected.

### Rollback Steps:
```bash
# 1. Rollback API deployment to previous known-good image tag
kubectl rollout undo deployment/stokrova-api
# Or update ECS task definition to previous revision

# 2. Rollback Admin Web deployment
kubectl rollout undo deployment/stokrova-admin-web

# 3. Confirm health check recovery
curl -fsS https://api.stokrova.com/v1/health/ready

# 4. Notify incident response team and initiate post-mortem analysis
```

Because STOKROVA uses Expand-and-Contract database migrations, the database schema remains backward-compatible with the previous application release, allowing immediate application rollback without rolling back database DDL.
