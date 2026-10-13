# STOKROVA — Security & Operational Incident Response Runbook

**Platform:** STOKROVA Enterprise Business Operations Platform  
**Target Gate:** `PRODUCTION_READY`  
**Classification:** Incident Response Standard Operating Procedure (SOP-004)  
**Date:** October 13, 2026  

---

## 1. Incident Management Framework & Severity Levels

When an operational anomaly or security violation is detected, response actions must follow this structured protocol:

```text
[ DETECT ] ──► [ TRIAGE / ASSESS ] ──► [ CONTAIN ] ──► [ ERADICATE ] ──► [ RECOVER ] ──► [ POST-MORTEM ]
```

### Severity Classification Matrix

| Severity | Definition | Initial Response SLA | Escalation & Ownership |
| :---: | :--- | :---: | :--- |
| **P1 — Critical** | Active cross-tenant data breach, widespread service outage, unauthenticated database compromise, or unauthorized financial transactions | $\le 15\text{ minutes}$ | Platform Lead, Security Lead, Executive Incident Commander |
| **P2 — High** | Degraded service performance, external payment gateway timeout spike, isolated tenant failure, failed automated backups | $\le 60\text{ minutes}$ | On-Call SRE, Domain Lead |
| **P3 — Medium** | Intermittent third-party webhook failure, non-critical background worker retry backlog, minor UI visual defect | $\le 4\text{ hours}$ | SRE Team, Support Engineering |

---

## 2. Playbook 1: Suspected Credential Exposure

### Detection Signals
- Secret detection alert from Git repository scanner, Cloudflare WAF, or log monitoring.
- Anomalous API calls using administrative service role keys from unauthorized IP addresses.

### Immediate Containment Steps
1. **Quarantine Exposed Key**: Identify the compromised credential (`JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_SECRET_ACCESS_KEY`, `DATABASE_URL`).
2. **Rotate Immediately**: Execute the staged rotation protocol from `docs/production/PRODUCTION_CONFIGURATION_INVENTORY.md`.
3. **Revoke Active Sessions**: If `JWT_SECRET` was exposed, trigger immediate invalidation by rotating the signing secret; this immediately forces all client sessions to re-authenticate.
4. **Preserve Forensic Evidence**: Archive access logs containing the compromised credential's usage:
   ```bash
   # Export access logs for forensic review
   grep "compromised-key-prefix" /var/log/stokrova/access.log > /secure/forensics/incident_cred_leak.log
   ```
5. **Verify Clean State**: Test `/v1/health/ready` and confirm all API instances are functioning with newly injected secrets.

---

## 3. Playbook 2: Suspected Cross-Tenant Data Disclosure

### Detection Signals
- Audit log entry showing user from Tenant A accessing resources belonging to Tenant B.
- Exception in API logs: `Actor does not have access to tenant 'xxx'`.
- Customer ticket reporting visibility of another business's inventory or invoices.

### Immediate Containment Steps
1. **Isolate Affected Tenant**: Temporarily disable the suspicious account or suspend API token via administrative console.
2. **Audit PostgreSQL Row-Level Security**:
   ```sql
   -- Verify RLS is active and not bypassed
   SELECT tablename, rowsecurity, forcerowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
3. **Inspect Application Transaction Context**: Verify that `TransactionManager` is passing `options.tenantId` and executing `set_config('app.current_tenant_id', ..., true)`.
4. **Scope Forensic Impact**: Run a targeted query to determine the exact records accessed by the compromised actor during the exposure window.
5. **Notification**: In accordance with regulatory requirements (GDPR / CCPA), notify the affected business within statutory disclosure timeframes.

---

## 4. Playbook 3: Unauthorized Financial or Ledger Mutation

### Detection Signals
- General ledger reconciliation alert: $\sum \text{Debits} \ne \sum \text{Credits}$.
- Cryptographic Merkle audit tree root mismatch alert (`scripts/disaster-recovery-drill.spec.ts`).
- Anomaly in till session blind cash count reconciliation.

### Immediate Containment Steps
1. **Freeze Financial Postings**: Temporarily reject new financial ledger mutations while allowing read-only reporting.
2. **Execute Cryptographic Verification**:
   ```bash
   pnpm exec vitest run scripts/disaster-recovery-drill.spec.ts
   ```
3. **Trace Audit Event Genealogy**: Identify the `operation_id`, user ID, and timestamp that caused the discrepancy in `journal_entries` or `stock_ledger`.
4. **Post Compensating Entries**: In accordance with Rule 11 ("Never silently delete financial history"), post explicit, audited balancing reversal journal entries rather than modifying historical rows.
5. **Resume Normal Operation**: Verify ledger integrity and unfreeze postings.

---

## 5. Playbook 4: Database Connection Pooler Saturation or Outage

### Detection Signals
- `/v1/health/ready` fails with HTTP 503 (`database: down`).
- Elevated API 500 error rates with message: `remaining connection slots are reserved` or `timeout waiting for connection`.

### Immediate Containment Steps
1. **Inspect Active Connections**:
   ```sql
   SELECT count(*), state, application_name 
   FROM pg_stat_activity 
   GROUP BY state, application_name;
   ```
2. **Terminate Idle or Stalled Transactions**:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle in transaction' 
     AND state_change < current_timestamp - INTERVAL '5 minutes';
   ```
3. **Verify Pooler Limits**: Ensure PgBouncer connection limits match database capacity.
4. **Verify Application Reconnection**: Monitor `/v1/health/ready` until status reports `ready`.

---

## 6. Playbook 5: Malicious Dependency or Supply-Chain Alert

### Detection Signals
- `pnpm audit` reports a new High or Critical CVE.
- Dependency hash mismatch detected during build.

### Immediate Containment Steps
1. **Halt Deployments**: Pause CI/CD production deployment pipelines.
2. **Inspect Lockfile**: Check `pnpm-workspace.yaml` and `pnpm-lock.yaml` for transitive vulnerabilities.
3. **Apply Selective Override**: Add an explicit minimum-version constraint in `pnpm-workspace.yaml` `overrides` section.
4. **Execute Full Monorepo Verification**:
   ```bash
   pnpm install
   pnpm audit
   pnpm -r run typecheck
   pnpm test
   ```
5. **Deploy Patch**: Roll out patched container release through the standard deployment runbook.

---

## 7. Post-Incident Review (PIR) Protocol

Within 48 hours of resolving any P1 or P2 incident, the Incident Commander must produce a formal blameless Post-Mortem document including:
1. **Timeline**: Exact chronological sequence of events (detection to resolution).
2. **Root Cause Analysis (5 Whys)**: Underlying architectural, operational, or testing gaps.
3. **Action Items**: Preventative remediation tasks, automated regression tests, or alerting refinements added to the issue tracker with assigned owners and deadlines.
