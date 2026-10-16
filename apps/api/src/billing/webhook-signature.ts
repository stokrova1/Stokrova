import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks `x-stokrova-signature: sha256=<hex HMAC of the exact request body>`.
 * Without a configured secret every confirmation is refused, so an unconfigured server can never
 * be tricked into marking an invoice paid.
 */
export function verifyWebhookSignature(secret: string | undefined, rawBody: Buffer | undefined, header: string | undefined): boolean {
  if (!secret || !rawBody || !header) return false;
  const given = header.startsWith('sha256=') ? header.slice(7) : header;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (given.length !== expected.length || !/^[0-9a-f]+$/i.test(given)) return false;
  return timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'));
}
