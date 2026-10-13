# STOKROVA — API Conventions & Error Standards

## 1. Principles

1. **Deterministic Error Envelope**: All API errors adhere to the contract defined in `packages/contracts/src/errors.ts`:
   ```json
   {
     "error": {
       "code": "VALIDATION_FAILED",
       "message": "Validation failed for request payload.",
       "requestId": "req_01925b30-e374-7264-a95e-5b121980875d",
       "details": {
         "issues": [
           { "path": "slug", "message": "Slug already taken" }
         ]
       }
     }
   }
   ```
2. **Correlation ID**: Every HTTP response echoes the incoming `x-request-id` header (or a freshly generated UUIDv7 request ID if none was supplied).
3. **Idempotent Mutations**: All state-mutating requests (`POST`, `PUT`, `PATCH`) support the `Idempotency-Key` header.
4. **Production Error Masking**: In production environments (`NODE_ENV=production`), unhandled internal errors return generic `INTERNAL_ERROR` messages to prevent database schema or credential leakage.

---

## 2. Standard Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Payload syntax error or schema violation |
| `401` | `AUTH_UNAUTHORIZED` | Missing or invalid Supabase JWT |
| `403` | `AUTH_FORBIDDEN` | Missing required capability or cross-tenant access denied |
| `404` | `RESOURCE_NOT_FOUND` | Entity with specified ID does not exist in tenant |
| `409` | `CONFLICT` | Unique key violation or state conflict |
| `409` | `IDEMPOTENCY_CONFLICT` | Reused idempotency key with different payload/endpoint |
| `429` | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded |
| `500` | `INTERNAL_ERROR` | Unhandled server exception |
