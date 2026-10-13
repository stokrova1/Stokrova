# ADR-010: S3-Compatible Object Storage

## Status
Accepted

## Context
Storing product images, PDF invoices, and file attachments directly in PostgreSQL bloats the database and complicates backups.

## Decision
Use S3-compatible object storage (such as Cloudflare R2 or MinIO for local development). PostgreSQL stores only metadata records (`files` table: key, bucket, mime, size, checksum, tenant_id). Clients access private files via short-lived signed URLs.

## Consequences
- Keeps PostgreSQL lean and optimized for transactions.
- Provides low-cost, scalable file storage with fast CDN distribution.
