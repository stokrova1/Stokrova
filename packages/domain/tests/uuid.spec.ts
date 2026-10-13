import { describe, it, expect } from 'vitest';
import {
  generateUuidV7,
  isValidUuidV7,
  extractTimestampFromUuidV7,
} from '../src/uuid.js';

describe('RFC 9562 UUIDv7 Implementation', () => {
  it('generates valid UUIDv7 strings conforming to RFC 9562', () => {
    const id = generateUuidV7();
    expect(isValidUuidV7(id)).toBe(true);
    // Version 7 nibble check
    expect(id.charAt(14)).toBe('7');
    // Variant nibble check (8, 9, a, or b)
    expect(['8', '9', 'a', 'b', '8', '9', 'A', 'B']).toContain(id.charAt(19));
  });

  it('generates monotonically ordered UUIDs even in tight loops', () => {
    const count = 50;
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(generateUuidV7());
    }

    // Verify all are valid
    for (const id of ids) {
      expect(isValidUuidV7(id)).toBe(true);
    }

    // Lexicographical ordering must equal temporal generation order
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('accurately encodes and extracts timestamps', () => {
    const now = Date.now();
    const id = generateUuidV7(now);
    const extracted = extractTimestampFromUuidV7(id);
    expect(extracted).toBe(now);
  });

  it('rejects invalid UUID strings', () => {
    expect(isValidUuidV7('')).toBe(false);
    expect(isValidUuidV7('invalid-uuid')).toBe(false);
    expect(isValidUuidV7('00000000-0000-4000-8000-000000000000')).toBe(false); // UUIDv4 not v7
  });
});
