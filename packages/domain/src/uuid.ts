/**
 * RFC 9562 UUIDv7 Implementation
 * Provides monotonic, timestamp-ordered 128-bit identifiers.
 */

let lastTimestamp = -1;
let seqCounter = 0;

/**
 * Generates an RFC 9562 UUIDv7 string.
 * Monotonic within the same process: if multiple IDs are generated within the
 * same millisecond, the sequence counter increments deterministically.
 */
export function generateUuidV7(timestampMs: number = Date.now()): string {
  if (timestampMs > lastTimestamp) {
    lastTimestamp = timestampMs;
    seqCounter = 0;
  } else if (timestampMs === lastTimestamp) {
    seqCounter++;
    if (seqCounter > 0xfff) {
      // Counter overflow within same millisecond, roll to next millisecond
      lastTimestamp++;
      seqCounter = 0;
      timestampMs = lastTimestamp;
    }
  } else {
    // Clock moved backwards, use monotonic lastTimestamp
    timestampMs = lastTimestamp;
    seqCounter++;
  }

  // 48-bit timestamp
  const tsHigh = Math.floor(timestampMs / 0x100000000);
  const tsLow = timestampMs >>> 0;

  // 12-bit sequence counter
  const seq = seqCounter & 0x0fff;

  const randomBytes = new Uint8Array(8);
  const globalCrypto = (globalThis as { crypto?: { getRandomValues<T extends ArrayBufferView | null>(array: T): T } }).crypto;
  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 8; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // UUID bytes (16 bytes = 128 bits)
  const bytes = new Uint8Array(16);

  // Bytes 0-5: 48-bit timestamp
  bytes[0] = (tsHigh >>> 8) & 0xff;
  bytes[1] = tsHigh & 0xff;
  bytes[2] = (tsLow >>> 24) & 0xff;
  bytes[3] = (tsLow >>> 16) & 0xff;
  bytes[4] = (tsLow >>> 8) & 0xff;
  bytes[5] = tsLow & 0xff;

  // Bytes 6-7: 4-bit version (0x7) + 12-bit sequence
  bytes[6] = 0x70 | ((seq >>> 8) & 0x0f);
  bytes[7] = seq & 0xff;

  // Byte 8: 2-bit variant (0b10 = 0x80) + 6 bits random
  bytes[8] = 0x80 | ((randomBytes[0] ?? 0) & 0x3f);

  // Bytes 9-15: random
  for (let i = 1; i < 8; i++) {
    bytes[8 + i] = randomBytes[i] ?? 0;
  }

  // Format as standard 8-4-4-4-12 hex string
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Validates whether a given string is a valid UUIDv7.
 */
export function isValidUuidV7(id: string): boolean {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(id);
}

/**
 * Extracts the Unix millisecond timestamp from an RFC 9562 UUIDv7 string.
 */
export function extractTimestampFromUuidV7(id: string): number {
  if (!isValidUuidV7(id)) {
    throw new Error(`Invalid UUIDv7: '${id}'`);
  }
  const clean = id.replace(/-/g, '');
  const tsHex = clean.slice(0, 12);
  return parseInt(tsHex, 16);
}
