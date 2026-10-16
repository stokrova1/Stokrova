import { describe, it, expect } from 'vitest';
import { ALWAYS_HYDRATE } from '../infrastructure/database/durable-map.js';

describe('till offline sync after a restart', () => {
  it('the "already counted" list always reloads at startup', () => {
    expect(ALWAYS_HYDRATE.has('pos_sync_transactions')).toBe(true);
  });
});
