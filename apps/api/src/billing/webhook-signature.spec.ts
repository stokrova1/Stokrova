import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from './webhook-signature.js';

const body = Buffer.from('{"invoice_id":"inv_1","payment_gateway_reference":"ref","status":"SUCCEEDED"}');
const sign = (secret: string) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

describe('payment confirmation sender check', () => {
  it('accepts a confirmation signed with the shared secret', () => {
    expect(verifyWebhookSignature('s3cret', body, sign('s3cret'))).toBe(true);
  });
  it('refuses a forged or unsigned confirmation', () => {
    expect(verifyWebhookSignature('s3cret', body, sign('other'))).toBe(false);
    expect(verifyWebhookSignature('s3cret', body, undefined)).toBe(false);
  });
  it('refuses everything when no secret is configured', () => {
    expect(verifyWebhookSignature(undefined, body, sign('s3cret'))).toBe(false);
  });
});
