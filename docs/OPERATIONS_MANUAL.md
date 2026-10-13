# STOKROVA Enterprise Operations & SRE Runbook Manual

**Version**: 1.0.0  
**Target Environment**: Production High-Availability Kubernetes Cluster  
**Last Updated**: October 12, 2026  

---

## 1. System Architecture & Topology

STOKROVA is designed as an offline-first, multi-tenant enterprise operating platform composed of:
1. **Stateless API Gateway Nodes (`stokrova-api`)**: Containerized NestJS application handling REST, GraphQL, and monotonic vector clock sync feeds.
2. **Authoritative Relational Database (PostgreSQL 16+)**: Multi-tenant partitioned schema, double-entry financial journals, append-only Merkle audit logs, and transaction outbox tables.
3. **Distributed Cache & Broker (Redis 7+)**: Token blacklists, rate limiting, and ephemeral WebSocket pub/sub channels. (Rule 13: Never used for authoritative business storage).
4. **Offline Client Engines (Tauri Desktop & Expo Mobile)**: Embedded SQLite with Write-Ahead Logging (WAL) and monotonic sequence outbox tables.

---

## 2. Zero-Downtime Deployment Runbook

### Pre-Deployment Verification
Before executing any production deployment:
```bash
# 1. Verify all workspace tests pass
pnpm -r run test

# 2. Run the end-to-end business day simulation
pnpm exec vitest run scripts/simulate-business-day.spec.ts

# 3. Ensure git working tree is clean and tagged
git status
```

### Kubernetes Rolling Update Procedure
```bash
# Apply ConfigMaps and Secrets
kubectl apply -f deploy/k8s/configmap-secrets.yaml

# Apply API deployment (Rolling update with maxUnavailable: 0)
kubectl apply -f deploy/k8s/api-deployment.yaml

# Monitor rollout status
kubectl rollout status deployment/stokrova-api -n stokrova

# Verify health probe endpoint
curl -f https://api.stokrova.com/v1/health
```

---

## 3. Disaster Recovery & Point-In-Time Recovery (PITR)

### Database Backup & Restore Procedure
1. **Continuous WAL Archiving**:
   PostgreSQL continuously ships Write-Ahead Logs to remote encrypted S3 storage (`s3://stokrova-wal-backups/`).
2. **Point-In-Time Recovery (PITR) Execution**:
   In the event of catastrophic data corruption or accidental tenant mutation:
   ```bash
   # Stop write traffic by scaling down API pods
   kubectl scale deployment/stokrova-api --replicas=0 -n stokrova

   # Restore base snapshot
   pg_restore -U stokrova -d stokrova_prod /backups/base_backup.dump

   # Apply recovery target timestamp in recovery.signal
   echo "recovery_target_time = '2026-10-12 14:00:00 UTC'" > /var/lib/postgresql/data/recovery.signal
   echo "restore_command = 'cp /wal_archive/%f %p'" >> /var/lib/postgresql/data/postgresql.conf

   # Start database and verify Merkle root audit consistency
   # Once consistent, scale API back to normal
   kubectl scale deployment/stokrova-api --replicas=3 -n stokrova
   ```

---

## 4. Offline Sync Partition Recovery & Outbox Drain Runbook

When store retail locations experience extended WAN outages:
1. **Local Mode Verification**:
   Ensure cashier terminals have switched to `OFFLINE` status chips and mutations are buffering in `local_outbox`.
2. **Network Reconnection & Drain**:
   Upon internet restoration:
   - Client automatically attempts connection pulses every 15 seconds with bounded exponential jitter.
   - Pushes mutations in idempotent chunks of 50 operations.
   - Server validates vector clocks. If concurrent edits exist on master entities (e.g. price change during offline sale), the sale is committed immutably per Rule 7 & 8, and the price change is flagged for manager review (`EXCEPTION_WORKFLOW`).
3. **Queue Health Check**:
   ```bash
   # Check remaining unsynced mutations in cluster
   kubectl exec -it deployment/stokrova-api -n stokrova -- node -e "
     // Query queue depth from Prometheus metrics
   "
   ```

---

## 5. Webhook Key Rotation & Dead-Letter Queue (DLQ) Maintenance

### Zero-Downtime Secret Key Rotation
STOKROVA supports dual-signature secret rotation:
1. Generate new 32-byte cryptographically secure secret (`openssl rand -hex 32`).
2. Add new secret to `WEBHOOK_HMAC_SECRET_NEXT` in `stokrova-secrets`.
3. The webhook dispatcher will sign payloads with both current and candidate keys (`t=timestamp,v1=sig1,v1=sig2`).
4. After 48 hours, promote the new secret to primary.

### Dead-Letter Queue (DLQ) Replay
```bash
# Inspect failed webhook deliveries
curl -X GET https://api.stokrova.com/v1/webhooks/dlq?status=FAILED \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"

# Replay batch
curl -X POST https://api.stokrova.com/v1/webhooks/dlq/replay \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -d '{"sinceIso": "2026-10-12T00:00:00Z"}'
```

---

## 6. Incident Severity & Escalation Matrix

| Severity | Definition | Target MTTR | Escalation Path |
| :--- | :--- | :--- | :--- |
| **SEV-1** | Core API down, POS checkout blocked, or DB corruption | < 15 mins | Page On-Call SRE, VP Engineering |
| **SEV-2** | Offline sync replication degraded, Webhook DLQ > 5% | < 1 hour | Page Secondary SRE, Lead Architect |
| **SEV-3** | Non-critical reporting, background analytics delay | < 4 hours | Jira Ticket, Next Business Shift |
| **SEV-4** | Cosmetic UI defect, minor documentation inaccuracy | Next Sprint | Standard Backlog Triage |
