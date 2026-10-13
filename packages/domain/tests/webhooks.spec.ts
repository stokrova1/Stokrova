import { describe, it, expect } from 'vitest';
import {
  computeHmacSha256,
  generateStripeSignatureHeader,
  verifyWebhookSignature,
  calculateBackoffDelaySeconds,
  evaluateCircuitBreaker,
  formatNotificationTemplate,
  constantTimeEquals,
} from '../src/webhooks.js';

describe('Enterprise Webhook Engine & Event Notification Bus Domain (Phase 19)', () => {
  // ==========================================================================
  // 1. Pure RFC 2104 / RFC 4231 HMAC-SHA256 Implementation
  // ==========================================================================
  describe('computeHmacSha256', () => {
    it('matches RFC 4231 standard test vector 2', () => {
      // RFC 4231 Test Vector 2:
      // Key = "Jefe"
      // Data = "what do ya want for nothing?"
      // Digest = 5bdcc509a6f7b1436251d616d0273712a7f0f894e3ab9e58835859e3ab437a56
      const key = 'Jefe';
      const data = 'what do ya want for nothing?';
      const expected = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';

      const digest = computeHmacSha256(key, data);
      expect(digest).toBe(expected);
    });

    it('produces distinct digests for different keys or messages', () => {
      const h1 = computeHmacSha256('secret-1', 'hello world');
      const h2 = computeHmacSha256('secret-2', 'hello world');
      const h3 = computeHmacSha256('secret-1', 'hello universe');

      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
    });
  });

  // ==========================================================================
  // 2. Stripe & GitHub Webhook Signature Verification
  // ==========================================================================
  describe('Webhook Signature Verification & Anti-Replay', () => {
    const secret = 'whsec_stokrova_super_secret_test_key_123';
    const payload = JSON.stringify({ event: 'order.created', order_id: 'ord-1001' });

    it('generates and verifies Stripe-style signature header', () => {
      const now = 1700000000;
      const header = generateStripeSignatureHeader(secret, payload, now);
      expect(header.startsWith(`t=${now},v1=`)).toBe(true);

      const verification = verifyWebhookSignature(secret, header, payload, 300, now);
      expect(verification.isValid).toBe(true);
      expect(verification.reason).toBeUndefined();
    });

    it('rejects tampered payload', () => {
      const now = 1700000000;
      const header = generateStripeSignatureHeader(secret, payload, now);
      const tamperedPayload = JSON.stringify({ event: 'order.created', order_id: 'ord-9999' });

      const verification = verifyWebhookSignature(secret, header, tamperedPayload, 300, now);
      expect(verification.isValid).toBe(false);
      expect(verification.reason).toBe('Signature mismatch');
    });

    it('rejects replay attacks outside tolerance window', () => {
      const sentTime = 1700000000;
      const header = generateStripeSignatureHeader(secret, payload, sentTime);

      // Current time is 10 minutes later (600 seconds > 300 second tolerance)
      const receivedTime = sentTime + 600;
      const verification = verifyWebhookSignature(secret, header, payload, 300, receivedTime);
      expect(verification.isValid).toBe(false);
      expect(verification.reason).toContain('tolerance window');
    });

    it('verifies GitHub-style sha256=... signature', () => {
      const sig = computeHmacSha256(secret, payload);
      const header = `sha256=${sig}`;

      const verification = verifyWebhookSignature(secret, header, payload);
      expect(verification.isValid).toBe(true);
    });

    it('verifies constant-time string comparison', () => {
      expect(constantTimeEquals('abcdef', 'abcdef')).toBe(true);
      expect(constantTimeEquals('abcdef', 'abcdeg')).toBe(false);
      expect(constantTimeEquals('abcdef', 'abcde')).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Exponential Backoff with Jitter (Rule 26)
  // ==========================================================================
  describe('calculateBackoffDelaySeconds', () => {
    it('returns base delay for first attempt', () => {
      expect(calculateBackoffDelaySeconds(1, 60)).toBe(60);
    });

    it('scales exponentially for subsequent attempts', () => {
      const a2 = calculateBackoffDelaySeconds(2, 60);
      const a3 = calculateBackoffDelaySeconds(3, 60);
      const a4 = calculateBackoffDelaySeconds(4, 60);

      // Attempt 2 base is 120s
      expect(a2).toBeGreaterThanOrEqual(120);
      // Attempt 3 base is 240s
      expect(a3).toBeGreaterThanOrEqual(240);
      // Attempt 4 base is 480s
      expect(a4).toBeGreaterThanOrEqual(480);
    });

    it('caps at maxDelaySeconds', () => {
      const a10 = calculateBackoffDelaySeconds(10, 60, 3600);
      expect(a10).toBeLessThanOrEqual(3600 + 720); // within capped range + bounded jitter
    });
  });

  // ==========================================================================
  // 4. Circuit Breaker State Machine
  // ==========================================================================
  describe('evaluateCircuitBreaker', () => {
    it('keeps circuit closed when failures are below threshold', () => {
      const evalResult = evaluateCircuitBreaker(4, 5, 300);
      expect(evalResult.isOpen).toBe(false);
      expect(evalResult.shouldTrip).toBe(false);
    });

    it('trips circuit when consecutive failures reach threshold', () => {
      const evalResult = evaluateCircuitBreaker(5, 5, 300);
      expect(evalResult.isOpen).toBe(true);
      expect(evalResult.shouldTrip).toBe(true);
      expect(evalResult.shouldReset).toBe(false);
    });

    it('remains open during cool-off window', () => {
      const tripTime = 1000;
      const currentTime = 1100; // 100s elapsed < 300s cool-off
      const evalResult = evaluateCircuitBreaker(5, 5, 300, tripTime, currentTime);
      expect(evalResult.isOpen).toBe(true);
      expect(evalResult.shouldReset).toBe(false);
    });

    it('signals reset when cool-off window expires', () => {
      const tripTime = 1000;
      const currentTime = 1350; // 350s elapsed >= 300s cool-off
      const evalResult = evaluateCircuitBreaker(5, 5, 300, tripTime, currentTime);
      expect(evalResult.isOpen).toBe(false);
      expect(evalResult.shouldReset).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Notification Template Formatter
  // ==========================================================================
  describe('formatNotificationTemplate', () => {
    it('interpolates variables into template placeholders', () => {
      const template = 'Hello {{name}}, your order {{order_id}} has been fulfilled for ${{amount}}!';
      const formatted = formatNotificationTemplate(template, {
        name: 'Alice',
        order_id: 'ORD-991',
        amount: '150.00',
      });
      expect(formatted).toBe('Hello Alice, your order ORD-991 has been fulfilled for $150.00!');
    });

    it('clears missing template placeholders without throwing', () => {
      const template = 'Notification for {{user_id}}: {{message}} [{{optional_code}}]';
      const formatted = formatNotificationTemplate(template, {
        user_id: 'usr-1',
        message: 'Stock replenished',
      });
      expect(formatted).toBe('Notification for usr-1: Stock replenished []');
    });
  });
});
