/**
 * ============================================================================
 * STOKROVA — Enterprise Webhook Engine & Event Notification Bus Domain
 * Phase 19: Webhooks, Outbox Event Bus & Multi-Channel Notification Engine
 *
 * Benchmark: Stripe Webhooks, GitHub Webhooks, Svix Webhook Gateway,
 * AWS EventBridge, Twilio SendGrid Notification Dispatch
 *
 * Golden Rules Compliance:
 * - Rule 18 & 19: Critical commands idempotent and atomic concurrency
 * - Rule 22: Decoupled pure domain logic (Zero external dependencies, zero node:* imports)
 * - Rule 26: Pure integer arithmetic for delays, backoffs, and jitter calculations
 * ============================================================================
 */

export class WebhooksDomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'WebhooksDomainError';
  }
}

// ============================================================================
// Pure UTF-8 Encoding & Byte Utilities
// ============================================================================

export function utf8ToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => ('00' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// ============================================================================
// Pure SHA-256 Engine on Byte Arrays (RFC 6234)
// ============================================================================

const K256: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function ch(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function maj(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: number): number {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function sigma1(x: number): number {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function gamma0(x: number): number {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function gamma1(x: number): number {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

export function sha256Bytes(inputBytes: number[]): number[] {
  const bytes = [...inputBytes];
  const bitLength = bytes.length * 8;

  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  // 64-bit big endian length
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLength >>> 24) & 0xff,
    (bitLength >>> 16) & 0xff,
    (bitLength >>> 8) & 0xff,
    bitLength & 0xff,
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] =
        (((bytes[idx] ?? 0) << 24) |
          ((bytes[idx + 1] ?? 0) << 16) |
          ((bytes[idx + 2] ?? 0) << 8) |
          (bytes[idx + 3] ?? 0)) >>>
        0;
    }

    for (let i = 16; i < 64; i++) {
      const s0 = gamma0(w[i - 15] ?? 0);
      const s1 = gamma1(w[i - 2] ?? 0);
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = sigma1(e);
      const chVal = ch(e, f, g);
      const temp1 = (h + s1 + chVal + (K256[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const s0 = sigma0(a);
      const majVal = maj(a, b, c);
      const temp2 = (s0 + majVal) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const result: number[] = [];
  const appendWord = (wVal: number) => {
    result.push((wVal >>> 24) & 0xff);
    result.push((wVal >>> 16) & 0xff);
    result.push((wVal >>> 8) & 0xff);
    result.push(wVal & 0xff);
  };

  appendWord(h0);
  appendWord(h1);
  appendWord(h2);
  appendWord(h3);
  appendWord(h4);
  appendWord(h5);
  appendWord(h6);
  appendWord(h7);

  return result;
}

// ============================================================================
// Pure HMAC-SHA256 Implementation (RFC 2104)
// ============================================================================

export function computeHmacSha256(keyStr: string, messageStr: string): string {
  let keyBytes = utf8ToBytes(keyStr);
  const msgBytes = utf8ToBytes(messageStr);

  const blockSize = 64; // SHA-256 block size is 64 bytes

  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }

  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }

  const oKeyPad = new Array<number>(blockSize);
  const iKeyPad = new Array<number>(blockSize);

  for (let i = 0; i < blockSize; i++) {
    const k = keyBytes[i] ?? 0;
    oKeyPad[i] = k ^ 0x5c;
    iKeyPad[i] = k ^ 0x36;
  }

  const innerData = [...iKeyPad, ...msgBytes];
  const innerHash = sha256Bytes(innerData);

  const outerData = [...oKeyPad, ...innerHash];
  const outerHash = sha256Bytes(outerData);

  return bytesToHex(outerHash);
}

// ============================================================================
// Constant-Time String Comparison (Anti-Timing Attacks)
// ============================================================================

export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================================
// Webhook Signature Header & Anti-Replay Verification (Stripe & GitHub Standards)
// ============================================================================

/**
 * Formats a Stripe-standard webhook signature header: t={timestamp},v1={hmac}
 */
export function generateStripeSignatureHeader(
  secret: string,
  payload: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = computeHmacSha256(secret, signedPayload);
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verifies inbound webhook signature with anti-replay tolerance checking.
 * Supports both Stripe format (`t={timestamp},v1={sig}`) and GitHub format (`sha256={sig}`).
 */
export function verifyWebhookSignature(
  secret: string,
  signatureHeader: string,
  payload: string,
  toleranceSeconds = 300,
  currentTimestamp: number = Math.floor(Date.now() / 1000),
): { isValid: boolean; reason?: string } {
  if (!signatureHeader || !signatureHeader.trim()) {
    return { isValid: false, reason: 'Missing signature header' };
  }

  // 1. Stripe-style signature header: t=1612345678,v1=abcdef...
  if (signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
    const parts = signatureHeader.split(',');
    let timestampStr = '';
    let signatureStr = '';

    for (const part of parts) {
      const [key, val] = part.trim().split('=');
      if (key === 't') timestampStr = val ?? '';
      if (key === 'v1') signatureStr = val ?? '';
    }

    if (!timestampStr || !signatureStr) {
      return { isValid: false, reason: 'Malformed Stripe signature header' };
    }

    const t = parseInt(timestampStr, 10);
    if (isNaN(t)) {
      return { isValid: false, reason: 'Invalid timestamp format in header' };
    }

    // Check timestamp freshness (replay attack prevention)
    if (Math.abs(currentTimestamp - t) > toleranceSeconds) {
      return { isValid: false, reason: 'Webhook signature timestamp outside acceptable tolerance window' };
    }

    const expectedSignature = computeHmacSha256(secret, `${t}.${payload}`);
    const matches = constantTimeEquals(expectedSignature, signatureStr);
    return matches
      ? { isValid: true }
      : { isValid: false, reason: 'Signature mismatch' };
  }

  // 2. GitHub-style signature header: sha256=abcdef...
  if (signatureHeader.startsWith('sha256=')) {
    const signatureStr = signatureHeader.slice('sha256='.length).trim();
    const expectedSignature = computeHmacSha256(secret, payload);
    const matches = constantTimeEquals(expectedSignature, signatureStr);
    return matches
      ? { isValid: true }
      : { isValid: false, reason: 'Signature mismatch' };
  }

  // 3. Raw hex signature fallback
  const expectedSignature = computeHmacSha256(secret, payload);
  const matches = constantTimeEquals(expectedSignature, signatureHeader.trim());
  return matches
    ? { isValid: true }
    : { isValid: false, reason: 'Signature mismatch' };
}

// ============================================================================
// Exponential Backoff with Jitter (Rule 26)
// ============================================================================

/**
 * Calculates retry delay in seconds with exponential backoff and deterministic pseudo-jitter.
 * Avoids synchronized retry storms ("thundering herd") across distributed workers.
 */
export function calculateBackoffDelaySeconds(
  attemptNumber: number,
  baseDelaySeconds = 60,
  maxDelaySeconds = 86400,
  jitterFractionBp = 2000, // 20% jitter (2000 basis points)
): number {
  if (attemptNumber <= 1) return baseDelaySeconds;

  // 2^(attempt - 1)
  const multiplier = Math.min(Math.pow(2, attemptNumber - 1), 1024);
  const exponentialDelay = baseDelaySeconds * multiplier;
  const boundedDelay = Math.min(exponentialDelay, maxDelaySeconds);

  // Deterministic pseudo-jitter using attempt number arithmetic (Rule 26)
  const jitterRange = Math.floor((boundedDelay * jitterFractionBp) / 10000);
  const jitterOffset = (attemptNumber * 37) % (jitterRange > 0 ? jitterRange : 1);

  return boundedDelay + jitterOffset;
}

// ============================================================================
// Circuit Breaker State Machine
// ============================================================================

export interface CircuitBreakerEvaluation {
  isOpen: boolean;
  shouldTrip: boolean;
  shouldReset: boolean;
}

export function evaluateCircuitBreaker(
  consecutiveFailures: number,
  threshold = 10,
  coolOffSeconds = 300,
  trippedAtSeconds?: number | null,
  currentSeconds: number = Math.floor(Date.now() / 1000),
): CircuitBreakerEvaluation {
  if (trippedAtSeconds) {
    const elapsed = currentSeconds - trippedAtSeconds;
    if (elapsed >= coolOffSeconds) {
      // Cooldown expired: Allow half-open trial or reset
      return { isOpen: false, shouldTrip: false, shouldReset: true };
    }
    // Circuit is still open (tripped)
    return { isOpen: true, shouldTrip: false, shouldReset: false };
  }

  // Not currently tripped
  if (consecutiveFailures >= threshold) {
    return { isOpen: true, shouldTrip: true, shouldReset: false };
  }

  return { isOpen: false, shouldTrip: false, shouldReset: false };
}

// ============================================================================
// Notification Template Engine
// ============================================================================

/**
 * Pure string interpolation for notification templates (e.g. "Order {{order_number}} is {{status}}").
 */
export function formatNotificationTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined ? String(val) : '';
  });
}
