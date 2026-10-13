# STOKROVA Enterprise Developer Integration Guide

Welcome to the STOKROVA Developer Platform. This guide explains how to authenticate with the API, integrate custom hardware, ingest webhooks, and synchronize offline point-of-sale registers.

---

## 1. Authentication & Multi-Tenant Headers

All API requests must supply an authorized Bearer JWT token or a scoped API Key, along with tenant identification.

```http
GET /v1/catalog/products HTTP/1.1
Host: api.stokrova.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-Id: ten_apex_global
Content-Type: application/json
```

---

## 2. The Golden Rule of Money: Pure Minor Currency Units

> **Architectural Golden Rule 26**: All monetary calculations, ledger entries, payments, and quotations MUST be performed in pure integer minor units (cents, pence, kobo). Floating-point arithmetic is strictly forbidden.

- **USD $10.00** $\to$ `1000`
- **GBP £45.50** $\to$ `4550`
- **EUR €1,200.00** $\to$ `120000`

```json
{
  "sku": "LAPTOP-PRO-16",
  "retailPriceMinor": 249900,
  "currencyCode": "USD"
}
```

---

## 3. Webhook Cryptographic Verification

Every webhook dispatch includes an `X-Stokrova-Signature` header in Stripe/GitHub standard format:
`t=1728748800,v1=5257ab69e...`

### Node.js (TypeScript) Implementation
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyStokrovaWebhook(
  payloadRaw: string,
  signatureHeader: string,
  secret: string,
  maxToleranceSeconds = 300,
): boolean {
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signaturePart = parts.find((p) => p.startsWith('v1='))?.slice(3);

  if (!timestampPart || !signaturePart) return false;

  // Anti-replay check
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestampPart, 10)) > maxToleranceSeconds) {
    return false; // Replay attack detected
  }

  // Compute expected HMAC
  const signedPayload = `${timestampPart}.${payloadRaw}`;
  const expectedSig = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return timingSafeEqual(Buffer.from(signaturePart, 'hex'), Buffer.from(expectedSig, 'hex'));
}
```

### Python 3 Implementation
```python
import hmac
import hashlib
import time

def verify_stokrova_webhook(payload_raw: bytes, signature_header: str, secret: str, tolerance: int = 300) -> bool:
    pairs = dict(item.split("=", 1) for item in signature_header.split(","))
    t = pairs.get("t")
    v1 = pairs.get("v1")
    if not t or not v1:
        return False
    
    # Check timestamp age
    if abs(int(time.time()) - int(t)) > tolerance:
        return False
        
    signed_payload = f"{t}.".encode("utf-8") + payload_raw
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(v1, expected)
```

---

## 4. Multi-Master Offline Synchronization Stream

Custom POS terminals or ERP systems synchronize state via monotonic change streams:

### Pushing Local Outbox Operations
```http
POST /v1/sync/push HTTP/1.1
Host: api.stokrova.com
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "client_id": "pos_terminal_london_01",
  "operations": [
    {
      "operation_id": "01924b11-92b8-7c1e-84bc-2a6c1110e52b",
      "client_sequence": 42,
      "command_type": "SALE_CHECKOUT",
      "clock": { "pos_london_01": 42, "server_hub": 18 },
      "payload": {
        "tillSessionId": "sess_001",
        "grandTotalMinor": 6500,
        "lines": [...]
      }
    }
  ]
}
```

---

## 5. Standard Error Envelope Response

If a request fails validation or authorization, STOKROVA returns a structured JSON error envelope:

```json
{
  "statusCode": 400,
  "errorCode": "INSUFFICIENT_STOCK",
  "message": "Bin A-01-02 has only 12 units remaining (requested 25 units)",
  "timestamp": "2026-10-12T14:32:00.123Z",
  "requestId": "req_01924b11-92b8-7c1e-84bc-2a6c1110e52b",
  "details": {
    "sku": "LAPTOP-PRO-16",
    "binLocation": "A-01-02",
    "availableUnits": 12
  }
}
```
