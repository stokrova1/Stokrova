# STOKROVA — Object Storage Architecture & R2 Provider

## 1. Principles

1. **Server-Side Credential Isolation**: Private storage keys (S3/R2 access key and secret key) remain exclusively on the API server. Clients are never granted direct storage credentials.
2. **Provider Abstraction**: Decoupled via `StorageProvider` in `packages/contracts/src/storage.ts`, allowing seamless switching between Cloudflare R2, AWS S3, MinIO, or in-memory mock.
3. **Pre-Signed Access**: Large binary assets (receipt images, PDF invoices, product catalogs, backup dumps) are uploaded and downloaded via time-limited, cryptographically signed URLs.
4. **Tenant Namespacing**: Objects are partitioned by tenant: `tenants/{tenantId}/{namespace}/{objectKey}`.

---

## 2. Storage Operations

The `StorageService` provides:
- `put(key, data, options)`: Stores binary data (`Uint8Array`) with content type and custom metadata.
- `get(key)`: Retrieves binary data and metadata.
- `delete(key)`: Deletes an object.
- `exists(key)`: Checks object presence.
- `createSignedUrl(key, options)`: Issues a pre-signed URL for direct client `getObject` or `putObject` with configurable expiration.

---

## 3. Configuration

Configured via centralized `packages/config`:
- `STORAGE_ENDPOINT`: S3/R2 API endpoint URL.
- `STORAGE_BUCKET`: Authoritative storage bucket name.
- `STORAGE_ACCESS_KEY_ID`: Server-side access key.
- `STORAGE_SECRET_ACCESS_KEY`: Server-side secret key.
- `STORAGE_PUBLIC_URL`: Optional CDN/public delivery URL.
