# Security Architecture

## 1. Security goals

Protect:

- tenant isolation
- money
- inventory
- customer data
- staff accounts
- business secrets
- sync integrity
- audit history

## 2. Authentication

Use short-lived access tokens and secure refresh/session handling.

Support:

- email/password initially
- optional social/enterprise identity providers later
- MFA for privileged roles
- device/session management

Do not store long-lived secrets in source code or local storage unless the threat model explicitly allows it.

## 3. Authorization

Use RBAC as the baseline:

```text
Role
  -> Permissions
  -> Scope
```

Scope can include:

- tenant
- company
- branch
- warehouse
- module

Examples:

```text
cashier
inventory_staff
branch_manager
finance_staff
auditor
tenant_admin
```

Do not hard-code authorization checks only in the UI.

## 4. Tenant isolation

Every tenant-owned query must carry tenant scope.

Tests must intentionally attempt cross-tenant reads and writes.

Tenant ID must never be trusted merely because the client supplied it.

Resolve tenant scope from authenticated identity/session and validated membership.

## 5. Device security

Register every offline-capable device.

Store:

```text
device_id
tenant_id
device_name
platform
app_version
last_seen_at
status
```

Allow administrators to revoke devices.

A revoked device must stop submitting business commands.

## 6. Sync security

Every push operation must be authenticated and authorized.

Validate:

- tenant
- user
- device
- operation type
- entity ownership
- schema version
- payload shape
- command permissions

Never allow a client to submit arbitrary SQL or arbitrary domain events.

## 7. Encryption

In transit:

- TLS
- secure websocket transport if used
- secure API endpoints only in production

At rest:

- rely on managed database/object-storage encryption
- encrypt especially sensitive local device material according to platform capabilities

## 8. Secrets

Use environment/secret manager storage.

Never commit:

- JWT secrets
- database passwords
- cloud access keys
- payment provider secrets
- encryption keys

## 9. Input validation

Validate at:

1. HTTP boundary
2. application command boundary
3. database constraints

Never depend solely on frontend validation.

## 10. Audit

Audit:

- authentication
- permission changes
- stock adjustments
- financial posting
- refunds
- price overrides
- device revocation
- exports
- imports
- data deletion
- administrative configuration changes

## 11. Files

Object storage should use non-guessable object keys.

Signed URLs or controlled download endpoints should be used for private tenant files.

Never expose cloud provider master credentials to clients.

## 12. Rate limits

Apply rate limits to:

- login
- password/reset
- token operations
- public APIs
- sync endpoints
- expensive reports
- imports
- exports

## 13. Sensitive logging

Do not log:

- passwords
- access tokens
- refresh tokens
- payment secrets
- full payment credentials
- unnecessary personal data

## 14. OWASP baseline

The engineering process must continuously consider:

- broken access control
- injection
- insecure design
- authentication failures
- security misconfiguration
- vulnerable dependencies
- logging/monitoring failures
- server-side request forgery
- integrity failures
- unsafe consumption of APIs

## 15. Dependency policy

Every production dependency needs:

- known license
- maintenance health
- vulnerability status
- version pinning/lockfile
- purpose

Reference-project code is never imported without a license review.
